# LMRC Hybrid Architecture Strategy
## Public-Facing Booking + Private Display System

**Document Type**: Architecture Deep-Dive (Revised)
**Context**: Addresses public internet access requirements for boat booking
**Last Updated**: 2025-10-30
**Status**: Recommended Architecture

---

## Critical Use Case Context

### UC1: Booking at the Shed
**Scenario:**
- Member arrives at boatshed
- Scans QR code on boat (e.g., "The Rose")
- QR code → `https://lmrc-bookings.netlify.app/?boat=8584`
- Member's phone uses **cellular data** (4G/5G)
- Member does NOT connect to boatshed WiFi
- Member selects session and books boat

**Requirements:**
- ✅ Accessible from public internet
- ✅ Works on cellular networks
- ✅ Fast page load (<2 seconds on mobile)
- ✅ HTTPS (required for modern browsers)
- ✅ No firewall/VPN configuration needed

### UC2: Booking at Home
**Scenario:**
- Member wants to book boat for tomorrow
- Accesses booking page from home (PC or mobile)
- Completes booking remotely

**Requirements:**
- ✅ Accessible from anywhere
- ✅ No special network access needed
- ✅ Same URL works everywhere

---

## Why Self-Hosting BoatBooking on Pi Won't Work

### Problems with Pi-Hosted BoatBooking

If we moved BoatBooking to the Raspberry Pi (my earlier recommendation), we'd need:

#### 1. **Public Internet Access to Pi**
```
Member's Phone (Cellular) → Internet → Club Router → Firewall → Pi
```

**Required:**
- Static public IP address (or dynamic DNS)
- Port forwarding configuration (router setup)
- Firewall rules to allow incoming traffic
- DMZ configuration (security risk)

**Challenges:**
- Most clubs don't have static IP ($20-50/month extra)
- Dynamic DNS is unreliable (IP changes, DNS propagates slowly)
- Requires networking expertise
- Security risk (exposing Pi to internet)
- Many clubs have restrictive firewalls (can't change easily)

#### 2. **SSL/HTTPS Certificate**
```
https://bookings.lmrc.com
```

**Required:**
- Domain name pointed at club's public IP
- SSL certificate (Let's Encrypt can work, but...)
- Automatic certificate renewal
- Certificate management on Pi

**Challenges:**
- Browsers require HTTPS for QR code redirects
- Let's Encrypt renewal might fail if IP changes
- Complexity for non-technical club admins

#### 3. **Always-On Reliability**
**Required:**
- Pi must be online 24/7
- Internet connection must be stable
- Power must never fail

**Challenges:**
- If Pi goes down, members can't book boats
- Club internet outage = no bookings possible
- Power outage = system down
- No redundancy

#### 4. **Security Hardening**
**Required:**
- DDoS protection
- Rate limiting
- Intrusion detection
- Regular security updates
- Firewall configuration
- SSH key management
- Attack surface monitoring

**Challenges:**
- Exposing Pi to internet is security risk
- Club doesn't have security expertise
- Attack vectors: SSH, web server, applications
- Could compromise club network

### **Conclusion: External Hosting is Correct Decision** ✅

Your choice to host BoatBooking on Netlify is architecturally sound because:
- ✅ Globally accessible (no networking config)
- ✅ HTTPS by default
- ✅ Free tier available
- ✅ 99.99% uptime SLA
- ✅ DDoS protection included
- ✅ Global CDN (fast everywhere)
- ✅ Zero security burden on club
- ✅ No dependency on club's Pi being online

---

## Revised Architecture: Hybrid Model

### System Boundaries

```
┌─────────────────────────────────────────────────────────────────┐
│                    PUBLIC INTERNET ZONE                          │
│                                                                  │
│  ┌────────────────────────────────────────────────────┐         │
│  │  BoatBooking Page (Netlify)                        │         │
│  │  https://lmrc-bookings.netlify.app                │         │
│  │                                                     │         │
│  │  - Accessible from anywhere                        │         │
│  │  - QR codes redirect here                          │         │
│  │  - Works on cellular networks                      │         │
│  └──────────────────┬─────────────────────────────────┘         │
│                     │                                            │
│                     │ Fetches config from:                       │
│                     ▼                                            │
│  ┌────────────────────────────────────────────────────┐         │
│  │  Config API (Cloud Service)                        │         │
│  │  https://config.rowing-platform.com/api/config     │         │
│  │                                                     │         │
│  │  GET /api/config/lmrc → Club profile + sessions    │         │
│  │  GET /api/boats/lmrc → Boat list (RevSport sync)   │         │
│  └──────────────────┬─────────────────────────────────┘         │
│                     │                                            │
└─────────────────────┼────────────────────────────────────────────┘
                      │
                      │ Syncs config
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│              CLUB LOCAL NETWORK (Private)                        │
│                                                                  │
│  ┌──────────────────────────────────────────────────┐           │
│  │  Raspberry Pi                                     │           │
│  │  (Only accessible on local WiFi)                  │           │
│  │                                                   │           │
│  │  ┌──────────────┐  ┌──────────────┐             │           │
│  │  │  Booking     │  │  Noticeboard │             │           │
│  │  │  Viewer      │  │              │             │           │
│  │  │  :3000       │  │  :3001       │             │           │
│  │  └──────────────┘  └──────────────┘             │           │
│  │                                                   │           │
│  │  ┌────────────────────────────────┐             │           │
│  │  │  Config Management UI          │             │           │
│  │  │  http://raspberrypi.local:8080 │             │           │
│  │  │                                 │             │           │
│  │  │  - Edit club profile            │             │           │
│  │  │  - Manage sessions              │             │           │
│  │  │  - Update branding              │             │           │
│  │  │  - Syncs to cloud API           │             │           │
│  │  └────────────────────────────────┘             │           │
│  └──────────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Zone | Purpose | Access |
|-----------|------|---------|--------|
| **BoatBooking Page** | Public | Member booking interface | Anywhere on internet |
| **Config API** | Public | Serves club configuration | Public read-only |
| **Booking Viewer** | Private | TV display of bookings | Local network only |
| **Noticeboard** | Private | TV display of club info | Local network only |
| **Config Management UI** | Private | Admin configuration | Local network only |

---

## Configuration Architecture

### Option 1: Lightweight Cloud Config API (Recommended)

**Architecture:**
```
┌──────────────────────────────────────────────────────────┐
│  Config API (Vercel/Netlify Functions - FREE)            │
│                                                           │
│  GET /api/config/:clubId                                 │
│  → Returns: club profile, sessions, branding            │
│                                                           │
│  GET /api/boats/:clubId                                  │
│  → Returns: boat list (synced from RevSport)            │
│                                                           │
│  POST /api/config/:clubId (Protected by API key)        │
│  → Updates configuration (called by Pi)                  │
└────────────────────┬─────────────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        │            │            │
        ▼            ▼            ▼
  ┌──────────┐  ┌──────────┐  ┌──────────┐
  │  Boat    │  │  Booking │  │  Notice  │
  │  Booking │  │  Viewer  │  │  board   │
  │ (Netlify)│  │   (Pi)   │  │   (Pi)   │
  └──────────┘  └──────────┘  └──────────┘
```

**Implementation: Serverless Function (Netlify/Vercel)**

```typescript
// netlify/functions/config.ts
// or vercel/api/config.ts

import { Handler } from '@netlify/functions';

// Store in environment variables or simple database
const configs = {
  'lmrc': {
    club: {
      id: 'lmrc',
      name: 'Lake Macquarie Rowing Club',
      shortName: 'LMRC',
      timezone: 'Australia/Sydney'
    },
    branding: {
      logoUrl: 'https://lmrc.com.au/logo.png',
      primaryColor: '#1e40af',
      secondaryColor: '#0ea5e9'
    },
    sessions: [
      {
        id: 'AM1',
        name: 'Early Morning',
        startTime: '06:30',
        endTime: '07:30',
        daysOfWeek: [1,2,3,4,5],
        color: '#60a5fa'
      },
      {
        id: 'AM2',
        name: 'Main Morning',
        startTime: '07:30',
        endTime: '08:30',
        daysOfWeek: [1,2,3,4,5],
        color: '#3b82f6'
      }
    ],
    revSport: {
      baseUrl: 'https://www.lakemacquarierowingclub.org.au'
      // NO credentials exposed in public API
    }
  }
};

export const handler: Handler = async (event) => {
  const clubId = event.path.split('/').pop();

  // GET request - public access
  if (event.httpMethod === 'GET') {
    const config = configs[clubId];

    if (!config) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Club not found' })
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*', // Allow from anywhere
        'Cache-Control': 'public, max-age=300' // Cache 5 minutes
      },
      body: JSON.stringify(config)
    };
  }

  // POST request - update config (protected)
  if (event.httpMethod === 'POST') {
    const apiKey = event.headers['x-api-key'];

    // Verify API key (Pi has this key)
    if (apiKey !== process.env.CONFIG_API_KEY) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Unauthorized' })
      };
    }

    const updatedConfig = JSON.parse(event.body);

    // Update config in database (or KV store)
    await updateConfig(clubId, updatedConfig);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
```

**Storage Options:**

1. **Environment Variables** (simplest, for 1-5 clubs)
   ```bash
   # .env
   LMRC_CONFIG='{"club": {...}, "sessions": [...]}'
   ```

2. **Netlify Blobs/Vercel KV** (free tier, good for 10-20 clubs)
   ```typescript
   import { getStore } from '@netlify/blobs';

   const store = getStore('configs');
   const config = await store.get(clubId);
   ```

3. **PlanetScale/Neon Database** (free tier, scalable)
   ```typescript
   const config = await db
     .select()
     .from('club_configs')
     .where('id', clubId)
     .first();
   ```

**Cost:** $0/month (Netlify/Vercel free tier)
**Limits:** 100K function invocations/month (plenty for 10-20 clubs)

---

### Config Sync Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. Club Admin Opens Config UI on Pi                    │
│     http://raspberrypi.local:8080/admin/config          │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  2. Admin Changes Session Times                         │
│     - AM1: 06:00-07:00 (changed from 06:30-07:30)       │
│     - Clicks "Save Changes"                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  3. Pi Config UI Saves Locally + Syncs to Cloud         │
│                                                          │
│  await saveLocalConfig(config);                         │
│  await syncToCloud(config);                             │
│                                                          │
│  POST https://config.rowing-platform.com/api/config/lmrc│
│  Headers: { "X-API-Key": "secret_key" }                │
│  Body: { ...updatedConfig }                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  4. Cloud API Updates Configuration                     │
│     - Validates schema                                   │
│     - Saves to database/storage                         │
│     - Returns success                                    │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│  5. Changes Reflected Immediately                       │
│                                                          │
│  - BoatBooking page (next load): Fetches new config     │
│  - Booking Viewer (Pi): Uses local config (instant)     │
│  - Noticeboard (Pi): Uses local config (instant)        │
└─────────────────────────────────────────────────────────┘
```

**Implementation on Pi:**

```typescript
// pi/config-ui/api/sync.ts
import { loadClubConfig, saveClubConfig } from '@lmrc/config';

app.post('/admin/config', async (req, res) => {
  const updatedConfig = req.body;

  try {
    // 1. Validate
    const validated = ClubConfigSchema.parse(updatedConfig);

    // 2. Save locally (instant for Pi apps)
    await saveClubConfig('/opt/lmrc/config/club-profile.json', validated);

    // 3. Sync to cloud (for BoatBooking)
    if (process.env.CLOUD_CONFIG_API) {
      await fetch(`${process.env.CLOUD_CONFIG_API}/api/config/${validated.club.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.CONFIG_API_KEY
        },
        body: JSON.stringify(validated)
      });
    }

    // 4. Broadcast to local apps (optional: trigger immediate refresh)
    await notifyLocalApps('config-updated');

    res.json({
      success: true,
      message: 'Configuration saved and synced to cloud'
    });

  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});
```

---

### Boat List Sync

**Challenge:** Boat list is generated by GitHub Actions daily (from RevSport scraping).

**Current Flow:**
```
GitHub Actions (2am AEST)
  → Scrape RevSport for boats
  → Generate boats.json
  → Commit to repo
  → Netlify auto-deploys
```

**Updated Flow (with Config API):**
```
GitHub Actions (2am AEST)
  → Scrape RevSport for boats
  → POST to Config API: /api/boats/lmrc
  → Config API stores boats.json
  → BoatBooking fetches from Config API
```

**Implementation:**

```yaml
# .github/workflows/update-boats.yml
name: Update Boats

on:
  schedule:
    - cron: '0 16 * * *'  # 2am AEST (UTC+10)
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Scrape RevSport for boats
        run: node scripts/scrape-boats.js

      - name: Upload to Config API
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -H "X-API-Key: ${{ secrets.CONFIG_API_KEY }}" \
            -d @boats.json \
            https://config.rowing-platform.com/api/boats/lmrc
```

---

## Multi-Club Architecture

### Per-Club Components

**For each club (e.g., LMRC, Sydney RC, Melbourne RC):**

| Component | Hosting | URL Pattern | Purpose |
|-----------|---------|-------------|---------|
| **BoatBooking** | Netlify | `lmrc-bookings.netlify.app` | Public booking page |
| **Raspberry Pi** | On-premises | Local network only | TV displays + config UI |
| **Config in API** | Shared cloud | `/api/config/lmrc` | Club-specific config |
| **Boats in API** | Shared cloud | `/api/boats/lmrc` | Club-specific boat list |

### Shared Infrastructure

**Single Config API** serves all clubs:
```
config.rowing-platform.com
  /api/config/lmrc    → LMRC configuration
  /api/config/src     → Sydney RC configuration
  /api/config/mrc     → Melbourne RC configuration
  /api/boats/lmrc     → LMRC boat list
  /api/boats/src      → Sydney RC boat list
```

**Cost:** $0 (free tier) or $5/month (if exceeds free tier)

---

## Deployment Models

### Model 1: Netlify Per Club (Current Approach)

**Setup:**
```
Each club gets:
  - Separate Netlify site: lmrc-bookings.netlify.app
  - Separate GitHub repo (fork of template)
  - Separate GitHub Actions for boat scraping
  - Separate Raspberry Pi for displays
```

**Pros:**
- ✅ Complete isolation between clubs
- ✅ Each club can customize independently
- ✅ No shared infrastructure risk

**Cons:**
- ❌ More repos to maintain
- ❌ Duplicate GitHub Actions runs
- ❌ Updates need to be applied to each repo

**Cost:** $0 (Netlify free tier per site)

---

### Model 2: Multi-Tenant BoatBooking (Scalable)

**Setup:**
```
Single BoatBooking application serves all clubs:
  - URL: bookings.rowing-platform.com/lmrc
  - Or subdomain: lmrc.rowing-platform.com
  - Detects club from URL
  - Fetches club-specific config from API
```

**Implementation:**

```typescript
// boat-booking-multi-tenant/index.html
<script>
  // Detect club from URL
  const clubId =
    window.location.pathname.split('/')[1] ||  // bookings.com/lmrc
    window.location.hostname.split('.')[0];     // lmrc.bookings.com

  // Fetch club config
  const config = await fetch(`https://config.rowing-platform.com/api/config/${clubId}`);
  const boats = await fetch(`https://config.rowing-platform.com/api/boats/${clubId}`);

  // Apply config
  applyClubConfig(config);
  loadBoats(boats);
</script>
```

**Pros:**
- ✅ Single codebase for all clubs
- ✅ Updates apply to all clubs instantly
- ✅ Easier to maintain

**Cons:**
- ❌ All clubs share same deployment
- ❌ Bug affects all clubs
- ❌ Need subdomain DNS setup

**Cost:** $0 (single Netlify site)

**Recommendation:** Start with Model 1, migrate to Model 2 at 10+ clubs.

---

## Session Time Management in Hybrid Model

### Configuration Flow

```
1. Club Admin (on Pi local network)
   → Opens http://raspberrypi.local:8080/admin/sessions
   → Adds new session: "Saturday Long Row" 07:00-09:00
   → Saves changes

2. Pi saves locally + syncs to cloud
   → Local: /opt/lmrc/config/club-profile.json
   → Cloud: POST to config API

3. Changes reflected across all apps:
   → BoatBooking (cloud): Fetches config on next page load
   → Booking Viewer (Pi): Uses local config (instant)
   → Noticeboard (Pi): Uses local config (instant)
```

### Session Management UI (Same as Before)

No changes needed - the UI in CONFIGURATION_STRATEGY.md still applies:
- Web-based session editor
- Day-of-week selector
- Seasonal sessions
- Color coding
- Priority ordering

**Only difference:** After saving, config is synced to cloud API (in addition to local storage).

---

## Recommended Implementation Plan

### Phase 1: Cloud Config API (2 weeks)

**Week 1: Build Config API**
- [ ] Create Netlify/Vercel function for config API
- [ ] Implement GET /api/config/:clubId endpoint
- [ ] Implement GET /api/boats/:clubId endpoint
- [ ] Test with LMRC configuration
- [ ] Deploy to production

**Week 2: Integrate with Apps**
- [ ] Update BoatBooking to fetch from config API
- [ ] Update Booking Viewer to use shared config library
- [ ] Update Noticeboard to use shared config library
- [ ] Build config sync from Pi to cloud API
- [ ] Test end-to-end

**Deliverable:** BoatBooking fetches live config, changes on Pi sync to cloud

---

### Phase 2: Session Management (1-2 weeks)

**Week 1: Session Schema + UI**
- [ ] Implement flexible session schema
- [ ] Build session management UI on Pi
- [ ] Integrate with config sync
- [ ] Test with various session configurations

**Week 2: Integration Across Apps**
- [ ] Update BoatBooking dropdown to use session API
- [ ] Update Booking Viewer validation to use sessions
- [ ] Add seasonal session support
- [ ] Documentation and testing

**Deliverable:** Club can manage sessions via web UI, changes reflect everywhere

---

### Phase 3: Multi-Club Pilot (3-4 weeks)

**Weeks 1-2: Infrastructure**
- [ ] Set up config API with multi-club support
- [ ] Create club provisioning process
- [ ] Build second club's BoatBooking site (fork or multi-tenant)
- [ ] Set up second club's Pi

**Weeks 3-4: Pilot Testing**
- [ ] Deploy to 2-3 pilot clubs
- [ ] Monitor config sync
- [ ] Gather feedback
- [ ] Iterate on pain points

**Deliverable:** 3 clubs running successfully with independent configurations

---

## Cost Analysis

### Single Club (Current + Improvements)

| Component | Hosting | Cost/month |
|-----------|---------|------------|
| BoatBooking | Netlify | $0 |
| Config API | Netlify Functions | $0 |
| Boat Scraping | GitHub Actions | $0 |
| Raspberry Pi | On-premises | ~$1 (power) |
| **Total** | | **$1/month** |

### Multi-Club (10 Clubs)

**Option A: Netlify Per Club**

| Component | Cost/month |
|-----------|------------|
| 10x BoatBooking sites (Netlify) | $0 |
| Shared Config API (Netlify Functions) | $0 |
| GitHub Actions (10 repos) | $0 |
| 10x Raspberry Pis (power) | $10 |
| **Total** | **$10/month = $1/club** |

**Option B: Multi-Tenant + Shared VPS**

| Component | Cost/month |
|-----------|------------|
| Multi-tenant BoatBooking (Netlify) | $0 |
| Config API (Hetzner VPS) | $4.50 |
| Pi displays (10 clubs) | $10 |
| **Total** | **$14.50/month = $1.45/club** |

**Recommendation:** Option A for <20 clubs, Option B for 20+ clubs

---

## Security Considerations

### Public Components

**BoatBooking Page:**
- ✅ Read-only access to public data
- ✅ No credentials exposed
- ✅ HTTPS enforced
- ✅ DDoS protection (Netlify)
- ✅ Rate limiting (Netlify built-in)

**Config API:**
- ✅ Read endpoints public (no sensitive data)
- ✅ Write endpoints protected by API key
- ✅ CORS configured for specific origins
- ✅ Request validation and sanitization

### Private Components

**Raspberry Pi:**
- ✅ Not exposed to internet
- ✅ Local network only
- ✅ Config UI accessible only via local WiFi
- ✅ Credentials stored locally (encrypted)
- ✅ API key for cloud sync (environment variable)

---

## Summary & Recommendations

### Your Original Decision was Correct ✅

Hosting BoatBooking on Netlify (externally) is the **right architectural choice** because:

1. **Public Access Required:** Members need to access from anywhere (QR codes, home)
2. **No Networking Complexity:** Works instantly without firewall/DNS configuration
3. **High Availability:** Netlify's 99.99% uptime > Pi's reliability
4. **Security:** No need to expose Pi to internet
5. **Performance:** Global CDN ensures fast loads on mobile
6. **Cost:** $0 on Netlify free tier

### Recommended Hybrid Architecture

**Public (Cloud):**
- BoatBooking page (Netlify) - accessible from anywhere
- Config API (Netlify Functions or small VPS) - serves configuration

**Private (Pi):**
- Booking Viewer - local TV display
- Noticeboard - local TV display
- Config Management UI - admin interface

**Configuration Flow:**
- Admin edits config on Pi (local network)
- Config saved locally (instant for Pi apps)
- Config synced to cloud (BoatBooking fetches it)
- All apps stay in sync

### Next Steps

1. **Implement lightweight Config API** (Netlify Functions - 2 weeks)
2. **Build session management UI** (on Pi - 1 week)
3. **Test with LMRC** (1 week)
4. **Deploy to 2-3 pilot clubs** (3-4 weeks)

**Total Timeline:** 7-8 weeks to multi-club ready
**Total Cost:** $0 for <10 clubs (free tiers)

Would you like me to start with the Config API implementation plan?
