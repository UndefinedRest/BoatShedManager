/**
 * Storage service for persisting scraped data to the database
 *
 * Handles upserting boats and bookings from adapter results.
 */

import type { Database } from '@lmrc/db';
import { boatCache, bookingCache, scrapeJobs } from '@lmrc/db';
import { eq, and, gte, lte } from 'drizzle-orm';
import type { Boat, Booking, SyncResult, DateRange } from './adapter.js';

export interface StorageConfig {
  clubId: string;
}

export interface StorageResult {
  boatsUpserted: number;
  boatsDeleted: number;
  bookingsUpserted: number;
  bookingsDeleted: number;
}

/**
 * Storage service for persisting scraped data
 */
export class ScraperStorage {
  constructor(
    private db: Database,
    private config: StorageConfig
  ) {}

  /**
   * Store scraped boats in the database
   * Uses upsert to handle both new and existing boats.
   */
  async storeBoats(boats: Boat[]): Promise<{ upserted: number }> {
    if (boats.length === 0) {
      return { upserted: 0 };
    }

    const now = new Date();
    let upserted = 0;

    // Process boats one at a time to handle upsert logic
    for (const boat of boats) {
      // Check if boat exists using callback-based where (avoids drizzle version issues)
      const existing = await this.db.query.boatCache.findFirst({
        where: (bc, { and: andFn, eq: eqFn }) =>
          andFn(
            eqFn(bc.clubId, this.config.clubId),
            eqFn(bc.revsportBoatId, boat.externalId)
          ),
      });

      if (existing) {
        // Update existing boat using direct where clause
        await this.db
          .update(boatCache)
          .set({
            name: boat.name,
            boatType: boat.boatType,
            boatCategory: boat.boatCategory,
            classification: boat.classification,
            weight: boat.weight,
            isDamaged: boat.isDamaged,
            damagedReason: boat.damagedReason,
            metadata: boat.metadata,
            lastScrapedAt: now,
          })
          .where(eq(boatCache.id, existing.id));
      } else {
        // Insert new boat
        await this.db.insert(boatCache).values({
          clubId: this.config.clubId,
          name: boat.name,
          boatType: boat.boatType,
          boatCategory: boat.boatCategory,
          classification: boat.classification,
          weight: boat.weight,
          isDamaged: boat.isDamaged,
          damagedReason: boat.damagedReason,
          revsportBoatId: boat.externalId,
          metadata: boat.metadata,
          lastScrapedAt: now,
        });
      }

      upserted++;
    }

    return { upserted };
  }

  /**
   * Store scraped bookings in the database.
   * Replaces all bookings for the given date range.
   */
  async storeBookings(
    bookings: Booking[],
    dateRange: DateRange
  ): Promise<{ upserted: number; deleted: number }> {
    // Get boat ID mapping (external ID -> internal ID)
    const boatMap = await this.getBoatIdMap();

    // Delete existing bookings in date range for this club
    // This is simpler than trying to upsert individual bookings
    const deleted = await this.deleteBookingsInRange(dateRange);

    if (bookings.length === 0) {
      return { upserted: 0, deleted };
    }

    // Insert new bookings
    const now = new Date();
    const validBookings = bookings.filter((b) => boatMap.has(b.boatExternalId));

    if (validBookings.length > 0) {
      // Insert in batches to avoid hitting parameter limits
      const batchSize = 100;
      for (let i = 0; i < validBookings.length; i += batchSize) {
        const batch = validBookings.slice(i, i + batchSize);

        await this.db.insert(bookingCache).values(
          batch.map((booking) => ({
            clubId: this.config.clubId,
            boatId: boatMap.get(booking.boatExternalId)!,
            bookingDate: booking.date,
            sessionName: booking.sessionName,
            bookings: {
              externalId: booking.externalId,
              startTime: booking.startTime,
              endTime: booking.endTime,
              memberName: booking.memberName,
              rawData: booking.rawData,
            },
            scrapedAt: now,
          }))
        );
      }
    }

    return { upserted: validBookings.length, deleted };
  }

  /**
   * Record a scrape job in the database
   */
  async recordScrapeJob(
    jobType: 'boat_metadata' | 'booking_calendar',
    result: SyncResult
  ): Promise<void> {
    await this.db.insert(scrapeJobs).values({
      clubId: this.config.clubId,
      jobType,
      status: result.success ? 'completed' : 'failed',
      startedAt: new Date(Date.now() - result.durationMs),
      completedAt: new Date(),
      errorMessage: result.error ?? null,
      retryCount: 0,
    });
  }

  /**
   * Get the last successful scrape time for a club
   */
  async getLastScrapeTime(): Promise<Date | null> {
    const job = await this.db.query.scrapeJobs.findFirst({
      where: (sj, { and: andFn, eq: eqFn }) =>
        andFn(
          eqFn(sj.clubId, this.config.clubId),
          eqFn(sj.status, 'completed')
        ),
      orderBy: (sj, { desc }) => [desc(sj.completedAt)],
    });

    return job?.completedAt ?? null;
  }

  /**
   * Get internal boat ID from external ID
   */
  private async getBoatIdMap(): Promise<Map<string, string>> {
    const boats = await this.db.query.boatCache.findMany({
      where: (bc, { eq: eqFn }) => eqFn(bc.clubId, this.config.clubId),
      columns: {
        id: true,
        revsportBoatId: true,
      },
    });

    const map = new Map<string, string>();
    for (const boat of boats) {
      if (boat.revsportBoatId) {
        map.set(boat.revsportBoatId, boat.id);
      }
    }

    return map;
  }

  /**
   * Delete bookings in a date range
   */
  private async deleteBookingsInRange(dateRange: DateRange): Promise<number> {
    await this.db
      .delete(bookingCache)
      .where(
        and(
          eq(bookingCache.clubId, this.config.clubId),
          gte(bookingCache.bookingDate, dateRange.start),
          lte(bookingCache.bookingDate, dateRange.end)
        )
      );

    return 0; // Count not available in Drizzle
  }
}
