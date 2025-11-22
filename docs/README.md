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
See: [Roadmap & Todo](planning/todo.md)

---

## Documentation Structure

### 🏗️ Architecture
System design, components, and how they fit together.

- [Overview](architecture/overview.md) - High-level system architecture
- [Deployment Architecture](architecture/deployment-architecture.md) - How deployment works
- [Application Components](architecture/components.md) - Individual applications

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

- [Roadmap](planning/roadmap.md) - Product roadmap and strategy
- [Todo & Next Actions](planning/todo.md) - Immediate next steps
- [Implementation Plan](planning/implementation-plan.md) - Current phase details

### 📚 Reference
Configuration, API, and reference materials.

- [Configuration Reference](reference/configuration.md) - All config options
- [API Documentation](reference/api.md) - REST API endpoints

---

## Project-Specific Documentation

Each project has its own README with project-specific details:

- **[lmrc-booking-system](../lmrc-booking-system/README.md)** - 7-day booking calendar viewer
- **[Noticeboard](../Noticeboard/README.md)** - Digital noticeboard application
- **[lmrc-pi-deployment](../lmrc-pi-deployment/README.md)** - Raspberry Pi deployment system
- **[lmrc-config](../lmrc-config/README.md)** - Shared configuration library

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
→ [Roadmap](planning/roadmap.md) and [Todo](planning/todo.md)

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
- [deployment-architecture.md](architecture/deployment-architecture.md)
- [components.md](architecture/components.md)

### Deployment
- [production-setup.md](deployment/production-setup.md)
- [updating.md](deployment/updating.md)
- [troubleshooting.md](deployment/troubleshooting.md)

### Development
- [getting-started.md](development/getting-started.md)
- [testing-guide.md](development/testing-guide.md)
- [contributing.md](development/contributing.md)

### Operations
- [monitoring.md](operations/monitoring.md)
- [maintenance.md](operations/maintenance.md)

### Planning
- [roadmap.md](planning/roadmap.md)
- [todo.md](planning/todo.md)
- [implementation-plan.md](planning/implementation-plan.md)

### Reference
- [configuration.md](reference/configuration.md)
- [api.md](reference/api.md)

---

**Last Updated**: 2025-11-21
