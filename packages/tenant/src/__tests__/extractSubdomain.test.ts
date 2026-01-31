import { describe, it, expect } from 'vitest';
import { extractSubdomain } from '../middleware.js';

describe('extractSubdomain', () => {
  const baseDomain = 'rowingboards.io';

  describe('with standard subdomains', () => {
    it('extracts subdomain from valid hostname', () => {
      expect(extractSubdomain('lmrc.rowingboards.io', baseDomain, false)).toBe('lmrc');
      expect(extractSubdomain('sydney.rowingboards.io', baseDomain, false)).toBe('sydney');
      expect(extractSubdomain('test-club.rowingboards.io', baseDomain, false)).toBe('test-club');
    });

    it('returns null for base domain without subdomain', () => {
      expect(extractSubdomain('rowingboards.io', baseDomain, false)).toBeNull();
    });

    it('returns null for www subdomain', () => {
      expect(extractSubdomain('www.rowingboards.io', baseDomain, false)).toBeNull();
    });

    it('handles nested subdomains by taking first part', () => {
      expect(extractSubdomain('lmrc.staging.rowingboards.io', baseDomain, false)).toBe('lmrc');
    });
  });

  describe('with port numbers', () => {
    it('strips port from hostname', () => {
      expect(extractSubdomain('lmrc.rowingboards.io:3000', baseDomain, false)).toBe('lmrc');
      expect(extractSubdomain('rowingboards.io:443', baseDomain, false)).toBeNull();
    });
  });

  describe('with localhost development', () => {
    it('extracts subdomain from localhost when allowed', () => {
      expect(extractSubdomain('lmrc.localhost', baseDomain, true)).toBe('lmrc');
      expect(extractSubdomain('lmrc.localhost:3000', baseDomain, true)).toBe('lmrc');
      expect(extractSubdomain('test.local', baseDomain, true)).toBe('test');
    });

    it('returns null for localhost when not allowed', () => {
      expect(extractSubdomain('lmrc.localhost', baseDomain, false)).toBeNull();
      expect(extractSubdomain('lmrc.localhost:3000', baseDomain, false)).toBeNull();
    });

    it('returns null for www on localhost', () => {
      expect(extractSubdomain('www.localhost', baseDomain, true)).toBeNull();
    });

    it('returns null for plain localhost', () => {
      expect(extractSubdomain('localhost', baseDomain, true)).toBeNull();
      expect(extractSubdomain('localhost:3000', baseDomain, true)).toBeNull();
    });
  });

  describe('with custom domains', () => {
    it('returns null for unrecognized domains (triggers custom domain lookup)', () => {
      expect(extractSubdomain('bookings.lmrc.org.au', baseDomain, false)).toBeNull();
      expect(extractSubdomain('rowing.example.com', baseDomain, false)).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('handles empty hostname', () => {
      expect(extractSubdomain('', baseDomain, false)).toBeNull();
    });

    it('handles hostname with only port', () => {
      expect(extractSubdomain(':3000', baseDomain, false)).toBeNull();
    });

    it('is case-sensitive for subdomains', () => {
      // Subdomains should be lowercase in practice, but the function preserves case
      expect(extractSubdomain('LMRC.rowingboards.io', baseDomain, false)).toBe('LMRC');
    });
  });
});
