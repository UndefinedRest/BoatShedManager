/**
 * Set LMRC Booking Base URL
 *
 * Sets the bookingBaseUrl in LMRC's displayConfig to enable
 * click-to-book on empty session cells in the booking board.
 *
 * Usage:
 *   pnpm exec tsx scripts/set-lmrc-booking-base-url.ts
 */

import { config } from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { eq } from 'drizzle-orm';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../packages/db/.env') });

import { createDb, clubs } from '../packages/db/dist/index.js';

const BOOKING_BASE_URL = 'https://www.lakemacquarierowingclub.org.au/bookings/confirm/';

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

  // Merge bookingBaseUrl into existing displayConfig
  const currentConfig = (lmrc.displayConfig as Record<string, unknown>) ?? {};
  const newConfig = {
    ...currentConfig,
    bookingBaseUrl: BOOKING_BASE_URL,
  };

  // Update the club
  await db
    .update(clubs)
    .set({ displayConfig: newConfig })
    .where(eq(clubs.id, lmrc.id));

  console.log('\nUpdated displayConfig with bookingBaseUrl:', BOOKING_BASE_URL);
  console.log('New displayConfig:', JSON.stringify(newConfig, null, 2));

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
