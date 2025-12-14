# Configurable Session Times - Technical Design

**Status**: Design Phase
**Priority**: High (Now - Active Development)
**Effort**: ~2-3 hours implementation
**Platform**: Netlify (Static Site + Serverless Functions)

---

## Executive Summary

Design and implement a web-based configuration interface for BoatBooking session times, allowing club administrators to adjust booking time slots without code changes or developer intervention.

**User Need**: "As a club administrator, I want to adjust session times when daylight hours change without needing a developer, so I can keep booking times aligned with rowing conditions."

**Solution**: Configuration page (`/config.html`) backed by Netlify Functions for persistence, protected by simple password authentication.

---

## Current State

### Session Times (Hardcoded in JavaScript)

**Location**: `BoatBooking/book-a-boat.html` (lines 597-610)

```javascript
// --- Session configuration ---
const SESSIONS = [
    {
        label: "Morning Session 1",
        startTime: "06:30",
        endTime: "07:30",
        display: "6:30 AM - 7:30 AM"
    },
    {
        label: "Morning Session 2",
        startTime: "07:30",
        endTime: "08:30",
        display: "7:30 AM - 8:30 AM"
    }
];
```

**Problems**:
- ❌ Hardcoded in HTML file (requires code change)
- ❌ Requires git commit + Netlify deploy to change times
- ❌ No validation (can set invalid times)
- ❌ Can't add/remove sessions dynamically
- ❌ No audit trail of changes

---

## Target State

### Session Times (Configurable via Web UI)

**Data Source**: `sessions.json` (persisted file on Netlify)

```json
{
  "sessions": [
    {
      "id": "session-1",
      "label": "Morning Session 1",
      "startTime": "06:30",
      "endTime": "07:30",
      "display": "6:30 AM - 7:30 AM",
      "enabled": true
    },
    {
      "id": "session-2",
      "label": "Morning Session 2",
      "startTime": "07:30",
      "endTime": "08:30",
      "display": "7:30 AM - 8:30 AM",
      "enabled": true
    }
  ],
  "metadata": {
    "lastModified": "2025-12-14T10:30:00Z",
    "modifiedBy": "admin",
    "version": 2
  }
}
```

**Benefits**:
- ✅ Web-based configuration UI (no code changes)
- ✅ Instant updates (no git/deploy required)
- ✅ Client-side validation (time format, logic checks)
- ✅ Add/remove/enable/disable sessions
- ✅ Audit trail (last modified timestamp)
- ✅ Preview before saving

---

## Architecture

### Option 1: Netlify Functions + File Storage (Recommended)

```
┌─────────────────────────────────────────────────────────────┐
│                     Netlify Platform                        │
│                                                             │
│  ┌──────────────────┐         ┌─────────────────────┐     │
│  │  config.html     │────────▶│ Netlify Functions   │     │
│  │  (Admin UI)      │  HTTPS  │                     │     │
│  │  - Password auth │         │ GET  /api/sessions  │     │
│  │  - Edit sessions │         │ POST /api/sessions  │     │
│  │  - Preview       │         └──────────┬──────────┘     │
│  └──────────────────┘                    │                 │
│                                           ▼                 │
│  ┌──────────────────┐         ┌─────────────────────┐     │
│  │ book-a-boat.html │◀────────│  sessions.json      │     │
│  │ (Public booking) │  Fetch  │  (Static file)      │     │
│  └──────────────────┘         └─────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Technology Stack**:
- **Frontend**: Plain HTML + vanilla JavaScript (no framework)
- **Backend**: Netlify Functions (Node.js serverless)
- **Storage**: Static JSON file in repo (written by serverless function)
- **Auth**: Simple password (stored in Netlify environment variable)
- **Deployment**: Automatic via git push

**Pros**:
- ✅ No additional hosting costs (Netlify free tier)
- ✅ Serverless (auto-scales, no server management)
- ✅ Simple architecture (no database needed)
- ✅ Git history of changes (JSON file commits)
- ✅ Easy rollback (revert git commit)

**Cons**:
- ⚠️ Requires git commit from serverless function (possible with write access)
- ⚠️ Simple password auth (not OAuth, but sufficient for admin tool)
- ⚠️ Single-user (no concurrent edit protection, but low usage)

---

### Option 2: Netlify Functions + KV Storage (Alternative)

Use Netlify Blobs (key-value storage) instead of file commits.

**Pros**:
- ✅ No git commits needed
- ✅ Faster updates

**Cons**:
- ❌ No git history (harder to audit changes)
- ❌ Requires Netlify Pro plan ($19/month) for Blobs
- ❌ More complex rollback

**Verdict**: Not recommended. File storage is simpler and leverages git for auditing.

---

### Option 3: Client-Side Only (localStorage)

Store configuration in browser localStorage.

**Pros**:
- ✅ Simplest implementation

**Cons**:
- ❌ Not shared across users
- ❌ Lost on cache clear
- ❌ Can't use on different devices

**Verdict**: Not suitable for multi-user admin tool.

---

## Data Model

### Session Configuration Schema

```typescript
interface SessionConfig {
  sessions: Session[];
  metadata: Metadata;
}

interface Session {
  id: string;              // Unique ID (e.g., "session-1")
  label: string;           // Display name (e.g., "Morning Session 1")
  startTime: string;       // HH:MM format (e.g., "06:30")
  endTime: string;         // HH:MM format (e.g., "07:30")
  display: string;         // Human-readable (e.g., "6:30 AM - 7:30 AM")
  enabled: boolean;        // Active/inactive toggle
}

interface Metadata {
  lastModified: string;    // ISO 8601 timestamp
  modifiedBy: string;      // "admin" or username
  version: number;         // Incremental version
}
```

**Validation Rules**:
1. `startTime` < `endTime` (session must have duration)
2. `startTime` and `endTime` match regex: `/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/`
3. At least 1 session must be enabled
4. Sessions should not overlap (warning, not blocking)
5. `label` must be unique and non-empty
6. `id` must be unique and match pattern: `/^session-\d+$/`

**Default Values** (fallback if sessions.json not found):
```json
{
  "sessions": [
    {
      "id": "session-1",
      "label": "Morning Session 1",
      "startTime": "06:30",
      "endTime": "07:30",
      "display": "6:30 AM - 7:30 AM",
      "enabled": true
    },
    {
      "id": "session-2",
      "label": "Morning Session 2",
      "startTime": "07:30",
      "endTime": "08:30",
      "display": "7:30 AM - 8:30 AM",
      "enabled": true
    }
  ],
  "metadata": {
    "lastModified": "2025-10-20T00:00:00Z",
    "modifiedBy": "system",
    "version": 1
  }
}
```

---

## API Design

### Netlify Functions Endpoints

#### GET /api/sessions

**Purpose**: Retrieve current session configuration

**Request**:
```http
GET /.netlify/functions/sessions HTTP/1.1
Host: lakemacrowing.au
```

**Response** (200 OK):
```json
{
  "sessions": [...],
  "metadata": {...}
}
```

**Response** (500 Internal Server Error):
```json
{
  "error": "Failed to load sessions"
}
```

**Implementation**: `netlify/functions/sessions.js`
```javascript
// GET handler: Read sessions.json from repo
exports.handler = async (event, context) => {
  if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (event.httpMethod === 'GET') {
    try {
      const sessions = require('../../sessions.json');
      return {
        statusCode: 200,
        body: JSON.stringify(sessions),
        headers: { 'Content-Type': 'application/json' }
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to load sessions' })
      };
    }
  }

  // POST handler continues...
};
```

---

#### POST /api/sessions

**Purpose**: Update session configuration

**Request**:
```http
POST /.netlify/functions/sessions HTTP/1.1
Host: lakemacrowing.au
Content-Type: application/json
Authorization: Bearer {password}

{
  "sessions": [
    {
      "id": "session-1",
      "label": "Morning Session 1",
      "startTime": "06:00",
      "endTime": "07:00",
      "display": "6:00 AM - 7:00 AM",
      "enabled": true
    }
  ]
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Sessions updated successfully",
  "metadata": {
    "lastModified": "2025-12-14T10:30:00Z",
    "modifiedBy": "admin",
    "version": 3
  }
}
```

**Response** (401 Unauthorized):
```json
{
  "error": "Invalid password"
}
```

**Response** (400 Bad Request):
```json
{
  "error": "Validation failed",
  "details": [
    "Session 1: startTime must be before endTime",
    "At least one session must be enabled"
  ]
}
```

**Implementation**: `netlify/functions/sessions.js`
```javascript
const fs = require('fs').promises;
const path = require('path');

exports.handler = async (event, context) => {
  // ... GET handler above ...

  if (event.httpMethod === 'POST') {
    // 1. Verify password
    const authHeader = event.headers.authorization;
    const password = authHeader?.replace('Bearer ', '');

    if (password !== process.env.ADMIN_PASSWORD) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Invalid password' })
      };
    }

    // 2. Parse and validate request
    let newSessions;
    try {
      newSessions = JSON.parse(event.body);
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON' })
      };
    }

    // 3. Validate sessions
    const errors = validateSessions(newSessions.sessions);
    if (errors.length > 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Validation failed', details: errors })
      };
    }

    // 4. Update metadata
    const config = {
      sessions: newSessions.sessions,
      metadata: {
        lastModified: new Date().toISOString(),
        modifiedBy: 'admin',
        version: (newSessions.metadata?.version || 1) + 1
      }
    };

    // 5. Write to file
    try {
      const filePath = path.join(__dirname, '../../sessions.json');
      await fs.writeFile(filePath, JSON.stringify(config, null, 2));

      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          message: 'Sessions updated successfully',
          metadata: config.metadata
        })
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to save sessions' })
      };
    }
  }
};

function validateSessions(sessions) {
  const errors = [];

  if (!Array.isArray(sessions) || sessions.length === 0) {
    errors.push('At least one session is required');
    return errors;
  }

  const enabledCount = sessions.filter(s => s.enabled).length;
  if (enabledCount === 0) {
    errors.push('At least one session must be enabled');
  }

  sessions.forEach((session, index) => {
    const prefix = `Session ${index + 1}`;

    if (!session.label || session.label.trim() === '') {
      errors.push(`${prefix}: Label is required`);
    }

    if (!session.startTime || !session.endTime) {
      errors.push(`${prefix}: Start and end times are required`);
    } else {
      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
      if (!timeRegex.test(session.startTime)) {
        errors.push(`${prefix}: Invalid start time format (use HH:MM)`);
      }
      if (!timeRegex.test(session.endTime)) {
        errors.push(`${prefix}: Invalid end time format (use HH:MM)`);
      }

      if (session.startTime >= session.endTime) {
        errors.push(`${prefix}: Start time must be before end time`);
      }
    }
  });

  return errors;
}
```

---

## User Interface Design

### Configuration Page: `/config.html`

#### Layout Structure

```
┌────────────────────────────────────────────────────────┐
│  🚣 LMRC BoatBooking - Session Configuration          │
├────────────────────────────────────────────────────────┤
│                                                        │
│  🔒 Password: [___________] [Login]                   │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  Current Sessions                             │    │
│  ├──────────────────────────────────────────────┤    │
│  │  Session 1                          [Edit]    │    │
│  │  Morning Session 1                            │    │
│  │  6:30 AM - 7:30 AM          ✓ Enabled        │    │
│  ├──────────────────────────────────────────────┤    │
│  │  Session 2                          [Edit]    │    │
│  │  Morning Session 2                            │    │
│  │  7:30 AM - 8:30 AM          ✓ Enabled        │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  [+ Add New Session]                                  │
│                                                        │
│  ┌──────────────────────────────────────────────┐    │
│  │  Preview                                      │    │
│  ├──────────────────────────────────────────────┤    │
│  │  How it will appear on booking page:         │    │
│  │                                               │    │
│  │  [ Morning Session 1 ]                        │    │
│  │    6:30 AM - 7:30 AM                          │    │
│  │                                               │    │
│  │  [ Morning Session 2 ]                        │    │
│  │    7:30 AM - 8:30 AM                          │    │
│  └──────────────────────────────────────────────┘    │
│                                                        │
│  [Save Changes]  [Reset]  [Cancel]                   │
│                                                        │
│  Last modified: 2025-12-14 10:30 AM by admin         │
│  Version: 2                                           │
└────────────────────────────────────────────────────────┘
```

#### Edit Session Modal

```
┌─────────────────────────────────────┐
│  Edit Session                   [×] │
├─────────────────────────────────────┤
│                                     │
│  Label:                             │
│  [Morning Session 1_____________]   │
│                                     │
│  Start Time:                        │
│  [06]:[30] AM/PM                    │
│                                     │
│  End Time:                          │
│  [07]:[30] AM/PM                    │
│                                     │
│  Display Format:                    │
│  [6:30 AM - 7:30 AM_____________]   │
│  (Auto-generated from times)        │
│                                     │
│  [ ] Enabled                        │
│                                     │
│  [Save]  [Cancel]  [Delete]         │
└─────────────────────────────────────┘
```

---

### UI Components

#### 1. Password Protection

```html
<div id="loginScreen" class="auth-screen">
  <h1>🚣 LMRC BoatBooking Configuration</h1>
  <p>Enter admin password to continue</p>

  <input type="password" id="passwordInput" placeholder="Password" />
  <button onclick="login()">Login</button>

  <div id="errorMessage" class="error" style="display: none;"></div>
</div>
```

**Authentication Flow**:
1. User enters password
2. JavaScript makes GET request to `/api/sessions` with `Authorization: Bearer {password}`
3. If 200 OK → Hide login screen, show config interface
4. If 401 → Show error message
5. Password stored in sessionStorage (cleared on tab close)

#### 2. Session List

```html
<div id="sessionsList">
  <!-- Dynamically rendered -->
  <div class="session-card" data-session-id="session-1">
    <h3>Session 1 <button onclick="editSession('session-1')">Edit</button></h3>
    <p class="session-label">Morning Session 1</p>
    <p class="session-time">6:30 AM - 7:30 AM</p>
    <p class="session-status">✓ Enabled</p>
  </div>
</div>
```

#### 3. Add/Edit Modal

```html
<div id="editModal" class="modal" style="display: none;">
  <div class="modal-content">
    <h2>Edit Session <span class="close" onclick="closeModal()">&times;</span></h2>

    <label>Label:</label>
    <input type="text" id="sessionLabel" />

    <label>Start Time:</label>
    <input type="time" id="sessionStart" />

    <label>End Time:</label>
    <input type="time" id="sessionEnd" />

    <label>Display Format:</label>
    <input type="text" id="sessionDisplay" readonly />

    <label>
      <input type="checkbox" id="sessionEnabled" checked />
      Enabled
    </label>

    <button onclick="saveSession()">Save</button>
    <button onclick="closeModal()">Cancel</button>
    <button onclick="deleteSession()" class="danger">Delete</button>
  </div>
</div>
```

#### 4. Preview Panel

```html
<div id="previewPanel" class="preview">
  <h3>Preview</h3>
  <p>How it will appear on booking page:</p>

  <div id="previewButtons">
    <!-- Dynamically rendered buttons matching book-a-boat.html style -->
  </div>
</div>
```

#### 5. Action Buttons

```html
<div class="actions">
  <button onclick="saveChanges()" class="primary">Save Changes</button>
  <button onclick="resetChanges()">Reset</button>
  <button onclick="cancelChanges()">Cancel</button>
</div>

<div class="metadata">
  Last modified: <span id="lastModified">2025-12-14 10:30 AM</span> by <span id="modifiedBy">admin</span>
  <br>
  Version: <span id="version">2</span>
</div>
```

---

## Implementation Steps

### Phase 1: Backend Setup (30 minutes)

**1.1 Create Netlify Function**

```bash
cd BoatBooking
mkdir -p netlify/functions
touch netlify/functions/sessions.js
```

**1.2 Implement sessions.js** (see API Design section above)

**1.3 Set Environment Variable**

Via Netlify dashboard:
1. Go to Site settings → Environment variables
2. Add: `ADMIN_PASSWORD` = `[secure-password]`
3. Save

**1.4 Create sessions.json**

```bash
cd BoatBooking
touch sessions.json
```

```json
{
  "sessions": [
    {
      "id": "session-1",
      "label": "Morning Session 1",
      "startTime": "06:30",
      "endTime": "07:30",
      "display": "6:30 AM - 7:30 AM",
      "enabled": true
    },
    {
      "id": "session-2",
      "label": "Morning Session 2",
      "startTime": "07:30",
      "endTime": "08:30",
      "display": "7:30 AM - 8:30 AM",
      "enabled": true
    }
  ],
  "metadata": {
    "lastModified": "2025-10-20T00:00:00Z",
    "modifiedBy": "system",
    "version": 1
  }
}
```

**1.5 Test Function Locally**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Start local dev server
netlify dev

# Test GET
curl http://localhost:8888/.netlify/functions/sessions

# Test POST
curl -X POST http://localhost:8888/.netlify/functions/sessions \
  -H "Authorization: Bearer test-password" \
  -H "Content-Type: application/json" \
  -d '{"sessions": [...]}'
```

---

### Phase 2: Frontend UI (1 hour)

**2.1 Create config.html**

```bash
cd BoatBooking
touch config.html
```

**2.2 Implement UI** (see User Interface Design section)

Key JavaScript functions:
- `login()` - Authenticate with password
- `loadSessions()` - Fetch sessions from API
- `renderSessionsList()` - Display sessions
- `editSession(id)` - Open edit modal
- `saveSession()` - Save session changes
- `deleteSession(id)` - Remove session
- `addSession()` - Create new session
- `saveChanges()` - POST to API
- `validateSessions()` - Client-side validation
- `renderPreview()` - Update preview panel

**2.3 Style with LMRC Design System**

Match existing `book-a-boat.html` styling:
```css
:root {
  --primary-color: #1e40af;
  --secondary-color: #0ea5e9;
  --background: #f8fafc;
  --surface: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #64748b;
  --border: #e2e8f0;
}
```

---

### Phase 3: Update book-a-boat.html (30 minutes)

**3.1 Replace Hardcoded SESSIONS**

**Before**:
```javascript
const SESSIONS = [
    {
        label: "Morning Session 1",
        startTime: "06:30",
        endTime: "07:30",
        display: "6:30 AM - 7:30 AM"
    },
    // ...
];
```

**After**:
```javascript
let SESSIONS = [];

// Load sessions from JSON file
async function loadSessions() {
    try {
        const response = await fetch('/sessions.json');
        if (!response.ok) {
            throw new Error('Failed to load sessions');
        }
        const config = await response.json();
        SESSIONS = config.sessions.filter(s => s.enabled);
        renderSessionButtons();
    } catch (error) {
        console.error('Error loading sessions:', error);
        // Fallback to default sessions
        SESSIONS = [
            {
                label: "Morning Session 1",
                startTime: "06:30",
                endTime: "07:30",
                display: "6:30 AM - 7:30 AM",
                enabled: true
            },
            {
                label: "Morning Session 2",
                startTime: "07:30",
                endTime: "08:30",
                display: "7:30 AM - 8:30 AM",
                enabled: true
            }
        ];
        renderSessionButtons();
    }
}

// Call on page load
loadSessions();
```

**3.2 Update Session Rendering**

Ensure `renderSessionButtons()` (already exists in book-a-boat.html) dynamically creates buttons from loaded sessions.

---

### Phase 4: Testing (30 minutes)

**4.1 Local Testing**

```bash
# Start local Netlify dev server
netlify dev

# Test config page
# Open: http://localhost:8888/config.html

# Test booking page
# Open: http://localhost:8888/book-a-boat.html?boat_id=6283
```

**Test Cases**:
1. ✅ Login with correct password
2. ✅ Login with incorrect password (should fail)
3. ✅ Load existing sessions
4. ✅ Edit session (change times)
5. ✅ Add new session
6. ✅ Delete session
7. ✅ Disable session (should not appear on booking page)
8. ✅ Save changes
9. ✅ Preview shows correct format
10. ✅ Validation catches invalid times
11. ✅ Booking page loads sessions correctly
12. ✅ Booking page falls back to defaults if sessions.json unavailable

**4.2 Validation Testing**

Test edge cases:
- Start time after end time
- Invalid time format
- Empty label
- All sessions disabled
- Overlapping sessions (warning only)

---

### Phase 5: Deployment (15 minutes)

**5.1 Commit and Push**

```bash
cd BoatBooking
git add netlify/functions/sessions.js sessions.json config.html book-a-boat.html
git commit -m "feat: Add configurable session times with admin UI"
git push
```

**5.2 Netlify Auto-Deploy**

Netlify will automatically:
1. Detect new function: `netlify/functions/sessions.js`
2. Deploy function to `/.netlify/functions/sessions`
3. Deploy `config.html` to `/config.html`
4. Deploy updated `book-a-boat.html`

**5.3 Verify Deployment**

```bash
# Test function endpoint
curl https://lakemacrowing.au/.netlify/functions/sessions

# Test config page
# Open: https://lakemacrowing.au/config.html

# Test booking page
# Open: https://lakemacrowing.au?boat_id=6283
```

---

## Security Considerations

### Password Protection

**Current Approach**: Simple password in environment variable

**Pros**:
- ✅ Simple to implement
- ✅ Good enough for admin-only tool
- ✅ No user management overhead

**Cons**:
- ⚠️ Single password (shared among admins)
- ⚠️ No user audit trail (who made changes)
- ⚠️ Password in plain text (sent over HTTPS)

**Mitigation**:
- Use strong password (generate randomly)
- HTTPS only (Netlify enforces this)
- Password in environment variable (not in code)
- Session timeout (clear sessionStorage)

**Future Enhancement** (if needed):
- Netlify Identity (OAuth, user accounts)
- JWT tokens (more secure)
- Audit log per user

---

### Data Validation

**Client-Side**:
- Time format validation (HH:MM)
- Start < End time check
- At least one enabled session
- Non-empty labels

**Server-Side** (Netlify Function):
- Duplicate all client-side validations
- Schema validation (TypeScript types)
- Sanitize input (prevent XSS)

**Never trust client input alone!**

---

### File Write Permissions

**Challenge**: Netlify Functions are read-only by default

**Solution Options**:

1. **Trigger GitHub API commit** (Recommended)
   - Function makes authenticated GitHub API call
   - Commits sessions.json to repo
   - Triggers Netlify redeploy
   - Full git history preserved

2. **Use Netlify Blobs**
   - Key-value storage (Netlify Pro)
   - No git commits needed
   - Costs $19/month

3. **Manual deploy trigger**
   - Function saves to temp storage
   - Admin manually commits file
   - Not fully automated

**Recommendation**: Use GitHub API for automated commits (free, git history).

---

## Monitoring and Maintenance

### Error Handling

**Config Page**:
- Display user-friendly error messages
- Log errors to console
- Graceful fallback to defaults

**Booking Page**:
- Silent fallback to hardcoded defaults if sessions.json fails
- Log error but don't break user experience

### Logging

**Netlify Function Logs**:
```javascript
console.log('[Sessions API] GET request received');
console.log('[Sessions API] Validation errors:', errors);
console.error('[Sessions API] Failed to save:', error);
```

View logs: Netlify Dashboard → Functions → View logs

### Audit Trail

**sessions.json metadata**:
```json
{
  "metadata": {
    "lastModified": "2025-12-14T10:30:00Z",
    "modifiedBy": "admin",
    "version": 3
  }
}
```

**Git history** (if using GitHub API commits):
```bash
git log sessions.json
```

---

## Rollback Plan

### If Configuration Breaks

**1. Via Config UI**:
- Click "Reset" button
- Restores to last saved version

**2. Via Git**:
```bash
# Revert sessions.json to previous version
git revert <commit-hash>
git push

# Netlify auto-redeploys with old sessions.json
```

**3. Emergency Fallback**:
- Delete `sessions.json` from repo
- Booking page falls back to hardcoded defaults
- Club operations continue uninterrupted

---

## Success Criteria

**Configuration Page**:
- [ ] Accessible at `/config.html`
- [ ] Password-protected (admin access only)
- [ ] Load current sessions from API
- [ ] Edit existing sessions (label, times, enabled)
- [ ] Add new sessions
- [ ] Delete sessions
- [ ] Client-side validation (time format, logic)
- [ ] Preview panel shows accurate representation
- [ ] Save changes to API
- [ ] Error messages for validation failures
- [ ] Audit trail (last modified timestamp)

**Booking Page**:
- [ ] Loads sessions from `sessions.json`
- [ ] Falls back to defaults if file unavailable
- [ ] Only shows enabled sessions
- [ ] Dynamically renders session buttons
- [ ] Booking flow unchanged
- [ ] No breaking changes

**Netlify Function**:
- [ ] GET endpoint returns sessions
- [ ] POST endpoint validates and saves sessions
- [ ] Password authentication works
- [ ] Validation catches invalid data
- [ ] Returns appropriate HTTP status codes
- [ ] Logs errors for debugging

---

## Future Enhancements

### Phase 2 (Optional - 3-6 months)

**1. Advanced Scheduling**:
- Different sessions for different days of week
- Seasonal schedules (summer vs winter)
- Holiday/event override schedules

**2. User Management**:
- Netlify Identity integration
- Multiple admin accounts
- Per-user audit trail

**3. Session Analytics**:
- Which sessions are most popular?
- Booking success rate per session
- Integrate with Google Analytics

**4. Bulk Operations**:
- Import/export sessions (CSV, JSON)
- Duplicate session (for similar times)
- Bulk enable/disable

**5. Notifications**:
- Email admin when sessions updated
- Notify members of schedule changes

---

## Cost Analysis

| Item | Cost | Notes |
|------|------|-------|
| Netlify Functions | **$0** | Free tier: 125k requests/month |
| Netlify Hosting | **$0** | Free tier (already using) |
| GitHub API | **$0** | Free for public/private repos |
| Development Time | **2-3 hours** | One-time implementation |
| Maintenance | **~15 min/month** | Monitor, update as needed |
| **Total** | **$0** | Completely free |

**Netlify Free Tier Limits**:
- 125,000 function requests/month
- 100 GB bandwidth/month
- Estimated usage: <1,000 function requests/month (admin-only)

**Well within free tier limits!**

---

## Technical Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Netlify Function fails | High (can't update sessions) | Low | Fallback to defaults, git revert |
| Invalid session config breaks booking | High (members can't book) | Low | Validation on client + server, fallback |
| Password compromised | Medium (unauthorized changes) | Low | Strong password, HTTPS, change if compromised |
| sessions.json corrupted | Medium (booking page breaks) | Very Low | JSON validation, git history, defaults |
| Concurrent edits | Low (overwrite changes) | Very Low | Single admin, manual coordination |

**Overall Risk Level**: **Low** ✅

All high-impact risks have strong mitigations in place.

---

## Timeline

| Phase | Tasks | Time Estimate |
|-------|-------|--------------|
| **Phase 1** | Backend Setup (Netlify Function, sessions.json) | 30 minutes |
| **Phase 2** | Frontend UI (config.html, JavaScript, CSS) | 1 hour |
| **Phase 3** | Update book-a-boat.html (load from JSON) | 30 minutes |
| **Phase 4** | Testing (local + validation) | 30 minutes |
| **Phase 5** | Deployment (commit, push, verify) | 15 minutes |
| **Total** | **End-to-End Implementation** | **~2-3 hours** |

**Recommended Schedule**:
- Single session (2-3 hours)
- Or split across 2 sessions (1.5 hours each)

---

## References

**Netlify Functions**:
- [Netlify Functions Documentation](https://docs.netlify.com/functions/overview/)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)

**GitHub API** (for file commits):
- [GitHub REST API - Create/Update File](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents)

**Best Practices**:
- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [REST API Design](https://restfulapi.net/)

---

## Questions or Concerns?

**Q: What if the Netlify Function fails?**
A: Booking page falls back to hardcoded default sessions. Club operations continue uninterrupted.

**Q: How do I change the admin password?**
A: Update `ADMIN_PASSWORD` environment variable in Netlify dashboard. Takes effect immediately (no redeploy needed).

**Q: Can multiple admins edit simultaneously?**
A: Not recommended. Simple password = single admin workflow. For multi-user, upgrade to Netlify Identity later.

**Q: What if I delete all sessions by mistake?**
A: Validation prevents saving if no enabled sessions. Git history allows rollback.

**Q: Does this work after monorepo migration?**
A: Yes! Path updates needed but architecture unchanged.

---

**Status**: 📋 Ready for Implementation
**Last Updated**: 2025-12-14
**Author**: Claude AI (Senior Software Engineer)

**Related Documentation**:
- [docs/planning/roadmap.md](../planning/roadmap.md#configurable-session-times) - Roadmap item
- [BoatBooking/book-a-boat.html](../../BoatBooking/book-a-boat.html) - Current implementation
- [Netlify Functions Docs](https://docs.netlify.com/functions/overview/)
