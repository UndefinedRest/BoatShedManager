# LMRC Solution Conventions

**Version**: 1.0.0
**Last Updated**: 2025-11-23
**Scope**: All projects in the LMRC solution

This document defines the coding standards, architectural principles, and development practices for the entire LMRC solution. These conventions apply across all four projects: `lmrc-booking-system`, `BoatBooking`, `Noticeboard`, and `lmrc-pi-deployment`.

---

## Table of Contents

1. [Testing Requirements](#testing-requirements)
2. [TypeScript & JavaScript Standards](#typescript--javascript-standards)
3. [Code Style & Formatting](#code-style--formatting)
4. [Architecture Principles](#architecture-principles)
5. [Configuration Management](#configuration-management)
6. [Git Workflow](#git-workflow)
7. [Documentation Standards](#documentation-standards)
8. [Security Practices](#security-practices)
9. [Error Handling](#error-handling)
10. [Performance Guidelines](#performance-guidelines)

---

## 1. Testing Requirements

### 1.1 Mandatory Test Coverage

**CRITICAL**: All new features and bug fixes MUST include tests BEFORE marking the work as complete.

#### Test-First Development Process

1. **Write tests PROACTIVELY**, not reactively
   - DO NOT wait to be prompted to write tests
   - Tests are part of the feature implementation, not an afterthought
   - DO NOT commit features without accompanying tests

2. **Test Location**
   - Co-locate tests with source code in `__tests__/` directories
   - Test files must use `.test.ts` or `.test.js` extension
   - Mirror the source file structure

   ```
   src/
   ├── models/
   │   ├── tv-display-config.ts
   │   └── __tests__/
   │       └── tv-display-config.test.ts
   ```

3. **What Requires Tests**
   - ✅ New features
   - ✅ Bug fixes (test the fix AND the regression)
   - ✅ Public APIs and interfaces
   - ✅ Data validation schemas (Zod schemas)
   - ✅ Business logic and transformations
   - ✅ Configuration loading and parsing
   - ❌ Simple getters/setters without logic
   - ❌ Third-party library wrappers (unless adding logic)

4. **Test Quality Standards**
   - Each test must have a clear, descriptive name
   - Use AAA pattern: Arrange, Act, Assert
   - Test both happy path AND error cases
   - Test edge cases and boundary conditions
   - Avoid testing implementation details

5. **Coverage Requirements**
   - Aim for >80% code coverage on new code
   - 100% coverage on critical paths (authentication, data validation)
   - Run `npm run test:coverage` before committing

6. **Testing Framework**
   - Use **Vitest** for all TypeScript/JavaScript projects
   - Use `describe` blocks to group related tests
   - Use `it` or `test` for individual test cases
   - Use `beforeEach`/`afterEach` for setup/teardown

#### Example Test Structure

```typescript
/**
 * Feature Module Tests
 *
 * Tests feature description and behavior.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MyFeature } from '../my-feature.js';

describe('MyFeature Module', () => {
  describe('myFunction', () => {
    it('should handle valid input correctly', () => {
      // Arrange
      const input = 'valid data';

      // Act
      const result = myFunction(input);

      // Assert
      expect(result).toBe('expected output');
    });

    it('should throw error for invalid input', () => {
      // Arrange
      const invalidInput = null;

      // Act & Assert
      expect(() => myFunction(invalidInput)).toThrow('Expected error message');
    });

    it('should handle edge case: empty string', () => {
      expect(myFunction('')).toBe('');
    });
  });
});
```

### 1.2 Running Tests

- **Before Committing**: `npm run test:run` (runs once)
- **During Development**: `npm run test:watch` (watches for changes)
- **Coverage Check**: `npm run test:coverage`
- **Visual UI**: `npm run test:ui`

### 1.3 Test Data Management

- Use fixtures for complex test data
- Store fixtures in `__tests__/fixtures/`
- Mock external dependencies (APIs, file system)
- Use realistic test data that matches production patterns

---

## 2. TypeScript & JavaScript Standards

### 2.1 TypeScript Configuration

**Standard tsconfig.json Settings** (all projects):

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022"],
    "moduleResolution": "bundler",  // NOT "node" (deprecated)
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 2.2 Module System

- **Use ES Modules** (not CommonJS)
- **Always include `.js` extension** in imports (even for `.ts` files)
  ```typescript
  import { MyClass } from './my-class.js';  // ✅ Correct
  import { MyClass } from './my-class';     // ❌ Wrong
  ```
- Set `"type": "module"` in package.json
- Use `import` and `export`, never `require()` or `module.exports`

### 2.3 Type Safety

#### Prefer Zod for Runtime Validation

Use **Zod schemas** for all data validation at system boundaries:

```typescript
import { z } from 'zod';

// Define schema
export const UserSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
});

// Infer TypeScript type from schema
export type User = z.infer<typeof UserSchema>;

// Validate at runtime
const user = UserSchema.parse(untrustedData);
```

#### When to Use Zod vs TypeScript Types

- **Zod**: External data (API responses, user input, config files, environment variables)
- **TypeScript types**: Internal data structures, function signatures, pure type checking

#### Type Annotations

- Prefer **inference** for simple cases
- Use **explicit types** for:
  - Function parameters
  - Function return types (public functions)
  - Complex objects
  - Interface/API boundaries

```typescript
// ✅ Good
function processBooking(booking: Booking): ProcessedBooking {
  const result = transformBooking(booking); // inferred
  return result;
}

// ❌ Avoid over-annotation
function processBooking(booking: Booking): ProcessedBooking {
  const result: ProcessedBooking = transformBooking(booking);
  return result;
}
```

### 2.4 Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Variables | `camelCase` | `boatName`, `startTime` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRIES`, `DEFAULT_CONFIG` |
| Functions | `camelCase` | `fetchBookings()`, `isDamagedBoat()` |
| Classes | `PascalCase` | `BookingService`, `TVDisplayConfig` |
| Interfaces/Types | `PascalCase` | `Booking`, `Asset`, `Config` |
| Zod Schemas | `PascalCase` + `Schema` suffix | `BookingSchema`, `AssetSchema` |
| Enums | `PascalCase` | `SessionType`, `BoatClassification` |
| Files (source) | `kebab-case` | `tv-display-config.ts`, `scraper.ts` |
| Files (test) | `kebab-case.test.ts` | `tv-display-config.test.ts` |

### 2.5 Function Design

- **Keep functions small**: Max 50 lines (ideally <20)
- **Single responsibility**: One function, one purpose
- **Pure functions preferred**: Avoid side effects where possible
- **Explicit is better than clever**: Readability over brevity

```typescript
// ✅ Good: Clear, single purpose
function isDamagedBoat(boat: Asset): boolean {
  const nickname = (boat.nickname || '').toLowerCase();
  const displayName = (boat.displayName || '').toLowerCase();
  const fullName = (boat.fullName || '').toLowerCase();

  return nickname.includes('damaged') ||
         displayName.includes('damaged') ||
         fullName.includes('damaged');
}

// ❌ Avoid: Too clever, hard to read
function isDamagedBoat(boat: Asset): boolean {
  return ['nickname', 'displayName', 'fullName']
    .some(k => (boat[k] || '').toLowerCase().includes('damaged'));
}
```

---

## 3. Code Style & Formatting

### 3.1 Basic Formatting

- **Indentation**: 2 spaces (no tabs)
- **Line length**: 100 characters max (aim for 80)
- **Quotes**: Single quotes for strings, backticks for templates
- **Semicolons**: Required
- **Trailing commas**: Use in multi-line arrays/objects

```typescript
const config = {
  name: 'My Config',
  value: 42,
  items: [
    'first',
    'second',
    'third', // ✅ Trailing comma
  ],
};
```

### 3.2 Comments & Documentation

#### JSDoc Comments for Public APIs

```typescript
/**
 * Fetches boat bookings from RevSport API.
 *
 * @param boatId - The unique identifier for the boat
 * @param startDate - Start date in YYYY-MM-DD format
 * @param endDate - End date in YYYY-MM-DD format
 * @returns Array of bookings for the specified boat and date range
 * @throws {ValidationError} If date format is invalid
 * @throws {NetworkError} If API request fails
 */
export async function fetchBookings(
  boatId: string,
  startDate: string,
  endDate: string,
): Promise<Booking[]> {
  // Implementation...
}
```

#### Inline Comments

- Use sparingly - code should be self-documenting
- Explain **WHY**, not **WHAT**
- Required for:
  - Complex algorithms
  - Non-obvious workarounds
  - Performance optimizations
  - Business logic decisions

```typescript
// ✅ Good: Explains WHY
// Use bundler resolution to avoid Node.js module deprecation warning
"moduleResolution": "bundler"

// ❌ Bad: Explains obvious WHAT
// Set the boat name to the name parameter
boatName = name;
```

### 3.3 File Headers

All source files should include a header comment:

```typescript
/**
 * Module Name/Purpose
 *
 * Brief description of what this module does.
 * Additional context if needed.
 */
```

---

## 4. Architecture Principles

### 4.1 Project Structure

Each project follows a standard structure:

```
project-name/
├── src/
│   ├── models/          # Data models, schemas, types
│   │   └── __tests__/
│   ├── services/        # Business logic, API clients
│   │   └── __tests__/
│   ├── utils/           # Utility functions
│   │   └── __tests__/
│   ├── server/          # Express server (if applicable)
│   └── index.ts         # Entry point
├── public/              # Static assets (CSS, JS, images)
├── config/              # Configuration files (gitignored)
├── dist/                # Build output (gitignored)
├── package.json
├── tsconfig.json
└── README.md
```

### 4.2 Separation of Concerns

#### Layer Responsibilities

1. **Models** (`src/models/`)
   - Data structures and types
   - Zod schemas for validation
   - Type definitions
   - NO business logic

2. **Services** (`src/services/`)
   - Business logic
   - External API interactions
   - Data transformations
   - Authentication and authorization

3. **Utils** (`src/utils/`)
   - Pure functions
   - Helpers and formatters
   - NO external dependencies
   - Reusable across projects

4. **Server** (`src/server/`)
   - HTTP routing
   - Middleware configuration
   - Request/response handling
   - Minimal logic (delegate to services)

#### Dependency Flow

```
Server → Services → Models
  ↓         ↓         ↓
Utils  ←  Utils  ←  Utils
```

- Higher layers depend on lower layers
- Lower layers NEVER depend on higher layers
- Utils are shared across all layers

### 4.3 Shared Code

#### When to Create a Shared Library

Create shared code (`lmrc-config`, etc.) when:
- Code is used by 2+ projects
- Code represents core domain logic
- Code provides cross-cutting concerns (auth, logging)

Keep code project-specific when:
- Used by only one project
- Specific to a particular use case
- Unlikely to be reused

#### Shared Library Structure

```
lmrc-config/
├── src/
│   ├── auth/           # Shared authentication
│   ├── config/         # Shared configuration
│   └── validation/     # Shared validators
├── package.json        # Published to npm or used via file: protocol
└── README.md
```

### 4.4 API Design

#### REST Endpoints

- Use standard HTTP methods: GET, POST, PUT, DELETE
- Use plural nouns: `/api/bookings`, `/api/boats`
- Use hyphens, not underscores: `/api/boat-types`
- Version APIs: `/api/v1/bookings`

```typescript
// ✅ Good API design
app.get('/api/v1/bookings', getBookings);
app.get('/api/v1/bookings/:id', getBooking);
app.post('/api/v1/bookings', createBooking);
app.put('/api/v1/bookings/:id', updateBooking);
app.delete('/api/v1/bookings/:id', deleteBooking);
```

#### Response Format

```typescript
// Success response
{
  "success": true,
  "data": { ... }
}

// Error response
{
  "success": false,
  "error": {
    "message": "Human-readable error",
    "code": "ERROR_CODE",
    "details": { ... }
  }
}
```

---

## 5. Configuration Management

### 5.1 Environment Variables

**Use `.env` files for secrets and environment-specific config:**

```bash
# .env (NEVER commit - add to .gitignore)
REVSPORT_USERNAME=user@example.com
REVSPORT_PASSWORD=secretpassword
BASE_URL=https://example.com
DEBUG=true
```

**Load with `dotenv`:**

```typescript
import 'dotenv/config';

const config = {
  username: process.env.REVSPORT_USERNAME,
  password: process.env.REVSPORT_PASSWORD,
};
```

### 5.2 Configuration Files

**Two types of configuration:**

1. **Code Configuration** (committed to git)
   - Default values
   - Schema definitions
   - Fallback configurations
   - Example: `src/models/tv-display-config.ts`

2. **Runtime Configuration** (gitignored)
   - Per-device customization
   - Secrets and credentials
   - Environment-specific overrides
   - Example: `config/tv-display.json`

**Pattern:**

```typescript
// src/models/config.ts (committed)
export const DEFAULT_CONFIG = {
  refreshInterval: 300000,
  logoUrl: '/images/default-logo.png',
};

// config/custom.json (gitignored)
{
  "logoUrl": "/images/club-logo.png",
  "colors": { ... }
}

// Merge at runtime
const config = { ...DEFAULT_CONFIG, ...loadRuntimeConfig() };
```

### 5.3 Validation

**Always validate configuration with Zod:**

```typescript
import { z } from 'zod';

const ConfigSchema = z.object({
  baseUrl: z.string().url(),
  refreshInterval: z.number().int().min(60000).max(3600000),
  debug: z.boolean().default(false),
});

export function loadConfig() {
  const rawConfig = loadFromFile();
  return ConfigSchema.parse(rawConfig); // Throws if invalid
}
```

---

## 6. Git Workflow

### 6.1 Branch Strategy

- **main**: Production-ready code
- **feature/[name]**: New features
- **fix/[name]**: Bug fixes
- **refactor/[name]**: Code refactoring
- **docs/[name]**: Documentation updates

### 6.2 Commit Messages

**Format:**

```
<type>: <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring (no functional changes)
- `docs`: Documentation updates
- `test`: Adding or updating tests
- `chore`: Build, dependencies, tooling

**Examples:**

```
feat: Add damaged boat indicator to TV display

Implements visual indicator for boats marked as damaged:
- Light red background for damaged boat rows
- Warning icon in boat info section
- "DAMAGED" overlay text across booking columns

Closes #123
```

```
fix: Detect damaged boats across all name fields

Previously only checked nickname field. Now checks nickname,
displayName, and fullName to ensure damaged boats are always
detected regardless of which field contains "damaged".
```

### 6.3 Pull Requests

**Before creating a PR:**
1. ✅ All tests pass (`npm run test:run`)
2. ✅ Code builds without errors (`npm run build`)
3. ✅ No TypeScript errors (`npm run type-check`)
4. ✅ New code includes tests
5. ✅ Documentation updated if needed

**PR Template:**

```markdown
## Summary
Brief description of changes

## Changes
- Bullet list of key changes
- Focus on WHAT and WHY

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
Visual changes or new UI elements
```

### 6.4 What to Commit vs Gitignore

#### Always Commit:
- ✅ Source code (`src/`)
- ✅ Tests (`__tests__/`)
- ✅ Public assets (CSS, images)
- ✅ Package files (`package.json`, `tsconfig.json`)
- ✅ Documentation (`.md` files)
- ✅ Default configuration schemas

#### Never Commit:
- ❌ `node_modules/`
- ❌ `dist/` or build output
- ❌ `.env` files with secrets
- ❌ Runtime configuration files (`config/*.json`)
- ❌ Log files
- ❌ IDE-specific files (`.vscode/`, `.idea/`)
- ❌ OS files (`.DS_Store`, `Thumbs.db`)

**Standard `.gitignore`:**

```gitignore
# Dependencies
node_modules/

# Build output
dist/
build/

# Environment & Config
.env
.env.local
config/*.json
!config/example.json

# Logs
logs/
*.log

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db
```

---

## 7. Documentation Standards

### 7.1 Required Documentation

Every project MUST have:

1. **README.md** - Project overview, setup, usage
2. **Inline code comments** - For complex logic
3. **JSDoc comments** - For public APIs
4. **Type definitions** - TypeScript types or Zod schemas

### 7.2 README Structure

```markdown
# Project Name

Brief description (1-2 sentences)

## Features
- Bullet list of key features

## Prerequisites
- Node.js version
- Other dependencies

## Installation
Step-by-step setup instructions

## Configuration
How to configure the application

## Usage
How to run in development and production

## Testing
How to run tests

## Deployment
Production deployment instructions

## Troubleshooting
Common issues and solutions
```

### 7.3 Solution-Level Documentation

Maintained at repository root:

- **ARCHITECTURE.md** - System architecture and design
- **CONVENTIONS.md** - This document
- **PRODUCT_ROADMAP.md** - Product vision and future plans
- **TESTING_STRATEGY.md** - Testing approach and standards
- **IMPLEMENTATION_PLAN.md** - Current development plan

### 7.4 Keeping Documentation Current

- Update docs in the SAME commit as code changes
- Document WHY decisions were made (ADRs for major decisions)
- Include examples and code snippets
- Keep deployment docs accurate after infrastructure changes

---

## 8. Security Practices

### 8.1 Authentication

**Use shared authentication library** for consistency:

```typescript
import { authenticate } from 'lmrc-config/auth';

const session = await authenticate({
  baseUrl: config.baseUrl,
  username: config.username,
  password: config.password,
});
```

### 8.2 Credentials Management

**NEVER hardcode credentials:**

```typescript
// ❌ NEVER do this
const password = 'mypassword123';

// ✅ Use environment variables
const password = process.env.REVSPORT_PASSWORD;

// ✅ Validate they exist
if (!password) {
  throw new Error('REVSPORT_PASSWORD environment variable not set');
}
```

### 8.3 Input Validation

**Validate ALL external input with Zod:**

```typescript
// ✅ Validate API responses
const response = await fetch(url);
const data = await response.json();
const validated = BookingSchema.parse(data); // Throws if invalid

// ✅ Validate user input
app.post('/api/bookings', async (req, res) => {
  try {
    const booking = BookingSchema.parse(req.body);
    // Process validated data
  } catch (error) {
    res.status(400).json({ error: 'Invalid booking data' });
  }
});
```

### 8.4 Dependency Security

- Run `npm audit` regularly
- Update dependencies quarterly (minimum)
- Review security advisories for critical dependencies
- Pin major versions in `package.json`

### 8.5 API Security

**Express security middleware:**

```typescript
import helmet from 'helmet';
import cors from 'cors';

app.use(helmet()); // Security headers
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
}));
```

---

## 9. Error Handling

### 9.1 Error Types

Define custom error classes for different scenarios:

```typescript
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'NetworkError';
  }
}
```

### 9.2 Error Handling Pattern

```typescript
try {
  const result = await riskyOperation();
  return result;
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
    // Handle validation error
  } else if (error instanceof NetworkError) {
    console.error('Network request failed:', error.message);
    // Handle network error
  } else {
    console.error('Unexpected error:', error);
    throw error; // Re-throw unknown errors
  }
}
```

### 9.3 Logging

**Use structured logging:**

```typescript
import { createLogger } from './utils/logger.js';

const logger = createLogger('BookingService');

logger.info('Fetching bookings', { boatId, startDate, endDate });
logger.error('Failed to fetch bookings', { error, boatId });
logger.debug('Cache hit', { key: cacheKey });
```

**Log levels:**
- `error`: Errors that need attention
- `warn`: Warnings that might need attention
- `info`: General information about application flow
- `debug`: Detailed diagnostic information

### 9.4 User-Facing Errors

- NEVER expose internal error details to users
- Provide actionable error messages
- Include error codes for support purposes

```typescript
// ❌ Bad: Exposes internal details
res.status(500).json({ error: error.stack });

// ✅ Good: User-friendly message
res.status(500).json({
  error: 'Unable to load bookings. Please try again later.',
  code: 'BOOKING_FETCH_ERROR',
});
```

---

## 10. Performance Guidelines

### 10.1 Caching Strategy

**Cache expensive operations:**

```typescript
const cache = new Map();

export async function getCachedData(key: string) {
  if (cache.has(key)) {
    return cache.get(key);
  }

  const data = await fetchExpensiveData(key);
  cache.set(key, data);
  return data;
}
```

**Cache TTL for different data types:**
- Static content: 24 hours
- Boat bookings: 5-10 minutes
- Configuration: 1 hour
- Authentication sessions: 30 minutes

### 10.2 API Request Optimization

**Batch requests when possible:**

```typescript
// ❌ Bad: Sequential requests
for (const boat of boats) {
  await fetchBookings(boat.id);
}

// ✅ Good: Parallel requests with concurrency limit
const results = await Promise.all(
  boats.map(boat => fetchBookings(boat.id))
);
```

**Rate limiting:**
- Respect upstream API rate limits (RevSport: 2s between batches)
- Implement exponential backoff on failures
- Use `axios-retry` for automatic retries

### 10.3 Frontend Performance

**CSS custom properties for theming:**

```css
:root {
  --primary-color: #1e40af;
  --refresh-interval: 300000;
}

.element {
  color: var(--primary-color);
}
```

**Minimize DOM manipulation:**
- Use `DocumentFragment` for bulk inserts
- Debounce rapid updates
- Avoid layout thrashing

### 10.4 Memory Management

- Clear intervals/timers when no longer needed
- Limit cache size with LRU eviction
- Avoid circular references
- Monitor memory usage in long-running processes

---

## Appendix: Quick Reference

### Testing Checklist

- [ ] Tests written BEFORE marking feature complete
- [ ] All tests pass (`npm run test:run`)
- [ ] Coverage >80% on new code
- [ ] Both happy path and error cases tested

### Pre-Commit Checklist

- [ ] Code builds (`npm run build`)
- [ ] Tests pass (`npm run test:run`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Code formatted consistently
- [ ] No console.log() left in code (use logger)
- [ ] Secrets not committed
- [ ] Documentation updated

### Code Review Checklist

- [ ] Tests included and passing
- [ ] Error handling implemented
- [ ] Input validation with Zod
- [ ] No hardcoded values (use config)
- [ ] Logging appropriate
- [ ] Comments explain WHY not WHAT
- [ ] Follows naming conventions
- [ ] No duplicate code

---

**Questions or suggestions?** This document is maintained in the repository root and should be updated as conventions evolve. Propose changes via pull request with justification.
