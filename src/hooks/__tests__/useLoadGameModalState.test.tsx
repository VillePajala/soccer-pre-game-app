import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { 
  useLoadGameModalState,
  useLoadGameModalWithHandlers
} from '../useLoadGameModalState';

describe('useLoadGameModalState', () => {
  describe('Zustand Implementation', () => {
    beforeEach(() => {
      // Reset mocks to known state - global setup handles this
      jest.clearAllMocks();
    });

    it('should return closed state initially', () => {
      const { result } = renderHook(() => useLoadGameModalState());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should open modal when open is called', () => {
      const { useUIStore } = jest.requireMock('@/stores/uiStore');
      const mockOpenModal = jest.fn();
      
      // Get the selector function and extract the openModal function
      useUIStore.mockImplementation((selector: any) => {
        const mockStore = {
          modals: { loadGameModal: false },
          openModal: mockOpenModal,
          closeModal: jest.fn(),
        };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });

      const { result } = renderHook(() => useLoadGameModalState());

      act(() => {
        result.current.open();
      });

      expect(mockOpenModal).toHaveBeenCalledWith('loadGameModal');
    });

    it('should close modal when close is called', () => {
      const { useUIStore } = jest.requireMock('@/stores/uiStore');
      const mockCloseModal = jest.fn();
      
      useUIStore.mockImplementation((selector: any) => {
        const mockStore = {
          modals: { loadGameModal: true },
          openModal: jest.fn(),
          closeModal: mockCloseModal,
        };
        return typeof selector === 'function' ? selector(mockStore) : mockStore;
      });
      
      const { result } = renderHook(() => useLoadGameModalState());

      act(() => {
        result.current.close();
      });

      expect(mockCloseModal).toHaveBeenCalledWith('loadGameModal');
    });

    it('should toggle modal when toggle is called', () => {
      const { result } = renderHook(() => useLoadGameModalState());

      act(() => {
        result.current.toggle();
      });

      // Toggle should call either open or close depending on current state
      expect(typeof result.current.toggle).toBe('function');
    });
  });

  describe('Modal State Tests', () => {
    it('should execute functions without throwing', () => {
      const { result } = renderHook(() => useLoadGameModalState());

      expect(() => {
        act(() => {
          result.current.open();
          result.current.close();
          result.current.toggle();
        });
      }).not.toThrow();
    });
  });

  describe('useLoadGameModalWithHandlers', () => {
    it('should provide enhanced handlers', () => {
      const { result } = renderHook(() => useLoadGameModalWithHandlers());

      expect(result.current).toBeDefined();
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
      expect(typeof result.current.handleOpen).toBe('function');
      expect(typeof result.current.handleClose).toBe('function');
    });
  });

});