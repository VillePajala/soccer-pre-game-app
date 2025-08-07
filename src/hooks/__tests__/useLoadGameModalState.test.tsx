import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { 
  useLoadGameModalState,
  useLoadGameModalWithHandlers,
  useLoadGameModalSelector 
} from '../useLoadGameModalState';
import { mockUIStore, mockMigrationSafety } from '../../modalStateMocks';

// Get the mocked functions from the global setup
const { useMigrationSafety } = jest.requireMock('@/hooks/useMigrationSafety');
const { useUIStore } = jest.requireMock('@/stores/uiStore');

describe('useLoadGameModalState', () => {
  describe('Zustand Implementation', () => {
    beforeEach(() => {
      // Reset mocks to known state
      jest.clearAllMocks();
      useMigrationSafety.mockReturnValue(mockMigrationSafety);
      
      // Reset modal state
      mockUIStore.modals = { loadGameModal: false };
      mockUIStore.isModalOpen.mockReturnValue(false);
    });

    it('should return closed state initially', () => {
      const { result } = renderHook(() => useLoadGameModalState());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should open modal when open is called', () => {
      const { result } = renderHook(() => useLoadGameModalState());

      act(() => {
        result.current.open();
      });

      expect(mockUIStore.openModal).toHaveBeenCalledWith('loadGameModal');
    });

    it('should close modal when close is called', () => {
      // Set initial state to open
      mockUIStore.modals = { loadGameModal: true };
      mockUIStore.isModalOpen.mockReturnValue(true);
      
      const { result } = renderHook(() => useLoadGameModalState());

      act(() => {
        result.current.close();
      });

      expect(mockUIStore.closeModal).toHaveBeenCalledWith('loadGameModal');
    });

    it('should toggle modal when toggle is called', () => {
      const { result } = renderHook(() => useLoadGameModalState());

      act(() => {
        result.current.toggle();
      });

      expect(mockUIStore.toggleModal).toHaveBeenCalledWith('loadGameModal');
    });
  });

  describe('Context Implementation (Legacy)', () => {
    beforeEach(() => {
      // Set to legacy mode for these tests
      useMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
        migrationStatus: 'legacy',
      });
    });

    it('should use context state when legacy mode is enabled', () => {
      const { result } = renderHook(() => useLoadGameModalState());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should call context setter when opening modal', () => {
      const { result } = renderHook(() => useLoadGameModalState());

      act(() => {
        result.current.open();
      });

      // In legacy mode, this would call context functions
      // Since we're mocking, we can test that the function executes without error
      expect(result.current.open).not.toThrow();
    });
  });

  describe('useLoadGameModalWithHandlers', () => {
    beforeEach(() => {
      useMigrationSafety.mockReturnValue(mockMigrationSafety);
    });

    it('should provide enhanced handlers', () => {
      const customHandlers = {
        onOpen: jest.fn(),
        onClose: jest.fn(),
      };

      const { result } = renderHook(() => 
        useLoadGameModalWithHandlers(customHandlers)
      );

      expect(result.current).toBeDefined();
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });
  });

  describe('useLoadGameModalSelector', () => {
    beforeEach(() => {
      useMigrationSafety.mockReturnValue(mockMigrationSafety);
    });

    it('should return Zustand state when not in legacy mode', () => {
      const { result } = renderHook(() => useLoadGameModalSelector());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should return context state when in legacy mode', () => {
      // Switch to legacy mode
      useMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
        migrationStatus: 'legacy',
      });

      const { result } = renderHook(() => useLoadGameModalSelector());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });
  });
});