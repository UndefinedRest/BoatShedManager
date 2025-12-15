# Generic Linux Support

**Status**: Active Development
**Target**: Support Raspberry Pi OS, Ubuntu, Linux Mint, Debian
**Priority**: Medium

---

## Overview

The LMRC solution was originally designed for Raspberry Pi OS but needs to work on generic Linux distributions like Ubuntu, Linux Mint, Debian, and other Debian-based systems.

**Use Cases**:
- Gigabyte Brix mini PCs (more powerful than Raspberry Pi)
- Standard desktop computers repurposed as displays
- Cloud VMs for testing
- Any Linux system with a graphical desktop

---

## Current State

### What Works
- ✅ **Core applications** (booking-viewer, noticeboard) - Node.js based, fully portable
- ✅ **App launcher/selector** - Shell scripts work on any Linux
- ✅ **Systemd services** - Standard across Linux distributions
- ✅ **Configuration management** - JSON based, portable
- ✅ **Networking checks** - Standard tools

### What Needs Adjustment

#### 1. **Kiosk Service** (Primary Issue)
**Problem**: Hardcoded assumptions about user, browser, and display server

**Current Assumptions**:
- User is `pi` (Raspberry Pi OS default)
- Browser is `/usr/bin/chromium-browser`
- Display server is X11 on `:0`
- Wayland might be available

**Reality on Different Distros**:
| Distro | Default User | Browser | Display |
|--------|--------------|---------|---------|
| Raspberry Pi OS | `pi` | `chromium-browser` | X11 `:0` |
| Ubuntu Desktop | User choice | None installed | Wayland (22.04+) |
| Linux Mint | User choice | `firefox` (usually) | X11 `:0` or `:1` |
| Debian | User choice | None installed | X11 `:0` |

**Symptoms**:
```
3. Kiosk Display:
   ✗ Kiosk service not running
   ✗ Chromium browser not detected
```

#### 2. **Browser Installation**
**Problem**: Different distros package browsers differently

**Browser Options by Distro**:
- **Raspberry Pi OS**: `chromium-browser` (pre-installed)
- **Ubuntu**: `chromium-browser` (snap), `firefox` (snap), `google-chrome` (manual)
- **Linux Mint**: `firefox` (pre-installed), `chromium` (package)
- **Debian**: None pre-installed

**Detection Order** (preference):
1. `google-chrome` (most compatible, best kiosk mode)
2. `chromium-browser` (Raspberry Pi OS, older Ubuntu)
3. `chromium` (modern Ubuntu, Debian)
4. `firefox` (Linux Mint, works but different flags)

#### 3. **Display Server Detection**
**Problem**: X11 vs Wayland have different environment variables

**X11**:
```bash
DISPLAY=:0
```

**Wayland**:
```bash
WAYLAND_DISPLAY=wayland-0
XDG_SESSION_TYPE=wayland
```

**Ubuntu 22.04+** defaults to Wayland for better security and modern graphics.

#### 4. **User Detection**
**Problem**: Can't assume username

**Detection Methods** (in order of reliability):
1. Check `who` command for active graphical session
2. Check `loginctl` for active sessions
3. List `/home` directory users
4. Ask user during installation

---

## Solutions Implemented

### 1. Immediate Fix Script: `fix-kiosk-linux-mint.sh`

**Purpose**: Quick fix for failed kiosk setup after installation

**What It Does**:
1. **Detects desktop user**:
   - Checks `who` command for active session
   - Falls back to `/home` directory
   - Prompts user if can't detect
2. **Detects browser**:
   - Tries google-chrome, chromium-browser, chromium, firefox
   - Installs Google Chrome if none found
3. **Detects display server**:
   - Checks for Wayland vs X11
   - Sets appropriate environment variables
4. **Updates kiosk service**:
   - Rewrites service file with detected values
   - Enables and starts service
5. **Runs health check**:
   - Verifies fix worked

**Usage**:
```bash
# On Linux Mint / Generic Linux after failed installation
sudo /opt/lmrc/shared/scripts/fix-kiosk-linux-mint.sh
```

### 2. Enhanced Installation Script (TODO)

**Planned Improvements to `install.sh`**:

```bash
# Better user detection
detect_desktop_user() {
    local user=""

    # Method 1: Active graphical session
    user=$(who | grep -E ':\d+|tty7' | head -1 | awk '{print $1}')

    # Method 2: loginctl (systemd)
    if [ -z "$user" ]; then
        user=$(loginctl list-sessions --no-legend | grep 'seat0' | head -1 | awk '{print $3}')
    fi

    # Method 3: Check /home
    if [ -z "$user" ]; then
        user=$(ls /home | head -1)
    fi

    # Method 4: Ask
    if [ -z "$user" ]; then
        read -p "Enter desktop username: " user
    fi

    echo "$user"
}

# Better browser detection
detect_browser() {
    if command -v google-chrome &>/dev/null; then
        echo "$(command -v google-chrome)"
    elif command -v chromium-browser &>/dev/null; then
        echo "$(command -v chromium-browser)"
    elif command -v chromium &>/dev/null; then
        echo "$(command -v chromium)"
    elif command -v firefox &>/dev/null; then
        echo "$(command -v firefox)"
    else
        echo "none"
    fi
}

# Better display detection
detect_display_server() {
    if [ "$XDG_SESSION_TYPE" = "wayland" ]; then
        echo "wayland"
    elif pgrep -x "Xorg" >/dev/null; then
        echo "x11"
    else
        echo "x11"  # Default assumption
    fi
}
```

### 3. Dynamic Kiosk Service Template

**Current Approach**: Static service file with sed replacement

**Better Approach**: Generate service file from template

```bash
# Template: systemd/lmrc-kiosk.service.template
[Unit]
Description=LMRC Chromium Kiosk
After=graphical.target lmrc-launcher.service
Wants=graphical.target

[Service]
Type=simple
User={{DESKTOP_USER}}
Environment=DISPLAY={{DISPLAY}}
{{WAYLAND_ENV}}
ExecStartPre=/bin/sleep 10
ExecStart={{BROWSER_CMD}} \
  {{BROWSER_FLAGS}} \
  http://localhost:3000
Restart=always
RestartSec=5

[Install]
WantedBy=graphical.target
```

**Generate During Install**:
```bash
# Detect values
DESKTOP_USER=$(detect_desktop_user)
BROWSER_CMD=$(detect_browser)
DISPLAY_SERVER=$(detect_display_server)

# Set flags based on browser
case "$BROWSER_CMD" in
    *chrome*)
        BROWSER_FLAGS="--kiosk --noerrdialogs --disable-infobars"
        ;;
    *firefox*)
        BROWSER_FLAGS="--kiosk --private-window"
        ;;
esac

# Set environment variables
if [ "$DISPLAY_SERVER" = "wayland" ]; then
    WAYLAND_ENV="Environment=WAYLAND_DISPLAY=wayland-0"
else
    WAYLAND_ENV=""
fi

# Generate service file
sed -e "s|{{DESKTOP_USER}}|$DESKTOP_USER|g" \
    -e "s|{{DISPLAY}}|:0|g" \
    -e "s|{{WAYLAND_ENV}}|$WAYLAND_ENV|g" \
    -e "s|{{BROWSER_CMD}}|$BROWSER_CMD|g" \
    -e "s|{{BROWSER_FLAGS}}|$BROWSER_FLAGS|g" \
    systemd/lmrc-kiosk.service.template > /etc/systemd/system/lmrc-kiosk.service
```

---

## Testing Matrix

### Tested Platforms

| Platform | Version | Status | Notes |
|----------|---------|--------|-------|
| Raspberry Pi OS | Bullseye (11) | ✅ Works | Original target |
| Raspberry Pi OS | Bookworm (12) | ✅ Works | Updated OS |
| Linux Mint | 21.x (Cinnamon) | 🚧 Partial | Needs `fix-kiosk-linux-mint.sh` |
| Ubuntu Desktop | 22.04 LTS | 🚧 Testing | Wayland by default |
| Debian | 12 (Bookworm) | 🚧 Testing | No browser pre-installed |

### Test Checklist

For each platform:
- [ ] `install.sh` completes without errors
- [ ] Desktop user detected correctly
- [ ] Browser detected or installed successfully
- [ ] Kiosk service starts on boot
- [ ] Display appears correctly (no black screen)
- [ ] App selector works (`select-app.sh`)
- [ ] Health check passes all tests
- [ ] Switching apps works correctly

---

## Platform-Specific Quirks

### Linux Mint
**Quirks**:
- Pre-installs Firefox (not Chromium)
- Desktop user is custom (chosen during install)
- Uses X11 (not Wayland)

**Workaround**:
- Install Google Chrome for better kiosk mode
- Or use Firefox with `--kiosk --private-window` flags

### Ubuntu Desktop
**Quirks**:
- Ubuntu 22.04+ uses Wayland by default
- Chromium is snap package (different path: `/snap/bin/chromium`)
- No browser pre-installed

**Workaround**:
- Detect snap Chromium: `command -v chromium` finds snap version
- Set `WAYLAND_DISPLAY=wayland-0` environment variable
- Install Google Chrome .deb for better compatibility

### Debian
**Quirks**:
- Minimal install (no browser)
- Uses X11
- May not have `sudo` configured

**Workaround**:
- Install browser during setup
- Configure sudo for lmrc user
- Use `su -` for root access during install

---

## Browser Compatibility

### Google Chrome (Recommended)
**Pros**:
- ✅ Best kiosk mode support
- ✅ Consistent across distros
- ✅ Hardware acceleration works well
- ✅ Most tested browser

**Cons**:
- ⚠️ Not in default repos (must download .deb)
- ⚠️ Google tracking (privacy concern)

**Kiosk Flags**:
```bash
google-chrome \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-features=TranslateUI \
  --no-first-run \
  --check-for-update-interval=31536000 \
  http://localhost:3000
```

### Chromium
**Pros**:
- ✅ Open source
- ✅ In default repos (most distros)
- ✅ Lightweight

**Cons**:
- ⚠️ Different package names (`chromium` vs `chromium-browser`)
- ⚠️ Ubuntu uses snap version (different behavior)

**Kiosk Flags**: Same as Chrome

### Firefox
**Pros**:
- ✅ Pre-installed on Linux Mint
- ✅ Open source
- ✅ Privacy-focused

**Cons**:
- ⚠️ Kiosk mode less polished
- ⚠️ Different flag syntax
- ⚠️ May show Firefox UI elements

**Kiosk Flags**:
```bash
firefox \
  --kiosk \
  --private-window \
  http://localhost:3000
```

---

## Recommended Hardware

### Minimum Requirements
- **CPU**: Dual-core 1.5GHz+ (ARMv7 or x86_64)
- **RAM**: 1GB (2GB recommended)
- **Storage**: 8GB SD card or SSD
- **Display**: HDMI output
- **Network**: Ethernet or Wi-Fi

### Tested Hardware

#### Excellent Performance
- **Gigabyte Brix** (Intel N100/N200)
  - x86_64 platform
  - 4-8GB RAM
  - Fast SSD storage
  - ✅ Runs flawlessly with Linux Mint

- **Raspberry Pi 4** (4GB or 8GB)
  - ARMv8 64-bit
  - 4-8GB RAM
  - ✅ Original target platform

#### Good Performance
- **Raspberry Pi 3 B+**
  - ARMv8 64-bit
  - 1GB RAM
  - ⚠️ Slight lag on heavy pages

#### Not Recommended
- **Raspberry Pi Zero / Zero W**
  - Single core ARM
  - 512MB RAM
  - ❌ Too slow for web rendering

---

## Installation Guide: Generic Linux

### Prerequisites
```bash
# System requirements
- Debian-based distribution (Debian, Ubuntu, Mint, Pi OS)
- Desktop environment installed (GNOME, Cinnamon, XFCE, etc.)
- Internet connection
- Root access (sudo)
```

### Step-by-Step Installation

#### 1. Clone Deployment Repository
```bash
# Create working directory
mkdir -p ~/lmrc-deployment
cd ~/lmrc-deployment

# Clone deployment scripts
git clone https://github.com/UndefinedRest/lmrc-pi-deployment.git
cd lmrc-pi-deployment
```

#### 2. Run Installation Script
```bash
# Run as root
sudo ./scripts/install.sh

# This will:
# - Detect your system
# - Install dependencies
# - Create lmrc user
# - Clone applications
# - Set up systemd services
# - Configure kiosk (best effort)
```

#### 3. Fix Kiosk (If Needed)
```bash
# If health check shows kiosk errors
sudo ./scripts/fix-kiosk-linux-mint.sh

# This will:
# - Detect your desktop user
# - Find or install browser
# - Configure kiosk service correctly
# - Start kiosk service
```

#### 4. Configure Kiosk Mode (**ONLY** for Desktop Linux - NOT for Raspberry Pi)

**⚠️ SKIP THIS STEP IF USING RASPBERRY PI OS** - Pi is already configured correctly!

**Only run this on**: Ubuntu Desktop, Linux Mint, Debian Desktop, or other desktop Linux distributions.

```bash
# Configure system for unattended kiosk operation
sudo ./scripts/configure-kiosk-mode.sh

# This will:
# - Enable auto-login
# - Disable screen locking
# - Disable screensaver
# - Disable power management (screen won't blank)
# - Create startup scripts to maintain settings
# - Optionally hide mouse cursor
# - Auto-detects and skips if running on Raspberry Pi OS

# Manual Alternative (GUI method for Linux Mint/Ubuntu):
# 1. System Settings → Screensaver → Delay: Never
# 2. Uncheck "Lock screen when screensaver is active"
# 3. System Settings → Power Management → Turn off screen: Never
# 4. Login Window → Enable automatic login for your user
```

**Why Desktop Linux needs this**:
- Desktop Linux (Ubuntu, Mint) defaults to requiring login and locking for security
- Raspberry Pi OS defaults to auto-login and no screen locking (kiosk-ready)
- Without this configuration, desktop Linux will show login screen and lock after inactivity
- Raspberry Pi users should skip this step entirely

**Symptoms you need this** (Desktop Linux only):
- ❌ System boots to login screen instead of auto-starting kiosk
- ❌ Screen locks after a few minutes of inactivity
- ❌ Screensaver activates and shows login prompt
- ❌ Kiosk appears to be "hiding" behind lock screen

**If you're on Raspberry Pi OS**: Skip to Step 5 (Configure Credentials)

#### 5. Configure Credentials
```bash
# Edit credentials file
sudo nano /opt/lmrc/shared/config/credentials.env

# Update:
# - REVSPORT_USERNAME=your-revsport-username
# - REVSPORT_PASSWORD=your-revsport-password
```

#### 6. Select Application
```bash
# Choose which app to display
sudo /opt/lmrc/shared/scripts/select-app.sh

# Options:
# 1) Booking Viewer
# 2) Noticeboard
```

#### 7. Reboot
```bash
# Reboot to start kiosk on boot
sudo reboot
```

#### 8. Verify
```bash
# After reboot, check health
sudo /opt/lmrc/shared/scripts/health-check.sh

# All checks should pass:
# ✓ Service running
# ✓ HTTP responding
# ✓ Kiosk running
# ✓ Browser detected
```

---

## Troubleshooting

### Kiosk Service Won't Start

**Symptom**:
```
3. Kiosk Display:
   ✗ Kiosk service not running
```

**Check Logs**:
```bash
sudo journalctl -u lmrc-kiosk.service -n 50
```

**Common Issues**:

1. **Wrong User**:
   ```
   Error: User 'pi' not found
   ```
   **Fix**: Edit service file
   ```bash
   sudo nano /etc/systemd/system/lmrc-kiosk.service
   # Change: User=pi
   # To: User=your-username
   sudo systemctl daemon-reload
   sudo systemctl restart lmrc-kiosk.service
   ```

2. **Wrong Display**:
   ```
   Error: Can't open display: :0
   ```
   **Fix**: Check your display number
   ```bash
   echo $DISPLAY  # Should show :0 or :1

   # Update service file
   sudo nano /etc/systemd/system/lmrc-kiosk.service
   # Change: Environment=DISPLAY=:0
   # To: Environment=DISPLAY=:1  (if that's your display)
   sudo systemctl daemon-reload
   sudo systemctl restart lmrc-kiosk.service
   ```

3. **Browser Not Found**:
   ```
   Error: /usr/bin/chromium-browser: No such file or directory
   ```
   **Fix**: Install browser or update path
   ```bash
   # Install Google Chrome
   wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
   sudo apt install ./google-chrome-stable_current_amd64.deb

   # Update service file
   sudo nano /etc/systemd/system/lmrc-kiosk.service
   # Change: ExecStart=/usr/bin/chromium-browser \
   # To: ExecStart=/usr/bin/google-chrome \
   sudo systemctl daemon-reload
   sudo systemctl restart lmrc-kiosk.service
   ```

### Black Screen / No Display

**Symptom**: Kiosk service running but screen is black

**Possible Causes**:
1. Wrong DISPLAY variable
2. Wayland vs X11 mismatch
3. Permission issues

**Fix**:
```bash
# Check what display server is running
echo $XDG_SESSION_TYPE  # Should show 'wayland' or 'x11'

# Check active display
loginctl show-session $(loginctl | grep $(whoami) | awk '{print $1}') -p Display

# Try starting browser manually
DISPLAY=:0 google-chrome --kiosk http://localhost:3000

# If that works, update service file with correct DISPLAY
```

### App Not Responding on Port 3000

**Symptom**:
```
2. HTTP Endpoint:
   ✗ Application not responding on port 3000
```

**Check**:
```bash
# Is the app service running?
sudo systemctl status lmrc-booking-viewer.service
# or
sudo systemctl status lmrc-noticeboard.service

# Check if port is in use
sudo netstat -tlnp | grep :3000

# Check app logs
sudo journalctl -u lmrc-booking-viewer.service -n 100
```

**Fix**:
```bash
# Restart the app service
sudo systemctl restart lmrc-booking-viewer.service

# Check credentials are configured
cat /opt/lmrc/shared/config/credentials.env | grep -v PASSWORD
```

### Screen Locks / Returns to Login (Desktop Linux Only)

**Symptom**: System shows login screen after boot or locks after a few minutes of inactivity

**Platform**: This ONLY affects desktop Linux distributions (Ubuntu, Linux Mint). Raspberry Pi OS does not have this issue.

**Root Cause**: Desktop Linux distributions enable screen locking and require login by default for security.

**Solution 1 - Automated Script**:
```bash
# Run the kiosk mode configuration script
sudo /path/to/configure-kiosk-mode.sh

# This will:
# - Enable auto-login
# - Disable screen locking
# - Disable screensaver
# - Disable power management
```

**Solution 2 - Manual GUI Configuration**:
```bash
# Linux Mint / Cinnamon:
1. Click Start Menu → System Settings
2. Go to "Screensaver"
   - Set "Delay" to "Never"
   - Uncheck "Lock screen when screensaver is active"
3. Go to "Power Management"
   - Set "Turn off screen when inactive" to "Never"
   - Set "Suspend when inactive" to "Never"
4. Go to "Login Window"
   - Enable "Automatically log in" and select your user

# Ubuntu / GNOME:
1. Settings → Privacy → Screen Lock
   - Disable "Automatic Screen Lock"
2. Settings → Power
   - Set "Blank Screen" to "Never"
   - Set "Automatic Suspend" to "Off"
3. sudo nano /etc/gdm3/custom.conf
   - Under [daemon], add: AutomaticLoginEnable=true
   - Add: AutomaticLogin=YOUR_USERNAME
```

**Solution 3 - Command Line**:
```bash
# Disable screen locking
gsettings set org.cinnamon.desktop.screensaver lock-enabled false
gsettings set org.gnome.desktop.screensaver lock-enabled false

# Disable screensaver
gsettings set org.cinnamon.desktop.screensaver idle-activation-enabled false
gsettings set org.gnome.desktop.screensaver idle-activation-enabled false

# Disable power management
gsettings set org.cinnamon.settings-daemon.plugins.power idle-dim false
gsettings set org.gnome.settings-daemon.plugins.power idle-dim false

# Set sleep to never
gsettings set org.cinnamon.settings-daemon.plugins.power sleep-inactive-ac-timeout 0
gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-timeout 0
```

**Verify Fix**:
```bash
# After reboot, system should:
# - Auto-login without password prompt
# - Start kiosk browser automatically
# - Never show screensaver or lock screen
# - Screen stays on indefinitely
```

**Raspberry Pi Users**: You should NOT see this issue. If you do, something is misconfigured - check that you're running Raspberry Pi OS (not Ubuntu Desktop for Pi).

---

## Future Enhancements

### Short-Term (Next Release)
- [ ] Improved browser detection in install.sh
- [ ] Better user detection (loginctl integration)
- [ ] Automatic display server detection
- [ ] Health check: Optional kiosk (don't fail if headless)

### Medium-Term
- [ ] Support for non-Debian distros (RedHat, Fedora, Arch)
- [ ] Containerized deployment (Docker)
- [ ] Wayland-native browser configuration
- [ ] Automated testing on multiple distros (GitHub Actions)

### Long-Term
- [ ] Web-based configuration UI (no SSH needed)
- [ ] Cloud-hosted management console
- [ ] Support for Windows/macOS (Electron app?)
- [ ] Multi-device orchestration (manage fleet of displays)

---

## Contributing

### Testing on New Platforms

If you test on a new Linux distribution:

1. Document your experience
2. Note any quirks or issues
3. Share working configuration
4. Submit PR with platform notes

**Template**:
```markdown
## Platform: [Distro Name] [Version]

**Hardware**: [Device]
**Install Method**: [Standard / Custom]

**Changes Needed**:
- [ ] User detection: [How you fixed it]
- [ ] Browser: [Which browser, how installed]
- [ ] Display: [X11/Wayland, any issues]
- [ ] Other: [Any other changes]

**Final Status**: [Working / Partial / Not Working]
```

---

## Related Documentation

- [Production Setup Guide](production-setup.md) - Original Raspberry Pi-focused guide
- [Troubleshooting Guide](troubleshooting.md) - General troubleshooting
- [Architecture Overview](../architecture/overview.md) - System architecture

---

**Last Updated**: 2025-12-14
**Status**: Living Document (updated as new platforms tested)
**Maintainer**: LMRC Dev Team
