/**
 * Admin Display Config Route
 *
 * PUT /api/v1/admin/display - Update branding and display config
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { Database } from '@lmrc/db';
import { clubs, auditLog } from '@lmrc/db';
import { eq } from 'drizzle-orm';
import type { ApiRequest, ApiSuccessResponse } from '../../types.js';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';
import { displayConfigUpdateSchema } from '../../schemas/index.js';
import { logger } from '../../middleware/logging.js';

/**
 * Create display config router
 */
export function createDisplayRouter(db: Database): Router {
  const router = Router();

  /**
   * PUT /display - Update branding and display config
   */
  router.put(
    '/',
    asyncHandler(async (req: ApiRequest, res: Response) => {
      if (!req.club) {
        throw ApiError.unauthorized('Club context required');
      }

      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      const input = displayConfigUpdateSchema.parse(req.body);

      // Build updates
      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      const changedFields: string[] = [];

      // Update branding if provided
      if (input.branding) {
        const currentBranding = ((req.club as any).branding as Record<string, unknown>) ?? {};
        updates.branding = {
          ...currentBranding,
          ...input.branding,
        };
        changedFields.push('branding');
      }

      // Update display config if provided
      if (input.displayConfig) {
        const currentDisplayConfig =
          (req.club.displayConfig as Record<string, unknown>) ?? {};
        updates.displayConfig = {
          ...currentDisplayConfig,
          ...input.displayConfig,
        };
        changedFields.push('displayConfig');
      }

      // Update TV display config if provided
      if (input.tvDisplayConfig) {
        const currentTvDisplayConfig =
          ((req.club as any).tvDisplayConfig as Record<string, unknown>) ?? {};
        updates.tvDisplayConfig = {
          ...currentTvDisplayConfig,
          ...input.tvDisplayConfig,
        };
        changedFields.push('tvDisplayConfig');
      }

      if (changedFields.length === 0) {
        throw ApiError.validation('No fields to update');
      }

      await db
        .update(clubs)
        .set(updates)
        .where(eq(clubs.id, req.club.id));

      // Record audit log
      await db.insert(auditLog).values({
        clubId: req.club.id,
        userId: req.user.sub,
        action: 'UPDATE_DISPLAY_CONFIG',
        resourceType: 'club',
        resourceId: req.club.id,
        details: {
          fields: changedFields,
        },
        ipAddress: req.ip ?? null,
      });

      logger.info(
        {
          requestId: req.requestId,
          clubId: req.club.id,
          userId: req.user.sub,
          action: 'UPDATE_DISPLAY_CONFIG',
          fields: changedFields,
        },
        'Display config updated'
      );

      // Never cache admin responses
      res.setHeader('Cache-Control', 'no-store');

      const response: ApiSuccessResponse<{ message: string; updated: string[] }> = {
        success: true,
        data: {
          message: 'Display configuration updated successfully',
          updated: changedFields,
        },
      };

      res.json(response);
    })
  );

  return router;
}
