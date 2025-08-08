/**
 * Lazy-loaded Supabase client to reduce bundle size
 * Only loads the actual Supabase library when authentication is enabled and needed
 */

import type { LightweightSupabaseClient, QueryBuilder } from '@/types/supabase-types';
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

// Create a comprehensive mock QueryBuilder that implements all required methods
const createMockQueryBuilder = (): QueryBuilder => {
  const notConfiguredError = new Error('Supabase not configured');
  const mockAsyncResponse = async () => ({ data: null, error: notConfiguredError });

  // Recursive function to create a mock query builder that supports chaining
  const createChainableBuilder = (): QueryBuilder => {
    return {
      // Properties for response chaining
      /* eslint-disable @typescript-eslint/no-explicit-any */
      data: null as any,
      error: notConfiguredError,
      count: null as any,
      /* eslint-enable @typescript-eslint/no-explicit-any */

      // Query methods that return builders for chaining
      /* eslint-disable @typescript-eslint/no-explicit-any */
      select: (_columns?: string) => createChainableBuilder(),
      eq: (_column: string, _value: any) => createChainableBuilder(),
      limit: (_count: number) => createChainableBuilder(),
      order: (_column: string, _options?: { ascending?: boolean }) => createChainableBuilder(),
      insert: (_values: any) => createChainableBuilder(),
      update: (_values: any) => createChainableBuilder(),
      upsert: (_values: any) => createChainableBuilder(),
      delete: () => createChainableBuilder(),
      not: (_column: string, _operator: string, _value: any) => createChainableBuilder(),
      gte: (_column: string, _value: any) => createChainableBuilder(),
      gt: (_column: string, _value: any) => createChainableBuilder(),
      range: (_from: number, _to: number) => createChainableBuilder(),
      /* eslint-enable @typescript-eslint/no-explicit-any */

      // Terminal methods that return promises
      single: mockAsyncResponse,
      maybeSingle: mockAsyncResponse,
    };
  };

  return createChainableBuilder();
};

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
    exchangeCodeForSession: async () => ({ data: null, error: new Error('Supabase not configured') }),
    verifyOtp: async () => ({ data: null, error: new Error('Supabase not configured') }),
    refreshSession: async () => ({ data: null, error: new Error('Supabase not configured') }),
  },
  from: () => createMockQueryBuilder(),
  rpc: async () => ({ data: null, error: new Error('Supabase not configured') }),
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

    cachedClient = client as unknown as LightweightSupabaseClient;
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

    // For auth methods, return a special proxy that handles both sync and async methods
    if (prop === 'auth') {
      return new Proxy(target.auth, {
        get(authTarget, authProp) {
          // Special handling for onAuthStateChange which needs to work synchronously
          if (authProp === 'onAuthStateChange') {
            // If client is cached, use it directly
            if (cachedClient) {
              return cachedClient.auth.onAuthStateChange.bind(cachedClient.auth);
            }
            
            // Return a function that returns a subscription immediately
            // but triggers the real subscription once client loads
            return (callback: any) => {
              // Return dummy subscription immediately
              const dummySubscription = { data: { subscription: { unsubscribe: () => {} } } };
              
              // Load the real client and set up real subscription
              getSupabaseClient().then(client => {
                const result = client.auth.onAuthStateChange(callback);
                // Replace the unsubscribe function with the real one
                if (result?.data?.subscription) {
                  dummySubscription.data.subscription.unsubscribe = result.data.subscription.unsubscribe;
                }
              }).catch(error => {
                logger.error('[Supabase] Failed to set up auth state change listener:', error);
              });
              
              return dummySubscription;
            };
          }
          
          // For other auth methods, return async wrappers
          return async (...args: any[]) => {
            const client = await getSupabaseClient();
            const method = client.auth[authProp as keyof typeof client.auth] as (...args: any[]) => unknown;
            return method.apply(client.auth, args);
          };
        }
      });
    }

    // For database methods, return async wrappers
    if (prop === 'from') {
      return (tableName: string) => {
        // Start loading the client in background
        getSupabaseClient().catch(console.error);
        
        // Return the dummy implementation immediately
        return target.from(tableName);
      };
    }

    return target[prop as keyof LightweightSupabaseClient];
  }
});

// Legacy export for backward compatibility
export const supabaseClient = supabase;