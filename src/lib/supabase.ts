// Supabase client configuration for Next.js
import { createClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://test.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'test-key';

// Import config validation
import { validateSupabaseConfig } from './storage/config';

// Validate Supabase configuration if enabled
validateSupabaseConfig();

// Client-side Supabase client with auth configuration
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    detectSessionInUrl: true,
    autoRefreshToken: true,
  }
});

// Legacy client for backwards compatibility
export const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);

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