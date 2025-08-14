import { MASTER_ROSTER_KEY } from '@/config/storageKeys';
import type { Player } from '@/types';
import logger from '@/utils/logger';

/**
 * DEPRECATED: Direct localStorage access for master roster.
 * This function now delegates to the unified persistence store.
 * 
 * @deprecated Use the persistenceStore.loadMasterRoster() action instead.
 * @returns An array of Player objects.
 */
export const getMasterRoster = async (): Promise<Player[]> => {
  logger.warn('[getMasterRoster] DEPRECATED: Use persistenceStore.loadMasterRoster() instead');
  
  // Import the store dynamically to avoid circular dependencies
  try {
    const { usePersistenceStore } = await import('@/stores/persistenceStore');
    const store = usePersistenceStore.getState();
    
    // Try to use the unified storage API first
    try {
      const roster = await store.getStorageItem<Player[]>(MASTER_ROSTER_KEY, []);
      return roster || [];
    } catch (storageError) {
      logger.debug('[getMasterRoster] Storage API failed, using localStorage fallback:', storageError);
    }
    
    // Fallback to direct localStorage access
    const rosterJson = localStorage.getItem(MASTER_ROSTER_KEY);
    if (!rosterJson) {
      return [];
    }
    return JSON.parse(rosterJson) as Player[];
  } catch (error) {
    logger.error('[getMasterRoster] Error getting master roster:', error);
    return []; // Return empty array on error
  }
};

/**
 * DEPRECATED: Direct localStorage access for saving master roster.
 * This function now delegates to the unified persistence store.
 * 
 * @deprecated Use the persistenceStore.saveMasterRoster() action instead.
 * @param players - The array of Player objects to save.
 * @returns {boolean} True if successful, false otherwise.
 */
export const saveMasterRoster = async (players: Player[]): Promise<boolean> => {
  logger.warn('[saveMasterRoster] DEPRECATED: Use persistenceStore.saveMasterRoster() instead');
  
  // Import the store dynamically to avoid circular dependencies
  try {
    const { usePersistenceStore } = await import('@/stores/persistenceStore');
    const store = usePersistenceStore.getState();
    
    // Try to use the unified storage API first
    try {
      const success = await store.setStorageItem(MASTER_ROSTER_KEY, players);
      return success;
    } catch (storageError) {
      logger.debug('[saveMasterRoster] Storage API failed, using localStorage fallback:', storageError);
    }
    
    // Fallback to direct localStorage access
    localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(players));
    return true;
  } catch (error) {
    logger.error('[saveMasterRoster] Error saving master roster:', error);
    return false;
  }
};

/**
 * DEPRECATED: Direct localStorage access for adding players to master roster.
 * This function now delegates to the unified persistence store.
 * 
 * @deprecated Use the persistenceStore.addPlayerToRoster() action instead.
 * @param playerData - The player data to add. Must contain at least a name.
 * @returns The new Player object with generated ID, or null if operation failed.
 */
export const addPlayerToRoster = async (playerData: {
  name: string;
  nickname?: string;
  jerseyNumber?: string;
  notes?: string;
}): Promise<Player | null> => {
  logger.warn('[addPlayerToRoster] DEPRECATED: Use persistenceStore.addPlayerToRoster() instead');
  
  const trimmedName = playerData.name?.trim();
  if (!trimmedName) {
    logger.error('[addPlayerToRoster] Validation Failed: Player name cannot be empty.');
    return Promise.resolve(null);
  }
  
  try {
    // Import the store dynamically to avoid circular dependencies
    const { usePersistenceStore } = await import('@/stores/persistenceStore');
    const store = usePersistenceStore.getState();
    
    // Try to use the unified persistence API first
    try {
      // Create new player with unique ID
      const newPlayer: Player = {
        id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: trimmedName,
        nickname: playerData.nickname,
        jerseyNumber: playerData.jerseyNumber,
        notes: playerData.notes,
        isGoalie: false, // Default to not goalie
        receivedFairPlayCard: false, // Default to not having received fair play card
      };
      
      const success = await store.addPlayerToRoster(newPlayer);
      return success ? newPlayer : null;
    } catch (storeError) {
      logger.debug('[addPlayerToRoster] Store API failed, using legacy implementation:', storeError);
    }
    
    // Fallback to legacy implementation
    const currentRoster = await getMasterRoster();
    
    const newPlayer: Player = {
      id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: trimmedName,
      nickname: playerData.nickname,
      jerseyNumber: playerData.jerseyNumber,
      notes: playerData.notes,
      isGoalie: false,
      receivedFairPlayCard: false,
    };
    
    const updatedRoster = [...currentRoster, newPlayer];
    const success = await saveMasterRoster(updatedRoster);
    
    return success ? newPlayer : null;
  } catch (error) {
    logger.error('[addPlayerToRoster] Unexpected error adding player:', error);
    return Promise.resolve(null);
  }
};

/**
 * DEPRECATED: Direct localStorage access for updating players in master roster.
 * This function now delegates to the unified persistence store.
 * 
 * @deprecated Use the persistenceStore.updatePlayerInRoster() action instead.
 * @param playerId - The ID of the player to update.
 * @param updateData - The player data to update.
 * @returns The updated Player object, or null if player not found or operation failed.
 */
export const updatePlayerInRoster = async (
  playerId: string, 
  updateData: Partial<Omit<Player, 'id'>>
): Promise<Player | null> => {
  logger.warn('[updatePlayerInRoster] DEPRECATED: Use persistenceStore.updatePlayerInRoster() instead');
  
  if (!playerId) {
    logger.error('[updatePlayerInRoster] Validation Failed: Player ID cannot be empty.');
    return Promise.resolve(null);
  }

  try {
    // Import the store dynamically to avoid circular dependencies
    const { usePersistenceStore } = await import('@/stores/persistenceStore');
    const store = usePersistenceStore.getState();
    
    // Try to use the unified persistence API first
    try {
      // Ensure name is trimmed if provided
      const cleanedUpdateData = { ...updateData };
      if (cleanedUpdateData.name !== undefined) {
        const trimmedName = cleanedUpdateData.name?.trim();
        if (!trimmedName) {
          logger.error('[updatePlayerInRoster] Validation Failed: Player name cannot be empty.');
          return Promise.resolve(null);
        }
        cleanedUpdateData.name = trimmedName;
      }
      
      const success = await store.updatePlayerInRoster(playerId, cleanedUpdateData);
      if (success) {
        // Get the updated player from the roster
        const currentRoster = await store.loadMasterRoster();
        const updatedPlayer = currentRoster.find(p => p.id === playerId);
        return updatedPlayer || null;
      }
      return null;
    } catch (storeError) {
      logger.debug('[updatePlayerInRoster] Store API failed, using legacy implementation:', storeError);
    }
    
    // Fallback to legacy implementation
    const currentRoster = await getMasterRoster();
    const playerIndex = currentRoster.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      logger.error(`[updatePlayerInRoster] Player with ID ${playerId} not found.`);
      return Promise.resolve(null);
    }
    
    const updatedPlayer = {
      ...currentRoster[playerIndex],
      ...updateData
    };
    
    if (updateData.name !== undefined && !updatedPlayer.name?.trim()) {
      logger.error('[updatePlayerInRoster] Validation Failed: Player name cannot be empty.');
      return Promise.resolve(null);
    }
    if (updatedPlayer.name) {
      updatedPlayer.name = updatedPlayer.name.trim();
    }
    
    const updatedRoster = [...currentRoster];
    updatedRoster[playerIndex] = updatedPlayer;
    const success = await saveMasterRoster(updatedRoster);
    
    return success ? updatedPlayer : null;
  } catch (error) {
    logger.error('[updatePlayerInRoster] Unexpected error updating player:', error);
    return Promise.resolve(null);
  }
};

/**
 * DEPRECATED: Direct localStorage access for removing players from master roster.
 * This function now delegates to the unified persistence store.
 * 
 * @deprecated Use the persistenceStore.removePlayerFromRoster() action instead.
 * @param playerId - The ID of the player to remove.
 * @returns True if player was successfully removed, false otherwise.
 */
export const removePlayerFromRoster = async (playerId: string): Promise<boolean> => {
  logger.warn('[removePlayerFromRoster] DEPRECATED: Use persistenceStore.removePlayerFromRoster() instead');
  
  if (!playerId) {
    logger.error('[removePlayerFromRoster] Validation Failed: Player ID cannot be empty.');
    return Promise.resolve(false);
  }

  try {
    // Import the store dynamically to avoid circular dependencies
    const { usePersistenceStore } = await import('@/stores/persistenceStore');
    const store = usePersistenceStore.getState();
    
    // Try to use the unified persistence API first
    try {
      const success = await store.removePlayerFromRoster(playerId);
      return success;
    } catch (storeError) {
      logger.debug('[removePlayerFromRoster] Store API failed, using legacy implementation:', storeError);
    }
    
    // Fallback to legacy implementation
    const currentRoster = await getMasterRoster();
    const updatedRoster = currentRoster.filter(p => p.id !== playerId);
    
    if (updatedRoster.length === currentRoster.length) {
      logger.error(`[removePlayerFromRoster] Player with ID ${playerId} not found.`);
      return Promise.resolve(false);
    }
    
    const success = await saveMasterRoster(updatedRoster);
    return Promise.resolve(success);

  } catch (error) {
    logger.error('[removePlayerFromRoster] Unexpected error removing player:', error);
    return Promise.resolve(false);
  }
};

/**
 * DEPRECATED: Direct localStorage access for setting player goalie status.
 * This function now delegates to the unified persistence store.
 * 
 * @deprecated Use the persistenceStore.updatePlayerInRoster() action instead.
 * @param playerId - The ID of the player to update.
 * @param isGoalie - Whether the player should be marked as a goalie.
 * @returns The updated Player object, or null if player not found or operation failed.
 */
export const setPlayerGoalieStatus = async (
  playerId: string,
  isGoalie: boolean
): Promise<Player | null> => {
  logger.warn('[setPlayerGoalieStatus] DEPRECATED: Use persistenceStore.updatePlayerInRoster() instead');
  
  if (!playerId) {
    logger.error('[setPlayerGoalieStatus] Validation Failed: Player ID cannot be empty.');
    return Promise.resolve(null);
  }

  try {
    // Import the store dynamically to avoid circular dependencies
    const { usePersistenceStore } = await import('@/stores/persistenceStore');
    const store = usePersistenceStore.getState();
    
    // Try to use the unified persistence API first
    try {
      const currentRoster = await store.loadMasterRoster();
      let targetPlayer: Player | undefined = undefined;
      
      // Create updated roster with goalie logic
      const updatedRoster = currentRoster.map(player => {
        if (player.id === playerId) {
          targetPlayer = { ...player, isGoalie };
          return targetPlayer;
        }
        // If setting a new goalie, unset goalie status for all other players
        if (isGoalie && player.isGoalie) {
          return { ...player, isGoalie: false };
        }
        return player;
      });

      if (!targetPlayer) {
        logger.error(`[setPlayerGoalieStatus] Player with ID ${playerId} not found.`);
        return Promise.resolve(null);
      }
      
      // Ensure the target player is definitely the goalie if isGoalie=true
      let finalRoster = updatedRoster;
      if (isGoalie) {
        finalRoster = updatedRoster.map(p => {
          if (p.id === playerId) return { ...p, isGoalie: true };
          if (p.id !== playerId && p.isGoalie) return { ...p, isGoalie: false}; 
          return p;
        });
        targetPlayer = finalRoster.find(p => p.id === playerId);
      }

      const success = await store.saveMasterRoster(finalRoster);
      return success ? (targetPlayer || null) : null;
    } catch (storeError) {
      logger.debug('[setPlayerGoalieStatus] Store API failed, using legacy implementation:', storeError);
    }
    
    // Fallback to legacy implementation
    const currentRoster = await getMasterRoster();
    let targetPlayer: Player | undefined = undefined;
    
    const updatedRoster = currentRoster.map(player => {
      if (player.id === playerId) {
        targetPlayer = { ...player, isGoalie };
        return targetPlayer;
      }
      if (isGoalie && player.isGoalie) {
        return { ...player, isGoalie: false };
      }
      return player;
    });

    if (!targetPlayer) {
      logger.error(`[setPlayerGoalieStatus] Player with ID ${playerId} not found.`);
      return Promise.resolve(null);
    }
    
    let finalRoster = updatedRoster;
    if (isGoalie) {
      finalRoster = updatedRoster.map(p => {
        if (p.id === playerId) return { ...p, isGoalie: true };
        if (p.id !== playerId && p.isGoalie) return { ...p, isGoalie: false}; 
        return p;
      });
      targetPlayer = finalRoster.find(p => p.id === playerId);
    }

    const success = await saveMasterRoster(finalRoster);
    return success ? (targetPlayer || null) : null;

  } catch (error) {
    logger.error('[setPlayerGoalieStatus] Unexpected error:', error);
    return Promise.resolve(null);
  }
};

/**
 * DEPRECATED: Direct localStorage access for setting player fair play card status.
 * This function now delegates to the unified persistence store.
 * 
 * @deprecated Use the persistenceStore.updatePlayerInRoster() action instead.
 * @param playerId - The ID of the player to update.
 * @param receivedFairPlayCard - Whether the player should be marked as having received the fair play card.
 * @returns The updated Player object, or null if player not found or operation failed.
 */
export const setPlayerFairPlayCardStatus = async (
  playerId: string,
  receivedFairPlayCard: boolean
): Promise<Player | null> => {
  logger.warn('[setPlayerFairPlayCardStatus] DEPRECATED: Use persistenceStore.updatePlayerInRoster() instead');
  return updatePlayerInRoster(playerId, { receivedFairPlayCard });
}; 