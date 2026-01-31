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

export interface SchedulerConfig {
  /** Encryption key for decrypting credentials */
  encryptionKey: string;
  /** Number of days to fetch bookings for (default: 7) */
  daysAhead?: number;
  /** Enable debug logging */
  debug?: boolean;
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
  private cronTask: cron.ScheduledTask | null = null;
  private debug: boolean;
  private daysAhead: number;

  constructor(
    private db: Database,
    private config: SchedulerConfig
  ) {
    this.debug = config.debug ?? false;
    this.daysAhead = config.daysAhead ?? 7;
  }

  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[ScrapeScheduler] ${message}`, data ?? '');
    }
  }

  /**
   * Start the scheduler with adaptive refresh rates
   *
   * Default schedule:
   * - 05:00-09:00: every 2 min (peak morning rowing)
   * - 09:00-17:00: every 5 min
   * - 17:00-21:00: every 2 min (evening rowing)
   * - 21:00-05:00: every 10 min
   */
  start(): void {
    if (this.cronTask) {
      this.log('Scheduler already running');
      return;
    }

    // Peak morning (05:00-09:00): every 2 minutes
    const morningTask = cron.schedule('*/2 5-8 * * *', () => this.runAllClubs(), {
      scheduled: true,
      timezone: 'Australia/Sydney',
    });

    // Daytime (09:00-17:00): every 5 minutes
    const dayTask = cron.schedule('*/5 9-16 * * *', () => this.runAllClubs(), {
      scheduled: true,
      timezone: 'Australia/Sydney',
    });

    // Peak evening (17:00-21:00): every 2 minutes
    const eveningTask = cron.schedule('*/2 17-20 * * *', () => this.runAllClubs(), {
      scheduled: true,
      timezone: 'Australia/Sydney',
    });

    // Night (21:00-05:00): every 10 minutes
    const nightTask = cron.schedule('*/10 21-23,0-4 * * *', () => this.runAllClubs(), {
      scheduled: true,
      timezone: 'Australia/Sydney',
    });

    // Store reference to first task for stop()
    this.cronTask = morningTask;

    // Also store others for cleanup (in a real impl, track all)
    (this as any)._allTasks = [morningTask, dayTask, eveningTask, nightTask];

    this.log('Scheduler started with adaptive refresh rates');
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if ((this as any)._allTasks) {
      for (const task of (this as any)._allTasks) {
        task.stop();
      }
      (this as any)._allTasks = null;
    }
    this.cronTask = null;
    this.log('Scheduler stopped');
  }

  /**
   * Run scraping for all active clubs (serialized)
   */
  async runAllClubs(): Promise<ClubScrapeResult[]> {
    // Skip if already running
    if (this.running) {
      this.log('Scrape already in progress, skipping');
      return [];
    }

    this.running = true;
    const results: ClubScrapeResult[] = [];

    try {
      // Get all active clubs
      const activeClubs = await this.db.query.clubs.findMany({
        where: (c, { eq }) => eq(c.status, 'active'),
      });

      this.log(`Starting scrape for ${activeClubs.length} clubs`);

      // Process clubs serially (one at a time for memory management)
      for (const club of activeClubs) {
        const result = await this.scrapeClub(club);
        results.push(result);

        // Small delay between clubs
        await this.delay(1000);
      }

      this.log(`Scrape complete: ${results.filter(r => r.success).length}/${results.length} clubs succeeded`);
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
