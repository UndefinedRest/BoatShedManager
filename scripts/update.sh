#!/bin/bash
set -e

# LMRC Application Update Script
# Updates both applications from git repositories

if [ "$EUID" -ne 0 ]; then
    echo "Please run with sudo"
    exit 1
fi

echo "=== LMRC Application Update ==="
echo ""

# Get active app
CONFIG_FILE="/opt/lmrc/shared/config/device-config.json"
ACTIVE_APP=$(jq -r '.activeApp' "$CONFIG_FILE" 2>/dev/null || echo "unknown")

echo "Active application: $ACTIVE_APP"
echo ""

# Function to update an application
update_app() {
    local APP_NAME=$1
    local APP_PATH=$2

    echo "Updating $APP_NAME..."

    if [ ! -d "$APP_PATH" ]; then
        echo "  ✗ Application not found at $APP_PATH"
        return 1
    fi

    if [ ! -d "$APP_PATH/.git" ]; then
        echo "  ⚠ Not a git repository, skipping"
        return 0
    fi

    cd "$APP_PATH"

    # Get current version
    CURRENT_VERSION=$(git describe --always --tags 2>/dev/null || git rev-parse --short HEAD)
    echo "  Current version: $CURRENT_VERSION"

    # Pull updates
    echo "  Pulling updates..."
    sudo -u lmrc git fetch

    # Check if updates available
    LOCAL=$(git rev-parse @)
    REMOTE=$(git rev-parse @{u} 2>/dev/null || echo "$LOCAL")

    if [ "$LOCAL" = "$REMOTE" ]; then
        echo "  ✓ Already up to date"
        return 0
    fi

    echo "  Updates available, pulling..."
    sudo -u lmrc git pull

    # Install dependencies
    echo "  Installing dependencies..."
    sudo -u lmrc npm install

    # Build application
    echo "  Building application..."
    sudo -u lmrc npm run build

    # Get new version
    NEW_VERSION=$(git describe --always --tags 2>/dev/null || git rev-parse --short HEAD)
    echo "  ✓ Updated to version: $NEW_VERSION"

    return 0
}

# Update both applications
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Booking Viewer"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
update_app "booking-viewer" "/opt/lmrc/booking-viewer"
BOOKING_UPDATED=$?

# Always fix config permissions after booking-viewer update
# This ensures the lmrc user can write to the config directory
echo "  Fixing config permissions..."
mkdir -p /opt/lmrc/booking-viewer/config
chown -R lmrc:lmrc /opt/lmrc/booking-viewer/config
chmod 755 /opt/lmrc/booking-viewer/config
if [ -f /opt/lmrc/booking-viewer/config/tv-display.json ]; then
    chmod 644 /opt/lmrc/booking-viewer/config/tv-display.json
fi
echo "  ✓ Config permissions fixed"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Noticeboard"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
update_app "noticeboard" "/opt/lmrc/noticeboard"
NOTICEBOARD_UPDATED=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Update Complete"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Determine if restart needed
NEEDS_RESTART=0
if [ "$ACTIVE_APP" = "booking-viewer" ] && [ $BOOKING_UPDATED -eq 0 ]; then
    NEEDS_RESTART=1
fi
if [ "$ACTIVE_APP" = "noticeboard" ] && [ $NOTICEBOARD_UPDATED -eq 0 ]; then
    NEEDS_RESTART=1
fi

if [ $NEEDS_RESTART -eq 1 ]; then
    echo ""
    echo "The active application has been updated."
    read -p "Restart the service now? [Y/n]: " restart_now

    if [[ "$restart_now" =~ ^[Yy]$ ]] || [[ -z "$restart_now" ]]; then
        case "$ACTIVE_APP" in
            booking-viewer)
                systemctl restart lmrc-booking-viewer
                echo "✓ Booking viewer restarted"
                ;;
            noticeboard)
                systemctl restart lmrc-noticeboard
                echo "✓ Noticeboard restarted"
                ;;
        esac

        # Wait for service to start
        sleep 3

        # Check health
        if curl -sf http://localhost:3000 > /dev/null 2>&1; then
            echo "✓ Application is responding"
        else
            echo "⚠ Application may not be responding, check logs"
        fi
    else
        echo "Please restart manually: sudo systemctl restart lmrc-$ACTIVE_APP"
    fi
else
    echo "No restart needed (inactive application was updated)"
fi

echo ""
echo "=== Update Complete ==="
