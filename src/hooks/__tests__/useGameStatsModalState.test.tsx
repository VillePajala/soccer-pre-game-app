import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { 
  useGameStatsModalState,
  useGameStatsModalWithHandlers,
  useGameStatsModal 
} from '../useGameStatsModalState';
import { useUIStore } from '@/stores/uiStore';
// import { useModalContext } from '@/contexts/{}';

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('@/stores/uiStore', () => ({
  useUIStore: jest.fn(),
}));

const { useUIStore } = require('@/stores/uiStore');

describe('useGameStatsModalState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Zustand Implementation', () => {
    beforeEach(() => {
      const mockStore = {
        modals: { gameStatsModal: false },
        openModal: jest.fn(),
        closeModal: jest.fn(),
      };

      useUIStore.mockImplementation((selector: any) => {
        if (typeof selector === 'function') {
          return selector(mockStore);
        }
        return mockStore;
      });
    });

    it('should return closed state initially', () => {
      const { result } = renderHook(() => useGameStatsModalState());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should open modal when open is called', () => {
      const mockOpenModal = jest.fn();
      useUIStore.mockImplementation((selector: any) => {
        const mockStore = {
          modals: { gameStatsModal: false },
          openModal: mockOpenModal,
          closeModal: jest.fn(),
        };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      const { result } = renderHook(() => useGameStatsModalState());

      act(() => {
        result.current.open();
      });

      expect(mockOpenModal).toHaveBeenCalledWith('gameStatsModal');
    });

    it('should close modal when close is called', () => {
      const mockCloseModal = jest.fn();
      useUIStore.mockImplementation((selector: any) => {
        const mockStore = {
          modals: { gameStatsModal: true },
          openModal: jest.fn(),
          closeModal: mockCloseModal,
        };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      const { result } = renderHook(() => useGameStatsModalState());

      act(() => {
        result.current.close();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('gameStatsModal');
    });
  });

  describe('useGameStatsModalWithHandlers', () => {
    beforeEach(() => {
      const mockStore = {
        modals: { gameStatsModal: false },
        openModal: jest.fn(),
        closeModal: jest.fn(),
      };

      useUIStore.mockImplementation((selector: any) => {
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });
    });

    it('should provide enhanced handlers', () => {
      const { result } = renderHook(() => useGameStatsModalWithHandlers());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.handleOpen).toBe('function');
      expect(typeof result.current.handleClose).toBe('function');
      expect(typeof result.current.handleToggle).toBe('function');
      expect(typeof result.current.onOpen).toBe('function');
      expect(typeof result.current.onClose).toBe('function');
      expect(typeof result.current.onToggle).toBe('function');
    });
  });
});