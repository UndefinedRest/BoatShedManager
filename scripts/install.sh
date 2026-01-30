#!/bin/bash
set -e

echo "=== LMRC Dual-App Deployment Installer ==="
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo $0"
    exit 1
fi

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
DEPLOY_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

echo "Deployment root: $DEPLOY_ROOT"
echo ""

# Create lmrc user if doesn't exist
if ! id -u lmrc >/dev/null 2>&1; then
    echo "Creating lmrc user..."
    useradd -r -m -d /opt/lmrc -s /bin/bash lmrc
fi

# Create directory structure
echo "Creating directory structure..."
mkdir -p /opt/lmrc/{shared/{config,scripts,logs},booking-viewer,noticeboard}
chown -R lmrc:lmrc /opt/lmrc

# Install Node.js 20 if not present
if ! command -v node &> /dev/null || [ $(node -v | cut -d'v' -f2 | cut -d'.' -f1) -lt 20 ]; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Install jq for JSON processing
echo "Installing dependencies..."
apt-get update
apt-get install -y jq curl git

# Install chromium (try both package names for compatibility)
echo "Installing Chromium browser..."
if ! apt-get install -y chromium-browser 2>/dev/null; then
    apt-get install -y chromium
fi

# Detect which chromium binary is available and create symlink if needed
if ! command -v chromium-browser &> /dev/null && command -v chromium &> /dev/null; then
    ln -sf $(command -v chromium) /usr/local/bin/chromium-browser
    echo "Created chromium-browser symlink"
fi

# Copy management scripts
echo "Copying management scripts..."
cp "$SCRIPT_DIR"/*.sh /opt/lmrc/shared/scripts/
chmod 755 /opt/lmrc/shared/scripts/*.sh

# Copy systemd service files
echo "Installing systemd services..."
cp "$DEPLOY_ROOT/systemd"/*.service /etc/systemd/system/

# Detect desktop user for kiosk service
echo "Configuring kiosk service..."
# Try to detect the user who is running the desktop session
DESKTOP_USER=$(who | grep -E ':\d+' | head -1 | awk '{print $1}')
if [ -z "$DESKTOP_USER" ]; then
    # Fallback: check for common usernames
    if id pi &>/dev/null; then
        DESKTOP_USER="pi"
    elif id greg &>/dev/null; then
        DESKTOP_USER="greg"
    else
        DESKTOP_USER=$(ls /home | head -1)
    fi
fi

if [ -n "$DESKTOP_USER" ]; then
    echo "  Detected desktop user: $DESKTOP_USER"
    sed -i "s/^User=pi$/User=$DESKTOP_USER/" /etc/systemd/system/lmrc-kiosk.service
    echo "  ✓ Kiosk service configured to run as: $DESKTOP_USER"
else
    echo "  ⚠ Could not detect desktop user, kiosk will use default (pi)"
    echo "  If kiosk fails to start, edit /etc/systemd/system/lmrc-kiosk.service"
    echo "  and change User=pi to your actual desktop username"
fi

# Create default configuration
echo "Creating default configuration..."
CURRENT_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
cat > /opt/lmrc/shared/config/device-config.json << EOF
{
  "version": "1.0.0",
  "device": {
    "id": "rpi-boatshed-new",
    "name": "Boatshed Display (New)",
    "location": "To Be Configured"
  },
  "activeApp": null,
  "apps": {
    "booking-viewer": {
      "enabled": true,
      "name": "Boat Booking Viewer",
      "description": "7-day booking calendar for club boats",
      "serviceName": "lmrc-booking-viewer",
      "port": 3000,
      "path": "/opt/lmrc/booking-viewer",
      "startCommand": "npm start",
      "healthCheck": "http://localhost:3000/api/v1/health"
    },
    "noticeboard": {
      "enabled": true,
      "name": "Digital Noticeboard",
      "description": "Club news, events, photos, and weather",
      "serviceName": "lmrc-noticeboard",
      "port": 3000,
      "path": "/opt/lmrc/noticeboard",
      "startCommand": "npm start",
      "healthCheck": "http://localhost:3000/api/health"
    }
  },
  "display": {
    "kioskUrl": "http://localhost:3000",
    "hideMouseCursor": true,
    "disableScreensaver": true,
    "rotation": 0
  },
  "metadata": {
    "lastModified": "$CURRENT_TIME",
    "lastSwitched": null
  }
}
EOF

# Create credentials template if it doesn't exist
if [ ! -f /opt/lmrc/shared/config/credentials.env ]; then
    echo "Creating credentials template..."
    cat > /opt/lmrc/shared/config/credentials.env << 'EOF'
# RevSport Authentication
REVSPORT_BASE_URL=https://www.lakemacquarierowingclub.org.au
REVSPORT_USERNAME=CHANGE_ME
REVSPORT_PASSWORD=CHANGE_ME

# Club Configuration
CLUB_NAME=Lake Macquarie Rowing Club
CLUB_SHORT_NAME=LMRC
CLUB_PRIMARY_COLOR=#1e40af
CLUB_SECONDARY_COLOR=#0ea5e9

# Application
PORT=3000
NODE_ENV=production
EOF
fi

# Clone or update applications
echo "Setting up applications..."
echo ""
echo "Repository URLs:"
echo "  Booking Viewer: https://github.com/UndefinedRest/BoatBookingsCalendar.git"
echo "  Noticeboard: https://github.com/UndefinedRest/LMRC_Noticeboard.git"
echo ""

# Booking Viewer
if [ ! -d /opt/lmrc/booking-viewer/.git ]; then
    echo "Cloning Booking Viewer (BoatBookingsCalendar)..."
    sudo -u lmrc git clone https://github.com/UndefinedRest/BoatBookingsCalendar.git /opt/lmrc/booking-viewer
    if [ $? -ne 0 ]; then
        echo "⚠️  Git clone failed. You may need to provide credentials."
        echo "Please clone manually with:"
        echo "  sudo -u lmrc git clone https://github.com/UndefinedRest/BoatBookingsCalendar.git /opt/lmrc/booking-viewer"
    fi
else
    echo "Booking Viewer already cloned, pulling updates..."
    cd /opt/lmrc/booking-viewer
    sudo -u lmrc git pull
fi

# Noticeboard
if [ ! -d /opt/lmrc/noticeboard/.git ]; then
    echo "Cloning Noticeboard (LMRC_Noticeboard)..."
    sudo -u lmrc git clone https://github.com/UndefinedRest/LMRC_Noticeboard.git /opt/lmrc/noticeboard
    if [ $? -ne 0 ]; then
        echo "⚠️  Git clone failed. You may need to provide credentials."
        echo "Please clone manually with:"
        echo "  sudo -u lmrc git clone https://github.com/UndefinedRest/LMRC_Noticeboard.git /opt/lmrc/noticeboard"
    fi
else
    echo "Noticeboard already cloned, pulling updates..."
    cd /opt/lmrc/noticeboard
    sudo -u lmrc git pull
fi

# Install dependencies if apps exist
if [ -f /opt/lmrc/booking-viewer/package.json ]; then
    echo "Installing booking-viewer dependencies..."
    cd /opt/lmrc/booking-viewer
    sudo -u lmrc npm install
    sudo -u lmrc npm run build

    # Ensure config directory exists with correct permissions
    echo "Setting up booking-viewer config directory..."
    mkdir -p /opt/lmrc/booking-viewer/config
    chown -R lmrc:lmrc /opt/lmrc/booking-viewer/config
    chmod 755 /opt/lmrc/booking-viewer/config
fi

if [ -f /opt/lmrc/noticeboard/package.json ]; then
    echo "Installing noticeboard dependencies..."
    cd /opt/lmrc/noticeboard
    sudo -u lmrc npm install
    sudo -u lmrc npm run build
fi

# Create symlinks for .env files
ln -sf /opt/lmrc/shared/config/credentials.env /opt/lmrc/booking-viewer/.env 2>/dev/null || true
ln -sf /opt/lmrc/shared/config/credentials.env /opt/lmrc/noticeboard/.env 2>/dev/null || true

# Set permissions
chown -R lmrc:lmrc /opt/lmrc
chmod 600 /opt/lmrc/shared/config/credentials.env
chmod 755 /opt/lmrc/shared/scripts/*.sh

# Enable services
echo "Enabling systemd services..."
systemctl daemon-reload
systemctl enable lmrc-launcher.service
systemctl enable lmrc-kiosk.service

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Next steps:"
echo "1. Edit credentials: sudo nano /opt/lmrc/shared/config/credentials.env"
echo "2. Ensure applications are in place:"
echo "   - /opt/lmrc/booking-viewer"
echo "   - /opt/lmrc/noticeboard"
echo "3. Run selector: sudo /opt/lmrc/shared/scripts/select-app.sh"
echo "4. Reboot: sudo reboot"
echo ""
