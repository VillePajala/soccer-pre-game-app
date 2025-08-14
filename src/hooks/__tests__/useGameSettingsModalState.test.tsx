import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { 
  useGameSettingsModalState,
  useGameSettingsModalWithHandlers,
  useGameSettingsModal 
} from '../useGameSettingsModalState';
import { useUIStore } from '@/stores/uiStore';

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('@/stores/uiStore', () => ({
  useUIStore: jest.fn(),
}));

const mockUseUIStore = useUIStore as jest.MockedFunction<typeof useUIStore>;

describe('useGameSettingsModalState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Zustand Implementation', () => {
    beforeEach(() => {
      const mockStore = {
        modals: { gameSettingsModal: false },
        openModal: jest.fn(),
        closeModal: jest.fn(),
      };

      mockUseUIStore.mockImplementation((selector: any) => {
        if (typeof selector === 'function') {
          return selector(mockStore);
        }
        return mockStore;
      });
    });

    it('should return closed state initially', () => {
      const { result } = renderHook(() => useGameSettingsModalState());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should open modal when open is called', () => {
      const mockOpenModal = jest.fn();
      mockUseUIStore.mockImplementation((selector: any) => {
        const mockStore = {
          modals: { gameSettingsModal: false },
          openModal: mockOpenModal,
          closeModal: jest.fn(),
        };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      const { result } = renderHook(() => useGameSettingsModalState());

      act(() => {
        result.current.open();
      });

      expect(mockOpenModal).toHaveBeenCalledWith('gameSettingsModal');
    });

    it('should close modal when close is called', () => {
      const mockCloseModal = jest.fn();
      mockUseUIStore.mockImplementation((selector: any) => {
        const mockStore = {
          modals: { gameSettingsModal: true },
          openModal: jest.fn(),
          closeModal: mockCloseModal,
        };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      const { result } = renderHook(() => useGameSettingsModalState());

      act(() => {
        result.current.close();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('gameSettingsModal');
    });

    it('should toggle modal state correctly', () => {
      const mockOpenModal = jest.fn();
      const mockCloseModal = jest.fn();
      let isOpen = false;

      mockUseUIStore.mockImplementation((selector: any) => {
        const mockStore = {
          modals: { gameSettingsModal: isOpen },
          openModal: mockOpenModal,
          closeModal: mockCloseModal,
        };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      const { result, rerender } = renderHook(() => useGameSettingsModalState());

      // Toggle from closed to open
      act(() => {
        result.current.toggle();
      });
      expect(mockOpenModal).toHaveBeenCalledWith('gameSettingsModal');

      // Simulate state change
      isOpen = true;
      rerender();

      // Toggle from open to closed
      act(() => {
        result.current.toggle();
      });
      expect(mockCloseModal).toHaveBeenCalledWith('gameSettingsModal');
    });
  });

  describe('useGameSettingsModalWithHandlers', () => {
    beforeEach(() => {
      const mockStore = {
        modals: { gameSettingsModal: false },
        openModal: jest.fn(),
        closeModal: jest.fn(),
      };

      mockUseUIStore.mockImplementation((selector: any) => {
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });
    });

    it('should provide enhanced handlers', () => {
      const { result } = renderHook(() => useGameSettingsModalWithHandlers());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.handleOpen).toBe('function');
      expect(typeof result.current.handleClose).toBe('function');
      expect(typeof result.current.handleToggle).toBe('function');
      expect(typeof result.current.onOpen).toBe('function');
      expect(typeof result.current.onClose).toBe('function');
      expect(typeof result.current.onToggle).toBe('function');
    });
  });

  describe('useGameSettingsModal alias', () => {
    it('should be an alias for useGameSettingsModalState', () => {
      expect(useGameSettingsModal).toBe(useGameSettingsModalState);
    });
  });
});