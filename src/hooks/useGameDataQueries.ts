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

  const masterRoster = useQuery<Player[], Error>({
    queryKey: queryKeys.masterRoster,
    queryFn: getMasterRoster,
    staleTime: 5000, // 5 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const seasons = useQuery<Season[], Error>({
    queryKey: queryKeys.seasons,
    queryFn: getSeasons,
    staleTime: 5000, // 5 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const tournaments = useQuery<Tournament[], Error>({
    queryKey: queryKeys.tournaments,
    queryFn: getTournaments,
    staleTime: 5000, // 5 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const savedGames = useQuery<SavedGamesCollection | null, Error>({
    queryKey: queryKeys.savedGames,
    queryFn: getSavedGames,
    staleTime: 5000, // 5 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
  });

  const currentGameId = useQuery<string | null, Error>({
    queryKey: queryKeys.appSettingsCurrentGameId,
    queryFn: getCurrentGameIdSetting,
    staleTime: 5000, // 5 seconds
    gcTime: 10 * 60 * 1000, // 10 minutes
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
