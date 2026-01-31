/**
 * Config Public Route
 *
 * GET /api/v1/config - Get display configuration for the club
 */

import { Router } from 'express';
import type { Response } from 'express';
import crypto from 'crypto';
import type { ApiRequest, ApiSuccessResponse } from '../../types.js';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';

/**
 * Config response type
 */
interface ConfigResponse {
  club: {
    id: string;
    name: string;
    shortName: string | null;
    timezone: string | null;
  };
  branding: {
    logoUrl: string | null;
    primaryColor: string | null;
    secondaryColor: string | null;
    customCSS: string | null;
  };
  displayConfig: Record<string, unknown>;
}

/**
 * Create config router
 */
export function createConfigRouter(): Router {
  const router = Router();

  /**
   * GET /config - Get display configuration
   */
  router.get(
    '/',
    asyncHandler(async (req: ApiRequest, res: Response) => {
      if (!req.club) {
        throw ApiError.unauthorized('Club context required');
      }

      const club = req.club;

      // Extract branding from the club data
      const branding = (club as any).branding as Record<string, unknown> | null;
      const displayConfig = (club.displayConfig as Record<string, unknown>) ?? {};

      const data: ConfigResponse = {
        club: {
          id: club.id,
          name: club.name,
          shortName: (club as any).shortName ?? null,
          timezone: club.timezone,
        },
        branding: {
          logoUrl: (branding?.logoUrl as string) ?? null,
          primaryColor: (branding?.primaryColor as string) ?? null,
          secondaryColor: (branding?.secondaryColor as string) ?? null,
          customCSS: (branding?.customCSS as string) ?? null,
        },
        displayConfig,
      };

      // Generate ETag based on config content
      const etag = crypto
        .createHash('md5')
        .update(JSON.stringify(data))
        .digest('hex');

      // Check If-None-Match for conditional request
      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch === `"${etag}"`) {
        res.status(304).end();
        return;
      }

      // Set cache headers with ETag
      res.setHeader('Cache-Control', 'max-age=300, stale-while-revalidate=3600');
      res.setHeader('ETag', `"${etag}"`);

      const response: ApiSuccessResponse<ConfigResponse> = {
        success: true,
        data,
      };

      res.json(response);
    })
  );

  return router;
}
