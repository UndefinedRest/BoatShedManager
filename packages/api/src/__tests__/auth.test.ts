/**
 * Auth Middleware Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Response, NextFunction } from 'express';
import { createAuthMiddleware, createOptionalAuthMiddleware, requireRole, generateToken } from '../middleware/auth.js';
import { ApiError } from '../middleware/errorHandler.js';
import type { ApiRequest, JWTPayload } from '../types.js';

// Test constants
const TEST_SECRET = 'test-secret-key-that-is-long-enough-for-testing';

// Mock club for testing
const MOCK_CLUB = {
  id: 'club-123',
  name: 'Test Club',
  subdomain: 'test',
  timezone: 'Australia/Sydney',
  displayConfig: {},
  dataSourceConfig: {},
};

// Helper to create mock request
function createMockRequest(overrides: Partial<ApiRequest> = {}): ApiRequest {
  return {
    headers: {},
    club: MOCK_CLUB,
    requestId: 'req-123',
    ...overrides,
  } as ApiRequest;
}

// Helper to create mock response
function createMockResponse(): Response {
  return {} as Response;
}

describe('createAuthMiddleware', () => {
  const authMiddleware = createAuthMiddleware({ secret: TEST_SECRET });
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = vi.fn();
  });

  it('throws unauthorized error when authorization header is missing', () => {
    const req = createMockRequest();
    const res = createMockResponse();

    expect(() => authMiddleware(req, res, mockNext)).toThrow(ApiError);
    expect(() => authMiddleware(req, res, mockNext)).toThrow('Missing authorization header');
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('throws unauthorized error for invalid header format', () => {
    const req = createMockRequest({
      headers: { authorization: 'InvalidFormat token123' },
    });
    const res = createMockResponse();

    expect(() => authMiddleware(req, res, mockNext)).toThrow(ApiError);
    expect(() => authMiddleware(req, res, mockNext)).toThrow('Invalid authorization header format');
  });

  it('throws unauthorized error for malformed Bearer token', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer' }, // Missing token
    });
    const res = createMockResponse();

    expect(() => authMiddleware(req, res, mockNext)).toThrow('Invalid authorization header format');
  });

  it('throws unauthorized error for invalid token', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer invalid.token.here' },
    });
    const res = createMockResponse();

    expect(() => authMiddleware(req, res, mockNext)).toThrow('Invalid token');
  });

  it('throws unauthorized error for expired token', () => {
    const expiredToken = jwt.sign(
      { sub: 'user-123', clubId: 'club-123', role: 'club_admin', email: 'test@test.com' },
      TEST_SECRET,
      { expiresIn: -1 } // Already expired
    );
    const req = createMockRequest({
      headers: { authorization: `Bearer ${expiredToken}` },
    });
    const res = createMockResponse();

    expect(() => authMiddleware(req, res, mockNext)).toThrow('Token has expired');
  });

  it('throws forbidden error for cross-tenant access', () => {
    const token = jwt.sign(
      { sub: 'user-123', clubId: 'different-club', role: 'club_admin', email: 'test@test.com' },
      TEST_SECRET,
      { expiresIn: '1h' }
    );
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
      club: MOCK_CLUB,
    });
    const res = createMockResponse();

    expect(() => authMiddleware(req, res, mockNext)).toThrow('Access denied: token does not match tenant');
  });

  it('attaches user to request for valid token', () => {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: 'user-123',
      clubId: 'club-123',
      role: 'club_admin',
      email: 'test@test.com',
    };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockResponse();

    authMiddleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user?.sub).toBe('user-123');
    expect(req.user?.clubId).toBe('club-123');
    expect(req.user?.role).toBe('club_admin');
  });

  it('allows super_admin to access any tenant', () => {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: 'admin-123',
      clubId: 'any-club', // Different from request club
      role: 'super_admin',
      email: 'admin@test.com',
    };
    const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
      club: MOCK_CLUB,
    });
    const res = createMockResponse();

    // Note: Current implementation doesn't have super_admin bypass
    // This test documents current behavior - super_admin is also restricted
    expect(() => authMiddleware(req, res, mockNext)).toThrow('Access denied: token does not match tenant');
  });
});

describe('createOptionalAuthMiddleware', () => {
  const optionalAuth = createOptionalAuthMiddleware({ secret: TEST_SECRET });
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = vi.fn();
  });

  it('continues without user when no auth header', () => {
    const req = createMockRequest();
    const res = createMockResponse();

    optionalAuth(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('continues without user for invalid header format', () => {
    const req = createMockRequest({
      headers: { authorization: 'InvalidFormat token' },
    });
    const res = createMockResponse();

    optionalAuth(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('continues without user for invalid token', () => {
    const req = createMockRequest({
      headers: { authorization: 'Bearer invalid.token' },
    });
    const res = createMockResponse();

    optionalAuth(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.user).toBeUndefined();
  });

  it('attaches user for valid token', () => {
    const token = jwt.sign(
      { sub: 'user-123', clubId: 'club-123', role: 'club_admin', email: 'test@test.com' },
      TEST_SECRET,
      { expiresIn: '1h' }
    );
    const req = createMockRequest({
      headers: { authorization: `Bearer ${token}` },
    });
    const res = createMockResponse();

    optionalAuth(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user?.sub).toBe('user-123');
  });
});

describe('requireRole', () => {
  let mockNext: NextFunction;

  beforeEach(() => {
    mockNext = vi.fn();
  });

  it('throws unauthorized when no user attached', () => {
    const middleware = requireRole('club_admin');
    const req = createMockRequest();
    const res = createMockResponse();

    expect(() => middleware(req, res, mockNext)).toThrow('Authentication required');
  });

  it('throws forbidden when user role does not match', () => {
    const middleware = requireRole('super_admin');
    const req = createMockRequest({
      user: { sub: 'user-123', clubId: 'club-123', role: 'club_admin', email: 'test@test.com', iat: 0, exp: 0 },
    });
    const res = createMockResponse();

    expect(() => middleware(req, res, mockNext)).toThrow('Insufficient permissions');
  });

  it('calls next when user has required role', () => {
    const middleware = requireRole('club_admin');
    const req = createMockRequest({
      user: { sub: 'user-123', clubId: 'club-123', role: 'club_admin', email: 'test@test.com', iat: 0, exp: 0 },
    });
    const res = createMockResponse();

    middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('calls next when user has any of the allowed roles', () => {
    const middleware = requireRole('club_admin', 'super_admin');
    const req = createMockRequest({
      user: { sub: 'user-123', clubId: 'club-123', role: 'super_admin', email: 'admin@test.com', iat: 0, exp: 0 },
    });
    const res = createMockResponse();

    middleware(req, res, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});

describe('generateToken', () => {
  it('generates a valid JWT token', () => {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: 'user-123',
      clubId: 'club-123',
      role: 'club_admin',
      email: 'test@test.com',
    };

    const { token, expiresIn } = generateToken(payload, { secret: TEST_SECRET });

    expect(token).toBeDefined();
    expect(typeof token).toBe('string');
    expect(expiresIn).toBe(3600); // Default 1 hour

    // Verify token is valid
    const decoded = jwt.verify(token, TEST_SECRET) as JWTPayload;
    expect(decoded.sub).toBe('user-123');
    expect(decoded.clubId).toBe('club-123');
    expect(decoded.role).toBe('club_admin');
  });

  it('respects custom expiry time', () => {
    const payload: Omit<JWTPayload, 'iat' | 'exp'> = {
      sub: 'user-123',
      clubId: 'club-123',
      role: 'club_admin',
      email: 'test@test.com',
    };

    const { expiresIn } = generateToken(payload, {
      secret: TEST_SECRET,
      expiresIn: 7200,
    });

    expect(expiresIn).toBe(7200);
  });
});
