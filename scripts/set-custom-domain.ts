/**
 * Set Custom Domain for a Club
 *
 * This script updates a club's custom domain in the database.
 *
 * Usage:
 *   pnpm exec tsx scripts/set-custom-domain.ts <subdomain> <custom-domain>              # dev
 *   pnpm exec tsx scripts/set-custom-domain.ts <subdomain> <custom-domain> --production  # production
 *
 * Example:
 *   pnpm exec tsx scripts/set-custom-domain.ts lmrc board.lakemacrowing.au --production
 */

import { eq } from 'drizzle-orm';
import { loadEnv } from './lib/env.js';
import { clubs } from '../packages/db/dist/index.js';

// Get command line arguments (filter out --dev/--production flags)
const positionalArgs = process.argv.slice(2).filter(a => !a.startsWith('--'));
const [subdomain, customDomain] = positionalArgs;

if (!subdomain || !customDomain) {
  console.error('Usage: pnpm exec tsx scripts/set-custom-domain.ts <subdomain> <custom-domain> [--production]');
  console.error('Example: pnpm exec tsx scripts/set-custom-domain.ts lmrc board.lakemacrowing.au --production');
  process.exit(1);
}

async function main() {
  const { db, env } = await loadEnv();

  console.log('=== Set Custom Domain ===');
  console.log('');

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
  await db
    .update(clubs)
    .set({ customDomain })
    .where(eq(clubs.id, club.id));

  console.log(`Custom domain updated successfully! [${env.toUpperCase()}]`);
  console.log('');

  if (env === 'production') {
    console.log('=== Next Steps ===');
    console.log('');
    console.log('1. Add custom domain in Render dashboard:');
    console.log('   - Go to your Render service > Settings > Custom Domains');
    console.log(`   - Add: ${customDomain}`);
    console.log('');
    console.log('2. Configure DNS at your domain registrar:');
    console.log(`   - Type: CNAME`);
    console.log(`   - Host: ${customDomain.split('.')[0]}`);
    console.log(`   - Value: <your-render-service>.onrender.com`);
    console.log('');
    console.log('3. Render will automatically provision an SSL certificate');
    console.log('');
    console.log(`Board will be available at: https://${customDomain}/`);
    console.log('');
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
