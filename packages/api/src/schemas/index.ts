/**
 * Zod Validation Schemas
 *
 * Request validation schemas for all API endpoints.
 */

import { z } from 'zod';

/**
 * Pagination query parameters
 */
export const paginationSchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 100))
    .pipe(z.number().min(1).max(500)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .pipe(z.number().min(0)),
});

/**
 * Date string validation (YYYY-MM-DD)
 */
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');

/**
 * Bookings query parameters
 */
export const bookingsQuerySchema = paginationSchema.extend({
  boat: z.string().uuid().optional(),
  date: dateStringSchema.optional(),
  from: dateStringSchema.optional(),
  to: dateStringSchema.optional(),
});

/**
 * UUID path parameter
 */
export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

/**
 * Login request body
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Credentials update request
 */
export const credentialsUpdateSchema = z.object({
  url: z.string().url('Invalid URL format'),
  username: z.string().min(1, 'Username is required'),
  password: z.string().min(1, 'Password is required'),
});

/**
 * Branding configuration
 */
export const brandingSchema = z.object({
  logoUrl: z.string().url().optional().nullable(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional()
    .nullable(),
  secondaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color')
    .optional()
    .nullable(),
  customCSS: z.string().max(10000).optional().nullable(),
});

/**
 * Display config update request
 */
export const displayConfigUpdateSchema = z.object({
  branding: brandingSchema.optional(),
  displayConfig: z.record(z.unknown()).optional(),
});

/**
 * Type exports for use in route handlers
 */
export type PaginationQuery = z.infer<typeof paginationSchema>;
export type BookingsQuery = z.infer<typeof bookingsQuerySchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CredentialsUpdateInput = z.infer<typeof credentialsUpdateSchema>;
export type DisplayConfigUpdateInput = z.infer<typeof displayConfigUpdateSchema>;
