# LMRC Solution Roadmap

**Last Updated**: 2025-12-21
**Status**: Active Development
**Current Sprint**: Repository consolidation (Monorepo migration)

---

## Overview

This is the **single source of truth** for all feature development across the LMRC solution.

**Projects in Scope**:
- **BoatBooking** - Public boat booking website (Netlify)
- **lmrc-booking-system** - 7-day booking calendar viewer (Pi)
- **Noticeboard** - Digital noticeboard display (Pi)
- **lmrc-pi-deployment** - Raspberry Pi deployment infrastructure

**Related Strategic Documents**:
- [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) - Multi-club commercial strategy
- [ARCHITECTURAL_ROADMAP.md](../../ARCHITECTURAL_ROADMAP.md) - Long-term architecture evolution
- [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) - Detailed phase plans

---

## 🟢 Now (Active Development)

**No features currently in active development.**

All previously planned features for the current sprint have been completed:
- ✅ Google Analytics Integration - Completed 2025-12-21

See **"Recently Completed"** section below for details.

**Next Priority:** See **"Next (Prioritized Backlog)"** section for upcoming features

---

## 🟡 Next (Prioritized Backlog)

Features approved and prioritized for implementation after "Now" features complete.

### Repository Structure: Monorepo Migration
**Project**: Solution-Wide (All Projects)
**Priority**: High
**Effort**: ~6-9 hours (weekend project)
**Status**: 📋 Planned - Ready for execution
**Technical Plan**: [docs/architecture/monorepo-migration-plan.md](../architecture/monorepo-migration-plan.md)

**Overview:**
Migrate from current nested-repository anti-pattern to true monorepo structure using pnpm workspaces.

**Current Pain Points Being Solved:**
- ❌ Nested git repositories causing confusion (BoatBooking inside BoatShedManager)
- ❌ Documentation lives separately from code (can drift out of sync)
- ❌ No atomic commits across projects and docs
- ❌ Inconsistent repository naming conventions
- ❌ Complex workflow for shared library (lmrc-config)
- ❌ Difficult to coordinate releases across projects

**Post-Migration Benefits:**
- ✅ Single source of truth for entire codebase
- ✅ Atomic commits across projects + documentation
- ✅ Shared dependencies work naturally (lmrc-config as workspace package)
- ✅ Solution-wide CI/CD capabilities
- ✅ Easier refactoring across projects
- ✅ Consistent tooling (linting, formatting, testing)
- ✅ Monorepo tools provide caching and parallel builds

**Target Structure:**
```
LMRC (single monorepo)
├── apps/
│   ├── boat-booking/          # BoatBooking (Netlify)
│   ├── booking-calendar/      # lmrc-booking-system (Pi)
│   ├── noticeboard/           # Noticeboard (Pi)
│   └── pi-deployment/         # lmrc-pi-deployment
├── packages/
│   └── lmrc-config/           # Shared library
├── docs/                      # Solution-wide documentation
└── exploration/               # Temporary investigations
```

**Technology Stack:**
- pnpm workspaces (fast, efficient, built-in workspace support)
- Turborepo (optional - intelligent caching and parallel builds)
- Git subtree (preserve full git history during migration)

**Migration Phases:**
1. **Preparation** (1-2 hours): Set up workspace structure, pnpm config
2. **Project Migration** (2-3 hours): Use git subtree to preserve history
3. **CI/CD** (1-2 hours): Update GitHub Actions, Netlify config
4. **Pi Deployment** (1 hour): Update systemd services, deployment scripts
5. **Testing** (1-2 hours): Validate all deployments work
6. **Go-Live** (30 min): Push to GitHub, archive old repos

**Deployment Impact:**
- ✅ Zero downtime (each app still deploys independently)
- ✅ Netlify: Update base directory to `apps/boat-booking`
- ✅ Raspberry Pi: Update systemd services to new paths
- ✅ All deployment targets remain unchanged

**Rollback Plan:**
- Old repositories remain archived (not deleted)
- Can revert Netlify and Pi services to old repos within minutes
- No data loss (git history preserved in subtree merge)

**Recommended Timeline:**
- **Friday evening**: Preparation (1-2 hours)
- **Saturday**: Migration, CI/CD, Pi updates (5-6 hours)
- **Sunday**: Testing, go-live, validation (2-3 hours)
- **Total**: One weekend (6-9 hours)

**Success Criteria:**
- [ ] All code in single `LMRC` repository
- [ ] Netlify deploys BoatBooking from monorepo
- [ ] Pi services run from monorepo
- [ ] `pnpm install` works in root (installs all dependencies)
- [ ] `pnpm build` builds all apps
- [ ] Workspace dependencies work (`@lmrc/config` imports)
- [ ] CI/CD pipelines pass
- [ ] Old repos archived with migration notice

**Dependencies:** None (can execute immediately)

**Risks:** Low
- All old repositories preserved (archived, not deleted)
- Can roll back within minutes if issues arise
- No impact on live deployments during migration

**References:**
- [pnpm Workspaces](https://pnpm.io/workspaces)
- [Turborepo](https://turbo.build/)
- [Google's Monorepo Philosophy](https://cacm.acm.org/magazines/2016/7/204032-why-google-stores-billions-of-lines-of-code-in-a-single-repository/fulltext)

---

### Configurable Session Times
**Project**: BoatBooking
**Priority**: Medium
**Effort**: ~4-6 hours (implementation) + migration from POC
**Status**: ✅ **POC VALIDATED** (2025-12-24) - Ready for Implementation
**POC Location**: [exploration/netlify-db-poc/](../../exploration/netlify-db-poc/)
**Technical Design**: [docs/architecture/configurable-session-times-design.md](../architecture/configurable-session-times-design.md) *(preserved for reference)*

**User Story:**
> As a club administrator, I want to adjust session times when daylight hours change without needing a developer, so I can keep booking times aligned with rowing conditions.

---

## ✅ Proof of Concept (2025-12-24)

**Status**: **SUCCESSFUL** - All requirements validated with Netlify DB (Neon PostgreSQL)

### What We Validated

**✅ All Core Requirements Met:**
- Web-based admin interface with live preview
- Password-protected editing (environment variable auth)
- Validation (time formats, enabled sessions, overlaps)
- Real-time session updates (no redeploy needed)
- **Persistent writable storage** (PostgreSQL database)
- High performance (<50ms for cached requests)
- Zero cost within free tier limits

**Performance Results:**
- First visit: 200-400ms (with skeleton UI, no visible loading state)
- Repeat visits: **<50ms** (edge cache + localStorage)
- Admin updates: Instant via database (no build/deploy)

### Technical Stack (Validated)

**Database:**
- **Netlify DB** (powered by Neon PostgreSQL)
- Serverless PostgreSQL with auto-scaling
- Free tier: 0.5 GB storage, 100 CU-hours/month (sufficient for LMRC)
- Auto-provisioned with `netlify db init` command
- Connection pooling built-in

**Backend:**
- Netlify Functions (Node.js 20)
- `@neondatabase/serverless` driver (HTTP-optimized)
- RESTful API: GET `/sessions`, POST `/sessions` (password protected)
- Sequential queries (Neon serverless limitation, adequate for POC)

**Frontend:**
- Optimistic UI with localStorage cache
- Skeleton screen animations (perceived performance)
- HTTP cache headers: `stale-while-revalidate` + Netlify durable cache
- Preload links for faster initial fetch

**Performance Optimizations:**
1. Edge caching (5min fresh, 30min stale-while-revalidate)
2. Netlify CDN durable caching across edge nodes
3. localStorage optimistic UI (instant render)
4. Skeleton screens (no blank loading states)
5. Preload hints for API endpoints

### Database Schema

```sql
-- Sessions table
CREATE TABLE sessions (
    id VARCHAR(50) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    start_time TIME NOT NULL,        -- HH:MM format
    end_time TIME NOT NULL,          -- HH:MM format
    display VARCHAR(50) NOT NULL,    -- Human-readable (e.g., "6:30 AM - 7:30 AM")
    enabled BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Metadata table (audit trail)
CREATE TABLE metadata (
    key VARCHAR(50) PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Key Features:**
- Auto-updating timestamps via triggers
- Indexed queries (enabled, sort_order)
- Version tracking in metadata
- Last modified timestamp + user tracking

### Implementation Approach

**Phase 1: Database Setup**
1. Run `netlify db init` to provision Neon database
2. Set `ADMIN_PASSWORD` environment variable
3. Deploy setup function to create schema
4. Verify connection with test endpoint

**Phase 2: API Implementation**
- `GET /sessions` - Returns all sessions + metadata
- `POST /sessions` - Updates sessions (password protected)
- Validation: time formats, enabled count, non-overlapping
- Time normalization (accepts both HH:MM and HH:MM:SS)

**Phase 3: Admin Interface**
- Password-protected login screen
- Session editor with add/edit/delete/reorder
- Live preview panel (shows how booking page will look)
- Form validation with user-friendly errors
- Mobile-responsive design

**Phase 4: Booking Page Integration**
- Replace hardcoded sessions with API fetch
- Optimistic UI (render from cache instantly)
- Skeleton screens during initial load
- Auto-refresh on cache expiry

**Phase 5: Performance Optimization**
- Edge caching with stale-while-revalidate
- Durable cache directive
- localStorage caching
- Preload hints

### Migration Path (POC → Production)

**8-Step Process** (documented in [POC README](../../exploration/netlify-db-poc/README.md)):

1. **Create production database** - `netlify db init` in BoatBooking
2. **Copy database schema** - Run setup function in production
3. **Migrate functions** - Copy sessions.js to BoatBooking/netlify/functions/
4. **Copy admin interface** - Copy config.html to BoatBooking/
5. **Update booking page** - Integrate session loading from API
6. **Set environment variables** - `ADMIN_PASSWORD` in production
7. **Test thoroughly** - Validate all endpoints work
8. **Deploy** - Push to GitHub, Netlify auto-deploys

**Estimated Migration Effort**: 4-6 hours
- 2 hours: Copy and adapt code
- 1 hour: Testing and validation
- 1 hour: Documentation updates
- 1-2 hours: Buffer for issues

---

## Previous Attempts (Failed - 2025-12-21)

**Attempt 1: Filesystem Storage** ❌
- **Approach**: Write JSON to file in Netlify Functions
- **Result**: Read-only filesystem in serverless environment
- **Lesson**: Serverless platforms cannot write to disk

**Attempt 2: Netlify Blobs** ❌
- **Approach**: Use Netlify Blobs API for storage
- **Result**: `MissingBlobsEnvironmentError` - not available by default
- **Lesson**: Platform features require explicit setup and may not be available on all plans

**Attempt 3: Environment Variables** ❌
- **Approach**: Store JSON in `SESSIONS_CONFIG` env var
- **Result**: Requires manual Netlify Dashboard editing + redeploy (defeats purpose)
- **Lesson**: Environment variables are not a database replacement

**Fundamental Problem Identified:**
The feature requires **persistent writable storage** that functions can access without manual platform UI interaction.

**Solution Found:**
Netlify DB provides PostgreSQL database with serverless driver optimized for Netlify Functions - exactly what was needed.

---

## Cost Analysis

**Netlify DB (Neon) Free Tier:**
- Storage: 0.5 GB (LMRC needs <1 MB for sessions)
- Compute: 100 CU-hours/month (LMRC usage: ~2-5 CU-hours/month)
- API requests: Unlimited
- **Cost**: $0/month for LMRC use case

**Scaling (Multi-Club Future):**
- Single club: Free tier sufficient
- 10 clubs: ~$10/month (database-per-tenant pattern)
- 100 clubs: ~$50-100/month
- Database auto-scales, scales-to-zero when idle

---

## Lessons Learned

**✅ What Worked:**
- Netlify DB perfectly suited for this use case
- Performance optimizations deliver <50ms perceived load times
- PostgreSQL provides powerful querying and ACID guarantees
- Serverless drivers (Neon) work well with Netlify Functions
- Optimistic UI + edge caching = instant user experience

**⚠️ Challenges Overcome:**
- Neon serverless driver has limited transaction support (use sequential queries)
- Time format normalization needed (HTML inputs return HH:MM:SS)
- Environment variable setup required for dev vs production contexts
- Dev server configuration required adjustment for Netlify Functions

**📚 Technical Insights:**
- Always research platform-provided database options first
- Edge caching + localStorage = powerful combination for read-heavy data
- Skeleton screens improve perceived performance more than actual speed
- Connection pooling critical for serverless database access
- Sequential queries adequate for low-traffic admin operations

---

## Recommendation

**Status**: ✅ **READY FOR IMPLEMENTATION**

**Next Steps:**
1. Review POC at [exploration/netlify-db-poc/](../../exploration/netlify-db-poc/)
2. Approve migration to BoatBooking production
3. Schedule implementation (estimated 4-6 hours)
4. Follow 8-step migration process
5. Document admin workflow for club administrators

**Alternative Considered:**
Firebase migration (previously recommended) would also work but:
- Netlify DB is simpler (built-in, one command setup)
- Already validated in working POC
- Zero cost for LMRC
- No external accounts needed (uses Netlify)
- PostgreSQL more familiar than Firestore for future features

**Recommendation**: Proceed with Netlify DB approach (validated in POC)

---

## Git History

**Failed Attempts (2025-12-21):**
- Commits 856ba02, 85f6981, 0d75169: Initial implementation and two failed fix attempts
- Commits 54ee48e, b2420ac, 8f678ab: Rollback reverts

**Successful POC (2025-12-24):**
- Located in: `exploration/netlify-db-poc/`
- Commits: 01a0391 (POC setup), 49304a2 (lessons learned), 75dc4f9, 85ca58e (fixes), 1787a4d (performance), 8c444a6 (validation), db5d838 (transactions)
- Status: Complete and validated

---

## References

- **POC Source**: [exploration/netlify-db-poc/](../../exploration/netlify-db-poc/)
- **POC README**: [exploration/netlify-db-poc/README.md](../../exploration/netlify-db-poc/README.md)
- **Netlify DB Docs**: https://docs.netlify.com/netlify-db/
- **Neon PostgreSQL**: https://neon.tech/
- **Performance Research**: Research agent findings (2025-12-24)

---

### Boat Damage Reporting
**Project**: BoatBooking
**Priority**: Medium
**Effort**: ~1 hour
**Proposal**: [BoatBooking/DAMAGE_REPORTING_PROPOSAL.md](../../BoatBooking/DAMAGE_REPORTING_PROPOSAL.md)

**User Story:**
> As a rowing club member, I want to easily report damage to a boat so that the right people are notified to fix the damage.

**Key Features:**
- Report damage form at bottom of booking page
- 6 predefined damage types (Hull, Rigger, Seat, Seat wheels, Fin/steering, Other)
- Optional description field (required for "Other")
- Email notification to configurable address (default: `boatcaptain@lakemacquarierowingclub.org.au`)
- Mobile-friendly submission form

**Implementation Approach:** EmailJS (recommended)
- No backend required
- Free tier (200 emails/month)
- 30-minute setup
- See proposal for full analysis and alternatives

**Acceptance Criteria:**
- [ ] Form at bottom of booking page
- [ ] All 6 damage types selectable
- [ ] Description optional (required for "Other")
- [ ] Email sent to configurable address
- [ ] Default email: `boatcaptain@lakemacquarierowingclub.org.au`

**Dependencies:** None

**Risks:** Low (see proposal for detailed risk assessment)

---

## 🟡 Proposed (Awaiting Approval)

Features with complete proposals awaiting decision to proceed.

### BoatBooking: Firebase Migration (Admin Panel)
**Project**: BoatBooking
**Priority**: High (for long-term maintainability)
**Effort**: ~17 hours over 2-3 weeks
**Documentation**: [BoatBooking/PROPOSAL.md](../../BoatBooking/PROPOSAL.md), [PRD.md](../../BoatBooking/PRD.md), [PROJECT_STATUS.md](../../BoatBooking/PROJECT_STATUS.md)

**Overview:**
Migrate from static JSON files to Firebase backend to enable:
- Admin panel for boat management
- No-code boat updates (no git required)
- Audit logging
- Google OAuth authentication
- Zero cost within free tier

**Current Status:** Awaiting approval decision

---

### BoatBooking: LMRC-Branded Booking Manager (v2.0)
**Project**: BoatBooking
**Priority**: Low
**Effort**: 4-5 days
**Investigation**: Complete - [docs/research/booking-cancellation-investigation.md](../research/booking-cancellation-investigation.md)

**Current Status:**
- ✅ v1.0: Simple link to RevSport my-bookings (implemented in v1.3.0)
- 🔵 v2.0: LMRC-branded booking manager (under consideration)

**v2.0 Requirements:**
- Member login form (proxy to RevSport)
- List upcoming bookings
- Cancel bookings with confirmation
- Success/error messaging
- Mobile-optimized interface
- Session management (15-min timeout)

**Technical Approach:**
- Node.js + Express backend
- Reuse `lmrc-booking-system` AuthService
- Cheerio for HTML parsing (no Puppeteer needed)
- Server-side RevSport authentication
- Hosting: Railway/Render (~$5-7/month)

**Decision Criteria:**
- High usage of current "Manage my bookings" link (>20 clicks/month)
- Member feedback: RevSport UX is confusing/difficult
- Members would prefer LMRC-branded experience
- Willingness to allocate development time and hosting budget

**Risks:**
- RevSport HTML changes may break scraping (low frequency)
- Ongoing maintenance: ~1-2 hours/month
- Security: Handling member credentials (proxy model, not stored)

**Next Steps:**
1. Monitor usage of v1.0 link for 3 months (via Google Analytics)
2. Gather member feedback on RevSport UX
3. Reassess based on data and feedback
4. Proceed with v2.0 if justified

---

## 🔵 Under Consideration

Features being evaluated for priority and feasibility.

### BoatBooking: Boat Images
**Project**: BoatBooking
**Priority**: Low
**Effort**: Medium (2-3 hours)

Add boat photos to booking page for visual identification.

**Requirements:**
- Display boat image on booking page
- Fallback if image unavailable
- Image storage solution (Firebase Storage or CDN)
- Mobile-optimized image sizes

**Dependencies:**
- Firebase Migration (for image storage)
- OR: External CDN/image hosting

---

### lmrc-booking-system: Multi-Session Support
**Project**: lmrc-booking-system
**Priority**: Low
**Effort**: Small (1-2 hours)

Allow dynamic session configuration beyond the current 2 sessions.

**Requirements:**
- Configurable session times
- Admin panel to add/edit/delete sessions
- Support for afternoon/evening sessions
- Seasonal session schedules

**Dependencies:**
- Configuration system (JSON or Firebase)

**Note:** Similar to BoatBooking "Configurable Session Times" but for Pi display app

---

### BoatBooking: Boat Availability Display
**Project**: BoatBooking
**Priority**: Low
**Effort**: Medium (3-4 hours)

Show real-time boat availability before booking attempt.

**Requirements:**
- Query RevSport booking calendar
- Display availability for selected date
- Highlight available time slots
- Prevent booking attempts for unavailable times

**Dependencies:**
- RevSport API integration
- CORS/backend proxy

**Technical Challenge:** RevSport API access and authentication

---

## 🔴 Deferred / Future

Features deferred to future consideration.

### BoatBooking: Progressive Web App (PWA)
**Project**: BoatBooking
**Priority**: Future
**Effort**: Medium (3-4 hours)

Convert to PWA for offline capability and "Add to Home Screen" support.

**Rationale for Deferral:** Current solution works well; PWA adds complexity without critical benefit for boat booking use case.

---

### BoatBooking: Push Notifications
**Project**: BoatBooking
**Priority**: Future
**Effort**: Large (8-10 hours)

Send notifications for booking confirmations, reminders, and cancellations.

**Rationale for Deferral:** Requires backend infrastructure and user opt-in management. Better suited for future enhancement after Firebase migration.

---

## Recently Completed ✅

### BoatBooking v1.3.1 (2025-12-21)
**Project**: BoatBooking

- ✅ **Google Analytics 4 Integration** - Comprehensive tracking for data-driven decisions
  - GA4 tracking code added to book-a-boat.html
  - Measurement ID: G-X5KVZ5WXH3
  - Custom events: Page views (with boat_id), booking clicks, availability clicks, manage bookings clicks, date changes
  - Damaged boat warnings tracked
  - Dashboard configured for weekly/monthly reports
  - Critical data collection for v2.0 booking manager decision (tracking "Manage my bookings" usage)
  - Complete setup documentation: `GOOGLE_ANALYTICS_SETUP.md`

---

### BoatBooking v1.3.0 (2025-12-04)
**Project**: BoatBooking

- ✅ **Booking Management Link** - Direct access to RevSport's my-bookings page
  - "Manage my bookings" link added below "View boat availability"
  - Links to: `https://www.lakemacquarierowingclub.org.au/my-bookings`
  - Members redirected to RevSport for login (if needed)
  - Allows viewing and canceling bookings
  - Zero technical overhead (simple link, no backend)
  - Consistent with existing booking flow pattern

### BoatBooking v1.2.0 (2025-11-23)
**Project**: BoatBooking

- ✅ **Damaged Boat Detection** - Automatic detection and warning for damaged boats
  - Boat names containing "(Damaged)" trigger warning UI
  - Booking interface hidden for damaged boats
  - Warning icon (⚠️) displayed next to boat name
  - Contact information provided for support

- ✅ **Configurable Contact Email** - Contact email extracted to constant
  - `CONTACT_EMAIL` constant for easy configuration
  - Set to `enquiries@lakemacquarierowingclub.org.au`
  - Dynamic population in damaged boat warning

### BoatBooking v1.1.0 (2025-10-24)
**Project**: BoatBooking

- ✅ **Boat Data Extraction** - Moved boat data from hardcoded JS to JSON file
  - Created `boats.json` with structured data (type, category, weight)
  - Async data loading in `book-a-boat.html`
  - Enables future admin panel and database migration

### BoatBooking v1.0.0 (Initial Release)
**Project**: BoatBooking

- ✅ **QR Code-Based Booking** - Members scan boat QR codes to book
- ✅ **Pre-filled Booking Forms** - Boat ID passed via URL parameter
- ✅ **RevSport Integration** - Direct redirect to club's booking system
- ✅ **Mobile-Optimized UI** - Designed for phone use cases
- ✅ **Session-Based Booking** - Morning session 1 & 2 predefined
- ✅ **Dynamic Date Selection** - Intelligent default date selection

---

## Technical Debt

### BoatBooking

#### Hardcoded Configuration
**Impact**: Low (reduced from Medium)
**Effort**: Small (30 min)

- `BASE_URL` hardcoded in JavaScript
- ✅ `CONTACT_EMAIL` made configurable (v1.2.0)
- ✅ Session times now configurable via web UI (v1.4.0)

**Remaining Items**:
- `BASE_URL` still hardcoded

**Solution**:
- Move to `config.json` file
- OR: Migrate to Firebase (part of migration proposal)

---

#### No Error Handling for Boat Data Load
**Impact**: Low
**Effort**: Small (15 min)

- If `boats.json` fails to load, page breaks silently
- No user feedback on error

**Solution**:
- Add try/catch around boat data fetch
- Display user-friendly error message
- Fallback to generic "Book this boat" text

---

#### ~~No Analytics/Monitoring~~
**Status**: ✅ RESOLVED (v1.4.0 - 2025-12-21)

Google Analytics 4 integration completed. See [Recently Completed](#recently-completed-) section

---

## Feature Request Process

### How to Request a Feature

1. **Create Issue/Discussion** - Describe the feature need
2. **User Story** - Explain who needs it and why
3. **Acceptance Criteria** - Define what "done" looks like
4. **Priority Assessment** - Evaluate impact vs effort
5. **Assign to Project** - Specify which project this affects

### Feature Evaluation Criteria

Features are evaluated on:
- ✅ **User Value** - Does this solve a real problem?
- ✅ **Effort** - How long to implement?
- ✅ **Dependencies** - What else is needed?
- ✅ **Maintenance** - Ongoing cost/complexity?
- ✅ **Alignment** - Fits with product vision?
- ✅ **Cost** - Hosting/service costs?

### Priority Levels

- **🔴 Critical** - Blocking/breaking issues, security fixes
- **🟠 High** - Important for user experience or operations
- **🟡 Medium** - Nice to have, improves UX
- **🟢 Low** - Minor improvements, edge cases
- **⚪ Future** - Good ideas for later consideration

---

## Version History by Project

### BoatBooking

| Version | Date | Features |
|---------|------|----------|
| **v1.3.0** | 2025-12-04 | Booking management link to RevSport my-bookings |
| **v1.2.0** | 2025-11-23 | Damaged boat detection, configurable contact email |
| **v1.1.0** | 2025-10-24 | Boat data extraction to JSON, async loading |
| **v1.0.0** | 2025-10-20 | Initial release - QR code booking system |

### lmrc-booking-system

| Version | Date | Features |
|---------|------|----------|
| **v1.0.0** | 2025-09-xx | Initial deployment - 7-day booking viewer |

### Noticeboard

| Version | Date | Features |
|---------|------|----------|
| **v1.0.0** | 2025-09-xx | Initial deployment - Digital noticeboard |

### lmrc-pi-deployment

| Version | Date | Features |
|---------|------|----------|
| **v1.0.0** | 2025-11-xx | systemd-based deployment system |

---

## Long-term Vision (12+ months)

See [PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md) for multi-club commercial strategy.

### Smart Booking Recommendations
Suggest boats based on:
- Member skill level
- Weather conditions
- Boat availability
- Previous booking history

### Integration with Club Management
- Member verification
- Qualification checking
- Safety flag system
- Incident reporting

### Fleet Management Features
- Maintenance scheduling
- Usage tracking
- Boat condition monitoring
- Automated damage alerts

---

## Related Documentation

- **[PRODUCT_ROADMAP.md](../../PRODUCT_ROADMAP.md)** - Multi-club commercial strategy
- **[ARCHITECTURAL_ROADMAP.md](../../ARCHITECTURAL_ROADMAP.md)** - Long-term architecture evolution
- **[IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md)** - Detailed phase plans
- **[BoatBooking/DAMAGE_REPORTING_PROPOSAL.md](../../BoatBooking/DAMAGE_REPORTING_PROPOSAL.md)** - Boat damage reporting proposal
- **[BoatBooking/PROPOSAL.md](../../BoatBooking/PROPOSAL.md)** - Firebase migration proposal
- **[docs/research/booking-cancellation-investigation.md](../research/booking-cancellation-investigation.md)** - Booking management investigation

---

## Questions or Feedback?

Contact: committee@lakemacquarierowingclub.org.au

---

**Document History**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 2.0 | 2025-12-04 | Claude AI | Complete rewrite as solution-wide roadmap. Consolidated all project roadmaps. Added Now/Next/Proposed structure. Clearly marked each feature by project. |
| 1.0 | 2025-11-21 | Claude AI | Initial high-level roadmap (multi-club phases) |

---

**Status**: 📋 Single Source of Truth - Actively Maintained

**Note**: Project-specific roadmaps have been deprecated in favor of this consolidated solution-wide roadmap.
