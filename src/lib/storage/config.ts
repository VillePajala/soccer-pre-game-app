// Storage configuration utilities
import type { StorageConfig } from './types';

/**
 * Default storage configuration
 */
export const DEFAULT_STORAGE_CONFIG: StorageConfig = {
  provider: 'localStorage',
  fallbackToLocalStorage: true,
};

/**
 * Get storage configuration based on environment and authentication state
 */
export function getStorageConfig(options?: {
  forceProvider?: 'localStorage' | 'supabase';
  isAuthenticated?: boolean;
  enableSupabase?: boolean;
}): StorageConfig {
  const {
    forceProvider,
    isAuthenticated = false,
    enableSupabase = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_SUPABASE === 'true'
  } = options || {};

  // If a specific provider is forced, use it
  if (forceProvider) {
    return {
      provider: forceProvider,
      fallbackToLocalStorage: forceProvider === 'supabase',
    };
  }

  // If Supabase is not enabled globally, use localStorage
  if (!enableSupabase) {
    return {
      provider: 'localStorage',
      fallbackToLocalStorage: false,
    };
  }

  // If user is authenticated, prefer Supabase with localStorage fallback
  if (isAuthenticated) {
    return {
      provider: 'supabase',
      fallbackToLocalStorage: true,
    };
  }

  // Default to localStorage for unauthenticated users
  return {
    provider: 'localStorage',
    fallbackToLocalStorage: false,
  };
}

/**
 * Check if Supabase should be enabled based on environment
 */
export function isSupabaseEnabled(): boolean {
  return (
    process.env.NODE_ENV !== 'production' || 
    process.env.NEXT_PUBLIC_ENABLE_SUPABASE === 'true'
  ) && 
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}