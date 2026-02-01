/**
 * OpenAPI/Swagger Documentation Setup
 *
 * Provides interactive API documentation at /api-docs
 * Useful for development and UAT testing.
 */

import type { Express } from 'express';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Rowing Boards SaaS API',
      version: '1.0.0',
      description: `
Multi-tenant REST API for the Rowing Boards SaaS platform.

## Authentication

Admin endpoints require JWT Bearer authentication. Obtain a token via \`POST /api/v1/admin/login\`.

\`\`\`
Authorization: Bearer <token>
\`\`\`

## Multi-Tenancy

All requests are scoped to a club based on the subdomain:
- \`lmrc.rowandlift.au\` → LMRC club data
- \`sydney-rowing.rowandlift.au\` → Sydney Rowing club data

## Rate Limiting

- Public endpoints: 100 requests/minute per tenant
- Admin endpoints: 30 requests/minute per tenant
- Login endpoint: 5 requests/minute per IP (brute-force protection)
      `,
      contact: {
        name: 'Row and Lift Support',
        url: 'https://rowandlift.au',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Local development',
      },
      {
        url: 'https://{subdomain}.rowandlift.au',
        description: 'Production (subdomain per club)',
        variables: {
          subdomain: {
            default: 'lmrc',
            description: 'Club subdomain',
          },
        },
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /api/v1/admin/login',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  enum: [
                    'UNAUTHORIZED',
                    'FORBIDDEN',
                    'NOT_FOUND',
                    'VALIDATION_ERROR',
                    'RATE_LIMITED',
                    'SCRAPE_IN_PROGRESS',
                    'UPSTREAM_ERROR',
                    'INTERNAL_ERROR',
                  ],
                },
                message: { type: 'string' },
                details: { type: 'object' },
                requestId: { type: 'string', format: 'uuid' },
              },
            },
          },
        },
        Boat: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            name: { type: 'string', example: 'Simone Kain' },
            boatType: { type: 'string', example: '1X' },
            boatCategory: { type: 'string', enum: ['race', 'tinnie'] },
            classification: { type: 'string', example: 'R' },
            weight: { type: 'integer', example: 75 },
            isDamaged: { type: 'boolean' },
            damagedReason: { type: 'string', nullable: true },
          },
        },
        Booking: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            boatId: { type: 'string', format: 'uuid' },
            bookingDate: { type: 'string', format: 'date' },
            sessionName: { type: 'string', example: 'Morning 1' },
            bookings: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  memberName: { type: 'string' },
                  startTime: { type: 'string' },
                  endTime: { type: 'string' },
                },
              },
            },
          },
        },
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 1 },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: {
              type: 'object',
              properties: {
                token: { type: 'string' },
                expiresIn: { type: 'integer', example: 3600 },
                user: {
                  type: 'object',
                  properties: {
                    id: { type: 'string', format: 'uuid' },
                    email: { type: 'string', format: 'email' },
                    role: { type: 'string' },
                    fullName: { type: 'string', nullable: true },
                  },
                },
              },
            },
          },
        },
        HealthResponse: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['healthy', 'degraded', 'unhealthy'] },
            timestamp: { type: 'string', format: 'date-time' },
            checks: {
              type: 'object',
              properties: {
                database: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['up', 'down'] },
                    latencyMs: { type: 'integer' },
                  },
                },
              },
            },
          },
        },
      },
    },
    tags: [
      { name: 'Public', description: 'Public endpoints (no authentication)' },
      { name: 'Admin', description: 'Admin endpoints (JWT required)' },
      { name: 'Health', description: 'Health and status endpoints' },
    ],
    paths: {
      '/api/v1/boats': {
        get: {
          tags: ['Public'],
          summary: 'List all boats',
          description: 'Returns all boats for the current club (based on subdomain)',
          parameters: [
            { name: 'limit', in: 'query', schema: { type: 'integer', default: 100, maximum: 500 } },
            { name: 'offset', in: 'query', schema: { type: 'integer', default: 0 } },
          ],
          responses: {
            200: {
              description: 'List of boats',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      success: { type: 'boolean', example: true },
                      data: { type: 'array', items: { $ref: '#/components/schemas/Boat' } },
                      meta: {
                        type: 'object',
                        properties: {
                          total: { type: 'integer' },
                          limit: { type: 'integer' },
                          offset: { type: 'integer' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      '/api/v1/boats/{id}': {
        get: {
          tags: ['Public'],
          summary: 'Get a single boat',
          parameters: [
            { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
          ],
          responses: {
            200: { description: 'Boat details' },
            404: { description: 'Boat not found' },
          },
        },
      },
      '/api/v1/bookings': {
        get: {
          tags: ['Public'],
          summary: 'List bookings',
          parameters: [
            { name: 'date', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Filter by specific date' },
            { name: 'from', in: 'query', schema: { type: 'string', format: 'date' }, description: 'Start of date range' },
            { name: 'to', in: 'query', schema: { type: 'string', format: 'date' }, description: 'End of date range' },
            { name: 'boat', in: 'query', schema: { type: 'string', format: 'uuid' }, description: 'Filter by boat ID' },
          ],
          responses: {
            200: { description: 'List of bookings' },
          },
        },
      },
      '/api/v1/config': {
        get: {
          tags: ['Public'],
          summary: 'Get club display configuration',
          description: 'Returns branding and display settings. Supports ETag caching.',
          responses: {
            200: { description: 'Club configuration' },
            304: { description: 'Not modified (ETag match)' },
          },
        },
      },
      '/api/v1/health': {
        get: {
          tags: ['Health'],
          summary: 'Club health check',
          description: 'Returns health status including database connectivity and last scrape time',
          responses: {
            200: {
              description: 'Health status',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/HealthResponse' } } },
            },
          },
        },
      },
      '/api/v1/admin/login': {
        post: {
          tags: ['Admin'],
          summary: 'Admin login',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } },
          },
          responses: {
            200: {
              description: 'Login successful',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginResponse' } } },
            },
            401: { description: 'Invalid credentials' },
            429: { description: 'Too many login attempts' },
          },
        },
      },
      '/api/v1/admin/status': {
        get: {
          tags: ['Admin'],
          summary: 'Get scrape status',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Scrape status and history' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/admin/credentials': {
        put: {
          tags: ['Admin'],
          summary: 'Update RevSport credentials',
          security: [{ bearerAuth: [] }],
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['url', 'username', 'password'],
                  properties: {
                    url: { type: 'string', format: 'uri' },
                    username: { type: 'string' },
                    password: { type: 'string' },
                  },
                },
              },
            },
          },
          responses: {
            200: { description: 'Credentials updated' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/admin/display': {
        put: {
          tags: ['Admin'],
          summary: 'Update display configuration',
          security: [{ bearerAuth: [] }],
          responses: {
            200: { description: 'Configuration updated' },
            401: { description: 'Unauthorized' },
          },
        },
      },
      '/api/v1/admin/sync': {
        post: {
          tags: ['Admin'],
          summary: 'Trigger manual sync',
          description: 'Triggers an immediate scrape of RevSport data',
          security: [{ bearerAuth: [] }],
          responses: {
            202: { description: 'Sync queued' },
            401: { description: 'Unauthorized' },
            409: { description: 'Sync already in progress' },
          },
        },
      },
    },
  },
  apis: [], // We define paths inline above
};

export function setupSwagger(app: Express): void {
  const swaggerSpec = swaggerJsdoc(swaggerOptions);

  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Rowing Boards API Docs',
  }));

  // Serve raw OpenAPI spec as JSON
  app.get('/api-docs.json', (_req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}
