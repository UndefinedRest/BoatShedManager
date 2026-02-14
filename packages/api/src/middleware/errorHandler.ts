/**
 * Error Handler Middleware
 *
 * Provides consistent error responses and logging
 * across all API endpoints.
 */

import type { Request, Response, NextFunction } from 'express';
import type { ApiRequest, ErrorCode, ApiErrorResponse } from '../types.js';
import { logger } from './logging.js';
import { ZodError } from 'zod';

/**
 * Custom API error class
 */
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number = 500,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static unauthorized(message = 'Authentication required'): ApiError {
    return new ApiError('UNAUTHORIZED', message, 401);
  }

  static forbidden(message = 'Access denied'): ApiError {
    return new ApiError('FORBIDDEN', message, 403);
  }

  static notFound(resource = 'Resource'): ApiError {
    return new ApiError('NOT_FOUND', `${resource} not found`, 404);
  }

  static validation(message: string, details?: unknown): ApiError {
    return new ApiError('VALIDATION_ERROR', message, 400, details);
  }

  static rateLimited(message = 'Too many requests'): ApiError {
    return new ApiError('RATE_LIMITED', message, 429);
  }

  static conflict(message: string): ApiError {
    return new ApiError('SCRAPE_IN_PROGRESS', message, 409);
  }

  static upstream(message = 'External service unavailable'): ApiError {
    return new ApiError('UPSTREAM_ERROR', message, 502);
  }

  static internal(message = 'Internal server error'): ApiError {
    return new ApiError('INTERNAL_ERROR', message, 500);
  }

  static accountLocked(message = 'Account is locked'): ApiError {
    return new ApiError('ACCOUNT_LOCKED', message, 423);
  }

  static serviceUnavailable(message = 'Service not available'): ApiError {
    return new ApiError('SERVICE_UNAVAILABLE', message, 503);
  }
}

/**
 * Convert Zod validation errors to a friendly format
 */
function formatZodError(error: ZodError): { field: string; message: string }[] {
  return error.errors.map((err) => ({
    field: err.path.join('.'),
    message: err.message,
  }));
}

/**
 * Central error handling middleware
 */
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const apiReq = req as ApiRequest;
  const requestId = apiReq.requestId;

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = formatZodError(err);
    logger.warn(
      {
        requestId,
        clubId: apiReq.club?.id,
        path: req.path,
        validationErrors: details,
      },
      'Validation error'
    );

    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details,
        requestId,
      },
    };
    res.status(400).json(response);
    return;
  }

  // Handle known API errors
  if (err instanceof ApiError) {
    const logLevel = err.status >= 500 ? 'error' : 'warn';
    logger[logLevel](
      {
        requestId,
        clubId: apiReq.club?.id,
        path: req.path,
        errorCode: err.code,
        status: err.status,
      },
      err.message
    );

    const response: ApiErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    };
    res.status(err.status).json(response);
    return;
  }

  // Handle unknown errors
  logger.error(
    {
      requestId,
      clubId: apiReq.club?.id,
      path: req.path,
      error: err.message,
      stack: err.stack,
    },
    'Unhandled error'
  );

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message:
        process.env.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : err.message,
      requestId,
    },
  };
  res.status(500).json(response);
}

/**
 * Not found handler for undefined routes
 */
export function notFoundHandler(req: Request, res: Response): void {
  const apiReq = req as ApiRequest;

  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
      requestId: apiReq.requestId,
    },
  };
  res.status(404).json(response);
}

/**
 * Async handler wrapper to catch promise rejections
 */
export function asyncHandler(
  fn: (req: ApiRequest, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req as ApiRequest, res, next)).catch(next);
  };
}
