/**
 * RevSport Data Source Adapter
 *
 * Implements the DataSourceAdapter interface for RevSport booking systems.
 * Uses HTTP scraping with cookie-based authentication.
 */

import type {
  DataSourceAdapter,
  AdapterConfig,
  Boat,
  Booking,
  DateRange,
  SyncResult,
} from '../adapter.js';
import { RevSportClient } from './client.js';
import {
  parseBoatsFromHtml,
  parseBookingsFromJson,
  formatDateForApi,
  type RawRevSportBooking,
} from './parser.js';

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 500;

export class RevSportAdapter implements DataSourceAdapter {
  readonly type = 'revsport';
  readonly supportsBookingEntry = false;

  private client: RevSportClient | null = null;
  private initialized = false;
  private config: AdapterConfig;

  constructor(config: AdapterConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.client = new RevSportClient({
      baseUrl: this.config.url,
      username: this.config.credentials.username,
      password: this.config.credentials.password,
      debug: this.config.debug,
    });

    await this.client.login();
    this.initialized = true;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async getBoats(): Promise<Boat[]> {
    this.ensureInitialized();

    const html = await this.client!.get<string>('/bookings');
    return parseBoatsFromHtml(html);
  }

  async getBookings(dateRange: DateRange): Promise<Booking[]> {
    this.ensureInitialized();

    // First get all boats
    const boats = await this.getBoats();

    // Then fetch bookings for each boat in batches
    const allBookings: Booking[] = [];

    for (let i = 0; i < boats.length; i += BATCH_SIZE) {
      const batch = boats.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map((boat) => this.getBookingsForBoat(boat.externalId, dateRange))
      );

      for (const bookings of batchResults) {
        allBookings.push(...bookings);
      }

      // Delay between batches (except last)
      if (i + BATCH_SIZE < boats.length) {
        await this.delay(BATCH_DELAY_MS);
      }
    }

    return allBookings;
  }

  async getBookingsForBoat(boatExternalId: string, dateRange: DateRange): Promise<Booking[]> {
    this.ensureInitialized();

    try {
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999);

      const startParam = formatDateForApi(startDate);
      const endParam = formatDateForApi(endDate);

      const url = `/bookings/retrieve-calendar/${boatExternalId}?start=${startParam}&end=${endParam}`;
      const rawBookings = await this.client!.get<RawRevSportBooking[]>(url);

      // Validate response is an array
      if (!Array.isArray(rawBookings)) {
        return [];
      }

      return parseBookingsFromJson(rawBookings, boatExternalId);
    } catch (error) {
      // Return empty array on error (boat may not have bookings endpoint)
      return [];
    }
  }

  async sync(dateRange: DateRange): Promise<SyncResult> {
    const startTime = Date.now();
    const warnings: string[] = [];

    try {
      await this.initialize();

      // Fetch boats
      const boats = await this.getBoats();

      // Fetch bookings in batches
      const allBookings: Booking[] = [];
      let failedBoats = 0;

      for (let i = 0; i < boats.length; i += BATCH_SIZE) {
        const batch = boats.slice(i, i + BATCH_SIZE);

        const batchResults = await Promise.allSettled(
          batch.map((boat) => this.getBookingsForBoat(boat.externalId, dateRange))
        );

        for (let j = 0; j < batchResults.length; j++) {
          const result = batchResults[j];
          if (result.status === 'fulfilled') {
            allBookings.push(...result.value);
          } else {
            failedBoats++;
            warnings.push(`Failed to fetch bookings for boat ${batch[j].externalId}: ${result.reason}`);
          }
        }

        // Delay between batches
        if (i + BATCH_SIZE < boats.length) {
          await this.delay(BATCH_DELAY_MS);
        }
      }

      if (failedBoats > 0) {
        warnings.push(`${failedBoats} boats failed to fetch bookings`);
      }

      return {
        success: true,
        boatsCount: boats.length,
        bookingsCount: allBookings.length,
        dateRange,
        durationMs: Date.now() - startTime,
        warnings,
      };
    } catch (error) {
      return {
        success: false,
        boatsCount: 0,
        bookingsCount: 0,
        dateRange,
        durationMs: Date.now() - startTime,
        error: (error as Error).message,
        warnings,
      };
    }
  }

  async dispose(): Promise<void> {
    if (this.client) {
      this.client.reset();
      this.client = null;
    }
    this.initialized = false;
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.client) {
      throw new Error('Adapter not initialized. Call initialize() first.');
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Factory function for creating RevSport adapters
 */
export function createRevSportAdapter(config: AdapterConfig): DataSourceAdapter {
  return new RevSportAdapter(config);
}
