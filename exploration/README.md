# Exploration Projects

**⚠️ TEMPORARY / THROW-AWAY CODE - NOT FOR PRODUCTION**

This folder is a workspace for technical investigations and proof-of-concept explorations.

## Purpose

The `exploration/` folder serves as:
- **Temporary workspace** for feasibility investigations
- **Throw-away location** that can be cleared/reused anytime
- **Safe space** for experimental code that may never ship
- **Investigation lab** where findings are extracted to permanent docs

## Important Characteristics

**🔄 Temporary & Reusable**
- Projects here are NOT permanent
- The same folder may be reused for different investigations
- Code can be deleted without impact on the solution
- Not intended for long-term storage

**📋 Document Findings Externally**
- ALL findings must be captured in solution-level documentation
- Roadmaps, ADRs, and docs/ should reference investigations
- Do NOT rely on exploration/ folder existing in the future
- Think of this as a scratch pad - extract value before clearing

**🔒 Security Aware**
- May contain credentials or sensitive test data
- All subfolders are gitignored by default
- Only README.md files are tracked

**⚠️ Never Production Code**
- Code here has NOT been reviewed
- May lack error handling and tests
- Used for learning, not deployment

## Workflow

### 1. Start Investigation
```bash
mkdir exploration/feature-name
cd exploration/feature-name
npm init -y
# Write proof-of-concept code
```

### 2. Document Findings
Extract learnings to permanent documentation:
- `docs/research/` - Technical investigations
- `PRODUCT_ROADMAP.md` / `ARCHITECTURAL_ROADMAP.md` - Feature planning
- Project `FEATURE_ROADMAP.md` files
- Architecture decision records

### 3. Clean Up (Optional)
```bash
# Once findings are documented, folder can be deleted
rm -rf exploration/feature-name

# Or reuse the space for next investigation
rm -rf exploration/feature-name/*
```

## Past Investigations

### netlify-db-poc (2025-12-24)
**Status**: ✅ Complete - POC validated, findings documented
**Outcome**: Ready for production implementation

**Findings captured in**:
- `docs/architecture/configurable-session-times-design.md` - Configurable session times design
- All implementation code snippets preserved in roadmap
- Database schema, API functions, and performance optimizations documented

**Key learnings**:
- Netlify DB (Neon PostgreSQL) perfectly suited for serverless persistent storage
- Auto-provisioned with one command (`netlify db init`)
- Performance: <50ms with edge caching + localStorage optimistic UI
- Skeleton screens improve perceived performance more than actual speed
- Neon serverless driver has limited transaction support (use sequential queries)
- Time format normalization needed (HTML inputs return HH:MM:SS)
- Free tier sufficient for LMRC ($0/month)

**Implementation validated**:
- ✅ Database schema with triggers and indexes
- ✅ RESTful API (GET/POST sessions endpoint)
- ✅ Password-protected admin interface
- ✅ Optimistic UI with localStorage cache
- ✅ Edge caching with stale-while-revalidate
- ✅ Skeleton loading animations
- ✅ Time format validation and normalization

### booking-cancellation (2025-12-04)
**Status**: ✅ Complete - Findings documented
**Outcome**: v1.0 shipped (simple link), v2.0 documented in roadmap

**Findings captured in**:
- `BoatBooking/FEATURE_ROADMAP.md` - Feature v2.0 requirements
- `docs/research/booking-cancellation-investigation.md` - Technical findings
- Implemented: "Manage my bookings" link in v1.3.0

**Key learnings**:
- RevSport booking cancellation fully automatable
- No browser automation (Puppeteer) needed
- Simple REST-style flow with CSRF tokens
- Reusable `lmrc-booking-system` AuthService approach

## Guidelines for Future Explorations

### When to Use exploration/
- Investigating technical feasibility
- Proof-of-concept for uncertain approaches
- Testing third-party integrations
- Researching API capabilities
- Prototyping architecture decisions

### When NOT to Use exploration/
- Production features (use proper project folders)
- Long-term code storage
- Shared libraries (use dedicated packages)
- Documentation (use docs/ folder)

### Documentation Requirements

Before closing an investigation, ensure:
- [ ] Findings documented in solution-level docs
- [ ] Roadmap updated (if feature planned)
- [ ] Technical approach captured (for future reference)
- [ ] Decision rationale explained
- [ ] References from permanent docs point to investigation

### Security Note

If investigation uses credentials:
- Create `.env` file (gitignored)
- Use `.env.example` for documentation
- Never commit actual credentials
- Clear credentials when done

## Current Structure

```
exploration/
├── .gitignore          # Ignores all subfolders except README.md
├── README.md           # This file (tracked in git)
└── */                  # All investigation folders (gitignored)
```

---

**Remember**: This is a **temporary workspace**. Always extract findings to permanent documentation before clearing or reusing space.
