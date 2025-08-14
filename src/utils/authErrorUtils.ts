/**
 * Utility functions for handling authentication errors consistently across React Query hooks
 */

export function isAuthenticationError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorName = error instanceof Error ? error.name : '';
  
  return errorMessage.includes('401') || 
         errorMessage.includes('403') || 
         errorMessage.includes('Unauthorized') || 
         errorMessage.includes('Forbidden') ||
         errorMessage.includes('AuthenticationError') || 
         errorName === 'AuthenticationError';
}

export function shouldRetryOnError(error: unknown): boolean {
  // Don't retry auth errors - they need user intervention
  if (isAuthenticationError(error)) {
    return false;
  }
  
  // Retry other errors (network, 500, etc.)
  return true;
}