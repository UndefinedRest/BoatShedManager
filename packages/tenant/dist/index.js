/**
 * @lmrc/tenant - Multi-tenant subdomain routing middleware
 *
 * This package provides Express middleware for resolving tenants (clubs)
 * from request subdomains or custom domains.
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { createDb } from '@lmrc/db';
 * import { createTenantMiddleware, requireClub } from '@lmrc/tenant';
 *
 * const app = express();
 * const db = createDb(process.env.DATABASE_URL);
 *
 * // Apply tenant middleware globally
 * app.use(createTenantMiddleware(db, {
 *   baseDomain: 'rowingboards.io',
 *   marketingUrl: 'https://rowingboards.io',
 * }));
 *
 * // Access club context in routes
 * app.get('/api/v1/boats', requireClub, (req, res) => {
 *   console.log(`Fetching boats for ${req.club.name}`);
 *   // ... fetch boats for req.club.id
 * });
 * ```
 */
export { createTenantMiddleware, requireClub, extractSubdomain } from './middleware.js';
// Re-export types for module augmentation
import './types.js';
//# sourceMappingURL=index.js.map