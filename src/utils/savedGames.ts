import { SAVED_GAMES_KEY } from '@/config/constants';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseSavedGames } from './supabase/savedGames';
import type { SavedGamesCollection, AppState } from '@/types/game';
import type { GameEvent } from '@/types/game';

// NOTE: This file is in a transitional state.
// "Get" operations are being migrated to Supabase first.
// "Write" operations (save, delete, update) will still use localStorage temporarily.

// DEPRECATED: To be removed after full migration.
const getSavedGamesFromLocalStorage = async (): Promise<SavedGamesCollection> => {
  try {
    const gamesJson = localStorage.getItem(SAVED_GAMES_KEY);
    return gamesJson ? JSON.parse(gamesJson) : {};
  } catch (error) {
    console.error('Error getting saved games from localStorage:', error);
    return {};
  }
};

/**
 * Gets all saved games for an authenticated user from Supabase.
 * @param supabase - The authenticated Supabase client.
 * @returns Promise resolving to an Object containing saved games mapped by ID.
 */
export const getSavedGames = async (supabase: SupabaseClient): Promise<SavedGamesCollection> => {
  if (!supabase) {
    console.error("Supabase client is required to get saved games.");
    return {};
  }
  try {
    // Get the user ID from the auth context
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error("Failed to get authenticated user:", userError);
      return {};
    }
    const games = await getSupabaseSavedGames(supabase, user.id);
    return games;
  } catch (error) {
    console.error('Error getting saved games from Supabase:', error);
    // Return empty collection on error to prevent app crash
    return {};
  }
};

// --- Functions below still use localStorage and will be migrated later ---

export const saveGames = async (games: SavedGamesCollection): Promise<void> => {
  try {
    localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(games));
  } catch (error) {
    console.error('Error saving games to localStorage:', error);
    throw error;
  }
};

/**
 * Saves a single game to Supabase for the authenticated user.
 * This will be the primary save function moving forward.
 * @param clerkToken - The JWT token from Clerk.
 * @param internalSupabaseUserId - The internal Supabase User ID (UUID).
 * @param gameId - ID of the game to save.
 * @param gameData - Game data to save (full AppState).
 * @param gameName - The name of the game.
 * @returns Promise resolving to the saved game data (AppState).
 */
export const saveGame = async (gameId: string, gameData: AppState): Promise<AppState> => {
  const allGames = await getSavedGamesFromLocalStorage();
  allGames[gameId] = gameData;
  await saveGames(allGames);
  return gameData;
};

export const getGame = async (gameId: string): Promise<AppState | null> => {
  const allGames = await getSavedGamesFromLocalStorage();
  return allGames[gameId] || null;
};

export const deleteGame = async (gameId: string): Promise<string | null> => {
  const allGames = await getSavedGamesFromLocalStorage();
  if (!allGames[gameId]) {
    console.warn(`deleteGame: Game with ID ${gameId} not found.`);
    return null;
  }
  delete allGames[gameId];
  await saveGames(allGames);
  return gameId;
};

export const createGame = async (gameData: Partial<AppState>): Promise<{ gameId: string, gameData: AppState }> => {
  const gameId = `game_${Date.now()}`;
  const newGameAppState: AppState = {
    playersOnField: gameData.playersOnField || [],
    opponents: gameData.opponents || [],
    drawings: gameData.drawings || [],
    availablePlayers: gameData.availablePlayers || [],
    showPlayerNames: gameData.showPlayerNames === undefined ? true : gameData.showPlayerNames,
    teamName: gameData.teamName || 'My Team',
    gameEvents: gameData.gameEvents || [],
    opponentName: gameData.opponentName || 'Opponent',
    gameDate: gameData.gameDate || new Date().toISOString().split('T')[0],
    homeScore: gameData.homeScore || 0,
    awayScore: gameData.awayScore || 0,
    gameNotes: gameData.gameNotes || '',
    homeOrAway: gameData.homeOrAway || 'home',
    numberOfPeriods: gameData.numberOfPeriods || 2,
    periodDurationMinutes: gameData.periodDurationMinutes || 10,
    currentPeriod: gameData.currentPeriod || 1,
    gameStatus: gameData.gameStatus || 'notStarted',
    selectedPlayerIds: gameData.selectedPlayerIds || [],
    seasonId: gameData.seasonId || '',
    tournamentId: gameData.tournamentId || '',
    gameLocation: gameData.gameLocation || '',
    gameTime: gameData.gameTime || '',
    subIntervalMinutes: gameData.subIntervalMinutes === undefined ? 5 : gameData.subIntervalMinutes,
    completedIntervalDurations: gameData.completedIntervalDurations || [],
    lastSubConfirmationTimeSeconds: gameData.lastSubConfirmationTimeSeconds === undefined ? 0 : gameData.lastSubConfirmationTimeSeconds,
    ...gameData,
  };

  const result = await saveGame(gameId, newGameAppState);
  return { gameId, gameData: result };
};

export const getAllGameIds = async (): Promise<string[]> => {
  const allGames = await getSavedGamesFromLocalStorage();
  return Object.keys(allGames);
};

export const getFilteredGames = async (filters: { 
  seasonId?: string | null, 
  tournamentId?: string | null 
}): Promise<[string, AppState][]> => {
  const allGames = await getSavedGamesFromLocalStorage();
  const gameEntries = Object.entries(allGames);

  const filtered = gameEntries.filter(([, game]) => {
    const gameData = game as AppState;
    const seasonMatch = filters.seasonId === undefined || filters.seasonId === null || gameData.seasonId === filters.seasonId;
    const tournamentMatch = filters.tournamentId === undefined || filters.tournamentId === null || gameData.tournamentId === filters.tournamentId;
    return seasonMatch && tournamentMatch;
  }).map(([id, game]) => [id, game as AppState] as [string, AppState]);
  return filtered;
};

export const updateGameDetails = async (
  gameId: string, 
  updateData: Partial<Omit<AppState, 'id' | 'events'>>
): Promise<AppState | null> => {
  const game = await getGame(gameId);
  if (!game) {
    console.warn(`Game with ID ${gameId} not found for update.`);
    return null;
  }
  const updatedGame = { ...game, ...updateData };
  return saveGame(gameId, updatedGame);
};

export const addGameEvent = async (gameId: string, event: GameEvent): Promise<AppState | null> => {
  const game = await getGame(gameId);
  if (!game) {
    console.warn(`Game with ID ${gameId} not found for adding event.`);
    return null;
  }
  const updatedGame = { ...game, gameEvents: [...(game.gameEvents || []), event] };
  return saveGame(gameId, updatedGame);
};

export const updateGameEvent = async (gameId: string, eventIndex: number, eventData: GameEvent): Promise<AppState | null> => {
  const game = await getGame(gameId);
  if (!game) {
    console.warn(`Game with ID ${gameId} not found for updating event.`);
    return null;
  }
  const events = [...(game.gameEvents || [])];
  if (eventIndex < 0 || eventIndex >= events.length) {
    console.warn(`Event index ${eventIndex} out of bounds for game ${gameId}.`);
    return null;
  }
  events[eventIndex] = eventData;
  const updatedGame = { ...game, gameEvents: events };
  return saveGame(gameId, updatedGame);
};

export const removeGameEvent = async (gameId: string, eventIndex: number): Promise<AppState | null> => {
  const game = await getGame(gameId);
  if (!game) {
    console.warn(`Game with ID ${gameId} not found for removing event.`);
    return null;
  }
  const events = [...(game.gameEvents || [])];
  if (eventIndex < 0 || eventIndex >= events.length) {
    console.warn(`Event index ${eventIndex} out of bounds for game ${gameId}.`);
    return null;
  }
  events.splice(eventIndex, 1);
  const updatedGame = { ...game, gameEvents: events };
  return saveGame(gameId, updatedGame);
};

export const exportGamesAsJson = async (): Promise<string | null> => {
  const allGames = await getSavedGamesFromLocalStorage();
  if (Object.keys(allGames).length === 0) {
    console.log('No games to export.');
    return null;
  }
  return JSON.stringify(allGames, null, 2);
};

export const importGamesFromJson = async (jsonData: string, overwrite: boolean = false): Promise<number> => {
  let importedCount = 0;
  const gamesToImport = JSON.parse(jsonData) as SavedGamesCollection;
  if (typeof gamesToImport !== 'object' || gamesToImport === null) {
    throw new Error('Invalid JSON data format for import.');
  }

  const existingGames = await getSavedGamesFromLocalStorage();
  const gamesToSave: SavedGamesCollection = { ...existingGames };

  for (const gameId in gamesToImport) {
    if (Object.prototype.hasOwnProperty.call(gamesToImport, gameId)) {
      if (existingGames[gameId] && !overwrite) {
        console.log(`Skipping import for existing game ID: ${gameId} (overwrite is false).`);
        continue;
      }
      gamesToSave[gameId] = gamesToImport[gameId];
      importedCount++;
    }
  }

  if (importedCount > 0 || (overwrite && Object.keys(gamesToImport).length > 0)) {
    await saveGames(gamesToSave);
  }
  
  return importedCount;
}; 