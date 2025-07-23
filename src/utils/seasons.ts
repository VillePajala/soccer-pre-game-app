import type { Season } from '@/types'; // Import Season type from shared types
import { storageManager } from '@/lib/storage';
import logger from '@/utils/logger';
import { SEASONS_LIST_KEY } from '@/config/storageKeys';
import { getLocalStorageItem, setLocalStorageItem } from './localStorage';

// Helper to detect when local provider is calling these utils to avoid recursion
const usingLocalProvider = () =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__USE_DIRECT_STORAGE__ === true ||
  storageManager.getCurrentProviderName() === 'localStorage';

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
  if (usingLocalProvider()) {
    try {
      const json = getLocalStorageItem(SEASONS_LIST_KEY);
      if (!json) return [];
      return JSON.parse(json) as Season[];
    } catch (error) {
      logger.error('[getSeasons] Error reading seasons from localStorage:', error);
      return [];
    }
  }
  try {
    const seasons = await storageManager.getSeasons();
    return seasons.map(s => ({ ...s, ageGroup: s.ageGroup ?? undefined }));
  } catch (error) {
    logger.error('[getSeasons] Error reading seasons:', error);
    return [];
  }
};

/**
 * Saves a single season using the storage abstraction layer.
 * @param season - The Season object to save.
 * @returns A promise that resolves to the saved Season object.
 */
export const saveSeason = async (season: Season): Promise<Season> => {
  if (usingLocalProvider()) {
    try {
      const seasons = await getSeasons();
      let saved = season;
      if (season.id) {
        const idx = seasons.findIndex(s => s.id === season.id);
        if (idx >= 0) {
          seasons[idx] = { ...seasons[idx], ...season };
          saved = seasons[idx];
        } else {
          seasons.push(season);
        }
      } else {
        saved = { ...season, id: `season_${Date.now()}_${Math.random().toString(36).substring(2, 9)}` };
        seasons.push(saved);
      }
      setLocalStorageItem(SEASONS_LIST_KEY, JSON.stringify(seasons));
      return saved;
    } catch (error) {
      logger.error('[saveSeason] Error saving season to localStorage:', error);
      throw error;
    }
  }
  try {
    return await storageManager.saveSeason(season);
  } catch (error) {
    logger.error('[saveSeason] Error saving season:', error);
    throw error;
  }
};

/**
 * Saves an array of seasons, replacing existing ones when using localStorage.
 */
export const saveSeasons = async (seasons: Season[]): Promise<boolean> => {
  if (usingLocalProvider()) {
    try {
      setLocalStorageItem(SEASONS_LIST_KEY, JSON.stringify(seasons));
      return true;
    } catch (error) {
      logger.error('[saveSeasons] Error saving seasons to localStorage:', error);
      return false;
    }
  }
  try {
    for (const season of seasons) {
      await saveSeason(season);
    }
    return true;
  } catch (error) {
    logger.error('[saveSeasons] Error saving seasons:', error);
    return false;
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
    if (usingLocalProvider()) {
      const seasons = await getSeasons();
      const idx = seasons.findIndex(s => s.id === seasonId);
      if (idx === -1) {
        logger.error(`[updateSeason] Season with ID ${seasonId} not found.`);
        return null;
      }
      const updated = { ...seasons[idx], ...updates } as Season;
      seasons[idx] = updated;
      setLocalStorageItem(SEASONS_LIST_KEY, JSON.stringify(seasons));
      return updated;
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
    if (usingLocalProvider()) {
      const seasons = await getSeasons();
      const updated = seasons.filter(s => s.id !== seasonId);
      if (updated.length === seasons.length) {
        logger.error(`[deleteSeason] Season with id ${seasonId} not found.`);
        return false;
      }
      setLocalStorageItem(SEASONS_LIST_KEY, JSON.stringify(updated));
      return true;
    }
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

export {};