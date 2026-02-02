# Netlify to Render Migration Guide

**Last Updated**: 2026-02-02
**Status**: Ready for execution

---

## Overview

This guide documents the migration of the LMRC boat booking page from Netlify to Render Static Site hosting.

| Aspect | Before | After |
|--------|--------|-------|
| Hosting | Netlify | Render Static Site |
| Cost | $9/month | Free |
| Domain | lakemacrowing.au | lakemacrowing.au (unchanged) |
| Deploy trigger | Netlify build hook | Render deploy hook |
| Source repo | BoatBooking (separate) | Monorepo (apps/booking-page) |

---

## Prerequisites

- [ ] Access to Render dashboard (https://dashboard.render.com)
- [ ] Access to GitHub repository secrets
- [ ] Access to domain DNS (for lakemacrowing.au)
- [ ] Access to Netlify dashboard (for cancellation)

---

## Migration Steps

### Step 1: Create Render Static Site Service

The `render.yaml` has been updated to include the static site. When you push to main, Render will auto-detect and offer to create the service.

**Manual creation (if needed):**
1. Go to https://dashboard.render.com
2. Click "New" → "Static Site"
3. Connect the LMRC monorepo (github.com/UndefinedRest/LMRC or similar)
4. Configure:
   - **Name**: `lmrc-booking-page`
   - **Build Command**: (leave empty)
   - **Publish Directory**: `apps/booking-page`
5. Click "Create Static Site"

---

### Step 2: Get Render Deploy Hook

1. In Render dashboard, go to the `lmrc-booking-page` service
2. Navigate to **Settings** → **Build & Deploy**
3. Scroll to **Deploy Hook**
4. Click "Create Deploy Hook"
5. Copy the URL (format: `https://api.render.com/deploy/srv-xxx...`)

---

### Step 3: Add GitHub Secrets

Add/update these secrets in the **monorepo** GitHub settings:

| Secret Name | Value | Notes |
|-------------|-------|-------|
| `RENDER_DEPLOY_HOOK_BOOKING_PAGE` | Deploy hook URL from Step 2 | New |
| `REVSPORT_USERNAME` | RevSport login username | Copy from BoatBooking repo |
| `REVSPORT_PASSWORD` | RevSport login password | Copy from BoatBooking repo |

**GitHub secrets location**:
https://github.com/[org]/[monorepo]/settings/secrets/actions

---

### Step 4: Test Deployment

1. Push the changes to main:
   ```bash
   git add render.yaml .github/workflows/update-boats.yml docs/
   git commit -m "feat: Add Render static site for booking page migration"
   git push
   ```

2. Verify Render creates the static site service

3. Manually trigger the GitHub Action:
   - Go to Actions → "Update Boat List from RevSport"
   - Click "Run workflow"
   - Verify it completes successfully

4. Check the Render static site URL works (e.g., `https://lmrc-booking-page.onrender.com`)

---

### Step 5: Configure Custom Domain

1. In Render dashboard, go to `lmrc-booking-page` → **Settings** → **Custom Domains**
2. Click "Add Custom Domain"
3. Enter: `lakemacrowing.au`
4. Render will provide DNS configuration:
   - For apex domain: **A record** pointing to Render's IP
   - Or: **CNAME** for `www` subdomain

**Note the DNS values before proceeding to Step 6.**

---

### Step 6: DNS Cutover

**Recommended timing**: Early morning (low traffic)

1. Log into your DNS provider
2. Update DNS records for `lakemacrowing.au`:

   **Option A - CNAME (if supported for apex):**
   ```
   lakemacrowing.au  CNAME  [render-provided-target].onrender.com
   ```

   **Option B - A Record:**
   ```
   lakemacrowing.au  A  [render-provided-IP]
   ```

3. Wait for DNS propagation (5-30 minutes typically)

4. Verify:
   ```bash
   # Check DNS
   nslookup lakemacrowing.au

   # Check site loads
   curl -I https://lakemacrowing.au/book-a-boat.html
   ```

---

### Step 7: Monitor

1. **Immediately after cutover:**
   - Test `https://lakemacrowing.au/book-a-boat.html?boat_id=8584`
   - Verify boats.json loads correctly
   - Check damaged boat warnings display

2. **Next morning (after 2am AEST):**
   - Check GitHub Actions ran successfully
   - Verify Render deploy was triggered
   - Confirm boats.json was updated

3. **Keep Netlify active for 48 hours** as fallback

---

### Step 8: Cleanup

After 48 hours of stable operation:

1. **Cancel Netlify subscription:**
   - Go to https://app.netlify.com
   - Site settings → Danger zone → Delete site
   - Or downgrade to free tier first

2. **Archive BoatBooking repo:**
   - Go to repo settings → Archive repository
   - Or add README noting migration to monorepo

3. **Update documentation:**
   - Update docs/architecture/overview.md
   - Remove references to Netlify

---

## Rollback Plan

If issues occur after DNS cutover:

1. **Immediate**: Revert DNS to point to Netlify
   - Netlify site is still live (no changes made there)
   - DNS change takes 5-30 minutes

2. **Investigate**: Check Render logs and GitHub Actions

3. **Fix forward or rollback**: Decide based on issue severity

---

## Post-Migration Architecture

```
GitHub Monorepo (LMRC)
    │
    ├── .github/workflows/update-boats.yml
    │       │
    │       ├─ Runs daily at 2am AEST
    │       ├─ Scrapes RevSport for boat data
    │       ├─ Updates apps/booking-page/boats.json
    │       └─ Triggers Render deploy hook
    │
    └── apps/booking-page/
            │
            ├── book-a-boat.html
            ├── index.html
            └── boats.json
                    │
                    └─────► Render Static Site
                            │
                            └─► https://lakemacrowing.au
```

---

## GitHub Secrets Summary

**Monorepo secrets needed:**
| Secret | Purpose |
|--------|---------|
| `RENDER_DEPLOY_HOOK_BOOKING_PAGE` | Trigger Render deploy |
| `REVSPORT_USERNAME` | RevSport scraping auth |
| `REVSPORT_PASSWORD` | RevSport scraping auth |

**BoatBooking repo secrets (can be removed after migration):**
| Secret | Status |
|--------|--------|
| `NETLIFY_BUILD_HOOK` | Remove after migration |
| `REVSPORT_USERNAME` | Keep or remove |
| `REVSPORT_PASSWORD` | Keep or remove |

---

## Verification Checklist

- [ ] Render static site created and deploying
- [ ] Deploy hook configured and working
- [ ] GitHub secrets added to monorepo
- [ ] Manual workflow run succeeds
- [ ] Custom domain configured in Render
- [ ] DNS updated to point to Render
- [ ] Site loads correctly at lakemacrowing.au
- [ ] Query parameters work (`?boat_id=8584`)
- [ ] First automated update succeeds (2am)
- [ ] 48 hours stable operation
- [ ] Netlify cancelled/archived
- [ ] BoatBooking repo archived

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-02 | Initial migration guide |
