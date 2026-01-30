# LMRC Raspberry Pi Deployment Guide

Complete step-by-step guide for deploying the LMRC dual-app system to Raspberry Pi devices.

## Table of Contents

1. [Hardware Requirements](#hardware-requirements)
2. [Pre-Deployment Preparation](#pre-deployment-preparation)
3. [OS Installation](#os-installation)
4. [System Deployment](#system-deployment)
5. [Application Setup](#application-setup)
6. [Configuration](#configuration)
7. [Testing](#testing)
8. [Production Deployment](#production-deployment)

---

## Hardware Requirements

### Required Hardware

- **Raspberry Pi**: Pi 4 (4GB+) or Pi 5 (8GB recommended)
- **microSD Card**: 32GB+ (Class 10 or UHS-1)
- **Power Supply**: Official Raspberry Pi power supply
- **Display**: HDMI monitor or TV
- **HDMI Cable**: Appropriate for your Pi model
- **Network**: Ethernet cable (recommended) or WiFi
- **Keyboard**: For initial setup (can be removed after)

### Optional Hardware

- **Case**: For protection
- **Cooling**: Heatsink or fan for Pi 4/5
- **Mouse**: For troubleshooting

---

## Pre-Deployment Preparation

### 1. Gather Information

Before starting, collect:
- [ ] RevSport username
- [ ] RevSport password
- [ ] Device location/name (e.g., "Main Entrance")
- [ ] Network information (if using static IP)

### 2. Download Required Software

On your computer:
- [ ] [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
- [ ] Latest Raspberry Pi OS (64-bit, Bookworm)

### 3. Prepare SD Card

- [ ] Insert microSD card into computer
- [ ] Backup any existing data (will be erased)

---

## OS Installation

### 1. Flash Raspberry Pi OS

Using Raspberry Pi Imager:

1. **Open Raspberry Pi Imager**

2. **Choose OS**
   - Operating System → Raspberry Pi OS (64-bit)
   - Select full desktop version (not Lite)

3. **Choose Storage**
   - Select your microSD card

4. **Configure Settings** (click gear icon)
   ```
   Hostname: lmrc-boatshed-01
   Enable SSH: Yes
   Username: pi
   Password: [secure password]
   WiFi: [configure if needed]
   Locale: Australia/Sydney
   ```

5. **Write**
   - Click "Write"
   - Wait for completion (~5-10 minutes)

### 2. First Boot

1. Insert SD card into Raspberry Pi
2. Connect monitor, keyboard, ethernet
3. Connect power (Pi will boot automatically)
4. Wait for desktop to appear (~2 minutes)

### 3. Initial Configuration

```bash
# Update system
sudo apt update
sudo apt upgrade -y

# Install prerequisites
sudo apt install -y git curl jq

# Reboot
sudo reboot
```

---

## System Deployment

### 1. Create Directory Structure

```bash
# Create base directory
sudo mkdir -p /opt/lmrc
sudo chown pi:pi /opt/lmrc
cd /opt/lmrc
```

### 2. Clone Deployment Repository

```bash
# Clone this repository
git clone https://github.com/your-org/lmrc-pi-deployment.git deployment

# Make scripts executable
sudo chmod +x deployment/scripts/*.sh
```

### 3. Run Installer

```bash
cd deployment
sudo ./scripts/install.sh
```

The installer will:
- Create `lmrc` user
- Install Node.js 20
- Create directory structure
- Install systemd services
- Create default configuration

**Expected output:**
```
=== LMRC Dual-App Deployment Installer ===
Creating lmrc user...
Installing Node.js 20...
Creating directory structure...
Installing dependencies...
...
=== Installation Complete ===
```

---

## Application Setup

### 1. Clone Applications

```bash
cd /opt/lmrc

# Clone Booking Viewer
sudo git clone https://github.com/your-org/lmrc-booking-system.git booking-viewer

# Clone Noticeboard
sudo git clone https://github.com/your-org/Noticeboard.git noticeboard

# Set ownership
sudo chown -R lmrc:lmrc booking-viewer noticeboard
```

### 2. Install Dependencies

```bash
# Booking Viewer
cd /opt/lmrc/booking-viewer
sudo -u lmrc npm install
sudo -u lmrc npm run build

# Noticeboard
cd /opt/lmrc/noticeboard
sudo -u lmrc npm install
sudo -u lmrc npm run build
```

This may take 10-15 minutes depending on Pi model and network speed.

### 3. Link Environment Files

```bash
# Create symlinks to shared credentials
sudo ln -sf /opt/lmrc/shared/config/credentials.env /opt/lmrc/booking-viewer/.env
sudo ln -sf /opt/lmrc/shared/config/credentials.env /opt/lmrc/noticeboard/.env
```

---

## Configuration

### 1. Edit Credentials

```bash
sudo nano /opt/lmrc/shared/config/credentials.env
```

Update these values:
```bash
REVSPORT_USERNAME=your_actual_username
REVSPORT_PASSWORD=your_actual_password
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

### 2. Edit Device Configuration (Optional)

```bash
sudo nano /opt/lmrc/shared/config/device-config.json
```

Update device info:
```json
{
  "device": {
    "id": "rpi-boatshed-01",
    "name": "Boatshed Display 01",
    "location": "Main Entrance"
  }
}
```

### 3. Configure Kiosk Mode

The kiosk service is automatically configured during installation. The installer detects your desktop user and configures the service accordingly.

**Key Configuration:**
- **URL**: `http://localhost:3000` (loads production TV display)
- **User**: Auto-detected (typically `pi` or `greg`)
- **Display**: `:0` (primary display)

To customize, edit the service file:

```bash
sudo nano /etc/systemd/system/lmrc-kiosk.service
```

**Important Settings:**
- `User=`: Must match your desktop username (install script auto-detects)
- URL: Simply `http://localhost:3000` - the default index.html is the production TV display
  - Note: The old debug page was removed, tv.html renamed to index.html

**Options you can adjust:**
- Display rotation (add `--display-rotation=90` for portrait)
- Hide cursor (already configured)
- Disable screensaver (already configured)

**If kiosk fails to start** (exit code 217/USER):
```bash
# Check the configured user
grep "User=" /etc/systemd/system/lmrc-kiosk.service

# Change to your actual desktop user if needed
sudo sed -i 's/^User=.*/User=your_username/' /etc/systemd/system/lmrc-kiosk.service
sudo systemctl daemon-reload
sudo systemctl restart lmrc-kiosk.service
```

---

## Testing

### 1. Test Booking Viewer Manually

```bash
cd /opt/lmrc/booking-viewer
sudo -u lmrc node dist/server/index.js
```

Expected output:
```
Server listening on http://0.0.0.0:3000
```

Open browser: `http://localhost:3000`

**Expected result**: Booking calendar displays

Stop with `Ctrl+C`

### 2. Test Noticeboard Manually

```bash
cd /opt/lmrc/noticeboard
sudo -u lmrc node server.js
```

Expected output:
```
Server running on port 3000
```

Open browser: `http://localhost:3000`

**Expected result**: Noticeboard displays

Stop with `Ctrl+C`

### 3. Test Service Management

```bash
# Start booking viewer service
sudo systemctl start lmrc-booking-viewer

# Check status
sudo systemctl status lmrc-booking-viewer

# Expected: "active (running)"

# Stop service
sudo systemctl stop lmrc-booking-viewer
```

---

## Production Deployment

### 1. Select Application

```bash
sudo /opt/lmrc/shared/scripts/select-app.sh
```

You'll see:
```
╔════════════════════════════════════════════════════════════╗
║   LMRC Application Selector                                ║
║   Lake Macquarie Rowing Club - Boatshed Display System     ║
╚════════════════════════════════════════════════════════════╝

This Raspberry Pi can run one of the following applications:

  [1] Boat Booking Viewer
      └─ 7-day booking calendar for all club boats
      └─ Updates every 10 minutes

  [2] Digital Noticeboard
      └─ Club news, events, photos, and weather
      └─ Updates hourly

Select which application to run [1-2]:
```

**Choose:**
- `1` for Booking Viewer
- `2` for Noticeboard

Confirm and reboot when prompted.

### 2. Verify After Reboot

After reboot (wait ~2 minutes):

```bash
# Check status
/opt/lmrc/shared/scripts/status.sh
```

Expected output:
```
╔════════════════════════════════════════════════════════════╗
║   LMRC Display Status                                      ║
╚════════════════════════════════════════════════════════════╝

Device Information:
  ID:       rpi-boatshed-01
  Name:     Boatshed Display 01

Active Application:
  [✓] Boat Booking Viewer

Service Status:
  [✓] Running
  [✓] Responding on port 3000
```

### 3. Verify Kiosk Display

The Chromium browser should automatically open in fullscreen showing the application.

**Troubleshooting kiosk:**
- If browser doesn't open, check: `sudo systemctl status lmrc-kiosk`
- If wrong content shows, verify port 3000 is responding: `curl localhost:3000`

### 4. Hide Cursor (Optional)

If cursor is visible:
```bash
sudo apt install -y unclutter
# Add to autostart
echo "@unclutter -idle 0" >> ~/.config/lxsession/LXDE-pi/autostart
```

### 5. Disable Screensaver

```bash
# Edit LXDE config
nano ~/.config/lxsession/LXDE-pi/autostart
```

Add these lines:
```
@xset s off
@xset -dpms
@xset s noblank
```

### 6. Configure Auto-Login (if not done)

```bash
sudo raspi-config
```

Navigate: System Options → Boot / Auto Login → Desktop Autologin

---

## Post-Deployment

### 1. Document the Deployment

Record:
- [ ] Device ID/Name
- [ ] Location
- [ ] Active application
- [ ] IP address
- [ ] Deployment date

### 2. Create Device Label

Physical label on Pi case:
```
LMRC Boatshed Display 01
App: Booking Viewer
IP: 192.168.1.xxx
```

### 3. Test Switching (Optional)

```bash
# Switch to other app
sudo /opt/lmrc/shared/scripts/switch-app.sh

# Reboot and verify new app runs
```

### 4. Remove Keyboard/Mouse

Once verified working, you can disconnect keyboard and mouse.

---

## Deployment Checklist

Use this checklist for each Pi:

### Pre-Deployment
- [ ] Hardware assembled
- [ ] Credentials available
- [ ] Network configured
- [ ] SD card prepared

### OS Installation
- [ ] Raspberry Pi OS flashed
- [ ] First boot successful
- [ ] System updated
- [ ] SSH enabled (if needed)

### System Setup
- [ ] Deployment repo cloned
- [ ] Installer run successfully
- [ ] Applications cloned
- [ ] Dependencies installed

### Configuration
- [ ] Credentials configured
- [ ] Device info updated
- [ ] Environment files linked

### Testing
- [ ] Both apps tested manually
- [ ] Services start/stop correctly
- [ ] Network connectivity verified

### Production
- [ ] Application selected
- [ ] Auto-start verified
- [ ] Kiosk mode working
- [ ] Display correct
- [ ] Cursor hidden
- [ ] Screensaver disabled

### Finalization
- [ ] Device documented
- [ ] Label applied
- [ ] Keyboard/mouse removed
- [ ] Final verification

---

## Troubleshooting During Deployment

### Issue: npm install fails

```bash
# Clear npm cache
sudo -u lmrc npm cache clean --force

# Retry install
cd /opt/lmrc/booking-viewer
sudo -u lmrc npm install
```

### Issue: Service fails to start

```bash
# Check logs
sudo journalctl -u lmrc-booking-viewer -n 50

# Common fixes:
# 1. Check credentials
cat /opt/lmrc/shared/config/credentials.env

# 2. Check app was built
ls /opt/lmrc/booking-viewer/dist/

# 3. Rebuild app
cd /opt/lmrc/booking-viewer
sudo -u lmrc npm run build
```

### Issue: Port 3000 already in use

```bash
# Find what's using port 3000
sudo lsof -i :3000

# Kill the process
sudo kill <PID>
```

### Issue: Kiosk doesn't start

```bash
# Check kiosk service
sudo systemctl status lmrc-kiosk

# Check if graphical target is reached
systemctl status graphical.target

# Manual start
DISPLAY=:0 chromium-browser --kiosk http://localhost:3000
```

---

## Multiple Device Deployment

### For Deploying 5+ Devices

1. **Create Master Image**
   - Deploy one Pi completely
   - Test thoroughly
   - Use `rpi-clone` to clone SD card

2. **Clone SD Cards**
   ```bash
   # On master Pi
   sudo apt install -y rpi-clone

   # Insert blank SD card
   sudo rpi-clone sda  # where sda is your SD card
   ```

3. **Per-Device Configuration**
   On each cloned Pi:
   ```bash
   # Update device config
   sudo nano /opt/lmrc/shared/config/device-config.json

   # Update hostname
   sudo raspi-config
   # System Options → Hostname

   # Select application
   sudo /opt/lmrc/shared/scripts/select-app.sh
   ```

---

## Support

If you encounter issues not covered here:

1. Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)
2. Review system logs: `sudo journalctl -xe`
3. Contact technical committee

---

**Document Version**: 1.0
**Last Updated**: 2025-10-28
