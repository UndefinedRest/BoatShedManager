# Monorepo Migration Plan

**Status**: Planned - Awaiting execution
**Priority**: High (addresses current pain points + enables SaaS development)
**Effort**: ~2-3 weeks (incremental, alongside Phase A development)
**Risk Level**: Low (can roll back if needed)
**Last Updated**: 2026-01-30

> **Note**: This plan has been updated to align with the SaaS architecture pivot documented in [ARCHITECTURAL_ROADMAP.md](../../ARCHITECTURAL_ROADMAP.md). The monorepo structure now supports both the existing Pi deployment and the new SaaS platform.

---

## Executive Summary

Migrate from the current nested-repository anti-pattern to a true monorepo structure. This addresses critical pain points around repository confusion, documentation/code separation, and cross-project coordination, while also **enabling the new SaaS platform development**.

**Current Pain Points Being Solved**:
- ❌ Nested git repositories causing confusion (BoatBooking inside BoatShedManager)
- ❌ Documentation lives separately from code (can drift out of sync)
- ❌ No atomic commits across projects and docs
- ❌ Inconsistent repository naming conventions
- ❌ Complex workflow for shared library (lmrc-config)
- ❌ Difficult to coordinate releases across projects
- ❌ No structure for SaaS platform development

**Post-Migration Benefits**:
- ✅ Single source of truth for entire codebase
- ✅ Atomic commits across projects + documentation
- ✅ Shared packages work naturally (shared, scraper, db, config)
- ✅ Solution-wide CI/CD capabilities
- ✅ Easier refactoring across projects
- ✅ Consistent tooling (linting, formatting, testing)
- ✅ Monorepo tools provide caching and parallel builds
- ✅ **Ready for SaaS platform development (saas-api, saas-admin)**
- ✅ **Shared code between Pi and SaaS deployments**

---

## Current Repository Structure

### As-Is (Nested Repos Anti-Pattern)

```
GitHub Account: UndefinedRest
├─ BoatShedManager (root repo)           ← Solution-wide docs, conventions
│  ├─ BoatBooking/ (nested repo)         → LMRC-BoatBookings
│  ├─ lmrc-booking-system/ (nested)      → BoatBookingsCalendar
│  ├─ Noticeboard/ (nested)              → LMRC_Noticeboard
│  ├─ lmrc-pi-deployment/ (nested)       → lmrc-pi-deployment
│  ├─ lmrc-config/ (tracked in root)     ← Shared library
│  ├─ docs/ (tracked in root)            ← Solution docs
│  └─ exploration/ (tracked in root)     ← Temporary investigations
```

**Git Repositories**:
1. `BoatShedManager` (root) - https://github.com/UndefinedRest/BoatShedManager
2. `LMRC-BoatBookings` - https://github.com/UndefinedRest/LMRC-BoatBookings
3. `BoatBookingsCalendar` - https://github.com/UndefinedRest/BoatBookingsCalendar
4. `LMRC_Noticeboard` - https://github.com/UndefinedRest/LMRC_Noticeboard
5. `lmrc-pi-deployment` - https://github.com/UndefinedRest/lmrc-pi-deployment

**Deployment Targets**:
- BoatBooking → Netlify (static site)
- lmrc-booking-system → Raspberry Pi
- Noticeboard → Raspberry Pi
- lmrc-pi-deployment → Infrastructure scripts (no deployment)

---

## Target Repository Structure

### To-Be (SaaS-Aware Monorepo)

```
LMRC (single monorepo)
├── .github/
│   ├── workflows/
│   │   ├── booking-page.yml        # CI/CD for Booking Page (Netlify)
│   │   ├── pi-server.yml           # CI/CD for Pi Server (Pi deployment)
│   │   ├── noticeboard.yml         # CI/CD for Noticeboard (Pi deployment)
│   │   ├── saas-api.yml            # CI/CD for SaaS API (Render)
│   │   ├── saas-admin.yml          # CI/CD for SaaS Admin (Render static)
│   │   └── ci.yml                  # Solution-wide checks
│   └── dependabot.yml              # Automated dependency updates
│
├── apps/
│   │
│   │  # === PI DEPLOYMENT (LMRC-Specific) ===
│   │
│   ├── pi-server/                  # Current lmrc-booking-system
│   │   ├── public/
│   │   │   ├── css/
│   │   │   ├── js/
│   │   │   └── images/
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── scraper.ts
│   │   │   └── routes/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vitest.config.ts
│   │
│   ├── noticeboard/                # Noticeboard display (Pi)
│   │   ├── public/
│   │   ├── src/
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── pi-deployment/              # Pi infrastructure scripts
│   │   ├── scripts/
│   │   │   ├── deploy-pi-server.sh
│   │   │   ├── deploy-noticeboard.sh
│   │   │   └── setup-pi.sh
│   │   └── README.md
│   │
│   │  # === SAAS PLATFORM (Multi-tenant) ===
│   │
│   ├── saas-api/                   # SaaS Express API (Render)
│   │   ├── src/
│   │   │   ├── server.ts
│   │   │   ├── routes/
│   │   │   │   ├── public/         # Unauthenticated endpoints
│   │   │   │   │   ├── board.ts    # GET /:club/board (TV display data)
│   │   │   │   │   └── bookings.ts # GET /:club/bookings (booking page data)
│   │   │   │   └── admin/          # JWT-protected endpoints
│   │   │   │       ├── config.ts   # Club configuration
│   │   │   │       └── auth.ts     # Login/refresh tokens
│   │   │   ├── services/
│   │   │   │   ├── sync.ts         # RevSport sync worker
│   │   │   │   └── adapters/       # Data source adapters
│   │   │   │       ├── interface.ts
│   │   │   │       ├── revsport.ts
│   │   │   │       └── builtin.ts  # Future: lightweight fleet mgmt
│   │   │   └── middleware/
│   │   │       ├── auth.ts         # JWT validation
│   │   │       └── tenant.ts       # Subdomain routing
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── render.yaml             # Render deployment config
│   │
│   ├── saas-admin/                 # SaaS Admin Dashboard (React)
│   │   ├── src/
│   │   │   ├── App.tsx
│   │   │   ├── pages/
│   │   │   │   ├── Login.tsx
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   └── Settings.tsx    # Colors, boats, branding
│   │   │   └── components/
│   │   ├── public/
│   │   ├── package.json
│   │   └── vite.config.ts
│   │
│   │  # === PUBLIC SITES ===
│   │
│   └── booking-page/               # Public booking website (Netlify)
│       ├── index.html              # Was book-a-boat.html
│       ├── css/
│       ├── js/
│       ├── package.json
│       └── netlify.toml
│
├── packages/
│   │
│   ├── shared/                     # Common types & utilities
│   │   ├── src/
│   │   │   ├── types/
│   │   │   │   ├── boat.ts
│   │   │   │   ├── booking.ts
│   │   │   │   ├── club.ts
│   │   │   │   └── config.ts
│   │   │   └── utils/
│   │   │       ├── date.ts
│   │   │       └── validation.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── scraper/                    # RevSport scraping logic
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── revsport-client.ts
│   │   │   └── parser.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── display/                    # TV display rendering (shared)
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── styles/
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── db/                         # Database schemas & migrations
│   │   ├── src/
│   │   │   ├── schema.ts           # Drizzle schema
│   │   │   ├── migrations/
│   │   │   └── client.ts
│   │   ├── drizzle.config.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── config/                     # Shared configuration (was lmrc-config)
│       ├── src/
│       │   ├── index.ts
│       │   ├── defaults.ts
│       │   └── types.ts
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                           # Solution-wide documentation
│   ├── architecture/
│   │   ├── monorepo-migration-plan.md  # This document
│   │   └── saas-architecture.md
│   ├── deployment/
│   │   ├── pi-setup.md
│   │   ├── render-setup.md
│   │   └── netlify-setup.md
│   ├── planning/
│   │   └── roadmap.md
│   └── research/
│
├── exploration/                    # Temporary investigations
│   ├── .gitignore
│   └── README.md
│
├── .gitignore
├── package.json                    # Workspace root
├── pnpm-workspace.yaml             # pnpm workspace config
├── turbo.json                      # Turborepo config
├── README.md
├── ARCHITECTURAL_ROADMAP.md        # Master roadmap
└── CONVENTIONS.md
```

**Single Git Repository**: `LMRC` - https://github.com/UndefinedRest/LMRC

### Deployment Targets

| App | Platform | URL | Trigger |
|-----|----------|-----|---------|
| **booking-page** | Netlify | lakemacrowing.au | Push to main |
| **pi-server** | Raspberry Pi | localhost:3000 | Manual deploy script |
| **noticeboard** | Raspberry Pi | localhost:3001 | Manual deploy script |
| **saas-api** | Render Web Service | api.rowingboards.io | Push to main |
| **saas-admin** | Render Static | admin.rowingboards.io | Push to main |

### Package Dependencies

```
apps/pi-server       → packages/config, packages/scraper, packages/shared
apps/noticeboard     → packages/config, packages/shared
apps/saas-api        → packages/db, packages/scraper, packages/shared
apps/saas-admin      → packages/shared
apps/booking-page    → packages/shared (types only)
```

---

## Migration Strategy

### Technology Choice: **pnpm Workspaces + Turborepo (Optional)**

**Why pnpm?**
- ✅ Fast, efficient disk usage (symlinks shared dependencies)
- ✅ Built-in workspace support (no extra tools required)
- ✅ Compatible with existing npm/yarn projects
- ✅ Industry standard (used by Vue, Microsoft, etc.)

**Why Turborepo (optional)?**
- ✅ Intelligent caching (don't rebuild unchanged apps)
- ✅ Parallel execution (build multiple apps simultaneously)
- ✅ Remote caching (cache builds across machines)
- ✅ Simple configuration (turbo.json)
- ⚠️ Can add later if needed (start with plain pnpm)

**Alternative Considered**: Nx (rejected - too complex for current needs)

---

## ⚠️ Critical: Production Stability During Migration

**Context**: Two production systems are currently serving the rowing club:
1. **Booking Board (Pi)** - TV display in the boat shed, currently in UAT
2. **Boat Booking Page (Netlify)** - Public booking website at lakemacrowing.au

Any disruption to either system would be unacceptable. This section outlines how to maintain full stability throughout the migration.

### Principle: Production Systems Remain Untouched

The existing Raspberry Pi deployment continues running from its current repositories **until explicitly migrated**. The monorepo migration happens in your development environment first, and the Pi cut-over is a separate, controlled operation.

```
TIMELINE
─────────────────────────────────────────────────────────────────────

[NOW]                    [MONOREPO READY]           [PI MIGRATED]
  │                            │                         │
  │  Pi runs from:             │  Pi still runs from:    │  Pi runs from:
  │  ~/lmrc-booking-system     │  ~/lmrc-booking-system  │  ~/LMRC/apps/pi-server
  │                            │                         │
  │  Development:              │  Development:           │  Development:
  │  BoatShedManager           │  LMRC monorepo         │  LMRC monorepo
  │                            │                         │
  ├────── SaaS Development ────┼────── SaaS Dev ────────┼───────────►
  │                            │                         │
  └────── Pi untouched ────────┴──── Pi untouched ──────┘
```

### What This Means in Practice

| Activity | Affects Pi? | Affects Netlify? | Risk |
|----------|-------------|------------------|------|
| Create monorepo structure locally | ❌ No | ❌ No | None |
| Push monorepo to GitHub | ❌ No | ❌ No | None |
| Set up Render for SaaS apps | ❌ No | ❌ No | None |
| Build and test SaaS apps (Render) | ❌ No | ❌ No | None |
| Develop new features in monorepo | ❌ No | ❌ No | None |
| **Switch Netlify to monorepo** | ❌ No | ✅ Yes | **Defer (Phase 3.6)** |
| **SSH to Pi and run migration** | ✅ Yes | ❌ No | **Defer (Phase 4)** |

### Parallel Development Strategy

During the transition period, you'll be working in **two structures simultaneously**:

**For Pi bug fixes / UAT changes** (until Pi is migrated):
```
c:\dev\Projects\LMRC\lmrc-booking-system\  ← Continue editing here
                                            Push to BoatBookingsCalendar repo
                                            Pi pulls from this repo
```

**For SaaS development / new features**:
```
c:\dev\Projects\LMRC\                      ← Develop SaaS apps here
  apps/saas-api/                             (or in new monorepo location)
  apps/saas-admin/                           Push to LMRC monorepo
  packages/...                               Render deploys from here
```

### When to Migrate the Pi

Migrate the Pi **only when all of these conditions are true**:

- [ ] Monorepo is fully set up and tested locally
- [ ] CI/CD pipelines are green
- [ ] Netlify booking-page deploys successfully from monorepo
- [ ] UAT phase with LMRC is complete (or at a stable point)
- [ ] You have a maintenance window (early morning or evening)
- [ ] You've tested the migration steps on a dev/test Pi (if available)

### Pi Migration Checklist

When you're ready to migrate the Pi:

```bash
# 1. Verify current Pi is working
ssh pi@<pi-ip>
curl http://localhost:3000/api/health

# 2. Backup current state
sudo systemctl stop lmrc-booking-system
cp -r ~/lmrc-booking-system ~/lmrc-booking-system.backup.$(date +%Y%m%d)

# 3. Clone monorepo (alongside, not replacing)
git clone https://github.com/UndefinedRest/LMRC.git ~/LMRC
cd ~/LMRC
pnpm install --frozen-lockfile
pnpm --filter @lmrc/pi-server build

# 4. Test the new build works
node apps/pi-server/dist/server.js
# In another terminal: curl http://localhost:3000/api/health

# 5. Update systemd service (see Phase 4.2)
sudo nano /etc/systemd/system/lmrc-pi-server.service
# Change WorkingDirectory to /home/pi/LMRC/apps/pi-server

# 6. Switch over
sudo systemctl daemon-reload
sudo systemctl start lmrc-pi-server
sudo systemctl status lmrc-pi-server

# 7. Verify TV display is working
# Check the TV in the boat shed!

# 8. Keep backup for 1 week, then remove
# rm -rf ~/lmrc-booking-system.backup.*
```

### Rollback (if something goes wrong)

If the Pi migration fails:

```bash
# Stop the new service
sudo systemctl stop lmrc-pi-server

# Revert systemd to old path
sudo nano /etc/systemd/system/lmrc-pi-server.service
# Change WorkingDirectory back to /home/pi/lmrc-booking-system

# Restart with old code
sudo systemctl daemon-reload
sudo systemctl start lmrc-booking-system
```

**Rollback time: < 5 minutes**

### Documentation to Update After Pi Migration

Once the Pi is successfully migrated, update these files:

| Document | Update Required |
|----------|-----------------|
| [lmrc-pi-deployment/README.md](../../lmrc-pi-deployment/README.md) | Update paths and commands |
| Pi systemd service files | Already updated during migration |
| [docs/deployment/pi-setup.md](../deployment/pi-setup.md) | Update for monorepo structure |
| Any local notes/scripts you use for Pi maintenance | Update paths |

---

## Phase 1: Preparation (1-2 hours)

### 1.1 Install pnpm Globally

```bash
# Install pnpm
npm install -g pnpm

# Verify installation
pnpm --version
```

### 1.2 Create Temporary Migration Directory

```bash
# Create temp directory for migration work
mkdir ~/LMRC-monorepo-temp
cd ~/LMRC-monorepo-temp

# Initialize new git repository
git init
git branch -m main
```

### 1.3 Set Up Workspace Structure

**Create directory structure**:
```bash
mkdir -p apps packages docs exploration .github/workflows
```

**Create root package.json**:
```json
{
  "name": "lmrc",
  "version": "1.0.0",
  "description": "Lake Macquarie Rowing Club - Monorepo (Pi + SaaS Platform)",
  "private": true,
  "scripts": {
    "// PI APPS": "",
    "pi-server:dev": "pnpm --filter @lmrc/pi-server dev",
    "pi-server:build": "pnpm --filter @lmrc/pi-server build",
    "noticeboard:dev": "pnpm --filter @lmrc/noticeboard dev",
    "noticeboard:build": "pnpm --filter @lmrc/noticeboard build",

    "// SAAS APPS": "",
    "saas-api:dev": "pnpm --filter @lmrc/saas-api dev",
    "saas-api:build": "pnpm --filter @lmrc/saas-api build",
    "saas-admin:dev": "pnpm --filter @lmrc/saas-admin dev",
    "saas-admin:build": "pnpm --filter @lmrc/saas-admin build",

    "// PUBLIC SITES": "",
    "booking-page:dev": "pnpm --filter @lmrc/booking-page dev",
    "booking-page:build": "pnpm --filter @lmrc/booking-page build",

    "// DATABASE": "",
    "db:migrate": "pnpm --filter @lmrc/db migrate",
    "db:push": "pnpm --filter @lmrc/db push",
    "db:studio": "pnpm --filter @lmrc/db studio",

    "// SOLUTION-WIDE": "",
    "test": "pnpm -r test",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck"
  },
  "keywords": ["rowing", "club", "booking", "monorepo", "saas"],
  "author": "LMRC",
  "license": "UNLICENSED"
}
```

**Create pnpm-workspace.yaml**:
```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

**Create .gitignore**:
```
# Dependencies
node_modules/
pnpm-lock.yaml

# Build outputs
dist/
build/
.next/
out/

# Environment files
.env
.env.local
.env.production

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/settings.json
.idea/

# Temporary investigations
exploration/*/
!exploration/README.md
!exploration/.gitignore

# Logs
*.log
npm-debug.log*
pnpm-debug.log*
```

### 1.4 (Optional) Set Up Turborepo

**Create turbo.json**:
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "build/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Add turbo to root package.json**:
```bash
pnpm add -Dw turbo
```

---

## Phase 2: Migrate Projects with History (2-3 hours)

### 2.1 Migrate Each Project Using Git Subtree

**Strategy**: Use `git subtree` to preserve full git history for each project.

**Migrate BoatBooking**:
```bash
cd ~/LMRC-monorepo-temp

# Add as subtree (preserves history)
git subtree add \
  --prefix apps/boat-booking \
  https://github.com/UndefinedRest/LMRC-BoatBookings \
  main \
  --squash
```

**Migrate lmrc-booking-system**:
```bash
git subtree add \
  --prefix apps/booking-calendar \
  https://github.com/UndefinedRest/BoatBookingsCalendar \
  main \
  --squash
```

**Migrate Noticeboard**:
```bash
git subtree add \
  --prefix apps/noticeboard \
  https://github.com/UndefinedRest/LMRC_Noticeboard \
  main \
  --squash
```

**Migrate lmrc-pi-deployment**:
```bash
git subtree add \
  --prefix apps/pi-deployment \
  https://github.com/UndefinedRest/lmrc-pi-deployment \
  main \
  --squash
```

**Copy lmrc-config and docs from root repo**:
```bash
# Clone the current root repo
cd ~/
git clone https://github.com/UndefinedRest/BoatShedManager BoatShedManager-temp

# Copy to monorepo
cd ~/LMRC-monorepo-temp
cp -r ~/BoatShedManager-temp/lmrc-config packages/
cp -r ~/BoatShedManager-temp/docs .
cp -r ~/BoatShedManager-temp/exploration .
cp ~/BoatShedManager-temp/*.md .  # Top-level docs (README, ARCHITECTURE, etc.)

# Commit
git add .
git commit -m "docs: Add solution-wide documentation and shared config"
```

### 2.2 Update Package Names for Workspace

**Update apps/booking-page/package.json**:
```json
{
  "name": "@lmrc/booking-page",
  "version": "1.3.0",
  "description": "Public boat booking website (Netlify)",
  "scripts": {
    "dev": "http-server -p 8080",
    "build": "echo 'Static site - no build needed'"
  },
  "dependencies": {
    "@lmrc/shared": "workspace:*"
  },
  "devDependencies": {
    "http-server": "^14.1.1"
  }
}
```

**Update apps/pi-server/package.json**:
```json
{
  "name": "@lmrc/pi-server",
  "version": "1.0.0",
  "description": "Pi-based booking board server (TV display)",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@lmrc/config": "workspace:*",
    "@lmrc/scraper": "workspace:*",
    "@lmrc/shared": "workspace:*",
    "express": "^4.18.2"
  }
}
```

**Update apps/noticeboard/package.json**:
```json
{
  "name": "@lmrc/noticeboard",
  "version": "1.0.0",
  "description": "Digital noticeboard display for Raspberry Pi",
  "dependencies": {
    "@lmrc/config": "workspace:*",
    "@lmrc/shared": "workspace:*"
  }
}
```

**Update apps/saas-api/package.json**:
```json
{
  "name": "@lmrc/saas-api",
  "version": "0.1.0",
  "description": "SaaS API server (Render)",
  "scripts": {
    "dev": "tsx watch src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js",
    "test": "vitest run"
  },
  "dependencies": {
    "@lmrc/db": "workspace:*",
    "@lmrc/scraper": "workspace:*",
    "@lmrc/shared": "workspace:*",
    "express": "^4.18.2",
    "drizzle-orm": "^0.29.0",
    "jsonwebtoken": "^9.0.0"
  }
}
```

**Update apps/saas-admin/package.json**:
```json
{
  "name": "@lmrc/saas-admin",
  "version": "0.1.0",
  "description": "SaaS Admin Dashboard (React)",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "test": "vitest run"
  },
  "dependencies": {
    "@lmrc/shared": "workspace:*",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

**Update packages/shared/package.json**:
```json
{
  "name": "@lmrc/shared",
  "version": "1.0.0",
  "description": "Shared types and utilities",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./types": "./src/types/index.ts"
  }
}
```

**Update packages/config/package.json**:
```json
{
  "name": "@lmrc/config",
  "version": "1.0.0",
  "description": "Shared configuration (was lmrc-config)",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  }
}
```

**Update packages/db/package.json**:
```json
{
  "name": "@lmrc/db",
  "version": "0.1.0",
  "description": "Database schemas and migrations (Drizzle)",
  "scripts": {
    "migrate": "drizzle-kit migrate",
    "push": "drizzle-kit push",
    "studio": "drizzle-kit studio"
  },
  "dependencies": {
    "drizzle-orm": "^0.29.0",
    "postgres": "^3.4.0"
  },
  "devDependencies": {
    "drizzle-kit": "^0.20.0"
  }
}
```

**Commit changes**:
```bash
git add .
git commit -m "refactor: Update package names to @lmrc/* workspace convention"
```

### 2.3 Install Dependencies

```bash
# Install all dependencies across workspace
pnpm install

# Verify workspace setup
pnpm list --depth 0
```

---

## Phase 3: CI/CD Configuration (1-2 hours)

### 3.1 GitHub Actions for Booking Page (Netlify)

**Create .github/workflows/booking-page.yml**:
```yaml
name: Booking Page CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'apps/booking-page/**'
      - 'packages/shared/**'
      - '.github/workflows/booking-page.yml'
  pull_request:
    branches: [main]
    paths:
      - 'apps/booking-page/**'
      - 'packages/shared/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build Booking Page
        run: pnpm --filter @lmrc/booking-page build

      # Netlify auto-deploys on push to main via GitHub integration
```

### 3.2 GitHub Actions for Pi Server

**Create .github/workflows/pi-server.yml**:
```yaml
name: Pi Server CI

on:
  push:
    branches: [main]
    paths:
      - 'apps/pi-server/**'
      - 'packages/config/**'
      - 'packages/scraper/**'
      - 'packages/shared/**'
      - '.github/workflows/pi-server.yml'
  pull_request:
    branches: [main]
    paths:
      - 'apps/pi-server/**'
      - 'packages/config/**'
      - 'packages/scraper/**'
      - 'packages/shared/**'

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm --filter @lmrc/config --filter @lmrc/scraper --filter @lmrc/shared build

      - name: Build Pi Server
        run: pnpm --filter @lmrc/pi-server build

      - name: Run tests
        run: pnpm --filter @lmrc/pi-server test
```

### 3.3 GitHub Actions for SaaS API (Render)

**Create .github/workflows/saas-api.yml**:
```yaml
name: SaaS API CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'apps/saas-api/**'
      - 'packages/db/**'
      - 'packages/scraper/**'
      - 'packages/shared/**'
      - '.github/workflows/saas-api.yml'
  pull_request:
    branches: [main]
    paths:
      - 'apps/saas-api/**'
      - 'packages/db/**'
      - 'packages/scraper/**'
      - 'packages/shared/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build packages
        run: pnpm --filter @lmrc/db --filter @lmrc/scraper --filter @lmrc/shared build

      - name: Build SaaS API
        run: pnpm --filter @lmrc/saas-api build

      - name: Run tests
        run: pnpm --filter @lmrc/saas-api test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render Deploy
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_SAAS_API }}"
```

### 3.4 GitHub Actions for SaaS Admin (Render Static)

**Create .github/workflows/saas-admin.yml**:
```yaml
name: SaaS Admin CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'apps/saas-admin/**'
      - 'packages/shared/**'
      - '.github/workflows/saas-admin.yml'
  pull_request:
    branches: [main]
    paths:
      - 'apps/saas-admin/**'
      - 'packages/shared/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build shared packages
        run: pnpm --filter @lmrc/shared build

      - name: Build SaaS Admin
        run: pnpm --filter @lmrc/saas-admin build

      - name: Run tests
        run: pnpm --filter @lmrc/saas-admin test

  deploy:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Render Deploy
        run: |
          curl -X POST "${{ secrets.RENDER_DEPLOY_HOOK_SAAS_ADMIN }}"
```

### 3.5 Solution-Wide CI

**Create .github/workflows/ci.yml**:
```yaml
name: Solution-Wide CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Type check all projects
        run: pnpm typecheck

      - name: Lint all projects
        run: pnpm lint

      - name: Test all projects
        run: pnpm test

      - name: Build all projects
        run: pnpm build
```

### 3.6 Update Netlify Configuration

> ⚠️ **DEFER THIS STEP** - The Boat Booking page (lakemacrowing.au) is in production. Keep Netlify deploying from `LMRC-BoatBookings` until you're ready for a controlled switch.
>
> **Phases 1-3.5 and 3.7 can be completed** while Netlify continues deploying from the old repository.

**When ready to switch** (after testing, when confident):

**Option A: Test first with a staging site (recommended)**
1. Create a NEW Netlify site pointing to the monorepo
2. Deploy to a test URL (e.g., `test-booking.netlify.app`)
3. Verify it works identically to production
4. Once confirmed, update the primary site

**Option B: Direct switch (quick, with rollback ready)**
1. Go to: Site settings → Build & deploy
2. Update build settings:
   - **Base directory**: `apps/booking-page`
   - **Build command**: `pnpm --filter @lmrc/booking-page build` (or leave empty for static site)
   - **Publish directory**: `apps/booking-page` (or `apps/booking-page/dist`)
3. Update repository connection:
   - Disconnect from old `LMRC-BoatBookings` repo
   - Connect to new `LMRC` monorepo
   - Keep same branch: `main`

**Rollback (if needed)**: Reconnect to `LMRC-BoatBookings` repo in Netlify dashboard (~2 minutes)

**apps/booking-page/netlify.toml** (create this file in monorepo for when you switch):
```toml
[build]
  base = "apps/booking-page"
  publish = "."
  command = "echo 'Static site - no build needed'"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/"
  to = "/index.html"
  status = 200
```

### 3.7 Render Configuration (SaaS Platform)

**apps/saas-api/render.yaml**:
```yaml
services:
  # Web Service (API)
  - type: web
    name: saas-api
    runtime: node
    region: sydney  # Closest to AU users
    plan: free      # Start free, upgrade to $7/mo when needed
    rootDir: apps/saas-api
    buildCommand: cd ../.. && pnpm install && pnpm --filter @lmrc/saas-api build
    startCommand: node dist/server.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: saas-db
          property: connectionString
      - key: JWT_SECRET
        generateValue: true

  # Background Worker (Sync)
  - type: worker
    name: saas-sync-worker
    runtime: node
    region: sydney
    plan: starter   # $7/mo - required for background workers
    rootDir: apps/saas-api
    buildCommand: cd ../.. && pnpm install && pnpm --filter @lmrc/saas-api build
    startCommand: node dist/worker.js
    envVars:
      - key: NODE_ENV
        value: production
      - key: DATABASE_URL
        fromDatabase:
          name: saas-db
          property: connectionString

databases:
  - name: saas-db
    databaseName: lmrc_saas
    plan: free      # Start free, upgrade to $7/mo for persistence
    region: sydney
```

---

## Phase 4: Update Raspberry Pi Deployment (1 hour)

> ⚠️ **DO NOT EXECUTE THIS PHASE** until the conditions in [Pi Stability During Migration](#️-critical-pi-stability-during-migration) are met. The production Pi should remain untouched until:
> - Monorepo is fully tested
> - UAT phase is at a stable point
> - You have a maintenance window
>
> **Phases 1-3 and 5-6 can be completed** while the Pi continues running from the old repository structure.

### 4.1 Update Pi Deployment Scripts

**apps/pi-deployment/scripts/deploy-pi-server.sh**:
```bash
#!/bin/bash
set -e

echo "Deploying Pi Server from monorepo..."

# Navigate to monorepo root on Pi
cd ~/LMRC

# Pull latest changes
git pull origin main

# Install dependencies (pnpm must be installed on Pi)
pnpm install --frozen-lockfile

# Build shared packages first
pnpm --filter @lmrc/config --filter @lmrc/scraper --filter @lmrc/shared build

# Build pi-server
pnpm --filter @lmrc/pi-server build

# Restart systemd service
sudo systemctl restart lmrc-pi-server

echo "Pi Server deployed successfully!"
```

**apps/pi-deployment/scripts/deploy-noticeboard.sh** (similar structure)

### 4.2 Update Systemd Service Files

**Update /etc/systemd/system/lmrc-pi-server.service**:
```ini
[Unit]
Description=LMRC Pi Server (Booking Board Display)
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/LMRC/apps/pi-server
ExecStart=/usr/bin/pnpm start
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### 4.3 Pi Migration Steps (One-Time)

**On Raspberry Pi**:
```bash
# 1. Install pnpm globally
sudo npm install -g pnpm

# 2. Backup current installations
cd ~
mv lmrc-booking-system lmrc-booking-system.backup
mv LMRC_Noticeboard LMRC_Noticeboard.backup

# 3. Clone new monorepo
git clone https://github.com/UndefinedRest/LMRC.git
cd LMRC

# 4. Install dependencies
pnpm install --frozen-lockfile

# 5. Build packages and apps
pnpm --filter @lmrc/config --filter @lmrc/scraper --filter @lmrc/shared build
pnpm --filter @lmrc/pi-server build
pnpm --filter @lmrc/noticeboard build

# 6. Update systemd services (see 4.2 above)
sudo nano /etc/systemd/system/lmrc-pi-server.service
sudo nano /etc/systemd/system/lmrc-noticeboard.service

# 7. Reload systemd and restart services
sudo systemctl daemon-reload
sudo systemctl restart lmrc-pi-server
sudo systemctl restart lmrc-noticeboard

# 8. Verify services are running
sudo systemctl status lmrc-pi-server
sudo systemctl status lmrc-noticeboard

# 9. If all good, remove backups (after testing)
# rm -rf ~/lmrc-booking-system.backup
# rm -rf ~/LMRC_Noticeboard.backup
```

---

## Phase 5: Testing and Validation (1-2 hours)

### 5.1 Local Development Testing

**Test workspace dependencies**:
```bash
cd ~/LMRC-monorepo-temp

# Build shared packages first
pnpm --filter @lmrc/shared --filter @lmrc/config --filter @lmrc/scraper build

# Verify packages are accessible from apps
pnpm --filter @lmrc/pi-server dev

# Should be able to import from @lmrc/shared, @lmrc/config
# No errors about missing dependencies
```

**Test parallel builds**:
```bash
# Build all apps simultaneously
pnpm build

# If using Turborepo:
pnpm turbo build
```

### 5.2 Deployment Testing

**Test Netlify deployment (booking-page)**:
1. Push monorepo to new GitHub repo
2. Trigger Netlify build
3. Verify site deploys correctly
4. Check https://lakemacrowing.au loads properly
5. Test booking flow (QR code → booking page → RevSport)

**Test Pi deployment (pi-server, noticeboard)**:
1. SSH to Pi test environment (if available)
2. Clone monorepo
3. Run deployment scripts
4. Verify services start correctly
5. Check web interfaces accessible

**Test Render deployment (saas-api, saas-admin)** - Phase B:
1. Create Render services using render.yaml
2. Verify database connection works
3. Test health endpoint: `GET /health`
4. Test public API: `GET /lmrc/board`
5. Test admin login flow

### 5.3 Rollback Test

**Verify rollback capability**:
1. Keep old repositories active (archived, not deleted)
2. Document rollback procedure (revert Netlify connection, revert Pi systemd services)
3. Test rollback in non-production environment

---

## Phase 6: Go-Live and Cleanup (30 minutes)

### 6.1 Create New GitHub Repository

**GitHub: Create new repo**:
1. Go to: https://github.com/new
2. Repository name: `LMRC`
3. Description: "Lake Macquarie Rowing Club - Monorepo (BoatBooking, Booking Calendar, Noticeboard)"
4. Visibility: Private (or Public if open-source)
5. **Don't** initialize with README (we have existing content)
6. Create repository

**Push monorepo to GitHub**:
```bash
cd ~/LMRC-monorepo-temp

# Add remote
git remote add origin https://github.com/UndefinedRest/LMRC.git

# Push to GitHub
git push -u origin main
```

### 6.2 Archive Old Repositories

**For each old repository**:
1. Go to repository settings
2. Scroll to "Danger Zone"
3. Click "Archive this repository"
4. Add README banner:
   ```markdown
   # ⚠️ ARCHIVED - Migrated to Monorepo

   This repository has been migrated to the LMRC monorepo:
   https://github.com/UndefinedRest/LMRC

   **New locations**:
   - BoatBooking → `apps/boat-booking/`
   - lmrc-booking-system → `apps/booking-calendar/`
   - Noticeboard → `apps/noticeboard/`
   - lmrc-pi-deployment → `apps/pi-deployment/`
   - lmrc-config → `packages/lmrc-config/`
   ```
5. Archive (don't delete - preserve history)

**Repositories to archive**:
- LMRC-BoatBookings
- BoatBookingsCalendar
- LMRC_Noticeboard
- lmrc-pi-deployment
- BoatShedManager (root repo)

### 6.3 Update External References

**Update documentation links**:
- CONVENTIONS.md
- ARCHITECTURE.md
- README.md (solution root)
- Any external wikis or docs

**Update .github references**:
- Issue templates
- PR templates
- Contributing guides

---

## Rollback Plan

### If Migration Fails

**Immediate Rollback**:
1. Revert Netlify connection to old `LMRC-BoatBookings` repo
2. Revert Pi systemd services to old paths:
   ```bash
   # On Pi
   sudo systemctl stop lmrc-booking-calendar lmrc-noticeboard
   cd ~
   mv lmrc-booking-system.backup lmrc-booking-system
   mv LMRC_Noticeboard.backup LMRC_Noticeboard
   sudo systemctl start lmrc-booking-calendar lmrc-noticeboard
   ```
3. All old repositories still exist (archived, not deleted)
4. Un-archive repositories if needed

**Risk Mitigation**:
- ✅ No data loss (git history preserved)
- ✅ Old repos remain available
- ✅ Deployments are independent (can roll back individually)
- ✅ Test in non-production first

---

## Post-Migration Tasks

### Week 1: Validation (Existing Apps)

**Monitor deployments**:
- [ ] Netlify builds working correctly (booking-page)
- [ ] Pi services running without errors (pi-server, noticeboard)
- [ ] No broken links in documentation
- [ ] GitHub Actions passing

**Verify functionality**:
- [ ] Booking page works (test QR code flow)
- [ ] Booking board displays correctly on Pi TV
- [ ] Noticeboard displays correctly on Pi
- [ ] Google Analytics still tracking

### Week 2-4: Optimization + SaaS Foundation

**Add monorepo tooling**:
- [ ] Add Turborepo for faster builds
- [ ] Configure remote caching (Vercel)
- [ ] Add pre-commit hooks (lint-staged, husky)
- [ ] Set up Dependabot for automated dependency updates

**Documentation updates**:
- [ ] Update CONTRIBUTING.md for monorepo workflow
- [ ] Document pnpm workspace commands
- [ ] Consolidate docs from all apps into /docs
- [ ] Create "Working with the Monorepo" guide

### Phase B: SaaS Platform Development

**Database setup**:
- [ ] Create Render PostgreSQL instance
- [ ] Run initial Drizzle migrations
- [ ] Seed LMRC club configuration

**API development**:
- [ ] Implement public board endpoint
- [ ] Implement public bookings endpoint
- [ ] Implement admin auth endpoints
- [ ] Implement RevSport sync worker

**Admin dashboard**:
- [ ] Login page with JWT auth
- [ ] Dashboard with club stats
- [ ] Settings page (colors, branding)

**First external club**:
- [ ] Onboard beta club
- [ ] Configure subdomain
- [ ] Verify end-to-end flow

---

## Infrastructure Costs (SaaS Platform)

### Monthly Costs by Club Count

| Component | 1-3 Clubs | 4-10 Clubs | 10+ Clubs |
|-----------|-----------|------------|-----------|
| **Render Web Service** | Free | $7/mo | $25/mo |
| **Render Background Worker** | $7/mo | $7/mo | $14/mo |
| **Render PostgreSQL** | $7/mo | $7/mo | $20/mo |
| **Domain (rowingboards.io)** | ~$15/yr | ~$15/yr | ~$15/yr |
| **Netlify (booking-page)** | Free | Free | Free |
| | | | |
| **Monthly Total** | **~$15/mo** | **~$22/mo** | **~$60/mo** |
| **Annual Total** | **~$195/yr** | **~$279/yr** | **~$735/yr** |

### Cost Breakdown

**Render Web Service (saas-api)**
- Free tier: 512MB RAM, spins down after 15min inactivity
- For 1-3 clubs: Free tier is sufficient (boards are mostly idle)
- Upgrade to $7/mo Starter plan when response time matters

**Render Background Worker (saas-sync-worker)**
- $7/mo required - no free tier for background workers
- Handles periodic RevSport sync for all clubs
- Single worker can support dozens of clubs

**Render PostgreSQL (saas-db)**
- $7/mo Starter: 1GB storage, 97 hours uptime/month (auto-suspend)
- For 1-3 clubs with ~5-10 boats each: Well under limits
- Upgrade to $20/mo Pro if storage exceeds 1GB

### Cost Optimization Notes

1. **Start with free tiers** - Upgrade only when hitting limits
2. **Single background worker** - Can sync all clubs sequentially
3. **Database auto-suspend** - Only runs when queries arrive
4. **No CDN needed initially** - Render edge locations are sufficient
5. **Netlify remains free** - Generous free tier for static sites

### Revenue vs Costs (Break-even Analysis)

| Clubs | Revenue (Basic $50/mo) | Costs | Net Profit |
|-------|------------------------|-------|------------|
| 1 | $50/mo | $15/mo | $35/mo |
| 2 | $100/mo | $15/mo | $85/mo |
| 3 | $150/mo | $15/mo | $135/mo |
| 5 | $250/mo | $22/mo | $228/mo |

**Break-even: 1 club covers infrastructure costs**

---

## Success Criteria

### Phase 1: Monorepo Migration (Existing Apps)

**Migration is successful when**:
- ✅ All code in single `LMRC` repository
- ✅ Netlify deploys booking-page from monorepo
- ✅ Pi services run from monorepo (pi-server, noticeboard)
- ✅ `pnpm install` works in root (installs all dependencies)
- ✅ `pnpm build` builds all apps
- ✅ Workspace dependencies work (`@lmrc/shared` imports)
- ✅ CI/CD pipelines pass
- ✅ Old repos archived with migration notice

### Phase 2: SaaS Platform

**SaaS MVP is successful when**:
- ✅ saas-api deploys to Render and responds to health checks
- ✅ saas-admin deploys to Render and loads login page
- ✅ Database migrations run successfully
- ✅ RevSport sync worker fetches data on schedule
- ✅ Public API returns board data for configured club
- ✅ Admin API accepts JWT and returns club config
- ✅ At least one external club onboarded successfully

**Key Metrics**:
- Zero downtime during migration
- All deployments functional
- Developer workflow improved (simpler git operations)
- Documentation in sync with code
- SaaS API response time < 500ms for board data
- Background worker sync completes within 5 minutes per club

---

## Timeline Estimate

### Part 1: Monorepo Migration (Weekend Project)

| Phase | Task | Time Estimate | Can Defer? |
|-------|------|--------------|------------|
| 1 | Preparation (setup workspace) | 1-2 hours | No |
| 2 | Migrate projects with history | 2-3 hours | No |
| 3.1-3.5 | CI/CD for SaaS apps (Render) | 1 hour | No |
| 3.6 | **Switch Netlify to monorepo** | 30 min | **Yes - defer until tested** |
| 3.7 | Render config (SaaS) | 30 min | No |
| 4 | **Update Pi deployment** | 1 hour | **Yes - defer until UAT complete** |
| 5 | Testing and validation | 1-2 hours | Partial (test SaaS only) |
| 6 | Go-live and cleanup | 30 minutes | Partial (don't archive old repos) |
| **Total (safe)** | **Monorepo + SaaS ready** | **4-6 hours** |
| **Total (full)** | **All systems migrated** | **6-9 hours** |

**Recommended Schedule (Immediate - Truly Safe)**:
- **Friday evening**: Phase 1 (preparation)
- **Saturday morning**: Phase 2 (migration)
- **Saturday afternoon**: Phase 3.1-3.5, 3.7 (CI/CD for SaaS apps only)
- **Saturday evening**: Phase 5 (test SaaS locally)
- **Sunday morning**: Push to GitHub, verify SaaS builds

**Production systems remain untouched:**
- ✅ Pi continues running from `BoatBookingsCalendar`
- ✅ Netlify continues deploying from `LMRC-BoatBookings`
- ✅ Both old repos remain active (NOT archived)

**Deferred Schedule (When Ready)**:
| System | When to Switch | Phase |
|--------|---------------|-------|
| **Netlify (Boat Booking)** | After testing on staging site | 3.6 |
| **Pi (Booking Board)** | After UAT complete, maintenance window | 4 |
| **Archive old repos** | After both systems migrated | 6 |

> 💡 **Key Insight**: The monorepo and SaaS development can proceed immediately with **zero impact** on either production system. The Pi and Netlify continue running from their existing repos. Switch each system independently when you're confident and have time for the switch.

### Part 2: SaaS Platform Development (2-3 Weeks)

| Week | Focus | Deliverables |
|------|-------|--------------|
| Week 1 | Database + API foundation | Schema, migrations, public endpoints |
| Week 2 | Admin dashboard + Auth | Login, config UI, JWT auth |
| Week 3 | Sync worker + Polish | RevSport sync, testing, LMRC self-hosting |

See [ARCHITECTURAL_ROADMAP.md](../../ARCHITECTURAL_ROADMAP.md) for detailed SaaS development phases.

---

## Resources and References

**Monorepo Documentation**:
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Turborepo Documentation](https://turbo.build/repo/docs)
- [Monorepo.tools](https://monorepo.tools/)

**Migration Examples**:
- [Vercel Monorepo Example](https://github.com/vercel/turbo/tree/main/examples)
- [pnpm Workspace Examples](https://github.com/pnpm/pnpm/tree/main/pnpm-workspace.yaml)

**Git Subtree Guide**:
- [Git Subtree Tutorial](https://www.atlassian.com/git/tutorials/git-subtree)

**Best Practices**:
- [Google's Monorepo Philosophy](https://cacm.acm.org/magazines/2016/7/204032-why-google-stores-billions-of-lines-of-code-in-a-single-repository/fulltext)
- [Monorepo vs Polyrepo](https://earthly.dev/blog/monorepo-vs-polyrepo/)

---

## Questions or Concerns?

**Common Concerns**:

**Q: What if the migration breaks something?**
A: Old repositories remain archived (not deleted). Can roll back Netlify and Pi services to old repos within minutes.

**Q: Will this affect ongoing development?**
A: Minimal impact. Choose a weekend with no active PRs. Freeze development for 24 hours during migration.

**Q: Do I need to learn new tools?**
A: Minimal learning curve. pnpm commands are similar to npm. Workspace syntax is intuitive.

**Q: What about the Google Analytics we just set up?**
A: No impact. GA tracking is in HTML file, which moves unchanged to monorepo. Netlify deployment URL stays the same.

**Q: Can I still deploy projects independently?**
A: Yes! Each app still deploys separately (Netlify, Pi, Render). Monorepo doesn't change deployment targets.

**SaaS-Specific Questions**:

**Q: Does the SaaS platform replace the Pi deployment?**
A: No. The Pi deployment continues to work for LMRC. The SaaS platform is a separate offering for other clubs. LMRC can optionally migrate to SaaS later.

**Q: What happens to LMRC's RevSport credentials in the SaaS?**
A: Each club has its own encrypted credentials stored in the database. LMRC's credentials stay in LMRC's club configuration.

**Q: Can we add features to SaaS that don't exist in the Pi version?**
A: Yes. The SaaS platform will eventually have more features (admin dashboard, analytics, multi-user). The Pi version remains simpler but functional.

**Q: What if Render has an outage?**
A: The Pi deployment is completely independent. LMRC's TV displays continue working even if the SaaS platform is down.

---

**Status**: 📋 Ready for Execution
**Last Updated**: 2026-01-30
**Author**: Claude AI (Technical Architecture)

**Related Documentation**:
- [ARCHITECTURAL_ROADMAP.md](../../ARCHITECTURAL_ROADMAP.md) - Master roadmap (SaaS architecture)
- [CONVENTIONS.md](../../CONVENTIONS.md) - Current conventions (will be updated post-migration)
- [docs/deployment/](../deployment/) - Deployment guides (Pi, Render, Netlify)
