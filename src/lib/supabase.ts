// Supabase client configuration for Next.js with lazy loading to reduce bundle size
// This file now re-exports from the lazy loader to maintain backward compatibility

export { supabase, supabaseClient, getSupabaseClient } from './supabase-lazy';

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