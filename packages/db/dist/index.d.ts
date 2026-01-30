import postgres from 'postgres';
import * as schema from './schema.js';
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
export declare function createDb(connectionString: string): import("drizzle-orm/postgres-js").PostgresJsDatabase<typeof schema> & {
    $client: postgres.Sql<{}>;
};
/**
 * Type for the database instance
 */
export type Database = ReturnType<typeof createDb>;
//# sourceMappingURL=index.d.ts.map