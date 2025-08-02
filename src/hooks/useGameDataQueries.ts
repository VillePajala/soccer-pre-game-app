import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { queryKeys } from '@/config/queryKeys';
import {
  getMasterRoster,
} from '@/utils/masterRosterManager';
import { getSeasons } from '@/utils/seasons';
import { getTournaments } from '@/utils/tournaments';
import { getSavedGames } from '@/utils/savedGames';
import { getCurrentGameIdSetting } from '@/utils/appSettings';
import type {
  Player,
  Season,
  Tournament,
  SavedGamesCollection,
} from '@/types';

export interface GameDataQueriesResult {
  masterRoster: Player[];
  seasons: Season[];
  tournaments: Tournament[];
  savedGames: SavedGamesCollection | null;
  currentGameId: string | null;
  loading: boolean;
  error: Error | null;
}

export function useGameDataQueries(): GameDataQueriesResult {
  // Stable empty defaults to prevent infinite loops
  const emptyPlayers = useMemo<Player[]>(() => [], []);
  const emptySeasons = useMemo<Season[]>(() => [], []);
  const emptyTournaments = useMemo<Tournament[]>(() => [], []);
  const emptySavedGames = useMemo<SavedGamesCollection>(() => ({}), []);

  // Tiered Cache Configuration: Different strategies for different data types
  
  // Master Roster - Semi-dynamic data (updated when players are added/modified)
  const masterRoster = useQuery<Player[], Error>({
    queryKey: queryKeys.masterRoster,
    queryFn: getMasterRoster,
    staleTime: 2 * 60 * 1000, // 2 minutes - semi-static
    gcTime: 15 * 60 * 1000, // 15 minutes
    refetchOnMount: false, // Don't refetch if data is fresh
  });

  // Seasons - Relatively static data (rarely changes during a session)
  const seasons = useQuery<Season[], Error>({
    queryKey: queryKeys.seasons,
    queryFn: async () => {
      try {
        return await getSeasons();
      } catch (error) {
        console.error('[useGameDataQueries] Season fetch error:', error);
        // Return empty array instead of failing the entire query
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - relatively static
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false, // Don't refetch on window focus for static data
    retry: (failureCount, error) => {
      // Don't retry transform errors
      if (error.message?.includes('Transform') || error.message?.includes('parse')) {
        return false;
      }
      // Retry network errors up to 2 times
      return failureCount < 2;
    },
  });

  // Tournaments - Relatively static data (rarely changes during a session)
  const tournaments = useQuery<Tournament[], Error>({
    queryKey: queryKeys.tournaments,
    queryFn: async () => {
      try {
        return await getTournaments();
      } catch (error) {
        console.error('[useGameDataQueries] Tournament fetch error:', error);
        // Return empty array instead of failing the entire query
        return [];
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes - relatively static
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnMount: false,
    refetchOnWindowFocus: false, // Don't refetch on window focus for static data
    retry: (failureCount, error) => {
      // Don't retry transform errors
      if (error.message?.includes('Transform') || error.message?.includes('parse')) {
        return false;
      }
      // Retry network errors up to 2 times
      return failureCount < 2;
    },
  });

  // Saved Games - More dynamic data (updated when games are saved/loaded)
  const savedGames = useQuery<SavedGamesCollection | null, Error>({
    queryKey: queryKeys.savedGames,
    queryFn: getSavedGames,
    staleTime: 30 * 1000, // 30 seconds - more dynamic
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true, // Refetch when user returns to app
    refetchInterval: 2 * 60 * 1000, // Background refresh every 2 minutes
    refetchIntervalInBackground: false, // Only when app is active
  });

  // Current Game ID - Very dynamic data (changes frequently during gameplay)
  const currentGameId = useQuery<string | null, Error>({
    queryKey: queryKeys.appSettingsCurrentGameId,
    queryFn: getCurrentGameIdSetting,
    staleTime: 10 * 1000, // 10 seconds - very dynamic
    gcTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
    notifyOnChangeProps: ['data'], // Only re-render on data change
  });

  const loading =
    masterRoster.isLoading ||
    seasons.isLoading ||
    tournaments.isLoading ||
    savedGames.isLoading ||
    currentGameId.isLoading;

  const error =
    masterRoster.error ||
    seasons.error ||
    tournaments.error ||
    savedGames.error ||
    currentGameId.error ||
    null;

  return {
    masterRoster: masterRoster.data || emptyPlayers,
    seasons: seasons.data || emptySeasons,
    tournaments: tournaments.data || emptyTournaments,
    savedGames: savedGames.data || emptySavedGames,
    currentGameId: currentGameId.data || null,
    loading,
    error,
  };
}
