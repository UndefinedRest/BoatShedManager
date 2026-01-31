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

import { createDb } from '@lmrc/db';
import { createTenantMiddleware, requireClub } from '@lmrc/tenant';
import { createApiRouter, logger } from '@lmrc/api';

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
const BASE_DOMAIN = process.env.BASE_DOMAIN || 'rowingboards.io';
const MARKETING_URL = process.env.MARKETING_URL || 'https://rowingboards.io';

// Initialize database
const db = createDb(process.env.DATABASE_URL!);

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

// CORS - allow requests from subdomains
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }
    // Allow any subdomain of the base domain
    const allowedPattern = new RegExp(`^https?://([a-z0-9-]+\\.)?${BASE_DOMAIN.replace('.', '\\.')}$`);
    if (allowedPattern.test(origin) || origin.includes('localhost')) {
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
app.use('/api/v1', requireClub, createApiRouter(db, {
  jwtSecret: process.env.JWT_SECRET!,
  encryptionKey: process.env.ENCRYPTION_KEY!,
  jwtExpiresIn: parseInt(process.env.JWT_EXPIRES_IN || '3600', 10),
  debug: NODE_ENV === 'development',
  publicRateLimit: parseInt(process.env.PUBLIC_RATE_LIMIT || '100', 10),
  adminRateLimit: parseInt(process.env.ADMIN_RATE_LIMIT || '30', 10),
}));

// Static frontend (booking board display)
// TODO: Serve static files from apps/booking-board once built
// app.use(express.static('public'));

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

