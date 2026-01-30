#!/bin/bash
set -e

# LMRC Configuration Backup Script
# Backs up all configuration files to a timestamped archive

BACKUP_DIR="${1:-/home/pi/lmrc-backups}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/lmrc-config-$TIMESTAMP.tar.gz"

echo "=== LMRC Configuration Backup ==="
echo ""

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Check if configuration exists
if [ ! -d "/opt/lmrc/shared/config" ]; then
    echo "Error: /opt/lmrc/shared/config not found"
    exit 1
fi

# Create backup
echo "Creating backup..."
sudo tar -czf "$BACKUP_FILE" \
    /opt/lmrc/shared/config \
    /etc/systemd/system/lmrc-*.service \
    /opt/lmrc/shared/scripts 2>/dev/null || true

# Verify backup was created
if [ -f "$BACKUP_FILE" ]; then
    SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "✓ Backup created: $BACKUP_FILE ($SIZE)"
else
    echo "✗ Backup failed"
    exit 1
fi

# List contents
echo ""
echo "Backup contains:"
tar -tzf "$BACKUP_FILE" | head -10
echo "..."

# Clean up old backups (keep last 5)
echo ""
echo "Cleaning up old backups (keeping last 5)..."
cd "$BACKUP_DIR"
ls -t lmrc-config-*.tar.gz 2>/dev/null | tail -n +6 | xargs rm -f 2>/dev/null || true

BACKUP_COUNT=$(ls -1 lmrc-config-*.tar.gz 2>/dev/null | wc -l)
echo "Current backups: $BACKUP_COUNT"

echo ""
echo "=== Backup Complete ==="
echo ""
echo "To restore this backup:"
echo "  sudo tar -xzf $BACKUP_FILE -C /"
echo "  sudo systemctl daemon-reload"
echo "  sudo reboot"
