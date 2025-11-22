# LMRC - Next Actions & Todo

**Last Updated**: 2025-11-21
**Status**: Active Development

This document tracks immediate next actions grouped by feature/area. See [roadmap.md](roadmap.md) for long-term strategy.

---

## 🔴 High Priority - Immediate (This Week)

### 1. Fix Noticeboard Browser Auto-Refresh Issue

**Problem**: Browser refreshes periodically, preventing gallery from cycling
**Impact**: User experience degraded on deployed Noticeboard
**Status**: Diagnosed, fix pending

**Tasks**:
- [ ] Run diagnostics on Pi to identify refresh cause
  - Check service restart counts: `sudo journalctl -u lmrc-kiosk --since "1 hour ago" | grep -c "Started"`
  - Check for cron jobs: `sudo crontab -u lmrc -l`
  - Check restart policy: `systemctl cat lmrc-kiosk.service | grep Restart`
- [ ] Apply appropriate fix based on findings
- [ ] Test for 10+ minutes to verify fix
- [ ] Document solution

**Reference**: `.claude/session-notes/2025-11-21.md`, `.claude/DIAGNOSE_REFRESH_ISSUE.md`
**Owner**: TBD
**Roadmap Link**: [roadmap.md#operations](roadmap.md#operations)

---

### 2. Add Weather API Key to Production

**Problem**: Weather not displaying on Noticeboard
**Impact**: Missing feature in production
**Status**: Fix ready, needs application

**Tasks**:
- [ ] Get free OpenWeatherMap API key from https://openweathermap.org/api
- [ ] Add to Pi: `sudo nano /opt/lmrc/shared/config/credentials.env`
- [ ] Add line: `OPENWEATHERMAP_API_KEY=your_key_here`
- [ ] Restart noticeboard: `sudo systemctl restart lmrc-noticeboard`
- [ ] Verify weather displays

**Reference**: `lmrc-pi-deployment/README.md`
**Owner**: TBD
**Roadmap Link**: [roadmap.md#operations](roadmap.md#operations)

---

## 🟡 Medium Priority - Short Term (This Month)

### 3. Phase 1: Configuration Refactoring

**Goal**: Migrate from .env to JSON configuration using @lmrc/config library
**Impact**: Better configuration management, multi-club readiness
**Status**: Ready to begin (baseline testing complete)

**Tasks**:
- [ ] Integrate @lmrc/config library into lmrc-booking-system
  - [ ] Add dependency to package.json
  - [ ] Update config loading to use ConfigManager
  - [ ] Migrate club settings to config/club-profile.json
  - [ ] Keep credentials in .env (sensitive data)
- [ ] Update deployment scripts
  - [ ] Update install.sh to copy config files
  - [ ] Update update.sh for config changes
- [ ] Test migration
  - [ ] All 83 tests still pass
  - [ ] No regressions in functionality
- [ ] Update documentation
  - [ ] Configuration reference
  - [ ] Migration guide for other clubs

**Reference**: `IMPLEMENTATION_PLAN.md`, `lmrc-config/README.md`
**Owner**: TBD
**Roadmap Link**: [roadmap.md#phase-1](roadmap.md#phase-1)

---

### 4. Production Pi Rebuild with Standard Username

**Goal**: Rebuild test Pi with production-standard `boatshed` username
**Impact**: Validates deployment with standard configuration
**Status**: Waiting for Phase 1 completion and issue fixes

**Tasks**:
- [ ] Fresh Raspberry Pi OS install
- [ ] Create `boatshed` user (production standard)
- [ ] Run lmrc-pi-deployment installer
- [ ] Configure credentials
- [ ] Deploy both apps
- [ ] Comprehensive testing
- [ ] Document any issues found

**Reference**: `docs/deployment/production-setup.md`
**Owner**: TBD
**Roadmap Link**: [roadmap.md#operations](roadmap.md#operations)

---

## 🟢 Low Priority - Medium Term (1-3 Months)

### 5. Complete Documentation Consolidation

**Goal**: Finish migrating all documentation to docs/ structure
**Impact**: Single source of truth, easier maintenance
**Status**: Structure created, migration in progress

**Tasks**:
- [ ] Create deployment/production-setup.md (consolidate guides)
- [ ] Create deployment/troubleshooting.md
- [ ] Create development/getting-started.md
- [ ] Create development/contributing.md
- [ ] Create reference/configuration.md
- [ ] Create reference/api.md
- [ ] Update all cross-references
- [ ] Remove deprecated docs from projects

**Reference**: `.claude/DOCUMENTATION_AUDIT.md`
**Owner**: TBD
**Roadmap Link**: [roadmap.md#documentation](roadmap.md#documentation)

---

### 6. Integration Testing

**Goal**: Add integration tests for server layer and dual-app switching
**Impact**: More confidence in deployments
**Status**: Planning

**Tasks**:
- [ ] Server layer tests (Express routes, middleware)
- [ ] Dual-app switching tests
- [ ] End-to-end deployment tests
- [ ] Raise coverage from 86% to 90%+

**Reference**: `.claude/BASELINE_TESTING_COMPLETE.md`, `TESTING_STRATEGY.md`
**Owner**: TBD
**Roadmap Link**: [roadmap.md#phase-2](roadmap.md#phase-2)

---

### 7. Phase 2: Enhanced Features

**Goal**: Add features beyond basic functionality
**Impact**: Better user experience, more capabilities
**Status**: Planning (after Phase 1)

**Tasks**:
- [ ] Web-based configuration UI (lmrc-booking-system)
- [ ] Configuration sync to cloud
- [ ] Remote monitoring dashboard
- [ ] Automated health checks
- [ ] Email/SMS alerts for issues

**Reference**: `IMPLEMENTATION_PLAN.md#phase-2`
**Owner**: TBD
**Roadmap Link**: [roadmap.md#phase-2](roadmap.md#phase-2)

---

## 🔵 Future - Long Term (3-6 Months)

### 8. Multi-Club Preparation

**Goal**: Make solution deployable to other rowing clubs
**Impact**: Product commercialization, revenue opportunity
**Status**: Research phase

**Tasks**:
- [ ] Club-specific branding support
- [ ] Multi-tenancy architecture
- [ ] Onboarding process
- [ ] Pricing model
- [ ] Support infrastructure
- [ ] Pilot program with 2-3 clubs

**Reference**: `IMPLEMENTATION_PLAN.md#phase-3`, `rowing-club-market-analysis.md`
**Owner**: TBD
**Roadmap Link**: [roadmap.md#phase-3](roadmap.md#phase-3)

---

## ⏸️ Paused / Blocked

### None Currently

All work is either active or ready to start.

---

## ✅ Recently Completed

### Baseline Test Coverage (Nov 21, 2025)
- ✅ 83 tests written and passing
- ✅ 86.36% coverage achieved
- ✅ All core services tested
- **See**: `.claude/BASELINE_TESTING_COMPLETE.md`

### PM2 Deployment Deprecation (Nov 21, 2025)
- ✅ Marked PM2 deployment as deprecated
- ✅ Updated documentation to use systemd
- ✅ Clarified production deployment system
- **See**: `.claude/DEPLOYMENT_SYSTEM_RECONCILIATION.md`

### Documentation Structure (Nov 21, 2025)
- ✅ Created docs/ folder structure
- ✅ Created .claude/CONTEXT.md for session continuity
- ✅ Started documentation consolidation
- **See**: This file, `docs/README.md`

---

## Quick Reference

### Start Here
New to the project? See [docs/development/getting-started.md](../development/getting-started.md)

### Need to Deploy?
See [docs/deployment/production-setup.md](../deployment/production-setup.md)

### Something Broken?
See [docs/deployment/troubleshooting.md](../deployment/troubleshooting.md)

### Long-Term Plans?
See [roadmap.md](roadmap.md)

---

**Next Update**: When priorities change or major tasks complete
