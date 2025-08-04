import type { AppState, Player, Season, Tournament, SavedGamesCollection } from '@/types';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import {
  isAppState,
  isPlayer,
  isSeason,
  isTournament,
  isRecord
} from './typeGuards';
// Removed unused import: isSavedGamesCollection
import logger from './logger';

/**
 * Typed wrapper functions for storage operations
 * These provide type safety and runtime validation to replace unsafe casting
 */

/**
 * Get saved games with type validation
 * @returns Validated SavedGamesCollection or empty object if invalid
 */
export async function getTypedSavedGames(): Promise<SavedGamesCollection> {
  try {
    const games = await storageManager.getSavedGames();
    
    if (!isRecord(games)) {
      logger.warn('Invalid games data structure, returning empty collection');
      return {};
    }

    // Validate each game
    const validatedGames: SavedGamesCollection = {};
    for (const [key, game] of Object.entries(games)) {
      if (isAppState(game)) {
        validatedGames[key] = game;
      } else {
        logger.warn(`Invalid game data for key ${key}, skipping`);
      }
    }

    return validatedGames;
  } catch (error) {
    logger.error('Failed to get saved games:', error);
    return {};
  }
}

/**
 * Get master roster with type validation
 * @returns Validated Player array or empty array if invalid
 */
export async function getTypedMasterRoster(): Promise<Player[]> {
  try {
    const roster = await storageManager.getMasterRoster();
    
    if (!Array.isArray(roster)) {
      logger.warn('Invalid roster data structure, returning empty array');
      return [];
    }

    // Validate each player
    const validatedRoster: Player[] = [];
    for (const player of roster) {
      if (isPlayer(player)) {
        validatedRoster.push(player);
      } else {
        logger.warn('Invalid player data found, skipping:', player);
      }
    }

    return validatedRoster;
  } catch (error) {
    logger.error('Failed to get master roster:', error);
    return [];
  }
}

/**
 * Get seasons with type validation
 * @returns Validated Season array or empty array if invalid
 */
export async function getTypedSeasons(): Promise<Season[]> {
  try {
    const seasons = await storageManager.getSeasons();
    
    if (!Array.isArray(seasons)) {
      logger.warn('Invalid seasons data structure, returning empty array');
      return [];
    }

    // Validate each season
    const validatedSeasons: Season[] = [];
    for (const season of seasons) {
      if (isSeason(season)) {
        validatedSeasons.push(season);
      } else {
        logger.warn('Invalid season data found, skipping:', season);
      }
    }

    return validatedSeasons;
  } catch (error) {
    logger.error('Failed to get seasons:', error);
    return [];
  }
}

/**
 * Get tournaments with type validation
 * @returns Validated Tournament array or empty array if invalid
 */
export async function getTypedTournaments(): Promise<Tournament[]> {
  try {
    const tournaments = await storageManager.getTournaments();
    
    if (!Array.isArray(tournaments)) {
      logger.warn('Invalid tournaments data structure, returning empty array');
      return [];
    }

    // Validate each tournament
    const validatedTournaments: Tournament[] = [];
    for (const tournament of tournaments) {
      if (isTournament(tournament)) {
        validatedTournaments.push(tournament);
      } else {
        logger.warn('Invalid tournament data found, skipping:', tournament);
      }
    }

    return validatedTournaments;
  } catch (error) {
    logger.error('Failed to get tournaments:', error);
    return [];
  }
}

/**
 * Get a specific saved game with type validation
 * @param gameId The game ID to retrieve
 * @returns Validated AppState or null if not found/invalid
 */
export async function getTypedSavedGame(gameId: string): Promise<AppState | null> {
  try {
    const games = await getTypedSavedGames();
    const game = games[gameId];
    
    return game || null;
  } catch (error) {
    logger.error(`Failed to get saved game ${gameId}:`, error);
    return null;
  }
}

/**
 * Save a game with type validation
 * @param gameData The game data to save
 * @returns Promise<boolean> indicating success
 */
export async function saveTypedGame(gameData: AppState): Promise<boolean> {
  try {
    if (!isAppState(gameData)) {
      logger.error('Invalid game data provided for saving');
      return false;
    }

    await storageManager.saveSavedGame(gameData);
    return true;
  } catch (error) {
    logger.error('Failed to save game:', error);
    return false;
  }
}

/**
 * Update game data safely with partial updates
 * @param gameId The game ID to update
 * @param updates Partial updates to apply
 * @returns Promise<boolean> indicating success
 */
export async function updateTypedGame(gameId: string, updates: Partial<AppState>): Promise<boolean> {
  try {
    const existingGame = await getTypedSavedGame(gameId);
    
    if (!existingGame) {
      logger.error(`Game ${gameId} not found for update`);
      return false;
    }

    const updatedGame = { ...existingGame, ...updates };
    
    if (!isAppState(updatedGame)) {
      logger.error('Updated game data is invalid');
      return false;
    }

    return await saveTypedGame(updatedGame);
  } catch (error) {
    logger.error(`Failed to update game ${gameId}:`, error);
    return false;
  }
}

/**
 * Safely cast storage data with validation
 * @param data Unknown data from storage
 * @param validator Type guard function
 * @param fallback Fallback value if validation fails
 * @returns Validated data or fallback
 */
export function safelyCastStorageData<T>(
  data: unknown,
  validator: (obj: unknown) => obj is T,
  fallback: T
): T {
  if (validator(data)) {
    return data;
  }
  
  logger.warn('Storage data failed validation, using fallback');
  return fallback;
}

/**
 * Process storage data with error handling and type safety
 * @param data Raw storage data
 * @param processor Function to process the data
 * @param fallback Fallback value on error
 * @returns Processed data or fallback
 */
export function processStorageData<T, R>(
  data: unknown,
  processor: (validData: T) => R,
  validator: (obj: unknown) => obj is T,
  fallback: R
): R {
  try {
    if (validator(data)) {
      return processor(data);
    } else {
      logger.warn('Storage data failed validation');
      return fallback;
    }
  } catch (error) {
    logger.error('Error processing storage data:', error);
    return fallback;
  }
}