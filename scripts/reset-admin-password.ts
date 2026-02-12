/**
 * Reset Admin Password
 *
 * Interactive script to reset an admin user's password.
 *
 * Usage:
 *   pnpm exec tsx scripts/reset-admin-password.ts              # dev
 *   pnpm exec tsx scripts/reset-admin-password.ts --production  # production
 */

import * as readline from 'readline';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';
import { loadEnv } from './lib/env.js';
import { users, auditLog } from '../packages/db/dist/index.js';

async function main() {
  const { db, env } = await loadEnv();

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

  console.log('=== Reset Admin Password ===');
  console.log('');

  // List available clubs
  const clubs = await db.query.clubs.findMany({
    columns: { id: true, name: true, subdomain: true },
  });

  if (clubs.length === 0) {
    console.error('No clubs found.');
    process.exit(1);
  }

  console.log('Available clubs:');
  clubs.forEach((club, idx) => {
    console.log(`  ${idx + 1}. ${club.name} (${club.subdomain})`);
  });
  console.log('');

  // Select club
  const clubInput = await question(`Select club (1-${clubs.length}): `);
  const clubIdx = parseInt(clubInput.trim(), 10) - 1;
  if (isNaN(clubIdx) || clubIdx < 0 || clubIdx >= clubs.length) {
    console.error('Invalid selection');
    process.exit(1);
  }
  const selectedClub = clubs[clubIdx];

  // Get email
  const email = await question('Email: ');
  if (!email.trim() || !email.includes('@')) {
    console.error('Invalid email');
    process.exit(1);
  }

  // Find user
  const user = await db.query.users.findFirst({
    where: (u, { and: andFn, eq: eqFn }) =>
      andFn(
        eqFn(u.email, email.trim().toLowerCase()),
        eqFn(u.clubId, selectedClub.id)
      ),
  });

  if (!user) {
    console.error(`User ${email} not found for ${selectedClub.name}`);
    process.exit(1);
  }

  if (!user.isActive) {
    console.error(`User ${email} is inactive. Activate the account first.`);
    process.exit(1);
  }

  console.log('');
  console.log(`  User: ${user.email}`);
  console.log(`  Name: ${user.fullName || '(not set)'}`);
  console.log(`  Role: ${user.role}`);
  console.log('');

  // Get new password
  const password = await question('New password (min 8 chars): ');
  if (password.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  const confirm = await question('Confirm password: ');
  if (password !== confirm) {
    console.error('Passwords do not match');
    process.exit(1);
  }

  rl.close();

  console.log('');
  console.log('Resetting password...');

  // Hash and update
  const passwordHash = await bcrypt.hash(password, 12);

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, user.id));

  // Audit log
  await db.insert(auditLog).values({
    clubId: selectedClub.id,
    userId: user.id,
    action: 'PASSWORD_RESET',
    resourceType: 'user',
    resourceId: user.id,
    details: { method: 'cli_script', environment: env },
  });

  console.log('');
  console.log('Password reset successfully!');
  console.log(`  Email: ${user.email}`);
  console.log(`  Club: ${selectedClub.name}`);
  console.log(`  Environment: ${env.toUpperCase()}`);
  console.log('');

  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
