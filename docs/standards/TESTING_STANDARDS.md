# LMRC Testing Standards & Implementation Plan

**Status**: Active - Mandatory for all projects
**Last Updated**: 2025-12-24
**Version**: 1.0

---

## Executive Summary

This document establishes **mandatory** testing standards for all LMRC projects and provides a phased implementation plan to bring existing projects up to professional standards.

**Current State (2025-12-24):**
- BoatBooking: 0% test coverage ❌
- lmrc-booking-system: 85.71% coverage ✅ (but no CI/CD)
- Noticeboard: 0% test coverage ❌

**Target State:**
- All projects: ≥60% test coverage
- All projects: Automated CI/CD testing
- All PRs: Tests must pass to merge

---

## Testing Philosophy

### Core Principles

1. **Testing is Mandatory, Not Optional**
   - Tests are not an afterthought
   - Tests are written alongside code, not after
   - Code without tests is incomplete code

2. **Tests Prevent Regressions**
   - Complex logic (parsers, authentication, scraping) MUST be tested
   - Edge cases and error handling MUST be tested
   - External dependencies MUST be mocked/stubbed

3. **CI/CD Enforces Quality**
   - Tests run automatically on every push and PR
   - Failing tests block merges
   - Coverage drops block merges

4. **Tests Document Behavior**
   - Tests serve as living documentation
   - Test names describe what the code does
   - Test cases cover expected behavior and edge cases

---

## Mandatory Requirements

### All Projects Must Have:

#### 1. Test Framework
- **Required**: Vitest (consistent across all LMRC projects)
- **Reason**: Modern, fast, excellent TypeScript/ESM support
- **Configuration**: See template below

#### 2. Minimum Coverage Thresholds
```javascript
coverage: {
  thresholds: {
    lines: 60,
    functions: 60,
    branches: 60,
    statements: 60
  }
}
```

#### 3. CI/CD Testing
- **Required**: GitHub Actions workflow
- **Triggers**: Every push, every pull request
- **Enforcement**: Block merge if tests fail or coverage drops

#### 4. Test Types Required

**Unit Tests** (Mandatory)
- Business logic functions
- Data transformations
- Utility functions
- Parser logic
- Validation logic

**Integration Tests** (Mandatory for projects with external dependencies)
- API calls to external services (mocked)
- Database operations (mocked or test DB)
- Authentication flows
- Full workflows (end-to-end within module)

**Component Tests** (Mandatory for React projects)
- Component rendering
- User interactions
- State management
- Error boundaries

**End-to-End Tests** (Optional, Phase 3)
- Full user journeys
- Playwright or Cypress
- Visual regression testing

---

## Standard Test File Structure

### File Organization

```
project/
├── src/
│   ├── __tests__/
│   │   └── setup.ts              # Global test configuration
│   ├── module/
│   │   ├── function.ts
│   │   └── __tests__/
│   │       └── function.test.ts  # Tests colocated with code
│   └── utils/
│       ├── helper.ts
│       └── __tests__/
│           └── helper.test.ts
├── vitest.config.ts              # Vitest configuration
└── package.json                  # Test scripts
```

### Naming Conventions

- Test files: `*.test.ts` or `*.spec.ts`
- Test directories: `__tests__/`
- Setup file: `__tests__/setup.ts`

---

## Vitest Configuration Template

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node', // or 'jsdom' for React components
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.config.{js,ts}',
        '**/__tests__/**',
        '**/test-*.{js,ts}'
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60
      }
    },
    setupFiles: ['./src/__tests__/setup.ts']
  }
})
```

---

## Package.json Scripts Template

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:watch": "vitest --watch",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  },
  "devDependencies": {
    "vitest": "^2.1.8",
    "@vitest/coverage-v8": "^2.1.8",
    "@vitest/ui": "^2.1.8"
  }
}
```

For React projects, add:
```json
{
  "devDependencies": {
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/user-event": "^14.5.2",
    "jsdom": "^25.0.1"
  }
}
```

---

## GitHub Actions CI/CD Template

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    name: Run Tests
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          file: ./coverage/lcov.info
          fail_ci_if_error: false

      - name: Check coverage thresholds
        run: |
          node -e "
          const coverage = require('./coverage/coverage-summary.json');
          const total = coverage.total;
          const threshold = 60;

          if (total.lines.pct < threshold ||
              total.functions.pct < threshold ||
              total.branches.pct < threshold ||
              total.statements.pct < threshold) {
            console.error('Coverage below threshold:', total);
            process.exit(1);
          }
          "
```

---

## Test Writing Guidelines

### Good Test Structure (AAA Pattern)

```typescript
describe('BoatParser', () => {
  describe('parseName', () => {
    it('should extract boat type and weight from name', () => {
      // Arrange
      const input = 'Boat1 (R 70 KG)'

      // Act
      const result = parseName(input)

      // Assert
      expect(result).toEqual({
        name: 'Boat1',
        type: 'R',
        weight: 70,
        unit: 'KG'
      })
    })

    it('should handle malformed input gracefully', () => {
      // Arrange
      const input = 'Invalid Boat'

      // Act
      const result = parseName(input)

      // Assert
      expect(result).toEqual({
        name: 'Invalid Boat',
        type: null,
        weight: null,
        unit: null
      })
    })
  })
})
```

### What Makes a Good Test?

1. **Clear, Descriptive Names**
   - ✅ `it('should extract boat type from parentheses')`
   - ❌ `it('works')`

2. **Single Responsibility**
   - Each test should verify ONE thing
   - If using "and" in test name, split into multiple tests

3. **Independent Tests**
   - Tests should not depend on each other
   - Tests should not share mutable state
   - Order of execution shouldn't matter

4. **Comprehensive Coverage**
   - Happy path (normal input)
   - Edge cases (empty, null, undefined)
   - Error cases (invalid input, network failures)
   - Boundary conditions (min/max values)

5. **Minimal Mocking**
   - Mock external dependencies (HTTP requests, file system)
   - Don't mock the code you're testing
   - Use real implementations when practical

### Mocking External Dependencies

```typescript
// Mock HTTP requests
import { vi } from 'vitest'

describe('RevSportScraper', () => {
  it('should fetch boats from RevSport', async () => {
    // Mock axios
    const mockAxios = vi.fn().mockResolvedValue({
      data: '<html><body>Boat1</body></html>'
    })

    const scraper = new RevSportScraper({ axios: mockAxios })
    const boats = await scraper.fetchBoats()

    expect(mockAxios).toHaveBeenCalledWith(expect.stringContaining('revsport'))
    expect(boats).toHaveLength(1)
  })
})
```

---

## Phase 1: Immediate Implementation (This Week)

### Priority 1A: Add CI/CD to lmrc-booking-system
**Effort**: 2 hours
**Status**: Tests exist, need automation

**Tasks**:
1. Create `.github/workflows/test.yml`
2. Configure coverage reporting
3. Enable branch protection rules
4. Test workflow with dummy PR

**Success Criteria**:
- [ ] Tests run automatically on every push
- [ ] Tests run on every PR
- [ ] Coverage report generated
- [ ] Failing tests block merge

**Assignee**: Immediate (highest priority)

---

### Priority 1B: BoatBooking Testing Infrastructure
**Effort**: 1 day
**Status**: No tests, critical scraping logic untested

**Tasks**:
1. Install Vitest and dependencies
2. Create `vitest.config.ts`
3. Create test file structure
4. Write tests for boat parsing logic
5. Write tests for authentication flow
6. Add GitHub Actions workflow
7. Update README with testing documentation

**Critical Test Cases**:
```typescript
// scripts/__tests__/boat-parser.test.ts

describe('Boat Name Parsing', () => {
  it('should parse standard format: Boat1 (R 70 KG)')
  it('should parse with nickname: Boat1 (Nickname) (R 70 KG)')
  it('should parse sweep indicator: Boat1 (R /+ 70 KG)')
  it('should handle damaged boats: Boat1 (Damaged) (R 70 KG)')
  it('should handle malformed HTML gracefully')
  it('should extract RevSport boat ID from href')
})

describe('Authentication', () => {
  it('should create cookie jar with persister')
  it('should maintain session cookies across requests')
  it('should handle authentication failures')
  it('should retry on network errors')
})

describe('Scraper Integration', () => {
  it('should fetch boats from RevSport (mocked)')
  it('should parse HTML into boats.json structure')
  it('should handle network errors gracefully')
  it('should handle invalid HTML gracefully')
})
```

**Target Coverage**: 50% (focus on critical parsing logic)

**Success Criteria**:
- [ ] Vitest installed and configured
- [ ] ≥50% coverage of `scripts/fetch-boats.js`
- [ ] All parsing edge cases tested
- [ ] Authentication flow tested
- [ ] CI/CD workflow running
- [ ] Tests pass on every commit

---

### Priority 1C: Noticeboard Testing Infrastructure
**Effort**: 1-2 days
**Status**: No tests, React component and scraping untested

**Tasks**:
1. Install Vitest + React Testing Library
2. Create `vitest.config.ts` with jsdom environment
3. Create test file structure
4. Write scraper tests (gallery, events, news)
5. Write API endpoint tests (Express routes)
6. Write basic React component tests
7. Add GitHub Actions workflow
8. Update README with testing documentation

**Critical Test Cases**:
```typescript
// scraper/__tests__/noticeboard-scraper.test.ts

describe('Gallery Scraper', () => {
  it('should parse gallery albums from HTML')
  it('should extract image URLs and titles')
  it('should handle missing gallery gracefully')
  it('should handle malformed HTML')
})

describe('Events Scraper', () => {
  it('should parse event dates and titles')
  it('should extract event descriptions')
  it('should handle empty events list')
})

// server/__tests__/api.test.ts

describe('API Endpoints', () => {
  it('GET /api/gallery returns gallery data')
  it('GET /api/events returns events data')
  it('GET /api/news returns news data')
  it('GET /api/health returns 200 OK')
  it('handles scraper errors gracefully')
})

// src/__tests__/Noticeboard.test.tsx

describe('Noticeboard Component', () => {
  it('renders gallery view with images')
  it('rotates between views based on config')
  it('handles missing data gracefully')
  it('displays sponsors when configured')
})
```

**Target Coverage**: 50% (focus on scraper logic and API)

**Success Criteria**:
- [ ] Vitest + React Testing Library installed
- [ ] ≥50% coverage of scraper logic
- [ ] All API endpoints tested
- [ ] Basic component rendering tested
- [ ] CI/CD workflow running
- [ ] Tests pass on every commit

---

## Phase 2: Expand Coverage (Next 2 Weeks)

### BoatBooking
- Integration tests for full scrape workflow
- Error handling tests (network failures, malformed HTML)
- Target: 70% coverage

### lmrc-booking-system
- Integration tests with mocked RevSport API
- Server route tests (currently excluded)
- Frontend component tests
- Target: Maintain 85%+ coverage

### Noticeboard
- React component tests (user interactions, state)
- Configuration validation tests
- Error boundary tests
- Target: 70% coverage

---

## Phase 3: Advanced Testing (Future)

### End-to-End Tests
- Playwright for browser automation
- Full user journeys
- Visual regression testing
- Cross-browser testing

### Performance Testing
- Load testing for API endpoints
- Memory leak detection
- Scraper performance benchmarks

### Mutation Testing
- Verify test quality with mutation testing
- Tools: Stryker Mutator

---

## Continuous Improvement

### Weekly Reviews
- Review test coverage reports
- Identify untested code paths
- Prioritize tests for critical logic

### Quarterly Goals
- Increase coverage targets: 60% → 70% → 80%
- Add integration tests
- Add E2E tests for critical paths

### Team Practices
- Pair programming for complex tests
- Code review includes test review
- Share testing patterns and best practices

---

## Testing Anti-Patterns (Avoid These)

### ❌ Don't

1. **Skip tests because "it's simple code"**
   - Simple code can break too
   - Tests document expected behavior

2. **Test implementation details**
   - Test behavior, not internals
   - Refactoring shouldn't break tests

3. **Write tests after code is "done"**
   - Tests are part of "done"
   - TDD or test-alongside-development

4. **Mock everything**
   - Real implementations when possible
   - Only mock external dependencies

5. **Ignore failing tests**
   - Fix or delete failing tests
   - Never commit commented-out tests

6. **100% coverage obsession**
   - 60% meaningful coverage > 100% shallow coverage
   - Focus on critical paths first

### ✅ Do

1. **Write tests for bug fixes**
   - Reproduce bug with failing test
   - Fix bug
   - Test prevents regression

2. **Test edge cases**
   - Null/undefined
   - Empty arrays/strings
   - Boundary values
   - Error conditions

3. **Use descriptive test names**
   - Test name should describe expected behavior
   - Should read like documentation

4. **Keep tests fast**
   - Unit tests < 10ms each
   - Mock slow operations
   - Run integration tests separately if slow

5. **Review test coverage reports**
   - Identify untested code
   - Prioritize critical paths
   - Add tests for gaps

---

## Resources

### Documentation
- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

### Tools
- [Vitest](https://vitest.dev/) - Test framework
- [Vitest UI](https://vitest.dev/guide/ui.html) - Interactive test runner
- [@vitest/coverage-v8](https://vitest.dev/guide/coverage.html) - Coverage reporting
- [React Testing Library](https://testing-library.com/) - React component testing

### CI/CD
- [GitHub Actions](https://docs.github.com/en/actions)
- [Codecov](https://about.codecov.io/) - Coverage reporting service

---

## FAQ

**Q: Do I need to test everything to 100% coverage?**
A: No. Focus on critical logic, complex algorithms, and edge cases. 60% meaningful coverage is better than 100% shallow coverage.

**Q: Should I write tests first (TDD)?**
A: Recommended but not required. At minimum, write tests alongside code, not after.

**Q: How do I test code that calls external APIs?**
A: Mock the HTTP client. Test the logic separately from the network call.

**Q: What if tests are slow?**
A: Unit tests should be fast (<10ms). Mock slow operations. Run integration/E2E tests separately.

**Q: Can I skip tests for trivial code?**
A: If it's too trivial to test, it might be too trivial to exist. When in doubt, test it.

**Q: How do I test React components?**
A: Use React Testing Library. Test behavior (what users see), not implementation.

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-24 | Initial testing standards and Phase 1 implementation plan |

---

**Document Owner**: Engineering Team
**Review Frequency**: Quarterly
**Next Review**: 2025-03-24
