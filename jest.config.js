module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.test.js'
  ],
  collectCoverageFrom: [
    'nodes/**/*.ts',
    '!nodes/**/*.d.ts',
    '!nodes/**/*.test.ts',
    '!**/node_modules/**',
    '!**/dist/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  testTimeout: 60000, // 60 seconds for integration tests
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      skipLibCheck: true,
      strict: false,
      noImplicitAny: false,
      strictNullChecks: false,
      strictFunctionTypes: false,
      strictBindCallApply: false,
      strictPropertyInitialization: false,
      noImplicitReturns: false,
      noFallthroughCasesInSwitch: false,
      noUncheckedIndexedAccess: false,
      noImplicitOverride: false,
      allowUnusedLabels: true,
      allowUnreachableCode: true
    }],
  },
  moduleFileExtensions: ['ts', 'js', 'json']
};
