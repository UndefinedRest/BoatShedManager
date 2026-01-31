/**
 * Rate Limiting Middleware
 *
 * Per-tenant rate limiting to prevent abuse and ensure fair usage.
 * Uses express-rate-limit with tenant-scoped keys.
 */

import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import type { ApiRequest } from '../types.js';

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
  /** Requests per window for public endpoints */
  publicLimit?: number;
  /** Requests per window for admin GET endpoints */
  adminReadLimit?: number;
  /** Requests per window for admin PUT/POST endpoints */
  adminWriteLimit?: number;
  /** Login attempts per window */
  loginLimit?: number;
  /** Window size in milliseconds */
  windowMs?: number;
}

const DEFAULT_CONFIG: Required<RateLimitConfig> = {
  publicLimit: 100,
  adminReadLimit: 60,
  adminWriteLimit: 20,
  loginLimit: 5,
  windowMs: 60 * 1000, // 1 minute
};

/**
 * Generate a rate limit key scoped to the tenant
 */
function getTenantKey(req: Request): string {
  const apiReq = req as ApiRequest;
  const clubId = apiReq.club?.id || 'unknown';
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  return `${clubId}:${ip}`;
}

/**
 * Standard rate limit response
 */
function rateLimitHandler(_req: Request, res: Response): void {
  res.status(429).json({
    success: false,
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
    },
  });
}

/**
 * Create rate limiter for public endpoints
 * Default: 100 requests per minute per tenant+IP
 */
export function createPublicRateLimiter(config: RateLimitConfig = {}) {
  const merged = { ...DEFAULT_CONFIG, ...config };

  return rateLimit({
    windowMs: merged.windowMs,
    max: merged.publicLimit,
    keyGenerator: getTenantKey,
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      // Don't rate limit health checks
      return req.path === '/health' || req.path === '/api/v1/health';
    },
  });
}

/**
 * Create rate limiter for admin read endpoints
 * Default: 60 requests per minute per tenant+IP
 */
export function createAdminReadRateLimiter(config: RateLimitConfig = {}) {
  const merged = { ...DEFAULT_CONFIG, ...config };

  return rateLimit({
    windowMs: merged.windowMs,
    max: merged.adminReadLimit,
    keyGenerator: getTenantKey,
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

/**
 * Create rate limiter for admin write endpoints
 * Default: 20 requests per minute per tenant+IP
 */
export function createAdminWriteRateLimiter(config: RateLimitConfig = {}) {
  const merged = { ...DEFAULT_CONFIG, ...config };

  return rateLimit({
    windowMs: merged.windowMs,
    max: merged.adminWriteLimit,
    keyGenerator: getTenantKey,
    handler: rateLimitHandler,
    standardHeaders: true,
    legacyHeaders: false,
  });
}

/**
 * Create rate limiter for login endpoint
 * Default: 5 attempts per 15 minutes per tenant+IP
 */
export function createLoginRateLimiter(config: RateLimitConfig = {}) {
  const merged = { ...DEFAULT_CONFIG, ...config };

  return rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes (override default)
    max: merged.loginLimit,
    keyGenerator: getTenantKey,
    handler: (_req, res) => {
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many login attempts. Please try again in 15 minutes.',
        },
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
}
