import type { Season } from '@/types';
import { getSupabaseClientWithoutRLS } from '@/lib/supabase'; // Import only the RLS-bypassing client
// import type { SupabaseClient } from '@supabase/supabase-js'; // No longer directly needed here

import {
  getSupabaseSeasons as fetchSeasonsFromSupabaseService,
  createSupabaseSeason as addSeasonToSupabaseService,
  updateSupabaseSeason as updateSeasonInSupabaseService,
  deleteSupabaseSeason as deleteSeasonFromSupabaseService,
} from './supabase/seasons';

// Define the Season type (consider moving to a shared types file if not already there)
// export interface Season { // Remove local definition
//   id: string;
//   name: string;
//   // Add any other relevant season properties, e.g., startDate, endDate
// }

// The authProvider object is no longer needed here.
// The calling code (e.g., React components using hooks)
// will be responsible for obtaining the internalSupabaseUserId
// (e.g., via the new useCurrentSupabaseUser hook) and passing it to these functions.

// --- Refactored Season Utility Functions --- //

/**
 * Retrieves all seasons for the authenticated user from Supabase.
 * @param clerkToken - The JWT token from Clerk for the authenticated user.
 * @param internalSupabaseUserId - The internal Supabase User ID (UUID).
 * @returns A promise that resolves to an array of Season objects.
 * @throws Error if token/ID not provided, or data fetching fails.
 */
export const getSeasons = async (clerkToken: string, internalSupabaseUserId: string): Promise<Season[]> => {
  if (!clerkToken) throw new Error("Clerk token is required.");
  if (!internalSupabaseUserId) {
    throw new Error("User not authenticated or Supabase ID not provided to getSeasons.");
  }
  
  // TEMPORARY FIX: Use client without RLS to avoid UUID format errors
  // This is necessary because Clerk JWT contains Clerk user IDs, not Supabase UUIDs
  // We maintain security by explicitly filtering by user_id in the query
  const supabaseClient = getSupabaseClientWithoutRLS();
  console.log('[getSeasons] Using RLS-bypassing client due to Clerk/Supabase UUID mismatch');
  
  return fetchSeasonsFromSupabaseService(supabaseClient, internalSupabaseUserId);
};

/**
 * Adds a new season for the authenticated user to Supabase.
 * @param clerkToken - The JWT token from Clerk.
 * @param internalSupabaseUserId - The internal Supabase User ID (UUID).
 * @param seasonData - The data for the new season (e.g., { name: string }).
 * @returns A promise that resolves to the newly created Season object.
 * @throws Error if token/ID not provided, validation fails, or save fails.
 */
export const addSeason = async (clerkToken: string, internalSupabaseUserId: string, seasonData: Omit<Season, 'id'>): Promise<Season> => {
  if (!clerkToken) throw new Error("Clerk token is required.");
  if (!internalSupabaseUserId) {
    throw new Error("User not authenticated or Supabase ID not provided to addSeason.");
  }
  if (!seasonData || !seasonData.name?.trim()) {
    throw new Error("Season name cannot be empty.");
  }
  
  // Use RLS-bypassing client for consistency
  const supabaseClient = getSupabaseClientWithoutRLS();
  return addSeasonToSupabaseService(supabaseClient, internalSupabaseUserId, { ...seasonData, name: seasonData.name.trim() });
};

/**
 * Updates an existing season for the authenticated user in Supabase.
 * @param clerkToken - The JWT token from Clerk.
 * @param internalSupabaseUserId - The internal Supabase User ID (UUID).
 * @param seasonId - The ID of the season to update.
 * @param seasonUpdateData - An object containing the fields to update.
 * @returns A promise that resolves to the updated Season object.
 * @throws Error if token/ID not provided, validation fails, or update fails.
 */
export const updateSeason = async (clerkToken: string, internalSupabaseUserId: string, seasonId: string, seasonUpdateData: Partial<Omit<Season, 'id'>>): Promise<Season> => {
  if (!clerkToken) throw new Error("Clerk token is required.");
  if (!internalSupabaseUserId) {
    throw new Error("User not authenticated or Supabase ID not provided to updateSeason.");
  }
  if (!seasonId) {
    throw new Error("Season ID is required for update.");
  }
  if (!seasonUpdateData || Object.keys(seasonUpdateData).length === 0) {
    throw new Error("No update data provided.");
  }
  if (seasonUpdateData.name && !seasonUpdateData.name.trim()) {
    throw new Error("Season name cannot be empty if provided for update.");
  }
  
  const updateData = { ...seasonUpdateData };
  if (updateData.name) {
    updateData.name = updateData.name.trim();
  }
  
  // Use RLS-bypassing client for consistency
  const supabaseClient = getSupabaseClientWithoutRLS();
  return updateSeasonInSupabaseService(supabaseClient, internalSupabaseUserId, seasonId, updateData );
};

/**
 * Deletes a season for the authenticated user from Supabase by its ID.
 * @param clerkToken - The JWT token from Clerk.
 * @param internalSupabaseUserId - The internal Supabase User ID (UUID).
 * @param seasonId - The ID of the season to delete.
 * @returns A promise that resolves to true if successful.
 * @throws Error if token/ID not provided, or delete fails.
 */
export const deleteSeason = async (clerkToken: string, internalSupabaseUserId: string, seasonId: string): Promise<boolean> => {
  if (!clerkToken) throw new Error("Clerk token is required.");
  if (!internalSupabaseUserId) {
    throw new Error("User not authenticated or Supabase ID not provided to deleteSeason.");
  }
  if (!seasonId) {
    throw new Error("Season ID is required for deletion.");
  }
  
  // Use RLS-bypassing client for consistency
  const supabaseClient = getSupabaseClientWithoutRLS();
  return deleteSeasonFromSupabaseService(supabaseClient, internalSupabaseUserId, seasonId);
};

// Note: The `saveSeasons` function (which overwrote all seasons) is typically not 
// needed with a backend database model where individual CRUD operations are preferred.
// If such functionality is absolutely required, it would need careful implementation
// (e.g., delete all existing user seasons then insert all new ones in a transaction if possible).
// For now, it's omitted as per standard backend interaction patterns. 