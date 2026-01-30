# LMRC Raspberry Pi Deployment Checklist

**Print this checklist for each Raspberry Pi deployment**

---

## Device Information

| Field | Value |
|-------|-------|
| **Device ID** | rpi-boatshed-___ |
| **Device Name** | Boatshed Display ___ |
| **Location** | _________________ |
| **Application** | ☐ Booking Viewer &nbsp; ☐ Noticeboard |
| **IP Address** | _________________ |
| **Date Deployed** | _________________ |
| **Deployed By** | _________________ |

---

## Pre-Deployment

### Hardware
- [ ] Raspberry Pi 4/5 (4GB+ RAM)
- [ ] microSD card (32GB+, Class 10)
- [ ] Official power supply
- [ ] HDMI cable
- [ ] Monitor/TV tested
- [ ] Ethernet cable (or WiFi configured)
- [ ] Keyboard for setup
- [ ] Optional: Case, cooling

### Information Gathered
- [ ] RevSport username available
- [ ] RevSport password available
- [ ] Device location determined
- [ ] Network configuration known
- [ ] Display location/mounting confirmed

### Software Downloaded
- [ ] Raspberry Pi Imager installed
- [ ] Raspberry Pi OS (64-bit) downloaded

---

## OS Installation

### SD Card Preparation
- [ ] SD card inserted into computer
- [ ] Existing data backed up (if needed)
- [ ] Raspberry Pi Imager opened

### OS Configuration
- [ ] Operating System: Raspberry Pi OS (64-bit) selected
- [ ] Storage: Correct SD card selected
- [ ] Settings configured (gear icon):
  - [ ] Hostname: `lmrc-boatshed-##`
  - [ ] SSH enabled
  - [ ] Username: `pi`
  - [ ] Password set (secure)
  - [ ] WiFi configured (if needed)
  - [ ] Locale: Australia/Sydney

### Flashing
- [ ] "Write" clicked
- [ ] Image written successfully
- [ ] SD card ejected safely

---

## First Boot

### Hardware Setup
- [ ] SD card inserted into Pi
- [ ] Monitor connected
- [ ] Keyboard connected
- [ ] Ethernet connected
- [ ] Power connected (boots automatically)

### Initial Boot
- [ ] Desktop appeared (~2 minutes)
- [ ] Login successful
- [ ] Network connectivity confirmed
- [ ] Display resolution correct

### System Update
```bash
sudo apt update
sudo apt upgrade -y
sudo reboot
```
- [ ] System updated
- [ ] Rebooted successfully

---

## Deployment System Installation

### Clone Repository
```bash
sudo mkdir -p /opt/lmrc
sudo chown pi:pi /opt/lmrc
cd /opt/lmrc
git clone <deployment-repo-url> deployment
```
- [ ] Repository cloned successfully
- [ ] Scripts accessible

### Run Installer
```bash
cd /opt/lmrc/deployment
sudo chmod +x scripts/*.sh
sudo ./scripts/install.sh
```
- [ ] `lmrc` user created
- [ ] Node.js 20+ installed
- [ ] Directory structure created
- [ ] Systemd services installed
- [ ] No error messages

### Test Installation
```bash
sudo /opt/lmrc/deployment/scripts/test-installation.sh
```
- [ ] All required directories exist
- [ ] Configuration files created
- [ ] Management scripts installed
- [ ] Systemd services installed
- [ ] Required software present

---

## Application Setup

### Clone Applications
```bash
cd /opt/lmrc
sudo git clone <booking-viewer-repo> booking-viewer
sudo git clone <noticeboard-repo> noticeboard
sudo chown -R lmrc:lmrc booking-viewer noticeboard
```
- [ ] Booking viewer cloned
- [ ] Noticeboard cloned
- [ ] Ownership correct

### Install Dependencies - Booking Viewer
```bash
cd /opt/lmrc/booking-viewer
sudo -u lmrc npm install
sudo -u lmrc npm run build
```
- [ ] Dependencies installed (~5 min)
- [ ] Build successful
- [ ] `dist/` directory created

### Install Dependencies - Noticeboard
```bash
cd /opt/lmrc/noticeboard
sudo -u lmrc npm install
sudo -u lmrc npm run build
```
- [ ] Dependencies installed (~5 min)
- [ ] Build successful
- [ ] `public/` directory created

### Link Environment Files
```bash
sudo ln -sf /opt/lmrc/shared/config/credentials.env /opt/lmrc/booking-viewer/.env
sudo ln -sf /opt/lmrc/shared/config/credentials.env /opt/lmrc/noticeboard/.env
```
- [ ] Symlinks created
- [ ] Links point to correct file

---

## Configuration

### Credentials
```bash
sudo nano /opt/lmrc/shared/config/credentials.env
```
**Update:**
- [ ] `REVSPORT_USERNAME` set
- [ ] `REVSPORT_PASSWORD` set
- [ ] No "CHANGE_ME" values remain
- [ ] File saved

### Device Configuration
```bash
sudo nano /opt/lmrc/shared/config/device-config.json
```
**Update:**
- [ ] `device.id` set (e.g., "rpi-boatshed-01")
- [ ] `device.name` set (e.g., "Boatshed Display 01")
- [ ] `device.location` set (e.g., "Main Entrance")
- [ ] File saved
- [ ] JSON valid

---

## Testing

### Manual Test - Booking Viewer
```bash
cd /opt/lmrc/booking-viewer
sudo -u lmrc node dist/server/index.js
```
- [ ] Server started on port 3000
- [ ] No error messages
- [ ] Browsed to `http://localhost:3000`
- [ ] Booking calendar displayed
- [ ] Stopped with Ctrl+C

### Manual Test - Noticeboard
```bash
cd /opt/lmrc/noticeboard
sudo -u lmrc node server.js
```
- [ ] Server started on port 3000
- [ ] No error messages
- [ ] Browsed to `http://localhost:3000`
- [ ] Noticeboard displayed
- [ ] Stopped with Ctrl+C

### Service Test
```bash
sudo systemctl start lmrc-booking-viewer
sudo systemctl status lmrc-booking-viewer
curl http://localhost:3000
sudo systemctl stop lmrc-booking-viewer
```
- [ ] Service started successfully
- [ ] Status shows "active (running)"
- [ ] HTTP request successful
- [ ] Service stopped cleanly

---

## Production Deployment

### Application Selection
```bash
sudo /opt/lmrc/shared/scripts/select-app.sh
```
**Interactive Menu:**
- [ ] Menu displayed correctly
- [ ] Selected correct application (1 or 2)
- [ ] Confirmed selection
- [ ] Chose to reboot now

### Post-Reboot Verification
**Wait ~2 minutes after reboot**

```bash
/opt/lmrc/shared/scripts/status.sh
```
- [ ] Correct app shows as active
- [ ] Service status: Running
- [ ] Responding on port 3000

### Kiosk Display Check
- [ ] Chromium opened automatically
- [ ] Application displayed fullscreen
- [ ] No error messages on screen
- [ ] Content loading correctly

### Health Check
```bash
/opt/lmrc/shared/scripts/health-check.sh
```
- [ ] All checks passed
- [ ] No critical errors

---

## Final Configuration

### Hide Cursor
```bash
sudo apt install -y unclutter
echo "@unclutter -idle 0.1 -root" >> ~/.config/lxsession/LXDE-pi/autostart
```
- [ ] Unclutter installed
- [ ] Autostart configured

### Disable Screensaver
```bash
nano ~/.config/lxsession/LXDE-pi/autostart
```
**Add these lines:**
```
@xset s off
@xset -dpms
@xset s noblank
```
- [ ] Lines added
- [ ] File saved

### Final Reboot
```bash
sudo reboot
```
- [ ] Rebooted
- [ ] App auto-started
- [ ] Kiosk displayed correctly
- [ ] Cursor hidden
- [ ] No screensaver activation

---

## Documentation

### Physical Label
**Create label for Pi case:**
```
LMRC Boatshed Display ##
App: [Booking Viewer / Noticeboard]
IP: 192.168.1.___
```
- [ ] Label created
- [ ] Label attached to case

### Record Information
**Record in deployment log:**
- [ ] Device ID
- [ ] Location
- [ ] Active application
- [ ] IP address
- [ ] Deployment date
- [ ] Any issues encountered

---

## Post-Deployment

### Remove Peripherals
- [ ] Keyboard disconnected
- [ ] Mouse disconnected (if used)
- [ ] Only power, ethernet, HDMI remain

### Create Backup
```bash
sudo /opt/lmrc/shared/scripts/backup.sh
```
- [ ] Backup created successfully
- [ ] Backup location noted

### Test Switching (Optional)
```bash
sudo /opt/lmrc/shared/scripts/switch-app.sh
```
- [ ] Switched to other app
- [ ] Rebooted
- [ ] New app runs correctly
- [ ] Switched back to desired app

---

## 24-Hour Check

**Return after 24 hours:**
- [ ] Display still showing content
- [ ] No error messages
- [ ] Data appears current
- [ ] No crashes in logs

```bash
sudo journalctl -u lmrc-* --since "24 hours ago" | grep -i error
```
- [ ] No critical errors in logs

---

## Troubleshooting Notes

**Use this space to note any issues encountered:**

```
Issue:
_________________________________________________________________

Solution:
_________________________________________________________________

Time spent:
_________________________________________________________________
```

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Deployed by** | _____________ | _____________ | ___/___/___ |
| **Verified by** | _____________ | _____________ | ___/___/___ |
| **Accepted by** | _____________ | _____________ | ___/___/___ |

---

## Quick Commands Reference

```bash
# Check status
/opt/lmrc/shared/scripts/status.sh

# View logs
sudo journalctl -u lmrc-booking-viewer -f
sudo journalctl -u lmrc-noticeboard -f

# Restart service
sudo systemctl restart lmrc-booking-viewer
sudo systemctl restart lmrc-noticeboard

# Switch applications
sudo /opt/lmrc/shared/scripts/switch-app.sh

# Health check
/opt/lmrc/shared/scripts/health-check.sh

# Backup configuration
sudo /opt/lmrc/shared/scripts/backup.sh

# Update applications
sudo /opt/lmrc/shared/scripts/update.sh
```

---

**Checklist Version**: 1.0
**Last Updated**: 2025-10-28
**For Deployment Guide**: See `docs/DEPLOYMENT_GUIDE.md`
**For Troubleshooting**: See `docs/TROUBLESHOOTING.md`
