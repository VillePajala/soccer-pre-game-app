import { useQuery } from '@tanstack/react-query';
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
  const masterRoster = useQuery<Player[], Error>({
    queryKey: queryKeys.masterRoster,
    queryFn: getMasterRoster,
  });

  const seasons = useQuery<Season[], Error>({
    queryKey: queryKeys.seasons,
    queryFn: getSeasons,
  });

  const tournaments = useQuery<Tournament[], Error>({
    queryKey: queryKeys.tournaments,
    queryFn: getTournaments,
  });

  const savedGames = useQuery<SavedGamesCollection | null, Error>({
    queryKey: queryKeys.savedGames,
    queryFn: getSavedGames,
    initialData: {},
  });

  const currentGameId = useQuery<string | null, Error>({
    queryKey: queryKeys.appSettingsCurrentGameId,
    queryFn: getCurrentGameIdSetting,
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
    masterRoster: masterRoster.data || [],
    seasons: seasons.data || [],
    tournaments: tournaments.data || [],
    savedGames: savedGames.data || null,
    currentGameId: currentGameId.data || null,
    loading,
    error,
  };
}
