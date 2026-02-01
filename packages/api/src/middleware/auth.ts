/**
 * Authentication Middleware
 *
 * JWT verification with tenant isolation for admin routes.
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import type { Response, NextFunction } from 'express';
import type { ApiRequest, JWTPayload } from '../types.js';
import { ApiError } from './errorHandler.js';
import { logger } from './logging.js';

/**
 * JWT configuration
 */
export interface JWTConfig {
  /** JWT secret for signing/verification */
  secret: string;
  /** Token expiration in seconds (default: 3600 = 1 hour) */
  expiresIn?: number;
}

/**
 * Verify JWT token and attach user to request
 */
export function createAuthMiddleware(config: JWTConfig) {
  return (req: ApiRequest, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      throw ApiError.unauthorized('Missing authorization header');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw ApiError.unauthorized('Invalid authorization header format');
    }

    const token = parts[1];

    try {
      const payload = jwt.verify(token, config.secret) as JWTPayload;

      // Verify tenant isolation
      if (req.club && payload.clubId !== req.club.id) {
        logger.warn(
          {
            requestId: req.requestId,
            tokenClubId: payload.clubId,
            requestClubId: req.club.id,
            userId: payload.sub,
          },
          'Cross-tenant access attempt'
        );
        throw ApiError.forbidden('Access denied: token does not match tenant');
      }

      // Attach user to request
      req.user = payload;
      next();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof jwt.TokenExpiredError) {
        throw ApiError.unauthorized('Token has expired');
      }

      if (error instanceof jwt.JsonWebTokenError) {
        throw ApiError.unauthorized('Invalid token');
      }

      throw ApiError.unauthorized('Authentication failed');
    }
  };
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles: Array<'club_admin' | 'super_admin'>) {
  return (req: ApiRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(
        {
          requestId: req.requestId,
          userId: req.user.sub,
          userRole: req.user.role,
          requiredRoles: roles,
        },
        'Insufficient permissions'
      );
      throw ApiError.forbidden('Insufficient permissions');
    }

    next();
  };
}

/**
 * Optional authentication - attaches user if token present, continues without if not
 */
export function createOptionalAuthMiddleware(config: JWTConfig) {
  return (req: ApiRequest, _res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return next();
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return next();
    }

    const token = parts[1];

    try {
      const payload = jwt.verify(token, config.secret) as JWTPayload;

      // Only attach if tenant matches
      if (!req.club || payload.clubId === req.club.id) {
        req.user = payload;
      }
    } catch {
      // Ignore invalid tokens for optional auth
    }

    next();
  };
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(
  payload: Omit<JWTPayload, 'iat' | 'exp'>,
  config: JWTConfig
): { token: string; expiresIn: number } {
  const expiresIn = config.expiresIn || 3600; // 1 hour default

  const token = jwt.sign(payload, config.secret, {
    expiresIn,
  });

  return { token, expiresIn };
}

/**
 * Hash a password using bcrypt (utility for admin routes)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
