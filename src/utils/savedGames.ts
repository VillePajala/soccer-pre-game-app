import { SAVED_GAMES_KEY } from '@/config/constants';
import type { SavedGamesCollection } from '@/app/page';
import type { Player } from '@/types';
import type { Point, Opponent, GameEvent, IntervalLog } from '@/app/page';

// Define GameData interface more precisely
export interface GameData {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  teamOnLeft: 'home' | 'away';
  players: Player[];
  events: GameEvent[];
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
 * @returns Object containing saved games mapped by ID
 */
export const getSavedGames = (): SavedGamesCollection => {
  try {
    const gamesJson = localStorage.getItem(SAVED_GAMES_KEY);
    if (!gamesJson) {
      return {};
    }
    return JSON.parse(gamesJson);
  } catch (error) {
    console.error('Error getting saved games from localStorage:', error);
    return {};
  }
};

/**
 * Saves all games to localStorage
 * @param games - Collection of games to save
 */
export const saveGames = (games: SavedGamesCollection): void => {
  try {
    localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(games));
  } catch (error) {
    console.error('Error saving games to localStorage:', error);
  }
};

/**
 * Saves a single game to localStorage
 * @param gameId - ID of the game to save
 * @param gameData - Game data to save
 * @returns The saved game data
 */
export const saveGame = (gameId: string, gameData: unknown): GameData | null => {
  try {
    if (!gameId) {
      throw new Error('Game ID is required');
    }
    
    const allGames = getSavedGames();
    // Use explicit casting to address type compatibility
    allGames[gameId] = gameData as any;
    saveGames(allGames);
    return gameData as GameData;
  } catch (error) {
    console.error('Error saving game:', error);
    return null;
  }
};

/**
 * Gets a single game by ID
 * @param gameId - ID of the game to retrieve
 * @returns The game data, or null if not found
 */
export const getGame = (gameId: string): GameData | null => {
  try {
    if (!gameId) {
      return null;
    }
    
    const allGames = getSavedGames();
    // Type assertion to handle compatibility between AppState and GameData
    return allGames[gameId] ? (allGames[gameId] as unknown as GameData) : null;
  } catch (error) {
    console.error('Error getting game:', error);
    return null;
  }
};

/**
 * Deletes a game from localStorage
 * @param gameId - ID of the game to delete
 * @returns true if the game was deleted, false otherwise
 */
export const deleteGame = (gameId: string): boolean => {
  try {
    if (!gameId) {
      return false;
    }
    
    const allGames = getSavedGames();
    if (!allGames[gameId]) {
      return false;
    }
    
    delete allGames[gameId];
    saveGames(allGames);
    return true;
  } catch (error) {
    console.error('Error deleting game:', error);
    return false;
  }
};

/**
 * Creates a new game with the given data
 * @param gameData - Initial game data
 * @returns The ID of the new game and the game data, or null on error
 */
export const createGame = (gameData: Partial<GameData>): { gameId: string, gameData: GameData } | null => {
  try {
    const gameId = `game_${Date.now()}`;
    const defaultGameData: GameData = {
      id: gameId,
      homeTeam: 'Home Team',
      awayTeam: 'Away Team',
      date: new Date().toISOString(),
      teamOnLeft: 'home',
      players: [],
      events: [],
      seasonId: null,
      tournamentId: null,
      ...gameData,
    };
    
    const result = saveGame(gameId, defaultGameData);
    if (!result) {
      throw new Error('Failed to save new game');
    }
    
    return { gameId, gameData: result };
  } catch (error) {
    console.error('Error creating new game:', error);
    return null;
  }
};

/**
 * Gets all game IDs
 * @returns Array of game IDs
 */
export const getAllGameIds = (): string[] => {
  try {
    const allGames = getSavedGames();
    return Object.keys(allGames);
  } catch (error) {
    console.error('Error getting all game IDs:', error);
    return [];
  }
};

/**
 * Gets games filtered by season and/or tournament
 * @param filters - Filter criteria
 * @returns Array of filtered games as [gameId, gameData] tuples
 */
export const getFilteredGames = (filters: { 
  seasonId?: string | null, 
  tournamentId?: string | null 
}): [string, GameData][] => {
  try {
    const allGames = getSavedGames();
    const gameEntries = Object.entries(allGames);
    
    // First convert to unknown, then to the target type
    return gameEntries.filter(([, game]) => {
      // Cast to GameData for proper property access
      const gameData = game as unknown as GameData;
      const seasonMatch = !filters.seasonId || gameData.seasonId === filters.seasonId;
      const tournamentMatch = !filters.tournamentId || gameData.tournamentId === filters.tournamentId;
      return seasonMatch && tournamentMatch;
    }).map(([id, game]) => [id, game as unknown as GameData]);
  } catch (error) {
    console.error('Error filtering games:', error);
    return [];
  }
};

/**
 * Updates game details (metadata only, not events)
 * @param gameId - ID of the game to update
 * @param updateData - Data to update
 * @returns The updated game data, or null on error
 */
export const updateGameDetails = (
  gameId: string, 
  updateData: Partial<Omit<GameData, 'id' | 'events'>>
): GameData | null => {
  try {
    const game = getGame(gameId);
    if (!game) {
      console.warn(`Game with ID ${gameId} not found for update.`);
      return null;
    }
    
    const updatedGame = {
      ...game,
      ...updateData,
    };
    
    return saveGame(gameId, updatedGame);
  } catch (error) {
    console.error('Error updating game details:', error);
    return null;
  }
};

/**
 * Type definition for game events to replace any
 */
interface GameEventData {
  id: string;
  type: 'goal' | 'opponentGoal' | 'substitution' | 'periodEnd' | 'gameEnd';
  time?: number;
  scorerId?: string;
  assisterId?: string;
  [key: string]: unknown; // For additional properties
}

/**
 * Adds an event to a game
 * @param gameId - ID of the game
 * @param event - Event to add
 * @returns The updated game data, or null on error
 */
export const addGameEvent = (gameId: string, event: GameEventData): GameData | null => {
  try {
    const game = getGame(gameId);
    if (!game) {
      console.warn(`Game with ID ${gameId} not found for adding event.`);
      return null;
    }
    
    const updatedGame = {
      ...game,
      events: [...game.events, event],
    };
    
    return saveGame(gameId, updatedGame);
  } catch (error) {
    console.error('Error adding game event:', error);
    return null;
  }
};

/**
 * Updates a game event
 * @param gameId - ID of the game
 * @param eventIndex - Index of the event to update
 * @param eventData - Updated event data
 * @returns The updated game data, or null on error
 */
export const updateGameEvent = (gameId: string, eventIndex: number, eventData: GameEventData): GameData | null => {
  try {
    const game = getGame(gameId);
    if (!game) {
      console.warn(`Game with ID ${gameId} not found for updating event.`);
      return null;
    }
    
    if (eventIndex < 0 || eventIndex >= game.events.length) {
      console.warn(`Event index out of bounds: ${eventIndex}`);
      return null;
    }
    
    const updatedEvents = [...game.events];
    updatedEvents[eventIndex] = { ...updatedEvents[eventIndex], ...eventData };
    
    const updatedGame = {
      ...game,
      events: updatedEvents,
    };
    
    return saveGame(gameId, updatedGame);
  } catch (error) {
    console.error('Error updating game event:', error);
    return null;
  }
};

/**
 * Removes a game event
 * @param gameId - ID of the game
 * @param eventIndex - Index of the event to remove
 * @returns The updated game data, or null on error
 */
export const removeGameEvent = (gameId: string, eventIndex: number): GameData | null => {
  try {
    const game = getGame(gameId);
    if (!game) {
      console.warn(`Game with ID ${gameId} not found for removing event.`);
      return null;
    }
    
    if (eventIndex < 0 || eventIndex >= game.events.length) {
      console.warn(`Event index out of bounds: ${eventIndex}`);
      return null;
    }
    
    const updatedEvents = [...game.events];
    updatedEvents.splice(eventIndex, 1);
    
    const updatedGame = {
      ...game,
      events: updatedEvents,
    };
    
    return saveGame(gameId, updatedGame);
  } catch (error) {
    console.error('Error removing game event:', error);
    return null;
  }
};

/**
 * Export all games as JSON string
 * @returns JSON string of all games, or null on error
 */
export const exportGamesAsJson = (): string | null => {
  try {
    const allGames = getSavedGames();
    return JSON.stringify(allGames, null, 2);
  } catch (error) {
    console.error('Error exporting games as JSON:', error);
    return null;
  }
};

/**
 * Import games from JSON string
 * @param jsonData - JSON string containing games data
 * @param overwrite - Whether to overwrite existing games with the same IDs
 * @returns Number of games imported, or null on error
 */
export const importGamesFromJson = (jsonData: string, overwrite: boolean = false): number | null => {
  try {
    const importedGames = JSON.parse(jsonData);
    if (typeof importedGames !== 'object') {
      throw new Error('Invalid games data format');
    }
    
    const currentGames = overwrite ? {} : getSavedGames();
    let importCount = 0;
    
    for (const [gameId, gameData] of Object.entries(importedGames)) {
      if (!currentGames[gameId] || overwrite) {
        // Use explicit any to handle type compatibility with SavedGamesCollection
        currentGames[gameId] = gameData as any;
        importCount++;
      }
    }
    
    saveGames(currentGames);
    return importCount;
  } catch (error) {
    console.error('Error importing games from JSON:', error);
    return null;
  }
}; 