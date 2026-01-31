/**
 * @lmrc/scraper - Multi-tenant data source adapters and scraping
 *
 * This package provides:
 * - DataSourceAdapter interface for pluggable data sources
 * - RevSportAdapter for scraping RevSport booking systems
 * - ScraperStorage for persisting scraped data to the database
 * - ScrapeScheduler for periodic multi-tenant scraping
 *
 * @example
 * ```ts
 * import { createDb } from '@lmrc/db';
 * import { ScrapeScheduler } from '@lmrc/scraper';
 *
 * const db = createDb(process.env.DATABASE_URL);
 * const scheduler = new ScrapeScheduler(db, {
 *   encryptionKey: process.env.ENCRYPTION_KEY,
 *   debug: true,
 * });
 *
 * // Start scheduled scraping
 * scheduler.start();
 *
 * // Or run manually for a specific club
 * const result = await scheduler.scrapeClub(club);
 * ```
 */

// Core adapter interface
export type {
  DataSourceAdapter,
  AdapterConfig,
  AdapterFactory,
  Boat,
  Booking,
  DateRange,
  SyncResult,
} from './adapter.js';

// RevSport adapter
export {
  RevSportAdapter,
  createRevSportAdapter,
} from './revsport/index.js';

// Storage
export {
  ScraperStorage,
  type StorageConfig,
  type StorageResult,
} from './storage.js';

// Scheduler
export {
  ScrapeScheduler,
  type SchedulerConfig,
  type ClubScrapeResult,
} from './scheduler.js';
