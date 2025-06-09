import { Player } from '@/types'; // Assuming Player type is in @/types
import {
    getMasterRoster as utilGetMasterRoster,
} from '@/utils/masterRoster';
import { createSupabasePlayer, updateSupabasePlayer, deleteSupabasePlayer } from './supabase/players';
import { getSupabaseClientWithoutRLS } from '@/lib/supabase';

/**
 * Retrieves the master roster of players for an authenticated user.
 * Calls the underlying async utility from masterRoster.ts.
 * @param {string} clerkToken - The JWT token from Clerk.
 * @param {string} internalSupabaseUserId - The internal Supabase User ID (UUID).
 * @returns {Promise<Player[]>} The current roster.
 */
export const getMasterRoster = async (clerkToken: string, internalSupabaseUserId: string): Promise<Player[]> => {
    // console.log('[masterRosterManager] getMasterRoster called');
    try {
        const roster = await utilGetMasterRoster(clerkToken, internalSupabaseUserId);
        // console.log('[masterRosterManager] Roster fetched by util:', roster);
        return roster;
    } catch (error) {
        console.error("[masterRosterManager] Error in getMasterRoster:", error);
        return []; // Return empty array on error to maintain type consistency
    }
};

/**
 * Adds a new player to the master roster via Supabase.
 * @param {string} clerkToken - The JWT token from Clerk.
 * @param {string} internalSupabaseUserId - The internal Supabase User ID (UUID).
 * @param {Omit<Player, 'id' | 'isGoalie' | 'receivedFairPlayCard'>} playerData - Data for the new player.
 * @returns {Promise<Player | null>} The newly added player, or null if operation failed.
 */
export const addPlayer = async (
    clerkToken: string,
    internalSupabaseUserId: string,
    playerData: Omit<Player, 'id' | 'isGoalie' | 'receivedFairPlayCard'>
): Promise<Player | null> => {
    if (!clerkToken || !internalSupabaseUserId) {
        console.error("[masterRosterManager] Auth details are required to add a player.");
        return null;
    }
    try {
        const supabaseClient = getSupabaseClientWithoutRLS();
        const newPlayer = await createSupabasePlayer(supabaseClient, internalSupabaseUserId, playerData);
        return newPlayer;
    } catch (error) {
        console.error("[masterRosterManager] Error in addPlayer:", error);
        return null;
    }
};

/**
 * Updates an existing player in the master roster via Supabase.
 * @param {string} clerkToken - The JWT token from Clerk.
 * @param {string} internalSupabaseUserId - The internal Supabase User ID (UUID).
 * @param {string} playerId The ID of the player to update.
 * @param {Partial<Omit<Player, 'id'>>} updates An object containing the fields to update.
 * @returns {Promise<Player | null>} The updated player object, or null if player not found or save failed.
 */
export const updatePlayer = async (
    clerkToken: string,
    internalSupabaseUserId: string,
    playerId: string,
    updates: Partial<Omit<Player, 'id'>>
): Promise<Player | null> => {
    if (!clerkToken || !internalSupabaseUserId) {
        console.error("[masterRosterManager] Auth details are required to update a player.");
        return null;
    }
    try {
        const supabaseClient = getSupabaseClientWithoutRLS();
        const updatedPlayer = await updateSupabasePlayer(supabaseClient, internalSupabaseUserId, playerId, updates);
        return updatedPlayer;
    } catch (error) {
        console.error(`[masterRosterManager] Error in updatePlayer for ID ${playerId}:`, error);
        return null;
    }
};

/**
 * Removes a player from the master roster via Supabase.
 * @param {string} clerkToken - The JWT token from Clerk.
 * @param {string} internalSupabaseUserId - The internal Supabase User ID (UUID).
 * @param {string} playerId The ID of the player to remove.
 * @returns {Promise<boolean>} True if the player was successfully removed, false otherwise.
 */
export const removePlayer = async (
    clerkToken: string,
    internalSupabaseUserId: string,
    playerId: string
): Promise<boolean> => {
    if (!clerkToken || !internalSupabaseUserId) {
        console.error("[masterRosterManager] Auth details are required to remove a player.");
        return false;
    }
    try {
        const supabaseClient = getSupabaseClientWithoutRLS();
        const success = await deleteSupabasePlayer(supabaseClient, internalSupabaseUserId, playerId);
        return success;
    } catch (error) {
        console.error(`[masterRosterManager] Error in removePlayer for ID ${playerId}:`, error);
        return false;
    }
};

/**
 * Sets the fair play card status for a player in the master roster via Supabase.
 * @param {string} clerkToken - The JWT token from Clerk.
 * @param {string} internalSupabaseUserId - The internal Supabase User ID (UUID).
 * @param {string} playerId The ID of the player to update.
 * @param {boolean} receivedFairPlayCard Whether the player has received the card.
 * @returns {Promise<Player | null>} The updated player object, or null if player not found or operation failed.
 */
export const setFairPlayCardStatus = async (
    clerkToken: string,
    internalSupabaseUserId: string,
    playerId: string,
    receivedFairPlayCard: boolean
): Promise<Player | null> => {
    if (!clerkToken || !internalSupabaseUserId) {
        console.error("[masterRosterManager] Auth details are required to set fair play card status.");
        return null;
    }
    try {
        const supabaseClient = getSupabaseClientWithoutRLS();
        const updatedPlayer = await updateSupabasePlayer(supabaseClient, internalSupabaseUserId, playerId, { receivedFairPlayCard });
        return updatedPlayer;
    } catch (error) {
        console.error(`[masterRosterManager] Error in setFairPlayCardStatus for ID ${playerId}:`, error);
        return null;
    }
};

/**
 * Sets the goalie status for a player in the master roster via Supabase.
 * @param {string} clerkToken - The JWT token from Clerk.
 * @param {string} internalSupabaseUserId - The internal Supabase User ID (UUID).
 * @param {string} playerId The ID of the player to update.
 * @param {boolean} isGoalie Whether the player should be marked as a goalie.
 * @returns {Promise<Player | null>} The updated player object, or null if player not found or operation failed.
 */
export const setGoalieStatus = async (
    clerkToken: string,
    internalSupabaseUserId: string,
    playerId: string,
    isGoalie: boolean
): Promise<Player | null> => {
    if (!clerkToken || !internalSupabaseUserId) {
        console.error("[masterRosterManager] Auth details are required to set goalie status.");
        return null;
    }
    // Note: The logic to unset the previous goalie is now expected to be handled
    // by a database trigger or a more robust backend service in the future.
    // For now, we update the target player directly.
    try {
        const supabaseClient = getSupabaseClientWithoutRLS();
        const updatedPlayer = await updateSupabasePlayer(supabaseClient, internalSupabaseUserId, playerId, { isGoalie });
        return updatedPlayer;
    } catch (error) {
        console.error(`[masterRosterManager] Error in setGoalieStatus for ID ${playerId}:`, error);
        return null;
    }
}; 