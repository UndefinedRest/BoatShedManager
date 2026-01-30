#!/bin/bash

CONFIG_FILE="/opt/lmrc/shared/config/device-config.json"

# Display header
cat << "EOF"
╔════════════════════════════════════════════════════════════╗
║   LMRC Display Status                                      ║
╚════════════════════════════════════════════════════════════╝

EOF

# Read configuration
ACTIVE_APP=$(jq -r '.activeApp' "$CONFIG_FILE")
DEVICE_ID=$(jq -r '.device.id' "$CONFIG_FILE")
DEVICE_NAME=$(jq -r '.device.name' "$CONFIG_FILE")
LAST_SWITCHED=$(jq -r '.metadata.lastSwitched' "$CONFIG_FILE")

# Display device info
echo "Device Information:"
echo "  ID:       $DEVICE_ID"
echo "  Name:     $DEVICE_NAME"
echo ""

# Display active app
echo "Active Application:"
case "$ACTIVE_APP" in
    booking-viewer)
        echo "  [✓] Boat Booking Viewer"
        SERVICE="lmrc-booking-viewer.service"
        ;;
    noticeboard)
        echo "  [✓] Digital Noticeboard"
        SERVICE="lmrc-noticeboard.service"
        ;;
    *)
        echo "  [!] Unknown: $ACTIVE_APP"
        exit 1
        ;;
esac

# Check service status
echo ""
echo "Service Status:"
if systemctl is-active --quiet "$SERVICE"; then
    echo "  [✓] Running"
else
    echo "  [✗] Stopped"
fi

# Check port
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "  [✓] Responding on port 3000"
else
    echo "  [✗] Not responding"
fi

# Display last switched time
echo ""
echo "Last switched: $LAST_SWITCHED"

# Display helpful commands
echo ""
echo "Management Commands:"
echo "  Switch app:  sudo /opt/lmrc/shared/scripts/switch-app.sh"
echo "  View logs:   sudo journalctl -u $SERVICE -f"
echo "  Restart:     sudo systemctl restart $SERVICE"
