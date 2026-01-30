/**
 * Configuration Migration Script
 *
 * Migrates from old .env-based configuration to new JSON configuration format.
 *
 * Usage:
 *   npx tsx scripts/migrate-config.ts <path-to-env-file> <output-path>
 *
 * Example:
 *   npx tsx scripts/migrate-config.ts ../lmrc-booking-system/.env ./config/club-profile.json
 */

import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { ConfigManager, createDefaultProfile, type Session } from '../src/index.js';

async function migrate() {
  const envPath = process.argv[2];
  const outputPath = process.argv[3];

  if (!envPath || !outputPath) {
    console.error('Usage: npx tsx scripts/migrate-config.ts <env-file> <output-file>');
    console.error('Example: npx tsx scripts/migrate-config.ts ../lmrc-booking-system/.env ./config/club-profile.json');
    process.exit(1);
  }

  // Load environment variables from specified file
  console.log(`📖 Loading configuration from: ${envPath}`);
  const result = config({ path: resolve(envPath) });

  if (result.error) {
    console.error(`❌ Failed to load .env file: ${result.error.message}`);
    process.exit(1);
  }

  // Extract sessions from environment variables
  const sessions: Session[] = [];

  // Session 1
  if (process.env.SESSION_1_START && process.env.SESSION_1_END) {
    sessions.push({
      id: 'AM1',
      name: 'Early Morning',
      startTime: process.env.SESSION_1_START,
      endTime: process.env.SESSION_1_END,
      daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      color: '#60a5fa',
      priority: 1,
    });
  }

  // Session 2
  if (process.env.SESSION_2_START && process.env.SESSION_2_END) {
    sessions.push({
      id: 'AM2',
      name: 'Main Morning',
      startTime: process.env.SESSION_2_START,
      endTime: process.env.SESSION_2_END,
      daysOfWeek: [1, 2, 3, 4, 5], // Mon-Fri
      color: '#3b82f6',
      priority: 2,
    });
  }

  // Create club profile
  const clubProfile = {
    version: '1.0.0',
    club: {
      id: 'lmrc',
      name: 'Lake Macquarie Rowing Club',
      shortName: 'LMRC',
      timezone: 'Australia/Sydney',
    },
    branding: {
      logoUrl: 'https://www.lakemacquarierowingclub.org.au/images/logo.png',
      primaryColor: '#1e40af',
      secondaryColor: '#0ea5e9',
    },
    sessions: sessions.length > 0 ? sessions : [
      // Default session if none found in .env
      {
        id: 'AM',
        name: 'Morning',
        startTime: '06:30',
        endTime: '08:30',
        daysOfWeek: [1, 2, 3, 4, 5],
        color: '#3b82f6',
        priority: 1,
      },
    ],
    revSport: {
      baseUrl: process.env.REVSPORT_BASE_URL || '',
    },
  };

  // Save to new location
  console.log(`💾 Saving configuration to: ${outputPath}`);
  const manager = new ConfigManager(resolve(outputPath));
  await manager.save(clubProfile);

  console.log('✅ Configuration migrated successfully!');
  console.log('');
  console.log('📋 Migration Summary:');
  console.log(`   Club: ${clubProfile.club.name} (${clubProfile.club.id})`);
  console.log(`   Sessions: ${clubProfile.sessions.length}`);
  clubProfile.sessions.forEach((session, i) => {
    console.log(`     ${i + 1}. ${session.name} (${session.startTime}-${session.endTime})`);
  });
  console.log(`   RevSport URL: ${clubProfile.revSport.baseUrl}`);
  console.log('');
  console.log('⚠️  Note: Credentials (username/password) are NOT migrated.');
  console.log('   Keep them in your .env file or use environment variables.');
}

migrate().catch((error) => {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
});
