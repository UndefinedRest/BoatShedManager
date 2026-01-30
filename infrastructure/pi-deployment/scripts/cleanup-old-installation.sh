#!/bin/bash
#
# Cleanup Old LMRC Installation
# Safely removes old PM2-based installations and prepares for new deployment
#

set -e

echo "═══════════════════════════════════════════════════════════"
echo "  LMRC Old Installation Cleanup Script"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "This script will:"
echo "  1. Stop and remove PM2 services"
echo "  2. Archive old installations to ~/lmrc-archive-$(date +%Y%m%d)"
echo "  3. Remove old cron jobs"
echo "  4. Clean up PM2 completely"
echo ""

# Check if running as correct user
CURRENT_USER=$(whoami)
if [ "$CURRENT_USER" != "greg" ]; then
    echo "⚠️  Warning: Expected to run as 'greg', currently running as '$CURRENT_USER'"
    echo "Press Enter to continue anyway, or Ctrl+C to cancel..."
    read
fi

# Confirmation prompt
echo "⚠️  IMPORTANT: Make sure you've committed any changes you want to keep!"
echo ""
read -p "Continue with cleanup? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Step 1: Stopping PM2 Services"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Check if PM2 is installed
if command -v pm2 &> /dev/null; then
    echo "Found PM2 installation"

    # Show current PM2 processes
    echo ""
    echo "Current PM2 processes:"
    pm2 list || true

    echo ""
    echo "Stopping all PM2 processes..."
    pm2 stop all || true

    echo "Deleting all PM2 processes..."
    pm2 delete all || true

    echo "Removing PM2 from startup..."
    pm2 unstartup || true

    echo "Killing PM2 daemon..."
    pm2 kill || true

    echo "✓ PM2 services stopped and removed"
else
    echo "PM2 not found (already removed or not installed)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Step 2: Archiving Old Installations"
echo "═══════════════════════════════════════════════════════════"
echo ""

ARCHIVE_DIR="$HOME/lmrc-archive-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$ARCHIVE_DIR"

echo "Archive location: $ARCHIVE_DIR"
echo ""

# Archive booking system
if [ -d "$HOME/lmrc-booking-system" ]; then
    echo "Archiving lmrc-booking-system..."
    mv "$HOME/lmrc-booking-system" "$ARCHIVE_DIR/"
    echo "✓ Moved to $ARCHIVE_DIR/lmrc-booking-system"
else
    echo "⚠️  lmrc-booking-system not found at $HOME/lmrc-booking-system"
fi

# Archive noticeboard
if [ -d "$HOME/lmrc-noticeboard" ]; then
    echo "Archiving lmrc-noticeboard..."
    mv "$HOME/lmrc-noticeboard" "$ARCHIVE_DIR/"
    echo "✓ Moved to $ARCHIVE_DIR/lmrc-noticeboard"
else
    echo "⚠️  lmrc-noticeboard not found at $HOME/lmrc-noticeboard"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Step 3: Removing Old Cron Jobs"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Backup current crontab
echo "Backing up current crontab..."
crontab -l > "$ARCHIVE_DIR/crontab-backup.txt" 2>/dev/null || echo "No crontab to backup"

# Remove LMRC-related cron jobs
echo "Removing old LMRC cron jobs..."
crontab -l 2>/dev/null | grep -v 'lmrc' | grep -v 'noticeboard' | grep -v 'booking' | crontab - 2>/dev/null || true

echo "✓ Old cron jobs removed (backup saved to $ARCHIVE_DIR/crontab-backup.txt)"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Step 4: Cleaning Up PM2"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Archive PM2 logs and config
if [ -d "$HOME/.pm2" ]; then
    echo "Archiving PM2 configuration..."
    cp -r "$HOME/.pm2" "$ARCHIVE_DIR/pm2-config" || true

    echo "Removing PM2 directory..."
    rm -rf "$HOME/.pm2"
    echo "✓ PM2 directory removed"
else
    echo "PM2 directory not found (already cleaned)"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Step 5: Cleanup Summary"
echo "═══════════════════════════════════════════════════════════"
echo ""

echo "✓ Old installations archived to: $ARCHIVE_DIR"
echo ""
echo "Archive contents:"
ls -lh "$ARCHIVE_DIR/"

echo ""
echo "Disk space freed:"
du -sh "$ARCHIVE_DIR" 2>/dev/null || echo "Unable to calculate"

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Cleanup Complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Next steps:"
echo ""
echo "1. Clone the deployment repository:"
echo "   cd ~"
echo "   git clone https://github.com/UndefinedRest/lmrc-pi-deployment.git"
echo ""
echo "2. Run the installer:"
echo "   cd lmrc-pi-deployment"
echo "   sudo bash scripts/install.sh"
echo ""
echo "3. Configure credentials:"
echo "   sudo nano /opt/lmrc/shared/config/credentials.env"
echo ""
echo "4. Reboot to start the launcher:"
echo "   sudo reboot"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "Your old installations are safely archived and can be deleted later"
echo "if the new deployment works correctly."
echo ""
echo "To restore from archive (if needed):"
echo "  cd $ARCHIVE_DIR"
echo "  mv lmrc-booking-system ~/"
echo "  mv lmrc-noticeboard ~/"
echo ""
