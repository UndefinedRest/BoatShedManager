/**
 * Public Sync Route
 *
 * POST /api/v1/sync - Trigger a RevSport scrape for the current club
 *
 * This endpoint is used by the manual refresh button on the booking board.
 * It triggers a synchronous scrape (waits for completion) so the frontend
 * can immediately fetch updated data afterward.
 *
 * Rate limited to 1 request per 60 seconds per club (shared across all users).
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { ApiRequest, ApiSuccessResponse } from '../../types.js';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logging.js';

/**
 * Public sync trigger function type.
 * Unlike the admin SyncTriggerFn (which is async/fire-and-forget),
 * this runs synchronously and returns when the scrape is complete.
 */
export type PublicSyncFn = (clubId: string) => Promise<{
  success: boolean;
  durationMs: number;
  error?: string;
}>;

/**
 * Public sync response
 */
interface PublicSyncResponse {
  success: boolean;
  durationMs: number;
}

/**
 * Create public sync router
 */
export function createPublicSyncRouter(syncFn?: PublicSyncFn): Router {
  const router = Router();

  /**
   * POST /sync - Trigger RevSport scrape for the current club
   */
  router.post(
    '/',
    asyncHandler(async (req: ApiRequest, res: Response) => {
      if (!req.club) {
        throw ApiError.unauthorized('Club context required');
      }

      if (!syncFn) {
        throw ApiError.internal('Sync is not available on this instance');
      }

      logger.info(
        {
          requestId: req.requestId,
          clubId: req.club.id,
        },
        'Public sync triggered'
      );

      const result = await syncFn(req.club.id);

      if (!result.success) {
        logger.warn(
          {
            requestId: req.requestId,
            clubId: req.club.id,
            error: result.error,
            durationMs: result.durationMs,
          },
          'Public sync failed'
        );
      } else {
        logger.info(
          {
            requestId: req.requestId,
            clubId: req.club.id,
            durationMs: result.durationMs,
          },
          'Public sync completed'
        );
      }

      // Never cache sync responses
      res.setHeader('Cache-Control', 'no-store');

      const data: PublicSyncResponse = {
        success: result.success,
        durationMs: result.durationMs,
      };

      const response: ApiSuccessResponse<PublicSyncResponse> = {
        success: true,
        data,
      };

      res.json(response);
    })
  );

  return router;
}
