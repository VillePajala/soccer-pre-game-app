import { storageManager } from '@/lib/storage';
import type { AppState, GameEvent } from '@/types';
import logger from './logger';

/**
 * Optimized game save that only updates changed fields
 * This is much faster than saving the entire game state
 */
export const saveGameEventOnly = async (
  gameId: string,
  newEvent: GameEvent,
  updatedScore?: { homeScore: number; awayScore: number }
): Promise<void> => {
  try {
    // For Supabase, we can use partial updates
    if (storageManager.getProviderName?.().includes('supabase')) {
      // Get current game to append event
      // Get all games and find the specific one
      const allGames = await storageManager.getSavedGames() as Record<string, AppState>;
      const currentGame = allGames[gameId];
      if (!currentGame) {
        throw new Error('Game not found');
      }

      // Only update the changed fields
      const partialUpdate = {
        id: gameId,
        gameEvents: [...(currentGame.gameEvents || []), newEvent],
        ...(updatedScore || {})
      };

      await storageManager.saveSavedGame(partialUpdate);
      logger.log(`[OPTIMIZED] Saved only event and score for game ${gameId}`);
    } else {
      // For localStorage, we still need to save the full game
      // But we can optimize by not transforming unchanged data
      // Get all games and find the specific one
      const allGames = await storageManager.getSavedGames() as Record<string, AppState>;
      const currentGame = allGames[gameId];
      if (!currentGame) {
        throw new Error('Game not found');
      }

      const updatedGame = {
        ...currentGame,
        gameEvents: [...(currentGame.gameEvents || []), newEvent],
        ...(updatedScore || {})
      };

      await storageManager.saveSavedGame(updatedGame);
    }
  } catch (error) {
    logger.error('Failed to save game event:', error);
    throw error;
  }
};

/**
 * Batch save multiple changes at once
 */
export const batchSaveGameChanges = async (
  gameId: string,
  changes: {
    events?: GameEvent[];
    score?: { homeScore: number; awayScore: number };
    assessments?: unknown[];
    timerState?: unknown;
  }
): Promise<void> => {
  try {
    // Get all games and find the specific one
    const allGames = await storageManager.getSavedGames() as Record<string, AppState>;
    const currentGame = allGames[gameId];
    if (!currentGame) {
      throw new Error('Game not found');
    }

    const updatedGame = {
      ...currentGame,
      ...(changes.events && { gameEvents: changes.events }),
      ...(changes.score || {}),
      ...(changes.assessments && { assessments: changes.assessments }),
      ...(changes.timerState && { timerState: changes.timerState as unknown })
    };

    await storageManager.saveSavedGame(updatedGame);
    logger.log(`[BATCH] Saved ${Object.keys(changes).length} changes for game ${gameId}`);
  } catch (error) {
    logger.error('Failed to batch save game changes:', error);
    throw error;
  }
};