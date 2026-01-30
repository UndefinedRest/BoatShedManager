# Product Requirements Document (PRD)
## LMRC Boat Booking System - Admin Management Feature

---

## Document Information

| Field | Value |
|-------|-------|
| **Product** | LMRC Boat Booking System |
| **Feature** | Admin Management Panel with Firebase Backend |
| **Version** | 1.0 |
| **Status** | Draft - Awaiting Approval |
| **Date** | 2025-10-24 |
| **Owner** | Lake Macquarie Rowing Club |
| **Author** | Claude (AI Assistant) |

---

## 1. Overview

### 1.1 Background
The Lake Macquarie Rowing Club currently uses a static HTML booking system that allows members to book boats by redirecting to the RevSport booking platform. The boat data is stored in a JSON file that requires developer access and git commits to update.

### 1.2 Problem Statement
**Current Pain Points:**
1. Only developers can update boat information
2. No audit trail of who made changes
3. Configuration changes require code deployment
4. No access control on data files
5. Time-consuming process for simple updates (30+ minutes)

### 1.3 Objectives
Build an admin management system that:
- Allows authorized club members to manage boat data
- Provides secure authentication with Google accounts
- Maintains the existing simple booking experience
- Requires zero ongoing hosting costs
- Provides audit logging for all changes
- Takes < 2 minutes to update boat information

### 1.4 Success Criteria
- [ ] Admins can add/edit/delete boats without developer help
- [ ] Admins can update BASE_URL configuration
- [ ] Public booking flow remains unchanged
- [ ] Zero security incidents
- [ ] System uptime > 99.9%
- [ ] Monthly hosting cost = $0
- [ ] 90% reduction in developer time for data updates

---

## 2. User Personas

### 2.1 Primary Users

#### Persona 1: Club Administrator
- **Name:** Sarah (President)
- **Technical Skill:** Basic (can use Google Docs, email)
- **Goals:**
  - Update boat list when boats are added/removed/retired
  - Mark boats temporarily unavailable for maintenance
  - Update booking system URL if it changes
- **Frustrations:**
  - Currently must contact developer for simple changes
  - Changes take hours or days to implement
  - No visibility into who made past changes
- **Frequency:** 2-3 times per month

#### Persona 2: Club Member (Public User)
- **Name:** John (Member)
- **Technical Skill:** Basic (smartphone user)
- **Goals:**
  - Book a boat quickly
  - See available boats
  - Know boat weight limits
- **Frustrations:**
  - Wants booking to work on mobile
  - Needs it to be fast and simple
- **Frequency:** 2-10 times per month

#### Persona 3: Developer/Maintainer
- **Name:** Alex (IT Volunteer)
- **Technical Skill:** Advanced
- **Goals:**
  - Reduce maintenance burden
  - Ensure security
  - Enable self-service for club
- **Frustrations:**
  - Too many requests for simple data changes
  - Manual deployment process
  - No audit trail when issues occur
- **Frequency:** Currently weekly; Goal: monthly

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization

#### FR-1.1: Google OAuth Login
**Priority:** P0 (Must Have)
**User Story:** As an admin, I want to sign in with my Google account so that I don't need to manage another password.

**Acceptance Criteria:**
- [ ] Login page displays "Sign in with Google" button
- [ ] OAuth redirects to Google authentication
- [ ] After authentication, user redirected to admin panel
- [ ] Session persists for 30 days (configurable)
- [ ] "Sign out" button logs user out completely

**Technical Details:**
- Use Firebase Authentication with Google provider
- Store auth state in localStorage
- Implement auth state listener
- Redirect unauthenticated users to login page

#### FR-1.2: Admin Role Verification
**Priority:** P0 (Must Have)
**User Story:** As a system, I want to verify admin privileges so that only authorized users can modify data.

**Acceptance Criteria:**
- [ ] Only users with `admin: true` custom claim can access admin panel
- [ ] Non-admin authenticated users see "Access Denied" message
- [ ] Unauthenticated users redirected to login page
- [ ] Admin status checked on every page load
- [ ] Admin status verified by database security rules

**Technical Details:**
- Set custom claims via Admin SDK
- Check `request.auth.token.admin` in security rules
- Frontend checks auth state before rendering admin UI

#### FR-1.3: User Management Scripts
**Priority:** P0 (Must Have)
**User Story:** As a super admin, I want to grant/revoke admin access so that I can manage who can edit boat data.

**Acceptance Criteria:**
- [ ] Script to add admin: `node scripts/add-admin.js email@domain.com`
- [ ] Script to revoke admin: `node scripts/revoke-admin.js email@domain.com`
- [ ] Script to list admins: `node scripts/list-admins.js`
- [ ] Scripts validate email format
- [ ] Scripts provide clear success/error messages
- [ ] Scripts log actions to console

**Technical Details:**
- Use Firebase Admin SDK
- Require service account credentials
- Store credentials in `.env` file (not committed to git)

---

### 3.2 Boat Management

#### FR-2.1: View Boat List
**Priority:** P0 (Must Have)
**User Story:** As an admin, I want to see all boats in the system so that I can review and manage them.

**Acceptance Criteria:**
- [ ] Admin panel displays table of all boats
- [ ] Table shows: Boat ID, Name, Weight, Type, Category, Status
- [ ] Boats grouped by category (Club Boats, Race Boats)
- [ ] Boats sorted by type (Singles, Doubles, Quads)
- [ ] Inactive boats shown with visual indicator (grayed out)
- [ ] Table is responsive on mobile devices

**Technical Details:**
- Fetch from Firestore `/boats` collection
- Real-time updates using `.onSnapshot()`
- Use CSS Grid or Flexbox for responsive layout

#### FR-2.2: Add New Boat
**Priority:** P0 (Must Have)
**User Story:** As an admin, I want to add a new boat so that members can book it.

**Acceptance Criteria:**
- [ ] "Add Boat" button opens modal/form
- [ ] Form fields: Boat ID (required), Name (required), Weight (optional), Type (dropdown), Category (dropdown)
- [ ] Boat ID must be unique (validation)
- [ ] Form validates all required fields
- [ ] Success message displayed after save
- [ ] New boat immediately visible in list
- [ ] Action logged to audit log

**Technical Details:**
- Create document in `/boats/{boatId}`
- Check for duplicate ID before saving
- Add metadata: createdAt, createdBy, active: true
- Use Firestore transaction for atomicity

#### FR-2.3: Edit Boat
**Priority:** P0 (Must Have)
**User Story:** As an admin, I want to edit boat details so that I can correct errors or update information.

**Acceptance Criteria:**
- [ ] "Edit" button on each boat row
- [ ] Form pre-populated with current values
- [ ] Cannot change Boat ID (disabled field)
- [ ] Can update: Name, Weight, Type, Category, Active status
- [ ] "Cancel" button discards changes
- [ ] "Save" button commits changes
- [ ] Success message displayed
- [ ] Changes immediately visible in list
- [ ] Action logged to audit log with before/after values

**Technical Details:**
- Update document in `/boats/{boatId}`
- Add metadata: updatedAt, updatedBy
- Log changes to `/admin_logs` collection

#### FR-2.4: Delete Boat
**Priority:** P1 (Should Have)
**User Story:** As an admin, I want to delete boats so that retired boats don't clutter the system.

**Acceptance Criteria:**
- [ ] "Delete" button on each boat row
- [ ] Confirmation dialog: "Are you sure? This cannot be undone."
- [ ] "Soft delete" option: marks boat as inactive instead of deleting
- [ ] "Hard delete" option: permanently removes boat (requires extra confirmation)
- [ ] Success message displayed
- [ ] Deleted boat removed from list (or grayed out if soft delete)
- [ ] Action logged to audit log

**Technical Details:**
- Soft delete: Update `active: false`
- Hard delete: Use Firestore `.delete()`
- Consider adding `deletedAt` and `deletedBy` fields for soft deletes

#### FR-2.5: Bulk Import Boats
**Priority:** P2 (Nice to Have)
**User Story:** As an admin, I want to import multiple boats from CSV so that I can quickly migrate existing data.

**Acceptance Criteria:**
- [ ] "Import CSV" button
- [ ] File upload dialog
- [ ] CSV format: BoatID, Name, Weight, Type, Category
- [ ] Preview import before committing
- [ ] Validation of all rows
- [ ] Error report for invalid rows
- [ ] Success count displayed
- [ ] All imports logged to audit log

**Technical Details:**
- Use File API to read CSV
- Parse with PapaParse or similar library
- Batch write to Firestore (max 500 per batch)

---

### 3.3 Configuration Management

#### FR-3.1: View Configuration
**Priority:** P0 (Must Have)
**User Story:** As an admin, I want to view current configuration so that I know what settings are active.

**Acceptance Criteria:**
- [ ] "Configuration" tab in admin panel
- [ ] Display current BASE_URL
- [ ] Display session configuration (times, labels)
- [ ] Display club name and branding settings
- [ ] Read-only view by default
- [ ] "Edit" button to enable editing

**Technical Details:**
- Fetch from Firestore `/config/settings` document
- Display in structured format (not raw JSON)

#### FR-3.2: Edit Configuration
**Priority:** P0 (Must Have)
**User Story:** As an admin, I want to update the BASE_URL so that bookings redirect to the correct system.

**Acceptance Criteria:**
- [ ] "Edit Configuration" button
- [ ] Form with editable fields: BASE_URL, Club Name
- [ ] URL validation (must start with https://)
- [ ] "Cancel" button discards changes
- [ ] "Save" button commits changes
- [ ] Success message displayed
- [ ] Changes take effect immediately on public booking page
- [ ] Action logged to audit log

**Technical Details:**
- Update `/config/settings` document
- Add metadata: updatedAt, updatedBy
- Validate URL format before saving

#### FR-3.3: Session Management
**Priority:** P1 (Should Have)
**User Story:** As an admin, I want to update booking session times so that the booking page reflects current club hours.

**Acceptance Criteria:**
- [ ] List all configured sessions
- [ ] Add new session: label, start time, end time, display text
- [ ] Edit existing session
- [ ] Delete session with confirmation
- [ ] Reorder sessions (drag and drop)
- [ ] Changes immediately reflected on booking page
- [ ] Action logged to audit log

**Technical Details:**
- Store sessions array in `/config/settings`
- Use array of objects: `{ label, startTime, endTime, display }`
- Update book-a-boat.html to fetch from Firestore

---

### 3.4 Audit Logging

#### FR-4.1: Log All Admin Actions
**Priority:** P0 (Must Have)
**User Story:** As a super admin, I want to see who made changes and when so that I can troubleshoot issues and maintain accountability.

**Acceptance Criteria:**
- [ ] Every create/update/delete action logged
- [ ] Log entry includes: timestamp, user email, action type, resource ID, before/after values
- [ ] Logs stored in Firestore (not just console)
- [ ] Logs retained for 90 days minimum
- [ ] Logs cannot be deleted by regular admins

**Technical Details:**
- Write to `/admin_logs/{autoId}` collection
- Structure: `{ timestamp, userId, userEmail, action, resourceType, resourceId, before, after }`
- Security rule: only admins can read, only system can write

#### FR-4.2: View Audit Log
**Priority:** P1 (Should Have)
**User Story:** As a super admin, I want to view audit logs so that I can review recent changes.

**Acceptance Criteria:**
- [ ] "Audit Log" tab in admin panel
- [ ] Table showing: Date/Time, User, Action, Resource
- [ ] Filter by: date range, user, action type
- [ ] Paginated (20 entries per page)
- [ ] Click entry to see full before/after details
- [ ] Export to CSV option

**Technical Details:**
- Query Firestore `/admin_logs` ordered by timestamp descending
- Use Firestore query filters for date/user
- Implement pagination with `.startAfter()`

---

### 3.5 Public Booking Interface

#### FR-5.1: Load Boats from Firestore
**Priority:** P0 (Must Have)
**User Story:** As a club member, I want to see current boat information so that I can book the right boat.

**Acceptance Criteria:**
- [ ] book-a-boat.html fetches boat data from Firestore
- [ ] Only active boats displayed
- [ ] Boat name includes weight class (e.g., "Jono Hunter (90kg)")
- [ ] Fallback message if boat not found: "Book this boat"
- [ ] Page loads in < 2 seconds
- [ ] Works on all modern browsers (Chrome, Firefox, Safari, Edge)

**Technical Details:**
- Use Firebase SDK in book-a-boat.html
- Query `/boats/{boatId}` where `active == true`
- Cache boat data in sessionStorage for performance

#### FR-5.2: Load Configuration from Firestore
**Priority:** P0 (Must Have)
**User Story:** As a club member, I want bookings to redirect to the correct URL so that my booking is processed.

**Acceptance Criteria:**
- [ ] book-a-boat.html fetches BASE_URL from Firestore
- [ ] Session times loaded from Firestore
- [ ] Fallback to defaults if Firestore unavailable
- [ ] No visible change to user experience
- [ ] Page still loads fast (< 2 seconds)

**Technical Details:**
- Fetch `/config/settings` document
- Use BASE_URL for booking redirects
- Generate session buttons from sessions array

#### FR-5.3: Maintain Existing Functionality
**Priority:** P0 (Must Have)
**User Story:** As a club member, I want the booking flow to work exactly as before so that I'm not confused.

**Acceptance Criteria:**
- [ ] URL parameters still work: `?boat_id=6283`
- [ ] Date picker defaults to today (or tomorrow after 12pm)
- [ ] Session buttons work as before
- [ ] "See current bookings" link still works
- [ ] Redirect to RevSport still works
- [ ] Mobile responsive layout maintained
- [ ] All existing styling preserved

**Technical Details:**
- Minimal changes to book-a-boat.html
- Replace hardcoded data with Firestore fetches
- Keep all existing UI/UX unchanged

---

## 4. Non-Functional Requirements

### 4.1 Performance

#### NFR-1.1: Page Load Time
- **Requirement:** Public booking page loads in < 2 seconds on 3G connection
- **Measurement:** Chrome Lighthouse performance score > 90
- **Implementation:** Firebase CDN, code minification, lazy loading

#### NFR-1.2: Admin Panel Responsiveness
- **Requirement:** Admin actions complete in < 1 second
- **Measurement:** Time from button click to success message
- **Implementation:** Optimistic UI updates, Firestore real-time sync

#### NFR-1.3: Database Query Performance
- **Requirement:** Firestore queries return in < 500ms
- **Measurement:** Firebase Performance Monitoring
- **Implementation:** Proper indexing, query optimization

### 4.2 Security

#### NFR-2.1: Authentication
- **Requirement:** Only Google-authenticated users with admin claims can access admin panel
- **Measurement:** Manual penetration testing
- **Implementation:** Firebase Auth + custom claims + security rules

#### NFR-2.2: Data Access Control
- **Requirement:** Firestore security rules prevent unauthorized writes
- **Measurement:** Firebase Emulator security rules testing
- **Implementation:** Comprehensive security rules with unit tests

#### NFR-2.3: XSS Protection
- **Requirement:** No cross-site scripting vulnerabilities
- **Measurement:** OWASP ZAP scan
- **Implementation:** Content Security Policy headers, input sanitization

#### NFR-2.4: HTTPS Only
- **Requirement:** All traffic encrypted with TLS 1.2+
- **Measurement:** SSL Labs test
- **Implementation:** Firebase Hosting (automatic HTTPS)

### 4.3 Reliability

#### NFR-3.1: Uptime
- **Requirement:** 99.9% uptime (< 8.76 hours downtime per year)
- **Measurement:** Firebase Status Dashboard
- **Implementation:** Firebase SLA (99.95%), multi-region replication

#### NFR-3.2: Data Durability
- **Requirement:** Zero data loss
- **Measurement:** Firestore replication status
- **Implementation:** Firestore automatic replication (3+ regions)

#### NFR-3.3: Error Handling
- **Requirement:** Graceful degradation when services unavailable
- **Measurement:** Manual testing with network throttling
- **Implementation:** Try-catch blocks, fallback messages, offline detection

### 4.4 Usability

#### NFR-4.1: Mobile Responsive
- **Requirement:** Admin panel usable on screens ≥ 360px wide
- **Measurement:** Manual testing on iPhone SE, iPad, desktop
- **Implementation:** CSS media queries, responsive grid

#### NFR-4.2: Accessibility
- **Requirement:** WCAG 2.1 Level AA compliance
- **Measurement:** WAVE accessibility checker
- **Implementation:** Semantic HTML, ARIA labels, keyboard navigation

#### NFR-4.3: Browser Compatibility
- **Requirement:** Works on last 2 versions of Chrome, Firefox, Safari, Edge
- **Measurement:** BrowserStack testing
- **Implementation:** Modern JavaScript (ES6+), Firebase SDK handles compatibility

### 4.5 Maintainability

#### NFR-5.1: Code Quality
- **Requirement:** Clean, documented, maintainable code
- **Measurement:** Code review
- **Implementation:** Comments, consistent naming, modular structure

#### NFR-5.2: Deployment Process
- **Requirement:** One-command deployment
- **Measurement:** Deployment time < 5 minutes
- **Implementation:** Firebase CLI: `firebase deploy`

#### NFR-5.3: Monitoring
- **Requirement:** Error tracking and performance monitoring
- **Measurement:** Firebase Console dashboards
- **Implementation:** Firebase Performance, Firebase Crashlytics

### 4.6 Cost

#### NFR-6.1: Hosting Cost
- **Requirement:** $0 monthly hosting cost
- **Measurement:** Firebase usage dashboard
- **Implementation:** Stay within free tier limits (monitored)

#### NFR-6.2: Scaling Cost
- **Requirement:** Predictable costs if club grows
- **Measurement:** Firebase pricing calculator
- **Implementation:** Usage alerts at 80% of free tier

---

## 5. User Interface Specifications

### 5.1 Admin Login Page (`/admin/login.html`)

#### Layout
```
┌─────────────────────────────────────┐
│                                     │
│            🚣 LMRC Logo            │
│                                     │
│      Boat Booking Admin Panel       │
│                                     │
│   ┌───────────────────────────┐    │
│   │  Sign in with Google  🔐  │    │
│   └───────────────────────────┘    │
│                                     │
│   Only authorized club members      │
│                                     │
└─────────────────────────────────────┘
```

#### Elements
- Club logo (centered)
- "Boat Booking Admin Panel" heading
- Google Sign-in button (Firebase UI)
- Help text: "Only authorized club members"
- Footer with link to public booking page

### 5.2 Admin Panel - Boat Management (`/admin/index.html`)

#### Navigation Tabs
- **Boats** (default)
- **Configuration**
- **Audit Log**
- **Sign Out** (right-aligned)

#### Boats Tab Layout
```
┌──────────────────────────────────────────────────────────┐
│  Boats                   [+ Add Boat]  [Import CSV]      │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  CLUB BOATS - SINGLES                                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ID    │ Name          │ Weight │ [Edit] [Delete]  │ │
│  │ 6283  │ Jono Hunter   │ 90kg   │ [Edit] [Delete]  │ │
│  │ 6280  │ Go for Gold   │ -      │ [Edit] [Delete]  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  CLUB BOATS - DOUBLES                                    │
│  ┌────────────────────────────────────────────────────┐ │
│  │ ID    │ Name          │ Weight │ [Edit] [Delete]  │ │
│  │ 6277  │ Better Trans..│ 85kg   │ [Edit] [Delete]  │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  [More sections...]                                      │
└──────────────────────────────────────────────────────────┘
```

#### Add/Edit Boat Modal
```
┌──────────────────────────────────────┐
│  Add New Boat                    [×] │
├──────────────────────────────────────┤
│                                      │
│  Boat ID: [________] *Required       │
│  Name:    [________] *Required       │
│  Weight:  [________] (e.g., 90kg)    │
│  Type:    [Dropdown ▼]               │
│           - Single                   │
│           - Double                   │
│           - Quad                     │
│  Category:[Dropdown ▼]               │
│           - Club Boat                │
│           - Race Boat                │
│  Active:  [☑] Active                 │
│                                      │
│     [Cancel]         [Save Boat]     │
└──────────────────────────────────────┘
```

### 5.3 Admin Panel - Configuration Tab

```
┌──────────────────────────────────────────────────────────┐
│  Configuration                              [Edit]       │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Booking System URL                                      │
│  https://www.lakemacquarierowingclub.org.au/bookings/... │
│                                                          │
│  Club Name                                               │
│  Lake Macquarie Rowing Club                              │
│                                                          │
│  ──────────────────────────────────────────────────      │
│                                                          │
│  Booking Sessions                                        │
│  1. Morning Session 1 (6:30 AM - 7:30 AM)  [Edit] [×]   │
│  2. Morning Session 2 (7:30 AM - 8:30 AM)  [Edit] [×]   │
│                                                          │
│  [+ Add Session]                                         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 5.4 Admin Panel - Audit Log Tab

```
┌──────────────────────────────────────────────────────────┐
│  Audit Log                                               │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  Filters:                                                │
│  Date: [Last 7 days ▼]  User: [All ▼]  Action: [All ▼] │
│                                                          │
│  ┌────────────────────────────────────────────────────┐ │
│  │ Date/Time   │ User            │ Action      │ ...  │ │
│  │ 2025-10-24  │ admin@lmrc.org  │ Updated     │ View │ │
│  │ 14:23       │                 │ Boat #6283  │      │ │
│  │ 2025-10-24  │ admin@lmrc.org  │ Added       │ View │ │
│  │ 12:15       │                 │ Boat #6277  │      │ │
│  └────────────────────────────────────────────────────┘ │
│                                                          │
│  Showing 1-20 of 145     [Previous] [Next] [Export CSV] │
└──────────────────────────────────────────────────────────┘
```

### 5.5 Public Booking Page (Minimal Changes)

**Changes:**
- No visual changes
- Boat name loaded from Firestore
- BASE_URL loaded from Firestore
- Sessions loaded from Firestore

**Everything else stays the same:**
- Same styling
- Same layout
- Same booking flow
- Same mobile responsiveness

---

## 6. Data Model

### 6.1 Firestore Collections

#### Collection: `boats`
**Document ID:** `{boatId}` (e.g., "6283")

```javascript
{
  // Required fields
  "name": "Jono Hunter",          // string
  "type": "Single",                // enum: "Single" | "Double" | "Quad" | "Other"
  "category": "Club Boat",         // enum: "Club Boat" | "Race Boat"
  "active": true,                  // boolean

  // Optional fields
  "weight": "90kg",                // string (optional)
  "description": "",               // string (optional)
  "imageUrl": "",                  // string (optional, future feature)

  // Metadata
  "createdAt": Timestamp,          // auto-generated
  "createdBy": "admin@lmrc.org",   // from auth
  "updatedAt": Timestamp,          // auto-generated
  "updatedBy": "admin@lmrc.org"    // from auth
}
```

**Indexes:**
- `category` (ascending) + `type` (ascending) + `name` (ascending)
- `active` (ascending)

#### Collection: `config`
**Document ID:** `settings` (singleton document)

```javascript
{
  // Booking configuration
  "baseUrl": "https://www.lakemacquarierowingclub.org.au/bookings/confirm",
  "clubName": "Lake Macquarie Rowing Club",
  "clubLogoUrl": "https://cdn.revolutionise.com.au/logos/...",

  // Session configuration
  "sessions": [
    {
      "label": "Morning Session 1",
      "startTime": "06:30",
      "endTime": "07:30",
      "display": "6:30 AM - 7:30 AM"
    },
    {
      "label": "Morning Session 2",
      "startTime": "07:30",
      "endTime": "08:30",
      "display": "7:30 AM - 8:30 AM"
    }
  ],

  // Metadata
  "updatedAt": Timestamp,
  "updatedBy": "admin@lmrc.org"
}
```

#### Collection: `admin_logs`
**Document ID:** Auto-generated

```javascript
{
  "timestamp": Timestamp,
  "userId": "AbCdEf123...",           // Firebase Auth UID
  "userEmail": "admin@lmrc.org",
  "action": "update_boat",             // enum: create_boat | update_boat | delete_boat | update_config
  "resourceType": "boat",              // enum: boat | config
  "resourceId": "6283",

  // Change tracking
  "before": {                          // snapshot before change (null for create)
    "name": "Jono Hunter",
    "weight": "85kg"
  },
  "after": {                           // snapshot after change (null for delete)
    "name": "Jono Hunter",
    "weight": "90kg"
  }
}
```

**Indexes:**
- `timestamp` (descending)
- `userEmail` (ascending) + `timestamp` (descending)
- `action` (ascending) + `timestamp` (descending)

---

## 7. Technical Stack

### 7.1 Frontend
- **HTML5** - Semantic markup
- **CSS3** - Styling (existing styles maintained)
- **JavaScript (ES6+)** - Client-side logic
- **Firebase SDK 10.x** - Authentication, Firestore client

### 7.2 Backend
- **Firebase Authentication** - Google OAuth provider
- **Cloud Firestore** - NoSQL database
- **Firebase Hosting** - Static file hosting + CDN
- **Firebase Admin SDK** - User management scripts (Node.js)

### 7.3 Development Tools
- **Firebase CLI** - Deployment and emulator
- **Firebase Emulator Suite** - Local testing
- **Git** - Version control
- **VSCode** - Code editor

### 7.4 Dependencies
```json
{
  "firebase": "^10.7.0",           // Frontend SDK
  "firebase-admin": "^12.0.0",     // Backend admin scripts
  "dotenv": "^16.0.3"              // Environment variables
}
```

---

## 8. Security Requirements

### 8.1 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function isAdmin() {
      return isAuthenticated() && request.auth.token.admin == true;
    }

    function isValidBoat() {
      return request.resource.data.name is string &&
             request.resource.data.type in ["Single", "Double", "Quad", "Other"] &&
             request.resource.data.category in ["Club Boat", "Race Boat"] &&
             request.resource.data.active is bool;
    }

    // Boats collection
    match /boats/{boatId} {
      // Anyone can read active boats
      allow read: if true;

      // Only admins can create/update/delete
      allow create: if isAdmin() && isValidBoat();
      allow update: if isAdmin() && isValidBoat();
      allow delete: if isAdmin();
    }

    // Config collection
    match /config/{document} {
      // Anyone can read config
      allow read: if true;

      // Only admins can update
      allow update: if isAdmin();
      allow create, delete: if false;  // Prevent accidental deletion
    }

    // Admin logs collection
    match /admin_logs/{logId} {
      // Only admins can read logs
      allow read: if isAdmin();

      // Only system can write logs (via cloud functions in future)
      // For now, admins can write
      allow create: if isAdmin();
      allow update, delete: if false;  // Logs are immutable
    }
  }
}
```

### 8.2 Authentication Flow

```
1. User visits /admin/login.html
2. Clicks "Sign in with Google"
3. Firebase redirects to Google OAuth
4. User authenticates with Google
5. Google redirects back to app with token
6. Firebase verifies token
7. App checks if user has admin custom claim
   - YES: Redirect to /admin/index.html
   - NO: Show "Access Denied" message
8. Admin panel loads, user can manage data
9. All Firestore operations validated by security rules
```

### 8.3 Custom Claims Management

**Setting Admin Claim:**
```javascript
// scripts/add-admin.js
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require('./service-account.json'))
});

async function addAdmin(email) {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { admin: true });
    console.log(`✅ ${email} is now an admin`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

addAdmin(process.argv[2]);
```

**Revoking Admin Claim:**
```javascript
// scripts/revoke-admin.js
await admin.auth().setCustomUserClaims(user.uid, { admin: false });
```

---

## 9. Testing Strategy

### 9.1 Unit Tests
- [ ] Firestore security rules (Firebase Emulator)
- [ ] Input validation functions
- [ ] Data transformation functions

### 9.2 Integration Tests
- [ ] Admin login flow
- [ ] Create/read/update/delete boats
- [ ] Update configuration
- [ ] Audit log creation

### 9.3 Manual Testing
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)
- [ ] Mobile responsiveness (iPhone, Android, iPad)
- [ ] Accessibility (keyboard navigation, screen reader)
- [ ] Performance (Lighthouse audit)

### 9.4 Security Testing
- [ ] Penetration testing (unauthenticated access attempts)
- [ ] Security rules testing (Firebase Emulator)
- [ ] XSS vulnerability scanning
- [ ] HTTPS enforcement

### 9.5 User Acceptance Testing
- [ ] Club admin can add/edit/delete boats without help
- [ ] Club admin can update BASE_URL
- [ ] Public booking flow unchanged
- [ ] Mobile experience acceptable

---

## 10. Deployment Plan

### 10.1 Environment Setup

**Development:**
- Firebase Emulator Suite (local)
- Test data
- `.env.development` config

**Staging:**
- Firebase project: `lmrc-booking-staging`
- Subset of real data
- Test admin accounts
- URL: `lmrc-booking-staging.web.app`

**Production:**
- Firebase project: `lmrc-booking-prod`
- Real data
- Real admin accounts
- Custom domain (optional): `bookings.lakemacquarierowingclub.org.au`

### 10.2 Deployment Steps

**Initial Setup (One-time):**
1. Create Firebase projects (staging + production)
2. Enable Google OAuth provider
3. Initialize Firebase in codebase: `firebase init`
4. Deploy security rules: `firebase deploy --only firestore:rules`
5. Migrate data from boats.json to Firestore
6. Create first admin user
7. Test in staging environment
8. Deploy to production

**Ongoing Deployments:**
```bash
# Deploy everything
firebase deploy

# Deploy only hosting
firebase deploy --only hosting

# Deploy only security rules
firebase deploy --only firestore:rules
```

### 10.3 Rollback Plan
```bash
# List recent deployments
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:rollback
```

---

## 11. Monitoring & Maintenance

### 11.1 Monitoring
- **Firebase Console** - Usage metrics, errors
- **Firebase Performance Monitoring** - Page load times, API latency
- **Firestore Usage Dashboard** - Read/write operations, storage
- **Authentication Dashboard** - Sign-ins, failures

### 11.2 Alerts
- Email alert when Firestore usage exceeds 80% of free tier
- Email alert when authentication failures spike
- Error tracking for unhandled exceptions

### 11.3 Maintenance Tasks
- **Weekly:** Review audit logs for unusual activity
- **Monthly:** Check Firebase usage against free tier limits
- **Quarterly:** Review user list, remove inactive admins
- **Annually:** Security review, dependency updates

---

## 12. Documentation Deliverables

### 12.1 Admin User Guide
- How to log in
- How to add/edit/delete boats
- How to update configuration
- How to view audit logs
- Troubleshooting common issues

### 12.2 Developer Guide
- Architecture overview
- Local development setup
- How to deploy
- How to add admin users
- Security rules explanation
- Firestore data model

### 12.3 Operations Guide
- How to monitor usage
- How to respond to alerts
- How to restore from backup
- How to update Firebase configuration
- Emergency contact information

---

## 13. Success Metrics & KPIs

### 13.1 Launch Criteria (Must achieve before production)
- [ ] All P0 requirements implemented
- [ ] Security rules tested and verified
- [ ] At least 2 admins trained
- [ ] User acceptance testing complete
- [ ] Performance meets requirements (< 2s load time)
- [ ] Zero critical bugs

### 13.2 Post-Launch Metrics (Track for 30 days)

**Technical Metrics:**
- Uptime: Target > 99.9%
- Page load time: Target < 2 seconds
- API response time: Target < 500ms
- Error rate: Target < 0.1%
- Monthly cost: Target $0

**User Metrics:**
- Admin login success rate: Target > 95%
- Time to update boat: Target < 2 minutes
- Admin satisfaction: Target > 4/5
- Support tickets: Target < 2 per month

**Business Metrics:**
- Developer time saved: Target 90% reduction
- Data update frequency: Expected increase from 2x/month to 5x/month
- Data accuracy: Target 100% (no stale boats)

---

## 14. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|------------|-----------|
| Firebase outage | High | Very Low | 99.95% SLA; Multiple regions; Monitor status page |
| Cost overrun | Medium | Low | Usage alerts; Free tier monitoring; Budget caps |
| Unauthorized access | High | Very Low | Google OAuth; Security rules; Audit logging |
| Data loss | High | Very Low | Firestore auto-replication; Export backups monthly |
| Admin lockout | Medium | Medium | Multiple admins; Firebase support; Owner access |
| User confusion | Low | Medium | Training; Documentation; Simple UI |
| Browser incompatibility | Low | Low | Test major browsers; Use standard Firebase SDK |
| Slow performance | Medium | Low | Firebase CDN; Lighthouse monitoring; Optimize queries |

---

## 15. Open Questions & Decisions

### 15.1 Awaiting Decision
- [ ] **Custom domain:** Use custom domain or Firebase subdomain?
- [ ] **Admin count:** How many admins initially? (Recommended: 2-3)
- [ ] **Session times:** Confirm current booking session times
- [ ] **Branding:** Any changes to logo/colors during migration?

### 15.2 Future Enhancements (Not in MVP)
- [ ] Boat images/photos
- [ ] Maintenance scheduling
- [ ] Booking analytics dashboard
- [ ] Email notifications for changes
- [ ] Mobile app version
- [ ] Direct booking (replace RevSport integration)

---

## 16. Appendices

### 16.1 Glossary
- **Admin:** Authorized club member who can edit boat data
- **Custom Claim:** Firebase Auth metadata used for authorization
- **Firestore:** Google's NoSQL cloud database
- **OAuth:** Authentication protocol (used with Google accounts)
- **RevSport:** External booking system currently used by LMRC
- **Security Rules:** Database-level access control in Firestore
- **Soft Delete:** Marking record inactive instead of deleting

### 16.2 References
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules Guide](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Hosting Guide](https://firebase.google.com/docs/hosting)
- [Firebase Pricing](https://firebase.google.com/pricing)

### 16.3 Change Log

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-10-24 | Claude | Initial PRD created |

---

**Approval Signatures:**

- [ ] Product Owner: ___________________ Date: ___________
- [ ] Technical Lead: ___________________ Date: ___________
- [ ] Security Review: ___________________ Date: ___________

---

**End of Product Requirements Document**
