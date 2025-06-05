import type { SupabaseClient } from '@supabase/supabase-js'; // Import SupabaseClient type
import type { Season } from '@/types'; // Actual Season type: { id: string; name: string; }

// This interface matches the DB table structure
export interface SupabaseSeasonSchema {
  id: string;
  user_id: string;
  name: string;
  start_date?: string | null;
  end_date?: string | null;
  details?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

// Get all seasons for the authenticated user
export const getSupabaseSeasons = async (authedSupabaseClient: SupabaseClient, internalSupabaseUserId: string): Promise<Season[]> => {
  console.log(`[Supabase SERVICE - getSupabaseSeasons] Received internalSupabaseUserId: ${internalSupabaseUserId}`);
  
  // Add validation to check if the ID looks like a UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(internalSupabaseUserId)) {
    console.error(`[Supabase SERVICE - getSupabaseSeasons] WARNING: internalSupabaseUserId does not look like a UUID: ${internalSupabaseUserId}`);
  }

  if (!internalSupabaseUserId) {
    throw new Error("Internal Supabase User ID is required.");
  }
  if (!authedSupabaseClient) {
    throw new Error("Authenticated Supabase client is required.");
  }

  try {
    // First, let's check what's actually in the seasons table
    console.log('[Supabase SERVICE - getSupabaseSeasons] Attempting to query seasons table...');
    
    // TEMPORARY FIX: Use service role to bypass RLS
    // This is necessary because the JWT from Clerk contains the Clerk user ID
    // but the database expects Supabase UUIDs
    const { data: allSeasons, error: diagnosticError } = await authedSupabaseClient
      .from('seasons')
      .select('id, user_id, name')
      .limit(5);
    
    if (!diagnosticError && allSeasons) {
      console.log('[DIAGNOSTIC] Sample of ALL seasons in table (first 5):', allSeasons);
      console.log('[DIAGNOSTIC] User ID formats found:', 
        allSeasons.map(s => `${s.user_id} (${typeof s.user_id})`).join(', ')
      );
    } else if (diagnosticError) {
      console.error('[DIAGNOSTIC] Error querying all seasons:', diagnosticError);
    }
    
    // Main query - explicitly filter by user_id without relying on RLS
    console.log(`[Supabase SERVICE - getSupabaseSeasons] Querying with user_id: ${internalSupabaseUserId}`);
    
    const { data, error } = await authedSupabaseClient
      .from('seasons')
      .select('id, name, user_id') // Also select user_id to see what's stored
      .eq('user_id', internalSupabaseUserId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[Supabase SERVICE - getSupabaseSeasons] Error during query:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      
      // If we get a UUID format error, it might be because RLS is interfering
      // Log additional diagnostic information
      if (error.code === '22P02' && error.message.includes('invalid input syntax for type uuid')) {
        console.error('[Supabase SERVICE - getSupabaseSeasons] UUID format error detected.');
        console.error('This usually happens when RLS policies are using the JWT sub claim (Clerk ID) instead of the passed user_id.');
        console.error('Consider updating RLS policies or using a service role key for this query.');
      }
      
      throw error;
    }
    console.log('[Supabase SERVICE - getSupabaseSeasons] Query SUCCEEDED. Data:', data);
    
    // If we get data, log the user_id values to see what's actually stored
    if (data && data.length > 0) {
      console.log('[Supabase SERVICE - getSupabaseSeasons] Sample user_id values from results:', 
        data.slice(0, 3).map(season => season.user_id)
      );
    }
    
    // Remove user_id from the returned data to match Season type
    return (data || []).map(({ id, name }) => ({ id, name })) as Season[];
  } catch (error) {
    // This catch might not be reached if the error is thrown by the .eq or .select itself before await
    console.error('[Supabase SERVICE - getSupabaseSeasons] Unexpected error in try-catch:', error);
    throw error;
  }
};

// For creating a season, based on Season type, only name is needed from client.
export type SeasonForCreation = Pick<Season, 'name'>;

// Create a new season
export const createSupabaseSeason = async (
  authedSupabaseClient: SupabaseClient, 
  internalSupabaseUserId: string, 
  seasonData: SeasonForCreation
): Promise<Season> => {
  console.log(`[Supabase SERVICE - createSupabaseSeason] Received internalSupabaseUserId: ${internalSupabaseUserId}, seasonData:`, seasonData);

  if (!internalSupabaseUserId) {
    throw new Error("Internal Supabase User ID is required for creating season.");
  }
  if (!authedSupabaseClient) {
    throw new Error("Authenticated Supabase client is required for creating season.");
  }

  const seasonToInsert: Pick<SupabaseSeasonSchema, 'user_id' | 'name'> = {
    user_id: internalSupabaseUserId,
    name: seasonData.name,
  };

  try {
    const { data, error } = await authedSupabaseClient
      .from('seasons')
      .insert(seasonToInsert)
      .select('id, name') 
      .single();

    if (error) {
      console.error('[createSupabaseSeason] Error:', error);
      throw error;
    }
    if (!data) throw new Error('Failed to create season, no data returned.');
    return data as Season; 
  } catch (error) {
    console.error('[createSupabaseSeason] Unexpected error:', error);
    throw error;
  }
};

// For updates, based on Season type, only name can be updated.
export type SeasonForUpdate = Partial<Pick<Season, 'name'>>;

// Update existing season
export const updateSupabaseSeason = async (
  authedSupabaseClient: SupabaseClient, 
  internalSupabaseUserId: string, 
  seasonId: string, 
  seasonUpdateData: SeasonForUpdate
): Promise<Season> => {
  console.log(`[Supabase SERVICE - updateSupabaseSeason] Received internalSupabaseUserId: ${internalSupabaseUserId}, seasonId: ${seasonId}, updateData:`, seasonUpdateData);

  if (!internalSupabaseUserId) {
    throw new Error("Internal Supabase User ID is required for updating season.");
  }
   if (!authedSupabaseClient) {
    throw new Error("Authenticated Supabase client is required for updating season.");
  }

  const updateToApply: Partial<Pick<SupabaseSeasonSchema, 'name'>> = {};
  if (seasonUpdateData.name !== undefined) {
    updateToApply.name = seasonUpdateData.name;
  }

  if (Object.keys(updateToApply).length === 0) {
    console.warn("[updateSupabaseSeason] No valid fields to update. Fetching current season.");
    const { data: currentData, error: currentError } = await authedSupabaseClient
      .from('seasons')
      .select('id, name') 
      .match({ id: seasonId, user_id: internalSupabaseUserId })
      .single();
    if (currentError) {
      console.error("[updateSupabaseSeason] Error fetching current season data when no update fields were provided:", currentError);
      throw currentError;
    }
    if (!currentData) throw new Error('Season not found (and no valid fields to update).');
    return currentData as Season;
  }

  try {
    const { data, error } = await authedSupabaseClient
      .from('seasons')
      .update(updateToApply)
      .match({ id: seasonId, user_id: internalSupabaseUserId })
      .select('id, name') 
      .single();

    if (error) {
      console.error('[updateSupabaseSeason] Error:', error);
      throw error;
    }
    if (!data) throw new Error('Failed to update season or season not found.');
    return data as Season;
  } catch (error) {
    console.error('[updateSupabaseSeason] Unexpected error:', error);
    throw error;
  }
};

// Delete a season
export const deleteSupabaseSeason = async (authedSupabaseClient: SupabaseClient, internalSupabaseUserId: string, seasonId: string): Promise<boolean> => {
  console.log(`[Supabase SERVICE - deleteSupabaseSeason] Received internalSupabaseUserId: ${internalSupabaseUserId}, seasonId: ${seasonId}`);

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
      .match({ id: seasonId, user_id: internalSupabaseUserId });

    if (error) {
      console.error('[deleteSupabaseSeason] Error:', error);
      throw error;
    }
    
    return (count !== null && count > 0);
  } catch (error) {
    console.error('[deleteSupabaseSeason] Unexpected error:', error);
    throw error;
  }
}; 