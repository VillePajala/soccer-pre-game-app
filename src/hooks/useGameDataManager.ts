import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
// import { useTranslation } from 'react-i18next'; // Removed unused import
import { 
  saveGame as utilSaveGame, 
  deleteGame as utilDeleteGame, 
  getLatestGameId, 
  updateGameDetails as utilUpdateGameDetails 
} from '@/utils/savedGames';
import {
  saveCurrentGameIdSetting as utilSaveCurrentGameIdSetting,
} from '@/utils/appSettings';
import { 
  deleteSeason as utilDeleteSeason, 
  updateSeasonLegacy as utilUpdateSeasonLegacy,
  addSeason as utilAddSeason 
} from '@/utils/seasons';
import { 
  deleteTournament as utilDeleteTournament, 
  updateTournamentLegacy as utilUpdateTournamentLegacy, 
  addTournament as utilAddTournament 
} from '@/utils/tournaments';
import { exportJson, exportCsv } from '@/utils/exportGames';
import { queryKeys } from '@/config/queryKeys';
import { DEFAULT_GAME_ID } from '@/config/constants';
import logger from '@/utils/logger';
import type { 
  Season, 
  Tournament, 
  AppState, 
  SavedGamesCollection,
  Player,
  Opponent,
  TacticalDisc,
  Point
} from '@/types';
import type { GameSessionState } from '@/hooks/useGameSessionReducer';

interface UseGameDataManagerProps {
  currentGameId: string | null;
  savedGames: SavedGamesCollection;
  setSavedGames: (games: SavedGamesCollection | ((prev: SavedGamesCollection) => SavedGamesCollection)) => void;
  setCurrentGameId: (id: string | null) => void;
  gameSessionState: GameSessionState;
  availablePlayers: Player[];
  playersOnField: Player[];
  opponents: Opponent[];
  drawings: Point[][];
  tacticalDiscs: TacticalDisc[];
  tacticalDrawings: Point[][];
  tacticalBallPosition: Point | null;
}

/**
 * Custom hook that manages all data persistence operations for the game application.
 * Handles React Query mutations for seasons, tournaments, games, and provides
 * save/load/export functionality.
 */
export const useGameDataManager = ({
  currentGameId,
  savedGames,
  setSavedGames,
  setCurrentGameId,
  gameSessionState,
  availablePlayers,
  playersOnField,
  opponents,
  drawings,
  tacticalDiscs,
  tacticalDrawings,
  tacticalBallPosition,
}: UseGameDataManagerProps) => {
  const queryClient = useQueryClient();
  // const { t } = useTranslation(); // Removed unused import

  // --- Season Mutations ---
  const addSeasonMutation = useMutation<
    Season | null,
    Error,
    Partial<Season> & { name: string }
  >({
    mutationFn: async (data) => {
      const { name, ...extra } = data;
      return utilAddSeason(name, extra);
    },
    onSuccess: (newSeason, variables) => {
      if (newSeason) {
        logger.log('[useGameDataManager] Season added:', newSeason.name, newSeason.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.seasons });
      } else {
        logger.warn('[useGameDataManager] utilAddSeason returned null for season:', variables.name);
      }
    },
    onError: (error, variables) => {
      logger.error(`[useGameDataManager] Failed to add season ${variables.name}:`, error);
    },
  });

  const updateSeasonMutation = useMutation<Season | null, Error, Season>({
    mutationFn: async (season) => utilUpdateSeasonLegacy(season),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seasons });
    },
    onError: (error) => {
      logger.error('[useGameDataManager] Failed to update season:', error);
    },
  });

  const deleteSeasonMutation = useMutation<boolean, Error, string>({
    mutationFn: async (id) => utilDeleteSeason(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seasons });
    },
    onError: (error) => {
      logger.error('[useGameDataManager] Failed to delete season:', error);
    },
  });

  // --- Tournament Mutations ---
  const addTournamentMutation = useMutation<
    Tournament | null,
    Error,
    Partial<Tournament> & { name: string }
  >({
    mutationFn: async (data) => {
      const { name, ...extra } = data;
      return utilAddTournament(name, extra);
    },
    onSuccess: (newTournament, variables) => {
      if (newTournament) {
        logger.log('[useGameDataManager] Tournament added:', newTournament.name, newTournament.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
      } else {
        logger.warn('[useGameDataManager] utilAddTournament returned null for tournament:', variables.name);
      }
    },
    onError: (error, variables) => {
      logger.error(`[useGameDataManager] Failed to add tournament ${variables.name}:`, error);
    },
  });

  const updateTournamentMutation = useMutation<Tournament | null, Error, Tournament>({
    mutationFn: async (tournament) => utilUpdateTournamentLegacy(tournament),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
    },
    onError: (error) => {
      logger.error('[useGameDataManager] Failed to update tournament:', error);
    },
  });

  const deleteTournamentMutation = useMutation({
    mutationFn: (id: string) => utilDeleteTournament(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
      queryClient.invalidateQueries({ queryKey: queryKeys.savedGames });
    },
    onError: (error) => {
      logger.error('[useGameDataManager] Failed to delete tournament:', error);
    },
  });

  // --- Game Mutations ---
  const updateGameDetailsMutation = useMutation({
    mutationFn: ({ gameId, updates }: { gameId: string, updates: Partial<AppState> }) =>
      utilUpdateGameDetails(gameId, updates),
    onSuccess: (data, variables) => {
      // After a successful update, invalidate the savedGames query to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.savedGames });

      // Optimistically update the query cache
      queryClient.setQueryData(queryKeys.savedGames, (oldData: SavedGamesCollection | undefined) => {
        if (!oldData) return oldData;
        const existing = oldData[variables.gameId];
        return {
          ...oldData,
          [variables.gameId]: { ...existing, ...variables.updates },
        };
      });

      // Keep local state in sync so components using savedGames see the update
      setSavedGames(prev => {
        const existing = prev[variables.gameId];
        return {
          ...prev,
          [variables.gameId]: data ?? { ...existing, ...variables.updates },
        };
      });
    },
    onError: (error) => {
      logger.error('[useGameDataManager] Error updating game details:', error);
    },
  });

  // --- Save/Load Handlers ---
  const handleQuickSaveGame = useCallback(async () => {
    if (currentGameId && currentGameId !== DEFAULT_GAME_ID) {
      logger.log(`[useGameDataManager] Quick saving game with ID: ${currentGameId}`);
      try {
        // 1. Create the current game state snapshot
        const currentSnapshot: AppState = {
          playersOnField: playersOnField,
          opponents: opponents,
          drawings: drawings,
          availablePlayers: availablePlayers,
          showPlayerNames: gameSessionState.showPlayerNames,
          teamName: gameSessionState.teamName,
          gameEvents: gameSessionState.gameEvents,
          opponentName: gameSessionState.opponentName,
          gameDate: gameSessionState.gameDate,
          homeScore: gameSessionState.homeScore,
          awayScore: gameSessionState.awayScore,
          gameNotes: gameSessionState.gameNotes,
          homeOrAway: gameSessionState.homeOrAway,
          numberOfPeriods: gameSessionState.numberOfPeriods,
          periodDurationMinutes: gameSessionState.periodDurationMinutes,
          currentPeriod: gameSessionState.currentPeriod,
          gameStatus: gameSessionState.gameStatus,
          selectedPlayerIds: gameSessionState.selectedPlayerIds,
          seasonId: gameSessionState.seasonId,
          tournamentId: gameSessionState.tournamentId,
          gameLocation: gameSessionState.gameLocation,
          gameTime: gameSessionState.gameTime,
          demandFactor: gameSessionState.demandFactor,
          isPlayed: true, // GameSessionState doesn't have isPlayed, defaulting to true
          ageGroup: gameSessionState.ageGroup,
          tournamentLevel: gameSessionState.tournamentLevel,
          subIntervalMinutes: gameSessionState.subIntervalMinutes,
          completedIntervalDurations: gameSessionState.completedIntervalDurations,
          lastSubConfirmationTimeSeconds: gameSessionState.lastSubConfirmationTimeSeconds,
          tacticalDiscs: tacticalDiscs,
          tacticalDrawings: tacticalDrawings,
          tacticalBallPosition: tacticalBallPosition,
        };

        // 2. Update the savedGames state and localStorage
        const savedResult = await utilSaveGame(currentGameId, currentSnapshot);
        
        // 3. Update currentGameId if it changed (important for Supabase UUID sync)
        const newGameId = (savedResult as AppState & { id?: string }).id;
        if (newGameId && newGameId !== currentGameId) {
          logger.log(`[useGameDataManager] Game ID changed from ${currentGameId} to ${newGameId} during quick save`);
          setCurrentGameId(newGameId);
          
          // Update savedGames with the new ID and remove the old one
          const updatedSavedGames = { ...savedGames };
          updatedSavedGames[newGameId] = { ...currentSnapshot, id: newGameId } as AppState;
          delete updatedSavedGames[currentGameId];
          setSavedGames(updatedSavedGames);
          
          await utilSaveCurrentGameIdSetting(newGameId);
          logger.log(`[useGameDataManager] Game ${newGameId} quick saved successfully with ID sync.`);
        } else {
          // No ID change, update savedGames normally
          const updatedSavedGames = { ...savedGames, [currentGameId]: currentSnapshot };
          setSavedGames(updatedSavedGames);
          await utilSaveCurrentGameIdSetting(currentGameId);
          logger.log(`[useGameDataManager] Game ${currentGameId} quick saved successfully.`);
        }
      } catch (error) {
        logger.error('[useGameDataManager] Error during quick save:', error);
        throw error;
      }
    } else {
      logger.warn('[useGameDataManager] Cannot quick save: no valid game ID.');
    }
  }, [
    currentGameId,
    savedGames,
    setSavedGames,
    setCurrentGameId,
    gameSessionState,
    availablePlayers,
    playersOnField,
    opponents,
    drawings,
    tacticalDiscs,
    tacticalDrawings,
    tacticalBallPosition,
  ]);

  const handleDeleteGame = useCallback(async (gameId: string) => {
    logger.log(`[useGameDataManager] Attempting to delete game: ${gameId}`);
    
    if (!gameId) {
      logger.error('[useGameDataManager] handleDeleteGame: gameId is required');
      return;
    }

    try {
      const deletedGameId = await utilDeleteGame(gameId);

      if (deletedGameId) {
        const updatedSavedGames = { ...savedGames };
        delete updatedSavedGames[gameId];
        setSavedGames(updatedSavedGames);
        logger.log(`[useGameDataManager] Game ${gameId} deleted from state and persistence.`);

        if (currentGameId === gameId) {
          const latestId = getLatestGameId(updatedSavedGames);
          if (latestId) {
            logger.log(`[useGameDataManager] Deleted active game. Loading latest game ${latestId}.`);
            setCurrentGameId(latestId);
            await utilSaveCurrentGameIdSetting(latestId);
          } else {
            logger.log('[useGameDataManager] No other saved games found. Resetting to default state.');
            setCurrentGameId(DEFAULT_GAME_ID);
            await utilSaveCurrentGameIdSetting(DEFAULT_GAME_ID);
          }
        }

        // Invalidate queries to refresh UI
        queryClient.invalidateQueries({ queryKey: queryKeys.savedGames });
      } else {
        logger.warn(`[useGameDataManager] utilDeleteGame returned null for gameId: ${gameId}. Game might not have been found or ID was invalid.`);
      }
    } catch (error) {
      logger.error(`[useGameDataManager] Error deleting game ${gameId}:`, error);
      throw error;
    }
  }, [savedGames, setSavedGames, currentGameId, setCurrentGameId, queryClient]);

  // --- Export Handlers ---
  const handleExportOneJson = useCallback((gameId: string, seasons: Season[] = [], tournaments: Tournament[] = []) => {
    const gameData = savedGames[gameId];
    if (gameData) {
      exportJson(gameId, gameData, seasons, tournaments);
      logger.log(`[useGameDataManager] Exported game ${gameId} as JSON`);
    } else {
      logger.error(`[useGameDataManager] Game ${gameId} not found for JSON export`);
    }
  }, [savedGames]);

  const handleExportOneCsv = useCallback((gameId: string, players: Player[], seasons: Season[] = [], tournaments: Tournament[] = []) => {
    const gameData = savedGames[gameId];
    if (gameData) {
      exportCsv(gameId, gameData, players, seasons, tournaments);
      logger.log(`[useGameDataManager] Exported game ${gameId} as CSV`);
    } else {
      logger.error(`[useGameDataManager] Game ${gameId} not found for CSV export`);
    }
  }, [savedGames]);

  return {
    // Mutations
    mutations: {
      addSeasonMutation,
      updateSeasonMutation,
      deleteSeasonMutation,
      addTournamentMutation,
      updateTournamentMutation,
      deleteTournamentMutation,
      updateGameDetailsMutation,
    },
    
    // Handlers
    handlers: {
      handleQuickSaveGame,
      handleDeleteGame,
      handleExportOneJson,
      handleExportOneCsv,
    },
  };
};

export default useGameDataManager;