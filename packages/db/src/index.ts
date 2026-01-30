import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

// Re-export schema for convenience
export * from './schema.js';

/**
 * Create a database connection.
 *
 * Usage:
 * ```ts
 * import { createDb } from '@lmrc/db';
 * const db = createDb(process.env.DATABASE_URL);
 * ```
 */
export function createDb(connectionString: string) {
  const client = postgres(connectionString);
  return drizzle(client, { schema });
}

/**
 * Type for the database instance
 */
export type Database = ReturnType<typeof createDb>;
