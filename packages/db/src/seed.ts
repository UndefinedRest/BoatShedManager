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
      // Migrated from tv-display.json defaults
      showCountdown: true,
      refreshInterval: 300000, // 5 minutes
      sessionTimes: {
        morning1: { start: '05:00', end: '07:00' },
        morning2: { start: '07:00', end: '09:00' },
        evening: { start: '16:00', end: '19:00' },
      },
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
