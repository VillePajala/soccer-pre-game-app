import { authAwareStorageManager as storageManager } from '@/lib/storage';
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
    const savedGames = await storageManager.getSavedGames() as Record<string, unknown>;
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
      if (!game || typeof game !== 'object') continue;
      
      const gameData = game as Record<string, unknown>;
      
      // Check if isPlayed is missing or undefined
      if (gameData.isPlayed === undefined || gameData.isPlayed === null) {
        // Set isPlayed to true
        gameData.isPlayed = true;
        
        // Save the updated game
        try {
          await storageManager.saveSavedGame(gameData);
          gamesFixed++;
          logger.log(`[FixImportedGamesIsPlayed] Fixed game ${gameId} - set isPlayed to true`);
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