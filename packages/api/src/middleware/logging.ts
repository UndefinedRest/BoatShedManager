/**
 * Logging Middleware
 *
 * Provides structured logging with request correlation IDs
 * for distributed tracing across the SaaS platform.
 */

import { pino, type Logger } from 'pino';
import { pinoHttp, type HttpLogger, type Options as PinoHttpOptions } from 'pino-http';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { IncomingMessage, ServerResponse } from 'http';
import type { ApiRequest } from '../types.js';

/**
 * Create a Pino logger instance
 */
export function createLogger(options: { debug?: boolean } = {}): Logger {
  return pino({
    level: options.debug ? 'debug' : 'info',
    transport:
      process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

/**
 * Default logger instance
 */
export const logger = createLogger({ debug: process.env.NODE_ENV !== 'production' });

/**
 * Middleware to add request ID and timing to every request
 */
export function requestContext(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const apiReq = req as ApiRequest;

  // Use existing X-Request-ID header or generate new one
  apiReq.requestId =
    (req.headers['x-request-id'] as string) || uuidv4();

  // Record start time for duration tracking
  apiReq.startTime = Date.now();

  next();
}

/**
 * Create Pino HTTP middleware with custom serializers
 */
export function createRequestLogger(options: { debug?: boolean } = {}): HttpLogger {
  const pinoOptions: PinoHttpOptions = {
    logger: createLogger(options),

    // Generate request ID
    genReqId: (req: IncomingMessage) => {
      const apiReq = req as unknown as ApiRequest;
      return apiReq.requestId || uuidv4();
    },

    // Custom log format
    customLogLevel: (
      _req: IncomingMessage,
      res: ServerResponse,
      error: Error | undefined
    ) => {
      if (error || res.statusCode >= 500) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },

    // Add custom attributes to log
    customProps: (req: IncomingMessage) => {
      const apiReq = req as unknown as ApiRequest;
      return {
        requestId: apiReq.requestId,
        clubId: apiReq.club?.id,
        userId: apiReq.user?.sub,
      };
    },

    // Custom request serializer (redact sensitive data)
    serializers: {
      req: (req: IncomingMessage & { id?: string; query?: unknown }) => ({
        id: req.id,
        method: req.method,
        url: req.url,
        query: req.query,
        // Redact authorization header
        headers: {
          ...req.headers,
          authorization: req.headers.authorization ? '[REDACTED]' : undefined,
        },
      }),
      res: (res: ServerResponse) => ({
        statusCode: res.statusCode,
      }),
    },

    // Custom success message
    customSuccessMessage: (req: IncomingMessage, res: ServerResponse) => {
      const apiReq = req as unknown as ApiRequest;
      const duration = apiReq.startTime ? Date.now() - apiReq.startTime : 0;
      return `${req.method} ${req.url} ${res.statusCode} ${duration}ms`;
    },

    // Custom error message
    customErrorMessage: (
      req: IncomingMessage,
      res: ServerResponse,
      error: Error
    ) => {
      return `${req.method} ${req.url} ${res.statusCode} - ${error.message}`;
    },

    // Don't log health check requests at info level (too noisy)
    autoLogging: {
      ignore: (req: IncomingMessage) => {
        return req.url === '/api/v1/health' && process.env.NODE_ENV === 'production';
      },
    },
  };

  return pinoHttp(pinoOptions);
}

/**
 * Log an audit event for admin actions
 */
export function logAuditEvent(
  action: string,
  details: {
    requestId: string;
    clubId: string;
    userId?: string;
    resourceType?: string;
    resourceId?: string;
    ipAddress?: string;
    extra?: Record<string, unknown>;
  }
): void {
  logger.info(
    {
      audit: true,
      action,
      ...details,
    },
    `Audit: ${action}`
  );
}

/**
 * Log a slow query warning
 */
export function logSlowQuery(
  requestId: string,
  query: string,
  durationMs: number
): void {
  if (durationMs > 500) {
    logger.warn(
      {
        requestId,
        query,
        durationMs,
        slow: true,
      },
      `Slow query: ${durationMs}ms`
    );
  }
}
