import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { 
  useSettingsModalState,
  useSettingsModalWithHandlers
} from '../useSettingsModalState';

// Mock dependencies are handled globally by setupModalTests.ts
jest.mock('@/utils/logger');

describe('useSettingsModalState', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Modal Operations', () => {
    it('should return closed state initially', () => {
      const { result } = renderHook(() => useSettingsModalState());

      expect(result.current.isOpen).toBe(false);
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
    });

    it('should execute open function without throwing', () => {
      const { result } = renderHook(() => useSettingsModalState());

      expect(() => {
        act(() => {
          result.current.open();
        });
      }).not.toThrow();
    });

    it('should execute close function without throwing', () => {
      const { result } = renderHook(() => useSettingsModalState());

      expect(() => {
        act(() => {
          result.current.close();
        });
      }).not.toThrow();
    });

    it('should execute toggle function without throwing', () => {
      const { result } = renderHook(() => useSettingsModalState());

      expect(() => {
        act(() => {
          result.current.toggle();
        });
      }).not.toThrow();
    });
  });

  describe('useSettingsModalWithHandlers', () => {
    it('should provide enhanced handlers', () => {
      const { result } = renderHook(() => useSettingsModalWithHandlers());

      expect(result.current).toBeDefined();
      expect(typeof result.current.open).toBe('function');
      expect(typeof result.current.close).toBe('function');
      expect(typeof result.current.toggle).toBe('function');
      expect(typeof result.current.handleOpen).toBe('function');
      expect(typeof result.current.handleClose).toBe('function');
      expect(typeof result.current.handleToggle).toBe('function');
    });

    it('should execute handler functions without throwing', () => {
      const { result } = renderHook(() => useSettingsModalWithHandlers());

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