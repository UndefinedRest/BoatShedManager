/**
 * Config Public Routes
 *
 * GET /api/v1/config - Get display configuration for the club (merged based on mode)
 * GET /api/v1/config/branding - Get club branding only (heavily cached)
 * GET /api/v1/config/display - Get display config based on mode (?mode=tv)
 */

import { Router } from 'express';
import type { Response } from 'express';
import crypto from 'crypto';
import type { ApiRequest, ApiSuccessResponse } from '../../types.js';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';

/**
 * Branding response type
 */
interface BrandingResponse {
  logoUrl: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  customCSS: string | null;
}

/**
 * Display config response type
 */
interface DisplayConfigResponse {
  mode: 'tv' | 'interactive';
  config: Record<string, unknown>;
}

/**
 * Full config response type
 */
interface ConfigResponse {
  club: {
    id: string;
    name: string;
    shortName: string | null;
    timezone: string | null;
  };
  branding: BrandingResponse;
  displayConfig: Record<string, unknown>;
  mode: 'tv' | 'interactive';
}

/**
 * Helper to extract branding from club
 */
function extractBranding(club: any): BrandingResponse {
  const branding = club.branding as Record<string, unknown> | null;
  return {
    logoUrl: (branding?.logoUrl as string) ?? null,
    primaryColor: (branding?.primaryColor as string) ?? null,
    secondaryColor: (branding?.secondaryColor as string) ?? null,
    customCSS: (branding?.customCSS as string) ?? null,
  };
}

/**
 * Detect display mode from query parameter
 * Default is 'interactive' - TV mode requires explicit ?mode=tv
 */
function detectDisplayMode(req: ApiRequest): 'tv' | 'interactive' {
  const modeParam = req.query.mode;
  return modeParam === 'tv' ? 'tv' : 'interactive';
}

/**
 * Get display config based on mode
 * TV mode: uses tvDisplayConfig (optimized for 55" TV at 2m)
 * Interactive mode: uses displayConfig (web/mobile preferences)
 */
function getDisplayConfigForMode(club: any, mode: 'tv' | 'interactive'): Record<string, unknown> {
  if (mode === 'tv') {
    // TV mode: return TV-specific config
    return (club.tvDisplayConfig as Record<string, unknown>) ?? {};
  }
  // Interactive mode: return general display config
  return (club.displayConfig as Record<string, unknown>) ?? {};
}

/**
 * Create config router
 */
export function createConfigRouter(): Router {
  const router = Router();

  /**
   * GET /config/branding - Get club branding only
   * Heavily cached - branding rarely changes
   */
  router.get(
    '/branding',
    asyncHandler(async (req: ApiRequest, res: Response) => {
      if (!req.club) {
        throw ApiError.unauthorized('Club context required');
      }

      const branding = extractBranding(req.club);

      // Generate ETag
      const etag = crypto
        .createHash('md5')
        .update(JSON.stringify(branding))
        .digest('hex');

      // Check If-None-Match
      if (req.headers['if-none-match'] === `"${etag}"`) {
        res.status(304).end();
        return;
      }

      // Branding rarely changes - cache for 1 hour
      res.setHeader('Cache-Control', 'max-age=3600, stale-while-revalidate=86400');
      res.setHeader('ETag', `"${etag}"`);

      const response: ApiSuccessResponse<BrandingResponse> = {
        success: true,
        data: branding,
      };

      res.json(response);
    })
  );

  /**
   * GET /config/display - Get display config based on mode
   * Query: ?mode=tv for TV display, otherwise interactive (default)
   */
  router.get(
    '/display',
    asyncHandler(async (req: ApiRequest, res: Response) => {
      if (!req.club) {
        throw ApiError.unauthorized('Club context required');
      }

      const mode = detectDisplayMode(req);
      const config = getDisplayConfigForMode(req.club, mode);

      const data: DisplayConfigResponse = {
        mode,
        config,
      };

      // Generate ETag
      const etag = crypto
        .createHash('md5')
        .update(JSON.stringify(data))
        .digest('hex');

      // Check If-None-Match
      if (req.headers['if-none-match'] === `"${etag}"`) {
        res.status(304).end();
        return;
      }

      // Cache for 5 minutes
      res.setHeader('Cache-Control', 'max-age=300, stale-while-revalidate=3600');
      res.setHeader('ETag', `"${etag}"`);

      const response: ApiSuccessResponse<DisplayConfigResponse> = {
        success: true,
        data,
      };

      res.json(response);
    })
  );

  /**
   * GET /config - Get full configuration
   * Merges club info, branding, and display config based on mode
   */
  router.get(
    '/',
    asyncHandler(async (req: ApiRequest, res: Response) => {
      if (!req.club) {
        throw ApiError.unauthorized('Club context required');
      }

      const club = req.club;
      const mode = detectDisplayMode(req);
      const displayConfig = getDisplayConfigForMode(club, mode);

      const data: ConfigResponse = {
        club: {
          id: club.id,
          name: club.name,
          shortName: (club as any).shortName ?? null,
          timezone: club.timezone,
        },
        branding: extractBranding(club),
        displayConfig,
        mode,
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
