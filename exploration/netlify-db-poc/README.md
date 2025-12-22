# Netlify DB Proof of Concept

**Status:** 🚧 In Progress
**Created:** 2025-12-21
**Purpose:** Validate Netlify DB (Neon PostgreSQL) for configurable session times feature

---

## 🎯 Objective

Prove that **Netlify DB can solve the persistent storage problem** that caused the previous configurable session times rollback.

### What We're Testing

1. ✅ Can Netlify Functions write to Netlify DB? (Previous attempts failed with read-only filesystem)
2. ✅ Does data persist across deployments? (Not just environment variables)
3. ✅ Is the setup simple enough for production use?
4. ✅ Does it work on Netlify's free tier?
5. ✅ Can we reuse the config.html UI from previous attempt?

---

## 📁 Project Structure

```
netlify-db-poc/
├── index.html                    # Test booking page (loads sessions from DB)
├── config.html                   # Admin interface (edit sessions)
├── schema.sql                    # Database schema (PostgreSQL)
├── package.json                  # Dependencies (@netlify/neon)
├── netlify.toml                  # Netlify configuration
├── netlify/functions/
│   ├── sessions.js               # GET/POST sessions API
│   └── test-connection.js        # DB connection test
└── README.md                     # This file
```

---

## 🚀 Setup Instructions

### Prerequisites

- Node.js 20.12.2 or later
- Netlify CLI: `npm install -g netlify-cli`
- Git (for deployment)

### Local Development

#### 1. Install Dependencies

```bash
cd exploration/netlify-db-poc
npm install
```

#### 2. Initialize Netlify DB

```bash
netlify db init
```

This will:
- Provision a Neon PostgreSQL database
- Auto-configure `DATABASE_URL` environment variable
- Create database connection

#### 3. Run Database Schema

After database is provisioned, run the schema to create tables:

```bash
# Option 1: Use Neon console (https://console.neon.com)
# Copy/paste schema.sql into SQL Editor

# Option 2: Use psql (if you have it installed)
psql $DATABASE_URL -f schema.sql
```

#### 4. Set Admin Password

```bash
netlify env:set ADMIN_PASSWORD "your-password-here"
```

#### 5. Start Dev Server

```bash
netlify dev
```

Server will start at: http://localhost:8888

---

## 🧪 Testing Checklist

### Phase 1: Database Connection

- [ ] **Visit:** http://localhost:8888/.netlify/functions/test-connection
- [ ] **Verify:** Returns success with database info
- [ ] **Check:** Shows PostgreSQL version, table count, session count

**Expected Response:**
```json
{
  "success": true,
  "message": "Netlify DB connection successful",
  "database": {
    "currentTime": "2025-12-21T...",
    "postgresVersion": "PostgreSQL 16.x...",
    "tables": ["sessions", "metadata"],
    "sessionCount": 2
  }
}
```

### Phase 2: Read Sessions (GET)

- [ ] **Visit:** http://localhost:8888/.netlify/functions/sessions
- [ ] **Verify:** Returns default sessions from database
- [ ] **Check:** Shows 2 sessions (6:30-7:30, 7:30-8:30)

**Expected Response:**
```json
{
  "sessions": [
    {
      "id": "session-1",
      "label": "Morning Session 1",
      "startTime": "06:30",
      "endTime": "07:30",
      "display": "6:30 AM - 7:30 AM",
      "enabled": true,
      "sortOrder": 1
    },
    ...
  ],
  "metadata": {
    "lastModified": "...",
    "modifiedBy": "system",
    "version": 1
  }
}
```

### Phase 3: Booking Page Test

- [ ] **Visit:** http://localhost:8888/
- [ ] **Verify:** Shows session buttons loaded from database
- [ ] **Check:** Metadata shows version, last modified
- [ ] **Test:** Click session button (shows alert)

### Phase 4: Admin Interface

- [ ] **Visit:** http://localhost:8888/config.html
- [ ] **Login:** Use password you set in env vars
- [ ] **Verify:** Shows current sessions
- [ ] **Edit:** Change a session label
- [ ] **Save:** Click "Save to DB"
- [ ] **Verify:** Success message appears

### Phase 5: Persistence Test

- [ ] **Refresh:** Reload config.html
- [ ] **Verify:** Your changes are still there (loaded from DB)
- [ ] **Reload:** Reload index.html (booking page)
- [ ] **Verify:** Changed session appears on booking page

### Phase 6: Write Test (POST)

**Using curl:**

```bash
curl -X POST http://localhost:8888/.netlify/functions/sessions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_PASSWORD" \
  -d '{
    "sessions": [
      {
        "id": "session-1",
        "label": "Test Session",
        "startTime": "10:00",
        "endTime": "11:00",
        "display": "10:00 AM - 11:00 AM",
        "enabled": true,
        "sortOrder": 1
      }
    ]
  }'
```

- [ ] **Verify:** Returns `{"success": true}`
- [ ] **Reload:** http://localhost:8888/
- [ ] **Verify:** Shows updated session

---

## 🌐 Deployment Testing

### Deploy to Netlify

#### 1. Create New Netlify Site

```bash
cd exploration/netlify-db-poc
netlify init
```

Follow prompts to create new site.

#### 2. Initialize Netlify DB for Production

```bash
netlify db init --prod
```

#### 3. Claim Database

**Important:** You must claim the database within 7 days or it will be deleted!

1. Go to Netlify Dashboard → Extensions → Neon database
2. Click "Connect Neon" and set up Neon account
3. Click "Claim database"

#### 4. Run Schema on Production Database

Get production database URL:

```bash
netlify env:get DATABASE_URL
```

Run schema:
```bash
psql "<production-database-url>" -f schema.sql
```

#### 5. Set Production Environment Variables

```bash
netlify env:set ADMIN_PASSWORD "your-production-password" --context production
```

#### 6. Deploy

```bash
netlify deploy --prod
```

#### 7. Test Production

- [ ] Visit: `https://your-site.netlify.app/.netlify/functions/test-connection`
- [ ] Visit: `https://your-site.netlify.app/`
- [ ] Visit: `https://your-site.netlify.app/config.html`
- [ ] Test editing and saving sessions
- [ ] Verify changes persist

---

## 📊 Success Criteria

### ✅ POC is Successful If:

1. **Database Connection Works**
   - Functions can connect to Netlify DB
   - No "MissingBlobsEnvironmentError" (like Blobs attempt)
   - No "ENOENT" file errors (like filesystem attempt)

2. **Read/Write Operations Work**
   - GET endpoint returns sessions from database
   - POST endpoint saves sessions to database
   - Changes persist across page reloads

3. **Admin UI Works**
   - Can login with password
   - Can edit sessions
   - Can save changes
   - Changes appear immediately on booking page

4. **Deployment Works**
   - Can deploy to Netlify
   - Database auto-provisions
   - Environment variables auto-configure
   - Production works same as local

5. **Free Tier Sufficient**
   - Stays within Neon free tier limits
   - No unexpected costs
   - Acceptable performance

### ❌ POC Fails If:

- Database provisioning errors
- Functions can't write to database
- Data doesn't persist
- Requires manual environment variable management (like previous attempt)
- Too complex to set up/maintain
- Exceeds free tier limits

---

## 📝 Findings & Notes

### What Works

*Document here after testing*

### What Doesn't Work

*Document here if issues found*

### Performance

*Document response times, database query performance*

### Costs

*Track usage against Neon free tier limits*

---

## 🔄 Migration Plan (If POC Succeeds)

### Step 1: Copy to BoatBooking

1. Copy `netlify/functions/sessions.js` → `BoatBooking/netlify/functions/sessions.js`
2. Copy `config.html` → `BoatBooking/config.html`
3. Update `book-a-boat.html` to load sessions from API (reuse POC code)
4. Copy `schema.sql` → `BoatBooking/schema.sql`

### Step 2: Update BoatBooking Dependencies

```bash
cd BoatBooking
npm install @netlify/neon
```

### Step 3: Initialize Production Database

```bash
cd BoatBooking
netlify db init --prod
netlify db init  # For local dev
```

### Step 4: Run Schema

```bash
# Production
netlify env:get DATABASE_URL --context production
psql "<prod-url>" -f schema.sql

# Local dev
psql $DATABASE_URL -f schema.sql
```

### Step 5: Set Environment Variables

```bash
cd BoatBooking
netlify env:set ADMIN_PASSWORD "your-password" --context production
```

### Step 6: Deploy

```bash
cd BoatBooking
git add netlify/functions/sessions.js config.html schema.sql package.json
git commit -m "feat: Add Netlify DB for configurable session times"
git push origin main
```

### Step 7: Verify Production

- Test `https://lakemacrowing.au/.netlify/functions/sessions`
- Test `https://lakemacrowing.au/config.html`
- Verify sessions load on booking page

### Step 8: Update Roadmap

- Move "Configurable Session Times" from "Next" to "Recently Completed"
- Document Netlify DB as solution
- Remove rollback warnings

---

## 🎓 Lessons from Previous Rollback

### What Failed Before

1. **Filesystem Attempt:** Read-only filesystem in Netlify Functions
2. **Netlify Blobs Attempt:** Required setup, threw `MissingBlobsEnvironmentError`
3. **Environment Variables Attempt:** Still required manual Netlify Dashboard editing

### Why Netlify DB Should Work

1. ✅ **Real database** (PostgreSQL, not filesystem)
2. ✅ **Auto-provisioned** (one command: `netlify db init`)
3. ✅ **Auto-configured** (DATABASE_URL injected automatically)
4. ✅ **Truly persistent** (data survives deployments)
5. ✅ **Functions can write** (no read-only limitations)

---

## 🚨 Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Beta instability | Medium | Medium | Test thoroughly in POC before production |
| 7-day deletion | Low | High | Set calendar reminder, claim immediately |
| Free tier limits | Low | Low | Monitor usage, LMRC use case is tiny |
| PostgreSQL complexity | Low | Medium | Use simple schema, document queries |
| Vendor lock-in | Medium | Low | PostgreSQL is portable, can export data |

---

## 📚 References

- [Netlify DB Documentation](https://docs.netlify.com/build/data-and-storage/netlify-db/)
- [Neon PostgreSQL](https://neon.com/)
- [Use Neon with Netlify Functions](https://neon.com/docs/guides/netlify-functions)
- [Netlify Functions v2](https://docs.netlify.com/functions/get-started/)

---

## 🤝 Next Steps

After completing POC testing:

1. [ ] Fill in "Findings & Notes" section
2. [ ] Decide: Proceed with BoatBooking migration? (YES/NO)
3. [ ] If YES: Follow migration plan above
4. [ ] If NO: Document why and explore alternatives
5. [ ] Update roadmap based on findings

---

**POC Created By:** Claude Sonnet 4.5
**Date:** 2025-12-21
**Context:** Third attempt at configurable session times after two rollbacks
