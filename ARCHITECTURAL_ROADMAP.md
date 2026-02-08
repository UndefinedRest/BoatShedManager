# Architectural Roadmap: Rowing Boards SaaS Platform

## Strategic Technical Planning

**Document Type**: Architectural Roadmap & Technical Backlog
**Target Audience**: Product Management & Engineering
**Last Updated**: 2026-02-06
**Status**: SaaS pivot - replaces Pi-centric roadmap (v1.0, Oct 2025)

---

## Executive Summary

This document outlines the technical work required to evolve the LMRC Booking Board from a single-club Raspberry Pi deployment into a multi-tenant cloud SaaS product. The architecture is **cloud-first**: the platform runs on Supabase (PostgreSQL in Sydney) with Render.com for compute, and in-shed displays are thin clients (Pi or any browser device) pointing at the cloud.

**Current State**: Production single-club deployment at LMRC (Raspberry Pi, Express/TypeScript, JSON files, Puppeteer scraping)
**Target State**: Multi-tenant SaaS platform serving 100+ rowing clubs via `clubname.rowandlift.au`
**Approach**: Evolve the existing codebase incrementally (not a rewrite)

### Fundamental Principle: Display Only

The SaaS platform is a **read-only booking board**. It scrapes and displays booking data. It does not create, edit, or delete bookings. Booking entry remains the responsibility of each club's existing tools (RevSport, the separate LMRC boat booking page on Netlify, etc.).

This principle applies across all phases A-B. Booking entry integration is deferred to Phase D at earliest, and only if customer demand warrants it. This keeps the platform simple, reduces risk (no write-back to RevSport), and gets to market faster.

The platform still requires administration and configuration — clubs need to set their RevSport credentials/URL and configure the look and feel of their board. This admin functionality is in scope from Phase A.

### RevolutioniseSport as Source of Truth

**RevSport owns the fleet and bookings.** The SaaS platform is a **read-through cache** that scrapes and serves data — it does not manage boats or bookings.

**What the SaaS platform does:**
- Scrapes boat list from RevSport (including type, category, weight, damaged status)
- Scrapes bookings from RevSport
- Caches and serves this data via APIs
- Provides configuration for display preferences and RevSport credentials

**What the SaaS platform does NOT do:**
- Add, edit, or delete boats (managed in RevSport)
- Add, edit, or delete bookings (managed in RevSport or club's booking page)
- Fleet categorisation UI (inferred from RevSport data)

**API consumers:**
1. **Booking Board** (TV display) — shows current bookings for all boats
2. **Booking Page** (Netlify) — uses APIs for boat list, existing bookings, damaged status

This design means:
- Boats are **auto-discovered** when scraping RevSport, not manually entered
- The admin dashboard is **configuration only**, not fleet management
- Onboarding is simpler — connect RevSport credentials and the fleet appears automatically

### Future: Data Source Adapter Architecture

While RevSport is the initial and primary data source, the architecture must support **pluggable data source adapters** to serve clubs not using RevSport.

```
┌─────────────────────────────────────────────────────────────────┐
│                     SaaS Platform                                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │ Public APIs │  │ Admin APIs  │  │ Background Worker       │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │               │
│         └────────────────┼──────────────────────┘               │
│                          │                                      │
│              ┌───────────▼───────────┐                         │
│              │  Data Source Adapter  │  ← Abstract interface   │
│              │       Interface       │                         │
│              └───────────┬───────────┘                         │
└──────────────────────────┼──────────────────────────────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
┌────────▼────────┐ ┌─────▼──────┐ ┌───────▼───────┐
│ RevSport Adapter│ │  Built-in  │ │ Future: Other │
│   (Scraper)     │ │   Adapter  │ │   Adapters    │
│                 │ │            │ │               │
│ • Scrapes boats │ │ • CRUD for │ │ • TeamSnap    │
│ • Scrapes       │ │   boats    │ │ • Club Locker │
│   bookings      │ │ • CRUD for │ │ • iCal import │
│ • Read-only     │ │   bookings │ │ • etc.        │
└─────────────────┘ └────────────┘ └───────────────┘
     Phase A            Phase C+         Phase D+
   (MVP, Basic)     (Premium tier)    (Enterprise)
```

**Data Source Adapter Interface:**
```typescript
interface DataSourceAdapter {
    // Identity
    readonly type: 'revsport' | 'builtin' | 'teamsnap' | string;
    readonly supportsBookingEntry: boolean;  // false for RevSport, true for built-in

    // Read operations (all adapters must implement)
    getBoats(): Promise<Boat[]>;
    getBoat(id: string): Promise<Boat | null>;
    getBookings(dateRange: DateRange): Promise<Booking[]>;
    getBookingsForBoat(boatId: string, dateRange: DateRange): Promise<Booking[]>;

    // Write operations (optional - only for adapters that support it)
    createBoat?(boat: NewBoat): Promise<Boat>;
    updateBoat?(id: string, updates: BoatUpdate): Promise<Boat>;
    deleteBoat?(id: string): Promise<void>;
    createBooking?(booking: NewBooking): Promise<Booking>;
    updateBooking?(id: string, updates: BookingUpdate): Promise<Booking>;
    deleteBooking?(id: string): Promise<void>;

    // Sync (for external sources like RevSport)
    sync?(): Promise<SyncResult>;
}
```

**Product tiers:**

| Tier | Data Source | Fleet Management | Price Point |
|------|------------|------------------|-------------|
| **Basic** | RevSport (scraper) | None (RevSport is source of truth) | $50/month |
| **Pro** | RevSport (scraper) | None + Noticeboard | $100/month |
| **Premium** | Built-in adapter | Full CRUD for boats & bookings | $150+/month |
| **Enterprise** | Custom adapter | Depends on integration | Custom |

**Implementation approach:**
- Phase A: Implement RevSport adapter only. Code structured to adapter interface from the start.
- Phase C+: Add built-in adapter for clubs without RevSport (Premium tier).
- Phase D+: Add adapters for other booking systems as demand warrants.

This abstraction is designed into the architecture from Phase A, but only the RevSport adapter is implemented initially.

### Phase Summary

| Phase | Theme | Key Technical Work | Target Clubs |
|-------|-------|-------------------|-------------|
| **A** (Cloud MVP) | Display + admin in the cloud | PostgreSQL, multi-tenancy, subdomain routing, responsive layouts, basic config | 1-3 |
| **B** (Self-Service) | Let clubs onboard themselves | Admin dashboard (config only), Stripe, auth, onboarding wizard | 5-10 |
| **C** (Advanced) | Grow features and customer base | Noticeboard, custom domains, BullMQ, hardware bundles | 10-30 |
| **D** (Scale) | Operate efficiently at scale | Remote management, monitoring, plugins, analytics | 50+ |

---

## Current Architecture (v1.0 - LMRC)

```
Raspberry Pi (LMRC Boatshed)
├── Express/TypeScript server (port 3000)
│   ├── Puppeteer scraping → RevSport
│   ├── In-memory booking cache (10-min TTL)
│   ├── JSON config files (tv-display.json)
│   ├── Static frontend (HTML/CSS/JS)
│   └── Config page (config.html)
├── systemd service (auto-start, restart on failure)
└── Tailscale (remote access at 100.101.107.30:3000)
```

### What we keep from v1.0
- Express/TypeScript server structure
- Puppeteer scraping logic (proven, handles CSRF, sessions, retries)
- Booking display frontend (HTML/CSS/JS, TV-optimised layout)
- Tinnies support (boat categories with separate display sections — being built on Pi codebase pre-SaaS)
- Zod schema validation patterns
- Error handling and logging patterns

### What changes for SaaS
| Component | v1.0 (Pi) | SaaS (Cloud) |
|-----------|-----------|-------------|
| Data storage | JSON files | PostgreSQL |
| Configuration | `tv-display.json` + `.env` | Database `clubs` table |
| Credentials | Plaintext `.env` | AES-256 encrypted DB column |
| Multi-tenancy | None | Subdomain routing + `club_id` isolation |
| Scheduling | Single `setInterval` | `node-cron` per-club (Phase A), BullMQ (Phase C) |
| Display | Pi kiosk only | TV + desktop + mobile responsive |
| Admin | JSON file editing | Web admin dashboard |

---

## Target Architecture (SaaS)

```
┌─────────────────────────────────────────┐    ┌─────────────────────────────┐
│        Render.com (Compute)             │    │   Supabase (Sydney)         │
│                                         │    │                             │
│  ┌───────────────────────────────────┐  │    │  ┌───────────────────────┐  │
│  │  Web Service (Express/TypeScript) │  │    │  │  PostgreSQL Database  │  │
│  │  ─────────────────────────────────│  │    │  │  ─────────────────────│  │
│  │  • Subdomain routing middleware   │  │    │  │  • clubs (config)     │  │
│  │  • Public board API (per club)    │──┼────┼──│  • boat_cache         │  │
│  │  • Admin dashboard API            │  │    │  │  • booking_cache      │  │
│  │  • Auth (JWT for admin sessions)  │  │    │  │  • users              │  │
│  │  • Static frontend serving        │  │    │  │  • scrape_jobs        │  │
│  └───────────────┬───────────────────┘  │    │  │  • audit_log          │  │
│                  │                      │    │  └───────────────────────┘  │
│  ┌───────────────▼───────────────────┐  │    │                             │
│  │  Background Worker                │  │    │  Free tier → Pro when needed│
│  │  ─────────────────────────────────│  │    │  (portable to Render/AWS)   │
│  │  • Per-club Puppeteer scraping    │──┼────┘                             │
│  │  • Adaptive refresh scheduler     │  │    └─────────────────────────────┘
│  │  • node-cron (Phase A-B)          │  │
│  │  • BullMQ + Redis (Phase C+)      │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                    │
       ┌────────────┼────────────┐
       │            │            │
  ┌────▼───┐  ┌────▼───┐  ┌────▼───┐
  │ Club A │  │ Club B │  │ Club C │
  │ TV/Pi  │  │ Laptop │  │ Phone  │
  └────────┘  └────────┘  └────────┘
```

---

## Database Schema

ORM: **Drizzle** (aligns with existing exploration work; SQL-first, lightweight, TypeScript-native)

### Core Tables

```sql
-- Clubs (tenant table - all other tables reference club_id)
CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50),
    subdomain VARCHAR(100) UNIQUE NOT NULL,           -- e.g. "lmrc"
    custom_domain VARCHAR(255),                       -- e.g. "bookings.lmrc.org.au" (Phase C)

    -- Data source configuration (adapter pattern)
    data_source_type VARCHAR(50) DEFAULT 'revsport', -- revsport, builtin, teamsnap, etc.
    data_source_config JSONB DEFAULT '{}',            -- adapter-specific config (credentials, URLs, etc.)
    -- For RevSport adapter (Phase A): { url, credentials_encrypted }
    -- For built-in adapter (Phase C+): { } (no external config needed)

    timezone VARCHAR(100) DEFAULT 'Australia/Sydney',
    branding JSONB DEFAULT '{}',                      -- {logoUrl, primaryColor, secondaryColor, customCSS}
    display_config JSONB DEFAULT '{}',                -- Web/mobile display settings (user-facing)
    tv_display_config JSONB DEFAULT '{}',             -- TV/boatshed display settings (row heights, fonts for 55" at 2m)
    status VARCHAR(50) DEFAULT 'trial',               -- trial, active, suspended, cancelled
    subscription_tier VARCHAR(50) DEFAULT 'basic',    -- basic, pro, premium, enterprise
    subscription_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Boat cache (populated by data source adapter)
-- For RevSport adapter: read-only cache, auto-discovered by scraping
-- For built-in adapter: writable, managed via admin dashboard (Premium tier)
CREATE TABLE boat_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    boat_type VARCHAR(100),                           -- 1X, 2X, 4X, Tinnie, etc (from RevSport)
    boat_category VARCHAR(50) DEFAULT 'race',         -- race, tinnie (inferred from RevSport data)
    classification VARCHAR(10),                       -- R (Race), T (Training), RT
    weight INTEGER,                                   -- weight class in kg (if available)
    is_damaged BOOLEAN DEFAULT false,                 -- scraped from RevSport or boat name
    damaged_reason TEXT,                              -- reason if damaged
    revsport_boat_id VARCHAR(100),                    -- RevSport's internal ID
    metadata JSONB DEFAULT '{}',                      -- additional scraped data
    last_scraped_at TIMESTAMP DEFAULT NOW(),          -- when this boat data was last refreshed
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(club_id, revsport_boat_id)
);

-- Booking cache (scraped from RevSport - read-only)
CREATE TABLE booking_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    boat_id UUID REFERENCES boat_cache(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    session_name VARCHAR(50),                         -- "Morning 1", "Morning 2", "Evening"
    bookings JSONB NOT NULL,                          -- Full booking data from RevSport
    scraped_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(club_id, boat_id, booking_date, session_name)
);

-- Users (admin accounts per club)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'club_admin',            -- super_admin, club_admin
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(club_id, email)
);

-- Scrape jobs (scheduler state and history)
CREATE TABLE scrape_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL,                    -- boat_metadata, booking_calendar
    status VARCHAR(50) NOT NULL,                      -- pending, running, completed, failed
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    next_run_at TIMESTAMP,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Audit log
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_boat_cache_club ON boat_cache(club_id);
CREATE INDEX idx_booking_cache_lookup ON booking_cache(club_id, boat_id, booking_date);
CREATE INDEX idx_scrape_jobs_next ON scrape_jobs(club_id, status, next_run_at);
CREATE INDEX idx_users_club_email ON users(club_id, email);
CREATE INDEX idx_audit_club ON audit_log(club_id, created_at);
```

---

## Technical Backlog by Phase

### Phase A: Cloud MVP

#### [A1] PostgreSQL Database Setup ✅ COMPLETE
**Effort**: M (2-3 weeks) | **Risk**: Low | **Dependencies**: None
**Status**: Deployed to Supabase (2026-01-31)

- ✅ Provision Supabase PostgreSQL (Free tier, Sydney region) — $0/month initially
- ✅ Set up Drizzle ORM with TypeScript schema definitions (`packages/db`)
- ✅ Schema pushed to Supabase (clubs, boat_cache, booking_cache, users, scrape_jobs, audit_log)
- ✅ Seed LMRC as first club tenant (ID: 5e7d3e92-7a69-41d0-81b9-2dfc2ddca616)
- Migrate LMRC boat metadata and display config from JSON to DB (deferred to A8)

**Key decisions**:
- **Supabase over Render PostgreSQL** — Sydney region available now (Render Sydney TBD), data residency in Australia, free tier for early development, standard PostgreSQL (portable to Render/Neon/AWS later)
- Drizzle over Prisma (lighter-weight, SQL-first, aligns with existing POC)
- JSONB columns for flexible config (branding, display_config, metadata) to avoid schema rigidity
- **No Supabase-specific features** — using only PostgreSQL connection, not Auth/Realtime/Storage (maintains portability)

---

#### [A2] Multi-Tenant Subdomain Routing ✅ COMPLETE
**Effort**: S (1 week) | **Risk**: Low | **Dependencies**: A1
**Status**: Implemented (2026-01-31)

- ✅ Express middleware to extract subdomain from `Host` header (`packages/tenant`)
- ✅ Look up `club_id` from `clubs.subdomain` column
- ✅ Attach `req.club` context to every request
- ✅ Support for localhost development (lmrc.localhost:3000)
- ✅ Support for custom domains (Phase C ready)
- ✅ Fallback: unknown subdomain → marketing/signup page (configurable)
- Wildcard DNS: `*.rowandlift.au` → Render web service (configure on deployment)

```typescript
// Usage
import { createTenantMiddleware, requireClub } from '@lmrc/tenant';
import { createDb } from '@lmrc/db';

const db = createDb(process.env.DATABASE_URL);
app.use(createTenantMiddleware(db, {
  baseDomain: 'rowandlift.au',
  marketingUrl: 'https://rowandlift.au',
}));

app.get('/api/v1/boats', requireClub, (req, res) => {
  // req.club is available here
});
```

---

#### [A3] Encrypted Credential Storage ✅ COMPLETE
**Effort**: S (1 week) | **Risk**: Medium | **Dependencies**: A1
**Status**: Implemented (2026-01-31)

- ✅ AES-256-GCM encryption for RevSport credentials (`packages/crypto`)
- ✅ Encryption key from `ENCRYPTION_KEY` env var (32 bytes / 64 hex chars)
- ✅ `encryptCredentials()` / `decryptCredentials()` functions
- ✅ `rotateCredentials()` for key rotation
- ✅ Versioned payload format (v1) for future upgrades
- ✅ 20 unit tests covering encryption, tampering, rotation

```typescript
// Usage
import { encryptCredentials, decryptCredentials, generateKey } from '@lmrc/crypto';

// Generate key once, store in ENCRYPTION_KEY env var
const key = generateKey(); // 64 hex chars

// Encrypt before storing in DB
const encrypted = encryptCredentials({ username: 'admin', password: 'secret' }, key);

// Decrypt when needed (scraper)
const creds = decryptCredentials(encrypted, process.env.ENCRYPTION_KEY);
```

---

#### [A4] Evolve Scraper for Multi-Tenancy (RevSport Adapter) ✅ COMPLETE
**Effort**: M (2-3 weeks) | **Risk**: Medium | **Dependencies**: A1, A3
**Status**: Implemented (2026-01-31)

- ✅ Implemented `DataSourceAdapter` interface (`packages/scraper/src/adapter.ts`)
- ✅ `RevSportAdapter` class conforming to interface with full read operations
- ✅ `RevSportClient` using axios + cheerio (lightweight HTTP scraping with cookie-based auth)
- ✅ `ScraperStorage` for persisting boats and bookings to database
- ✅ `ScrapeScheduler` with `node-cron` for per-club adaptive refresh:
  - 05:00-09:00: every 2 min (peak morning rowing)
  - 09:00-17:00: every 5 min
  - 17:00-21:00: every 2 min (evening rowing)
  - 21:00-05:00: every 10 min
- ✅ 18 unit tests for HTML/JSON parsing

**Implementation notes**:
- Used axios + cheerio instead of Puppeteer (much lighter weight, <50MB vs ~300-500MB)
- RevSport returns JSON for bookings API, only HTML parsing needed for boat list
- Cookie-based session management via `axios-cookiejar-support`
- Serialised scraping (one club at a time) for memory efficiency

**Adapter interface compliance**: The RevSport adapter implements read operations (`getBoats`, `getBookings`, `sync`) but not write operations (`supportsBookingEntry: false`). The API layer calls adapter methods, not scraper functions directly.

---

#### [A5] API Layer (Public + Admin) ✅ COMPLETE
**Effort**: M (2 weeks) | **Risk**: Low | **Dependencies**: A1, A2, A4
**Status**: Implemented (2026-01-31)

- ✅ `@lmrc/api` package with Express router factory
- ✅ Public routes: GET /boats, /boats/:id, /bookings, /config, /health
- ✅ Admin routes: POST /login, GET /status, PUT /credentials, PUT /display, POST /sync
- ✅ JWT authentication with tenant isolation (cross-tenant access blocked)
- ✅ Pino structured logging with request correlation IDs
- ✅ Tenant-scoped rate limiting (express-rate-limit)
- ✅ Zod request validation schemas
- ✅ Consistent error responses with standardised error codes
- ✅ 52 unit tests passing

**Implementation notes**:
- Router factory pattern: `createApiRouter(db, config)` mounts all routes
- Auth middleware verifies JWT and enforces `clubId` matches request tenant
- Rate limits configurable per-tenant (public vs admin endpoints)
- Health endpoint accessible without rate limiting for uptime monitoring
- Sync endpoint designed for BullMQ integration (returns job ID, queue-ready)

---

#### [A6] Responsive Layouts (TV / Desktop / Mobile) ✅ COMPLETE
**Effort**: M (2-3 weeks) | **Risk**: Low | **Dependencies**: None (can parallel with A1-A5)
**Status**: Deployed to Pi (2026-01-31)

Three layout modes for the booking board, served from the same URL:

- **TV mode** (existing): Multi-column widescreen layout, auto-refresh, no scroll. Detected by `?mode=tv` query param or screen width >1920px.
- **Desktop mode** (new): Single-column layout suited to standard monitors. Days stacked vertically. *(committee feedback, Jan 2026)*
- **Mobile mode** (new): Narrow single-column, touch-friendly, collapsible day sections. *(committee feedback, Jan 2026)*

Implementation: CSS media queries + optional `?mode=` override. No separate codebases.

---

#### [A7] Render Deployment & Environment Separation ✅ COMPLETE
**Effort**: M (2 weeks) | **Risk**: Low | **Dependencies**: A1-A5
**Status**: Implemented (2026-02-01)

- ✅ `apps/saas-server` Express application wiring all @lmrc/* packages
- ✅ Web service entry point with helmet, cors, compression, subdomain routing
- ✅ Background worker entry point with ScrapeScheduler
- ✅ `render.yaml` infrastructure-as-code for Render deployment
- ✅ OpenAPI/Swagger documentation at /api-docs
- ✅ Environment variable configuration (.env.example)

Three environments, appropriate for the scale of this project:

| Environment | Purpose | Infrastructure | Deploy Trigger |
|-------------|---------|---------------|---------------|
| **Development** | Local coding, unit tests, fast iteration | Local machine (Node.js, SQLite or local PostgreSQL) | Manual (`npm run dev`) |
| **Staging** | Integration testing, pre-production validation, stakeholder demos | Render: separate services + separate DB (free/starter plans) | Auto-deploy on push to `staging` branch |
| **Production** | Live clubs, real data | Render: production services + production DB | Auto-deploy on push to `main` branch |

**Why three environments**:
- **Development**: Essential for day-to-day work. Runs locally, fast feedback loop. Can use SQLite for development or a local PostgreSQL instance to match production.
- **Staging**: Catches deployment-specific issues that local cannot replicate — Render environment variables, Puppeteer in cloud containers, database migrations against a real PostgreSQL instance, subdomain routing. Also serves as a demo environment for showing potential clubs. Staging uses a separate database with test/seed data, never real club credentials.
- **Production**: Real clubs, real RevSport credentials, real member data. Protected by strict deployment process.

**Deployment rules**:
- Feature branches → pull request → merge to `staging` → auto-deploy to staging
- After validation on staging → merge `staging` to `main` → auto-deploy to production
- Database migrations run automatically on deploy (Drizzle migrate)
- Rollback: Render supports instant rollback to previous deploy
- Environment variables are **separate per environment** (different `ENCRYPTION_KEY`, `JWT_SECRET`, `DATABASE_URL`)

**Render configuration** (compute only - database is Supabase):

```yaml
# render.yaml (production - similar structure for staging with different names/plans)
services:
  - type: web
    name: rowing-boards-web
    env: node
    plan: free  # upgrade to starter ($7/mo) when needed
    branch: main  # staging uses 'staging' branch
    buildCommand: pnpm install && pnpm build
    startCommand: pnpm start
    envVars:
      - key: DATABASE_URL
        sync: false  # Set manually from Supabase connection string
      - key: NODE_ENV
        value: production
      - key: ENCRYPTION_KEY
        generateValue: true
      - key: JWT_SECRET
        generateValue: true

  - type: worker
    name: rowing-boards-scraper
    env: node
    plan: starter  # needs memory for Puppeteer
    branch: main
    buildCommand: pnpm install
    startCommand: pnpm run worker
    envVars:
      - key: DATABASE_URL
        sync: false  # Set manually from Supabase connection string
      - key: ENCRYPTION_KEY
        fromService:
          name: rowing-boards-web
          envVarKey: ENCRYPTION_KEY

# Database hosted on Supabase (Sydney region) - not Render
# Free tier: 500MB, auto-pause after 1 week inactive (but scraper keeps it active)
# Upgrade to Pro ($25/mo) when: >500MB, need staging env, or SLA required
```

**Phase A cost**: $0/month (Supabase Free + Render Free web). Upgrade scraper to Render Starter ($7/mo) when needed for Puppeteer memory.

**Why Supabase for database**:
- Sydney region available now (Render Sydney TBD)
- Australian data residency for club data
- Free tier sufficient for early development
- Standard PostgreSQL - portable to Render/AWS/Neon later with just a connection string change

- Auto-deploy from GitHub (staging branch → staging, main branch → production)
- Web service serves frontend + API
- Worker process runs Puppeteer scraping (separate process, own memory allocation)
- UptimeRobot pings `/api/v1/health` every 5 min (prevents free-tier spin-down on web service)

---

#### [A8] LMRC Migration
**Effort**: M (2-3 weeks) | **Risk**: Medium | **Dependencies**: A1-A7

**Migration Tasks**:
- Seed LMRC as first club in database (subdomain: `lmrc`)
- Migrate boat metadata from JSON to `boats` table
- Migrate display config from `tv-display.json` to database (see config architecture below)
- Encrypt and store RevSport credentials
- Run cloud and Pi deployments in parallel during validation
- Cutover: Point Pi's Chromium kiosk at `board.lakemacrowing.au?mode=tv`
- Keep Pi's local server as fallback (if cloud goes down, revert kiosk URL)

**Configuration Architecture** (three distinct layers):

| Layer | Controlled By | Affects | Storage | Examples |
|-------|--------------|---------|---------|----------|
| **Club branding** | Club admin | All viewers (TV + web + mobile) | Database: `clubs.display_config` | Logo, colours, club name |
| **TV display settings** | Club admin | Boatshed TV only | Database: `clubs.tv_display_config` | Row heights, font sizes, days to display (optimized for 55" at 2m) |
| **User preferences** | Individual user | Their device only | localStorage | Font size (accessibility) |

**Key Principles**:
- User preferences (localStorage) **never** affect the TV display at the boatshed
- Club branding applies everywhere — users cannot override logo/colours
- TV display settings are separate from user-facing web/mobile settings

**Display Mode Behavior** (explicit TV mode):

| URL | Mode | Behavior |
|-----|------|----------|
| `board.lakemacrowing.au/` | Interactive (default) | Click to book, font controls, scrolling, tooltips |
| `board.lakemacrowing.au/?mode=tv` | TV Display | Read-only, no interactivity, loads TV-specific config |

- **Default is interactive**: All users browsing without `?mode=tv` get the full interactive experience
- **TV mode is opt-in**: Only the boatshed Pi (configured by admin) uses `?mode=tv`
- **No auto-detection**: Large monitors do NOT automatically trigger TV mode
- **Principle**: "Default to interactive, opt-in to passive display"

**Config API Endpoints**:
- `GET /api/v1/config/display` — Returns merged config for current context (detects TV mode)
- `GET /api/v1/config/branding` — Returns club branding (public, cached)
- `POST /api/v1/admin/config` — Admin updates club config (auth required, Phase B)

**Config Page (Phase A interim)**:
- Port existing Pi config page to SaaS server at `/config` (protected URL)
- Saves to database instead of JSON files
- Replaced by admin dashboard in Phase B

**Phase A onboarding**: Manual. Platform operator adds clubs directly in the database and assists with initial configuration. Acceptable for 1-3 clubs during alpha.

---

#### [A9] Interactive Booking Board for PC and Mobile
**Effort**: M (2-3 weeks) | **Risk**: Low | **Dependencies**: A5, A8
**Status**: Not started

When not in TV mode (e.g., accessed via PC or mobile browser), the booking board becomes interactive:

**Core Features**:
- **Click empty cell to book**: Clicking an empty session cell opens the RevSport booking process for that boat, date, and session. Disabled for already-booked sessions.
- **Click boat name for boat page**: Clicking the boat name navigates to the boat's booking calendar page on RevSport.
- **Font size controls**: Allow users to increase/decrease font size for better readability on different devices and for accessibility.
- **Smooth scrolling**: When the boat list exceeds the window height, ensure smooth vertical scrolling with clear visual indicators.
- **Manual refresh**: Refresh button in footer (desktop/landscape) and as FAB (mobile portrait) with 30-second cooldown to prevent excessive API polling. Resets auto-refresh timer after manual refresh.

**Implementation Notes**:
- Detect `?mode=tv` to disable interactivity (TV displays are read-only, no keyboard/mouse)
- Use boat metadata (`bookingUrl`, `calendarUrl`) from API for navigation links
- Persist font size preference in localStorage
- Consider touch-friendly tap targets for mobile (44px minimum)
- Session booking links use RevSport's direct booking URL format

**Out of Scope**:
- Actual booking creation (handled by RevSport)
- Authentication for booking (handled by RevSport login flow)

---

### Phase B: Self-Service & Admin Dashboard

#### [B1] Club Onboarding Wizard
**Effort**: L (4-6 weeks) | **Risk**: Medium | **Dependencies**: B2, A4, A5

Self-service signup and setup flow so new clubs can onboard **without platform operator involvement**:

1. **Signup**: Club admin creates account (email, password, club name, subdomain)
2. **Connect RevSport**: Enter RevSport URL and credentials → platform validates by running a test scrape. Clear error feedback if credentials fail or URL is unreachable.
3. **Auto-discover fleet**: Scrape RevSport to discover the club's boats automatically. Boat type, category, and damaged status are inferred from RevSport data — no manual categorisation needed.
4. **Configure display**: Branding (logo, colours), display preferences, refresh intervals. Live preview with real scraped data before going live.
5. **Go live**: First full scrape runs, board becomes accessible at `clubname.rowandlift.au`. Admin shares URL with members.

**Key requirements**:
- Zero manual steps from platform operator (no DB edits, no config files)
- Validation at each step with clear, non-technical error messages
- Target: <10 minutes from signup to live board with real data
- Guided flow for non-technical club administrators (no documentation required)
- Fleet is auto-discovered from RevSport — no manual boat entry

---

#### [B2] Admin Dashboard (React)
**Effort**: M (3-4 weeks) | **Risk**: Medium | **Dependencies**: Phase A

Web-based admin interface for club administrators (hosts the onboarding wizard and ongoing configuration).

**Note**: This is a **configuration dashboard**, not a fleet management system. Boats are auto-discovered from RevSport — there is no boat CRUD UI.

- **Branding editor**: Logo upload, colour picker, preview board with changes
- **Refresh schedule**: Visual time-block editor for scraping frequency
- **Status page**: Scrape health, last successful sync, error log, boat list (read-only view of discovered fleet)
- **Club settings**: Update RevSport credentials, subdomain, timezone
- **Trigger sync**: Manual button to refresh boat/booking data from RevSport

Tech stack: React + TypeScript + Tailwind CSS, served from the same Express app.

---

#### [B3] Admin Authentication
**Effort**: M (2-3 weeks) | **Risk**: Low | **Dependencies**: A1

- Email + password auth for club admins
- JWT session tokens (7-day expiry, refresh flow)
- `super_admin` role for platform operator (you)
- `club_admin` role scoped to their club only
- Password reset flow (email-based)
- Session management (logout, revoke all sessions)

---

#### [B4] Stripe Subscription Integration
**Effort**: M (2-3 weeks) | **Risk**: Medium | **Dependencies**: B2

- Stripe Checkout for new subscriptions
- Stripe Customer Portal for billing management
- Webhook handler for subscription lifecycle events (created, renewed, cancelled, failed)
- Club `status` field updated based on subscription state
- Grace period on failed payment (7 days before suspension)
- Free trial period (14 or 30 days, TBD)

---

#### [B5] RevSport Email Booking Links
**Effort**: S (1 week) | **Risk**: Low | **Dependencies**: None

- Document how clubs can add booking board URL to their RevSport email templates
- Provide recommended email footer HTML snippet with link to their board
- Include "Manage your booking" deep link pointing to RevSport's booking management page
- *(committee feedback, Jan 2026)*

---

### Phase C: Advanced Features & Growth

#### [C1] Digital Noticeboard Module
**Effort**: L (4-6 weeks) | **Risk**: Medium | **Dependencies**: Phase A

- Port existing LMRC noticeboard (Node/React/Puppeteer) to multi-tenant cloud
- Noticeboard as optional add-on feature (Pro tier and above)
- Content management: photo galleries, events, sponsors
- Scrapes club's RevSport events/news page
- Separate display URL: `clubname.rowandlift.au/noticeboard`

---

#### [C2] Custom Domain Support
**Effort**: M (2-3 weeks) | **Risk**: Medium | **Dependencies**: A2

- Clubs on Enterprise tier can use `bookings.theirclub.com`
- Store custom domain in `clubs.custom_domain` column
- Tenant middleware checks both subdomain and custom domain
- Render supports custom domains with automatic SSL via Let's Encrypt
- Club adds CNAME record pointing to Render

---

#### [C3] BullMQ + Redis Job Queue
**Effort**: M (2-3 weeks) | **Risk**: Low | **Dependencies**: A4

- Upgrade from `node-cron` to BullMQ for production job scheduling
- Render Redis instance ($7/month)
- Benefits: retry logic, job prioritisation, concurrency control, monitoring dashboard
- Enables parallel scraping (multiple Puppeteer instances) when worker has enough memory
- Trigger point: >10 clubs, `node-cron` becoming a bottleneck

---

#### [C4] Magic Link Member Auth
**Effort**: M (2 weeks) | **Risk**: Low | **Dependencies**: B2

- For clubs wanting gated member access to their board
- Member enters email → receives magic link (JWT, 15-min expiry) → authenticated session (7-day cookie)
- Optional per-club: some clubs keep board public, others gate it
- Club admin manages member email list or allows any email with club's domain

---

#### [C5] Adaptive Refresh Schedules (Per-Club)
**Effort**: S (1 week) | **Risk**: Low | **Dependencies**: A4

- Admin dashboard visual schedule builder
- Per-club timezone-aware refresh rates
- Store in `refresh_schedules` table (already in schema)
- Default schedules provided, clubs can customise

---

### Phase D: Scale & Platform

#### [D1] Remote Management Portal
**Effort**: XL (8-10 weeks) | **Risk**: High | **Dependencies**: Phase B

- Fleet dashboard: all clubs, status, health, last scrape
- Drill into per-club details, logs, config
- Push config changes remotely
- Support tools: impersonate club admin, view their dashboard
- Alert on scrape failures, club offline, subscription expiring

---

#### [D2] Pi Device Management
**Effort**: L (4-6 weeks) | **Risk**: Medium | **Dependencies**: D1

- Device agent on Pi: heartbeat, status reporting, remote commands
- Push software updates to Pi devices
- Staged rollouts (10% → 50% → 100%)
- Rollback on failure
- Remote reboot, log collection

---

#### [D3] Monitoring & Alerting
**Effort**: M (3-4 weeks) | **Risk**: Low | **Dependencies**: Phase A

- Sentry for error tracking (free tier for <5k events/month)
- Render metrics for infrastructure (built-in)
- Custom health check dashboard
- Alert channels: email, Slack
- Per-club scrape success rate tracking
- Platform-wide uptime SLA monitoring

---

#### [D4] Plugin/Extension System
**Effort**: L (6-8 weeks) | **Risk**: Medium | **Dependencies**: All previous

- Plugin architecture for integrating with booking systems beyond RevSport
- Each integration is a "scraper plugin" with standard interface:
  ```typescript
  interface BookingSystemPlugin {
      name: string;
      authenticate(credentials: EncryptedCredentials): Promise<Session>;
      scrapeBoats(session: Session): Promise<Boat[]>;
      scrapeBookings(session: Session, date: Date): Promise<Booking[]>;
      submitBooking?(session: Session, booking: NewBooking): Promise<Result>; // optional
  }
  ```
- First plugin: RevSport (extract from existing code)
- Future plugins: Club Locker, TeamSnap, generic iCal import

---

#### [D5] Analytics & Reporting
**Effort**: M (3-4 weeks) | **Risk**: Low | **Dependencies**: B1

- Board view counts (daily/weekly/monthly per club)
- QR code scan tracking
- Booking submission success rate
- Boat utilisation reports
- Export to CSV
- Admin dashboard analytics tab

---

## Items Superseded from Previous Roadmap (Oct 2025)

The following items from the original Pi-centric architectural roadmap are **no longer needed** or have been **replaced** by SaaS equivalents:

| Original Item | Status | SaaS Replacement |
|---------------|--------|------------------|
| #001 Shared Config Library (`@lmrc/config`) | Superseded | Database-backed config per tenant (A1) |
| #002 Credential Vault (systemd) | Superseded | AES-256 encrypted DB column (A3) |
| #003 Standardize Auth Library | Adapted | Single codebase serves all clubs; auth is part of scraper refactor (A4) |
| #004 Club Profile Abstraction | Superseded | `clubs` table in PostgreSQL (A1) |
| #005 Multi-Club Deployment Scripts | Superseded | Web-based onboarding via admin dashboard (B1) |
| #006 Setup Wizard (captive portal) | Superseded | Web admin dashboard (B1) |
| #007 SD Card Image Builder | Deferred to D2 | Pi is now a thin display client; no complex image needed |
| #008 Configuration Web UI | Adapted | Admin dashboard (B1) |
| #009 Remote Management Portal | Carried forward | D1 |
| #010 Automated Update System | Adapted | D2 (Pi device management) |
| #011 Centralized Monitoring | Adapted | D3 |
| #012 Multi-Tenant Cloud Architecture | Foundation | Phase A (this is now the starting point) |
| #013 Plugin/Extension System | Carried forward | D4 |
| #014 Cloud-Hosted Booking Board | Absorbed | Phase A (cloud deployment is the foundation, not a one-off) |

---

## Dependencies and Critical Path

```
A1 Database Setup ──────┬──────────────────────────────────────┐
         │               │                                      │
         ├── A2 Subdomain Routing                               │
         │                                                      │
         ├── A3 Encrypted Credentials                           │
         │         │                                            │
         ├─────────┴── A4 Multi-Tenant Scraper                 │
         │                    │                                  │
         └── A5 API Layer ────┤                                 │
                              │                                  │
A6 Responsive Layouts ────────┤  (parallel with A1-A5)         │
                              │                                  │
A7 Render Config ─────────────┤                                 │
                              │                                  │
A8 LMRC Migration ────────────┴── Phase A Complete ────────────┘
                                        │
                              ┌─────────┤
                              │         │
                    B2 Admin Dashboard   B3 Admin Auth
                              │         │
                              ├─────────┤
                              │         │
               B1 Onboarding Wizard     │
                              │         │
                    B4 Stripe │    B5 Email Links
                              │
                              └── Phase B Complete
                                        │
                              ┌─────────┼──────────┐
                              │         │          │
                    C1 Noticeboard  C2 Custom Domains  C3 BullMQ
                              │         │          │
                    C4 Magic Link   C5 Adaptive Refresh│
                              │
                              └── Phase C Complete
                                        │
                    D1 Remote Portal ────┤
                    D2 Pi Management ────┤
                    D3 Monitoring ───────┤
                    D4 Plugins ──────────┤
                    D5 Analytics ────────┘
```

### Critical Path
1. **A1** (Database) → blocks almost everything
2. **A4** (Scraper refactor) → longest item in Phase A
3. **B1** (Admin dashboard) → longest item in Phase B, blocks self-service onboarding

---

## Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Runtime | Node.js 20+ | Existing codebase, LTS |
| Language | TypeScript | Existing codebase, type safety |
| Web framework | Express.js | Existing codebase, proven |
| ORM | Drizzle | SQL-first, lightweight, TS-native, aligns with POC work |
| Database | Supabase PostgreSQL (Sydney) | Free tier, Australian data residency, portable to Render/AWS later |
| Scraping | Puppeteer | Existing proven logic, handles CSRF/sessions |
| Job scheduling | node-cron (A-B) → BullMQ (C+) | Start simple, upgrade when needed |
| Frontend (board) | HTML/CSS/JS | Existing, works well, lightweight |
| Frontend (admin) | React + TypeScript + Tailwind | Modern, component-based dashboard |
| Auth | JWT (jsonwebtoken) + bcrypt | Standard, stateless (not Supabase Auth - maintains portability) |
| Encryption | Node.js crypto (AES-256-GCM) | Built-in, no external dependency |
| Compute hosting | Render.com | Auto-deploy, reasonable cost, Singapore region until Sydney available |
| Error tracking | Sentry | Free tier sufficient for early phases |
| Uptime monitoring | UptimeRobot | Free, prevents Render spin-down |
| Payments | Stripe | Industry standard, good developer experience |
| DNS | Cloudflare | Wildcard DNS, DDoS protection, CDN |

---

## Security Architecture

### Credential Encryption
- AES-256-GCM for RevSport credentials at rest
- Encryption key in Render env vars (never in code or DB)
- Key rotation: re-encrypt all credentials with new key, zero-downtime

### Data Isolation
- All queries scoped by `club_id` (enforced at ORM/middleware level)
- Row-level access: club admins see only their club's data
- `super_admin` role for platform operator access

### API Security
- Helmet.js security headers
- CORS whitelist per club subdomain
- Rate limiting (express-rate-limit)
- Input validation (Zod schemas)
- Parameterised queries (Drizzle prevents SQL injection)

### Authentication
- JWT tokens with expiry (admin: 7 days, magic link: 15 min)
- bcrypt password hashing (cost factor 12)
- Session revocation via token blacklist

---

## Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Puppeteer memory in cloud | High | Medium | Serialised scraping, dedicated worker, memory limits |
| RevSport UI changes break scrapers | High | Medium | Monitoring, alerts, version detection, graceful degradation |
| RevSport ToS prohibits scraping | Critical | Low | Review ToS, seek API partnership, have migration plan |
| Database costs at scale | Medium | Low | Efficient queries, caching, archive old booking data |
| Render platform reliability | Medium | Low | Health monitoring, documented fallback to alternative hosts |
| Solo developer bottleneck | High | High | Prioritise ruthlessly, ship MVP, iterate |

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-30 | Initial creation - Pi-centric architectural roadmap |
| 1.1 | 2026-01-27 | Added #014: Cloud-hosted booking board (Render free tier) |
| 2.0 | 2026-01-28 | Major revision: Cloud-first SaaS architecture pivot. Replaced Pi-centric phases with SaaS phases (A-D). Added database schema, Render deployment config, technology stack, security architecture. Superseded items #001-#008 with cloud equivalents. Incorporated Claude.ai SaaS analysis and committee feedback. |
| 2.1 | 2026-01-28 | Enforced display-only principle: removed QR code booking (C1) and QR code generation (B4) from backlog. Booking entry is out of scope for the SaaS platform; clubs use their existing tools. Renumbered Phase B and C items. |
| 2.2 | 2026-01-28 | Added [B1] Club Onboarding Wizard for self-service club signup. Added environment separation strategy (dev/staging/production) to [A7]. Renumbered Phase B items (B1-B6). |
| 2.3 | 2026-01-28 | Removed [B5] Tinnies Support from SaaS backlog — being built on Pi codebase pre-SaaS, will already exist when SaaS work begins. Renumbered to B1-B5. |
| 2.4 | 2026-01-30 | Clarified scope: RevSport is source of truth for fleet. Renamed `boats` table to `boat_cache` (read-only, auto-discovered). Removed boat CRUD from admin dashboard — configuration only. Updated APIs to serve both Booking Board and Booking Page. Added "RevolutioniseSport as Source of Truth" section. |
| 2.5 | 2026-01-30 | Added Data Source Adapter architecture for future extensibility. RevSport is first adapter; built-in fleet management (Premium tier) and other adapters planned for future phases. Updated clubs table with `data_source_type` and `data_source_config`. Updated A4 to reference adapter interface. |
| 2.6 | 2026-01-31 | Marked [A6] Responsive Layouts as complete — CSS media queries for TV/desktop/mobile modes deployed to Pi with `?mode=tv` parameter. |
| 2.7 | 2026-01-31 | Switched database provider from Render PostgreSQL to Supabase (Free tier, Sydney region). Updated architecture diagram, A1/A7 sections, and technology stack. Rationale: Sydney region for Australian data residency, free tier for early development, standard PostgreSQL remains portable. |
| 2.8 | 2026-01-31 | Marked [A1] PostgreSQL Database Setup as complete — Supabase provisioned, schema pushed, LMRC seeded. Marked [A2] Multi-Tenant Subdomain Routing as complete — `@lmrc/tenant` package with middleware, tests, localhost dev support. |
| 2.9 | 2026-01-31 | Marked [A3] Encrypted Credential Storage as complete — `@lmrc/crypto` package with AES-256-GCM encryption, key rotation, 20 unit tests. |
| 2.10 | 2026-01-31 | Marked [A4] Multi-Tenant Scraper as complete — `@lmrc/scraper` package with DataSourceAdapter interface, RevSportAdapter (axios + cheerio), ScraperStorage, ScrapeScheduler with adaptive refresh, 18 unit tests. |
| 2.11 | 2026-02-01 | Marked [A5] API Layer as complete — `@lmrc/api` package with public/admin routes, JWT auth, Pino logging, rate limiting, Zod validation, 52 unit tests. |
| 2.12 | 2026-02-01 | Marked [A7] Render Deployment as complete — `apps/saas-server` wiring all packages, `render.yaml` infrastructure config, Swagger docs. |
| 2.13 | 2026-02-01 | Added UAT findings: bcryptjs ESM fix, optional tenant resolution for health endpoint, sourceId field for external system linking, admin scripts (create-admin-user.ts, set-custom-domain.ts), custom domain setup (board.lakemacrowing.au). |

---

## Implementation Notes (UAT Findings)

The following issues were discovered and resolved during UAT testing of the SaaS API:

### bcryptjs ESM Compatibility
**Issue**: Dynamic imports of bcryptjs (`await import('bcryptjs')`) failed in ESM context.
**Fix**: Changed to static import (`import bcrypt from 'bcryptjs'`) in `packages/api/src/middleware/auth.ts`.

### Health Endpoint Tenant Resolution
**Issue**: Health endpoint returned 500 "Club context not available" because tenant middleware was required.
**Fix**: Added `optionalPaths` to tenant middleware config. Health endpoint attempts tenant resolution but continues without club context if unavailable. This allows platform-wide health checks while still showing club-specific data when accessed via subdomain.

### External System ID Linking (sourceId)
**Issue**: API used internal UUIDs for boats, but external consumers (e.g., Netlify booking page) use RevSport integer IDs.
**Solution**: Added `sourceId` field to boat and booking responses. `GET /boats/:id` accepts either UUID or sourceId for lookup.

### Login Route Path
**Issue**: Login endpoint was returning 401 "Missing authorization header" because route was mounted at `/admin/login/login` (double path).
**Fix**: Changed internal route path from `/login` to `/` in `packages/api/src/routes/admin/auth.ts`.

### Admin Management Scripts
Created utility scripts for admin operations:
- `scripts/create-admin-user.ts` — Interactive script to create admin users for clubs
- `scripts/set-custom-domain.ts` — Script to configure custom domains for clubs

### Custom Domain Setup
Configured LMRC custom domain `board.lakemacrowing.au`:
1. Updated `clubs.customDomain` in database via script
2. DNS CNAME configured at domain registrar (Crazy Domains)
3. Render custom domain added with automatic SSL provisioning

The tenant middleware already supported custom domain lookup (checks `customDomain` column when hostname doesn't match subdomain pattern).

### URL Structure for Custom Domains
Agreed URL structure for booking board:
- `board.lakemacrowing.au/` — Booking board display (TV view)
- `board.lakemacrowing.au/book/:id` — Deep link to book specific boat (uses sourceId)

---

**END OF DOCUMENT**
