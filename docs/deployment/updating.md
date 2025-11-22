# Updating LMRC on Production

**Last Updated**: 2025-11-22
**Status**: TODO - Needs content

---

## Overview

Guide for updating LMRC applications on production Raspberry Pi devices.

## Pre-Update Checklist

- [ ] Test changes locally
- [ ] Run full test suite (`npm test`)
- [ ] Verify test coverage maintained (>80%)
- [ ] Review changes with team
- [ ] Plan rollback strategy

## Update Process

TODO: Document standard update process

### 1. Backup Current Installation

TODO: Backup procedure

### 2. Update Code

TODO: Git pull or deployment method

### 3. Install Dependencies

```bash
npm install --production
```

### 4. Restart Services

```bash
sudo systemctl restart lmrc-<app-name>
```

### 5. Verify Update

```bash
/opt/lmrc/shared/scripts/health-check.sh
```

## Rollback Procedure

TODO: Document rollback steps

## Common Update Scenarios

### Updating Booking Viewer Only

TODO: Steps

### Updating Noticeboard Only

TODO: Steps

### Updating Shared Scripts

TODO: Steps

### Updating Configuration

TODO: Steps

## Remote Updates

TODO: Document remote update process (if applicable)

## Emergency Updates

TODO: Document emergency update procedure

---

**See Also**:
- [Production Setup](production-setup.md)
- [Troubleshooting](troubleshooting.md)
