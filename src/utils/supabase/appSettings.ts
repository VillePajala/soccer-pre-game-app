import type { SupabaseClient } from '@supabase/supabase-js';

// This interface matches the DB table structure for app_settings
export interface SupabaseAppSettingsSchema {
	id: string; // user_id
	current_game_id?: string | null;
	created_at: string;
	updated_at: string;
}

/**
 * Retrieves the current_game_id for a user from the app_settings table.
 * @param supabase - The Supabase client instance.
 * @returns A promise that resolves to the current_game_id or null if not found.
 */
export const getSupabaseCurrentGameId = async (
	supabase: SupabaseClient
): Promise<string | null> => {
	const { data, error } = await supabase
		.from('app_settings')
		.select('current_game_id')
		.maybeSingle();

	if (error) {
		console.error('[Supabase SERVICE] Error fetching app settings:', error);
		throw error;
	}

	return data ? data.current_game_id : null;
};

/**
 * Creates or updates the current_game_id for a user in the app_settings table.
 * @param authedSupabaseClient - An authenticated Supabase client instance.
 * @param gameId - The game ID to set as current.
 * @returns A promise that resolves to true if successful.
 */
export const saveSupabaseCurrentGameId = async (
	authedSupabaseClient: SupabaseClient,
	gameId: string | null
): Promise<boolean> => {
	if (!authedSupabaseClient) {
		throw new Error('Supabase client and user ID are required.');
	}

	const {
		data: { user },
	} = await authedSupabaseClient.auth.getUser();
	if (!user) {
		throw new Error('User not authenticated.');
	}

	const settingToUpsert = {
		user_id: user.id, // The user_id is the primary key
		current_game_id: gameId,
		updated_at: new Date().toISOString(),
	};

	const { error } = await authedSupabaseClient
		.from('app_settings')
		.upsert(settingToUpsert, { onConflict: 'user_id' });

	if (error) {
		console.error(
			'[Supabase SERVICE - saveSupabaseCurrentGameId] Error saving current game ID:',
			error
		);
		throw error;
	}

	return true;
};