/**
 * Rowing Boards SaaS Background Worker
 *
 * Runs the scraping scheduler for all active clubs.
 * Uses node-cron for scheduling with adaptive refresh rates:
 * - Peak hours (05:00-09:00, 17:00-21:00): every 2 minutes
 * - Day hours (09:00-17:00): every 5 minutes
 * - Night hours (21:00-05:00): every 10 minutes
 *
 * Deployed as a separate Render Background Worker.
 */

import 'dotenv/config';
import { createDb } from '@lmrc/db';
import { ScrapeScheduler } from '@lmrc/scraper';
import { logger } from '@lmrc/api';

// Environment validation
const requiredEnvVars = ['DATABASE_URL', 'ENCRYPTION_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error({ envVar }, 'Missing required environment variable');
    process.exit(1);
  }
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!;
const DAYS_AHEAD = parseInt(process.env.DAYS_AHEAD || '7', 10);

// Initialize database
const db = createDb(process.env.DATABASE_URL!);

// Create scheduler
const scheduler = new ScrapeScheduler(db, {
  encryptionKey: ENCRYPTION_KEY,
  daysAhead: DAYS_AHEAD,
  debug: NODE_ENV === 'development',
});

/**
 * Main entry point
 */
async function main(): Promise<void> {
  logger.info({
    environment: NODE_ENV,
    daysAhead: DAYS_AHEAD,
  }, 'Rowing Boards SaaS Worker starting');

  // Start the scheduler
  scheduler.start();

  // Run an immediate scrape on startup
  logger.info('Running initial scrape...');
  const results = await scheduler.runAllClubs();

  const successful = results.filter(r => r.success).length;
  logger.info({
    total: results.length,
    successful,
    failed: results.length - successful,
  }, 'Initial scrape complete');

  // Keep the process running
  logger.info('Worker running. Scheduled scraping active.');
}

// Graceful shutdown
function shutdown(): void {
  logger.info('Shutting down gracefully');
  scheduler.stop();
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  logger.error({ error: error.message, stack: error.stack }, 'Uncaught exception');
  scheduler.stop();
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  scheduler.stop();
  process.exit(1);
});

// Start the worker
main().catch((error) => {
  logger.error({ error: error.message }, 'Worker failed to start');
  process.exit(1);
});
