# LMRC Solution Architecture

## System Overview

The LMRC Digital Solution consists of three main applications running on Raspberry Pi hardware, integrated with the RevSport API backend.

```
┌─────────────────────────────────────────────────────────────┐
│                        RevSport API                          │
│              (Boat Bookings & Member Data)                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ HTTPS/REST API
                     │
     ┌───────────────┼───────────────┐
     │               │               │
     ▼               ▼               ▼
┌─────────┐   ┌─────────────┐   ┌──────────┐
│  Boat   │   │   Booking   │   │  Notice  │
│ Booking │   │   Viewer    │   │  Board   │
│  Page   │   │             │   │          │
└─────────┘   └─────────────┘   └──────────┘
     │               │               │
     │               │               │
     ▼               ▼               ▼
┌─────────┐   ┌─────────────┐   ┌──────────┐
│   TV    │   │     TV      │   │    TV    │
│ Display │   │   Display   │   │  Display │
└─────────┘   └─────────────┘   └──────────┘
```

## Components

### 1. Booking Viewer (lmrc-booking-system)

**Purpose**: Real-time display of boat availability and bookings

**Architecture**:
- **Backend**: Node.js + Express server (TypeScript)
- **Frontend**: Vanilla JavaScript (no framework)
- **Data Source**: RevSport API
- **Update Mechanism**: Polling (10-minute intervals, configurable)

**Key Features**:
- Server-side rendering with client-side updates
- Silent background refreshes (no loading interruptions)
- Cloudflare-safe authentication with request batching
- Zod schema validation for configuration
- Web-based configuration interface

**Ports**:
- 3000 (default) - HTTP server
- Configurable via PORT environment variable

**Configuration**:
- `.env` - RevSport credentials
- `config/tv-display.json` - Display settings
- `public/config.html` - Web UI for configuration

**Data Flow**:
```
┌──────────┐    authenticate    ┌────────────┐
│  Server  │ ─────────────────> │  RevSport  │
│          │                     │    API     │
│          │ <───────────────── │            │
└────┬─────┘    fetch bookings  └────────────┘
     │
     │ HTTP/JSON API
     │
     ▼
┌──────────┐
│ Browser  │
│ (TV)     │
└──────────┘
```

**Performance**:
- ~2 seconds total refresh time
- ~7ms average per boat (42 boats)
- Batched processing: 5 boats per batch, 500ms delay

### 2. Boat Booking Page (BoatBooking)

**Purpose**: Member-facing interface for booking boats

**Architecture**: [To be documented]

**Integration Points**:
- RevSport API for booking operations
- Shared authentication mechanism
- Common club branding/configuration

### 3. Digital Noticeboard (Noticeboard)

**Purpose**: Display club announcements, events, and notices

**Architecture**: [To be documented]

**Integration Points**:
- Content management system
- Shared club branding/configuration
- Display rotation timing

### 4. Pi Deployment Infrastructure (lmrc-pi-deployment)

**Purpose**: Deployment automation and service management

**Components**:
- `scripts/update.sh` - Update automation
- `scripts/setup.sh` - Initial setup
- `systemd/` - Service configurations

**Services Managed**:
- `lmrc-booking-viewer.service`
- `lmrc-noticeboard.service` (if applicable)
- `lmrc-boat-booking.service` (if applicable)

**Deployment Flow**:
```
┌──────────┐     git pull      ┌────────────┐
│  GitHub  │ <───────────────  │    Pi      │
│          │                    │            │
└──────────┘                    └─────┬──────┘
                                      │
                                      │ run update.sh
                                      │
                                      ▼
                            ┌──────────────────┐
                            │ 1. Pull latest   │
                            │ 2. npm install   │
                            │ 3. npm run build │
                            │ 4. Restart svc   │
                            └──────────────────┘
```

## Shared Infrastructure

### Authentication

All applications that integrate with RevSport share a common authentication pattern:

**Current Implementation** (Booking Viewer):
```typescript
// src/client/auth.ts
class RevsportAuthClient {
  - Login mutex (prevents concurrent logins)
  - Token-based authentication
  - Automatic re-authentication on 403
  - Exponential backoff retry (max 2 attempts)
}
```

**Future**: Shared authentication library across all projects

### Configuration

**Current State**:
- Each application has its own configuration files
- RevSport credentials in `.env` files
- Display settings in JSON files

**Future State** (Multi-Club):
- Centralized club profile configuration
- Shared credential vault
- Configuration wizard for initial setup
- Configuration synchronization across applications

### Monitoring & Logging

**Current**:
- systemd journald logs
- Application-specific logging
- Manual log inspection via `journalctl`

**Future**:
- Centralized logging
- Health check endpoints
- Remote monitoring dashboard
- Automated alerting

## Network Architecture

### Production (Raspberry Pi)

```
┌─────────────────────────────────────┐
│         Raspberry Pi                 │
│                                      │
│  ┌──────────────────────────────┐   │
│  │   Booking Viewer :3000       │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │   Noticeboard :3001          │   │
│  └──────────────────────────────┘   │
│                                      │
│  ┌──────────────────────────────┐   │
│  │   Boat Booking :3002         │   │
│  └──────────────────────────────┘   │
│                                      │
└────────────┬─────────────────────────┘
             │
             │ WiFi/Ethernet
             │
             ▼
     ┌───────────────┐
     │   Internet    │
     │  RevSport API │
     └───────────────┘
```

### Development (Local)

```
┌─────────────────────────────────────┐
│      Developer Workstation           │
│                                      │
│  Each project runs independently:    │
│  - npm run dev (booking viewer)      │
│  - Port 3000+ for local testing      │
│                                      │
└────────────┬─────────────────────────┘
             │
             │ HTTP(S)
             │
             ▼
     ┌───────────────┐
     │   Internet    │
     │  RevSport API │
     └───────────────┘
```

## Data Flow

### Booking Viewer Data Flow

1. **Authentication Phase**:
   ```
   Server → RevSport: POST /login (credentials)
   RevSport → Server: Session cookie/token
   ```

2. **Data Fetch Phase** (every 10 minutes):
   ```
   Server → RevSport: GET /api/assets (list boats)
   Server → RevSport: GET /api/bookings?assetId=X (batched)
   Server → Cache: Store booking data
   ```

3. **Client Update Phase**:
   ```
   Browser → Server: GET /api/v1/bookings
   Server → Browser: JSON (cached data)
   Browser: Silent update of display
   ```

### Request Batching Strategy

To prevent Cloudflare rate limiting:

```
Traditional (caused blocks):
┌────┐ ┌────┐ ┌────┐     ┌────┐
│Boat│ │Boat│ │Boat│ ... │Boat│  (42 parallel)
│ 1  │ │ 2  │ │ 3  │     │ 42 │
└────┘ └────┘ └────┘     └────┘
   ▼      ▼      ▼          ▼
         All at once

Current (v1.0.0):
Batch 1: [1,2,3,4,5] → 500ms delay
Batch 2: [6,7,8,9,10] → 500ms delay
...
Batch 9: [41,42]

Total: ~4-5 seconds (acceptable for 10-min refresh)
```

## Security Considerations

### Current

**Credentials**:
- Stored in `.env` files (gitignored)
- Plain text on filesystem
- Secured by file permissions

**Network**:
- HTTPS to RevSport API
- HTTP within local network (Pi → TV)
- No external exposure

**Access Control**:
- Configuration UI has no authentication (local network only)
- Systemd services run as dedicated `lmrc` user

### Future Improvements

**For Multi-Club Deployment**:
- Encrypted credential storage
- Secure setup wizard
- HTTPS for configuration interface
- Role-based access control
- Audit logging
- Remote management authentication

## Deployment Model

### Current (Single Club)

```
Development → GitHub → Manual Pull → Pi → Production
```

### Future (Multi-Club)

```
Development → GitHub → CI/CD → SD Card Images → Ship to Club
                                       ↓
                                  First Boot
                                       ↓
                                  Setup Wizard
                                       ↓
                                  Auto-updates
```

## Technology Stack

### Booking Viewer
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **Framework**: Express 4.x
- **Validation**: Zod
- **HTTP Client**: Axios
- **Process Manager**: systemd
- **Build Tool**: TypeScript compiler

### Shared Tools
- **Version Control**: Git
- **Deployment**: Bash scripts + systemd
- **Hardware**: Raspberry Pi 4+
- **OS**: Raspberry Pi OS (Debian-based)

## Future Architecture Considerations

### Phase 2: Configuration Wizard

```
┌──────────────────────────────────────┐
│      Setup Wizard Server             │
│    (runs on first boot)              │
│                                      │
│  - WiFi configuration                │
│  - Club profile setup                │
│  - RevSport credential entry         │
│  - Display preferences               │
│                                      │
└────────────┬─────────────────────────┘
             │
             │ Generates
             │
             ▼
     ┌───────────────┐
     │ Configuration │
     │    Files      │
     └───────┬───────┘
             │
             │ Used by
             │
             ▼
     ┌───────────────┐
     │  Application  │
     │   Services    │
     └───────────────┘
```

### Phase 3: Multi-Club Ready

```
┌─────────────────────────────────────┐
│   Configuration Management Layer     │
│                                      │
│  - Club profile abstraction          │
│  - Shared configuration library      │
│  - Template system                   │
│                                      │
└────────────┬─────────────────────────┘
             │
             │ Provides config to
             │
     ┌───────┴────────┬────────────┐
     ▼                ▼            ▼
┌─────────┐   ┌──────────┐   ┌─────────┐
│ Booking │   │ Booking  │   │ Notice  │
│  Page   │   │  Viewer  │   │  Board  │
└─────────┘   └──────────┘   └─────────┘
```

### Phase 4: Commercial Product

```
┌──────────────────────────────────────┐
│     Management Portal (Cloud)         │
│  - Customer management                │
│  - Remote diagnostics                 │
│  - Update distribution                │
│  - Support ticketing                  │
└────────────┬─────────────────────────┘
             │
             │ HTTPS/WSS
             │
     ┌───────┴────────┬─────────────┐
     ▼                ▼             ▼
┌─────────┐     ┌─────────┐   ┌─────────┐
│  Club A │     │  Club B │   │  Club C │
│   Pi    │     │   Pi    │   │   Pi    │
└─────────┘     └─────────┘   └─────────┘
```

## Integration Points

### Between LMRC Projects

**Shared Concerns**:
- Club branding (logo, name, colors)
- RevSport authentication
- Configuration management
- Deployment automation

**Future Shared Libraries**:
- `@lmrc/config` - Configuration schemas
- `@lmrc/auth` - RevSport authentication
- `@lmrc/ui-components` - Shared UI elements
- `@lmrc/deployment` - Deployment utilities

### External Integrations

**Current**:
- RevSport API (boat bookings, member data)

**Future Possibilities**:
- Payment processing (subscription management)
- Analytics services (usage tracking)
- Remote management (cloud dashboard)
- Email/SMS notifications
- Calendar systems (Google, Outlook)

## Performance Targets

### Current (v1.0.0)

| Metric | Target | Actual |
|--------|--------|--------|
| Data refresh | < 5s | ~2s |
| Per-boat fetch | < 50ms | ~7ms |
| UI update | < 100ms | ~50ms |
| Memory usage | < 200MB | ~150MB |
| CPU usage (idle) | < 5% | ~2% |

### Future Targets (Multi-Club)

| Metric | Target |
|--------|--------|
| First boot to configured | < 10 minutes |
| Setup wizard completion | < 5 minutes |
| Configuration change apply | < 5 seconds |
| Auto-update download | < 2 minutes |
| Auto-update apply | < 1 minute |

## Scalability Considerations

### Single Pi Capacity

**Current Load** (LMRC):
- 42 boats tracked
- 3 applications running
- 10-minute refresh intervals
- Minimal database load

**Estimated Capacity**:
- Up to 100 boats (with batching)
- Up to 5 concurrent applications
- Down to 5-minute refresh intervals
- Multiple TV displays per app

### Multi-Club Scaling

**Option 1**: One Pi per club (preferred)
- Simple deployment
- No cross-club interference
- Easy troubleshooting
- Aligns with hardware sales model

**Option 2**: Shared infrastructure
- More complex
- Requires multi-tenancy implementation
- Cost savings for hosting
- May be needed for cloud-based features

## Monitoring & Observability

### Current

**Logs**: `journalctl -u lmrc-booking-viewer`

**Key Indicators**:
- Service status (active/failed)
- HTTP response codes
- Authentication failures (403 errors)
- API request timing

### Future

**Health Checks**:
- `/health` endpoint (basic)
- `/health/detailed` endpoint (comprehensive)
- Systemd watchdog integration

**Metrics**:
- Request counts
- Response times
- Error rates
- Cache hit rates
- Memory/CPU usage

**Alerting**:
- Service failures
- Authentication failures
- API rate limiting
- Configuration errors

## Documentation Strategy

### Current Structure

```
LMRC/
├── README.md              # Solution overview
├── ARCHITECTURE.md        # This file
├── PRODUCT_ROADMAP.md     # Future vision
│
├── lmrc-booking-system/
│   ├── README.md          # Project-specific docs
│   └── SESSION_NOTES.md   # Technical reference
│
├── BoatBooking/
│   └── README.md
│
├── Noticeboard/
│   └── README.md
│
└── lmrc-pi-deployment/
    └── README.md
```

### Documentation Principles

- **Parent level**: Cross-cutting concerns, architecture, roadmap
- **Project level**: Implementation details, setup, troubleshooting
- **Code level**: Inline comments for complex logic

---

**Last Updated**: 2025-10-30
**Version**: 1.0
**Status**: Living Document
