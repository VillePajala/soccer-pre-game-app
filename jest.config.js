module.exports = {
  preset: 'ts-jest', // Re-add the preset
  testEnvironment: 'jsdom', // Use jsdom for browser-like environment (mocks localStorage, etc.)
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    '<rootDir>/tests/' // Ignore Playwright tests in the 'tests' directory
  ],
  moduleNameMapper: {
    // Handle module path aliases (like @/) if you have them in tsconfig.json
    // Example: '^@/(.*)$': '<rootDir>/src/$1'
    // Adjust this line based on your actual tsconfig.json path aliases
    '^@/(.*)$': '<rootDir>/src/$1' 
  },
  // Setup file to run before each test for global mocks and DOM matchers
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
  // Use babel-jest to transform js, jsx, ts, and tsx files
  transform: {
    // Use ts-jest for ts and tsx files, configuring JSX handling
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      // Explicitly tell ts-jest to use react-jsx within its tsconfig override
      tsconfig: {
        jsx: 'react-jsx',
        // Import helpers is sometimes needed with module interop issues
        importHelpers: true, 
      }
    }],
    // If you have other file types requiring transformation (e.g., CSS modules), add them here
  },
  // Correctly escaped regex for ignore patterns
  transformIgnorePatterns: [
    '/node_modules/', // Keep ignoring node_modules by default
    '\\\\.pnp\\\\.[^\\\\]+$', // Correctly escape backslashes for .pnp.js
  ],
}; 