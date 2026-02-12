/**
 * Admin Credentials Route
 *
 * PUT /api/v1/admin/credentials - Update RevSport credentials
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { Database } from '@lmrc/db';
import { clubs, auditLog } from '@lmrc/db';
import { eq } from 'drizzle-orm';
import { encryptCredentials } from '@lmrc/crypto';
import type { ApiRequest, ApiSuccessResponse } from '../../types.js';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';
import { credentialsUpdateSchema } from '../../schemas/index.js';
import { logger } from '../../middleware/logging.js';

/**
 * Create credentials router
 */
export function createCredentialsRouter(
  db: Database,
  encryptionKey: string
): Router {
  const router = Router();

  /**
   * PUT /credentials - Update RevSport credentials
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

      const input = credentialsUpdateSchema.parse(req.body);

      // Get current config
      const currentConfig = (req.club.dataSourceConfig as Record<string, unknown>) ?? {};

      // Build updated config: always update URL, only re-encrypt if password provided
      const newConfig: Record<string, unknown> = {
        ...currentConfig,
        url: input.url,
      };

      if (input.password) {
        const encryptedCredentials = encryptCredentials(
          {
            username: input.username,
            password: input.password,
          },
          encryptionKey
        );
        newConfig.credentials_encrypted = encryptedCredentials;
      }

      await db
        .update(clubs)
        .set({
          dataSourceConfig: newConfig,
          updatedAt: new Date(),
        })
        .where(eq(clubs.id, req.club.id));

      // Record audit log (never log actual credentials)
      await db.insert(auditLog).values({
        clubId: req.club.id,
        userId: req.user.sub,
        action: 'UPDATE_CREDENTIALS',
        resourceType: 'club',
        resourceId: req.club.id,
        details: {
          fields: ['url', 'credentials'],
          urlChanged: currentConfig.url !== input.url,
        },
        ipAddress: req.ip ?? null,
      });

      logger.info(
        {
          requestId: req.requestId,
          clubId: req.club.id,
          userId: req.user.sub,
          action: 'UPDATE_CREDENTIALS',
        },
        'Credentials updated'
      );

      // Never cache admin responses
      res.setHeader('Cache-Control', 'no-store');

      const response: ApiSuccessResponse<{ message: string }> = {
        success: true,
        data: {
          message: 'Credentials updated successfully',
        },
      };

      res.json(response);
    })
  );

  return router;
}
