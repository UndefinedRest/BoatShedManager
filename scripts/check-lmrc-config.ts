/**
 * Check LMRC Configuration Status
 *
 * Quick script to verify LMRC club configuration in the database.
 *
 * Usage:
 *   pnpm exec tsx scripts/check-lmrc-config.ts              # dev
 *   pnpm exec tsx scripts/check-lmrc-config.ts --production  # production
 */

import { loadEnv } from './lib/env.js';

async function main() {
  const { db, env } = await loadEnv();

  const lmrc = await db.query.clubs.findFirst({
    where: (clubs, { eq }) => eq(clubs.subdomain, 'lmrc'),
  });

  if (!lmrc) {
    console.log('LMRC club not found in database');
    process.exit(1);
  }

  console.log(`=== LMRC Configuration Status [${env.toUpperCase()}] ===`);
  console.log('');
  console.log('Club ID:', lmrc.id);
  console.log('Name:', lmrc.name);
  console.log('Subdomain:', lmrc.subdomain);
  console.log('Custom Domain:', lmrc.customDomain || '(not set)');
  console.log('Status:', lmrc.status);
  console.log('');

  // Check data source config
  const dsConfig = lmrc.dataSourceConfig as Record<string, any> | null;
  console.log('Data Source Type:', lmrc.dataSourceType);

  if (dsConfig?.credentials_encrypted) {
    console.log('RevSport Credentials: SET (encrypted)');
    console.log('RevSport URL:', dsConfig.url || '(not set)');
  } else {
    console.log('RevSport Credentials: NOT SET');
  }
  console.log('');

  // Check display config
  const branding = lmrc.branding as Record<string, any> | null;
  const displayConfig = lmrc.displayConfig as Record<string, any> | null;
  const tvDisplayConfig = (lmrc as any).tvDisplayConfig as Record<string, any> | null;

  console.log('Branding:', branding ? 'SET' : 'NOT SET');
  console.log('Display Config:', displayConfig ? 'SET' : 'NOT SET');
  console.log('TV Display Config:', tvDisplayConfig ? 'SET' : 'NOT SET');
  console.log('');

  if (tvDisplayConfig) {
    console.log('TV Display Config Details:');
    console.log('  Version:', tvDisplayConfig.version);
    console.log('  Days to Display:', tvDisplayConfig.layout?.daysToDisplay);
    console.log('  Refresh Interval:', tvDisplayConfig.timing?.refreshInterval, 'ms');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
