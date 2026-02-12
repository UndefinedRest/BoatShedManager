/**
 * Shared Environment Loader for CLI Scripts
 *
 * Ensures every script explicitly targets either DEV or PRODUCTION,
 * displays a clear banner showing which database is in use, and
 * requires confirmation before running against production.
 *
 * Usage:
 *   // In any script:
 *   import { loadEnv } from './lib/env.js';
 *   const { db, env } = await loadEnv();
 *
 *   // For scripts that need ENCRYPTION_KEY:
 *   const { db, env, getEncryptionKey } = await loadEnv();
 *   const key = getEncryptionKey(); // throws if not set
 *
 * Flags:
 *   --dev          Target the dev database (default, loaded from packages/db/.env)
 *   --production   Target the production database (requires PRODUCTION_DATABASE_URL env var)
 *
 * Examples:
 *   pnpm exec tsx scripts/check-lmrc-config.ts                          # dev (default)
 *   pnpm exec tsx scripts/check-lmrc-config.ts --production             # production
 *   PRODUCTION_DATABASE_URL="..." pnpm exec tsx scripts/check-lmrc-config.ts --production
 */

import { config } from 'dotenv';
import * as readline from 'readline';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createDb, type Database } from '../../packages/db/dist/index.js';

export type Environment = 'dev' | 'production';

export interface EnvResult {
  db: Database;
  env: Environment;
  databaseUrl: string;
  getEncryptionKey: () => string;
}

/**
 * Extract the Supabase project host from a connection string.
 * Shows enough to identify which database, but not the password.
 */
function describeDatabase(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.username}@${parsed.host}${parsed.pathname}`;
  } catch {
    return '(unable to parse URL)';
  }
}

/**
 * Prompt the user for confirmation. Returns true if they type "yes".
 */
function confirmProduction(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('  Type "yes" to continue: ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === 'yes');
    });
  });
}

/**
 * Load the environment, display a banner, and return a database connection.
 *
 * Parses --dev / --production from process.argv.
 * Defaults to dev if no flag is provided.
 * Production requires PRODUCTION_DATABASE_URL env var and interactive confirmation.
 */
export async function loadEnv(): Promise<EnvResult> {
  const args = process.argv.slice(2);
  const isProduction = args.includes('--production') || args.includes('--prod');
  const isDev = args.includes('--dev');

  if (isProduction && isDev) {
    console.error('Cannot specify both --dev and --production');
    process.exit(1);
  }

  const env: Environment = isProduction ? 'production' : 'dev';

  let databaseUrl: string;
  let encryptionKey: string | undefined;

  if (env === 'production') {
    // Production: require PRODUCTION_DATABASE_URL from shell environment
    databaseUrl = process.env.PRODUCTION_DATABASE_URL || '';

    if (!databaseUrl) {
      console.error('');
      console.error('  PRODUCTION_DATABASE_URL is not set.');
      console.error('');
      console.error('  To run against production, set it in your shell:');
      console.error('');
      console.error('    export PRODUCTION_DATABASE_URL="postgresql://..."');
      console.error('    pnpm exec tsx scripts/<script>.ts --production');
      console.error('');
      console.error('  Get the production DATABASE_URL from the Render dashboard.');
      console.error('');
      process.exit(1);
    }

    encryptionKey = process.env.PRODUCTION_ENCRYPTION_KEY;
  } else {
    // Dev: load from packages/db/.env
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    config({ path: path.join(__dirname, '../../packages/db/.env') });

    databaseUrl = process.env.DATABASE_URL || '';

    if (!databaseUrl) {
      console.error('Missing DATABASE_URL in packages/db/.env');
      process.exit(1);
    }

    encryptionKey = process.env.ENCRYPTION_KEY;
  }

  // Display environment banner
  console.log('');
  if (env === 'production') {
    console.log('  ============================================');
    console.log('  !!!          PRODUCTION DATABASE         !!!');
    console.log('  ============================================');
  } else {
    console.log('  ----------- DEVELOPMENT DATABASE -----------');
  }
  console.log(`  Environment:  ${env.toUpperCase()}`);
  console.log(`  Database:     ${describeDatabase(databaseUrl)}`);
  console.log('');

  // Require confirmation for production
  if (env === 'production') {
    console.log('  You are about to run a script against PRODUCTION.');
    const confirmed = await confirmProduction();
    if (!confirmed) {
      console.log('  Aborted.');
      process.exit(0);
    }
    console.log('');
  }

  const db = createDb(databaseUrl);

  return {
    db,
    env,
    databaseUrl,
    getEncryptionKey: () => {
      const key = env === 'production'
        ? process.env.PRODUCTION_ENCRYPTION_KEY
        : process.env.ENCRYPTION_KEY;

      if (!key) {
        const varName = env === 'production' ? 'PRODUCTION_ENCRYPTION_KEY' : 'ENCRYPTION_KEY';
        throw new Error(`${varName} is not set`);
      }
      return key;
    },
  };
}
