import { MASTER_ROSTER_KEY } from '@/config/constants';
import type { Player } from '@/types';

/**
 * Retrieves the master roster of players from localStorage.
 * @returns An array of Player objects.
 */
export const getMasterRoster = (): Player[] => {
  try {
    const rosterJson = localStorage.getItem(MASTER_ROSTER_KEY);
    return rosterJson ? JSON.parse(rosterJson) : [];
  } catch (error) {
    console.error('Error getting master roster from localStorage:', error);
    return []; // Return empty array on error
  }
};

/**
 * Saves the master roster to localStorage, overwriting any existing roster.
 * @param players - The array of Player objects to save.
 */
export const saveMasterRoster = (players: Player[]): void => {
  try {
    localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(players));
  } catch (error) {
    console.error('Error saving master roster to localStorage:', error);
    // Handle potential errors, e.g., localStorage quota exceeded
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
  try {
    if (!playerData.name.trim()) {
      throw new Error('Player name cannot be empty.');
    }
    
    const currentRoster = getMasterRoster();
    
    // Create new player with unique ID
    const newPlayer: Player = {
      id: `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: playerData.name.trim(),
      nickname: playerData.nickname,
      jerseyNumber: playerData.jerseyNumber,
      notes: playerData.notes,
      isGoalie: false, // Default to not goalie
      receivedFairPlayCard: false, // Default to not having received fair play card
    };
    
    const updatedRoster = [...currentRoster, newPlayer];
    saveMasterRoster(updatedRoster);
    
    return newPlayer;
  } catch (error) {
    console.error('Error adding player to roster:', error);
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
  try {
    const currentRoster = getMasterRoster();
    const playerIndex = currentRoster.findIndex(p => p.id === playerId);
    
    if (playerIndex === -1) {
      console.warn(`Player with ID ${playerId} not found for update.`);
      return null;
    }
    
    // Create updated player object
    const updatedPlayer = {
      ...currentRoster[playerIndex],
      ...updateData
    };
    
    // Ensure name is not empty if it's being updated
    if (updateData.name !== undefined && !updatedPlayer.name.trim()) {
      throw new Error('Player name cannot be empty.');
    }
    
    // Update roster
    const updatedRoster = [...currentRoster];
    updatedRoster[playerIndex] = updatedPlayer;
    saveMasterRoster(updatedRoster);
    
    return updatedPlayer;
  } catch (error) {
    console.error('Error updating player in roster:', error);
    return null;
  }
};

/**
 * Removes a player from the master roster.
 * @param playerId - The ID of the player to remove.
 * @returns True if player was successfully removed, false otherwise.
 */
export const removePlayerFromRoster = (playerId: string): boolean => {
  try {
    const currentRoster = getMasterRoster();
    const updatedRoster = currentRoster.filter(p => p.id !== playerId);
    
    if (updatedRoster.length === currentRoster.length) {
      console.warn(`Player with ID ${playerId} not found for removal.`);
      return false;
    }
    
    saveMasterRoster(updatedRoster);
    return true;
  } catch (error) {
    console.error('Error removing player from roster:', error);
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