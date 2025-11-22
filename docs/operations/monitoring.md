# Monitoring and Operations

**Last Updated**: 2025-11-22
**Status**: TODO - Needs content

---

## Overview

Guide for monitoring LMRC production deployments.

## Health Monitoring

### Automated Health Checks

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

### Manual Checks

TODO: Document manual monitoring procedures

## Service Monitoring

### Check Service Status

```bash
sudo systemctl status lmrc-launcher
sudo systemctl status lmrc-booking-viewer
sudo systemctl status lmrc-noticeboard
sudo systemctl status lmrc-kiosk
```

### View Service Logs

```bash
sudo journalctl -u lmrc-noticeboard -f
```

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

## Application Monitoring

### HTTP Endpoint Checks

```bash
curl http://localhost:3000
```

### Kiosk Display Checks

TODO: Document visual verification process

## Log Management

### Log Locations

- Service logs: `journalctl -u <service-name>`
- Scraper logs: `/opt/lmrc/shared/logs/scraper.log`
- Application logs: TODO

### Log Rotation

TODO: Document log rotation policy

## Alerts and Notifications

TODO: Document alerting strategy (if any)

## Scheduled Maintenance

TODO: Document maintenance schedule

### Daily Tasks

TODO

### Weekly Tasks

TODO

### Monthly Tasks

TODO

## Performance Metrics

TODO: Document key metrics to track

---

**See Also**:
- [Maintenance Guide](maintenance.md)
- [Troubleshooting](../deployment/troubleshooting.md)
- [Health Check Script](../../lmrc-pi-deployment/scripts/health-check.sh)
