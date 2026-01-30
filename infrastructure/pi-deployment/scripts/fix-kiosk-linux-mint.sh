#!/bin/bash
# Quick fix for kiosk service on Linux Mint / Generic Linux
# Run this after initial installation fails health check

set -e

echo "=== LMRC Kiosk Service Fix for Linux Mint ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo $0"
    exit 1
fi

# 1. Detect desktop user
echo "Step 1: Detecting desktop user..."
DESKTOP_USER=""

# Try multiple detection methods
# Method 1: Check who is logged in with X11/Wayland session
DESKTOP_USER=$(who | grep -E ':\d+|tty7' | head -1 | awk '{print $1}')

# Method 2: Check /home directory
if [ -z "$DESKTOP_USER" ]; then
    DESKTOP_USER=$(ls /home | head -1)
fi

# Method 3: Ask user
if [ -z "$DESKTOP_USER" ]; then
    echo "Could not auto-detect desktop user."
    read -p "Enter the username that runs the desktop (e.g., greg): " DESKTOP_USER
fi

echo "  Desktop user: $DESKTOP_USER"

# Verify user exists
if ! id "$DESKTOP_USER" &>/dev/null; then
    echo "  ✗ User '$DESKTOP_USER' does not exist"
    exit 1
fi

echo "  ✓ User verified"

# 2. Detect browser
echo ""
echo "Step 2: Detecting browser..."

BROWSER_CMD=""
BROWSER_NAME=""

# Check for browsers in order of preference
if command -v google-chrome &>/dev/null; then
    BROWSER_CMD="$(command -v google-chrome)"
    BROWSER_NAME="google-chrome"
    echo "  Found: Google Chrome"
elif command -v chromium-browser &>/dev/null; then
    BROWSER_CMD="$(command -v chromium-browser)"
    BROWSER_NAME="chromium-browser"
    echo "  Found: Chromium Browser"
elif command -v chromium &>/dev/null; then
    BROWSER_CMD="$(command -v chromium)"
    BROWSER_NAME="chromium"
    echo "  Found: Chromium"
elif command -v firefox &>/dev/null; then
    BROWSER_CMD="$(command -v firefox)"
    BROWSER_NAME="firefox"
    echo "  Found: Firefox"
    echo "  ⚠ Firefox kiosk mode works differently, may need adjustments"
else
    echo "  ✗ No supported browser found"
    echo ""
    echo "Please install one of:"
    echo "  sudo apt install google-chrome-stable"
    echo "  sudo apt install chromium-browser"
    echo "  sudo apt install chromium"
    exit 1
fi

echo "  ✓ Browser: $BROWSER_CMD"

# 3. Detect display server
echo ""
echo "Step 3: Detecting display server..."

DISPLAY_VAR=":0"
WAYLAND_DISPLAY_VAR=""

# Check if Wayland is running
if [ -n "$XDG_SESSION_TYPE" ] && [ "$XDG_SESSION_TYPE" = "wayland" ]; then
    echo "  Detected: Wayland"
    WAYLAND_DISPLAY_VAR="wayland-0"
elif pgrep -x "Xorg" >/dev/null; then
    echo "  Detected: X11"
else
    echo "  Unknown display server (defaulting to X11)"
fi

echo "  DISPLAY=$DISPLAY_VAR"
if [ -n "$WAYLAND_DISPLAY_VAR" ]; then
    echo "  WAYLAND_DISPLAY=$WAYLAND_DISPLAY_VAR"
fi

# 4. Update kiosk service file
echo ""
echo "Step 4: Updating kiosk service..."

SERVICE_FILE="/etc/systemd/system/lmrc-kiosk.service"

if [ ! -f "$SERVICE_FILE" ]; then
    echo "  ✗ Service file not found: $SERVICE_FILE"
    echo "  Run the main install.sh script first"
    exit 1
fi

# Backup original
cp "$SERVICE_FILE" "$SERVICE_FILE.backup"
echo "  Backed up to: $SERVICE_FILE.backup"

# Create updated service file
cat > "$SERVICE_FILE" << EOF
[Unit]
Description=LMRC Chromium Kiosk
After=graphical.target lmrc-launcher.service
Wants=graphical.target

[Service]
Type=simple
User=$DESKTOP_USER
Environment=DISPLAY=$DISPLAY_VAR
$(if [ -n "$WAYLAND_DISPLAY_VAR" ]; then echo "Environment=WAYLAND_DISPLAY=$WAYLAND_DISPLAY_VAR"; fi)
ExecStartPre=/bin/sleep 10
ExecStart=$BROWSER_CMD \\
  --kiosk \\
  --noerrdialogs \\
  --disable-infobars \\
  --disable-session-crashed-bubble \\
  --disable-features=TranslateUI \\
  --no-first-run \\
  --check-for-update-interval=31536000 \\
  http://localhost:3000
Restart=always
RestartSec=5

[Install]
WantedBy=graphical.target
EOF

echo "  ✓ Service file updated"

# 5. Install browser if needed
if [ "$BROWSER_NAME" = "none" ]; then
    echo ""
    echo "Step 5: Installing browser..."

    # Try to install google-chrome
    if ! command -v wget &>/dev/null; then
        apt-get update
        apt-get install -y wget
    fi

    echo "  Attempting to install Google Chrome..."
    wget -q https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb -O /tmp/chrome.deb
    apt-get install -y /tmp/chrome.deb || true
    rm /tmp/chrome.deb

    # Re-detect
    if command -v google-chrome &>/dev/null; then
        BROWSER_CMD="$(command -v google-chrome)"
        echo "  ✓ Google Chrome installed"

        # Update service file with new browser
        sed -i "s|^ExecStart=.*|ExecStart=$BROWSER_CMD \\\\|" "$SERVICE_FILE"
    else
        # Fallback to chromium
        echo "  Chrome install failed, installing chromium..."
        apt-get update
        apt-get install -y chromium-browser || apt-get install -y chromium

        if command -v chromium-browser &>/dev/null; then
            BROWSER_CMD="$(command -v chromium-browser)"
        elif command -v chromium &>/dev/null; then
            BROWSER_CMD="$(command -v chromium)"
        fi

        sed -i "s|^ExecStart=.*|ExecStart=$BROWSER_CMD \\\\|" "$SERVICE_FILE"
        echo "  ✓ Chromium installed"
    fi
fi

# 6. Reload and enable kiosk service
echo ""
echo "Step 6: Enabling kiosk service..."
systemctl daemon-reload
systemctl enable lmrc-kiosk.service
echo "  ✓ Service enabled"

# 7. Check if an app is selected
echo ""
echo "Step 7: Checking active application..."
ACTIVE_APP=$(jq -r '.activeApp' /opt/lmrc/shared/config/device-config.json 2>/dev/null || echo "null")

if [ "$ACTIVE_APP" = "null" ] || [ -z "$ACTIVE_APP" ]; then
    echo "  ⚠ No active application selected"
    echo ""
    echo "Please run the app selector:"
    echo "  sudo /opt/lmrc/shared/scripts/select-app.sh"
    echo ""
    echo "Then start the kiosk:"
    echo "  sudo systemctl start lmrc-kiosk.service"
else
    echo "  Active app: $ACTIVE_APP"

    # Start kiosk service
    echo ""
    echo "Step 8: Starting kiosk service..."
    systemctl start lmrc-kiosk.service
    sleep 3

    if systemctl is-active --quiet lmrc-kiosk.service; then
        echo "  ✓ Kiosk service started successfully"
    else
        echo "  ✗ Kiosk service failed to start"
        echo ""
        echo "Check logs with:"
        echo "  sudo journalctl -u lmrc-kiosk.service -n 50"
    fi
fi

# 8. Run health check
echo ""
echo "==================================="
echo "Running health check..."
echo "==================================="
echo ""
/opt/lmrc/shared/scripts/health-check.sh || true

echo ""
echo "=== Fix Complete ==="
echo ""
echo "If kiosk still not working:"
echo "1. Check logs: sudo journalctl -u lmrc-kiosk.service -f"
echo "2. Check display: echo \$DISPLAY (should be :0 or :1)"
echo "3. Try starting manually: sudo systemctl restart lmrc-kiosk.service"
echo ""
