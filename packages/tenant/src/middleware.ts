import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Database } from '@lmrc/db';
import type { TenantMiddlewareConfig, Club } from './types.js';

/**
 * Extract subdomain from hostname.
 *
 * Examples:
 * - "lmrc.rowandlift.au" with baseDomain "rowandlift.au" → "lmrc"
 * - "lmrc.localhost" with localhost allowed → "lmrc"
 * - "rowandlift.au" → null (no subdomain)
 * - "www.rowandlift.au" → null (www is not a valid club subdomain)
 */
export function extractSubdomain(
  hostname: string,
  baseDomain: string,
  allowLocalhost: boolean
): string | null {
  // Remove port if present
  const hostWithoutPort = hostname.split(':')[0];

  // Handle localhost development
  if (allowLocalhost && (hostWithoutPort.endsWith('.localhost') || hostWithoutPort.endsWith('.local'))) {
    const parts = hostWithoutPort.split('.');
    if (parts.length >= 2) {
      const subdomain = parts[0];
      // Ignore www
      if (subdomain === 'www') return null;
      return subdomain;
    }
    return null;
  }

  // Check if hostname ends with base domain
  if (!hostWithoutPort.endsWith(`.${baseDomain}`) && hostWithoutPort !== baseDomain) {
    // Might be a custom domain - return null to trigger custom domain lookup
    return null;
  }

  // Extract subdomain
  if (hostWithoutPort === baseDomain) {
    // No subdomain (e.g., "rowandlift.au")
    return null;
  }

  // Get the part before the base domain
  const subdomainPart = hostWithoutPort.slice(0, -(baseDomain.length + 1));

  // Handle nested subdomains (take only the first part)
  const subdomain = subdomainPart.split('.')[0];

  // Ignore www
  if (subdomain === 'www') return null;

  return subdomain || null;
}

/**
 * Create tenant middleware factory.
 *
 * This middleware extracts the subdomain from the request hostname,
 * looks up the club in the database, and attaches it to `req.club`.
 *
 * @example
 * ```ts
 * import { createTenantMiddleware } from '@lmrc/tenant';
 * import { createDb } from '@lmrc/db';
 *
 * const db = createDb(process.env.DATABASE_URL);
 * const tenantMiddleware = createTenantMiddleware(db, {
 *   baseDomain: 'rowandlift.au',
 *   marketingUrl: 'https://rowandlift.au',
 * });
 *
 * app.use(tenantMiddleware);
 * ```
 */
export function createTenantMiddleware(
  db: Database,
  config: TenantMiddlewareConfig
): RequestHandler {
  const {
    baseDomain,
    marketingUrl,
    publicPaths = [],
    optionalPaths = ['/health', '/api/v1/health'],
    allowLocalhost = process.env.NODE_ENV !== 'production',
  } = config;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Skip tenant resolution entirely for public paths
    if (publicPaths.some(path => req.path === path || req.path.startsWith(path + '/'))) {
      next();
      return;
    }

    // Check if this is an optional path (club resolution attempted but not required)
    const isOptionalPath = optionalPaths.some(
      path => req.path === path || req.path.startsWith(path + '/')
    );

    const hostname = req.hostname || req.headers.host || '';

    // Try to extract subdomain
    const subdomain = extractSubdomain(hostname, baseDomain, allowLocalhost);

    let club: Club | undefined;

    if (subdomain) {
      // Look up by subdomain using callback-based where clause
      // This avoids drizzle-orm version conflicts between packages
      const result = await db.query.clubs.findFirst({
        where: (clubs, { eq }) => eq(clubs.subdomain, subdomain),
      });
      club = result as Club | undefined;
    } else {
      // No subdomain - check if it's a custom domain
      const hostWithoutPort = hostname.split(':')[0];

      // Only check custom domain if it's not the base domain
      if (hostWithoutPort !== baseDomain && !hostWithoutPort.endsWith(`.${baseDomain}`)) {
        const result = await db.query.clubs.findFirst({
          where: (clubs, { eq }) => eq(clubs.customDomain, hostWithoutPort),
        });
        club = result as Club | undefined;
      }
    }

    // No subdomain and no custom domain match
    if (!subdomain && !club) {
      // For optional paths (like health), continue without club context
      if (isOptionalPath) {
        next();
        return;
      }
      if (marketingUrl) {
        res.redirect(marketingUrl);
        return;
      }
      // No marketing URL configured - return 404
      res.status(404).json({
        error: 'Club not found',
        message: 'No club subdomain provided',
      });
      return;
    }

    // Subdomain provided but club not found
    if (!club) {
      // For optional paths (like health), continue without club context
      if (isOptionalPath) {
        next();
        return;
      }
      res.status(404).json({
        error: 'Club not found',
        message: `No club found with subdomain: ${subdomain}`,
      });
      return;
    }

    // Check club status
    if (club.status === 'suspended') {
      res.status(403).json({
        error: 'Club suspended',
        message: 'This club\'s subscription has been suspended. Please contact support.',
      });
      return;
    }

    if (club.status === 'cancelled') {
      res.status(410).json({
        error: 'Club cancelled',
        message: 'This club\'s subscription has been cancelled.',
      });
      return;
    }

    // Attach club to request
    req.club = club;
    next();
  };
}

/**
 * Middleware to require a club context.
 * Use this on routes that must have a club (after tenantMiddleware).
 *
 * @example
 * ```ts
 * app.get('/api/v1/boats', requireClub, (req, res) => {
 *   const boats = await getBoatsForClub(req.club.id);
 *   res.json(boats);
 * });
 * ```
 */
export function requireClub(req: Request, res: Response, next: NextFunction): void {
  if (!req.club) {
    res.status(500).json({
      error: 'Internal error',
      message: 'Club context not available. Ensure tenantMiddleware is applied.',
    });
    return;
  }
  next();
}
