# [A11] Interim Admin Configuration Page

## Context

Before onboarding a second club, club administrators need a self-service way to manage their settings. Currently, all configuration requires direct database access or CLI scripts — making the platform operator a human bottleneck for every change. The admin API endpoints already exist (A5); this plan adds a UI on top of them, and updates the booking board frontend to consume the config instead of using hardcoded values.

This effectively absorbs the display-related parts of [A10] (session times, boat grouping, sort order) since there's no point configuring values the frontend doesn't read.

---

## Architecture

**Pattern**: Pure static HTML + vanilla JS (no build process, matches existing `config.html` and `index.html`). The admin page calls existing admin API endpoints. One new backend endpoint is needed to read the full config for editing.

**Auth flow**: Login form -> `POST /api/v1/admin/login` -> JWT stored in `sessionStorage` -> all subsequent API calls include `Authorization: Bearer <token>`.

---

## Step 1: New Backend Endpoint — `GET /api/v1/admin/config`

**New file**: `packages/api/src/routes/admin/config.ts`

The existing public `GET /api/v1/config` only returns branding + one mode's displayConfig. The admin page needs all three config objects plus data source info for editing.

**Response shape**:
```json
{
  "success": true,
  "data": {
    "club": { "id", "name", "shortName", "subdomain", "timezone" },
    "branding": { "logoUrl", "primaryColor", "secondaryColor", "customCSS" },
    "displayConfig": { ... },
    "tvDisplayConfig": { ... },
    "dataSource": {
      "type": "revsport",
      "url": "https://...",
      "hasCredentials": true
    }
  }
}
```

- Reads from `req.club` (full club row from tenant middleware)
- Extracts `dataSourceConfig.url` without exposing encrypted credentials
- Sets `Cache-Control: no-store`

**Wire into router** in `packages/api/src/index.ts`:
- Import `createAdminConfigRouter`
- Mount on `adminReadRouter`: `adminReadRouter.use('/config', createAdminConfigRouter());`

---

## Step 2: Admin Page — Login + Tab Skeleton

**New file**: `apps/saas-server/public/admin.html`

Single-page app with login gate. After auth, shows tabbed interface:

| Tab | Purpose | API Used |
|-----|---------|----------|
| Dashboard | Scrape health, trigger sync | `GET /admin/status`, `POST /admin/sync` |
| Branding | Logo, colours | `PUT /admin/display` |
| Sessions | Session definitions, timezone, refresh | `PUT /admin/display` |
| Boat Display | Column grouping, sort order | `PUT /admin/display` |
| Booking URLs | bookingPageUrl, bookingBaseUrl | `PUT /admin/display` |
| Data Source | RevSport URL + credentials | `PUT /admin/credentials` |

**CSS**: Separate file `apps/saas-server/public/css/admin.css` to keep the HTML manageable. Style follows existing `config.html` conventions (card-based layout, same font stack, same colour palette).

**JS structure**: `AdminController` class (same pattern as `TVDisplayController`):
- `login(email, password)` / `logout()` / `checkTokenExpiry()`
- `loadConfig()` / `loadStatus()`
- `saveSection(section, data)` — generic save that calls `PUT /admin/display`
- `saveCredentials(data)` — calls `PUT /admin/credentials`
- `triggerSync()` — calls `POST /admin/sync`
- `switchTab(tabName)` — show/hide tab panels
- `showToast(message, type)` — success/error feedback

**API helper**: Wraps `fetch` with auto `Authorization` header, auto 401 -> logout, JSON parsing.

**Token management**: Store in `sessionStorage` (cleared on tab close). Auto-logout before expiry.

---

## Step 3: Dashboard Tab

**Displays** (from `GET /admin/status`):
- Last scrape: timestamp, status badge (green/red), duration, boat/booking counts
- 24h stats: success count, failure count, average duration
- Recent jobs table: last 10 jobs with timestamp, status, error

**Actions**:
- **Trigger Sync** button -> `POST /admin/sync`, show spinner and result
- **View Board** link -> opens `/` in new tab
- **View Board (TV)** link -> opens `/?mode=tv` in new tab

---

## Step 4: Branding Tab

**Fields**:
- **Logo URL** (text input, type="url") — with live `<img>` preview
- **Primary Colour** (`<input type="color">` + hex text input)
- **Secondary Colour** (`<input type="color">` + hex text input)
- **Custom CSS** (textarea, collapsible, max 10,000 chars)

**Save**: `PUT /admin/display` with `{ branding: { logoUrl, primaryColor, secondaryColor, customCSS } }`

---

## Step 5: Sessions & Display Tab

This is the key A10 integration — replacing hardcoded session times with config.

### Session definitions (dynamic list)

Each session row:
- **Label** (text, e.g. "Morning Session 1")
- **Short Label** (text, e.g. "AM1" — used in grid headers)
- **Start Time** (`<input type="time">`)
- **End Time** (`<input type="time">`)
- **Delete** button

Plus **Add Session** button.

### Other display settings
- **Timezone** (select: Australian timezones)
- **Days to Display** (number, 1-14)
- **Auto-Refresh Interval** (select: 1/2/5/10/15 min, stored in ms)

### Storage format in `displayConfig.sessions`:
```json
[
  { "id": "s1", "label": "Morning Session 1", "shortLabel": "AM1", "startTime": "06:30", "endTime": "07:30" },
  { "id": "s2", "label": "Morning Session 2", "shortLabel": "AM2", "startTime": "07:30", "endTime": "08:30" }
]
```

### Validation
- Start time < end time per session
- At least one session defined
- No duplicate short labels
- Warn (don't block) on overlapping times

**Save**: `PUT /admin/display` with `{ displayConfig: { sessions, timezone, daysToDisplay, refreshInterval } }`

---

## Step 6: Boat Display Tab

### Boat column groups

Simplified for the interim page: three standard groups with configurable names and classification rules.

**Fields per group**:
- **Group Name** (text, e.g. "Club Boats")
- **Classifications** (multi-select checkboxes: T, R, RT)
- **Category** (select: "race" or "tinnie")
- **Position** (Column 1 / Column 2 / Sub-section of Column 2)

Default matches current LMRC layout:
```json
{
  "boatGroups": [
    { "id": "col1", "name": "CLUB BOATS", "classifications": ["T", "RT"], "category": "race", "position": "column1" },
    { "id": "col2", "name": "RACE BOATS", "classifications": ["R"], "category": "race", "position": "column2" },
    { "id": "sub", "name": "TINNIES", "classifications": [], "category": "tinnie", "position": "column2-sub" }
  ]
}
```

### Boat type sort order

Numbered inputs for each type:
- 4X: 1, 2X: 2, 1X: 3 (default)
- Stored as `displayConfig.boatTypeSortOrder`: `[{ "type": "4X", "order": 1 }, ...]`

**Save**: `PUT /admin/display` with `{ displayConfig: { boatGroups, boatTypeSortOrder } }`

---

## Step 7: Booking URLs Tab

**Fields**:
- **Booking Page URL** (text, type="url") — opened when clicking a boat name. Help text explains purpose.
- **Booking Base URL** (text, type="url") — RevSport confirm URL base for click-to-book. Help text explains purpose.

**Save**: `PUT /admin/display` with `{ displayConfig: { bookingPageUrl, bookingBaseUrl } }`

---

## Step 8: Data Source Tab

**Fields**:
- **RevSport URL** (text, type="url")
- **Username** (text)
- **Password** (password) — never pre-filled, shows "Credentials configured" indicator based on `hasCredentials`

**Actions**:
- **Save Credentials** -> `PUT /admin/credentials` with `{ url, username, password }`
- **Test Connection** -> After save, calls `POST /admin/sync` to trigger a test scrape

---

## Step 9: Frontend Consumer Changes (A10 integration)

**File**: `apps/saas-server/public/js/tv-display.js`

### 9a. Session times from config

In `loadConfig()`, read `displayConfig.sessions` array:
```js
if (config?.sessions && Array.isArray(config.sessions)) {
  this.sessions = config.sessions;
}
```

Update `matchBookingToSession()` to iterate the sessions array instead of accessing `this.sessions.morning1` / `this.sessions.morning2` directly. Fall back to current hardcoded sessions if config doesn't define any.

Update `getBookingUrl()` to use the session array index for time lookup.

Update session header rendering to use `shortLabel` from config.

### 9b. Boat grouping from config

Update `splitBoatsByClassification()` to read `displayConfig.boatGroups`:
- If `boatGroups` defined in config, use it to classify boats
- Otherwise fall back to current hardcoded logic (T/RT -> club, R -> race, tinnie -> tinnies)

Update column title rendering: if config has group names, set `column-title` text content from config instead of hardcoded HTML.

### 9c. Sort order from config

Update sort function in `splitBoatsByClassification()`:
- If `displayConfig.boatTypeSortOrder` exists, build `typeOrder` from it
- Otherwise fall back to `{ '4X': 1, '2X': 2, '1X': 3 }`

### 9d. Days to display from config

Already reads `daysToDisplay` from config or defaults to 7. No change needed — verify it works.

---

## Files Summary

| File | Action | Purpose |
|------|--------|---------|
| `packages/api/src/routes/admin/config.ts` | **CREATE** | `GET /admin/config` — full editable config |
| `packages/api/src/index.ts` | **MODIFY** | Wire admin config route |
| `apps/saas-server/public/admin.html` | **CREATE** | Admin page (HTML + JS) |
| `apps/saas-server/public/css/admin.css` | **CREATE** | Admin page styles |
| `apps/saas-server/public/js/tv-display.js` | **MODIFY** | Read sessions/grouping/sort from config |

---

## Security Notes

- Admin page HTML is publicly accessible, but all API calls require JWT — the login form is the gate
- Token in `sessionStorage` (not `localStorage`) — cleared on tab close
- All user-supplied values rendered via `textContent` (not `innerHTML`) to prevent XSS
- Password field never pre-filled; only `hasCredentials` boolean exposed
- Existing CSRF protection: Bearer token auth is inherently CSRF-resistant

---

## Verification

1. **Login**: Navigate to `/admin.html`, enter email + password. Verify JWT is obtained and tabs appear.
2. **Dashboard**: Verify scrape status displays. Click Trigger Sync, verify it runs and status updates.
3. **Branding**: Change logo URL, verify preview updates. Save, refresh config.html, verify branding updated.
4. **Sessions**: Add/remove sessions, change times. Save. Reload booking board, verify session headers and booking-to-session matching use new times.
5. **Boat Display**: Change group names and classification rules. Save. Reload board, verify column titles and boat grouping match.
6. **Booking URLs**: Set URLs. Click a boat name on the board, verify it opens the configured URL.
7. **Data Source**: Update credentials. Test connection. Verify scrape succeeds.
8. **Token expiry**: Wait for token to expire (or shorten for testing). Verify auto-logout and redirect to login.
9. **TV mode unaffected**: Verify `/?mode=tv` still works and doesn't show admin controls.
