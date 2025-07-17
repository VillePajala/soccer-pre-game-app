'use client';

import React, { useState, useEffect, useCallback, useReducer, useRef } from 'react';
import SoccerField from '@/components/SoccerField';
import PlayerBar from '@/components/PlayerBar';
import ControlBar from '@/components/ControlBar';
import TimerOverlay from '@/components/TimerOverlay';
import GoalLogModal from '@/components/GoalLogModal';
import GameStatsModal from '@/components/GameStatsModal';
import TrainingResourcesModal from '@/components/TrainingResourcesModal';
import LoadGameModal from '@/components/LoadGameModal';
import NewGameSetupModal from '@/components/NewGameSetupModal';
import RosterSettingsModal from '@/components/RosterSettingsModal';
import GameSettingsModal from '@/components/GameSettingsModal';
import SettingsModal from '@/components/SettingsModal';
import SeasonTournamentManagementModal from '@/components/SeasonTournamentManagementModal';
import InstructionsModal from '@/components/InstructionsModal';
import PlayerAssessmentModal from '@/components/PlayerAssessmentModal';
import usePlayerAssessments from '@/hooks/usePlayerAssessments';
import { useTranslation } from 'react-i18next';
import i18n from '../i18n';
import { useGameState, UseGameStateReturn } from '@/hooks/useGameState';
import GameInfoBar from '@/components/GameInfoBar';
import { useGameTimer } from '@/hooks/useGameTimer';
import useAutoBackup from '@/hooks/useAutoBackup';
import { exportFullBackup } from '@/utils/fullBackup';
import { sendBackupEmail } from '@/utils/sendBackupEmail';
// Import the new game session reducer and related types
import {
  gameSessionReducer,
  GameSessionState,
  // initialGameSessionStatePlaceholder // We will derive initial state from page.tsx's initialState
} from '@/hooks/useGameSessionReducer';
// Import roster utility functions
// roster mutations now managed inside useRoster hook

// Removed unused import of utilGetMasterRoster

// Import utility functions for seasons and tournaments
import { saveGame as utilSaveGame, deleteGame as utilDeleteGame, getLatestGameId, createGame } from '@/utils/savedGames';
import {
  saveCurrentGameIdSetting as utilSaveCurrentGameIdSetting,
  resetAppSettings as utilResetAppSettings,
  getHasSeenAppGuide,
  saveHasSeenAppGuide,
  getLastHomeTeamName as utilGetLastHomeTeamName,
  saveLastHomeTeamName as utilSaveLastHomeTeamName,
  updateAppSettings as utilUpdateAppSettings,
  getAppSettings,
} from '@/utils/appSettings';
import { deleteSeason as utilDeleteSeason, updateSeason as utilUpdateSeason, addSeason as utilAddSeason } from '@/utils/seasons';
import { deleteTournament as utilDeleteTournament, updateTournament as utilUpdateTournament, addTournament as utilAddTournament } from '@/utils/tournaments';
// Import Player from types directory
import { Player, Season, Tournament } from '@/types';
// Import saveMasterRoster utility
import type { GameEvent, AppState, SavedGamesCollection, TimerState, PlayerAssessment } from "@/types";
import { saveMasterRoster } from '@/utils/masterRoster';
// Import useQuery, useMutation, useQueryClient
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useGameDataQueries } from '@/hooks/useGameDataQueries';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useTacticalBoard } from '@/hooks/useTacticalBoard';
import { useRoster } from '@/hooks/useRoster';
import { useModalContext } from '@/contexts/ModalProvider';
// Import async localStorage utilities
import {
  getLocalStorageItem,
  setLocalStorageItem,
  removeLocalStorageItem,
} from '@/utils/localStorage';
// Import query keys
import { queryKeys } from '@/config/queryKeys';
// Also import addSeason and addTournament for the new mutations
import { updateGameDetails as utilUpdateGameDetails } from '@/utils/savedGames';
import { DEFAULT_GAME_ID } from '@/config/constants';
import { MASTER_ROSTER_KEY, TIMER_STATE_KEY, SEASONS_LIST_KEY } from "@/config/storageKeys";
import { exportJson, exportCsv, exportAggregateJson, exportAggregateCsv } from '@/utils/exportGames';
import { useToast } from '@/contexts/ToastProvider';
import logger from '@/utils/logger';


// Placeholder data - Initialize new fields
const initialAvailablePlayersData: Player[] = [
  { id: 'p1', name: 'Player 1', isGoalie: false, jerseyNumber: '1', notes: '' },
  { id: 'p2', name: 'Player 2', isGoalie: false, jerseyNumber: '2', notes: '' },
  { id: 'p3', name: 'Player 3', isGoalie: false, jerseyNumber: '3', notes: '' },
  { id: 'p4', name: 'Player 4', isGoalie: false, jerseyNumber: '4', notes: '' },
  { id: 'p5', name: 'Player 5', isGoalie: false, jerseyNumber: '5', notes: '' },
  { id: 'p6', name: 'Player 6', isGoalie: false, jerseyNumber: '6', notes: '' },
  { id: 'p7', name: 'Player 7', isGoalie: false, jerseyNumber: '7', notes: '' },
  { id: 'p8', name: 'Player 8', isGoalie: false, jerseyNumber: '8', notes: '' },
  { id: 'p9', name: 'Player 9', isGoalie: false, jerseyNumber: '9', notes: '' },
  { id: 'p10', name: 'Player 10', isGoalie: false, jerseyNumber: '10', notes: '' },
  { id: 'p11', name: 'Player 11', isGoalie: false, jerseyNumber: '11', notes: '' },
];

const initialState: AppState = {
  playersOnField: [], // Start with no players on field
  opponents: [], // Start with no opponents
  drawings: [],
  availablePlayers: initialAvailablePlayersData, // <<< ADD: Use initial data here
  showPlayerNames: true,
  teamName: "My Team",
  gameEvents: [], // Initialize game events as empty array
  // Initialize game info
  opponentName: "Opponent",
  gameDate: new Date().toISOString().split('T')[0], // Default to today's date YYYY-MM-DD
  homeScore: 0,
  awayScore: 0,
  gameNotes: '', // Initialize game notes as empty string
  homeOrAway: 'home', // <<< Step 1: Initialize field
  // Initialize game structure
  numberOfPeriods: 2,
  periodDurationMinutes: 10, // Default to 10 minutes
  currentPeriod: 1,
  gameStatus: 'notStarted', // Initialize game status
  demandFactor: 1,
  // Initialize selectedPlayerIds with all players from initial data
  selectedPlayerIds: initialAvailablePlayersData.map(p => p.id),
  // gameType: 'season', // REMOVED
  seasonId: '', // Initialize season ID
  tournamentId: '', // Initialize tournament ID
  ageGroup: '',
  tournamentLevel: '',
  gameLocation: '', // Initialize optional fields
  gameTime: '', // Initialize optional fields
  // Timer related state
  subIntervalMinutes: 5, // Add sub interval with default
  completedIntervalDurations: [], // Initialize completed interval logs
  lastSubConfirmationTimeSeconds: 0, // Initialize last substitution confirmation time
  tacticalDiscs: [],
  tacticalDrawings: [],
  tacticalBallPosition: { relX: 0.5, relY: 0.5 },
};

interface HomePageProps {
  initialAction?: 'newGame' | 'loadGame' | 'resumeGame' | 'season' | 'stats';
  skipInitialSetup?: boolean;
}

function HomePage({ initialAction, skipInitialSetup = false }: HomePageProps) {
  logger.log('--- page.tsx RENDER ---');
  const { t } = useTranslation(); // Get translation function
  const queryClient = useQueryClient(); // Get query client instance

 
  
  // --- Initialize Game Session Reducer ---
  // Map necessary fields from page.tsx's initialState to GameSessionState
  const initialGameSessionData: GameSessionState = {
    teamName: initialState.teamName,
    opponentName: initialState.opponentName,
    gameDate: initialState.gameDate,
    homeScore: initialState.homeScore,
    awayScore: initialState.awayScore,
    gameNotes: initialState.gameNotes,
    homeOrAway: initialState.homeOrAway,
    numberOfPeriods: initialState.numberOfPeriods,
    periodDurationMinutes: initialState.periodDurationMinutes,
    currentPeriod: initialState.currentPeriod,
    gameStatus: initialState.gameStatus,
    demandFactor: initialState.demandFactor ?? 1,
    selectedPlayerIds: initialState.selectedPlayerIds,
    seasonId: initialState.seasonId,
    tournamentId: initialState.tournamentId,
    ageGroup: initialState.ageGroup,
    tournamentLevel: initialState.tournamentLevel,
    gameLocation: initialState.gameLocation,
    gameTime: initialState.gameTime,
    gameEvents: initialState.gameEvents,
    timeElapsedInSeconds: 0, // Initial timer state should be 0
    isTimerRunning: false,    // Initial timer state
    subIntervalMinutes: initialState.subIntervalMinutes ?? 5,
    nextSubDueTimeSeconds: (initialState.subIntervalMinutes ?? 5) * 60,
    subAlertLevel: 'none',
    lastSubConfirmationTimeSeconds: 0,
    completedIntervalDurations: initialState.completedIntervalDurations || [],
    showPlayerNames: initialState.showPlayerNames,
    startTimestamp: null,
  };

  const [gameSessionState, dispatchGameSession] = useReducer(gameSessionReducer, initialGameSessionData);


  useEffect(() => {
    logger.log('[gameSessionState CHANGED]', gameSessionState);
  }, [gameSessionState]);

  // --- History Management ---
  const {
    state: currentHistoryState,
    set: pushHistoryState,
    reset: resetHistory,
    undo: undoHistory,
    redo: redoHistory,
    canUndo,
    canRedo,
  } = useUndoRedo<AppState>(initialState);

  const saveStateToHistory = useCallback((newState: Partial<AppState>) => {
    if (!currentHistoryState) return; // Should not happen

    // If newState includes seasonId, ensure tournamentId is cleared if seasonId is truthy
    // This mirrors the reducer logic for SET_SEASON_ID.
    // Similarly, if newState includes tournamentId, ensure seasonId is cleared if tournamentId is truthy.
    const adjustedNewState: Partial<AppState> = {
      ...newState,
      ...(newState.seasonId && newState.tournamentId === undefined 
          ? { tournamentId: '' } 
          : {}),
      ...(newState.tournamentId && newState.seasonId === undefined 
          ? { seasonId: '' } 
          : {}),
    };

    const nextState: AppState = { ...currentHistoryState, ...adjustedNewState };

    if (JSON.stringify(nextState) === JSON.stringify(currentHistoryState)) {
      return; // Don't save if nothing changed
    }

    pushHistoryState(nextState);

  }, [currentHistoryState, pushHistoryState]);

  // --- Effect to save gameSessionState changes to history ---
  useEffect(() => {
    // This effect runs after gameSessionState has been updated by the reducer.
    // It constructs the relevant slice of AppState from the new gameSessionState
    // and saves it to the history.
    const gameSessionHistorySlice: Partial<AppState> = {
      teamName: gameSessionState.teamName,
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
      gameEvents: gameSessionState.gameEvents,
      subIntervalMinutes: gameSessionState.subIntervalMinutes,
      completedIntervalDurations: gameSessionState.completedIntervalDurations,
      lastSubConfirmationTimeSeconds: gameSessionState.lastSubConfirmationTimeSeconds,
      showPlayerNames: gameSessionState.showPlayerNames,
      // Ensure any other fields from GameSessionState that are part of AppState history are included
    };
    // saveStateToHistory will merge this with other non-gameSessionState parts of AppState
    // (like playersOnField, opponents, drawings) that are handled elsewhere.
    saveStateToHistory(gameSessionHistorySlice);
  }, [gameSessionState, saveStateToHistory]);
  // END --- Effect to save gameSessionState changes to history ---

  // --- Load game data via hook ---
  const {
    masterRoster: masterRosterQueryResultData,
    seasons: seasonsQueryResultData,
    tournaments: tournamentsQueryResultData,
    savedGames: allSavedGamesQueryResultData,
    currentGameId: currentGameIdSettingQueryResultData,
    loading: isGameDataLoading,
    error: gameDataError,
  } = useGameDataQueries();

  const isMasterRosterQueryLoading = isGameDataLoading;
  const areSeasonsQueryLoading = isGameDataLoading;
  const areTournamentsQueryLoading = isGameDataLoading;
  const isAllSavedGamesQueryLoading = isGameDataLoading;
  const isCurrentGameIdSettingQueryLoading = isGameDataLoading;

  const isMasterRosterQueryError = !!gameDataError;
  const isSeasonsQueryError = !!gameDataError;
  const isTournamentsQueryError = !!gameDataError;
  const isAllSavedGamesQueryError = !!gameDataError;
  const isCurrentGameIdSettingQueryError = !!gameDataError;

  const masterRosterQueryErrorData = gameDataError;
  const seasonsQueryErrorData = gameDataError;
  const tournamentsQueryErrorData = gameDataError;
  const allSavedGamesQueryErrorData = gameDataError;
  const currentGameIdSettingQueryErrorData = gameDataError;

  // --- Core Game State (Managed by Hook) ---
  const {
    playersOnField,
    opponents,
    drawings, // State from hook
    setPlayersOnField,
    setOpponents,
    setDrawings,
    handlePlayerDrop,
    // Destructure drawing handlers from hook
    handleDrawingStart,
    handleDrawingAddPoint,
    handleDrawingEnd,
    handleClearDrawings,
    // Get opponent handlers from hook
    handleAddOpponent,
    handleOpponentMove,
    handleOpponentMoveEnd,
    handleOpponentRemove,
    // handleRenamePlayer, // This is the one from useGameState, will be passed to PlayerBar
  }: UseGameStateReturn = useGameState({
    initialState,
    saveStateToHistory,
    // masterRosterKey: MASTER_ROSTER_KEY, // Removed as no longer used by useGameState
  });

  const {
    availablePlayers,
    setAvailablePlayers,
    highlightRosterButton,
    setHighlightRosterButton,
    isRosterUpdating,
    setRosterError,
    rosterError,
    playersForCurrentGame,
    handleAddPlayer,
    handleUpdatePlayer,
    handleRemovePlayer,
    handleSetGoalieStatus,
  } = useRoster({
    initialPlayers: initialState.availablePlayers,
    selectedPlayerIds: gameSessionState.selectedPlayerIds,
  });

  // --- State Management (Remaining in Home component) ---
  // const [showPlayerNames, setShowPlayerNames] = useState<boolean>(initialState.showPlayerNames); // REMOVE - Migrated to gameSessionState
  // const [gameEvents, setGameEvents] = useState<GameEvent[]>(initialState.gameEvents); // REMOVE - Migrated to gameSessionState
  // const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(initialState.selectedPlayerIds); // REMOVE - Migrated to gameSessionState
  // const [seasonId, setSeasonId] = useState<string>(initialState.seasonId); // REMOVE - Migrate to gameSessionState
  // const [tournamentId, setTournamentId] = useState<string>(initialState.tournamentId); // REMOVE - Migrate to gameSessionState
  // Add state for location and time
  // const [gameLocation, setGameLocation] = useState<string>(initialState.gameLocation || ''); // REMOVE - Migrate to gameSessionState
  // const [gameTime, setGameTime] = useState<string>(initialState.gameTime || ''); // REMOVE - Migrate to gameSessionState
  // ... Timer state ...
  // ... Modal states ...
  // ... UI/Interaction states ...
  const [draggingPlayerFromBarInfo, setDraggingPlayerFromBarInfo] = useState<Player | null>(null);
  // Persistence state
  const [savedGames, setSavedGames] = useState<SavedGamesCollection>({});
  const [currentGameId, setCurrentGameId] = useState<string | null>(DEFAULT_GAME_ID);
  
  // This ref needs to be declared after currentGameId
  const gameIdRef = useRef(currentGameId);

  useEffect(() => { gameIdRef.current = currentGameId; }, [currentGameId]);

  const {
    assessments: playerAssessments,
    saveAssessment,
    deleteAssessment,
  } = usePlayerAssessments(
    currentGameId || '',
    gameSessionState.completedIntervalDurations,
  );

  const {
    timeElapsedInSeconds,
    isTimerRunning,
    subAlertLevel,
    lastSubConfirmationTimeSeconds,
    startPause: handleStartPauseTimer,
    reset: handleResetTimer,
    ackSubstitution: handleSubstitutionMade,
    setSubInterval: handleSetSubInterval,
  } = useGameTimer({ state: gameSessionState, dispatch: dispatchGameSession, currentGameId: currentGameId || '' });

  // ADD State for seasons/tournaments lists
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  // <<< ADD: State for home/away status >>>
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  const [hasSkippedInitialSetup, setHasSkippedInitialSetup] = useState<boolean>(skipInitialSetup);
  const [defaultTeamNameSetting, setDefaultTeamNameSetting] = useState<string>('');
  const [appLanguage, setAppLanguage] = useState<string>(i18n.language);
  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(false);
  const [backupIntervalHours, setBackupIntervalHours] = useState<number>(24);
  const [lastBackupTime, setLastBackupTime] = useState<string | null>(null);
  const [backupEmail, setBackupEmail] = useState<string>('');

  useEffect(() => {
    utilGetLastHomeTeamName().then((name) => setDefaultTeamNameSetting(name));
  }, []);

  useAutoBackup();

  useEffect(() => {
    getAppSettings().then((s) => {
      setAutoBackupEnabled(s.autoBackupEnabled ?? false);
      setBackupIntervalHours(s.autoBackupIntervalHours ?? 24);
      setLastBackupTime(s.lastBackupTime ?? null);
      setBackupEmail(s.backupEmail ?? '');
    });
  }, []);

  useEffect(() => {
    i18n.changeLanguage(appLanguage);
    utilUpdateAppSettings({ language: appLanguage }).catch(() => {});
  }, [appLanguage]);
  const {
    isGameSettingsModalOpen,
    setIsGameSettingsModalOpen,
    isLoadGameModalOpen,
    setIsLoadGameModalOpen,
    isRosterModalOpen,
    setIsRosterModalOpen,
    isSeasonTournamentModalOpen,
    setIsSeasonTournamentModalOpen,
    isTrainingResourcesOpen,
    setIsTrainingResourcesOpen,
    isGoalLogModalOpen,
    setIsGoalLogModalOpen,
    isGameStatsModalOpen,
    setIsGameStatsModalOpen,
    isNewGameSetupModalOpen,
    setIsNewGameSetupModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isPlayerAssessmentModalOpen,
    setIsPlayerAssessmentModalOpen,
  } = useModalContext();
  const { showToast } = useToast();
  // const [isPlayerStatsModalOpen, setIsPlayerStatsModalOpen] = useState(false);
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<Player | null>(null);

  // --- Timer State (Still needed here) ---
  const [showLargeTimerOverlay, setShowLargeTimerOverlay] = useState<boolean>(false); // State for overlay visibility
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!initialAction) return;
    switch (initialAction) {
      case 'newGame':
        setIsNewGameSetupModalOpen(true);
        break;
      case 'loadGame':
        setIsLoadGameModalOpen(true);
        break;
      case 'season':
        setIsSeasonTournamentModalOpen(true);
        break;
      case 'stats':
        setIsGameStatsModalOpen(true);
        break;
      default:
        break;
    }
  }, [initialAction, setIsNewGameSetupModalOpen, setIsLoadGameModalOpen, setIsSeasonTournamentModalOpen, setIsGameStatsModalOpen]);
  
  // --- Modal States handled via context ---

  // <<< ADD State to hold player IDs for the next new game >>>
  const [playerIdsForNewGame, setPlayerIdsForNewGame] = useState<string[] | null>(null);
  const [newGameDemandFactor, setNewGameDemandFactor] = useState(1);
  // <<< ADD State for the roster prompt toast >>>
  // const [showRosterPrompt, setShowRosterPrompt] = useState<boolean>(false);

  // State for game saving error (loading state is from saveGameMutation.isLoading)

  // NEW: States for LoadGameModal operations
  const [isLoadingGamesList, setIsLoadingGamesList] = useState(false);
  const [loadGamesListError, setLoadGamesListError] = useState<string | null>(null);
  const [isGameLoading, setIsGameLoading] = useState(false); // For loading a specific game
  const [gameLoadError, setGameLoadError] = useState<string | null>(null);
  const [isGameDeleting, setIsGameDeleting] = useState(false); // For deleting a specific game
  const [gameDeleteError, setGameDeleteError] = useState<string | null>(null);
  const [processingGameId, setProcessingGameId] = useState<string | null>(null); // To track which game item is being processed
  const {
    isTacticsBoardView,
    tacticalDiscs,
    setTacticalDiscs,
    tacticalDrawings,
    setTacticalDrawings,
    tacticalBallPosition,
    setTacticalBallPosition,
    handleToggleTacticsBoard,
    handleAddTacticalDisc,
    handleTacticalDiscMove,
    handleTacticalDiscRemove,
    handleToggleTacticalDiscType,
    handleTacticalBallMove,
    handleTacticalDrawingStart,
    handleTacticalDrawingAddPoint,
    handleTacticalDrawingEnd,
    clearTacticalElements,
  } = useTacticalBoard({
    initialDiscs: initialState.tacticalDiscs,
    initialDrawings: initialState.tacticalDrawings,
    initialBallPosition: initialState.tacticalBallPosition,
    saveStateToHistory,
  });

  // --- Mutation for Adding a new Season ---
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
        logger.log('[Mutation Success] Season added:', newSeason.name, newSeason.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.seasons });
        // Potentially set an optimistic update or directly update local 'seasons' state if needed
        // For now, relying on query invalidation to refresh the seasons list
      } else {
        // This case might indicate a duplicate name or some other non-exception failure from utilAddSeason
        logger.warn('[Mutation Non-Success] utilAddSeason returned null for season:', variables.name);
        // Consider setting a specific error state for the NewGameSetupModal if it's a common issue
        // alert(t('newGameSetupModal.errors.addSeasonFailed', 'Failed to add season: {seasonName}. It might already exist.', { seasonName: variables.name }));
      }
    },
    onError: (error, variables) => {
      logger.error(`[Mutation Error] Failed to add season ${variables.name}:`, error);
      // alert(t('newGameSetupModal.errors.addSeasonFailedUnexpected', 'An unexpected error occurred while adding season: {seasonName}.', { seasonName: variables.name }));
    },
  });

  const updateSeasonMutation = useMutation<Season | null, Error, Season>({
    mutationFn: async (season) => utilUpdateSeason(season),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seasons });
    },
  });

  const deleteSeasonMutation = useMutation<boolean, Error, string>({
    mutationFn: async (id) => utilDeleteSeason(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.seasons });
    },
  });

  const updateTournamentMutation = useMutation<Tournament | null, Error, Tournament>({
      mutationFn: async (tournament) => utilUpdateTournament(tournament),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
      },
  });

  const deleteTournamentMutation = useMutation({
    mutationFn: (id: string) => utilDeleteTournament(id),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
      queryClient.invalidateQueries({ queryKey: queryKeys.savedGames });
    },
  });

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
      logger.error("Error updating game details:", error);
      // Here you could show a toast notification to the user
      },
  });

  // --- Mutation for Adding a new Tournament ---
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
        logger.log('[Mutation Success] Tournament added:', newTournament.name, newTournament.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
        // Similar to seasons, could optimistically update or rely on invalidation
      } else {
        logger.warn('[Mutation Non-Success] utilAddTournament returned null for tournament:', variables.name);
        // alert(t('newGameSetupModal.errors.addTournamentFailed', 'Failed to add tournament: {tournamentName}. It might already exist.', { tournamentName: variables.name }));
      }
    },
    onError: (error, variables) => {
      logger.error(`[Mutation Error] Failed to add tournament ${variables.name}:`, error);
      // alert(t('newGameSetupModal.errors.addTournamentFailedUnexpected', 'An unexpected error occurred while adding tournament: {tournamentName}.', { tournamentName: variables.name }));
    },
  });
  useEffect(() => {
    if (isMasterRosterQueryLoading) {
      logger.log('[TanStack Query] Master Roster is loading...');
    }
    if (masterRosterQueryResultData) {
      setAvailablePlayers(masterRosterQueryResultData);
    }
    if (isMasterRosterQueryError) {
      logger.error('[TanStack Query] Error loading master roster:', masterRosterQueryErrorData);
      setAvailablePlayers([]);
    }
  }, [masterRosterQueryResultData, isMasterRosterQueryLoading, isMasterRosterQueryError, masterRosterQueryErrorData, setAvailablePlayers]);

  // --- Effect to update seasons from useQuery ---
  useEffect(() => {
    if (areSeasonsQueryLoading) {
      logger.log('[TanStack Query] Seasons are loading...');
    }
    if (seasonsQueryResultData) {
      setSeasons(Array.isArray(seasonsQueryResultData) ? seasonsQueryResultData : []);
    }
    if (isSeasonsQueryError) {
      logger.error('[TanStack Query] Error loading seasons:', seasonsQueryErrorData);
      setSeasons([]);
    }
  }, [seasonsQueryResultData, areSeasonsQueryLoading, isSeasonsQueryError, seasonsQueryErrorData, setSeasons]);

  // --- Effect to update tournaments from useQuery ---
  useEffect(() => {
    if (areTournamentsQueryLoading) {
      logger.log('[TanStack Query] Tournaments are loading...');
    }
    if (tournamentsQueryResultData) {
      setTournaments(Array.isArray(tournamentsQueryResultData) ? tournamentsQueryResultData : []);
    }
    if (isTournamentsQueryError) {
      logger.error('[TanStack Query] Error loading tournaments:', tournamentsQueryErrorData);
      setTournaments([]);
    }
  }, [tournamentsQueryResultData, areTournamentsQueryLoading, isTournamentsQueryError, tournamentsQueryErrorData, setTournaments]);

  // --- Effect to sync playersOnField details with availablePlayers changes ---
  useEffect(() => {
    if (availablePlayers && availablePlayers.length > 0) {
      setPlayersOnField(prevPlayersOnField => {
        const nextPlayersOnField = prevPlayersOnField.map(fieldPlayer => {
          const rosterPlayer = availablePlayers.find(ap => ap.id === fieldPlayer.id);
          if (rosterPlayer) {
            // Sync relevant properties from rosterPlayer to fieldPlayer
            // Only update if there's a difference to avoid unnecessary re-renders / history saves
            if (fieldPlayer.name !== rosterPlayer.name || 
                fieldPlayer.jerseyNumber !== rosterPlayer.jerseyNumber || 
                fieldPlayer.isGoalie !== rosterPlayer.isGoalie ||
                fieldPlayer.nickname !== rosterPlayer.nickname ||
                fieldPlayer.notes !== rosterPlayer.notes
                // Add any other properties that should be synced
            ) {
              return {
                ...fieldPlayer, // Keep position (relX, relY)
                name: rosterPlayer.name,
                jerseyNumber: rosterPlayer.jerseyNumber,
                isGoalie: rosterPlayer.isGoalie,
                nickname: rosterPlayer.nickname,
                notes: rosterPlayer.notes,
                // Ensure other essential Player properties are maintained if not in rosterPlayer directly
                receivedFairPlayCard: rosterPlayer.receivedFairPlayCard !== undefined ? rosterPlayer.receivedFairPlayCard : fieldPlayer.receivedFairPlayCard
              };
            }
          }
          return fieldPlayer; // Return original if no corresponding roster player or no changes
        });

        // Only save to history if actual changes were made to playersOnField
        if (JSON.stringify(prevPlayersOnField) !== JSON.stringify(nextPlayersOnField)) {
          // logger.log('[EFFECT syncPoF] playersOnField updated due to availablePlayers change. Saving to history.');
          saveStateToHistory({ playersOnField: nextPlayersOnField });
        }
        return nextPlayersOnField;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availablePlayers, saveStateToHistory]); // setPlayersOnField is from useGameState, should be stable if not changing the hook itself
  // Note: We don't want setPlayersOnField in deps if it causes loops.
  // saveStateToHistory is also a dependency as it's used inside.
  
  useEffect(() => {
    const loadInitialAppData = async () => {
      logger.log('[EFFECT init] Coordinating initial application data from TanStack Query...');
      if (initialLoadComplete) {
        logger.log('[EFFECT init] Initial load already complete. Skipping.');
        return;
      }
      // This useEffect now primarily ensures that dependent state updates happen
      // after the core data (masterRoster, seasons, tournaments, savedGames, currentGameIdSetting)
      // has been fetched by their respective useQuery hooks.

      // Simple migration for old data keys (if any) - Run once
      try {
        const oldRosterJson = getLocalStorageItem('availablePlayers');
        if (oldRosterJson) {
          logger.log('[EFFECT init] Migrating old roster data...');
          setLocalStorageItem(MASTER_ROSTER_KEY, oldRosterJson);
          removeLocalStorageItem('availablePlayers');
          // Consider invalidating and refetching masterRoster query here if migration happens
          // queryClient.invalidateQueries(queryKeys.masterRoster);
        }
        const oldSeasonsJson = getLocalStorageItem('soccerSeasonsList'); // Another old key
      if (oldSeasonsJson) {
          logger.log('[EFFECT init] Migrating old seasons data...');
          setLocalStorageItem(SEASONS_LIST_KEY, oldSeasonsJson); // New key
          // queryClient.invalidateQueries(queryKeys.seasons);
      }
    } catch (migrationError) {
        logger.error('[EFFECT init] Error during data migration:', migrationError);
      }

      // Master Roster, Seasons, Tournaments are handled by their own useEffects reacting to useQuery.

      // 4. Update local savedGames state from useQuery for allSavedGames
      if (isAllSavedGamesQueryLoading) {
        logger.log('[EFFECT init] All saved games are loading via TanStack Query...');
        setIsLoadingGamesList(true);
      }
      if (allSavedGamesQueryResultData) {
        setSavedGames(allSavedGamesQueryResultData || {});
        setIsLoadingGamesList(false);
      }
      if (isAllSavedGamesQueryError) {
        logger.error('[EFFECT init] Error loading all saved games via TanStack Query:', allSavedGamesQueryErrorData);
        setLoadGamesListError(t('loadGameModal.errors.listLoadFailed', 'Failed to load saved games list.'));
      setSavedGames({});
        setIsLoadingGamesList(false);
      }
      
      // 5. Determine and set current game ID and related state from useQuery data
      if (isCurrentGameIdSettingQueryLoading || isAllSavedGamesQueryLoading) { 
        logger.log('[EFFECT init] Waiting for current game ID setting and/or saved games list to load...');
      } else {
        const lastGameIdSetting = currentGameIdSettingQueryResultData;
        const currentSavedGames = allSavedGamesQueryResultData || {}; 

        if (lastGameIdSetting && lastGameIdSetting !== DEFAULT_GAME_ID && currentSavedGames[lastGameIdSetting]) {
          logger.log(`[EFFECT init] Restoring last saved game: ${lastGameIdSetting} from TanStack Query data.`);
          setCurrentGameId(lastGameIdSetting);
          setHasSkippedInitialSetup(true);
        } else {
          if (lastGameIdSetting && lastGameIdSetting !== DEFAULT_GAME_ID) {
            logger.warn(`[EFFECT init] Last game ID ${lastGameIdSetting} not found in saved games (from TanStack Query). Loading default.`);
          }
        setCurrentGameId(DEFAULT_GAME_ID);
      }
    }
    
      // Determine overall initial load completion
      if (!isMasterRosterQueryLoading && !areSeasonsQueryLoading && !areTournamentsQueryLoading && !isAllSavedGamesQueryLoading && !isCurrentGameIdSettingQueryLoading) {
        // --- TIMER RESTORATION LOGIC ---
        try {
          const savedTimerStateJSON = getLocalStorageItem(TIMER_STATE_KEY);
          const lastGameId = currentGameIdSettingQueryResultData;
          
          if (savedTimerStateJSON) {
            const savedTimerState: TimerState = JSON.parse(savedTimerStateJSON);
            if (savedTimerState && savedTimerState.gameId === lastGameId) {
              logger.log('[EFFECT init] Found a saved timer state for the current game. Restoring...');
              const elapsedOfflineSeconds = (Date.now() - savedTimerState.timestamp) / 1000;
              const correctedElapsedSeconds = Math.round(savedTimerState.timeElapsedInSeconds + elapsedOfflineSeconds);
              
              dispatchGameSession({ type: 'SET_TIMER_ELAPSED', payload: correctedElapsedSeconds });
              dispatchGameSession({ type: 'SET_TIMER_RUNNING', payload: true });
            } else {
              removeLocalStorageItem(TIMER_STATE_KEY);
            }
          }
        } catch (error) {
          logger.error('[EFFECT init] Error restoring timer state:', error);
          removeLocalStorageItem(TIMER_STATE_KEY);
        }
        // --- END TIMER RESTORATION LOGIC ---

        const seenGuide = await getHasSeenAppGuide();
        if (!seenGuide) {
          setIsInstructionsModalOpen(true);
        }

        // This is now the single source of truth for loading completion.
        setInitialLoadComplete(true);
        logger.log('[EFFECT init] Initial application data coordination complete.');
      }
    };

    loadInitialAppData();
  }, [
    masterRosterQueryResultData,
    isMasterRosterQueryLoading,
    isMasterRosterQueryError,
    masterRosterQueryErrorData,
    seasonsQueryResultData,
    areSeasonsQueryLoading,
    isSeasonsQueryError,
    seasonsQueryErrorData,
    tournamentsQueryResultData,
    areTournamentsQueryLoading,
    isTournamentsQueryError,
    tournamentsQueryErrorData,
    allSavedGamesQueryResultData,
    isAllSavedGamesQueryLoading,
    isAllSavedGamesQueryError,
    allSavedGamesQueryErrorData,
    currentGameIdSettingQueryResultData,
    isCurrentGameIdSettingQueryLoading,
    isCurrentGameIdSettingQueryError,
    currentGameIdSettingQueryErrorData,
    setSavedGames,
    setIsLoadingGamesList,
    setLoadGamesListError,
    setCurrentGameId,
    setHasSkippedInitialSetup,
    t,
    initialLoadComplete
  ]);

  // --- NEW: Robust Visibility Change Handling ---
  // --- Wake Lock Effect ---
  useEffect(() => {
    // This effect is now replaced by the direct call in the main timer effect
    // to avoid race conditions.
  }, []);

  // Helper function to load game state from game data
  const loadGameStateFromData = (gameData: AppState | null, isInitialDefaultLoad = false) => {
    logger.log('[LOAD GAME STATE] Called with gameData:', gameData, 'isInitialDefaultLoad:', isInitialDefaultLoad);

    if (gameData) {
      // gameData is AppState, map its fields directly to GameSessionState partial payload
      const payload: Partial<GameSessionState> = {
        teamName: gameData.teamName,
        opponentName: gameData.opponentName,
        gameDate: gameData.gameDate,
        homeScore: gameData.homeScore,
        awayScore: gameData.awayScore,
        gameNotes: gameData.gameNotes,
        homeOrAway: gameData.homeOrAway,
        numberOfPeriods: gameData.numberOfPeriods,
        periodDurationMinutes: gameData.periodDurationMinutes,
        currentPeriod: gameData.currentPeriod,
        gameStatus: gameData.gameStatus,
        selectedPlayerIds: gameData.selectedPlayerIds,
        seasonId: gameData.seasonId ?? undefined,
        tournamentId: gameData.tournamentId ?? undefined,
        gameLocation: gameData.gameLocation,
        gameTime: gameData.gameTime,
        demandFactor: gameData.demandFactor,
        gameEvents: gameData.gameEvents,
        subIntervalMinutes: gameData.subIntervalMinutes,
        completedIntervalDurations: gameData.completedIntervalDurations,
        lastSubConfirmationTimeSeconds: gameData.lastSubConfirmationTimeSeconds,
        showPlayerNames: gameData.showPlayerNames,
      };
      dispatchGameSession({ type: 'LOAD_PERSISTED_GAME_DATA', payload });
    } else {
      dispatchGameSession({ type: 'RESET_TO_INITIAL_STATE', payload: initialGameSessionData });
    }

    // Update non-reducer states (these will eventually be migrated or handled differently)
    // For fields not yet in gameSessionState but are in GameData, update their local states if needed.
    // This part will shrink as more state moves to the reducer.
    setPlayersOnField(gameData?.playersOnField || (isInitialDefaultLoad ? initialState.playersOnField : []));
    setOpponents(gameData?.opponents || (isInitialDefaultLoad ? initialState.opponents : []));
    setDrawings(gameData?.drawings || (isInitialDefaultLoad ? initialState.drawings : []));
    setTacticalDiscs(gameData?.tacticalDiscs || (isInitialDefaultLoad ? initialState.tacticalDiscs : []));
    setTacticalDrawings(gameData?.tacticalDrawings || (isInitialDefaultLoad ? initialState.tacticalDrawings : []));
    setTacticalBallPosition(gameData?.tacticalBallPosition || { relX: 0.5, relY: 0.5 });
    
    // Update gameEvents from gameData if present, otherwise from initial state if it's an initial default load
    // setGameEvents(gameData?.events || (isInitialDefaultLoad ? initialState.gameEvents : [])); // REMOVE - Handled by LOAD_PERSISTED_GAME_DATA in reducer

    // Update selectedPlayerIds, seasonId, tournamentId, gameLocation, gameTime from gameData
    // These are also part of gameSessionState now, but local states might still be used by some components directly.
    // Prefer sourcing from gameSessionState once components are updated.
    // setSelectedPlayerIds(gameData?.selectedPlayerIds || (isInitialDefaultLoad ? initialState.selectedPlayerIds : [])); // REMOVE - Handled by LOAD_PERSISTED_GAME_DATA
    // setSeasonId(gameData?.seasonId || (isInitialDefaultLoad ? initialState.seasonId : '')); // REMOVE - Handled by LOAD_PERSISTED_GAME_DATA
    // setTournamentId(gameData?.tournamentId || (isInitialDefaultLoad ? initialState.tournamentId : '')); // REMOVE - Handled by LOAD_PERSISTED_GAME_DATA
    // setShowPlayerNames(gameData?.showPlayerNames === undefined ? (isInitialDefaultLoad ? initialState.showPlayerNames : true) : gameData.showPlayerNames); // REMOVE - Handled by LOAD_PERSISTED_GAME_DATA in reducer


    // History state should be based on the new gameSessionState + other states
    // For simplicity, we'll form history state AFTER the reducer has processed the load.
    // This requires a slight delay or a way to access the state post-dispatch if saveStateToHistory is called immediately.
    // For now, let's assume gameSessionState is updated for the next render cycle.
    // A more robust way would be to have LOAD_PERSISTED_GAME_DATA return the new state or use a useEffect.

    // Construct historyState using the *potentially* updated gameSessionState for the next render.
    // And combine with other non-reducer states.
    const newHistoryState: AppState = {
      teamName: gameData?.teamName ?? initialGameSessionData.teamName,
      opponentName: gameData?.opponentName ?? initialGameSessionData.opponentName,
      gameDate: gameData?.gameDate ?? initialGameSessionData.gameDate,
      homeScore: gameData?.homeScore ?? initialGameSessionData.homeScore,
      awayScore: gameData?.awayScore ?? initialGameSessionData.awayScore,
      gameNotes: gameData?.gameNotes ?? initialGameSessionData.gameNotes,
      homeOrAway: gameData?.homeOrAway ?? initialGameSessionData.homeOrAway,
      numberOfPeriods: gameData?.numberOfPeriods ?? initialGameSessionData.numberOfPeriods,
      periodDurationMinutes: gameData?.periodDurationMinutes ?? initialGameSessionData.periodDurationMinutes,
      currentPeriod: gameData?.currentPeriod ?? initialGameSessionData.currentPeriod, 
      gameStatus: gameData?.gameStatus ?? initialGameSessionData.gameStatus, 
      seasonId: gameData?.seasonId ?? initialGameSessionData.seasonId,
      tournamentId: gameData?.tournamentId ?? initialGameSessionData.tournamentId,
      gameLocation: gameData?.gameLocation ?? initialGameSessionData.gameLocation,
      gameTime: gameData?.gameTime ?? initialGameSessionData.gameTime,
      demandFactor: gameData?.demandFactor ?? initialGameSessionData.demandFactor,
      subIntervalMinutes: gameData?.subIntervalMinutes ?? initialGameSessionData.subIntervalMinutes,
      completedIntervalDurations: gameData?.completedIntervalDurations ?? initialGameSessionData.completedIntervalDurations,
      lastSubConfirmationTimeSeconds: gameData?.lastSubConfirmationTimeSeconds ?? initialGameSessionData.lastSubConfirmationTimeSeconds,
      showPlayerNames: gameData?.showPlayerNames === undefined ? initialGameSessionData.showPlayerNames : gameData.showPlayerNames,
      selectedPlayerIds: gameData?.selectedPlayerIds ?? initialGameSessionData.selectedPlayerIds,
      gameEvents: gameData?.gameEvents ?? initialGameSessionData.gameEvents,
      playersOnField: gameData?.playersOnField || initialState.playersOnField,
      opponents: gameData?.opponents || initialState.opponents,
      drawings: gameData?.drawings || initialState.drawings,
      tacticalDiscs: gameData?.tacticalDiscs || [],
      tacticalDrawings: gameData?.tacticalDrawings || [],
      tacticalBallPosition: gameData?.tacticalBallPosition || { relX: 0.5, relY: 0.5 },
      availablePlayers: masterRosterQueryResultData || availablePlayers,
    };
    resetHistory(newHistoryState);
    logger.log('[LOAD GAME STATE] Finished dispatching. Reducer will update gameSessionState.');
  };

  // --- Effect to load game state when currentGameId changes or savedGames updates ---
  useEffect(() => {
    logger.log('[EFFECT game load] currentGameId or savedGames changed:', { currentGameId });
    if (!initialLoadComplete) {
      logger.log('[EFFECT game load] Initial load not complete, skipping game state application.');
      return; 
    }

    let gameToLoad: AppState | null = null; // Ensure this is AppState
    if (currentGameId && currentGameId !== DEFAULT_GAME_ID && savedGames[currentGameId]) {
      logger.log(`[EFFECT game load] Found game data for ${currentGameId}`);
      gameToLoad = savedGames[currentGameId] as AppState; // Cast to AppState
    } else {
      logger.log('[EFFECT game load] No specific game to load or ID is default. Applying default game state.');
    }
    loadGameStateFromData(gameToLoad); 

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGameId, savedGames, initialLoadComplete]); // IMPORTANT: initialLoadComplete ensures this runs after master roster is loaded.

  // --- Save state to localStorage ---
  useEffect(() => {
    // Only auto-save if loaded AND we have a proper game ID (not the default unsaved one)
    const autoSave = async () => {
    if (initialLoadComplete && currentGameId && currentGameId !== DEFAULT_GAME_ID) {
      logger.log(`Auto-saving state for game ID: ${currentGameId}`);
      try {
        // 1. Create the current game state snapshot (excluding history and volatile timer states)
        const currentSnapshot: AppState = {
          // Fields from gameSessionState (persisted ones)
          teamName: gameSessionState.teamName,
          opponentName: gameSessionState.opponentName,
          gameDate: gameSessionState.gameDate,
          homeScore: gameSessionState.homeScore,
          awayScore: gameSessionState.awayScore,
          gameNotes: gameSessionState.gameNotes,
          homeOrAway: gameSessionState.homeOrAway,
          numberOfPeriods: gameSessionState.numberOfPeriods,
          periodDurationMinutes: gameSessionState.periodDurationMinutes,
          currentPeriod: gameSessionState.currentPeriod, // Persisted
          gameStatus: gameSessionState.gameStatus, // Persisted
          seasonId: gameSessionState.seasonId, // USE gameSessionState
          tournamentId: gameSessionState.tournamentId, // USE gameSessionState
          gameLocation: gameSessionState.gameLocation,
          gameTime: gameSessionState.gameTime,
          demandFactor: gameSessionState.demandFactor,
          subIntervalMinutes: gameSessionState.subIntervalMinutes,
          completedIntervalDurations: gameSessionState.completedIntervalDurations,
          lastSubConfirmationTimeSeconds: gameSessionState.lastSubConfirmationTimeSeconds,
          showPlayerNames: gameSessionState.showPlayerNames, // from gameSessionState
          selectedPlayerIds: gameSessionState.selectedPlayerIds, // from gameSessionState
          gameEvents: gameSessionState.gameEvents, // from gameSessionState
          assessments: playerAssessments,

          // Other states
          playersOnField,
          opponents,
          drawings,
          tacticalDiscs,
          tacticalDrawings,
          tacticalBallPosition,
          availablePlayers: masterRosterQueryResultData || availablePlayers, // Master roster snapshot
          
          // Volatile timer states are intentionally EXCLUDED from the snapshot to be saved.
          // They are not part of GameData and should be re-initialized on load by the reducer.
        };

        // 2. Save the game snapshot using utility
          await utilSaveGame(currentGameId, currentSnapshot as AppState); // Cast to AppState for the util
        
        // 3. Save App Settings (only the current game ID) using utility
          await utilSaveCurrentGameIdSetting(currentGameId);

      } catch (error) {
        logger.error("Failed to auto-save state to localStorage:", error);
        alert("Error saving game."); // Notify user
      }
    } else if (initialLoadComplete && currentGameId === DEFAULT_GAME_ID) {
      logger.log("Not auto-saving as this is an unsaved game (no ID assigned yet)");
    }
    };
    autoSave();
    // Dependencies: Include all state variables that are part of the saved snapshot
  }, [initialLoadComplete, currentGameId,
      playersOnField, opponents, drawings, availablePlayers, masterRosterQueryResultData,
      // showPlayerNames, // REMOVED - Covered by gameSessionState
      // Local states that are part of the snapshot but not yet in gameSessionState:
      // gameEvents, // REMOVE - Now from gameSessionState
      gameSessionState,
      playerAssessments,
      tacticalDiscs,
      tacticalDrawings,
      tacticalBallPosition,
    ]);

  // **** ADDED: Effect to prompt for setup if default game ID is loaded ****
  useEffect(() => {
    logger.log('[Modal Trigger Effect] Running. initialLoadComplete:', initialLoadComplete, 'hasSkipped:', hasSkippedInitialSetup);
    // Only run the check *after* initial load is fully complete and setup hasn't been skipped
    if (initialLoadComplete && !hasSkippedInitialSetup) {
      // Check currentGameId *inside* the effect body
      if (currentGameId === DEFAULT_GAME_ID) {
        logger.log('Default game ID loaded, prompting for setup...');
      setIsNewGameSetupModalOpen(true);
      } else {
        logger.log('Not prompting: Specific game loaded.');
    }
    }
  // Depend only on load completion and skip status
  }, [initialLoadComplete, hasSkippedInitialSetup, currentGameId, setIsNewGameSetupModalOpen]);

  // --- Player Management Handlers (Updated for relative coords) ---
  // Wrapped handleDropOnField in useCallback as suggested
  const handleDropOnField = useCallback((playerId: string, relX: number, relY: number) => {
    const droppedPlayer = availablePlayers.find(p => p.id === playerId);
    if (droppedPlayer) {
      handlePlayerDrop(droppedPlayer, { relX, relY }); // Call the handler from the hook
    } else {
      logger.error(`Dropped player with ID ${playerId} not found in availablePlayers.`);
    }
  }, [availablePlayers, handlePlayerDrop]); 

  const handlePlayerMove = useCallback((playerId: string, relX: number, relY: number) => {
    // Update visual state immediately
    setPlayersOnField(prevPlayers => 
      prevPlayers.map(p => 
        p.id === playerId ? { ...p, relX, relY } : p
      )
    );
    // State saved on move end
  }, [setPlayersOnField]); // ADDED setPlayersOnField dependency

  const handlePlayerMoveEnd = useCallback(() => {
    saveStateToHistory({ playersOnField });
  }, [playersOnField, saveStateToHistory]);

  const handlePlayerRemove = useCallback((playerId: string) => {
    logger.log(`Removing player ${playerId} from field`);
    const updatedPlayersOnField = playersOnField.filter(p => p.id !== playerId);
    setPlayersOnField(updatedPlayersOnField); 
    saveStateToHistory({ playersOnField: updatedPlayersOnField });
  }, [playersOnField, saveStateToHistory, setPlayersOnField]); 
  


  // --- Reset Handler ---
  const handleResetField = useCallback(() => {
    if (isTacticsBoardView) {
      clearTacticalElements();
    } else {
      // Only clear game elements in normal view
      setPlayersOnField([]);
      setOpponents([]);
      setDrawings([]);
      saveStateToHistory({ playersOnField: [], opponents: [], drawings: [] });
    }
    }, [isTacticsBoardView, saveStateToHistory, setDrawings, setOpponents, setPlayersOnField, clearTacticalElements]);

  const handleClearDrawingsForView = () => {
    if (isTacticsBoardView) {
      setTacticalDrawings([]);
      saveStateToHistory({ tacticalDrawings: [] });
    } else {
      handleClearDrawings();
    }
  };

  // --- Touch Drag from Bar Handlers (Updated for relative coords) ---
  const handlePlayerDragStartFromBar = useCallback((playerInfo: Player) => {
    // This is now primarily for HTML Drag and Drop OR potential long-press drag
    setDraggingPlayerFromBarInfo(playerInfo);
    logger.log("Setting draggingPlayerFromBarInfo (Drag Start):", playerInfo);
  }, []);

  // NEW Handler for simple tap selection in the bar
  const handlePlayerTapInBar = useCallback((playerInfo: Player | null) => {
    // If the tapped player is already selected, deselect them
    if (draggingPlayerFromBarInfo?.id === playerInfo?.id) {
      logger.log("Tapped already selected player, deselecting:", playerInfo?.id);
      setDraggingPlayerFromBarInfo(null);
    } else {
      // Otherwise, select the tapped player
      logger.log("Setting draggingPlayerFromBarInfo (Tap):", playerInfo);
      setDraggingPlayerFromBarInfo(playerInfo);
    }
  }, [draggingPlayerFromBarInfo]); // Dependency needed

  const handlePlayerDropViaTouch = useCallback((relX: number, relY: number) => {
    // This handler might be less relevant now if tap-on-field works
    if (draggingPlayerFromBarInfo) {
      logger.log("Player Drop Via Touch (field):", { id: draggingPlayerFromBarInfo.id, relX, relY });
      handleDropOnField(draggingPlayerFromBarInfo.id, relX, relY); 
      setDraggingPlayerFromBarInfo(null); // Deselect player after placing
    }
  }, [draggingPlayerFromBarInfo, handleDropOnField]);

  const handlePlayerDragCancelViaTouch = useCallback(() => {
    setDraggingPlayerFromBarInfo(null);
  }, []);

  

  // --- Team Name Handler ---
  const handleTeamNameChange = (newName: string) => {
    const trimmedName = newName.trim();
    if (trimmedName) {
        logger.log("Updating team name to:", trimmedName);
        dispatchGameSession({ type: 'SET_TEAM_NAME', payload: trimmedName });
        // REMOVED: saveStateToHistory({ teamName: trimmedName }); 
    }
  };

  const applyHistoryState = (state: AppState) => {
    setPlayersOnField(state.playersOnField);
    setOpponents(state.opponents);
    setDrawings(state.drawings);
    setAvailablePlayers(state.availablePlayers);
    dispatchGameSession({ type: 'SET_TEAM_NAME', payload: state.teamName });
    dispatchGameSession({ type: 'SET_HOME_SCORE', payload: state.homeScore });
    dispatchGameSession({ type: 'SET_AWAY_SCORE', payload: state.awayScore });
    dispatchGameSession({ type: 'SET_OPPONENT_NAME', payload: state.opponentName });
    dispatchGameSession({ type: 'SET_GAME_DATE', payload: state.gameDate });
    dispatchGameSession({ type: 'SET_GAME_NOTES', payload: state.gameNotes });
    dispatchGameSession({ type: 'SET_NUMBER_OF_PERIODS', payload: state.numberOfPeriods });
    dispatchGameSession({ type: 'SET_PERIOD_DURATION', payload: state.periodDurationMinutes });
    dispatchGameSession({
      type: 'LOAD_STATE_FROM_HISTORY',
      payload: {
        currentPeriod: state.currentPeriod,
        gameStatus: state.gameStatus,
        completedIntervalDurations: state.completedIntervalDurations ?? [],
        lastSubConfirmationTimeSeconds: state.lastSubConfirmationTimeSeconds ?? 0,
        showPlayerNames: state.showPlayerNames,
        gameEvents: state.gameEvents,
        selectedPlayerIds: state.selectedPlayerIds,
        seasonId: state.seasonId,
        tournamentId: state.tournamentId,
        gameLocation: state.gameLocation,
        gameTime: state.gameTime,
      },
    });
    dispatchGameSession({ type: 'SET_SUB_INTERVAL', payload: state.subIntervalMinutes ?? 5 });
    dispatchGameSession({ type: 'SET_HOME_OR_AWAY', payload: state.homeOrAway });
    setTacticalDiscs(state.tacticalDiscs || []);
    setTacticalDrawings(state.tacticalDrawings || []);
    setTacticalBallPosition(state.tacticalBallPosition || null);
  };

  const handleUndo = () => {
    const prevState = undoHistory();
    if (prevState) {
      logger.log('Undoing...');
      applyHistoryState(prevState);
    } else {
      logger.log('Cannot undo: at beginning of history');
    }
  };

  const handleRedo = () => {
    const nextState = redoHistory();
    if (nextState) {
      logger.log('Redoing...');
      applyHistoryState(nextState);
    } else {
      logger.log('Cannot redo: at end of history');
    }
  };

  // --- Timer Handlers provided by useGameTimer ---

  const handleToggleLargeTimerOverlay = () => {
    setShowLargeTimerOverlay(!showLargeTimerOverlay);
  };


  // Handler to specifically deselect player when bar background is clicked
  const handleDeselectPlayer = () => {
    if (draggingPlayerFromBarInfo) { // Only log if there was a selection
      logger.log("Deselecting player by clicking bar background.");
      setDraggingPlayerFromBarInfo(null);
    }
  };


  // Handler to open/close the goal log modal
  const handleToggleGoalLogModal = () => {
    setIsGoalLogModalOpen(!isGoalLogModalOpen);
  };

  // Handler to add a goal event
  const handleAddGoalEvent = (scorerId: string, assisterId?: string) => {
    const scorer = (masterRosterQueryResultData || availablePlayers).find(p => p.id === scorerId);
    const assister = assisterId ? (masterRosterQueryResultData || availablePlayers).find(p => p.id === assisterId) : undefined;

    if (!scorer) {
      logger.error("Scorer not found!");
      return;
    }

    const newEvent: GameEvent = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'goal',
      time: gameSessionState.timeElapsedInSeconds, // Use from gameSessionState
      scorerId: scorer.id,
      assisterId: assister?.id,
    };
    
    // Dispatch actions to update game state via reducer
    dispatchGameSession({ type: 'ADD_GAME_EVENT', payload: newEvent });
    dispatchGameSession({ type: 'ADJUST_SCORE_FOR_EVENT', payload: { eventType: 'goal', action: 'add' } });
  };

  // NEW Handler to log an opponent goal
  const handleLogOpponentGoal = (time: number) => {
    logger.log(`Logging opponent goal at time: ${time}`);
    const newEvent: GameEvent = {
      id: `oppGoal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'opponentGoal',
      time: time, // Use provided time
      scorerId: 'opponent', 
    };

    dispatchGameSession({ type: 'ADD_GAME_EVENT', payload: newEvent });
    dispatchGameSession({ type: 'ADJUST_SCORE_FOR_EVENT', payload: { eventType: 'opponentGoal', action: 'add' } });
    setIsGoalLogModalOpen(false);
  };

  // Handler to update an existing game event
  const handleUpdateGameEvent = (updatedEvent: GameEvent) => {
    const cleanUpdatedEvent: GameEvent = { id: updatedEvent.id, type: updatedEvent.type, time: updatedEvent.time, scorerId: updatedEvent.scorerId, assisterId: updatedEvent.assisterId }; // Keep cleaning
    
    dispatchGameSession({ type: 'UPDATE_GAME_EVENT', payload: cleanUpdatedEvent });
    
    logger.log("Updated game event via dispatch:", updatedEvent.id);
  };

  // Handler to delete a game event
  const handleDeleteGameEvent = (goalId: string) => {
    const eventToDelete = gameSessionState.gameEvents.find(e => e.id === goalId);
    if (!eventToDelete) {
      logger.error("Event to delete not found in gameSessionState.gameEvents:", goalId);
      return;
    }

    dispatchGameSession({ type: 'DELETE_GAME_EVENT', payload: goalId });
    if (eventToDelete.type === 'goal' || eventToDelete.type === 'opponentGoal') {
      dispatchGameSession({ 
        type: 'ADJUST_SCORE_FOR_EVENT', 
        payload: { eventType: eventToDelete.type, action: 'delete' } 
      });
    }
    
    logger.log("Deleted game event via dispatch and updated state/history:", goalId);
  };
  // --- Button/Action Handlers ---
  
  // RENAMED & UPDATED Handler: Just opens the setup modal after confirmation
  
  
  // NEW: Handler to actually reset state and set opponent/date/type from modal
  // Update signature to accept seasonId/tournamentId from the modal
    // Update signature to accept seasonId/tournamentId from the modal
  
  // NEW: Handler to cancel the new game setup
  // const handleCancelNewGameSetup = useCallback(() => { // REMOVED this line
  //   logger.log("Cancelling new game setup.");
  //   setIsNewGameSetupModalOpen(false);
  // }, []);

  // Handler to open/close the stats modal
  const handleToggleGameStatsModal = () => {
    // If the modal is currently open, we are about to close it.
    if (isGameStatsModalOpen) {
      // Clear the selected player so it doesn't open to the same player next time.
      setSelectedPlayerForStats(null);
    }
    setIsGameStatsModalOpen(!isGameStatsModalOpen);
  };

  // Placeholder handlers for updating game info (will be passed to modal)
  const handleOpponentNameChange = (newName: string) => {
    logger.log('[page.tsx] handleOpponentNameChange called with:', newName);
    dispatchGameSession({ type: 'SET_OPPONENT_NAME', payload: newName });
  };
  const handleGameDateChange = (newDate: string) => {
    dispatchGameSession({ type: 'SET_GAME_DATE', payload: newDate });
  };
  // const handleHomeScoreChange = (newScore: number) => {
  //   dispatchGameSession({ type: 'SET_HOME_SCORE', payload: newScore });
  // };
  // const handleAwayScoreChange = (newScore: number) => {
  //   dispatchGameSession({ type: 'SET_AWAY_SCORE', payload: newScore });
  // };
  const handleGameNotesChange = (notes: string) => {
    dispatchGameSession({ type: 'SET_GAME_NOTES', payload: notes });
  };

  // --- Handlers for Game Structure ---
  const handleSetNumberOfPeriods = (periods: number) => { 
    // Keep the check inside
    if (periods === 1 || periods === 2) {
      // Keep the type assertion for the state setter
      const validPeriods = periods as (1 | 2); 
      dispatchGameSession({ type: 'SET_NUMBER_OF_PERIODS', payload: validPeriods });
      logger.log(`Number of periods set to: ${validPeriods}`);
    } else {
      logger.warn(`Invalid number of periods attempted: ${periods}. Must be 1 or 2.`);
    }
  };

  const handleSetPeriodDuration = (minutes: number) => {
    const safeMinutes = Number.isFinite(minutes) ? minutes : 1;
    const newMinutes = Math.max(1, safeMinutes);
    dispatchGameSession({ type: 'SET_PERIOD_DURATION', payload: newMinutes });
    logger.log(`Period duration set to: ${newMinutes} minutes`);
  };

  // Training Resources Modal
  const handleToggleTrainingResources = () => {
    setIsTrainingResourcesOpen(!isTrainingResourcesOpen);
  };

  const handleToggleInstructionsModal = () => {
    if (isInstructionsModalOpen) {
      saveHasSeenAppGuide(true);
    }
    setIsInstructionsModalOpen(!isInstructionsModalOpen);
  };

  const handleShowAppGuide = () => {
    saveHasSeenAppGuide(false);
    setIsSettingsModalOpen(false);
    setIsInstructionsModalOpen(true);
  };

  // NEW: Handler for Hard Reset
  const handleHardResetApp = useCallback(async () => {
    if (window.confirm(t('controlBar.hardResetConfirmation', 'Are you sure you want to completely reset the application? All saved data (players, stats, positions) will be permanently lost.'))) {
      try {
        logger.log("Performing hard reset using utility...");
        await utilResetAppSettings(); // Use utility function
        window.location.reload();
      } catch (error) {
        logger.error("Error during hard reset:", error);
        alert("Failed to reset application data.");
      }
    }
  }, [t]);

  const handleCreateAndSendBackup = async () => {
    try {
      const json = await exportFullBackup();
      if (backupEmail) {
        await sendBackupEmail(json, backupEmail);
      }
      const iso = new Date().toISOString();
      setLastBackupTime(iso);
      utilUpdateAppSettings({ lastBackupTime: iso }).catch(() => {});
      alert(t('settingsModal.sendBackupSuccess', 'Backup sent successfully.'));
    } catch (err) {
      logger.error('Failed to send backup', err);
      alert(t('settingsModal.sendBackupError', 'Failed to send backup.'));
    }
  };

  
  // Placeholder handlers for Save/Load Modals

  const handleOpenLoadGameModal = () => {
    logger.log("Opening Load Game Modal...");
    setIsLoadGameModalOpen(true);
  };

  const handleCloseLoadGameModal = () => {
    setIsLoadGameModalOpen(false);
  };

  const handleOpenSeasonTournamentModal = () => {
    setIsSeasonTournamentModalOpen(true);
  };

  const handleCloseSeasonTournamentModal = () => {
    setIsSeasonTournamentModalOpen(false);
  };


  // Function to handle loading a selected game
  const handleLoadGame = async (gameId: string) => {
    logger.log(`[handleLoadGame] Attempting to load game: ${gameId}`);
    
    // Clear any existing timer state before loading a new game
    removeLocalStorageItem(TIMER_STATE_KEY);
    
    setProcessingGameId(gameId);
    setIsGameLoading(true);
    setGameLoadError(null);

    const gameDataToLoad = savedGames[gameId] as AppState | undefined; // Ensure this is AppState

    if (gameDataToLoad) {
      try {
        // Dispatch to reducer to load the game state
        loadGameStateFromData(gameDataToLoad); // This now primarily uses the reducer

        // Update current game ID and save settings
        setCurrentGameId(gameId);
        await utilSaveCurrentGameIdSetting(gameId);

        logger.log(`Game ${gameId} load dispatched to reducer.`);
        handleCloseLoadGameModal();

      } catch(error) {
          logger.error("Error processing game load:", error);
          setGameLoadError(t('loadGameModal.errors.loadFailed', 'Error loading game state. Please try again.'));
      } finally {
        setIsGameLoading(false);
        setProcessingGameId(null);
      }
    } else {
      logger.error(`Game state not found for ID: ${gameId}`);
      setGameLoadError(t('loadGameModal.errors.notFound', 'Could not find saved game: {gameId}', { gameId }));
      setIsGameLoading(false);
      setProcessingGameId(null);
    }
  };

  // Function to handle deleting a saved game
  const handleDeleteGame = async (gameId: string) => {
    logger.log(`Deleting game with ID: ${gameId}`);
    if (gameId === DEFAULT_GAME_ID) {
      logger.warn("Cannot delete the default unsaved state.");
      setGameDeleteError(t('loadGameModal.errors.cannotDeleteDefault', 'Cannot delete the current unsaved game progress.'));
      return; // Prevent deleting the default placeholder
    }

    setGameDeleteError(null);
    setIsGameDeleting(true);
    setProcessingGameId(gameId);

    try {
      const deletedGameId = await utilDeleteGame(gameId);

      if (deletedGameId) {
      const updatedSavedGames = { ...savedGames };
        delete updatedSavedGames[gameId];
      setSavedGames(updatedSavedGames);
        logger.log(`Game ${gameId} deleted from state and persistence.`);

        if (currentGameId === gameId) {
          const latestId = getLatestGameId(updatedSavedGames);
          if (latestId) {
            logger.log(`Deleted active game. Loading latest game ${latestId}.`);
            setCurrentGameId(latestId);
            await utilSaveCurrentGameIdSetting(latestId);
          } else {
            logger.log("Currently loaded game was deleted with no other games remaining. Resetting to initial state.");
            dispatchGameSession({ type: 'RESET_TO_INITIAL_STATE', payload: initialGameSessionData });
            setPlayersOnField(initialState.playersOnField || []);
            setOpponents(initialState.opponents || []);
            setDrawings(initialState.drawings || []);
            resetHistory(initialState as AppState);
            setCurrentGameId(DEFAULT_GAME_ID);
            await utilSaveCurrentGameIdSetting(DEFAULT_GAME_ID);
          }
        }
      } else {
        // ... (existing error handling)
        logger.warn(`handleDeleteGame: utilDeleteGame returned null for gameId: ${gameId}. Game might not have been found or ID was invalid.`);
        setGameDeleteError(t('loadGameModal.errors.deleteFailedNotFound', 'Error deleting game: {gameId}. Game not found or ID was invalid.', { gameId }));
      }
    } catch (error) {
      // ... (existing error handling)
      const errorMessage = error instanceof Error ? error.message : String(error);
      setGameDeleteError(t('loadGameModal.errors.deleteFailedCatch', 'Error deleting saved game: {gameId}. Details: {errorMessage}', { gameId, errorMessage }));
    } finally {
      setIsGameDeleting(false);
      setProcessingGameId(null);
    }
  };

  // Function to export all saved games as a single JSON file (RENAMED & PARAMETERIZED)
  // const handleExportAllGamesJson = () => { // This function is no longer used
  //   // ...
  // };

  // Helper functions moved to exportGames util
  
  // --- INDIVIDUAL GAME EXPORT HANDLERS ---
  const handleExportOneJson = (gameId: string) => {
    const gameData = savedGames[gameId];
    if (!gameData) {
      alert(`Error: Could not find game data for ${gameId}`);
      return;
    }
    exportJson(gameId, gameData, seasons, tournaments);
  };

  const handleExportOneCsv = (gameId: string) => {
    const gameData = savedGames[gameId];
    if (!gameData) {
      alert(`Error: Could not find game data for ${gameId}`);
      return;
    }
    exportCsv(gameId, gameData, availablePlayers, seasons, tournaments);
  };

  // --- END INDIVIDUAL GAME EXPORT HANDLERS ---

  // --- Roster Management Handlers ---
  const openRosterModal = () => {
    logger.log('[openRosterModal] Called. Setting highlightRosterButton to false.'); // Log modal open
    setIsRosterModalOpen(true);
    setHighlightRosterButton(false); // <<< Remove highlight when modal is opened
  };

  const openPlayerAssessmentModal = () => setIsPlayerAssessmentModalOpen(true);
  const closePlayerAssessmentModal = () => setIsPlayerAssessmentModalOpen(false);

  const handleSavePlayerAssessment = async (
    playerId: string,
    assessment: Partial<PlayerAssessment>,
  ) => {
    if (!currentGameId) return;
    const data: PlayerAssessment = {
      ...(assessment as PlayerAssessment),
      minutesPlayed: 0,
      createdAt: Date.now(),
      createdBy: 'local',
    };
    const updated = await saveAssessment(playerId, data);
    if (updated) {
      setSavedGames(prev => ({ ...prev, [currentGameId]: updated }));
    }
  };

  const handleDeletePlayerAssessment = async (playerId: string) => {
    if (!currentGameId) return;
    const updated = await deleteAssessment(playerId);
    if (updated) {
      setSavedGames(prev => ({ ...prev, [currentGameId]: updated }));
    }
  };
  
  
  // ... (other code in Home component) ...

  const closeRosterModal = () => setIsRosterModalOpen(false);

  // --- ASYNC Roster Management Handlers for RosterSettingsModal ---
  const handleRenamePlayerForModal = useCallback(async (playerId: string, playerData: { name: string; nickname?: string }) => {
    logger.log(`[Page.tsx] handleRenamePlayerForModal attempting mutation for ID: ${playerId}, new name: ${playerData.name}`);
    setRosterError(null); // Clear previous specific errors
    try {
      await handleUpdatePlayer(playerId, { name: playerData.name, nickname: playerData.nickname });
      logger.log(`[Page.tsx] rename player success for ${playerId}.`);
    } catch (error) {
      logger.error(`[Page.tsx] Exception during rename of ${playerId}:`, error);
    }
  }, [handleUpdatePlayer, setRosterError]);
  
  const handleSetJerseyNumberForModal = useCallback(async (playerId: string, jerseyNumber: string) => {
    logger.log(`[Page.tsx] handleSetJerseyNumberForModal attempting mutation for ID: ${playerId}, new number: ${jerseyNumber}`);
    setRosterError(null);

    try {
      await handleUpdatePlayer(playerId, { jerseyNumber });
      logger.log(`[Page.tsx] jersey number update successful for ${playerId}.`);
    } catch (error) {
      logger.error(`[Page.tsx] Exception during jersey number update of ${playerId}:`, error);
    }
  }, [handleUpdatePlayer, setRosterError]);

  const handleSetPlayerNotesForModal = useCallback(async (playerId: string, notes: string) => {
    logger.log(`[Page.tsx] handleSetPlayerNotesForModal attempting mutation for ID: ${playerId}`);
    setRosterError(null);

    try {
      await handleUpdatePlayer(playerId, { notes });
      logger.log(`[Page.tsx] notes update successful for ${playerId}.`);
    } catch (error) {
      logger.error(`[Page.tsx] Exception during notes update of ${playerId}:`, error);
    }
  }, [handleUpdatePlayer, setRosterError]);

      // ... (rest of the code remains unchanged)

    const handleRemovePlayerForModal = useCallback(async (playerId: string) => {
      logger.log(`[Page.tsx] handleRemovePlayerForModal attempting mutation for ID: ${playerId}`);
      setRosterError(null);

      try {
        await handleRemovePlayer(playerId);
        logger.log(`[Page.tsx] player removed: ${playerId}.`);
      } catch (error) {
        logger.error(`[Page.tsx] Exception during removal of ${playerId}:`, error);
      }
    }, [handleRemovePlayer, setRosterError]);

    // ... (rest of the code remains unchanged)

    const handleAddPlayerForModal = useCallback(async (playerData: { name: string; jerseyNumber: string; notes: string; nickname: string }) => {
      logger.log('[Page.tsx] handleAddPlayerForModal attempting to add player:', playerData);
      setRosterError(null); // Clear previous specific errors first

      const currentRoster = masterRosterQueryResultData || [];
      const newNameTrimmedLower = playerData.name.trim().toLowerCase();
      const newNumberTrimmed = playerData.jerseyNumber.trim();

      // Check for empty name after trimming
      if (!newNameTrimmedLower) {
        setRosterError(t('rosterSettingsModal.errors.nameRequired', 'Player name cannot be empty.'));
        return;
      }

      // Check for duplicate name (case-insensitive)
      const nameExists = currentRoster.some(p => p.name.trim().toLowerCase() === newNameTrimmedLower);
      if (nameExists) {
        setRosterError(t('rosterSettingsModal.errors.duplicateName', 'A player with this name already exists. Please use a different name.'));
        return;
      }

      // Check for duplicate jersey number (only if a number is provided and not empty)
      if (newNumberTrimmed) {
        const numberExists = currentRoster.some(p => p.jerseyNumber && p.jerseyNumber.trim() === newNumberTrimmed);
        if (numberExists) {
          setRosterError(t('rosterSettingsModal.errors.duplicateNumber', 'A player with this jersey number already exists. Please use a different number or leave it blank.'));
          return;
        }
      }

      // If all checks pass, proceed with the mutation
      try {
        logger.log('[Page.tsx] No duplicates found. Proceeding with addPlayer for:', playerData);
        await handleAddPlayer(playerData);
        logger.log(`[Page.tsx] add player success: ${playerData.name}.`);
      } catch (error) {
        // This catch block is for unexpected errors directly from mutateAsync call itself (e.g., network issues before mutationFn runs).
        // Errors from within mutationFn (like from the addPlayer utility) should ideally be handled by the mutation's onError callback.
        logger.error(`[Page.tsx] Exception during addPlayerMutation.mutateAsync for player ${playerData.name}:`, error);
        // Set a generic error message if rosterError hasn't been set by the mutation's onError callback.
        setRosterError(t('rosterSettingsModal.errors.addFailed', 'Error adding player {playerName}. Please try again.', { playerName: playerData.name }));
      }
    }, [masterRosterQueryResultData, handleAddPlayer, t, setRosterError]);

    // ... (rest of the code remains unchanged)

  const handleToggleGoalieForModal = useCallback(async (playerId: string) => {
    const player = availablePlayers.find(p => p.id === playerId);
    if (!player) {
        logger.error(`[Page.tsx] Player ${playerId} not found in availablePlayers for goalie toggle.`);
        setRosterError(t('rosterSettingsModal.errors.playerNotFound', 'Player not found. Cannot toggle goalie status.'));
        return;
    }
    const targetGoalieStatus = !player.isGoalie;
    logger.log(`[Page.tsx] handleToggleGoalieForModal attempting mutation for ID: ${playerId}, target status: ${targetGoalieStatus}`);
    
    setRosterError(null); // Clear previous specific errors

    try {
      await handleSetGoalieStatus(playerId, targetGoalieStatus);
      logger.log(`[Page.tsx] goalie toggle success for ${playerId}.`);
    } catch (error) {
      logger.error(`[Page.tsx] Exception during goalie toggle of ${playerId}:`, error);
    }
  }, [availablePlayers, handleSetGoalieStatus, setRosterError, t]);

  // --- END Roster Management Handlers ---

  // --- NEW: Handler to Award Fair Play Card ---
  const handleAwardFairPlayCard = useCallback(async (playerId: string | null) => {
      // <<< ADD LOG HERE >>>
      logger.log(`[page.tsx] handleAwardFairPlayCard called with playerId: ${playerId}`);
      logger.log(`[page.tsx] availablePlayers BEFORE update:`, JSON.stringify(availablePlayers.map(p => ({id: p.id, fp: p.receivedFairPlayCard}))));
      logger.log(`[page.tsx] playersOnField BEFORE update:`, JSON.stringify(playersOnField.map(p => ({id: p.id, fp: p.receivedFairPlayCard}))));

      if (!currentGameId || currentGameId === DEFAULT_GAME_ID) {
          logger.warn("Cannot award fair play card in unsaved/default state.");
          return; // Prevent awarding in default state
      }

      let updatedAvailablePlayers = availablePlayers;
      let updatedPlayersOnField = playersOnField;

      // Find the currently awarded player, if any
      const currentlyAwardedPlayerId = availablePlayers.find(p => p.receivedFairPlayCard)?.id;

      // If the selected ID is the same as the current one, we are toggling it OFF.
      // If the selected ID is different, we are changing the award.
      // If the selected ID is null, we are clearing the award.

      // Clear any existing card first
      if (currentlyAwardedPlayerId) {
          updatedAvailablePlayers = updatedAvailablePlayers.map(p =>
              p.id === currentlyAwardedPlayerId ? { ...p, receivedFairPlayCard: false } : p
          );
          updatedPlayersOnField = updatedPlayersOnField.map(p =>
              p.id === currentlyAwardedPlayerId ? { ...p, receivedFairPlayCard: false } : p
          );
      }

      // Award the new card if a playerId is provided (and it's different from the one just cleared)
      if (playerId && playerId !== currentlyAwardedPlayerId) {
          // <<< MODIFY LOGGING HERE >>>
          updatedAvailablePlayers = updatedAvailablePlayers.map(p =>
              p.id === playerId ? { ...p, receivedFairPlayCard: true } : p
          );
          updatedPlayersOnField = updatedPlayersOnField.map(p =>
              p.id === playerId ? { ...p, receivedFairPlayCard: true } : p
          );
          logger.log(`[page.tsx] Awarding card to ${playerId}`);
      } else {
          // <<< ADD LOG HERE >>>
          logger.log(`[page.tsx] Clearing card (or toggling off). PlayerId: ${playerId}, Currently Awarded: ${currentlyAwardedPlayerId}`);
      }
      // If playerId is null, we only cleared the existing card.
      // If playerId is the same as currentlyAwardedPlayerId, we cleared it and don't re-award.

      // <<< ADD LOG HERE >>>
      logger.log(`[page.tsx] availablePlayers AFTER update logic:`, JSON.stringify(updatedAvailablePlayers.map(p => ({id: p.id, fp: p.receivedFairPlayCard}))));
      logger.log(`[page.tsx] playersOnField AFTER update logic:`, JSON.stringify(updatedPlayersOnField.map(p => ({id: p.id, fp: p.receivedFairPlayCard}))));

      // <<< ADD LOG HERE >>>
      logger.log(`[page.tsx] Calling setAvailablePlayers and setPlayersOnField...`);
      setAvailablePlayers(updatedAvailablePlayers);
      setPlayersOnField(updatedPlayersOnField);
      // Save updated global roster
      // localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(updatedAvailablePlayers));
      try {
        const success = await saveMasterRoster(updatedAvailablePlayers);
        if (!success) {
          logger.error('[page.tsx] handleAwardFairPlayCard: Failed to save master roster using utility.');
          // Optionally, set an error state to inform the user
        }
      } catch (error) {
        logger.error('[page.tsx] handleAwardFairPlayCard: Error calling saveMasterRoster utility:', error);
        // Optionally, set an error state
      }
      // <<< ADD LOG HERE >>>
      logger.log(`[page.tsx] Calling saveStateToHistory... ONLY for playersOnField`);
      // Save ONLY the playersOnField change to the game history, not the global roster
      saveStateToHistory({ playersOnField: updatedPlayersOnField });

      logger.log(`[page.tsx] Updated Fair Play card award. ${playerId ? `Awarded to ${playerId}` : 'Cleared'}`);
    }, [availablePlayers, playersOnField, setAvailablePlayers, setPlayersOnField, saveStateToHistory, currentGameId]);

  // --- NEW: Handler to Toggle Player Selection for Current Match ---
  const handleTogglePlayerSelection = (playerId: string) => {
    const currentSelectedIds = gameSessionState.selectedPlayerIds;
    const isSelected = currentSelectedIds.includes(playerId);
    
    let newSelectedIds;
    if (isSelected) {
      // If player is already selected, remove them
      newSelectedIds = currentSelectedIds.filter(id => id !== playerId);
    } else {
      // If player is not selected, add them
      newSelectedIds = [...currentSelectedIds, playerId];
    }

    dispatchGameSession({ type: 'SET_SELECTED_PLAYER_IDS', payload: newSelectedIds });
  };

  const handleUpdateSelectedPlayers = (playerIds: string[]) => {
    // This function is used by GameSettingsModal to set the roster for that specific game.
    // It replaces the entire selection.
    dispatchGameSession({ type: 'SET_SELECTED_PLAYER_IDS', payload: playerIds });
  };

  // --- NEW: Quick Save Handler ---
  const handleQuickSaveGame = useCallback(async () => {
    if (currentGameId && currentGameId !== DEFAULT_GAME_ID) {
      logger.log(`Quick saving game with ID: ${currentGameId}`);
      try {
        // 1. Create the current game state snapshot
        const currentSnapshot: AppState = {
          playersOnField,
          opponents,
          drawings,
          tacticalDiscs,
          tacticalDrawings,
          tacticalBallPosition,
          availablePlayers: availablePlayers, // <<< ADD BACK: Include roster available *at time of save*
          showPlayerNames: gameSessionState.showPlayerNames, // USE gameSessionState
          teamName: gameSessionState.teamName,
          gameEvents: gameSessionState.gameEvents, // USE gameSessionState
          assessments: playerAssessments,
          opponentName: gameSessionState.opponentName,
          gameDate: gameSessionState.gameDate,
          homeScore: gameSessionState.homeScore,
          awayScore: gameSessionState.awayScore,
          gameNotes: gameSessionState.gameNotes,
          numberOfPeriods: gameSessionState.numberOfPeriods, // Use gameSessionState
          periodDurationMinutes: gameSessionState.periodDurationMinutes, // Use gameSessionState
          currentPeriod: gameSessionState.currentPeriod, // Use gameSessionState
          gameStatus: gameSessionState.gameStatus, // Use gameSessionState
          selectedPlayerIds: gameSessionState.selectedPlayerIds, // CORRECTED
          seasonId: gameSessionState.seasonId,                // CORRECTED (anticipating migration)
          tournamentId: gameSessionState.tournamentId,          // CORRECTED (anticipating migration)
          gameLocation: gameSessionState.gameLocation,          // CORRECTED (anticipating migration)
          gameTime: gameSessionState.gameTime, 
          // Add timer related state (persisted ones)
          subIntervalMinutes: gameSessionState.subIntervalMinutes, // Use gameSessionState for subIntervalMinutes
          completedIntervalDurations: gameSessionState.completedIntervalDurations, // Use gameSessionState for completedIntervalDurations
          lastSubConfirmationTimeSeconds: gameSessionState.lastSubConfirmationTimeSeconds, // Use gameSessionState for lastSubConfirmationTimeSeconds
          homeOrAway: gameSessionState.homeOrAway,
          // VOLATILE TIMER STATES ARE EXCLUDED:
          // timeElapsedInSeconds: gameSessionState.timeElapsedInSeconds, // REMOVE from AppState snapshot
          // isTimerRunning: gameSessionState.isTimerRunning, // REMOVE from AppState snapshot
          // nextSubDueTimeSeconds: gameSessionState.nextSubDueTimeSeconds, // REMOVE from AppState snapshot
          // subAlertLevel: gameSessionState.subAlertLevel, // REMOVE from AppState snapshot
        };

        // 2. Update the savedGames state and localStorage
        const updatedSavedGames = { ...savedGames, [currentGameId]: currentSnapshot };
        setSavedGames(updatedSavedGames);
        // localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(updatedSavedGames));
        await utilSaveGame(currentGameId, currentSnapshot); // Use utility function
        await utilSaveCurrentGameIdSetting(currentGameId); // Save current game ID setting

        // 3. Update history to reflect the saved state
        // This makes the quick save behave like loading a game, resetting undo/redo
        resetHistory(currentSnapshot);

        logger.log(`Game quick saved successfully with ID: ${currentGameId}`);
        showToast('Game saved!');

      } catch (error) {
        logger.error("Failed to quick save game state:", error);
        alert("Error quick saving game.");
      }
    } else {
      // If no current game ID, create a new saved game entry
      try {
        const newSnapshot: AppState = {
          playersOnField,
          opponents,
          drawings,
          tacticalDiscs,
          tacticalDrawings,
          tacticalBallPosition,
          availablePlayers: availablePlayers,
          showPlayerNames: gameSessionState.showPlayerNames,
          teamName: gameSessionState.teamName,
          gameEvents: gameSessionState.gameEvents,
          opponentName: gameSessionState.opponentName,
          gameDate: gameSessionState.gameDate,
          homeScore: gameSessionState.homeScore,
          awayScore: gameSessionState.awayScore,
          gameNotes: gameSessionState.gameNotes,
          numberOfPeriods: gameSessionState.numberOfPeriods,
          periodDurationMinutes: gameSessionState.periodDurationMinutes,
          currentPeriod: gameSessionState.currentPeriod,
          gameStatus: gameSessionState.gameStatus,
          selectedPlayerIds: gameSessionState.selectedPlayerIds,
          seasonId: gameSessionState.seasonId,
          tournamentId: gameSessionState.tournamentId,
          gameLocation: gameSessionState.gameLocation,
          gameTime: gameSessionState.gameTime,
          subIntervalMinutes: gameSessionState.subIntervalMinutes,
          completedIntervalDurations: gameSessionState.completedIntervalDurations,
          lastSubConfirmationTimeSeconds: gameSessionState.lastSubConfirmationTimeSeconds,
          homeOrAway: gameSessionState.homeOrAway,
        };

        const { gameId, gameData } = await createGame(newSnapshot);
        setSavedGames(prev => ({ ...prev, [gameId]: gameData }));
        setCurrentGameId(gameId);
        await utilSaveCurrentGameIdSetting(gameId);
        resetHistory(gameData);
        showToast('Game saved!');
      } catch (error) {
        logger.error('Failed to save new game:', error);
        alert('Error quick saving game.');
      }
    }
  },    [
    currentGameId,
    savedGames,
    playersOnField,
    opponents,
    drawings,
    tacticalDiscs,
    tacticalDrawings,
    tacticalBallPosition,
    availablePlayers,
    setSavedGames,
    resetHistory,
    showToast,
    gameSessionState, // This now covers all migrated game session fields
    playerAssessments
  ]);
  // --- END Quick Save Handler ---

  // --- NEW: Handlers for Game Settings Modal --- 
  const handleOpenGameSettingsModal = () => {
      setIsGameSettingsModalOpen(true); // Corrected State Setter
  };
  const handleCloseGameSettingsModal = () => {
    setIsGameSettingsModalOpen(false); // Corrected State Setter
  };
  const handleOpenSettingsModal = () => {
    getAppSettings().then((s) => {
      setAutoBackupEnabled(s.autoBackupEnabled ?? false);
      setBackupIntervalHours(s.autoBackupIntervalHours ?? 24);
      setLastBackupTime(s.lastBackupTime ?? null);
      setBackupEmail(s.backupEmail ?? '');
    });
    setIsSettingsModalOpen(true);
  };
  const handleCloseSettingsModal = () => {
    setIsSettingsModalOpen(false);
  };

  // --- Placeholder Handlers for GameSettingsModal (will be implemented properly later) ---
  const handleGameLocationChange = (location: string) => {
    dispatchGameSession({ type: 'SET_GAME_LOCATION', payload: location });
    // REMOVED: saveStateToHistory({ gameLocation: location });
  };
  const handleGameTimeChange = (time: string) => {
    dispatchGameSession({ type: 'SET_GAME_TIME', payload: time });
    // REMOVED: saveStateToHistory({ gameTime: time });
  };

  const handleAgeGroupChange = (group: string) => {
    dispatchGameSession({ type: 'SET_AGE_GROUP', payload: group });
  };

  const handleTournamentLevelChange = (level: string) => {
    dispatchGameSession({ type: 'SET_TOURNAMENT_LEVEL', payload: level });
  };

  const handleSetDemandFactor = (factor: number) => {
    dispatchGameSession({ type: 'SET_DEMAND_FACTOR', payload: factor });
  };

  // Add handler for home/away status
  const handleSetHomeOrAway = (status: 'home' | 'away') => {
    dispatchGameSession({ type: 'SET_HOME_OR_AWAY', payload: status });
    // REMOVED: saveStateToHistory({ homeOrAway: status });
  };

  // --- NEW Handlers for Setting Season/Tournament ID ---
  const handleSetSeasonId = useCallback((newSeasonId: string | undefined) => {
    const idToSet = newSeasonId || ''; // Ensure empty string instead of null
    logger.log('[page.tsx] handleSetSeasonId called with:', idToSet);
    dispatchGameSession({ type: 'SET_SEASON_ID', payload: idToSet }); 
  }, []); // No dependencies needed since we're only using dispatchGameSession which is stable

  const handleSetTournamentId = useCallback((newTournamentId: string | undefined) => {
    const idToSet = newTournamentId || ''; // Ensure empty string instead of null
    logger.log('[page.tsx] handleSetTournamentId called with:', idToSet);
    dispatchGameSession({ type: 'SET_TOURNAMENT_ID', payload: idToSet });
  }, []); // No dependencies needed since we're only using dispatchGameSession which is stable

  // --- AGGREGATE EXPORT HANDLERS --- 
  
  // ENSURE this function is commented out
  // Helper to get Filter Name (Season/Tournament)
  // const getFilterContextName = (tab: string, filterId: string, seasons: Season[], tournaments: Tournament[]): string => {
  //   if (tab === 'season' && filterId !== 'all') {
  //       return seasons.find(s => s.id === filterId)?.name || filterId;
  //   }
  //   if (tab === 'tournament' && filterId !== 'all') {
  //       return tournaments.find(t => t.id === filterId)?.name || filterId;
  //   }
  //   if (tab === 'overall') return 'Overall';
  //   return 'Unknown Filter'; // Fallback
  // };
  
  const handleExportAggregateJson = useCallback((gameIds: string[], aggregateStats: import('@/types').PlayerStatRow[]) => {
    if (gameIds.length === 0) {
      alert(t('export.noGamesInSelection', 'No games match the current filter.'));
      return;
    }
    const gamesData = gameIds.reduce((acc, id) => {
      const gameData = savedGames[id];
      if (gameData) {
        acc[id] = gameData;
      }
      return acc;
    }, {} as SavedGamesCollection);
    exportAggregateJson(gamesData, aggregateStats);
  }, [savedGames, t]);

  const handleExportAggregateCsv = useCallback((gameIds: string[], aggregateStats: import('@/types').PlayerStatRow[]) => {
    if (gameIds.length === 0) {
      alert(t('export.noGamesInSelection', 'No games match the current filter.'));
      return;
    }
    const gamesData = gameIds.reduce((acc, id) => {
      const gameData = savedGames[id];
      if (gameData) {
        acc[id] = gameData;
      }
      return acc;
    }, {} as SavedGamesCollection);
    exportAggregateCsv(gamesData, aggregateStats);
  }, [savedGames, t]);

  // --- END AGGREGATE EXPORT HANDLERS ---

  // --- Handler that is called when setup modal is confirmed ---
  const handleStartNewGameWithSetup = useCallback(async (
    initialSelectedPlayerIds: string[],
    homeTeamName: string, // <-- Add parameter
    opponentName: string,
    gameDate: string,
    gameLocation: string,
    gameTime: string,
    seasonId: string | null,
    tournamentId: string | null,
    numPeriods: 1 | 2, // Parameter
    periodDuration: number, // Parameter
    homeOrAway: 'home' | 'away', // <<< Step 4b: Add parameter
    demandFactor: number,
    ageGroup: string,
    tournamentLevel: string
  ) => {
      // ADD LOGGING HERE:
      logger.log('[handleStartNewGameWithSetup] Received Params:', { 
        initialSelectedPlayerIds,
        homeTeamName, 
        opponentName, 
        gameDate, 
        gameLocation, 
        gameTime, 
        seasonId, 
        tournamentId, 
        numPeriods,
        periodDuration,
        homeOrAway,
        demandFactor,
        ageGroup,
        tournamentLevel
      });
      // No need to log initialState references anymore

      // Determine the player selection for the new game
      const finalSelectedPlayerIds = initialSelectedPlayerIds && initialSelectedPlayerIds.length > 0 
          ? initialSelectedPlayerIds 
          : availablePlayers.map(p => p.id); // Fallback to all players if none provided

      // 1. Manually construct the new game state EXPLICITLY
      const newGameState: AppState = {
          opponentName: opponentName,
          gameDate: gameDate,
          gameLocation: gameLocation,
          gameTime: gameTime,
          seasonId: seasonId || '',
          tournamentId: tournamentId || '',
          ageGroup: ageGroup,
          tournamentLevel: tournamentLevel,
          numberOfPeriods: numPeriods, // Use parameter
          periodDurationMinutes: periodDuration, // Use parameter
          homeScore: 0,
          awayScore: 0,
          gameNotes: '',
          teamName: homeTeamName, // Use current teamName state
          homeOrAway: homeOrAway, // <<< Step 4b: Use parameter value
          demandFactor: demandFactor,
          availablePlayers: availablePlayers, // <<< ADD: Use current global roster
          selectedPlayerIds: finalSelectedPlayerIds, // <-- USE PASSED OR FALLBACK
          playersOnField: [], // Always start with empty field
          opponents: [], // Always start with empty opponents
          showPlayerNames: true, // Default visibility
          drawings: [], // Always start with empty drawings
          gameEvents: [], // Always start with empty events
          currentPeriod: 1, // Always start at period 1
          gameStatus: 'notStarted', // Always start as not started
          tacticalDiscs: [],
          tacticalDrawings: [],
          // Timer/Sub State - Use TOP-LEVEL initialState defaults (or current settings?)
          // Let's stick with initialState defaults for timer/sub settings for now
          subIntervalMinutes: initialState.subIntervalMinutes ?? 5,
          completedIntervalDurations: [], // Always reset intervals
          lastSubConfirmationTimeSeconds: 0, // Always reset last sub time
          tacticalBallPosition: { relX: 0.5, relY: 0.5 },
      };

      // Log the constructed state *before* saving
      // logger.log('[handleStartNewGameWithSetup] Constructed newGameState:', {
      //     periods: newGameState.numberOfPeriods,
      //     duration: newGameState.periodDurationMinutes,
      //     // REMOVED: numAvailablePlayers: newGameState.availablePlayers.length // Log roster size
      // });
      logger.log('[handleStartNewGameWithSetup] DIRECTLY CONSTRUCTED newGameState:', JSON.parse(JSON.stringify(newGameState)));

      // 2. Auto-generate ID
      const newGameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 3. Explicitly save the new game state immediately to state and localStorage
      try {
        const updatedSavedGamesCollection = {
          ...savedGames,
          [newGameId]: newGameState
        };
        setSavedGames(updatedSavedGamesCollection);
        // localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(updatedSavedGames)); // OLD
        // logger.log(`Explicitly saved initial state for new game ID: ${newGameId}`); // OLD

        // const currentSettings: AppSettings = { currentGameId: newGameId }; // OLD
        // localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(currentSettings)); // OLD
        // logger.log(`Updated app settings with new game ID: ${newGameId}`); // OLD

        await utilSaveGame(newGameId, newGameState);
        await utilSaveCurrentGameIdSetting(newGameId);
        logger.log(`Saved new game ${newGameId} and settings via utility functions.`);

      } catch (error) {
         logger.error("Error explicitly saving new game state:", error);
      }

      // 4. Reset History with the new state
      resetHistory(newGameState);

      // 5. Set the current game ID - This will trigger the loading useEffect
      setCurrentGameId(newGameId);
      logger.log(`Set current game ID to: ${newGameId}. Loading useEffect will sync component state.`);

      // Close the setup modal
      setIsNewGameSetupModalOpen(false);
      setNewGameDemandFactor(1);

      // <<< Trigger the roster button highlight >>>
      logger.log('[handleStartNewGameWithSetup] Setting highlightRosterButton to true.'); // Log highlight trigger
      setHighlightRosterButton(true);

  }, [
    // Keep necessary dependencies
    savedGames,
    availablePlayers,
    setSavedGames,
    resetHistory,
    setCurrentGameId,
    setIsNewGameSetupModalOpen,
    setHighlightRosterButton,
  ]);

  // ** REVERT handleCancelNewGameSetup TO ORIGINAL **
  const handleCancelNewGameSetup = useCallback(() => {
    logger.log("New game setup skipped/cancelled.");
    // REMOVED call to handleStartNewGameWithSetup
    // // Initialize with default values similar to handleStartNewGameWithSetup
    // const defaultOpponent = ''; // Empty opponent name
    // ... (rest of default value setup removed)
    // // Call the main setup function with defaults
    // handleStartNewGameWithSetup(
    //     ...
    // );

    setHasSkippedInitialSetup(true); // Still mark as skipped if needed elsewhere
    setIsNewGameSetupModalOpen(false); // ADDED: Explicitly close the modal
    setNewGameDemandFactor(1);

  // REMOVED initialState from dependencies
  }, [setHasSkippedInitialSetup, setIsNewGameSetupModalOpen]); // Updated dependencies

  // --- Start New Game Handler (Uses Quick Save) ---
  const handleStartNewGame = useCallback(() => {
    // Check if the current game is potentially unsaved (not the default ID and not null)
    if (currentGameId && currentGameId !== DEFAULT_GAME_ID) {
      // Prompt to save first
      const gameData = savedGames[currentGameId]; // Safe to access due to check above
      const gameIdentifier = gameData?.teamName 
                             ? `${gameData.teamName} vs ${gameData.opponentName}` 
                             : `ID: ${currentGameId}`;
                             
      const saveConfirmation = window.confirm(
        t('controlBar.saveBeforeNewPrompt', 
          `Save changes to the current game "${gameIdentifier}" before starting a new one?`, 
          { gameName: gameIdentifier }
        ) + "\n\n[OK = Save & Continue] [Cancel = Discard & Continue]"
      );

      if (saveConfirmation) {
        // User chose OK (Save) -> Call Quick Save, then open setup modal.
        logger.log("User chose to Quick Save before starting new game.");
        handleQuickSaveGame(); // Call quick save directly
        setIsNewGameSetupModalOpen(true); // Open setup modal immediately after
        // No need to return here; flow continues after quick save
      } else {
        // User chose Cancel (Discard) -> Proceed to next confirmation
        logger.log("Discarding current game changes to start new game.");
        // Confirmation for actually starting new game (ONLY shown if user DISCARDED previous game)
        if (window.confirm(t('controlBar.startNewMatchConfirmation', 'Are you sure you want to start a new match? Any unsaved progress will be lost.') ?? 'Are you sure?')) {
          logger.log("Start new game confirmed after discarding, opening setup modal...");
          // <<< SET default player selection (all players) >>>
          setPlayerIdsForNewGame(availablePlayers.map(p => p.id));
          setIsNewGameSetupModalOpen(true); // Open the setup modal
        } 
        // If user cancels this second confirmation, do nothing.
        // Exit the function after handling the discard path.
        return;
      }
    } else {
      // If no real game is loaded, proceed directly to the main confirmation
       if (window.confirm(t('controlBar.startNewMatchConfirmation', 'Are you sure you want to start a new match? Any unsaved progress will be lost.') ?? 'Are you sure?')) {
         logger.log("Start new game confirmed (no prior game to save), opening setup modal...");
         // <<< SET default player selection (all players) >>>
         setPlayerIdsForNewGame(availablePlayers.map(p => p.id));
         setIsNewGameSetupModalOpen(true); // Open the setup modal
       }
       // If user cancels this confirmation, do nothing.
       // Exit the function after handling the no-game-loaded path.
       return; 
    }
    // Note: This part of the code is now only reachable if the user chose 'OK (Save & Continue)'
    // because the other paths explicitly return earlier.
    // <<< SET player selection based on current game BEFORE opening modal >>>
       setPlayerIdsForNewGame(gameSessionState.selectedPlayerIds);  // Use the current selection
    setIsNewGameSetupModalOpen(true); // Open setup modal (moved here for save & continue path)

  }, [t, currentGameId, savedGames, handleQuickSaveGame, setIsNewGameSetupModalOpen,
      // <<< ADD dependencies >>>
      availablePlayers, gameSessionState.selectedPlayerIds, setPlayerIdsForNewGame
     ]); 
  // --- END Start New Game Handler ---

  // New handler to place all selected players on the field at once
  const handlePlaceAllPlayers = useCallback(() => {
    // Get the list of selected players who are not yet on the field
           const selectedButNotOnField = gameSessionState.selectedPlayerIds.filter((id: string) => 
      !playersOnField.some(fieldPlayer => fieldPlayer.id === id)
    );
    
    if (selectedButNotOnField.length === 0) {
      // All selected players are already on the field
      logger.log('All selected players are already on the field');
      return;
    }

    // Find the corresponding player objects from availablePlayers
    const playersToPlace = selectedButNotOnField
      .map(id => availablePlayers.find(p => p.id === id))
      .filter((p): p is Player => p !== undefined);
    
    logger.log(`Placing ${playersToPlace.length} players on the field...`);

    // Define a reasonable soccer formation based on number of players
    // For simplicity, we'll use these common formations:
    // 3-4 players: simple triangle or diamond
    // 5-7 players: 2-3-1 or 2-3-2 formation
    // 8+ players: 3-3-2 or 3-4-1 formation
    
    // Calculate positions for players in a reasonable soccer formation
    const newFieldPlayers: Player[] = [...playersOnField]; // Start with existing players
    
    // Find if there's a goalie in the players to place
    const goalieIndex = playersToPlace.findIndex(p => p.isGoalie);
    let goalie: Player | null = null;
    
    if (goalieIndex !== -1) {
      // Remove goalie from the array and handle separately
      goalie = playersToPlace.splice(goalieIndex, 1)[0];
    }
    
    // Place goalie first if one exists
    if (goalie) {
      // Place at the goal line, slightly offset from center
      newFieldPlayers.push({
        ...goalie,
        relX: 0.5,
        relY: 0.95 // Near our own goal line
      });
    }
    
    // Determine formation based on remaining players
    const remainingCount = playersToPlace.length;
    let positions: { relX: number, relY: number }[] = [];
    
    if (remainingCount <= 3) {
      // Simple triangle/diamond formation for 1-3 players (not including goalie)
      if (remainingCount >= 1) positions.push({ relX: 0.5, relY: 0.8 }); // Defender
      if (remainingCount >= 2) positions.push({ relX: 0.5, relY: 0.5 }); // Midfielder
      if (remainingCount >= 3) positions.push({ relX: 0.5, relY: 0.3 }); // Forward
    } 
    else if (remainingCount <= 7) {
      // 2-3-1 or 2-3-2 formation for 6-7 players (not including goalie)
      // Defenders
      positions.push({ relX: 0.3, relY: 0.8 });
      positions.push({ relX: 0.7, relY: 0.8 });
      
      // Midfielders
      positions.push({ relX: 0.25, relY: 0.6 });
      positions.push({ relX: 0.5, relY: 0.55 });
      positions.push({ relX: 0.75, relY: 0.6 });
      
      // Forwards
      positions.push({ relX: 0.35, relY: 0.3 });
      if (remainingCount >= 7) positions.push({ relX: 0.65, relY: 0.3 });
    }
    else {
      // 3-4-1 or 3-3-2 formation for 8+ players (not including goalie)
      // Defenders
      positions.push({ relX: 0.25, relY: 0.85 });
      positions.push({ relX: 0.5, relY: 0.8 });
      positions.push({ relX: 0.75, relY: 0.85 });
      
      // Midfielders
      positions.push({ relX: 0.2, relY: 0.6 });
      positions.push({ relX: 0.4, relY: 0.55 });
      positions.push({ relX: 0.6, relY: 0.55 });
      positions.push({ relX: 0.8, relY: 0.6 });
      
      // Forwards
      positions.push({ relX: 0.5, relY: 0.3 });
      if (remainingCount >= 9) positions.push({ relX: 0.35, relY: 0.3 });
      if (remainingCount >= 10) positions.push({ relX: 0.65, relY: 0.3 });
    }
    
    // Take only the positions we need for the remaining players
    positions = positions.slice(0, remainingCount);
    
    // Add player in each position
    playersToPlace.forEach((player, index) => {
      if (index < positions.length) {
        newFieldPlayers.push({
          ...player,
          relX: positions[index].relX,
          relY: positions[index].relY
        });
      }
    });
    
    // Update players on field
    setPlayersOnField(newFieldPlayers);
    saveStateToHistory({ playersOnField: newFieldPlayers });
    
    logger.log(`Successfully placed ${playersToPlace.length} players on the field`);
         }, [playersOnField, gameSessionState.selectedPlayerIds, availablePlayers, saveStateToHistory, setPlayersOnField]);

  // --- END Quick Save Handler ---

  // --- Step 3: Handler for Importing Games ---
  // const handleImportGamesFromJson = useCallback(async (jsonContent: string) => { // This function is no longer used
  //   // ...
  // }, [savedGames, setSavedGames, t]); 
  // --- End Step 3 --- 

  // --- NEW: Handlers for Game Settings Modal --- (Placeholder open/close)

  // Render null or a loading indicator until state is loaded
  // Note: Console log added before the check itself
 
  // Final console log before returning the main JSX
  logger.log('[Home Render] highlightRosterButton:', highlightRosterButton); // Log state on render

  // ATTEMPTING TO EXPLICITLY REMOVE THE CONDITIONAL HOOK
  // The useEffect for highlightRosterButton that was here (around lines 2977-2992)
  // should be removed as it's called conditionally and its correct version is at the top level.

  // Log gameEvents before PlayerBar is rendered
  logger.log('[page.tsx] About to render PlayerBar, gameEvents for PlayerBar:', JSON.stringify(gameSessionState.gameEvents));


  const handleOpenPlayerStats = (playerId: string) => {
    const player = availablePlayers.find(p => p.id === playerId);
    if (player) {
      setSelectedPlayerForStats(player);
      setIsGameStatsModalOpen(true);
      setIsRosterModalOpen(false); // Close the roster modal
    }
  };

  

  const handleGameLogClick = (gameId: string) => {
    setCurrentGameId(gameId);
    // handleClosePlayerStats(); // This function no longer exists
    handleToggleGameStatsModal();
  };

  // --- Render Logic ---
  const isLoading = isMasterRosterQueryLoading || areSeasonsQueryLoading || areTournamentsQueryLoading || isAllSavedGamesQueryLoading || isCurrentGameIdSettingQueryLoading;

  if (isLoading && !initialLoadComplete) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-white">
        {/* You can replace this with a more sophisticated loading spinner component */}
        <p>Loading Game Data...</p>
      </div>
    );
  }

  // Define a consistent, premium style for the top and bottom bars
  const barStyle = "bg-gradient-to-b from-slate-700 to-slate-800 shadow-lg";
  // We can add a noise texture via pseudo-elements or a background image later if desired

  // Determine which players are available for the current game based on selected IDs


  return (
    <main className="flex flex-col h-screen bg-slate-900 text-slate-50 overflow-hidden">
      {/* Top Section: Player Bar, Game Info */}
      <div className={barStyle}>
        <PlayerBar
          players={playersForCurrentGame}
          onPlayerDragStartFromBar={handlePlayerDragStartFromBar}
          selectedPlayerIdFromBar={draggingPlayerFromBarInfo?.id}
          onBarBackgroundClick={handleDeselectPlayer}
          gameEvents={gameSessionState.gameEvents}
          onPlayerTapInBar={handlePlayerTapInBar}
          onToggleGoalie={handleToggleGoalieForModal}
        />
        <GameInfoBar
          teamName={gameSessionState.teamName}
          opponentName={gameSessionState.opponentName}
          homeScore={gameSessionState.homeScore}
          awayScore={gameSessionState.awayScore}
          onTeamNameChange={handleTeamNameChange}
          onOpponentNameChange={handleOpponentNameChange}
          homeOrAway={gameSessionState.homeOrAway}
        />
      </div>

      {/* Main Content: Soccer Field */}
      <div className="flex-grow relative bg-black">
        {/* Pass rel drawing handlers to SoccerField */}

        {showLargeTimerOverlay && (
          <TimerOverlay
            timeElapsedInSeconds={timeElapsedInSeconds}
            subAlertLevel={subAlertLevel}
            onSubstitutionMade={handleSubstitutionMade}
            completedIntervalDurations={gameSessionState.completedIntervalDurations || []}
            subIntervalMinutes={gameSessionState.subIntervalMinutes}
            onSetSubInterval={handleSetSubInterval}
            isTimerRunning={isTimerRunning}
            onStartPauseTimer={handleStartPauseTimer}
            onResetTimer={handleResetTimer}
            onToggleGoalLogModal={handleToggleGoalLogModal}
            onRecordOpponentGoal={() => handleLogOpponentGoal(timeElapsedInSeconds)}
            teamName={gameSessionState.teamName}
            opponentName={gameSessionState.opponentName}
            homeScore={gameSessionState.homeScore}
            awayScore={gameSessionState.awayScore}
            homeOrAway={gameSessionState.homeOrAway}
            lastSubTime={lastSubConfirmationTimeSeconds}
            numberOfPeriods={gameSessionState.numberOfPeriods}
            periodDurationMinutes={gameSessionState.periodDurationMinutes}
            currentPeriod={gameSessionState.currentPeriod}
            gameStatus={gameSessionState.gameStatus}
            onOpponentNameChange={handleOpponentNameChange}
            onClose={handleToggleLargeTimerOverlay}
            isLoaded={initialLoadComplete}
          />
        )}

        <SoccerField
          players={playersOnField}
          opponents={opponents}
          drawings={isTacticsBoardView ? tacticalDrawings : drawings}
          onPlayerMove={handlePlayerMove}
          onPlayerMoveEnd={handlePlayerMoveEnd}
          onPlayerRemove={handlePlayerRemove}
          onOpponentMove={handleOpponentMove}
          onOpponentMoveEnd={handleOpponentMoveEnd}
          onOpponentRemove={handleOpponentRemove}
          onPlayerDrop={handleDropOnField}
          showPlayerNames={gameSessionState.showPlayerNames}
          onDrawingStart={isTacticsBoardView ? handleTacticalDrawingStart : handleDrawingStart}
          onDrawingAddPoint={isTacticsBoardView ? handleTacticalDrawingAddPoint : handleDrawingAddPoint}
          onDrawingEnd={isTacticsBoardView ? handleTacticalDrawingEnd : handleDrawingEnd}
          draggingPlayerFromBarInfo={draggingPlayerFromBarInfo}
          onPlayerDropViaTouch={handlePlayerDropViaTouch}
          onPlayerDragCancelViaTouch={handlePlayerDragCancelViaTouch}
          timeElapsedInSeconds={timeElapsedInSeconds}
          isTacticsBoardView={isTacticsBoardView}
          tacticalDiscs={tacticalDiscs}
          onTacticalDiscMove={handleTacticalDiscMove}
          onTacticalDiscRemove={handleTacticalDiscRemove}
          onToggleTacticalDiscType={handleToggleTacticalDiscType}
          tacticalBallPosition={tacticalBallPosition}
          onTacticalBallMove={handleTacticalBallMove}
        />
        {/* Other components that might overlay or interact with the field */}
      </div>

      {/* Bottom Section: Control Bar */}
      <div className={barStyle}>
        <ControlBar
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={canUndo}
          canRedo={canRedo}
          onResetField={handleResetField}
          onClearDrawings={handleClearDrawingsForView}
          onAddOpponent={handleAddOpponent}
          showLargeTimerOverlay={showLargeTimerOverlay}
          onToggleLargeTimerOverlay={handleToggleLargeTimerOverlay}
          onToggleTrainingResources={handleToggleTrainingResources}
          onToggleGoalLogModal={handleToggleGoalLogModal}
          onToggleGameStatsModal={handleToggleGameStatsModal}
          onOpenLoadGameModal={handleOpenLoadGameModal}
          onStartNewGame={handleStartNewGame}
          onOpenRosterModal={openRosterModal}
          onQuickSave={handleQuickSaveGame}
          onOpenGameSettingsModal={handleOpenGameSettingsModal}
          isGameLoaded={!!currentGameId && currentGameId !== DEFAULT_GAME_ID}
          onPlaceAllPlayers={handlePlaceAllPlayers}
          highlightRosterButton={highlightRosterButton}
          onOpenSeasonTournamentModal={handleOpenSeasonTournamentModal}
          isTacticsBoardView={isTacticsBoardView}
          onToggleTacticsBoard={handleToggleTacticsBoard}
          onAddHomeDisc={() => handleAddTacticalDisc('home')}
          onAddOpponentDisc={() => handleAddTacticalDisc('opponent')}
          onToggleInstructionsModal={handleToggleInstructionsModal}
          onOpenSettingsModal={handleOpenSettingsModal}
          onOpenPlayerAssessmentModal={openPlayerAssessmentModal}
        />
      </div>

      {/* Modals and Overlays */}
      {/* Training Resources Modal */}
      <TrainingResourcesModal
        isOpen={isTrainingResourcesOpen}
        onClose={handleToggleTrainingResources}
      />
      <InstructionsModal
        isOpen={isInstructionsModalOpen}
        onClose={handleToggleInstructionsModal}
      />
      {/* Goal Log Modal */}
      <GoalLogModal 
        isOpen={isGoalLogModalOpen}
        onClose={handleToggleGoalLogModal}
        onLogGoal={handleAddGoalEvent}
        onLogOpponentGoal={handleLogOpponentGoal} // ADDED: Pass the handler
        availablePlayers={playersForCurrentGame} // MODIFIED: Pass players selected for the current game
        currentTime={gameSessionState.timeElapsedInSeconds}
      />
      {/* Game Stats Modal - Restore props for now */}
      {isGameStatsModalOpen && (
        <GameStatsModal
          isOpen={isGameStatsModalOpen}
          onClose={handleToggleGameStatsModal}
          teamName={gameSessionState.teamName}
          opponentName={gameSessionState.opponentName}
          gameDate={gameSessionState.gameDate}
          homeScore={gameSessionState.homeScore}
          awayScore={gameSessionState.awayScore}
          homeOrAway={gameSessionState.homeOrAway}
          gameLocation={gameSessionState.gameLocation}
          gameTime={gameSessionState.gameTime}
          numPeriods={gameSessionState.numberOfPeriods}
          periodDurationMinutes={gameSessionState.periodDurationMinutes}
          availablePlayers={availablePlayers}
          gameEvents={gameSessionState.gameEvents}
          gameNotes={gameSessionState.gameNotes}
          onUpdateGameEvent={handleUpdateGameEvent}
          selectedPlayerIds={gameSessionState.selectedPlayerIds}
          savedGames={savedGames}
          currentGameId={currentGameId}
          onDeleteGameEvent={handleDeleteGameEvent}
          onExportOneJson={handleExportOneJson}
          onExportOneCsv={handleExportOneCsv}
          onExportAggregateJson={handleExportAggregateJson}
          onExportAggregateCsv={handleExportAggregateCsv}
          initialSelectedPlayerId={selectedPlayerForStats?.id}
          onGameClick={handleGameLogClick}
        />
      )}
      <LoadGameModal 
        isOpen={isLoadGameModalOpen}
        onClose={handleCloseLoadGameModal}
        savedGames={savedGames} 
        onLoad={handleLoadGame}
        onDelete={handleDeleteGame}
        onExportOneJson={handleExportOneJson}
        onExportOneCsv={handleExportOneCsv}
        currentGameId={currentGameId || undefined} // Convert null to undefined
        // Pass loading and error state props for LoadGameModal
        isLoadingGamesList={isLoadingGamesList}
        loadGamesListError={loadGamesListError}
        isGameLoading={isGameLoading}
        gameLoadError={gameLoadError}
        isGameDeleting={isGameDeleting}
        gameDeleteError={gameDeleteError}
        processingGameId={processingGameId}
      />

      {/* Conditionally render the New Game Setup Modal */}
      {isNewGameSetupModalOpen && (
        <NewGameSetupModal
          isOpen={isNewGameSetupModalOpen}
          initialPlayerSelection={playerIdsForNewGame} // <<< Pass the state here
          demandFactor={newGameDemandFactor}
          onDemandFactorChange={setNewGameDemandFactor}
          onStart={handleStartNewGameWithSetup} // CORRECTED Handler
          onCancel={handleCancelNewGameSetup} 
          // Pass the new mutation functions
          addSeasonMutation={addSeasonMutation}
          addTournamentMutation={addTournamentMutation}
          // Pass loading states from mutations
          isAddingSeason={addSeasonMutation.isPending}
          isAddingTournament={addTournamentMutation.isPending}
        />
      )}

      {/* Roster Settings Modal */}
      <RosterSettingsModal
        isOpen={isRosterModalOpen}
        onClose={closeRosterModal}
        availablePlayers={availablePlayers} // Use availablePlayers from useGameState
        onRenamePlayer={handleRenamePlayerForModal}
        onSetJerseyNumber={handleSetJerseyNumberForModal}
        onSetPlayerNotes={handleSetPlayerNotesForModal}
        onRemovePlayer={handleRemovePlayerForModal} 
        onAddPlayer={handleAddPlayerForModal}
           selectedPlayerIds={gameSessionState.selectedPlayerIds}
        onTogglePlayerSelection={handleTogglePlayerSelection}
        teamName={gameSessionState.teamName}
        onTeamNameChange={handleTeamNameChange}
        // Pass loading and error states
        isRosterUpdating={isRosterUpdating}
        rosterError={rosterError}
        onOpenPlayerStats={handleOpenPlayerStats}
      />

      <SeasonTournamentManagementModal
        isOpen={isSeasonTournamentModalOpen}
        onClose={handleCloseSeasonTournamentModal}
        seasons={seasons}
        tournaments={tournaments}
        availablePlayers={availablePlayers}
        addSeasonMutation={addSeasonMutation}
        addTournamentMutation={addTournamentMutation}
        updateSeasonMutation={updateSeasonMutation}
        deleteSeasonMutation={deleteSeasonMutation}
        updateTournamentMutation={updateTournamentMutation}
        deleteTournamentMutation={deleteTournamentMutation}
      />
      
      {/* <PlayerStatsModal 
          isOpen={isPlayerStatsModalOpen} 
          onClose={handleClosePlayerStats} 
          player={selectedPlayerForStats}
          savedGames={allSavedGamesQueryResultData || {}} 
          onGameClick={handleGameLogClick}
      /> */}

      <GameSettingsModal
        isOpen={isGameSettingsModalOpen}
        onClose={handleCloseGameSettingsModal}
        currentGameId={currentGameId}
        teamName={gameSessionState.teamName}
        opponentName={gameSessionState.opponentName}
        gameDate={gameSessionState.gameDate}
        gameLocation={gameSessionState.gameLocation}
        gameTime={gameSessionState.gameTime}
        gameNotes={gameSessionState.gameNotes}
        ageGroup={gameSessionState.ageGroup}
        tournamentLevel={gameSessionState.tournamentLevel}
        gameEvents={gameSessionState.gameEvents}
        availablePlayers={availablePlayers}
        selectedPlayerIds={gameSessionState.selectedPlayerIds}
        onSelectedPlayersChange={handleUpdateSelectedPlayers}
        numPeriods={gameSessionState.numberOfPeriods}
        periodDurationMinutes={gameSessionState.periodDurationMinutes}
        demandFactor={gameSessionState.demandFactor}
        onTeamNameChange={handleTeamNameChange}
        onOpponentNameChange={handleOpponentNameChange}
        onGameDateChange={handleGameDateChange}
        onGameLocationChange={handleGameLocationChange}
        onGameTimeChange={handleGameTimeChange}
        onGameNotesChange={handleGameNotesChange}
        onAgeGroupChange={handleAgeGroupChange}
        onTournamentLevelChange={handleTournamentLevelChange}
        onUpdateGameEvent={handleUpdateGameEvent}
        onAwardFairPlayCard={handleAwardFairPlayCard}
        onDeleteGameEvent={handleDeleteGameEvent}
        onNumPeriodsChange={handleSetNumberOfPeriods}
        onPeriodDurationChange={handleSetPeriodDuration}
        onDemandFactorChange={handleSetDemandFactor}
        seasonId={gameSessionState.seasonId}
        tournamentId={gameSessionState.tournamentId}
        onSeasonIdChange={handleSetSeasonId}
        onTournamentIdChange={handleSetTournamentId}
        homeOrAway={gameSessionState.homeOrAway}
        onSetHomeOrAway={handleSetHomeOrAway}
        addSeasonMutation={addSeasonMutation}
        addTournamentMutation={addTournamentMutation}
        isAddingSeason={addSeasonMutation.isPending}
        isAddingTournament={addTournamentMutation.isPending}
        timeElapsedInSeconds={timeElapsedInSeconds}
        updateGameDetailsMutation={updateGameDetailsMutation}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={handleCloseSettingsModal}
        language={appLanguage}
        onLanguageChange={(lang) => setAppLanguage(lang)}
        defaultTeamName={defaultTeamNameSetting}
        onDefaultTeamNameChange={(name) => {
          setDefaultTeamNameSetting(name);
          utilSaveLastHomeTeamName(name);
        }}
        onResetGuide={handleShowAppGuide}
        onHardResetApp={handleHardResetApp}
        autoBackupEnabled={autoBackupEnabled}
        backupIntervalHours={backupIntervalHours}
        lastBackupTime={lastBackupTime || undefined}
        backupEmail={backupEmail}
        onAutoBackupEnabledChange={(enabled) => {
          setAutoBackupEnabled(enabled);
          utilUpdateAppSettings({ autoBackupEnabled: enabled }).catch(() => {});
        }}
        onBackupIntervalChange={(hours) => {
          const val = Math.max(1, hours);
          setBackupIntervalHours(val);
          utilUpdateAppSettings({ autoBackupIntervalHours: val }).catch(() => {});
        }}
        onBackupEmailChange={(email) => {
          setBackupEmail(email);
          utilUpdateAppSettings({ backupEmail: email }).catch(() => {});
        }}
        onSendBackup={handleCreateAndSendBackup}
      />

      <PlayerAssessmentModal
        isOpen={isPlayerAssessmentModalOpen}
        onClose={closePlayerAssessmentModal}
        selectedPlayerIds={gameSessionState.selectedPlayerIds}
        availablePlayers={availablePlayers}
        assessments={playerAssessments}
        onSave={handleSavePlayerAssessment}
        onDelete={handleDeletePlayerAssessment}
      />
    </main>
  );
}
export default HomePage;
