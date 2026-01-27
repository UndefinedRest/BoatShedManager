# Architectural Roadmap: Rowing Boards SaaS Platform

## Strategic Technical Planning

**Document Type**: Architectural Roadmap & Technical Backlog
**Target Audience**: Product Management & Engineering
**Last Updated**: 2026-01-28
**Status**: SaaS pivot - replaces Pi-centric roadmap (v1.0, Oct 2025)

---

## Executive Summary

This document outlines the technical work required to evolve the LMRC Booking Board from a single-club Raspberry Pi deployment into a multi-tenant cloud SaaS product. The architecture is **cloud-first**: the platform runs on Render.com with PostgreSQL, and in-shed displays are thin clients (Pi or any browser device) pointing at the cloud.

**Current State**: Production single-club deployment at LMRC (Raspberry Pi, Express/TypeScript, JSON files, Puppeteer scraping)
**Target State**: Multi-tenant SaaS platform serving 100+ rowing clubs via `clubname.rowingboards.io`
**Approach**: Evolve the existing codebase incrementally (not a rewrite)

### Fundamental Principle: Display Only

The SaaS platform is a **read-only booking board**. It scrapes and displays booking data. It does not create, edit, or delete bookings. Booking entry remains the responsibility of each club's existing tools (RevSport, the separate LMRC boat booking page on Netlify, etc.).

This principle applies across all phases A-B. Booking entry integration is deferred to Phase D at earliest, and only if customer demand warrants it. This keeps the platform simple, reduces risk (no write-back to RevSport), and gets to market faster.

The platform still requires administration and configuration — clubs need to set their RevSport credentials/URL and configure the look and feel of their board. This admin functionality is in scope from Phase A.

### Phase Summary

| Phase | Theme | Key Technical Work | Target Clubs |
|-------|-------|-------------------|-------------|
| **A** (Cloud MVP) | Display + admin in the cloud | PostgreSQL, multi-tenancy, subdomain routing, responsive layouts, basic admin | 1-3 |
| **B** (Self-Service) | Let clubs onboard themselves | Full admin dashboard, Stripe, auth, boat management | 5-10 |
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
                    ┌──────────────────────────────────────────────┐
                    │          Render.com Platform                  │
                    │                                              │
                    │  ┌──────────────────────────────────────┐   │
                    │  │  Web Service (Express/TypeScript)     │   │
                    │  │  ──────────────────────────────────   │   │
                    │  │  • Subdomain routing middleware       │   │
                    │  │  • Public board API (per club)        │   │
                    │  │  • Admin dashboard API                │   │
                    │  │  • Auth (JWT for admin sessions)      │   │
                    │  │  • Static frontend serving            │   │
                    │  └──────────────┬───────────────────────┘   │
                    │                 │                             │
                    │  ┌──────────────▼───────────────────────┐   │
                    │  │  Background Worker (separate process) │   │
                    │  │  ──────────────────────────────────   │   │
                    │  │  • Per-club Puppeteer scraping        │   │
                    │  │  • Adaptive refresh scheduler         │   │
                    │  │  • node-cron (Phase A-B)              │   │
                    │  │  • BullMQ + Redis (Phase C+)          │   │
                    │  └──────────────┬───────────────────────┘   │
                    │                 │                             │
                    │  ┌──────────────▼───────────────────────┐   │
                    │  │  PostgreSQL Database                   │   │
                    │  │  ──────────────────────────────────   │   │
                    │  │  • clubs (config, branding, creds)    │   │
                    │  │  • boats (fleet per club)             │   │
                    │  │  • booking_cache (scraped data)       │   │
                    │  │  • users (admin accounts)             │   │
                    │  │  • scrape_jobs (scheduler state)      │   │
                    │  │  • audit_log                          │   │
                    │  └──────────────────────────────────────┘   │
                    └──────────────────────────────────────────────┘
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
    revsport_url VARCHAR(500) NOT NULL,               -- e.g. "https://lakemacquarierowingclub.org.au"
    revsport_credentials_encrypted TEXT NOT NULL,      -- AES-256 encrypted JSON {username, password}
    timezone VARCHAR(100) DEFAULT 'Australia/Sydney',
    branding JSONB DEFAULT '{}',                      -- {logoUrl, primaryColor, secondaryColor, customCSS}
    display_config JSONB DEFAULT '{}',                -- Migrated from tv-display.json schema
    status VARCHAR(50) DEFAULT 'trial',               -- trial, active, suspended, cancelled
    subscription_tier VARCHAR(50) DEFAULT 'basic',    -- basic, pro, enterprise
    subscription_expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Boats (multi-tenant fleet)
CREATE TABLE boats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    boat_type VARCHAR(100),                           -- single, double, quad, eight, tinny
    boat_category VARCHAR(50) DEFAULT 'race',         -- race, tinny (for display grouping)
    revsport_boat_id VARCHAR(100),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(club_id, revsport_boat_id)
);

-- Booking cache (scraped data, per club per boat per date)
CREATE TABLE booking_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID REFERENCES clubs(id) ON DELETE CASCADE,
    boat_id UUID REFERENCES boats(id) ON DELETE CASCADE,
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
CREATE INDEX idx_boats_club ON boats(club_id);
CREATE INDEX idx_booking_cache_lookup ON booking_cache(club_id, boat_id, booking_date);
CREATE INDEX idx_scrape_jobs_next ON scrape_jobs(club_id, status, next_run_at);
CREATE INDEX idx_users_club_email ON users(club_id, email);
CREATE INDEX idx_audit_club ON audit_log(club_id, created_at);
```

---

## Technical Backlog by Phase

### Phase A: Cloud MVP

#### [A1] PostgreSQL Database Setup
**Effort**: M (2-3 weeks) | **Risk**: Low | **Dependencies**: None

- Provision Render PostgreSQL (starter plan, $7/month)
- Set up Drizzle ORM with TypeScript schema definitions
- Create migration scripts for all tables above
- Seed LMRC as first club tenant
- Migrate LMRC boat metadata and display config from JSON to DB

**Key decisions**:
- Drizzle over Prisma (lighter-weight, SQL-first, aligns with existing POC)
- JSONB columns for flexible config (branding, display_config, metadata) to avoid schema rigidity

---

#### [A2] Multi-Tenant Subdomain Routing
**Effort**: S (1 week) | **Risk**: Low | **Dependencies**: A1

- Express middleware to extract subdomain from `Host` header
- Look up `club_id` from `clubs.subdomain` column
- Attach `req.club` context to every request
- All API routes become tenant-scoped automatically
- Wildcard DNS: `*.rowingboards.io` → Render web service
- Fallback: unknown subdomain → marketing/signup page

```typescript
// Middleware concept
async function tenantMiddleware(req, res, next) {
    const subdomain = extractSubdomain(req.hostname); // "lmrc" from "lmrc.rowingboards.io"
    if (!subdomain) return res.redirect('https://rowingboards.io'); // marketing site
    const club = await db.query.clubs.findFirst({ where: eq(clubs.subdomain, subdomain) });
    if (!club) return res.status(404).render('club-not-found');
    req.club = club;
    next();
}
```

---

#### [A3] Encrypted Credential Storage
**Effort**: S (1 week) | **Risk**: Medium | **Dependencies**: A1

- AES-256-GCM encryption for RevSport credentials stored in `clubs.revsport_credentials_encrypted`
- Encryption key from `ENCRYPTION_KEY` env var (Render-generated, 32 bytes)
- Encrypt on save (admin dashboard), decrypt on use (scraper)
- Never log decrypted credentials
- Key rotation plan documented (re-encrypt all rows with new key)

```typescript
// Encryption service
function encryptCredentials(creds: { username: string; password: string }): string;
function decryptCredentials(encrypted: string): { username: string; password: string };
```

---

#### [A4] Evolve Scraper for Multi-Tenancy
**Effort**: M (2-3 weeks) | **Risk**: Medium | **Dependencies**: A1, A3

- Refactor existing Puppeteer scraping to accept `club` context (URL, credentials, timezone)
- Store scraped booking data in `booking_cache` table instead of in-memory cache
- `node-cron` scheduler iterates over active clubs and triggers scrapes
- One Puppeteer instance at a time (serialised to manage memory)
- Adaptive refresh: configurable per club, default schedule:
  - 05:00-09:00: every 2 min (peak morning rowing)
  - 09:00-17:00: every 5 min
  - 17:00-21:00: every 2 min (evening rowing)
  - 21:00-05:00: every 10 min

**Memory management**: Puppeteer is the biggest resource concern. With serialised scraping (one club at a time), memory stays bounded at ~300-500MB for the worker process. Parallelise only when infrastructure supports it (Phase C with dedicated workers).

---

#### [A5] API Layer for Board Data
**Effort**: M (2 weeks) | **Risk**: Low | **Dependencies**: A1, A2, A4

Refactor existing Express routes to serve from PostgreSQL instead of in-memory cache:

```
GET  /api/v1/bookings          → booking_cache for req.club
GET  /api/v1/boats             → boats for req.club
GET  /api/v1/config            → display_config from clubs table
GET  /api/v1/health            → platform health + per-club scrape status
```

All endpoints automatically scoped to the club identified by subdomain middleware (A2).

---

#### [A6] Responsive Layouts (TV / Desktop / Mobile)
**Effort**: M (2-3 weeks) | **Risk**: Low | **Dependencies**: None (can parallel with A1-A5)

Three layout modes for the booking board, served from the same URL:

- **TV mode** (existing): Multi-column widescreen layout, auto-refresh, no scroll. Detected by `?mode=tv` query param or screen width >1920px.
- **Desktop mode** (new): Single-column layout suited to standard monitors. Days stacked vertically. *(committee feedback, Jan 2026)*
- **Mobile mode** (new): Narrow single-column, touch-friendly, collapsible day sections. *(committee feedback, Jan 2026)*

Implementation: CSS media queries + optional `?mode=` override. No separate codebases.

---

#### [A7] Render Deployment Configuration
**Effort**: S (1 week) | **Risk**: Low | **Dependencies**: A1-A5

```yaml
# render.yaml
services:
  - type: web
    name: rowing-boards-web
    env: node
    plan: free  # upgrade to starter ($7/mo) when needed
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: rowing-boards-db
          property: connectionString
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
    buildCommand: npm install
    startCommand: npm run worker
    envVars:
      - key: DATABASE_URL
        fromDatabase:
          name: rowing-boards-db
          property: connectionString
      - key: ENCRYPTION_KEY
        fromService:
          name: rowing-boards-web
          envVarKey: ENCRYPTION_KEY

databases:
  - name: rowing-boards-db
    plan: starter  # $7/month, 1GB storage
```

- Auto-deploy from GitHub on push to `main`
- Web service serves frontend + API
- Worker process runs Puppeteer scraping (separate process, own memory allocation)
- UptimeRobot pings `/api/v1/health` every 5 min (prevents free-tier spin-down on web service)

---

#### [A8] LMRC Migration
**Effort**: S (1 week) | **Risk**: Medium | **Dependencies**: A1-A7

- Seed LMRC as first club in database (subdomain: `lmrc`)
- Migrate boat metadata from JSON to `boats` table
- Migrate display config from `tv-display.json` to `clubs.display_config`
- Encrypt and store RevSport credentials
- Run cloud and Pi deployments in parallel during validation
- Cutover: Point Pi's Chromium kiosk at `lmrc.rowingboards.io` instead of `localhost:3000`
- Keep Pi's local server as fallback (if cloud goes down, revert kiosk URL)

---

### Phase B: Self-Service & Admin Dashboard

#### [B1] Admin Dashboard (React)
**Effort**: L (4-6 weeks) | **Risk**: Medium | **Dependencies**: Phase A

Web-based admin interface for club administrators:

- **Club setup wizard**: Enter RevSport URL, credentials, club name, branding
- **Boat management**: Add/edit/remove boats, map to RevSport IDs, set display order, categorise (race/tinny)
- **Branding editor**: Logo upload, colour picker, preview board with changes
- **Refresh schedule**: Visual time-block editor for scraping frequency
- **Status page**: Scrape health, last successful sync, error log

Tech stack: React + TypeScript + Tailwind CSS, served from the same Express app.

---

#### [B2] Admin Authentication
**Effort**: M (2-3 weeks) | **Risk**: Low | **Dependencies**: A1

- Email + password auth for club admins
- JWT session tokens (7-day expiry, refresh flow)
- `super_admin` role for platform operator (you)
- `club_admin` role scoped to their club only
- Password reset flow (email-based)
- Session management (logout, revoke all sessions)

---

#### [B3] Stripe Subscription Integration
**Effort**: M (2-3 weeks) | **Risk**: Medium | **Dependencies**: B1

- Stripe Checkout for new subscriptions
- Stripe Customer Portal for billing management
- Webhook handler for subscription lifecycle events (created, renewed, cancelled, failed)
- Club `status` field updated based on subscription state
- Grace period on failed payment (7 days before suspension)
- Free trial period (14 or 30 days, TBD)

---

#### [B4] Tinnies Support
**Effort**: S (1 week) | **Risk**: Low | **Dependencies**: A5, A6

- Add `boat_category` field to boats table (already in schema: `race`, `tinny`)
- Board display groups boats by category: "Race Boats" section, then "Tinnies" section
- Same booking display logic, just visually separated
- Admin dashboard allows categorising boats
- *(committee feedback, Jan 2026)*

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
- Separate display URL: `clubname.rowingboards.io/noticeboard`

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
                    B1 Admin Dashboard   B2 Admin Auth
                              │         │
                              ├─────────┤
                              │         │
                    B3 Stripe │    B4 Tinnies
                              │         │
                              │    B5 Email Links
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
| Database | PostgreSQL 15+ | Multi-tenancy, ACID, JSONB, free tier on Render |
| Scraping | Puppeteer | Existing proven logic, handles CSRF/sessions |
| Job scheduling | node-cron (A-B) → BullMQ (C+) | Start simple, upgrade when needed |
| Frontend (board) | HTML/CSS/JS | Existing, works well, lightweight |
| Frontend (admin) | React + TypeScript + Tailwind | Modern, component-based dashboard |
| Auth | JWT (jsonwebtoken) + bcrypt | Standard, stateless |
| Encryption | Node.js crypto (AES-256-GCM) | Built-in, no external dependency |
| Hosting | Render.com | Integrated DB, auto-deploy, reasonable cost |
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

---

**END OF DOCUMENT**
