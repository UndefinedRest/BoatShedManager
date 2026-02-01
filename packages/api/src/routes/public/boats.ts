/**
 * Boats Public Routes
 *
 * GET /api/v1/boats - List all boats for the club
 * GET /api/v1/boats/:id - Get single boat details
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { Database } from '@lmrc/db';
import { boatCache } from '@lmrc/db';
import { eq, and } from 'drizzle-orm';
import type { ApiRequest, ApiSuccessResponse } from '../../types.js';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';
import { paginationSchema, uuidParamSchema } from '../../schemas/index.js';

/**
 * Boat response type
 */
interface BoatResponse {
  id: string;
  sourceId: string | null; // External system ID (e.g., RevSport boat ID)
  name: string;
  boatType: string | null;
  boatCategory: string | null;
  classification: string | null;
  weight: number | null;
  isDamaged: boolean | null;
  damagedReason: string | null;
  metadata: unknown;
  lastScrapedAt: string | null;
}

/**
 * Create boats router
 */
export function createBoatsRouter(db: Database): Router {
  const router = Router();

  /**
   * GET /boats - List all boats for the club
   */
  router.get(
    '/',
    asyncHandler(async (req: ApiRequest, res: Response) => {
      if (!req.club) {
        throw ApiError.unauthorized('Club context required');
      }

      const query = paginationSchema.parse(req.query);

      // Get total count
      const allBoats = await db.query.boatCache.findMany({
        where: (bc, { eq: eqFn }) => eqFn(bc.clubId, req.club!.id),
        columns: { id: true },
      });
      const total = allBoats.length;

      // Get paginated boats
      const boats = await db.query.boatCache.findMany({
        where: (bc, { eq: eqFn }) => eqFn(bc.clubId, req.club!.id),
        limit: query.limit,
        offset: query.offset,
        orderBy: (bc, { asc }) => [asc(bc.name)],
      });

      const data: BoatResponse[] = boats.map((boat) => ({
        id: boat.id,
        sourceId: boat.revsportBoatId,
        name: boat.name,
        boatType: boat.boatType,
        boatCategory: boat.boatCategory,
        classification: boat.classification,
        weight: boat.weight,
        isDamaged: boat.isDamaged,
        damagedReason: boat.damagedReason,
        metadata: boat.metadata,
        lastScrapedAt: boat.lastScrapedAt?.toISOString() ?? null,
      }));

      // Set cache headers
      res.setHeader('Cache-Control', 'max-age=60, stale-while-revalidate=300');

      const response: ApiSuccessResponse<BoatResponse[]> = {
        success: true,
        data,
        meta: {
          total,
          limit: query.limit,
          offset: query.offset,
          count: data.length,
        },
      };

      res.json(response);
    })
  );

  /**
   * GET /boats/:id - Get single boat details
   * Accepts either UUID (internal ID) or sourceId (external system ID)
   */
  router.get(
    '/:id',
    asyncHandler(async (req: ApiRequest, res: Response) => {
      if (!req.club) {
        throw ApiError.unauthorized('Club context required');
      }

      const id = req.params.id;
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      let boat;
      if (isUuid) {
        // Lookup by internal UUID
        boat = await db.query.boatCache.findFirst({
          where: (bc, { and: andFn, eq: eqFn }) =>
            andFn(eqFn(bc.id, id), eqFn(bc.clubId, req.club!.id)),
        });
      } else {
        // Lookup by external sourceId
        boat = await db.query.boatCache.findFirst({
          where: (bc, { and: andFn, eq: eqFn }) =>
            andFn(eqFn(bc.revsportBoatId, id), eqFn(bc.clubId, req.club!.id)),
        });
      }

      if (!boat) {
        throw ApiError.notFound('Boat');
      }

      const data: BoatResponse = {
        id: boat.id,
        sourceId: boat.revsportBoatId,
        name: boat.name,
        boatType: boat.boatType,
        boatCategory: boat.boatCategory,
        classification: boat.classification,
        weight: boat.weight,
        isDamaged: boat.isDamaged,
        damagedReason: boat.damagedReason,
        metadata: boat.metadata,
        lastScrapedAt: boat.lastScrapedAt?.toISOString() ?? null,
      };

      // Set cache headers
      res.setHeader('Cache-Control', 'max-age=60, stale-while-revalidate=300');

      const response: ApiSuccessResponse<BoatResponse> = {
        success: true,
        data,
      };

      res.json(response);
    })
  );

  return router;
}
