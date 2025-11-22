# Troubleshooting Guide

**Last Updated**: 2025-11-22
**Status**: TODO - Needs consolidation from various troubleshooting docs

---

## Diagnostic Tools

### Health Check

```bash
/opt/lmrc/shared/scripts/health-check.sh
```

Checks services, connectivity, resources, and configuration.

### Service Logs

```bash
# View recent logs
sudo journalctl -u lmrc-booking-viewer -n 50

# Follow logs in real-time
sudo journalctl -u lmrc-noticeboard -f

# Logs since specific time
sudo journalctl -u lmrc-launcher --since "1 hour ago"
```

## Common Issues

### Services Not Starting

TODO: Troubleshooting steps

### Application Not Responding

TODO: Troubleshooting steps

### Display Issues

TODO: Troubleshooting steps

### Browser Auto-Refresh Issue (Noticeboard)

**Problem**: Browser refreshes periodically, preventing gallery from cycling

**Diagnostic Script**: See [.claude/DIAGNOSE_REFRESH_ISSUE.md](../../.claude/DIAGNOSE_REFRESH_ISSUE.md)

**Status**: Under investigation

**Steps**:
1. Check service restart frequency
2. Check for cron jobs
3. Check for systemd timers
4. Monitor in real-time

### Network Connectivity Issues

TODO: Troubleshooting steps

### RevSport API Issues

TODO: Troubleshooting steps

### Memory/Disk Space Issues

TODO: Troubleshooting steps

## Advanced Diagnostics

### Checking Service Configuration

```bash
systemctl cat lmrc-booking-viewer.service
```

### Checking Process Status

```bash
ps aux | grep node
ps aux | grep chromium
```

### Checking Port Usage

```bash
sudo netstat -tulpn | grep 3000
```

## Recovery Procedures

### Restart All Services

TODO: Safe restart procedure

### Factory Reset

TODO: Reset to clean state

### Rebuild from Backup

TODO: Restore from backup

---

**See Also**:
- [Production Setup](production-setup.md)
- [Operations Guide](../operations/monitoring.md)
- [DIAGNOSE_REFRESH_ISSUE.md](../../.claude/DIAGNOSE_REFRESH_ISSUE.md)
