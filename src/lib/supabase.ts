// Supabase client configuration for Next.js
import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Import config validation
import { isSupabaseEnabled } from './storage/config';

// Only create clients if we have valid configuration
const hasValidConfig = supabaseUrl && supabaseAnonKey && 
                      supabaseUrl !== 'https://your-project.supabase.co' && 
                      supabaseAnonKey !== 'public-anon-key' &&
                      supabaseUrl.length > 0 &&
                      supabaseAnonKey.length > 0;

// Log configuration status for debugging
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  console.log('[Supabase] Configuration status:', {
    hasValidConfig,
    urlProvided: !!supabaseUrl && supabaseUrl !== 'https://your-project.supabase.co',
    keyProvided: !!supabaseAnonKey && supabaseAnonKey !== 'public-anon-key',
    supabaseEnabled: isSupabaseEnabled()
  });
}

// Create a dummy client for development/fallback
const dummyClient = {
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
  }),
} as any;

// Client-side Supabase client with auth configuration
export const supabase = hasValidConfig 
  ? createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        detectSessionInUrl: true,
        autoRefreshToken: true,
      }
    })
  : dummyClient;

// Legacy client for backwards compatibility - reuse the same instance
export const supabaseClient = supabase;

// Database types (will be generated later with supabase gen types)
export type Database = {
  public: {
    Tables: {
      players: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          nickname: string | null;
          jersey_number: string | null;
          notes: string | null;
          is_goalie: boolean;
          received_fair_play_card: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          nickname?: string | null;
          jersey_number?: string | null;
          notes?: string | null;
          is_goalie?: boolean;
          received_fair_play_card?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          nickname?: string | null;
          jersey_number?: string | null;
          notes?: string | null;
          is_goalie?: boolean;
          received_fair_play_card?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      // Additional table types will be added as needed
    };
  };
};