import { SEASONS_LIST_KEY } from '@/config/constants';
import type { Season } from '../app/page'; // Import Season type

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
  // Placeholder implementation
  try {
    const seasonsJson = localStorage.getItem(SEASONS_LIST_KEY);
    return seasonsJson ? JSON.parse(seasonsJson) : [];
  } catch (error) {
    console.error('Error getting seasons from localStorage:', error);
    return []; // Return empty array on error
  }
};

/**
 * Saves an array of seasons to localStorage, overwriting any existing seasons.
 * @param seasons - The array of Season objects to save.
 */
export const saveSeasons = (seasons: Season[]): void => {
  // Placeholder implementation
  try {
    localStorage.setItem(SEASONS_LIST_KEY, JSON.stringify(seasons));
  } catch (error) {
    console.error('Error saving seasons to localStorage:', error);
    // Handle potential errors, e.g., localStorage quota exceeded
  }
};

/**
 * Adds a new season to the list of seasons in localStorage.
 * @param newSeasonName - The name of the new season.
 * @returns The updated array of Season objects.
 * @throws Error if season name is empty or a season with the same name already exists.
 */
export const addSeason = (newSeasonName: string): Season[] => {
  // Placeholder implementation
  if (!newSeasonName.trim()) {
    throw new Error('Season name cannot be empty.');
  }
  const currentSeasons = getSeasons();
  if (currentSeasons.some(s => s.name.toLowerCase() === newSeasonName.trim().toLowerCase())) {
    throw new Error('A season with this name already exists.');
  }
  const newSeason: Season = {
    id: `season_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: newSeasonName.trim(),
  };
  const updatedSeasons = [...currentSeasons, newSeason];
  saveSeasons(updatedSeasons);
  return updatedSeasons;
};

/**
 * Updates an existing season in localStorage.
 * @param updatedSeason - The Season object with updated details.
 * @returns The updated array of Season objects.
 * @throws Error if the season to update is not found.
 */
export const updateSeason = (updatedSeason: Season): Season[] => {
  // Placeholder implementation
  const currentSeasons = getSeasons();
  const seasonIndex = currentSeasons.findIndex(s => s.id === updatedSeason.id);
  if (seasonIndex === -1) {
    throw new Error('Season not found for update.');
  }
  const updatedSeasons = [...currentSeasons];
  updatedSeasons[seasonIndex] = updatedSeason;
  saveSeasons(updatedSeasons);
  return updatedSeasons;
};

/**
 * Deletes a season from localStorage by its ID.
 * @param seasonId - The ID of the season to delete.
 * @returns The updated array of Season objects.
 */
export const deleteSeason = (seasonId: string): Season[] => {
  // Placeholder implementation
  const currentSeasons = getSeasons();
  const updatedSeasons = currentSeasons.filter(s => s.id !== seasonId);
  if (updatedSeasons.length === currentSeasons.length) {
    // Optional: throw an error or return a specific status if seasonId was not found
    console.warn(`Season with id ${seasonId} not found for deletion.`);
  }
  saveSeasons(updatedSeasons);
  return updatedSeasons;
}; 