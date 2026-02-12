/**
 * Scheduler for periodic scraping
 *
 * Uses node-cron for scheduling scrape jobs across clubs.
 * Runs one club at a time to manage memory (serialized scraping).
 */

import cron from 'node-cron';
import type { Database } from '@lmrc/db';
import { clubs } from '@lmrc/db';
import { decryptCredentials } from '@lmrc/crypto';
import type { DataSourceAdapter, DateRange, SyncResult } from './adapter.js';
import { RevSportAdapter } from './revsport/adapter.js';
import { ScraperStorage } from './storage.js';

/**
 * Minimal logger interface so callers can inject their own (e.g. pino).
 * Falls back to console if not provided.
 */
export interface SchedulerLogger {
  info(obj: Record<string, unknown>, msg: string): void;
  warn(obj: Record<string, unknown>, msg: string): void;
  error(obj: Record<string, unknown>, msg: string): void;
}

const consoleLogger: SchedulerLogger = {
  info: (obj, msg) => console.log(msg, obj),
  warn: (obj, msg) => console.warn(msg, obj),
  error: (obj, msg) => console.error(msg, obj),
};

export interface SchedulerConfig {
  /** Encryption key for decrypting credentials */
  encryptionKey: string;
  /** Number of days to fetch bookings for (default: 7) */
  daysAhead?: number;
  /** Enable verbose debug logging */
  debug?: boolean;
  /** Logger for production-level output (defaults to console) */
  logger?: SchedulerLogger;
}

export interface ClubScrapeResult {
  clubId: string;
  clubName: string;
  success: boolean;
  boatsCount: number;
  bookingsCount: number;
  durationMs: number;
  error?: string;
}

/**
 * Scrape scheduler for multi-tenant operation
 */
export class ScrapeScheduler {
  private running = false;
  private currentJob: Promise<void> | null = null;
  private allTasks: cron.ScheduledTask[] = [];
  private debug: boolean;
  private daysAhead: number;
  private logger: SchedulerLogger;

  constructor(
    private db: Database,
    private config: SchedulerConfig
  ) {
    this.debug = config.debug ?? false;
    this.daysAhead = config.daysAhead ?? 7;
    this.logger = config.logger ?? consoleLogger;
  }

  private verbose(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[ScrapeScheduler] ${message}`, data ?? '');
    }
  }

  /**
   * Wrap async cron callback with error handling.
   * Without this, unhandled promise rejections from async callbacks
   * crash the process silently.
   */
  private scheduledRun = async (): Promise<void> => {
    try {
      const results = await this.runAllClubs();
      const successful = results.filter(r => r.success).length;
      const failed = results.length - successful;
      this.logger.info(
        { total: results.length, successful, failed },
        'Scheduled scrape complete'
      );
      if (failed > 0) {
        for (const r of results.filter(r => !r.success)) {
          this.logger.warn(
            { clubId: r.clubId, clubName: r.clubName, error: r.error },
            'Club scrape failed'
          );
        }
      }
    } catch (error) {
      this.logger.error(
        { error: (error as Error).message, stack: (error as Error).stack },
        'Scheduled scrape crashed'
      );
    }
  };

  /**
   * Start the scheduler with adaptive refresh rates
   *
   * Default schedule (Australia/Sydney):
   * - 05:00-09:00: every 2 min (peak morning rowing)
   * - 09:00-17:00: every 5 min
   * - 17:00-21:00: every 2 min (evening rowing)
   * - 21:00-05:00: every 10 min
   */
  start(): void {
    if (this.allTasks.length > 0) {
      this.logger.warn({}, 'Scheduler already running');
      return;
    }

    const opts = { scheduled: true, timezone: 'Australia/Sydney' };

    this.allTasks = [
      cron.schedule('*/2 5-8 * * *', this.scheduledRun, opts),
      cron.schedule('*/5 9-16 * * *', this.scheduledRun, opts),
      cron.schedule('*/2 17-20 * * *', this.scheduledRun, opts),
      cron.schedule('*/10 21-23,0-4 * * *', this.scheduledRun, opts),
    ];

    this.logger.info({}, 'Scheduler started with adaptive refresh rates');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    for (const task of this.allTasks) {
      task.stop();
    }
    this.allTasks = [];
    this.logger.info({}, 'Scheduler stopped');
  }

  /**
   * Run scraping for all active clubs (serialized)
   */
  async runAllClubs(): Promise<ClubScrapeResult[]> {
    // Skip if already running
    if (this.running) {
      this.logger.warn({}, 'Scrape already in progress, skipping');
      return [];
    }

    this.running = true;
    const results: ClubScrapeResult[] = [];

    try {
      // Get all active clubs
      const activeClubs = await this.db.query.clubs.findMany({
        where: (c, { eq }) => eq(c.status, 'active'),
      });

      this.verbose(`Starting scrape for ${activeClubs.length} clubs`);

      // Process clubs serially (one at a time for memory management)
      for (const club of activeClubs) {
        const result = await this.scrapeClub(club);
        results.push(result);

        // Small delay between clubs
        await this.delay(1000);
      }

      this.verbose(`Scrape complete: ${results.filter(r => r.success).length}/${results.length} clubs succeeded`);
    } finally {
      this.running = false;
    }

    return results;
  }

  /**
   * Run scraping for a single club
   */
  async scrapeClub(club: typeof clubs.$inferSelect): Promise<ClubScrapeResult> {
    const startTime = Date.now();

    try {
      // Get credentials from dataSourceConfig
      const config = club.dataSourceConfig as Record<string, unknown> | null;
      if (!config?.credentials_encrypted || !config?.url) {
        return {
          clubId: club.id,
          clubName: club.name,
          success: false,
          boatsCount: 0,
          bookingsCount: 0,
          durationMs: Date.now() - startTime,
          error: 'Missing RevSport credentials or URL',
        };
      }

      // Decrypt credentials
      const credentials = decryptCredentials(
        config.credentials_encrypted as string,
        this.config.encryptionKey
      );

      // Create adapter
      const adapter: DataSourceAdapter = new RevSportAdapter({
        url: config.url as string,
        credentials,
        timezone: club.timezone ?? 'Australia/Sydney',
        debug: this.debug,
      });

      // Create storage
      const storage = new ScraperStorage(this.db, { clubId: club.id });

      // Calculate date range
      const dateRange = this.getDateRange();

      // Run sync
      const syncResult = await adapter.sync(dateRange);

      // Store results
      if (syncResult.success) {
        const boats = await adapter.getBoats();
        await storage.storeBoats(boats);

        const bookings = await adapter.getBookings(dateRange);
        await storage.storeBookings(bookings, dateRange);
      }

      // Record job
      await storage.recordScrapeJob('booking_calendar', syncResult);

      // Cleanup
      await adapter.dispose();

      return {
        clubId: club.id,
        clubName: club.name,
        success: syncResult.success,
        boatsCount: syncResult.boatsCount,
        bookingsCount: syncResult.bookingsCount,
        durationMs: Date.now() - startTime,
        error: syncResult.error,
      };
    } catch (error) {
      return {
        clubId: club.id,
        clubName: club.name,
        success: false,
        boatsCount: 0,
        bookingsCount: 0,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }

  /**
   * Get date range for scraping (today + N days)
   */
  private getDateRange(): DateRange {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(today);
    endDate.setDate(today.getDate() + this.daysAhead);

    return {
      start: this.formatDate(today),
      end: this.formatDate(endDate),
    };
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
