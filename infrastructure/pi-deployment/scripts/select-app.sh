#!/bin/bash
set -e

CONFIG_FILE="/opt/lmrc/shared/config/device-config.json"

# Display banner
clear
cat << "EOF"
╔════════════════════════════════════════════════════════════╗
║   LMRC Application Selector                                ║
║   Lake Macquarie Rowing Club - Boatshed Display System     ║
╚════════════════════════════════════════════════════════════╝

EOF

# Display options
echo "This Raspberry Pi can run one of the following applications:"
echo ""
echo "  [1] Boat Booking Viewer"
echo "      └─ 7-day booking calendar for all club boats"
echo "      └─ Updates every 10 minutes"
echo ""
echo "  [2] Digital Noticeboard"
echo "      └─ Club news, events, photos, and weather"
echo "      └─ Updates hourly"
echo ""

# Get user selection
while true; do
    read -p "Select which application to run [1-2]: " choice
    case $choice in
        1)
            SELECTED_APP="booking-viewer"
            SELECTED_NAME="Boat Booking Viewer"
            break
            ;;
        2)
            SELECTED_APP="noticeboard"
            SELECTED_NAME="Digital Noticeboard"
            break
            ;;
        *)
            echo "Invalid choice. Please enter 1 or 2."
            ;;
    esac
done

# Confirm selection
echo ""
echo "You selected: $SELECTED_NAME"
read -p "Is this correct? [Y/n]: " confirm

if [[ ! "$confirm" =~ ^[Yy]$ ]] && [[ ! -z "$confirm" ]]; then
    echo "Selection cancelled. Please run again."
    exit 0
fi

# Update config file
echo "Updating configuration..."
jq --arg app "$SELECTED_APP" \
   --arg time "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
   '.activeApp = $app | .metadata.lastSwitched = $time' \
   "$CONFIG_FILE" > "${CONFIG_FILE}.tmp"
mv "${CONFIG_FILE}.tmp" "$CONFIG_FILE"

echo ""
echo "✓ Configuration saved"
echo "✓ $SELECTED_NAME will run on next boot"
echo ""
read -p "Reboot now to start the application? [Y/n]: " reboot_now

if [[ "$reboot_now" =~ ^[Yy]$ ]] || [[ -z "$reboot_now" ]]; then
    echo "Rebooting..."
    sudo reboot
else
    echo "Please reboot manually to start the application"
fi
