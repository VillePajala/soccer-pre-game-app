/**
 * Lazy-loaded Supabase client to reduce bundle size
 * Only loads the actual Supabase library when authentication is enabled and needed
 */

import type { LightweightSupabaseClient } from '@/types/supabase-types';
import logger from '@/utils/logger';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Validate configuration
const hasValidConfig = supabaseUrl && 
                      supabaseAnonKey && 
                      supabaseUrl !== 'https://your-project.supabase.co' && 
                      supabaseAnonKey !== 'public-anon-key' &&
                      supabaseUrl.length > 0 &&
                      supabaseAnonKey.length > 0;

// Lightweight dummy client that provides the same interface without pulling in Supabase
const createDummyClient = (): LightweightSupabaseClient => ({
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    getUser: async () => ({ data: { user: null }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signUp: async () => ({ data: null, error: new Error('Supabase not configured') }),
    signInWithPassword: async () => ({ data: null, error: new Error('Supabase not configured') }),
    signOut: async () => ({ error: new Error('Supabase not configured') }),
    resetPasswordForEmail: async () => ({ data: null, error: new Error('Supabase not configured') }),
    updateUser: async () => ({ data: null, error: new Error('Supabase not configured') }),
    setSession: async () => ({ data: null, error: new Error('Supabase not configured') }),
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: new Error('Supabase not configured') }),
        limit: () => ({ data: null, error: new Error('Supabase not configured') }),
        order: () => ({ data: null, error: new Error('Supabase not configured') }),
      }),
      limit: () => ({ data: null, error: new Error('Supabase not configured') }),
      order: () => ({ data: null, error: new Error('Supabase not configured') }),
    }),
    insert: () => ({
      select: () => ({
        single: async () => ({ data: null, error: new Error('Supabase not configured') })
      })
    }),
    update: () => ({
      eq: () => ({
        select: () => ({
          single: async () => ({ data: null, error: new Error('Supabase not configured') })
        })
      })
    }),
    delete: () => ({
      eq: () => ({ data: null, error: new Error('Supabase not configured') })
    }),
    upsert: () => ({
      select: () => ({
        single: async () => ({ data: null, error: new Error('Supabase not configured') })
      })
    }),
  } as LightweightSupabaseClient)
});

// Cache for the lazy-loaded client
let cachedClient: LightweightSupabaseClient | null = null;
let isLoading = false;

/**
 * Dynamically loads the Supabase client only when needed and configured
 * Returns a dummy client if Supabase is not configured, avoiding the 515KB bundle
 */
export const getSupabaseClient = async (): Promise<LightweightSupabaseClient> => {
  // Return cached client if available
  if (cachedClient) {
    return cachedClient;
  }

  // Return dummy client immediately if no config
  if (!hasValidConfig) {
    cachedClient = createDummyClient();
    return cachedClient;
  }

  // Prevent multiple simultaneous loads
  if (isLoading) {
    // Wait for the loading to complete
    while (isLoading) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    return cachedClient!;
  }

  try {
    isLoading = true;
    logger.log('[Supabase] Loading Supabase client dynamically...');

    // Dynamic import of Supabase client (only when needed)
    const { createBrowserClient } = await import('@supabase/ssr');
    
    const client = createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
      }
    });

    cachedClient = client as LightweightSupabaseClient;
    logger.log('[Supabase] Client loaded successfully');
    
    return cachedClient;
  } catch (error) {
    logger.error('[Supabase] Failed to load client:', error);
    
    // Fallback to dummy client on error
    cachedClient = createDummyClient();
    return cachedClient;
  } finally {
    isLoading = false;
  }
};

// Synchronous getter that returns dummy client immediately but triggers async load
export const supabase: LightweightSupabaseClient = new Proxy(createDummyClient(), {
  get(target, prop) {
    // If we have a cached client, use it
    if (cachedClient) {
      return cachedClient[prop as keyof LightweightSupabaseClient];
    }

    // For auth methods, return async wrappers that load client first
    if (prop === 'auth') {
      return new Proxy(target.auth, {
        get(authTarget, authProp) {
          return async (...args: unknown[]) => {
            const client = await getSupabaseClient();
            const method = client.auth[authProp as keyof typeof client.auth] as (...args: unknown[]) => unknown;
            return method.apply(client.auth, args);
          };
        }
      });
    }

    // For database methods, return async wrappers
    if (prop === 'from') {
      return (...args: unknown[]) => {
        // Start loading the client in background
        getSupabaseClient().catch(console.error);
        
        // Return the dummy implementation immediately
        return target.from(...args);
      };
    }

    return target[prop as keyof LightweightSupabaseClient];
  }
});

// Legacy export for backward compatibility
export const supabaseClient = supabase;