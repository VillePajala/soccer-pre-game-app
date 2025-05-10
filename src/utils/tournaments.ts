import { TOURNAMENTS_LIST_KEY } from '@/config/constants';
import type { Tournament } from '../app/page'; // Import Tournament type

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
    return tournamentsJson ? JSON.parse(tournamentsJson) : [];
  } catch (error) {
    console.error('Error getting tournaments from localStorage:', error);
    return [];
  }
};

/**
 * Saves an array of tournaments to localStorage, overwriting any existing tournaments.
 * @param tournaments - The array of Tournament objects to save.
 */
export const saveTournaments = (tournaments: Tournament[]): void => {
  try {
    localStorage.setItem(TOURNAMENTS_LIST_KEY, JSON.stringify(tournaments));
  } catch (error) {
    console.error('Error saving tournaments to localStorage:', error);
  }
};

/**
 * Adds a new tournament to the list of tournaments in localStorage.
 * @param newTournamentName - The name of the new tournament.
 * @returns The updated array of Tournament objects.
 * @throws Error if tournament name is empty or a tournament with the same name already exists.
 */
export const addTournament = (newTournamentName: string): Tournament[] => {
  if (!newTournamentName.trim()) {
    throw new Error('Tournament name cannot be empty.');
  }
  const currentTournaments = getTournaments();
  if (currentTournaments.some(t => t.name.toLowerCase() === newTournamentName.trim().toLowerCase())) {
    throw new Error('A tournament with this name already exists.');
  }
  const newTournament: Tournament = {
    id: `tournament_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    name: newTournamentName.trim(),
  };
  const updatedTournaments = [...currentTournaments, newTournament];
  saveTournaments(updatedTournaments);
  return updatedTournaments;
};

/**
 * Updates an existing tournament in localStorage.
 * @param updatedTournament - The Tournament object with updated details.
 * @returns The updated array of Tournament objects.
 * @throws Error if the tournament to update is not found.
 */
export const updateTournament = (updatedTournament: Tournament): Tournament[] => {
  const currentTournaments = getTournaments();
  const tournamentIndex = currentTournaments.findIndex(t => t.id === updatedTournament.id);
  if (tournamentIndex === -1) {
    throw new Error('Tournament not found for update.');
  }
  const updatedTournaments = [...currentTournaments];
  updatedTournaments[tournamentIndex] = updatedTournament;
  saveTournaments(updatedTournaments);
  return updatedTournaments;
};

/**
 * Deletes a tournament from localStorage by its ID.
 * @param tournamentId - The ID of the tournament to delete.
 * @returns The updated array of Tournament objects.
 */
export const deleteTournament = (tournamentId: string): Tournament[] => {
  const currentTournaments = getTournaments();
  const updatedTournaments = currentTournaments.filter(t => t.id !== tournamentId);
  if (updatedTournaments.length === currentTournaments.length) {
    console.warn(`Tournament with id ${tournamentId} not found for deletion.`);
  }
  saveTournaments(updatedTournaments);
  return updatedTournaments;
}; 