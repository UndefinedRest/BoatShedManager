# LMRC Deployment System - Troubleshooting Guide

Common issues and solutions for the LMRC Raspberry Pi deployment system.

## Quick Diagnostics

Run these commands first to gather information:

```bash
# Check system status
/opt/lmrc/shared/scripts/status.sh

# Check all LMRC services
sudo systemctl status lmrc-*

# View recent logs
sudo journalctl -u lmrc-* --since "1 hour ago"

# Check disk space
df -h

# Check network
ping -c 3 google.com
```

---

## Display Issues

### Black Screen on Boot

**Symptoms**: Display shows nothing after boot

**Diagnosis**:
```bash
# SSH into the Pi
ssh pi@<pi-ip-address>

# Check if desktop loaded
ps aux | grep lxsession

# Check kiosk service
sudo systemctl status lmrc-kiosk
```

**Solutions**:

1. **Desktop not starting**:
   ```bash
   # Check boot config
   sudo raspi-config
   # System Options → Boot → Desktop Autologin
   ```

2. **Kiosk service failed**:
   ```bash
   # Restart kiosk
   sudo systemctl restart lmrc-kiosk

   # Check logs
   sudo journalctl -u lmrc-kiosk -n 50
   ```

3. **Application not running**:
   ```bash
   # Check app service
   sudo systemctl status lmrc-booking-viewer
   # or
   sudo systemctl status lmrc-noticeboard

   # Start if stopped
   sudo systemctl start lmrc-booking-viewer
   ```

### Display Shows Error Page

**Symptoms**: Browser shows "This site can't be reached" or error message

**Diagnosis**:
```bash
# Check if app is responding
curl http://localhost:3000

# Check service status
/opt/lmrc/shared/scripts/status.sh
```

**Solutions**:

1. **Service not running**:
   ```bash
   # Start the service
   sudo systemctl start lmrc-booking-viewer  # or lmrc-noticeboard

   # Enable for auto-start
   sudo systemctl enable lmrc-booking-viewer
   ```

2. **Service crashed**:
   ```bash
   # View error logs
   sudo journalctl -u lmrc-booking-viewer -n 100

   # Common causes:
   # - Invalid credentials
   # - Missing dependencies
   # - Port already in use
   ```

3. **Port in use**:
   ```bash
   # Find what's using port 3000
   sudo lsof -i :3000

   # Kill the process
   sudo kill -9 <PID>

   # Restart service
   sudo systemctl restart lmrc-booking-viewer
   ```

### Cursor Visible on Display

**Symptoms**: Mouse cursor shows on kiosk display

**Solution**:
```bash
# Install unclutter
sudo apt install -y unclutter

# Add to autostart
echo "@unclutter -idle 0.1 -root" >> ~/.config/lxsession/LXDE-pi/autostart

# Reboot
sudo reboot
```

### Screensaver Activating

**Symptoms**: Display goes black after period of inactivity

**Solution**:
```bash
# Edit autostart
nano ~/.config/lxsession/LXDE-pi/autostart

# Add these lines:
@xset s off
@xset -dpms
@xset s noblank

# Save and reboot
sudo reboot
```

---

## Application Issues

### Wrong Application Running

**Symptoms**: Noticeboard showing when Booking Viewer expected (or vice versa)

**Diagnosis**:
```bash
/opt/lmrc/shared/scripts/status.sh
```

**Solution**:
```bash
# Switch to correct application
sudo /opt/lmrc/shared/scripts/switch-app.sh

# Follow prompts and reboot
```

### Application Shows Old/Stale Data

**Symptoms**: Bookings or news not updating

**For Booking Viewer**:

```bash
# Check API connectivity
cd /opt/lmrc/booking-viewer
sudo -u lmrc node -e "require('./dist/server/index.js')"

# Check credentials
cat /opt/lmrc/shared/config/credentials.env

# Restart service
sudo systemctl restart lmrc-booking-viewer
```

**For Noticeboard**:

```bash
# Check scraper logs
tail -100 /opt/lmrc/shared/logs/scraper.log

# Run scraper manually
cd /opt/lmrc/noticeboard
sudo -u lmrc node scraper/noticeboard-scraper.js

# Check cron is running
sudo crontab -u lmrc -l

# Restart service
sudo systemctl restart lmrc-noticeboard
```

### Authentication Errors

**Symptoms**: "Not authenticated" or "Login failed" in logs

**Diagnosis**:
```bash
# Check credentials file
cat /opt/lmrc/shared/config/credentials.env

# Test login manually
cd /opt/lmrc/booking-viewer
sudo -u lmrc npm run dev
```

**Solution**:

1. **Verify credentials are correct**:
   ```bash
   sudo nano /opt/lmrc/shared/config/credentials.env
   # Update REVSPORT_USERNAME and REVSPORT_PASSWORD
   ```

2. **Ensure credentials have access**:
   - Test credentials in web browser
   - Login to RevSport manually
   - Verify account is active

3. **Restart application**:
   ```bash
   sudo systemctl restart lmrc-booking-viewer
   sudo systemctl restart lmrc-noticeboard
   ```

### Application Crashes Repeatedly

**Symptoms**: Service keeps restarting, logs show crashes

**Diagnosis**:
```bash
# View crash logs
sudo journalctl -u lmrc-booking-viewer -n 200

# Check for common errors:
# - ECONNREFUSED: Network issue
# - EADDRINUSE: Port conflict
# - MODULE_NOT_FOUND: Missing dependencies
```

**Solutions**:

1. **Missing dependencies**:
   ```bash
   cd /opt/lmrc/booking-viewer  # or noticeboard
   sudo -u lmrc npm install
   sudo -u lmrc npm run build
   ```

2. **Port conflict**:
   ```bash
   # Find conflicting process
   sudo lsof -i :3000
   sudo kill -9 <PID>
   ```

3. **Network issues**:
   ```bash
   # Test network
   ping -c 3 www.lakemacquarierowingclub.org.au

   # Check DNS
   nslookup www.lakemacquarierowingclub.org.au

   # Restart networking
   sudo systemctl restart networking
   ```

---

## Service Management Issues

### Service Won't Start

**Symptoms**: `systemctl start` fails immediately

**Diagnosis**:
```bash
# Check service status
sudo systemctl status lmrc-booking-viewer

# View detailed logs
sudo journalctl -xeu lmrc-booking-viewer

# Check if app directory exists
ls -la /opt/lmrc/booking-viewer
```

**Solutions**:

1. **Application not built**:
   ```bash
   cd /opt/lmrc/booking-viewer
   sudo -u lmrc npm run build

   # Verify dist folder exists
   ls dist/
   ```

2. **Permissions issue**:
   ```bash
   # Fix ownership
   sudo chown -R lmrc:lmrc /opt/lmrc/booking-viewer
   sudo chown -R lmrc:lmrc /opt/lmrc/noticeboard
   ```

3. **Service file misconfigured**:
   ```bash
   # Verify service file
   cat /etc/systemd/system/lmrc-booking-viewer.service

   # Reload systemd
   sudo systemctl daemon-reload
   ```

### Service Starts but Stops Immediately

**Symptoms**: Service shows "active" then "inactive" within seconds

**Diagnosis**:
```bash
# Check exit code and logs
sudo systemctl status lmrc-booking-viewer
sudo journalctl -u lmrc-booking-viewer -n 50
```

**Common Causes**:

1. **Node.js not found**:
   ```bash
   # Verify Node.js
   which node
   node --version  # Should be 20+

   # Update service file if node path different
   sudo nano /etc/systemd/system/lmrc-booking-viewer.service
   ```

2. **Environment file missing**:
   ```bash
   # Check symlink
   ls -la /opt/lmrc/booking-viewer/.env

   # Recreate if needed
   sudo ln -sf /opt/lmrc/shared/config/credentials.env /opt/lmrc/booking-viewer/.env
   ```

### Launcher Service Fails

**Symptoms**: No app starts on boot

**Diagnosis**:
```bash
sudo systemctl status lmrc-launcher
sudo journalctl -u lmrc-launcher -n 50
```

**Solutions**:

1. **Configuration file missing**:
   ```bash
   # Check config exists
   cat /opt/lmrc/shared/config/device-config.json

   # Recreate if needed
   sudo cp /opt/lmrc/deployment/config/device-config.json.template \
           /opt/lmrc/shared/config/device-config.json
   ```

2. **Scripts not executable**:
   ```bash
   sudo chmod +x /opt/lmrc/shared/scripts/*.sh
   ```

3. **No app selected**:
   ```bash
   # Run selector manually
   sudo /opt/lmrc/shared/scripts/select-app.sh
   ```

---

## Network Issues

### Cannot Connect to RevSport

**Symptoms**: "ENOTFOUND" or "ECONNREFUSED" errors

**Diagnosis**:
```bash
# Test DNS
nslookup www.lakemacquarierowingclub.org.au

# Test connection
curl -I https://www.lakemacquarierowingclub.org.au

# Check routing
ping -c 3 8.8.8.8
```

**Solutions**:

1. **DNS not working**:
   ```bash
   # Edit resolv.conf
   sudo nano /etc/resolv.conf
   # Add: nameserver 8.8.8.8

   # Or use systemd-resolved
   sudo systemctl restart systemd-resolved
   ```

2. **Network interface down**:
   ```bash
   # Check interfaces
   ip addr show

   # Restart networking
   sudo systemctl restart networking

   # For WiFi
   sudo rfkill unblock wifi
   ```

3. **Firewall blocking**:
   ```bash
   # Check if firewall enabled
   sudo ufw status

   # Disable if needed (not recommended for production)
   sudo ufw disable
   ```

### Pi Can't Be Reached via SSH

**Symptoms**: Cannot SSH to Pi

**Solutions**:

1. **Find Pi's IP address**:
   - Check router DHCP leases
   - Use `nmap`: `nmap -sn 192.168.1.0/24`
   - Connect monitor and keyboard, run: `hostname -I`

2. **SSH not enabled**:
   ```bash
   # Enable via raspi-config (needs monitor/keyboard)
   sudo raspi-config
   # Interface Options → SSH → Enable
   ```

3. **Wrong credentials**:
   - Default user is `pi`
   - Password set during OS imaging
   - Try: `ssh pi@raspberrypi.local`

---

## Configuration Issues

### Changes Not Taking Effect

**Symptoms**: Updated config but application shows old settings

**Solution**:
```bash
# Restart the application service
sudo systemctl restart lmrc-booking-viewer  # or lmrc-noticeboard

# For config changes, verify file:
cat /opt/lmrc/shared/config/credentials.env

# Check application is reading correct file
sudo -u lmrc printenv | grep REVSPORT
```

### Device Shows "CHANGE_ME" Credentials

**Symptoms**: Errors about CHANGE_ME in logs

**Solution**:
```bash
# Edit credentials file
sudo nano /opt/lmrc/shared/config/credentials.env

# Update:
REVSPORT_USERNAME=actual_username
REVSPORT_PASSWORD=actual_password

# Save and restart
sudo systemctl restart lmrc-booking-viewer
sudo systemctl restart lmrc-noticeboard
```

### Cannot Switch Applications

**Symptoms**: `switch-app.sh` fails or doesn't work

**Diagnosis**:
```bash
# Run with sudo
sudo /opt/lmrc/shared/scripts/switch-app.sh

# Check jq is installed
which jq
```

**Solutions**:

1. **Permission denied**:
   ```bash
   # Always use sudo
   sudo /opt/lmrc/shared/scripts/switch-app.sh
   ```

2. **jq not installed**:
   ```bash
   sudo apt install -y jq
   ```

3. **Config file corrupted**:
   ```bash
   # Validate JSON
   jq . /opt/lmrc/shared/config/device-config.json

   # Restore from template if invalid
   sudo cp /opt/lmrc/deployment/config/device-config.json.template \
           /opt/lmrc/shared/config/device-config.json

   # Re-run selector
   sudo /opt/lmrc/shared/scripts/select-app.sh
   ```

### Web Config UI Shows "Read-only file system" Error

**Symptoms**: Configuration web UI (http://localhost:3000/config or /config.html) shows error when saving:
```
Error saving: EROFS: read-only file system, open '/opt/lmrc/noticeboard/config.json.backup'
```

**Root Cause**: systemd service security setting `ProtectSystem=strict` restricts filesystem writes to only explicitly allowed paths. The application directory needs to be writable for config files and backups.

**Diagnosis**:
```bash
# Check current ReadWritePaths setting
sudo systemctl show lmrc-noticeboard.service | grep ReadWritePaths

# Expected (CORRECT):
# ReadWritePaths=/opt/lmrc/noticeboard /opt/lmrc/shared/logs

# If you see this (INCORRECT):
# ReadWritePaths=/opt/lmrc/noticeboard/data /opt/lmrc/shared/logs
# Then the application root directory is read-only!
```

**Solution**:

1. **For Noticeboard**:
   ```bash
   # Edit service file
   sudo nano /etc/systemd/system/lmrc-noticeboard.service

   # Find line: ReadWritePaths=/opt/lmrc/noticeboard/data /opt/lmrc/shared/logs
   # Change to: ReadWritePaths=/opt/lmrc/noticeboard /opt/lmrc/shared/logs

   # Save (Ctrl+X, Y, Enter)

   # Apply changes
   sudo systemctl daemon-reload
   sudo systemctl restart lmrc-noticeboard
   ```

2. **For Booking Viewer**:
   ```bash
   # Edit service file
   sudo nano /etc/systemd/system/lmrc-booking-viewer.service

   # Find line: ReadWritePaths=/opt/lmrc/shared/logs
   # Change to: ReadWritePaths=/opt/lmrc/booking-viewer /opt/lmrc/shared/logs

   # Save (Ctrl+X, Y, Enter)

   # Apply changes
   sudo systemctl daemon-reload
   sudo systemctl restart lmrc-booking-viewer
   ```

3. **Verify the fix**:
   ```bash
   # Test config save via API
   curl http://localhost:3000/api/config/full > /tmp/test-config.json
   curl -X POST http://localhost:3000/api/config/update \
     -H "Content-Type: application/json" \
     -d @/tmp/test-config.json

   # Should return: {"success":true,...}
   # Not: {"error":"EROFS: read-only file system",...}
   ```

**Why This Happens**:
- Config files (config.json, config/tv-display.json) are in the application root directory
- Backup files (config.json.backup) are also created in the root directory
- The original service configuration only allowed writes to the data/ subdirectory
- This security restriction prevented the config UI from creating backup files

**Note**: New deployments using updated lmrc-pi-deployment templates will have the correct settings automatically.

---

### Git Merge Conflicts When Updating Code

**Symptoms**: When running `git pull` to update the application, you see:
```
error: Your local changes to the following files would be overwritten by merge:
        config.json
Please commit your changes or stash them before you merge.
Aborting
```

**Root Cause**: Configuration files (config.json, config/tv-display.json) are tracked in git but also modified locally via the web UI. When pulling updates that include config changes, git detects conflicts.

**This is EXPECTED and NORMAL** - it happens because you've customized settings via the web UI.

---

#### Safe Update Procedure

**Method 1: Reset and Reconfigure (Safest for Code-Only Updates)**

Use this when the update contains only code changes, not config changes:

```bash
cd /opt/lmrc/noticeboard  # or /opt/lmrc/booking-viewer

# 1. Back up your current config (preserves local settings)
sudo -u lmrc cp config.json config.json.local-backup

# 2. Discard local changes and pull latest
sudo -u lmrc git reset --hard origin/main
sudo -u lmrc git pull

# 3. Restore your backup (your local settings)
sudo -u lmrc cp config.json.local-backup config.json

# 4. Rebuild and restart
sudo -u lmrc npm run build
sudo systemctl restart lmrc-noticeboard  # or lmrc-booking-viewer
```

**Method 2: Stash and Merge (For Config + Code Updates)**

Use this when the update includes both code AND config changes you want to keep:

```bash
cd /opt/lmrc/noticeboard  # or /opt/lmrc/booking-viewer

# 1. Back up current config
sudo -u lmrc cp config.json config.json.local-backup

# 2. Stash local changes
sudo -u lmrc git stash

# 3. Pull latest code
sudo -u lmrc git pull

# 4. Compare configs to see what changed
sudo -u lmrc diff config.json config.json.local-backup

# 5a. If new config has your settings already:
#     Just rebuild (new config is fine)
sudo -u lmrc npm run build
sudo systemctl restart lmrc-noticeboard

# 5b. If you need to preserve specific local settings:
#     Manually edit config via web UI at http://localhost:3000/config
#     OR selectively restore from backup
```

**Method 3: Quick Update (When You Trust New Config)**

Use this when you know the new config already contains your settings:

```bash
cd /opt/lmrc/noticeboard  # or /opt/lmrc/booking-viewer

# 1. Quick backup
sudo -u lmrc cp config.json config.json.local-backup

# 2. Force update
sudo -u lmrc git reset --hard origin/main
sudo -u lmrc git pull

# 3. Rebuild and restart
sudo -u lmrc npm run build
sudo systemctl restart lmrc-noticeboard
```

---

#### Which Method Should I Use?

| Scenario | Recommended Method | Why |
|----------|-------------------|-----|
| Code-only update (bug fixes, features) | Method 1 (Reset & Restore) | Preserves all your local settings |
| Config + code update with same settings | Method 3 (Quick Update) | New config already has your values |
| Config + code update with new settings | Method 2 (Stash & Merge) | Lets you review changes first |
| Not sure what changed | Method 2 (Stash & Merge) | Safest - lets you compare |

---

#### Common Questions

**Q: Will I lose my configuration settings?**
A: Not if you follow Method 1 or 2. Method 3 only if the new config doesn't have your settings.

**Q: How do I know if the new config has my settings?**
A: Run `diff config.json config.json.local-backup` after pulling. If output is empty or shows only minor changes, you're good.

**Q: What if I accidentally lost my settings?**
A: The web UI creates automatic backups. Check `/opt/lmrc/noticeboard/config.json.backup` or restore from `config.json.local-backup`.

**Q: Can I avoid this conflict entirely?**
A: Not easily. Config files need to be in git (for defaults) but also editable via web UI (for customization). This is a trade-off for ease of use.

**Q: Should I commit my config changes?**
A: **No**. Config files are environment-specific (each Pi has different settings). Keep local changes uncommitted and use the web UI for all config edits.

---

#### Recovery from Failed Update

If something went wrong and the application won't start:

```bash
cd /opt/lmrc/noticeboard  # or /opt/lmrc/booking-viewer

# 1. Check if backup exists
ls -la config.json.local-backup config.json.backup

# 2. Restore from most recent backup
sudo -u lmrc cp config.json.local-backup config.json
# OR
sudo -u lmrc cp config.json.backup config.json

# 3. Rebuild and restart
sudo -u lmrc npm run build
sudo systemctl restart lmrc-noticeboard

# 4. Check logs if still failing
sudo journalctl -u lmrc-noticeboard -n 50
```

---

## Performance Issues

### Application Running Slowly

**Symptoms**: Pages load slowly, laggy interface

**Diagnosis**:
```bash
# Check CPU
top

# Check memory
free -h

# Check disk I/O
iostat -x 1 5
```

**Solutions**:

1. **High CPU usage**:
   ```bash
   # Identify process
   top

   # If Node.js using 100%:
   sudo systemctl restart lmrc-booking-viewer
   ```

2. **Low memory**:
   ```bash
   # Check memory
   free -h

   # Clear caches
   sudo sync
   sudo sysctl -w vm.drop_caches=3
   ```

3. **Disk space full**:
   ```bash
   # Check space
   df -h

   # Clean up if needed
   sudo apt clean
   sudo apt autoremove

   # Clear old logs
   sudo journalctl --vacuum-time=7d
   ```

### Slow Network Response

**Symptoms**: Long delays loading data

**Solutions**:
```bash
# Test network speed
wget -O /dev/null http://speedtest.wdc01.softlayer.com/downloads/test10.zip

# Check for packet loss
ping -c 100 www.lakemacquarierowingclub.org.au | tail -5

# Switch to ethernet if on WiFi
# Or move Pi closer to WiFi access point
```

---

## System Issues

### Pi Won't Boot

**Symptoms**: No display activity, LED patterns indicate failure

**Solutions**:

1. **Power supply issue**:
   - Verify using official Raspberry Pi power supply
   - Check power LED is solid (not flickering)

2. **SD card corrupted**:
   - Remove SD card
   - Try in another computer
   - Re-flash if necessary
   - Restore from backup if available

3. **Hardware failure**:
   - Try different HDMI cable/port
   - Test with known-good SD card
   - Check for obvious physical damage

### Filesystem Corruption

**Symptoms**: Errors about read-only filesystem or I/O errors

**Diagnosis**:
```bash
# Check filesystem
mount | grep " / "

# Check for errors
dmesg | grep -i error
```

**Solutions**:

1. **Remount filesystem**:
   ```bash
   sudo mount -o remount,rw /
   ```

2. **Filesystem check** (requires reboot):
   ```bash
   # Schedule fsck on next boot
   sudo touch /forcefsck
   sudo reboot
   ```

3. **SD card failing**:
   - Backup data immediately
   - Replace SD card
   - Restore from backup

### Clock/Time Issues

**Symptoms**: Logs show wrong time, certificates fail

**Solution**:
```bash
# Check current time
date

# Sync time
sudo systemctl restart systemd-timesyncd

# Set timezone
sudo timedatectl set-timezone Australia/Sydney

# Verify
timedatectl status
```

---

## Recovery Procedures

### Complete Application Reinstall

```bash
# Stop services
sudo systemctl stop lmrc-*

# Backup config
sudo cp -r /opt/lmrc/shared/config /tmp/lmrc-config-backup

# Remove applications
sudo rm -rf /opt/lmrc/booking-viewer
sudo rm -rf /opt/lmrc/noticeboard

# Re-clone
cd /opt/lmrc
sudo git clone <booking-repo> booking-viewer
sudo git clone <noticeboard-repo> noticeboard

# Reinstall
cd booking-viewer
sudo -u lmrc npm install && sudo -u lmrc npm run build

cd ../noticeboard
sudo -u lmrc npm install && sudo -u lmrc npm run build

# Restore config
sudo cp -r /tmp/lmrc-config-backup/* /opt/lmrc/shared/config/

# Restart
sudo systemctl start lmrc-launcher
```

### System Restore from Backup

If you created an SD card backup:

1. Power off Pi
2. Remove SD card
3. Flash backup image to SD card
4. Reinsert and power on
5. Verify configuration
6. Update credentials if changed

### Factory Reset

```bash
# Remove all LMRC components
sudo systemctl stop lmrc-*
sudo systemctl disable lmrc-*
sudo rm -rf /opt/lmrc
sudo rm /etc/systemd/system/lmrc-*
sudo systemctl daemon-reload

# Remove lmrc user
sudo userdel -r lmrc

# Start fresh installation
# Follow DEPLOYMENT_GUIDE.md from beginning
```

---

## Getting Help

### Information to Collect

Before requesting help, gather:

```bash
# System info
uname -a
cat /etc/os-release

# Service status
sudo systemctl status lmrc-* > lmrc-status.txt

# Logs (last 500 lines)
sudo journalctl -u lmrc-* -n 500 > lmrc-logs.txt

# Configuration (REMOVE CREDENTIALS FIRST!)
cat /opt/lmrc/shared/config/device-config.json > device-config.txt

# Disk space
df -h > disk-space.txt

# Network status
ip addr show > network.txt
```

### Contact

1. Check this guide first
2. Review logs: `sudo journalctl -u lmrc-*`
3. Contact club technical committee with:
   - Description of issue
   - What you've tried
   - Log files (sanitized)
   - Device information

---

## Prevention

### Regular Maintenance

**Weekly**:
```bash
# Visual check: Is display working?
```

**Monthly**:
```bash
# Check logs for errors
sudo journalctl -u lmrc-* --since "1 month ago" | grep -i error

# Check disk space
df -h

# Check service status
/opt/lmrc/shared/scripts/status.sh
```

**Quarterly**:
```bash
# Update system
sudo apt update
sudo apt upgrade

# Reboot
sudo reboot
```

### Backup Strategy

```bash
# Backup configuration weekly
sudo tar -czf /home/pi/lmrc-config-$(date +%Y%m%d).tar.gz \
  /opt/lmrc/shared/config

# Keep last 4 backups
ls -t /home/pi/lmrc-config-*.tar.gz | tail -n +5 | xargs rm -f
```

### Monitoring

Set up simple monitoring:

```bash
# Create health check script
cat > /opt/lmrc/shared/scripts/health-check.sh << 'EOF'
#!/bin/bash
if ! curl -sf http://localhost:3000 > /dev/null; then
    echo "App not responding, restarting..."
    sudo systemctl restart lmrc-booking-viewer lmrc-noticeboard
fi
EOF

chmod +x /opt/lmrc/shared/scripts/health-check.sh

# Add to crontab
(crontab -l ; echo "*/5 * * * * /opt/lmrc/shared/scripts/health-check.sh") | crontab -
```

---

**Last Updated**: 2025-10-28
**Version**: 1.0
