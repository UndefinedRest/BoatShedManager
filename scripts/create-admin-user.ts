/**
 * Create Admin User
 *
 * This script creates an admin user for a club in the database.
 *
 * Usage:
 *   pnpm exec tsx scripts/create-admin-user.ts
 *
 * Required environment variables:
 *   - DATABASE_URL: Supabase connection string (from packages/db/.env)
 *
 * You'll be prompted for the email, password, and optional full name.
 */

import { config } from 'dotenv';
import * as readline from 'readline';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load .env from packages/db
const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, '../packages/db/.env') });

// Direct imports from built packages
import { createDb, users } from '../packages/db/dist/index.js';
import { hashPassword } from '../packages/api/dist/index.js';

// Validate environment
if (!process.env.DATABASE_URL) {
  console.error('Missing DATABASE_URL environment variable');
  console.error('Make sure packages/db/.env exists with DATABASE_URL set');
  process.exit(1);
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
  console.log('=== Create Admin User ===');
  console.log('');

  const db = createDb(process.env.DATABASE_URL!);

  // List available clubs
  const clubs = await db.query.clubs.findMany({
    columns: { id: true, name: true, subdomain: true },
  });

  if (clubs.length === 0) {
    console.error('No clubs found. Run the seed script first.');
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

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: (u, { and: andFn, eq: eqFn }) =>
      andFn(
        eqFn(u.email, email.trim().toLowerCase()),
        eqFn(u.clubId, selectedClub.id)
      ),
  });

  if (existingUser) {
    console.error(`User ${email} already exists for ${selectedClub.name}`);
    process.exit(1);
  }

  // Get password
  const password = await question('Password (min 8 chars): ');
  if (password.length < 8) {
    console.error('Password must be at least 8 characters');
    process.exit(1);
  }

  // Get full name (optional)
  const fullName = await question('Full name (optional): ');

  // Get role
  const roleInput = await question('Role (1=club_admin, 2=super_admin) [1]: ');
  const role = roleInput.trim() === '2' ? 'super_admin' : 'club_admin';

  rl.close();

  console.log('');
  console.log('Creating user...');

  // Hash password
  const passwordHash = await hashPassword(password);

  // Insert user
  const [newUser] = await db.insert(users).values({
    clubId: selectedClub.id,
    email: email.trim().toLowerCase(),
    passwordHash,
    fullName: fullName.trim() || null,
    role,
    isActive: true,
  }).returning();

  console.log('');
  console.log('Admin user created successfully!');
  console.log(`  ID: ${newUser.id}`);
  console.log(`  Email: ${newUser.email}`);
  console.log(`  Club: ${selectedClub.name}`);
  console.log(`  Role: ${role}`);
  console.log('');
  console.log('You can now login at:');
  console.log(`  POST https://${selectedClub.subdomain}.rowandlift.au/api/v1/admin/login`);
  console.log('  Body: { "email": "...", "password": "..." }');
  console.log('');

  process.exit(0);
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
