import { TOURNAMENTS_LIST_KEY } from '@/config/constants';
import type { Tournament } from '@/types'; // Import Tournament type from shared types

// Define the Tournament type (consider moving to a shared types file)
// export interface Tournament { // Remove local definition
//   id: string;
//   name: string;
//   // Add any other relevant tournament properties, e.g., date, location
// }

/**
 * Retrieves all tournaments from localStorage.
 * @returns An array of Tournament objects.
 */
export const getTournaments = (): Tournament[] => {
  try {
    const tournamentsJson = localStorage.getItem(TOURNAMENTS_LIST_KEY);
    // Ensure null/undefined check before parsing
    if (!tournamentsJson) {
      return [];
    }
    return JSON.parse(tournamentsJson) as Tournament[];
  } catch (error) {
    console.error('[getTournaments] Error getting tournaments from localStorage:', error);
    return [];
  }
};

/**
 * Saves an array of tournaments to localStorage, overwriting any existing tournaments.
 * @param tournaments - The array of Tournament objects to save.
 * @returns {boolean} True if successful, false otherwise.
 */
export const saveTournaments = (tournaments: Tournament[]): boolean => {
  try {
    localStorage.setItem(TOURNAMENTS_LIST_KEY, JSON.stringify(tournaments));
    return true;
  } catch (error) {
    console.error('[saveTournaments] Error saving tournaments to localStorage:', error);
    return false;
  }
};

/**
 * Adds a new tournament to the list of tournaments in localStorage.
 * @param newTournamentName - The name of the new tournament.
 * @returns The newly created Tournament object, or null if validation/save fails.
 */
export const addTournament = (newTournamentName: string): Tournament | null => {
  const trimmedName = newTournamentName.trim();
  if (!trimmedName) {
    console.error('[addTournament] Validation failed: Tournament name cannot be empty.');
    return null;
  }

  try {
    const currentTournaments = getTournaments();
    if (currentTournaments.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
      console.error(`[addTournament] Validation failed: A tournament with name "${trimmedName}" already exists.`);
      return null;
    }
    const newTournament: Tournament = {
      id: `tournament_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: trimmedName,
    };
    const updatedTournaments = [...currentTournaments, newTournament];
    const success = saveTournaments(updatedTournaments);

    if (!success) {
      return null;
    }

    return newTournament;
  } catch (error) {
    console.error('[addTournament] Unexpected error adding tournament:', error);
    return null;
  }
};

/**
 * Updates an existing tournament in localStorage.
 * @param updatedTournament - The Tournament object with updated details.
 * @returns The updated Tournament object, or null if not found or save fails.
 */
export const updateTournament = (updatedTournament: Tournament): Tournament | null => {
  if (!updatedTournament || !updatedTournament.id || !updatedTournament.name?.trim()) {
    console.error('[updateTournament] Invalid tournament data provided for update.');
    return null;
  }
  const trimmedName = updatedTournament.name.trim();

  try {
    const currentTournaments = getTournaments();
    const tournamentIndex = currentTournaments.findIndex(t => t.id === updatedTournament.id);

    if (tournamentIndex === -1) {
      console.error(`[updateTournament] Tournament with ID ${updatedTournament.id} not found.`);
      return null;
    }

    if (currentTournaments.some(t => t.id !== updatedTournament.id && t.name.toLowerCase() === trimmedName.toLowerCase())) {
      console.error(`[updateTournament] Validation failed: Another tournament with name "${trimmedName}" already exists.`);
      return null;
    }

    const updatedTournaments = [...currentTournaments];
    updatedTournaments[tournamentIndex] = { ...updatedTournament, name: trimmedName };

    const success = saveTournaments(updatedTournaments);

    if (!success) {
      return null;
    }

    return updatedTournaments[tournamentIndex];
  } catch (error) {
    console.error('[updateTournament] Unexpected error updating tournament:', error);
    return null;
  }
};

/**
 * Deletes a tournament from localStorage by its ID.
 * @param tournamentId - The ID of the tournament to delete.
 * @returns {boolean} True if successful, false if not found or error occurs.
 */
export const deleteTournament = (tournamentId: string): boolean => {
  if (!tournamentId) {
    console.error('[deleteTournament] Invalid tournament ID provided.');
    return false;
  }
  try {
    const currentTournaments = getTournaments();
    const updatedTournaments = currentTournaments.filter(t => t.id !== tournamentId);

    if (updatedTournaments.length === currentTournaments.length) {
      console.error(`[deleteTournament] Tournament with id ${tournamentId} not found.`);
      return false;
    }

    const success = saveTournaments(updatedTournaments);
    return success;

  } catch (error) {
    console.error('[deleteTournament] Unexpected error deleting tournament:', error);
    return false;
  }
}; 