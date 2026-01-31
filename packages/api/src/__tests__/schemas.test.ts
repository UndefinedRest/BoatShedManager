/**
 * Zod Schema Tests
 */

import { describe, it, expect } from 'vitest';
import {
  paginationSchema,
  uuidParamSchema,
  bookingsQuerySchema,
  loginSchema,
  credentialsUpdateSchema,
  displayConfigUpdateSchema,
} from '../schemas/index.js';

describe('paginationSchema', () => {
  it('parses valid pagination params', () => {
    const result = paginationSchema.parse({ limit: '50', offset: '10' });

    expect(result.limit).toBe(50);
    expect(result.offset).toBe(10);
  });

  it('applies default values', () => {
    const result = paginationSchema.parse({});

    expect(result.limit).toBe(100);
    expect(result.offset).toBe(0);
  });

  it('rejects limit above max', () => {
    expect(() => paginationSchema.parse({ limit: '1000' })).toThrow();
  });

  it('rejects negative values', () => {
    expect(() => paginationSchema.parse({ limit: '-10' })).toThrow();
    expect(() => paginationSchema.parse({ offset: '-5' })).toThrow();
  });
});

describe('uuidParamSchema', () => {
  it('parses valid UUID', () => {
    const result = uuidParamSchema.parse({ id: '550e8400-e29b-41d4-a716-446655440000' });

    expect(result.id).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('rejects invalid UUID', () => {
    expect(() => uuidParamSchema.parse({ id: 'not-a-uuid' })).toThrow();
  });
});

describe('bookingsQuerySchema', () => {
  it('parses date filter', () => {
    const result = bookingsQuerySchema.parse({ date: '2026-01-31' });

    expect(result.date).toBe('2026-01-31');
  });

  it('parses date range filter', () => {
    const result = bookingsQuerySchema.parse({
      from: '2026-01-01',
      to: '2026-01-31',
    });

    expect(result.from).toBe('2026-01-01');
    expect(result.to).toBe('2026-01-31');
  });

  it('parses boat filter', () => {
    const result = bookingsQuerySchema.parse({
      boat: '550e8400-e29b-41d4-a716-446655440000',
    });

    expect(result.boat).toBe('550e8400-e29b-41d4-a716-446655440000');
  });

  it('rejects invalid date format', () => {
    expect(() => bookingsQuerySchema.parse({ date: '31-01-2026' })).toThrow();
  });

  it('includes pagination', () => {
    const result = bookingsQuerySchema.parse({ limit: '50' });

    expect(result.limit).toBe(50);
    expect(result.offset).toBe(0);
  });
});

describe('loginSchema', () => {
  it('parses valid credentials', () => {
    const result = loginSchema.parse({
      email: 'admin@club.com',
      password: 'secure123',
    });

    expect(result.email).toBe('admin@club.com');
    expect(result.password).toBe('secure123');
  });

  it('rejects invalid email', () => {
    expect(() =>
      loginSchema.parse({
        email: 'not-an-email',
        password: 'secure123',
      })
    ).toThrow();
  });

  it('rejects empty password', () => {
    expect(() =>
      loginSchema.parse({
        email: 'admin@club.com',
        password: '',
      })
    ).toThrow();
  });
});

describe('credentialsUpdateSchema', () => {
  it('parses complete credentials', () => {
    const result = credentialsUpdateSchema.parse({
      url: 'https://example.revsport.net/booking',
      username: 'admin',
      password: 'secret123',
    });

    expect(result.url).toBe('https://example.revsport.net/booking');
    expect(result.username).toBe('admin');
    expect(result.password).toBe('secret123');
  });

  it('rejects invalid URL', () => {
    expect(() =>
      credentialsUpdateSchema.parse({
        url: 'not-a-url',
        username: 'admin',
        password: 'secret',
      })
    ).toThrow();
  });

  it('rejects missing required fields', () => {
    expect(() =>
      credentialsUpdateSchema.parse({
        url: 'https://example.com',
      })
    ).toThrow();
  });
});

describe('displayConfigUpdateSchema', () => {
  it('parses display config with branding', () => {
    const result = displayConfigUpdateSchema.parse({
      branding: {
        primaryColor: '#ff0000',
      },
    });

    expect(result.branding?.primaryColor).toBe('#ff0000');
  });

  it('allows partial branding update', () => {
    const result = displayConfigUpdateSchema.parse({
      branding: {
        logoUrl: 'https://example.com/logo.png',
      },
    });

    expect(result.branding?.logoUrl).toBe('https://example.com/logo.png');
    expect(result.branding?.primaryColor).toBeUndefined();
  });

  it('accepts displayConfig object', () => {
    const result = displayConfigUpdateSchema.parse({
      displayConfig: {
        showMemberNames: false,
        refreshInterval: 60,
      },
    });

    expect(result.displayConfig).toEqual({
      showMemberNames: false,
      refreshInterval: 60,
    });
  });

  it('rejects invalid hex color', () => {
    expect(() =>
      displayConfigUpdateSchema.parse({
        branding: {
          primaryColor: 'red',
        },
      })
    ).toThrow();
  });

  it('allows empty update', () => {
    const result = displayConfigUpdateSchema.parse({});

    expect(result.branding).toBeUndefined();
    expect(result.displayConfig).toBeUndefined();
  });
});
