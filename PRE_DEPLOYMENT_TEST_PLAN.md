# LMRC Deployment System - Pre-Deployment Test Plan

**Version**: 1.0.1 (with critical fixes)
**Date**: 2025-10-28
**Status**: Ready for Hardware Testing

---

## ⚠️ CRITICAL: This deployment has NOT been tested on physical hardware

All code review has been completed and critical bugs have been fixed, but **physical Raspberry Pi testing is required** before production deployment.

---

## Test Environment Setup

### Required Hardware
- [ ] Raspberry Pi 4 (4GB+) or Pi 5 (8GB recommended)
- [ ] 32GB+ microSD card (Class 10 or UHS-1)
- [ ] HDMI monitor or TV
- [ ] HDMI cable
- [ ] Ethernet cable (WiFi testing optional)
- [ ] USB keyboard (for setup)
- [ ] Official Raspberry Pi power supply

### Required Software
- [ ] Raspberry Pi Imager (latest version)
- [ ] Raspberry Pi OS (64-bit, Bookworm) - Download latest

### Required Information
- [ ] RevSport username
- [ ] RevSport password
- [ ] Network details (if static IP needed)

---

## Phase 1: OS Installation & Base Setup (30 min)

### Step 1.1: Flash SD Card

```bash
# Using Raspberry Pi Imager:
1. Choose OS: Raspberry Pi OS (64-bit) - Full desktop
2. Choose Storage: Your SD card
3. Configure (gear icon):
   - Hostname: lmrc-test-01
   - Enable SSH: Yes
   - Username: pi
   - Password: [secure password]
   - WiFi: [optional]
   - Locale: Australia/Sydney
4. Write and wait for completion
```

**Expected Result**: ✅ SD card written successfully

### Step 1.2: First Boot

```bash
# Insert SD card, connect peripherals, power on
# Wait ~2 minutes for desktop

# Once desktop appears, open terminal
```

**Expected Result**: ✅ Desktop loads, terminal accessible

### Step 1.3: System Update

```bash
sudo apt update
sudo apt upgrade -y
# This may take 10-30 minutes
sudo reboot
```

**Expected Result**: ✅ System updated, reboots cleanly

---

## Phase 2: Deployment System Installation (30 min)

### Step 2.1: Create Base Directory

```bash
sudo mkdir -p /opt/lmrc
sudo chown pi:pi /opt/lmrc
cd /opt/lmrc
```

**Expected Result**: ✅ Directory created with correct permissions

### Step 2.2: Clone Deployment Repository

```bash
# Replace <repo-url> with your actual repository
git clone <repo-url> deployment
cd deployment
```

**Expected Result**: ✅ Repository cloned successfully

### Step 2.3: Make Scripts Executable

```bash
sudo chmod +x scripts/*.sh
ls -l scripts/
```

**Expected Result**: ✅ All `.sh` files show `-rwxr-xr-x` permissions

### Step 2.4: Run Installer

```bash
sudo ./scripts/install.sh
```

**Monitor for**:
- ✅ lmrc user created
- ✅ Node.js 20+ installed
- ✅ jq installed
- ✅ Chromium installed (NOTE: which package - chromium or chromium-browser?)
- ✅ Directory structure created
- ✅ Systemd services installed
- ✅ No error messages

**Record Chromium Package**:
```
Chromium package used: ________________
```

**Expected Duration**: 5-10 minutes

### Step 2.5: Verify Installation

```bash
sudo ./scripts/test-installation.sh
```

**Expected Result**: ✅ All checks pass

**If any checks fail**:
```
Failed checks:
_____________________________________________
_____________________________________________
```

---

## Phase 3: Application Setup (60 min)

### Step 3.1: Clone Applications

```bash
cd /opt/lmrc

# Clone Booking Viewer
sudo git clone <booking-viewer-repo> booking-viewer

# Clone Noticeboard
sudo git clone <noticeboard-repo> noticeboard

# Set ownership
sudo chown -R lmrc:lmrc booking-viewer noticeboard
```

**Expected Result**: ✅ Both repositories cloned

### Step 3.2: Install Booking Viewer Dependencies

```bash
cd /opt/lmrc/booking-viewer
sudo -u lmrc npm install
```

**Monitor for**:
- Progress messages
- No EACCES errors
- Successful completion

**Expected Duration**: 5-10 minutes

**Expected Result**: ✅ Dependencies installed, `node_modules/` exists

### Step 3.3: Build Booking Viewer

```bash
sudo -u lmrc npm run build
```

**Expected Result**: ✅ Build successful, `dist/` directory created

### Step 3.4: Install Noticeboard Dependencies

```bash
cd /opt/lmrc/noticeboard
sudo -u lmrc npm install
```

**Expected Duration**: 5-10 minutes

**Expected Result**: ✅ Dependencies installed

### Step 3.5: Build Noticeboard

```bash
sudo -u lmrc npm run build
```

**Expected Result**: ✅ Build successful, `public/` directory created

### Step 3.6: Configure Credentials

```bash
sudo nano /opt/lmrc/shared/config/credentials.env
```

Update:
```bash
REVSPORT_USERNAME=your_actual_username
REVSPORT_PASSWORD=your_actual_password
```

**Expected Result**: ✅ Credentials saved

### Step 3.7: Test Booking Viewer Manually

```bash
cd /opt/lmrc/booking-viewer
sudo -u lmrc node dist/server/index.js
```

**Monitor for**:
- "Server listening on http://0.0.0.0:3000"
- No error messages
- Open browser to http://localhost:3000
- Booking calendar displays

**Stop with**: Ctrl+C

**Expected Result**: ✅ App runs, calendar visible

**If app fails**:
```
Error messages:
_____________________________________________
_____________________________________________
```

### Step 3.8: Test Noticeboard Manually

```bash
cd /opt/lmrc/noticeboard
sudo -u lmrc node server.js
```

**Monitor for**:
- "Server running on port 3000"
- No error messages
- Open browser to http://localhost:3000
- Noticeboard displays

**Stop with**: Ctrl+C

**Expected Result**: ✅ App runs, noticeboard visible

---

## Phase 4: Service Testing (45 min)

### Step 4.1: Test Booking Viewer Service

```bash
sudo systemctl start lmrc-booking-viewer
sudo systemctl status lmrc-booking-viewer
```

**Expected Output**:
```
● lmrc-booking-viewer.service - LMRC Boat Booking Viewer
     Loaded: loaded
     Active: active (running)
```

**Test HTTP**:
```bash
curl http://localhost:3000
```

**Expected Result**: ✅ HTML response received

**Stop service**:
```bash
sudo systemctl stop lmrc-booking-viewer
```

### Step 4.2: Test Noticeboard Service

```bash
sudo systemctl start lmrc-noticeboard
sudo systemctl status lmrc-noticeboard
curl http://localhost:3000
sudo systemctl stop lmrc-noticeboard
```

**Expected Result**: ✅ Service starts, responds, stops cleanly

### Step 4.3: Test Launcher Service

```bash
# Check status (should not be running yet)
sudo systemctl status lmrc-launcher

# Enable it
sudo systemctl enable lmrc-launcher
```

**Expected Result**: ✅ Service enabled

### Step 4.4: Check Service Logs

```bash
sudo journalctl -u lmrc-booking-viewer -n 50
sudo journalctl -u lmrc-noticeboard -n 50
```

**Expected Result**: ✅ No error messages in logs

---

## Phase 5: Application Selection & Auto-Start (30 min)

### Step 5.1: Run Application Selector

```bash
sudo /opt/lmrc/shared/scripts/select-app.sh
```

**Expected**:
- ASCII banner displays correctly
- Options 1 and 2 show clearly
- User can select option 1 (Booking Viewer)
- Confirmation prompt appears
- Configuration saved message
- Reboot prompt

**Select**: Option 1 (Booking Viewer)
**Confirm**: Yes
**Reboot**: Yes

### Step 5.2: Verify After Reboot

**Wait 2-3 minutes after reboot**

**Check auto-start**:
```bash
/opt/lmrc/shared/scripts/status.sh
```

**Expected Output**:
```
Device Information:
  ID:       rpi-boatshed-new
  Name:     Boatshed Display (New)

Active Application:
  [✓] Boat Booking Viewer

Service Status:
  [✓] Running
  [✓] Responding on port 3000
```

**Expected Result**: ✅ Booking Viewer auto-started

### Step 5.3: Check Kiosk Mode

**Expected**:
- Chromium browser opens automatically
- Browser is in fullscreen (no title bar)
- Displays http://localhost:3000
- Booking calendar visible
- No error messages on screen

**Expected Result**: ✅ Kiosk mode working

**If kiosk doesn't start**:
```bash
sudo systemctl status lmrc-kiosk
sudo journalctl -u lmrc-kiosk -n 50
```

**Record issues**:
```
Kiosk issues:
_____________________________________________
_____________________________________________
```

---

## Phase 6: Health Checks (15 min)

### Step 6.1: Run Health Check

```bash
/opt/lmrc/shared/scripts/health-check.sh
```

**Expected Results**:
- ✅ Service Status: Running
- ✅ HTTP Endpoint: Responding
- ✅ Kiosk Display: Browser running
- ✅ Disk Space: < 80%
- ✅ Memory: < 80%
- ✅ Network: Internet connectivity
- ✅ Network: Can reach RevSport
- ✅ Configuration: Credentials configured

**If any checks fail**:
```
Failed checks:
_____________________________________________

Reason:
_____________________________________________
```

### Step 6.2: Verify Data Updates

**Wait 10 minutes**, then:
```bash
# Check if booking data is current
curl http://localhost:3000/api/v1/bookings | jq '.data.metadata'
```

**Expected**: Timestamp should be recent (within last 10 min)

---

## Phase 7: Application Switching (30 min)

### Step 7.1: Switch to Noticeboard

```bash
sudo /opt/lmrc/shared/scripts/switch-app.sh
```

**Expected**:
- Shows current app: booking-viewer
- Asks to switch
- Confirms switch to noticeboard
- Stops services
- Updates configuration
- Prompts to reboot

**Select**: Yes to switch
**Reboot**: Yes

### Step 7.2: Verify Noticeboard Running

**After reboot** (wait 2-3 minutes):

```bash
/opt/lmrc/shared/scripts/status.sh
```

**Expected**:
- Active app: Noticeboard
- Service: Running
- Port 3000: Responding

### Step 7.3: Check Cron Job

```bash
sudo crontab -u lmrc -l
```

**Expected Output**:
```
5 * * * * cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js >> /opt/lmrc/shared/logs/scraper.log 2>&1
```

**Expected Result**: ✅ Cron job configured

### Step 7.4: Test Scraper (Optional)

```bash
cd /opt/lmrc/noticeboard
sudo -u lmrc node scraper/noticeboard-scraper.js
```

**Expected**: Scraper runs, data files created in `data/`

### Step 7.5: Switch Back to Booking Viewer

```bash
sudo /opt/lmrc/shared/scripts/switch-app.sh
# Reboot when prompted
```

**Expected Result**: ✅ Switches back successfully

---

## Phase 8: Backup & Update Testing (15 min)

### Step 8.1: Test Backup

```bash
sudo /opt/lmrc/shared/scripts/backup.sh
ls -lh /home/pi/lmrc-backups/
```

**Expected**:
- Backup file created with timestamp
- File size reasonable (a few KB)
- Shows backup contents

### Step 8.2: Test Update Script

```bash
sudo /opt/lmrc/shared/scripts/update.sh
```

**Expected**:
- Checks git repositories
- Shows current versions
- Updates if available
- Offers to restart services

---

## Phase 9: Stress & Longevity Testing (24+ hours)

### Step 9.1: 24-Hour Stability Test

**Leave running for 24 hours**, then check:

```bash
# Check uptime
uptime

# Check for crashes
sudo journalctl -u lmrc-* --since "24 hours ago" | grep -i error

# Run health check
/opt/lmrc/shared/scripts/health-check.sh

# Check memory leaks
free -h
```

**Expected**: ✅ No crashes, no memory leaks, all services healthy

### Step 9.2: Power Cycle Test

```bash
# Reboot 3 times
sudo reboot
# Wait for full boot
# Check status
/opt/lmrc/shared/scripts/status.sh
```

**Repeat 3 times**

**Expected**: ✅ Auto-starts correctly every time

### Step 9.3: Network Failure Test

```bash
# Disconnect ethernet cable
# Wait 2 minutes
# Reconnect ethernet
# Check if app recovers
/opt/lmrc/shared/scripts/health-check.sh
```

**Expected**: ⚠️ May show errors during disconnect, recovers after reconnect

---

## Issue Log

Use this section to record any issues encountered:

### Issue #1
```
Description:
_____________________________________________

Steps to reproduce:
_____________________________________________

Workaround/Fix:
_____________________________________________

Status: [ ] Open  [ ] Fixed  [ ] Won't Fix
```

### Issue #2
```
Description:
_____________________________________________

Steps to reproduce:
_____________________________________________

Workaround/Fix:
_____________________________________________

Status: [ ] Open  [ ] Fixed  [ ] Won't Fix
```

---

## Test Results Summary

### Overall Pass/Fail

- [ ] PASS - All tests completed successfully
- [ ] PASS WITH ISSUES - Works but has minor issues
- [ ] FAIL - Critical issues prevent deployment

### Critical Issues Found
```
_____________________________________________
_____________________________________________
_____________________________________________
```

### Minor Issues Found
```
_____________________________________________
_____________________________________________
_____________________________________________
```

### Performance Notes
```
Boot time: _______ seconds
App start time: _______ seconds
Kiosk launch time: _______ seconds
Memory usage: _______ MB
```

### Recommendations
```
_____________________________________________
_____________________________________________
_____________________________________________
```

---

## Sign-Off

| Role | Name | Signature | Date |
|------|------|-----------|------|
| **Tester** | _____________ | _____________ | ___/___/___ |
| **Reviewer** | _____________ | _____________ | ___/___/___ |
| **Approver** | _____________ | _____________ | ___/___/___ |

---

## Next Steps After Successful Testing

1. Update [VALIDATION_REPORT.md](VALIDATION_REPORT.md) with actual test results
2. Document any fixes applied during testing
3. Create final SD card master image
4. Update [README.md](README.md) with any new findings
5. Proceed to pilot deployment (1 device in production)
6. Monitor for 1 week
7. Deploy to remaining devices

---

**Test Plan Version**: 1.0
**Last Updated**: 2025-10-28
**Estimated Total Time**: 6-8 hours (excluding 24-hour stability test)
