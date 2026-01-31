/**
 * Data Source Adapter Interface
 *
 * Abstract interface for integrating with different booking data sources.
 * Phase A implements RevSportAdapter; future phases may add:
 * - BuiltInAdapter (Premium tier - internal boat/booking management)
 * - TeamSnapAdapter, ClubLockerAdapter, etc.
 */

/**
 * Boat data returned by adapters
 */
export interface Boat {
  /** Adapter-specific boat identifier (e.g., RevSport boat ID) */
  externalId: string;
  /** Display name of the boat */
  name: string;
  /** Boat type: 1X, 2X, 4X, 8X, etc. */
  boatType: string | null;
  /** Category: race, tinnie, etc. */
  boatCategory: string;
  /** Classification: R (Race), T (Training), RT */
  classification: string | null;
  /** Weight class in kg */
  weight: number | null;
  /** Whether the boat is marked as damaged */
  isDamaged: boolean;
  /** Reason for damage if applicable */
  damagedReason: string | null;
  /** Additional metadata from the source */
  metadata: Record<string, unknown>;
}

/**
 * Booking data returned by adapters
 */
export interface Booking {
  /** Adapter-specific booking identifier */
  externalId: string | null;
  /** Reference to the boat's external ID */
  boatExternalId: string;
  /** Booking date (YYYY-MM-DD) */
  date: string;
  /** Start time (HH:mm) */
  startTime: string;
  /** End time (HH:mm) */
  endTime: string;
  /** Name of the member who made the booking */
  memberName: string;
  /** Session name if matched (Morning 1, Morning 2, Evening) */
  sessionName: string | null;
  /** Full booking data from source */
  rawData: Record<string, unknown>;
}

/**
 * Date range for querying bookings
 */
export interface DateRange {
  /** Start date (inclusive, YYYY-MM-DD) */
  start: string;
  /** End date (inclusive, YYYY-MM-DD) */
  end: string;
}

/**
 * Result of a sync operation
 */
export interface SyncResult {
  /** Whether the sync completed successfully */
  success: boolean;
  /** Number of boats synced */
  boatsCount: number;
  /** Number of bookings synced */
  bookingsCount: number;
  /** Date range that was synced */
  dateRange: DateRange;
  /** Duration of sync in milliseconds */
  durationMs: number;
  /** Error message if sync failed */
  error?: string;
  /** Warnings (non-fatal issues) */
  warnings: string[];
}

/**
 * Configuration for creating an adapter
 */
export interface AdapterConfig {
  /** Base URL for the data source */
  url: string;
  /** Credentials (decrypted) */
  credentials: {
    username: string;
    password: string;
  };
  /** Timezone for the club (e.g., 'Australia/Sydney') */
  timezone: string;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Data Source Adapter Interface
 *
 * All data source adapters must implement this interface.
 * The interface is read-focused for Phase A (display-only platform).
 * Write operations are optional for future Premium tier.
 */
export interface DataSourceAdapter {
  /** Adapter type identifier */
  readonly type: string;

  /** Whether this adapter supports booking entry (write operations) */
  readonly supportsBookingEntry: boolean;

  /**
   * Initialize the adapter (e.g., authenticate)
   * Must be called before other operations.
   */
  initialize(): Promise<void>;

  /**
   * Check if the adapter is ready for operations
   */
  isInitialized(): boolean;

  /**
   * Get all boats from the data source
   */
  getBoats(): Promise<Boat[]>;

  /**
   * Get bookings for a date range
   * @param dateRange - The date range to fetch bookings for
   */
  getBookings(dateRange: DateRange): Promise<Booking[]>;

  /**
   * Get bookings for a specific boat
   * @param boatExternalId - The external ID of the boat
   * @param dateRange - The date range to fetch bookings for
   */
  getBookingsForBoat(boatExternalId: string, dateRange: DateRange): Promise<Booking[]>;

  /**
   * Sync all data from the source (boats + bookings)
   * This is the main operation called by the scheduler.
   * @param dateRange - The date range to sync bookings for
   */
  sync(dateRange: DateRange): Promise<SyncResult>;

  /**
   * Clean up resources (close connections, etc.)
   */
  dispose(): Promise<void>;
}

/**
 * Factory function type for creating adapters
 */
export type AdapterFactory = (config: AdapterConfig) => DataSourceAdapter;
