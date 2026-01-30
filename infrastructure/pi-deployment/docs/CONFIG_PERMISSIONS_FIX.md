# Configuration Save Permission Fix

**Date**: 2025-11-23
**Issue**: "Failed to save configuration" error when saving TV display config on Raspberry Pi
**Affects**: lmrc-booking-viewer on Raspberry Pi

---

## Problem Summary

### Issue 1: Configuration File Permissions
When clicking "Save" on the configuration page (`/config`), users encountered a "Failed to save configuration" error. This was caused by:

1. **Missing config directory** - The `/opt/lmrc/booking-viewer/config/` directory didn't exist or had wrong ownership
2. **Insufficient permissions** - The `lmrc` user couldn't write to the config directory
3. **Systemd restrictions** - `ProtectSystem=strict` restricted filesystem access

### Issue 2: Wrong Default Days
The system was defaulting to showing 5 days of bookings instead of 7 days.

---

## Solution

### Changes Made

#### 1. Updated Default Days ✅
**File**: `lmrc-booking-system/src/models/tv-display-config.ts`

Changed default `daysToDisplay` from 5 to 7:

```typescript
layout: {
  daysToDisplay: 7,  // Changed from 5
  boatRowHeight: 60,
  sessionRowHeight: 30,
  boatNameWidth: 360,
},
```

#### 2. Updated Systemd Service ✅
**File**: `lmrc-pi-deployment/systemd/lmrc-booking-viewer.service`

Added explicit read/write permission for config directory:

```ini
ReadWritePaths=/opt/lmrc/booking-viewer /opt/lmrc/booking-viewer/config /opt/lmrc/shared/logs
```

**Before**:
```ini
ReadWritePaths=/opt/lmrc/booking-viewer /opt/lmrc/shared/logs
```

#### 3. Created Permission Fix Script ✅
**File**: `lmrc-pi-deployment/scripts/fix-config-permissions.sh`

Script to fix config directory ownership and permissions.

---

## How to Apply the Fix on Raspberry Pi

### Step 1: Pull Latest Code
```bash
cd ~/lmrc-pi-deployment
git pull
```

### Step 2: Fix Permissions
```bash
cd ~/lmrc-pi-deployment
chmod +x scripts/fix-config-permissions.sh
./scripts/fix-config-permissions.sh
```

**Output should show**:
```
Fixing lmrc-booking-viewer configuration permissions...
✅ Configuration permissions fixed!
```

### Step 3: Update Systemd Service
```bash
# Copy updated service file
sudo cp systemd/lmrc-booking-viewer.service /etc/systemd/system/

# Reload systemd to pick up changes
sudo systemctl daemon-reload
```

### Step 4: Rebuild and Deploy Updated Code
```bash
cd ~/lmrc-booking-system
git pull

# Rebuild application with new defaults
npm run build

# Copy built files to deployment location
sudo cp -r dist/* /opt/lmrc/booking-viewer/dist/
```

### Step 5: Restart Service
```bash
sudo systemctl restart lmrc-booking-viewer

# Verify service is running
sudo systemctl status lmrc-booking-viewer
```

### Step 6: Verify the Fix
1. Open the configuration page: `http://raspberrypi.local:8080/config`
2. Make a small change (e.g., change days to display)
3. Click "Save Configuration"
4. Should see "Configuration saved successfully" message
5. Verify the change persists after page refresh

---

## Quick Fix Script (All Steps Combined)

Create and run this script on the Pi to apply all fixes at once:

```bash
#!/bin/bash
# Quick fix for config permissions and updates

set -e

echo "🔧 Applying lmrc-booking-viewer fixes..."
echo ""

# 1. Fix permissions
echo "1️⃣ Fixing config directory permissions..."
sudo mkdir -p /opt/lmrc/booking-viewer/config
sudo chown -R lmrc:lmrc /opt/lmrc/booking-viewer/config
sudo chmod 755 /opt/lmrc/booking-viewer/config
echo "   ✅ Permissions fixed"
echo ""

# 2. Update deployment repo
echo "2️⃣ Updating deployment scripts..."
cd ~/lmrc-pi-deployment
git pull
sudo cp systemd/lmrc-booking-viewer.service /etc/systemd/system/
sudo systemctl daemon-reload
echo "   ✅ Systemd service updated"
echo ""

# 3. Update and rebuild application
echo "3️⃣ Updating application code..."
cd ~/lmrc-booking-system
git pull
npm run build
sudo cp -r dist/* /opt/lmrc/booking-viewer/dist/
echo "   ✅ Application updated (default: 7 days)"
echo ""

# 4. Restart service
echo "4️⃣ Restarting service..."
sudo systemctl restart lmrc-booking-viewer
sleep 2
echo "   ✅ Service restarted"
echo ""

# 5. Check status
echo "5️⃣ Checking service status..."
sudo systemctl status lmrc-booking-viewer --no-pager -l
echo ""

echo "✅ All fixes applied successfully!"
echo ""
echo "Next steps:"
echo "  1. Open: http://raspberrypi.local:8080/config"
echo "  2. Test saving configuration"
echo "  3. Verify TV display shows 7 days of bookings"
```

Save as `~/fix-lmrc.sh` and run:
```bash
chmod +x ~/fix-lmrc.sh
./fix-lmrc.sh
```

---

## Technical Details

### Why This Happened

#### Permission Issue
The systemd service runs as the `lmrc` user with `ProtectSystem=strict`, which makes most of the filesystem read-only. The original `ReadWritePaths` didn't explicitly include the config directory, causing permission denied errors when trying to save `tv-display.json`.

#### Default Days Issue
The `DEFAULT_TV_DISPLAY_CONFIG` in `tv-display-config.ts` had `daysToDisplay: 5`. This affected:
- New installations (no config file)
- Reset to defaults functionality
- Configuration page default value

### File Locations on Pi

```
/opt/lmrc/booking-viewer/
├── dist/                           # Built application code
│   ├── server/
│   │   └── index.js               # Main entry point
│   └── services/
│       └── tvDisplayConfigService.js
├── config/                         # Configuration directory
│   └── tv-display.json            # TV display config (needs write access)
└── node_modules/                   # Dependencies
```

### Service User and Permissions

- **User**: `lmrc`
- **Group**: `lmrc`
- **Working Directory**: `/opt/lmrc/booking-viewer`
- **Writable Paths**:
  - `/opt/lmrc/booking-viewer` (application root)
  - `/opt/lmrc/booking-viewer/config` (configuration directory) ← **Fixed**
  - `/opt/lmrc/shared/logs` (log files)

---

## Verification

### Test Configuration Save
```bash
# Test from command line
curl -X POST http://localhost:8080/api/v1/config/tv-display \
  -H "Content-Type: application/json" \
  -d '{
    "layout": {"daysToDisplay": 7},
    "columns": {"leftTitle": "CLUB BOATS", "rightTitle": "RACE BOATS"}
  }'
```

**Expected response**:
```json
{
  "success": true,
  "message": "Configuration updated successfully",
  "data": { ... }
}
```

### Verify File Permissions
```bash
# Check config directory ownership
ls -la /opt/lmrc/booking-viewer/ | grep config

# Should show:
# drwxr-xr-x  2 lmrc lmrc  4096 Nov 23 10:00 config

# Check config file (if exists)
ls -la /opt/lmrc/booking-viewer/config/

# Should show:
# -rw-r--r-- 1 lmrc lmrc  1234 Nov 23 10:00 tv-display.json
```

### Check Service Logs
```bash
# View recent logs
sudo journalctl -u lmrc-booking-viewer -n 50

# Follow logs in real-time
sudo journalctl -u lmrc-booking-viewer -f
```

Look for:
- ✅ "TV display config saved successfully"
- ❌ "Error saving TV display config" (should not appear after fix)

---

## Rollback (If Needed)

If something goes wrong, revert changes:

```bash
# Restore previous systemd service
cd ~/lmrc-pi-deployment
git checkout HEAD~1 systemd/lmrc-booking-viewer.service
sudo cp systemd/lmrc-booking-viewer.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart lmrc-booking-viewer
```

---

## Future Improvements

### Consider These Enhancements

1. **Automatic Directory Creation**
   - Modify deployment scripts to create config directory on initial setup
   - Set correct ownership and permissions during installation

2. **Better Error Messages**
   - Return specific permission errors to frontend
   - Guide users to run fix script

3. **Configuration Backup**
   - Automatically backup config before saving
   - Allow restoring previous configurations

4. **Validation**
   - Add startup check to verify config directory is writable
   - Log warning if permissions are incorrect

---

## Related Files

### Code Changes
- [lmrc-booking-system/src/models/tv-display-config.ts](../../lmrc-booking-system/src/models/tv-display-config.ts) - Default days changed to 7
- [lmrc-booking-system/src/services/tvDisplayConfigService.ts](../../lmrc-booking-system/src/services/tvDisplayConfigService.ts) - Config save logic

### Deployment Changes
- [systemd/lmrc-booking-viewer.service](../systemd/lmrc-booking-viewer.service) - Updated ReadWritePaths
- [scripts/fix-config-permissions.sh](../scripts/fix-config-permissions.sh) - Permission fix script

---

## Questions?

If the fix doesn't work or you encounter other issues:

1. **Check service logs**: `sudo journalctl -u lmrc-booking-viewer -n 100`
2. **Verify permissions**: `ls -la /opt/lmrc/booking-viewer/config`
3. **Test write access**: `sudo -u lmrc touch /opt/lmrc/booking-viewer/config/test.txt`
4. **Contact developer** with error messages and log output

---

**Document Version**: 1.0
**Last Updated**: 2025-11-23
**Author**: Claude AI
