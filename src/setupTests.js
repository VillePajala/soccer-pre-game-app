import '@testing-library/jest-dom';

// Mock window.location if needed by tests
const originalLocation = window.location;

// Mock localStorage and sessionStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn(key => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    getAll: () => store,
  };
})();

// Mock window APIs
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

Object.defineProperty(window, 'sessionStorage', {
  value: localStorageMock,
});

// Mock alert/confirm/prompt
window.alert = jest.fn();
window.confirm = jest.fn();
window.prompt = jest.fn();

// Mock URL API if needed by tests
global.URL.createObjectURL = jest.fn(() => 'blob:mockedurl/123');
global.URL.revokeObjectURL = jest.fn();

// Restore all mocks after each test
afterEach(() => {
  jest.restoreAllMocks();
  localStorageMock.clear();
});

// Clean up after all tests complete
afterAll(() => {
  // Restore original window.location if it was modified
  Object.defineProperty(window, 'location', { value: originalLocation });
}); 