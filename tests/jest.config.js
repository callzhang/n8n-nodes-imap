/**
 * Jest Configuration for IMAP Enhanced Node Tests
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.js',
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],

  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],

  // Transform files
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },

  // TypeScript configuration
  globals: {
    'ts-jest': {
      tsconfig: {
        target: 'es2018',
        module: 'commonjs',
        lib: ['es2018'],
        allowJs: true,
        outDir: './dist',
        rootDir: './',
        strict: true,
        moduleResolution: 'node',
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
      },
    },
  },

  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/nodes/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
  },

  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: '<rootDir>/tests/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },

  // Test timeout
  testTimeout: 30000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks after each test
  restoreMocks: true,

  // Test patterns to ignore
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
  ],

  // Module paths to ignore
  modulePathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],

  // Global setup
  globalSetup: '<rootDir>/tests/global-setup.ts',

  // Global teardown
  globalTeardown: '<rootDir>/tests/global-teardown.ts',

  // Test results processor
  testResultsProcessor: '<rootDir>/tests/test-results-processor.js',

  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],

  // Error handling
  errorOnDeprecated: true,

  // Bail on first failure (useful for CI)
  bail: false,

  // Max workers
  maxWorkers: '50%',

  // Cache directory
  cacheDirectory: '<rootDir>/tests/.jest-cache',
};
