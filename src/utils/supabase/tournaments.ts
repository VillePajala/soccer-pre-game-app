import { SupabaseClient } from '@supabase/supabase-js';
import type { Tournament } from '@/types';

/**
 * The format of a tournament record directly from the Supabase 'tournaments' table.
 */
export interface SupabaseTournament {
	id: string;
	user_id: string;
	name: string;
	date?: string;
	location?: string;
	details?: Record<string, unknown>;
	created_at: string;
	updated_at: string;
}

/**
 * Transforms a raw Supabase tournament record into the application's Tournament type.
 * @param supabaseTournament - The raw tournament object from Supabase.
 * @returns A tournament object formatted for the application.
 */
const transformSupabaseTournament = (
	supabaseTournament: SupabaseTournament
): Tournament => {
	return {
		id: supabaseTournament.id,
		name: supabaseTournament.name,
	};
};

/**
 * Fetches all tournaments for the authenticated user from the Supabase database.
 * @param supabase - The Supabase client instance.
 * @returns A promise that resolves to an array of tournaments.
 */
export const getSupabaseTournaments = async (
	supabase: SupabaseClient
): Promise<Tournament[]> => {
	const { data, error } = await supabase
		.from('tournaments')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		console.error('[getSupabaseTournaments] Error fetching tournaments:', error);
		throw error;
	}

	return (data || []).map(transformSupabaseTournament);
};

/**
 * Creates a new tournament in the Supabase database.
 * @param supabase - The Supabase client instance.
 * @param tournamentData - The data for the new tournament.
 * @returns A promise that resolves to the newly created tournament.
 */
export const createSupabaseTournament = async (
	supabase: SupabaseClient,
	tournamentData: Omit<Tournament, 'id'>
): Promise<Tournament> => {
	const {
		data: { user },
	} = await supabase.auth.getUser();
	if (!user) {
		throw new Error('User not authenticated.');
	}

	const newId = `tournament_${Date.now()}_${Math.random()
		.toString(36)
		.substring(2, 9)}`;

	const { data, error } = await supabase
		.from('tournaments')
		.insert({
			id: newId,
			user_id: user.id, // RLS enforces this, but good practice
			name: tournamentData.name,
		})
		.select()
		.single();

	if (error) {
		console.error('[createSupabaseTournament] Error creating tournament:', error);
		throw error;
	}

	return transformSupabaseTournament(data);
};

/**
 * Updates an existing tournament in the Supabase database.
 * @param supabase - The Supabase client instance.
 * @param tournament - The tournament object with updated data.
 * @returns A promise that resolves to the updated tournament.
 */
export const updateSupabaseTournament = async (
	supabase: SupabaseClient,
	tournament: Tournament
): Promise<Tournament> => {
	const { data, error } = await supabase
		.from('tournaments')
		.update({ name: tournament.name, updated_at: new Date().toISOString() })
		.match({ id: tournament.id }) // RLS handles user_id check
		.select()
		.single();

	if (error) {
		console.error('[updateSupabaseTournament] Error updating tournament:', error);
		throw error;
	}

	return transformSupabaseTournament(data);
};

/**
 * Deletes a tournament from the Supabase database.
 * @param supabase - The Supabase client instance.
 * @param tournamentId - The ID of the tournament to delete.
 * @returns A promise that resolves to true if the deletion was successful.
 */
export const deleteSupabaseTournament = async (
	supabase: SupabaseClient,
	tournamentId: string
): Promise<boolean> => {
	const { error } = await supabase
		.from('tournaments')
		.delete()
		.match({ id: tournamentId }); // RLS handles user_id check

	if (error) {
		console.error('[deleteSupabaseTournament] Error deleting tournament:', error);
		throw error;
	}

	return true;
};