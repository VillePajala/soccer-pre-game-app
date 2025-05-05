module.exports = {
  preset: 'ts-jest',
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
  // Optional: Setup file to run before each test (e.g., for global mocks)
  // setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], 
}; 