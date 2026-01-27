# Product Roadmap: Rowing Boards SaaS Platform

## Vision

Transform the LMRC Booking Board from a single-club Raspberry Pi solution into a **cloud-first SaaS product** that any rowing club can sign up for, configure, and start using within minutes. Hardware (Pi displays) becomes an optional add-on, not a prerequisite.

**Product Name (working)**: Rowing Boards
**Domain (working)**: `rowingboards.io` (clubs get `clubname.rowingboards.io`)

### Fundamental Principle: Display and Entry are Decoupled

The SaaS product is the **booking board** — a read-only display of bookings. It does not create, edit, or delete bookings. Booking entry and management remain the responsibility of each club's existing tools (RevSport, the separate LMRC boat booking page, or whatever system the club uses).

This separation is critical because:
- **Reduced risk**: Display-only means no write-back to RevSport (fragile, slow, high liability)
- **Faster to market**: No need to replicate or automate booking workflows
- **Broader compatibility**: Works with any club that has a bookable calendar, regardless of how bookings are made
- **Clear value proposition**: "See your board from anywhere" is simple to sell and understand

The existing LMRC boat booking page (hosted separately on Netlify, integrates directly with RevSport) will evolve to align with the SaaS platform over time, but it is **out of scope** for the initial SaaS release.

## Strategic Pivot: Why Cloud-First

The original roadmap (Oct 2025) assumed a Pi-centric approach: ship hardware, add a setup wizard, then eventually offer cloud. Based on architectural review (Jan 2026), the strategy is now **cloud-first** for the following reasons:

| Factor | Pi-First (Original) | Cloud-First (Revised) |
|--------|---------------------|----------------------|
| Customer onboarding | Ship hardware, customer configures Pi | Sign up, enter RevSport URL, done |
| Time to first board | Days (hardware shipping + setup) | Minutes (web signup) |
| Ongoing support | SSH into remote Pi devices | Central dashboard, no device access needed |
| Multi-tenancy | Phase 3 (later) | Phase A (foundation) |
| Revenue model | Hardware sale + license | SaaS subscription (recurring) |
| Capital requirement | Inventory of Pi devices | Hosting costs only |
| Scaling bottleneck | Hardware logistics | Infrastructure (auto-scales) |

The Pi remains valuable as an **in-shed display device** (kiosk mode pointing at the club's cloud URL), but the intelligence, configuration, and data all live in the cloud.

## Target Market

- **Primary**: Rowing clubs using RevolutioniseSport (~500+ clubs globally)
- **Secondary**: Rowing clubs using other management platforms (future integrations)
- **Tertiary**: Other sports clubs with similar booking needs
- Club size: 50-500 members
- Technical capability: Low (non-technical club administrators)
- Budget: $50-150/month subscription

## Product Offering

### Core SaaS Platform (Display Only)
- **Digital booking board** - read-only, real-time calendar display of boat fleet bookings
- **Club admin dashboard** - self-service setup: RevSport credentials/URL, boat configuration, branding, display settings
- **Remote member viewing** - members check board from anywhere (desktop + mobile)
- **Automated RevSport sync** - background scraping with adaptive refresh rates
- **Multi-tenant** - each club isolated with own subdomain, branding, and config

Booking entry and editing are **not** part of the SaaS platform. Clubs continue to use their existing tools (RevSport, club booking pages, etc.) for managing bookings. The platform reads and displays only.

### Optional Add-Ons (Post-MVP)
- **Digital noticeboard** - rotating photos, events, sponsors (existing LMRC module)
- **Custom domain** - `bookings.yourclub.com` instead of `clubname.rowingboards.io`
- **Hardware bundle** - pre-configured Raspberry Pi for in-shed TV display ($200-300)

### Future Consideration (Not in Initial SaaS Scope)
- **Booking entry integration** - if demand warrants, explore connecting the separate boat booking page with the SaaS platform. This would evolve the existing LMRC Netlify-hosted booking page into a multi-tenant booking submission tool. Deferred because it involves write-back to RevSport (fragile, slow, high liability).

### In-Shed Display (Hardware)
The cloud platform serves web pages; any device with a browser can display the board:
- **Recommended**: Raspberry Pi 4 in Chromium kiosk mode (turnkey, shipped pre-configured)
- **Alternative**: Android TV box with Fully Kiosk Browser (customer-provided, DIY)
- **Not recommended**: Smart TV native browser (unreliable auto-start, high support burden)

## Club Onboarding: Self-Service Journey

New clubs must be able to sign up and get a working booking board **without manual intervention from us**. The target experience:

### Onboarding Flow

```
1. SIGN UP          Club admin visits rowingboards.io → creates account
                    (email, password, club name, chosen subdomain)
                           │
2. CONNECT REVSPORT Enter RevSport URL and credentials
                    Platform validates by attempting a test scrape
                           │
3. CONFIGURE BOARD  Select display preferences:
                    - Branding (logo, colours)
                    - Which boats to show (auto-detected from RevSport, admin confirms)
                    - Boat categories (race boats, tinnies, etc.)
                    - Refresh interval preferences
                           │
4. FIRST SCRAPE     Platform runs initial scrape → populates board
                    Club admin sees their board live at clubname.rowingboards.io
                           │
5. SHARE WITH       Club shares URL with members for remote viewing
   MEMBERS          Optionally: set up Pi in boatshed pointing at the URL
```

### Key Requirements
- **Zero-touch from us**: No manual database entries, no config files to edit, no deployment steps
- **Validation at each step**: Test RevSport credentials before proceeding; show errors clearly if credentials are wrong or URL is unreachable
- **Time to live board**: Target <10 minutes from signup to seeing real booking data
- **Guided experience**: Non-technical club admins must be able to complete setup without documentation
- **Boat auto-detection**: Scrape RevSport to discover the club's fleet automatically; admin confirms/edits rather than entering from scratch
- **Preview before publish**: Show the board with real data before making it live

### Onboarding by Phase

| Phase | Onboarding Method |
|-------|------------------|
| **A** (Cloud MVP) | Manual onboarding: platform operator creates club in DB, assists with setup |
| **B** (Self-Service) | Self-service: full signup wizard, admin dashboard, no operator involvement |
| **C+** (Growth) | Self-service + automated billing (Stripe), free trial, marketing site with signup |

## Architecture Overview

```
Cloud Platform (Render.com)
├── Multi-Tenant Backend (Node.js/Express)
│   ├── RevSport scraper service (per club, background worker)
│   ├── REST API layer
│   ├── Club admin authentication
│   └── Subdomain routing
├── Database (PostgreSQL)
│   ├── Club configs & branding
│   ├── Boat metadata (multi-tenant)
│   ├── Booking cache
│   ├── User accounts & roles
│   └── Scrape job schedules & audit logs
└── Frontend (React or existing Express templates)
    ├── Public booking board (members, read-only)
    ├── Admin dashboard (club configuration)
    └── Responsive layouts: TV / Desktop / Mobile

In-Shed Display (Optional)
├── Raspberry Pi 4 → Chromium kiosk → clubname.rowingboards.io
└── Or any browser-capable device pointing at the club's URL
```

## Evolution Path

### Phase 1: Current (v1.0.0) - COMPLETE
- Single-club deployment at LMRC
- Raspberry Pi with local Express server
- JSON file configuration
- Git-based updates
- Production-proven scraping, display, and config

### Phase A: Cloud MVP (Display + Admin)
- Deploy existing Express app to Render, backed by PostgreSQL
- Add multi-tenancy: subdomain routing, `club_id` data isolation
- Migrate LMRC from Pi-only to cloud (Pi becomes a display pointing at cloud URL)
- Admin page for club setup: RevSport URL, credentials, branding, display settings
- `node-cron` job scheduler for per-club scraping (no Redis yet)
- Encrypted credential storage (AES-256 in database)
- Responsive layouts: TV (existing widescreen), desktop (single-column), mobile
- LMRC as first tenant; recruit 1-2 beta clubs
- **Scope**: Read-only board display + club admin configuration. No booking entry.

### Phase B: Self-Service & Growth
- Full admin dashboard (React): club setup wizard, boat management, branding editor
- Club admin authentication (email + password)
- Stripe subscription integration
- Monitoring and alerting (Sentry + Render metrics)
- Member-facing features: Tinnies section, RevSport email booking links
- Onboard 5-10 clubs
- **Scope**: Still display-only. Admin manages how the board looks and syncs, not bookings.

### Phase C: Advanced Features
- Digital noticeboard as add-on module
- Custom domain support per club
- Hardware bundles (pre-configured Pi kits shipped to clubs)
- Upgrade to BullMQ + Redis for job queue (when >10 clubs)
- Magic link auth for member access (for clubs wanting gated viewing)
- Adaptive refresh schedules (peak vs off-peak per club timezone)

### Phase D: Scale & Platform
- 50+ clubs operational
- Remote management portal for support team
- Automated software updates for Pi devices
- Plugin/extension system (including potential booking system integrations beyond RevSport)
- Advanced analytics and reporting
- White-label option (remove "Powered by Rowing Boards")
- International expansion (UK, US rowing clubs)
- Evaluate whether to integrate booking entry as a platform feature (based on customer demand)

## LMRC Near-Term Items (Committee Feedback, Jan 2026)

These items are for the current LMRC deployment and will carry forward into the cloud platform:

1. **Add Tinnies to booking board** - add a second section in the right-hand column below the race boats, allowing members to book tinnies the same way they book rowing shells
2. **RevSport email booking link** - add a link to RevolutioniseSport email footers so members can easily manage bookings (e.g., cancel a booking via a link in the confirmation email)

## Pricing Model (Draft)

### SaaS Subscription
| Tier | Price/Month | Features |
|------|------------|----------|
| **Basic** | $50 | Booking board, 1 admin, RevSport sync, subdomain |
| **Pro** | $100 | + Noticeboard, multiple admins, analytics |
| **Enterprise** | $150 | + Custom domain, white-label, priority support |

### Optional Hardware
| Item | One-Time Cost |
|------|--------------|
| Pi display bundle (Pi 4 + case + cables + SD card, pre-configured) | $200-300 |
| Installation support (remote) | $100 |

### Cost Structure (Render Hosting)
| Phase | Clubs | Estimated Cost/Month |
|-------|-------|---------------------|
| Alpha | 1-2 | $7 (starter DB + free web) |
| Beta | 3-10 | $25 (standard DB + web) |
| Launch | 10-30 | $50 (standard DB + pro web + worker) |
| Growth | 30-100 | $150+ (pro DB + pro web + workers) |

## Competitive Advantages

1. **Rowing-specific UX** - understands morning/evening sessions, boat types, crew sizes
2. **RevSport integration** - native compatibility with the most common club management system
3. **Zero hardware required** - cloud-first means any club can start immediately
4. **Turnkey display option** - ship a Pi for clubs wanting in-shed TV displays
5. **Self-service** - club admins set up and manage everything via web dashboard
6. **Affordable** - $50-150/month vs custom development or enterprise digital signage

## Key Decision Points

| Milestone | Decision | Criteria |
|-----------|----------|----------|
| After Phase A | Continue to Phase B? | LMRC + 1 beta club stable, positive feedback |
| After Phase B | Scale go-to-market? | 5+ clubs onboarded, <0.5 support tickets per club |
| After Phase C | Build Phase D? | 20+ clubs, profitable unit economics |
| Ongoing | Add feature X? | Customer demand >50%, reasonable effort |

## Open Questions

### Business
- Final pricing tiers and free trial duration?
- Product name: "Rowing Boards" or something else?
- Domain: `rowingboards.io` or similar?
- Recruit beta club: who in the network?

### Technical
- Support booking systems beyond RevSport? (Plugin architecture for Phase D)
- Native mobile app vs mobile-responsive web? (Start with responsive web)
- Offline mode for Pi when internet drops? (Cache last-known data locally)

### Legal
- RevSport ToS review: is automated scraping permitted?
- Terms of Service and Privacy Policy needed before public launch
- Australian Privacy Principles (APP) compliance for member data
- GDPR if expanding to UK/EU clubs

## Success Metrics

### Product
| Metric | Target |
|--------|--------|
| Time to first board (signup → live) | <10 minutes |
| Admin dashboard weekly usage | >80% of admins |
| Member weekly board views | >50% of club members |
| Onboarding completion rate | >90% within 7 days |

### Business
| Metric | Target |
|--------|--------|
| Clubs by Month 3 | 10 |
| Clubs by Month 6 | 30 |
| Annual churn rate | <10% |
| NPS score | >50 |
| MRR | Per pricing model |

### Technical
| Metric | Target |
|--------|--------|
| Platform uptime | 99.9% |
| API response time (p95) | <200ms |
| Scraping success rate | >99% |
| Background job lag (peak) | <5 min |

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| RevSport changes UI, scrapers break | High | Monitoring + alerts, version detection, graceful degradation |
| RevSport prohibits scraping in ToS | Critical | Review ToS, seek API partnership, have fallback plan |
| Puppeteer memory consumption in cloud | Medium | Worker instance sizing, job queue limits, pool management |
| Low market adoption | High | Strong beta program, testimonials, free trial, ROI calculator |
| Competitor (RevSport builds native feature) | Medium | Move fast, superior UX, lock in customers |
| Solo developer support burden | Medium | Self-service tools, documentation, community forum |

## Notes

- Keep all code club-agnostic from Day 1
- Design for configuration over customization
- Think "product" not "project"
- Prioritise user experience for non-technical club administrators
- Validate demand before heavy investment at each phase gate
- The Pi deployment at LMRC continues to operate in parallel during transition

---

**Last Updated**: 2026-01-28
**Status**: Strategic pivot to cloud-first SaaS (under review)
**Origin**: Based on LMRC production deployment + Claude.ai SaaS architecture analysis (Jan 2026)
