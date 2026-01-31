/**
 * Admin Status Route
 *
 * GET /api/v1/admin/status - Get scrape status and history
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { Database } from '@lmrc/db';
import type { ApiRequest, ApiSuccessResponse, AdminStatusResponse } from '../../types.js';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';

/**
 * Create status router
 */
export function createStatusRouter(db: Database): Router {
  const router = Router();

  /**
   * GET /status - Get scrape status and history
   */
  router.get(
    '/',
    asyncHandler(async (req: ApiRequest, res: Response) => {
      if (!req.club) {
        throw ApiError.unauthorized('Club context required');
      }

      // Get last completed scrape
      const lastScrape = await db.query.scrapeJobs.findFirst({
        where: (sj, { and: andFn, eq: eqFn }) =>
          andFn(
            eqFn(sj.clubId, req.club!.id),
            eqFn(sj.status, 'completed')
          ),
        orderBy: (sj, { desc }) => [desc(sj.completedAt)],
      });

      // Get recent jobs (last 10)
      const recentJobs = await db.query.scrapeJobs.findMany({
        where: (sj, { eq: eqFn }) => eqFn(sj.clubId, req.club!.id),
        orderBy: (sj, { desc }) => [desc(sj.completedAt)],
        limit: 10,
      });

      // Calculate stats for last 24 hours
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const last24hJobs = await db.query.scrapeJobs.findMany({
        where: (sj, { and: andFn, eq: eqFn, gte: gteFn }) =>
          andFn(
            eqFn(sj.clubId, req.club!.id),
            gteFn(sj.completedAt, oneDayAgo)
          ),
      });

      const successCount = last24hJobs.filter((j) => j.status === 'completed').length;
      const failedCount = last24hJobs.filter((j) => j.status === 'failed').length;

      // Calculate average duration
      const completedJobs = last24hJobs.filter(
        (j) => j.status === 'completed' && j.startedAt && j.completedAt
      );
      const totalDuration = completedJobs.reduce((sum, j) => {
        const duration = j.completedAt!.getTime() - j.startedAt!.getTime();
        return sum + duration;
      }, 0);
      const avgDurationMs =
        completedJobs.length > 0 ? Math.round(totalDuration / completedJobs.length) : 0;

      // Get boat and booking counts from last scrape metadata (if available)
      let boatsCount = 0;
      let bookingsCount = 0;

      if (lastScrape) {
        // Count current boats and bookings
        const boats = await db.query.boatCache.findMany({
          where: (bc, { eq: eqFn }) => eqFn(bc.clubId, req.club!.id),
          columns: { id: true },
        });
        boatsCount = boats.length;

        const bookings = await db.query.bookingCache.findMany({
          where: (bc, { eq: eqFn }) => eqFn(bc.clubId, req.club!.id),
          columns: { id: true },
        });
        bookingsCount = bookings.length;
      }

      // Calculate duration of last scrape
      const lastScrapeDuration =
        lastScrape?.startedAt && lastScrape?.completedAt
          ? lastScrape.completedAt.getTime() - lastScrape.startedAt.getTime()
          : 0;

      const data: AdminStatusResponse = {
        lastScrape: lastScrape
          ? {
              completedAt: lastScrape.completedAt?.toISOString() ?? null,
              status: lastScrape.status ?? 'unknown',
              boatsCount,
              bookingsCount,
              durationMs: lastScrapeDuration,
            }
          : null,
        recentJobs: recentJobs.map((job) => ({
          completedAt: job.completedAt?.toISOString() ?? new Date().toISOString(),
          status: job.status ?? 'unknown',
          error: job.errorMessage ?? undefined,
        })),
        nextScheduled: null, // Would need scheduler integration to determine
        scrapeStats: {
          last24h: {
            success: successCount,
            failed: failedCount,
          },
          avgDurationMs,
        },
      };

      // Never cache admin responses
      res.setHeader('Cache-Control', 'no-store');

      const response: ApiSuccessResponse<AdminStatusResponse> = {
        success: true,
        data,
      };

      res.json(response);
    })
  );

  return router;
}
