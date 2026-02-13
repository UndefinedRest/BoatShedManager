/**
 * API Layer Type Definitions
 *
 * Core types for the REST API including request/response formats,
 * JWT payload structure, and error codes.
 */

import type { Request, Response, NextFunction } from 'express';

/**
 * Extended Express Request with tenant and user context
 */
export interface ApiRequest extends Request {
  /** Request correlation ID for distributed tracing */
  requestId: string;
  /** Start time for duration tracking */
  startTime: number;
  /** Tenant context from subdomain middleware */
  club?: {
    id: string;
    name: string;
    subdomain: string;
    timezone: string | null;
    displayConfig: unknown;
    dataSourceConfig: unknown;
  };
  /** Authenticated user context (admin routes only) */
  user?: JWTPayload;
}

/**
 * JWT token payload structure
 */
export interface JWTPayload {
  /** User ID (subject) */
  sub: string;
  /** Club ID for tenant verification */
  clubId: string;
  /** User role */
  role: 'club_admin' | 'super_admin';
  /** User email */
  email: string;
  /** Issued at timestamp */
  iat: number;
  /** Expiration timestamp */
  exp: number;
}

/**
 * Standard API success response
 */
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
    count?: number;
  };
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;
    details?: unknown;
    requestId?: string;
  };
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Standardized error codes for client handling and monitoring
 */
export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'SCRAPE_IN_PROGRESS'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR'
  | 'ACCOUNT_LOCKED';

/**
 * API configuration options
 */
export interface ApiConfig {
  /** JWT secret for token signing/verification */
  jwtSecret: string;
  /** Token expiration in seconds (default: 3600 = 1 hour) */
  jwtExpiresIn?: number;
  /** Enable debug logging */
  debug?: boolean;
  /** Rate limit for public endpoints (requests per minute) */
  publicRateLimit?: number;
  /** Rate limit for admin endpoints (requests per minute) */
  adminRateLimit?: number;
}

/**
 * Pagination query parameters
 */
export interface PaginationQuery {
  limit?: number;
  offset?: number;
}

/**
 * Bookings filter query parameters
 */
export interface BookingsQuery extends PaginationQuery {
  boat?: string;
  date?: string;
  from?: string;
  to?: string;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    database: {
      status: 'up' | 'down';
      latencyMs: number;
    };
    scraper: {
      status: 'idle' | 'running';
      lastSuccessAt: string | null;
      lastSuccessAgeSeconds: number | null;
    };
  };
  club?: {
    id: string;
    name: string;
    boatsCount: number;
    lastScrapedAt: string | null;
  };
}

/**
 * Admin status response
 */
export interface AdminStatusResponse {
  lastScrape: {
    completedAt: string | null;
    status: string;
    boatsCount: number;
    bookingsCount: number;
    durationMs: number;
  } | null;
  recentJobs: Array<{
    completedAt: string;
    status: string;
    error?: string;
  }>;
  recentFailedJobs: Array<{
    completedAt: string;
    status: string;
    error?: string;
  }>;
  nextScheduled: string | null;
  scrapeStats: {
    last24h: {
      success: number;
      failed: number;
    };
    avgDurationMs: number;
  };
}

/**
 * Login request body
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * Login response
 */
export interface LoginResponse {
  token: string;
  expiresIn: number;
  user: {
    id: string;
    email: string;
    role: string;
    fullName: string | null;
  };
}

/**
 * Credentials update request
 */
export interface CredentialsUpdateRequest {
  url: string;
  username: string;
  password: string;
}

/**
 * Display config update request
 */
export interface DisplayConfigUpdateRequest {
  branding?: {
    logoUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    customCSS?: string;
  };
  displayConfig?: Record<string, unknown>;
}

/**
 * Sync trigger response
 */
export interface SyncResponse {
  jobId: string;
  status: 'queued' | 'running';
  estimatedDuration: number;
}

/**
 * Express middleware type
 */
export type Middleware = (
  req: ApiRequest,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Express async handler wrapper type
 */
export type AsyncHandler = (
  req: ApiRequest,
  res: Response,
  next: NextFunction
) => Promise<void>;
