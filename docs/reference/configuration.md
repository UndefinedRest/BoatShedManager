# Configuration Reference

**Last Updated**: 2025-11-22
**Status**: TODO - Needs consolidation from config documentation

---

## Overview

Complete reference for LMRC configuration files and options.

## Configuration Files

### Device Configuration

**Location**: `/opt/lmrc/shared/config/device-config.json`

```json
{
  "activeApp": "noticeboard",
  "deviceId": "pi-clubhouse-01",
  "location": "clubhouse"
}
```

**Fields**:
- `activeApp`: Which application to run ("booking-viewer" or "noticeboard")
- `deviceId`: Unique identifier for this device
- `location`: Physical location description

### Credentials

**Location**: `/opt/lmrc/shared/config/credentials.env`

TODO: Document credential format and fields

### Application Configuration

TODO: Document app-specific configuration

#### Booking Viewer Configuration

TODO: Configuration options

#### Noticeboard Configuration

TODO: Configuration options
- Gallery display settings
- Scraper schedule
- Weather API settings

## Environment Variables

TODO: Document environment variables

## Future: @lmrc/config Library

**Status**: Built but not yet integrated (Phase 1)

The @lmrc/config library will provide:
- Type-safe configuration
- JSON-based config files
- Schema validation with Zod
- Centralized configuration management

See [IMPLEMENTATION_PLAN.md](../../IMPLEMENTATION_PLAN.md) Phase 1 for integration plans.

## Configuration Best Practices

TODO: Document configuration management practices

---

**See Also**:
- [Architecture Overview](../architecture/overview.md)
- [@lmrc/config README](../../packages/config/README.md)
- [Architectural Roadmap](../../ARCHITECTURAL_ROADMAP.md)
