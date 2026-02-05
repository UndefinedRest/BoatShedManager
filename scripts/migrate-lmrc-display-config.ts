/**
 * Migrate LMRC Display Configuration to Database
 *
 * This script reads the tv-display.json from the Pi codebase and migrates
 * the configuration to the SaaS database, splitting it into:
 * - clubs.branding: Logo, colors (applies to all viewers)
 * - clubs.tv_display_config: TV-specific layout settings (boatshed display)
 * - clubs.display_config: General display preferences (web/mobile)
 *
 * Usage:
 *   pnpm exec tsx scripts/migrate-lmrc-display-config.ts
 *
 * Required environment variables:
 *   - DATABASE_URL: Supabase connection string
 */

import { config } from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load .env from packages/db
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../packages/db/.env') });

// Direct imports from built packages
import { createDb, clubs } from '../packages/db/dist/index.js';
import { eq } from 'drizzle-orm';

// Validate environment
if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  console.error('Make sure packages/db/.env exists with DATABASE_URL set');
  process.exit(1);
}

// Read tv-display.json from Pi codebase
const tvDisplayPath = path.join(__dirname, '../lmrc-booking-system/config/tv-display.json');

if (!fs.existsSync(tvDisplayPath)) {
  console.error(`Config file not found: ${tvDisplayPath}`);
  process.exit(1);
}

const piConfig = JSON.parse(fs.readFileSync(tvDisplayPath, 'utf-8'));

console.log('');
console.log('=== Migrate LMRC Display Configuration ===');
console.log('');
console.log('Source:', tvDisplayPath);
console.log('Config version:', piConfig.version);
console.log('');

// Split configuration into the three layers
// 1. Branding - applies to all viewers (TV, desktop, mobile)
const branding = {
  logoUrl: piConfig.display?.logoUrl || null,
  primaryColor: piConfig.colors?.ui?.columnHeader || '#1e40af',
  secondaryColor: piConfig.colors?.ui?.boatTypeBadge || '#0ea5e9',
  customCSS: null,
};

// 2. TV Display Config - optimized for 55" TV at 2m viewing distance
const tvDisplayConfig = {
  version: piConfig.version,
  layout: {
    daysToDisplay: piConfig.layout?.daysToDisplay || 7,
    boatRowHeight: piConfig.layout?.boatRowHeight || 50,
    sessionRowHeight: piConfig.layout?.sessionRowHeight || 20,
    boatNameWidth: piConfig.layout?.boatNameWidth || 250,
  },
  typography: {
    boatNameSize: piConfig.typography?.boatNameSize || 18,
    bookingDetailsSize: piConfig.typography?.bookingDetailsSize || 14,
    columnTitleSize: piConfig.typography?.columnTitleSize || 20,
  },
  columns: {
    leftTitle: piConfig.columns?.leftTitle || 'CLUB BOATS',
    rightTitle: piConfig.columns?.rightTitle || 'RACE BOATS',
    tinniesTitle: piConfig.columns?.tinniesTitle || 'TINNIES',
  },
  timing: {
    refreshInterval: piConfig.timing?.refreshInterval || 300000, // 5 minutes
  },
  colors: piConfig.colors || {},
};

// 3. Display Config - general web/mobile preferences
const displayConfig = {
  memberNameFormat: piConfig.display?.memberNameFormat || 'first-last-initial',
  showDamagedBoats: true,
  showTinnies: true,
};

console.log('Configuration split:');
console.log('');
console.log('BRANDING (applies to all viewers):');
console.log(JSON.stringify(branding, null, 2));
console.log('');
console.log('TV DISPLAY CONFIG (boatshed TV only):');
console.log(JSON.stringify(tvDisplayConfig, null, 2));
console.log('');
console.log('DISPLAY CONFIG (web/mobile):');
console.log(JSON.stringify(displayConfig, null, 2));
console.log('');

async function main() {
  console.log('Connecting to database...');
  const db = createDb(process.env.DATABASE_URL!);

  // Find LMRC club
  const lmrcClub = await db.query.clubs.findFirst({
    where: (clubs, { eq }) => eq(clubs.subdomain, 'lmrc'),
  });

  if (!lmrcClub) {
    console.error('LMRC club not found in database. Run the seed script first.');
    process.exit(1);
  }

  console.log(`Found LMRC club: ${lmrcClub.name} (${lmrcClub.id})`);
  console.log('');
  console.log('Current config in database:');
  console.log('  branding:', JSON.stringify(lmrcClub.branding));
  console.log('  displayConfig:', JSON.stringify(lmrcClub.displayConfig));
  console.log('  tvDisplayConfig:', JSON.stringify(lmrcClub.tvDisplayConfig));
  console.log('');

  console.log('Updating database with migrated config...');

  await db
    .update(clubs)
    .set({
      branding: branding,
      displayConfig: displayConfig,
      tvDisplayConfig: tvDisplayConfig,
      updatedAt: new Date(),
    })
    .where(eq(clubs.id, lmrcClub.id));

  console.log('');
  console.log('Migration complete!');
  console.log('');
  console.log('The LMRC club now has:');
  console.log('  - Branding: logo and colors for all viewers');
  console.log('  - TV Display Config: layout optimized for boatshed TV');
  console.log('  - Display Config: general web/mobile preferences');
  console.log('');

  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error.message);
  console.error(error.stack);
  process.exit(1);
});
