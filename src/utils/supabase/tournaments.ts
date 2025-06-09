import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tournament } from '@/types';

// This interface matches the DB table structure for tournaments
export interface SupabaseTournamentSchema {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

// Get all tournaments for the authenticated user
export const getSupabaseTournaments = async (authedSupabaseClient: SupabaseClient, internalSupabaseUserId: string): Promise<Tournament[]> => {
  if (!internalSupabaseUserId || !authedSupabaseClient) {
    throw new Error("Supabase client and user ID are required.");
  }

  const { data, error } = await authedSupabaseClient
    .from('tournaments')
    .select('id, name')
    .eq('user_id', internalSupabaseUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[Supabase SERVICE - getSupabaseTournaments] Error fetching tournaments:', error);
    throw error;
  }

  return (data || []) as Tournament[];
};

// ... (We will add create, update, delete functions later as needed) ... 