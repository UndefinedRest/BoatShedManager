#!/bin/bash
set -e

CONFIG_FILE="/opt/lmrc/shared/config/device-config.json"
SCRIPT_DIR="/opt/lmrc/shared/scripts"

# Function to read active app from config
get_active_app() {
    if [ ! -f "$CONFIG_FILE" ]; then
        echo ""
        return
    fi
    jq -r '.activeApp // ""' "$CONFIG_FILE" 2>/dev/null || echo ""
}

# Check if app is already selected
ACTIVE_APP=$(get_active_app)

if [ -z "$ACTIVE_APP" ] || [ "$ACTIVE_APP" = "null" ]; then
    # No app selected - run selector
    echo "No application configured. Running selector..."
    "$SCRIPT_DIR/select-app.sh"
    ACTIVE_APP=$(get_active_app)
fi

# Start the selected app
echo "Starting $ACTIVE_APP..."
case "$ACTIVE_APP" in
    booking-viewer)
        systemctl start lmrc-booking-viewer.service
        ;;
    noticeboard)
        systemctl start lmrc-noticeboard.service
        # Setup cron for scraper - runs every 10 minutes, scraper manages its own schedule
        if ! (crontab -u lmrc -l 2>/dev/null | grep -v noticeboard-scraper; \
             echo "*/10 * * * * cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js >> /opt/lmrc/shared/logs/scraper.log 2>&1") | \
            crontab -u lmrc - 2>&1; then
            echo "Warning: Failed to setup cron job for scraper"
        else
            echo "Cron job configured - scraper runs every 10 minutes (manages schedule internally)"
        fi
        ;;
    *)
        echo "Unknown application: $ACTIVE_APP"
        exit 1
        ;;
esac

# Wait for app to be ready (max 30 seconds)
echo "Waiting for application to start..."
for i in {1..30}; do
    if curl -sf http://localhost:3000 > /dev/null 2>&1; then
        echo "$ACTIVE_APP started successfully"
        exit 0
    fi
    sleep 1
done

echo "Application failed to start within 30 seconds"
exit 1
