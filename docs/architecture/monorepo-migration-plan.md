# Monorepo Migration Plan

**Status**: Planned - Awaiting execution
**Priority**: High (addresses current pain points)
**Effort**: ~6-9 hours (weekend project)
**Risk Level**: Low (can roll back if needed)

---

## Executive Summary

Migrate from the current nested-repository anti-pattern to a true monorepo structure. This addresses critical pain points around repository confusion, documentation/code separation, and cross-project coordination.

**Current Pain Points Being Solved**:
- ❌ Nested git repositories causing confusion (BoatBooking inside BoatShedManager)
- ❌ Documentation lives separately from code (can drift out of sync)
- ❌ No atomic commits across projects and docs
- ❌ Inconsistent repository naming conventions
- ❌ Complex workflow for shared library (lmrc-config)
- ❌ Difficult to coordinate releases across projects

**Post-Migration Benefits**:
- ✅ Single source of truth for entire codebase
- ✅ Atomic commits across projects + documentation
- ✅ Shared dependencies work naturally (lmrc-config as workspace package)
- ✅ Solution-wide CI/CD capabilities
- ✅ Easier refactoring across projects
- ✅ Consistent tooling (linting, formatting, testing)
- ✅ Monorepo tools provide caching and parallel builds

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

### To-Be (True Monorepo)

```
LMRC (single monorepo)
├── .github/
│   ├── workflows/
│   │   ├── boat-booking.yml        # CI/CD for BoatBooking
│   │   ├── booking-calendar.yml    # CI/CD for booking calendar
│   │   ├── noticeboard.yml         # CI/CD for Noticeboard
│   │   └── ci.yml                  # Solution-wide checks
│   └── dependabot.yml              # Automated dependency updates
│
├── apps/
│   ├── boat-booking/              # BoatBooking (Netlify)
│   │   ├── book-a-boat.html
│   │   ├── boats.json
│   │   ├── package.json
│   │   └── netlify.toml
│   │
│   ├── booking-calendar/          # lmrc-booking-system (Pi)
│   │   ├── src/
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── noticeboard/               # Noticeboard (Pi)
│   │   ├── src/
│   │   ├── package.json
│   │   └── package.json
│   │
│   └── pi-deployment/             # lmrc-pi-deployment
│       ├── scripts/
│       └── README.md
│
├── packages/
│   └── lmrc-config/               # Shared library
│       ├── src/
│       ├── package.json
│       └── tsconfig.json
│
├── docs/                          # Solution-wide documentation
│   ├── architecture/
│   ├── deployment/
│   ├── planning/
│   └── research/
│
├── exploration/                   # Temporary investigations
│   ├── .gitignore
│   └── README.md
│
├── .gitignore                     # Root gitignore
├── package.json                   # Workspace root
├── pnpm-workspace.yaml            # pnpm workspace config
├── turbo.json                     # Turborepo config (optional)
├── README.md                      # Solution README
├── ARCHITECTURE.md
├── CONVENTIONS.md
└── docs/planning/roadmap.md       # Single source of truth
```

**Single Git Repository**: `LMRC` - https://github.com/UndefinedRest/LMRC

**Deployment**: Each app still deploys independently (no change to deployment targets)

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
  "description": "Lake Macquarie Rowing Club - Monorepo",
  "private": true,
  "scripts": {
    "boat-booking:dev": "pnpm --filter @lmrc/boat-booking dev",
    "boat-booking:build": "pnpm --filter @lmrc/boat-booking build",
    "booking-calendar:dev": "pnpm --filter @lmrc/booking-calendar dev",
    "booking-calendar:build": "pnpm --filter @lmrc/booking-calendar build",
    "noticeboard:dev": "pnpm --filter @lmrc/noticeboard dev",
    "noticeboard:build": "pnpm --filter @lmrc/noticeboard build",
    "test": "pnpm -r test",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint"
  },
  "keywords": ["rowing", "club", "booking", "monorepo"],
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

**Update apps/boat-booking/package.json**:
```json
{
  "name": "@lmrc/boat-booking",
  "version": "1.3.0",
  "description": "LMRC Boat Booking - Public booking website",
  "scripts": {
    "dev": "http-server -p 8080",
    "build": "echo 'Static site - no build needed'"
  },
  "dependencies": {
    "@lmrc/config": "workspace:*"
  },
  "devDependencies": {
    "http-server": "^14.1.1"
  }
}
```

**Update apps/booking-calendar/package.json**:
```json
{
  "name": "@lmrc/booking-calendar",
  "version": "1.0.0",
  "description": "LMRC Booking Calendar - 7-day booking viewer for Raspberry Pi",
  "scripts": {
    "dev": "ts-node src/server.ts",
    "build": "tsc",
    "start": "node dist/server.js"
  },
  "dependencies": {
    "@lmrc/config": "workspace:*",
    "express": "^4.18.2",
    "axios": "^1.6.0"
  }
}
```

**Update apps/noticeboard/package.json**:
```json
{
  "name": "@lmrc/noticeboard",
  "version": "1.0.0",
  "description": "LMRC Noticeboard - Digital noticeboard display for Raspberry Pi",
  "dependencies": {
    "@lmrc/config": "workspace:*"
  }
}
```

**Update packages/lmrc-config/package.json**:
```json
{
  "name": "@lmrc/config",
  "version": "1.0.0",
  "description": "Shared configuration library for LMRC projects",
  "main": "src/index.ts",
  "exports": {
    ".": "./src/index.ts"
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

### 3.1 GitHub Actions for BoatBooking (Netlify)

**Create .github/workflows/boat-booking.yml**:
```yaml
name: BoatBooking CI/CD

on:
  push:
    branches: [main]
    paths:
      - 'apps/boat-booking/**'
      - 'packages/lmrc-config/**'
      - '.github/workflows/boat-booking.yml'
  pull_request:
    branches: [main]
    paths:
      - 'apps/boat-booking/**'
      - 'packages/lmrc-config/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build BoatBooking
        run: pnpm --filter @lmrc/boat-booking build

      # Netlify will auto-deploy on push to main
      # No additional deploy step needed if using Netlify GitHub integration
```

### 3.2 GitHub Actions for Raspberry Pi Apps

**Create .github/workflows/booking-calendar.yml**:
```yaml
name: Booking Calendar CI

on:
  push:
    branches: [main]
    paths:
      - 'apps/booking-calendar/**'
      - 'packages/lmrc-config/**'
      - '.github/workflows/booking-calendar.yml'
  pull_request:
    branches: [main]
    paths:
      - 'apps/booking-calendar/**'
      - 'packages/lmrc-config/**'

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v2
        with:
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build
        run: pnpm --filter @lmrc/booking-calendar build

      - name: Run tests (if any)
        run: pnpm --filter @lmrc/booking-calendar test || echo "No tests defined"
```

**Create .github/workflows/noticeboard.yml** (similar structure)

### 3.3 Solution-Wide CI

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
          version: 8

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint all projects
        run: pnpm lint || echo "Linting not yet configured"

      - name: Test all projects
        run: pnpm test || echo "Tests not yet configured"

      - name: Build all projects
        run: pnpm build
```

### 3.4 Update Netlify Configuration

**Update Netlify site settings** (via Netlify dashboard):
1. Go to: Site settings → Build & deploy
2. Update build settings:
   - **Base directory**: `apps/boat-booking`
   - **Build command**: `pnpm --filter @lmrc/boat-booking build` (or leave empty for static site)
   - **Publish directory**: `apps/boat-booking` (or `apps/boat-booking/dist` if build generates output)
3. Update repository connection:
   - Disconnect from old `LMRC-BoatBookings` repo
   - Connect to new `LMRC` monorepo
   - Keep same branch: `main`

**OR: Use netlify.toml in apps/boat-booking/**:
```toml
[build]
  base = "apps/boat-booking"
  publish = "."
  command = "echo 'Static site - no build needed'"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from = "/"
  to = "/book-a-boat.html"
  status = 200
```

---

## Phase 4: Update Raspberry Pi Deployment (1 hour)

### 4.1 Update Pi Deployment Scripts

**apps/pi-deployment/scripts/deploy-booking-calendar.sh**:
```bash
#!/bin/bash
set -e

echo "Deploying Booking Calendar from monorepo..."

# Navigate to monorepo root on Pi
cd ~/LMRC

# Pull latest changes
git pull origin main

# Install dependencies (pnpm must be installed on Pi)
pnpm install --frozen-lockfile

# Build booking calendar
pnpm --filter @lmrc/booking-calendar build

# Restart systemd service
sudo systemctl restart lmrc-booking-calendar

echo "Booking Calendar deployed successfully!"
```

**apps/pi-deployment/scripts/deploy-noticeboard.sh** (similar structure)

### 4.2 Update Systemd Service Files

**Update /etc/systemd/system/lmrc-booking-calendar.service**:
```ini
[Unit]
Description=LMRC Booking Calendar
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/LMRC/apps/booking-calendar
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

# 5. Build apps
pnpm --filter @lmrc/booking-calendar build
pnpm --filter @lmrc/noticeboard build

# 6. Update systemd services (see 4.2 above)
sudo nano /etc/systemd/system/lmrc-booking-calendar.service
sudo nano /etc/systemd/system/lmrc-noticeboard.service

# 7. Reload systemd and restart services
sudo systemctl daemon-reload
sudo systemctl restart lmrc-booking-calendar
sudo systemctl restart lmrc-noticeboard

# 8. Verify services are running
sudo systemctl status lmrc-booking-calendar
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

# Verify lmrc-config is accessible from apps
pnpm --filter @lmrc/booking-calendar dev

# Should be able to import from @lmrc/config
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

**Test Netlify deployment**:
1. Push monorepo to new GitHub repo
2. Trigger Netlify build
3. Verify site deploys correctly
4. Check https://lakemacrowing.au loads properly
5. Test booking flow (QR code → booking page → RevSport)

**Test Pi deployment** (in staging/test mode):
1. SSH to Pi test environment (if available)
2. Clone monorepo
3. Run deployment scripts
4. Verify services start correctly
5. Check web interfaces accessible

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

### Week 1: Validation

**Monitor deployments**:
- [ ] Netlify builds working correctly
- [ ] Pi services running without errors
- [ ] No broken links in documentation
- [ ] GitHub Actions passing

**Verify functionality**:
- [ ] BoatBooking works (test QR code flow)
- [ ] Booking calendar displays correctly on Pi
- [ ] Noticeboard displays correctly on Pi
- [ ] Google Analytics still tracking

### Week 2-4: Optimization

**Add monorepo tooling**:
- [ ] Add Turborepo for faster builds (optional)
- [ ] Configure remote caching (optional)
- [ ] Add pre-commit hooks (lint-staged, husky)
- [ ] Set up Dependabot for automated dependency updates

**Documentation updates**:
- [ ] Update CONTRIBUTING.md for monorepo workflow
- [ ] Document pnpm workspace commands
- [ ] Add migration completion to CONVENTIONS.md
- [ ] Create "Working with the Monorepo" guide

---

## Success Criteria

**Migration is successful when**:
- ✅ All code in single `LMRC` repository
- ✅ Netlify deploys BoatBooking from monorepo
- ✅ Pi services run from monorepo
- ✅ `pnpm install` works in root (installs all dependencies)
- ✅ `pnpm build` builds all apps
- ✅ Workspace dependencies work (`@lmrc/config` imports)
- ✅ CI/CD pipelines pass
- ✅ Old repos archived with migration notice

**Key Metrics**:
- Zero downtime during migration
- All deployments functional
- Developer workflow improved (simpler git operations)
- Documentation in sync with code

---

## Timeline Estimate

| Phase | Task | Time Estimate |
|-------|------|--------------|
| 1 | Preparation (setup workspace) | 1-2 hours |
| 2 | Migrate projects with history | 2-3 hours |
| 3 | CI/CD configuration | 1-2 hours |
| 4 | Update Pi deployment | 1 hour |
| 5 | Testing and validation | 1-2 hours |
| 6 | Go-live and cleanup | 30 minutes |
| **Total** | **Weekend project** | **6-9 hours** |

**Recommended Schedule**:
- **Friday evening**: Phase 1 (preparation)
- **Saturday morning**: Phase 2 (migration)
- **Saturday afternoon**: Phase 3 (CI/CD)
- **Saturday evening**: Phase 4-5 (Pi updates, testing)
- **Sunday morning**: Phase 6 (go-live)
- **Sunday afternoon**: Validation and monitoring

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
A: Yes! Each app still deploys separately (Netlify, Pi). Monorepo doesn't change deployment targets.

---

**Status**: 📋 Ready for Execution
**Last Updated**: 2025-12-14
**Author**: Claude AI (Technical Architecture)

**Related Documentation**:
- [docs/planning/roadmap.md](../planning/roadmap.md#repository-structure-monorepo-migration) - Roadmap item
- [CONVENTIONS.md](../../CONVENTIONS.md) - Current conventions (will be updated post-migration)
- [ARCHITECTURE.md](../../ARCHITECTURE.md) - Architecture overview
