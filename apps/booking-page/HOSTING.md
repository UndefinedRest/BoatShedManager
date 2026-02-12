# LMRC Booking Page - Hosting

## Current Setup

**Platform:** Render (static site service)
**Domain:** `lakemacrowing.au`
**Cost:** Free tier

The booking page is deployed as a Render static site (`lmrc-booking-page`) defined in the repo root `render.yaml`. Render serves files directly from `apps/booking-page/` with no build step.

### Cache Headers (configured in render.yaml)

| Path           | Cache-Control                | Reason                            |
|----------------|------------------------------|-----------------------------------|
| `/boats.json`  | `no-cache, must-revalidate`  | Damage status is safety-critical  |
| `/*`           | `public, max-age=3600`       | 1 hour for HTML/CSS/JS assets     |

### Configuration from SaaS API

The booking page fetches display configuration at page load from the SaaS platform API at `board.lakemacrowing.au/api/v1/config`. This allows admin-configured values to flow through without redeployment:

- **Session times** (labels, start/end times)
- **Booking base URL** (RevSport confirm URL)
- **Logo** (from club branding)
- **Calendar and manage-bookings links** (derived from booking base URL domain)

If the API is unreachable, the page falls back to hardcoded defaults.

### Boat Data

In production, boat data is fetched from `board.lakemacrowing.au/api/v1/boats`. The static `boats.json` file is only used for local development.

## History

- **Oct 2025:** Hosting analysis document created (Firebase recommended)
- **Late 2025:** Page migrated from Netlify to Render to consolidate infrastructure
- **Feb 2026:** Config integration added — sessions and URLs fetched from SaaS API
