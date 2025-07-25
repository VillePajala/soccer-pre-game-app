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
 * Get storage configuration based on feature flags
 */
export function getStorageConfig(): StorageConfig {
  const enableSupabase = process.env.NEXT_PUBLIC_ENABLE_SUPABASE === 'true';
  const disableFallback = process.env.NEXT_PUBLIC_DISABLE_FALLBACK === 'true';
  
  return {
    provider: enableSupabase ? 'supabase' : 'localStorage',
    fallbackToLocalStorage: !disableFallback,
  };
}

/**
 * Check if Supabase is enabled via feature flag
 */
export function isSupabaseEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_SUPABASE === 'true';
}

/**
 * Check if fallback to localStorage is disabled
 */
export function isFallbackDisabled(): boolean {
  return process.env.NEXT_PUBLIC_DISABLE_FALLBACK === 'true';
}

/**
 * Check if offline cache is enabled
 */
export function isOfflineCacheEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_OFFLINE_CACHE === 'true';
}

/**
 * Get provider type as string for logging/debugging
 */
export function getProviderType(): 'localStorage' | 'supabase' {
  return isSupabaseEnabled() ? 'supabase' : 'localStorage';
}

/**
 * Validate that required environment variables are set when Supabase is enabled
 */
export function validateSupabaseConfig(): boolean {
  if (isSupabaseEnabled() && process.env.NODE_ENV !== 'test') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.error(
        'Supabase is enabled but required environment variables are missing.\n' +
        'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.\n' +
        'See .env.example for reference.\n' +
        'Falling back to localStorage.'
      );
      return false;
    }
    
    // Basic URL validation
    if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
      console.warn('Warning: NEXT_PUBLIC_SUPABASE_URL does not appear to be a valid Supabase URL');
    }
    
    // Basic key validation (should be a long string)
    if (key.length < 32) {
      console.warn('Warning: NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be too short');
    }
    
    return true;
  }
  
  return false;
}

/**
 * Get runtime configuration info for debugging
 */
export function getConfigInfo(): {
  provider: string;
  fallbackEnabled: boolean;
  supabaseConfigured: boolean;
  environment: string;
} {
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_project_url';
  const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY !== 'your_supabase_anon_key';
  
  return {
    provider: getProviderType(),
    fallbackEnabled: !isFallbackDisabled(),
    supabaseConfigured: hasSupabaseUrl && hasSupabaseKey,
    environment: process.env.NODE_ENV || 'unknown',
  };
}