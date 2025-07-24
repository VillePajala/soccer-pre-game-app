import { useMemo } from 'react';
import type { Player, Season, Tournament, SavedGamesCollection } from '@/types';

/**
 * Hook that provides stable default values for empty arrays and objects
 * to prevent infinite re-renders in React components
 */
export function useStableDefaults() {
  const emptyPlayers = useMemo<Player[]>(() => [], []);
  const emptySeasons = useMemo<Season[]>(() => [], []);
  const emptyTournaments = useMemo<Tournament[]>(() => [], []);
  const emptySavedGames = useMemo<SavedGamesCollection>(() => ({}), []);
  
  return {
    emptyPlayers,
    emptySeasons,
    emptyTournaments,
    emptySavedGames,
  };
}