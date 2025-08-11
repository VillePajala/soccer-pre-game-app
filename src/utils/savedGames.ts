import { DEFAULT_GAME_ID } from '@/config/constants';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import type { SavedGamesCollection, AppState, GameEvent as PageGameEvent, Point, Opponent, IntervalLog } from '@/types';
import type { Player } from '@/types';
import logger from '@/utils/logger';
import { safeImportDataParse } from './safeJson';
import { executeAtomicSave, createSaveOperation } from './atomicSave';
import { safeCast, validateAppState } from './typeValidation';

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
 * Gets all saved games using the storage abstraction layer
 * @returns Promise resolving to an Object containing saved games mapped by ID
 */
export const getSavedGames = async (): Promise<SavedGamesCollection> => {
  try {
    const games = await storageManager.getSavedGames() as SavedGamesCollection;
    return games;
  } catch (error) {
    logger.error('Error getting saved games:', error);
    throw error;
  }
};

/**
 * Saves all games using the storage abstraction layer
 * @param games - Collection of games to save
 * @returns Promise resolving when complete
 */
export const saveGames = async (games: SavedGamesCollection): Promise<void> => {
  try {
    // For now, we'll save each game individually
    // This could be optimized with a batch save method in the future
    for (const [gameId, gameData] of Object.entries(games)) {
      await storageManager.saveSavedGame({ ...gameData, id: gameId });
    }
    return;
  } catch (error) {
    logger.error('Error saving games:', error);
    throw error;
  }
};

/**
 * Saves a single game using the storage abstraction layer
 * @param gameId - ID of the game to save
 * @param gameData - Game data to save
 * @returns Promise resolving to the saved game data
 */
/**
 * Enhanced atomic save game function with rollback support
 * Addresses CR-008: Non-Atomic Game Save Operations
 */
export const saveGame = async (gameId: string, gameData: unknown): Promise<AppState> => {
  try {
    if (!gameId) {
      throw new Error('Game ID is required');
    }
    
    // Validate the input data before proceeding
    const validatedGameData = safeCast(gameData, validateAppState, `saveGame-${gameId}`);
    const gameWithId = { ...validatedGameData, id: gameId };
    
    // CRITICAL BUG FIX: Add detailed logging for assist debugging
    const gameEvents = gameWithId.gameEvents || [];
    const assistEvents = gameEvents.filter(event => event.type === 'goal' && event.assisterId);
    if (assistEvents.length > 0) {
      logger.log(`Saving game with ${assistEvents.length} assist events:`, assistEvents.map(e => {
        if (e.type === 'goal') {
          return {
            id: e.id,
            scorerId: e.scorerId,
            assisterId: e.assisterId,
            time: e.time
          };
        }
        return { id: e.id, type: e.type, time: e.time };
      }));
    }

    // Store original game state for potential rollback
    let originalGameState: AppState | null = null;
    try {
      const existingGames = await getSavedGames();
      originalGameState = existingGames[gameId] as AppState || null;
    } catch {
      // No existing game to backup - that's fine for new games
    }

    // Create atomic save operation with rollback capability
    const saveOperation = createSaveOperation(
      `saveGame-${gameId}`,
      async () => {
        logger.log(`[AtomicSave] Executing save for game ${gameId}`);
        return await storageManager.saveSavedGame(gameWithId);
      },
      async () => {
        if (originalGameState) {
          logger.log(`[AtomicSave] Rolling back game ${gameId} to previous state`);
          await storageManager.saveSavedGame(originalGameState);
        } else {
          logger.log(`[AtomicSave] Deleting game ${gameId} (was new game)`);
          await storageManager.deleteSavedGame(gameId);
        }
      }
    );

    // Execute the atomic save transaction
    const result = await executeAtomicSave([saveOperation]);
    
    if (!result.success) {
      throw new Error(result.error || 'Atomic save operation failed');
    }

    const savedGame = result.results?.[0] as AppState;
    if (!savedGame) {
      throw new Error('Save operation completed but no result returned');
    }

    logger.log(`[AtomicSave] Game ${gameId} saved successfully`);
    return savedGame;
    
  } catch (error) {
    logger.error('Error in atomic save game:', error);
    
    // CRITICAL BUG FIX: Add specific logging for assist-related errors
    if (error instanceof Error && error.message.includes('assist')) {
      try {
        const gameDataForLogging = safeCast(gameData, validateAppState, 'errorLogging');
        logger.error('Assist-related save error details:', {
          gameId,
          gameEvents: gameDataForLogging.gameEvents?.length || 0,
          assistEvents: gameDataForLogging.gameEvents?.filter(e => e.type === 'goal' && e.assisterId).length || 0
        });
      } catch {
        logger.error('Could not log assist details due to data validation failure');
      }
    }
    
    throw error;
  }
};

/**
 * Gets the most recent game ID from saved games
 * This is useful for the resume functionality
 * @returns Promise resolving to the most recent game ID, or null if no games exist
 */
export const getMostRecentGameId = async (): Promise<string | null> => {
  try {
    const allGames = await getSavedGames();
    const gameIds = Object.keys(allGames);

    if (gameIds.length === 0) {
      return null;
    }

    // Robust date parsing with fallbacks (align with LoadGameModal/HomePage logic)
    const safeParse = (game: AppState): number => {
      const aDateStr = `${game.gameDate || ''} ${game.gameTime || ''}`.trim();
      if (aDateStr && Number.isFinite(Date.parse(aDateStr))) {
        return new Date(aDateStr).getTime();
      }
      if (game.gameDate && Number.isFinite(Date.parse(game.gameDate))) {
        return new Date(game.gameDate).getTime();
      }
      return 0;
    };

    const withScores = gameIds.map((id) => ({ id, game: allGames[id] as AppState, score: safeParse(allGames[id] as AppState) }));

    const sorted = withScores.sort((a, b) => {
      if (b.score !== a.score) {
        if (!a.score) return 1;
        if (!b.score) return -1;
        return b.score - a.score;
      }
      // Secondary: fallback to timestamp embedded in ID if present
      const tsA = parseInt((a.id.split('_')[1] || '').trim(), 10);
      const tsB = parseInt((b.id.split('_')[1] || '').trim(), 10);
      if (!Number.isNaN(tsA) && !Number.isNaN(tsB)) {
        return tsB - tsA;
      }
      return 0;
    });

    return sorted.length > 0 ? sorted[0].id : null;
  } catch (error) {
    logger.error('Error getting most recent game ID:', error);
    return null;
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
 * Deletes a game using the storage abstraction layer
 * @param gameId - ID of the game to delete
 * @returns Promise resolving to the gameId if the game was deleted, null otherwise
 */
export const deleteGame = async (gameId: string): Promise<string | null> => {
  try {
    if (!gameId) {
      logger.warn('deleteGame: gameId is null or empty.');
      return null;
    }
    
    await storageManager.deleteSavedGame(gameId);
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
    const gameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
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
      // Default to true to ensure legacy games remain included in stats
      // Users can explicitly mark future/planned games as not played
      isPlayed: gameData.isPlayed === undefined ? true : gameData.isPlayed,
      selectedPlayerIds: gameData.selectedPlayerIds || [],
      assessments: gameData.assessments || {},
      seasonId: gameData.seasonId || '',
      tournamentId: gameData.tournamentId || '',
      tournamentLevel: gameData.tournamentLevel || '',
      ageGroup: gameData.ageGroup || '',
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
    // Return the ID from the saved game (which might be different if Supabase generated a new UUID)
    const actualGameId = (result as AppState & { id?: string }).id || gameId;
    return { gameId: actualGameId, gameData: result };
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
      // Treat empty strings as no filter
      const seasonFilter = (filters.seasonId ?? undefined) === '' ? undefined : filters.seasonId ?? undefined;
      const tournamentFilter = (filters.tournamentId ?? undefined) === '' ? undefined : filters.tournamentId ?? undefined;
      const seasonMatch = seasonFilter === undefined || gameData.seasonId === seasonFilter;
      const tournamentMatch = tournamentFilter === undefined || gameData.tournamentId === tournamentFilter;
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
  updateData: Partial<Omit<AppState, 'id' | 'gameEvents'>>
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
 * @param eventId - ID of the event to update
 * @param eventData - New event data
 * @returns Promise resolving to the updated game data, or null on error
 */
export const updateGameEvent = async (
  gameId: string,
  eventIdOrIndex: string | number,
  eventData: PageGameEvent
): Promise<AppState | null> => {
  try {
    const game = await getGame(gameId);
    if (!game) {
      logger.warn(`Game with ID ${gameId} not found for updating event.`);
      return null;
    }
    const events = [...(game.gameEvents || [])];
    const idx = typeof eventIdOrIndex === 'number'
      ? eventIdOrIndex
      : events.findIndex(e => e.id === eventIdOrIndex);
    if (idx === -1) {
      logger.warn(
        `Event ${typeof eventIdOrIndex === 'number' ? `index ${eventIdOrIndex}` : `id ${eventIdOrIndex}`} not found for game ${gameId}.`
      );
      return null;
    }
    events[idx] = eventData;
    const updatedGame = { ...game, gameEvents: events };
    return saveGame(gameId, updatedGame);
  } catch (error) {
    logger.error('Error updating game event:', error);
    throw error;
  }
};

/**
 * Removes an event from a game
 * @param gameId - ID of the game
 * @param eventId - ID of the event to remove
 * @returns Promise resolving to the updated game data, or null on error
 */
export const removeGameEvent = async (
  gameId: string,
  eventIdOrIndex: string | number
): Promise<AppState | null> => {
  try {
    const game = await getGame(gameId);
    if (!game) {
      logger.warn(`Game with ID ${gameId} not found for removing event.`);
      return null;
    }
    const events = [...(game.gameEvents || [])];
    let newEvents: typeof events;
    if (typeof eventIdOrIndex === 'number') {
      if (eventIdOrIndex < 0 || eventIdOrIndex >= events.length) {
        logger.warn(`Event index ${eventIdOrIndex} not found for game ${gameId}.`);
        return null;
      }
      newEvents = events.filter((_, i) => i !== eventIdOrIndex);
    } else {
      const filtered = events.filter(e => e.id !== eventIdOrIndex);
      if (filtered.length === events.length) {
        logger.warn(`Event id ${eventIdOrIndex} not found for game ${gameId}.`);
        return null;
      }
      newEvents = filtered;
    }
    const updatedGame = { ...game, gameEvents: newEvents };
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
    const parseResult = safeImportDataParse<SavedGamesCollection>(jsonData, (data): data is SavedGamesCollection => {
      return typeof data === 'object' && data !== null && !Array.isArray(data);
    });
    
    if (!parseResult.success) {
      throw new Error(`Invalid JSON data format for import: ${parseResult.error}`);
    }
    
    const gamesToImport = parseResult.data!;

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
