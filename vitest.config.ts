import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      include: ['scripts/**/*.js'],
      exclude: [
        'node_modules/**',
        'scripts/__tests__/**',
        'scripts/test-parse.js',
        'scripts/debug-*.js',
        'scripts/generate-qr-codes.js', // Phase 2 - non-critical
      ],
      all: true,
      thresholds: {
        lines: 20,
        functions: 9,
        branches: 27,
        statements: 19,
      },
      // NOTE: Threshold set to current coverage of critical parseBoatName function (42 tests)
      // TODO Phase 2: Add integration tests with mocked axios/fs to reach 50% coverage
    },
  },
});
