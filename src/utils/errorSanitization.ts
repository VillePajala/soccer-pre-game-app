/**
 * Production Error Sanitization Utility
 * 
 * Prevents sensitive information disclosure through error messages
 * in production environments while maintaining helpful errors in development.
 */

interface SanitizedError {
  message: string;
  code?: string;
  type: string;
  timestamp: string;
  requestId?: string;
}

interface ErrorContext {
  userId?: string;
  operation?: string;
  component?: string;
  additional?: Record<string, unknown>;
}

/**
 * Sanitize error messages for production to prevent information disclosure
 */
export function sanitizeError(error: unknown, context?: ErrorContext): SanitizedError {
  const isProduction = process.env.NODE_ENV === 'production';
  const timestamp = new Date().toISOString();
  const requestId = generateRequestId();

  // Log full error details for debugging (server-side only)
  if (typeof window === 'undefined') {
    console.error('[ERROR_SANITIZER]', {
      error,
      context,
      timestamp,
      requestId,
      stack: error instanceof Error ? error.stack : undefined
    });
  }

  // Determine error type and create sanitized version
  if (error instanceof Error) {
    return sanitizeKnownError(error, isProduction, timestamp, requestId);
  }

  // Handle non-Error objects
  return {
    message: isProduction 
      ? 'An unexpected error occurred. Please try again.'
      : String(error),
    type: 'UnknownError',
    timestamp,
    requestId
  };
}

/**
 * Sanitize known Error objects
 */
function sanitizeKnownError(
  error: Error, 
  isProduction: boolean, 
  timestamp: string, 
  requestId: string
): SanitizedError {
  const errorType = error.constructor.name;

  // Database/Network errors - never expose connection details
  if (isNetworkOrDatabaseError(error)) {
    return {
      message: isProduction 
        ? 'A connection error occurred. Please check your internet connection and try again.'
        : `Network/Database Error: ${error.message}`,
      code: 'NETWORK_ERROR',
      type: errorType,
      timestamp,
      requestId
    };
  }

  // Authentication errors - safe to show generic message
  if (isAuthenticationError(error)) {
    return {
      message: 'Authentication failed. Please check your credentials and try again.',
      code: 'AUTH_ERROR',
      type: errorType,
      timestamp,
      requestId
    };
  }

  // Validation errors - usually safe to show but sanitize
  if (isValidationError(error)) {
    return {
      message: sanitizeValidationMessage(error.message, isProduction),
      code: 'VALIDATION_ERROR',
      type: errorType,
      timestamp,
      requestId
    };
  }

  // Storage errors - never expose paths or internal details
  if (isStorageError(error)) {
    return {
      message: isProduction 
        ? 'A storage error occurred. Please try again.'
        : `Storage Error: ${error.message}`,
      code: 'STORAGE_ERROR',
      type: errorType,
      timestamp,
      requestId
    };
  }

  // Generic error handling
  return {
    message: isProduction 
      ? 'An error occurred. Please try again.'
      : error.message,
    type: errorType,
    timestamp,
    requestId
  };
}

/**
 * Check if error is network or database related
 */
function isNetworkOrDatabaseError(error: Error): boolean {
  const networkIndicators = [
    'fetch',
    'network',
    'connection',
    'timeout',
    'supabase',
    'postgresql',
    'database',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ENOTFOUND',
    'cors'
  ];

  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();
  
  return networkIndicators.some(indicator => 
    message.includes(indicator) || name.includes(indicator)
  );
}

/**
 * Check if error is authentication related
 */
function isAuthenticationError(error: Error): boolean {
  const authIndicators = [
    'auth',
    'login',
    'unauthorized',
    'forbidden',
    'token',
    'session',
    'credentials',
    'jwt'
  ];

  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();
  
  return authIndicators.some(indicator => 
    message.includes(indicator) || name.includes(indicator)
  ) || error.name === 'AuthenticationError';
}

/**
 * Check if error is validation related
 */
function isValidationError(error: Error): boolean {
  return error.name === 'ValidationError' || 
         error.message.toLowerCase().includes('validation') ||
         error.message.toLowerCase().includes('invalid');
}

/**
 * Check if error is storage related
 */
function isStorageError(error: Error): boolean {
  return error.name === 'StorageError' ||
         error.message.toLowerCase().includes('storage') ||
         error.message.toLowerCase().includes('localstorage');
}

/**
 * Sanitize validation error messages to remove sensitive details
 */
function sanitizeValidationMessage(message: string, isProduction: boolean): string {
  if (!isProduction) {
    return message;
  }

  // Remove file paths
  message = message.replace(/\/[^\s]+/g, '[PATH_REMOVED]');
  
  // Remove specific IDs that might be sensitive
  message = message.replace(/\b[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\b/gi, '[ID_REMOVED]');
  
  // Remove email addresses
  message = message.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL_REMOVED]');
  
  return message;
}

/**
 * Generate a unique request ID for error tracking
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
}

/**
 * Create user-friendly error messages for common scenarios
 */
export function createUserFriendlyError(
  errorType: 'network' | 'auth' | 'validation' | 'storage' | 'unknown',
  details?: string
): SanitizedError {
  const timestamp = new Date().toISOString();
  const requestId = generateRequestId();

  const messages = {
    network: 'Connection problem. Please check your internet and try again.',
    auth: 'Please sign in again to continue.',
    validation: details || 'Please check your input and try again.',
    storage: 'Unable to save data. Please try again.',
    unknown: 'Something went wrong. Please try again.'
  };

  return {
    message: messages[errorType],
    code: errorType.toUpperCase() + '_ERROR',
    type: 'UserFriendlyError',
    timestamp,
    requestId
  };
}

/**
 * Error boundary helper for React components
 */
export function sanitizeErrorForUI(error: unknown, fallbackMessage?: string): string {
  const sanitized = sanitizeError(error);
  
  // Never show technical details to users in production
  if (process.env.NODE_ENV === 'production') {
    return fallbackMessage || 'Something went wrong. Please refresh and try again.';
  }
  
  return sanitized.message;
}

/**
 * Safe console logging that respects production environment
 */
export function safeConsoleError(error: unknown, context?: ErrorContext): void {
  if (process.env.NODE_ENV === 'development') {
    console.error('[DEBUG_ERROR]', error, context);
  } else {
    // In production, only log sanitized version
    const sanitized = sanitizeError(error, context);
    console.error('[PROD_ERROR]', {
      message: sanitized.message,
      type: sanitized.type,
      code: sanitized.code,
      timestamp: sanitized.timestamp,
      requestId: sanitized.requestId
    });
  }
}