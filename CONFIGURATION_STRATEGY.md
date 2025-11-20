# LMRC Configuration Strategy
## Unified Configuration Across Hybrid Deployment Architecture

**Document Type**: Technical Architecture Deep-Dive
**Focus Areas**: Configuration Management, External Hosting, Session Time Management
**Last Updated**: 2025-10-30
**Status**: Architecture Proposal

---

## Table of Contents

1. [Unified Configuration Across Netlify + Pi](#unified-configuration-across-netlify--pi)
2. [External Hosting Architecture Options](#external-hosting-architecture-options)
3. [Session Time Management](#session-time-management)
4. [Recommended Approach](#recommended-approach)
5. [Implementation Roadmap](#implementation-roadmap)

---

## Unified Configuration Across Netlify + Pi

### The Challenge

**Current Architecture:**
```
┌─────────────────┐         ┌─────────────────┐
│  Raspberry Pi   │         │    Netlify      │
│                 │         │                 │
│ Booking Viewer  │         │  Boat Booking   │
│ Noticeboard     │         │  (Static HTML)  │
│                 │         │                 │
│ Config: .env    │         │ Config: ???     │
│         JSON    │         │                 │
└─────────────────┘         └─────────────────┘
      Editable                    Immutable
    (via SSH/UI)                (rebuild needed)
```

**Problems:**
1. BoatBooking is static HTML - can't read from database or API at runtime
2. Netlify deployment is separate from Pi apps - different release cycle
3. Configuration changes require either:
   - Rebuild + redeploy static site (complex)
   - Hardcode config (not club-agnostic)
4. Session times need to be synchronized across all three apps
5. Club branding (logo, colors, name) duplicated

---

### Solution 1: Configuration API with Client-Side Fetch (Recommended for Hybrid)

**Concept:** Static HTML remains static, but fetches configuration from API at page load.

#### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Netlify CDN (Static)                      │
│                                                              │
│  ┌────────────────────────────────────────────┐            │
│  │  boat-booking.html (Static)                │            │
│  │                                             │            │
│  │  <script>                                   │            │
│  │    // Fetch config at page load            │            │
│  │    const config = await fetch(             │            │
│  │      'https://config.lmrc.io/api/config'   │            │
│  │    );                                       │            │
│  │    applyConfig(config);                    │            │
│  │  </script>                                  │            │
│  └────────────────────────────────────────────┘            │
└──────────────────────────┬───────────────────────────────────┘
                           │ HTTP GET
                           │
                           ▼
┌─────────────────────────────────────────────────────────────┐
│         Configuration Service (Pi or Cloud)                  │
│                                                              │
│  GET /api/config/:clubId                                    │
│  → Returns club profile, session times, branding            │
│                                                              │
│  ┌──────────────────────────────────────┐                  │
│  │ {                                     │                  │
│  │   "clubName": "LMRC",                │                  │
│  │   "logo": "https://...",             │                  │
│  │   "sessions": [                       │                  │
│  │     {"id": "AM1", "start": "06:30",  │                  │
│  │      "end": "07:30", "name": "Early"},│                  │
│  │     {"id": "AM2", "start": "07:30",  │                  │
│  │      "end": "08:30", "name": "Main"}  │                  │
│  │   ],                                  │                  │
│  │   "branding": { ... }                 │                  │
│  │ }                                     │                  │
│  └──────────────────────────────────────┘                  │
└─────────────────────────────────────────────────────────────┘
                           ▲
                           │ Also used by
                           │
┌──────────────────────────┴──────────────────────────────────┐
│                    Raspberry Pi Apps                         │
│                                                              │
│  Booking Viewer + Noticeboard                               │
│  (Use same config API)                                      │
└─────────────────────────────────────────────────────────────┘
```

#### Implementation

**1. Configuration Service** (runs on Pi or cloud)

```typescript
// config-service.ts
import express from 'express';
import cors from 'cors';

const app = express();

// Enable CORS for Netlify domain
app.use(cors({
  origin: ['https://boat-booking.netlify.app', 'https://lmrc-bookings.com'],
  methods: ['GET'],
  credentials: false
}));

// Public configuration endpoint
app.get('/api/config/:clubId', async (req, res) => {
  const { clubId } = req.params;

  // Load from database or file
  const config = await loadClubConfig(clubId);

  // Return PUBLIC configuration only (no credentials!)
  res.json({
    club: {
      id: config.id,
      name: config.name,
      shortName: config.shortName,
      timezone: config.timezone,
      locale: config.locale
    },
    branding: {
      logoUrl: config.branding.logoUrl,
      primaryColor: config.branding.primaryColor,
      secondaryColor: config.branding.secondaryColor,
      customCSS: config.branding.customCSS
    },
    sessions: config.sessions.map(s => ({
      id: s.id,
      name: s.name,
      startTime: s.startTime,
      endTime: s.endTime,
      daysOfWeek: s.daysOfWeek, // e.g., [1,2,3,4,5] for weekdays
      color: s.color
    })),
    revSport: {
      baseUrl: config.revSport.baseUrl,
      // NO credentials exposed
    },
    features: {
      weatherEnabled: config.features?.weatherEnabled ?? true,
      sponsorsEnabled: config.features?.sponsorsEnabled ?? true
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(3001, () => {
  console.log('Config service running on :3001');
});
```

**2. BoatBooking Static Site** (modified to fetch config)

```html
<!-- boat-booking.html -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title id="page-title">Boat Booking</title>
  <style id="dynamic-styles">
    /* Styles injected after config load */
  </style>
</head>
<body>
  <div id="loading">Loading configuration...</div>

  <div id="app" style="display:none;">
    <img id="club-logo" src="" alt="Club Logo">
    <h1 id="club-name">Loading...</h1>

    <form id="booking-form">
      <label>Session:</label>
      <select id="session-select">
        <!-- Options populated from config -->
      </select>

      <label>Boat:</label>
      <select id="boat-select">
        <!-- Loaded from boats.json as before -->
      </select>

      <button type="submit">Book Boat</button>
    </form>
  </div>

  <script>
    // Configuration loading
    const CONFIG_API = 'https://config.lmrc.io/api/config/lmrc'; // Or from query param

    async function loadConfiguration() {
      try {
        const response = await fetch(CONFIG_API);
        if (!response.ok) {
          throw new Error('Config fetch failed');
        }

        const config = await response.json();
        applyConfiguration(config);

        // Hide loading, show app
        document.getElementById('loading').style.display = 'none';
        document.getElementById('app').style.display = 'block';

      } catch (error) {
        console.error('Failed to load config:', error);
        // Show error or use fallback defaults
        applyDefaultConfiguration();
      }
    }

    function applyConfiguration(config) {
      // Apply branding
      document.title = `${config.club.name} - Boat Booking`;
      document.getElementById('page-title').textContent =
        `${config.club.name} - Boat Booking`;
      document.getElementById('club-name').textContent = config.club.name;
      document.getElementById('club-logo').src = config.branding.logoUrl;

      // Apply colors via CSS variables
      document.documentElement.style.setProperty(
        '--primary-color',
        config.branding.primaryColor
      );
      document.documentElement.style.setProperty(
        '--secondary-color',
        config.branding.secondaryColor
      );

      // Populate session options
      const sessionSelect = document.getElementById('session-select');
      sessionSelect.innerHTML = config.sessions
        .map(session => `
          <option value="${session.id}">
            ${session.name} (${session.startTime} - ${session.endTime})
          </option>
        `)
        .join('');

      // Store config globally for booking submission
      window.CLUB_CONFIG = config;
    }

    function applyDefaultConfiguration() {
      // Fallback if config API fails
      const defaults = {
        club: { name: 'Rowing Club' },
        branding: {
          logoUrl: '/default-logo.png',
          primaryColor: '#1e40af',
          secondaryColor: '#0ea5e9'
        },
        sessions: [
          { id: 'AM1', name: 'Morning 1', startTime: '06:30', endTime: '07:30' },
          { id: 'AM2', name: 'Morning 2', startTime: '07:30', endTime: '08:30' }
        ]
      };
      applyConfiguration(defaults);
    }

    // Load on page ready
    document.addEventListener('DOMContentLoaded', loadConfiguration);

    // Form submission (redirects to RevSport as before, but with config-aware times)
    document.getElementById('booking-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const sessionId = document.getElementById('session-select').value;
      const session = window.CLUB_CONFIG.sessions.find(s => s.id === sessionId);

      // Build RevSport booking URL with session times
      const revSportUrl = buildBookingUrl(session);
      window.location.href = revSportUrl;
    });
  </script>
</body>
</html>
```

#### Deployment Options for Config Service

**Option A: Run on Raspberry Pi** (No extra cost)
```bash
# On the Pi
cd /opt/lmrc/config-service
npm install
npm start

# Expose via ngrok or similar for external access
ngrok http 3001
# Or use Cloudflare Tunnel (free)
cloudflared tunnel --url http://localhost:3001
```

**Pros:**
- No additional hosting cost
- Config changes immediate (same device)
- Simple architecture

**Cons:**
- Pi must be online for BoatBooking to work
- Requires public URL (ngrok/Cloudflare Tunnel)
- Single point of failure

**Option B: Run on Cloud** (Cheap)
```yaml
# Railway.app, Render.com, or Fly.io
# ~$0-5/month
services:
  config-api:
    build: .
    port: 3001
    env:
      - CONFIG_PATH=/data/config.json
```

**Pros:**
- Always available
- Independent of Pi status
- Can serve multiple clubs

**Cons:**
- Small hosting cost (~$5/mo)
- Need to sync config between Pi and cloud
- Slightly more complex

**Recommended:** Start with Option A (Pi + Cloudflare Tunnel), migrate to Option B if reliability becomes issue.

#### Configuration Sync Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                  Configuration Flow                          │
└─────────────────────────────────────────────────────────────┘

1. User edits config via Web UI (on Pi)
   ↓
2. Config saved to local file + database
   ↓
3. POST to cloud config service (if using cloud)
   ↓
4. All apps fetch updated config on next request/poll
```

**Implementation:**
```typescript
// On Pi - Config management UI
app.post('/admin/config', async (req, res) => {
  const updatedConfig = req.body;

  // Validate
  const validated = ConfigSchema.parse(updatedConfig);

  // Save locally
  await saveConfig('/opt/lmrc/config/club-profile.json', validated);

  // If cloud config service exists, sync
  if (process.env.CLOUD_CONFIG_API) {
    await syncToCloud(validated);
  }

  // Broadcast update to all local apps
  broadcastConfigUpdate(validated);

  res.json({ success: true });
});
```

---

### Solution 2: Self-Host BoatBooking on Pi (Simpler)

**Concept:** Move BoatBooking from Netlify to Raspberry Pi alongside other apps.

#### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Raspberry Pi                              │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Booking     │  │  Boat        │  │  Noticeboard │     │
│  │  Viewer      │  │  Booking     │  │              │     │
│  │  :3000       │  │  :3002       │  │  :3001       │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                 │                 │               │
│         └─────────────────┴─────────────────┘               │
│                           │                                 │
│                  ┌────────▼────────┐                        │
│                  │  Shared Config  │                        │
│                  │  club-profile.  │                        │
│                  │  json           │                        │
│                  └─────────────────┘                        │
└─────────────────────────────────────────────────────────────┘
```

#### Implementation

**Convert BoatBooking to Express App:**

```typescript
// boat-booking/server.ts
import express from 'express';
import { loadClubConfig } from '@lmrc/config';

const app = express();

// Load shared configuration
const config = await loadClubConfig();

// Serve static files
app.use(express.static('public'));

// Server-side rendered index
app.get('/', async (req, res) => {
  const template = await loadTemplate('index.html');

  // Inject configuration
  const rendered = template
    .replace('{{CLUB_NAME}}', config.club.name)
    .replace('{{LOGO_URL}}', config.branding.logoUrl)
    .replace('{{PRIMARY_COLOR}}', config.branding.primaryColor)
    .replace('{{SESSIONS}}', JSON.stringify(config.sessions));

  res.send(rendered);
});

// API endpoint for boats (generated from RevSport as before)
app.get('/api/boats', async (req, res) => {
  const boats = await loadBoats();
  res.json(boats);
});

app.listen(3002);
```

**Updated pi-deployment scripts:**
```bash
# scripts/select-app.sh - Add third option
echo "  [1] Booking Viewer"
echo "  [2] Digital Noticeboard"
echo "  [3] Boat Booking Page"  # NEW
echo "  [4] All Applications"    # NEW - Run all three
```

**Pros:**
- All apps use same config system (simple!)
- No dependency on Netlify
- No CORS issues
- Consistent deployment process
- Configuration changes immediate

**Cons:**
- Lose Netlify's free hosting
- Lose global CDN (but probably not needed for club-internal use)
- Pi must be online for members to book (already required for other apps)
- Slightly higher Pi resource usage (minimal - static files)

**Cost Impact:** $0 (saves Netlify hosting if paying)

**Recommended for:** Single-club deployment or clubs comfortable with Pi-only hosting.

---

### Solution 3: Build-Time Configuration (No Runtime Dependency)

**Concept:** Generate club-specific static sites during build process.

#### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│               GitHub Actions / Build Server                  │
│                                                              │
│  1. Load club configuration (from repo or API)              │
│  2. Generate static HTML with config baked in               │
│  3. Deploy to Netlify                                       │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Netlify    │
                    │              │
                    │  lmrc.html   │  ← Club-specific
                    │  src.html    │  ← Different club
                    └──────────────┘
```

#### Implementation

```javascript
// build.js
const fs = require('fs');
const path = require('path');

// Load club configuration
const clubConfig = JSON.parse(
  fs.readFileSync('config/club-config.json', 'utf8')
);

// Load template
const template = fs.readFileSync('templates/boat-booking.html', 'utf8');

// Replace placeholders
const rendered = template
  .replace(/\{\{CLUB_NAME\}\}/g, clubConfig.club.name)
  .replace(/\{\{LOGO_URL\}\}/g, clubConfig.branding.logoUrl)
  .replace(/\{\{PRIMARY_COLOR\}\}/g, clubConfig.branding.primaryColor)
  .replace(/\{\{SESSIONS_JSON\}\}/g, JSON.stringify(clubConfig.sessions));

// Generate CSS with club colors
const css = `
:root {
  --primary-color: ${clubConfig.branding.primaryColor};
  --secondary-color: ${clubConfig.branding.secondaryColor};
}
`;

// Write output files
fs.writeFileSync('dist/index.html', rendered);
fs.writeFileSync('dist/styles.css', css);

console.log('✓ Built club-specific static site');
```

**GitHub Actions Workflow:**
```yaml
# .github/workflows/build-boat-booking.yml
name: Build & Deploy Boat Booking

on:
  push:
    paths:
      - 'config/club-config.json'
      - 'templates/**'
  workflow_dispatch:  # Manual trigger

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build club-specific site
        run: node build.js

      - name: Deploy to Netlify
        uses: netlify/actions/cli@master
        with:
          args: deploy --prod --dir=dist
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_TOKEN }}
```

**Triggering Rebuilds:**

Option A: **Manual** - User edits config in repo, pushes to GitHub
```bash
cd boat-booking
nano config/club-config.json
git commit -am "Update session times"
git push  # Triggers rebuild
```

Option B: **API-Triggered** - Config UI on Pi triggers rebuild
```typescript
// On Pi config UI
app.post('/admin/config', async (req, res) => {
  const config = req.body;

  // Save locally
  await saveConfig(config);

  // Trigger Netlify rebuild via webhook
  await fetch('https://api.netlify.com/build_hooks/YOUR_HOOK_ID', {
    method: 'POST'
  });

  res.json({
    success: true,
    message: 'Config saved. Rebuild triggered (3-5 min).'
  });
});
```

**Pros:**
- No runtime dependency (works offline if Netlify is up)
- Fast page loads (no API calls)
- Free Netlify hosting
- Simple deployment

**Cons:**
- Configuration changes require rebuild (3-5 minute delay)
- More complex CI/CD
- Separate deployment pipeline from Pi apps
- Can't have real-time config updates

**Recommended for:** Multi-club deployments where each club gets their own Netlify site.

---

### Comparison Matrix

| Aspect | Config API (Sol 1) | Self-Host Pi (Sol 2) | Build-Time (Sol 3) |
|--------|-------------------|---------------------|-------------------|
| **Configuration Updates** | Immediate | Immediate | 3-5 min delay |
| **Extra Hosting Cost** | $0-5/mo | $0 | $0 |
| **Complexity** | Medium | Low | High |
| **Runtime Dependencies** | Config API must be up | Pi must be up | None (static) |
| **CORS Issues** | Potential | None | None |
| **Best For** | Hybrid cloud/Pi | Single Pi deployment | Multi-club SaaS |
| **Multi-Club Ready** | Yes (one API) | No (one Pi per club) | Yes (site per club) |

---

## External Hosting Architecture Options

### The Opportunity

Host the entire LMRC platform in the cloud instead of on Raspberry Pi hardware.

**Benefits:**
- No hardware shipping/support
- Access from anywhere (not just boatshed)
- Easier multi-club deployment
- Centralized updates
- Better uptime guarantees

**Challenges:**
- Ongoing hosting costs
- RevSport API rate limiting (shared IP)
- Puppeteer resource usage (Noticeboard scraping)
- Need multi-tenancy architecture

---

### Architecture 1: Single VPS (Cheapest)

**Concept:** Run all applications on one virtual private server.

#### Tech Stack

```
┌─────────────────────────────────────────────────────────────┐
│         VPS (Hetzner CAX11 - €4.15/mo = ~$4.50/mo)         │
│                                                              │
│  ┌─────────────────────────────────────────────────┐       │
│  │  Nginx (Reverse Proxy + SSL)                    │       │
│  └───────┬──────────────┬─────────────┬────────────┘       │
│          │              │             │                     │
│  ┌───────▼──────┐ ┌────▼──────┐ ┌───▼──────────┐          │
│  │  Booking     │ │  Boat     │ │  Noticeboard │          │
│  │  Viewer      │ │  Booking  │ │              │          │
│  │  (Node.js)   │ │ (Node.js) │ │  (Node.js +  │          │
│  │  :3000       │ │  :3002    │ │   Puppeteer) │          │
│  └──────────────┘ └───────────┘ │  :3001       │          │
│                                  └──────────────┘          │
│  ┌─────────────────────────────────────────────┐           │
│  │  PostgreSQL (Configuration + Club Data)     │           │
│  └─────────────────────────────────────────────┘           │
│                                                              │
│  ┌─────────────────────────────────────────────┐           │
│  │  PM2 (Process Manager)                      │           │
│  │  - Auto-restart on crash                    │           │
│  │  - Log management                           │           │
│  └─────────────────────────────────────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

#### Hosting Provider Comparison

| Provider | Plan | Price/mo | RAM | CPU | Storage | Bandwidth |
|----------|------|---------|-----|-----|---------|-----------|
| **Hetzner** (Recommended) | CAX11 | $4.50 | 4GB | 2 vCPU | 40GB | 20TB |
| **DigitalOcean** | Basic | $6 | 1GB | 1 vCPU | 25GB | 1TB |
| **Linode** | Nanode | $5 | 1GB | 1 vCPU | 25GB | 1TB |
| **Vultr** | Regular | $6 | 1GB | 1 vCPU | 25GB | 1TB |
| **Contabo** | VPS S | $4 | 4GB | 2 vCPU | 50GB | Unlimited |

**Recommendation:** **Hetzner CAX11** (~$4.50/month)
- Best price/performance ratio
- 4GB RAM (handles Puppeteer well)
- ARM architecture (same as Raspberry Pi - compatible code)
- European data center (good for global access)
- Excellent reliability

#### Multi-Tenant Architecture

```typescript
// Multi-tenant database schema
CREATE TABLE clubs (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  subdomain TEXT UNIQUE,  -- e.g., 'lmrc' → lmrc.rowing-platform.com
  config JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE club_credentials (
  club_id UUID REFERENCES clubs(id),
  service TEXT,  -- 'revsport'
  encrypted_username TEXT,
  encrypted_password TEXT,
  encrypted_with TEXT  -- Key ID
);

CREATE TABLE bookings_cache (
  club_id UUID REFERENCES clubs(id),
  boat_id TEXT,
  booking_data JSONB,
  cached_at TIMESTAMP,
  PRIMARY KEY (club_id, boat_id)
);
```

**Request Routing:**
```typescript
// Middleware to extract club from subdomain
app.use((req, res, next) => {
  const subdomain = req.hostname.split('.')[0];

  if (subdomain === 'www' || subdomain === 'rowing-platform') {
    // Landing page
    next();
  } else {
    // Club subdomain
    req.clubId = await getClubIdFromSubdomain(subdomain);
    req.clubConfig = await loadClubConfig(req.clubId);
    next();
  }
});

// All routes are now club-scoped
app.get('/api/bookings', async (req, res) => {
  const bookings = await getBookings(req.clubId);
  res.json(bookings);
});
```

#### Cost Breakdown (Per Month)

| Item | Cost | Notes |
|------|------|-------|
| VPS Hosting | $4.50 | Hetzner CAX11 |
| Domain Name | $1 | (~$12/year amortized) |
| SSL Certificate | $0 | Let's Encrypt (free) |
| Backups | $1 | Hetzner automated backups |
| **Total** | **$6.50/mo** | **For unlimited clubs** |

**Per-Club Cost:**
- 10 clubs: $0.65/club/month
- 50 clubs: $0.13/club/month
- 100 clubs: $0.065/club/month

**Scaling:**
- Single VPS can handle 10-20 clubs easily
- At 20+ clubs, upgrade to CAX21 (8GB RAM, $8/mo)
- At 50+ clubs, consider multiple VPS or cloud architecture

---

### Architecture 2: Serverless (AWS Lambda)

**Concept:** Pay only for what you use. Good for clubs with low traffic.

#### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         AWS                                  │
│                                                              │
│  ┌─────────────────┐         ┌─────────────────┐           │
│  │  CloudFront     │         │   S3 Bucket     │           │
│  │  (CDN)          │────────>│   (Static      │           │
│  │                 │         │    Assets)      │           │
│  └────────┬────────┘         └─────────────────┘           │
│           │                                                  │
│           ▼                                                  │
│  ┌─────────────────┐                                        │
│  │  API Gateway    │                                        │
│  └────────┬────────┘                                        │
│           │                                                  │
│     ┌─────┴───────────────────┐                            │
│     │                          │                            │
│  ┌──▼──────────┐    ┌─────────▼────────┐                  │
│  │  Lambda     │    │   Lambda         │                  │
│  │  Booking    │    │   Noticeboard    │                  │
│  │  Viewer     │    │   (w/ Puppeteer) │                  │
│  └─────────────┘    └──────────────────┘                  │
│           │                    │                            │
│           └────────┬───────────┘                            │
│                    │                                        │
│           ┌────────▼────────┐                              │
│           │   DynamoDB      │                              │
│           │   (NoSQL DB)    │                              │
│           └─────────────────┘                              │
└─────────────────────────────────────────────────────────────┘
```

#### Cost Breakdown (AWS - 10 Clubs)

**Assumptions:**
- 100 members per club checking bookings
- 10 page views per member per month
- 10,000 requests/month per club = 100,000 total requests

| Service | Usage | Cost/mo |
|---------|-------|---------|
| Lambda (Booking Viewer) | 100K requests, 512MB, 1s avg | $0.20 |
| Lambda (Noticeboard) | 50K requests, 2GB, 5s avg (Puppeteer) | $5.00 |
| API Gateway | 150K requests | $0.50 |
| DynamoDB | 10GB storage, light traffic | $2.50 |
| CloudFront | 50GB transfer | $4.25 |
| S3 | 10GB storage, 100K requests | $0.50 |
| **Total** | | **$12.95/mo** |

**Per-Club Cost:**
- 10 clubs: $1.30/club/month
- Scale linearly with traffic

**Pros:**
- Automatic scaling
- High availability
- No server management
- Pay-per-use (cheap for low traffic)

**Cons:**
- More complex architecture
- Puppeteer in Lambda is tricky (need chrome-aws-lambda)
- Cold starts (3-5s latency)
- Costs increase linearly with traffic
- Vendor lock-in

**Recommended for:** Low-traffic deployments, proof-of-concept.

---

### Architecture 3: Container Platform (Railway/Render/Fly.io)

**Concept:** Deploy containers easily without managing servers.

#### Providers Comparison

| Provider | Base Price | RAM | Included Usage | Best For |
|----------|-----------|-----|----------------|----------|
| **Railway** | $5/mo credit | 512MB+ | $5 compute | Simple apps |
| **Render** | $7/mo per service | 512MB | None | Stable pricing |
| **Fly.io** | Free tier | 256MB | 3 apps | Prototyping |

#### Example: Railway.app

```yaml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
startCommand = "npm start"
healthcheckPath = "/api/health"

[[services]]
name = "booking-viewer"
port = 3000

[[services]]
name = "noticeboard"
port = 3001

[[services]]
name = "boat-booking"
port = 3002

[database]
type = "postgresql"
```

**Cost (Railway):**
- $5/month credit (includes ~50-100 hours compute)
- Booking Viewer: ~$3/mo (always-on)
- Noticeboard: ~$4/mo (Puppeteer memory)
- Database: ~$5/mo (PostgreSQL)
- **Total: ~$12/month for 10-20 clubs**

**Pros:**
- Very easy deployment (git push)
- Automatic SSL
- Built-in database
- Good developer experience

**Cons:**
- More expensive than raw VPS
- Less control
- Vendor lock-in

**Recommended for:** Quick deployment, non-technical operators.

---

### Architecture 4: Hybrid (Static + Cheap API)

**Concept:** Host static assets free, pay only for API/scraping.

#### Architecture

```
┌─────────────────┐         ┌─────────────────┐
│  Netlify/       │         │   Cheap VPS     │
│  Vercel         │────────>│   (Hetzner)     │
│  (Free Tier)    │  API    │                 │
│                 │  Calls  │  - RevSport     │
│  - Booking      │         │    scraping     │
│    Viewer UI    │         │  - Noticeboard  │
│  - Noticeboard  │         │    scraper      │
│    UI           │         │  - Config API   │
│  - Boat Booking │         │  - PostgreSQL   │
└─────────────────┘         └─────────────────┘
     $0/mo                       $4.50/mo
```

**Implementation:**
- All React/HTML frontends deployed to Netlify (free tier: 100GB bandwidth)
- Backend APIs on Hetzner VPS ($4.50/mo)
- Frontends fetch data from API at runtime

**Cost:** ~$5/month for unlimited clubs
**Pros:** Best of both worlds - free CDN + cheap backend
**Cons:** Slightly more complex deployment

---

### Recommended Approach

**For Low Budget (<$10/mo):**
→ **Single VPS (Hetzner CAX11) - $4.50/month**
- Handles 10-20 clubs easily
- Upgrade to CAX21 (8GB, $8/mo) for 20-50 clubs
- Simple architecture, full control

**For Prototype/Testing:**
→ **Railway.app - $5-15/month**
- Fastest to deploy
- Good developer experience
- Easy to migrate later

**For High Scale (100+ clubs):**
→ **Multi-VPS + Load Balancer**
- Multiple Hetzner VPS (~$5 each)
- Hetzner Load Balancer (~$5/mo)
- Total: ~$20-30/mo for 100+ clubs

**NOT Recommended (Yet):**
→ AWS/GCP/Azure - Too expensive for low-margin product

---

## Session Time Management

### Current State Analysis

**Where Session Times Are Used:**

| App | Usage | Current Implementation |
|-----|-------|----------------------|
| **Booking Viewer** | Validation (flag unusual times) | .env: `SESSION_AM_START=06:30` |
| **Boat Booking** | Dropdown options for booking | Hardcoded: `<option>6:30-7:30</option>` |
| **Noticeboard** | Not currently used | N/A |

**Problems:**
1. Duplicated in 2 places (3 if we add to Noticeboard)
2. Hardcoded in HTML (Boat Booking)
3. Limited to 2 sessions (AM/PM)
4. Can't handle:
   - Irregular sessions (Saturday morning special)
   - Seasonal changes (winter vs summer hours)
   - Multi-session days (3-4 sessions)
   - Different sessions per day of week

---

### Proposed Solution: Flexible Session Schema

#### Session Configuration Schema

```typescript
interface SessionDefinition {
  id: string;                    // Unique identifier: "AM1", "SAT_SPECIAL"
  name: string;                  // Display name: "Early Morning"
  startTime: string;             // "06:30" (24-hour format)
  endTime: string;               // "07:30"
  daysOfWeek: number[];          // [1,2,3,4,5] = Mon-Fri, [6] = Sat, [0,1,2,3,4,5,6] = Daily
  validFrom?: string;            // "2025-11-01" (optional: seasonal)
  validTo?: string;              // "2026-03-31" (optional: seasonal)
  color?: string;                // Optional color coding
  icon?: string;                 // Optional icon
  description?: string;          // "High performance training session"
  maxBookingsPerMember?: number; // Booking limits
  priority?: number;             // Display order
}

interface ClubSessions {
  timezone: string;              // "Australia/Sydney"
  defaultSessions: SessionDefinition[];
  seasonalSessions?: SessionDefinition[];
}

// Example
const lmrcSessions: ClubSessions = {
  timezone: "Australia/Sydney",
  defaultSessions: [
    {
      id: "AM1",
      name: "Early Morning",
      startTime: "06:30",
      endTime: "07:30",
      daysOfWeek: [1,2,3,4,5],  // Weekdays
      color: "#60a5fa",
      priority: 1
    },
    {
      id: "AM2",
      name: "Main Morning",
      startTime: "07:30",
      endTime: "08:30",
      daysOfWeek: [1,2,3,4,5],
      color: "#3b82f6",
      priority: 2
    },
    {
      id: "SAT_EARLY",
      name: "Saturday Early",
      startTime: "07:00",
      endTime: "09:00",
      daysOfWeek: [6],           // Saturday only
      color: "#8b5cf6",
      priority: 3
    },
    {
      id: "SUN_SOCIAL",
      name: "Sunday Social Row",
      startTime: "08:00",
      endTime: "10:00",
      daysOfWeek: [0],           // Sunday only
      color: "#10b981",
      priority: 4,
      description: "Casual social rowing - all welcome"
    }
  ],
  seasonalSessions: [
    {
      id: "SUMMER_TWILIGHT",
      name: "Summer Twilight",
      startTime: "18:00",
      endTime: "19:30",
      daysOfWeek: [2,4],         // Tue, Thu
      validFrom: "2025-12-01",
      validTo: "2026-02-28",
      color: "#f59e0b",
      description: "Summer evening sessions during daylight saving"
    }
  ]
};
```

#### Implementation in Each App

**1. Booking Viewer - Validation**

```typescript
// src/validation/sessions.ts
import { ClubSessions, SessionDefinition } from '@lmrc/config';

export class SessionValidator {
  constructor(private sessions: ClubSessions) {}

  // Get sessions valid for a specific date/time
  getValidSessions(date: Date): SessionDefinition[] {
    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');

    const allSessions = [
      ...this.sessions.defaultSessions,
      ...(this.sessions.seasonalSessions || [])
    ];

    return allSessions.filter(session => {
      // Check day of week
      if (!session.daysOfWeek.includes(dayOfWeek)) {
        return false;
      }

      // Check date range (seasonal)
      if (session.validFrom && dateStr < session.validFrom) {
        return false;
      }
      if (session.validTo && dateStr > session.validTo) {
        return false;
      }

      return true;
    });
  }

  // Check if a booking time matches any valid session
  isValidBooking(booking: Booking): ValidationResult {
    const bookingDate = new Date(booking.date);
    const validSessions = this.getValidSessions(bookingDate);

    const matchingSession = validSessions.find(session =>
      booking.startTime === session.startTime &&
      booking.endTime === session.endTime
    );

    if (!matchingSession) {
      return {
        valid: false,
        warning: `Unusual time: ${booking.startTime}-${booking.endTime}`,
        suggestedSessions: validSessions
      };
    }

    return { valid: true, session: matchingSession };
  }
}
```

**2. Boat Booking - Dynamic Dropdown**

```html
<!-- boat-booking.html -->
<form id="booking-form">
  <label for="booking-date">Date:</label>
  <input type="date" id="booking-date" required>

  <label for="session">Session:</label>
  <select id="session" required>
    <!-- Populated dynamically based on selected date -->
  </select>

  <label for="boat">Boat:</label>
  <select id="boat" required></select>

  <button type="submit">Book</button>
</form>

<script>
  const sessions = await fetchSessions(); // From config API

  // Update session options when date changes
  document.getElementById('booking-date').addEventListener('change', (e) => {
    const selectedDate = new Date(e.target.value);
    const validSessions = getValidSessionsForDate(selectedDate, sessions);

    const sessionSelect = document.getElementById('session');
    sessionSelect.innerHTML = validSessions
      .map(session => `
        <option value="${session.id}" style="color: ${session.color}">
          ${session.name} (${session.startTime} - ${session.endTime})
          ${session.description ? ' - ' + session.description : ''}
        </option>
      `)
      .join('');
  });

  function getValidSessionsForDate(date, sessions) {
    const dayOfWeek = date.getDay();
    const dateStr = formatDate(date);

    return sessions.defaultSessions
      .concat(sessions.seasonalSessions || [])
      .filter(s => s.daysOfWeek.includes(dayOfWeek))
      .filter(s => !s.validFrom || dateStr >= s.validFrom)
      .filter(s => !s.validTo || dateStr <= s.validTo)
      .sort((a, b) => (a.priority || 99) - (b.priority || 99));
  }
</script>
```

**3. Noticeboard - Display Sessions**

```typescript
// Optional: Show upcoming sessions on Noticeboard
const UpcomingSessions: React.FC = () => {
  const [sessions, setSessions] = useState<SessionDefinition[]>([]);

  useEffect(() => {
    // Get today's and tomorrow's sessions
    const today = new Date();
    const tomorrow = addDays(today, 1);

    const todaySessions = getValidSessionsForDate(today);
    const tomorrowSessions = getValidSessionsForDate(tomorrow);

    setSessions([...todaySessions, ...tomorrowSessions]);
  }, []);

  return (
    <div className="sessions-panel">
      <h3>Upcoming Sessions</h3>
      {sessions.map(session => (
        <div key={session.id} className="session-card"
             style={{ borderLeft: `4px solid ${session.color}` }}>
          <div className="session-time">{session.startTime} - {session.endTime}</div>
          <div className="session-name">{session.name}</div>
          {session.description && (
            <div className="session-desc">{session.description}</div>
          )}
        </div>
      ))}
    </div>
  );
};
```

---

#### Configuration UI for Sessions

```tsx
// Admin UI: /admin/sessions
const SessionsManager: React.FC = () => {
  const [sessions, setSessions] = useState<SessionDefinition[]>([]);

  const addSession = () => {
    const newSession: SessionDefinition = {
      id: generateId(),
      name: '',
      startTime: '06:00',
      endTime: '07:00',
      daysOfWeek: [1,2,3,4,5],
      color: '#3b82f6',
      priority: sessions.length + 1
    };
    setSessions([...sessions, newSession]);
  };

  const updateSession = (id: string, updates: Partial<SessionDefinition>) => {
    setSessions(sessions.map(s =>
      s.id === id ? { ...s, ...updates } : s
    ));
  };

  const removeSession = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
  };

  const saveAll = async () => {
    await fetch('/api/config/sessions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessions })
    });
    alert('Sessions saved successfully');
  };

  return (
    <div className="sessions-manager">
      <h2>Manage Booking Sessions</h2>

      <div className="sessions-list">
        {sessions.map((session, index) => (
          <div key={session.id} className="session-editor">
            <div className="session-header">
              <input
                type="text"
                value={session.name}
                onChange={e => updateSession(session.id, { name: e.target.value })}
                placeholder="Session Name"
              />
              <button onClick={() => removeSession(session.id)}>Remove</button>
            </div>

            <div className="session-times">
              <label>
                Start:
                <input
                  type="time"
                  value={session.startTime}
                  onChange={e => updateSession(session.id, { startTime: e.target.value })}
                />
              </label>

              <label>
                End:
                <input
                  type="time"
                  value={session.endTime}
                  onChange={e => updateSession(session.id, { endTime: e.target.value })}
                />
              </label>
            </div>

            <div className="session-days">
              <label>Days of Week:</label>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                <label key={idx}>
                  <input
                    type="checkbox"
                    checked={session.daysOfWeek.includes(idx)}
                    onChange={e => {
                      const days = e.target.checked
                        ? [...session.daysOfWeek, idx]
                        : session.daysOfWeek.filter(d => d !== idx);
                      updateSession(session.id, { daysOfWeek: days.sort() });
                    }}
                  />
                  {day}
                </label>
              ))}
            </div>

            <div className="session-optional">
              <label>
                Color:
                <input
                  type="color"
                  value={session.color || '#3b82f6'}
                  onChange={e => updateSession(session.id, { color: e.target.value })}
                />
              </label>

              <label>
                Seasonal (Optional):
                <input
                  type="date"
                  value={session.validFrom || ''}
                  onChange={e => updateSession(session.id, { validFrom: e.target.value })}
                  placeholder="Valid From"
                />
                <input
                  type="date"
                  value={session.validTo || ''}
                  onChange={e => updateSession(session.id, { validTo: e.target.value })}
                  placeholder="Valid To"
                />
              </label>

              <label>
                Description:
                <textarea
                  value={session.description || ''}
                  onChange={e => updateSession(session.id, { description: e.target.value })}
                  placeholder="Optional description for this session"
                />
              </label>
            </div>
          </div>
        ))}
      </div>

      <div className="actions">
        <button onClick={addSession}>Add Session</button>
        <button onClick={saveAll} className="primary">Save All Changes</button>
      </div>
    </div>
  );
};
```

---

## Recommended Approach

### For Immediate Single-Club Use (Current State)

**Configuration:**
1. ✅ Implement **Solution 2: Self-Host BoatBooking on Pi**
   - Move BoatBooking from Netlify to Raspberry Pi
   - Use shared configuration library
   - All three apps read from same `club-profile.json`

2. ✅ Implement **Flexible Session Schema**
   - Store sessions in club profile
   - All apps use shared session definitions
   - Web UI to manage sessions

**Timeline:** 2-3 weeks
**Cost:** $0 (eliminate Netlify, no new hosting)
**Benefit:** Clean architecture foundation for multi-club

---

### For Multi-Club Product Launch

**Configuration:**
1. ✅ Implement **Solution 1: Configuration API** (Phase 1)
   - Config API on Raspberry Pi (each club's Pi)
   - BoatBooking fetches config from club's Pi via Cloudflare Tunnel
   - Or move to cloud config service

2. ✅ **External Hosting: Single VPS** (Phase 2)
   - Hetzner CAX11 ($4.50/mo)
   - Multi-tenant architecture
   - Subdomain per club: lmrc.rowing-clubs.com
   - Shared session management

**Timeline:** Phase 1 (2-3 weeks) → Phase 2 (4-6 weeks)
**Cost:** $4.50/month for 10-20 clubs
**Benefit:** Scalable, affordable, cloud-accessible

---

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)
- [ ] Create `@lmrc/config` shared library
- [ ] Implement session schema
- [ ] Move BoatBooking to self-hosted (Pi)
- [ ] Build session management UI
- [ ] Test with LMRC production

### Phase 2: Configuration API (Weeks 4-5)
- [ ] Build configuration API service
- [ ] Implement CORS-safe public config endpoint
- [ ] Update BoatBooking to fetch config at runtime
- [ ] Document configuration API

### Phase 3: External Hosting Prep (Weeks 6-8)
- [ ] Set up Hetzner VPS
- [ ] Implement multi-tenant database schema
- [ ] Build subdomain routing
- [ ] Deploy to cloud, test with 2-3 clubs

### Phase 4: Session Management (Weeks 9-10)
- [ ] Build session editor UI
- [ ] Implement seasonal sessions
- [ ] Add session validation across all apps
- [ ] User documentation

---

## Success Criteria

**Single-Club (Phase 1):**
- ✅ Change session times in UI → reflected in all 3 apps within 1 minute
- ✅ Add new session → appears in booking form dropdowns
- ✅ Seasonal session activates/deactivates automatically
- ✅ Zero code changes needed to adjust sessions

**Multi-Club (Phase 2-3):**
- ✅ Deploy second club in <30 minutes
- ✅ Each club has independent configuration
- ✅ Cost <$0.25/club/month
- ✅ 99.9% uptime
- ✅ Configuration changes instant (<10 seconds)

---

**END OF DOCUMENT**
