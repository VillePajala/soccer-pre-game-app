import { supabase } from '@/lib/supabase';
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

// Helper to get the current authenticated user's Supabase internal ID
// This is a placeholder and will be properly implemented with Clerk later.
const getCurrentSupabaseUserId = (): string | null => {
  // For now, let's assume we can get it from somewhere or it's passed in.
  // In a real scenario with Clerk, you'd get the Clerk user ID
  // and then look up your internal Supabase user ID from the 'users' table.
  // This function will need to be adapted once Clerk is integrated
  // and you have a way to map Clerk user ID to your internal user_id.
  console.warn("getCurrentSupabaseUserId is a placeholder and needs actual implementation with Clerk mapping.");
  // To allow testing before Clerk is fully set up, you might temporarily
  // return a hardcoded UUID that you know exists in your public.users table
  // associated with a test Clerk ID.
  // For example, if you manually inserted a user:
  // return 'your-manually-inserted-test-user-uuid';
  return null; // Or throw an error if user_id is strictly required for all operations
};


// Get all seasons for the authenticated user
export const getSupabaseSeasons = async (): Promise<Season[]> => {
  const userId = getCurrentSupabaseUserId();
  if (!userId) {
    // Or handle as per your app's logic for unauthenticated users
    throw new Error("User not authenticated or Supabase user ID not found.");
  }

  try {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('user_id', userId)
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
export const createSupabaseSeason = async (seasonData: Omit<Season, 'id'>): Promise<Season> => {
  const userId = getCurrentSupabaseUserId();
  if (!userId) {
    throw new Error("User not authenticated or Supabase user ID not found for creating season.");
  }

  try {
    // Generate a client-side ID for now, similar to how it might have been done with localStorage
    // Or, you could let Supabase generate it if your 'id' column in 'seasons' has a default like gen_random_uuid()
    // The current schema has 'id TEXT PRIMARY KEY', so client-gen is safer unless DB default is added.
    const newSeasonId = `season_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    const seasonToInsert: Omit<SupabaseSeason, 'created_at' | 'updated_at' | 'user_id'> & { user_id: string } = {
      id: newSeasonId,
      user_id: userId,
      name: seasonData.name,
      // map other fields from seasonData to SupabaseSeason structure if needed
      // start_date: seasonData.startDate, 
      // end_date: seasonData.endDate,
      // details: seasonData.details,
    };
    
    const { data, error } = await supabase
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
export const updateSupabaseSeason = async (seasonId: string, seasonUpdateData: Partial<Omit<Season, 'id'>>): Promise<Season> => {
  const userId = getCurrentSupabaseUserId();
  if (!userId) {
    throw new Error("User not authenticated or Supabase user ID not found for updating season.");
  }

  try {
    const updates: Partial<Omit<SupabaseSeason, 'id' | 'user_id' | 'created_at'>> & { updated_at: string } = {
        name: seasonUpdateData.name, // example, add other updatable fields
        // start_date: seasonUpdateData.startDate,
        // end_date: seasonUpdateData.endDate,
        // details: seasonUpdateData.details,
        updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('seasons')
      .update(updates)
      .eq('id', seasonId)
      .eq('user_id', userId) // Ensure user can only update their own seasons
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
export const deleteSupabaseSeason = async (seasonId: string): Promise<boolean> => {
  const userId = getCurrentSupabaseUserId();
  if (!userId) {
    throw new Error("User not authenticated or Supabase user ID not found for deleting season.");
  }

  try {
    const { error, count } = await supabase
      .from('seasons')
      .delete()
      .eq('id', seasonId)
      .eq('user_id', userId); // Ensure user can only delete their own seasons

    if (error) throw error;
    
    return (count !== null && count > 0);
  } catch (error) {
    console.error('[deleteSupabaseSeason] Error:', error);
    throw error;
  }
}; 