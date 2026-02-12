/**
 * Admin Config Route
 *
 * GET /api/v1/admin/config - Get full editable club configuration
 */

import { Router } from 'express';
import type { Response } from 'express';
import { decryptCredentials } from '@lmrc/crypto';
import type { ApiRequest, ApiSuccessResponse } from '../../types.js';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';
import { logger } from '../../middleware/logging.js';

/**
 * Create admin config router
 */
export function createAdminConfigRouter(encryptionKey: string): Router {
  const router = Router();

  /**
   * GET /config - Return full editable configuration for the club
   */
  router.get(
    '/',
    asyncHandler(async (req: ApiRequest, res: Response) => {
      if (!req.club) {
        throw ApiError.unauthorized('Club context required');
      }

      if (!req.user) {
        throw ApiError.unauthorized('Authentication required');
      }

      const club = req.club as any;

      const dataSourceConfig = (club.dataSourceConfig as Record<string, unknown>) ?? {};

      // Decrypt username if credentials exist (never expose password)
      let storedUsername: string | null = null;
      const encryptedCreds = dataSourceConfig.credentials_encrypted as string | undefined;
      if (encryptedCreds) {
        try {
          const decrypted = decryptCredentials(encryptedCreds, encryptionKey);
          storedUsername = decrypted.username;
        } catch (err) {
          logger.warn(
            { requestId: req.requestId, clubId: club.id, error: (err as Error).message },
            'Failed to decrypt credentials for admin config display'
          );
        }
      }

      const data = {
        club: {
          id: club.id,
          name: club.name,
          shortName: club.shortName ?? null,
          subdomain: club.subdomain,
          timezone: club.timezone ?? null,
        },
        branding: (club.branding as Record<string, unknown>) ?? {},
        displayConfig: (club.displayConfig as Record<string, unknown>) ?? {},
        tvDisplayConfig: (club.tvDisplayConfig as Record<string, unknown>) ?? {},
        dataSource: {
          type: club.dataSourceType ?? null,
          url: (dataSourceConfig.url as string) ?? null,
          username: storedUsername,
          hasCredentials: !!(encryptedCreds),
        },
      };

      res.setHeader('Cache-Control', 'no-store');

      const response: ApiSuccessResponse<typeof data> = {
        success: true,
        data,
      };

      res.json(response);
    })
  );

  return router;
}
