'use client';

import React, { useState, useEffect, useCallback, useMemo, useReducer, useRef } from 'react';
import SoccerField from '@/components/SoccerField';
import PlayerBar from '@/components/PlayerBar';
import ControlBar from '@/components/ControlBar';
import TimerOverlay from '@/components/TimerOverlay';
import GoalLogModal from '@/components/GoalLogModal';
import GameStatsModal from '@/components/GameStatsModal';
import TrainingResourcesModal from '@/components/TrainingResourcesModal';
import SaveGameModal from '@/components/SaveGameModal';
import LoadGameModal from '@/components/LoadGameModal';
import NewGameSetupModal from '@/components/NewGameSetupModal';
import RosterSettingsModal from '@/components/RosterSettingsModal';
import GameSettingsModal from '@/components/GameSettingsModal';
import SeasonTournamentManagementModal from '@/components/SeasonTournamentManagementModal';
import { useTranslation } from 'react-i18next';
import { useGameState, UseGameStateReturn } from '@/hooks/useGameState';
import GameInfoBar from '@/components/GameInfoBar';
import { useWakeLock } from '@/hooks/useWakeLock';
// Import the new game session reducer and related types
import {
  gameSessionReducer,
  GameSessionState,
  // initialGameSessionStatePlaceholder // We will derive initial state from page.tsx's initialState
} from '@/hooks/useGameSessionReducer';
// Import roster utility functions
import {
    getMasterRoster, // This is now the async one from masterRosterManager
    addPlayer,
    updatePlayer,
    removePlayer,
    setGoalieStatus
    // setFairPlayCardStatus // Removed as unused in page.tsx directly
} from '@/utils/masterRosterManager';

// Removed unused import of utilGetMasterRoster

// Import utility functions for seasons and tournaments
import { getSeasons as utilGetSeasons } from '@/utils/seasons';
import { getTournaments as utilGetTournaments } from '@/utils/tournaments';
import {
  getSavedGames as utilGetSavedGames,
  saveGame as utilSaveGame, // For auto-save and handleSaveGame
  deleteGame as utilDeleteGame, // For handleDeleteGame
  // GameData // Type // Comment out or remove GameData import if AppState is used directly
} from '@/utils/savedGames';
import {
  getCurrentGameIdSetting, // For initial load
  saveCurrentGameIdSetting as utilSaveCurrentGameIdSetting, // For saving current game ID setting
  resetAppSettings as utilResetAppSettings // For handleHardReset
} from '@/utils/appSettings';
import { deleteSeason as utilDeleteSeason, updateSeason as utilUpdateSeason, addSeason as utilAddSeason } from '@/utils/seasons';
import { deleteTournament as utilDeleteTournament, updateTournament as utilUpdateTournament, addTournament as utilAddTournament } from '@/utils/tournaments';
// Import Player from types directory
import { Player, Season, Tournament } from '@/types';
// Import saveMasterRoster utility
import { saveMasterRoster } from '@/utils/masterRoster';
// Import useQuery, useMutation, useQueryClient
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Import async localStorage utilities
import { getLocalStorageItemAsync, setLocalStorageItemAsync, removeLocalStorageItemAsync } from '@/utils/localStorage';
// Import query keys
import { queryKeys } from '@/config/queryKeys';
// Also import addSeason and addTournament for the new mutations
import { updateGameDetails as utilUpdateGameDetails } from '@/utils/savedGames';
// Import constants
import { DEFAULT_GAME_ID, MASTER_ROSTER_KEY, TIMER_STATE_KEY } from '@/config/constants';

// Define the Point type for drawing - Use relative coordinates
export interface Point {
  relX: number; // Relative X (0.0 to 1.0)
  relY: number; // Relative Y (0.0 to 1.0)
}

// Define the Opponent type - Use relative coordinates
export interface Opponent {
  id: string;
  relX: number; // Relative X (0.0 to 1.0)
  relY: number; // Relative Y (0.0 to 1.0)
}

// Define the structure for a game event
export interface GameEvent {
  id: string; // Unique ID for the event
  type: 'goal' | 'opponentGoal' | 'substitution' | 'periodEnd' | 'gameEnd' | 'fairPlayCard'; // Added fairPlayCard
  time: number; // Time in seconds relative to the start of the game
  scorerId?: string; // Player ID of the scorer (optional)
  assisterId?: string; // Player ID of the assister (optional)
  entityId?: string; // Optional: For events associated with a specific entity (e.g., player ID for fair play card)
  // Additional fields might be needed for other event types
}

// Define the structure for the timer state snapshot
interface TimerState {
  gameId: string;
  timeElapsedInSeconds: number;
  timestamp: number; // The Date.now() when the state was saved
}

// Define structure for substitution interval logs
export interface IntervalLog {
  period: number;
  duration: number; // Duration in seconds
  timestamp: number; // Unix timestamp when the interval ended
}

// Define the structure for the application state (for history)
export interface AppState {
  playersOnField: Player[];
  opponents: Opponent[]; 
  drawings: Point[][];
  availablePlayers: Player[]; // <<< RE-ADD: Roster at the time of saving
  showPlayerNames: boolean; 
  teamName: string; 
  gameEvents: GameEvent[]; // Add game events to state
  // Add game info state
  opponentName: string;
  gameDate: string;
  homeScore: number;
  awayScore: number;
  gameNotes: string; // Add game notes to state
  homeOrAway: 'home' | 'away'; // <<< Step 1: Add field
  // Add game structure state
  numberOfPeriods: 1 | 2;
  periodDurationMinutes: number;
  currentPeriod: number; // 1 or 2
  gameStatus: 'notStarted' | 'inProgress' | 'periodEnd' | 'gameEnd';
  selectedPlayerIds: string[]; // IDs of players selected for the current match
  // Replace gameType with required IDs, initialized as empty string
  seasonId: string; 
  tournamentId: string;
  // NEW: Optional fields for location and time
  gameLocation?: string;
  gameTime?: string; 
  // Timer related state to persist (NON-VOLATILE ONES)
  subIntervalMinutes?: number; // Add sub interval
  completedIntervalDurations?: IntervalLog[]; // Add completed interval logs
  lastSubConfirmationTimeSeconds?: number; // Add last substitution confirmation time
  // VOLATILE TIMER STATES REMOVED:
  // timeElapsedInSeconds?: number;
  // isTimerRunning?: boolean;
  // nextSubDueTimeSeconds?: number;
  // subAlertLevel?: 'none' | 'warning' | 'due';
  tacticalDiscs: TacticalDisc[];
  tacticalDrawings: Point[][];
  tacticalBallPosition: Point | null;
}

export interface TacticalDisc {
  id: string;
  relX: number;
  relY: number;
  type: 'home' | 'opponent' | 'goalie';
}

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
  // Initialize selectedPlayerIds with all players from initial data
  selectedPlayerIds: initialAvailablePlayersData.map(p => p.id),
  // gameType: 'season', // REMOVED
  seasonId: '', // Initialize season ID
  tournamentId: '', // Initialize tournament ID
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

// Define new localStorage keys
const SEASONS_LIST_KEY = 'soccerSeasons';
// const TOURNAMENTS_LIST_KEY = 'soccerTournaments'; // Removed unused variable
// const MASTER_ROSTER_KEY = 'soccerMasterRoster'; // <<< NEW KEY for global roster - now imported from constants

// Define structure for settings
// interface AppSettings {
//   currentGameId: string | null;
//   // Add other non-game-specific settings here later if needed
//   // e.g., preferredLanguage: string;
// }

// Define structure for saved games collection
export interface SavedGamesCollection {
  [gameId: string]: AppState; // Use AppState for the game state structure
}

// Define a default Game ID for the initial/unsaved state - now imported from constants



export default function Home() {
  console.log('--- page.tsx RENDER ---');
  const { t } = useTranslation(); // Get translation function
  const queryClient = useQueryClient(); // Get query client instance
  const { syncWakeLock } = useWakeLock();

 
  
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
    selectedPlayerIds: initialState.selectedPlayerIds,
    seasonId: initialState.seasonId,
    tournamentId: initialState.tournamentId,
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

  // --- Refs to hold the latest state for the stable visibility handler ---
  const isRunningRef = useRef(gameSessionState.isTimerRunning);
  const elapsedRef = useRef(gameSessionState.timeElapsedInSeconds);
  
  // Effects to keep the refs in sync with the state
  useEffect(() => { isRunningRef.current = gameSessionState.isTimerRunning; }, [gameSessionState.isTimerRunning]);
  useEffect(() => { elapsedRef.current = gameSessionState.timeElapsedInSeconds; }, [gameSessionState.timeElapsedInSeconds]);

  useEffect(() => {
    console.log('[gameSessionState CHANGED]', gameSessionState);
  }, [gameSessionState]);

  // --- History Management (Still needed here for now) ---
  const [history, setHistory] = useState<AppState[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const saveStateToHistory = useCallback((newState: Partial<AppState>) => {
    // This function currently modifies the 'history' state variable,
    // which is ONLY used for runtime undo/redo in the current session.
    // It no longer interacts directly with the localStorage saving mechanism.
    
    // Get the current state from the *last* entry in the session history
    const currentHistoryState = history[historyIndex];
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

    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, nextState]);
    setHistoryIndex(newHistory.length);

  }, [history, historyIndex]); // Dependencies are just history state

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

  // --- TanStack Query for Master Roster ---
  const {
    data: masterRosterQueryResultData,
    isLoading: isMasterRosterQueryLoading,
    isError: isMasterRosterQueryError,
    error: masterRosterQueryErrorData,
  } = useQuery<Player[], Error>({
    queryKey: queryKeys.masterRoster,
    queryFn: getMasterRoster,
  });

  // --- TanStack Query for Seasons ---
  const {
    data: seasonsQueryResultData,
    isLoading: areSeasonsQueryLoading,
    isError: isSeasonsQueryError,
    error: seasonsQueryErrorData,
  } = useQuery<Season[], Error>({
    queryKey: queryKeys.seasons,
    queryFn: utilGetSeasons,
  });

  // --- TanStack Query for Tournaments ---
  const {
    data: tournamentsQueryResultData,
    isLoading: areTournamentsQueryLoading,
    isError: isTournamentsQueryError,
    error: tournamentsQueryErrorData,
  } = useQuery<Tournament[], Error>({
    queryKey: queryKeys.tournaments,
    queryFn: utilGetTournaments,
  });

  // --- TanStack Query for All Saved Games ---
  const {
    data: allSavedGamesQueryResultData,
    isLoading: isAllSavedGamesQueryLoading,
    isError: isAllSavedGamesQueryError,
    error: allSavedGamesQueryErrorData,
  } = useQuery<SavedGamesCollection | null, Error>({
    queryKey: queryKeys.savedGames,
    queryFn: utilGetSavedGames,
    initialData: {}, 
  });

  // --- TanStack Query for Current Game ID Setting ---
  const {
    data: currentGameIdSettingQueryResultData,
    isLoading: isCurrentGameIdSettingQueryLoading,
    isError: isCurrentGameIdSettingQueryError,
    error: currentGameIdSettingQueryErrorData,
  } = useQuery<string | null, Error>({
    queryKey: queryKeys.appSettingsCurrentGameId,
    queryFn: getCurrentGameIdSetting,
  });

  // --- Core Game State (Managed by Hook) ---
  const {
    playersOnField,
    opponents,
    drawings, // State from hook
    availablePlayers, // This should be the roster from useGameState, ideally updated via async calls
    setPlayersOnField,
    setOpponents,
    setDrawings, 
    setAvailablePlayers, // Setter from useGameState
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

  // ADD State for seasons/tournaments lists
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  // <<< ADD: State for home/away status >>>
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  const [hasSkippedInitialSetup, setHasSkippedInitialSetup] = useState<boolean>(false);
  const [isGameSettingsModalOpen, setIsGameSettingsModalOpen] = useState<boolean>(false); // <<< ADDED State Declaration
  const [isLoadGameModalOpen, setIsLoadGameModalOpen] = useState<boolean>(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false); // State for the new modal
  const [isSeasonTournamentModalOpen, setIsSeasonTournamentModalOpen] = useState<boolean>(false);
  // const [isPlayerStatsModalOpen, setIsPlayerStatsModalOpen] = useState(false);
  const [selectedPlayerForStats, setSelectedPlayerForStats] = useState<Player | null>(null);

  // --- Timer State (Still needed here) ---
  const [showLargeTimerOverlay, setShowLargeTimerOverlay] = useState<boolean>(false); // State for overlay visibility
  
  // --- Modal States (Still needed here) ---
  const [isTrainingResourcesOpen, setIsTrainingResourcesOpen] = useState<boolean>(false); 
  const [isGoalLogModalOpen, setIsGoalLogModalOpen] = useState<boolean>(false); 
  const [isGameStatsModalOpen, setIsGameStatsModalOpen] = useState<boolean>(false);
  const [isNewGameSetupModalOpen, setIsNewGameSetupModalOpen] = useState<boolean>(false);
  const [isSaveGameModalOpen, setIsSaveGameModalOpen] = useState<boolean>(false);

  // <<< ADD State to hold player IDs for the next new game >>>
  const [playerIdsForNewGame, setPlayerIdsForNewGame] = useState<string[] | null>(null);
  // <<< ADD State for the roster prompt toast >>>
  // const [showRosterPrompt, setShowRosterPrompt] = useState<boolean>(false);
  // <<< ADD State for roster button highlight >>>
  const [highlightRosterButton, setHighlightRosterButton] = useState<boolean>(false);

  // State for roster operations loading/error
  // const [isRosterUpdating, setIsRosterUpdating] = useState(false); // REMOVING THIS LINE
  const [rosterError, setRosterError] = useState<string | null>(null);

  // State for game saving error (loading state is from saveGameMutation.isLoading)
  const [gameSaveError, setGameSaveError] = useState<string | null>(null);

  // NEW: States for LoadGameModal operations
  const [isLoadingGamesList, setIsLoadingGamesList] = useState(false);
  const [loadGamesListError, setLoadGamesListError] = useState<string | null>(null);
  const [isGameLoading, setIsGameLoading] = useState(false); // For loading a specific game
  const [gameLoadError, setGameLoadError] = useState<string | null>(null);
  const [isGameDeleting, setIsGameDeleting] = useState(false); // For deleting a specific game
  const [gameDeleteError, setGameDeleteError] = useState<string | null>(null);
  const [processingGameId, setProcessingGameId] = useState<string | null>(null); // To track which game item is being processed
  const [isTacticsBoardView, setIsTacticsBoardView] = useState<boolean>(false);
  const [tacticalDiscs, setTacticalDiscs] = useState<TacticalDisc[]>([]);
  const [tacticalDrawings, setTacticalDrawings] = useState<Point[][]>([]);
  const [tacticalBallPosition, setTacticalBallPosition] = useState<Point | null>(initialState.tacticalBallPosition);

  const handleToggleTacticsBoard = () => {
    setIsTacticsBoardView(!isTacticsBoardView);
  };

  const handleAddTacticalDisc = (type: 'home' | 'opponent') => {
    const newDisc: TacticalDisc = {
      id: `tactical-${type}-${Date.now()}`,
      relX: 0.5,
      relY: 0.5,
      type: type,
    };
    const newDiscs = [...tacticalDiscs, newDisc];
    setTacticalDiscs(newDiscs);
    saveStateToHistory({ tacticalDiscs: newDiscs });
  };

  const handleTacticalDiscMove = (discId: string, relX: number, relY: number) => {
    const newDiscs = tacticalDiscs.map(d => d.id === discId ? { ...d, relX, relY } : d);
    setTacticalDiscs(newDiscs);
    saveStateToHistory({ tacticalDiscs: newDiscs });
  };

  const handleTacticalDiscRemove = (discId: string) => {
    const newDiscs = tacticalDiscs.filter(d => d.id !== discId);
    setTacticalDiscs(newDiscs);
    saveStateToHistory({ tacticalDiscs: newDiscs });
  };

  const handleToggleTacticalDiscType = (discId: string) => {
    const newDiscs = tacticalDiscs.map(d => {
      if (d.id === discId) {
        if (d.type === 'home') return { ...d, type: 'goalie' as const };
        if (d.type === 'goalie') return { ...d, type: 'home' as const };
      }
      return d;
    });
    setTacticalDiscs(newDiscs);
    saveStateToHistory({ tacticalDiscs: newDiscs });
  };

  const handleTacticalBallMove = (position: Point) => {
    setTacticalBallPosition(position);
    saveStateToHistory({ tacticalBallPosition: position });
  };

  // --- Mutation for Saving Game (Initial definition with mutationFn only) ---
  const saveGameMutation = useMutation<
    string, // Return type: gameId successfully saved
    Error,  // Error type
    { gameIdToSave: string; snapshot: AppState; gameName: string; /* isOverwrite: boolean; */ } // Variables type
  >({
    mutationFn: async ({ gameIdToSave, snapshot }) => {
      await utilSaveGame(gameIdToSave, snapshot);
      await utilSaveCurrentGameIdSetting(gameIdToSave);
      return gameIdToSave;
    },
    onSuccess: (savedGameId, variables) => {
      console.log('[Mutation Success] Game saved:', savedGameId);
      queryClient.invalidateQueries({ queryKey: queryKeys.savedGames });
      queryClient.invalidateQueries({ queryKey: queryKeys.appSettingsCurrentGameId });

      if (variables.gameIdToSave !== currentGameId || currentGameId === DEFAULT_GAME_ID) {
         setCurrentGameId(variables.gameIdToSave); 
      }
      
      setSavedGames(prev => ({ ...prev, [variables.gameIdToSave]: variables.snapshot }));

      setIsSaveGameModalOpen(false);
      setGameSaveError(null); 
    },
    onError: (error, variables) => {
      console.error(`[Mutation Error] Failed to save game ${variables.gameName} (ID: ${variables.gameIdToSave}):`, error);
      setGameSaveError(t('saveGameModal.errors.saveFailed', 'Error saving game. Please try again.'));
    },
  });

  // --- Mutation for Updating Player in Master Roster ---
  const updatePlayerMutation = useMutation<
    Player | null, // Return type from masterRosterManager.updatePlayer
    Error,        // Error type
    { playerId: string; playerData: Partial<Omit<Player, 'id'>>; } // Variables type
  >({
    mutationFn: async ({ playerId, playerData }) => {
      // The updatePlayer utility from masterRosterManager is already async
      return updatePlayer(playerId, playerData);
    },
    onSuccess: (updatedPlayer, variables) => {
      console.log('[Mutation Success] Player updated:', variables.playerId, updatedPlayer);
      
      // Capture current availablePlayers before invalidation if needed for history
      const previousAvailablePlayers = [...availablePlayers]; // Shallow copy

      queryClient.invalidateQueries({ queryKey: queryKeys.masterRoster }); 
      // After invalidation, the masterRosterQueryResultData useEffect will update setAvailablePlayers from the hook

      if (updatedPlayer) {
        // Update playersOnField state and then save that specific change to history
        setPlayersOnField(prevPlayersOnField => {
          const nextPlayersOnField = prevPlayersOnField.map(p => 
            p.id === updatedPlayer.id ? { ...p, ...updatedPlayer } : p
          );
          // Save history with the availablePlayers roster *before* this mutation's invalidation took full effect
          saveStateToHistory({ 
            playersOnField: nextPlayersOnField, 
            availablePlayers: previousAvailablePlayers // Save the pre-mutation roster for this history step
          }); 
          return nextPlayersOnField; // Return it to update React state
        });
      }
      setRosterError(null); 
    },
    onError: (error, variables) => {
      console.error(`[Mutation Error] Failed to update player ${variables.playerId}:`, error);
      setRosterError(t('rosterSettingsModal.errors.updateFailed', 'Error updating player {playerName}. Please try again.', { playerName: variables.playerData.name || variables.playerId }));
    },
  });

  // --- Mutation for Setting Goalie Status in Master Roster ---
  const setGoalieStatusMutation = useMutation<
    Player | null, // Return type from masterRosterManager.setGoalieStatus
    Error,        // Error type
    { playerId: string; isGoalie: boolean; } // Variables type
  >({
    mutationFn: async ({ playerId, isGoalie }) => {
      return setGoalieStatus(playerId, isGoalie);
    },
    onSuccess: (updatedPlayer, variables) => {
      console.log('[Mutation Success] Goalie status updated:', variables.playerId, updatedPlayer);

      // Capture current availablePlayers before invalidation if needed for history
      const previousAvailablePlayers = [...availablePlayers]; // Shallow copy
      
      queryClient.invalidateQueries({ queryKey: queryKeys.masterRoster });
      // After invalidation, the masterRosterQueryResultData useEffect will update setAvailablePlayers from the hook

      if (updatedPlayer) {
        setPlayersOnField(prevPlayersOnField => {
          const nextPlayersOnField = prevPlayersOnField.map(p => {
            if (p.id === updatedPlayer.id) {
              return { ...p, ...updatedPlayer }; // Apply all changes from updatedPlayer
            }
            // If we just set a new goalie (variables.isGoalie is true),
            // and this player 'p' is a goalie but not the one we just updated,
            // then unset their goalie status.
            if (variables.isGoalie && p.isGoalie && p.id !== updatedPlayer.id) {
              return { ...p, isGoalie: false };
            }
            return p;
          });
          // Save history with the availablePlayers roster *before* this mutation's invalidation took full effect
          saveStateToHistory({ 
            playersOnField: nextPlayersOnField,
            availablePlayers: previousAvailablePlayers // Save the pre-mutation roster for this history step
          });
          return nextPlayersOnField;
        });
      }
      setRosterError(null);
    },
    onError: (error, variables) => {
      console.error(`[Mutation Error] Failed to set goalie status for player ${variables.playerId}:`, error);
      setRosterError(t('rosterSettingsModal.errors.goalieStatusFailed', 'Error setting goalie status for player {playerId}. Please try again.', { playerId: variables.playerId }));
    },
  });

  // --- Mutation for Removing Player from Master Roster ---
  const removePlayerMutation = useMutation<
    boolean,      // CORRECTED: Return type from masterRosterManager.removePlayer (indicates success)
    Error,        // Error type
    { playerId: string; } // Variables type
  >({
    mutationFn: async ({ playerId }) => {
      return removePlayer(playerId); // This utility returns Promise<boolean>
    },
    onSuccess: (success, variables) => {
      if (success) {
        console.log('[Mutation Success] Player removed:', variables.playerId);
        queryClient.invalidateQueries({ queryKey: queryKeys.masterRoster });

        let nextPlayersOnField: Player[] = [];
        setPlayersOnField(prev => {
          nextPlayersOnField = prev.filter(p => p.id !== variables.playerId);
          return nextPlayersOnField;
        });

        // let nextSelectedPlayerIds: string[] = []; // REMOVE local variable
        // setSelectedPlayerIds(prev => { // REMOVE direct state update
        //   nextSelectedPlayerIds = prev.filter(id => id !== variables.playerId);
        //   return nextSelectedPlayerIds;
        // });
        const newSelectedPlayerIds = gameSessionState.selectedPlayerIds.filter(id => id !== variables.playerId);
        dispatchGameSession({ type: 'SET_SELECTED_PLAYER_IDS', payload: newSelectedPlayerIds });

        saveStateToHistory({
          playersOnField: nextPlayersOnField,
          selectedPlayerIds: newSelectedPlayerIds // USE newSelectedPlayerIds for history
        });

        setRosterError(null);
      } else {
        // This case might indicate the player wasn't found or some other non-exception failure
        console.warn('[Mutation Non-Success] removePlayer returned false for player:', variables.playerId);
        setRosterError(t('rosterSettingsModal.errors.removeFailedNotFound', 'Error removing player {playerId}. Player not found or removal failed.', { playerId: variables.playerId }));
      }
    },
    onError: (error, variables) => {
      console.error(`[Mutation Error] Failed to remove player ${variables.playerId}:`, error);
      setRosterError(t('rosterSettingsModal.errors.removeFailed', 'Error removing player {playerId}. Please try again.', { playerId: variables.playerId }));
    },
  });

  // --- Mutation for Adding Player to Master Roster ---
  const addPlayerMutation = useMutation<
    Player | null, // Return type from masterRosterManager.addPlayer
    Error,         // Error type
    { name: string; jerseyNumber: string; notes: string; nickname: string; } // Variables type (player data)
  >({
    mutationFn: async (playerData) => {
      return addPlayer(playerData);
    },
    onSuccess: (newPlayer, variables) => {
      if (newPlayer) {
        console.log('[Mutation Success] Player added:', newPlayer.name, newPlayer.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.masterRoster });

        // When a new player is added, they should be automatically selected.
        // If the roster was empty before, this new player should be the ONLY one selected.
        const newSelectedPlayerIds = gameSessionState.selectedPlayerIds.includes(newPlayer.id)
          ? gameSessionState.selectedPlayerIds
          : [...gameSessionState.selectedPlayerIds, newPlayer.id];

        dispatchGameSession({ type: 'SET_SELECTED_PLAYER_IDS', payload: newSelectedPlayerIds });
        
        
        setRosterError(null);
      } else {
        // This case might indicate a duplicate name or some other non-exception failure from addPlayer
        // The new checks in handleAddPlayerForModal should catch most duplicates before this point.
        // However, this backend check (if addPlayer utility implements it) is a good fallback.
        console.warn('[Mutation Non-Success] addPlayer returned null for player:', variables.name);
        setRosterError(t('rosterSettingsModal.errors.addFailedDuplicate', 'Error adding player {playerName}. Player may already exist or data is invalid.', { playerName: variables.name }));
      }
    },
    onError: (error, variables) => {
      console.error(`[Mutation Error] Failed to add player ${variables.name}:`, error);
      setRosterError(t('rosterSettingsModal.errors.addFailed', 'Error adding player {playerName}. Please try again.', { playerName: variables.name }));
    },
  });

  // --- Mutation for Adding a new Season ---
  const addSeasonMutation = useMutation<
    Season | null, // Return type from utilAddSeason
    Error,         // Error type
    { name: string } // Variables type (season name)
  >({
    mutationFn: async ({ name }) => {
      return utilAddSeason(name);
    },
    onSuccess: (newSeason, variables) => {
      if (newSeason) {
        console.log('[Mutation Success] Season added:', newSeason.name, newSeason.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.seasons });
        // Potentially set an optimistic update or directly update local 'seasons' state if needed
        // For now, relying on query invalidation to refresh the seasons list
      } else {
        // This case might indicate a duplicate name or some other non-exception failure from utilAddSeason
        console.warn('[Mutation Non-Success] utilAddSeason returned null for season:', variables.name);
        // Consider setting a specific error state for the NewGameSetupModal if it's a common issue
        // alert(t('newGameSetupModal.errors.addSeasonFailed', 'Failed to add season: {seasonName}. It might already exist.', { seasonName: variables.name }));
      }
    },
    onError: (error, variables) => {
      console.error(`[Mutation Error] Failed to add season ${variables.name}:`, error);
      // alert(t('newGameSetupModal.errors.addSeasonFailedUnexpected', 'An unexpected error occurred while adding season: {seasonName}.', { seasonName: variables.name }));
    },
  });

  const updateSeasonMutation = useMutation<Season | null, Error, { id: string; name: string }>({
    mutationFn: async ({ id, name }) => utilUpdateSeason({ id, name }),
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

  const updateTournamentMutation = useMutation<Tournament | null, Error, { id: string; name: string }>({
      mutationFn: async ({ id, name }) => utilUpdateTournament({ id, name }),
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
    mutationFn: ({ gameId, updates }: { gameId: string, updates: Partial<AppState> }) => utilUpdateGameDetails(gameId, updates),
    onSuccess: (data, variables) => {
      // After a successful update, invalidate the savedGames query to refetch
      queryClient.invalidateQueries({ queryKey: queryKeys.savedGames });
      
      // OPTIONALLY: Optimistically update the query data
      queryClient.setQueryData(queryKeys.savedGames, (oldData: SavedGamesCollection | undefined) => {
        if (!oldData) return oldData;
        const gameId = variables.gameId;
        const existingGame = oldData[gameId];
        if (existingGame) {
          return {
            ...oldData,
            [gameId]: { ...existingGame, ...variables.updates },
          };
        }
        return oldData;
      });
    },
    onError: (error) => {
      console.error("Error updating game details:", error);
      // Here you could show a toast notification to the user
      },
  });

  // --- Mutation for Adding a new Tournament ---
  const addTournamentMutation = useMutation<
    Tournament | null, // Return type from utilAddTournament
    Error,             // Error type
    { name: string }   // Variables type (tournament name)
  >({
    mutationFn: async ({ name }) => {
      return utilAddTournament(name);
    },
    onSuccess: (newTournament, variables) => {
      if (newTournament) {
        console.log('[Mutation Success] Tournament added:', newTournament.name, newTournament.id);
        queryClient.invalidateQueries({ queryKey: queryKeys.tournaments });
        // Similar to seasons, could optimistically update or rely on invalidation
      } else {
        console.warn('[Mutation Non-Success] utilAddTournament returned null for tournament:', variables.name);
        // alert(t('newGameSetupModal.errors.addTournamentFailed', 'Failed to add tournament: {tournamentName}. It might already exist.', { tournamentName: variables.name }));
      }
    },
    onError: (error, variables) => {
      console.error(`[Mutation Error] Failed to add tournament ${variables.name}:`, error);
      // alert(t('newGameSetupModal.errors.addTournamentFailedUnexpected', 'An unexpected error occurred while adding tournament: {tournamentName}.', { tournamentName: variables.name }));
    },
  });

  // --- Derived State for Filtered Players (Moved to top-level) ---
  const playersForCurrentGame = useMemo(() => {
    if (!Array.isArray(availablePlayers)) {
      console.warn('[MEMO playersForCurrentGame] availablePlayers is not an array. Returning []. Value:', availablePlayers);
        return [];
    }
    // If no players are selected for the current game, the list of players eligible for goal/assist should be empty.
    if (!gameSessionState.selectedPlayerIds || gameSessionState.selectedPlayerIds.length === 0) { 
        // For PlayerBar, it might show all available players if none are selected for the game (depends on desired PlayerBar behavior).
        // However, for GoalLogModal, it should be an empty list.
        // Since GoalLogModal will now use this, we return [] if no players selected for game.
        // If PlayerBar needs a different behavior, it might need its own derived list or this logic might need further refinement
        // depending on where else playersForCurrentGame is used.
        // For the specific bug of GoalLogModal, returning [] here is correct.
        return []; 
    }
    const gamePlayers = availablePlayers.filter(player => gameSessionState.selectedPlayerIds.includes(player.id)); // USE gameSessionState
    return gamePlayers;
  }, [availablePlayers, gameSessionState.selectedPlayerIds]); // USE gameSessionState.selectedPlayerIds

  // --- Effect to update availablePlayers from useQuery ---
  useEffect(() => {
    if (isMasterRosterQueryLoading) {
      console.log('[TanStack Query] Master Roster is loading...');
    }
    if (masterRosterQueryResultData) {
      setAvailablePlayers(masterRosterQueryResultData);
    }
    if (isMasterRosterQueryError) {
      console.error('[TanStack Query] Error loading master roster:', masterRosterQueryErrorData);
      setAvailablePlayers([]);
    }
  }, [masterRosterQueryResultData, isMasterRosterQueryLoading, isMasterRosterQueryError, masterRosterQueryErrorData, setAvailablePlayers]);

  // --- Effect to update seasons from useQuery ---
  useEffect(() => {
    if (areSeasonsQueryLoading) {
      console.log('[TanStack Query] Seasons are loading...');
    }
    if (seasonsQueryResultData) {
      setSeasons(Array.isArray(seasonsQueryResultData) ? seasonsQueryResultData : []);
    }
    if (isSeasonsQueryError) {
      console.error('[TanStack Query] Error loading seasons:', seasonsQueryErrorData);
      setSeasons([]);
    }
  }, [seasonsQueryResultData, areSeasonsQueryLoading, isSeasonsQueryError, seasonsQueryErrorData, setSeasons]);

  // --- Effect to update tournaments from useQuery ---
  useEffect(() => {
    if (areTournamentsQueryLoading) {
      console.log('[TanStack Query] Tournaments are loading...');
    }
    if (tournamentsQueryResultData) {
      setTournaments(Array.isArray(tournamentsQueryResultData) ? tournamentsQueryResultData : []);
    }
    if (isTournamentsQueryError) {
      console.error('[TanStack Query] Error loading tournaments:', tournamentsQueryErrorData);
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
          // console.log('[EFFECT syncPoF] playersOnField updated due to availablePlayers change. Saving to history.');
          saveStateToHistory({ playersOnField: nextPlayersOnField });
        }
        return nextPlayersOnField;
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availablePlayers, saveStateToHistory]); // setPlayersOnField is from useGameState, should be stable if not changing the hook itself
  // Note: We don't want setPlayersOnField in deps if it causes loops. 
  // saveStateToHistory is also a dependency as it's used inside.

  // --- Timer Effect ---
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    const periodEndTimeSeconds = gameSessionState.currentPeriod * gameSessionState.periodDurationMinutes * 60;

    // Sync wake lock state with timer state
    syncWakeLock(gameSessionState.isTimerRunning);

    const saveTimerState = async () => {
      if (currentGameId) {
        const timerState: TimerState = {
          gameId: currentGameId,
          timeElapsedInSeconds: gameSessionState.timeElapsedInSeconds,
          timestamp: Date.now(),
        };
        await setLocalStorageItemAsync(TIMER_STATE_KEY, JSON.stringify(timerState));
      }
    };

    if (gameSessionState.isTimerRunning && gameSessionState.gameStatus === 'inProgress') {
      intervalId = setInterval(() => {
        saveTimerState(); // Save state on each tick
        const currentTime = gameSessionState.timeElapsedInSeconds;
        // Round the current time before incrementing to avoid decimal drift
        const potentialNewTime = Math.round(currentTime) + 1;

        if (potentialNewTime >= periodEndTimeSeconds) {
          clearInterval(intervalId!); // Stop the interval
          removeLocalStorageItemAsync(TIMER_STATE_KEY);
          // setIsTimerRunning(false); // Reducer's END_PERIOD_OR_GAME will handle this
          if (gameSessionState.currentPeriod === gameSessionState.numberOfPeriods) {
            dispatchGameSession({ type: 'END_PERIOD_OR_GAME', payload: { newStatus: 'gameEnd', finalTime: periodEndTimeSeconds } });
              console.log("Game ended.");
            } else {
            dispatchGameSession({ type: 'END_PERIOD_OR_GAME', payload: { newStatus: 'periodEnd', finalTime: periodEndTimeSeconds } });
            console.log(`Period ${gameSessionState.currentPeriod} ended.`);
          }
        } else {
          dispatchGameSession({ type: 'SET_TIMER_ELAPSED', payload: potentialNewTime });
        }
      }, 1000);
    } else {
      // When timer is NOT running (paused, stopped), we should NOT clear the state.
      // The state should only be cleared on explicit reset or game end.
      if (intervalId) {
        clearInterval(intervalId);
      }
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [gameSessionState.isTimerRunning, gameSessionState.gameStatus, gameSessionState.currentPeriod, gameSessionState.periodDurationMinutes, gameSessionState.numberOfPeriods, gameSessionState.timeElapsedInSeconds, gameSessionState.nextSubDueTimeSeconds, currentGameId, syncWakeLock]); // Reflect isTimerRunning from gameSessionState

  // --- Load state from localStorage on mount (REVISED) ---

    // --- NEW: Robust Visibility Change Handling ---
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Use the ref to get the most up-to-date state
        if (isRunningRef.current) {
          const timerState: TimerState = {
            gameId: gameIdRef.current || '',
            timeElapsedInSeconds: elapsedRef.current,
            timestamp: Date.now(),
          };
          await setLocalStorageItemAsync(TIMER_STATE_KEY, JSON.stringify(timerState));
          dispatchGameSession({ type: 'PAUSE_TIMER_FOR_HIDDEN' });
        }
      } else {
        const savedTimerStateJSON = await getLocalStorageItemAsync(TIMER_STATE_KEY);
        if (savedTimerStateJSON) {
          const savedTimerState: TimerState = JSON.parse(savedTimerStateJSON);
          // Use the ref to get the most up-to-date game ID for comparison
          if (savedTimerState && savedTimerState.gameId === gameIdRef.current) {
            dispatchGameSession({
              type: 'RESTORE_TIMER_STATE',
              payload: {
                savedTime: savedTimerState.timeElapsedInSeconds,
                timestamp: savedTimerState.timestamp,
              },
            });
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Empty dependency array ensures this listener is stable and created only once
  
  useEffect(() => {
    const loadInitialAppData = async () => {
      console.log('[EFFECT init] Coordinating initial application data from TanStack Query...');
      // This useEffect now primarily ensures that dependent state updates happen
      // after the core data (masterRoster, seasons, tournaments, savedGames, currentGameIdSetting)
      // has been fetched by their respective useQuery hooks.

      // Simple migration for old data keys (if any) - Run once
      try {
        const oldRosterJson = await getLocalStorageItemAsync('availablePlayers');
        if (oldRosterJson) {
          console.log('[EFFECT init] Migrating old roster data...');
          await setLocalStorageItemAsync(MASTER_ROSTER_KEY, oldRosterJson);
          await removeLocalStorageItemAsync('availablePlayers');
          // Consider invalidating and refetching masterRoster query here if migration happens
          // queryClient.invalidateQueries(queryKeys.masterRoster);
        }
        const oldSeasonsJson = await getLocalStorageItemAsync('soccerSeasonsList'); // Another old key
      if (oldSeasonsJson) {
          console.log('[EFFECT init] Migrating old seasons data...');
          await setLocalStorageItemAsync(SEASONS_LIST_KEY, oldSeasonsJson); // New key
          // queryClient.invalidateQueries(queryKeys.seasons);
      }
    } catch (migrationError) {
        console.error('[EFFECT init] Error during data migration:', migrationError);
      }

      // Master Roster, Seasons, Tournaments are handled by their own useEffects reacting to useQuery.

      // 4. Update local savedGames state from useQuery for allSavedGames
      if (isAllSavedGamesQueryLoading) {
        console.log('[EFFECT init] All saved games are loading via TanStack Query...');
        setIsLoadingGamesList(true);
      }
      if (allSavedGamesQueryResultData) {
        setSavedGames(allSavedGamesQueryResultData || {});
        setIsLoadingGamesList(false);
      }
      if (isAllSavedGamesQueryError) {
        console.error('[EFFECT init] Error loading all saved games via TanStack Query:', allSavedGamesQueryErrorData);
        setLoadGamesListError(t('loadGameModal.errors.listLoadFailed', 'Failed to load saved games list.'));
      setSavedGames({});
        setIsLoadingGamesList(false);
      }
      
      // 5. Determine and set current game ID and related state from useQuery data
      if (isCurrentGameIdSettingQueryLoading || isAllSavedGamesQueryLoading) { 
        console.log('[EFFECT init] Waiting for current game ID setting and/or saved games list to load...');
      } else {
        const lastGameIdSetting = currentGameIdSettingQueryResultData;
        const currentSavedGames = allSavedGamesQueryResultData || {}; 

        if (lastGameIdSetting && lastGameIdSetting !== DEFAULT_GAME_ID && currentSavedGames[lastGameIdSetting]) {
          console.log(`[EFFECT init] Restoring last saved game: ${lastGameIdSetting} from TanStack Query data.`);
          setCurrentGameId(lastGameIdSetting);
          setHasSkippedInitialSetup(true);
        } else {
          if (lastGameIdSetting && lastGameIdSetting !== DEFAULT_GAME_ID) {
            console.warn(`[EFFECT init] Last game ID ${lastGameIdSetting} not found in saved games (from TanStack Query). Loading default.`);
          }
        setCurrentGameId(DEFAULT_GAME_ID);
      }
    }
    
      // Determine overall initial load completion
      if (!isMasterRosterQueryLoading && !areSeasonsQueryLoading && !areTournamentsQueryLoading && !isAllSavedGamesQueryLoading && !isCurrentGameIdSettingQueryLoading) {
        // --- TIMER RESTORATION LOGIC ---
        try {
          const savedTimerStateJSON = await getLocalStorageItemAsync(TIMER_STATE_KEY);
          const lastGameId = await getCurrentGameIdSetting();
          
          if (savedTimerStateJSON) {
            const savedTimerState: TimerState = JSON.parse(savedTimerStateJSON);
            if (savedTimerState && savedTimerState.gameId === lastGameId) {
              console.log('[EFFECT init] Found a saved timer state for the current game. Restoring...');
              const elapsedOfflineSeconds = (Date.now() - savedTimerState.timestamp) / 1000;
              const correctedElapsedSeconds = Math.round(savedTimerState.timeElapsedInSeconds + elapsedOfflineSeconds);
              
              dispatchGameSession({ type: 'SET_TIMER_ELAPSED', payload: correctedElapsedSeconds });
              dispatchGameSession({ type: 'SET_TIMER_RUNNING', payload: true });
            } else {
              await removeLocalStorageItemAsync(TIMER_STATE_KEY);
            }
          }
        } catch (error) {
          console.error('[EFFECT init] Error restoring timer state:', error);
          await removeLocalStorageItemAsync(TIMER_STATE_KEY);
        }
        // --- END TIMER RESTORATION LOGIC ---

        // This is now the single source of truth for loading completion.
        setInitialLoadComplete(true);
        console.log('[EFFECT init] Initial application data coordination complete.');
      }
    };

    loadInitialAppData();
  }, [
    masterRosterQueryResultData, isMasterRosterQueryLoading, isMasterRosterQueryError, masterRosterQueryErrorData,
    seasonsQueryResultData, areSeasonsQueryLoading, isSeasonsQueryError, seasonsQueryErrorData,
    tournamentsQueryResultData, areTournamentsQueryLoading, isTournamentsQueryError, tournamentsQueryErrorData,
    allSavedGamesQueryResultData, isAllSavedGamesQueryLoading, isAllSavedGamesQueryError, allSavedGamesQueryErrorData, // Updated names
    currentGameIdSettingQueryResultData, isCurrentGameIdSettingQueryLoading, isCurrentGameIdSettingQueryError, currentGameIdSettingQueryErrorData, // Updated names
    setSavedGames, setIsLoadingGamesList, setLoadGamesListError,
    setCurrentGameId, setHasSkippedInitialSetup,
    t // t function from useTranslation
    // REMOVE: utilGetSavedGames, getCurrentGameIdSetting (these are now queryFn)
  ]);

  // --- NEW: Robust Visibility Change Handling ---
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.hidden) {
        // Use the ref to get the most up-to-date state
        if (isRunningRef.current) {
          const timerState: TimerState = {
            gameId: gameIdRef.current || '',
            timeElapsedInSeconds: elapsedRef.current,
            timestamp: Date.now(),
          };
          await setLocalStorageItemAsync(TIMER_STATE_KEY, JSON.stringify(timerState));
          dispatchGameSession({ type: 'PAUSE_TIMER_FOR_HIDDEN' });
        }
      } else {
        const savedTimerStateJSON = await getLocalStorageItemAsync(TIMER_STATE_KEY);
        if (savedTimerStateJSON) {
          const savedTimerState: TimerState = JSON.parse(savedTimerStateJSON);
          // Use the ref to get the most up-to-date game ID for comparison
          if (savedTimerState && savedTimerState.gameId === gameIdRef.current) {
            dispatchGameSession({
              type: 'RESTORE_TIMER_STATE',
              payload: {
                savedTime: savedTimerState.timeElapsedInSeconds,
                timestamp: savedTimerState.timestamp,
              },
            });
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []); // Empty dependency array ensures this listener is stable and created only once

  // --- Wake Lock Effect ---
  useEffect(() => {
    // This effect is now replaced by the direct call in the main timer effect
    // to avoid race conditions.
  }, []);

  // Helper function to load game state from game data
  const loadGameStateFromData = (gameData: AppState | null, isInitialDefaultLoad = false) => {
    console.log('[LOAD GAME STATE] Called with gameData:', gameData, 'isInitialDefaultLoad:', isInitialDefaultLoad);

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
    setHistory([newHistoryState]);
      setHistoryIndex(0);
    console.log('[LOAD GAME STATE] Finished dispatching. Reducer will update gameSessionState.');
  };

  // --- Effect to load game state when currentGameId changes or savedGames updates ---
  useEffect(() => {
    console.log('[EFFECT game load] currentGameId or savedGames changed:', { currentGameId });
    if (!initialLoadComplete) {
      console.log('[EFFECT game load] Initial load not complete, skipping game state application.');
      return; 
    }

    let gameToLoad: AppState | null = null; // Ensure this is AppState
    if (currentGameId && currentGameId !== DEFAULT_GAME_ID && savedGames[currentGameId]) {
      console.log(`[EFFECT game load] Found game data for ${currentGameId}`);
      gameToLoad = savedGames[currentGameId] as AppState; // Cast to AppState
    } else {
      console.log('[EFFECT game load] No specific game to load or ID is default. Applying default game state.');
    }
    loadGameStateFromData(gameToLoad); 

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGameId, savedGames, initialLoadComplete]); // IMPORTANT: initialLoadComplete ensures this runs after master roster is loaded.

  // --- Save state to localStorage ---
  useEffect(() => {
    // Only auto-save if loaded AND we have a proper game ID (not the default unsaved one)
    const autoSave = async () => {
    if (initialLoadComplete && currentGameId && currentGameId !== DEFAULT_GAME_ID) {
      console.log(`Auto-saving state for game ID: ${currentGameId}`);
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
          subIntervalMinutes: gameSessionState.subIntervalMinutes,
          completedIntervalDurations: gameSessionState.completedIntervalDurations,
          lastSubConfirmationTimeSeconds: gameSessionState.lastSubConfirmationTimeSeconds,
          showPlayerNames: gameSessionState.showPlayerNames, // from gameSessionState
          selectedPlayerIds: gameSessionState.selectedPlayerIds, // from gameSessionState
          gameEvents: gameSessionState.gameEvents, // from gameSessionState

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
        console.error("Failed to auto-save state to localStorage:", error);
        alert("Error saving game."); // Notify user
      }
    } else if (initialLoadComplete && currentGameId === DEFAULT_GAME_ID) {
      console.log("Not auto-saving as this is an unsaved game (no ID assigned yet)");
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
      tacticalDiscs,
      tacticalDrawings,
      tacticalBallPosition,
    ]);

  // **** ADDED: Effect to prompt for setup if default game ID is loaded ****
  useEffect(() => {
    console.log('[Modal Trigger Effect] Running. initialLoadComplete:', initialLoadComplete, 'hasSkipped:', hasSkippedInitialSetup);
    // Only run the check *after* initial load is fully complete and setup hasn't been skipped
    if (initialLoadComplete && !hasSkippedInitialSetup) {
      // Check currentGameId *inside* the effect body
      if (currentGameId === DEFAULT_GAME_ID) {
        console.log('Default game ID loaded, prompting for setup...');
      setIsNewGameSetupModalOpen(true);
      } else {
        console.log('Not prompting: Specific game loaded.');
    }
    }
  // Depend only on load completion and skip status
  }, [initialLoadComplete, hasSkippedInitialSetup, currentGameId]); // <<< Added currentGameId dependency back to re-check if it changes later

  // --- Player Management Handlers (Updated for relative coords) ---
  // Wrapped handleDropOnField in useCallback as suggested
  const handleDropOnField = useCallback((playerId: string, relX: number, relY: number) => {
    const droppedPlayer = availablePlayers.find(p => p.id === playerId);
    if (droppedPlayer) {
      handlePlayerDrop(droppedPlayer, { relX, relY }); // Call the handler from the hook
    } else {
      console.error(`Dropped player with ID ${playerId} not found in availablePlayers.`);
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
    console.log(`Removing player ${playerId} from field`);
    const updatedPlayersOnField = playersOnField.filter(p => p.id !== playerId);
    setPlayersOnField(updatedPlayersOnField); 
    saveStateToHistory({ playersOnField: updatedPlayersOnField });
  }, [playersOnField, saveStateToHistory, setPlayersOnField]); 
  


  // --- Reset Handler ---
  const handleResetField = useCallback(() => {
    if (isTacticsBoardView) {
      // Only clear tactical elements in tactics view
      setTacticalDiscs([]);
      setTacticalDrawings([]);
      setTacticalBallPosition({ relX: 0.5, relY: 0.5 });
      saveStateToHistory({ tacticalDiscs: [], tacticalDrawings: [], tacticalBallPosition: { relX: 0.5, relY: 0.5 } });
    } else {
      // Only clear game elements in normal view
      setPlayersOnField([]);
      setOpponents([]);
      setDrawings([]);
      saveStateToHistory({ playersOnField: [], opponents: [], drawings: [] });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTacticsBoardView, saveStateToHistory, setDrawings, setOpponents, setPlayersOnField, setTacticalDiscs, setTacticalDrawings, setTacticalBallPosition]);

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
    console.log("Setting draggingPlayerFromBarInfo (Drag Start):", playerInfo);
  }, []);

  // NEW Handler for simple tap selection in the bar
  const handlePlayerTapInBar = useCallback((playerInfo: Player | null) => {
    // If the tapped player is already selected, deselect them
    if (draggingPlayerFromBarInfo?.id === playerInfo?.id) {
      console.log("Tapped already selected player, deselecting:", playerInfo?.id);
      setDraggingPlayerFromBarInfo(null);
    } else {
      // Otherwise, select the tapped player
      console.log("Setting draggingPlayerFromBarInfo (Tap):", playerInfo);
      setDraggingPlayerFromBarInfo(playerInfo);
    }
  }, [draggingPlayerFromBarInfo]); // Dependency needed

  const handlePlayerDropViaTouch = useCallback((relX: number, relY: number) => {
    // This handler might be less relevant now if tap-on-field works
    if (draggingPlayerFromBarInfo) {
      console.log("Player Drop Via Touch (field):", { id: draggingPlayerFromBarInfo.id, relX, relY });
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
        console.log("Updating team name to:", trimmedName);
        dispatchGameSession({ type: 'SET_TEAM_NAME', payload: trimmedName });
        // REMOVED: saveStateToHistory({ teamName: trimmedName }); 
    }
  };

  // --- Undo/Redo Handlers ---
  const handleUndo = () => {
    if (historyIndex > 0) {
      console.log("Undoing...");
      const prevStateIndex = historyIndex - 1;
      const prevState = history[prevStateIndex];
      setPlayersOnField(prevState.playersOnField);
      setOpponents(prevState.opponents);
      setDrawings(prevState.drawings);
      setAvailablePlayers(prevState.availablePlayers); 
      dispatchGameSession({ type: 'SET_TEAM_NAME', payload: prevState.teamName }); 
      dispatchGameSession({ type: 'SET_HOME_SCORE', payload: prevState.homeScore }); 
      dispatchGameSession({ type: 'SET_AWAY_SCORE', payload: prevState.awayScore });
      dispatchGameSession({ type: 'SET_OPPONENT_NAME', payload: prevState.opponentName });
      dispatchGameSession({ type: 'SET_GAME_DATE', payload: prevState.gameDate });
      dispatchGameSession({ type: 'SET_GAME_NOTES', payload: prevState.gameNotes });
      dispatchGameSession({ type: 'SET_NUMBER_OF_PERIODS', payload: prevState.numberOfPeriods });
      dispatchGameSession({ type: 'SET_PERIOD_DURATION', payload: prevState.periodDurationMinutes });
      dispatchGameSession({ 
        type: 'LOAD_STATE_FROM_HISTORY', 
        payload: { 
          currentPeriod: prevState.currentPeriod, 
          gameStatus: prevState.gameStatus,
          completedIntervalDurations: prevState.completedIntervalDurations ?? [],
          lastSubConfirmationTimeSeconds: prevState.lastSubConfirmationTimeSeconds ?? 0,
          showPlayerNames: prevState.showPlayerNames, 
          gameEvents: prevState.gameEvents, 
          selectedPlayerIds: prevState.selectedPlayerIds, // Ensure selectedPlayerIds is from prevState
          seasonId: prevState.seasonId, // USE prevState for reducer
          tournamentId: prevState.tournamentId, // USE prevState for reducer
          gameLocation: prevState.gameLocation, 
          gameTime: prevState.gameTime
        } 
      }); 
      dispatchGameSession({ type: 'SET_SUB_INTERVAL', payload: prevState.subIntervalMinutes ?? 5 }); 
      // setSelectedPlayerIds(prevState.selectedPlayerIds); // REMOVE - Handled by LOAD_STATE_FROM_HISTORY
      // setSeasonId(prevState.seasonId ?? ''); // REMOVE - Handled by LOAD_STATE_FROM_HISTORY
      // setTournamentId(prevState.tournamentId ?? ''); // REMOVE - Handled by LOAD_STATE_FROM_HISTORY
      // setGameLocation(prevState.gameLocation ?? ''); // REMOVE - Handled by LOAD_STATE_FROM_HISTORY
      // setGameTime(prevState.gameTime ?? ''); // REMOVE - Handled by LOAD_STATE_FROM_HISTORY
      dispatchGameSession({ type: 'SET_HOME_OR_AWAY', payload: prevState.homeOrAway });
      setHistoryIndex(prevStateIndex);
      setTacticalDiscs(prevState.tacticalDiscs || []);
      setTacticalDrawings(prevState.tacticalDrawings || []);
      setTacticalBallPosition(prevState.tacticalBallPosition || null);
    } else {
      console.log("Cannot undo: at beginning of history");
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      console.log("Redoing...");
      const nextStateIndex = historyIndex + 1;
      const nextState = history[nextStateIndex];
      setPlayersOnField(nextState.playersOnField);
      setOpponents(nextState.opponents);
      setDrawings(nextState.drawings);
      setAvailablePlayers(nextState.availablePlayers); 
      dispatchGameSession({ type: 'SET_TEAM_NAME', payload: nextState.teamName }); 
      dispatchGameSession({ type: 'SET_HOME_SCORE', payload: nextState.homeScore }); 
      dispatchGameSession({ type: 'SET_AWAY_SCORE', payload: nextState.awayScore });
      dispatchGameSession({ type: 'SET_OPPONENT_NAME', payload: nextState.opponentName });
      dispatchGameSession({ type: 'SET_GAME_DATE', payload: nextState.gameDate });
      dispatchGameSession({ type: 'SET_GAME_NOTES', payload: nextState.gameNotes });
      dispatchGameSession({ type: 'SET_NUMBER_OF_PERIODS', payload: nextState.numberOfPeriods });
      dispatchGameSession({ type: 'SET_PERIOD_DURATION', payload: nextState.periodDurationMinutes });
      dispatchGameSession({ 
        type: 'LOAD_STATE_FROM_HISTORY', 
        payload: { 
          currentPeriod: nextState.currentPeriod, 
          gameStatus: nextState.gameStatus,
          completedIntervalDurations: nextState.completedIntervalDurations ?? [],
          lastSubConfirmationTimeSeconds: nextState.lastSubConfirmationTimeSeconds ?? 0,
          showPlayerNames: nextState.showPlayerNames, 
          gameEvents: nextState.gameEvents, 
          selectedPlayerIds: nextState.selectedPlayerIds, // Ensure selectedPlayerIds is from nextState
          seasonId: nextState.seasonId, // USE nextState for reducer
          tournamentId: nextState.tournamentId, // USE nextState for reducer
          gameLocation: nextState.gameLocation, 
          gameTime: nextState.gameTime
        } 
      }); 
      dispatchGameSession({ type: 'SET_SUB_INTERVAL', payload: nextState.subIntervalMinutes ?? 5 }); 
      setHistoryIndex(nextStateIndex);
      setTacticalDiscs(nextState.tacticalDiscs || []);
      setTacticalDrawings(nextState.tacticalDrawings || []);
      setTacticalBallPosition(nextState.tacticalBallPosition || null);
    } else {
      console.log("Cannot redo: at end of history");
    }
  };

  // --- Timer Handlers ---
  const handleStartPauseTimer = () => {
    if (gameSessionState.gameStatus === 'notStarted') {
      dispatchGameSession({
        type: 'START_PERIOD',
        payload: {
          nextPeriod: 1,
          periodDurationMinutes: gameSessionState.periodDurationMinutes,
          subIntervalMinutes: gameSessionState.subIntervalMinutes
        }
      });
    } else if (gameSessionState.gameStatus === 'periodEnd') {
      const nextPeriod = gameSessionState.currentPeriod + 1;
      dispatchGameSession({
        type: 'START_PERIOD',
        payload: {
          nextPeriod: nextPeriod,
          periodDurationMinutes: gameSessionState.periodDurationMinutes,
          subIntervalMinutes: gameSessionState.subIntervalMinutes
        }
      });
    } else if (gameSessionState.gameStatus === 'inProgress') {
      dispatchGameSession({ type: 'SET_TIMER_RUNNING', payload: !gameSessionState.isTimerRunning });
    }
  };

  const handleResetTimer = () => {
    removeLocalStorageItemAsync(TIMER_STATE_KEY);
    dispatchGameSession({ type: 'RESET_TIMER_ONLY' });
  };

  const handleSubstitutionMade = () => {
    dispatchGameSession({ type: 'CONFIRM_SUBSTITUTION' });
  };

  const handleSetSubInterval = (minutes: number) => {
    dispatchGameSession({ type: 'SET_SUB_INTERVAL', payload: Math.max(1, minutes) });
  };

  const handleToggleLargeTimerOverlay = () => {
    setShowLargeTimerOverlay(!showLargeTimerOverlay);
  };


  // Handler to specifically deselect player when bar background is clicked
  const handleDeselectPlayer = () => {
    if (draggingPlayerFromBarInfo) { // Only log if there was a selection
      console.log("Deselecting player by clicking bar background.");
      setDraggingPlayerFromBarInfo(null);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Handler to open/close the goal log modal
  const handleToggleGoalLogModal = () => {
    setIsGoalLogModalOpen(!isGoalLogModalOpen);
  };

  // Handler to add a goal event
  const handleAddGoalEvent = (scorerId: string, assisterId?: string) => {
    const scorer = (masterRosterQueryResultData || availablePlayers).find(p => p.id === scorerId);
    const assister = assisterId ? (masterRosterQueryResultData || availablePlayers).find(p => p.id === assisterId) : undefined;

    if (!scorer) {
      console.error("Scorer not found!");
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
    console.log(`Logging opponent goal at time: ${time}`);
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
    
    console.log("Updated game event via dispatch:", updatedEvent.id);
  };

  // Handler to delete a game event
  const handleDeleteGameEvent = (goalId: string) => {
    const eventToDelete = gameSessionState.gameEvents.find(e => e.id === goalId);
    if (!eventToDelete) {
      console.error("Event to delete not found in gameSessionState.gameEvents:", goalId);
      return;
    }

    dispatchGameSession({ type: 'DELETE_GAME_EVENT', payload: goalId });
    if (eventToDelete.type === 'goal' || eventToDelete.type === 'opponentGoal') {
      dispatchGameSession({ 
        type: 'ADJUST_SCORE_FOR_EVENT', 
        payload: { eventType: eventToDelete.type, action: 'delete' } 
      });
    }
    
    console.log("Deleted game event via dispatch and updated state/history:", goalId);
  };
  // --- Button/Action Handlers ---
  
  // RENAMED & UPDATED Handler: Just opens the setup modal after confirmation
  
  
  // NEW: Handler to actually reset state and set opponent/date/type from modal
  // Update signature to accept seasonId/tournamentId from the modal
    // Update signature to accept seasonId/tournamentId from the modal
  
  // NEW: Handler to cancel the new game setup
  // const handleCancelNewGameSetup = useCallback(() => { // REMOVED this line
  //   console.log("Cancelling new game setup.");
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
    console.log('[page.tsx] handleOpponentNameChange called with:', newName);
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
      console.log(`Number of periods set to: ${validPeriods}`);
    } else {
      console.warn(`Invalid number of periods attempted: ${periods}. Must be 1 or 2.`);
    }
  };

  const handleSetPeriodDuration = (minutes: number) => {
    const newMinutes = Math.max(1, minutes);
    dispatchGameSession({ type: 'SET_PERIOD_DURATION', payload: newMinutes });
    console.log(`Period duration set to: ${newMinutes} minutes`);
  };

  // Training Resources Modal
  const handleToggleTrainingResources = () => {
    setIsTrainingResourcesOpen(!isTrainingResourcesOpen);
  };

  // NEW: Handler for Hard Reset
  const handleHardResetApp = useCallback(async () => {
    if (window.confirm(t('controlBar.hardResetConfirmation', 'Are you sure you want to completely reset the application? All saved data (players, stats, positions) will be permanently lost.'))) {
      try {
        console.log("Performing hard reset using utility...");
        await utilResetAppSettings(); // Use utility function
        window.location.reload();
      } catch (error) {
        console.error("Error during hard reset:", error);
        alert("Failed to reset application data.");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  
  // Placeholder handlers for Save/Load Modals
  const handleOpenSaveGameModal = useCallback(() => { // Wrap in useCallback
    console.log("Opening Save Game Modal...");
    setIsSaveGameModalOpen(true);
  }, []); // Add dependency array

  const handleCloseSaveGameModal = () => {
    setIsSaveGameModalOpen(false);
  };

  const handleOpenLoadGameModal = () => {
    console.log("Opening Load Game Modal...");
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

  // Function to handle the actual saving
  const handleSaveGame = useCallback(async (gameName: string) => {
    console.log(`Attempting to save game: '${gameName}'`);
    
    let idToSave: string;
    const isOverwritingExistingLoadedGame = currentGameId && currentGameId !== DEFAULT_GAME_ID;

    if (isOverwritingExistingLoadedGame) {
      idToSave = currentGameId;
      console.log(`Overwriting existing game with ID: ${idToSave}`);
    } else {
      idToSave = `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      console.log(`Saving as new game with ID: ${idToSave}`);
    }

      const currentSnapshot: AppState = { // Corrected type to AppState
        // Persisted fields from gameSessionState
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
        seasonId: gameSessionState.seasonId,
        tournamentId: gameSessionState.tournamentId,
        gameLocation: gameSessionState.gameLocation,
        gameTime: gameSessionState.gameTime,
        subIntervalMinutes: gameSessionState.subIntervalMinutes,
        completedIntervalDurations: gameSessionState.completedIntervalDurations,
        lastSubConfirmationTimeSeconds: gameSessionState.lastSubConfirmationTimeSeconds,
        showPlayerNames: gameSessionState.showPlayerNames,
        selectedPlayerIds: gameSessionState.selectedPlayerIds,
        gameEvents: gameSessionState.gameEvents,

        // Other states
        playersOnField,
        opponents,
        drawings,
        tacticalDiscs,
        tacticalDrawings,
        tacticalBallPosition,
        availablePlayers: masterRosterQueryResultData || availablePlayers, // Master roster snapshot
        
        // Volatile timer states are EXCLUDED.
      };

    saveGameMutation.mutate({
      gameName,
      gameIdToSave: idToSave,
      snapshot: currentSnapshot as AppState, // Cast to AppState for the util
    });
  }, [saveGameMutation, currentGameId, gameSessionState, playersOnField, opponents, drawings, availablePlayers, masterRosterQueryResultData]);

  // Function to handle loading a selected game
  const handleLoadGame = async (gameId: string) => {
    console.log(`[handleLoadGame] Attempting to load game: ${gameId}`);
    
    // Clear any existing timer state before loading a new game
    await removeLocalStorageItemAsync(TIMER_STATE_KEY);
    
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

        console.log(`Game ${gameId} load dispatched to reducer.`);
        handleCloseLoadGameModal();

      } catch(error) {
          console.error("Error processing game load:", error);
          setGameLoadError(t('loadGameModal.errors.loadFailed', 'Error loading game state. Please try again.'));
      } finally {
        setIsGameLoading(false);
        setProcessingGameId(null);
      }
    } else {
      console.error(`Game state not found for ID: ${gameId}`);
      setGameLoadError(t('loadGameModal.errors.notFound', 'Could not find saved game: {gameId}', { gameId }));
      setIsGameLoading(false);
      setProcessingGameId(null);
    }
  };

  // Function to handle deleting a saved game
  const handleDeleteGame = async (gameId: string) => {
    console.log(`Deleting game with ID: ${gameId}`);
    if (gameId === DEFAULT_GAME_ID) {
      console.warn("Cannot delete the default unsaved state.");
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
        console.log(`Game ${gameId} deleted from state and persistence.`);

        if (currentGameId === gameId) {
          console.log("Currently loaded game was deleted. Resetting to initial state via reducer.");
          // Dispatch action to reset to the initial state
          dispatchGameSession({ type: 'RESET_TO_INITIAL_STATE', payload: initialGameSessionData });
          
          // Reset other non-reducer states using initialState (from page.tsx)
          setPlayersOnField(initialState.playersOnField || []); 
          setOpponents(initialState.opponents || []); 
          setDrawings(initialState.drawings || []); 
          // setGameEvents(initialState.gameEvents || []); // REMOVE - Handled by RESET_TO_INITIAL_STATE
          // setSeasonId(initialState.seasonId || ''); // REMOVE - Handled by RESET_TO_INITIAL_STATE

          setHistory([initialState as AppState]); // Reset history with initial state (ensure cast if needed)
        setHistoryIndex(0);

        setCurrentGameId(DEFAULT_GAME_ID);
          await utilSaveCurrentGameIdSetting(DEFAULT_GAME_ID);
        }
      } else {
        // ... (existing error handling)
        console.warn(`handleDeleteGame: utilDeleteGame returned null for gameId: ${gameId}. Game might not have been found or ID was invalid.`);
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

  // Helper function to safely format CSV fields (handles quotes and commas)
  const escapeCsvField = (field: string | number | undefined | null): string => {
    const stringField = String(field ?? ''); // Convert null/undefined to empty string
    // If field contains comma, newline, or double quote, enclose in double quotes
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      // Escape existing double quotes by doubling them
      const escapedField = stringField.replace(/"/g, '""');
      return `"${escapedField}"`;
    }
    return stringField;
  };
  
  // Helper function to format time (consider extracting if used elsewhere)
  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = Math.floor(totalSeconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Function to export all saved games as Excel/CSV (RENAMED & PARAMETERIZED)
  // const handleExportAllGamesCsv = () => { // This function is no longer used
  //   // ...
  // };

  // --- INDIVIDUAL GAME EXPORT HANDLERS ---
  const handleExportOneJson = (gameId: string) => {
    const gameData = savedGames[gameId];
    if (!gameData) {
      alert(`Error: Could not find game data for ${gameId}`);
      return;
    }
    console.log(`Exporting game ${gameId} as JSON...`);
    try {
      // Add names alongside IDs
      const seasonName = gameData.seasonId ? seasons.find(s => s.id === gameData.seasonId)?.name : null;
      const tournamentName = gameData.tournamentId ? tournaments.find(t => t.id === gameData.tournamentId)?.name : null;
      const exportObject = {
          [gameId]: {
              ...gameData,
              seasonName: seasonName,
              tournamentName: tournamentName
          }
      };
      const jsonString = JSON.stringify(exportObject, null, 2); // Export the enhanced object
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `${gameId}.json`; // Use gameId as filename
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`Game ${gameId} exported successfully as JSON.`);
    } catch (error) {
      console.error(`Failed to export game ${gameId} as JSON:`, error);
      alert(`Error exporting game ${gameId} as JSON.`);
    }
  };

  const handleExportOneCsv = (gameId: string) => {
    const gameData = savedGames[gameId];
    if (!gameData) {
      alert(`Error: Could not find game data for ${gameId}`);
      return;
    }
    console.log(`Exporting game ${gameId} as CSV...`);

    try {
      const rows: string[] = [];
      const EOL = '\r\n';
      const DELIMITER = ';';
      const game = gameData; // Alias for clarity

      // --- Section: Game Info ---
      rows.push('Game Info');
      rows.push(`${escapeCsvField('Game ID:')}${DELIMITER}${escapeCsvField(gameId)}`);
      rows.push(`${escapeCsvField('Game Date:')}${DELIMITER}${escapeCsvField(game.gameDate)}`);
      rows.push(`${escapeCsvField('Home Team:')}${DELIMITER}${escapeCsvField(game.teamName)}`);
      rows.push(`${escapeCsvField('Away Team:')}${DELIMITER}${escapeCsvField(game.opponentName)}`);
      rows.push(`${escapeCsvField('Home Score:')}${DELIMITER}${escapeCsvField(game.homeScore)}`);
      rows.push(`${escapeCsvField('Away Score:')}${DELIMITER}${escapeCsvField(game.awayScore)}`);
      rows.push(`${escapeCsvField('Location:')}${DELIMITER}${escapeCsvField(game.gameLocation)}`); // Added Location
      rows.push(`${escapeCsvField('Time:')}${DELIMITER}${escapeCsvField(game.gameTime)}`);     // Added Time
      // --- ADD Season/Tournament Info --- 
      const seasonNameOne = game.seasonId ? seasons.find(s => s.id === game.seasonId)?.name : '';
      const tournamentNameOne = game.tournamentId ? tournaments.find(t => t.id === game.tournamentId)?.name : '';
      rows.push(`${escapeCsvField('Season:')}${DELIMITER}${escapeCsvField(seasonNameOne || (game.seasonId ? game.seasonId : 'None'))}`);
      rows.push(`${escapeCsvField('Tournament:')}${DELIMITER}${escapeCsvField(tournamentNameOne || (game.tournamentId ? game.tournamentId : 'None'))}`);
      rows.push('');

      // --- Section: Game Settings ---
      rows.push('Game Settings');
      rows.push(`${escapeCsvField('Number of Periods:')}${DELIMITER}${escapeCsvField(game.numberOfPeriods)}`);
      rows.push(`${escapeCsvField('Period Duration (min):')}${DELIMITER}${escapeCsvField(game.periodDurationMinutes)}`);
      rows.push(`${escapeCsvField('Substitution Interval (min):')}${DELIMITER}${escapeCsvField(game.subIntervalMinutes ?? '?')} `); // Added Sub Interval
      rows.push('');

      // --- Section: Substitution Intervals ---
      rows.push('Substitution Intervals');
      rows.push(`${escapeCsvField('Period')}${DELIMITER}${escapeCsvField('Duration (mm:ss)')}`);
      const intervals = game.completedIntervalDurations || [];
      if (intervals.length > 0) {
        // Sort intervals by timestamp (which reflects end time)
        intervals.sort((a, b) => a.timestamp - b.timestamp).forEach(log => {
          rows.push(`${escapeCsvField(log.period)}${DELIMITER}${escapeCsvField(formatTime(log.duration))}`);
        });
      } else {
        rows.push('No substitutions recorded');
      }
      rows.push('');

      // --- Section: Player Stats ---
      // (Reusing logic similar to handleExportAllGamesExcel)
      rows.push('Player Stats');
      // Add Fair Play column header
      rows.push(`${escapeCsvField('Player')}${DELIMITER}${escapeCsvField('Goals')}${DELIMITER}${escapeCsvField('Assists')}${DELIMITER}${escapeCsvField('Points')}${DELIMITER}${escapeCsvField('Fair Play')}`);
      // Use the GLOBAL availablePlayers state here
      const playerStats = availablePlayers.map((player: Player) => { // <-- Use global state
        const goals = game.gameEvents?.filter(e => e.type === 'goal' && e.scorerId === player.id).length || 0;
        const assists = game.gameEvents?.filter(e => e.type === 'goal' && e.assisterId === player.id).length || 0;
        const totalScore = goals + assists;
        // Include fairPlay status - check if player is IN the global roster
        const globalPlayer = availablePlayers.find(p => p.id === player.id); // Re-check existence
        return { name: player.name, goals, assists, totalScore, fairPlay: globalPlayer?.receivedFairPlayCard };
      })
      // REMOVED filter: .filter(p => p.totalScore > 0) // Show all players now
      .sort((a, b) => b.totalScore - a.totalScore || b.goals - a.goals); // Sort by points, then goals
      
      if (playerStats && playerStats.length > 0) {
        playerStats.forEach(player => {
            // Add fairPlay data to the row
            rows.push(`${escapeCsvField(player.name)}${DELIMITER}${escapeCsvField(player.goals)}${DELIMITER}${escapeCsvField(player.assists)}${DELIMITER}${escapeCsvField(player.totalScore)}${DELIMITER}${escapeCsvField(player.fairPlay ? 'Yes' : 'No')}`);
        });
      } else {
        rows.push('No player stats recorded');
      }
      rows.push(''); // Blank separator row

      // --- Section: Event Log ---
      // (Reusing logic similar to handleExportAllGamesExcel)
      rows.push('Event Log');
      rows.push(`${escapeCsvField('Time')}${DELIMITER}${escapeCsvField('Type')}${DELIMITER}${escapeCsvField('Scorer')}${DELIMITER}${escapeCsvField('Assister')}`);
      const sortedEvents = game.gameEvents?.filter(e => e.type === 'goal' || e.type === 'opponentGoal').sort((a, b) => a.time - b.time) || [];
      
      if (sortedEvents.length > 0) {
        sortedEvents.forEach(event => {
            const timeFormatted = formatTime(event.time);
            const type = event.type === 'goal' ? 'Goal' : 'Opponent Goal';
            // Look up names dynamically using the game's availablePlayers
            // Look up names dynamically using the GLOBAL availablePlayers state
            const scorerName = event.type === 'goal'
              ? availablePlayers.find(p => p.id === event.scorerId)?.name ?? event.scorerId // <-- Use global state
              : game.opponentName || 'Opponent'; // Use game's opponent name for opponent goals
            const assisterName = event.type === 'goal' && event.assisterId
              ? availablePlayers.find(p => p.id === event.assisterId)?.name ?? event.assisterId // <-- Use global state
              : ''; // Empty if no assister ID or opponent goal

            const scorer = escapeCsvField(scorerName);
            const assister = escapeCsvField(assisterName);
            rows.push(`${escapeCsvField(timeFormatted)}${DELIMITER}${escapeCsvField(type)}${DELIMITER}${scorer}${DELIMITER}${assister}`);
        });
      } else {
        rows.push('No goals logged');
      }
      rows.push('');

      // --- Section: Notes ---
      rows.push('Notes:');
      rows.push(escapeCsvField(game.gameNotes || ''));

      // --- Combine and Download ---
      const csvString = rows.join(EOL);
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.download = `${gameId}.csv`; // Use gameId as filename
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`Game ${gameId} exported successfully as CSV.`);

    } catch (error) {
      console.error(`Failed to export game ${gameId} as CSV:`, error);
      alert(`Error exporting game ${gameId} as CSV.`);
    }
  };

  // --- END INDIVIDUAL GAME EXPORT HANDLERS ---

  // --- Roster Management Handlers ---
  const openRosterModal = () => {
    console.log('[openRosterModal] Called. Setting highlightRosterButton to false.'); // Log modal open
    setIsRosterModalOpen(true);
    setHighlightRosterButton(false); // <<< Remove highlight when modal is opened
  };
  
  
  // ... (other code in Home component) ...

  const closeRosterModal = () => setIsRosterModalOpen(false);

  // --- ASYNC Roster Management Handlers for RosterSettingsModal ---
  const handleRenamePlayerForModal = useCallback(async (playerId: string, playerData: { name: string; nickname?: string }) => {
    console.log(`[Page.tsx] handleRenamePlayerForModal attempting mutation for ID: ${playerId}, new name: ${playerData.name}`);
    setRosterError(null); // Clear previous specific errors
    // setIsRosterUpdating(true); // UI should use updatePlayerMutation.isPending

    try {
      await updatePlayerMutation.mutateAsync({ 
        playerId, 
        playerData: { name: playerData.name, nickname: playerData.nickname } 
      });
      // onSuccess in updatePlayerMutation handles query invalidation, roster error clearing, and setPlayersOnField.
      console.log(`[Page.tsx] updatePlayerMutation.mutateAsync successful for rename of ${playerId}.`);
    } catch (error) {
      // Errors are primarily handled by the mutation's onError, which calls setRosterError.
      // This catch block is for any other unexpected error from mutateAsync itself if not caught by TanStack Query.
      console.error(`[Page.tsx] Exception during updatePlayerMutation.mutateAsync for rename of ${playerId}:`, error);
      // If setRosterError isn't already called by mutation's onError for this specific case:
      // if (!updatePlayerMutation.isError) { // Or check error type
      //   setRosterError(t('rosterSettingsModal.errors.unexpected', 'An unexpected error occurred.'));
      // }
    } finally {
      // setIsRosterUpdating(false); // UI should use updatePlayerMutation.isPending
    }
  }, [updatePlayerMutation]); // Removed t - it's stable from useTranslation
  
  const handleSetJerseyNumberForModal = useCallback(async (playerId: string, jerseyNumber: string) => {
    console.log(`[Page.tsx] handleSetJerseyNumberForModal attempting mutation for ID: ${playerId}, new number: ${jerseyNumber}`);
    setRosterError(null);

    try {
      await updatePlayerMutation.mutateAsync({ 
        playerId, 
        playerData: { jerseyNumber } 
      });
      // onSuccess in updatePlayerMutation handles necessary updates.
      console.log(`[Page.tsx] updatePlayerMutation.mutateAsync successful for jersey number update of ${playerId}.`);
    } catch (error) {
      console.error(`[Page.tsx] Exception during updatePlayerMutation.mutateAsync for jersey number update of ${playerId}:`, error);
      // Errors are primarily handled by the mutation's onError.
    }
  }, [updatePlayerMutation]);

  const handleSetPlayerNotesForModal = useCallback(async (playerId: string, notes: string) => {
    console.log(`[Page.tsx] handleSetPlayerNotesForModal attempting mutation for ID: ${playerId}`);
    setRosterError(null);

    try {
      await updatePlayerMutation.mutateAsync({ 
        playerId, 
        playerData: { notes } 
      });
      // onSuccess in updatePlayerMutation handles necessary updates.
      console.log(`[Page.tsx] updatePlayerMutation.mutateAsync successful for notes update of ${playerId}.`);
    } catch (error) {
      console.error(`[Page.tsx] Exception during updatePlayerMutation.mutateAsync for notes update of ${playerId}:`, error);
      // Errors are primarily handled by the mutation's onError.
    }
  }, [updatePlayerMutation]);

      // ... (rest of the code remains unchanged)

    const handleRemovePlayerForModal = useCallback(async (playerId: string) => {
      console.log(`[Page.tsx] handleRemovePlayerForModal attempting mutation for ID: ${playerId}`);
      setRosterError(null); // Clear previous specific errors
      // setIsRosterUpdating(true); // This line is removed - UI should use removePlayerMutation.isPending

      try {
        await removePlayerMutation.mutateAsync({ playerId });
        // onSuccess in removePlayerMutation now handles:
        // - queryClient.invalidateQueries({ queryKey: ['masterRoster'] });
        // - setPlayersOnField update
        // - setSelectedPlayerIds update
        // - saveStateToHistory call
        // - setRosterError(null) on success path
        console.log(`[Page.tsx] removePlayerMutation.mutateAsync successful for removal of ${playerId}.`);
      } catch (error) {
        // Errors are primarily handled by the mutation's onError callback, which calls setRosterError.
        // This catch block is for any other unexpected error from mutateAsync itself if not caught by TanStack Query.
        console.error(`[Page.tsx] Exception during removePlayerMutation.mutateAsync for removal of ${playerId}:`, error);
        // Optionally, if you want a generic fallback error here if the mutation's onError isn't triggered:
        // if (!removePlayerMutation.isError) { // Or check error type if more specific handling is needed
        //   setRosterError(t('rosterSettingsModal.errors.unexpected', 'An unexpected error occurred.'));
        // }
      }
      // finally { // This block is removed
        // setIsRosterUpdating(false); // This line is removed - UI should use removePlayerMutation.isPending
      // }
    }, [removePlayerMutation]); // Removed t - it's stable from useTranslation

    // ... (rest of the code remains unchanged)

    const handleAddPlayerForModal = useCallback(async (playerData: { name: string; jerseyNumber: string; notes: string; nickname: string }) => {
      console.log('[Page.tsx] handleAddPlayerForModal attempting to add player:', playerData);
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
        console.log('[Page.tsx] No duplicates found. Proceeding with addPlayerMutation for:', playerData);
        await addPlayerMutation.mutateAsync(playerData);
        // onSuccess in the mutation will handle further UI updates like invalidating queries and clearing rosterError if successful.
        console.log(`[Page.tsx] addPlayerMutation.mutateAsync likely successful for adding player: ${playerData.name}.`);
      } catch (error) {
        // This catch block is for unexpected errors directly from mutateAsync call itself (e.g., network issues before mutationFn runs).
        // Errors from within mutationFn (like from the addPlayer utility) should ideally be handled by the mutation's onError callback.
        console.error(`[Page.tsx] Exception during addPlayerMutation.mutateAsync for player ${playerData.name}:`, error);
        // Set a generic error message if rosterError hasn't been set by the mutation's onError callback.
        if (!addPlayerMutation.error) { // Check if mutation itself has an error state
          setRosterError(t('rosterSettingsModal.errors.addFailed', 'Error adding player {playerName}. Please try again.', { playerName: playerData.name }));
        }
      }
    }, [addPlayerMutation, masterRosterQueryResultData, t]); // Removed rosterError from deps, as it's set within this callback.

    // ... (rest of the code remains unchanged)

  const handleToggleGoalieForModal = useCallback(async (playerId: string) => {
    const player = availablePlayers.find(p => p.id === playerId);
    if (!player) {
        console.error(`[Page.tsx] Player ${playerId} not found in availablePlayers for goalie toggle.`);
        setRosterError(t('rosterSettingsModal.errors.playerNotFound', 'Player not found. Cannot toggle goalie status.'));
        return;
    }
    const targetGoalieStatus = !player.isGoalie;
    console.log(`[Page.tsx] handleToggleGoalieForModal attempting mutation for ID: ${playerId}, target status: ${targetGoalieStatus}`);
    
    setRosterError(null); // Clear previous specific errors

    try {
      await setGoalieStatusMutation.mutateAsync({ playerId, isGoalie: targetGoalieStatus });
      // onSuccess in setGoalieStatusMutation handles query invalidation, roster error clearing, and setPlayersOnField logic.
      console.log(`[Page.tsx] setGoalieStatusMutation.mutateAsync successful for goalie toggle of ${playerId}.`);
    } catch (error) {
      // Errors are primarily handled by the mutation's onError.
      console.error(`[Page.tsx] Exception during setGoalieStatusMutation.mutateAsync for goalie toggle of ${playerId}:`, error);
    }
  }, [availablePlayers, setGoalieStatusMutation]); // Added setGoalieStatusMutation, removed others

  // --- END Roster Management Handlers ---

  // --- NEW: Handler to Award Fair Play Card ---
  const handleAwardFairPlayCard = useCallback(async (playerId: string | null) => {
      // <<< ADD LOG HERE >>>
      console.log(`[page.tsx] handleAwardFairPlayCard called with playerId: ${playerId}`);
      console.log(`[page.tsx] availablePlayers BEFORE update:`, JSON.stringify(availablePlayers.map(p => ({id: p.id, fp: p.receivedFairPlayCard}))));
      console.log(`[page.tsx] playersOnField BEFORE update:`, JSON.stringify(playersOnField.map(p => ({id: p.id, fp: p.receivedFairPlayCard}))));

      if (!currentGameId || currentGameId === DEFAULT_GAME_ID) {
          console.warn("Cannot award fair play card in unsaved/default state.");
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
          console.log(`[page.tsx] Awarding card to ${playerId}`);
      } else {
          // <<< ADD LOG HERE >>>
          console.log(`[page.tsx] Clearing card (or toggling off). PlayerId: ${playerId}, Currently Awarded: ${currentlyAwardedPlayerId}`);
      }
      // If playerId is null, we only cleared the existing card.
      // If playerId is the same as currentlyAwardedPlayerId, we cleared it and don't re-award.

      // <<< ADD LOG HERE >>>
      console.log(`[page.tsx] availablePlayers AFTER update logic:`, JSON.stringify(updatedAvailablePlayers.map(p => ({id: p.id, fp: p.receivedFairPlayCard}))));
      console.log(`[page.tsx] playersOnField AFTER update logic:`, JSON.stringify(updatedPlayersOnField.map(p => ({id: p.id, fp: p.receivedFairPlayCard}))));

      // <<< ADD LOG HERE >>>
      console.log(`[page.tsx] Calling setAvailablePlayers and setPlayersOnField...`);
      setAvailablePlayers(updatedAvailablePlayers);
      setPlayersOnField(updatedPlayersOnField);
      // Save updated global roster
      // localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(updatedAvailablePlayers));
      try {
        const success = await saveMasterRoster(updatedAvailablePlayers);
        if (!success) {
          console.error('[page.tsx] handleAwardFairPlayCard: Failed to save master roster using utility.');
          // Optionally, set an error state to inform the user
        }
      } catch (error) {
        console.error('[page.tsx] handleAwardFairPlayCard: Error calling saveMasterRoster utility:', error);
        // Optionally, set an error state
      }
      // <<< ADD LOG HERE >>>
      console.log(`[page.tsx] Calling saveStateToHistory... ONLY for playersOnField`);
      // Save ONLY the playersOnField change to the game history, not the global roster
      saveStateToHistory({ playersOnField: updatedPlayersOnField });

      console.log(`[page.tsx] Updated Fair Play card award. ${playerId ? `Awarded to ${playerId}` : 'Cleared'}`);
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
      console.log(`Quick saving game with ID: ${currentGameId}`);
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
        setHistory([currentSnapshot]);
        setHistoryIndex(0);

        console.log(`Game quick saved successfully with ID: ${currentGameId}`);
        // TODO: Add visual feedback (e.g., a toast notification)

      } catch (error) {
        console.error("Failed to quick save game state:", error);
        alert("Error quick saving game.");
      }
    } else {
      // If no valid current game ID, trigger the "Save As" modal
      // Note: This case might not be reachable if Quick Save button is only enabled for loaded games,
      // but kept for robustness.
      console.log("No current game ID, opening Save As modal instead for Quick Save.");
      handleOpenSaveGameModal(); 
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
    setHistory,
    setHistoryIndex,
    handleOpenSaveGameModal, 
    gameSessionState // This now covers all migrated game session fields
  ]);
  // --- END Quick Save Handler ---

  // --- NEW: Handlers for Game Settings Modal --- 
  const handleOpenGameSettingsModal = () => {
      setIsGameSettingsModalOpen(true); // Corrected State Setter
  };
  const handleCloseGameSettingsModal = () => {
    setIsGameSettingsModalOpen(false); // Corrected State Setter
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

  // Add handler for home/away status
  const handleSetHomeOrAway = (status: 'home' | 'away') => {
    dispatchGameSession({ type: 'SET_HOME_OR_AWAY', payload: status });
    // REMOVED: saveStateToHistory({ homeOrAway: status });
  };

  // --- NEW Handlers for Setting Season/Tournament ID ---
  const handleSetSeasonId = useCallback((newSeasonId: string | undefined) => {
    const idToSet = newSeasonId || ''; // Ensure empty string instead of null
    console.log('[page.tsx] handleSetSeasonId called with:', idToSet);
    dispatchGameSession({ type: 'SET_SEASON_ID', payload: idToSet }); 
  }, []); // No dependencies needed since we're only using dispatchGameSession which is stable

  const handleSetTournamentId = useCallback((newTournamentId: string | undefined) => {
    const idToSet = newTournamentId || ''; // Ensure empty string instead of null
    console.log('[page.tsx] handleSetTournamentId called with:', idToSet);
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
    console.log(`Exporting aggregate JSON for ${gameIds.length} games.`);
    if (gameIds.length === 0) {
        alert(t('export.noGamesInSelection', 'No games match the current filter.'));
        return;
    }

    // Retrieve full game data for the included IDs
    const gamesData = gameIds.reduce((acc, id) => {
        const gameData = savedGames[id];
        if (gameData) {
            // Add names alongside IDs
            const seasonName = gameData.seasonId ? seasons.find(s => s.id === gameData.seasonId)?.name : null;
            const tournamentName = gameData.tournamentId ? tournaments.find(t => t.id === gameData.tournamentId)?.name : null;
            acc[id] = {
                ...gameData,
                seasonName: seasonName,
                tournamentName: tournamentName
            };
        }
        return acc;
    }, {} as SavedGamesCollection & { [key: string]: { seasonName?: string | null, tournamentName?: string | null } });

    // Determine filter context (needs activeTab and filter IDs from GameStatsModal - this isn't ideal)
    // For now, we'll just create a basic structure without the filter context
    // TODO: Refactor to pass filter context from modal if needed in export filename/content

    const exportData = {
        exportedTimestamp: new Date().toISOString(),
        // filterContext: { // Example of adding context later
        //     tab: activeTab, 
        //     filterId: activeTab === 'season' ? selectedSeasonIdFilter : activeTab === 'tournament' ? selectedTournamentIdFilter : null,
        //     filterName: getFilterContextName(activeTab, ...)
        // },
        summaryStats: aggregateStats, // The calculated aggregate stats
        games: gamesData // The detailed data for included games
    };

    try {
        const jsonString = JSON.stringify(exportData, null, 2); 
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        const now = new Date();
        const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
        // Simplified filename for now
        a.download = `SoccerApp_AggregateStats_${timestamp}.json`; 
        
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`Aggregate stats exported successfully as JSON.`);
    } catch (error) {
        console.error(`Failed to export aggregate stats as JSON:`, error);
        alert(t('export.jsonError', 'Error exporting aggregate data as JSON.'));
    }
  }, [savedGames, seasons, tournaments, t]); // Added t as dependency since it's used in the function

  const handleExportAggregateCsv = useCallback((gameIds: string[], aggregateStats: import('@/types').PlayerStatRow[]) => {
    console.log(`Exporting aggregate CSV for ${gameIds.length} games.`);
     if (gameIds.length === 0) {
        alert(t('export.noGamesInSelection', 'No games match the current filter.'));
        return;
    }

    try {
        const allRows: string[] = [];
        const EOL = '\r\n'; 
        const DELIMITER = ';'; 

        // --- Section 1: Summary Info (Placeholder) ---
        // TODO: Add filter context here if available
        allRows.push(`${escapeCsvField('Export Type:')}${DELIMITER}${escapeCsvField('Aggregate Stats')}`);
        allRows.push(`${escapeCsvField('Export Timestamp:')}${DELIMITER}${escapeCsvField(new Date().toISOString())}`);
        allRows.push(``); // Blank line

        // --- Section 2: Aggregated Player Stats ---
        allRows.push(escapeCsvField('Aggregate Player Stats Summary'));
        // Headers - Added GP
        allRows.push([
            escapeCsvField('Player'),
            escapeCsvField('GP'), // Games Played
            escapeCsvField('G'),  // Goals
            escapeCsvField('A'),  // Assists
            escapeCsvField('Pts'),// Points
            escapeCsvField('FP') // Fair Play Awards
        ].join(DELIMITER));
        
        // Data - Assuming aggregateStats is already sorted as desired by the modal
        aggregateStats.forEach(player => {
             allRows.push([
                escapeCsvField(player.name),
                escapeCsvField(player.gamesPlayed),
                escapeCsvField(player.goals),
                escapeCsvField(player.assists),
                escapeCsvField(player.totalScore),
                escapeCsvField(player.fpAwards ?? 0)
             ].join(DELIMITER));
        });
        allRows.push(``); // Blank line

        // --- Section 3: Detailed Game Data ---
        allRows.push(escapeCsvField('Included Game Details'));
        // Headers for game details
        allRows.push([
            escapeCsvField('Game ID'),
            escapeCsvField('Date'),
            escapeCsvField('Time'),
            escapeCsvField('Location'),
            escapeCsvField('Home Team'),
            escapeCsvField('Away Team'),
            escapeCsvField('Home Score'),
            escapeCsvField('Away Score'),
            escapeCsvField('Notes')
            // Add other relevant fields from AppState if needed
        ].join(DELIMITER));

        // Data for each game
        gameIds.forEach(id => {
            const game = savedGames[id];
            if (game) {
                 allRows.push([
                    escapeCsvField(id),
                    escapeCsvField(game.gameDate),
                    escapeCsvField(game.gameTime),
                    escapeCsvField(game.gameLocation),
                    escapeCsvField(game.teamName),
                    escapeCsvField(game.opponentName),
                    escapeCsvField(game.homeScore),
                    escapeCsvField(game.awayScore),
                    escapeCsvField(game.gameNotes)
                 ].join(DELIMITER));
            } else {
                 allRows.push([
                    escapeCsvField(id),
                    escapeCsvField('Data not found')
                 ].join(DELIMITER));
            }
        });
        allRows.push(``); // Blank line
        
        // --- Section 4: Optional - Detailed Event Logs per Game (Skipped for brevity now) ---

        // --- Combine and Download ---
        const csvString = allRows.join(EOL);
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');

        const now = new Date();
        const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
        a.download = `SoccerApp_AggregateStats_${timestamp}.csv`; 
        
        a.href = url;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log(`Aggregate stats exported successfully as CSV.`);

    } catch (error) {
        console.error(`Failed to export aggregate stats as CSV:`, error);
        alert(t('export.csvError', 'Error exporting aggregate data as CSV.'));
    }
  }, [savedGames, t]);// Correctly removed seasons and tournaments

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
    homeOrAway: 'home' | 'away' // <<< Step 4b: Add parameter
  ) => {
      // ADD LOGGING HERE:
      console.log('[handleStartNewGameWithSetup] Received Params:', { 
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
        homeOrAway 
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
          numberOfPeriods: numPeriods, // Use parameter
          periodDurationMinutes: periodDuration, // Use parameter
          homeScore: 0,
          awayScore: 0,
          gameNotes: '',
          teamName: homeTeamName, // Use current teamName state
          homeOrAway: homeOrAway, // <<< Step 4b: Use parameter value
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
      // console.log('[handleStartNewGameWithSetup] Constructed newGameState:', {
      //     periods: newGameState.numberOfPeriods,
      //     duration: newGameState.periodDurationMinutes,
      //     // REMOVED: numAvailablePlayers: newGameState.availablePlayers.length // Log roster size
      // });
      console.log('[handleStartNewGameWithSetup] DIRECTLY CONSTRUCTED newGameState:', JSON.parse(JSON.stringify(newGameState)));

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
        // console.log(`Explicitly saved initial state for new game ID: ${newGameId}`); // OLD

        // const currentSettings: AppSettings = { currentGameId: newGameId }; // OLD
        // localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(currentSettings)); // OLD
        // console.log(`Updated app settings with new game ID: ${newGameId}`); // OLD

        await utilSaveGame(newGameId, newGameState);
        await utilSaveCurrentGameIdSetting(newGameId);
        console.log(`Saved new game ${newGameId} and settings via utility functions.`);

      } catch (error) {
         console.error("Error explicitly saving new game state:", error);
      }

      // 4. Reset History with the new state
      setHistory([newGameState]);
      setHistoryIndex(0);

      // 5. Set the current game ID - This will trigger the loading useEffect
      setCurrentGameId(newGameId);
      console.log(`Set current game ID to: ${newGameId}. Loading useEffect will sync component state.`);

      // Close the setup modal
      setIsNewGameSetupModalOpen(false);

      // <<< Trigger the roster button highlight >>>
      console.log('[handleStartNewGameWithSetup] Setting highlightRosterButton to true.'); // Log highlight trigger
      setHighlightRosterButton(true);

  }, [
    // Keep necessary dependencies
    savedGames,
    availablePlayers, 
    setSavedGames,
    setHistory,
    setHistoryIndex,
    setCurrentGameId,
    setIsNewGameSetupModalOpen,
    setHighlightRosterButton, 
  ]);

  // ** REVERT handleCancelNewGameSetup TO ORIGINAL **
  const handleCancelNewGameSetup = useCallback(() => {
    console.log("New game setup skipped/cancelled.");
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
        console.log("User chose to Quick Save before starting new game.");
        handleQuickSaveGame(); // Call quick save directly
        setIsNewGameSetupModalOpen(true); // Open setup modal immediately after
        // No need to return here; flow continues after quick save
      } else {
        // User chose Cancel (Discard) -> Proceed to next confirmation
        console.log("Discarding current game changes to start new game.");
        // Confirmation for actually starting new game (ONLY shown if user DISCARDED previous game)
        if (window.confirm(t('controlBar.startNewMatchConfirmation', 'Are you sure you want to start a new match? Any unsaved progress will be lost.') ?? 'Are you sure?')) {
          console.log("Start new game confirmed after discarding, opening setup modal...");
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
         console.log("Start new game confirmed (no prior game to save), opening setup modal...");
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

  }, [t, currentGameId, savedGames, /* handleOpenSaveGameModal, */ handleQuickSaveGame, setIsNewGameSetupModalOpen, 
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
      console.log('All selected players are already on the field');
      return;
    }

    // Find the corresponding player objects from availablePlayers
    const playersToPlace = selectedButNotOnField
      .map(id => availablePlayers.find(p => p.id === id))
      .filter((p): p is Player => p !== undefined);
    
    console.log(`Placing ${playersToPlace.length} players on the field...`);

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
    
    console.log(`Successfully placed ${playersToPlace.length} players on the field`);
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
  console.log('[Home Render] highlightRosterButton:', highlightRosterButton); // Log state on render

  // ATTEMPTING TO EXPLICITLY REMOVE THE CONDITIONAL HOOK
  // The useEffect for highlightRosterButton that was here (around lines 2977-2992)
  // should be removed as it's called conditionally and its correct version is at the top level.

  // Log gameEvents before PlayerBar is rendered
  console.log('[page.tsx] About to render PlayerBar, gameEvents for PlayerBar:', JSON.stringify(gameSessionState.gameEvents));

  // --- Tactical Drawing Handlers ---
  const handleTacticalDrawingStart = (point: Point) => {
    setTacticalDrawings(prev => [...prev, [point]]);
  };

  const handleTacticalDrawingAddPoint = (point: Point) => {
    setTacticalDrawings(prev => {
      const newDrawings = [...prev];
      if (newDrawings.length > 0) {
        newDrawings[newDrawings.length - 1].push(point);
      }
      return newDrawings;
    });
  };

  const handleTacticalDrawingEnd = () => {
    saveStateToHistory({ tacticalDrawings });
  };

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
            timeElapsedInSeconds={gameSessionState.timeElapsedInSeconds}
            subAlertLevel={gameSessionState.subAlertLevel}
            onSubstitutionMade={handleSubstitutionMade}
            completedIntervalDurations={gameSessionState.completedIntervalDurations || []}
            subIntervalMinutes={gameSessionState.subIntervalMinutes}
            onSetSubInterval={handleSetSubInterval}
            isTimerRunning={gameSessionState.isTimerRunning}
            onStartPauseTimer={handleStartPauseTimer}
            onResetTimer={handleResetTimer}
            onToggleGoalLogModal={handleToggleGoalLogModal}
            onRecordOpponentGoal={() => handleLogOpponentGoal(gameSessionState.timeElapsedInSeconds)}
            teamName={gameSessionState.teamName}
            opponentName={gameSessionState.opponentName}
            homeScore={gameSessionState.homeScore}
            awayScore={gameSessionState.awayScore}
            homeOrAway={gameSessionState.homeOrAway}
            lastSubTime={gameSessionState.lastSubConfirmationTimeSeconds}
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
          timeElapsedInSeconds={gameSessionState.timeElapsedInSeconds}
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
          onHardResetApp={handleHardResetApp}
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
        />
      </div>

      {/* Modals and Overlays */}
      {/* Training Resources Modal */}
      <TrainingResourcesModal 
        isOpen={isTrainingResourcesOpen} 
        onClose={handleToggleTrainingResources}
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
      {/* Save Game Modal */}
      <SaveGameModal
        isOpen={isSaveGameModalOpen}
        onClose={handleCloseSaveGameModal}
        onSave={handleSaveGame} 
        teamName={gameSessionState.teamName}
        opponentName={gameSessionState.opponentName}
        gameDate={gameSessionState.gameDate}
        // Pass loading/error state props from useMutation
        isGameSaving={saveGameMutation.isPending} // CORRECTED: Use isPending for loading state
        gameSaveError={gameSaveError} 
      />
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
        isRosterUpdating={updatePlayerMutation.isPending || setGoalieStatusMutation.isPending || removePlayerMutation.isPending || addPlayerMutation.isPending}
        rosterError={rosterError}
        onOpenPlayerStats={handleOpenPlayerStats}
      />

      <SeasonTournamentManagementModal
        isOpen={isSeasonTournamentModalOpen}
        onClose={handleCloseSeasonTournamentModal}
        seasons={seasons}
        tournaments={tournaments}
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
        gameEvents={gameSessionState.gameEvents}
        availablePlayers={availablePlayers}
        selectedPlayerIds={gameSessionState.selectedPlayerIds}
        onSelectedPlayersChange={handleUpdateSelectedPlayers}
        numPeriods={gameSessionState.numberOfPeriods}
        periodDurationMinutes={gameSessionState.periodDurationMinutes}
        onTeamNameChange={handleTeamNameChange}
        onOpponentNameChange={handleOpponentNameChange}
        onGameDateChange={handleGameDateChange}
        onGameLocationChange={handleGameLocationChange}
        onGameTimeChange={handleGameTimeChange}
        onGameNotesChange={handleGameNotesChange}
        onUpdateGameEvent={handleUpdateGameEvent}
        onAwardFairPlayCard={handleAwardFairPlayCard}
        onDeleteGameEvent={handleDeleteGameEvent}
        onNumPeriodsChange={handleSetNumberOfPeriods}
        onPeriodDurationChange={handleSetPeriodDuration}
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
        timeElapsedInSeconds={gameSessionState.timeElapsedInSeconds}
        updateGameDetailsMutation={updateGameDetailsMutation}
      />
    </main>
  );
}
