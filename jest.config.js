import nextJest from 'next/jest.js'; // Use .js extension

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
});

// Add any custom config to be passed to Jest
/** @type {import('jest').Config} */
const customJestConfig = {
  // Add more setup options before each test is run
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'], // Keep using .js
  
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@supabase/supabase-js$': '<rootDir>/src/__mocks__/@supabase/supabase-js.ts',
    '^@supabase/ssr$': '<rootDir>/src/__mocks__/@supabase/ssr.ts',
    '^next/headers$': '<rootDir>/src/__mocks__/next/headers.ts',
    '^../lib/supabase$': '<rootDir>/src/__mocks__/supabase.ts',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.next/',
    '<rootDir>/tests/', // Ignore Playwright specs
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}'
  ],
  coverageThreshold: {
    global: {
      branches: 30,
      functions: 40,
      lines: 40,
      statements: 40,
    },
  },
  // Add transform for ts-jest if needed, but next/jest should handle it
  // transform: {
  //   '^.+\\.(ts|tsx)$?': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  // },
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(customJestConfig); 
