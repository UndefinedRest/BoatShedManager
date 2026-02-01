# API Reference

**Last Updated**: 2026-02-01
**Status**: Current - SaaS API (Phase A)

---

## Overview

The Rowing Boards SaaS platform exposes a REST API for both the booking board display and external consumers (like the LMRC Booking Page on Netlify).

**Base URL**: `https://{subdomain}.rowandlift.au/api/v1`

**Interactive Documentation**: Available at `/api-docs` (Swagger UI)

## Authentication

### Public Endpoints
No authentication required. Rate limited to 100 requests/minute per tenant.

### Admin Endpoints
Require JWT Bearer authentication:
```
Authorization: Bearer <token>
```

Obtain a token via `POST /api/v1/admin/login`.

## Multi-Tenancy

All requests are scoped to a club based on the hostname:
- `lmrc.rowandlift.au` → LMRC club data
- `board.lakemacrowing.au` → LMRC club data (custom domain)

The API automatically resolves the club from either subdomain or custom domain.

---

## Public Endpoints

### GET /boats

List all boats for the club.

**Query Parameters**:
| Name | Type | Default | Description |
|------|------|---------|-------------|
| `limit` | integer | 100 | Max items (max: 500) |
| `offset` | integer | 0 | Skip N items |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "sourceId": "8584",
      "name": "Simone Kain",
      "boatType": "1X",
      "boatCategory": "race",
      "classification": "R",
      "weight": 75,
      "isDamaged": false,
      "damagedReason": null,
      "metadata": {},
      "lastScrapedAt": "2026-02-01T06:00:00Z"
    }
  ],
  "meta": {
    "total": 42,
    "limit": 100,
    "offset": 0,
    "count": 42
  }
}
```

**Cache**: `max-age=60, stale-while-revalidate=300`

---

### GET /boats/:id

Get a single boat by ID.

**Path Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `id` | string | Boat UUID or sourceId (RevSport ID) |

The endpoint automatically detects whether the ID is a UUID or sourceId:
- UUID format: `/boats/550e8400-e29b-41d4-a716-446655440000`
- sourceId format: `/boats/8584`

**Response**: Same structure as single item from `/boats`

**Errors**:
- `404 NOT_FOUND` — Boat not found

---

### GET /bookings

List bookings with optional filters.

**Query Parameters**:
| Name | Type | Description |
|------|------|-------------|
| `date` | date | Filter by specific date (YYYY-MM-DD) |
| `from` | date | Start of date range |
| `to` | date | End of date range |
| `boat` | uuid | Filter by boat ID |
| `limit` | integer | Max items (default: 100, max: 500) |
| `offset` | integer | Skip N items |

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "boatId": "uuid",
      "boatSourceId": "8584",
      "boatName": "Simone Kain",
      "date": "2026-02-01",
      "sessionName": "Morning 1",
      "bookings": [
        {
          "memberName": "John Smith",
          "startTime": "06:00",
          "endTime": "07:00"
        }
      ],
      "scrapedAt": "2026-02-01T05:58:00Z"
    }
  ],
  "meta": {
    "total": 156,
    "limit": 100,
    "offset": 0,
    "count": 100
  }
}
```

---

### GET /config

Get club display configuration for the booking board.

**Response**:
```json
{
  "success": true,
  "data": {
    "clubId": "uuid",
    "name": "Lake Macquarie Rowing Club",
    "shortName": "LMRC",
    "timezone": "Australia/Sydney",
    "branding": {
      "primaryColor": "#1e3a5f",
      "secondaryColor": "#c9a227",
      "logoUrl": null
    },
    "displayConfig": {
      "showCountdown": true,
      "refreshInterval": 300000,
      "sessionTimes": {
        "morning1": { "start": "05:00", "end": "07:00" },
        "morning2": { "start": "07:00", "end": "09:00" },
        "evening": { "start": "16:00", "end": "19:00" }
      }
    }
  }
}
```

**Cache**: `max-age=300, stale-while-revalidate=3600`
**ETag**: Supported for conditional requests

---

### GET /health

Health check endpoint for monitoring.

**Response** (healthy):
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-01T06:00:00Z",
    "checks": {
      "database": {
        "status": "up",
        "latencyMs": 12
      },
      "scraper": {
        "status": "idle",
        "lastSuccessAt": "2026-02-01T05:58:00Z",
        "lastSuccessAgeSeconds": 120
      }
    },
    "club": {
      "id": "uuid",
      "name": "LMRC",
      "boatsCount": 42,
      "lastScrapedAt": "2026-02-01T05:58:00Z"
    }
  }
}
```

**Status Values**:
- `healthy` — All systems operational
- `degraded` — Some issues (e.g., slow database, stale scrape data)
- `unhealthy` — Critical issues (e.g., database unreachable)

**Note**: This endpoint works without tenant context (for platform-wide monitoring) but includes club-specific data when accessed via subdomain.

---

## Admin Endpoints

All admin endpoints require JWT authentication.

### POST /admin/login

Authenticate and obtain JWT token.

**Request**:
```json
{
  "email": "admin@lmrc.org.au",
  "password": "secret123"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "token": "eyJhbG...",
    "expiresIn": 3600,
    "user": {
      "id": "uuid",
      "email": "admin@lmrc.org.au",
      "role": "club_admin",
      "fullName": "John Smith"
    }
  }
}
```

**Rate Limit**: 5 attempts per 15 minutes (brute-force protection)

---

### GET /admin/status

Get scrape status and history.

**Response**:
```json
{
  "success": true,
  "data": {
    "lastScrape": {
      "completedAt": "2026-02-01T06:00:00Z",
      "status": "completed",
      "boatsCount": 42,
      "bookingsCount": 156,
      "durationMs": 4500
    },
    "recentJobs": [...],
    "nextScheduled": "2026-02-01T06:02:00Z"
  }
}
```

---

### PUT /admin/credentials

Update RevSport credentials.

**Request**:
```json
{
  "url": "https://lmrc.revsport.net.au",
  "username": "admin",
  "password": "secret"
}
```

Credentials are encrypted before storage.

---

### PUT /admin/display

Update branding and display configuration.

**Request**:
```json
{
  "branding": {
    "primaryColor": "#1e3a5f",
    "secondaryColor": "#c9a227",
    "logoUrl": "https://example.com/logo.png"
  },
  "displayConfig": {
    "showCountdown": true,
    "refreshInterval": 300000
  }
}
```

Both `branding` and `displayConfig` are optional — only provided fields are updated.

---

### POST /admin/sync

Trigger immediate data sync from RevSport.

**Response**:
```json
{
  "success": true,
  "data": {
    "message": "Sync started",
    "jobId": "uuid"
  }
}
```

**Errors**:
- `409 SCRAPE_IN_PROGRESS` — Sync already running

---

## Error Responses

All errors follow consistent format:

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid email or password",
    "requestId": "abc-123"
  }
}
```

**Error Codes**:
| Code | HTTP | Description |
|------|------|-------------|
| `UNAUTHORIZED` | 401 | Missing or invalid credentials |
| `FORBIDDEN` | 403 | Valid credentials, insufficient permissions |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `VALIDATION_ERROR` | 400 | Invalid request body/params |
| `RATE_LIMITED` | 429 | Too many requests |
| `SCRAPE_IN_PROGRESS` | 409 | Sync already running |
| `UPSTREAM_ERROR` | 502 | RevSport unreachable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Rate Limiting

| Endpoint Type | Limit | Window |
|--------------|-------|--------|
| Public GET | 100 req | 1 min |
| Admin GET | 60 req | 1 min |
| Admin PUT/POST | 20 req | 1 min |
| Login | 5 attempts | 15 min |

Rate limits are per-tenant (based on subdomain/club).

---

## External System Integration

### sourceId Field

Boats and bookings include a `sourceId` field containing the external system ID (e.g., RevSport boat ID). This enables:

1. **Lookup by external ID**: `GET /boats/8584` (sourceId lookup)
2. **Deep linking**: Link from RevSport to specific boats in the booking board
3. **Integration**: External systems can reference boats without knowing internal UUIDs

### Booking Page Integration

The LMRC Booking Page (Netlify) consumes these APIs:
- `GET /boats` — Display boat list with availability
- `GET /boats/:sourceId` — Get specific boat details
- `GET /bookings?date=...` — Check existing bookings

---

**See Also**:
- [Architecture Overview](../architecture/overview.md)
- [Swagger Documentation](https://lmrc.rowandlift.au/api-docs)
- [ARCHITECTURAL_ROADMAP.md](../../ARCHITECTURAL_ROADMAP.md) — Phase A5 implementation details
