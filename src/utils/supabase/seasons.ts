import type { SupabaseClient } from '@supabase/supabase-js'; // Import SupabaseClient type
import type { Season } from '@/types'; // Assuming you have a Season type defined in @/types

// It's good practice to define the Supabase-specific type if it differs
// or if you want to be explicit about the table structure.
export interface SupabaseSeason {
  id: string;
  user_id: string; // This will be the internal Supabase user_id (UUID)
  name: string;
  start_date?: string | null; // Match DB schema (DATE can be string or null)
  end_date?: string | null;   // Match DB schema
  details?: Record<string, unknown> | null; // Match DB schema (JSONB can be object or null)
  created_at: string;
  updated_at: string;
}

// Get all seasons for the authenticated user
export const getSupabaseSeasons = async (authedSupabaseClient: SupabaseClient, internalSupabaseUserId: string): Promise<Season[]> => {
  if (!internalSupabaseUserId) {
    throw new Error("Internal Supabase User ID is required.");
  }
  if (!authedSupabaseClient) {
    throw new Error("Authenticated Supabase client is required.");
  }

  try {
    const { data, error } = await authedSupabaseClient
      .from('seasons')
      .select('*')
      .eq('user_id', internalSupabaseUserId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    
    // Transform to app format (Season type)
    return (data || []).map((s: SupabaseSeason) => ({
      id: s.id,
      name: s.name
      // Add other fields from SupabaseSeason to Season if they exist in your Season type
      // e.g., startDate: s.start_date, endDate: s.end_date, details: s.details
    }));
  } catch (error) {
    console.error('[getSupabaseSeasons] Error:', error);
    throw error;
  }
};

// Create a new season
export const createSupabaseSeason = async (authedSupabaseClient: SupabaseClient, internalSupabaseUserId: string, seasonData: Omit<Season, 'id'>): Promise<Season> => {
  if (!internalSupabaseUserId) {
    throw new Error("Internal Supabase User ID is required for creating season.");
  }
  if (!authedSupabaseClient) {
    throw new Error("Authenticated Supabase client is required for creating season.");
  }

  try {
    // Generate a client-side ID for now, similar to how it might have been done with localStorage
    // Or, you could let Supabase generate it if your 'id' column in 'seasons' has a default like gen_random_uuid()
    // The current schema has 'id TEXT PRIMARY KEY', so client-gen is safer unless DB default is added.
    const newSeasonId = `season_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const seasonToInsert: Omit<SupabaseSeason, 'created_at' | 'updated_at' | 'user_id'> & { user_id: string } = {
      id: newSeasonId,
      user_id: internalSupabaseUserId,
      name: seasonData.name,
      // map other fields from seasonData to SupabaseSeason structure if needed
      // start_date: seasonData.startDate, 
      // end_date: seasonData.endDate,
      // details: seasonData.details,
    };
    
    const { data, error } = await authedSupabaseClient
      .from('seasons')
      .insert(seasonToInsert)
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("No data returned after insert");
    
    return {
      id: data.id,
      name: data.name
      // map other fields from data (SupabaseSeason) back to Season type
    };
  } catch (error) {
    console.error('[createSupabaseSeason] Error:', error);
    throw error;
  }
};

// Update existing season
export const updateSupabaseSeason = async (authedSupabaseClient: SupabaseClient, internalSupabaseUserId: string, seasonId: string, seasonUpdateData: Partial<Omit<Season, 'id'>>): Promise<Season> => {
  if (!internalSupabaseUserId) {
    throw new Error("Internal Supabase User ID is required for updating season.");
  }
  if (!authedSupabaseClient) {
    throw new Error("Authenticated Supabase client is required for updating season.");
  }

  try {
    const updates: Partial<Omit<SupabaseSeason, 'id' | 'user_id' | 'created_at'>> & { updated_at: string } = {
        name: seasonUpdateData.name, // example, add other updatable fields
        // start_date: seasonUpdateData.startDate,
        // end_date: seasonUpdateData.endDate,
        // details: seasonUpdateData.details,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await authedSupabaseClient
      .from('seasons')
      .update(updates)
      .eq('id', seasonId)
      .eq('user_id', internalSupabaseUserId) // Ensure user can only update their own seasons
      .select()
      .single();

    if (error) throw error;
    if (!data) throw new Error("No data returned after update");
    
    return {
      id: data.id,
      name: data.name
      // map other fields from data (SupabaseSeason) back to Season type
    };
  } catch (error) {
    console.error('[updateSupabaseSeason] Error:', error);
    throw error;
  }
};

// Delete a season
export const deleteSupabaseSeason = async (authedSupabaseClient: SupabaseClient, internalSupabaseUserId: string, seasonId: string): Promise<boolean> => {
  if (!internalSupabaseUserId) {
    throw new Error("Internal Supabase User ID is required for deleting season.");
  }
  if (!authedSupabaseClient) {
    throw new Error("Authenticated Supabase client is required for deleting season.");
  }

  try {
    const { error, count } = await authedSupabaseClient
      .from('seasons')
      .delete()
      .match({ id: seasonId, user_id: internalSupabaseUserId }); // Correct way to specify conditions for delete

    if (error) throw error;
    
    return (count !== null && count > 0);
  } catch (error) {
    console.error('[deleteSupabaseSeason] Error:', error);
    throw error;
  }
}; 