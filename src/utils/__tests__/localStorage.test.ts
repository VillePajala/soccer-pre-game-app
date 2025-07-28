import { getStorage } from '../localStorage';

// Mock window and localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

// Mock logger to avoid console output
jest.mock('@/utils/logger', () => ({
  __esModule: true,
  default: {
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('localStorage utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getStorage', () => {
    it('should return localStorage when available', () => {
      const storage = getStorage();
      expect(storage).toBe(mockLocalStorage);
    });

    it('should return null when window is undefined', () => {
      const originalWindow = global.window;
      // @ts-ignore
      delete global.window;
      
      const storage = getStorage();
      expect(storage).toBeNull();
      
      global.window = originalWindow;
    });

    it('should return null when localStorage throws error', () => {
      const originalLocalStorage = window.localStorage;
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new Error('localStorage not available');
        },
        configurable: true,
      });
      
      const storage = getStorage();
      expect(storage).toBeNull();
      
      // Restore
      Object.defineProperty(window, 'localStorage', {
        value: originalLocalStorage,
        writable: true,
      });
    });

    it('should handle storage access', () => {
      // Just test that the function works without getting into complex mocking
      const storage = getStorage();
      expect(storage).toBeTruthy();
      expect(typeof storage?.getItem).toBe('function');
    });
  });
});