/**
 * Admin Authentication Route
 *
 * POST /api/v1/admin/login - Authenticate and get JWT token
 *
 * TODO: Add account lockout after failed login attempts
 * This requires adding `failed_login_attempts` and `locked_until` columns
 * to the users table in the database schema.
 */

import { Router } from 'express';
import type { Response } from 'express';
import type { Database } from '@lmrc/db';
import { users, auditLog } from '@lmrc/db';
import { eq } from 'drizzle-orm';
import type { ApiRequest, ApiSuccessResponse, LoginResponse } from '../../types.js';
import { asyncHandler, ApiError } from '../../middleware/errorHandler.js';
import { generateToken, verifyPassword, type JWTConfig } from '../../middleware/auth.js';
import { loginSchema } from '../../schemas/index.js';
import { logger } from '../../middleware/logging.js';

/**
 * Create auth router
 */
export function createAuthRouter(db: Database, jwtConfig: JWTConfig): Router {
  const router = Router();

  /**
   * POST /login - Authenticate and get JWT token
   */
  router.post(
    '/login',
    asyncHandler(async (req: ApiRequest, res: Response) => {
      if (!req.club) {
        throw ApiError.unauthorized('Club context required');
      }

      const input = loginSchema.parse(req.body);

      // Find user by email and club
      const user = await db.query.users.findFirst({
        where: (u, { and: andFn, eq: eqFn }) =>
          andFn(
            eqFn(u.email, input.email.toLowerCase()),
            eqFn(u.clubId, req.club!.id)
          ),
      });

      if (!user) {
        // Log failed attempt (user not found)
        logger.warn(
          {
            requestId: req.requestId,
            clubId: req.club.id,
            email: input.email,
            reason: 'user_not_found',
          },
          'Login failed: user not found'
        );

        // Generic error to prevent user enumeration
        throw ApiError.unauthorized('Invalid email or password');
      }

      // Check if account is active
      if (!user.isActive) {
        logger.warn(
          {
            requestId: req.requestId,
            clubId: req.club.id,
            userId: user.id,
          },
          'Login failed: account inactive'
        );

        throw ApiError.forbidden('Account is disabled');
      }

      // Verify password
      const isValid = await verifyPassword(input.password, user.passwordHash);

      if (!isValid) {
        // Record failed login in audit log
        await db.insert(auditLog).values({
          clubId: req.club.id,
          userId: user.id,
          action: 'LOGIN_FAILED',
          resourceType: 'user',
          resourceId: user.id,
          details: { reason: 'invalid_password' },
          ipAddress: req.ip ?? null,
        });

        logger.warn(
          {
            requestId: req.requestId,
            clubId: req.club.id,
            userId: user.id,
            reason: 'invalid_password',
          },
          'Login failed: invalid password'
        );

        throw ApiError.unauthorized('Invalid email or password');
      }

      // Successful login - update last login time
      await db
        .update(users)
        .set({
          lastLoginAt: new Date(),
        })
        .where(eq(users.id, user.id));

      // Generate JWT token
      const { token, expiresIn } = generateToken(
        {
          sub: user.id,
          clubId: user.clubId,
          role: user.role as 'club_admin' | 'super_admin',
          email: user.email,
        },
        jwtConfig
      );

      // Record successful login in audit log
      await db.insert(auditLog).values({
        clubId: req.club.id,
        userId: user.id,
        action: 'LOGIN_SUCCESS',
        resourceType: 'user',
        resourceId: user.id,
        details: {},
        ipAddress: req.ip ?? null,
      });

      logger.info(
        {
          requestId: req.requestId,
          clubId: req.club.id,
          userId: user.id,
        },
        'Login successful'
      );

      const data: LoginResponse = {
        token,
        expiresIn,
        user: {
          id: user.id,
          email: user.email,
          role: user.role ?? 'club_admin',
          fullName: user.fullName,
        },
      };

      // Never cache auth responses
      res.setHeader('Cache-Control', 'no-store');

      const response: ApiSuccessResponse<LoginResponse> = {
        success: true,
        data,
      };

      res.json(response);
    })
  );

  return router;
}
