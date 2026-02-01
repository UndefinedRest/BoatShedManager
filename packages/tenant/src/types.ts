/**
 * Club type matching the database schema.
 * Defined explicitly to avoid drizzle-orm version conflicts across packages.
 */
export interface Club {
  id: string;
  name: string;
  shortName: string | null;
  subdomain: string;
  customDomain: string | null;
  dataSourceType: string | null;
  dataSourceConfig: unknown;
  timezone: string | null;
  branding: unknown;
  displayConfig: unknown;
  status: string | null;
  subscriptionTier: string | null;
  subscriptionExpiresAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

/**
 * Configuration for the tenant middleware
 */
export interface TenantMiddlewareConfig {
  /**
   * The base domain (e.g., "rowandlift.au")
   * Subdomains will be extracted from hostnames like "lmrc.rowandlift.au"
   */
  baseDomain: string;

  /**
   * URL to redirect to when no subdomain is found (e.g., marketing site)
   * If not provided, returns 404
   */
  marketingUrl?: string;

  /**
   * Paths that should bypass tenant resolution (e.g., health checks)
   * Default: ['/health', '/api/v1/health']
   */
  publicPaths?: string[];

  /**
   * Whether to allow localhost subdomains for development
   * e.g., "lmrc.localhost:3000"
   * Default: true in development, false in production
   */
  allowLocalhost?: boolean;
}

/**
 * Extend Express Request to include club context
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * The club (tenant) for this request, set by tenant middleware.
       * Only available after tenantMiddleware runs successfully.
       */
      club?: Club;
    }
  }
}
