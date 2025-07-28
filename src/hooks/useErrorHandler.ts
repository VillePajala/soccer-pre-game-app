import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/contexts/ToastProvider';
import logger from '@/utils/logger';

// Error types for categorization
export type ErrorType = 
  | 'network'
  | 'authentication' 
  | 'validation'
  | 'storage'
  | 'permission'
  | 'generic';

export interface ErrorHandlerOptions {
  type?: ErrorType;
  title?: string;
  showToUser?: boolean;
  logError?: boolean;
  retryAction?: () => void | Promise<void>;
  duration?: number; // Toast duration in ms
}

export interface UseErrorHandlerReturn {
  handleError: (error: unknown, options?: ErrorHandlerOptions) => void;
  handleNetworkError: (error: unknown, retryAction?: () => void | Promise<void>) => void;
  handleValidationError: (error: unknown, field?: string) => void;
  handleStorageError: (error: unknown, operation?: string) => void;
  handleAuthError: (error: unknown) => void;
}

// Default error messages by type
const getDefaultErrorMessage = (type: ErrorType, t: (key: string, fallback: string) => string): string => {
  switch (type) {
    case 'network':
      return t('errors.network', 'Network error. Please check your connection and try again.');
    case 'authentication':
      return t('errors.authentication', 'Authentication failed. Please sign in again.');
    case 'validation':
      return t('errors.validation', 'Invalid input. Please check your data and try again.');
    case 'storage':
      return t('errors.storage', 'Failed to save data. Please try again.');
    case 'permission':
      return t('errors.permission', 'You do not have permission to perform this action.');
    default:
      return t('errors.generic', 'An unexpected error occurred. Please try again.');
  }
};

// Extract user-friendly message from error
const extractErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  if (typeof error === 'object' && error !== null) {
    // Handle React Query errors
    if ('message' in error && typeof error.message === 'string') {
      return error.message;
    }
    
    // Handle API errors with custom format
    if ('error' in error && typeof error.error === 'string') {
      return error.error;
    }
    
    // Handle validation errors
    if ('errors' in error && Array.isArray(error.errors)) {
      return (error.errors as string[]).join(', ');
    }
  }
  
  return 'Unknown error occurred';
};

// Check if error is retryable (network, temporary issues)
const isRetryableError = (error: unknown, type?: ErrorType): boolean => {
  if (type === 'network') return true;
  if (type === 'authentication') return false;
  if (type === 'validation') return false;
  if (type === 'permission') return false;
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('network') || 
           message.includes('timeout') || 
           message.includes('fetch') ||
           message.includes('connection');
  }
  
  return false;
};

export function useErrorHandler(): UseErrorHandlerReturn {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const handleError = useCallback((
    error: unknown,
    options: ErrorHandlerOptions = {}
  ) => {
    const {
      type = 'generic',
      title,
      showToUser = true,
      logError = true,
      retryAction,
      duration,
    } = options;

    // Always log errors (respects production environment in logger)
    if (logError) {
      logger.error(`[${type.toUpperCase()} ERROR]`, {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        type,
        timestamp: new Date().toISOString(),
      });
    }

    // Show error to user if requested
    if (showToUser) {
      const errorMessage = extractErrorMessage(error);
      const fallbackMessage = getDefaultErrorMessage(type, t);
      const displayMessage = errorMessage || fallbackMessage;
      
      showToast({
        type: 'error',
        title: title || t(`errors.${type}Title`, 'Error'),
        message: displayMessage,
        duration: duration || 5000,
        action: isRetryableError(error, type) && retryAction ? {
          label: t('common.tryAgain', 'Try Again'),
          onClick: retryAction,
        } : undefined,
      });
    }

    // TODO: Send to monitoring service in production
    // Example: if (process.env.NODE_ENV === 'production') {
    //   Sentry.captureException(error, { tags: { errorType: type } });
    // }
  }, [t, showToast]);

  // Specialized error handlers for common scenarios
  const handleNetworkError = useCallback((
    error: unknown, 
    retryAction?: () => void | Promise<void>
  ) => {
    handleError(error, {
      type: 'network',
      title: t('errors.networkTitle', 'Connection Error'),
      retryAction,
    });
  }, [handleError, t]);

  const handleValidationError = useCallback((
    error: unknown,
    field?: string
  ) => {
    const title = field 
      ? t('errors.validationFieldTitle', `Validation Error: ${field}`)
      : t('errors.validationTitle', 'Validation Error');
      
    handleError(error, {
      type: 'validation',
      title,
      duration: 3000, // Shorter duration for validation errors
    });
  }, [handleError, t]);

  const handleStorageError = useCallback((
    error: unknown,
    operation?: string
  ) => {
    const title = operation
      ? t('errors.storageOperationTitle', `Failed to ${operation}`)
      : t('errors.storageTitle', 'Storage Error');
      
    handleError(error, {
      type: 'storage',
      title,
    });
  }, [handleError, t]);

  const handleAuthError = useCallback((error: unknown) => {
    handleError(error, {
      type: 'authentication',
      title: t('errors.authTitle', 'Authentication Error'),
      duration: 7000, // Longer duration for auth errors
    });
  }, [handleError, t]);

  return {
    handleError,
    handleNetworkError,
    handleValidationError,
    handleStorageError,
    handleAuthError,
  };
}