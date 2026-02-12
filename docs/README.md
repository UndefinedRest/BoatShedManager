# LMRC Documentation

**Lake Macquarie Rowing Club - Digital Solutions**

Welcome to the LMRC documentation hub. This is the single source of truth for all solution-level documentation.

---

## 📖 Quick Navigation

### New to LMRC?
Start here: [Getting Started](development/getting-started.md)

### Deploying to Production?
Go here: [Production Setup](deployment/production-setup.md)

### Understanding the System?
Read this: [Architecture Overview](architecture/overview.md)

### What's Next?
See: [Product Roadmap](../PRODUCT_ROADMAP.md) and [Architectural Roadmap](../ARCHITECTURAL_ROADMAP.md)

---

## Documentation Structure

### 🏗️ Architecture
System design, components, and how they fit together.

- [Overview](architecture/overview.md) - High-level system architecture
- [Monorepo Migration Plan](architecture/monorepo-migration-plan.md) - Pi-to-SaaS monorepo restructure
- [Configurable Session Times](architecture/configurable-session-times-design.md) - Session time configuration design

### 🚀 Deployment
Production deployment, operations, and maintenance.

- [Production Setup](deployment/production-setup.md) - Deploy to Raspberry Pi
- [Updating](deployment/updating.md) - Update deployed systems
- [Troubleshooting](deployment/troubleshooting.md) - Common issues and fixes

### 💻 Development
Development environment, testing, and contributing.

- [Getting Started](development/getting-started.md) - Set up dev environment
- [Testing Guide](development/testing-guide.md) - How to test
- [Contributing](development/contributing.md) - How to contribute

### ⚙️ Operations
Day-to-day operations, monitoring, and maintenance.

- [Monitoring](operations/monitoring.md) - Health checks and monitoring
- [Maintenance](operations/maintenance.md) - Routine maintenance tasks

### 📋 Planning
Roadmap, strategy, and future plans.

- [Product Roadmap](../PRODUCT_ROADMAP.md) - Product vision and strategy
- [Architectural Roadmap](../ARCHITECTURAL_ROADMAP.md) - Technical backlog by phase

### 📚 Reference
Configuration, API, and reference materials.

- [Configuration Reference](reference/configuration.md) - All config options
- [API Documentation](reference/api.md) - REST API endpoints

---

## Project-Specific Documentation

Each project has its own README with project-specific details:

### Raspberry Pi Deployments
- **[lmrc-booking-system](../lmrc-booking-system/README.md)** - 7-day booking calendar viewer (Pi)
- **[Noticeboard](../Noticeboard/README.md)** - Digital noticeboard application (Pi)
- **[lmrc-pi-deployment](../lmrc-pi-deployment/README.md)** - Raspberry Pi deployment system

### Public Web Applications
- **[BoatBooking](../BoatBooking/README.md)** - Public boat booking website (Netlify)
  - **Deployment**: [NETLIFY_DEPLOYMENT.md](../BoatBooking/NETLIFY_DEPLOYMENT.md)

### Libraries
- **[@lmrc/config](../packages/config/README.md)** - Shared configuration library

---

## Finding What You Need

### I want to...

**...deploy to a new Raspberry Pi**
→ [Production Setup](deployment/production-setup.md)

**...update an existing deployment**
→ [Updating Guide](deployment/updating.md)

**...understand the system architecture**
→ [Architecture Overview](architecture/overview.md)

**...set up a development environment**
→ [Getting Started](development/getting-started.md)

**...run tests**
→ [Testing Guide](development/testing-guide.md)

**...fix a production issue**
→ [Troubleshooting](deployment/troubleshooting.md)

**...see what's coming next**
→ [Product Roadmap](../PRODUCT_ROADMAP.md) and [Architectural Roadmap](../ARCHITECTURAL_ROADMAP.md)

**...configure the system**
→ [Configuration Reference](reference/configuration.md)

---

## Documentation Standards

### When to Update Documentation

- ✅ When changing architecture
- ✅ When adding new features
- ✅ When changing deployment procedures
- ✅ When fixing bugs that affect operations
- ✅ When updating the roadmap

### How to Update Documentation

1. Edit the relevant file in `docs/`
2. Update the "Last Updated" date
3. Commit with descriptive message
4. Ensure cross-references still work

### Where Documentation Lives

**Solution-Level** → `docs/` (this folder)
**Project-Specific** → Project's README.md
**Code-Level** → Comments and docstrings
**Session Notes** → `.claude/session-notes/`

---

## Contributing to Documentation

See [Contributing Guide](development/contributing.md) for how to contribute to documentation.

### Documentation Review

All documentation changes should:
- [ ] Be accurate (match current code)
- [ ] Be complete (no gaps)
- [ ] Be clear (understandable)
- [ ] Have working links
- [ ] Follow the structure

---

## Documentation Index

### Architecture

- [overview.md](architecture/overview.md)
- [monorepo-migration-plan.md](architecture/monorepo-migration-plan.md)
- [configurable-session-times-design.md](architecture/configurable-session-times-design.md)

### Deployment

- [production-setup.md](deployment/production-setup.md)
- [updating.md](deployment/updating.md)
- [troubleshooting.md](deployment/troubleshooting.md)
- [generic-linux-support.md](deployment/generic-linux-support.md)
- [netlify-to-render-migration.md](deployment/netlify-to-render-migration.md)

### Development

- [getting-started.md](development/getting-started.md)
- [testing-guide.md](development/testing-guide.md)
- [contributing.md](development/contributing.md)

### Operations

- [monitoring.md](operations/monitoring.md)
- [maintenance.md](operations/maintenance.md)

### Standards

- [TESTING_STANDARDS.md](standards/TESTING_STANDARDS.md)

### Research

- [booking-cancellation-investigation.md](research/booking-cancellation-investigation.md)

### Planning

- [Product Roadmap](../PRODUCT_ROADMAP.md)
- [Architectural Roadmap](../ARCHITECTURAL_ROADMAP.md)

### Reference

- [configuration.md](reference/configuration.md)
- [api.md](reference/api.md)

---

**Last Updated**: 2025-11-24
