import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppState } from '@/app/page'; // Assuming AppState is exported from page.tsx

// This interface matches the DB table structure for saved_games
export interface SupabaseSavedGameSchema {
  id: string; // game_id
  user_id: string;
  name: string;
  game_data: AppState;
  created_at: string;
  updated_at: string;
}

/**
 * Retrieves all saved games for the authenticated user.
 * The game_data is a JSONB column containing the full AppState.
 * @param authedSupabaseClient - An authenticated Supabase client instance.
 * @param internalSupabaseUserId - The user's Supabase UUID.
 * @returns A promise that resolves to a collection of saved games.
 */
export const getSupabaseSavedGames = async (
  authedSupabaseClient: SupabaseClient, 
  internalSupabaseUserId: string
): Promise<Record<string, AppState>> => {
  if (!internalSupabaseUserId || !authedSupabaseClient) {
    throw new Error("Supabase client and user ID are required.");
  }

  const { data, error } = await authedSupabaseClient
    .from('saved_games')
    .select('id, game_data')
    .eq('user_id', internalSupabaseUserId)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('[Supabase SERVICE - getSupabaseSavedGames] Error fetching saved games:', error);
    throw error;
  }

  // Transform the array of {id, game_data} into a Record<string, AppState> object
  const savedGamesCollection: Record<string, AppState> = {};
  if (data) {
    for (const game of data) {
      // It's good practice to validate the shape of game.game_data here
      // to ensure it matches AppState, but for now, we'll cast it.
      savedGamesCollection[game.id] = game.game_data as AppState;
    }
  }

  return savedGamesCollection;
};

/**
 * Creates or updates a single saved game in the Supabase database.
 * @param authedSupabaseClient - An authenticated Supabase client instance.
 * @param internalSupabaseUserId - The user's Supabase UUID.
 * @param gameId - The ID of the game to save.
 * @param gameData - The full AppState of the game.
 * @param gameName - The name of the game.
 * @returns A promise that resolves to true if successful.
 */
export const saveSupabaseGame = async (
  authedSupabaseClient: SupabaseClient,
  internalSupabaseUserId: string,
  gameId: string,
  gameData: AppState,
  gameName: string
): Promise<boolean> => {
  if (!internalSupabaseUserId || !authedSupabaseClient || !gameId) {
    throw new Error("Supabase client, user ID, and game ID are required.");
  }

  const gameToUpsert: SupabaseSavedGameSchema = {
    id: gameId,
    user_id: internalSupabaseUserId,
    name: gameName,
    game_data: gameData,
    created_at: new Date().toISOString(), // This will be ignored on update
    updated_at: new Date().toISOString(),
  };

  const { error } = await authedSupabaseClient
    .from('saved_games')
    .upsert(gameToUpsert, { onConflict: 'id' }); // 'id' is the primary key for the saved_games table

  if (error) {
    console.error('[Supabase SERVICE - saveSupabaseGame] Error saving game:', error);
    throw error;
  }

  return true;
};

// ... (We will add create, update, delete functions for single games later) ... 