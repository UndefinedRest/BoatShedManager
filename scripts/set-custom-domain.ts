/**
 * Set Custom Domain for a Club
 *
 * This script updates a club's custom domain in the database.
 *
 * Usage:
 *   pnpm exec tsx scripts/set-custom-domain.ts <subdomain> <custom-domain>
 *
 * Example:
 *   pnpm exec tsx scripts/set-custom-domain.ts lmrc board.lakemacrowing.au
 *
 * Required environment variables:
 *   - DATABASE_URL: Supabase connection string (from packages/db/.env)
 */

import { config } from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { eq } from 'drizzle-orm';

// Load .env from packages/db
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../packages/db/.env') });

// Direct imports from built packages
import { createDb, clubs } from '../packages/db/dist/index.js';

// Validate environment
if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  console.error('Make sure packages/db/.env exists with DATABASE_URL set');
  process.exit(1);
}

// Get command line arguments
const [subdomain, customDomain] = process.argv.slice(2);

if (!subdomain || !customDomain) {
  console.error('Usage: pnpm exec tsx scripts/set-custom-domain.ts <subdomain> <custom-domain>');
  console.error('Example: pnpm exec tsx scripts/set-custom-domain.ts lmrc board.lakemacrowing.au');
  process.exit(1);
}

async function main() {
  console.log('');
  console.log('=== Set Custom Domain ===');
  console.log('');

  const db = createDb(process.env.DATABASE_URL!);

  // Find the club
  const club = await db.query.clubs.findFirst({
    where: (c, { eq: eqFn }) => eqFn(c.subdomain, subdomain),
  });

  if (!club) {
    console.error(`Club with subdomain "${subdomain}" not found.`);
    process.exit(1);
  }

  console.log(`Found club: ${club.name} (${club.subdomain})`);
  console.log(`Current custom domain: ${club.customDomain ?? '(none)'}`);
  console.log(`New custom domain: ${customDomain}`);
  console.log('');

  // Update the custom domain
  const [updated] = await db
    .update(clubs)
    .set({ customDomain })
    .where(eq(clubs.id, club.id))
    .returning();

  console.log('Custom domain updated successfully!');
  console.log('');
  console.log('=== Next Steps ===');
  console.log('');
  console.log('1. Add custom domain in Render dashboard:');
  console.log('   - Go to your Render service → Settings → Custom Domains');
  console.log(`   - Add: ${customDomain}`);
  console.log('   - Render will provide a CNAME target (e.g., your-service.onrender.com)');
  console.log('');
  console.log('2. Configure DNS at your domain registrar (VentraIP):');
  console.log(`   - Type: CNAME`);
  console.log(`   - Host: ${customDomain.split('.')[0]}`);
  console.log(`   - Value: <your-render-service>.onrender.com`);
  console.log('   - TTL: 3600 (or default)');
  console.log('');
  console.log('3. Wait for DNS propagation (can take up to 48 hours, usually faster)');
  console.log('');
  console.log('4. Render will automatically provision an SSL certificate');
  console.log('');
  console.log(`Once complete, the booking board will be available at: https://${customDomain}/`);
  console.log('');

  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
