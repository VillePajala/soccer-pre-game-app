import { DEFAULT_GAME_ID } from '@/config/constants';
import { SAVED_GAMES_KEY } from '@/config/storageKeys';
import {
  getLocalStorageItem,
  setLocalStorageItem,
} from './localStorage';
import type { SavedGamesCollection, AppState, GameEvent as PageGameEvent, Point, Opponent, IntervalLog } from '@/types';
import type { Player } from '@/types';
import logger from '@/utils/logger';

// Note: AppState (imported from @/types) is the primary type used for live game state
// and for storing games in localStorage via SavedGamesCollection.
// This GameData interface may represent a legacy structure or a specific format for other operations (e.g., import/export).
// Define GameData interface more precisely
export interface GameData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  teamOnLeft: 'home' | 'away';
  players: Player[];
  events: PageGameEvent[];
  playersOnField?: Player[];
  opponents?: Opponent[];
  drawings?: Point[][];
  showPlayerNames?: boolean;
  notes?: string;
  homeScore?: number;
  awayScore?: number;
  gameStatus?: 'notStarted' | 'inProgress' | 'periodEnd' | 'gameEnd';
  currentPeriod?: number;
  numberOfPeriods?: 1 | 2;
  periodDuration?: number;
  selectedPlayerIds?: string[];
  availablePlayers?: Player[];
  location?: string;
  time?: string;
  subIntervalMinutes?: number;
  completedIntervalDurations?: IntervalLog[];
  lastSubConfirmationTimeSeconds?: number;
  seasonId: string | null;
  tournamentId: string | null;
}

/**
 * Gets all saved games from localStorage
 * @returns Promise resolving to an Object containing saved games mapped by ID
 */
export const getSavedGames = async (): Promise<SavedGamesCollection> => {
  try {
    const gamesJson = getLocalStorageItem(SAVED_GAMES_KEY);
    if (!gamesJson) {
      return {};
    }
    return JSON.parse(gamesJson) as SavedGamesCollection;
  } catch (error) {
    logger.error('Error getting saved games from localStorage:', error);
    throw error;
  }
};

/**
 * Saves all games to localStorage
 * @param games - Collection of games to save
 * @returns Promise resolving when complete
 */
export const saveGames = async (games: SavedGamesCollection): Promise<void> => {
  try {
    setLocalStorageItem(SAVED_GAMES_KEY, JSON.stringify(games));
    return;
  } catch (error) {
    logger.error('Error saving games to localStorage:', error);
    throw error;
  }
};

/**
 * Saves a single game to localStorage
 * @param gameId - ID of the game to save
 * @param gameData - Game data to save
 * @returns Promise resolving to the saved game data
 */
export const saveGame = async (gameId: string, gameData: unknown): Promise<AppState> => {
  try {
    if (!gameId) {
      throw new Error('Game ID is required');
    }
    
    const allGames = await getSavedGames();
    allGames[gameId] = gameData as AppState;
    await saveGames(allGames);
    return gameData as AppState;
  } catch (error) {
    logger.error('Error saving game:', error);
    throw error;
  }
};

/**
 * Gets a single game by ID
 * @param gameId - ID of the game to retrieve
 * @returns Promise resolving to the game data, or null if not found
 */
export const getGame = async (gameId: string): Promise<AppState | null> => {
  try {
    if (!gameId) {
      return null;
    }
    
    const allGames = await getSavedGames();
    const game = allGames[gameId] ? (allGames[gameId] as AppState) : null;
    return game;
  } catch (error) {
    logger.error('Error getting game:', error);
    throw error;
  }
};

/**
 * Deletes a game from localStorage
 * @param gameId - ID of the game to delete
 * @returns Promise resolving to the gameId if the game was deleted, null otherwise
 */
export const deleteGame = async (gameId: string): Promise<string | null> => {
  try {
    if (!gameId) {
      logger.warn('deleteGame: gameId is null or empty.');
      return null;
    }
    
    const allGames = await getSavedGames();
    if (!allGames[gameId]) {
      logger.warn(`deleteGame: Game with ID ${gameId} not found.`);
      return null; // Game not found
    }
    
    delete allGames[gameId];
    await saveGames(allGames);
    logger.log(`deleteGame: Game with ID ${gameId} successfully deleted.`);
    return gameId; // Successfully deleted, return the gameId
  } catch (error) {
    logger.error('Error deleting game:', error);
    throw error; // Re-throw other errors
  }
};

/**
 * Creates a new game with the given data
 * @param gameData - Initial game data
 * @returns Promise resolving to the ID of the new game and the game data, or null on error
 */
export const createGame = async (gameData: Partial<AppState>): Promise<{ gameId: string, gameData: AppState }> => {
  try {
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
      tacticalDiscs: gameData.tacticalDiscs || [],
      tacticalDrawings: gameData.tacticalDrawings || [],
      tacticalBallPosition: gameData.tacticalBallPosition === undefined ? { relX: 0.5, relY: 0.5 } : gameData.tacticalBallPosition,
      subIntervalMinutes: gameData.subIntervalMinutes === undefined ? 5 : gameData.subIntervalMinutes,
      completedIntervalDurations: gameData.completedIntervalDurations || [],
      lastSubConfirmationTimeSeconds: gameData.lastSubConfirmationTimeSeconds === undefined ? 0 : gameData.lastSubConfirmationTimeSeconds,
      ...gameData,
    };
    
    const result = await saveGame(gameId, newGameAppState);
    return { gameId, gameData: result };
  } catch (error) {
    logger.error('Error creating new game:', error);
    throw error; // Rethrow to indicate failure
  }
};

/**
 * Gets all game IDs
 * @returns Promise resolving to an Array of game IDs
 */
export const getAllGameIds = async (): Promise<string[]> => {
  try {
    const allGames = await getSavedGames();
    return Object.keys(allGames);
  } catch (error) {
    logger.error('Error getting all game IDs:', error);
    throw error;
  }
};

/**
 * Gets games filtered by season and/or tournament
 * @param filters - Filter criteria
 * @returns Promise resolving to an Array of filtered games as [gameId, gameData] tuples
 */
export const getFilteredGames = async (filters: {
  seasonId?: string | null,
  tournamentId?: string | null
}): Promise<[string, AppState][]> => {
  try {
    const allGames = await getSavedGames();
    const gameEntries = Object.entries(allGames);
    
    const filtered = gameEntries.filter(([, game]) => {
      const gameData = game as AppState;
      // If filters.seasonId is provided (not null/undefined), game must match.
      // If filters.seasonId is null/undefined, this part of the condition is true (don't filter by season).
      const seasonMatch = filters.seasonId === undefined || filters.seasonId === null || gameData.seasonId === filters.seasonId;
      // If filters.tournamentId is provided (not null/undefined), game must match.
      // This correctly handles filtering for tournamentId: '' (empty string).
      const tournamentMatch = filters.tournamentId === undefined || filters.tournamentId === null || gameData.tournamentId === filters.tournamentId;
      return seasonMatch && tournamentMatch;
    }).map(([id, game]) => [id, game as AppState] as [string, AppState]); // Ensure correct tuple type
    return filtered;
  } catch (error) {
    logger.error('Error filtering games:', error);
    throw error;
  }
};

/**
 * Determines the most recently created game ID from a collection.
 * Games are sorted by gameDate (newest first) and then by timestamp
 * embedded in the game ID.
 * @param games - Collection of saved games
 * @returns The latest game ID or null if none exist
 */
export const getLatestGameId = (games: SavedGamesCollection): string | null => {
  const ids = Object.keys(games).filter(id => id !== DEFAULT_GAME_ID);
  if (ids.length === 0) return null;

  const sortedIds = ids.sort((a, b) => {
    const gameA = games[a];
    const gameB = games[b];
    const dateA = gameA?.gameDate ? new Date(gameA.gameDate).getTime() : 0;
    const dateB = gameB?.gameDate ? new Date(gameB.gameDate).getTime() : 0;
    if (dateB !== dateA) {
      if (!dateA) return 1;
      if (!dateB) return -1;
      return dateB - dateA;
    }
    const tsA = parseInt(a.split('_')[1], 10);
    const tsB = parseInt(b.split('_')[1], 10);
    if (!isNaN(tsA) && !isNaN(tsB)) {
      return tsB - tsA;
    }
    return 0;
  });

  return sortedIds[0];
};

/**
 * Updates game details (metadata only, not events)
 * @param gameId - ID of the game to update
 * @param updateData - Data to update
 * @returns Promise resolving to the updated game data, or null on error
 */
export const updateGameDetails = async (
  gameId: string,
  updateData: Partial<Omit<AppState, 'id' | 'events'>>
): Promise<AppState | null> => {
  try {
    const game = await getGame(gameId);
    if (!game) {
      logger.warn(`Game with ID ${gameId} not found for update.`);
      return null;
    }
    
    const updatedGame = {
      ...game,
      ...updateData,
    };
    
    // saveGame now returns a Promise<AppState>
    return saveGame(gameId, updatedGame);
  } catch (error) {
    logger.error('Error updating game details:', error);
    throw error; // Propagate error
  }
};

/**
 * Adds an event to a game
 * @param gameId - ID of the game
 * @param event - Event data to add
 * @returns Promise resolving to the updated game data, or null on error
 */
export const addGameEvent = async (gameId: string, event: PageGameEvent): Promise<AppState | null> => {
  try {
    const game = await getGame(gameId);
    if (!game) {
      logger.warn(`Game with ID ${gameId} not found for adding event.`);
      return null;
    }
    
    const updatedGame = {
      ...game,
      gameEvents: [...(game.gameEvents || []), event], // Ensure events is an array and cast event
    };
    
    return saveGame(gameId, updatedGame);
  } catch (error) {
    logger.error('Error adding game event:', error);
    throw error;
  }
};

/**
 * Updates an event in a game
 * @param gameId - ID of the game
 * @param eventIndex - Index of the event to update
 * @param eventData - New event data
 * @returns Promise resolving to the updated game data, or null on error
 */
export const updateGameEvent = async (gameId: string, eventIndex: number, eventData: PageGameEvent): Promise<AppState | null> => {
  try {
    const game = await getGame(gameId);
    if (!game) {
      logger.warn(`Game with ID ${gameId} not found for updating event.`);
      return null;
    }
    
    const events = [...(game.gameEvents || [])];
    if (eventIndex < 0 || eventIndex >= events.length) {
      logger.warn(`Event index ${eventIndex} out of bounds for game ${gameId}.`);
      return null;
    }
    
    events[eventIndex] = eventData; // Cast eventData
    
    const updatedGame = {
      ...game,
      gameEvents: events,
    };
    
    return saveGame(gameId, updatedGame);
  } catch (error) {
    logger.error('Error updating game event:', error);
    throw error;
  }
};

/**
 * Removes an event from a game
 * @param gameId - ID of the game
 * @param eventIndex - Index of the event to remove
 * @returns Promise resolving to the updated game data, or null on error
 */
export const removeGameEvent = async (gameId: string, eventIndex: number): Promise<AppState | null> => {
  try {
    const game = await getGame(gameId);
    if (!game) {
      logger.warn(`Game with ID ${gameId} not found for removing event.`);
      return null;
    }
    
    const events = [...(game.gameEvents || [])];
    if (eventIndex < 0 || eventIndex >= events.length) {
      logger.warn(`Event index ${eventIndex} out of bounds for game ${gameId}.`);
      return null;
    }
    
    events.splice(eventIndex, 1);
    
    const updatedGame = {
      ...game,
      gameEvents: events,
    };
    
    return saveGame(gameId, updatedGame);
  } catch (error) {
    logger.error('Error removing game event:', error);
    throw error;
  }
};

/**
 * Exports all games as a JSON string
 * @returns Promise resolving to a JSON string of all games, or null on error
 */
export const exportGamesAsJson = async (): Promise<string | null> => {
  try {
    const allGames = await getSavedGames();
    if (Object.keys(allGames).length === 0) {
      logger.log('No games to export.');
      return null; // Or an empty JSON object string like '{}'
    }
    return JSON.stringify(allGames, null, 2);
  } catch (error) {
    logger.error('Error exporting games as JSON:', error);
    throw error; // Propagate error
  }
};

/**
 * Imports games from a JSON string into localStorage
 * @param jsonData - JSON string of games to import
 * @param overwrite - Whether to overwrite existing games with the same ID
 * @returns Promise resolving to the number of games successfully imported, or null on error
 */
import { appStateSchema } from './appStateSchema';

export const importGamesFromJson = async (
  jsonData: string,
  overwrite: boolean = false
): Promise<number> => {
  let importedCount = 0;
  try {
    const gamesToImport = JSON.parse(jsonData) as SavedGamesCollection;
    if (typeof gamesToImport !== 'object' || gamesToImport === null) {
      throw new Error('Invalid JSON data format for import.');
    }

    const existingGames = await getSavedGames();
    const gamesToSave: SavedGamesCollection = { ...existingGames }; // Make a mutable copy

    for (const gameId in gamesToImport) {
      if (Object.prototype.hasOwnProperty.call(gamesToImport, gameId)) {
        if (existingGames[gameId] && !overwrite) {
          logger.log(`Skipping import for existing game ID: ${gameId} (overwrite is false).`);
          continue;
        }
        const validation = appStateSchema.safeParse(gamesToImport[gameId]);
        if (!validation.success) {
          throw new Error(`Invalid game data for ID ${gameId}`);
        }
        gamesToSave[gameId] = validation.data;
        importedCount++;
      }
    }

    if (importedCount > 0 || (overwrite && Object.keys(gamesToImport).length > 0) ) {
        await saveGames(gamesToSave);
    }

    return importedCount;
  } catch (error) {
    logger.error('Error importing games from JSON:', error);
    throw error; // Propagate error
  }
};
