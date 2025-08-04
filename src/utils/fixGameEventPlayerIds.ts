// Removed unused import: import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { getTypedSavedGames, getTypedMasterRoster, saveTypedGame } from '@/utils/typedStorageHelpers';
import { isAppState } from '@/utils/typeGuards';
// Removed unused import: import { isPlayer } from '@/utils/typeGuards';
import logger from '@/utils/logger';
import type { Player } from '@/types';

/**
 * Fix game events that have old player IDs by mapping them to current player IDs
 * This is useful after an import where player IDs have changed
 */
export async function fixGameEventPlayerIds(): Promise<{
  success: boolean;
  message: string;
  details?: {
    gamesFixed: number;
    eventsFixed: number;
  };
}> {
  try {
    logger.log('[FixGameEventPlayerIds] Starting player ID fix process...');
    
    // Get current players from the roster
    const currentPlayers = await getTypedMasterRoster();
    if (!currentPlayers || currentPlayers.length === 0) {
      return {
        success: false,
        message: 'No players found in roster'
      };
    }
    
    // Create a map of player names to current IDs
    const playerNameToIdMap: Record<string, string> = {};
    currentPlayers.forEach((player: Player) => {
      playerNameToIdMap[player.name] = player.id;
    });
    
    // Get all saved games
    const savedGames = await getTypedSavedGames();
    if (!savedGames || Object.keys(savedGames).length === 0) {
      return {
        success: false,
        message: 'No saved games found'
      };
    }
    
    let gamesFixed = 0;
    let eventsFixed = 0;
    
    // Process each game
    for (const [gameId, game] of Object.entries(savedGames)) {
      if (!isAppState(game)) {
        logger.warn(`[FixGameEventPlayerIds] Invalid game data for ${gameId}, skipping`);
        continue;
      }
      
      const gameData = { ...game };
      let gameModified = false;
      
      // Fix player IDs in game events
      if (gameData.gameEvents && Array.isArray(gameData.gameEvents)) {
        const updatedEvents = (gameData.gameEvents as Array<Record<string, unknown>>).map(event => {
          let eventModified = false;
          const updatedEvent = { ...event };
          
          // Fix scorerId
          if (event.scorerId && typeof event.scorerId === 'string') {
            // Try to find the player in availablePlayers to get their name
            const availablePlayers = gameData.availablePlayers as Array<Record<string, unknown>> || [];
            const scorer = availablePlayers.find(p => p.id === event.scorerId);
            
            if (scorer && scorer.name && typeof scorer.name === 'string') {
              const currentId = playerNameToIdMap[scorer.name];
              if (currentId && currentId !== event.scorerId) {
                updatedEvent.scorerId = currentId;
                eventModified = true;
                logger.log(`[FixGameEventPlayerIds] Fixed scorerId for ${scorer.name}: ${event.scorerId} -> ${currentId}`);
              }
            }
          }
          
          // Fix assisterId
          if (event.assisterId && typeof event.assisterId === 'string') {
            // Try to find the player in availablePlayers to get their name
            const availablePlayers = gameData.availablePlayers as Array<Record<string, unknown>> || [];
            const assister = availablePlayers.find(p => p.id === event.assisterId);
            
            if (assister && assister.name && typeof assister.name === 'string') {
              const currentId = playerNameToIdMap[assister.name];
              if (currentId && currentId !== event.assisterId) {
                updatedEvent.assisterId = currentId;
                eventModified = true;
                logger.log(`[FixGameEventPlayerIds] Fixed assisterId for ${assister.name}: ${event.assisterId} -> ${currentId}`);
              }
            }
          }
          
          if (eventModified) {
            eventsFixed++;
            gameModified = true;
          }
          
          return updatedEvent;
        });
        
        if (gameModified) {
          gameData.gameEvents = updatedEvents;
        }
      }
      
      // Fix selectedPlayerIds
      if (gameData.selectedPlayerIds && Array.isArray(gameData.selectedPlayerIds)) {
        const availablePlayers = gameData.availablePlayers as Array<Record<string, unknown>> || [];
        const updatedSelectedIds = (gameData.selectedPlayerIds as string[]).map(oldId => {
          const player = availablePlayers.find(p => p.id === oldId);
          if (player && player.name && typeof player.name === 'string') {
            const currentId = playerNameToIdMap[player.name];
            if (currentId && currentId !== oldId) {
              gameModified = true;
              return currentId;
            }
          }
          return oldId;
        });
        
        if (gameModified) {
          gameData.selectedPlayerIds = updatedSelectedIds;
        }
      }
      
      // Fix availablePlayers
      if (gameData.availablePlayers && Array.isArray(gameData.availablePlayers)) {
        gameData.availablePlayers = (gameData.availablePlayers as Array<Record<string, unknown>>).map(player => {
          if (player.name && typeof player.name === 'string') {
            const currentId = playerNameToIdMap[player.name];
            if (currentId && currentId !== player.id) {
              gameModified = true;
              return { ...player, id: currentId };
            }
          }
          return player;
        });
      }
      
      // Fix playersOnField
      if (gameData.playersOnField && Array.isArray(gameData.playersOnField)) {
        gameData.playersOnField = (gameData.playersOnField as Array<Record<string, unknown>>).map(player => {
          if (player.name && typeof player.name === 'string') {
            const currentId = playerNameToIdMap[player.name];
            if (currentId && currentId !== player.id) {
              gameModified = true;
              return { ...player, id: currentId };
            }
          }
          return player;
        });
      }
      
      // Save the updated game if it was modified
      if (gameModified) {
        const success = await saveTypedGame(gameData);
        if (success) {
          gamesFixed++;
          logger.log(`[FixGameEventPlayerIds] Fixed game ${gameId}`);
        } else {
          logger.error(`[FixGameEventPlayerIds] Failed to save fixed game ${gameId}`);
        }
      }
    }
    
    const message = `Fixed ${eventsFixed} events in ${gamesFixed} games`;
    logger.log(`[FixGameEventPlayerIds] ${message}`);
    
    return {
      success: true,
      message,
      details: {
        gamesFixed,
        eventsFixed
      }
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[FixGameEventPlayerIds] Error fixing player IDs:', error);
    
    return {
      success: false,
      message: `Failed to fix player IDs: ${errorMessage}`
    };
  }
}