/**
 * Damage Report Public Route
 *
 * POST /api/v1/damage-report - Submit a damage report for a boat
 *
 * Sends a structured email to the club's configured boat captain.
 * Rate limited to 5 reports per hour per tenant+IP.
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { ApiRequest, ApiSuccessResponse } from '../../types.js';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';
import { damageReportSchema } from '../../schemas/index.js';
import { isEmailServiceAvailable, sendDamageReportEmail } from '../../services/email.js';
import { logger } from '../../middleware/logging.js';

/**
 * Create damage report router
 */
export function createDamageReportRouter(): Router {
  const router = Router();

  /**
   * POST / - Submit a damage report
   */
  router.post(
    '/',
    asyncHandler(async (req: ApiRequest, res: Response) => {
      if (!req.club) {
        throw ApiError.unauthorized('Club context required');
      }

      if (!isEmailServiceAvailable()) {
        throw ApiError.serviceUnavailable('Damage reporting is not available at this time');
      }

      const displayConfig = req.club.displayConfig as Record<string, unknown> | null;
      const damageReportEmail = displayConfig?.damageReportEmail as string | undefined;

      if (!damageReportEmail) {
        throw ApiError.serviceUnavailable('Damage reporting is not configured for this club');
      }

      const input = damageReportSchema.parse(req.body);

      await sendDamageReportEmail({
        to: damageReportEmail,
        clubName: req.club.name,
        boatId: input.boatId,
        boatName: input.boatName,
        description: input.description,
        damageTypes: input.damageTypes,
        comment: input.comment,
        reportedAt: new Date().toISOString(),
        reporterIp: req.ip || req.socket.remoteAddress || 'unknown',
      });

      logger.info(
        {
          requestId: req.requestId,
          clubId: req.club.id,
          boatId: input.boatId,
          boatName: input.boatName,
        },
        'Damage report submitted'
      );

      const response: ApiSuccessResponse<{ message: string }> = {
        success: true,
        data: { message: 'Damage report submitted successfully' },
      };

      res.status(201).json(response);
    })
  );

  return router;
}
