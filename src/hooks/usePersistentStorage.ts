/**
 * Persistent Storage Hook - Unified localStorage API
 * 
 * This hook provides a unified interface to the persistence store's localStorage API,
 * replacing direct localStorage usage throughout the application. It provides:
 * - Type-safe storage operations
 * - Automatic error handling and logging
 * - Integration with the storage manager (Supabase/IndexedDB)
 * - Graceful localStorage fallback
 * - Migration safety for Phase 3 persistence layer migration
 */

import { useCallback } from 'react';
import { usePersistenceStore, usePersistenceActions } from '@/stores/persistenceStore';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';
import logger from '@/utils/logger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface UsePersistentStorageResult {
  // Core storage operations
  getItem: <T = unknown>(key: string, defaultValue?: T) => Promise<T | null>;
  setItem: <T = unknown>(key: string, value: T) => Promise<boolean>;
  removeItem: (key: string) => Promise<boolean>;
  hasItem: (key: string) => Promise<boolean>;
  getKeys: () => Promise<string[]>;
  
  // Utility operations
  clear: () => Promise<boolean>;
  getUsage: () => { used: number; available: number; percentage: number };
  
  // State
  isLoading: boolean;
  lastError: string | null;
  
  // Migration status
  migrationStatus: 'zustand' | 'legacy';
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

export function usePersistentStorage(): UsePersistentStorageResult {
  const { shouldUseLegacy } = useMigrationSafety('PersistentStorage');

  // Always initialize legacy implementation to satisfy hook rules
  const legacyStorage = useLegacyPersistentStorage();

  // Get persistence store state and actions
  const { isLoading, lastError } = usePersistenceStore();
  const persistenceActions = usePersistenceActions();
  
  // ============================================================================
  // Core Storage Operations
  // ============================================================================
  
  const getItem = useCallback(async <T = unknown>(key: string, defaultValue?: T): Promise<T | null> => {
    try {
      const result = await persistenceActions.getStorageItem<T>(key, defaultValue);
      logger.debug(`[usePersistentStorage] Retrieved '${key}':`, result !== null);
      return result;
    } catch (error) {
      logger.error(`[usePersistentStorage] Error getting '${key}':`, error);
      return defaultValue ?? null;
    }
  }, [persistenceActions]);
  
  const setItem = useCallback(async <T = unknown>(key: string, value: T): Promise<boolean> => {
    try {
      const success = await persistenceActions.setStorageItem(key, value);
      logger.debug(`[usePersistentStorage] Set '${key}':`, success);
      return success;
    } catch (error) {
      logger.error(`[usePersistentStorage] Error setting '${key}':`, error);
      return false;
    }
  }, [persistenceActions]);
  
  const removeItem = useCallback(async (key: string): Promise<boolean> => {
    try {
      const success = await persistenceActions.removeStorageItem(key);
      logger.debug(`[usePersistentStorage] Removed '${key}':`, success);
      return success;
    } catch (error) {
      logger.error(`[usePersistentStorage] Error removing '${key}':`, error);
      return false;
    }
  }, [persistenceActions]);
  
  const hasItem = useCallback(async (key: string): Promise<boolean> => {
    try {
      const exists = await persistenceActions.hasStorageItem(key);
      logger.debug(`[usePersistentStorage] Has '${key}':`, exists);
      return exists;
    } catch (error) {
      logger.error(`[usePersistentStorage] Error checking '${key}':`, error);
      return false;
    }
  }, [persistenceActions]);
  
  const getKeys = useCallback(async (): Promise<string[]> => {
    try {
      const keys = await persistenceActions.getStorageKeys();
      logger.debug(`[usePersistentStorage] Retrieved ${keys.length} keys`);
      return keys;
    } catch (error) {
      logger.error('[usePersistentStorage] Error getting keys:', error);
      return [];
    }
  }, [persistenceActions]);
  
  // ============================================================================
  // Utility Operations
  // ============================================================================
  
  const clear = useCallback(async (): Promise<boolean> => {
    try {
      const success = await persistenceActions.clearAllData();
      logger.debug('[usePersistentStorage] Cleared all data:', success);
      return success;
    } catch (error) {
      logger.error('[usePersistentStorage] Error clearing data:', error);
      return false;
    }
  }, [persistenceActions]);
  
  const getUsage = useCallback(() => {
    try {
      const usage = persistenceActions.getStorageUsage();
      logger.debug('[usePersistentStorage] Storage usage:', usage);
      return usage;
    } catch (error) {
      logger.error('[usePersistentStorage] Error getting usage:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }, [persistenceActions]);
  
  // ============================================================================
  // Return Interface
  // ============================================================================

  if (shouldUseLegacy) {
    return legacyStorage;
  }

  return {
    // Core storage operations
    getItem,
    setItem,
    removeItem,
    hasItem,
    getKeys,
    
    // Utility operations
    clear,
    getUsage,
    
    // State
    isLoading,
    lastError,
    
    // Migration status
    migrationStatus: 'zustand',
  };
}

// ============================================================================
// Legacy Fallback Implementation
// ============================================================================

function useLegacyPersistentStorage(): UsePersistentStorageResult {
  logger.debug('[usePersistentStorage] Using legacy localStorage implementation');
  
  const getItem = useCallback(async <T = unknown>(key: string, defaultValue?: T): Promise<T | null> => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) {
        return defaultValue ?? null;
      }
      
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as unknown as T;
      }
    } catch (error) {
      logger.error(`[usePersistentStorage] Legacy getItem error for '${key}':`, error);
      return defaultValue ?? null;
    }
  }, []);
  
  const setItem = useCallback(async <T = unknown>(key: string, value: T): Promise<boolean> => {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
      return true;
    } catch (error) {
      logger.error(`[usePersistentStorage] Legacy setItem error for '${key}':`, error);
      return false;
    }
  }, []);
  
  const removeItem = useCallback(async (key: string): Promise<boolean> => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      logger.error(`[usePersistentStorage] Legacy removeItem error for '${key}':`, error);
      return false;
    }
  }, []);
  
  const hasItem = useCallback(async (key: string): Promise<boolean> => {
    try {
      return localStorage.getItem(key) !== null;
    } catch (error) {
      logger.error(`[usePersistentStorage] Legacy hasItem error for '${key}':`, error);
      return false;
    }
  }, []);
  
  const getKeys = useCallback(async (): Promise<string[]> => {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) keys.push(key);
      }
      return keys;
    } catch (error) {
      logger.error('[usePersistentStorage] Legacy getKeys error:', error);
      return [];
    }
  }, []);
  
  const clear = useCallback(async (): Promise<boolean> => {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      logger.error('[usePersistentStorage] Legacy clear error:', error);
      return false;
    }
  }, []);
  
  const getUsage = useCallback(() => {
    try {
      let used = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const item = localStorage.getItem(key);
          if (item) {
            used += key.length + item.length;
          }
        }
      }
      const available = 5 * 1024 * 1024; // 5MB typical limit
      const percentage = (used / available) * 100;
      
      return { used, available, percentage };
    } catch (error) {
      logger.error('[usePersistentStorage] Legacy getUsage error:', error);
      return { used: 0, available: 0, percentage: 0 };
    }
  }, []);
  
  return {
    getItem,
    setItem,
    removeItem,
    hasItem,
    getKeys,
    clear,
    getUsage,
    isLoading: false,
    lastError: null,
    migrationStatus: 'legacy',
  };
}

// ============================================================================
// Storage Key Utilities
// ============================================================================

/**
 * Create a type-safe storage key builder
 */
export function createStorageKey(prefix: string, suffix?: string): string {
  return suffix ? `${prefix}_${suffix}` : prefix;
}

/**
 * Check if a key matches a pattern
 */
export function matchesKeyPattern(key: string, pattern: string): boolean {
  const regex = new RegExp(pattern.replace('*', '.*'));
  return regex.test(key);
}

/**
 * Get all keys matching a pattern
 * Note: This should be used within a React component or custom hook
 */
export function useKeysMatching(pattern: string) {
  const storage = usePersistentStorage();
  
  const getMatchingKeys = useCallback(async (): Promise<string[]> => {
    const allKeys = await storage.getKeys();
    return allKeys.filter(key => matchesKeyPattern(key, pattern));
  }, [storage, pattern]);
  
  return getMatchingKeys;
}