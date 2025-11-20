# LMRC Implementation Plan
## Practical Roadmap for Unified Configuration & Multi-Club Readiness

**Document Type**: Actionable Implementation Plan
**Timeline**: Immediate → 6 months
**Last Updated**: 2025-10-30
**Status**: Ready to Execute

---

## Executive Summary

**Goal:** Transform LMRC from single-club deployment to multi-club ready product while maintaining current functionality.

**Approach:**
- **Phase 1 (Now - 3 weeks):** Core configuration infrastructure
- **Phase 2 (Months 1-2):** Enhanced features & refinements
- **Phase 3 (Months 3-6):** Multi-club preparation & pilot

**Key Decisions Made:**
- ✅ Config API on Netlify Functions
- ✅ Simple "last change wins" sync (no conflict resolution complexity)
- ✅ Boat list via config API (future enhancement)
- ✅ Simple session management (no seasonal scheduling initially)
- ✅ Multi-club deployment in 3-6 months

---

## Phase 1: Foundation (Weeks 1-3)

### Goal
Get LMRC running on unified configuration with simple session management.

**Success Criteria:**
- ✅ Admin can edit sessions via web UI on Pi
- ✅ Sessions appear in BoatBooking dropdown
- ✅ Booking Viewer uses same sessions for validation
- ✅ Changes sync from Pi to cloud automatically
- ✅ Zero downtime migration from current setup

---

### Week 1: Shared Configuration Library

#### Deliverables

**1.1: NPM Package Structure**
```
@lmrc/config/
├── src/
│   ├── schemas/
│   │   ├── club-profile.ts        # Zod schema for club config
│   │   ├── session.ts              # Zod schema for sessions
│   │   └── index.ts
│   ├── manager/
│   │   ├── ConfigManager.ts        # Load/save/validate config
│   │   └── index.ts
│   └── index.ts
├── package.json
├── tsconfig.json
└── README.md
```

**1.2: Configuration Schema**
```typescript
// src/schemas/session.ts
import { z } from 'zod';

export const SessionSchema = z.object({
  id: z.string(),                          // "AM1", "AM2", "SAT"
  name: z.string(),                        // "Early Morning"
  startTime: z.string().regex(/^\d{2}:\d{2}$/),  // "06:30"
  endTime: z.string().regex(/^\d{2}:\d{2}$/),    // "07:30"
  daysOfWeek: z.array(z.number().min(0).max(6)), // [1,2,3,4,5]
  color: z.string().optional(),            // "#60a5fa"
  priority: z.number().optional(),         // Display order
});

export type Session = z.infer<typeof SessionSchema>;

// src/schemas/club-profile.ts
export const ClubProfileSchema = z.object({
  version: z.string(),                     // "1.0.0"
  club: z.object({
    id: z.string(),                        // "lmrc"
    name: z.string(),                      // "Lake Macquarie Rowing Club"
    shortName: z.string(),                 // "LMRC"
    timezone: z.string(),                  // "Australia/Sydney"
  }),
  branding: z.object({
    logoUrl: z.string().url(),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  }),
  sessions: z.array(SessionSchema),
  revSport: z.object({
    baseUrl: z.string().url(),
    // Credentials NOT in config (stored separately)
  }),
});

export type ClubProfile = z.infer<typeof ClubProfileSchema>;
```

**1.3: Configuration Manager**
```typescript
// src/manager/ConfigManager.ts
import { ClubProfile, ClubProfileSchema } from '../schemas';
import fs from 'fs/promises';

export class ConfigManager {
  constructor(private configPath: string) {}

  async load(): Promise<ClubProfile> {
    const raw = await fs.readFile(this.configPath, 'utf8');
    const parsed = JSON.parse(raw);

    // Validate with Zod
    return ClubProfileSchema.parse(parsed);
  }

  async save(config: ClubProfile): Promise<void> {
    // Validate before saving
    const validated = ClubProfileSchema.parse(config);

    await fs.writeFile(
      this.configPath,
      JSON.stringify(validated, null, 2),
      'utf8'
    );
  }

  async updateSessions(sessions: Session[]): Promise<void> {
    const config = await this.load();
    config.sessions = sessions;
    await this.save(config);
  }
}
```

**1.4: Migration from Current Config**
```typescript
// scripts/migrate-config.ts
import { ConfigManager } from '@lmrc/config';
import dotenv from 'dotenv';

async function migrate() {
  // Load current .env config
  dotenv.config();

  // Create new club profile
  const clubProfile = {
    version: "1.0.0",
    club: {
      id: "lmrc",
      name: process.env.CLUB_NAME || "Lake Macquarie Rowing Club",
      shortName: process.env.CLUB_SHORT_NAME || "LMRC",
      timezone: "Australia/Sydney",
    },
    branding: {
      logoUrl: "https://www.lakemacquarierowingclub.org.au/images/logo.png",
      primaryColor: process.env.CLUB_PRIMARY_COLOR || "#1e40af",
      secondaryColor: process.env.CLUB_SECONDARY_COLOR || "#0ea5e9",
    },
    sessions: [
      {
        id: "AM1",
        name: "Early Morning",
        startTime: process.env.SESSION_AM_START || "06:30",
        endTime: process.env.SESSION_AM_END || "07:30",
        daysOfWeek: [1, 2, 3, 4, 5],
        color: "#60a5fa",
        priority: 1,
      },
      {
        id: "AM2",
        name: "Main Morning",
        startTime: "07:30",
        endTime: "08:30",
        daysOfWeek: [1, 2, 3, 4, 5],
        color: "#3b82f6",
        priority: 2,
      },
    ],
    revSport: {
      baseUrl: process.env.REVSPORT_BASE_URL || "https://www.lakemacquarierowingclub.org.au",
    },
  };

  // Save to new location
  const manager = new ConfigManager('/opt/lmrc/shared/config/club-profile.json');
  await manager.save(clubProfile);

  console.log('✓ Configuration migrated successfully');
}

migrate().catch(console.error);
```

**Timeline:** 3-4 days
**Effort:** 1 engineer

---

### Week 2: Config API (Netlify Functions)

#### Deliverables

**2.1: Netlify Function Structure**
```
netlify/
├── functions/
│   ├── config.ts              # GET/POST /api/config/:clubId
│   └── health.ts              # GET /api/health
└── netlify.toml
```

**2.2: Config API Implementation**
```typescript
// netlify/functions/config.ts
import { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

const store = getStore('club-configs');

export const handler: Handler = async (event, context) => {
  const clubId = event.path.split('/').pop();

  // CORS headers
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
  };

  // Handle OPTIONS (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // GET - Public endpoint
  if (event.httpMethod === 'GET') {
    try {
      const config = await store.get(clubId, { type: 'json' });

      if (!config) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Club not found' }),
        };
      }

      return {
        statusCode: 200,
        headers: {
          ...headers,
          'Cache-Control': 'public, max-age=60', // Cache 1 minute
        },
        body: JSON.stringify(config),
      };
    } catch (error) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Internal server error' }),
      };
    }
  }

  // POST - Protected endpoint (Pi syncs config)
  if (event.httpMethod === 'POST') {
    const apiKey = event.headers['x-api-key'];

    // Verify API key
    if (apiKey !== process.env.CONFIG_API_KEY) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    try {
      const config = JSON.parse(event.body);

      // TODO: Add Zod validation here

      // Save to blob storage
      await store.setJSON(clubId, config);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Configuration updated',
          timestamp: new Date().toISOString(),
        }),
      };
    } catch (error) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid configuration' }),
      };
    }
  }

  return {
    statusCode: 405,
    headers,
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
```

**2.3: Initial Data Setup Script**
```typescript
// scripts/seed-config-api.ts
import fetch from 'node-fetch';
import fs from 'fs/promises';

async function seedConfig() {
  const config = JSON.parse(
    await fs.readFile('/opt/lmrc/shared/config/club-profile.json', 'utf8')
  );

  const response = await fetch(
    'https://lmrc-config-api.netlify.app/api/config/lmrc',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.CONFIG_API_KEY,
      },
      body: JSON.stringify(config),
    }
  );

  if (response.ok) {
    console.log('✓ Config API seeded with LMRC configuration');
  } else {
    console.error('✗ Failed to seed config:', await response.text());
  }
}

seedConfig().catch(console.error);
```

**2.4: Deployment Configuration**
```toml
# netlify.toml
[build]
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[functions]
  node_bundler = "esbuild"
```

**Timeline:** 2-3 days
**Effort:** 1 engineer

---

### Week 3: Integration & Session Management UI

#### Deliverables

**3.1: Update BoatBooking to Use Config API**
```html
<!-- boat-booking/index.html -->
<script>
  const CONFIG_API = 'https://lmrc-config-api.netlify.app/api/config/lmrc';

  async function loadConfig() {
    try {
      const response = await fetch(CONFIG_API);
      const config = await response.json();

      // Apply branding
      document.title = `${config.club.name} - Boat Booking`;
      document.getElementById('club-name').textContent = config.club.name;
      document.getElementById('club-logo').src = config.branding.logoUrl;

      // Apply colors
      document.documentElement.style.setProperty(
        '--primary-color',
        config.branding.primaryColor
      );

      // Populate sessions
      populateSessions(config.sessions);

      // Store for later use
      window.clubConfig = config;

    } catch (error) {
      console.error('Failed to load config:', error);
      // Use fallback defaults
      useFallbackConfig();
    }
  }

  function populateSessions(sessions) {
    const sessionSelect = document.getElementById('session-select');

    // Get sessions for today's day of week
    const today = new Date().getDay();
    const todaySessions = sessions
      .filter(s => s.daysOfWeek.includes(today))
      .sort((a, b) => (a.priority || 0) - (b.priority || 0));

    sessionSelect.innerHTML = todaySessions
      .map(session => `
        <option value="${session.id}">
          ${session.name} (${session.startTime} - ${session.endTime})
        </option>
      `)
      .join('');
  }

  // Load on page ready
  document.addEventListener('DOMContentLoaded', loadConfig);
</script>
```

**3.2: Update Booking Viewer to Use Shared Config**
```typescript
// booking-viewer/src/config/loader.ts
import { ConfigManager } from '@lmrc/config';

const configManager = new ConfigManager('/opt/lmrc/shared/config/club-profile.json');

export async function loadConfig() {
  return await configManager.load();
}

// booking-viewer/src/validation/sessions.ts
import { Session } from '@lmrc/config';

export function validateBookingTime(
  booking: { startTime: string; endTime: string; date: Date },
  sessions: Session[]
): { valid: boolean; warning?: string } {

  const dayOfWeek = booking.date.getDay();
  const validSessions = sessions.filter(s =>
    s.daysOfWeek.includes(dayOfWeek)
  );

  const matches = validSessions.find(s =>
    s.startTime === booking.startTime && s.endTime === booking.endTime
  );

  if (!matches) {
    return {
      valid: false,
      warning: `Unusual time: ${booking.startTime}-${booking.endTime}`,
    };
  }

  return { valid: true };
}
```

**3.3: Session Management UI on Pi**
```typescript
// pi/config-ui/src/pages/Sessions.tsx
import React, { useState, useEffect } from 'react';
import { Session } from '@lmrc/config';

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const SessionsPage: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSessions();
  }, []);

  async function loadSessions() {
    const response = await fetch('/api/config');
    const config = await response.json();
    setSessions(config.sessions);
  }

  async function saveSessions() {
    setSaving(true);
    try {
      // Save locally
      await fetch('/api/config/sessions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessions }),
      });

      // Sync to cloud (fire and forget)
      syncToCloud();

      alert('✓ Sessions saved successfully');
    } catch (error) {
      alert('✗ Failed to save sessions: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function syncToCloud() {
    try {
      const config = await (await fetch('/api/config')).json();

      await fetch('https://lmrc-config-api.netlify.app/api/config/lmrc', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': process.env.CONFIG_API_KEY,
        },
        body: JSON.stringify(config),
      });
    } catch (error) {
      console.error('Cloud sync failed:', error);
      // Don't block local save if cloud sync fails
    }
  }

  function addSession() {
    const newSession: Session = {
      id: `SESSION_${Date.now()}`,
      name: 'New Session',
      startTime: '06:00',
      endTime: '07:00',
      daysOfWeek: [1, 2, 3, 4, 5],
      priority: sessions.length + 1,
    };
    setSessions([...sessions, newSession]);
  }

  function updateSession(id: string, updates: Partial<Session>) {
    setSessions(sessions.map(s =>
      s.id === id ? { ...s, ...updates } : s
    ));
  }

  function removeSession(id: string) {
    if (confirm('Remove this session?')) {
      setSessions(sessions.filter(s => s.id !== id));
    }
  }

  return (
    <div className="sessions-page">
      <div className="header">
        <h1>Manage Booking Sessions</h1>
        <button onClick={addSession} className="btn-add">
          + Add Session
        </button>
      </div>

      <div className="sessions-list">
        {sessions.map(session => (
          <div key={session.id} className="session-card">
            <div className="session-row">
              <input
                type="text"
                value={session.name}
                onChange={e => updateSession(session.id, { name: e.target.value })}
                placeholder="Session Name"
                className="input-name"
              />
              <button onClick={() => removeSession(session.id)} className="btn-remove">
                Remove
              </button>
            </div>

            <div className="session-row">
              <label>
                Start Time:
                <input
                  type="time"
                  value={session.startTime}
                  onChange={e => updateSession(session.id, { startTime: e.target.value })}
                />
              </label>

              <label>
                End Time:
                <input
                  type="time"
                  value={session.endTime}
                  onChange={e => updateSession(session.id, { endTime: e.target.value })}
                />
              </label>
            </div>

            <div className="session-days">
              <label>Days:</label>
              {daysOfWeek.map((day, idx) => (
                <label key={idx} className="day-checkbox">
                  <input
                    type="checkbox"
                    checked={session.daysOfWeek.includes(idx)}
                    onChange={e => {
                      const days = e.target.checked
                        ? [...session.daysOfWeek, idx].sort()
                        : session.daysOfWeek.filter(d => d !== idx);
                      updateSession(session.id, { daysOfWeek: days });
                    }}
                  />
                  {day}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="actions">
        <button onClick={saveSessions} disabled={saving} className="btn-save">
          {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
};
```

**3.4: Pi Config API Endpoint**
```typescript
// pi/config-ui/api/config.ts
import express from 'express';
import { ConfigManager } from '@lmrc/config';

const app = express();
const configManager = new ConfigManager('/opt/lmrc/shared/config/club-profile.json');

// Get full config
app.get('/api/config', async (req, res) => {
  const config = await configManager.load();
  res.json(config);
});

// Update sessions
app.put('/api/config/sessions', async (req, res) => {
  try {
    const { sessions } = req.body;
    await configManager.updateSessions(sessions);

    // Trigger cloud sync (background)
    syncToCloud().catch(console.error);

    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

async function syncToCloud() {
  if (!process.env.CLOUD_CONFIG_API) return;

  const config = await configManager.load();

  await fetch(`${process.env.CLOUD_CONFIG_API}/api/config/lmrc`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.CONFIG_API_KEY,
    },
    body: JSON.stringify(config),
  });
}

app.listen(8080, () => {
  console.log('Config UI running on :8080');
});
```

**Timeline:** 4-5 days
**Effort:** 1 engineer

---

### Phase 1 Summary

**Total Time:** 3 weeks
**Total Effort:** 1 engineer full-time
**Cost:** $0 (Netlify free tier)

**Deliverables:**
- ✅ `@lmrc/config` shared library
- ✅ Config API on Netlify Functions
- ✅ Session management UI on Pi
- ✅ BoatBooking uses config API
- ✅ Booking Viewer uses shared config
- ✅ Noticeboard uses shared config
- ✅ Config syncs from Pi to cloud automatically

**Testing Checklist:**
- [ ] Admin can add new session via UI
- [ ] New session appears in BoatBooking dropdown within 1 minute
- [ ] Booking Viewer validates against new sessions
- [ ] Changing session times updates all apps
- [ ] Removing session removes from all apps
- [ ] Different sessions per day of week works
- [ ] Cloud sync works (check Netlify Blobs)
- [ ] Fallback to defaults if config API fails

---

## Phase 2: Enhancements (Months 1-2)

### Goals
- Improve session management UX
- Add boat list to config API (optional)
- Handle session transition scenarios
- Performance optimizations

---

### 2.1: Session Transition Handling

**Problem:** What happens when session times change mid-week on the booking display?

**Example Scenario:**
- Monday: Sessions are 06:30-07:30, 07:30-08:30
- Tuesday: Admin changes to 06:00-07:00, 07:00-08:00
- Booking Viewer shows Monday-Friday
- Tuesday onwards should show new times, Monday shows old times

**Solution Options:**

**Option A: Accept Transition Weirdness** (Simplest - Recommend)
```
Display shows:
Mon: 06:30-07:30 (old), 07:30-08:30 (old)
Tue: 06:00-07:00 (new), 07:00-08:00 (new)  ← Looks odd but correct
Wed: 06:00-07:00 (new), 07:00-08:00 (new)
```

**Pros:** Simple, no additional code
**Cons:** Display looks inconsistent during transition

**Option B: Historical Session Lookup** (More Complex)
```typescript
interface SessionHistory {
  sessions: Session[];
  effectiveFrom: string;  // ISO date
}

// Config stores history
{
  "currentSessions": [...],
  "sessionHistory": [
    {
      "effectiveFrom": "2025-10-01",
      "sessions": [...]  // Old sessions
    }
  ]
}

// Booking Viewer looks up which sessions were valid for each date
function getSessionsForDate(date: Date): Session[] {
  const dateStr = formatDate(date);

  // Find applicable session config
  const applicable = sessionHistory
    .filter(h => h.effectiveFrom <= dateStr)
    .sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom))[0];

  return applicable.sessions;
}
```

**Pros:** Display always correct
**Cons:** More complexity, need to store history

**Recommendation:** Start with Option A. Add Option B only if customers complain.

---

### 2.2: Boat List via Config API

**Implementation:**
```typescript
// netlify/functions/boats.ts
import { Handler } from '@netlify/functions';
import { getStore } from '@netlify/blobs';

const store = getStore('club-boats');

export const handler: Handler = async (event) => {
  const clubId = event.path.split('/').pop();

  // GET - Public endpoint
  if (event.httpMethod === 'GET') {
    const boats = await store.get(clubId, { type: 'json' });

    if (!boats) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Boats not found' }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=600', // Cache 10 minutes
      },
      body: JSON.stringify(boats),
    };
  }

  // POST - Protected endpoint (GitHub Actions updates)
  if (event.httpMethod === 'POST') {
    const apiKey = event.headers['x-api-key'];

    if (apiKey !== process.env.CONFIG_API_KEY) {
      return { statusCode: 401, body: 'Unauthorized' };
    }

    const boats = JSON.parse(event.body);
    await store.setJSON(clubId, boats);

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true }),
    };
  }
};
```

**Update GitHub Actions:**
```yaml
# .github/workflows/update-boats.yml
- name: Upload to Config API
  run: |
    curl -X POST \
      -H "Content-Type: application/json" \
      -H "X-API-Key: ${{ secrets.CONFIG_API_KEY }}" \
      -d @boats.json \
      https://lmrc-config-api.netlify.app/api/boats/lmrc
```

**Update BoatBooking:**
```javascript
// Fetch boats from config API instead of static file
const boats = await fetch('https://lmrc-config-api.netlify.app/api/boats/lmrc');
```

**Timeline:** 2-3 days
**Priority:** Medium (nice-to-have)

---

### 2.3: Performance Optimizations

**Caching Strategy:**
```typescript
// BoatBooking - Cache config in localStorage
const CACHE_KEY = 'club-config';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function loadConfigWithCache() {
  const cached = localStorage.getItem(CACHE_KEY);

  if (cached) {
    const { config, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < CACHE_TTL) {
      return config;
    }
  }

  // Fetch fresh config
  const config = await fetch(CONFIG_API).then(r => r.json());

  // Cache it
  localStorage.setItem(CACHE_KEY, JSON.stringify({
    config,
    timestamp: Date.now(),
  }));

  return config;
}
```

**Timeline:** 1 day
**Priority:** Low (optional optimization)

---

## Phase 3: Multi-Club Preparation (Months 3-6)

### Goals
- Deploy to 2-3 pilot clubs
- Validate multi-tenancy architecture
- Refine based on feedback

---

### 3.1: Multi-Club Config API Enhancements

**Current:** Single club (LMRC) hardcoded
**Target:** Support multiple clubs dynamically

**Changes Needed:**

**1. Club Registry:**
```typescript
// netlify/functions/clubs.ts
const CLUBS = {
  'lmrc': {
    name: 'Lake Macquarie Rowing Club',
    domain: 'lakemacquarierowingclub.org.au',
    status: 'active',
  },
  'src': {
    name: 'Sydney Rowing Club',
    domain: 'sydneyrowingclub.com.au',
    status: 'active',
  },
};

// GET /api/clubs - List all clubs
export const handler: Handler = async (event) => {
  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.entries(CLUBS).map(([id, info]) => ({
      id,
      ...info,
    }))),
  };
};
```

**2. Per-Club BoatBooking Sites:**

**Option 1:** Separate Netlify site per club
```
lmrc-bookings.netlify.app
sydney-rc-bookings.netlify.app
```

**Option 2:** Multi-tenant (subdomain routing)
```
lmrc.rowing-bookings.com
sydney.rowing-bookings.com
```

**Recommendation:** Start with Option 1 (simpler), migrate to Option 2 at 10+ clubs.

---

### 3.2: Pilot Club Deployment

**Per-Club Checklist:**
- [ ] Create club profile in config API
- [ ] Set up BoatBooking site (fork template)
- [ ] Configure GitHub Actions for boat scraping
- [ ] Set up Raspberry Pi with base image
- [ ] Run setup wizard (future) or manual install
- [ ] Configure sessions via web UI
- [ ] Test QR code workflow
- [ ] Test booking from home
- [ ] Verify displays working
- [ ] Train club admin

**Estimated Time:** 2-4 hours per club (first few), <1 hour once streamlined

---

### 3.3: Monitoring & Support

**Basic Monitoring:**
```typescript
// netlify/functions/health.ts
export const handler: Handler = async () => {
  // Check config API health
  const configHealth = await checkConfigAPI();

  // Check boat API health
  const boatHealth = await checkBoatAPI();

  const healthy = configHealth && boatHealth;

  return {
    statusCode: healthy ? 200 : 503,
    body: JSON.stringify({
      status: healthy ? 'healthy' : 'degraded',
      checks: {
        config: configHealth,
        boats: boatHealth,
      },
      timestamp: new Date().toISOString(),
    }),
  };
};
```

**Simple Usage Dashboard:**
```typescript
// Track API usage per club
const USAGE_STORE = getStore('usage');

// Increment on each request
await USAGE_STORE.set(`${clubId}:${date}:requests`, count + 1);

// Weekly email report to admin
```

**Timeline:** 1-2 weeks
**Priority:** Medium (needed before scaling)

---

## Implementation Priorities

### Must-Have (Phase 1)
1. ✅ Shared config library
2. ✅ Config API (Netlify Functions)
3. ✅ Session management UI
4. ✅ Integration with all apps

### Should-Have (Phase 2)
5. 🟡 Boat list via config API
6. 🟡 Session transition handling
7. 🟡 Performance optimizations

### Nice-to-Have (Phase 3)
8. 🟢 Multi-club registry
9. 🟢 Usage monitoring
10. 🟢 Automated provisioning

---

## Resource Requirements

### Phase 1 (Weeks 1-3)
- **Engineering:** 1 senior engineer, full-time
- **DevOps:** Netlify account setup (1 hour)
- **Testing:** 1 engineer, 2-3 days
- **Cost:** $0

### Phase 2 (Months 1-2)
- **Engineering:** 1 engineer, part-time (50%)
- **Testing:** 2-3 days total
- **Cost:** $0

### Phase 3 (Months 3-6)
- **Engineering:** 1-2 engineers, part-time
- **Pilot Coordination:** Product manager, part-time
- **Support:** 0.5 FTE for pilot clubs
- **Cost:** $0-5/month (depends on usage)

---

## Risk Mitigation

### Risk 1: Config API Exceeds Free Tier

**Mitigation:**
- Netlify free tier: 100K function invocations/month
- Estimated usage (10 clubs, 100 members each): ~30K/month
- Headroom: 3x
- If exceeded: Upgrade to Pro ($19/month) or migrate to Hetzner VPS

### Risk 2: "Last Change Wins" Causes Data Loss

**Example:** Two admins edit config simultaneously.

**Mitigation:**
- Add "last modified" timestamp to config
- Show warning if local config is stale
- Optionally: Add simple locking (first to save wins, second gets conflict warning)

**Implementation:**
```typescript
// Check before saving
const currentConfig = await fetch('/api/config').then(r => r.json());
if (currentConfig.lastModified > localConfig.lastModified) {
  if (!confirm('Configuration was changed by someone else. Overwrite?')) {
    return; // Cancel save
  }
}
```

### Risk 3: Cloud Sync Fails

**Mitigation:**
- Local config always saved first (Pi apps unaffected)
- Cloud sync failure logged but doesn't block local save
- Retry mechanism (3 attempts with exponential backoff)
- Manual sync button in UI if needed

```typescript
async function syncToCloud(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await fetch(CLOUD_API, { ... });
      return true;
    } catch (error) {
      if (i === retries - 1) {
        console.error('Cloud sync failed after', retries, 'attempts');
        return false;
      }
      await sleep(Math.pow(2, i) * 1000); // Exponential backoff
    }
  }
}
```

---

## Success Metrics

### Phase 1 Success Criteria
- [ ] Zero downtime migration from current setup
- [ ] Admin can change session times in <30 seconds
- [ ] Changes reflect in BoatBooking within 2 minutes
- [ ] Changes reflect in Booking Viewer immediately
- [ ] No manual file editing required
- [ ] Config API response time <500ms (p95)

### Phase 2 Success Criteria
- [ ] Session transition scenarios handled gracefully
- [ ] Boat list updates automated
- [ ] Performance acceptable (BoatBooking loads <2s)

### Phase 3 Success Criteria
- [ ] 2-3 pilot clubs deployed successfully
- [ ] <2 hours deployment time per club
- [ ] <0.5 support tickets per club per week
- [ ] 90% pilot club satisfaction
- [ ] Config API handles 3 clubs with no issues

---

## Next Steps

### Immediate Actions (This Week)

1. **Set up development environment**
   - [ ] Create `@lmrc/config` package
   - [ ] Set up Netlify account (if not existing)
   - [ ] Create config API repository

2. **Week 1 kickoff**
   - [ ] Start implementation of shared config library
   - [ ] Define final config schema
   - [ ] Create migration script

3. **Stakeholder alignment**
   - [ ] Review this plan with engineering team
   - [ ] Confirm timeline acceptable
   - [ ] Identify any missing requirements

### Questions to Resolve

1. **Netlify account:** Do you have an existing Netlify account, or should we create a new one for LMRC?

2. **Environment variables:** How should we manage CONFIG_API_KEY? (Recommend: Netlify environment variables)

3. **Testing approach:** Do you want automated tests (Jest/Vitest) or manual testing acceptable for Phase 1?

4. **Rollback plan:** If Phase 1 has issues, how quickly do we need to rollback to current setup? (Recommend: Keep current .env config as backup for 2 weeks)

---

## Appendix: Configuration Schema Examples

### Example 1: Simple Club (2 sessions, weekdays only)
```json
{
  "version": "1.0.0",
  "club": {
    "id": "lmrc",
    "name": "Lake Macquarie Rowing Club",
    "shortName": "LMRC",
    "timezone": "Australia/Sydney"
  },
  "branding": {
    "logoUrl": "https://lmrc.com.au/logo.png",
    "primaryColor": "#1e40af",
    "secondaryColor": "#0ea5e9"
  },
  "sessions": [
    {
      "id": "AM1",
      "name": "Early Morning",
      "startTime": "06:30",
      "endTime": "07:30",
      "daysOfWeek": [1, 2, 3, 4, 5],
      "color": "#60a5fa",
      "priority": 1
    },
    {
      "id": "AM2",
      "name": "Main Morning",
      "startTime": "07:30",
      "endTime": "08:30",
      "daysOfWeek": [1, 2, 3, 4, 5],
      "color": "#3b82f6",
      "priority": 2
    }
  ],
  "revSport": {
    "baseUrl": "https://www.lakemacquarierowingclub.org.au"
  }
}
```

### Example 2: Complex Club (different sessions per day)
```json
{
  "sessions": [
    {
      "id": "WD_AM1",
      "name": "Weekday Early",
      "startTime": "06:30",
      "endTime": "07:30",
      "daysOfWeek": [1, 2, 3, 4, 5],
      "priority": 1
    },
    {
      "id": "WD_AM2",
      "name": "Weekday Main",
      "startTime": "07:30",
      "endTime": "08:30",
      "daysOfWeek": [1, 2, 3, 4, 5],
      "priority": 2
    },
    {
      "id": "SAT_LONG",
      "name": "Saturday Long Row",
      "startTime": "07:00",
      "endTime": "09:00",
      "daysOfWeek": [6],
      "color": "#8b5cf6",
      "priority": 3
    },
    {
      "id": "SUN_SOCIAL",
      "name": "Sunday Social",
      "startTime": "08:00",
      "endTime": "10:00",
      "daysOfWeek": [0],
      "color": "#10b981",
      "priority": 4
    }
  ]
}
```

---

**Document Version:** 1.0
**Last Updated:** 2025-10-30
**Status:** Ready for Implementation
