/**
 * Set LMRC Booking Page URL
 *
 * Sets the bookingPageUrl in LMRC's displayConfig to enable
 * clickable boat names on the booking board.
 *
 * Usage:
 *   pnpm exec tsx scripts/set-lmrc-booking-url.ts              # dev
 *   pnpm exec tsx scripts/set-lmrc-booking-url.ts --production  # production
 */

import { eq } from 'drizzle-orm';
import { loadEnv } from './lib/env.js';
import { clubs } from '../packages/db/dist/index.js';

const BOOKING_PAGE_URL = 'https://lakemacrowing.au/book-a-boat.html';

async function main() {
  const { db, env } = await loadEnv();

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

  console.log(`\nUpdated displayConfig with bookingPageUrl: ${BOOKING_PAGE_URL} [${env.toUpperCase()}]`);

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
