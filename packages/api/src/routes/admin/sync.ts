/**
 * Admin Sync Route
 *
 * POST /api/v1/admin/sync - Trigger immediate scrape
 */

import { Router } from 'express';
import type { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Database } from '@lmrc/db';
import { auditLog, scrapeJobs } from '@lmrc/db';
import type { ApiRequest, ApiSuccessResponse, SyncResponse } from '../../types.js';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logging.js';

/**
 * Sync trigger callback type
 * This allows the API package to remain decoupled from the scraper implementation
 */
export type SyncTriggerFn = (clubId: string) => Promise<{
  jobId: string;
  status: 'queued' | 'running';
}>;

/**
 * Create sync router
 */
export function createSyncRouter(
  db: Database,
  triggerSync?: SyncTriggerFn
): Router {
  const router = Router();

  /**
   * POST /sync - Trigger immediate scrape
   */
  router.post(
    '/',
    asyncHandler(async (req: ApiRequest, res: Response) => {
      if (!req.club) {
        throw ApiError.unauthorized('Club context required');
      }

      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      // Check if a scrape is already running
      const runningJob = await db.query.scrapeJobs.findFirst({
        where: (sj, { and: andFn, eq: eqFn }) =>
          andFn(
            eqFn(sj.clubId, req.club!.id),
            eqFn(sj.status, 'running')
          ),
      });

      if (runningJob) {
        throw ApiError.conflict('A scrape is already in progress');
      }

      let jobId: string;
      let status: 'queued' | 'running';

      if (triggerSync) {
        // Use provided sync trigger (e.g., BullMQ queue in Phase C)
        const result = await triggerSync(req.club.id);
        jobId = result.jobId;
        status = result.status;
      } else {
        // Direct execution (Phase A default)
        // Create a pending job record
        jobId = uuidv4();

        await db.insert(scrapeJobs).values({
          id: jobId,
          clubId: req.club.id,
          jobType: 'booking_calendar',
          status: 'pending',
          createdAt: new Date(),
        });

        status = 'queued';

        // Note: The actual scraping would be triggered by a separate worker
        // that polls for pending jobs, or by calling the scraper directly
        // in a fire-and-forget manner. For now, we just create the job record.
        logger.info(
          {
            requestId: req.requestId,
            clubId: req.club.id,
            jobId,
          },
          'Scrape job created'
        );
      }

      // Record audit log
      await db.insert(auditLog).values({
        clubId: req.club.id,
        userId: req.user.sub,
        action: 'TRIGGER_SYNC',
        resourceType: 'scrape_job',
        resourceId: jobId,
        details: { status },
        ipAddress: req.ip ?? null,
      });

      logger.info(
        {
          requestId: req.requestId,
          clubId: req.club.id,
          userId: req.user.sub,
          jobId,
          status,
        },
        'Sync triggered'
      );

      // Estimate duration based on historical data
      const recentJobs = await db.query.scrapeJobs.findMany({
        where: (sj, { and: andFn, eq: eqFn }) =>
          andFn(
            eqFn(sj.clubId, req.club!.id),
            eqFn(sj.status, 'completed')
          ),
        orderBy: (sj, { desc }) => [desc(sj.completedAt)],
        limit: 5,
      });

      const avgDuration = recentJobs.reduce((sum, job) => {
        if (job.startedAt && job.completedAt) {
          return sum + (job.completedAt.getTime() - job.startedAt.getTime());
        }
        return sum;
      }, 0);

      const estimatedDuration =
        recentJobs.length > 0
          ? Math.round(avgDuration / recentJobs.length / 1000)
          : 30; // Default 30 seconds

      const data: SyncResponse = {
        jobId,
        status,
        estimatedDuration,
      };

      // Never cache admin responses
      res.setHeader('Cache-Control', 'no-store');

      const response: ApiSuccessResponse<SyncResponse> = {
        success: true,
        data,
      };

      res.status(202).json(response); // 202 Accepted for async operation
    })
  );

  return router;
}
