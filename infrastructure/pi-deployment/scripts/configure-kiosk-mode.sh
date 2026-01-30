#!/bin/bash
# Configure Linux Mint / Generic Linux for Kiosk Mode
# This script disables screen locking, enables auto-login, and prevents screensaver

set -e

echo "=== LMRC Kiosk Mode Configuration ==="
echo ""

# Check if running on Raspberry Pi OS
if grep -q "Raspbian" /etc/os-release 2>/dev/null || grep -q "Raspberry Pi" /etc/os-release 2>/dev/null; then
    echo "⚠️  Raspberry Pi OS detected!"
    echo ""
    echo "This script is for desktop Linux distributions (Ubuntu, Linux Mint, Debian Desktop)."
    echo "Raspberry Pi OS is already configured for kiosk mode by default."
    echo ""
    echo "You do NOT need to run this script on Raspberry Pi OS."
    echo "The install.sh script already configures everything correctly for Pi."
    echo ""
    exit 0
fi

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root: sudo $0"
    exit 1
fi

# Detect desktop user
DESKTOP_USER=""
if [ -n "$SUDO_USER" ]; then
    DESKTOP_USER="$SUDO_USER"
else
    DESKTOP_USER=$(who | grep -E ':\d+|tty7' | head -1 | awk '{print $1}')
fi

if [ -z "$DESKTOP_USER" ]; then
    echo "Could not detect desktop user."
    read -p "Enter the username that should auto-login (e.g., greg): " DESKTOP_USER
fi

echo "Configuring kiosk mode for user: $DESKTOP_USER"
echo ""

# Verify user exists
if ! id "$DESKTOP_USER" &>/dev/null; then
    echo "✗ User '$DESKTOP_USER' does not exist"
    exit 1
fi

# Detect desktop environment
DESKTOP_ENV=""
if [ -f /usr/bin/cinnamon-session ]; then
    DESKTOP_ENV="cinnamon"
elif [ -f /usr/bin/gnome-session ]; then
    DESKTOP_ENV="gnome"
elif [ -f /usr/bin/mate-session ]; then
    DESKTOP_ENV="mate"
elif [ -f /usr/bin/xfce4-session ]; then
    DESKTOP_ENV="xfce"
else
    DESKTOP_ENV="unknown"
fi

echo "Detected desktop environment: $DESKTOP_ENV"
echo ""

# ============================================================
# Step 1: Enable Auto-Login
# ============================================================
echo "Step 1: Configuring auto-login..."

case "$DESKTOP_ENV" in
    cinnamon|gnome|mate)
        # LightDM (used by Linux Mint, Ubuntu MATE)
        if [ -f /etc/lightdm/lightdm.conf ]; then
            echo "  Configuring LightDM..."

            # Backup original config
            if [ ! -f /etc/lightdm/lightdm.conf.backup ]; then
                cp /etc/lightdm/lightdm.conf /etc/lightdm/lightdm.conf.backup
            fi

            # Enable auto-login
            if ! grep -q "^\[Seat:\*\]" /etc/lightdm/lightdm.conf; then
                echo "[Seat:*]" >> /etc/lightdm/lightdm.conf
            fi

            sed -i "/^\[Seat:\*\]/a autologin-user=$DESKTOP_USER" /etc/lightdm/lightdm.conf
            sed -i "/^\[Seat:\*\]/a autologin-user-timeout=0" /etc/lightdm/lightdm.conf

            echo "  ✓ LightDM auto-login enabled"
        elif [ -d /etc/lightdm/lightdm.conf.d ]; then
            # Modern LightDM with conf.d directory
            echo "  Configuring LightDM (conf.d)..."

            cat > /etc/lightdm/lightdm.conf.d/50-autologin.conf << EOF
[Seat:*]
autologin-user=$DESKTOP_USER
autologin-user-timeout=0
EOF
            echo "  ✓ LightDM auto-login enabled (conf.d)"
        fi
        ;;

    *)
        echo "  ⚠ Unknown display manager, skipping auto-login configuration"
        echo "  You may need to enable auto-login manually in your display manager settings"
        ;;
esac

# ============================================================
# Step 2: Disable Screen Locking
# ============================================================
echo ""
echo "Step 2: Disabling screen locking..."

# Disable for the desktop user
sudo -u "$DESKTOP_USER" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u $DESKTOP_USER)/bus" \
    dconf write /org/cinnamon/desktop/screensaver/lock-enabled false 2>/dev/null || true

sudo -u "$DESKTOP_USER" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u $DESKTOP_USER)/bus" \
    gsettings set org.cinnamon.desktop.screensaver lock-enabled false 2>/dev/null || true

sudo -u "$DESKTOP_USER" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u $DESKTOP_USER)/bus" \
    gsettings set org.gnome.desktop.screensaver lock-enabled false 2>/dev/null || true

sudo -u "$DESKTOP_USER" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u $DESKTOP_USER)/bus" \
    gsettings set org.gnome.desktop.lockdown disable-lock-screen true 2>/dev/null || true

echo "  ✓ Screen locking disabled"

# ============================================================
# Step 3: Disable Screensaver
# ============================================================
echo ""
echo "Step 3: Disabling screensaver..."

sudo -u "$DESKTOP_USER" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u $DESKTOP_USER)/bus" \
    gsettings set org.cinnamon.desktop.screensaver idle-activation-enabled false 2>/dev/null || true

sudo -u "$DESKTOP_USER" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u $DESKTOP_USER)/bus" \
    gsettings set org.gnome.desktop.screensaver idle-activation-enabled false 2>/dev/null || true

echo "  ✓ Screensaver disabled"

# ============================================================
# Step 4: Disable Screen Blanking / Power Management
# ============================================================
echo ""
echo "Step 4: Disabling screen blanking and power management..."

# Disable screen blanking
sudo -u "$DESKTOP_USER" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u $DESKTOP_USER)/bus" \
    gsettings set org.cinnamon.settings-daemon.plugins.power idle-dim false 2>/dev/null || true

sudo -u "$DESKTOP_USER" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u $DESKTOP_USER)/bus" \
    gsettings set org.gnome.settings-daemon.plugins.power idle-dim false 2>/dev/null || true

# Set sleep to never
sudo -u "$DESKTOP_USER" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u $DESKTOP_USER)/bus" \
    gsettings set org.cinnamon.settings-daemon.plugins.power sleep-inactive-ac-timeout 0 2>/dev/null || true

sudo -u "$DESKTOP_USER" DBUS_SESSION_BUS_ADDRESS="unix:path=/run/user/$(id -u $DESKTOP_USER)/bus" \
    gsettings set org.gnome.settings-daemon.plugins.power sleep-inactive-ac-timeout 0 2>/dev/null || true

# Disable screen blank timeout
xset s off 2>/dev/null || true
xset -dpms 2>/dev/null || true

echo "  ✓ Power management disabled"

# ============================================================
# Step 5: Create Startup Script to Prevent Screen Locking
# ============================================================
echo ""
echo "Step 5: Creating startup script..."

# Create autostart directory if it doesn't exist
mkdir -p /home/$DESKTOP_USER/.config/autostart

# Create desktop file to run on startup
cat > /home/$DESKTOP_USER/.config/autostart/disable-screensaver.desktop << EOF
[Desktop Entry]
Type=Application
Name=Disable Screensaver
Comment=Prevent screen from locking or blanking
Exec=/bin/bash -c "xset s off; xset -dpms; gsettings set org.cinnamon.desktop.screensaver lock-enabled false 2>/dev/null || true"
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF

chown $DESKTOP_USER:$DESKTOP_USER /home/$DESKTOP_USER/.config/autostart/disable-screensaver.desktop
chmod +x /home/$DESKTOP_USER/.config/autostart/disable-screensaver.desktop

echo "  ✓ Startup script created"

# ============================================================
# Step 6: Optional - Hide Mouse Cursor
# ============================================================
echo ""
read -p "Step 6: Hide mouse cursor after inactivity? (y/n): " HIDE_CURSOR

if [[ "$HIDE_CURSOR" =~ ^[Yy]$ ]]; then
    echo "  Installing unclutter..."
    apt-get update
    apt-get install -y unclutter

    # Create autostart entry for unclutter
    cat > /home/$DESKTOP_USER/.config/autostart/unclutter.desktop << EOF
[Desktop Entry]
Type=Application
Name=Hide Mouse Cursor
Comment=Hide cursor when idle
Exec=unclutter -idle 1
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF

    chown $DESKTOP_USER:$DESKTOP_USER /home/$DESKTOP_USER/.config/autostart/unclutter.desktop
    chmod +x /home/$DESKTOP_USER/.config/autostart/unclutter.desktop

    echo "  ✓ Mouse cursor will hide after 1 second of inactivity"
else
    echo "  ⊘ Mouse cursor hiding skipped"
fi

# ============================================================
# Summary
# ============================================================
echo ""
echo "==================================="
echo "✓ Kiosk Mode Configuration Complete"
echo "==================================="
echo ""
echo "Changes made:"
echo "  ✓ Auto-login enabled for user: $DESKTOP_USER"
echo "  ✓ Screen locking disabled"
echo "  ✓ Screensaver disabled"
echo "  ✓ Power management disabled (screen won't blank)"
echo "  ✓ Startup script created to maintain settings"
if [[ "$HIDE_CURSOR" =~ ^[Yy]$ ]]; then
    echo "  ✓ Mouse cursor hiding enabled"
fi
echo ""
echo "Next steps:"
echo "1. Reboot the system: sudo reboot"
echo "2. System should auto-login as $DESKTOP_USER"
echo "3. Kiosk browser should start automatically"
echo "4. Screen should never lock or blank"
echo ""
echo "If screen still locks after reboot:"
echo "1. Open System Settings → Screensaver"
echo "2. Set delay to 'Never'"
echo "3. Disable 'Lock screen when screensaver is active'"
echo ""
echo "To undo these changes:"
echo "1. Restore auto-login: sudo nano /etc/lightdm/lightdm.conf (or /etc/lightdm/lightdm.conf.d/50-autologin.conf)"
echo "2. Remove startup scripts: rm ~/.config/autostart/disable-screensaver.desktop"
echo "3. Re-enable settings in System Settings"
echo ""
