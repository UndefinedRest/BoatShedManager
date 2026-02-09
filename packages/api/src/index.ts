/**
 * @lmrc/api - REST API layer for the rowing boards SaaS platform
 *
 * This package provides:
 * - Public API routes (boats, bookings, config, health)
 * - Admin API routes with JWT authentication
 * - Structured logging with correlation IDs
 * - Rate limiting per tenant
 * - Consistent error handling
 *
 * @example
 * ```ts
 * import { createApiRouter } from '@lmrc/api';
 * import { createDb } from '@lmrc/db';
 * import { createTenantMiddleware } from '@lmrc/tenant';
 * import express from 'express';
 *
 * const app = express();
 * const db = createDb(process.env.DATABASE_URL);
 *
 * // Apply tenant middleware first
 * app.use(createTenantMiddleware(db, { baseDomain: 'rowandlift.au' }));
 *
 * // Mount API routes
 * app.use('/api/v1', createApiRouter(db, {
 *   jwtSecret: process.env.JWT_SECRET,
 *   encryptionKey: process.env.ENCRYPTION_KEY,
 * }));
 * ```
 */

import { Router, type RequestHandler, type Request, type Response, type NextFunction } from 'express';
import type { Database } from '@lmrc/db';

// Middleware
import { requestContext, createRequestLogger, logger } from './middleware/logging.js';
import {
  createPublicRateLimiter,
  createAdminReadRateLimiter,
  createAdminWriteRateLimiter,
  createLoginRateLimiter,
  createSyncRateLimiter,
} from './middleware/rateLimit.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { createAuthMiddleware } from './middleware/auth.js';

// Public routes
import { createBoatsRouter } from './routes/public/boats.js';
import { createBookingsRouter } from './routes/public/bookings.js';
import { createConfigRouter } from './routes/public/config.js';
import { createHealthRouter } from './routes/public/health.js';
import { createPublicSyncRouter, type PublicSyncFn } from './routes/public/sync.js';

// Admin routes
import { createAuthRouter } from './routes/admin/auth.js';
import { createStatusRouter } from './routes/admin/status.js';
import { createCredentialsRouter } from './routes/admin/credentials.js';
import { createDisplayRouter } from './routes/admin/display.js';
import { createSyncRouter, type SyncTriggerFn } from './routes/admin/sync.js';

// Types
import type { ApiConfig, ApiRequest } from './types.js';

/**
 * Middleware to require club context.
 * Returns 500 if no club is attached to the request.
 */
function requireClub(req: Request, res: Response, next: NextFunction): void {
  const apiReq = req as ApiRequest;
  if (!apiReq.club) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Club context not available. Ensure tenant middleware is applied.',
      },
    });
    return;
  }
  next();
}

/**
 * Extended API configuration
 */
export interface CreateApiRouterConfig extends ApiConfig {
  /** Encryption key for credentials */
  encryptionKey: string;
  /** Optional sync trigger function (for BullMQ integration) */
  syncTrigger?: SyncTriggerFn;
  /** Optional public sync function for manual refresh (runs scrape synchronously) */
  publicSyncFn?: PublicSyncFn;
}

/**
 * Create the main API router with all routes mounted
 */
export function createApiRouter(
  db: Database,
  config: CreateApiRouterConfig
): Router {
  const router = Router();

  // Request context (correlation ID, timing)
  router.use(requestContext);

  // Request logging
  router.use(createRequestLogger({ debug: config.debug }));

  // Health check (before rate limiting, always accessible)
  router.use('/health', createHealthRouter(db));

  // Public routes with rate limiting (require club context)
  const publicRouter = Router();
  publicRouter.use(requireClub);
  publicRouter.use(createPublicRateLimiter({
    publicLimit: config.publicRateLimit,
  }));
  publicRouter.use('/boats', createBoatsRouter(db));
  publicRouter.use('/bookings', createBookingsRouter(db));
  publicRouter.use('/config', createConfigRouter());
  publicRouter.use('/sync', createSyncRateLimiter(), createPublicSyncRouter(config.publicSyncFn));

  router.use(publicRouter);

  // Admin routes (require club context)
  const adminRouter = Router();
  adminRouter.use(requireClub);

  // Login route with stricter rate limiting
  adminRouter.use(
    '/login',
    createLoginRateLimiter(),
    createAuthRouter(db, {
      secret: config.jwtSecret,
      expiresIn: config.jwtExpiresIn,
    })
  );

  // Protected admin routes
  const protectedAdminRouter = Router();
  protectedAdminRouter.use(createAuthMiddleware({
    secret: config.jwtSecret,
    expiresIn: config.jwtExpiresIn,
  }) as unknown as RequestHandler);

  // Read endpoints
  const adminReadRouter = Router();
  adminReadRouter.use(createAdminReadRateLimiter({
    adminReadLimit: config.adminRateLimit,
  }));
  adminReadRouter.use('/status', createStatusRouter(db));

  // Write endpoints
  const adminWriteRouter = Router();
  adminWriteRouter.use(createAdminWriteRateLimiter({
    adminWriteLimit: config.adminRateLimit,
  }));
  adminWriteRouter.use('/credentials', createCredentialsRouter(db, config.encryptionKey));
  adminWriteRouter.use('/display', createDisplayRouter(db));
  adminWriteRouter.use('/sync', createSyncRouter(db, config.syncTrigger));

  protectedAdminRouter.use(adminReadRouter);
  protectedAdminRouter.use(adminWriteRouter);

  adminRouter.use(protectedAdminRouter);
  router.use('/admin', adminRouter);

  // 404 handler for unknown routes
  router.use(notFoundHandler);

  // Error handler (must be last)
  router.use(errorHandler);

  return router;
}

// Re-export types
export type {
  ApiRequest,
  ApiResponse,
  ApiSuccessResponse,
  ApiErrorResponse,
  ApiConfig,
  JWTPayload,
  ErrorCode,
  HealthCheckResponse,
  AdminStatusResponse,
  LoginRequest,
  LoginResponse,
  SyncResponse,
} from './types.js';

// Re-export middleware for custom usage
export {
  requestContext,
  createRequestLogger,
  logger,
  logAuditEvent,
  logSlowQuery,
} from './middleware/logging.js';

export {
  createPublicRateLimiter,
  createAdminReadRateLimiter,
  createAdminWriteRateLimiter,
  createLoginRateLimiter,
  createSyncRateLimiter,
  type RateLimitConfig,
} from './middleware/rateLimit.js';

export {
  ApiError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
} from './middleware/errorHandler.js';

export {
  createAuthMiddleware,
  createOptionalAuthMiddleware,
  requireRole,
  generateToken,
  hashPassword,
  verifyPassword,
  type JWTConfig,
} from './middleware/auth.js';

// Re-export schemas
export * from './schemas/index.js';

// Re-export sync trigger type
export type { SyncTriggerFn } from './routes/admin/sync.js';
export type { PublicSyncFn } from './routes/public/sync.js';
