/**
 * UIStore Integration Tests
 * 
 * Simplified tests for the centralized UI state management store.
 */

import { renderHook, act } from '@testing-library/react';

// Clear the UIStore mock from setupModalTests.ts to test the real implementation
jest.unmock('../uiStore');
jest.unmock('@/stores/uiStore');

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
      
      // Test initial state
      expect(typeof result.current.isAnyModalOpen).toBe('function');
      expect(result.current.isAnyModalOpen()).toBe(false);
      expect(Array.isArray(result.current.modalStack)).toBe(true);
      expect(result.current.modalStack.length).toBe(0);

      // Test opening modal
      act(() => {
        result.current.openModal('settingsModal');
      });
      expect(result.current.isModalOpen('settingsModal')).toBe(true);
      expect(result.current.modalStack).toContain('settingsModal');
      expect(result.current.modalStack[result.current.modalStack.length - 1]).toBe('settingsModal');
      expect(result.current.isAnyModalOpen()).toBe(true);

      // Test opening another modal
      act(() => {
        result.current.openModal('gameStatsModal');
      });
      expect(result.current.modalStack).toContain('gameStatsModal');
      expect(result.current.modalStack[result.current.modalStack.length - 1]).toBe('gameStatsModal');

      // Test closing specific modal
      act(() => {
        result.current.closeModal('gameStatsModal');
      });
      expect(result.current.isModalOpen('gameStatsModal')).toBe(false);
      expect(result.current.modalStack).not.toContain('gameStatsModal');
      expect(result.current.isAnyModalOpen()).toBe(true); // settingsModal still open

      // Test closing all modals
      act(() => {
        result.current.closeAllModals();
      });
      expect(result.current.isAnyModalOpen()).toBe(false);
      expect(result.current.modalStack.length).toBe(0);
    });

    it('toggleModal maintains stack consistency', () => {
      const { result } = renderHook(() => useUIStore());

      // Test toggle to open
      act(() => {
        result.current.toggleModal('rosterSettingsModal');
      });
      expect(result.current.isModalOpen('rosterSettingsModal')).toBe(true);
      expect(result.current.modalStack).toContain('rosterSettingsModal');

      // Test toggle to close
      act(() => {
        result.current.toggleModal('rosterSettingsModal');
      });
      expect(result.current.isModalOpen('rosterSettingsModal')).toBe(false);
      expect(result.current.modalStack).not.toContain('rosterSettingsModal');
    });
  });

});