#!/bin/bash
set -e

if [ "$EUID" -ne 0 ]; then
    echo "Please run with sudo"
    exit 1
fi

CONFIG_FILE="/opt/lmrc/shared/config/device-config.json"

# Get current app
CURRENT_APP=$(jq -r '.activeApp' "$CONFIG_FILE")

echo "Current application: $CURRENT_APP"
echo ""
echo "Would you like to switch to the other application?"
read -p "Continue? [Y/n]: " confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]] && [[ ! -z "$confirm" ]]; then
    echo "Cancelled"
    exit 0
fi

# Determine new app
if [ "$CURRENT_APP" = "booking-viewer" ]; then
    NEW_APP="noticeboard"
else
    NEW_APP="booking-viewer"
fi

# Stop current services
echo "Stopping current application..."
systemctl stop lmrc-booking-viewer.service 2>/dev/null || true
systemctl stop lmrc-noticeboard.service 2>/dev/null || true

# Clear cron jobs
crontab -u lmrc -r 2>/dev/null || true

# Update config
echo "Switching to $NEW_APP..."
jq --arg app "$NEW_APP" \
   --arg time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   '.activeApp = $app | .metadata.lastSwitched = $time' \
   "$CONFIG_FILE" > "${CONFIG_FILE}.tmp"
mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"

echo ""
echo "✓ Switched to $NEW_APP"
echo ""
read -p "Reboot now? [Y/n]: " reboot_now

if [[ "$reboot_now" =~ ^[Yy]$ ]] || [[ -z "$reboot_now" ]]; then
    reboot
else
    echo "Please reboot to complete the switch"
fi
