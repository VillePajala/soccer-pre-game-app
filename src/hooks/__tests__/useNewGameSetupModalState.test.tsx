import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { 
  useNewGameSetupModalState,
  useNewGameSetupModalWithHandlers
} from '../useNewGameSetupModalState';

// Mock dependencies are handled globally by setupModalTests.ts
jest.mock('@/utils/logger');

describe('useNewGameSetupModalState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Modal Operations', () => {
    it('should return closed state initially', () => {
      const { result } = renderHook(() => useNewGameSetupModalState());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should execute open function without throwing', () => {
      const { result } = renderHook(() => useNewGameSetupModalState());

      expect(() => {
        act(() => {
          result.current.open();
        });
      }).not.toThrow();
    });

    it('should execute close function without throwing', () => {
      const { result } = renderHook(() => useNewGameSetupModalState());

      expect(() => {
        act(() => {
          result.current.close();
        });
      }).not.toThrow();
    });

    it('should execute toggle function without throwing', () => {
      const { result } = renderHook(() => useNewGameSetupModalState());

      expect(() => {
        act(() => {
          result.current.toggle();
        });
      }).not.toThrow();
    });
  });

  describe('useNewGameSetupModalWithHandlers', () => {
    it('should provide enhanced handlers', () => {
      const { result } = renderHook(() => useNewGameSetupModalWithHandlers());

      expect(result.current).toBeDefined();
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
      expect(typeof result.current.handleOpen).toBe('function');
      expect(typeof result.current.handleClose).toBe('function');
      expect(typeof result.current.handleToggle).toBe('function');
    });

    it('should execute handler functions without throwing', () => {
      const { result } = renderHook(() => useNewGameSetupModalWithHandlers());

      expect(() => {
        act(() => {
          result.current.handleOpen();
          result.current.handleClose();
          result.current.handleToggle();
        });
      }).not.toThrow();
    });
  });
});