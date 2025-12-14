# LMRC Solution Roadmap

**Last Updated**: 2025-12-04
**Status**: Active Development
**Current Sprint**: BoatBooking - Google Analytics + Configurable Session Times

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

Features currently being developed or ready for immediate implementation.

### Google Analytics Integration
**Project**: BoatBooking
**Priority**: High
**Effort**: ~1 hour
**Status**: 🚧 Ready to implement

**Purpose:**
Enable data-driven decision making for future features.

**Key Capabilities:**
- Track page views per boat
- Monitor "Manage my bookings" link usage (validates v2.0 booking manager need)
- Track booking button clicks
- Monitor session time and user behavior
- Error tracking
- Popular boats identification

**Implementation:**
- Google Analytics 4 (free)
- Tag Manager for easy event tracking
- Custom events for key actions (book button, manage bookings link)
- Weekly/monthly usage reports

**Value:**
- **Critical** for v2.0 booking manager decision (need usage data)
- Identifies which boats need QR codes priority
- Validates feature priorities
- Tracks ROI of improvements

**Acceptance Criteria:**
- [ ] GA4 property created and configured
- [ ] Tracking code added to all pages
- [ ] Custom events for key actions
- [ ] Privacy policy updated (if needed)
- [ ] Dashboard configured for key metrics

**Dependencies:** None

---

### Configurable Session Times
**Project**: BoatBooking
**Priority**: High
**Effort**: ~2-3 hours
**Status**: 🚧 Ready to implement

**Purpose:**
Allow session times to be adjusted without code changes (seasonal/daylight adjustments).

**User Story:**
> As a club administrator, I want to adjust session times when daylight hours change without needing a developer, so I can keep booking times aligned with rowing conditions.

**Key Features:**
- Web-based configuration page (similar to lmrc-booking-system config)
- Edit session start/end times
- Add/remove sessions dynamically
- Preview changes before saving
- Validates time format and logic
- Saves to `config.json` file

**Implementation Approach:**
- New `config.html` page (access via `/config`)
- JavaScript to load/save session times
- JSON structure for sessions configuration
- Client-side validation
- Server-side save endpoint (Netlify Functions or defer to Firebase)

**Acceptance Criteria:**
- [ ] Config page accessible at `/config`
- [ ] Display current session times
- [ ] Edit existing sessions
- [ ] Add new sessions
- [ ] Remove sessions
- [ ] Validate time formats
- [ ] Save changes persistently
- [ ] Booking page reads from config

**Dependencies:** None

**Technical Note:**
May need Netlify Functions (serverless) or could be deferred to Firebase migration for full admin panel.

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
**Impact**: Medium
**Effort**: Small (30 min)

- `BASE_URL` hardcoded in JavaScript
- ✅ `CONTACT_EMAIL` recently made configurable
- Session times hardcoded (being addressed in "Now" section)

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

#### No Analytics/Monitoring
**Impact**: Low
**Effort**: Small (1 hour)
**Status**: ✅ Moved to "Now" - Active development

See: [Google Analytics Integration](#google-analytics-integration) in "Now" section

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
