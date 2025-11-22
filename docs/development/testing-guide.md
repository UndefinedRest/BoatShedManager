# Testing Guide

**Last Updated**: 2025-11-22
**Status**: TODO - Needs consolidation from test documentation

---

## Overview

LMRC uses **test-first development** principles. All changes require test coverage before production deployment.

## Testing Framework

- **Framework**: Vitest
- **Current Coverage**: 86.36%
- **Target**: Maintain >80% coverage

## Running Tests

### All Tests

```bash
npm test
```

### Coverage Report

```bash
npm run test:coverage
```

### Watch Mode

```bash
npm run test:watch
```

## Writing Tests

TODO: Document testing patterns and best practices

### Test Structure

TODO: Example test structure

### Mocking External Dependencies

TODO: Document mocking strategies for:
- RevSport API calls
- File system operations
- External web scraping

## Current Test Coverage

**As of 2025-11-21**:
- Overall: 86.36%
- Statements: 86.36%
- Branches: 82.14%
- Functions: 77.77%
- Lines: 86.36%

See [Testing Strategy](../../TESTING_STRATEGY.md) for detailed baseline.

## Integration Testing

TODO: Document integration testing approach

## Testing on Pi

TODO: Document how to test on actual Pi hardware

---

**References**:
- [TESTING_STRATEGY.md](../../TESTING_STRATEGY.md)
- [Testing Strategy Discussion](.claude/session-notes/2025-11-21.md)
