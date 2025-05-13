import { MASTER_ROSTER_KEY } from '@/config/constants';
import type { Player } from '@/types';

/**
 * Retrieves the master roster of players from localStorage.
 * @returns An array of Player objects.
 */
export const getMasterRoster = (): Player[] => {
  try {
    const rosterJson = localStorage.getItem(MASTER_ROSTER_KEY);
    if (!rosterJson) {
      return [];
    }
    return JSON.parse(rosterJson) as Player[];
  } catch (error) {
    console.error('[getMasterRoster] Error getting master roster from localStorage:', error);
    return []; // Return empty array on error
  }
};

/**
 * Saves the master roster to localStorage, overwriting any existing roster.
 * @param players - The array of Player objects to save.
 * @returns {boolean} True if successful, false otherwise.
 */
export const saveMasterRoster = (players: Player[]): boolean => {
  try {
    localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(players));
    return true;
  } catch (error) {
    console.error('[saveMasterRoster] Error saving master roster to localStorage:', error);
    // Handle potential errors, e.g., localStorage quota exceeded
    return false;
  }
};

/**
 * Adds a new player to the master roster in localStorage.
 * @param playerData - The player data to add. Must contain at least a name.
 * @returns The new Player object with generated ID, or null if operation failed.
 */
export const addPlayerToRoster = (playerData: { 
  name: string;
  nickname?: string;
  jerseyNumber?: string;
  notes?: string;
}): Player | null => {
  const trimmedName = playerData.name?.trim();
  if (!trimmedName) {
    console.error('[addPlayerToRoster] Validation Failed: Player name cannot be empty.');
    return null;
  }
  
  try {
    const currentRoster = getMasterRoster();
    
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
    
    const updatedRoster = [...currentRoster, newPlayer];
    const success = saveMasterRoster(updatedRoster);
    
    if (!success) {
      // Error logged by saveMasterRoster
      return null;
    }
    
    return newPlayer;
  } catch (error) {
    console.error('[addPlayerToRoster] Unexpected error adding player:', error);
    return null;
  }
};

/**
 * Updates an existing player in the master roster.
 * @param playerId - The ID of the player to update.
 * @param updateData - The player data to update.
 * @returns The updated Player object, or null if player not found or operation failed.
 */
export const updatePlayerInRoster = (
  playerId: string, 
  updateData: Partial<Omit<Player, 'id'>>
): Player | null => {
  if (!playerId) {
    console.error('[updatePlayerInRoster] Validation Failed: Player ID cannot be empty.');
    return null;
  }

  try {
    const currentRoster = getMasterRoster();
    const playerIndex = currentRoster.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      console.error(`[updatePlayerInRoster] Player with ID ${playerId} not found.`);
      return null;
    }
    
    // Create updated player object
    const updatedPlayer = {
      ...currentRoster[playerIndex],
      ...updateData
    };
    
    // Ensure name is not empty if it's being updated
    if (updateData.name !== undefined && !updatedPlayer.name?.trim()) {
      console.error('[updatePlayerInRoster] Validation Failed: Player name cannot be empty.');
      return null;
    }
    // Ensure name is trimmed if updated
    if (updatedPlayer.name) {
      updatedPlayer.name = updatedPlayer.name.trim();
    }
    
    // Update roster
    const updatedRoster = [...currentRoster];
    updatedRoster[playerIndex] = updatedPlayer;
    const success = saveMasterRoster(updatedRoster);
    
    if (!success) {
      // Error logged by saveMasterRoster
      return null;
    }

    return updatedPlayer;
  } catch (error) {
    console.error('[updatePlayerInRoster] Unexpected error updating player:', error);
    return null;
  }
};

/**
 * Removes a player from the master roster.
 * @param playerId - The ID of the player to remove.
 * @returns True if player was successfully removed, false otherwise.
 */
export const removePlayerFromRoster = (playerId: string): boolean => {
  if (!playerId) {
    console.error('[removePlayerFromRoster] Validation Failed: Player ID cannot be empty.');
    return false;
  }

  try {
    const currentRoster = getMasterRoster();
    const updatedRoster = currentRoster.filter(p => p.id !== playerId);
    
    if (updatedRoster.length === currentRoster.length) {
      console.error(`[removePlayerFromRoster] Player with ID ${playerId} not found.`);
      return false;
    }
    
    const success = saveMasterRoster(updatedRoster);
    return success;

  } catch (error) {
    console.error('[removePlayerFromRoster] Unexpected error removing player:', error);
    return false;
  }
};

/**
 * Sets the goalie status for a player in the master roster.
 * @param playerId - The ID of the player to update.
 * @param isGoalie - Whether the player should be marked as a goalie.
 * @returns The updated Player object, or null if player not found or operation failed.
 */
export const setPlayerGoalieStatus = (
  playerId: string,
  isGoalie: boolean
): Player | null => {
  return updatePlayerInRoster(playerId, { isGoalie });
};

/**
 * Sets the fair play card status for a player in the master roster.
 * @param playerId - The ID of the player to update.
 * @param receivedFairPlayCard - Whether the player should be marked as having received the fair play card.
 * @returns The updated Player object, or null if player not found or operation failed.
 */
export const setPlayerFairPlayCardStatus = (
  playerId: string,
  receivedFairPlayCard: boolean
): Player | null => {
  return updatePlayerInRoster(playerId, { receivedFairPlayCard });
}; 