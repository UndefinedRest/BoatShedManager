/**
 * Rowing Boards SaaS Server
 *
 * Main Express application entry point that wires together:
 * - @lmrc/db: PostgreSQL database connection
 * - @lmrc/tenant: Subdomain-based multi-tenancy
 * - @lmrc/api: REST API routes (public + admin)
 *
 * This is the web service deployed to Render.
 * The background scraper runs as a separate worker process (worker.ts).
 */

import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import { createDb } from '@lmrc/db';
import { createTenantMiddleware } from '@lmrc/tenant';
import { createApiRouter, logger } from '@lmrc/api';
import { ScrapeScheduler } from '@lmrc/scraper';

import { setupSwagger } from './swagger.js';

// Environment validation
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET', 'ENCRYPTION_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.error({ envVar }, 'Missing required environment variable');
    process.exit(1);
  }
}

const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'rowandlift.au';
const MARKETING_URL = process.env.MARKETING_URL || 'https://rowandlift.au';

// Initialize database
const db = createDb(process.env.DATABASE_URL!);

// Create on-demand scraper for public sync (manual refresh).
// This does NOT start cron scheduling - that runs in the separate worker process.
const onDemandScraper = new ScrapeScheduler(db, {
  encryptionKey: process.env.ENCRYPTION_KEY!,
  daysAhead: parseInt(process.env.DAYS_AHEAD || '7', 10),
  debug: NODE_ENV === 'development',
});

// Public sync function: runs a scrape for a specific club and waits for completion
const publicSyncFn = async (clubId: string) => {
  const club = await db.query.clubs.findFirst({
    where: (c, { eq }) => eq(c.id, clubId),
  });
  if (!club) {
    return { success: false, durationMs: 0, error: 'Club not found' };
  }
  const result = await onDemandScraper.scrapeClub(club);
  return { success: result.success, durationMs: result.durationMs, error: result.error };
};

// Create Express app
const app = express();

// Trust proxy (Render runs behind a load balancer)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // For Swagger UI
      scriptSrc: ["'self'", "'unsafe-inline'"], // For Swagger UI
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS - allow requests from subdomains and booking page
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }
    // Allow any subdomain of the base domain
    const allowedPattern = new RegExp(`^https?://([a-z0-9-]+\\.)?${BASE_DOMAIN.replace('.', '\\.')}$`);
    // Also allow the LMRC booking page domain
    const isBookingPage = /^https?:\/\/(www\.)?lakemacrowing\.au$/.test(origin);
    if (allowedPattern.test(origin) || isBookingPage || origin.includes('localhost')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Platform health check (before tenant middleware - always accessible)
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: NODE_ENV,
  });
});

// Swagger documentation (before tenant middleware)
if (NODE_ENV !== 'production' || process.env.ENABLE_SWAGGER === 'true') {
  setupSwagger(app);
  logger.info('Swagger documentation enabled at /api-docs');
}

// Multi-tenant subdomain routing
app.use(createTenantMiddleware(db, {
  baseDomain: BASE_DOMAIN,
  marketingUrl: MARKETING_URL,
  allowLocalhost: NODE_ENV === 'development',
}));

// API routes (scoped to tenant)
// Note: requireClub is applied inside the API router to specific routes,
// allowing /api/v1/health to work without tenant context for monitoring
app.use('/api/v1', createApiRouter(db, {
  jwtSecret: process.env.JWT_SECRET!,
  encryptionKey: process.env.ENCRYPTION_KEY!,
  jwtExpiresIn: parseInt(process.env.JWT_EXPIRES_IN || '3600', 10),
  debug: NODE_ENV === 'development',
  publicRateLimit: parseInt(process.env.PUBLIC_RATE_LIMIT || '100', 10),
  adminRateLimit: parseInt(process.env.ADMIN_RATE_LIMIT || '30', 10),
  publicSyncFn,
}));

// Static frontend (booking board display)
// Serve static files from public directory
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// Serve index.html for the root path (after API routes)
app.get('/', (_req: Request, res: Response) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// 404 handler for non-API routes
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Start server
app.listen(PORT, () => {
  logger.info({
    port: PORT,
    environment: NODE_ENV,
    baseDomain: BASE_DOMAIN,
  }, 'Rowing Boards SaaS server started');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

