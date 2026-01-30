# LMRC Raspberry Pi Deployment System - Project Context

**For AI Assistants / Future Development Sessions**

This document provides complete context for working with the LMRC Raspberry Pi deployment system, including the applications it manages and all technical details needed for future development.

**Version**: 1.0.1
**Created**: 2025-10-28
**Last Updated**: 2025-10-28

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [The Problem Being Solved](#the-problem-being-solved)
3. [The Solution](#the-solution)
4. [Applications Being Deployed](#applications-being-deployed)
5. [Technical Architecture](#technical-architecture)
6. [Repository Structure](#repository-structure)
7. [Development History](#development-history)
8. [Key Design Decisions](#key-design-decisions)
9. [Current Status](#current-status)
10. [Known Issues & Limitations](#known-issues--limitations)
11. [Future Work](#future-work)
12. [Working with This Project](#working-with-this-project)

---

## Project Overview

### What This Is

A deployment management system that allows non-technical staff at Lake Macquarie Rowing Club (LMRC) to configure and manage two different web applications on Raspberry Pi devices in their boatshed:

1. **Boat Booking Viewer** - Displays 7-day boat booking calendar
2. **Digital Noticeboard** - Displays club news, events, photos, weather

### Core Requirement

Multiple Raspberry Pis will be deployed at the boatshed. Each Pi should:
- Run exactly ONE of the two applications (not both)
- Allow simple selection of which application to run
- Remember the selection across reboots
- Only run background processes for the active application
- Be manageable by non-technical club members

---

## The Problem Being Solved

### Initial Situation

LMRC had two applications ready for deployment:
1. Boat Booking Viewer (TypeScript, Express)
2. Digital Noticeboard (Node.js, Express, React)

### Challenges

1. **Multiple Devices**: Need to deploy to ~5-10 Raspberry Pis
2. **Different Uses**: Some displays show bookings, others show notices
3. **Configuration Persistence**: Once configured, should auto-start forever
4. **Resource Efficiency**: Noticeboard has hourly scraping cron job that shouldn't run on booking viewer devices
5. **Non-Technical Users**: Club volunteers need to set this up without technical knowledge
6. **Easy Switching**: Should be simple to change which app runs on a device

### Requirements

- ✅ Boot-time opportunity to select which app to run
- ✅ Automatic startup on subsequent boots
- ✅ Only active app's background processes run
- ✅ Centralized credentials (both apps use same RevSport login)
- ✅ Easy for non-technical staff to use

---

## The Solution

### High-Level Approach

Created a **deployment management system** with:

1. **Interactive Selector** (`select-app.sh`)
   - Beautiful ASCII menu
   - Numbered choice (1 or 2)
   - Confirmation prompt
   - Persistent configuration

2. **Boot-Time Launcher** (`launcher.sh`)
   - Reads configuration
   - Starts selected app's systemd service
   - Configures cron jobs if needed
   - Validates app is healthy

3. **Systemd Integration**
   - Each app has its own service
   - Security hardening
   - Auto-restart on failure
   - Proper logging

4. **Shared Configuration**
   - One credentials file for both apps
   - JSON device configuration
   - Centralized in `/opt/lmrc/shared/config`

5. **Management Scripts**
   - Status checker
   - App switcher
   - Backup utility
   - Health monitor
   - Update tool

### User Experience

**First Boot:**
```
╔════════════════════════════════════════════════╗
║   LMRC Application Selector                    ║
╚════════════════════════════════════════════════╝

  [1] Boat Booking Viewer
  [2] Digital Noticeboard

Select: _
```

**Every Boot After:**
- Automatically starts selected app
- Chromium opens in kiosk mode
- Display shows application fullscreen

---

## Applications Being Deployed

### Application 1: Boat Booking Viewer

**Location**: `c:\dev\Projects\LMRC\lmrc-booking-system\` (development)
**Deployed To**: `/opt/lmrc/booking-viewer/` (on Pi)
**Version**: 3.0.0
**Port**: 3000

#### Purpose
Displays a 7-day calendar view of boat bookings from RevolutioniseSport (club management system).

#### Technology Stack
- **Language**: TypeScript
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Frontend**: Vanilla TypeScript (compiled)
- **Key Libraries**:
  - `axios` + `axios-cookiejar-support` - HTTP with authentication
  - `cheerio` - HTML parsing for boat list
  - `zod` - Runtime type validation
  - `date-fns` - Date manipulation
  - `helmet` - Security headers
  - `morgan` - Request logging

#### How It Works
1. **Authentication**: Logs into RevSport using CSRF token + credentials
2. **Fetch Assets**: Scrapes `/bookings` page for list of all boats (HTML)
3. **Fetch Bookings**: Parallel API calls to `/bookings/retrieve-calendar/{id}` (JSON)
4. **Group & Sort**: Groups boats by type (Quads, Doubles, Singles)
5. **Cache**: 10-minute cache to avoid excessive API calls
6. **Display**: Web UI shows calendar table with auto-refresh

#### Key Features
- ~2 second load time (parallel API calls)
- Shows ALL boats (42 total), even with no bookings
- Session validation (flags unusual booking times)
- Utilization tracking
- RESTful API endpoints for data access

#### API Endpoints
- `GET /api/v1/bookings` - All booking data (cached)
- `GET /api/v1/config` - Club configuration
- `GET /api/v1/health` - Health check
- `POST /api/v1/cache/clear` - Clear cache

#### Build Process
```bash
npm install          # Install dependencies
npm run build        # Compiles TypeScript to dist/
npm start            # Runs node dist/server/index.js
```

#### Configuration
Via `.env` file:
- RevSport credentials
- Club name, colors
- Session times (for validation)
- Cache TTL
- Port

#### Resource Usage
- Memory: ~80MB
- CPU: Low (mostly idle, spikes during fetch)
- Network: API calls every 10 minutes (when cache expires)

#### Background Processes
None - it's a pure web server with caching

---

### Application 2: Digital Noticeboard

**Location**: `c:\dev\Projects\LMRC\Noticeboard\` (development)
**Deployed To**: `/opt/lmrc/noticeboard/` (on Pi)
**Version**: 1.0.0
**Port**: 3000

#### Purpose
Displays a rotating digital noticeboard with club information: photos, events, news, weather, sponsors.

#### Technology Stack
- **Language**: JavaScript (ES modules)
- **Runtime**: Node.js 20+
- **Backend**: Express.js
- **Frontend**: React 18 (built with Vite)
- **Scraper**: Puppeteer (headless Chromium)
- **Key Libraries**:
  - `cheerio` - HTML parsing
  - `node-cron` - Scheduled scraping
  - `vite` - Frontend build tool
  - `react` + `react-dom` - UI framework

#### How It Works
1. **Scraper**: Puppeteer script logs into RevSport and scrapes:
   - Photo galleries
   - Upcoming events
   - News articles
   - Race results
2. **Data Storage**: Saves to local JSON files in `data/`
3. **API Server**: Express serves JSON files via `/api/*` endpoints
4. **Frontend**: React app fetches from API and rotates content
5. **Weather**: Fetches from Bureau of Meteorology API (client-side)
6. **Cron Job**: Scraper runs hourly (5 * * * *) to keep data fresh

#### Key Features
- Rotating photo gallery (15s per photo)
- Always-visible upcoming events (next 7)
- News panel rotation (45s per article)
- Live weather data
- Sponsor acknowledgments
- Configurable timing and branding
- JSON-based configuration

#### API Endpoints
- `GET /api/gallery` - Photo data
- `GET /api/events` - Events data
- `GET /api/news` - News data
- `GET /api/config` - App configuration
- `GET /api/health` - Health check

#### Build Process
```bash
npm install          # Install dependencies
npm run build        # Builds React app to public/
npm start            # Runs node server.js
```

#### Configuration
- `.env` file: RevSport credentials
- `config.json`: Timing, branding, content settings

#### Resource Usage
- Memory: ~150MB (includes Puppeteer/Chromium for scraping)
- CPU: Low (idle), High (during hourly scrape)
- Network: Scrapes RevSport hourly
- Disk: Stores scraped data and images in `data/`

#### Background Processes
**Critical**: Hourly cron job for scraping:
```
5 * * * * cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js
```

This is why the deployment system needs to:
- Only create this cron job when Noticeboard is active
- Remove it when switching to Booking Viewer

---

## Technical Architecture

### System Components

```
┌─────────────────────────────────────────────────────┐
│ Raspberry Pi (Raspberry Pi OS Bookworm)             │
│                                                      │
│  ┌──────────────────────────────────────────┐      │
│  │ /opt/lmrc/shared/config/                 │      │
│  │  - device-config.json (active app)       │      │
│  │  - credentials.env (RevSport login)      │      │
│  └──────────────────────────────────────────┘      │
│                     │                               │
│                     ▼                               │
│  ┌──────────────────────────────────────────┐      │
│  │ systemd: lmrc-launcher.service           │      │
│  │  └─> launcher.sh                         │      │
│  └──────────────────────────────────────────┘      │
│                     │                               │
│        ┌────────────┴────────────┐                 │
│        ▼                          ▼                 │
│  ┌───────────┐            ┌────────────┐           │
│  │ systemd:  │            │ systemd:   │           │
│  │ lmrc-     │     OR     │ lmrc-      │           │
│  │ booking-  │            │ notice-    │           │
│  │ viewer    │            │ board      │           │
│  └───────────┘            └────────────┘           │
│        │                          │                 │
│        ▼                          ▼                 │
│  ┌───────────┐            ┌────────────┐           │
│  │ Express   │            │ Express +  │           │
│  │ :3000     │            │ React      │           │
│  │           │            │ :3000      │           │
│  │           │            │ + cron job │           │
│  └───────────┘            └────────────┘           │
│        │                          │                 │
│        └────────────┬─────────────┘                │
│                     ▼                               │
│  ┌──────────────────────────────────────────┐      │
│  │ systemd: lmrc-kiosk.service              │      │
│  │  └─> Chromium (kiosk mode)               │      │
│  │       http://localhost:3000               │      │
│  └──────────────────────────────────────────┘      │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Boot Sequence

1. **Pi Boots** → systemd starts `multi-user.target`
2. **Launcher Service Starts** → `lmrc-launcher.service` runs `launcher.sh`
3. **Launcher Reads Config** → Checks `device-config.json` for `activeApp`
4. **First Boot Path** (if `activeApp` is null):
   - Runs `select-app.sh`
   - User selects app
   - Config updated, reboot
5. **Normal Boot Path** (if `activeApp` is set):
   - Starts selected app's service
   - If Noticeboard: creates cron job
   - Waits for health check (max 30s)
6. **Desktop Loads** → `graphical.target` reached
7. **Kiosk Starts** → `lmrc-kiosk.service` launches Chromium
8. **Display Shows App** → Fullscreen at http://localhost:3000

### File System Layout

```
/opt/lmrc/
├── shared/
│   ├── config/
│   │   ├── device-config.json          # Active app selection
│   │   └── credentials.env             # Shared credentials
│   ├── scripts/                         # Copied from deployment repo
│   │   ├── launcher.sh
│   │   ├── select-app.sh
│   │   ├── switch-app.sh
│   │   ├── status.sh
│   │   ├── backup.sh
│   │   ├── health-check.sh
│   │   ├── update.sh
│   │   └── test-installation.sh
│   └── logs/
│       ├── booking-viewer.log
│       ├── noticeboard.log
│       └── scraper.log
├── booking-viewer/                      # Booking Viewer app
│   ├── dist/                           # Built TypeScript
│   ├── src/                            # Source code
│   ├── package.json
│   └── .env → shared/config/credentials.env (symlink)
├── noticeboard/                        # Noticeboard app
│   ├── public/                         # Built React app
│   ├── data/                           # Scraped content
│   ├── server.js
│   ├── scraper/
│   ├── package.json
│   └── .env → shared/config/credentials.env (symlink)
└── deployment/                         # This repository
    ├── scripts/
    ├── systemd/
    ├── config/
    └── docs/
```

### Key Files

**device-config.json**:
```json
{
  "version": "1.0.0",
  "device": {
    "id": "rpi-boatshed-01",
    "name": "Boatshed Display 01"
  },
  "activeApp": "booking-viewer",  // or "noticeboard"
  "apps": {
    "booking-viewer": { /* metadata */ },
    "noticeboard": { /* metadata */ }
  },
  "metadata": {
    "lastSwitched": "2025-10-28T00:00:00Z"
  }
}
```

**credentials.env**:
```bash
REVSPORT_BASE_URL=https://www.lakemacquarierowingclub.org.au
REVSPORT_USERNAME=club_username
REVSPORT_PASSWORD=club_password
CLUB_NAME=Lake Macquarie Rowing Club
CLUB_SHORT_NAME=LMRC
CLUB_PRIMARY_COLOR=#1e40af
CLUB_SECONDARY_COLOR=#0ea5e9
PORT=3000
NODE_ENV=production
```

---

## Repository Structure

### This Repository (lmrc-pi-deployment)

```
lmrc-pi-deployment/                     # The deployment system
├── scripts/                            # Management scripts (10 files)
│   ├── install.sh                     # Main installer
│   ├── launcher.sh                    # Boot-time launcher
│   ├── select-app.sh                  # Interactive selector
│   ├── switch-app.sh                  # App switcher
│   ├── status.sh                      # Status display
│   ├── backup.sh                      # Config backup
│   ├── health-check.sh                # Health monitor
│   ├── update.sh                      # App updater
│   ├── test-installation.sh           # Install verifier
│   └── github-push.sh                 # GitHub helper
│
├── systemd/                            # Systemd services (4 files)
│   ├── lmrc-launcher.service          # Launches selected app
│   ├── lmrc-booking-viewer.service    # Booking viewer service
│   ├── lmrc-noticeboard.service       # Noticeboard service
│   └── lmrc-kiosk.service             # Chromium kiosk
│
├── config/                             # Config templates (2 files)
│   ├── device-config.json.template
│   └── credentials.env.template
│
├── docs/                               # Technical docs (3 files)
│   ├── ARCHITECTURE.md                # Complete architecture (60kb)
│   ├── DEPLOYMENT_GUIDE.md            # Step-by-step guide (32kb)
│   └── TROUBLESHOOTING.md             # Common issues (50kb)
│
├── .github/                            # GitHub templates (5 files)
│   ├── CONTRIBUTING.md
│   ├── pull_request_template.md
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md
│       ├── feature_request.md
│       └── hardware_test_report.md
│
├── README.md                           # Main overview
├── CHANGELOG.md                        # Version history
├── DEPLOYMENT_CHECKLIST.md            # Printable checklist
├── QUICK_REFERENCE.md                 # Command reference
├── PROJECT_SUMMARY.md                 # Complete summary
├── PROJECT_CONTEXT.md                 # This file
├── VALIDATION_REPORT.md               # Technical review
├── VALIDATION_SUMMARY.md              # Review summary
├── PRE_DEPLOYMENT_TEST_PLAN.md        # Testing procedure
├── GITHUB_SETUP.md                    # GitHub instructions
├── PUSH_TO_GITHUB.md                  # Quick GitHub guide
├── LICENSE                             # MIT
├── VERSION                             # 1.0.1
└── .gitignore
```

### Related Repositories

**Booking Viewer**:
- Local: `c:\dev\Projects\LMRC\lmrc-booking-system\`
- GitHub: `https://github.com/UndefinedRest/BoatBookingsCalendar.git`
- TypeScript application
- Express backend + compiled frontend
- ~40 files, TypeScript/JavaScript

**Noticeboard**:
- Local: `c:\dev\Projects\LMRC\Noticeboard\`
- GitHub: `https://github.com/UndefinedRest/LMRC_Noticeboard.git`
- Node.js + React application
- Express backend + Vite-built frontend
- Puppeteer scraper
- ~50 files, JavaScript/JSX

**Actual GitHub Structure**:
```
https://github.com/UndefinedRest/
├── lmrc-pi-deployment       # This repo (deployment system)
├── BoatBookingsCalendar     # Booking Viewer app
└── LMRC_Noticeboard         # Noticeboard app
```

**Note**: Repository names differ from local directory names:
- Local `lmrc-booking-system` → GitHub `BoatBookingsCalendar`
- Local `Noticeboard` → GitHub `LMRC_Noticeboard`

---

## Development History

### Timeline

**2025-10-28**: Complete development in single session

**Phase 1: Initial Architecture** (1 hour)
- Investigated both applications
- Researched Raspberry Pi deployment patterns
- Designed dual-app management system
- Created UX flow (interactive selector)

**Phase 2: Core Implementation** (2 hours)
- Created 5 core scripts (install, launcher, select, switch, status)
- Created 4 systemd service files
- Created configuration templates
- Wrote comprehensive documentation (3 docs)

**Phase 3: Enhancement** (1 hour)
- Added 4 utility scripts (backup, health, update, test)
- Created deployment checklist
- Created quick reference card
- Added CHANGELOG and supporting files

**Phase 4: Validation** (2 hours)
- Comprehensive code review
- Found 5 critical/medium bugs
- Fixed all bugs (v1.0.1)
- Created validation report (50+ pages)
- Created test plan (6-8 hour procedure)

**Phase 5: GitHub Integration** (1 hour)
- Created GitHub setup guides
- Created automated push script
- Created issue templates
- Created contributing guidelines

**Phase 6: Context Documentation** (current)
- Creating this document for future sessions

### Decisions Made

**Systemd vs PM2**:
- Chose systemd for native OS integration
- Better resource management
- Standard Linux admin tool

**Bash vs Node.js for Scripts**:
- Chose Bash for management scripts
- Universal on Linux, no compilation
- Easy for sysadmins to understand

**JSON vs YAML for Config**:
- Chose JSON for device configuration
- Easy to parse with `jq`
- No additional dependencies

**Separate Repo vs Monorepo**:
- Chose separate repository
- Clean separation of concerns
- Independent versioning

**Interactive Menu vs Web UI**:
- Chose interactive terminal menu for v1.0
- Simpler implementation
- Works via SSH
- Web UI deferred to v2.0

---

## Current Status

### Version: 1.0.1

**Code Quality**: ⭐⭐⭐⭐ (4/5)
- Professional bash scripts
- Security hardening
- Good error handling
- Comprehensive documentation

**Production Ready**: ⚠️ NO
- Code reviewed and bugs fixed
- NOT tested on physical hardware
- Requires testing before deployment

**What Works** (High Confidence - 90%):
- ✅ Script syntax valid
- ✅ Systemd services properly configured
- ✅ Architecture sound
- ✅ Security hardening in place
- ✅ Documentation comprehensive

**What's Unknown** (Needs Testing - 0% confidence):
- ❓ Chromium package compatibility on Bookworm
- ❓ Actual performance on Pi 4/5
- ❓ Long-term stability
- ❓ User experience for non-technical staff
- ❓ Recovery from failures

### Recent Changes (v1.0.1)

1. **Fixed**: Date command not evaluated in install.sh
2. **Fixed**: Chromium package detection (now tries both names)
3. **Fixed**: Improved JSON parsing (uses jq instead of grep)
4. **Fixed**: Better startup health check (30s polling)
5. **Fixed**: Cron error handling

### Testing Status

- **Code Review**: ✅ Complete
- **Syntax Check**: ✅ Complete
- **Security Review**: ✅ Complete
- **Hardware Testing**: ❌ Not Done
- **User Acceptance**: ❌ Not Done
- **Pilot Deployment**: ❌ Not Done

---

## Known Issues & Limitations

### Known Issues

1. **Chromium Package Name**:
   - Raspberry Pi OS Bookworm may use `chromium` instead of `chromium-browser`
   - Install script now handles both, but untested
   - **Risk**: High (blocks kiosk mode)

2. **No Hardware Testing**:
   - All code untested on actual Raspberry Pi
   - Unknown if it works in practice
   - **Risk**: High (could have unforeseen issues)

### Limitations

1. **Single App Only**:
   - By design, only one app runs at a time
   - Switching requires reboot
   - Can't show both apps simultaneously

2. **No Web UI**:
   - Configuration via terminal only
   - Requires SSH or keyboard access
   - Not ideal for remote management

3. **Manual Initial Setup**:
   - First deployment requires hands-on setup
   - Can't be done completely remotely
   - SSH helps but keyboard needed for first boot

4. **No Centralized Management**:
   - Each Pi configured individually
   - No dashboard for multiple devices
   - Manual tracking required

5. **Limited to 2 Apps**:
   - Hardcoded for Booking Viewer and Noticeboard
   - Adding third app requires code changes
   - Not a generic multi-app platform

### Security Considerations

1. **Credentials in Plain Text**:
   - `.env` file contains passwords
   - Mitigated by file permissions (600)
   - Consider systemd credentials in future

2. **Apps Bind to 0.0.0.0**:
   - Accessible from network
   - Should bind to localhost only (kiosk is local)
   - Recommend firewall configuration

3. **No Update Verification**:
   - `update.sh` doesn't verify signatures
   - Could pull malicious code
   - Recommend git signature verification

---

## Future Work

### v1.1 (After Successful Testing)

- [ ] Document actual hardware test results
- [ ] Fix any issues found during testing
- [ ] Create pre-configured SD card image
- [ ] Add JSON Schema validation
- [ ] Add backup/restore functionality

### v2.0 (Web UI)

- [ ] Web-based configuration panel
- [ ] Remote device status dashboard
- [ ] Centralized credential management
- [ ] User authentication
- [ ] Configuration history tracking

### v2.5 (Fleet Management)

- [ ] Ansible playbook for 20+ devices
- [ ] Centralized monitoring (Prometheus + Grafana)
- [ ] Automated health check reporting
- [ ] SMS/Email alerts for failures
- [ ] Remote log aggregation

### v3.0 (Advanced Features)

- [ ] Multi-app display (split screen)
- [ ] Hot-switching without reboot
- [ ] Docker containerization option
- [ ] CI/CD pipeline
- [ ] Automated testing framework

### Ideas Under Consideration

- Multi-tenant support (other rowing clubs)
- Plugin architecture for adding apps
- Mobile app for management
- Cloud backup for configurations
- Performance monitoring dashboard

---

## Working with This Project

### For AI Assistants in Future Sessions

#### Quick Context Summary

**What This Is**: Raspberry Pi deployment manager for 2 LMRC applications (Booking Viewer + Noticeboard)

**Key Points**:
- Only one app runs per Pi (user selects)
- Config persists across reboots
- Uses systemd for service management
- Bash scripts for management
- Version 1.0.1 - code complete, not hardware tested

**Main Files to Understand**:
1. `scripts/launcher.sh` - Boot-time logic
2. `scripts/select-app.sh` - Interactive selector
3. `systemd/lmrc-launcher.service` - Main service
4. `config/device-config.json.template` - Config structure

#### Common Tasks

**Adding a New Script**:
1. Create in `scripts/` directory
2. Add shebang `#!/bin/bash` and `set -e`
3. Make executable: `chmod +x scripts/newscript.sh`
4. Update install.sh to copy it
5. Document in README.md

**Modifying App Behavior**:
1. Check `scripts/launcher.sh` for startup logic
2. Check `systemd/lmrc-{app}.service` for service config
3. Test changes on actual hardware
4. Update documentation

**Adding Documentation**:
1. Technical docs → `docs/` folder
2. User-facing docs → Root directory
3. Update TABLE_OF_CONTENTS in README if major
4. Follow markdown style (clear headers, examples)

**Fixing Bugs**:
1. Check `VALIDATION_REPORT.md` for known issues
2. Test fix on actual Raspberry Pi
3. Update CHANGELOG.md
4. Bump version number (semantic versioning)
5. Update VERSION file
6. Commit with descriptive message

#### Code Style

**Bash Scripts**:
```bash
#!/bin/bash
set -e  # Exit on error

# Use descriptive variable names
CONFIG_FILE="/path/to/file"

# Quote variables
echo "Value: $CONFIG_FILE"

# Check before using
if [ -f "$CONFIG_FILE" ]; then
    process_file "$CONFIG_FILE"
fi

# Functions for reusability
check_status() {
    local service=$1
    systemctl is-active "$service"
}

# User feedback
echo "Starting process..."
# do work
echo "✓ Complete"
```

**Systemd Services**:
```ini
[Unit]
Description=Clear description
After=dependencies.target

[Service]
Type=simple|oneshot
User=lmrc
Environment=KEY=value
ExecStart=/full/path/to/command
Restart=always
NoNewPrivileges=true  # Security hardening

[Install]
WantedBy=multi-user.target
```

#### Testing Approach

1. **Always test on actual hardware** - code review isn't enough
2. **Follow PRE_DEPLOYMENT_TEST_PLAN.md** - comprehensive procedure
3. **Document results** - update VALIDATION_REPORT.md
4. **Test failure scenarios** - network loss, crashes, etc.
5. **Long-term testing** - 24+ hour stability test

#### Key Constraints

1. **Target**: Raspberry Pi 4/5 with Raspberry Pi OS Bookworm (64-bit)
2. **Users**: Non-technical club volunteers
3. **Dependencies**: Node.js 20+, systemd, jq, chromium
4. **Port**: Both apps use port 3000 (only one runs)
5. **Permissions**: Scripts run as root or lmrc user

#### Related Projects

**Booking Viewer**:
- Local Path: `c:\dev\Projects\LMRC\lmrc-booking-system\`
- GitHub: `https://github.com/UndefinedRest/BoatBookingsCalendar.git`
- Tech: TypeScript, Express
- Entry: `dist/server/index.js`
- Build: `npm run build`

**Noticeboard**:
- Local Path: `c:\dev\Projects\LMRC\Noticeboard\`
- GitHub: `https://github.com/UndefinedRest/LMRC_Noticeboard.git`
- Tech: Node.js, React, Puppeteer
- Entry: `server.js`
- Build: `npm run build`
- Cron: Every 10 minutes (self-managed schedule)

#### Important Notes

1. **Don't Break Config Schema**: Apps depend on device-config.json structure
2. **Preserve Security**: Don't weaken systemd hardening
3. **Maintain UX**: Keep scripts simple for non-technical users
4. **Test Everything**: Never deploy without hardware testing
5. **Document Changes**: Update CHANGELOG.md for all changes

---

## Additional Resources

### Documentation Map

| Document | Purpose | Audience |
|----------|---------|----------|
| README.md | Quick start | Everyone |
| PROJECT_SUMMARY.md | Complete overview | Developers |
| PROJECT_CONTEXT.md | This file - future dev context | AI/Developers |
| ARCHITECTURE.md | Technical deep dive | Architects |
| DEPLOYMENT_GUIDE.md | Step-by-step deployment | Deployers |
| TROUBLESHOOTING.md | Problem solving | Support |
| VALIDATION_REPORT.md | Code review results | QA |
| PRE_DEPLOYMENT_TEST_PLAN.md | Testing procedure | Testers |
| DEPLOYMENT_CHECKLIST.md | Deployment tasks | Deployers |
| QUICK_REFERENCE.md | Command reference | Users |
| GITHUB_SETUP.md | GitHub instructions | Maintainers |

### External References

- **Raspberry Pi OS**: https://www.raspberrypi.com/software/
- **systemd**: https://systemd.io/
- **RevolutioniseSport**: https://www.revsport.com.au/
- **LMRC Website**: https://www.lakemacquarierowingclub.org.au/
- **Node.js**: https://nodejs.org/

### Contact & Support

- **Club**: Lake Macquarie Rowing Club
- **Technical Committee**: [Add contact info]
- **GitHub Issues**: [Add repo URL]/issues

---

## Change Log for This Document

**v1.0 (2025-10-28)**: Initial creation with complete project context

---

**End of Project Context**

This document should provide complete context for working with the project in future sessions. If additional context is needed, refer to the other documentation files listed above.

**Remember**: This code has NOT been tested on physical Raspberry Pi hardware and requires testing before production deployment.
