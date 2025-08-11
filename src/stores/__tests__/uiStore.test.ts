/**
 * UIStore Integration Tests
 * 
 * Simplified tests for the centralized UI state management store.
 */

import { renderHook, act } from '@testing-library/react';
import { 
  useUIStore
} from '../uiStore';

// Mock logger to avoid console output during tests
jest.mock('@/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

describe('UIStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Store Operations', () => {
    it('should initialize without throwing', () => {
      expect(() => {
        renderHook(() => useUIStore());
      }).not.toThrow();
    });

    it('should provide store interface', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(result.current).toBeDefined();
      expect(typeof result.current.openModal).toBe('function');
      expect(typeof result.current.closeModal).toBe('function');
      expect(typeof result.current.modals).toBe('object');
    });

    it('should execute modal operations without throwing', () => {
      const { result } = renderHook(() => useUIStore());
      
      expect(() => {
        act(() => {
          result.current.openModal('saveGameModal');
          result.current.closeModal('saveGameModal');
        });
      }).not.toThrow();
    });
  });

});