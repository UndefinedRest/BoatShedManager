# LMRC Digital Solution Suite

Complete digital infrastructure for rowing club operations, currently deployed at Leichhardt Mudcrabs Rowing Club (LMRC).

## Overview

This solution provides three integrated applications for rowing club management:

1. **Booking Viewer** - Real-time display of boat bookings and availability
2. **Boat Booking System** - Member interface for booking boats and equipment
3. **Noticeboard** - Digital display for club announcements and events

All applications are designed to run on Raspberry Pi hardware connected to TV displays throughout the club.

## Projects

### 📊 Booking Viewer
**Repository**: [BoatBookingsCalendar](https://github.com/UndefinedRest/BoatBookingsCalendar)
**Location**: `lmrc-booking-system/`
**Status**: v1.0.0 - Production

Real-time display of boat bookings fetched from RevSport API. Shows current and upcoming bookings with color-coded availability status.

**Features**:
- Cloudflare-safe authentication with request batching
- Silent background updates (no loading screen interruptions)
- Configurable logo and display options
- Web-based configuration interface
- Reliable performance: 2s total refresh, 7ms avg per boat

**Tech Stack**: TypeScript, Node.js, Express, Zod validation

### 📅 Boat Booking
**Repository**: [LMRC-BoatBookings](https://github.com/UndefinedRest/LMRC-BoatBookings)
**Location**: `BoatBooking/`

Member-facing interface for booking boats, equipment, and facilities.

### 📺 Noticeboard
**Repository**: [LMRC_Noticeboard](https://github.com/UndefinedRest/LMRC_Noticeboard)
**Location**: `Noticeboard/`

Digital signage displaying club announcements, events, and important information.

### 🚀 Pi Deployment
**Repository**: [lmrc-pi-deployment](https://github.com/UndefinedRest/lmrc-pi-deployment)
**Location**: `lmrc-pi-deployment/`

Deployment scripts, systemd service configurations, and update automation for Raspberry Pi installations.

## Getting Started

### Prerequisites
- Node.js 18+ (for development)
- Raspberry Pi 4+ (for production deployment)
- Access to RevSport API credentials

### Development Setup

1. Open the workspace in VSCode:
   ```bash
   code lmrc-solution.code-workspace
   ```

2. Each project has its own `README.md` with specific setup instructions

3. Install dependencies in each project:
   ```bash
   cd lmrc-booking-system && npm install
   cd ../BoatBooking && npm install
   cd ../Noticeboard && npm install
   ```

### Production Deployment

See [lmrc-pi-deployment/README.md](lmrc-pi-deployment/README.md) for detailed deployment instructions.

## 📚 Documentation

**Complete documentation is available in the [docs/](docs/) folder:**

- **[Documentation Hub](docs/README.md)** - Central navigation for all documentation
- **[Architecture Overview](docs/architecture/overview.md)** - System architecture and design
- **[Production Setup](docs/deployment/production-setup.md)** - Deploy to Raspberry Pi
- **[Getting Started](docs/development/getting-started.md)** - Developer setup guide
- **[Product Roadmap](PRODUCT_ROADMAP.md)** - Future vision and plans
- **[Architectural Roadmap](ARCHITECTURAL_ROADMAP.md)** - Technical backlog and implementation status

**For Claude Code**: See [.claude/CONTEXT.md](.claude/CONTEXT.md) for session context

## Current Status

**Production Environment**: Deployed on Raspberry Pi at LMRC
- Booking Viewer: v1.0.0 ✅
- Boat Booking: Active
- Noticeboard: Active

**Refresh Interval**: 10 minutes (configurable)

## Future Vision

This solution is being developed with the goal of offering it as a commercial product to other rowing clubs. The architecture is designed to support:

- Multi-club tenancy
- Zero-touch deployment
- Non-technical user configuration via startup wizard
- Centralized management and monitoring

See [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) for detailed future plans.

## Repository Structure

```
LMRC/
├── lmrc-solution.code-workspace    # VSCode workspace
├── README.md                       # This file
├── PRODUCT_ROADMAP.md             # Future product vision
├── ARCHITECTURE.md                # System architecture
│
├── lmrc-booking-system/           # Booking viewer (TypeScript)
│   ├── src/                       # Source code
│   ├── public/                    # Frontend assets
│   └── config/                    # Configuration files
│
├── BoatBooking/                   # Boat booking system
│   └── ...
│
├── Noticeboard/                   # Digital noticeboard
│   └── ...
│
└── lmrc-pi-deployment/            # Deployment infrastructure
    ├── scripts/                   # Update and setup scripts
    └── systemd/                   # Service configurations
```

## Contributing

This is currently a private solution for LMRC with plans for future commercialization.

## License

Proprietary - All rights reserved

## Support

For issues or questions:
- Check project-specific READMEs
- See [Troubleshooting Guide](docs/deployment/troubleshooting.md)
- Review [Session Notes](.claude/session-notes/) for detailed technical context
- See [Documentation Hub](docs/README.md) for all guides

---

**Last Updated**: 2025-10-30
**Maintainer**: @UndefinedRest
