import { renderHook } from '@testing-library/react';
import { useErrorHandler } from '../useErrorHandler';
import { useToast } from '@/contexts/ToastProvider';
import { useTranslation } from 'react-i18next';

// Mock dependencies
jest.mock('@/contexts/ToastProvider');
jest.mock('react-i18next');
jest.mock('@/utils/logger');

const mockShowToast = jest.fn();
const mockT = jest.fn((key: string, fallback: string) => fallback);

beforeEach(() => {
  jest.clearAllMocks();
  (useToast as jest.Mock).mockReturnValue({ showToast: mockShowToast });
  (useTranslation as jest.Mock).mockReturnValue({ t: mockT });
});

describe('useErrorHandler', () => {
  describe('handleError', () => {
    it('should handle generic errors with default message', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      result.current.handleError(new Error('Test error'));
      
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error',
        message: 'Test error',
        duration: 5000,
        action: undefined,
      });
    });

    it('should handle string errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      result.current.handleError('String error message');
      
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error',
        message: 'String error message',
        duration: 5000,
        action: undefined,
      });
    });

    it('should handle errors with custom options', () => {
      const { result } = renderHook(() => useErrorHandler());
      const retryAction = jest.fn();
      
      result.current.handleError(new Error('Network error'), {
        type: 'network',
        title: 'Connection Failed',
        duration: 3000,
        retryAction,
      });
      
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Connection Failed',
        message: 'Network error',
        duration: 3000,
        action: {
          label: 'Try Again',
          onClick: retryAction,
        },
      });
    });

    it('should not show toast when showToUser is false', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      result.current.handleError(new Error('Test error'), {
        showToUser: false,
      });
      
      expect(mockShowToast).not.toHaveBeenCalled();
    });

    it('should handle object errors with message property', () => {
      const { result } = renderHook(() => useErrorHandler());
      const errorObj = { message: 'Object error message' };
      
      result.current.handleError(errorObj);
      
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error',
        message: 'Object error message',
        duration: 5000,
        action: undefined,
      });
    });

    it('should handle validation errors with multiple messages', () => {
      const { result } = renderHook(() => useErrorHandler());
      const errorObj = { errors: ['Field 1 is required', 'Field 2 is invalid'] };
      
      result.current.handleError(errorObj);
      
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error',
        message: 'Field 1 is required, Field 2 is invalid',
        duration: 5000,
        action: undefined,
      });
    });
  });

  describe('specialized error handlers', () => {
    it('should handle network errors with retry action', () => {
      const { result } = renderHook(() => useErrorHandler());
      const retryAction = jest.fn();
      
      result.current.handleNetworkError(new Error('Connection failed'), retryAction);
      
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Connection Error',
        message: 'Connection failed',
        duration: 5000,
        action: {
          label: 'Try Again',
          onClick: retryAction,
        },
      });
    });

    it('should handle validation errors with field name', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      result.current.handleValidationError(new Error('Invalid input'), 'Email');
      
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Validation Error: Email',
        message: 'Invalid input',
        duration: 3000,
        action: undefined,
      });
    });

    it('should handle storage errors with operation name', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      result.current.handleStorageError(new Error('Save failed'), 'save player data');
      
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Failed to save player data',
        message: 'Save failed',
        duration: 5000,
        action: undefined,
      });
    });

    it('should handle authentication errors with longer duration', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      result.current.handleAuthError(new Error('Token expired'));
      
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Authentication Error',
        message: 'Token expired',
        duration: 7000,
        action: undefined,
      });
    });
  });

  describe('error categorization', () => {
    it('should identify retryable network errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      const retryAction = jest.fn();
      
      result.current.handleError(new Error('Network timeout'), {
        type: 'network',
        retryAction,
      });
      
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error',
        message: 'Network timeout',
        duration: 5000,
        action: {
          label: 'Try Again',
          onClick: retryAction,
        },
      });
    });

    it('should not show retry for non-retryable errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      const retryAction = jest.fn();
      
      result.current.handleError(new Error('Validation failed'), {
        type: 'validation',
        retryAction,
      });
      
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error',
        message: 'Validation failed',
        duration: 5000,
        action: undefined,
      });
    });
  });

  describe('fallback error messages', () => {
    it('should use fallback message for generic errors', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      result.current.handleError(null);
      
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error',
        message: 'Unknown error occurred',
        duration: 5000,
        action: undefined,
      });
    });

    it('should use type-specific fallback messages', () => {
      const { result } = renderHook(() => useErrorHandler());
      
      result.current.handleError('', { type: 'network' });
      
      expect(mockShowToast).toHaveBeenCalledWith({
        type: 'error',
        title: 'Error',
        message: 'Network error. Please check your connection and try again.',
        duration: 5000,
        action: undefined,
      });
    });
  });
});