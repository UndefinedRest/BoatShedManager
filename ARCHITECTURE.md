# Solution Architecture

## System Overview

A multi-tenant SaaS platform for rowing club booking boards, with a separate static booking page and a Raspberry Pi kiosk installation at the boatshed.

```
SOLUTION STRUCTURE (pnpm monorepo)

apps/
├── saas-server/          ─── Render Web Service (rowing-boards-web)
│   ├── src/                  board.lakemacrowing.au
│   │   ├── index.ts              Express app, wires all packages
│   │   └── worker.ts        ─── Render Worker (rowing-boards-worker)
│   │                            Scrape scheduler (cron)
│   └── public/
│       ├── index.html            Booking Board (TV + Interactive)
│       ├── admin.html            Admin Config Page
│       ├── config.html           Legacy config page
│       ├── css/
│       │   ├── tv-display.css
│       │   └── admin.css
│       └── js/
│           ├── tv-display.js
│           └── admin.js
│
├── booking-page/         ─── Render Static Site (lmrc-booking-page)
│   ├── book-a-boat.html      lakemacrowing.au
│   ├── boats.json                Per-boat booking with session buttons
│   └── HOSTING.md                Fetches config from SaaS API
│
├── pi-server/                Legacy Pi local server (manual fallback)
└── noticeboard/              Noticeboard display (Pi, separate app)

packages/                     Shared libraries (@lmrc/*)
├── api/                      Routes, middleware, JWT auth, rate limiting
├── db/                       Drizzle ORM, schema, migrations
├── crypto/                   AES-256-GCM credential encryption
├── scraper/                  RevSport adapter, parser, scheduler
├── tenant/                   Multi-tenant subdomain resolution
└── config/                   Shared configuration

scripts/                      CLI admin tools (use loadEnv for safety)
lmrc-pi-deployment/           Pi setup scripts, systemd services
infrastructure/               Pi deployment docs
render.yaml                   Render Blueprint (IaC for all 3 services)
```

---

## Deployed Architecture

```
   ┌─────────────────┐      ┌──────────────────┐     ┌───────────────────┐
   │  BOATSHED PI    │      │  MEMBER'S PHONE  │     │  ADMIN'S BROWSER  │
   │  (Chromium      │      │  / PC BROWSER    │     │                   │
   │   kiosk, 55" TV)│      │                  │     │                   │
   └────────┬────────┘      └────────┬─────────┘     └─────────┬─────────┘
            │ ?mode=tv               │                         │
            │                        │                         │
   ─ ─ ─ ─ ┼ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┼─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─ ─
            │         INTERNET       │                         │
   ─ ─ ─ ─ ┼ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─┼─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┼ ─ ─ ─ ─
            │                        │                         │
            ▼                        │                         │
   ┌─────────────────────────────────┼─────────────────────────┼──────────┐
   │  RENDER — board.lakemacrowing.au│                         │          │
   │                                 │                         │          │
   │  ┌──────────────────────────────┼─────────────────────────┼───────┐  │
   │  │  Web Service (rowing-boards-web)                       │       │  │
   │  │                              │                         │       │  │
   │  │  Static files:               │        API:             │       │  │
   │  │  /           → index.html ◄──┘  /api/v1/boats     ◄───┤       │  │
   │  │  /admin      → admin.html ◄─────/api/v1/config    ◄───┤       │  │
   │  │                                 /api/v1/admin/*    ◄───┘       │  │
   │  │                                 /api/v1/sync                   │  │
   │  │                                 /health  ◄── UptimeRobot      │  │
   │  └────────────────────────────────────────────────────────────────┘  │
   │                                                                      │
   │  ┌────────────────────────────────────────────────────────────────┐  │
   │  │  Worker (rowing-boards-worker)                                 │  │
   │  │  Cron scheduler → scrapes RevSport → writes to DB             │  │
   │  └──────────────────────────┬─────────────────────────────────────┘  │
   └─────────────────────────────┼────────────────────────────────────────┘
                                 │
   ┌─────────────────────────────┼────────────────────────────────────────┐
   │  RENDER — lakemacrowing.au  │                                        │
   │                             │                                        │
   │  ┌──────────────────────────┼─────────────────────────────────────┐  │
   │  │  Static Site (lmrc-booking-page)                               │  │
   │  │                          │                                     │  │
   │  │  /book-a-boat.html ◄─────┼── member clicks boat name on board │  │
   │  │   fetches config ────────┼──► board.lakemacrowing.au/api/v1/   │  │
   │  │   redirects to ──────────┼──► RevSport booking confirm URL    │  │
   │  └──────────────────────────┼─────────────────────────────────────┘  │
   └─────────────────────────────┼────────────────────────────────────────┘
                                 │
   ┌──────────────────────────────────────┐  ┌────────────────────────────┐
   │  SUPABASE (Sydney)                   │  │  REVSPORT (External)       │
   │  PostgreSQL                          │  │  lakemacquarierowingclub   │
   │                                      │  │  .org.au                   │
   │  clubs, admin_users, boat_cache,     │  │                            │
   │  bookings, scrape_jobs               │  │  Booking system of record  │
   │                                      │  │  Scraped by worker         │
   └──────────────────────────────────────┘  └────────────────────────────┘
```

---

## Components

### 1. Booking Board — `apps/saas-server/public/`

The main product. Displays boat availability in a grid of boats x days x sessions.

**Two display modes:**

| Mode        | URL          | Purpose                         | Interactivity                                |
|-------------|--------------|-------------------------------- |----------------------------------------------|
| TV          | `?mode=tv`   | 55" TV in boatshed via Pi kiosk | None — passive display                       |
| Interactive | default      | PC/mobile browser               | Click-to-book, font controls, manual refresh |

**Frontend**: Vanilla JS (`tv-display.js`), reads all config from `GET /api/v1/config`:

- Session times, boat grouping, sort order, booking URLs
- Branding (logo, colours)
- Falls back to hardcoded defaults if API unreachable

**Backend**: Express app (`apps/saas-server/src/index.ts`) wiring shared packages.

### 2. Booking Page — `apps/booking-page/`

Per-boat booking page linked from the booking board. When a member clicks a boat name, they land here.

- Static HTML served by Render static site at `lakemacrowing.au`
- Fetches session times, booking URL, and logo from `board.lakemacrowing.au/api/v1/config` (CORS)
- Shows session buttons; clicking one redirects to RevSport booking confirm URL
- Falls back to hardcoded defaults if API unreachable
- Boat data fetched from `board.lakemacrowing.au/api/v1/boats`

### 3. Admin Page — `apps/saas-server/public/admin.html`

Self-service configuration for club administrators. JWT-authenticated.

**Tabs**: Dashboard, Branding, Sessions, Boat Display, Booking URLs, Data Source

### 4. Worker — `apps/saas-server/src/worker.ts`

Background scrape scheduler. Runs as a separate Render worker service.

- Cron-based: scrapes RevSport on schedule per club
- Writes boat metadata and bookings to Supabase
- Adaptive refresh intervals
- Error handling with production logging (Pino)

### 5. Pi Installation — `lmrc-pi-deployment/`

Raspberry Pi 4 in the LMRC boatshed running Chromium in kiosk mode.

- Points at `board.lakemacrowing.au?mode=tv` (cloud-hosted)
- No local server needed for booking board (Pi is just a browser)
- `apps/pi-server/` available as manual fallback if internet is down
- `apps/noticeboard/` runs locally on the Pi for club announcements

### 6. Shared Packages — `packages/`

| Package          | Purpose                                                        |
|------------------|----------------------------------------------------------------|
| `@lmrc/api`      | Express routes (public + admin), JWT auth, rate limiting, Zod  |
| `@lmrc/db`       | Drizzle ORM, PostgreSQL schema, migrations, seed               |
| `@lmrc/crypto`   | AES-256-GCM credential encryption, key rotation                |
| `@lmrc/scraper`  | RevSport adapter (axios + cheerio), parser, storage, scheduler |
| `@lmrc/tenant`   | Multi-tenant subdomain resolution middleware                   |
| `@lmrc/config`   | Shared configuration types                                     |

### 7. CLI Scripts — `scripts/`

Admin operations run from the developer workstation. All use `loadEnv()` for database environment safety (defaults to dev, requires `--production` flag for production).

- `create-admin-user.ts` — Create admin accounts
- `reset-admin-password.ts` — Reset passwords
- `set-custom-domain.ts` — Configure club subdomains
- `setup-lmrc-credentials.ts` — Store encrypted RevSport credentials

---

## Data Flow

1. **Worker** scrapes RevSport on a cron schedule, writes boat/booking data to Supabase
2. **Web Service** reads from Supabase, serves the booking board and API
3. **Booking Page** (separate static site) fetches config + boat data from the API via CORS
4. **Pi kiosk** is Chromium in fullscreen pointed at the Web Service with `?mode=tv`
5. **Members** access the interactive board or booking page from their own devices
6. **Admins** configure sessions, branding, grouping via `/admin` (writes to Supabase via API)

---

## Configuration Architecture

Three distinct layers, all stored in Supabase:

| Layer             | Controlled By | Affects              | DB Column                | Examples                                      |
|-------------------|---------------|----------------------|--------------------------|-----------------------------------------------|
| Club branding     | Club admin    | All viewers          | `clubs.branding`         | Logo, colours                                 |
| Display config    | Club admin    | Board + booking page | `clubs.display_config`   | Sessions, boat groups, sort order, URLs       |
| TV display config | Club admin    | TV mode only         | `clubs.tv_display_config`| Row heights, font sizes (55" at 2m)           |
| User preferences  | Individual    | Their device         | localStorage             | Font size (accessibility)                     |

---

## Technology Stack

| Layer         | Technology                                |
|---------------|-------------------------------------------|
| Runtime       | Node.js 20                                |
| Language      | TypeScript 5.x                            |
| Web Framework | Express 4.x                               |
| ORM           | Drizzle (PostgreSQL)                      |
| Database      | Supabase (PostgreSQL, Sydney region)      |
| Hosting       | Render (Singapore — closest to Sydney)    |
| Auth          | JWT (bcryptjs, jsonwebtoken)              |
| Scraping      | axios + cheerio (replaced Puppeteer)      |
| Validation    | Zod                                       |
| Logging       | Pino                                      |
| Monorepo      | pnpm workspaces                           |
| Frontend      | Vanilla HTML/CSS/JS (no build step)       |
| IaC           | `render.yaml` (Render Blueprint)          |

---

## Infrastructure

Defined in `render.yaml`:

| Service                | Type        | Plan            | Purpose                        |
|------------------------|-------------|-----------------|--------------------------------|
| `rowing-boards-web`    | Web Service | Free            | Express API + static frontend  |
| `rowing-boards-worker` | Worker      | Starter ($7/mo) | Scrape scheduler               |
| `lmrc-booking-page`    | Static Site | Free            | Boat booking page              |

External:

- **Supabase** (Sydney) — PostgreSQL database (dev + production instances)
- **UptimeRobot** — Pings `/health` every 5 min (prevents free-tier spin-down)
- **RevSport** — External booking system of record (scraped, not owned)

---

## Security

- **Credentials**: AES-256-GCM encrypted in database (`@lmrc/crypto`), never in plaintext
- **Auth**: JWT with bcrypt password hashing; tokens in sessionStorage (cleared on tab close)
- **CORS**: Allows `*.lakemacrowing.au` origins, derived from `BASE_DOMAIN` env var
- **Rate limiting**: 100 req/min public, 30 req/min admin
- **Environment safety**: All CLI scripts use `loadEnv()` — defaults to dev, requires `--production` flag
- **XSS prevention**: All user-supplied values rendered via `textContent`, never `innerHTML`

---

**Last Updated**: 2026-02-13
**Version**: 2.0
