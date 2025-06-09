import { SupabaseClient } from '@supabase/supabase-js';
import type { AppState, SavedGamesCollection, Player, Opponent, Point, GameEvent, IntervalLog } from '@/app/page';

/**
 * Represents the structure of a record in the 'saved_games' table.
 */
export interface SupabaseGame {
  id: string;
  user_id: string;
  team_name: string;
  opponent_name: string;
  game_date: string;
  game_time?: string;
  game_location?: string;
  home_or_away: 'home' | 'away';
  home_score: number;
  away_score: number;
  number_of_periods: 1 | 2;
  period_duration_minutes: number;
  current_period: number;
  game_status: 'notStarted' | 'inProgress' | 'periodEnd' | 'gameEnd';
  game_notes: string;
  show_player_names_on_field: boolean;
  sub_interval_minutes?: number;
  last_sub_confirmation_time_seconds?: number;
  season_id?: string;
  tournament_id?: string;
  selected_player_ids: string[];
  game_roster_snapshot: Player[];
  players_on_field_state: Player[];
  opponents_state: Opponent[];
  drawings_state: Point[][];
  game_events_log: GameEvent[];
  completed_interval_durations_log: IntervalLog[];
  created_at: string;
  updated_at: string;
}

/**
 * Maps the application's AppState to the format expected by the Supabase 'saved_games' table.
 * This flattens the complex AppState object into the individual columns of the database table.
 * @param appState - The AppState object from the application.
 * @returns An object formatted for insertion or updating in the Supabase 'saved_games' table.
 */
const fromAppStateToDb = (appState: AppState) => {
  return {
    team_name: appState.teamName,
    opponent_name: appState.opponentName,
    game_date: appState.gameDate,
    game_time: appState.gameTime,
    game_location: appState.gameLocation,
    home_or_away: appState.homeOrAway,
    home_score: appState.homeScore,
    away_score: appState.awayScore,
    number_of_periods: appState.numberOfPeriods,
    period_duration_minutes: appState.periodDurationMinutes,
    current_period: appState.currentPeriod,
    game_status: appState.gameStatus,
    game_notes: appState.gameNotes,
    show_player_names_on_field: appState.showPlayerNames,
    sub_interval_minutes: appState.subIntervalMinutes,
    last_sub_confirmation_time_seconds: appState.lastSubConfirmationTimeSeconds,
    season_id: appState.seasonId,
    tournament_id: appState.tournamentId,
    // JSONB columns
    selected_player_ids: appState.selectedPlayerIds,
    game_roster_snapshot: appState.availablePlayers,
    players_on_field_state: appState.playersOnField,
    opponents_state: appState.opponents,
    drawings_state: appState.drawings,
    game_events_log: appState.gameEvents,
    completed_interval_durations_log: appState.completedIntervalDurations,
  };
};

/**
 * Maps a raw record from the Supabase 'saved_games' table back to the application's AppState format.
 * This reconstructs the AppState object from the flattened database columns.
 * @param dbGame - The raw game object from the Supabase table.
 * @returns An AppState object ready for use in the application.
 */
const fromDbToAppState = (dbGame: SupabaseGame): AppState => {
  return {
    teamName: dbGame.team_name,
    opponentName: dbGame.opponent_name,
    gameDate: dbGame.game_date,
    gameTime: dbGame.game_time || '',
    gameLocation: dbGame.game_location || '',
    homeOrAway: dbGame.home_or_away,
    homeScore: dbGame.home_score,
    awayScore: dbGame.away_score,
    numberOfPeriods: dbGame.number_of_periods,
    periodDurationMinutes: dbGame.period_duration_minutes,
    currentPeriod: dbGame.current_period,
    gameStatus: dbGame.game_status,
    gameNotes: dbGame.game_notes,
    showPlayerNames: dbGame.show_player_names_on_field,
    subIntervalMinutes: dbGame.sub_interval_minutes,
    lastSubConfirmationTimeSeconds: dbGame.last_sub_confirmation_time_seconds,
    seasonId: dbGame.season_id || '',
    tournamentId: dbGame.tournament_id || '',
    // JSONB columns
    selectedPlayerIds: dbGame.selected_player_ids || [],
    availablePlayers: dbGame.game_roster_snapshot || [],
    playersOnField: dbGame.players_on_field_state || [],
    opponents: dbGame.opponents_state || [],
    drawings: dbGame.drawings_state || [],
    gameEvents: dbGame.game_events_log || [],
    completedIntervalDurations: dbGame.completed_interval_durations_log || [],
  };
};

/**
 * Fetches all saved games for a user and returns them as a collection mapped by game ID.
 * @param supabase - The authenticated Supabase client.
 * @param userId - The user's UUID.
 * @returns A promise that resolves to a SavedGamesCollection.
 */
export const getSupabaseSavedGames = async (supabase: SupabaseClient, userId: string): Promise<SavedGamesCollection> => {
  const { data, error } = await supabase
    .from('saved_games')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('[getSupabaseSavedGames] Error fetching games:', error);
    throw error;
  }

  const collection: SavedGamesCollection = {};
  for (const game of data) {
    collection[game.id] = fromDbToAppState(game);
  }
  return collection;
};

/**
 * Saves (inserts or upserts) a single game state to the Supabase database.
 * @param supabase - The authenticated Supabase client.
 * @param userId - The user's UUID.
 * @param gameId - The ID of the game to save.
 * @param snapshot - The full AppState to save.
 * @returns A promise that resolves to the saved AppState.
 */
export const saveSupabaseGame = async (
  supabase: SupabaseClient,
  userId: string,
  gameId: string,
  snapshot: AppState
): Promise<AppState> => {
  const dbRecord = {
    id: gameId,
    user_id: userId,
    ...fromAppStateToDb(snapshot),
  };

  const { error } = await supabase.from('saved_games').upsert(dbRecord, {
    onConflict: 'id',
  });

  if (error) {
    console.error(`[saveSupabaseGame] Error saving game ${gameId}:`, error);
    throw error;
  }

  return snapshot;
};

/**
 * Deletes a single game from the Supabase database.
 * @param supabase - The authenticated Supabase client.
 * @param userId - The user's UUID.
 * @param gameId - The ID of the game to delete.
 * @returns A promise that resolves to true if deletion was successful.
 */
export const deleteSupabaseGame = async (supabase: SupabaseClient, userId: string, gameId: string): Promise<boolean> => {
  const { error } = await supabase
    .from('saved_games')
    .delete()
    .eq('id', gameId)
    .eq('user_id', userId);

  if (error) {
    console.error(`[deleteSupabaseGame] Error deleting game ${gameId}:`, error);
    throw error;
  }

  return true;
};

// ... (We will add create, update, delete functions for single games later) ... 