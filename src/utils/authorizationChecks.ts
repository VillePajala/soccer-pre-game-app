/**
 * Authorization Checks Utility
 * 
 * Provides consistent authorization validation across all storage providers
 * and ensures users can only access their own data.
 */

import { sanitizeError } from './errorSanitization';

export class AuthorizationError extends Error {
  constructor(message: string, public operation?: string, public resource?: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Check if user is authenticated
 */
export function requireAuthentication(userId?: string | null): string {
  if (!userId || userId.trim() === '') {
    throw new AuthorizationError(
      'Authentication required to perform this operation',
      'auth_check',
      'user'
    );
  }
  return userId;
}

/**
 * Check if user owns the resource
 */
export function requireOwnership(
  resourceUserId: string | null | undefined,
  currentUserId: string | null | undefined,
  resourceType: string = 'resource'
): void {
  const authUserId = requireAuthentication(currentUserId);
  
  if (!resourceUserId || resourceUserId !== authUserId) {
    throw new AuthorizationError(
      `Access denied: You can only access your own ${resourceType}`,
      'ownership_check',
      resourceType
    );
  }
}

/**
 * Validate that user can create a resource
 */
export function requireCreatePermission(
  userId: string | null | undefined,
  resourceType: string = 'resource'
): string {
  const authUserId = requireAuthentication(userId);
  
  // Add any additional permission checks here if needed
  // For now, authenticated users can create their own resources
  
  return authUserId;
}

/**
 * Validate that user can read a resource
 */
export function requireReadPermission(
  resourceUserId: string | null | undefined,
  currentUserId: string | null | undefined,
  resourceType: string = 'resource'
): void {
  requireOwnership(resourceUserId, currentUserId, resourceType);
}

/**
 * Validate that user can update a resource
 */
export function requireUpdatePermission(
  resourceUserId: string | null | undefined,
  currentUserId: string | null | undefined,
  resourceType: string = 'resource'
): void {
  requireOwnership(resourceUserId, currentUserId, resourceType);
}

/**
 * Validate that user can delete a resource
 */
export function requireDeletePermission(
  resourceUserId: string | null | undefined,
  currentUserId: string | null | undefined,
  resourceType: string = 'resource'
): void {
  requireOwnership(resourceUserId, currentUserId, resourceType);
}

/**
 * Authorization wrapper for CRUD operations
 */
export class AuthorizationWrapper {
  constructor(private getCurrentUserId: () => Promise<string | null>) {}

  /**
   * Wrap a create operation with authorization
   */
  async authorizeCreate<T>(
    operation: (userId: string) => Promise<T>,
    resourceType: string = 'resource'
  ): Promise<T> {
    try {
      const userId = await this.getCurrentUserId();
      const authUserId = requireCreatePermission(userId, resourceType);
      return await operation(authUserId);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error;
      }
      throw new AuthorizationError(
        `Authorization failed for ${resourceType} creation`,
        'create',
        resourceType
      );
    }
  }

  /**
   * Wrap a read operation with authorization
   */
  async authorizeRead<T>(
    operation: () => Promise<T>,
    validateOwnership: (data: T, userId: string) => void,
    resourceType: string = 'resource'
  ): Promise<T> {
    try {
      const userId = await this.getCurrentUserId();
      requireAuthentication(userId);
      
      const data = await operation();
      validateOwnership(data, userId!);
      
      return data;
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error;
      }
      throw new AuthorizationError(
        `Authorization failed for ${resourceType} access`,
        'read',
        resourceType
      );
    }
  }

  /**
   * Wrap an update operation with authorization
   */
  async authorizeUpdate<T>(
    operation: (userId: string) => Promise<T>,
    resourceUserId: string | null | undefined,
    resourceType: string = 'resource'
  ): Promise<T> {
    try {
      const userId = await this.getCurrentUserId();
      requireUpdatePermission(resourceUserId, userId, resourceType);
      
      return await operation(userId!);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error;
      }
      throw new AuthorizationError(
        `Authorization failed for ${resourceType} update`,
        'update',
        resourceType
      );
    }
  }

  /**
   * Wrap a delete operation with authorization
   */
  async authorizeDelete<T>(
    operation: (userId: string) => Promise<T>,
    resourceUserId: string | null | undefined,
    resourceType: string = 'resource'
  ): Promise<T> {
    try {
      const userId = await this.getCurrentUserId();
      requireDeletePermission(resourceUserId, userId, resourceType);
      
      return await operation(userId!);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error;
      }
      throw new AuthorizationError(
        `Authorization failed for ${resourceType} deletion`,
        'delete',
        resourceType
      );
    }
  }
}

/**
 * Validate array of resources belongs to user
 */
export function validateArrayOwnership<T extends { user_id?: string }>(
  resources: T[],
  userId: string,
  resourceType: string = 'resources'
): void {
  const unauthorizedItems = resources.filter(item => 
    item.user_id && item.user_id !== userId
  );
  
  if (unauthorizedItems.length > 0) {
    throw new AuthorizationError(
      `Access denied: Found ${unauthorizedItems.length} unauthorized ${resourceType}`,
      'bulk_ownership_check',
      resourceType
    );
  }
}

/**
 * Filter array to only include user's resources
 */
export function filterByOwnership<T extends { user_id?: string }>(
  resources: T[],
  userId: string
): T[] {
  return resources.filter(item => !item.user_id || item.user_id === userId);
}

/**
 * Safe authorization check that doesn't throw
 */
export function checkAuthorization(
  resourceUserId: string | null | undefined,
  currentUserId: string | null | undefined
): { authorized: boolean; error?: string } {
  try {
    requireOwnership(resourceUserId, currentUserId);
    return { authorized: true };
  } catch (error) {
    if (error instanceof AuthorizationError) {
      return { authorized: false, error: error.message };
    }
    return { authorized: false, error: 'Authorization check failed' };
  }
}

/**
 * Authorization middleware for API-like operations
 */
export function withAuthorization<TArgs extends unknown[], TReturn>(
  operation: (...args: TArgs) => Promise<TReturn>,
  getUserId: () => Promise<string | null>,
  resourceType: string = 'resource'
) {
  return async (...args: TArgs): Promise<TReturn> => {
    try {
      const userId = await getUserId();
      requireAuthentication(userId);
      
      return await operation(...args);
    } catch (error) {
      if (error instanceof AuthorizationError) {
        throw error;
      }
      
      // Sanitize error for production
      const sanitized = sanitizeError(error, {
        operation: 'authorization_middleware',
        additional: { resourceType }
      });
      
      throw new AuthorizationError(
        sanitized.message,
        'middleware',
        resourceType
      );
    }
  };
}

/**
 * Create authorization context for localStorage operations
 */
export function createLocalStorageAuthContext(getCurrentUserId: () => string | null) {
  return {
    requireAuth(): string {
      const userId = getCurrentUserId();
      return requireAuthentication(userId);
    },
    
    checkOwnership(resourceUserId: string | null | undefined, resourceType: string = 'resource'): void {
      const userId = getCurrentUserId();
      requireOwnership(resourceUserId, userId, resourceType);
    },
    
    filterUserData<T extends { user_id?: string }>(data: T[]): T[] {
      const userId = getCurrentUserId();
      if (!userId) return [];
      return filterByOwnership(data, userId);
    }
  };
}