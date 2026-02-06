/**
 * Set LMRC Booking Page URL
 *
 * Sets the bookingPageUrl in LMRC's displayConfig to enable
 * clickable boat names on the booking board.
 *
 * Usage:
 *   pnpm exec tsx scripts/set-lmrc-booking-url.ts
 */

import { config } from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { eq } from 'drizzle-orm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../packages/db/.env') });

import { createDb, clubs } from '../packages/db/dist/index.js';

const BOOKING_PAGE_URL = 'https://lakemacrowing.au/book-a-boat.html';

if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

async function main() {
  const db = createDb(process.env.DATABASE_URL!);

  // Find LMRC club
  const lmrc = await db.query.clubs.findFirst({
    where: (clubs, { eq }) => eq(clubs.subdomain, 'lmrc'),
  });

  if (!lmrc) {
    console.log('LMRC club not found in database');
    process.exit(1);
  }

  console.log('Found LMRC club:', lmrc.id);
  console.log('Current displayConfig:', JSON.stringify(lmrc.displayConfig, null, 2));

  // Merge bookingPageUrl into existing displayConfig
  const currentConfig = (lmrc.displayConfig as Record<string, unknown>) ?? {};
  const newConfig = {
    ...currentConfig,
    bookingPageUrl: BOOKING_PAGE_URL,
  };

  // Update the club
  await db
    .update(clubs)
    .set({ displayConfig: newConfig })
    .where(eq(clubs.id, lmrc.id));

  console.log('\nUpdated displayConfig with bookingPageUrl:', BOOKING_PAGE_URL);
  console.log('New displayConfig:', JSON.stringify(newConfig, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
