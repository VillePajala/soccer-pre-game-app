import type { Season } from '@/types';
import {
  getSupabaseSeasons as fetchSeasonsFromSupabase,
  createSupabaseSeason as addSeasonToSupabase,
  updateSupabaseSeason as updateSeasonInSupabase,
  deleteSupabaseSeason as deleteSeasonFromSupabase,
} from './supabase/seasons'; // Adjust path as needed

// Define the Season type (consider moving to a shared types file if not already there)
// export interface Season { // Remove local definition
//   id: string;
//   name: string;
//   // Add any other relevant season properties, e.g., startDate, endDate
// }

// This object provides authentication-related functionalities.
// We can spy on its methods in tests.
export const authProvider = {
  /**
   * Placeholder function to simulate getting the internal Supabase User ID for the
   * currently authenticated Clerk user.
   */
  getAuthenticatedSupabaseUserId: async (): Promise<string | null> => {
    console.warn(
      "[authProvider.getAuthenticatedSupabaseUserId] Placeholder: Needs actual Clerk integration and public.users mapping."
    );
    // For now, returning null to simulate no authenticated user or no mapping
    // In tests, we will mock this to return a user ID or null as needed.
    return Promise.resolve(null);
  },
};

// --- Refactored Season Utility Functions --- //

/**
 * Retrieves all seasons for the authenticated user from Supabase.
 * @returns A promise that resolves to an array of Season objects.
 * @throws Error if the user is not authenticated or data fetching fails.
 */
export const getSeasons = async (): Promise<Season[]> => {
  const internalSupabaseUserId = await authProvider.getAuthenticatedSupabaseUserId();
  if (!internalSupabaseUserId) {
    // console.error("[getSeasons] User not authenticated or Supabase ID not found.");
    throw new Error("User not authenticated. Please log in to manage seasons.");
  }
  return fetchSeasonsFromSupabase(internalSupabaseUserId);
};

/**
 * Adds a new season for the authenticated user to Supabase.
 * @param seasonData - The data for the new season (e.g., { name: string }).
 * @returns A promise that resolves to the newly created Season object.
 * @throws Error if user not authenticated, validation fails, or save fails.
 */
export const addSeason = async (seasonData: Omit<Season, 'id'>): Promise<Season> => {
  const internalSupabaseUserId = await authProvider.getAuthenticatedSupabaseUserId();
  if (!internalSupabaseUserId) {
    throw new Error("User not authenticated. Please log in to add a season.");
  }
  if (!seasonData || !seasonData.name?.trim()) {
    throw new Error("Season name cannot be empty.");
  }
  // Potentially add duplicate name check here against `getSeasons()` if desired before hitting Supabase,
  // though database constraints are more reliable.
  return addSeasonToSupabase(internalSupabaseUserId, { ...seasonData, name: seasonData.name.trim() });
};

/**
 * Updates an existing season for the authenticated user in Supabase.
 * @param seasonId - The ID of the season to update.
 * @param seasonUpdateData - An object containing the fields to update (e.g., { name: string }).
 * @returns A promise that resolves to the updated Season object.
 * @throws Error if user not authenticated, validation fails, season not found, or update fails.
 */
export const updateSeason = async (seasonId: string, seasonUpdateData: Partial<Omit<Season, 'id'>>): Promise<Season> => {
  const internalSupabaseUserId = await authProvider.getAuthenticatedSupabaseUserId();
  if (!internalSupabaseUserId) {
    throw new Error("User not authenticated. Please log in to update a season.");
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

  return updateSeasonInSupabase(internalSupabaseUserId, seasonId, updateData );
};

/**
 * Deletes a season for the authenticated user from Supabase by its ID.
 * @param seasonId - The ID of the season to delete.
 * @returns A promise that resolves to true if successful.
 * @throws Error if user not authenticated, season ID not provided, or delete fails.
 */
export const deleteSeason = async (seasonId: string): Promise<boolean> => {
  const internalSupabaseUserId = await authProvider.getAuthenticatedSupabaseUserId();
  if (!internalSupabaseUserId) {
    throw new Error("User not authenticated. Please log in to delete a season.");
  }
  if (!seasonId) {
    throw new Error("Season ID is required for deletion.");
  }
  return deleteSeasonFromSupabase(internalSupabaseUserId, seasonId);
};

// Note: The `saveSeasons` function (which overwrote all seasons) is typically not 
// needed with a backend database model where individual CRUD operations are preferred.
// If such functionality is absolutely required, it would need careful implementation
// (e.g., delete all existing user seasons then insert all new ones in a transaction if possible).
// For now, it's omitted as per standard backend interaction patterns. 