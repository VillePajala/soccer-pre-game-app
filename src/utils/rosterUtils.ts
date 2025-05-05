import { Player } from '@/app/page'; 
import { MASTER_ROSTER_KEY } from '@/config/constants';

/**
 * Retrieves the master roster from localStorage.
 * @returns {Player[]} The current roster, or an empty array if not found or parsing fails.
 */
export const getMasterRoster = (): Player[] => {
  try {
    const rosterJson = localStorage.getItem(MASTER_ROSTER_KEY);
    if (rosterJson) {
      // TODO: Add schema validation/migration logic if needed in the future
      return JSON.parse(rosterJson);
    }
  } catch (error) {
    console.error("Failed to load or parse master roster:", error);
    // Optionally, clear corrupted data: localStorage.removeItem(MASTER_ROSTER_KEY);
  }
  return []; // Return empty array if not found or error occurred
};

/**
 * Saves the master roster to localStorage.
 * @param {Player[]} roster The roster array to save.
 */
export const saveMasterRoster = (roster: Player[]): void => {
  try {
    localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(roster));
  } catch (error) {
    console.error("Failed to save master roster:", error);
    // Optionally, notify user of save failure
    alert('Error saving roster. Changes may not persist.');
  }
};

/**
 * Adds a new player to the master roster.
 * @param {Omit<Player, 'id' | 'isGoalie'>} playerData Data for the new player.
 * @returns {Player | null} The newly added player with generated ID, or null if save failed.
 */
export const addPlayerToRoster = (playerData: Omit<Player, 'id' | 'isGoalie'>): Player | null => {
  const newPlayer: Player = {
    id: `player-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...playerData,
    isGoalie: false, // Default new players to not be goalies
  };

  try {
    const currentRoster = getMasterRoster();
    // Optional: Check for duplicates based on name/number if desired
    // if (currentRoster.some(p => p.name === newPlayer.name)) { ... }
    const updatedRoster = [...currentRoster, newPlayer];
    saveMasterRoster(updatedRoster);
    return newPlayer;
  } catch (error) {
    console.error("Failed to add player to roster:", error);
    return null; // Indicate failure
  }
};

/**
 * Updates an existing player in the master roster.
 * @param {string} playerId The ID of the player to update.
 * @param {Partial<Omit<Player, 'id'>>} updates An object containing the fields to update.
 * @returns {Player | null} The updated player object, or null if player not found or save failed.
 */
export const updatePlayerInRoster = (playerId: string, updates: Partial<Omit<Player, 'id'>>): Player | null => {
  try {
    const currentRoster = getMasterRoster();
    const playerIndex = currentRoster.findIndex(p => p.id === playerId);

    if (playerIndex === -1) {
      console.warn(`Player with ID ${playerId} not found for update.`);
      return null; // Player not found
    }

    // Create the updated player object, ensuring not to overwrite the ID
    const updatedPlayer = { 
      ...currentRoster[playerIndex], 
      ...updates, 
      id: playerId // Ensure ID remains unchanged
    };

    const updatedRoster = [...currentRoster];
    updatedRoster[playerIndex] = updatedPlayer;
    saveMasterRoster(updatedRoster);
    return updatedPlayer;

  } catch (error) {
    console.error(`Failed to update player ${playerId} in roster:`, error);
    return null; // Indicate failure
  }
};

/**
 * Removes a player from the master roster.
 * @param {string} playerId The ID of the player to remove.
 * @returns {boolean} True if the player was successfully removed, false otherwise.
 */
export const removePlayerFromRoster = (playerId: string): boolean => {
  try {
    const currentRoster = getMasterRoster();
    const initialLength = currentRoster.length;
    const updatedRoster = currentRoster.filter(p => p.id !== playerId);

    if (updatedRoster.length === initialLength) {
      console.warn(`Player with ID ${playerId} not found for removal.`);
      return false; // Player not found
    }

    saveMasterRoster(updatedRoster);
    return true;
  } catch (error) {
    console.error(`Failed to remove player ${playerId} from roster:`, error);
    return false; // Indicate failure
  }
};

/**
 * Sets or unsets a player as the goalie, ensuring only one goalie exists.
 * @param {string} playerId The ID of the player to set/unset as goalie.
 * @param {boolean} isGoalie True to set as goalie, false to unset.
 * @returns {Player | null} The updated player object, or null if player not found or save failed.
 */
export const setPlayerGoalieStatus = (playerId: string, isGoalie: boolean = true): Player | null => {
  try {
    let currentRoster = getMasterRoster();
    const playerIndex = currentRoster.findIndex(p => p.id === playerId);

    if (playerIndex === -1) {
      console.warn(`Player with ID ${playerId} not found for setting goalie status.`);
      return null; // Player not found
    }

    // If setting as goalie, unset any other goalie first
    if (isGoalie) {
      currentRoster = currentRoster.map(p => (
        p.isGoalie && p.id !== playerId ? { ...p, isGoalie: false } : p
      ));
    }

    // Update the target player's status
    const updatedPlayer = { ...currentRoster[playerIndex], isGoalie };
    currentRoster[playerIndex] = updatedPlayer;
    
    saveMasterRoster(currentRoster);
    return updatedPlayer;

  } catch (error) {
    console.error(`Failed to set goalie status for player ${playerId}:`, error);
    return null; // Indicate failure
  }
}; 