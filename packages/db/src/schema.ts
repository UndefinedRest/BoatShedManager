import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  date,
  index,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// CLUBS - Tenant table (all other tables reference club_id)
// ============================================================================
export const clubs = pgTable('clubs', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  shortName: varchar('short_name', { length: 50 }),
  subdomain: varchar('subdomain', { length: 100 }).unique().notNull(), // e.g. "lmrc"
  customDomain: varchar('custom_domain', { length: 255 }), // e.g. "bookings.lmrc.org.au" (Phase C)

  // Data source configuration (adapter pattern)
  dataSourceType: varchar('data_source_type', { length: 50 }).default('revsport'), // revsport, builtin, teamsnap, etc.
  dataSourceConfig: jsonb('data_source_config').default({}), // adapter-specific config
  // For RevSport adapter (Phase A): { url, credentials_encrypted }
  // For built-in adapter (Phase C+): { } (no external config needed)

  timezone: varchar('timezone', { length: 100 }).default('Australia/Sydney'),
  branding: jsonb('branding').default({}), // {logoUrl, primaryColor, secondaryColor, customCSS}
  displayConfig: jsonb('display_config').default({}), // Migrated from tv-display.json schema

  status: varchar('status', { length: 50 }).default('trial'), // trial, active, suspended, cancelled
  subscriptionTier: varchar('subscription_tier', { length: 50 }).default('basic'), // basic, pro, premium, enterprise
  subscriptionExpiresAt: timestamp('subscription_expires_at'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// ============================================================================
// BOAT CACHE - Populated by data source adapter
// For RevSport adapter: read-only cache, auto-discovered by scraping
// For built-in adapter: writable, managed via admin dashboard (Premium tier)
// ============================================================================
export const boatCache = pgTable('boat_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }).notNull(),

  name: varchar('name', { length: 255 }).notNull(),
  boatType: varchar('boat_type', { length: 100 }), // 1X, 2X, 4X, Tinnie, etc (from RevSport)
  boatCategory: varchar('boat_category', { length: 50 }).default('race'), // race, tinnie (inferred from RevSport data)
  classification: varchar('classification', { length: 10 }), // R (Race), T (Training), RT
  weight: integer('weight'), // weight class in kg (if available)

  isDamaged: boolean('is_damaged').default(false),
  damagedReason: text('damaged_reason'),

  revsportBoatId: varchar('revsport_boat_id', { length: 100 }), // RevSport's internal ID
  metadata: jsonb('metadata').default({}), // additional scraped data

  lastScrapedAt: timestamp('last_scraped_at').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_boat_cache_club').on(table.clubId),
  unique('uq_boat_cache_club_revsport').on(table.clubId, table.revsportBoatId),
]);

// ============================================================================
// BOOKING CACHE - Scraped from RevSport (read-only)
// ============================================================================
export const bookingCache = pgTable('booking_cache', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }).notNull(),
  boatId: uuid('boat_id').references(() => boatCache.id, { onDelete: 'cascade' }).notNull(),

  bookingDate: date('booking_date').notNull(),
  sessionName: varchar('session_name', { length: 50 }), // "Morning 1", "Morning 2", "Evening"
  bookings: jsonb('bookings').notNull(), // Full booking data from RevSport

  scrapedAt: timestamp('scraped_at').defaultNow(),
}, (table) => [
  index('idx_booking_cache_lookup').on(table.clubId, table.boatId, table.bookingDate),
  unique('uq_booking_cache_session').on(table.clubId, table.boatId, table.bookingDate, table.sessionName),
]);

// ============================================================================
// USERS - Admin accounts per club
// ============================================================================
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }).notNull(),

  email: varchar('email', { length: 255 }).notNull(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('club_admin'), // super_admin, club_admin
  fullName: varchar('full_name', { length: 255 }),

  isActive: boolean('is_active').default(true),
  lastLoginAt: timestamp('last_login_at'),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_users_club_email').on(table.clubId, table.email),
  unique('uq_users_club_email').on(table.clubId, table.email),
]);

// ============================================================================
// SCRAPE JOBS - Scheduler state and history
// ============================================================================
export const scrapeJobs = pgTable('scrape_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }).notNull(),

  jobType: varchar('job_type', { length: 50 }).notNull(), // boat_metadata, booking_calendar
  status: varchar('status', { length: 50 }).notNull(), // pending, running, completed, failed

  startedAt: timestamp('started_at'),
  completedAt: timestamp('completed_at'),
  nextRunAt: timestamp('next_run_at'),

  errorMessage: text('error_message'),
  retryCount: integer('retry_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_scrape_jobs_next').on(table.clubId, table.status, table.nextRunAt),
]);

// ============================================================================
// AUDIT LOG - Track admin actions
// ============================================================================
export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  clubId: uuid('club_id').references(() => clubs.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),

  action: varchar('action', { length: 100 }).notNull(),
  resourceType: varchar('resource_type', { length: 100 }),
  resourceId: uuid('resource_id'),
  details: jsonb('details'),
  ipAddress: varchar('ip_address', { length: 45 }),

  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [
  index('idx_audit_club').on(table.clubId, table.createdAt),
]);

// ============================================================================
// RELATIONS
// ============================================================================
export const clubsRelations = relations(clubs, ({ many }) => ({
  boats: many(boatCache),
  bookings: many(bookingCache),
  users: many(users),
  scrapeJobs: many(scrapeJobs),
  auditLogs: many(auditLog),
}));

export const boatCacheRelations = relations(boatCache, ({ one, many }) => ({
  club: one(clubs, {
    fields: [boatCache.clubId],
    references: [clubs.id],
  }),
  bookings: many(bookingCache),
}));

export const bookingCacheRelations = relations(bookingCache, ({ one }) => ({
  club: one(clubs, {
    fields: [bookingCache.clubId],
    references: [clubs.id],
  }),
  boat: one(boatCache, {
    fields: [bookingCache.boatId],
    references: [boatCache.id],
  }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  club: one(clubs, {
    fields: [users.clubId],
    references: [clubs.id],
  }),
}));

export const scrapeJobsRelations = relations(scrapeJobs, ({ one }) => ({
  club: one(clubs, {
    fields: [scrapeJobs.clubId],
    references: [clubs.id],
  }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  club: one(clubs, {
    fields: [auditLog.clubId],
    references: [clubs.id],
  }),
  user: one(users, {
    fields: [auditLog.userId],
    references: [users.id],
  }),
}));
