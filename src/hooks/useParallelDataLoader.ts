import { useQueries } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';
import { getMasterRoster } from '@/utils/masterRosterManager';
import { getSeasons } from '@/utils/seasons';
import { getTournaments } from '@/utils/tournaments';
import { getSavedGames } from '@/utils/savedGames';
import type { Player, Season, Tournament, SavedGamesCollection } from '@/types';

/**
 * Parallel Data Loading: Load related data simultaneously
 * Implements Phase 2 Smart Caching Strategy
 */

interface UseParallelDataLoaderOptions {
  loadMasterRoster?: boolean;
  loadSeasons?: boolean;
  loadTournaments?: boolean;
  loadSavedGames?: boolean;
}

export interface ParallelDataResult {
  masterRoster: {
    data: Player[] | undefined;
    isLoading: boolean;
    error: Error | null;
  };
  seasons: {
    data: Season[] | undefined;
    isLoading: boolean;
    error: Error | null;
  };
  tournaments: {
    data: Tournament[] | undefined;
    isLoading: boolean;
    error: Error | null;
  };
  savedGames: {
    data: SavedGamesCollection | null | undefined;
    isLoading: boolean;
    error: Error | null;
  };
  allLoading: boolean;
  hasErrors: boolean;
}

/**
 * Hook for loading related data sets in parallel for specific use cases
 */
export function useParallelDataLoader(
  options: UseParallelDataLoaderOptions = {}
): ParallelDataResult {
  const {
    loadMasterRoster = false,
    loadSeasons = false,
    loadTournaments = false,
    loadSavedGames = false,
  } = options;

  const queries = useQueries({
    queries: [
      // Master Roster Query
      {
        queryKey: queryKeys.masterRoster,
        queryFn: getMasterRoster,
        enabled: loadMasterRoster,
        staleTime: 2 * 60 * 1000, // 2 minutes - semi-static
        gcTime: 15 * 60 * 1000, // 15 minutes
        refetchOnMount: false,
      },
      // Seasons Query
      {
        queryKey: queryKeys.seasons,
        queryFn: async () => {
          try {
            return await getSeasons();
          } catch (error) {
            console.error('[useParallelDataLoader] Season fetch error:', error);
            return [];
          }
        },
        enabled: loadSeasons,
        staleTime: 5 * 60 * 1000, // 5 minutes - relatively static
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error.message?.includes('Transform') || error.message?.includes('parse')) {
            return false;
          }
          return failureCount < 2;
        },
      },
      // Tournaments Query
      {
        queryKey: queryKeys.tournaments,
        queryFn: async () => {
          try {
            return await getTournaments();
          } catch (error) {
            console.error('[useParallelDataLoader] Tournament fetch error:', error);
            return [];
          }
        },
        enabled: loadTournaments,
        staleTime: 5 * 60 * 1000, // 5 minutes - relatively static
        gcTime: 30 * 60 * 1000, // 30 minutes
        refetchOnMount: false,
        refetchOnWindowFocus: false,
        retry: (failureCount, error) => {
          if (error.message?.includes('Transform') || error.message?.includes('parse')) {
            return false;
          }
          return failureCount < 2;
        },
      },
      // Saved Games Query
      {
        queryKey: queryKeys.savedGames,
        queryFn: getSavedGames,
        enabled: loadSavedGames,
        staleTime: 30 * 1000, // 30 seconds - more dynamic
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: true,
        refetchInterval: 2 * 60 * 1000, // Background refresh every 2 minutes
        refetchIntervalInBackground: false,
      },
    ],
  });

  const [masterRosterQuery, seasonsQuery, tournamentsQuery, savedGamesQuery] = queries;

  const allLoading = queries.some((query) => query.isLoading);
  const hasErrors = queries.some((query) => query.error !== null);

  return {
    masterRoster: {
      data: masterRosterQuery.data as Player[] | undefined,
      isLoading: masterRosterQuery.isLoading,
      error: masterRosterQuery.error,
    },
    seasons: {
      data: seasonsQuery.data as Season[] | undefined,
      isLoading: seasonsQuery.isLoading,
      error: seasonsQuery.error,
    },
    tournaments: {
      data: tournamentsQuery.data as Tournament[] | undefined,
      isLoading: tournamentsQuery.isLoading,
      error: tournamentsQuery.error,
    },
    savedGames: {
      data: savedGamesQuery.data as SavedGamesCollection | null | undefined,
      isLoading: savedGamesQuery.isLoading,
      error: savedGamesQuery.error,
    },
    allLoading,
    hasErrors,
  };
}

/**
 * Specific hooks for common use cases
 */

/**
 * Load all data needed for game creation
 */
export function useGameCreationData() {
  return useParallelDataLoader({
    loadMasterRoster: true,
    loadSeasons: true,
    loadTournaments: true,
  });
}

/**
 * Load all data needed for game loading
 */
export function useGameLoadingData() {
  return useParallelDataLoader({
    loadSavedGames: true,
  });
}

/**
 * Load all data needed for roster management
 */
export function useRosterManagementData() {
  return useParallelDataLoader({
    loadMasterRoster: true,
  });
}

/**
 * Load all data needed for the main app initialization
 */
export function useAppInitializationData() {
  return useParallelDataLoader({
    loadMasterRoster: true,
    loadSeasons: true,
    loadTournaments: true,
    loadSavedGames: true,
  });
}