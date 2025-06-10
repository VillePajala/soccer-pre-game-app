import type { SupabaseClient } from '@supabase/supabase-js';
import type { Tournament } from '@/types';
import {
	getSupabaseTournaments as getTournamentsFromSupabaseService,
	createSupabaseTournament,
	updateSupabaseTournament,
	deleteSupabaseTournament,
} from './supabase/tournaments';

/**
 * Fetches all tournaments for the currently authenticated user.
 * @param supabase - The authenticated Supabase client.
 * @returns A promise that resolves to an array of tournaments.
 */
export const getTournaments = async (
	supabase: SupabaseClient
): Promise<Tournament[]> => {
	if (!supabase) {
		throw new Error('Supabase client is required.');
	}
	return getTournamentsFromSupabaseService(supabase);
};

/**
 * Adds a new tournament for the currently authenticated user.
 * @param supabase - The authenticated Supabase client.
 * @param tournamentData - The data for the new tournament.
 * @returns A promise that resolves to the newly created tournament.
 */
export const addTournament = async (
	supabase: SupabaseClient,
	tournamentData: Omit<Tournament, 'id'>
): Promise<Tournament | null> => {
	if (!supabase) {
		throw new Error('Supabase client is required.');
	}
	if (!tournamentData || !tournamentData.name?.trim()) {
		throw new Error('Tournament name cannot be empty.');
	}

	try {
		const newTournament = await createSupabaseTournament(supabase, {
			...tournamentData,
			name: tournamentData.name.trim(),
		});
		return newTournament;
	} catch (error) {
		console.error('[addTournament] Error creating tournament:', error);
		return null;
	}
};

/**
 * Updates an existing tournament for the currently authenticated user.
 * @param supabase - The authenticated Supabase client.
 * @param tournament - The tournament object with updated data.
 * @returns A promise that resolves to the updated tournament.
 */
export const updateTournament = async (
	supabase: SupabaseClient,
	tournament: Tournament
): Promise<Tournament | null> => {
	if (!supabase) {
		throw new Error('Supabase client is required.');
	}
	if (!tournament || !tournament.id) {
		throw new Error('Tournament ID is required for update.');
	}
	if (!tournament.name?.trim()) {
		throw new Error('Tournament name cannot be empty for update.');
	}

	try {
		const updatedTournament = await updateSupabaseTournament(supabase, {
			...tournament,
			name: tournament.name.trim(),
		});
		return updatedTournament;
	} catch (error) {
		console.error(
			`[updateTournament] Error updating tournament ${tournament.id}:`,
			error
		);
		return null;
	}
};

/**
 * Deletes a tournament for the currently authenticated user.
 * @param supabase - The authenticated Supabase client.
 * @param tournamentId - The ID of the tournament to delete.
 * @returns A promise that resolves to true if the deletion was successful.
 */
export const deleteTournament = async (
	supabase: SupabaseClient,
	tournamentId: string
): Promise<boolean> => {
	if (!supabase) {
		throw new Error('Supabase client is required.');
	}
	if (!tournamentId) {
		throw new Error('Tournament ID is required for deletion.');
	}

	try {
		return await deleteSupabaseTournament(supabase, tournamentId);
	} catch (error) {
		console.error(
			`[deleteTournament] Error deleting tournament ${tournamentId}:`,
			error
		);
		return false;
	}
};