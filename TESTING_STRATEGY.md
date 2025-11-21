# LMRC Testing Strategy
## Pre-Phase 1: Establishing Test Coverage Before Refactoring

**Document Type**: Testing Strategy & Implementation Guide
**Purpose**: Establish confidence before Phase 1 structural changes
**Last Updated**: 2025-11-21
**Status**: ✅ **COMPLETE - Baseline Testing Established** (See [BASELINE_TESTING_COMPLETE.md](.claude/BASELINE_TESTING_COMPLETE.md))

---

## 🚨 CRITICAL PRINCIPLE: Test-First Development

### Non-Negotiable Requirement

**ALL CHANGES MUST HAVE TEST COVERAGE AND ALL TESTS MUST PASS BEFORE A CHANGE IS CONSIDERED COMPLETE AND PRODUCTION-READY.**

This principle applies to:
- ✅ **All refactoring work** (especially Phase 1 structural changes)
- ✅ **All new features** added to the codebase
- ✅ **All bug fixes** that modify existing code
- ✅ **All configuration changes** that affect behavior

### Why This Matters

Without comprehensive test coverage:
- ❌ Refactoring becomes dangerous (silent breakages)
- ❌ Confidence in changes is low
- ❌ Regression bugs slip into production
- ❌ Code reviews cannot verify correctness
- ❌ Future changes become increasingly risky

### Implementation Order

1. **FIRST**: Write/update tests for existing functionality
2. **SECOND**: Verify all tests pass (establish baseline)
3. **THIRD**: Make structural changes/refactoring
4. **FOURTH**: Verify all tests still pass
5. **ONLY THEN**: Consider the change complete

**Never skip testing to "save time" - it always costs more later.**

---

## Current State Assessment

### Test Coverage Analysis

**Finding:** ❌ **ZERO custom test coverage across all projects**

| Project | Custom Tests | Test Framework | Coverage |
|---------|--------------|----------------|----------|
| **Booking Viewer** | 0 tests | None | 0% |
| **Noticeboard** | 0 tests | None | 0% |
| **BoatBooking** | 0 tests | None | 0% |
| **Pi Deployment** | 0 tests (bash scripts) | None | 0% |

**Note:** Only tests found are in `node_modules` (dependencies' own tests).

### Risk Assessment

**Without tests, Phase 1 refactoring risks:**
- ❌ Breaking authentication (RevSport login)
- ❌ Breaking booking data parsing
- ❌ Breaking session validation
- ❌ Breaking scraping logic (Noticeboard)
- ❌ Silent failures not caught until production
- ❌ No confidence in refactoring changes

**Conclusion:** Must establish baseline test coverage BEFORE Phase 1.

---

## Testing Philosophy

### Pragmatic Approach

**Goal:** Maximum confidence with minimum effort.

**We will NOT:**
- ❌ Aim for 100% coverage (unrealistic for Phase 1)
- ❌ Test every edge case
- ❌ Write tests for third-party dependencies
- ❌ Test UI rendering extensively

**We WILL:**
- ✅ Test critical paths (authentication, data fetching)
- ✅ Test business logic (session validation, boat parsing)
- ✅ Test integrations (RevSport API, config loading)
- ✅ Test what will change in Phase 1 (config management)
- ✅ Establish baseline for regression detection

### Coverage Targets

| Project | Target Coverage | Priority Areas |
|---------|----------------|----------------|
| **Booking Viewer** | 60-70% | Auth, booking fetch, session validation |
| **Noticeboard** | 50-60% | Scraper, config loading |
| **BoatBooking** | 40-50% | Boat parsing, config fetching |
| **Shared Config Library** | 80%+ | Config schemas, validation (Phase 1) |

---

## Testing Stack

### Recommended Tools

**Test Framework:** **Vitest** (recommended over Jest)
- ✅ Fast (Vite-based, ESM native)
- ✅ Jest-compatible API (easy migration)
- ✅ Built-in TypeScript support
- ✅ Great developer experience
- ✅ Watch mode for TDD

**Alternative:** Jest (if you prefer - same API)

**Additional Tools:**
- `@vitest/ui` - Visual test runner
- `nock` - HTTP mocking (for RevSport API)
- `msw` - Mock Service Worker (alternative to nock)
- `@types/node` - Node.js types

### Installation

```bash
# Booking Viewer
cd lmrc-booking-system
npm install -D vitest @vitest/ui nock @types/node

# Noticeboard
cd ../Noticeboard
npm install -D vitest @vitest/ui nock @types/node

# BoatBooking
cd ../BoatBooking
npm install -D vitest @vitest/ui @types/node
```

### Configuration

```typescript
// vitest.config.ts (for each project)
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.spec.ts',
        '**/*.test.ts',
      ],
    },
  },
});
```

---

## Phase 0: Pre-Refactoring Test Suite

### Timeline: 3-5 Days Before Phase 1

**Goal:** Protect critical functionality during Phase 1 refactoring.

---

## Project 1: Booking Viewer Tests

### Priority 1: Authentication (CRITICAL)

**File:** `src/client/__tests__/auth.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RevsportAuthClient } from '../auth';
import nock from 'nock';

describe('RevsportAuthClient', () => {
  const baseUrl = 'https://test.revsport.com';
  let authClient: RevsportAuthClient;

  beforeEach(() => {
    authClient = new RevsportAuthClient({
      baseUrl,
      username: 'test@example.com',
      password: 'password123',
    });

    // Clear all mocks
    nock.cleanAll();
  });

  describe('login', () => {
    it('should successfully authenticate with valid credentials', async () => {
      // Mock CSRF token request
      nock(baseUrl)
        .get('/login')
        .reply(200, '<input name="_csrf" value="test-csrf-token">');

      // Mock login POST
      nock(baseUrl)
        .post('/login', body => {
          return body._csrf === 'test-csrf-token' &&
                 body.username === 'test@example.com' &&
                 body.password === 'password123';
        })
        .reply(302, '', {
          'Set-Cookie': 'session=abc123; Path=/; HttpOnly',
          'Location': '/dashboard',
        });

      const result = await authClient.login();

      expect(result.success).toBe(true);
      expect(result.sessionCookie).toContain('session=abc123');
    });

    it('should fail with invalid credentials', async () => {
      nock(baseUrl)
        .get('/login')
        .reply(200, '<input name="_csrf" value="test-csrf-token">');

      nock(baseUrl)
        .post('/login')
        .reply(401, 'Invalid credentials');

      await expect(authClient.login()).rejects.toThrow('Authentication failed');
    });

    it('should retry on transient failures', async () => {
      nock(baseUrl)
        .get('/login')
        .reply(500) // First attempt fails
        .get('/login')
        .reply(200, '<input name="_csrf" value="test-csrf-token">'); // Retry succeeds

      nock(baseUrl)
        .post('/login')
        .reply(302, '', { 'Set-Cookie': 'session=abc123' });

      const result = await authClient.login();

      expect(result.success).toBe(true);
    });

    it('should enforce login mutex (no concurrent logins)', async () => {
      nock(baseUrl)
        .get('/login')
        .delay(100) // Simulate slow response
        .reply(200, '<input name="_csrf" value="test-csrf-token">');

      nock(baseUrl)
        .post('/login')
        .reply(302, '', { 'Set-Cookie': 'session=abc123' });

      // Start two login attempts simultaneously
      const login1 = authClient.login();
      const login2 = authClient.login();

      const results = await Promise.all([login1, login2]);

      // Both should succeed, but only one actual HTTP request made
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);

      // Verify only one login request was made
      expect(nock.isDone()).toBe(true);
    });
  });

  describe('automatic re-authentication', () => {
    it('should re-authenticate on 403 response', async () => {
      // Mock successful initial login
      nock(baseUrl)
        .get('/login')
        .reply(200, '<input name="_csrf" value="csrf1">');

      nock(baseUrl)
        .post('/login')
        .reply(302, '', { 'Set-Cookie': 'session=abc123' });

      await authClient.login();

      // Mock 403 response, then successful re-auth
      nock(baseUrl)
        .get('/api/bookings')
        .reply(403, 'Session expired');

      nock(baseUrl)
        .get('/login')
        .reply(200, '<input name="_csrf" value="csrf2">');

      nock(baseUrl)
        .post('/login')
        .reply(302, '', { 'Set-Cookie': 'session=xyz789' });

      nock(baseUrl)
        .get('/api/bookings')
        .reply(200, { bookings: [] });

      const response = await authClient.get('/api/bookings');

      expect(response.data.bookings).toBeDefined();
    });
  });
});
```

### Priority 2: Booking Data Fetching

**File:** `src/fetcher/__tests__/bookings.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { fetchBookings } from '../bookings';
import nock from 'nock';

describe('fetchBookings', () => {
  const baseUrl = 'https://test.revsport.com';

  beforeEach(() => {
    nock.cleanAll();
  });

  it('should fetch and parse booking data correctly', async () => {
    // Mock boats list
    nock(baseUrl)
      .get('/bookings')
      .reply(200, `
        <div class="asset" data-id="8584">
          <h3>The Rose (75kg)</h3>
          <span class="type">Double</span>
        </div>
      `);

    // Mock booking calendar for boat
    nock(baseUrl)
      .get('/bookings/retrieve-calendar/8584')
      .reply(200, {
        bookings: [
          {
            id: '12345',
            asset_id: '8584',
            start_time: '2025-10-30 06:30:00',
            end_time: '2025-10-30 07:30:00',
            user_name: 'John Doe',
          },
        ],
      });

    const bookings = await fetchBookings(baseUrl);

    expect(bookings).toHaveLength(1);
    expect(bookings[0]).toMatchObject({
      boatId: '8584',
      boatName: 'The Rose (75kg)',
      bookings: expect.arrayContaining([
        expect.objectContaining({
          startTime: '06:30',
          endTime: '07:30',
          memberName: 'John Doe',
        }),
      ]),
    });
  });

  it('should handle boats with no bookings', async () => {
    nock(baseUrl)
      .get('/bookings')
      .reply(200, '<div class="asset" data-id="8585"><h3>Empty Boat</h3></div>');

    nock(baseUrl)
      .get('/bookings/retrieve-calendar/8585')
      .reply(200, { bookings: [] });

    const bookings = await fetchBookings(baseUrl);

    expect(bookings).toHaveLength(1);
    expect(bookings[0].bookings).toHaveLength(0);
  });

  it('should batch requests to prevent rate limiting', async () => {
    // Create 10 boats
    const boatsHtml = Array.from({ length: 10 }, (_, i) => `
      <div class="asset" data-id="${8584 + i}">
        <h3>Boat ${i + 1}</h3>
      </div>
    `).join('');

    nock(baseUrl)
      .get('/bookings')
      .reply(200, boatsHtml);

    // Mock calendar responses
    for (let i = 0; i < 10; i++) {
      nock(baseUrl)
        .get(`/bookings/retrieve-calendar/${8584 + i}`)
        .reply(200, { bookings: [] });
    }

    const startTime = Date.now();
    await fetchBookings(baseUrl, { batchSize: 5, batchDelay: 100 });
    const duration = Date.now() - startTime;

    // Should take at least 100ms (one batch delay)
    // 10 boats / 5 per batch = 2 batches, 1 delay between = 100ms minimum
    expect(duration).toBeGreaterThanOrEqual(100);
  });
});
```

### Priority 3: Session Validation

**File:** `src/validation/__tests__/sessions.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { validateBookingTime } from '../sessions';

describe('Session Validation', () => {
  const sessions = [
    {
      id: 'AM1',
      startTime: '06:30',
      endTime: '07:30',
      daysOfWeek: [1, 2, 3, 4, 5], // Weekdays
    },
    {
      id: 'AM2',
      startTime: '07:30',
      endTime: '08:30',
      daysOfWeek: [1, 2, 3, 4, 5],
    },
    {
      id: 'SAT',
      startTime: '07:00',
      endTime: '09:00',
      daysOfWeek: [6], // Saturday
    },
  ];

  it('should validate correct weekday session times', () => {
    const booking = {
      startTime: '06:30',
      endTime: '07:30',
      date: new Date('2025-10-30'), // Thursday
    };

    const result = validateBookingTime(booking, sessions);

    expect(result.valid).toBe(true);
    expect(result.session?.id).toBe('AM1');
  });

  it('should flag unusual times', () => {
    const booking = {
      startTime: '05:00',
      endTime: '06:00',
      date: new Date('2025-10-30'),
    };

    const result = validateBookingTime(booking, sessions);

    expect(result.valid).toBe(false);
    expect(result.warning).toContain('Unusual time');
  });

  it('should validate day-specific sessions', () => {
    const saturdayBooking = {
      startTime: '07:00',
      endTime: '09:00',
      date: new Date('2025-11-01'), // Saturday
    };

    const result = validateBookingTime(saturdayBooking, sessions);

    expect(result.valid).toBe(true);
    expect(result.session?.id).toBe('SAT');
  });

  it('should reject Saturday session on weekday', () => {
    const weekdayBooking = {
      startTime: '07:00',
      endTime: '09:00',
      date: new Date('2025-10-30'), // Thursday
    };

    const result = validateBookingTime(weekdayBooking, sessions);

    expect(result.valid).toBe(false);
  });
});
```

### Priority 4: Configuration Loading (Pre-Phase 1)

**File:** `src/config/__tests__/loader.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { loadConfig } from '../loader';
import * as fs from 'fs/promises';
import { vi } from 'vitest';

vi.mock('fs/promises');

describe('Config Loader', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should load valid .env configuration', async () => {
    const mockEnv = {
      CLUB_NAME: 'Test Rowing Club',
      SESSION_AM_START: '06:30',
      SESSION_AM_END: '07:30',
      REVSPORT_BASE_URL: 'https://test.com',
    };

    Object.assign(process.env, mockEnv);

    const config = await loadConfig();

    expect(config.clubName).toBe('Test Rowing Club');
    expect(config.sessions).toHaveLength(2); // AM1, AM2
    expect(config.sessions[0].startTime).toBe('06:30');
  });

  it('should throw error on missing required config', async () => {
    delete process.env.REVSPORT_BASE_URL;

    await expect(loadConfig()).rejects.toThrow('Missing required configuration');
  });

  it('should use default values for optional config', async () => {
    process.env.REVSPORT_BASE_URL = 'https://test.com';
    delete process.env.CLUB_NAME;

    const config = await loadConfig();

    expect(config.clubName).toBe('Rowing Club'); // Default
  });
});
```

---

## Project 2: Noticeboard Tests

### Priority 1: Scraper Tests

**File:** `scraper/__tests__/noticeboard-scraper.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { scrapeGallery, scrapeEvents, scrapeNews } from '../noticeboard-scraper';
import nock from 'nock';

describe('Noticeboard Scraper', () => {
  const baseUrl = 'https://test.revsport.com';

  beforeEach(() => {
    nock.cleanAll();
  });

  describe('scrapeGallery', () => {
    it('should extract gallery albums and photos', async () => {
      nock(baseUrl)
        .get('/gallery')
        .reply(200, `
          <div class="album" data-id="123">
            <h3>Regatta 2025</h3>
            <img src="/photos/1.jpg" alt="Photo 1">
            <img src="/photos/2.jpg" alt="Photo 2">
          </div>
        `);

      const gallery = await scrapeGallery(baseUrl);

      expect(gallery).toHaveLength(1);
      expect(gallery[0]).toMatchObject({
        id: '123',
        name: 'Regatta 2025',
        photos: expect.arrayContaining([
          expect.objectContaining({
            url: expect.stringContaining('/photos/1.jpg'),
          }),
        ]),
      });
    });

    it('should handle empty gallery gracefully', async () => {
      nock(baseUrl)
        .get('/gallery')
        .reply(200, '<div class="gallery"></div>');

      const gallery = await scrapeGallery(baseUrl);

      expect(gallery).toHaveLength(0);
    });

    it('should convert relative URLs to absolute', async () => {
      nock(baseUrl)
        .get('/gallery')
        .reply(200, '<img src="/photos/test.jpg">');

      const gallery = await scrapeGallery(baseUrl);

      expect(gallery[0].photos[0].url).toBe('https://test.revsport.com/photos/test.jpg');
    });
  });

  describe('scrapeEvents', () => {
    it('should extract upcoming events', async () => {
      nock(baseUrl)
        .get('/events')
        .reply(200, `
          <div class="event">
            <h3>Club Championship</h3>
            <time datetime="2025-11-15">15 Nov 2025</time>
            <p>Annual championship event</p>
          </div>
        `);

      const events = await scrapeEvents(baseUrl);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        title: 'Club Championship',
        date: '2025-11-15',
        description: expect.stringContaining('championship'),
      });
    });

    it('should filter past events', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);

      nock(baseUrl)
        .get('/events')
        .reply(200, `
          <div class="event">
            <h3>Past Event</h3>
            <time datetime="${pastDate.toISOString().split('T')[0]}">Past</time>
          </div>
        `);

      const events = await scrapeEvents(baseUrl);

      expect(events).toHaveLength(0); // Past event filtered out
    });
  });
});
```

### Priority 2: Config Loading

**File:** `__tests__/config.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { loadConfig, validateConfig } from '../config';
import * as fs from 'fs/promises';
import { vi } from 'vitest';

vi.mock('fs/promises');

describe('Noticeboard Config', () => {
  it('should load and validate config.json', async () => {
    const mockConfig = {
      scraper: {
        baseUrl: 'https://test.com',
        schedule: '0 * * * *', // Hourly
      },
      display: {
        galleryInterval: 15000,
        newsInterval: 45000,
      },
      branding: {
        clubName: 'Test RC',
        primaryColor: '#1e40af',
      },
    };

    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockConfig));

    const config = await loadConfig('config.json');

    expect(config.scraper.baseUrl).toBe('https://test.com');
    expect(config.display.galleryInterval).toBe(15000);
  });

  it('should reject invalid config', () => {
    const invalidConfig = {
      scraper: {
        // Missing baseUrl
        schedule: '0 * * * *',
      },
    };

    expect(() => validateConfig(invalidConfig)).toThrow('Invalid configuration');
  });
});
```

---

## Project 3: BoatBooking Tests

### Priority 1: Boat Parsing

**File:** `scripts/__tests__/fetch-boats.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { parseBoats } from '../fetch-boats';

describe('Boat Parsing', () => {
  it('should parse boat data from HTML', () => {
    const html = `
      <div class="asset" data-id="8584">
        <h3>The Rose (75kg)</h3>
        <span class="type">Double</span>
        <span class="category">Club Boat</span>
      </div>
      <div class="asset" data-id="8585">
        <h3>Fast Eddie</h3>
        <span class="type">Single</span>
        <span class="category">Race Boat</span>
      </div>
    `;

    const boats = parseBoats(html);

    expect(boats).toHaveLength(2);
    expect(boats[0]).toMatchObject({
      id: '8584',
      name: 'The Rose (75kg)',
      weight: '75kg',
      type: 'Double',
      category: 'Club Boat',
    });
  });

  it('should extract weight from boat name', () => {
    const html = '<div class="asset" data-id="1"><h3>Boat (80kg)</h3></div>';

    const boats = parseBoats(html);

    expect(boats[0].weight).toBe('80kg');
    expect(boats[0].name).toBe('Boat (80kg)');
  });

  it('should handle boats without weight', () => {
    const html = '<div class="asset" data-id="1"><h3>Simple Boat</h3></div>';

    const boats = parseBoats(html);

    expect(boats[0].weight).toBeUndefined();
  });
});
```

---

## Test Execution Scripts

### Add to package.json

**Booking Viewer:**
```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:run": "vitest run"
  }
}
```

**Noticeboard & BoatBooking:** Same scripts

---

## Pre-Phase 1 Checklist

### Week Before Phase 1

- [ ] Install Vitest in all 3 projects
- [ ] Create test configurations
- [ ] Write authentication tests (Booking Viewer)
- [ ] Write booking fetch tests (Booking Viewer)
- [ ] Write session validation tests (Booking Viewer)
- [ ] Write scraper tests (Noticeboard)
- [ ] Write boat parsing tests (BoatBooking)
- [ ] Run all tests and achieve >60% coverage
- [ ] Fix any failing tests
- [ ] Document test results

### Success Criteria

**Before starting Phase 1:**
- ✅ All tests passing (green)
- ✅ Core authentication covered
- ✅ Data fetching/parsing covered
- ✅ Session validation covered
- ✅ Coverage report generated
- ✅ Tests run in CI (optional: GitHub Actions)

---

## Continuous Testing During Phase 1

### Red-Green-Refactor

**Process:**
1. **Red:** Run existing tests (should pass)
2. **Refactor:** Make Phase 1 changes (shared config)
3. **Green:** Run tests again (should still pass)
4. **Add:** Write new tests for new code

### Phase 1 Specific Tests

**New file:** `packages/config/__tests__/config-manager.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { ConfigManager } from '../src/manager/ConfigManager';
import { ClubProfileSchema } from '../src/schemas/club-profile';

describe('ConfigManager', () => {
  it('should load and validate club profile', async () => {
    const manager = new ConfigManager('test-config.json');

    const config = await manager.load();

    expect(ClubProfileSchema.parse(config)).toBeDefined();
  });

  it('should reject invalid configuration', async () => {
    const invalidConfig = {
      club: {
        // Missing required fields
      },
    };

    expect(() => ClubProfileSchema.parse(invalidConfig)).toThrow();
  });

  it('should update sessions atomically', async () => {
    const manager = new ConfigManager('test-config.json');

    const newSessions = [
      {
        id: 'AM1',
        name: 'Early Morning',
        startTime: '06:00', // Changed from 06:30
        endTime: '07:00',
        daysOfWeek: [1, 2, 3, 4, 5],
      },
    ];

    await manager.updateSessions(newSessions);

    const config = await manager.load();

    expect(config.sessions[0].startTime).toBe('06:00');
  });
});
```

---

## GitHub Actions CI (Optional but Recommended)

**File:** `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test-booking-viewer:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./lmrc-booking-system
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test

  test-noticeboard:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./Noticeboard
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test

  test-boat-booking:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./BoatBooking
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
```

---

## Test Implementation Timeline

### Day 1: Setup & Infrastructure
- ⏱️ 2-3 hours
- [ ] Install Vitest in all 3 projects
- [ ] Create vitest.config.ts files
- [ ] Set up test scripts in package.json
- [ ] Verify test runner works (`npm test`)

### Day 2: Booking Viewer Tests
- ⏱️ 4-6 hours
- [ ] Write authentication tests (2 hours)
- [ ] Write booking fetch tests (2 hours)
- [ ] Write session validation tests (1 hour)
- [ ] Run coverage report

### Day 3: Noticeboard & BoatBooking Tests
- ⏱️ 3-4 hours
- [ ] Write scraper tests (2 hours)
- [ ] Write boat parsing tests (1 hour)
- [ ] Write config tests (1 hour)

### Day 4: Polish & Documentation
- ⏱️ 2-3 hours
- [ ] Fix any failing tests
- [ ] Improve coverage where needed
- [ ] Document test results
- [ ] Set up CI (optional)

### Day 5: Buffer & Review
- ⏱️ 2 hours
- [ ] Final test run
- [ ] Review coverage reports
- [ ] Address any gaps
- [ ] Get tests to green

**Total: 3-5 days** (depending on depth)

---

## Success Metrics

### Coverage Targets

| Metric | Target | How to Measure |
|--------|--------|----------------|
| **Line Coverage** | 60%+ | `npm run test:coverage` |
| **Critical Paths** | 100% | Manual review |
| **All Tests Passing** | Yes | `npm test` (exit code 0) |

### Critical Paths to Cover

**Booking Viewer:**
- ✅ Authentication flow (login, re-auth on 403)
- ✅ Booking data fetch (with batching)
- ✅ Session validation
- ✅ Config loading

**Noticeboard:**
- ✅ Gallery scraping
- ✅ Events scraping
- ✅ Config loading

**BoatBooking:**
- ✅ Boat list parsing
- ✅ Config fetching (Phase 1)

---

## Risk Mitigation

### If Tests Reveal Bugs

**Good news!** Better to find now than in production.

**Process:**
1. Document bug in test
2. Fix bug
3. Verify test passes
4. Commit fix

### If Coverage is Low

**Pragmatic approach:**

**Minimum acceptable:**
- Authentication: 90%+
- Data parsing: 70%+
- Business logic: 60%+
- Other: 40%+

**If time-constrained:**
- Focus on authentication & data parsing only
- Defer UI/integration tests
- Add more tests during Phase 1

---

## Next Steps

### Immediate Actions (This Week)

1. **Day 1:** Install Vitest, create configs
2. **Day 2-3:** Write core tests (auth, data fetching)
3. **Day 4:** Polish and achieve green tests
4. **Day 5:** Review and document

### Before Phase 1 Kickoff

- [ ] All tests green ✅
- [ ] Coverage >60% ✅
- [ ] Tests documented ✅
- [ ] Baseline established ✅

**Then:** Proceed with Phase 1 refactoring with confidence! 🚀

---

## Questions to Resolve

1. **Testing depth:** Are you comfortable with 60-70% coverage, or want higher?

2. **Timeline:** Can you allocate 3-5 days for testing before Phase 1?

3. **CI/CD:** Do you want GitHub Actions automated tests, or manual runs acceptable?

4. **Test-first vs test-after:** For Phase 1 new code, write tests before or after implementation?

5. **Mock vs Real:** Should tests use mocked RevSport API or hit real API (slower but more realistic)?

---

**Ready to start testing? Let's get that coverage in place!** 💪

**Document Version:** 1.0
**Last Updated:** 2025-10-30
**Status:** Ready to Implement
