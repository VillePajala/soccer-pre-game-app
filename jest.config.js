import nextJest from 'next/jest.js'; // Use .js extension

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js', '<rootDir>/src/setupModalTests.ts', '<rootDir>/src/setupFormStoreMocks.ts', '<rootDir>/src/setupAccessibilityTests.ts'],
  
  testEnvironment: 'jest-environment-jsdom',
  testPathIgnorePatterns: ['<rootDir>/e2e/', '<rootDir>/.next/', '<rootDir>/node_modules/'],
  testMatch: ['<rootDir>/src/**/*.(test|spec).{js,jsx,ts,tsx}'],
  moduleNameMapper: {
    '^@/i18n$': '<rootDir>/src/__mocks__/i18n.ts',
    '^@/utils/logger$': '<rootDir>/src/utils/__mocks__/logger.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@supabase/supabase-js$': '<rootDir>/src/__mocks__/@supabase/supabase-js.ts',
    '^@supabase/ssr$': '<rootDir>/src/__mocks__/@supabase/ssr.ts',
    '^next/headers$': '<rootDir>/src/__mocks__/next/headers.ts',
    '^../lib/supabase$': '<rootDir>/src/__mocks__/lib/supabase.ts',
    '^../../lib/supabase$': '<rootDir>/src/__mocks__/lib/supabase.ts',
    '^i18next$': '<rootDir>/src/__mocks__/i18n.ts',
    '^react-i18next$': '<rootDir>/src/__mocks__/react-i18next.ts',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '<rootDir>/tests/', // Ignore Playwright specs
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    // Exclude debug/test/verification pages from coverage
    '!src/app/debug*/**',
    '!src/app/test*/**',
    '!src/app/check*/**',
    '!src/app/verify*/**',
    '!src/app/fix*/**',
    '!src/app/diagnose*/**',
    '!src/app/cleanup*/**',
    '!src/app/analyze*/**',
    '!src/app/import-backup/**',
    '!src/app/reset-supabase/**',
    '!src/app/refresh-games-cache/**',
    '!src/app/storage-diagnostic/**',
    '!src/app/env-check/**',
    '!src/app/simple-test/**',
    '!src/app/storage-config/**',
    '!src/app/auth-debug/**',
    '!src/app/password-reset-help/**'
  ],
  // Week 1 Coverage Thresholds - Gradual Ramp Up
  coverageThreshold: {
    // Start with current levels + 2-3% improvement
    global: { 
      statements: 45, 
      lines: 45, 
      functions: 41, 
      branches: 38 
    }
    // Focus on specific high-value utils first
    // Will add scope-specific gates as we improve individual files
  },
  // Add transform for ts-jest if needed, but next/jest should handle it
  // transform: {
  //   '^.+\\.(ts|tsx)$?': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  // },
  
  // Coverage reporting
  coverageReporters: ['text-summary', 'html', 'lcov'],
  coverageDirectory: 'coverage',
  
  // Help with async operations cleanup - Week 1 hardening
  testTimeout: 15000,
  detectOpenHandles: true, // Enable to find async leaks
  forceExit: false, // Disable force exit to properly detect issues
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig); 
