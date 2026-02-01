/**
 * Setup LMRC RevSport Credentials
 *
 * This script encrypts RevSport credentials and updates the LMRC club
 * in the database so the scraper can fetch boat/booking data.
 *
 * Usage:
 *   pnpm exec tsx scripts/setup-lmrc-credentials.ts
 *
 * Required environment variables:
 *   - DATABASE_URL: Supabase connection string
 *   - ENCRYPTION_KEY: 64-character hex key for credential encryption
 *
 * You'll be prompted for the RevSport URL, username, and password.
 */

import { config } from 'dotenv';
import * as readline from 'readline';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load .env from packages/db (where DATABASE_URL and ENCRYPTION_KEY are defined)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../packages/db/.env') });

// Direct imports from built packages
import { createDb, clubs } from '../packages/db/dist/index.js';
import { encryptCredentials } from '../packages/crypto/dist/index.js';
import { eq } from 'drizzle-orm';

// Validate environment
const requiredEnvVars = ['DATABASE_URL', 'ENCRYPTION_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    console.error('');
    console.error('Make sure you have a .env file in packages/db with:');
    console.error('  DATABASE_URL=postgresql://...');
    console.error('  ENCRYPTION_KEY=your-64-char-hex-key');
    process.exit(1);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function main() {
  console.log('');
  console.log('=== LMRC RevSport Credentials Setup ===');
  console.log('');
  console.log('This will encrypt your RevSport credentials and store them');
  console.log('in the database for the scraper to use.');
  console.log('');

  // Get RevSport URL
  const defaultUrl = 'https://www.revolutionise.com.au/lakemacquarierowing/admin/events/';
  const urlInput = await question(`RevSport URL [${defaultUrl}]: `);
  const url = urlInput.trim() || defaultUrl;

  // Get credentials
  const username = await question('RevSport username: ');
  if (!username.trim()) {
    console.error('Username is required');
    process.exit(1);
  }

  const password = await question('RevSport password: ');
  if (!password.trim()) {
    console.error('Password is required');
    process.exit(1);
  }

  rl.close();

  console.log('');
  console.log('Encrypting credentials...');

  // Encrypt credentials
  const encryptedCredentials = encryptCredentials(
    { username: username.trim(), password: password.trim() },
    process.env.ENCRYPTION_KEY!
  );

  console.log('Connecting to database...');

  // Connect to database
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
  console.log('Updating dataSourceConfig...');

  // Update the club with encrypted credentials
  await db
    .update(clubs)
    .set({
      dataSourceType: 'revsport',
      dataSourceConfig: {
        url: url,
        credentials_encrypted: encryptedCredentials,
      },
      updatedAt: new Date(),
    })
    .where(eq(clubs.id, lmrcClub.id));

  console.log('');
  console.log('Done! LMRC club is now configured with RevSport credentials.');
  console.log('');
  console.log('Next steps:');
  console.log('1. The background worker will automatically scrape on its next cycle');
  console.log('2. Or restart the worker to trigger an immediate scrape');
  console.log('3. Check https://lmrc.rowandlift.au/api/v1/boats for data');
  console.log('');

  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
