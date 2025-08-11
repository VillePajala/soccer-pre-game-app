import { getSavedGames, saveGames } from './savedGames';
import type { SavedGamesCollection } from '@/types';
import logger from './logger';
import { safeCast, validateSavedGamesCollection } from './typeValidation';

/**
 * Adds `isPlayed: true` to any saved game lacking the property.
 * @returns number of games updated
 */
export const migrateSavedGamesIsPlayed = async (): Promise<number> => {
  try {
    const games = await getSavedGames();
    let updated = 0;
    Object.values(games).forEach((game) => {
      if (game.isPlayed === undefined) {
        game.isPlayed = true;
        updated++;
      }
    });
    if (updated > 0) {
      const validatedGames = safeCast(games, validateSavedGamesCollection, 'migrateSavedGamesIsPlayed');
      await saveGames(validatedGames);
    }
    return updated;
  } catch (error) {
    logger.error('Error migrating saved games:', error);
    throw error;
  }
};
