# LMRC Deployment System - Quick Reference Card

**Print this card and keep near deployed devices**

---

## Essential Commands

### Check System Status
```bash
/opt/lmrc/shared/scripts/status.sh
```
Shows active app, service status, device info

### Switch Applications
```bash
sudo /opt/lmrc/shared/scripts/switch-app.sh
```
Toggle between Booking Viewer and Noticeboard

### Health Check
```bash
/opt/lmrc/shared/scripts/health-check.sh
```
Comprehensive system health verification

---

## Service Management

### View Logs (Live)
```bash
# Booking Viewer
sudo journalctl -u lmrc-booking-viewer -f

# Noticeboard
sudo journalctl -u lmrc-noticeboard -f

# All LMRC services
sudo journalctl -u lmrc-* -f
```

### Restart Services
```bash
# Booking Viewer
sudo systemctl restart lmrc-booking-viewer

# Noticeboard
sudo systemctl restart lmrc-noticeboard

# Kiosk (browser)
sudo systemctl restart lmrc-kiosk
```

### Check Service Status
```bash
sudo systemctl status lmrc-booking-viewer
sudo systemctl status lmrc-noticeboard
sudo systemctl status lmrc-kiosk
```

---

## Configuration

### Edit Credentials
```bash
sudo nano /opt/lmrc/shared/config/credentials.env
```
Update RevSport username/password

**After changing:** Restart service
```bash
sudo systemctl restart lmrc-booking-viewer
# or
sudo systemctl restart lmrc-noticeboard
```

### Edit Device Config
```bash
sudo nano /opt/lmrc/shared/config/device-config.json
```
Update device ID, name, location

---

## Maintenance

### Backup Configuration
```bash
sudo /opt/lmrc/shared/scripts/backup.sh
```
Saves config to `/home/pi/lmrc-backups/`

### Update Applications
```bash
sudo /opt/lmrc/shared/scripts/update.sh
```
Pulls latest code from git, rebuilds apps

### System Update
```bash
sudo apt update
sudo apt upgrade -y
sudo reboot
```
Run monthly

---

## Troubleshooting

### Application Not Responding
```bash
# Check if running
curl http://localhost:3000

# Check service
sudo systemctl status lmrc-booking-viewer

# Restart
sudo systemctl restart lmrc-booking-viewer
```

### Display Shows Error
```bash
# Check all services
/opt/lmrc/shared/scripts/status.sh

# View recent errors
sudo journalctl -u lmrc-* --since "10 minutes ago"

# Restart kiosk
sudo systemctl restart lmrc-kiosk
```

### Wrong Application Running
```bash
# Check current app
/opt/lmrc/shared/scripts/status.sh

# Switch to correct app
sudo /opt/lmrc/shared/scripts/switch-app.sh
```

### Stale Data (Not Updating)
```bash
# Check credentials
cat /opt/lmrc/shared/config/credentials.env

# Verify no "CHANGE_ME" values
# If found, edit and update

# Restart service
sudo systemctl restart lmrc-booking-viewer
```

---

## Network Issues

### Check Connectivity
```bash
# Internet
ping -c 3 8.8.8.8

# RevSport server
ping -c 3 www.lakemacquarierowingclub.org.au

# DNS
nslookup www.lakemacquarierowingclub.org.au
```

### Get IP Address
```bash
hostname -I
```

### Restart Networking
```bash
sudo systemctl restart networking
```

---

## System Information

### Disk Space
```bash
df -h
```
Watch for >80% usage

### Memory Usage
```bash
free -h
```

### System Logs
```bash
# Last 50 lines
sudo journalctl -n 50

# Last hour
sudo journalctl --since "1 hour ago"

# Errors only
sudo journalctl -p err --since today
```

### Pi Temperature
```bash
vcgencmd measure_temp
```
Should be <80°C

---

## File Locations

| File/Directory | Purpose |
|----------------|---------|
| `/opt/lmrc/shared/config/device-config.json` | Device configuration |
| `/opt/lmrc/shared/config/credentials.env` | RevSport credentials |
| `/opt/lmrc/shared/logs/` | Application logs |
| `/opt/lmrc/booking-viewer/` | Booking Viewer app |
| `/opt/lmrc/noticeboard/` | Noticeboard app |
| `/etc/systemd/system/lmrc-*.service` | Service definitions |

---

## Emergency Recovery

### Restart Everything
```bash
sudo systemctl stop lmrc-*
sudo systemctl start lmrc-launcher
sudo systemctl start lmrc-kiosk
```

### Force Reboot
```bash
sudo reboot
```

### Restore Backup
```bash
# List backups
ls -lh /home/pi/lmrc-backups/

# Restore (replace YYYYMMDD_HHMMSS)
sudo tar -xzf /home/pi/lmrc-backups/lmrc-config-YYYYMMDD_HHMMSS.tar.gz -C /
sudo systemctl daemon-reload
sudo reboot
```

---

## Common Error Messages

| Error | Likely Cause | Solution |
|-------|--------------|----------|
| "Port 3000 in use" | Service already running | `sudo systemctl restart lmrc-*` |
| "Not authenticated" | Invalid credentials | Edit credentials.env |
| "ECONNREFUSED" | No network | Check ethernet/WiFi |
| "Cannot find module" | Missing dependencies | `cd /opt/lmrc/booking-viewer && sudo -u lmrc npm install` |
| "This site can't be reached" | App not running | `sudo systemctl start lmrc-booking-viewer` |

---

## Contact Information

**Technical Support:**
- Check logs first: `sudo journalctl -u lmrc-* -n 100`
- Try health check: `/opt/lmrc/shared/scripts/health-check.sh`
- Contact: [Add club tech contact]

**Documentation:**
- Full Guide: `/opt/lmrc/deployment/docs/DEPLOYMENT_GUIDE.md`
- Troubleshooting: `/opt/lmrc/deployment/docs/TROUBLESHOOTING.md`
- Architecture: `/opt/lmrc/deployment/docs/ARCHITECTURE.md`

---

## Device Information

**Fill in for this device:**

| Field | Value |
|-------|-------|
| Device ID | _________________ |
| Device Name | _________________ |
| Location | _________________ |
| Active App | ☐ Booking Viewer &nbsp; ☐ Noticeboard |
| IP Address | _________________ |
| Deployed | ___/___/_____ |

---

## Quick Diagnostic

**Run this one command for quick diagnostics:**

```bash
/opt/lmrc/shared/scripts/health-check.sh
```

**Output shows:**
- ✓ Service Status
- ✓ HTTP Response
- ✓ Kiosk Display
- ✓ Disk Space
- ✓ Memory
- ✓ Network
- ✓ Configuration

---

**Version**: 1.0 | **Last Updated**: 2025-10-28
**Print Date**: ___/___/_____ | **Keep with device at all times**
