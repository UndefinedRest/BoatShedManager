# LMRC System Architecture

**Last Updated**: 2025-11-24

---

## System Overview

The LMRC Digital Solution provides digital displays for a rowing club, running on Raspberry Pi devices at the boatshed, plus a public-facing boat booking website.

### Applications

#### Raspberry Pi Applications (Internal Displays)
1. **Booking Viewer** (`lmrc-booking-system`) - 7-day boat booking calendar
2. **Noticeboard** (`Noticeboard`) - Digital signage with news, events, photos, weather

#### Public Web Applications (Netlify)
3. **BoatBooking** - Public boat booking website at https://lakemacrowing.au
   - Static HTML/JavaScript site
   - Daily automated boat list updates from RevSport via GitHub Actions
   - Damaged boat detection and warnings

### Deployment

#### Raspberry Pi Deployments
**Platform**: Raspberry Pi 4/5 (4GB+ RAM)
**OS**: Raspberry Pi OS (64-bit, Bookworm)
**Process Management**: systemd services
**Display**: Chromium in kiosk mode (fullscreen)

#### Netlify Deployments
**Platform**: Netlify CDN
**Trigger**: GitHub push to main branch
**Build Hook**: GitHub Actions for boat data updates
**See**: [BoatBooking/NETLIFY_DEPLOYMENT.md](../../BoatBooking/NETLIFY_DEPLOYMENT.md)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Raspberry Pi Device                       │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ systemd Services (Process Management)                  │ │
│  │  • lmrc-launcher.service   (boot selector)             │ │
│  │  • lmrc-booking-viewer.service                         │ │
│  │  • lmrc-noticeboard.service                            │ │
│  │  • lmrc-kiosk.service     (Chromium fullscreen)        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ File System                                            │ │
│  │                                                         │ │
│  │  /opt/lmrc/                                            │ │
│  │  ├── booking-viewer/    (lmrc-booking-system)          │ │
│  │  ├── noticeboard/       (Noticeboard)                  │ │
│  │  ├── deployment/        (lmrc-pi-deployment)           │ │
│  │  └── shared/                                           │ │
│  │      ├── config/                                       │ │
│  │      │   ├── device-config.json                        │ │
│  │      │   └── credentials.env                           │ │
│  │      └── scripts/       (management scripts)           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Browser Display (port 3000)                            │ │
│  │  http://localhost:3000                                 │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
            ┌──────────────────────────────┐
            │     External Services         │
            │  • RevSport (boat bookings)  │
            │  • OpenWeatherMap (weather)  │
            └──────────────────────────────┘
```

---

## Component Details

### 1. Booking Viewer

**Repository**: `lmrc-booking-system`
**Port**: 3000
**Purpose**: Display 7-day boat booking calendar

**Technology Stack**:
- Node.js + Express (backend)
- TypeScript
- Vanilla JavaScript (frontend)
- Axios with cookie jar (authentication)
- Cheerio (HTML parsing)

**Data Flow**:
1. Server authenticates with RevSport
2. Scrapes boat booking data
3. Serves HTML/JSON to browser
4. Browser displays calendar and polls for updates

**Key Features**:
- Session-based authentication
- Automatic re-authentication on session expiry
- Booking data parsing and transformation
- 7-day rolling window view

### 2. Noticeboard

**Repository**: `Noticeboard`
**Port**: 3000
**Purpose**: Digital signage for club information

**Technology Stack**:
- Node.js + Express (backend)
- React (frontend)
- RevSport web scraping (news, events, gallery)
- OpenWeatherMap API (weather)

**Data Flow**:
1. Background scraper fetches data from RevSport (scheduled)
2. Weather API fetched periodically
3. React app displays rotating content
4. Gallery images, news, events cycle automatically

**Key Features**:
- Configurable rotation timings
- Smart scraping schedule (avoids Cloudflare blocks)
- Weather display
- Gallery slideshow

### 3. Deployment Infrastructure

**Repository**: `lmrc-pi-deployment`
**Purpose**: Deploy and manage applications on Raspberry Pi

**Key Scripts**:
- `install.sh` - Initial Pi setup
- `switch-app.sh` - Switch between apps
- `update.sh` - Update applications
- `status.sh` - Health check

**Systemd Services**:
- `lmrc-launcher.service` - Runs at boot, starts selected app
- `lmrc-booking-viewer.service` - Booking Viewer
- `lmrc-noticeboard.service` - Noticeboard
- `lmrc-kiosk.service` - Chromium browser in fullscreen

### 4. BoatBooking (Public Website)

**Repository**: `BoatBooking`
**Platform**: Netlify (https://lakemacrowing.au)
**Purpose**: Public-facing boat booking website

**Technology Stack**:
- Static HTML/CSS/JavaScript
- No build process (static files only)
- GitHub Actions for automation
- Cheerio (boat data scraping)

**Data Flow**:
1. GitHub Actions runs daily at 2am AEST
2. Scrapes RevSport for boat names and status
3. Updates boats.json with current data
4. Commits to GitHub with `[skip ci]`
5. Triggers Netlify build hook
6. Netlify deploys updated site

**Key Features**:
- Boat list with damage detection
- Visual damage warnings (red styling)
- Automated daily updates
- Zero-downtime deployments
- Graceful degradation if scraper fails

**Deployment Details**:
See [BoatBooking/NETLIFY_DEPLOYMENT.md](../../BoatBooking/NETLIFY_DEPLOYMENT.md)

### 5. Shared Config Library (Not Yet Integrated)

**Repository**: `lmrc-config`
**Purpose**: Type-safe configuration management

**Status**: Created but not yet integrated (Phase 1 work)

**Will provide**:
- Zod schema validation
- Club profile management
- Session configuration
- Migration from .env to JSON

---

## Data Flow

### Boot Sequence

```
1. Pi boots
2. lmrc-launcher.service starts
3. Reads /opt/lmrc/shared/config/device-config.json
4. Starts selected app service (booking-viewer OR noticeboard)
5. App service starts Node.js server on port 3000
6. lmrc-kiosk.service starts Chromium pointing to localhost:3000
7. Display shows selected app
```

### Application Update

```
1. User runs: sudo /opt/lmrc/shared/scripts/update.sh
2. Script pulls latest code from GitHub
3. Runs npm install (new dependencies)
4. Runs npm run build (compile TypeScript)
5. Restarts systemd service
6. Browser automatically reconnects
```

### App Switching

```
1. User runs: sudo /opt/lmrc/shared/scripts/switch-app.sh
2. Script updates device-config.json
3. Prompts for reboot
4. On reboot, launcher starts new app
5. Kiosk loads new app
```

---

## Security Architecture

### Authentication

**RevSport Integration**:
- Session-based auth with cookie jar
- Credentials stored in `/opt/lmrc/shared/config/credentials.env`
- Automatic re-authentication on 403/401
- Login mutex prevents concurrent auth attempts

**Weather API**:
- API key stored in credentials.env
- Free tier OpenWeatherMap
- No sensitive data exposed

### Network Security

**Production**:
- Pi behind club network firewall
- No ports exposed to internet
- Applications only accessible on local network

**Future** (if needed):
- Cloudflare Tunnel for remote access
- No port forwarding required
- Automatic SSL/HTTPS

### File Permissions

- Applications run as `lmrc` service user
- Read-only access to code
- Write access only to logs and data directories
- Desktop user (`greg`/`boatshed`) runs kiosk only

---

## Scalability

### Current Limits

- Single Pi per location
- One app active at a time
- Local network access only

### Future Enhancements

- Multiple Pis per club (different locations)
- Cloud-based configuration sync
- Multi-club deployment (different clubs)
- Remote monitoring and updates

---

## Technology Choices

### Why Node.js?
- Good for web scraping (Axios, Cheerio)
- Easy Express server for web UI
- Good npm ecosystem
- Familiar for web developers

### Why systemd?
- Native to Raspberry Pi OS
- Reliable process management
- Auto-restart on crash
- Boot integration
- Log management (journald)

### Why Raspberry Pi?
- Low cost (~$100 per location)
- Low power consumption
- Reliable hardware
- Easy to deploy
- Good community support

### Why TypeScript?
- Type safety prevents errors
- Better IDE support
- Easier refactoring
- Self-documenting code

---

## Dependencies

### Critical Dependencies

**Booking Viewer**:
- `axios` - HTTP client
- `axios-cookiejar-support` - Session management
- `cheerio` - HTML parsing
- `express` - Web server
- `zod` - Schema validation

**Noticeboard**:
- `react` - UI framework
- `axios` - HTTP client
- `express` - Web server
- `puppeteer` - Web scraping (optional)

### Infrastructure

- Node.js 20+
- Chromium browser
- systemd
- Git

---

## Related Documentation

- [Deployment Architecture](deployment-architecture.md) - Detailed deployment system
- [Application Components](components.md) - Individual app details
- [Production Setup](../deployment/production-setup.md) - How to deploy

---

**See Also**: [../README.md](../README.md) for documentation navigation
