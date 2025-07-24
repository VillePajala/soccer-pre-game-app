import type { Tournament } from '@/types'; // Import Tournament type from shared types
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import logger from '@/utils/logger';

// Define the Tournament type (consider moving to a shared types file)
// export interface Tournament { // Remove local definition
//   id: string;
//   name: string;
//   // Add any other relevant tournament properties, e.g., date, location
// }

/**
 * Retrieves all tournaments using the storage abstraction layer.
 * @returns A promise that resolves to an array of Tournament objects.
 */
export const getTournaments = async (): Promise<Tournament[]> => {
  try {
    const tournaments = await storageManager.getTournaments();
    return tournaments.map(t => ({
      ...t,
      level: t.level ?? undefined,
      ageGroup: t.ageGroup ?? undefined,
    }));
  } catch (error) {
    logger.error('[getTournaments] Error getting tournaments:', error);
    return [];
  }
};

/**
 * Saves a single tournament using the storage abstraction layer.
 * @param tournament - The Tournament object to save.
 * @returns A promise that resolves to the saved Tournament object.
 */
export const saveTournament = async (tournament: Tournament): Promise<Tournament> => {
  try {
    return await storageManager.saveTournament(tournament);
  } catch (error) {
    logger.error('[saveTournament] Error saving tournament:', error);
    throw error;
  }
};

/**
 * Adds a new tournament using the storage abstraction layer.
 * @param newTournamentName - The name of the new tournament.
 * @param extra - Optional additional fields for the tournament.
 * @returns A promise that resolves to the newly created Tournament object, or null if validation/save fails.
 */
export const addTournament = async (newTournamentName: string, extra: Partial<Tournament> = {}): Promise<Tournament | null> => {
  const trimmedName = newTournamentName.trim();
  if (!trimmedName) {
    logger.error('[addTournament] Validation failed: Tournament name cannot be empty.');
    return null;
  }

  try {
    const currentTournaments = await getTournaments();
    if (currentTournaments.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
      logger.error(`[addTournament] Validation failed: A tournament with name "${trimmedName}" already exists.`);
      return null;
    }
    const { level, ageGroup, ...rest } = extra;
    const newTournament: Tournament = {
      id: `tournament_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: trimmedName,
      ...rest,
      ...(level ? { level } : {}),
      ...(ageGroup ? { ageGroup } : {}),
    };
    
    const savedTournament = await saveTournament(newTournament);
    return savedTournament;
  } catch (error) {
    logger.error('[addTournament] Unexpected error adding tournament:', error);
    return null;
  }
};

/**
 * Updates an existing tournament using the storage abstraction layer.
 * @param tournamentId - The ID of the tournament to update.
 * @param updates - Partial Tournament object with updated details.
 * @returns A promise that resolves to the updated Tournament object, or null if not found or save fails.
 */
export const updateTournament = async (tournamentId: string, updates: Partial<Tournament>): Promise<Tournament | null> => {
  if (!tournamentId || !updates) {
    logger.error('[updateTournament] Invalid parameters provided for update.');
    return null;
  }

  try {
    // Validate name if provided
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        logger.error('[updateTournament] Tournament name cannot be empty.');
        return null;
      }
      
      const currentTournaments = await getTournaments();
      if (currentTournaments.some(t => t.id !== tournamentId && t.name.toLowerCase() === trimmedName.toLowerCase())) {
        logger.error(`[updateTournament] Validation failed: Another tournament with name "${trimmedName}" already exists.`);
        return null;
      }
      updates.name = trimmedName;
    }

    const updatedTournament = await storageManager.updateTournament(tournamentId, updates);
    return updatedTournament;
  } catch (error) {
    logger.error('[updateTournament] Unexpected error updating tournament:', error);
    return null;
  }
};

/**
 * Deletes a tournament using the storage abstraction layer.
 * @param tournamentId - The ID of the tournament to delete.
 * @returns A promise that resolves to true if successful, false if not found or error occurs.
 */
export const deleteTournament = async (tournamentId: string): Promise<boolean> => {
  if (!tournamentId) {
    logger.error('[deleteTournament] Invalid tournament ID provided.');
    return false;
  }
  try {
    await storageManager.deleteTournament(tournamentId);
    return true;
  } catch (error) {
    logger.error('[deleteTournament] Unexpected error deleting tournament:', error);
    return false;
  }
};

// Backward compatibility function for old updateTournament signature
export const updateTournamentLegacy = async (updatedTournamentData: Tournament): Promise<Tournament | null> => {
  if (!updatedTournamentData || !updatedTournamentData.id) {
    logger.error('[updateTournamentLegacy] Invalid tournament data provided for update.');
    return null;
  }
  
  const { id, ...updates } = updatedTournamentData;
  return updateTournament(id, updates);
}; 