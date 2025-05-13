import { SEASONS_LIST_KEY } from '@/config/constants';
import type { Season } from '@/types'; // Import Season type from shared types

// Define the Season type (consider moving to a shared types file if not already there)
// export interface Season { // Remove local definition
//   id: string;
//   name: string;
//   // Add any other relevant season properties, e.g., startDate, endDate
// }

/**
 * Retrieves all seasons from localStorage.
 * @returns An array of Season objects.
 */
export const getSeasons = (): Season[] => {
  try {
    const seasonsJson = localStorage.getItem(SEASONS_LIST_KEY);
    // Ensure null/undefined check before parsing
    if (!seasonsJson) {
      return [];
    }
    return JSON.parse(seasonsJson) as Season[]; // Assume valid structure or let catch handle
  } catch (error) {
    console.error('[getSeasons] Error reading seasons from localStorage:', error);
    return []; // Return empty array on error
  }
};

/**
 * Saves an array of seasons to localStorage, overwriting any existing seasons.
 * @param seasons - The array of Season objects to save.
 * @returns {boolean} True if successful, false otherwise.
 */
export const saveSeasons = (seasons: Season[]): boolean => {
  try {
    localStorage.setItem(SEASONS_LIST_KEY, JSON.stringify(seasons));
    return true;
  } catch (error) {
    console.error('[saveSeasons] Error saving seasons to localStorage:', error);
    // Handle potential errors, e.g., localStorage quota exceeded
    return false;
  }
};

/**
 * Adds a new season to the list of seasons in localStorage.
 * @param newSeasonName - The name of the new season.
 * @returns The newly created Season object, or null if validation/save fails.
 */
export const addSeason = (newSeasonName: string): Season | null => {
  const trimmedName = newSeasonName.trim();
  if (!trimmedName) {
    console.error('[addSeason] Validation failed: Season name cannot be empty.');
    // throw new Error('Season name cannot be empty.'); // Replaced throw
    return null;
  }

  try {
    const currentSeasons = getSeasons(); // getSeasons handles its own errors
    if (currentSeasons.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
      console.error(`[addSeason] Validation failed: A season with name "${trimmedName}" already exists.`);
      // throw new Error('A season with this name already exists.'); // Replaced throw
      return null;
    }
    const newSeason: Season = {
      id: `season_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: trimmedName,
    };
    const updatedSeasons = [...currentSeasons, newSeason];
    const success = saveSeasons(updatedSeasons); // saveSeasons handles its own errors

    if (!success) {
      // Error already logged by saveSeasons
      return null;
    }

    return newSeason; // Return the new season object on success
  } catch (error) {
    // Catch unexpected errors during the add process itself (less likely now)
    console.error('[addSeason] Unexpected error adding season:', error);
    return null;
  }
};

/**
 * Updates an existing season in localStorage.
 * @param updatedSeason - The Season object with updated details.
 * @returns The updated Season object, or null if not found or save fails.
 */
export const updateSeason = (updatedSeason: Season): Season | null => {
  if (!updatedSeason || !updatedSeason.id || !updatedSeason.name?.trim()) {
    console.error('[updateSeason] Invalid season data provided for update.');
    return null;
  }
  const trimmedName = updatedSeason.name.trim();

  try {
    const currentSeasons = getSeasons();
    const seasonIndex = currentSeasons.findIndex(s => s.id === updatedSeason.id);

    if (seasonIndex === -1) {
      console.error(`[updateSeason] Season with ID ${updatedSeason.id} not found.`);
      // throw new Error('Season not found for update.'); // Replaced throw
      return null;
    }

    // Check for name conflict (only if name changed and conflicts with *another* season)
    if (currentSeasons.some(s => s.id !== updatedSeason.id && s.name.toLowerCase() === trimmedName.toLowerCase())) {
      console.error(`[updateSeason] Validation failed: Another season with name "${trimmedName}" already exists.`);
      return null;
    }

    const updatedSeasons = [...currentSeasons];
    // Ensure we only update the name if it changed to the trimmed version
    updatedSeasons[seasonIndex] = { ...updatedSeason, name: trimmedName }; 

    const success = saveSeasons(updatedSeasons);

    if (!success) {
      // Error already logged by saveSeasons
      return null;
    }

    return updatedSeasons[seasonIndex]; // Return the updated season object
  } catch (error) {
    // Catch unexpected errors during the update process
    console.error('[updateSeason] Unexpected error updating season:', error);
    return null;
  }
};

/**
 * Deletes a season from localStorage by its ID.
 * @param seasonId - The ID of the season to delete.
 * @returns {boolean} True if successful, false if not found or error occurs.
 */
export const deleteSeason = (seasonId: string): boolean => {
  if (!seasonId) {
     console.error('[deleteSeason] Invalid season ID provided.');
     return false;
  }
  try {
    const currentSeasons = getSeasons();
    const updatedSeasons = currentSeasons.filter(s => s.id !== seasonId);

    if (updatedSeasons.length === currentSeasons.length) {
      // Log error if seasonId was not found
      console.error(`[deleteSeason] Season with id ${seasonId} not found.`);
      return false; // Indicate failure: Not found
    }

    const success = saveSeasons(updatedSeasons);
    return success; // Return success status from saveSeasons

  } catch (error) {
    // Catch unexpected errors during the delete process
    console.error('[deleteSeason] Unexpected error deleting season:', error);
    return false;
  }
}; 