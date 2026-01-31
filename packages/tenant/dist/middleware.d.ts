import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { Database } from '@lmrc/db';
import type { TenantMiddlewareConfig } from './types.js';
/**
 * Extract subdomain from hostname.
 *
 * Examples:
 * - "lmrc.rowingboards.io" with baseDomain "rowingboards.io" → "lmrc"
 * - "lmrc.localhost" with localhost allowed → "lmrc"
 * - "rowingboards.io" → null (no subdomain)
 * - "www.rowingboards.io" → null (www is not a valid club subdomain)
 */
export declare function extractSubdomain(hostname: string, baseDomain: string, allowLocalhost: boolean): string | null;
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
 *   baseDomain: 'rowingboards.io',
 *   marketingUrl: 'https://rowingboards.io',
 * });
 *
 * app.use(tenantMiddleware);
 * ```
 */
export declare function createTenantMiddleware(db: Database, config: TenantMiddlewareConfig): RequestHandler;
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
export declare function requireClub(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=middleware.d.ts.map