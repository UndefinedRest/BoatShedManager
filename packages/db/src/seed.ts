/**
 * Seed script for LMRC as the first tenant.
 *
 * Usage:
 *   DATABASE_URL=postgres://... pnpm db:seed
 */
import 'dotenv/config';
import { createDb, clubs } from './index.js';

async function seed() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }

  console.log('Connecting to database...');
  const db = createDb(databaseUrl);

  console.log('Seeding LMRC as first tenant...');

  // Check if LMRC already exists
  const existing = await db.query.clubs.findFirst({
    where: (clubs, { eq }) => eq(clubs.subdomain, 'lmrc'),
  });

  if (existing) {
    console.log('LMRC already exists, skipping seed.');
    console.log(`  ID: ${existing.id}`);
    console.log(`  Name: ${existing.name}`);
    console.log(`  Subdomain: ${existing.subdomain}`);
    process.exit(0);
  }

  // Insert LMRC club
  const [lmrc] = await db.insert(clubs).values({
    name: 'Lake Macquarie Rowing Club',
    shortName: 'LMRC',
    subdomain: 'lmrc',
    timezone: 'Australia/Sydney',
    dataSourceType: 'revsport',
    dataSourceConfig: {
      url: 'https://lmrc.revsport.net.au',
      // Note: credentials_encrypted will be set via admin dashboard
      // Never store plaintext credentials in seed scripts
    },
    branding: {
      primaryColor: '#1e3a5f', // LMRC navy blue
      secondaryColor: '#c9a227', // Gold accent
    },
    displayConfig: {
      // These values must match what the booking board actually displays.
      // If these drift from the board's hardcoded fallbacks, saving from the
      // admin page could change board behaviour unexpectedly.
      refreshInterval: 300000, // 5 minutes
      daysToDisplay: 7,
      sessions: [
        { id: 's1', label: 'Morning Session 1', shortLabel: 'AM1', startTime: '06:30', endTime: '07:30' },
        { id: 's2', label: 'Morning Session 2', shortLabel: 'AM2', startTime: '07:30', endTime: '08:30' },
      ],
      boatGroups: [
        { id: 'col1', name: 'CLUB BOATS', classifications: ['T', 'RT'], category: 'race', position: 'column1' },
        { id: 'col2', name: 'RACE BOATS', classifications: ['R'], category: 'race', position: 'column2' },
        { id: 'sub', name: 'TINNIES', classifications: [], category: 'tinnie', position: 'column2-sub' },
      ],
      boatTypeSortOrder: [
        { type: '4X', order: 1 },
        { type: '2X', order: 2 },
        { type: '1X', order: 3 },
      ],
      bookingPageUrl: 'https://lakemacrowing.au/book-a-boat.html',
      bookingBaseUrl: 'https://www.lakemacquarierowingclub.org.au/bookings/confirm/',
    },
    status: 'active',
    subscriptionTier: 'pro', // LMRC is the founding club
  }).returning();

  console.log('LMRC created successfully!');
  console.log(`  ID: ${lmrc.id}`);
  console.log(`  Name: ${lmrc.name}`);
  console.log(`  Subdomain: ${lmrc.subdomain}`);
  console.log(`  Status: ${lmrc.status}`);

  console.log('\nSeed complete!');
  console.log('\nNext steps:');
  console.log('  1. Set RevSport credentials via admin dashboard (A3)');
  console.log('  2. Run initial scrape to populate boat_cache and booking_cache (A4)');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
