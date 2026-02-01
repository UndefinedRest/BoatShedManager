# Monitoring and Operations

**Last Updated**: 2026-02-01
**Status**: Current - SaaS + Pi deployment

---

## Overview

This guide covers monitoring for both the SaaS platform (cloud) and Raspberry Pi deployments.

## SaaS Platform Monitoring

### Health Endpoint

The primary monitoring endpoint for the SaaS platform:

```
GET https://lmrc.rowandlift.au/api/v1/health
```

**Response**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-01T06:00:00Z",
    "checks": {
      "database": {
        "status": "up",
        "latencyMs": 12
      },
      "scraper": {
        "status": "idle",
        "lastSuccessAt": "2026-02-01T05:58:00Z",
        "lastSuccessAgeSeconds": 120
      }
    },
    "club": {
      "id": "uuid",
      "name": "LMRC",
      "boatsCount": 42,
      "lastScrapedAt": "2026-02-01T05:58:00Z"
    }
  }
}
```

**Status Values**:
| Status | HTTP Code | Meaning |
|--------|-----------|---------|
| `healthy` | 200 | All systems operational |
| `degraded` | 200 | Some issues (slow DB, stale data) |
| `unhealthy` | 503 | Critical issues (DB unreachable) |

### UptimeRobot Configuration

Recommended UptimeRobot setup for SaaS monitoring:

1. **Create Account**: [uptimerobot.com](https://uptimerobot.com) (free tier sufficient)

2. **Add Monitor**:
   - Monitor Type: HTTP(s)
   - Friendly Name: `Rowing Boards - LMRC`
   - URL: `https://lmrc.rowandlift.au/api/v1/health`
   - Monitoring Interval: 5 minutes

3. **Alert Conditions**:
   - Alert on: HTTP status != 200
   - Optional: Alert if response contains `"status":"unhealthy"`

4. **Alert Contacts**:
   - Email: Your admin email
   - Optional: SMS, Slack webhook

### Key Metrics to Monitor

| Metric | Location | Alert Threshold |
|--------|----------|-----------------|
| Database latency | `checks.database.latencyMs` | > 500ms |
| Scrape age | `checks.scraper.lastSuccessAgeSeconds` | > 1800 (30 min) |
| Overall status | `status` | != "healthy" |

### Render Dashboard

Access Render metrics at: [dashboard.render.com](https://dashboard.render.com)

- **Web Service**: CPU, memory, request latency
- **Worker Service**: CPU, memory, job execution
- **Logs**: Real-time and historical logs

### Swagger Documentation

Interactive API documentation available at:
- Production: `https://lmrc.rowandlift.au/api-docs`
- Local: `http://localhost:3000/api-docs`

---

## Raspberry Pi Monitoring

### Health Check Script

```bash
/opt/lmrc/shared/scripts/health-check.sh
```

**Monitors**:
- Service status (launcher, apps, kiosk)
- HTTP endpoint availability
- Disk space usage
- Memory usage
- Network connectivity
- Configuration validity
- Background jobs (for Noticeboard)

### Service Status

```bash
# Check all LMRC services
sudo systemctl status lmrc-launcher
sudo systemctl status lmrc-booking-viewer
sudo systemctl status lmrc-noticeboard
sudo systemctl status lmrc-kiosk
```

### View Logs

```bash
# Real-time logs
sudo journalctl -u lmrc-booking-viewer -f

# Recent logs (last 50 lines)
sudo journalctl -u lmrc-launcher -n 50

# Logs from specific time
sudo journalctl -u lmrc-kiosk --since "1 hour ago"
```

---

## Resource Monitoring

### Disk Space

```bash
df -h /opt/lmrc
```

### Memory Usage

```bash
free -h
```

### Process Monitoring

```bash
top
htop
```

---

## Log Management

### Log Locations

**SaaS (Render)**:
- View in Render dashboard → Service → Logs
- Structured JSON format (Pino)

**Raspberry Pi**:
- Service logs: `journalctl -u <service-name>`
- Scraper logs: `/opt/lmrc/shared/logs/scraper.log`

### Log Format (SaaS)

Structured JSON logs with correlation IDs:
```json
{
  "timestamp": "2026-02-01T06:00:00Z",
  "level": "info",
  "requestId": "abc-123",
  "clubId": "lmrc-uuid",
  "method": "GET",
  "path": "/api/v1/boats",
  "status": 200,
  "duration": 45
}
```

---

## Alerts and Notifications

### Current Setup (Phase A)

- **UptimeRobot**: Monitors `/health` endpoint
- **Manual investigation**: Check Render logs when alerted

### Future Setup (Phase D)

- **Sentry**: Error tracking and alerting
- **Email on scrape failure**: Credential issues
- **Slack webhook**: Real-time notifications

---

## Admin Scripts

### Create Admin User

```bash
pnpm exec tsx scripts/create-admin-user.ts
```

Interactive script that prompts for:
- Club selection
- Email address
- Password
- Full name (optional)
- Role (club_admin/super_admin)

### Set Custom Domain

```bash
pnpm exec tsx scripts/set-custom-domain.ts <subdomain> <custom-domain>
```

Example:
```bash
pnpm exec tsx scripts/set-custom-domain.ts lmrc board.lakemacrowing.au
```

---

## Troubleshooting

### SaaS Issues

**Health endpoint returns unhealthy**:
1. Check Render logs for errors
2. Verify database connectivity (Supabase status)
3. Check if scraper worker is running

**Scrape data is stale**:
1. Check scraper worker status in Render
2. Verify RevSport credentials are valid
3. Check for RevSport site changes

**Login fails with 500**:
1. Check Render logs for bcrypt/JWT errors
2. Verify JWT_SECRET environment variable is set

### Pi Issues

**Chromium not launching**:
```bash
# Check kiosk service user
sudo nano /etc/systemd/system/lmrc-kiosk.service
# Ensure User= matches your desktop user
```

**Service fails to start**:
```bash
# Check logs
sudo journalctl -u lmrc-booking-viewer -n 50

# Rebuild if needed
cd /opt/lmrc/booking-viewer
sudo -u lmrc npm run build
sudo systemctl restart lmrc-booking-viewer
```

---

**See Also**:
- [API Reference](../reference/api.md) — Health endpoint documentation
- [Troubleshooting](../deployment/troubleshooting.md) — Common issues
- [ARCHITECTURAL_ROADMAP.md](../../ARCHITECTURAL_ROADMAP.md) — Phase D monitoring plans
