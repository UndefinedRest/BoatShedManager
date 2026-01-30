#!/bin/bash

# LMRC System Health Check
# Checks all components and reports status

CONFIG_FILE="/opt/lmrc/shared/config/device-config.json"
EXIT_CODE=0

echo "=== LMRC System Health Check ==="
echo "Timestamp: $(date)"
echo ""

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
    echo "✗ Configuration file not found: $CONFIG_FILE"
    exit 1
fi

# Get active app
ACTIVE_APP=$(jq -r '.activeApp' "$CONFIG_FILE" 2>/dev/null || echo "unknown")

echo "Active Application: $ACTIVE_APP"
echo ""

# Check 1: Service Status
echo "1. Service Status:"
case "$ACTIVE_APP" in
    booking-viewer)
        SERVICE="lmrc-booking-viewer.service"
        ;;
    noticeboard)
        SERVICE="lmrc-noticeboard.service"
        ;;
    *)
        echo "   ✗ Unknown or no active application"
        EXIT_CODE=1
        SERVICE=""
        ;;
esac

if [ -n "$SERVICE" ]; then
    if systemctl is-active --quiet "$SERVICE"; then
        echo "   ✓ $SERVICE is running"
    else
        echo "   ✗ $SERVICE is not running"
        EXIT_CODE=1
    fi
fi

# Check 2: HTTP Response
echo ""
echo "2. HTTP Endpoint:"
if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✓ Application responding on port 3000"
else
    echo "   ✗ Application not responding on port 3000"
    EXIT_CODE=1
fi

# Check 3: Kiosk Service
echo ""
echo "3. Kiosk Display:"
if systemctl is-active --quiet lmrc-kiosk.service; then
    echo "   ✓ Kiosk service running"
else
    echo "   ✗ Kiosk service not running"
    EXIT_CODE=1
fi

# Check 4: Browser Process (Chromium, Chrome, or Firefox)
if pgrep -f "chromium.*kiosk" > /dev/null || pgrep -f "chrome.*kiosk" > /dev/null || pgrep -f "firefox.*kiosk" > /dev/null; then
    echo "   ✓ Browser running in kiosk mode"
else
    echo "   ✗ Browser not detected in kiosk mode"
    EXIT_CODE=1
fi

# Check 5: Disk Space
echo ""
echo "4. Disk Space:"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo "   ✓ Disk space OK ($DISK_USAGE% used)"
elif [ "$DISK_USAGE" -lt 90 ]; then
    echo "   ⚠ Disk space warning ($DISK_USAGE% used)"
else
    echo "   ✗ Disk space critical ($DISK_USAGE% used)"
    EXIT_CODE=1
fi

# Check 6: Memory Usage
echo ""
echo "5. Memory:"
MEM_USAGE=$(free | awk 'NR==2 {printf "%.0f", $3*100/$2}')
if [ "$MEM_USAGE" -lt 80 ]; then
    echo "   ✓ Memory OK ($MEM_USAGE% used)"
elif [ "$MEM_USAGE" -lt 90 ]; then
    echo "   ⚠ Memory warning ($MEM_USAGE% used)"
else
    echo "   ✗ Memory critical ($MEM_USAGE% used)"
    EXIT_CODE=1
fi

# Check 7: Network Connectivity
echo ""
echo "6. Network:"
if ping -c 1 -W 2 8.8.8.8 > /dev/null 2>&1; then
    echo "   ✓ Internet connectivity OK"
else
    echo "   ✗ No internet connectivity"
    EXIT_CODE=1
fi

if ping -c 1 -W 2 www.lakemacquarierowingclub.org.au > /dev/null 2>&1; then
    echo "   ✓ Can reach RevSport server"
else
    echo "   ✗ Cannot reach RevSport server"
    EXIT_CODE=1
fi

# Check 8: Credentials
echo ""
echo "7. Configuration:"
CRED_FILE="/opt/lmrc/shared/config/credentials.env"
if [ -f "$CRED_FILE" ]; then
    if grep -q "CHANGE_ME" "$CRED_FILE"; then
        echo "   ✗ Credentials not configured (contains CHANGE_ME)"
        EXIT_CODE=1
    else
        echo "   ✓ Credentials configured"
    fi
else
    echo "   ✗ Credentials file not found"
    EXIT_CODE=1
fi

# Check 9: Background Jobs (for Noticeboard)
if [ "$ACTIVE_APP" = "noticeboard" ]; then
    echo ""
    echo "8. Background Jobs:"
    if sudo crontab -u lmrc -l 2>/dev/null | grep -q noticeboard-scraper; then
        echo "   ✓ Scraper cron job configured"
    else
        echo "   ✗ Scraper cron job not found"
        EXIT_CODE=1
    fi
fi

# Summary
echo ""
echo "==================================="
if [ $EXIT_CODE -eq 0 ]; then
    echo "✓ All checks passed"
else
    echo "✗ Some checks failed (see above)"
fi
echo "==================================="
echo ""

# Exit with appropriate code
exit $EXIT_CODE
