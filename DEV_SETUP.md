# Local Development Setup

## Prerequisites

- **Node.js 20.x** (check: `node --version`)
- **pnpm 10.x** (install: `npm install -g pnpm@10`)
- **Supabase account** with the `rowing-boards-dev` project created

## Environment Isolation

| | Development | Production |
|---|---|---|
| **Database** | `rowing-boards-dev` Supabase project | `rowing-boards` Supabase project |
| **Encryption key** | Generated locally, dev-only | Set in Render env vars |
| **JWT secret** | Generated locally, dev-only | Set in Render env vars |
| **BASE_DOMAIN** | `localhost` | `rowandlift.au` |
| **NODE_ENV** | `development` | `production` |

**Safety guards**:
- `.env` files are in `.gitignore` — never committed
- The server logs the database hostname on startup
- If `NODE_ENV=development` connects to what looks like a production database, a **WARNING** is logged
- Dev and production use **different encryption keys**, so encrypted credentials are not portable between environments

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure the database package

```bash
# packages/db/.env should point to the DEV Supabase project
# Edit the DATABASE_URL to use the dev project connection string
```

### 3. Configure the saas-server

```bash
cd apps/saas-server
cp .env.example .env
```

Edit `.env` and set:
- `DATABASE_URL` — connection string from the **dev** Supabase project (Settings > Database > Connection string > URI, use Transaction pooler port 6543)
- `ENCRYPTION_KEY` — generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `JWT_SECRET` — generate a different key with the same command

### 4. Push schema to dev database

```bash
pnpm db:push
```

This creates all tables (`clubs`, `boat_cache`, `booking_cache`, `users`, `scrape_jobs`, `audit_log`) in the dev database.

### 5. Seed test data

```bash
pnpm db:seed
```

This creates LMRC as the first tenant in the dev database.

### 6. Create an admin user (for testing admin pages)

```bash
pnpm tsx scripts/create-admin-user.ts
```

Follow the prompts to create an admin user for the LMRC club.

### 7. Build and run

```bash
# Build all SaaS packages (in dependency order)
pnpm build:saas

# Start the dev server (hot reload)
pnpm saas-api:dev
```

The server starts at `http://localhost:3000`. Since `BASE_DOMAIN=localhost`, access the LMRC board at:
- `http://lmrc.localhost:3000/` — booking board (interactive mode)
- `http://lmrc.localhost:3000/?mode=tv` — TV display mode
- `http://lmrc.localhost:3000/config.html` — config viewer
- `http://lmrc.localhost:3000/api-docs` — Swagger API docs

### 8. (Optional) Start the background worker

In a separate terminal:
```bash
pnpm saas-api:dev:worker
```

The worker runs the scheduled RevSport scraper. Not needed for UI development unless you're testing scrape functionality.

## Verifying Your Environment

When the server starts, check the log output:
```
Environment: development | Database: db.XXXXX.supabase.co
```

If you see a **WARNING about connecting to a production database**, stop immediately and fix your `.env`.

## Common Tasks

### Reset dev database
```bash
pnpm db:push --force    # Drop and recreate all tables
pnpm db:seed            # Re-seed LMRC data
```

### View database tables
```bash
pnpm db:studio          # Opens Drizzle Studio web UI
```

### Run tests
```bash
pnpm test               # Run all tests
pnpm test --filter=api  # Run only @lmrc/api tests
```

### Type checking (no build)
```bash
pnpm typecheck          # Type check all packages
```

## Deploying to Production

Production deployment is automatic via Render:
1. Push to `main` branch → Render auto-deploys
2. Environment variables are set in Render dashboard (never in local files)
3. The production database, encryption keys, and JWT secrets are **completely separate** from dev

**Never**:
- Put production credentials in local `.env` files
- Run `db:push` or `db:seed` against the production database from your local machine
- Copy encryption keys between environments (encrypted data is not portable)
