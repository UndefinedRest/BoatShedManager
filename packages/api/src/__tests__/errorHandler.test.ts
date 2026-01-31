/**
 * Error Handler Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { ApiError, errorHandler, notFoundHandler } from '../middleware/errorHandler.js';
import type { ApiRequest } from '../types.js';

// Mock logger
vi.mock('../middleware/logging.js', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
  },
}));

// Helper to create mock request
function createMockRequest(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return {
    requestId: 'test-request-id',
    method: 'GET',
    url: '/test',
    path: '/test',
    ...overrides,
  } as ApiRequest;
}

// Helper to create mock response
function createMockResponse(): Response & { jsonData?: unknown; statusCode?: number } {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockImplementation(function (this: any, data: unknown) {
      this.jsonData = data;
      return this;
    }),
  };
  return res as unknown as Response & { jsonData?: unknown };
}

describe('ApiError', () => {
  describe('static factory methods', () => {
    it('creates validation error', () => {
      const error = ApiError.validation('Invalid input');

      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.status).toBe(400);
      expect(error.message).toBe('Invalid input');
    });

    it('creates validation error with details', () => {
      const details = { field: 'email', message: 'Invalid format' };
      const error = ApiError.validation('Invalid input', details);

      expect(error.details).toEqual(details);
    });

    it('creates unauthorized error', () => {
      const error = ApiError.unauthorized('Token expired');

      expect(error.code).toBe('UNAUTHORIZED');
      expect(error.status).toBe(401);
      expect(error.message).toBe('Token expired');
    });

    it('creates forbidden error', () => {
      const error = ApiError.forbidden('Access denied');

      expect(error.code).toBe('FORBIDDEN');
      expect(error.status).toBe(403);
      expect(error.message).toBe('Access denied');
    });

    it('creates not found error', () => {
      const error = ApiError.notFound('Boat');

      expect(error.code).toBe('NOT_FOUND');
      expect(error.status).toBe(404);
      expect(error.message).toBe('Boat not found');
    });

    it('creates conflict error', () => {
      const error = ApiError.conflict('Sync already in progress');

      expect(error.code).toBe('SCRAPE_IN_PROGRESS');
      expect(error.status).toBe(409);
      expect(error.message).toBe('Sync already in progress');
    });

    it('creates rate limited error', () => {
      const error = ApiError.rateLimited('Too many requests');

      expect(error.code).toBe('RATE_LIMITED');
      expect(error.status).toBe(429);
      expect(error.message).toBe('Too many requests');
    });

    it('creates internal error', () => {
      const error = ApiError.internal('Something went wrong');

      expect(error.code).toBe('INTERNAL_ERROR');
      expect(error.status).toBe(500);
      expect(error.message).toBe('Something went wrong');
    });

    it('creates upstream error', () => {
      const error = ApiError.upstream('RevSport unavailable');

      expect(error.code).toBe('UPSTREAM_ERROR');
      expect(error.status).toBe(502);
      expect(error.message).toBe('RevSport unavailable');
    });
  });
});

describe('errorHandler', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  it('handles ApiError correctly', () => {
    const error = ApiError.validation('Invalid input');
    const req = createMockRequest();
    const res = createMockResponse();

    errorHandler(error, req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalled();
    expect(res.jsonData).toEqual({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        details: undefined,
        requestId: 'test-request-id',
      },
    });
  });

  it('handles generic Error as internal error', () => {
    const error = new Error('Something unexpected');
    const req = createMockRequest();
    const res = createMockResponse();

    errorHandler(error, req as Request, res as Response, mockNext);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.jsonData).toMatchObject({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        requestId: 'test-request-id',
      },
    });
  });
});

describe('notFoundHandler', () => {
  it('returns 404 JSON response', () => {
    const req = createMockRequest({ method: 'GET', path: '/unknown' });
    const res = createMockResponse();

    notFoundHandler(req as Request, res as Response);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.jsonData).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Route GET /unknown not found',
        requestId: 'test-request-id',
      },
    });
  });
});
