# LMRC Deployment System - Validation Report

**Date**: 2025-10-28
**Version Reviewed**: 1.0.0
**Review Type**: Technical Code Review (No Physical Hardware Testing)

---

## ⚠️ IMPORTANT DISCLAIMER

**I CANNOT physically test this on a Raspberry Pi** as I don't have access to hardware. This review is based on:
- Code analysis and syntax checking
- Raspberry Pi OS Bookworm documentation
- Bash best practices
- Systemd service specifications
- Known compatibility issues

**This deployment has NOT been tested on actual hardware and WILL require testing before production use.**

---

## Critical Issues Found

### 🔴 CRITICAL #1: Date Command Not Evaluated in install.sh

**File**: `scripts/install.sh`
**Line**: 92
**Severity**: CRITICAL

**Problem**:
```bash
cat > /opt/lmrc/shared/config/device-config.json << 'EOF'
...
  "metadata": {
    "lastModified": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "lastSwitched": null
  }
}
EOF
```

The single quotes in `<< 'EOF'` prevent variable/command expansion. The JSON will literally contain the string `"$(date -u +%Y-%m-%dT%H:%M:%SZ)"` instead of an actual timestamp.

**Fix Required**:
```bash
# Option 1: Remove quotes from EOF delimiter
cat > /opt/lmrc/shared/config/device-config.json << EOF
...
  "metadata": {
    "lastModified": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "lastSwitched": null
  }
}
EOF

# Option 2: Set to null and update later
"lastModified": null,
```

**Impact**: Medium - JSON is still valid, but metadata will be incorrect. Won't break functionality.

---

### 🟡 MEDIUM #2: Chromium Package Name on Bookworm

**File**: `scripts/install.sh`
**Line**: 41
**Severity**: MEDIUM

**Problem**:
```bash
apt-get install -y jq chromium-browser curl git
```

On Raspberry Pi OS Bookworm (current version), the package may be `chromium` not `chromium-browser`.

**File**: `systemd/lmrc-kiosk.service`
**Line**: 12
**Same Issue**:
```ini
ExecStart=/usr/bin/chromium-browser \
```

**Fix Required**:
```bash
# In install.sh - Try both package names
apt-get install -y jq curl git
apt-get install -y chromium-browser || apt-get install -y chromium

# In lmrc-kiosk.service - Use flexible path
ExecStart=/bin/bash -c 'exec $(command -v chromium-browser || command -v chromium) --kiosk ...'
```

Or better, detect which is available during install and create a symlink.

**Impact**: HIGH - Without chromium, kiosk mode will not work. This is a deployment blocker.

---

### 🟡 MEDIUM #3: launcher.sh Uses grep Instead of jq

**File**: `scripts/launcher.sh`
**Lines**: 8-14
**Severity**: MEDIUM

**Problem**:
```bash
get_active_app() {
    if [ ! -f "$CONFIG_FILE" ]; then
        echo ""
        return
    fi
    grep -o '"activeApp"[[:space:]]*:[[:space:]]*"[^"]*"' "$CONFIG_FILE" | \
        cut -d'"' -f4
}
```

This uses `grep` to parse JSON instead of `jq`, which is less robust. If JSON formatting changes slightly, this will break.

**Fix Required**:
```bash
get_active_app() {
    if [ ! -f "$CONFIG_FILE" ]; then
        echo ""
        return
    fi
    jq -r '.activeApp // ""' "$CONFIG_FILE" 2>/dev/null || echo ""
}
```

**Impact**: Medium - Current code will work, but is fragile. Should use jq since it's already required.

---

## Minor Issues

### 🟢 MINOR #4: Missing Error Handling in Crontab Setup

**File**: `scripts/launcher.sh`
**Lines**: 35-38
**Severity**: MINOR

**Problem**:
Crontab command is complex and could fail silently.

**Recommendation**:
Add error checking:
```bash
if ! (crontab -u lmrc -l 2>/dev/null | grep -v noticeboard-scraper; \
     echo "5 * * * * cd /opt/lmrc/noticeboard && node scraper/noticeboard-scraper.js >> /opt/lmrc/shared/logs/scraper.log 2>&1") | \
    crontab -u lmrc - 2>&1; then
    echo "Warning: Failed to setup cron job"
fi
```

**Impact**: Low - Scraper won't run hourly, but app will still work.

---

### 🟢 MINOR #5: Hard-coded 5-second Sleep

**File**: `scripts/launcher.sh`
**Line**: 48
**Severity**: MINOR

**Problem**:
```bash
sleep 5
```

Fixed 5-second sleep may not be enough for slow Pi models or may be too long for fast ones.

**Recommendation**:
Use polling with timeout:
```bash
# Wait for app to be ready (max 30 seconds)
for i in {1..30}; do
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo "$ACTIVE_APP started successfully"
        exit 0
    fi
    sleep 1
done
echo "Application failed to start within 30 seconds"
exit 1
```

**Impact**: Low - Current code will work in most cases.

---

## Compatibility Checks

### ✅ Raspberry Pi OS Bookworm Compatibility

| Feature | Status | Notes |
|---------|--------|-------|
| **systemd** | ✅ Compatible | Bookworm uses systemd 252 |
| **Bash 5.x** | ✅ Compatible | Bookworm ships with Bash 5.2 |
| **jq** | ✅ Available | In official repos |
| **curl** | ✅ Available | Pre-installed |
| **git** | ✅ Available | In official repos |
| **Node.js 20** | ✅ Available | Via NodeSource setup script |
| **Chromium** | ⚠️ Check Required | Package name may differ |

### ✅ Raspberry Pi Model Compatibility

| Model | RAM | Status | Notes |
|-------|-----|--------|-------|
| **Pi 5 (8GB)** | 8GB | ✅ Recommended | Best performance |
| **Pi 5 (4GB)** | 4GB | ✅ Good | Will work well |
| **Pi 4 (8GB)** | 8GB | ✅ Good | Tested architecture |
| **Pi 4 (4GB)** | 4GB | ✅ Acceptable | Minimum for both apps |
| **Pi 4 (2GB)** | 2GB | ⚠️ Marginal | May struggle with Noticeboard |
| **Pi 3** | 1GB | ❌ Not Recommended | Insufficient RAM |

---

## Systemd Service Validation

### ✅ lmrc-launcher.service

```ini
[Unit]
Description=LMRC Application Launcher
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/opt/lmrc/shared/scripts/launcher.sh
RemainAfterExit=yes
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

**Status**: ✅ Valid syntax
**Issues**: None

### ✅ lmrc-booking-viewer.service

**Status**: ✅ Valid syntax with security hardening
**Issues**: None
**Security**: Excellent (NoNewPrivileges, PrivateTmp, ProtectSystem)

### ✅ lmrc-noticeboard.service

**Status**: ✅ Valid syntax with security hardening
**Issues**: None
**Security**: Excellent (NoNewPrivileges, PrivateTmp, ProtectSystem)

### ⚠️ lmrc-kiosk.service

**Status**: ⚠️ Valid but needs chromium path fix
**Issues**: See Critical Issue #2 above

---

## Security Review

### ✅ Good Security Practices

1. **User Isolation**: Dedicated `lmrc` user with limited privileges ✅
2. **File Permissions**: Credentials at 600, scripts at 755 ✅
3. **Systemd Hardening**: All services use security directives ✅
4. **No Sudo**: Normal operation doesn't require sudo ✅
5. **Read-only Protection**: ProtectSystem=strict prevents modification ✅

### ⚠️ Security Considerations

1. **Credentials in Plain Text**: `.env` file contains passwords in clear text
   - **Mitigation**: File permissions (600) restrict access
   - **Recommendation**: Consider using systemd credentials in future

2. **Network Exposure**: Applications listen on all interfaces (0.0.0.0)
   - **Mitigation**: Firewall should be configured
   - **Recommendation**: Bind to localhost only since kiosk is local

---

## Script Syntax Validation

All scripts validated for:
- ✅ Proper shebang (`#!/bin/bash`)
- ✅ Error handling (`set -e`)
- ✅ Variable quoting
- ✅ Function definitions
- ✅ Loop syntax
- ✅ Conditional syntax
- ✅ Heredoc syntax

**Result**: All scripts are syntactically valid Bash.

---

## Testing Requirements

### ⚠️ MUST TEST Before Production

Since this has not been tested on actual hardware, you MUST test:

#### Phase 1: Basic Installation (1 hour)
- [ ] Flash Raspberry Pi OS Bookworm to SD card
- [ ] Boot Pi and update system
- [ ] Clone deployment repository
- [ ] Run `install.sh` and verify completion
- [ ] Check all directories created
- [ ] Verify systemd services installed
- [ ] Run `test-installation.sh`

#### Phase 2: Application Testing (2 hours)
- [ ] Clone both applications to `/opt/lmrc`
- [ ] Install dependencies for both apps
- [ ] Build both applications
- [ ] Test each application manually (node start)
- [ ] Verify both apps respond on port 3000
- [ ] Check credentials configuration

#### Phase 3: Service Testing (1 hour)
- [ ] Run `select-app.sh` and choose Booking Viewer
- [ ] Reboot and verify auto-start
- [ ] Check kiosk mode displays correctly
- [ ] Run `health-check.sh` - all checks should pass
- [ ] Run `status.sh` - verify output
- [ ] Check logs: `journalctl -u lmrc-*`

#### Phase 4: Switching Testing (30 min)
- [ ] Run `switch-app.sh` to change to Noticeboard
- [ ] Reboot and verify new app starts
- [ ] Check cron job created for scraper
- [ ] Wait 1 hour and verify scraper runs
- [ ] Switch back to Booking Viewer

#### Phase 5: Edge Cases (1 hour)
- [ ] Simulate network failure during boot
- [ ] Simulate application crash (kill process)
- [ ] Test backup and restore
- [ ] Test update script
- [ ] Verify health check detects failures

**Total Testing Time**: ~5-6 hours

---

## Fixes Required Before Testing

### Required Changes

1. **Fix install.sh date command** (Critical #1)
2. **Fix chromium package detection** (Critical #2)
3. **Improve launcher.sh to use jq** (Medium #3)

### Recommended Changes

4. **Add error handling to crontab setup** (Minor #4)
5. **Improve startup health check** (Minor #5)

---

## Risk Assessment

### 🔴 HIGH RISK

**Chromium Package Issue**:
- Risk: Kiosk won't start on Bookworm
- Probability: Medium-High
- Impact: Deployment blocker
- Mitigation: Test immediately, have fallback plan

### 🟡 MEDIUM RISK

**Date Command Issue**:
- Risk: Incorrect metadata in JSON
- Probability: High
- Impact: Low (cosmetic)
- Mitigation: Simple fix required

**JSON Parsing Fragility**:
- Risk: launcher.sh fails if JSON formatting changes
- Probability: Low
- Impact: Service won't start
- Mitigation: Switch to jq

### 🟢 LOW RISK

**Performance on Pi 4 (4GB)**:
- Risk: Sluggish performance
- Probability: Low
- Impact: User experience
- Mitigation: Use Pi 5 or 4 with 8GB

---

## Recommended Test Plan

### Test Environment

**Hardware**: Raspberry Pi 4 or 5 (4GB+ RAM)
**OS**: Raspberry Pi OS (64-bit, Bookworm) - Fresh install
**Network**: Ethernet connection
**Monitor**: HDMI display for kiosk testing

### Test Procedure

1. **Apply Fixes** (30 min)
   - Fix the 3 required issues listed above
   - Commit changes to git

2. **Pilot Test** (6 hours)
   - Follow testing requirements above
   - Document all issues encountered
   - Create issue log with solutions

3. **Refinement** (2 hours)
   - Address any issues found
   - Update documentation
   - Re-test problem areas

4. **Production Deployment** (1 device)
   - Deploy to first production device
   - Monitor for 48 hours
   - Collect feedback

5. **Fleet Deployment** (remaining devices)
   - Create SD card master image
   - Deploy to all devices
   - Monitor for 1 week

---

## Validation Summary

### What Works (High Confidence)

✅ **Architecture**: Solid design, follows best practices
✅ **Systemd Services**: Properly configured with security hardening
✅ **Bash Scripts**: Syntactically correct, good error handling
✅ **Configuration System**: Well-structured JSON and environment files
✅ **Documentation**: Comprehensive and well-organized
✅ **Security**: Good isolation and permissions

### What Needs Testing (Unknown)

❓ **Chromium Compatibility**: Package name on Bookworm unknown
❓ **Performance**: Actual performance on Pi 4/5 unknown
❓ **Network Issues**: Behavior during network failures unknown
❓ **Recovery**: Automatic recovery from crashes unknown
❓ **Long-term Stability**: Multi-day/week operation unknown

### What Needs Fixing (Before Testing)

🔧 **install.sh**: Date command heredoc issue
🔧 **Chromium Detection**: Package name detection needed
🔧 **launcher.sh**: Should use jq for JSON parsing

---

## Conclusion

### Overall Assessment

**Code Quality**: ⭐⭐⭐⭐ (4/5)
- Well-written, follows best practices
- Good error handling
- Security-conscious
- Professional systemd configuration

**Readiness**: ⚠️ **NOT READY** for production

**Blockers**:
1. No physical hardware testing completed
2. Chromium package compatibility unknown
3. Minor bugs need fixing

### Recommendation

**DO NOT deploy to production without testing**.

**Next Steps**:
1. Apply the 3 critical/medium fixes documented above
2. Test on a single Raspberry Pi following the test plan
3. Address any issues discovered during testing
4. Document actual test results
5. Update this validation report with findings
6. Only then proceed to production deployment

### Confidence Level

- **Code works as designed**: 90% confident
- **Works on Raspberry Pi Bookworm**: 70% confident
- **Ready for production**: 0% confident (requires testing)

The deployment system is well-designed and well-implemented, but **absolutely requires testing on actual Raspberry Pi hardware before any production use**.

---

## Appendix: Testing Checklist

Print this checklist and use during physical testing:

```
LMRC Deployment System - Hardware Test Checklist

□ Pi model: _______________  RAM: _______
□ OS version: __________________________
□ Fresh install: Yes / No

Installation:
□ install.sh completed without errors
□ All directories created
□ lmrc user exists
□ Node.js 20+ installed
□ jq installed
□ Chromium installed (which package: _________)
□ Systemd services installed
□ test-installation.sh passes

Application Testing:
□ Booking Viewer builds successfully
□ Booking Viewer runs manually
□ Noticeboard builds successfully
□ Noticeboard runs manually
□ Both apps respond on port 3000

Service Testing:
□ select-app.sh works correctly
□ Booking Viewer auto-starts after reboot
□ Kiosk mode displays correctly
□ Browser shows application fullscreen
□ health-check.sh passes all checks
□ status.sh shows correct information

Switching:
□ switch-app.sh works correctly
□ Noticeboard starts after switch
□ Cron job created for scraper
□ Scraper runs successfully

Issues Encountered:
_____________________________________________
_____________________________________________
_____________________________________________

Tester: _____________  Date: __/__/____
```

---

**Validation Report Version**: 1.0
**Last Updated**: 2025-10-28
**Status**: Awaiting Hardware Testing
