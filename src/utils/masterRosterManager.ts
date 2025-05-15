import { Player } from '@/types'; // Assuming Player type is in @/types
import {
    getMasterRoster as utilGetMasterRoster,
    addPlayerToRoster as utilAddPlayerToRoster,
    updatePlayerInRoster as utilUpdatePlayerInRoster,
    removePlayerFromRoster as utilRemovePlayerFromRoster,
    setPlayerGoalieStatus as utilSetPlayerGoalieStatus,
    setPlayerFairPlayCardStatus as utilSetPlayerFairPlayCardStatus
} from '@/utils/masterRoster';

/**
 * Retrieves the master roster of players.
 * Calls the underlying async utility from masterRoster.ts.
 * @returns {Promise<Player[]>} The current roster.
 */
export const getMasterRoster = async (): Promise<Player[]> => {
    // console.log('[masterRosterManager] getMasterRoster called');
    try {
        const roster = await utilGetMasterRoster();
        // console.log('[masterRosterManager] Roster fetched by util:', roster);
        return roster;
    } catch (error) {
        console.error("[masterRosterManager] Error in getMasterRoster:", error);
        return []; // Return empty array on error to maintain type consistency
    }
};

/**
 * Adds a new player to the master roster.
 * Calls the underlying async utility from masterRoster.ts.
 * @param {Omit<Player, 'id' | 'isGoalie' | 'receivedFairPlayCard'>} playerData Data for the new player.
 * @returns {Promise<Player | null>} The newly added player, or null if operation failed.
 */
export const addPlayer = async (
    playerData: Omit<Player, 'id' | 'isGoalie' | 'receivedFairPlayCard'>
): Promise<Player | null> => {
    // console.log('[masterRosterManager] addPlayer called with:', playerData);
    try {
        const newPlayer = await utilAddPlayerToRoster(playerData);
        // console.log('[masterRosterManager] Player added by util:', newPlayer);
        return newPlayer;
    } catch (error) {
        console.error("[masterRosterManager] Error in addPlayer:", error);
        return null;
    }
};

/**
 * Updates an existing player in the master roster.
 * Calls the underlying async utility from masterRoster.ts.
 * @param {string} playerId The ID of the player to update.
 * @param {Partial<Omit<Player, 'id'>>} updates An object containing the fields to update.
 * @returns {Promise<Player | null>} The updated player object, or null if player not found or save failed.
 */
export const updatePlayer = async (
    playerId: string,
    updates: Partial<Omit<Player, 'id'>>
): Promise<Player | null> => {
    // console.log('[masterRosterManager] updatePlayer called for ID:', playerId, 'with updates:', updates);
    try {
        const updatedPlayer = await utilUpdatePlayerInRoster(playerId, updates);
        // console.log('[masterRosterManager] Player updated by util:', updatedPlayer);
        return updatedPlayer;
    } catch (error) {
        console.error(`[masterRosterManager] Error in updatePlayer for ID ${playerId}:`, error);
        return null;
    }
};

/**
 * Removes a player from the master roster.
 * Calls the underlying async utility from masterRoster.ts.
 * @param {string} playerId The ID of the player to remove.
 * @returns {Promise<boolean>} True if the player was successfully removed, false otherwise.
 */
export const removePlayer = async (playerId: string): Promise<boolean> => {
    // console.log('[masterRosterManager] removePlayer called for ID:', playerId);
    try {
        const success = await utilRemovePlayerFromRoster(playerId);
        // console.log('[masterRosterManager] Player removal by util status:', success);
        return success;
    } catch (error) {
        console.error(`[masterRosterManager] Error in removePlayer for ID ${playerId}:`, error);
        return false;
    }
};

/**
 * Sets the goalie status for a player in the master roster.
 * Calls the underlying async utility from masterRoster.ts.
 * @param {string} playerId The ID of the player to update.
 * @param {boolean} isGoalie Whether the player should be marked as a goalie.
 * @returns {Promise<Player | null>} The updated player object, or null if player not found or operation failed.
 */
export const setGoalieStatus = async (
    playerId: string,
    isGoalie: boolean
): Promise<Player | null> => {
    // console.log('[masterRosterManager] setGoalieStatus called for ID:', playerId, 'to:', isGoalie);
    try {
        const updatedPlayer = await utilSetPlayerGoalieStatus(playerId, isGoalie);
        // console.log('[masterRosterManager] Goalie status updated by util:', updatedPlayer);
        return updatedPlayer;
    } catch (error) {
        console.error(`[masterRosterManager] Error in setGoalieStatus for ID ${playerId}:`, error);
        return null;
    }
};

/**
 * Sets the fair play card status for a player in the master roster.
 * Calls the underlying async utility from masterRoster.ts.
 * @param {string} playerId The ID of the player to update.
 * @param {boolean} receivedFairPlayCard Whether the player has received the card.
 * @returns {Promise<Player | null>} The updated player object, or null if player not found or operation failed.
 */
export const setFairPlayCardStatus = async (
    playerId: string,
    receivedFairPlayCard: boolean
): Promise<Player | null> => {
    // console.log('[masterRosterManager] setFairPlayCardStatus called for ID:', playerId, 'to:', receivedFairPlayCard);
    try {
        const updatedPlayer = await utilSetPlayerFairPlayCardStatus(playerId, receivedFairPlayCard);
        // console.log('[masterRosterManager] Fair play status updated by util:', updatedPlayer);
        return updatedPlayer;
    } catch (error) {
        console.error(`[masterRosterManager] Error in setFairPlayCardStatus for ID ${playerId}:`, error);
        return null;
    }
}; 