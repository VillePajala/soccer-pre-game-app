// Removed unused import: import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { getTypedSavedGames, saveTypedGame } from '@/utils/typedStorageHelpers';
import { isAppState } from '@/utils/typeGuards';
import logger from '@/utils/logger';

/**
 * Fix imported games that don't have the isPlayed field set
 * This ensures all games appear in statistics
 */
export async function fixImportedGamesIsPlayed(): Promise<{
  success: boolean;
  message: string;
  details?: {
    gamesFixed: number;
    totalGames: number;
  };
}> {
  try {
    logger.log('[FixImportedGamesIsPlayed] Starting fix process...');
    
    // Get all saved games
    const savedGames = await getTypedSavedGames();
    if (!savedGames || Object.keys(savedGames).length === 0) {
      return {
        success: false,
        message: 'No saved games found'
      };
    }
    
    let gamesFixed = 0;
    const totalGames = Object.keys(savedGames).length;
    
    // Process each game
    for (const [gameId, game] of Object.entries(savedGames)) {
      if (!isAppState(game)) {
        logger.warn(`[FixImportedGamesIsPlayed] Invalid game data for ${gameId}, skipping`);
        continue;
      }
      
      // Check if isPlayed is missing or undefined
      if (game.isPlayed === undefined || game.isPlayed === null) {
        // Create updated game with isPlayed set to true
        const updatedGame = { ...game, isPlayed: true };
        
        // Save the updated game
        try {
          const success = await saveTypedGame(updatedGame);
          if (success) {
            gamesFixed++;
            logger.log(`[FixImportedGamesIsPlayed] Fixed game ${gameId} - set isPlayed to true`);
          } else {
            logger.error(`[FixImportedGamesIsPlayed] Failed to save fixed game ${gameId}`);
          }
        } catch (error) {
          logger.error(`[FixImportedGamesIsPlayed] Failed to fix game ${gameId}:`, error);
        }
      }
    }
    
    const message = `Fixed ${gamesFixed} out of ${totalGames} games`;
    logger.log(`[FixImportedGamesIsPlayed] ${message}`);
    
    return {
      success: true,
      message,
      details: {
        gamesFixed,
        totalGames
      }
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[FixImportedGamesIsPlayed] Error fixing games:', error);
    
    return {
      success: false,
      message: `Failed to fix games: ${errorMessage}`
    };
  }
}