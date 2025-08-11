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

  describe('Modal stack behavior', () => {
    it('pushes to and pops from modalStack correctly', () => {
      const { result } = renderHook(() => useUIStore());
      expect(result.current.isAnyModalOpen()).toBe(false);

      act(() => {
        result.current.openModal('settingsModal');
      });
      expect(result.current.isModalOpen('settingsModal')).toBe(true);
      expect(result.current.modalStack[result.current.modalStack.length - 1]).toBe('settingsModal');
      expect(result.current.isAnyModalOpen()).toBe(true);

      act(() => {
        result.current.openModal('gameStatsModal');
      });
      expect(result.current.modalStack[result.current.modalStack.length - 1]).toBe('gameStatsModal');

      act(() => {
        result.current.closeModal('gameStatsModal');
      });
      expect(result.current.isModalOpen('gameStatsModal')).toBe(false);
      expect(result.current.modalStack.includes('gameStatsModal')).toBe(false);
      expect(result.current.isAnyModalOpen()).toBe(true);

      act(() => {
        result.current.closeAllModals();
      });
      expect(result.current.isAnyModalOpen()).toBe(false);
      expect(result.current.modalStack.length).toBe(0);
    });

    it('toggleModal maintains stack consistency', () => {
      const { result } = renderHook(() => useUIStore());

      act(() => {
        result.current.toggleModal('rosterSettingsModal');
      });
      expect(result.current.isModalOpen('rosterSettingsModal')).toBe(true);
      expect(result.current.modalStack.includes('rosterSettingsModal')).toBe(true);

      act(() => {
        result.current.toggleModal('rosterSettingsModal');
      });
      expect(result.current.isModalOpen('rosterSettingsModal')).toBe(false);
      expect(result.current.modalStack.includes('rosterSettingsModal')).toBe(false);
    });
  });

});