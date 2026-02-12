/**
 * Setup LMRC RevSport Credentials
 *
 * This script encrypts RevSport credentials and updates the LMRC club
 * in the database so the scraper can fetch boat/booking data.
 *
 * Usage:
 *   pnpm exec tsx scripts/setup-lmrc-credentials.ts              # dev
 *   pnpm exec tsx scripts/setup-lmrc-credentials.ts --production  # production
 *
 * You'll be prompted for the RevSport URL, username, and password.
 */

import * as readline from 'readline';
import { eq } from 'drizzle-orm';
import { loadEnv } from './lib/env.js';
import { clubs } from '../packages/db/dist/index.js';
import { encryptCredentials } from '../packages/crypto/dist/index.js';

async function main() {
  const { db, env, getEncryptionKey } = await loadEnv();

  // Create readline AFTER loadEnv() — both use stdin and conflict on Windows
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  function question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      rl.question(prompt, resolve);
    });
  }

  // Validate encryption key is available
  let encryptionKey: string;
  try {
    encryptionKey = getEncryptionKey();
  } catch (error) {
    console.error((error as Error).message);
    console.error('');
    if (env === 'production') {
      console.error('Set PRODUCTION_ENCRYPTION_KEY in your shell environment.');
    } else {
      console.error('Set ENCRYPTION_KEY in packages/db/.env');
    }
    process.exit(1);
  }

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
    encryptionKey
  );

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
  console.log(`Done! Credentials stored. [${env.toUpperCase()}]`);
  console.log('');

  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
