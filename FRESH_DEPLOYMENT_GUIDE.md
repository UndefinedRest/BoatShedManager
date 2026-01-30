# Fresh Deployment Guide - Replacing Old PM2 Installation

**Date**: 2025-10-29
**Purpose**: Clean up old PM2-based installation and deploy new systemd-based system
**Time Required**: 30-45 minutes

---

## Overview

You're currently running the old standalone installations:
- `/home/greg/lmrc-booking-system` (PM2 managed)
- `/home/greg/lmrc-noticeboard` (PM2 managed)

This guide will help you:
1. ✅ Safely archive the old installations
2. ✅ Clean up PM2 services
3. ✅ Deploy the new systemd-based system to `/opt/lmrc`
4. ✅ Set up the new Cloudflare avoidance features

---

## Prerequisites

- SSH access to the Raspberry Pi
- User: `greg` (you're already this user)
- Sudo privileges
- Internet connection on the Pi
- GitHub Personal Access Token (PAT) for cloning repositories

---

## Important: Repository Names

The actual GitHub repository names are:
- **Booking Viewer**: `BoatBookingsCalendar` (https://github.com/UndefinedRest/BoatBookingsCalendar.git)
- **Noticeboard**: `LMRC_Noticeboard` (https://github.com/UndefinedRest/LMRC_Noticeboard.git)

The install script (updated 2025-10-29) now uses these correct names and will clone them automatically.

---

## Step-by-Step Instructions

### Step 1: Download the Cleanup Script

SSH to your Pi and download the deployment repository temporarily:

```bash
cd ~
git clone https://github.com/UndefinedRest/lmrc-pi-deployment.git lmrc-deployment-temp
cd lmrc-deployment-temp
```

### Step 2: Run the Cleanup Script

This will safely archive your old installations:

```bash
bash scripts/cleanup-old-installation.sh
```

**What it does:**
- Stops all PM2 processes
- Removes PM2 from startup
- Moves `/home/greg/lmrc-booking-system` → `~/lmrc-archive-TIMESTAMP/`
- Moves `/home/greg/lmrc-noticeboard` → `~/lmrc-archive-TIMESTAMP/`
- Backs up crontab
- Removes old cron jobs
- Cleans up PM2 directories

**You'll see:**
```
═══════════════════════════════════════════════════════════
  LMRC Old Installation Cleanup Script
═══════════════════════════════════════════════════════════

This script will:
  1. Stop and remove PM2 services
  2. Archive old installations to ~/lmrc-archive-20251029
  3. Remove old cron jobs
  4. Clean up PM2 completely

⚠️  IMPORTANT: Make sure you've committed any changes you want to keep!

Continue with cleanup? (yes/no):
```

Type `yes` and press Enter.

**Expected output:**
```
✓ PM2 services stopped and removed
✓ Moved to /home/greg/lmrc-archive-20251029/lmrc-booking-system
✓ Moved to /home/greg/lmrc-archive-20251029/lmrc-noticeboard
✓ Old cron jobs removed
✓ PM2 directory removed
```

---

### Step 3: Verify Cleanup

Check that old services are stopped:

```bash
# Should show no PM2 processes
pm2 list

# Should show old installations are archived
ls -la ~/lmrc-archive-*/
```

---

### Step 4: Run Fresh Installation

Now install the new system:

```bash
cd ~/lmrc-deployment-temp
sudo bash scripts/install.sh
```

**What it does:**
- Creates `/opt/lmrc/` structure
- Creates `lmrc` system user
- Installs Node.js 20 (if not present)
- Installs Chromium browser
- Clones both apps from GitHub
- Sets up systemd services
- Installs management scripts

**Expected output:**
```
═══════════════════════════════════════════════════════════
  LMRC Dual-App Deployment Installer
═══════════════════════════════════════════════════════════

This installer will:
  • Create /opt/lmrc directory structure
  • Install Node.js 20.x
  • Install Chromium browser
  • Clone LMRC applications
  • Set up systemd services
  • Configure shared credentials

Press Enter to continue, or Ctrl+C to cancel...
```

Press Enter to continue.

**Installation takes 10-15 minutes** depending on your internet speed.

---

### Step 5: Configure Credentials

After installation completes, configure your RevSport credentials:

```bash
sudo nano /opt/lmrc/shared/config/credentials.env
```

Add your credentials:
```bash
REVSPORT_BASE_URL=https://www.lakemacquarierowingclub.org.au
REVSPORT_USERNAME=your_username
REVSPORT_PASSWORD=your_password
CLUB_NAME=Lake Macquarie Rowing Club
CLUB_SHORT_NAME=LMRC
CLUB_PRIMARY_COLOR=#2778bf
CLUB_SECONDARY_COLOR=#1a5a8f
PORT=3000
NODE_ENV=production
```

Save with `Ctrl+X`, then `Y`, then `Enter`.

---

### Step 6: Configure Device

Edit the device configuration:

```bash
sudo nano /opt/lmrc/shared/config/device-config.json
```

Update the device ID and name:
```json
{
  "device": {
    "id": "rpi-boatshed-01",
    "name": "Boatshed Display 01"
  }
}
```

Save and exit.

---

### Step 7: Enable Launcher Service

Enable the launcher service to start on boot:

```bash
sudo systemctl enable lmrc-launcher.service
```

---

### Step 8: Reboot

Reboot the Pi to start the launcher:

```bash
sudo reboot
```

---

### Step 9: Select Application

After reboot, the launcher will detect no app is selected and run the selector.

If you have a monitor/keyboard connected, you'll see:
```
╔════════════════════════════════════════════════╗
║   LMRC Application Selector                    ║
╚════════════════════════════════════════════════╝

  [1] Boat Booking Viewer
  [2] Digital Noticeboard

Select application (1 or 2):
```

**Via SSH:** If you're only using SSH, the selector won't be interactive. Instead, run it manually:

```bash
ssh greg@your-pi-ip
sudo /opt/lmrc/shared/scripts/select-app.sh
```

Choose option `2` for Digital Noticeboard (to test Cloudflare avoidance).

---

### Step 10: Verify Deployment

Check that everything is running:

```bash
sudo /opt/lmrc/shared/scripts/status.sh
```

**Expected output:**
```
═══════════════════════════════════════════════════════════
  LMRC Application Status
═══════════════════════════════════════════════════════════

Active Application: noticeboard (Digital Noticeboard)

Service Status:
  lmrc-launcher.service:       ● active (exited)
  lmrc-noticeboard.service:    ● active (running)
  lmrc-kiosk.service:          ● active (running)

HTTP Health Check:
  http://localhost:3000        ✓ OK (HTTP 200)

Cron Jobs:
  */10 * * * * cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js

Recent Scraper Runs:
  [Last 5 lines from scraper.log]
```

---

### Step 11: Monitor Scraper Logs

Watch the scraper to verify Cloudflare avoidance is working:

```bash
tail -f /opt/lmrc/shared/logs/scraper.log
```

**What to look for:**
```
[Schedule] In "off-peak" window (08:30-17:30)
[Schedule] Configured interval: 240 minutes
[Schedule] ✓ Scraping should proceed

[Throttle] Waiting 3.2s before next section...
[Throttle] Waiting 4.7s before next section...

Duration: 12.45s
```

Press `Ctrl+C` to stop watching logs.

---

### Step 12: Test Schedule is Working

Run the scraper manually twice in a row:

```bash
cd /opt/lmrc/noticeboard
node scraper/noticeboard-scraper.js
```

First run should scrape normally. Immediately run again:

```bash
node scraper/noticeboard-scraper.js
```

Second run should skip:
```
[Schedule] In "off-peak" window (08:30-17:30)
[Schedule] Last run: 0.3 minutes ago
[Schedule] Too soon! Wait 239.7 more minutes
⏰ Skipping scrape - outside configured schedule
```

✅ **Perfect!** The schedule is working.

---

## Troubleshooting

### Issue: "systemctl: command not found"

**Solution:** Make sure you're using `sudo`:
```bash
sudo systemctl status lmrc-noticeboard
```

### Issue: "Permission denied" when editing config

**Solution:** Use `sudo` with nano:
```bash
sudo nano /opt/lmrc/shared/config/credentials.env
```

### Issue: Git "dubious ownership" error

**Symptom:**
```
fatal: detected dubious ownership in repository at '/opt/lmrc/booking-viewer'
```

**Cause:** The `/opt/lmrc/` directory is owned by user `lmrc` (service user), but you're logged in as `greg` (desktop user). This is correct and secure!

**Solution:**
```bash
# Option 1: Add safe directory (one-time fix)
sudo git config --global --add safe.directory /opt/lmrc/booking-viewer
sudo git config --global --add safe.directory /opt/lmrc/noticeboard

# Option 2: Always run git as lmrc user (recommended)
cd /opt/lmrc/booking-viewer
sudo -u lmrc git pull
sudo -u lmrc git status

# For npm commands, also use lmrc user
sudo -u lmrc npm install
sudo -u lmrc npm run build
```

**Why this is correct:**
- User `lmrc` owns the applications (service user)
- User `greg` manages the system (desktop user)
- This separation is a security best practice
- Kiosk runs as `greg` (desktop), apps run as `lmrc` (service)

### Issue: App won't start - "Cannot find module"

**Symptom:**
```
Error: Cannot find module '/opt/lmrc/booking-viewer/dist/server/index.js'
```

**Cause:** The repository wasn't cloned or wasn't built.

**Solution:**
```bash
# Check if directory has content
ls -la /opt/lmrc/booking-viewer/

# If empty, clone manually
sudo rm -rf /opt/lmrc/booking-viewer
sudo -u lmrc git clone https://github.com/UndefinedRest/BoatBookingsCalendar.git /opt/lmrc/booking-viewer

# Create .env symlink
sudo ln -sf /opt/lmrc/shared/config/credentials.env /opt/lmrc/booking-viewer/.env

# Install and build
cd /opt/lmrc/booking-viewer
sudo -u lmrc npm install
sudo -u lmrc npm run build

# Verify dist/ was created
ls -la dist/server/index.js

# Restart service
sudo systemctl restart lmrc-booking-viewer.service
```

### Issue: App won't start - Other reasons

**Check logs:**
```bash
sudo journalctl -u lmrc-noticeboard.service -n 50
```

**Common issues:**
- Missing credentials in `credentials.env`
- Port 3000 already in use
- Node.js not installed correctly

### Issue: Chromium not launching - Exit code 217/USER

**Symptom:**
```
Process: ExecStartPre=/bin/sleep 10 (code=exited, status=217/USER)
```

**Cause:** The kiosk service is configured to run as user `pi`, but that user doesn't exist.

**Solution:**
```bash
# Edit the kiosk service
sudo nano /etc/systemd/system/lmrc-kiosk.service

# Find: User=pi
# Change to your actual desktop user, e.g.: User=greg

# Save, then reload
sudo systemctl daemon-reload
sudo systemctl restart lmrc-kiosk.service
```

### Issue: Chromium not launching - Other reasons

**Check kiosk service:**
```bash
sudo systemctl status lmrc-kiosk.service
```

**Common issues:**
- No display connected (DISPLAY not set)
- Chromium not installed
- X11 vs Wayland display server mismatch

### Issue: Scraper failing with 403 errors

This is expected if you're currently blocked by Cloudflare. The new schedule should help:
- Wait for the blocking to expire (usually 24 hours)
- Or wait for RevSport to whitelist your IP

---

## Post-Deployment

### Adjusting Schedule for Seasons

Edit the schedule times in config.json:

```bash
sudo nano /opt/lmrc/noticeboard/config.json
```

Find `cloudflareAvoidance.scheduleWindows` and adjust times:

```json
{
  "name": "peak",
  "startTime": "05:30",  // Change for summer: "06:30"
  "endTime": "08:30",    // Change for summer: "09:30"
  "intervalMinutes": 15
}
```

Restart the service:
```bash
sudo systemctl restart lmrc-noticeboard.service
```

See [SCHEDULE_CONFIGURATION.md](https://github.com/UndefinedRest/LMRC_Noticeboard/blob/main/SCHEDULE_CONFIGURATION.md) for details.

---

### Switching Between Apps

To switch from Noticeboard to Booking Viewer (or vice versa):

```bash
sudo /opt/lmrc/shared/scripts/switch-app.sh
```

Follow the prompts, then reboot.

---

### Useful Management Commands

```bash
# Check status
sudo /opt/lmrc/shared/scripts/status.sh

# Health check
sudo /opt/lmrc/shared/scripts/health-check.sh

# Backup configuration
sudo /opt/lmrc/shared/scripts/backup.sh

# Update apps from GitHub
sudo /opt/lmrc/shared/scripts/update.sh

# View logs
tail -f /opt/lmrc/shared/logs/noticeboard.log
tail -f /opt/lmrc/shared/logs/scraper.log
```

---

## Cleaning Up Archive

After you've confirmed the new deployment works for a few days, you can delete the archive:

```bash
# Check archive size
du -sh ~/lmrc-archive-*

# Delete archive (ONLY after confirming new deployment works!)
rm -rf ~/lmrc-archive-*

# Remove temporary deployment directory
rm -rf ~/lmrc-deployment-temp
```

⚠️ **Only do this after you're 100% sure the new system is working!**

---

## What's Different in the New Deployment

| Feature | Old (PM2) | New (Systemd) |
|---------|-----------|---------------|
| Location | `/home/greg/` | `/opt/lmrc/` |
| Process Manager | PM2 | systemd |
| Auto-start | PM2 startup | systemd services |
| Cron Jobs | Manual setup | Auto-configured by launcher |
| Credentials | Per-app `.env` | Shared `/opt/lmrc/shared/config/credentials.env` |
| Management | PM2 commands | Management scripts |
| Security | User permissions | systemd hardening + restricted paths |
| Logging | PM2 logs | `/opt/lmrc/shared/logs/` |
| Updates | Manual git pull | `update.sh` script |
| Cloudflare Avoidance | None | Intelligent scheduling + throttling |

---

## Summary

After following this guide, you'll have:
- ✅ Old PM2 installations safely archived
- ✅ New systemd-based deployment in `/opt/lmrc`
- ✅ Cloudflare avoidance features enabled
- ✅ Configurable seasonal schedules
- ✅ Management scripts for maintenance
- ✅ Proper security hardening

The new system reduces Cloudflare exposure by **82%** (17 scrapes/day vs 96) and adds intelligent scheduling that matches your actual rowing hours.

---

**Need help?** Check the troubleshooting section above or review:
- [CLOUDFLARE_MITIGATION_STRATEGIES.md](https://github.com/UndefinedRest/LMRC_Noticeboard/blob/main/CLOUDFLARE_MITIGATION_STRATEGIES.md)
- [SCHEDULE_CONFIGURATION.md](https://github.com/UndefinedRest/LMRC_Noticeboard/blob/main/SCHEDULE_CONFIGURATION.md)
- [DEPLOYMENT_GUIDE.md](./docs/DEPLOYMENT_GUIDE.md)
