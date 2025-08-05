'use client';

import React, { useState, useEffect, useCallback, useReducer, useRef, useMemo, startTransition } from 'react';
import SoccerField from '@/components/SoccerField';
import PlayerBar from '@/components/PlayerBar';
import ControlBar from '@/components/ControlBar';
import TimerOverlay from '@/components/TimerOverlay';
// Lazy load GoalLogModal since it's only used conditionally
const GoalLogModal = React.lazy(() => import('@/components/GoalLogModal'));
// Lazy load heavy modals for better performance
const GameStatsModal = React.lazy(() => import('@/components/GameStatsModal'));
const GameSettingsModal = React.lazy(() => import('@/components/GameSettingsModal'));
const TrainingResourcesModal = React.lazy(() => import('@/components/TrainingResourcesModal'));
const LoadGameModal = React.lazy(() => import('@/components/LoadGameModal'));
const NewGameSetupModal = React.lazy(() => import('@/components/NewGameSetupModal'));
const RosterSettingsModal = React.lazy(() => import('@/components/RosterSettingsModal'));
const SettingsModal = React.lazy(() => import('@/components/SettingsModal'));
const SeasonTournamentManagementModal = React.lazy(() => import('@/components/SeasonTournamentManagementModal'));
const InstructionsModal = React.lazy(() => import('@/components/InstructionsModal'));
const PlayerAssessmentModal = React.lazy(() => import('@/components/PlayerAssessmentModal'));
import usePlayerRosterManager from '@/hooks/usePlayerRosterManager';
import usePlayerFieldManager from '@/hooks/usePlayerFieldManager';
import useGameEventsManager from '@/hooks/useGameEventsManager';
import useAppSettingsManager from '@/hooks/useAppSettingsManager';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/context/AuthContext';
import { useGameState, UseGameStateReturn } from '@/hooks/useGameState';
import GameInfoBar from '@/components/GameInfoBar';
import { useOfflineFirstGameTimer } from '@/hooks/useOfflineFirstGameTimer';
import useAutoBackup from '@/hooks/useAutoBackup';
import { useMigrationTrigger } from '@/hooks/useMigrationTrigger';
import { useRosterMigration } from '@/hooks/useRosterMigration';
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
import { saveGame as utilSaveGame } from '@/utils/savedGames';
// Removed - now handled by useGameDataManager: deleteGame, getLatestGameId, createGame
import {
  saveCurrentGameIdSetting as utilSaveCurrentGameIdSetting,
  getHasSeenAppGuide,
  saveHasSeenAppGuide,
  getLastHomeTeamName as utilGetLastHomeTeamName,
} from '@/utils/appSettings';
// Removed - now handled by useGameDataManager:
// import { deleteSeason as utilDeleteSeason, updateSeason as utilUpdateSeason, addSeason as utilAddSeason } from '@/utils/seasons';
// import { deleteTournament as utilDeleteTournament, updateTournament as utilUpdateTournament, addTournament as utilAddTournament } from '@/utils/tournaments';
// Import Player from types directory
import { Player, Season, Tournament } from '@/types';
// Import saveMasterRoster utility
import type { AppState, SavedGamesCollection } from "@/types";
// Removed - now handled by useGameDataManager: 
// import { useQueryClient } from '@tanstack/react-query';
import { useGameDataQueries } from '@/hooks/useGameDataQueries';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import { useTacticalBoard } from '@/hooks/useTacticalBoard';
import { useRoster } from '@/hooks/useRoster';
import { useGameDataManager } from '@/hooks/useGameDataManager';
import { useGameStateManager } from '@/hooks/useGameStateManager';
import { useModalContext } from '@/contexts/ModalProvider.migration';
import { useGameSettingsModalWithHandlers } from '@/hooks/useGameSettingsModalState';
import { useGameStatsModalWithHandlers } from '@/hooks/useGameStatsModalState';
import { useRosterSettingsModalWithHandlers } from '@/hooks/useRosterSettingsModalState';
import { useLoadGameModalWithHandlers } from '@/hooks/useLoadGameModalState';
import { useNewGameSetupModalWithHandlers } from '@/hooks/useNewGameSetupModalState';
// Import skeleton components
import { GameStatsModalSkeleton, LoadGameModalSkeleton, RosterModalSkeleton, ModalSkeleton } from '@/components/ui/ModalSkeleton';
import { AppLoadingSkeleton } from '@/components/ui/AppSkeleton';
// Note: localStorage utilities removed - using offline-first storage instead
// Removed - now handled by useGameDataManager: 
// import { queryKeys } from '@/config/queryKeys';
// Also import addSeason and addTournament for the new mutations
// Removed - now handled by useGameDataManager:
// import { updateGameDetails as utilUpdateGameDetails } from '@/utils/savedGames';
import { DEFAULT_GAME_ID } from '@/config/constants';
// Storage keys no longer needed - using offline-first storage
// Removed static import of export utilities - now using dynamic imports for better bundle splitting
// Removed - now handled by useGameDataManager: exportJson, exportCsv
// Removed - now handled by useGameDataManager:
// import { useToast } from '@/contexts/ToastProvider';
import logger from '@/utils/logger';


// Placeholder data - Initialize new fields
const initialAvailablePlayersData: Player[] = [];

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
  selectedPlayerIds: [],
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
  timeElapsedInSeconds: 0,
};

interface HomePageProps {
  initialAction?: 'newGame' | 'loadGame' | 'resumeGame' | 'season' | 'stats';
  skipInitialSetup?: boolean;
}

function HomePage({ initialAction, skipInitialSetup = false }: HomePageProps) {
  const { t } = useTranslation(); // Get translation function
  const { signOut } = useAuth();
  // Removed - now handled by useGameDataManager: 
  // const queryClient = useQueryClient(); // Get query client instance

 
  
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
  const masterRosterQueryErrorData = gameDataError;
  const seasonsQueryErrorData = gameDataError;
  const tournamentsQueryErrorData = gameDataError;
  const allSavedGamesQueryErrorData = gameDataError;

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

  const handlePlayerIdUpdated = useCallback(
    (oldId: string, newId: string) => {
      setPlayersOnField(prev => prev.map(p => (p.id === oldId ? { ...p, id: newId } : p)));

      dispatchGameSession({
        type: 'SET_SELECTED_PLAYER_IDS',
        payload: gameSessionState.selectedPlayerIds.map(id => (id === oldId ? newId : id)),
      });

      gameSessionState.gameEvents.forEach(event => {
        if (event.type === 'goal') {
          // Goal events have scorerId (required) and assisterId (optional)
          if (event.scorerId === oldId || event.assisterId === oldId) {
            const updatedEvent = {
              ...event,
              scorerId: event.scorerId === oldId ? newId : event.scorerId,
              assisterId: event.assisterId === oldId ? newId : event.assisterId,
            };
            dispatchGameSession({ type: 'UPDATE_GAME_EVENT', payload: updatedEvent });
          }
        }
      });
    },
    [setPlayersOnField, dispatchGameSession, gameSessionState.selectedPlayerIds, gameSessionState.gameEvents]
  );

  const roster = useRoster({
    initialPlayers: initialState.availablePlayers,
    selectedPlayerIds: gameSessionState.selectedPlayerIds,
    onPlayerIdUpdated: handlePlayerIdUpdated,
  });
  const {
    availablePlayers,
    setAvailablePlayers,
    highlightRosterButton,
    setHighlightRosterButton,
    isRosterUpdating,
    rosterError,
    playersForCurrentGame,
  } = roster;

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
  // Persistence state
  const [savedGames, setSavedGames] = useState<SavedGamesCollection>({});
  const [currentGameId, setCurrentGameId] = useState<string | null>(DEFAULT_GAME_ID);
  const [isPlayed, setIsPlayed] = useState<boolean>(true);
  
  // This ref needs to be declared after currentGameId
  const gameIdRef = useRef(currentGameId);

  useEffect(() => { gameIdRef.current = currentGameId; }, [currentGameId]);

  const {
    playerAssessments,
    handleRenamePlayerForModal,
    handleSetJerseyNumberForModal,
    handleSetPlayerNotesForModal,
    handleRemovePlayerForModal,
    handleAddPlayerForModal,
    handleToggleGoalieForModal,
    handleTogglePlayerSelection,
    handleUpdateSelectedPlayers,
    handleSavePlayerAssessment,
    handleDeletePlayerAssessment,
  } = usePlayerRosterManager({
    roster,
    masterRosterPlayers: masterRosterQueryResultData,
    selectedPlayerIds: gameSessionState.selectedPlayerIds,
    dispatchGameSession,
    currentGameId,
    completedIntervals: gameSessionState.completedIntervalDurations || [],
    setSavedGames,
  });

  const {
    timeElapsedInSeconds,
    isTimerRunning,
    subAlertLevel,
    lastSubConfirmationTimeSeconds,
    startPause: handleStartPauseTimer,
    reset: handleResetTimer,
    ackSubstitution: handleSubstitutionMade,
    setSubInterval: handleSetSubInterval,
  } = useOfflineFirstGameTimer({ state: gameSessionState, dispatch: dispatchGameSession, currentGameId: currentGameId || '' });

  // ADD State for seasons/tournaments lists
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  // <<< ADD: State for home/away status >>>
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  const [hasSkippedInitialSetup, setHasSkippedInitialSetup] = useState<boolean>(skipInitialSetup);

  useAutoBackup();
  
  // Migration trigger
  const { MigrationModalComponent } = useMigrationTrigger();
  
  // Roster data migration - runs automatically when needed
  useRosterMigration();

  // Use Zustand-based modal states
  const gameSettingsModal = useGameSettingsModalWithHandlers();
  const gameStatsModal = useGameStatsModalWithHandlers();
  const rosterSettingsModal = useRosterSettingsModalWithHandlers();
  const loadGameModal = useLoadGameModalWithHandlers();
  const newGameSetupModal = useNewGameSetupModalWithHandlers();
  
  const {
    isSeasonTournamentModalOpen,
    setIsSeasonTournamentModalOpen,
    isTrainingResourcesOpen,
    setIsTrainingResourcesOpen,
    isGoalLogModalOpen,
    setIsGoalLogModalOpen,
    isSettingsModalOpen,
    setIsSettingsModalOpen,
    isPlayerAssessmentModalOpen,
    setIsPlayerAssessmentModalOpen,
  } = useModalContext();
  // Removed - now handled by useGameDataManager:
  // const { showToast } = useToast();
  // const [isPlayerStatsModalOpen, setIsPlayerStatsModalOpen] = useState(false);
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<Player | null>(null);

  // --- Timer State (Still needed here) ---
  const [showLargeTimerOverlay, setShowLargeTimerOverlay] = useState<boolean>(false); // State for overlay visibility
  const [isInstructionsModalOpen, setIsInstructionsModalOpen] = useState<boolean>(false);

  useEffect(() => {
    if (!initialAction) return;
    switch (initialAction) {
      case 'newGame':
        newGameSetupModal.open();
        break;
      case 'loadGame':
        loadGameModal.open();
        break;
      case 'resumeGame':
        // Resume game is handled by the initialization effect
        // which automatically loads the most recent game
        break;
      case 'season':
        setIsSeasonTournamentModalOpen(true);
        break;
      case 'stats':
        gameStatsModal.open();
        break;
      default:
        break;
    }
  }, [
    initialAction,
    newGameSetupModal,
    loadGameModal,
    setIsSeasonTournamentModalOpen,
    gameStatsModal
  ]);
  
  // --- Modal States handled via context ---

  // <<< ADD State to hold player IDs for the next new game >>>
  const [playerIdsForNewGame, setPlayerIdsForNewGame] = useState<string[] | null>(null);
  const [newGameDemandFactor, setNewGameDemandFactor] = useState(1);
  const [isCreatingNewGame, setIsCreatingNewGame] = useState<boolean>(false);
  const wasCreatingNewGameRef = useRef(false);
  // <<< ADD State for the roster prompt toast >>>
  // const [showRosterPrompt, setShowRosterPrompt] = useState<boolean>(false);

  // State for game saving error (loading state is from saveGameMutation.isLoading)

  // NEW: States for LoadGameModal operations
  const [isLoadingGamesList, setIsLoadingGamesList] = useState(false);
  const [loadGamesListError, setLoadGamesListError] = useState<string | null>(null);
  const [isGameLoading, setIsGameLoading] = useState(false); // For loading a specific game
  const [gameLoadError, setGameLoadError] = useState<string | null>(null);
  const [isStateSynchronizing, setIsStateSynchronizing] = useState(false); // Prevent race conditions during state updates
  // Removed - now handled by useGameDataManager:
  // const [isGameDeleting, setIsGameDeleting] = useState(false); // For deleting a specific game
  // const [gameDeleteError, setGameDeleteError] = useState<string | null>(null);
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

  // --- Data Management (Extracted to useGameDataManager hook) ---
  const {
    mutations: {
      addSeasonMutation,
      updateSeasonMutation,
      deleteSeasonMutation,
      addTournamentMutation,
      updateTournamentMutation,
      deleteTournamentMutation,
      updateGameDetailsMutation,
    },
    handlers: {
      handleQuickSaveGame,
      handleDeleteGame,
      handleExportOneJson: handleExportOneJsonRaw,
      handleExportOneCsv: handleExportOneCsvRaw,
    },
  } = useGameDataManager({
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
  });

  useEffect(() => {
    if (wasCreatingNewGameRef.current && !isCreatingNewGame && currentGameId && currentGameId !== DEFAULT_GAME_ID) {
      Promise.resolve().then(() => handleQuickSaveGame(currentGameId));
    }
    wasCreatingNewGameRef.current = isCreatingNewGame;
  }, [isCreatingNewGame, currentGameId, handleQuickSaveGame]);

  // --- Game State Management (Extracted to useGameStateManager hook) ---
  const {
    handleTeamNameChange,
    handleOpponentNameChange,
    handleGameDateChange,
    handleGameLocationChange,
    handleGameTimeChange,
    handleSetNumberOfPeriods,
    handleSetPeriodDuration,
    handleSetDemandFactor,
    handleSetHomeOrAway,
    handleSetSeasonId,
    handleSetTournamentId,
    handleSetAgeGroup,
    handleSetTournamentLevel,
    applyHistoryState,
  } = useGameStateManager({
    dispatchGameSession,
    initialGameSessionData,
    setPlayersOnField,
    setOpponents,
    setDrawings,
    setIsPlayed,
  });

  const {
    states: { draggingPlayerFromBarInfo },
    handlers: {
      handleDropOnField,
      handlePlayerMove,
      handlePlayerMoveEnd,
      handlePlayerRemove,
      handlePlayerDragStartFromBar,
      handlePlayerTapInBar,
      handlePlayerDropViaTouch,
      handlePlayerDragCancelViaTouch,
      handlePlaceAllPlayers,
      handleResetField,
      handleClearDrawingsForView,
    },
    setDraggingPlayerFromBarInfo,
  } = usePlayerFieldManager({
    playersOnField,
    setPlayersOnField,
    setOpponents,
    setDrawings,
    setTacticalDrawings,
    availablePlayers,
    selectedPlayerIds: gameSessionState.selectedPlayerIds,
    handlePlayerDrop,
    saveStateToHistory,
    handleClearDrawings,
    clearTacticalElements,
    isTacticsBoardView,
  });

  // --- Game Events Manager ---
  const {
    handleAddGoalEvent,
    handleLogOpponentGoal,
    handleUpdateGameEvent,
    handleDeleteGameEvent,
    handleAwardFairPlayCard,
  } = useGameEventsManager({
    dispatchGameSession,
    gameSessionState,
    availablePlayers,
    setAvailablePlayers,
    playersOnField,
    setPlayersOnField,
    masterRosterQueryResultData,
    currentGameId,
    saveStateToHistory,
    setIsGoalLogModalOpen,
  });

  // --- App Settings Manager ---
  const {
    appLanguage,
    defaultTeamNameSetting,
    setDefaultTeamNameSetting,
    handleShowAppGuide,
    handleHardResetApp,
    handleLanguageChange,
    handleDefaultTeamNameChange,
  } = useAppSettingsManager({
    setIsSettingsModalOpen,
    setIsInstructionsModalOpen,
  });

  // --- Settings Initialization Effects ---
  // Combine both effects and use a single ref to track initialization
  const settingsInitializedRef = useRef(false);
  
  useEffect(() => {
    if (!settingsInitializedRef.current) {
      settingsInitializedRef.current = true;
      
      // Load last home team name
      utilGetLastHomeTeamName().then((name) => setDefaultTeamNameSetting(name));
    }
  }, [
    setDefaultTeamNameSetting
  ]);

  // --- Export Wrapper Functions ---
  const handleExportOneJsonWrapper = useCallback((gameId: string) => {
    handleExportOneJsonRaw(gameId, seasons, tournaments);
  }, [handleExportOneJsonRaw, seasons, tournaments]);

  const handleExportOneCsvWrapper = useCallback((gameId: string) => {
    handleExportOneCsvRaw(gameId, availablePlayers, seasons, tournaments);
  }, [handleExportOneCsvRaw, availablePlayers, seasons, tournaments]);
  // Use a ref to track the last synced data to prevent loops
  const lastSyncedRosterRef = useRef<string>('');
  
  // Memoized roster data key for performance optimization
  const rosterDataKey = useMemo(() => {
    if (!masterRosterQueryResultData || isMasterRosterQueryLoading) return null;
    return JSON.stringify(masterRosterQueryResultData.map(p => ({ id: p.id, name: p.name })));
  }, [masterRosterQueryResultData, isMasterRosterQueryLoading]);

  // Memoized sorted games for performance optimization
  const sortedGamesByDate = useMemo(() => {
    const currentSavedGames = allSavedGamesQueryResultData || {};
    const gameIds = Object.keys(currentSavedGames);
    
    if (gameIds.length === 0) return [];
    
    return gameIds
      .map(id => ({ id, game: currentSavedGames[id] }))
      .filter(({ game }) => game && game.gameDate)
      .sort((a, b) => {
        const dateA = new Date(a.game.gameDate + ' ' + (a.game.gameTime || '00:00'));
        const dateB = new Date(b.game.gameDate + ' ' + (b.game.gameTime || '00:00'));
        return dateB.getTime() - dateA.getTime();
      });
  }, [allSavedGamesQueryResultData]);
  
  useEffect(() => {
    if (isMasterRosterQueryLoading) {
      logger.log('[TanStack Query] Master Roster is loading...');
    }
    if (masterRosterQueryResultData && !isMasterRosterQueryLoading && rosterDataKey) {
      // Only update if this is different from what we last synced
      if (rosterDataKey !== lastSyncedRosterRef.current) {
        lastSyncedRosterRef.current = rosterDataKey;
        logger.log('[HomePage] Syncing roster from React Query:', masterRosterQueryResultData.length, 'players');
        setAvailablePlayers(masterRosterQueryResultData);
      }
    }
    if (isMasterRosterQueryError) {
      logger.error('[TanStack Query] Error loading master roster:', masterRosterQueryErrorData);
      setAvailablePlayers([]);
    }
  }, [masterRosterQueryResultData, isMasterRosterQueryLoading, isMasterRosterQueryError, masterRosterQueryErrorData, setAvailablePlayers, rosterDataKey]);

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
  }, [seasonsQueryResultData, areSeasonsQueryLoading, isSeasonsQueryError, seasonsQueryErrorData]);

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
  }, [tournamentsQueryResultData, areTournamentsQueryLoading, isTournamentsQueryError, tournamentsQueryErrorData]);

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

        // Don't save to history here - let other mechanisms handle history
        // This prevents circular updates
        return nextPlayersOnField;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availablePlayers]); // Removed saveStateToHistory to prevent circular updates
  // Note: We don't want setPlayersOnField in deps if it causes loops.
  // saveStateToHistory is also a dependency as it's used inside.
  
  // One-time migration effect - only runs once
  // Data migration is now handled by offline-first storage system

  // Handle saved games loading state
  useEffect(() => {
    if (isAllSavedGamesQueryLoading) {
      logger.log('[EFFECT savedGames] Setting games list loading to true');
      logger.debug('[HomePage] Setting isLoadingGamesList to true');
      setIsLoadingGamesList(true);
    }
  }, [isAllSavedGamesQueryLoading]);

  // Handle saved games data updates
  useEffect(() => {
    if (allSavedGamesQueryResultData) {
      logger.debug('[HomePage] Received saved games data:', Object.keys(allSavedGamesQueryResultData).length, 'games');
      setSavedGames(allSavedGamesQueryResultData || {});
      setIsLoadingGamesList(false);
    }
  }, [allSavedGamesQueryResultData]);

  // Handle saved games errors
  useEffect(() => {
    if (isAllSavedGamesQueryError) {
      logger.error('[EFFECT savedGames] Error loading saved games:', allSavedGamesQueryErrorData);
      logger.error('[HomePage] Error loading games:', allSavedGamesQueryErrorData);
      setLoadGamesListError(t('loadGameModal.errors.listLoadFailed', 'Failed to load saved games list.'));
      setSavedGames({});
      setIsLoadingGamesList(false);
    }
  }, [isAllSavedGamesQueryError, allSavedGamesQueryErrorData, t]);

  // Main initialization effect - runs once when all loading states become false
  useEffect(() => {
    const initializeApp = async () => {
      if (initialLoadComplete) {
        return;
      }

      // Wait for all queries to complete
      const allQueriesComplete = !isMasterRosterQueryLoading && 
                                !areSeasonsQueryLoading && 
                                !areTournamentsQueryLoading && 
                                !isAllSavedGamesQueryLoading && 
                                !isCurrentGameIdSettingQueryLoading;

      if (!allQueriesComplete) {
        return;
      }

      logger.log('[EFFECT init] All queries complete, initializing app...');

      // Set current game ID based on saved settings
      const lastGameIdSetting = currentGameIdSettingQueryResultData;
      const currentSavedGames = allSavedGamesQueryResultData || {};

      if (lastGameIdSetting && lastGameIdSetting !== DEFAULT_GAME_ID && currentSavedGames[lastGameIdSetting]) {
        logger.log(`[EFFECT init] Restoring last saved game: ${lastGameIdSetting}`);
        setCurrentGameId(lastGameIdSetting);
        setHasSkippedInitialSetup(true);
      } else {
        // If the saved game ID doesn't exist, try to find the most recent game
        if (sortedGamesByDate.length > 0) {
          const mostRecentId = sortedGamesByDate[0].id;
          logger.log(`[EFFECT init] Found most recent game to restore: ${mostRecentId}`);
          setCurrentGameId(mostRecentId);
          setHasSkippedInitialSetup(true);
        } else {
          if (lastGameIdSetting && lastGameIdSetting !== DEFAULT_GAME_ID) {
            logger.warn(`[EFFECT init] Last game ID ${lastGameIdSetting} not found in saved games. Loading default.`);
          }
          setCurrentGameId(DEFAULT_GAME_ID);
        }
      }

      // Timer restoration is now handled by useOfflineFirstGameTimer hook

      // Check if user has seen app guide
      const seenGuide = await getHasSeenAppGuide();
      if (!seenGuide) {
        setIsInstructionsModalOpen(true);
      }

      setInitialLoadComplete(true);
      logger.log('[EFFECT init] Initial application data coordination complete.');
    };

    initializeApp();
  }, [
    isMasterRosterQueryLoading,
    areSeasonsQueryLoading,
    areTournamentsQueryLoading,
    isAllSavedGamesQueryLoading,
    isCurrentGameIdSettingQueryLoading,
    initialLoadComplete,
    allSavedGamesQueryResultData,
    currentGameIdSettingQueryResultData,
    sortedGamesByDate
  ]);

  // Add a timeout for mobile loading issues
  useEffect(() => {
    if (isLoadingGamesList) {
      const timeout = setTimeout(() => {
        logger.error('[HomePage] Loading games timeout - forcing completion');
        setIsLoadingGamesList(false);
        setLoadGamesListError('Loading timed out. Please try again.');
      }, 15000); // 15 second timeout

      return () => clearTimeout(timeout);
    }
  }, [isLoadingGamesList]);

  // --- NEW: Robust Visibility Change Handling ---
  // --- Wake Lock Effect ---
  useEffect(() => {
    // This effect is now replaced by the direct call in the main timer effect
    // to avoid race conditions.
  }, []);

  // Helper function to load game state from game data
  const loadGameStateFromData = (gameData: AppState | null, isInitialDefaultLoad = false) => {
    // Set synchronization flag to prevent race conditions with auto-save
    setIsStateSynchronizing(true);
    
    // Use startTransition to batch all state updates together to prevent UI inconsistencies
    startTransition(() => {
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
        timeElapsedInSeconds: gameData.timeElapsedInSeconds,
      };
      dispatchGameSession({ type: 'LOAD_PERSISTED_GAME_DATA', payload });
    } else {
      dispatchGameSession({ type: 'RESET_TO_INITIAL_STATE', payload: initialGameSessionData });
      setIsPlayed(true);
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
    setIsPlayed(gameData?.isPlayed === false ? false : true);
    
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
    
    // Clear synchronization flag after all state updates are complete
    setIsStateSynchronizing(false);
    });
  };

  // --- Effect to load game state when currentGameId changes or savedGames updates ---
  useEffect(() => {
    if (!initialLoadComplete) {
      return; 
    }

    let gameToLoad: AppState | null = null; // Ensure this is AppState
    if (currentGameId && currentGameId !== DEFAULT_GAME_ID && savedGames[currentGameId]) {
      gameToLoad = savedGames[currentGameId] as AppState; // Cast to AppState
    } else {
    }
    loadGameStateFromData(gameToLoad); 

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGameId, savedGames, initialLoadComplete]); // IMPORTANT: initialLoadComplete ensures this runs after master roster is loaded.

  // --- Auto-save state using offline-first storage ---
  useEffect(() => {
    // Skip auto-save during new game creation to prevent overwriting the new game
    if (isCreatingNewGame) {
      return;
    }
    
    // Skip auto-save during state synchronization to prevent race conditions
    if (isStateSynchronizing) {
      return;
    }
    
    // Only auto-save if loaded AND we have a proper game ID (not the default unsaved one)
    const autoSave = async () => {
    if (initialLoadComplete && currentGameId && currentGameId !== DEFAULT_GAME_ID) {
      try {
        // CRITICAL BUG FIX: Add comprehensive debugging for assist-related saves
        const assistEvents = gameSessionState.gameEvents.filter(event => event.type === 'goal' && event.assisterId);
        logger.log(`[AUTO-SAVE] Starting auto-save for game ${currentGameId}`);
        logger.log(`[AUTO-SAVE] Total events: ${gameSessionState.gameEvents.length}, Events with assists: ${assistEvents.length}`);
        if (assistEvents.length > 0) {
          logger.log(`[AUTO-SAVE] Assist events details:`, assistEvents.map(e => {
            if (e.type === 'goal') {
              return {
                id: e.id,
                type: e.type,
                scorerId: e.scorerId,
                assisterId: e.assisterId,
                time: e.time
              };
            }
            return { id: e.id, type: e.type, time: e.time };
          }));
        }
        logger.log(`[AUTO-SAVE] Available players count: ${availablePlayers.length}, Master roster count: ${masterRosterQueryResultData?.length || 0}`);
        
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
          isPlayed,
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
          timeElapsedInSeconds: gameSessionState.timeElapsedInSeconds, // Include timer state
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

        // CRITICAL BUG FIX: Log snapshot details before save
        logger.log(`[AUTO-SAVE] Snapshot prepared - Events count: ${currentSnapshot.gameEvents.length}`);
        logger.log(`[AUTO-SAVE] Snapshot events with assists:`, currentSnapshot.gameEvents.filter(e => e.type === 'goal' && e.assisterId).map(e => {
          if (e.type === 'goal') {
            return {
              id: e.id,
              scorerId: e.scorerId,
              assisterId: e.assisterId
            };
          }
          return { id: e.id, type: e.type };
        }));
        
        // 2. Save the game snapshot using utility
        logger.log(`[AUTO-SAVE] Calling utilSaveGame...`);
        const savedResult = await utilSaveGame(currentGameId, currentSnapshot as AppState); // Cast to AppState for the util
        logger.log(`[AUTO-SAVE] Save completed successfully`);
        
        // 3. Update currentGameId if it changed (important for Supabase UUID sync)
        const newGameId = (savedResult as AppState & { id?: string }).id;
        if (newGameId && newGameId !== currentGameId) {
          logger.log(`Game ID changed from ${currentGameId} to ${newGameId} during save`);
          setCurrentGameId(newGameId);
          await utilSaveCurrentGameIdSetting(newGameId);
        } else {
          // Save App Settings (only the current game ID) using utility
          await utilSaveCurrentGameIdSetting(currentGameId);
        }

      } catch (error) {
        logger.error("[AUTO-SAVE] Failed to auto-save state:", error);
        
        // CRITICAL BUG FIX: Log detailed error context for debugging
        logger.error(`[AUTO-SAVE] Error context - Game ID: ${currentGameId}`);
        logger.error(`[AUTO-SAVE] Error context - Events count: ${gameSessionState.gameEvents.length}`);
        logger.error(`[AUTO-SAVE] Error context - Assist events:`, gameSessionState.gameEvents.filter(e => e.type === 'goal' && e.assisterId));
        
        // CRITICAL BUG FIX: Distinguish between different types of save errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        
        if (errorMessage.includes('not found') || errorMessage.includes('FK constraint') || errorMessage.includes('foreign key')) {
          // Data validation error - not a network issue
          alert(`Data validation error: ${errorMessage}\n\nThis is likely due to invalid player references. Please check your goal/assist entries.`);
        } else if (errorMessage.includes('network') || errorMessage.includes('offline') || errorMessage.includes('fetch')) {
          // Actual network error
          alert("Network error: Unable to save game. Please check your connection and try again.");
        } else {
          // Generic error
          alert(`Error saving game: ${errorMessage}`);
        }
      }
    } else if (initialLoadComplete && currentGameId === DEFAULT_GAME_ID) {
      logger.log("Not auto-saving as this is an unsaved game (no ID assigned yet)");
    }
    };
    autoSave();
    // Dependencies: Include all state variables that are part of the saved snapshot
  }, [initialLoadComplete, currentGameId, isCreatingNewGame, isStateSynchronizing,
      playersOnField, opponents, drawings, availablePlayers, masterRosterQueryResultData,
      // showPlayerNames, // REMOVED - Covered by gameSessionState
      // Local states that are part of the snapshot but not yet in gameSessionState:
      // gameEvents, // REMOVE - Now from gameSessionState
      gameSessionState,
      playerAssessments,
      tacticalDiscs,
      tacticalDrawings,
      tacticalBallPosition,
      isPlayed,
    ]);

  // **** ADDED: Effect to prompt for setup if default game ID is loaded ****
  useEffect(() => {
    // Only run the check *after* initial load is fully complete and setup hasn't been skipped
    if (initialLoadComplete && !hasSkippedInitialSetup) {
      // Check currentGameId *inside* the effect body
      if (currentGameId === DEFAULT_GAME_ID) {
      newGameSetupModal.open();
      } else {
    }
    }
  // Depend only on load completion and skip status - removed setIsNewGameSetupModalOpen from deps
  }, [initialLoadComplete, hasSkippedInitialSetup, currentGameId, newGameSetupModal]);

  // --- Player Management Handlers moved to usePlayerFieldManager ---

  

  // --- Team Name Handler ---


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

  // Handler to open/close the stats modal (Now using Zustand)
  const handleToggleGameStatsModal = useCallback(() => {
    // If the modal is currently open, we are about to close it.
    if (gameStatsModal.isOpen) {
      // Clear the selected player so it doesn't open to the same player next time.
      setSelectedPlayerForStats(null);
    }
    gameStatsModal.toggle();
  }, [gameStatsModal, setSelectedPlayerForStats]);

  // Placeholder handlers for updating game info (will be passed to modal)
  // const handleHomeScoreChange = (newScore: number) => {
  //   dispatchGameSession({ type: 'SET_HOME_SCORE', payload: newScore });
  // };
  // const handleAwayScoreChange = (newScore: number) => {
  //   dispatchGameSession({ type: 'SET_AWAY_SCORE', payload: newScore });
  // };

  // --- Handlers for Game Structure ---


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




  
  // Placeholder handlers for Save/Load Modals

  const handleOpenLoadGameModal = () => {
    logger.log("Opening Load Game Modal...");
    loadGameModal.open();
  };

  const handleCloseLoadGameModal = () => {
    loadGameModal.close();
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
    // (Timer state is now handled by IndexedDB, no manual cleanup needed)
    
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

  // Function to handle deleting a saved game - MOVED TO useGameDataManager hook
  // The handleDeleteGame function is now provided by useGameDataManager

  // Function to export all saved games as a single JSON file (RENAMED & PARAMETERIZED)
  // const handleExportAllGamesJson = () => { // This function is no longer used
  //   // ...
  // };

  // Helper functions moved to exportGames util
  
  // --- INDIVIDUAL GAME EXPORT HANDLERS - MOVED TO useGameDataManager hook ---
  // The handleExportOneJson and handleExportOneCsv functions are now provided by useGameDataManager

  // --- Roster Management Handlers (Now using Zustand) ---
  const openRosterModal = useCallback(() => {
    rosterSettingsModal.open();
    setHighlightRosterButton(false); // <<< Remove highlight when modal is opened
  }, [rosterSettingsModal, setHighlightRosterButton]);

  const openPlayerAssessmentModal = () => setIsPlayerAssessmentModalOpen(true);
  const closePlayerAssessmentModal = () => setIsPlayerAssessmentModalOpen(false);

  // ... (other code in Home component) ...

  const closeRosterModal = rosterSettingsModal.handleClose;

  // --- END Roster Management Handlers ---


  // --- NEW: Handler to Toggle Player Selection for Current Match ---


  // --- NEW: Quick Save Handler ---
  // --- Quick Save Handler - MOVED TO useGameDataManager hook ---
  // The handleQuickSaveGame function is now provided by useGameDataManager

  // --- Game Settings Modal Handlers (Now using Zustand) --- 
  const handleOpenGameSettingsModal = gameSettingsModal.handleOpen;
  const handleCloseGameSettingsModal = gameSettingsModal.handleClose;
  const handleOpenSettingsModal = () => {
    setIsSettingsModalOpen(true);
  };
  const handleCloseSettingsModal = () => {
    setIsSettingsModalOpen(false);
  };

  // --- Placeholder Handlers for GameSettingsModal (will be implemented properly later) ---




  // Add handler for home/away status

  const handleSetIsPlayed = (played: boolean) => {
    setIsPlayed(played);
  };

  // --- NEW Handlers for Setting Season/Tournament ID ---


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
    // Dynamic import for better bundle splitting
    import('@/utils/exportGames').then(({ exportAggregateJson }) => {
      exportAggregateJson(gamesData, aggregateStats);
    }).catch(error => {
      logger.error('Failed to load export utilities:', error);
      alert(t('export.error', 'Export failed. Please try again.'));
    });
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
    // Dynamic import for better bundle splitting
    import('@/utils/exportGames').then(({ exportAggregateCsv }) => {
      exportAggregateCsv(gamesData, aggregateStats);
    }).catch(error => {
      logger.error('Failed to load export utilities:', error);
      alert(t('export.error', 'Export failed. Please try again.'));
    });
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
    tournamentLevel: string,
    isPlayed: boolean
  ) => {
      // Prevent auto-save during new game creation
      setIsCreatingNewGame(true);
      
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
        tournamentLevel,
        isPlayed
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
          isPlayed: isPlayed,
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
          timeElapsedInSeconds: 0, // Always start with timer at 0
      };

      // Log the constructed state *before* saving
      // logger.log('[handleStartNewGameWithSetup] Constructed newGameState:', {
      //     periods: newGameState.numberOfPeriods,
      //     duration: newGameState.periodDurationMinutes,
      //     // REMOVED: numAvailablePlayers: newGameState.availablePlayers.length // Log roster size
      // });
      logger.log('[handleStartNewGameWithSetup] DIRECTLY CONSTRUCTED newGameState:', JSON.parse(JSON.stringify(newGameState)));

      // 2. Auto-generate temporary ID
      const tempGameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

      // 3. Reset History with the new state
      resetHistory(newGameState);

      setIsPlayed(isPlayed);

      try {
        await handleQuickSaveGame(tempGameId, newGameState);
      } catch (error) {
        logger.error('[handleStartNewGameWithSetup] Quick save failed:', error);
        throw error;
      }

      // Close the setup modal
      newGameSetupModal.close();
      setNewGameDemandFactor(1);

      // <<< Trigger the roster button highlight >>>
      setHighlightRosterButton(true);

      // Re-enable auto-save after new game creation is complete
      setIsCreatingNewGame(false);

  }, [
    // Keep necessary dependencies
    availablePlayers,
    resetHistory,
    newGameSetupModal,
    setNewGameDemandFactor,
    setHighlightRosterButton,
    setIsCreatingNewGame,
    setIsPlayed,
    handleQuickSaveGame,
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
    newGameSetupModal.close(); // ADDED: Explicitly close the modal
    setNewGameDemandFactor(1);
    
    // Re-enable auto-save if it was disabled for new game creation
    setIsCreatingNewGame(false);

  // REMOVED initialState from dependencies
  }, [newGameSetupModal, setIsCreatingNewGame]); // Added setter function to dependencies

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
        newGameSetupModal.open(); // Open setup modal immediately after
        // No need to return here; flow continues after quick save
      } else {
        // User chose Cancel (Discard) -> Proceed to next confirmation
        logger.log("Discarding current game changes to start new game.");
        // Confirmation for actually starting new game (ONLY shown if user DISCARDED previous game)
        if (window.confirm(t('controlBar.startNewMatchConfirmation', 'Are you sure you want to start a new match? Any unsaved progress will be lost.') ?? 'Are you sure?')) {
          logger.log("Start new game confirmed after discarding, opening setup modal...");
          // <<< SET default player selection (all players) >>>
          setPlayerIdsForNewGame(availablePlayers.map(p => p.id));
          newGameSetupModal.open(); // Open the setup modal
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
         newGameSetupModal.open(); // Open the setup modal
       }
       // If user cancels this confirmation, do nothing.
       // Exit the function after handling the no-game-loaded path.
       return; 
    }
    // Note: This part of the code is now only reachable if the user chose 'OK (Save & Continue)'
    // because the other paths explicitly return earlier.
    // <<< SET player selection based on current game BEFORE opening modal >>>
       setPlayerIdsForNewGame(gameSessionState.selectedPlayerIds);  // Use the current selection
    newGameSetupModal.open(); // Open setup modal (moved here for save & continue path)

  }, [t, currentGameId, savedGames, handleQuickSaveGame, newGameSetupModal,
      // <<< ADD dependencies >>>
      availablePlayers, gameSessionState.selectedPlayerIds, setPlayerIdsForNewGame
     ]); 
  // --- END Start New Game Handler ---

  // --- Player placement handler moved to usePlayerFieldManager ---

  // --- END Quick Save Handler ---

  // --- Step 3: Handler for Importing Games ---
  // const handleImportGamesFromJson = useCallback(async (jsonContent: string) => { // This function is no longer used
  //   // ...
  // }, [savedGames, setSavedGames, t]); 
  // --- End Step 3 --- 

  // --- NEW: Handlers for Game Settings Modal --- (Placeholder open/close)

  // Render null or a loading indicator until state is loaded
  // Note: Console log added before the check itself
 
  // ATTEMPTING TO EXPLICITLY REMOVE THE CONDITIONAL HOOK
  // The useEffect for highlightRosterButton that was here (around lines 2977-2992)
  // should be removed as it's called conditionally and its correct version is at the top level.


  const handleOpenPlayerStats = (playerId: string) => {
    const player = availablePlayers.find(p => p.id === playerId);
    if (player) {
      setSelectedPlayerForStats(player);
      gameStatsModal.open();
      rosterSettingsModal.close(); // Close the roster modal
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
    return <AppLoadingSkeleton />;
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
          onSignOut={signOut}
        />
      </div>

      {/* Modals and Overlays */}
      {/* Training Resources Modal */}
      <React.Suspense fallback={<ModalSkeleton title="Training Resources" />}>
        <TrainingResourcesModal
          isOpen={isTrainingResourcesOpen}
          onClose={handleToggleTrainingResources}
        />
      </React.Suspense>
      <React.Suspense fallback={<ModalSkeleton title="Instructions" />}>
        <InstructionsModal
          isOpen={isInstructionsModalOpen}
          onClose={handleToggleInstructionsModal}
        />
      </React.Suspense>
      {/* Goal Log Modal */}
      {isGoalLogModalOpen && (
        <React.Suspense fallback={
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 w-96 max-w-90vw">
              <div className="animate-pulse">
                <div className="h-6 bg-slate-700 rounded mb-4"></div>
                <div className="h-20 bg-slate-700 rounded mb-4"></div>
                <div className="h-10 bg-slate-700 rounded"></div>
              </div>
            </div>
          </div>
        }>
          <GoalLogModal 
            isOpen={isGoalLogModalOpen}
            onClose={handleToggleGoalLogModal}
            onLogGoal={handleAddGoalEvent}
            onLogOpponentGoal={handleLogOpponentGoal} // ADDED: Pass the handler
            availablePlayers={playersForCurrentGame} // MODIFIED: Pass players selected for the current game
            currentTime={gameSessionState.timeElapsedInSeconds}
          />
        </React.Suspense>
      )}
      {/* Game Stats Modal - Now using Zustand state */}
      {gameStatsModal.isOpen && (
        <React.Suspense fallback={<GameStatsModalSkeleton />}>
          <GameStatsModal
            isOpen={gameStatsModal.isOpen}
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
            onExportOneJson={handleExportOneJsonWrapper}
            onExportOneCsv={handleExportOneCsvWrapper}
            onExportAggregateJson={handleExportAggregateJson}
            onExportAggregateCsv={handleExportAggregateCsv}
            initialSelectedPlayerId={selectedPlayerForStats?.id}
            onGameClick={handleGameLogClick}
          />
        </React.Suspense>
      )}
      <React.Suspense fallback={<LoadGameModalSkeleton />}>
        <LoadGameModal 
          isOpen={loadGameModal.isOpen}
          onClose={loadGameModal.handleClose}
          savedGames={savedGames} 
          onLoad={handleLoadGame}
          onDelete={handleDeleteGame}
          onExportOneJson={handleExportOneJsonWrapper}
          onExportOneCsv={handleExportOneCsvWrapper}
          currentGameId={currentGameId || undefined} // Convert null to undefined
          // Pass loading and error state props for LoadGameModal
          isLoadingGamesList={isLoadingGamesList}
          loadGamesListError={loadGamesListError}
          isGameLoading={isGameLoading}
          gameLoadError={gameLoadError}
          // Removed - now handled by useGameDataManager:
          // isGameDeleting={isGameDeleting}
          // gameDeleteError={gameDeleteError}
          processingGameId={processingGameId}
        />
      </React.Suspense>

      {/* Conditionally render the New Game Setup Modal */}
      {newGameSetupModal.isOpen && (
        <React.Suspense fallback={<ModalSkeleton title="New Game Setup" />}>
          <NewGameSetupModal
            isOpen={newGameSetupModal.isOpen}
            initialPlayerSelection={playerIdsForNewGame} // <<< Pass the state here
            availablePlayers={availablePlayers} // Pass the players from state
            demandFactor={newGameDemandFactor}
            onDemandFactorChange={setNewGameDemandFactor}
            onStart={handleStartNewGameWithSetup} // CORRECTED Handler
            onCancel={newGameSetupModal.handleClose} 
            // Pass the new mutation functions
            addSeasonMutation={addSeasonMutation}
            addTournamentMutation={addTournamentMutation}
            // Pass loading states from mutations
            isAddingSeason={addSeasonMutation.isPending}
            isAddingTournament={addTournamentMutation.isPending}
          />
        </React.Suspense>
      )}

      {/* Roster Settings Modal */}
      <React.Suspense fallback={<RosterModalSkeleton />}>
        <RosterSettingsModal
          isOpen={rosterSettingsModal.isOpen}
          onClose={rosterSettingsModal.handleClose}
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
      </React.Suspense>

      <React.Suspense fallback={<ModalSkeleton title="Season & Tournament Management" />}>
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
      </React.Suspense>
      
      {/* <PlayerStatsModal 
          isOpen={isPlayerStatsModalOpen} 
          onClose={handleClosePlayerStats} 
          player={selectedPlayerForStats}
          savedGames={allSavedGamesQueryResultData || {}} 
          onGameClick={handleGameLogClick}
      /> */}

      <React.Suspense fallback={<ModalSkeleton title="Game Settings" />}>
        <GameSettingsModal
          isOpen={gameSettingsModal.isOpen}
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
          onAgeGroupChange={handleSetAgeGroup}
          onTournamentLevelChange={handleSetTournamentLevel}
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
          isPlayed={isPlayed}
          onIsPlayedChange={handleSetIsPlayed}
          addSeasonMutation={addSeasonMutation}
          addTournamentMutation={addTournamentMutation}
          isAddingSeason={addSeasonMutation.isPending}
          isAddingTournament={addTournamentMutation.isPending}
          timeElapsedInSeconds={timeElapsedInSeconds}
          updateGameDetailsMutation={updateGameDetailsMutation}
        />
      </React.Suspense>

      <React.Suspense fallback={<ModalSkeleton title="Settings" />}>
        <SettingsModal
          isOpen={isSettingsModalOpen}
          onClose={handleCloseSettingsModal}
          language={appLanguage}
          onLanguageChange={handleLanguageChange}
          defaultTeamName={defaultTeamNameSetting}
          onDefaultTeamNameChange={handleDefaultTeamNameChange}
          onResetGuide={handleShowAppGuide}
          onHardResetApp={handleHardResetApp}
          onSignOut={signOut}
        />
      </React.Suspense>

      <React.Suspense fallback={<ModalSkeleton title="Player Assessment" />}>
        <PlayerAssessmentModal
          isOpen={isPlayerAssessmentModalOpen}
          onClose={closePlayerAssessmentModal}
          selectedPlayerIds={gameSessionState.selectedPlayerIds}
          availablePlayers={availablePlayers}
          assessments={playerAssessments}
          onSave={handleSavePlayerAssessment}
          onDelete={handleDeletePlayerAssessment}
        />
      </React.Suspense>
      
      {/* Migration Modal */}
      {MigrationModalComponent}
    </main>
  );
}
export default HomePage;
