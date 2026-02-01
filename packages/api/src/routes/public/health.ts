/**
 * Health Check Route
 *
 * GET /api/v1/health - Comprehensive health check
 */

import { Router } from 'express';
import type { Response } from 'express';
import { sql } from 'drizzle-orm';
import type { Database } from '@lmrc/db';
import type { ApiRequest, ApiSuccessResponse, HealthCheckResponse } from '../../types.js';
import { asyncHandler } from '../../middleware/errorHandler.js';

/**
 * Create health router
 */
export function createHealthRouter(db: Database): Router {
  const router = Router();

  /**
   * GET /health - Comprehensive health check
   */
  router.get(
    '/',
    asyncHandler(async (req: ApiRequest, res: Response) => {
      const startTime = Date.now();
      const checks: HealthCheckResponse['checks'] = {
        database: { status: 'down', latencyMs: 0 },
        scraper: {
          status: 'idle',
          lastSuccessAt: null,
          lastSuccessAgeSeconds: null,
        },
      };

      let overallStatus: HealthCheckResponse['status'] = 'healthy';

      // Check database connectivity
      try {
        const dbStart = Date.now();
        await db.execute(sql`SELECT 1`);
        checks.database = {
          status: 'up',
          latencyMs: Date.now() - dbStart,
        };

        // Warn if database is slow
        if (checks.database.latencyMs > 500) {
          overallStatus = 'degraded';
        }
      } catch (error) {
        checks.database = { status: 'down', latencyMs: 0 };
        overallStatus = 'unhealthy';
      }

      // Get last scrape info if club context is available
      let clubInfo: HealthCheckResponse['club'] | undefined;

      if (req.club) {
        try {
          // Get last successful scrape job
          const lastJob = await db.query.scrapeJobs.findFirst({
            where: (sj, { and: andFn, eq: eqFn }) =>
              andFn(
                eqFn(sj.clubId, req.club!.id),
                eqFn(sj.status, 'completed')
              ),
            orderBy: (sj, { desc }) => [desc(sj.completedAt)],
          });

          if (lastJob?.completedAt) {
            const ageSeconds = Math.floor(
              (Date.now() - lastJob.completedAt.getTime()) / 1000
            );
            checks.scraper = {
              status: 'idle',
              lastSuccessAt: lastJob.completedAt.toISOString(),
              lastSuccessAgeSeconds: ageSeconds,
            };

            // Warn if scraper is stale (>10 minutes)
            if (ageSeconds > 600) {
              overallStatus = overallStatus === 'healthy' ? 'degraded' : overallStatus;
            }
          }

          // Check if scrape is currently running
          const runningJob = await db.query.scrapeJobs.findFirst({
            where: (sj, { and: andFn, eq: eqFn }) =>
              andFn(
                eqFn(sj.clubId, req.club!.id),
                eqFn(sj.status, 'running')
              ),
          });

          if (runningJob) {
            checks.scraper.status = 'running';
          }

          // Get boat count
          const boats = await db.query.boatCache.findMany({
            where: (bc, { eq: eqFn }) => eqFn(bc.clubId, req.club!.id),
            columns: { id: true, lastScrapedAt: true },
          });

          // Get most recent scrape time from boats
          const lastScrapedAt = boats.reduce((latest, boat) => {
            if (!boat.lastScrapedAt) return latest;
            if (!latest) return boat.lastScrapedAt;
            return boat.lastScrapedAt > latest ? boat.lastScrapedAt : latest;
          }, null as Date | null);

          clubInfo = {
            id: req.club.id,
            name: req.club.name,
            boatsCount: boats.length,
            lastScrapedAt: lastScrapedAt?.toISOString() ?? null,
          };
        } catch {
          // Ignore club-specific errors for health check
        }
      }

      const data: HealthCheckResponse = {
        status: overallStatus,
        timestamp: new Date().toISOString(),
        checks,
        club: clubInfo,
      };

      // Never cache health checks
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

      // Set appropriate status code based on health
      const statusCode =
        overallStatus === 'unhealthy' ? 503 : overallStatus === 'degraded' ? 200 : 200;

      const response: ApiSuccessResponse<HealthCheckResponse> = {
        success: true,
        data,
      };

      res.status(statusCode).json(response);
    })
  );

  return router;
}
