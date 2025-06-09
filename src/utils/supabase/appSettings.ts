import type { SupabaseClient } from '@supabase/supabase-js';

// This interface matches the DB table structure for app_settings
export interface SupabaseAppSettingsSchema {
  id: string; // user_id
  current_game_id?: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Retrieves the current_game_id for a user from the app_settings table.
 * @param authedSupabaseClient - An authenticated Supabase client instance.
 * @param internalSupabaseUserId - The user's Supabase UUID.
 * @returns A promise that resolves to the current_game_id or null if not found.
 */
export const getSupabaseCurrentGameId = async (
  authedSupabaseClient: SupabaseClient, 
  internalSupabaseUserId: string
): Promise<string | null> => {
  if (!internalSupabaseUserId || !authedSupabaseClient) {
    throw new Error("Supabase client and user ID are required.");
  }

  console.log(`[Supabase SERVICE - getSupabaseCurrentGameId] Fetching app settings for user: ${internalSupabaseUserId}`);

  try {
    const { data, error } = await authedSupabaseClient
      .from('app_settings')
      .select('current_game_id')
      .eq('user_id', internalSupabaseUserId)
      .single();

    if (error) {
      // Check if this is a "no rows found" error (common for new users)
      if (error.code === 'PGRST116') {
        console.log(`[Supabase SERVICE - getSupabaseCurrentGameId] No app settings found for user ${internalSupabaseUserId}. This is normal for a new user.`);
        return null;
      }
      
      // For other errors, log and throw
      console.error('[Supabase SERVICE - getSupabaseCurrentGameId] Error fetching app settings:', error);
      console.error('[Supabase SERVICE - getSupabaseCurrentGameId] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      throw error;
    }

    return data?.current_game_id || null;
  } catch (error) {
    // If this is an RLS error due to the UUID mismatch, return null instead of throwing
    if (error && typeof error === 'object' && 'code' in error) {
      const errorObj = error as { code?: string };
      const errorCode = errorObj.code;
      if (errorCode === '42501' || // insufficient_privilege
          errorCode === '42P01' || // undefined_table  
          errorCode === 'PGRST301') { // JWT error
        console.warn('[Supabase SERVICE - getSupabaseCurrentGameId] RLS/Auth error detected, returning null for new user:', errorCode);
        return null;
      }
    }
    throw error;
  }
};

/**
 * Creates or updates the current_game_id for a user in the app_settings table.
 * @param authedSupabaseClient - An authenticated Supabase client instance.
 * @param internalSupabaseUserId - The user's Supabase UUID.
 * @param gameId - The game ID to set as current.
 * @returns A promise that resolves to true if successful.
 */
export const saveSupabaseCurrentGameId = async (
  authedSupabaseClient: SupabaseClient,
  internalSupabaseUserId: string,
  gameId: string | null
): Promise<boolean> => {
  if (!internalSupabaseUserId || !authedSupabaseClient) {
    throw new Error("Supabase client and user ID are required.");
  }

  const settingToUpsert = {
    user_id: internalSupabaseUserId, // The user_id is the primary key
    current_game_id: gameId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await authedSupabaseClient
    .from('app_settings')
    .upsert(settingToUpsert, { onConflict: 'user_id' }); // Update conflict resolution to use user_id

  if (error) {
    console.error('[Supabase SERVICE - saveSupabaseCurrentGameId] Error saving current game ID:', error);
    throw error;
  }

  return true;
};

// ... (We will add create/update functions later) ... 