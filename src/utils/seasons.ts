import { SEASONS_LIST_KEY } from '@/config/storageKeys';
import type { Season } from '@/types'; // Import Season type from shared types
import logger from '@/utils/logger';

// Define the Season type (consider moving to a shared types file if not already there)
// export interface Season { // Remove local definition
//   id: string;
//   name: string;
//   // Add any other relevant season properties, e.g., startDate, endDate
// }

/**
 * Retrieves all seasons from localStorage.
 * @returns A promise that resolves to an array of Season objects.
 */
export const getSeasons = async (): Promise<Season[]> => {
  try {
    const seasonsJson = localStorage.getItem(SEASONS_LIST_KEY);
    if (!seasonsJson) {
      return Promise.resolve([]);
    }
    const seasons = JSON.parse(seasonsJson) as Season[];
    return Promise.resolve(seasons.map(s => ({ ...s, ageGroup: s.ageGroup ?? undefined })));
  } catch (error) {
    logger.error('[getSeasons] Error reading seasons from localStorage:', error);
    return Promise.resolve([]); // Resolve with empty array on error
  }
};

/**
 * Saves an array of seasons to localStorage, overwriting any existing seasons.
 * @param seasons - The array of Season objects to save.
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export const saveSeasons = async (seasons: Season[]): Promise<boolean> => {
  try {
    localStorage.setItem(SEASONS_LIST_KEY, JSON.stringify(seasons));
    return Promise.resolve(true);
  } catch (error) {
    logger.error('[saveSeasons] Error saving seasons to localStorage:', error);
    return Promise.resolve(false);
  }
};

/**
 * Adds a new season to the list of seasons in localStorage.
 * @param newSeasonName - The name of the new season.
 * @param extra - Optional additional fields for the season.
 * @returns A promise that resolves to the newly created Season object, or null if validation/save fails.
 */
export const addSeason = async (newSeasonName: string, extra: Partial<Season> = {}): Promise<Season | null> => {
  const trimmedName = newSeasonName.trim();
  if (!trimmedName) {
    logger.error('[addSeason] Validation failed: Season name cannot be empty.');
    return Promise.resolve(null);
  }

  try {
    const currentSeasons = await getSeasons();
    if (currentSeasons.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
      logger.error(`[addSeason] Validation failed: A season with name "${trimmedName}" already exists.`);
      return Promise.resolve(null);
    }
    const newSeason: Season = {
      id: `season_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: trimmedName,
      ...extra,
    };
    const updatedSeasons = [...currentSeasons, newSeason];
    const success = await saveSeasons(updatedSeasons);

    if (!success) {
      return Promise.resolve(null);
    }
    return Promise.resolve(newSeason);
  } catch (error) {
    logger.error('[addSeason] Unexpected error adding season:', error);
    return Promise.resolve(null);
  }
};

/**
 * Updates an existing season in localStorage.
 * @param updatedSeason - The Season object with updated details.
 * @returns A promise that resolves to the updated Season object, or null if not found or save fails.
 */
export const updateSeason = async (updatedSeasonData: Season): Promise<Season | null> => {
  if (!updatedSeasonData || !updatedSeasonData.id || !updatedSeasonData.name?.trim()) {
    logger.error('[updateSeason] Invalid season data provided for update.');
    return Promise.resolve(null);
  }
  const trimmedName = updatedSeasonData.name.trim();

  try {
    const currentSeasons = await getSeasons();
    const seasonIndex = currentSeasons.findIndex(s => s.id === updatedSeasonData.id);

    if (seasonIndex === -1) {
      logger.error(`[updateSeason] Season with ID ${updatedSeasonData.id} not found.`);
      return Promise.resolve(null);
    }

    if (currentSeasons.some(s => s.id !== updatedSeasonData.id && s.name.toLowerCase() === trimmedName.toLowerCase())) {
      logger.error(`[updateSeason] Validation failed: Another season with name "${trimmedName}" already exists.`);
      return Promise.resolve(null);
    }

    const seasonsToUpdate = [...currentSeasons];
    seasonsToUpdate[seasonIndex] = { ...updatedSeasonData, name: trimmedName }; 

    const success = await saveSeasons(seasonsToUpdate);

    if (!success) {
      return Promise.resolve(null);
    }
    return Promise.resolve(seasonsToUpdate[seasonIndex]);
  } catch (error) {
    logger.error('[updateSeason] Unexpected error updating season:', error);
    return Promise.resolve(null);
  }
};

/**
 * Deletes a season from localStorage by its ID.
 * @param seasonId - The ID of the season to delete.
 * @returns A promise that resolves to true if successful, false if not found or error occurs.
 */
export const deleteSeason = async (seasonId: string): Promise<boolean> => {
  if (!seasonId) {
     logger.error('[deleteSeason] Invalid season ID provided.');
     return Promise.resolve(false);
  }
  try {
    const currentSeasons = await getSeasons();
    const updatedSeasons = currentSeasons.filter(s => s.id !== seasonId);

    if (updatedSeasons.length === currentSeasons.length) {
      logger.error(`[deleteSeason] Season with id ${seasonId} not found.`);
      return Promise.resolve(false);
    }

    const success = await saveSeasons(updatedSeasons);
    return Promise.resolve(success);
  } catch (error) {
    logger.error('[deleteSeason] Unexpected error deleting season:', error);
    return Promise.resolve(false);
  }
}; 