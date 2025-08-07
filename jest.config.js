import nextJest from 'next/jest.js'; // Use .js extension

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js', '<rootDir>/src/setupModalTests.ts'],
  
  testEnvironment: 'jest-environment-jsdom',
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
  coverageThreshold: {
    global: {
      branches: 34,
      functions: 37,
      lines: 39,
      statements: 39,
    },
  },
  // Add transform for ts-jest if needed, but next/jest should handle it
  // transform: {
  //   '^.+\\.(ts|tsx)$?': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  // },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig); 
