#!/bin/bash

# LMRC Installation Test Script
# Verifies that the deployment system is correctly installed

echo "=== LMRC Installation Test ==="
echo ""

EXIT_CODE=0

# Test 1: Directory Structure
echo "1. Checking directory structure..."
REQUIRED_DIRS=(
    "/opt/lmrc"
    "/opt/lmrc/shared"
    "/opt/lmrc/shared/config"
    "/opt/lmrc/shared/scripts"
    "/opt/lmrc/shared/logs"
)

for dir in "${REQUIRED_DIRS[@]}"; do
    if [ -d "$dir" ]; then
        echo "   ✓ $dir exists"
    else
        echo "   ✗ $dir missing"
        EXIT_CODE=1
    fi
done

# Test 2: Configuration Files
echo ""
echo "2. Checking configuration files..."
if [ -f "/opt/lmrc/shared/config/device-config.json" ]; then
    echo "   ✓ device-config.json exists"
    # Validate JSON
    if jq empty /opt/lmrc/shared/config/device-config.json 2>/dev/null; then
        echo "   ✓ device-config.json is valid JSON"
    else
        echo "   ✗ device-config.json is invalid JSON"
        EXIT_CODE=1
    fi
else
    echo "   ✗ device-config.json missing"
    EXIT_CODE=1
fi

if [ -f "/opt/lmrc/shared/config/credentials.env" ]; then
    echo "   ✓ credentials.env exists"
else
    echo "   ✗ credentials.env missing"
    EXIT_CODE=1
fi

# Test 3: Management Scripts
echo ""
echo "3. Checking management scripts..."
REQUIRED_SCRIPTS=(
    "launcher.sh"
    "select-app.sh"
    "switch-app.sh"
    "status.sh"
    "backup.sh"
    "health-check.sh"
    "update.sh"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
    SCRIPT_PATH="/opt/lmrc/shared/scripts/$script"
    if [ -f "$SCRIPT_PATH" ]; then
        if [ -x "$SCRIPT_PATH" ]; then
            echo "   ✓ $script exists and is executable"
        else
            echo "   ⚠ $script exists but not executable"
            EXIT_CODE=1
        fi
    else
        echo "   ✗ $script missing"
        EXIT_CODE=1
    fi
done

# Test 4: Systemd Services
echo ""
echo "4. Checking systemd services..."
REQUIRED_SERVICES=(
    "lmrc-launcher.service"
    "lmrc-booking-viewer.service"
    "lmrc-noticeboard.service"
    "lmrc-kiosk.service"
)

for service in "${REQUIRED_SERVICES[@]}"; do
    if [ -f "/etc/systemd/system/$service" ]; then
        echo "   ✓ $service installed"
        # Check if enabled
        if systemctl is-enabled --quiet "$service" 2>/dev/null; then
            echo "      (enabled)"
        else
            echo "      (not enabled)"
        fi
    else
        echo "   ✗ $service missing"
        EXIT_CODE=1
    fi
done

# Test 5: User and Permissions
echo ""
echo "5. Checking user and permissions..."
if id -u lmrc >/dev/null 2>&1; then
    echo "   ✓ lmrc user exists"
else
    echo "   ✗ lmrc user not found"
    EXIT_CODE=1
fi

if [ "$(stat -c %U /opt/lmrc/shared/config)" = "lmrc" ]; then
    echo "   ✓ Config directory owned by lmrc"
else
    echo "   ⚠ Config directory not owned by lmrc"
fi

# Test 6: Required Software
echo ""
echo "6. Checking required software..."

# Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -ge 20 ]; then
        echo "   ✓ Node.js $(node -v) installed"
    else
        echo "   ⚠ Node.js version too old (need 20+, have $NODE_VERSION)"
        EXIT_CODE=1
    fi
else
    echo "   ✗ Node.js not installed"
    EXIT_CODE=1
fi

# jq
if command -v jq &> /dev/null; then
    echo "   ✓ jq installed"
else
    echo "   ✗ jq not installed"
    EXIT_CODE=1
fi

# curl
if command -v curl &> /dev/null; then
    echo "   ✓ curl installed"
else
    echo "   ✗ curl not installed"
    EXIT_CODE=1
fi

# Chromium
if command -v chromium-browser &> /dev/null; then
    echo "   ✓ chromium-browser installed"
else
    echo "   ⚠ chromium-browser not found (needed for kiosk)"
fi

# Test 7: Applications
echo ""
echo "7. Checking applications..."
if [ -d "/opt/lmrc/booking-viewer" ]; then
    echo "   ✓ booking-viewer directory exists"
    if [ -f "/opt/lmrc/booking-viewer/package.json" ]; then
        echo "   ✓ booking-viewer has package.json"
        if [ -d "/opt/lmrc/booking-viewer/dist" ]; then
            echo "   ✓ booking-viewer is built"
        else
            echo "   ⚠ booking-viewer not built (run npm run build)"
        fi
    else
        echo "   ⚠ booking-viewer missing package.json"
    fi
else
    echo "   ⚠ booking-viewer not installed (needs manual clone)"
fi

if [ -d "/opt/lmrc/noticeboard" ]; then
    echo "   ✓ noticeboard directory exists"
    if [ -f "/opt/lmrc/noticeboard/package.json" ]; then
        echo "   ✓ noticeboard has package.json"
        if [ -d "/opt/lmrc/noticeboard/public" ]; then
            echo "   ✓ noticeboard is built"
        else
            echo "   ⚠ noticeboard not built (run npm run build)"
        fi
    else
        echo "   ⚠ noticeboard missing package.json"
    fi
else
    echo "   ⚠ noticeboard not installed (needs manual clone)"
fi

# Test 8: Network
echo ""
echo "8. Checking network connectivity..."
if ping -c 1 -W 2 8.8.8.8 > /dev/null 2>&1; then
    echo "   ✓ Internet connectivity OK"
else
    echo "   ✗ No internet connectivity"
    EXIT_CODE=1
fi

# Summary
echo ""
echo "==================================="
if [ $EXIT_CODE -eq 0 ]; then
    echo "✓ Installation test PASSED"
    echo ""
    echo "Next steps:"
    echo "  1. Ensure applications are cloned and built"
    echo "  2. Configure credentials: sudo nano /opt/lmrc/shared/config/credentials.env"
    echo "  3. Select application: sudo /opt/lmrc/shared/scripts/select-app.sh"
    echo "  4. Reboot: sudo reboot"
else
    echo "✗ Installation test FAILED"
    echo ""
    echo "Please address the issues above before proceeding."
fi
echo "==================================="
echo ""

exit $EXIT_CODE
