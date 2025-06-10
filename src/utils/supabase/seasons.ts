import type { SupabaseClient } from '@supabase/supabase-js';
import type { Season } from '@/types';

// This interface matches the DB table structure
export interface SupabaseSeasonSchema {
	id: string;
	user_id: string;
	name: string;
	start_date?: string | null;
	end_date?: string | null;
	details?: Record<string, unknown> | null;
	created_at: string;
	updated_at: string;
}

// Get all seasons for the authenticated user
export const getSupabaseSeasons = async (
	authedSupabaseClient: SupabaseClient
): Promise<Season[]> => {
	if (!authedSupabaseClient) {
		throw new Error('Authenticated Supabase client is required.');
	}

	const { data, error } = await authedSupabaseClient
		.from('seasons')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('[Supabase SERVICE] Error fetching seasons:', error);
		throw error;
	}

	return data || [];
};

// For creating a season, based on Season type, only name is needed from client.
export type SeasonForCreation = Pick<Season, 'name'>;

// Create a new season
export const createSupabaseSeason = async (
	authedSupabaseClient: SupabaseClient,
	seasonData: SeasonForCreation
): Promise<Season> => {
	if (!authedSupabaseClient) {
		throw new Error('Authenticated Supabase client is required for creating season.');
	}

	// The user_id is now handled by RLS, so we get the user from the session
	const {
		data: { user },
	} = await authedSupabaseClient.auth.getUser();
	if (!user) {
		throw new Error('User not authenticated.');
	}

	const seasonToInsert = {
		id: `season_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
		user_id: user.id, // RLS will enforce this anyway, but it's good practice
		name: seasonData.name,
	};

	const { data, error } = await authedSupabaseClient
		.from('seasons')
		.insert(seasonToInsert)
		.select('id, name')
		.single();

	if (error) {
		console.error('[createSupabaseSeason] Error:', error);
		throw error;
	}
	if (!data) throw new Error('Failed to create season, no data returned.');

	return data as Season;
};

// For updates, based on Season type, only name can be updated.
export type SeasonForUpdate = Partial<Pick<Season, 'name'>>;

// Update existing season
export const updateSupabaseSeason = async (
	authedSupabaseClient: SupabaseClient,
	seasonId: string,
	seasonUpdateData: SeasonForUpdate
): Promise<Season> => {
	if (!seasonId) {
		throw new Error('Season ID is required for updating season.');
	}
	if (!authedSupabaseClient) {
		throw new Error('Authenticated Supabase client is required for updating season.');
	}

	const updateToApply: Partial<
		Omit<SupabaseSeasonSchema, 'id' | 'user_id' | 'created_at'>
	> = {
		name: seasonUpdateData.name,
		updated_at: new Date().toISOString(),
	};

	if (!updateToApply.name) {
		throw new Error('No valid fields to update.');
	}

	const { data, error } = await authedSupabaseClient
		.from('seasons')
		.update(updateToApply)
		.match({ id: seasonId }) // RLS handles the user_id check
		.select('id, name')
		.single();

	if (error) {
		console.error('[updateSupabaseSeason] Error:', error);
		throw error;
	}
	if (!data) throw new Error('Failed to update season or season not found.');

	return data as Season;
};

// Delete a season
export const deleteSupabaseSeason = async (
	authedSupabaseClient: SupabaseClient,
	seasonId: string
): Promise<boolean> => {
	if (!seasonId) {
		throw new Error('Season ID is required for deleting a season.');
	}
	if (!authedSupabaseClient) {
		throw new Error('Authenticated Supabase client is required for deleting a season.');
	}

	const { error, count } = await authedSupabaseClient
		.from('seasons')
		.delete()
		.match({ id: seasonId }); // RLS handles the user_id check

	if (error) {
		console.error('[deleteSupabaseSeason] Error:', error);
		throw error;
	}

	return count !== null && count > 0;
};