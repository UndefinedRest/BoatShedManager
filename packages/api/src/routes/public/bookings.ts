/**
 * Bookings Public Routes
 *
 * GET /api/v1/bookings - List all bookings with optional filters
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { Database } from '@lmrc/db';
import type { ApiRequest, ApiSuccessResponse } from '../../types.js';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';
import { bookingsQuerySchema } from '../../schemas/index.js';

/**
 * Booking response type
 */
interface BookingResponse {
  id: string;
  boatId: string;
  boatSourceId: string | null; // External system boat ID
  boatName: string;
  date: string;
  sessionName: string | null;
  bookings: unknown;
  scrapedAt: string | null;
}

/**
 * Create bookings router
 */
export function createBookingsRouter(db: Database): Router {
  const router = Router();

  /**
   * GET /bookings - List all bookings with optional filters
   */
  router.get(
    '/',
    asyncHandler(async (req: ApiRequest, res: Response) => {
      if (!req.club) {
        throw ApiError.unauthorized('Club context required');
      }

      const query = bookingsQuerySchema.parse(req.query);

      // Build where conditions
      const conditions: Array<ReturnType<typeof buildDateCondition>> = [];

      // Filter by boat (internal UUID)
      if (query.boat) {
        conditions.push((bc: any, { eq }: any) => eq(bc.boatId, query.boat));
      }

      // Filter by external source ID (e.g., RevSport boat ID)
      if (query.sourceId) {
        const boat = await db.query.boatCache.findFirst({
          where: (b, { eq, and }) =>
            and(eq(b.clubId, req.club!.id), eq(b.revsportBoatId, query.sourceId!)),
          columns: { id: true },
        });
        if (boat) {
          conditions.push((bc: any, { eq }: any) => eq(bc.boatId, boat.id));
        } else {
          // No boat found for this sourceId — return empty result
          const response: ApiSuccessResponse<BookingResponse[]> = {
            success: true,
            data: [],
            meta: { total: 0, limit: query.limit, offset: query.offset, count: 0 },
          };
          res.setHeader('Cache-Control', 'max-age=30, stale-while-revalidate=120');
          res.json(response);
          return;
        }
      }

      // Filter by single date
      if (query.date) {
        conditions.push((bc: any, { eq }: any) => eq(bc.bookingDate, query.date));
      }

      // Filter by date range
      if (query.from) {
        conditions.push((bc: any, { gte }: any) => gte(bc.bookingDate, query.from));
      }
      if (query.to) {
        conditions.push((bc: any, { lte }: any) => lte(bc.bookingDate, query.to));
      }

      // Get bookings with boat info
      const bookings = await db.query.bookingCache.findMany({
        where: (bc, ops) => {
          const clubCondition = ops.eq(bc.clubId, req.club!.id);
          if (conditions.length === 0) {
            return clubCondition;
          }
          const allConditions = [clubCondition, ...conditions.map((c) => c(bc, ops))];
          return ops.and(...allConditions);
        },
        with: {
          boat: {
            columns: {
              id: true,
              name: true,
              revsportBoatId: true,
            },
          },
        },
        limit: query.limit,
        offset: query.offset,
        orderBy: (bc, { asc, desc }) => [asc(bc.bookingDate), desc(bc.scrapedAt)],
      });

      // Get total count for pagination
      const allBookings = await db.query.bookingCache.findMany({
        where: (bc, ops) => {
          const clubCondition = ops.eq(bc.clubId, req.club!.id);
          if (conditions.length === 0) {
            return clubCondition;
          }
          const allConditions = [clubCondition, ...conditions.map((c) => c(bc, ops))];
          return ops.and(...allConditions);
        },
        columns: { id: true },
      });
      const total = allBookings.length;

      const data: BookingResponse[] = bookings.map((booking) => ({
        id: booking.id,
        boatId: booking.boatId,
        boatSourceId: (booking as any).boat?.revsportBoatId ?? null,
        boatName: (booking as any).boat?.name ?? 'Unknown',
        date: booking.bookingDate,
        sessionName: booking.sessionName,
        bookings: booking.bookings,
        scrapedAt: booking.scrapedAt?.toISOString() ?? null,
      }));

      // Set cache headers
      res.setHeader('Cache-Control', 'max-age=30, stale-while-revalidate=120');

      const response: ApiSuccessResponse<BookingResponse[]> = {
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

  return router;
}

// Helper type for building conditions
function buildDateCondition(_bc: any, _ops: any): any {
  return undefined;
}
