import logger from '../logger';

// Mock console methods
const originalConsole = {
  log: console.log,
  error: console.error,
  warn: console.warn,
  info: console.info,
};

beforeEach(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
  console.info = jest.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

describe('logger utility', () => {
  describe('in development environment', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        configurable: true
      });
    });

    it('should log messages to console', () => {
      logger.log('test message');
      expect(console.log).toHaveBeenCalledWith('test message');
    });

    it('should log errors to console', () => {
      logger.error('error message');
      expect(console.error).toHaveBeenCalledWith('error message');
    });

    it('should log warnings to console', () => {
      logger.warn('warning message');
      expect(console.warn).toHaveBeenCalledWith('warning message');
    });

    it('should support warn method', () => {
      logger.warn('warning message');
      expect(console.warn).toHaveBeenCalledWith('warning message');
    });

    it('should handle multiple arguments', () => {
      logger.log('message', { data: 'test' }, 123);
      expect(console.log).toHaveBeenCalledWith('message', { data: 'test' }, 123);
    });
  });

  describe('in production environment', () => {
    let originalEnv: string | undefined;
    
    beforeEach(() => {
      originalEnv = process.env.NODE_ENV;
      // Clear module cache to force re-evaluation
      jest.resetModules();
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'production',
        configurable: true
      });
      jest.clearAllMocks();
    });
    
    afterEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: originalEnv,
        configurable: true
      });
      jest.resetModules();
    });

    it('should not log regular messages in production', () => {
      // Re-import logger with production NODE_ENV
      const logger = require('../logger').default;
      logger.log('test message');
      expect(console.log).not.toHaveBeenCalled();
    });

    it('should still log errors in production', () => {
      const logger = require('../logger').default;
      logger.error('error message');
      expect(console.error).toHaveBeenCalledWith('error message');
    });

    it('should not log warnings in production', () => {
      const logger = require('../logger').default;
      logger.warn('warning message');
      expect(console.warn).not.toHaveBeenCalled();
    });
  });
});