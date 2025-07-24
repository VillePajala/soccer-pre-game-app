import type { Season } from '@/types'; // Import Season type from shared types
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import logger from '@/utils/logger';

// Define the Season type (consider moving to a shared types file if not already there)
// export interface Season { // Remove local definition
//   id: string;
//   name: string;
//   // Add any other relevant season properties, e.g., startDate, endDate
// }

/**
 * Retrieves all seasons using the storage abstraction layer.
 * @returns A promise that resolves to an array of Season objects.
 */
export const getSeasons = async (): Promise<Season[]> => {
  try {
    const seasons = await storageManager.getSeasons();
    return seasons.map(s => ({ ...s, ageGroup: s.ageGroup ?? undefined }));
  } catch (error) {
    logger.error('[getSeasons] Error reading seasons:', error);
    return []; // Return empty array on error
  }
};

/**
 * Saves a single season using the storage abstraction layer.
 * @param season - The Season object to save.
 * @returns A promise that resolves to the saved Season object.
 */
export const saveSeason = async (season: Season): Promise<Season> => {
  try {
    return await storageManager.saveSeason(season);
  } catch (error) {
    logger.error('[saveSeason] Error saving season:', error);
    throw error;
  }
};

/**
 * Adds a new season using the storage abstraction layer.
 * @param newSeasonName - The name of the new season.
 * @param extra - Optional additional fields for the season.
 * @returns A promise that resolves to the newly created Season object, or null if validation/save fails.
 */
export const addSeason = async (newSeasonName: string, extra: Partial<Season> = {}): Promise<Season | null> => {
  const trimmedName = newSeasonName.trim();
  if (!trimmedName) {
    logger.error('[addSeason] Validation failed: Season name cannot be empty.');
    return null;
  }

  try {
    const currentSeasons = await getSeasons();
    if (currentSeasons.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
      logger.error(`[addSeason] Validation failed: A season with name "${trimmedName}" already exists.`);
      return null;
    }
    const newSeason: Season = {
      id: `season_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: trimmedName,
      ...extra,
    };
    
    const savedSeason = await saveSeason(newSeason);
    return savedSeason;
  } catch (error) {
    logger.error('[addSeason] Unexpected error adding season:', error);
    return null;
  }
};

/**
 * Updates an existing season using the storage abstraction layer.
 * @param seasonId - The ID of the season to update.
 * @param updates - Partial Season object with updated details.
 * @returns A promise that resolves to the updated Season object, or null if not found or save fails.
 */
export const updateSeason = async (seasonId: string, updates: Partial<Season>): Promise<Season | null> => {
  if (!seasonId || !updates) {
    logger.error('[updateSeason] Invalid parameters provided for update.');
    return null;
  }

  try {
    // Validate name if provided
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        logger.error('[updateSeason] Season name cannot be empty.');
        return null;
      }
      
      const currentSeasons = await getSeasons();
      if (currentSeasons.some(s => s.id !== seasonId && s.name.toLowerCase() === trimmedName.toLowerCase())) {
        logger.error(`[updateSeason] Validation failed: Another season with name "${trimmedName}" already exists.`);
        return null;
      }
      updates.name = trimmedName;
    }

    const updatedSeason = await storageManager.updateSeason(seasonId, updates);
    return updatedSeason;
  } catch (error) {
    logger.error('[updateSeason] Unexpected error updating season:', error);
    return null;
  }
};

/**
 * Deletes a season using the storage abstraction layer.
 * @param seasonId - The ID of the season to delete.
 * @returns A promise that resolves to true if successful, false if not found or error occurs.
 */
export const deleteSeason = async (seasonId: string): Promise<boolean> => {
  if (!seasonId) {
     logger.error('[deleteSeason] Invalid season ID provided.');
     return false;
  }
  try {
    await storageManager.deleteSeason(seasonId);
    return true;
  } catch (error) {
    logger.error('[deleteSeason] Unexpected error deleting season:', error);
    return false;
  }
};

// Backward compatibility function for old updateSeason signature
export const updateSeasonLegacy = async (updatedSeasonData: Season): Promise<Season | null> => {
  if (!updatedSeasonData || !updatedSeasonData.id) {
    logger.error('[updateSeasonLegacy] Invalid season data provided for update.');
    return null;
  }
  
  const { id, ...updates } = updatedSeasonData;
  return updateSeason(id, updates);
};