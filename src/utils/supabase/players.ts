import type { SupabaseClient } from '@supabase/supabase-js';
import type { Player } from '@/types';

// This interface matches the DB table structure for players
export interface SupabasePlayerSchema {
	id: string;
	user_id: string;
	name: string;
	jersey_number?: string;
	is_goalie: boolean;
	notes?: string;
	nickname?: string;
	created_at: string;
	updated_at: string;
}

// Get all players for the authenticated user (the master roster)
export const getSupabasePlayers = async (
	supabase: SupabaseClient
): Promise<Player[]> => {
	const { data, error } = await supabase
		.from('players')
		.select('id, name, jersey_number, is_goalie, notes, nickname')
		.order('created_at', { ascending: true });

	if (error) {
		console.error('[Supabase SERVICE] Error fetching players:', error);
		throw error;
	}

	return data || [];
};

/**
 * Creates a new player in the Supabase database.
 * @param authedSupabaseClient - An authenticated Supabase client instance.
 * @param playerData - The data for the new player.
 * @returns A promise that resolves to the newly created Player object.
 */
export const createSupabasePlayer = async (
	authedSupabaseClient: SupabaseClient,
	playerData: Omit<Player, 'id' | 'isGoalie' | 'receivedFairPlayCard'>
): Promise<Player> => {
	if (!authedSupabaseClient) {
		throw new Error('Supabase client is required.');
	}

	const {
		data: { user },
	} = await authedSupabaseClient.auth.getUser();
	if (!user) {
		throw new Error('User not authenticated.');
	}

	const newPlayerId = `player_${Date.now()}_${Math.random()
		.toString(36)
		.substring(2, 9)}`;

	const playerToInsert: Omit<SupabasePlayerSchema, 'created_at' | 'updated_at'> =
		{
			id: newPlayerId,
			user_id: user.id, // RLS enforces this, but good practice
			name: playerData.name,
			jersey_number: playerData.jerseyNumber,
			is_goalie: false, // Default value
			notes: playerData.notes,
			nickname: playerData.nickname,
		};

	const { data, error } = await authedSupabaseClient
		.from('players')
		.insert(playerToInsert)
		.select()
		.single();

	if (error) {
		console.error(
			'[Supabase SERVICE - createSupabasePlayer] Error creating player:',
			error
		);
		throw error;
	}

	return {
		...data,
		jerseyNumber: data.jersey_number,
	} as Player;
};

/**
 * Updates an existing player in the Supabase database.
 * @param authedSupabaseClient - An authenticated Supabase client instance.
 * @param playerId - The ID of the player to update.
 * @param playerData - The data to update for the player.
 * @returns A promise that resolves to the updated Player object.
 */
export const updateSupabasePlayer = async (
	authedSupabaseClient: SupabaseClient,
	playerId: string,
	playerData: Partial<Omit<Player, 'id'>>
): Promise<Player> => {
	if (!authedSupabaseClient || !playerId) {
		throw new Error('Supabase client and player ID are required.');
	}

	const dataToUpdate: Partial<
		Omit<SupabasePlayerSchema, 'id' | 'user_id' | 'created_at'>
	> = {
		...playerData,
		jersey_number: playerData.jerseyNumber,
		updated_at: new Date().toISOString(),
	};

	const finalDataToUpdate = { ...dataToUpdate };
	delete (finalDataToUpdate as Partial<Player>).jerseyNumber;

	const { data, error } = await authedSupabaseClient
		.from('players')
		.update(finalDataToUpdate)
		.eq('id', playerId) // RLS handles the user_id check
		.select()
		.single();

	if (error) {
		console.error(
			'[Supabase SERVICE - updateSupabasePlayer] Error updating player:',
			error
		);
		throw error;
	}

	return {
		...data,
		jerseyNumber: data.jersey_number,
	} as Player;
};

/**
 * Deletes a player from the Supabase database.
 * @param authedSupabaseClient - An authenticated Supabase client instance.
 * @param playerId - The ID of the player to delete.
 * @returns A promise that resolves to true if successful.
 */
export const deleteSupabasePlayer = async (
	authedSupabaseClient: SupabaseClient,
	playerId: string
): Promise<boolean> => {
	if (!authedSupabaseClient || !playerId) {
		throw new Error('Supabase client and player ID are required.');
	}

	const { error, count } = await authedSupabaseClient
		.from('players')
		.delete()
		.eq('id', playerId); // RLS handles the user_id check

	if (error) {
		console.error(
			'[Supabase SERVICE - deleteSupabasePlayer] Error deleting player:',
			error
		);
		throw error;
	}

	return count !== null && count > 0;
};