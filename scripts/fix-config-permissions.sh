#!/bin/bash
# Fix configuration file permissions for lmrc-booking-viewer
# This script ensures the lmrc user can write to the config directory

set -e

echo "Fixing lmrc-booking-viewer configuration permissions..."

# Ensure config directory exists
sudo mkdir -p /opt/lmrc/booking-viewer/config

# Set ownership to lmrc user
sudo chown -R lmrc:lmrc /opt/lmrc/booking-viewer/config

# Set appropriate permissions (rwxr-xr-x for directory, rw-r--r-- for files)
sudo chmod 755 /opt/lmrc/booking-viewer/config
if [ -f /opt/lmrc/booking-viewer/config/tv-display.json ]; then
    sudo chmod 644 /opt/lmrc/booking-viewer/config/tv-display.json
fi

echo "✅ Configuration permissions fixed!"
echo ""
echo "The lmrc user can now write to:"
echo "  /opt/lmrc/booking-viewer/config/"
echo ""
echo "You may need to restart the service:"
echo "  sudo systemctl restart lmrc-booking-viewer"
