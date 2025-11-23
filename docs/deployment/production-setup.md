# Production Setup Guide

**Last Updated**: 2025-11-24
**Status**: Current - systemd-based deployment

---

## Overview

This guide covers deploying LMRC applications to a **Raspberry Pi** using the dual-app deployment system with **systemd** services.

**Scope**: This guide is for Raspberry Pi deployments only (Booking Viewer and Noticeboard).

**For BoatBooking** (public website): See [BoatBooking/NETLIFY_DEPLOYMENT.md](../../BoatBooking/NETLIFY_DEPLOYMENT.md) for Netlify deployment.

**CRITICAL**: Production uses **systemd** for process management, NOT PM2. PM2 deployments are deprecated.

## Prerequisites

### Hardware Requirements

- **Raspberry Pi**: Pi 4 (4GB+) or Pi 5 (8GB recommended)
- **microSD Card**: 32GB+ (Class 10 or UHS-1)
- **Power Supply**: Official Raspberry Pi power supply
- **Display**: HDMI monitor or TV
- **HDMI Cable**: Appropriate for your Pi model
- **Network**: Ethernet cable (recommended) or WiFi
- **Keyboard**: For initial setup (can be removed after)

### Software Requirements

- Raspberry Pi OS (64-bit, Bookworm or later)
- Node.js 20+ (installed by installer)
- Chromium browser (installed by installer)

### Information Needed

- [ ] RevSport username
- [ ] RevSport password
- [ ] Device location/name (e.g., "Main Entrance")
- [ ] GitHub Personal Access Token (for cloning repositories)

## Deployment Architecture

```
Raspberry Pi
├── systemd services (process management)
│   ├── lmrc-launcher.service (boot-time app selector)
│   ├── lmrc-booking-viewer.service
│   ├── lmrc-noticeboard.service
│   └── lmrc-kiosk.service (Chromium fullscreen)
├── /opt/lmrc/
│   ├── booking-viewer/         # Booking calendar app
│   ├── noticeboard/            # Digital noticeboard app
│   └── shared/
│       ├── config/             # Shared configuration
│       │   ├── credentials.env
│       │   └── device-config.json
│       ├── scripts/            # Management scripts
│       │   ├── health-check.sh
│       │   ├── launcher.sh
│       │   ├── select-app.sh
│       │   └── switch-app.sh
│       └── logs/               # Application logs
```

## Fresh Installation

### 1. Prepare Raspberry Pi OS

**Flash OS using Raspberry Pi Imager:**

1. **Download** [Raspberry Pi Imager](https://www.raspberrypi.com/software/)

2. **Choose OS** → Raspberry Pi OS (64-bit) - Full desktop version

3. **Configure Settings** (click gear icon):
   ```
   Hostname: lmrc-boatshed-01
   Enable SSH: Yes
   Username: greg (or your preferred username)
   Password: [secure password]
   WiFi: [configure if needed]
   Locale: Australia/Sydney
   ```

4. **Write** to microSD card (~5-10 minutes)

5. **First Boot**:
   - Insert SD card into Pi
   - Connect monitor, keyboard, ethernet
   - Connect power
   - Wait for desktop (~2 minutes)

6. **Update System**:
   ```bash
   sudo apt update
   sudo apt upgrade -y
   sudo apt install -y git curl jq
   sudo reboot
   ```

### 2. Download Deployment System

```bash
cd ~
git clone https://github.com/UndefinedRest/lmrc-pi-deployment.git lmrc-deployment-temp
cd lmrc-deployment-temp
```

**Note**: Repository names:
- Booking Viewer: `BoatBookingsCalendar`
- Noticeboard: `LMRC_Noticeboard`

### 3. Run Installer

```bash
sudo bash scripts/install.sh
```

**The installer will**:
- Create `/opt/lmrc/` structure
- Create `lmrc` system user
- Install Node.js 20 (if not present)
- Install Chromium browser
- Clone both applications from GitHub
- Set up systemd services
- Create default configuration
- Install management scripts

**Expected output**:
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

**Installation takes 10-15 minutes** depending on internet speed.

### 4. Configure Credentials

After installation completes:

```bash
sudo nano /opt/lmrc/shared/config/credentials.env
```

Update with your actual credentials:
```bash
REVSPORT_BASE_URL=https://www.lakemacquarierowingclub.org.au
REVSPORT_USERNAME=your_actual_username
REVSPORT_PASSWORD=your_actual_password
CLUB_NAME=Lake Macquarie Rowing Club
CLUB_SHORT_NAME=LMRC
CLUB_PRIMARY_COLOR=#2778bf
CLUB_SECONDARY_COLOR=#1a5a8f
PORT=3000
NODE_ENV=production
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

### 5. Configure Device

```bash
sudo nano /opt/lmrc/shared/config/device-config.json
```

Update device information:
```json
{
  "activeApp": "",
  "deviceId": "pi-boatshed-01",
  "location": "Main Entrance"
}
```

**Note**: Leave `activeApp` empty - the launcher will prompt you to select on first boot.

### 6. Enable Launcher Service

```bash
sudo systemctl enable lmrc-launcher.service
```

### 7. Reboot and Select Application

```bash
sudo reboot
```

After reboot, the launcher detects no app is selected and runs the selector.

**If using monitor/keyboard**, you'll see:
```
╔════════════════════════════════════════════════╗
║   LMRC Application Selector                    ║
╚════════════════════════════════════════════════╝

  [1] Boat Booking Viewer
  [2] Digital Noticeboard

Select application (1 or 2):
```

**If using SSH only**:
```bash
ssh greg@your-pi-ip
sudo /opt/lmrc/shared/scripts/select-app.sh
```

### 8. Verify Installation

```bash
sudo /opt/lmrc/shared/scripts/health-check.sh
```

**Expected output**:
```
=== LMRC System Health Check ===
Timestamp: 2025-11-22 10:00:00

Active Application: noticeboard

1. Service Status:
   ✓ lmrc-noticeboard.service is running

2. HTTP Endpoint:
   ✓ Application responding on port 3000

3. Kiosk Display:
   ✓ Kiosk service running
   ✓ Chromium browser running in kiosk mode

4. Disk Space:
   ✓ Disk space OK (45% used)

5. Memory:
   ✓ Memory OK (62% used)

6. Network:
   ✓ Internet connectivity OK
   ✓ Can reach RevSport server

7. Configuration:
   ✓ Credentials configured

===================================
✓ All checks passed
===================================
```

## Service Management

### Start Services

```bash
sudo systemctl start lmrc-launcher
```

The launcher will:
1. Check device-config.json for active app
2. If no app configured, run selector
3. Start the selected application
4. Start kiosk service (Chromium fullscreen)

### Check Status

```bash
sudo systemctl status lmrc-launcher
sudo systemctl status lmrc-booking-viewer
sudo systemctl status lmrc-noticeboard
sudo systemctl status lmrc-kiosk
```

### View Logs

```bash
sudo journalctl -u lmrc-launcher -f
sudo journalctl -u lmrc-booking-viewer -f
sudo journalctl -u lmrc-noticeboard -f
```

## Management Commands

### Check System Status

```bash
sudo /opt/lmrc/shared/scripts/status.sh
```

### Switch Between Applications

```bash
sudo /opt/lmrc/shared/scripts/switch-app.sh
```

Follow prompts, then reboot.

### View Logs

```bash
# Follow application logs in real-time
sudo journalctl -u lmrc-booking-viewer -f
sudo journalctl -u lmrc-noticeboard -f

# View recent logs (last 50 lines)
sudo journalctl -u lmrc-launcher -n 50

# View logs from specific time
sudo journalctl -u lmrc-kiosk --since "1 hour ago"
```

### Update Applications

```bash
sudo /opt/lmrc/shared/scripts/update.sh
```

## Troubleshooting

### Issue: Chromium not launching (Exit code 217/USER)

**Symptom**:
```
Process: ExecStartPre=/bin/sleep 10 (code=exited, status=217/USER)
```

**Cause**: Kiosk service configured for wrong user.

**Solution**:
```bash
# Edit kiosk service
sudo nano /etc/systemd/system/lmrc-kiosk.service

# Find: User=pi
# Change to your actual desktop user, e.g.: User=greg

# Save, then reload
sudo systemctl daemon-reload
sudo systemctl restart lmrc-kiosk.service
```

### Issue: Git "dubious ownership" error

**Symptom**:
```
fatal: detected dubious ownership in repository at '/opt/lmrc/booking-viewer'
```

**Cause**: The `/opt/lmrc/` directory is owned by user `lmrc` (service user), but you're logged in as `greg` (desktop user). **This is correct and secure!**

**Solution** (run git as lmrc user):
```bash
cd /opt/lmrc/booking-viewer
sudo -u lmrc git pull
sudo -u lmrc git status

# For npm commands, also use lmrc user
sudo -u lmrc npm install
sudo -u lmrc npm run build
```

**Why this is correct**:
- User `lmrc` owns the applications (service user)
- User `greg` manages the system (desktop user)
- This separation is a security best practice
- Kiosk runs as `greg` (desktop), apps run as `lmrc` (service)

### Issue: Service fails to start

```bash
# Check logs for errors
sudo journalctl -u lmrc-booking-viewer -n 50

# Common fixes:

# 1. Check credentials exist and are valid
cat /opt/lmrc/shared/config/credentials.env

# 2. Check app was built
ls /opt/lmrc/booking-viewer/dist/

# 3. Rebuild app
cd /opt/lmrc/booking-viewer
sudo -u lmrc npm run build
sudo systemctl restart lmrc-booking-viewer.service
```

### Issue: Port 3000 already in use

```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill <PID>

# Or stop the conflicting service
sudo systemctl stop lmrc-booking-viewer
```

For more troubleshooting, see [Troubleshooting Guide](troubleshooting.md).

## Security

### User Permissions

The deployment uses two separate users for security:

1. **Service User (`lmrc`)**:
   - Runs Node.js applications
   - Owns `/opt/lmrc/booking-viewer` and `/opt/lmrc/noticeboard`
   - No login shell
   - Limited system permissions

2. **Desktop User (`greg` or `pi`)**:
   - Runs Chromium kiosk
   - Manages system
   - Can sudo

### File Ownership

```
/opt/lmrc/
├── booking-viewer/       # lmrc:lmrc
├── noticeboard/          # lmrc:lmrc
└── shared/
    ├── config/           # root:lmrc (readable by service user)
    ├── scripts/          # root:root (executable by all)
    └── logs/             # lmrc:lmrc (writable by service user)
```

### Network Security

- Applications listen on `localhost:3000` only
- No external network exposure (unless explicitly configured)
- Chromium kiosk accesses `http://localhost:3000`

## Post-Deployment

### Document the Device

Record in your device inventory:
- Device ID/Name
- Location
- Active application
- IP address
- Deployment date
- Last update date

### Create Physical Label

Label on Pi case:
```
LMRC Boatshed Display 01
App: Booking Viewer
IP: 192.168.1.xxx
```

### Remove Keyboard/Mouse

Once verified working, you can disconnect keyboard and mouse. The system will run headless, displaying only the kiosk.

### Configure Display Settings (Optional)

```bash
# For portrait mode, edit kiosk service
sudo nano /etc/systemd/system/lmrc-kiosk.service

# Add to chromium command line:
--display-rotation=90

# Reload and restart
sudo systemctl daemon-reload
sudo systemctl restart lmrc-kiosk.service
```

---

## Migrating from PM2 (Deprecated)

If you have an old PM2-based installation, see [.claude/PI_UPDATE_GUIDE_SYSTEMD.md](../../.claude/PI_UPDATE_GUIDE_SYSTEMD.md) for migration steps.

**Summary of migration**:
1. Archive old PM2 installations
2. Remove PM2 startup and cron jobs
3. Follow fresh installation steps above

---

**See Also**:
- [Updating Guide](updating.md) - How to update deployed applications
- [Troubleshooting](troubleshooting.md) - Common issues and solutions
- [Operations Guide](../operations/monitoring.md) - Monitoring and maintenance
- [Health Check Script](../../lmrc-pi-deployment/scripts/health-check.sh) - Health check reference
- [BoatBooking Netlify Deployment](../../BoatBooking/NETLIFY_DEPLOYMENT.md) - Public website deployment

---

**References**:
- Consolidated from [lmrc-pi-deployment/FRESH_DEPLOYMENT_GUIDE.md](../../lmrc-pi-deployment/FRESH_DEPLOYMENT_GUIDE.md)
- Consolidated from [lmrc-pi-deployment/docs/DEPLOYMENT_GUIDE.md](../../lmrc-pi-deployment/docs/DEPLOYMENT_GUIDE.md)
