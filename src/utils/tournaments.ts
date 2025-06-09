import { getSupabaseClientForAuthenticatedOperations } from '@/lib/supabase';
import type { Tournament } from '@/types';
import {
  getSupabaseTournaments,
  createSupabaseTournament,
  updateSupabaseTournament,
  deleteSupabaseTournament,
} from './supabase/tournaments';

/**
 * Fetches all tournaments for the currently authenticated user.
 * @param clerkToken - The JWT from Clerk for user authentication.
 * @param internalSupabaseUserId - The user's internal Supabase UUID.
 * @returns A promise that resolves to an array of tournaments.
 */
export const getTournaments = async (clerkToken: string, internalSupabaseUserId: string): Promise<Tournament[]> => {
  if (!clerkToken) {
    throw new Error('Clerk token is required.');
  }
  if (!internalSupabaseUserId) {
    throw new Error('User not authenticated or Supabase ID not provided to getTournaments.');
  }

  const supabase = getSupabaseClientForAuthenticatedOperations(clerkToken);
  return getSupabaseTournaments(supabase, internalSupabaseUserId);
};

/**
 * Adds a new tournament for the currently authenticated user.
 * @param clerkToken - The JWT from Clerk for user authentication.
 * @param internalSupabaseUserId - The user's internal Supabase UUID.
 * @param tournamentData - The data for the new tournament.
 * @returns A promise that resolves to the newly created tournament.
 */
export const addTournament = async (
  clerkToken: string,
  internalSupabaseUserId: string,
  tournamentData: Omit<Tournament, 'id'>
): Promise<Tournament | null> => {
    if (!clerkToken) {
    throw new Error('Clerk token is required.');
  }
  if (!internalSupabaseUserId) {
    throw new Error('User not authenticated or Supabase ID not provided to addTournament.');
  }
  if (!tournamentData || !tournamentData.name?.trim()) {
    throw new Error('Tournament name cannot be empty.');
  }

  const supabase = getSupabaseClientForAuthenticatedOperations(clerkToken);
  try {
    const newTournament = await createSupabaseTournament(supabase, internalSupabaseUserId, {
      ...tournamentData,
      name: tournamentData.name.trim(),
    });
    return newTournament;
  } catch (error) {
    console.error('[addTournament] Error creating tournament:', error);
    // Depending on requirements, you might want to re-throw or handle specific errors
    return null;
  }
};

/**
 * Updates an existing tournament for the currently authenticated user.
 * @param clerkToken - The JWT from Clerk for user authentication.
 * @param internalSupabaseUserId - The user's internal Supabase UUID.
 * @param tournament - The tournament object with updated data.
 * @returns A promise that resolves to the updated tournament.
 */
export const updateTournament = async (
  clerkToken: string,
  internalSupabaseUserId: string,
  tournament: Tournament
): Promise<Tournament | null> => {
    if (!clerkToken) {
    throw new Error('Clerk token is required.');
  }
  if (!internalSupabaseUserId) {
    throw new Error('User not authenticated or Supabase ID not provided to updateTournament.');
  }
  if (!tournament || !tournament.id) {
    throw new Error('Tournament ID is required for update.');
  }
  if (!tournament.name?.trim()) {
    throw new Error('Tournament name cannot be empty for update.');
  }

  const supabase = getSupabaseClientForAuthenticatedOperations(clerkToken);
  try {
    const updatedTournament = await updateSupabaseTournament(supabase, internalSupabaseUserId, {
      ...tournament,
      name: tournament.name.trim(),
    });
    return updatedTournament;
  } catch (error) {
    console.error(`[updateTournament] Error updating tournament ${tournament.id}:`, error);
    return null;
  }
};

/**
 * Deletes a tournament for the currently authenticated user.
 * @param clerkToken - The JWT from Clerk for user authentication.
 * @param internalSupabaseUserId - The user's internal Supabase UUID.
 * @param tournamentId - The ID of the tournament to delete.
 * @returns A promise that resolves to true if the deletion was successful.
 */
export const deleteTournament = async (
  clerkToken: string,
  internalSupabaseUserId: string,
  tournamentId: string
): Promise<boolean> => {
    if (!clerkToken) {
    throw new Error('Clerk token is required.');
  }
  if (!internalSupabaseUserId) {
    throw new Error('User not authenticated or Supabase ID not provided to deleteTournament.');
  }
  if (!tournamentId) {
    throw new Error('Tournament ID is required for deletion.');
  }

  const supabase = getSupabaseClientForAuthenticatedOperations(clerkToken);
  try {
    return await deleteSupabaseTournament(supabase, internalSupabaseUserId, tournamentId);
  } catch (error) {
    console.error(`[deleteTournament] Error deleting tournament ${tournamentId}:`, error);
    return false;
  }
}; 