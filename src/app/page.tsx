'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import SoccerField from '@/components/SoccerField';
import PlayerBar from '@/components/PlayerBar';
import ControlBar from '@/components/ControlBar';
import TimerOverlay from '@/components/TimerOverlay';
import InstructionsModal from '@/components/InstructionsModal';
import GoalLogModal from '@/components/GoalLogModal';
import GameStatsModal from '@/components/GameStatsModal';
import TrainingResourcesModal from '@/components/TrainingResourcesModal';
import SaveGameModal from '@/components/SaveGameModal';
import LoadGameModal from '@/components/LoadGameModal';
import NewGameSetupModal from '@/components/NewGameSetupModal';
import RosterSettingsModal from '@/components/RosterSettingsModal';
import GameSettingsModal from '@/components/GameSettingsModal';
import { useTranslation } from 'react-i18next';
import { useGameState, UseGameStateReturn } from '@/hooks/useGameState';
import GameInfoBar from '@/components/GameInfoBar';
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
  saveGames as utilSaveAllGames, // Corrected: For handleImportGamesFromJson (was saveAllGames)
  GameData // Type
} from '@/utils/savedGames';
import {
  getCurrentGameIdSetting, // For initial load
  saveCurrentGameIdSetting as utilSaveCurrentGameIdSetting, // For saving current game ID setting
  resetAppSettings as utilResetAppSettings // For handleHardReset
} from '@/utils/appSettings';
// Import Player from types directory
import { Player, Season, Tournament } from '@/types';
// Import saveMasterRoster utility
import { saveMasterRoster } from '@/utils/masterRoster';
// Import useQuery, useMutation, useQueryClient
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

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
  // Timer related state to persist
  subIntervalMinutes?: number; // Add sub interval
  completedIntervalDurations?: IntervalLog[]; // Add completed interval logs
  lastSubConfirmationTimeSeconds?: number; // Add last substitution confirmation time
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
};

// Define new localStorage keys
export const SAVED_GAMES_KEY = 'savedSoccerGames';
export const APP_SETTINGS_KEY = 'soccerAppSettings';
const SEASONS_LIST_KEY = 'soccerSeasons';
// const TOURNAMENTS_LIST_KEY = 'soccerTournaments'; // Removed unused variable
const MASTER_ROSTER_KEY = 'soccerMasterRoster'; // <<< NEW KEY for global roster

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

// Define a default Game ID for the initial/unsaved state
export const DEFAULT_GAME_ID = '__default_unsaved__';



export default function Home() {
  console.log('--- page.tsx RENDER ---');
  const { t } = useTranslation(); // Get translation function
  const queryClient = useQueryClient(); // Get query client instance

  // --- TanStack Query for Master Roster ---
  const {
    data: masterRosterQueryResultData,
    isLoading: isMasterRosterQueryLoading,
    isError: isMasterRosterQueryError,
    error: masterRosterQueryErrorData,
  } = useQuery<Player[], Error>({
    queryKey: ['masterRoster'],
    queryFn: getMasterRoster,
  });

  // --- TanStack Query for Seasons ---
  const {
    data: seasonsQueryResultData,
    isLoading: areSeasonsQueryLoading,
    isError: isSeasonsQueryError,
    error: seasonsQueryErrorData,
  } = useQuery<Season[], Error>({
    queryKey: ['seasons'],
    queryFn: utilGetSeasons,
  });

  // --- TanStack Query for Tournaments ---
  const {
    data: tournamentsQueryResultData,
    isLoading: areTournamentsQueryLoading,
    isError: isTournamentsQueryError,
    error: tournamentsQueryErrorData,
  } = useQuery<Tournament[], Error>({
    queryKey: ['tournaments'],
    queryFn: utilGetTournaments,
  });

  // --- TanStack Query for All Saved Games ---
  const {
    data: allSavedGamesQueryResultData,
    isLoading: isAllSavedGamesQueryLoading,
    isError: isAllSavedGamesQueryError,
    error: allSavedGamesQueryErrorData,
  } = useQuery<SavedGamesCollection | null, Error>({
    queryKey: ['savedGames'],
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
    queryKey: ['appSettingsCurrentGameId'],
    queryFn: getCurrentGameIdSetting,
  });

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

    const nextState: AppState = { ...currentHistoryState, ...newState };

    if (JSON.stringify(nextState) === JSON.stringify(currentHistoryState)) {
      return; // Don't save if nothing changed
    }

    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, nextState]);
    setHistoryIndex(newHistory.length);

  }, [history, historyIndex]); // Dependencies are just history state

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
  const [showPlayerNames, setShowPlayerNames] = useState<boolean>(initialState.showPlayerNames);
  const [teamName, setTeamName] = useState<string>(initialState.teamName);
  const [gameEvents, setGameEvents] = useState<GameEvent[]>(initialState.gameEvents);
  const [opponentName, setOpponentName] = useState<string>(initialState.opponentName);
  const [gameDate, setGameDate] = useState<string>(initialState.gameDate);
  const [homeScore, setHomeScore] = useState<number>(initialState.homeScore);
  const [awayScore, setAwayScore] = useState<number>(initialState.awayScore);
  const [gameNotes, setGameNotes] = useState<string>(initialState.gameNotes);
  const [numberOfPeriods, setNumberOfPeriods] = useState<1 | 2>(initialState.numberOfPeriods);
  const [periodDurationMinutes, setPeriodDurationMinutes] = useState<number>(initialState.periodDurationMinutes);
  const [currentPeriod, setCurrentPeriod] = useState<number>(initialState.currentPeriod);
  const [gameStatus, setGameStatus] = useState<'notStarted' | 'inProgress' | 'periodEnd' | 'gameEnd'>(initialState.gameStatus);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(initialState.selectedPlayerIds); // Add state for selected player IDs
  const [seasonId, setSeasonId] = useState<string>(initialState.seasonId); // Initialize state for season ID
  const [tournamentId, setTournamentId] = useState<string>(initialState.tournamentId); // Initialize state for tournament ID
  // Add state for location and time
  const [gameLocation, setGameLocation] = useState<string>(initialState.gameLocation || '');
  const [gameTime, setGameTime] = useState<string>(initialState.gameTime || '');
  // ... Timer state ...
  // ... Modal states ...
  // ... UI/Interaction states ...
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [draggingPlayerFromBarInfo, setDraggingPlayerFromBarInfo] = useState<Player | null>(null);
  // Persistence state
  const [savedGames, setSavedGames] = useState<SavedGamesCollection>({});
  const [currentGameId, setCurrentGameId] = useState<string | null>(DEFAULT_GAME_ID);
  // ADD State for seasons/tournaments lists
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  // <<< ADD: State for home/away status >>>
  const [homeOrAway, setHomeOrAway] = useState<'home' | 'away'>(initialState.homeOrAway);
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  const [hasSkippedInitialSetup, setHasSkippedInitialSetup] = useState<boolean>(false);
  const [isGameSettingsModalOpen, setIsGameSettingsModalOpen] = useState<boolean>(false); // <<< ADDED State Declaration

  // --- Timer State (Still needed here) ---
  const [timeElapsedInSeconds, setTimeElapsedInSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [showLargeTimerOverlay, setShowLargeTimerOverlay] = useState<boolean>(false); // State for overlay visibility
  
  // --- Substitution Timer State (Still needed here) ---
  const [subIntervalMinutes, setSubIntervalMinutes] = useState<number>(5); // Default to 5 min
  const [nextSubDueTimeSeconds, setNextSubDueTimeSeconds] = useState<number>(5 * 60);
  const [subAlertLevel, setSubAlertLevel] = useState<'none' | 'warning' | 'due'>('none'); 
  const [completedIntervalDurations, setCompletedIntervalDurations] = useState<IntervalLog[]>([]); // Use IntervalLog[]
  const [lastSubConfirmationTimeSeconds, setLastSubConfirmationTimeSeconds] = useState<number>(0);
  
  // --- Modal States (Still needed here) ---
  const [isInstructionsOpen, setIsInstructionsOpen] = useState<boolean>(false);
  const [isTrainingResourcesOpen, setIsTrainingResourcesOpen] = useState<boolean>(false); 
  const [isGoalLogModalOpen, setIsGoalLogModalOpen] = useState<boolean>(false); 
  const [isGameStatsModalOpen, setIsGameStatsModalOpen] = useState<boolean>(false);
  const [isNewGameSetupModalOpen, setIsNewGameSetupModalOpen] = useState<boolean>(false);
  const [isSaveGameModalOpen, setIsSaveGameModalOpen] = useState<boolean>(false);
  const [isLoadGameModalOpen, setIsLoadGameModalOpen] = useState<boolean>(false);
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false); // State for the new modal

  // <<< ADD State to hold player IDs for the next new game >>>
  const [playerIdsForNewGame, setPlayerIdsForNewGame] = useState<string[] | null>(null);
  // <<< ADD State for the roster prompt toast >>>
  // const [showRosterPrompt, setShowRosterPrompt] = useState<boolean>(false);
  // <<< ADD State for roster button highlight >>>
  const [highlightRosterButton, setHighlightRosterButton] = useState<boolean>(false);

  // State for roster operations loading/error
  const [isRosterUpdating, setIsRosterUpdating] = useState(false);
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
  const [isGamesImporting, setIsGamesImporting] = useState(false); // For importing games
  const [gamesImportError, setGamesImportError] = useState<string | null>(null);
  const [processingGameId, setProcessingGameId] = useState<string | null>(null); // To track which game item is being processed

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
      queryClient.invalidateQueries({ queryKey: ['savedGames'] });
      queryClient.invalidateQueries({ queryKey: ['appSettingsCurrentGameId'] });

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
      queryClient.invalidateQueries({ queryKey: ['masterRoster'] }); // This will refetch and update availablePlayers
      if (updatedPlayer) {
        // Update playersOnField state and then save that specific change to history
        setPlayersOnField(prevPlayersOnField => {
          const nextPlayersOnField = prevPlayersOnField.map(p => 
            p.id === updatedPlayer.id ? { ...p, ...updatedPlayer } : p
          );
          saveStateToHistory({ playersOnField: nextPlayersOnField }); // Save this computed state to history
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
      queryClient.invalidateQueries({ queryKey: ['masterRoster'] });
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
          saveStateToHistory({ playersOnField: nextPlayersOnField });
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

  // --- Derived State for Filtered Players (Moved to top-level) ---
  const playersForCurrentGame = useMemo(() => {
    if (!Array.isArray(availablePlayers)) {
      console.warn('[MEMO playersForCurrentGame] availablePlayers is not an array. Returning []. Value:', availablePlayers);
      return [];
    }
    if (!selectedPlayerIds || selectedPlayerIds.length === 0) {
        return availablePlayers; 
    }
    const gamePlayers = availablePlayers.filter(player => selectedPlayerIds.includes(player.id));
    return gamePlayers;
  }, [availablePlayers, selectedPlayerIds]);

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

  // --- Timer Effect ---
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    const periodEndTimeSeconds = currentPeriod * periodDurationMinutes * 60;

    if (isTimerRunning && gameStatus === 'inProgress') {
      intervalId = setInterval(() => {
        setTimeElapsedInSeconds(prevTime => {
          const newTime = prevTime + 1;

          // Check if period or game ended
          if (newTime >= periodEndTimeSeconds) {
            clearInterval(intervalId!);
            setIsTimerRunning(false);
            setTimeElapsedInSeconds(periodEndTimeSeconds); // Set exactly to end time
            
            if (currentPeriod === numberOfPeriods) {
              setGameStatus('gameEnd');
              console.log("Game ended.");
            } else {
              setGameStatus('periodEnd');
              console.log(`Period ${currentPeriod} ended.`);
            }
            // Update substitution alert based on end time
            setSubAlertLevel(newTime >= nextSubDueTimeSeconds ? 'due' : subAlertLevel);
            return periodEndTimeSeconds;
          }

          // Update substitution alert level
          const currentDueTime = nextSubDueTimeSeconds;
          const warningTime = currentDueTime - 60;
          let newAlertLevel: 'none' | 'warning' | 'due' = 'none';
          if (newTime >= currentDueTime) {
            newAlertLevel = 'due';
          } else if (warningTime >= 0 && newTime >= warningTime) { 
            newAlertLevel = 'warning';
          }
          setSubAlertLevel(newAlertLevel);

          return newTime;
        });
      }, 1000);
    } else {
      // Clear interval if it exists and timer is not running or game not in progress
      if (intervalId) {
        clearInterval(intervalId);
      }
    }

    // Cleanup function
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isTimerRunning, gameStatus, currentPeriod, periodDurationMinutes, numberOfPeriods, nextSubDueTimeSeconds, subAlertLevel]); // ADD gameStatus, currentPeriod, periodDurationMinutes, numberOfPeriods dependencies

  // --- Load state from localStorage on mount (REVISED) ---
  useEffect(() => {
    const loadInitialAppData = async () => {
      console.log('[EFFECT init] Coordinating initial application data from TanStack Query...');
      // This useEffect now primarily ensures that dependent state updates happen
      // after the core data (masterRoster, seasons, tournaments, savedGames, currentGameIdSetting)
      // has been fetched by their respective useQuery hooks.

      // Simple migration for old data keys (if any) - Run once
      try {
        const oldRosterJson = localStorage.getItem('availablePlayers');
        if (oldRosterJson) {
          console.log('[EFFECT init] Migrating old roster data...');
          localStorage.setItem(MASTER_ROSTER_KEY, oldRosterJson);
          localStorage.removeItem('availablePlayers');
          // Consider invalidating and refetching masterRoster query here if migration happens
          // queryClient.invalidateQueries(['masterRoster']);
        }
        const oldSeasonsJson = localStorage.getItem('soccerSeasonsList');
        if (oldSeasonsJson) {
          console.log('[EFFECT init] Migrating old seasons data...');
          localStorage.setItem(SEASONS_LIST_KEY, oldSeasonsJson);
          // queryClient.invalidateQueries(['seasons']);
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
        setIsLoaded(true);
        setInitialLoadComplete(true);
        console.log('[EFFECT init] Initial application data coordination complete based on TanStack Query states.');
      }
    };

    loadInitialAppData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Helper function to load game state from game data
  const loadGameStateFromData = (gameData: GameData | null, isInitialDefaultLoad = false) => {
    console.log('[LOAD GAME STATE] Called with gameData:', gameData, 'isInitialDefaultLoad:', isInitialDefaultLoad);

    const stateToApply = gameData ? 
      {
        playersOnField: gameData.playersOnField || [],
        opponents: gameData.opponents || [],
        drawings: gameData.drawings || [],
        showPlayerNames: gameData.showPlayerNames === undefined ? initialState.showPlayerNames : gameData.showPlayerNames,
        teamName: gameData.homeTeam || initialState.teamName,
        gameEvents: gameData.events || [],
        opponentName: gameData.awayTeam || initialState.opponentName,
        gameDate: gameData.date || initialState.gameDate,
        homeScore: gameData.homeScore || 0,
        awayScore: gameData.awayScore || 0,
        gameNotes: gameData.notes || '',
        numberOfPeriods: gameData.numberOfPeriods || initialState.numberOfPeriods,
        periodDurationMinutes: gameData.periodDuration || initialState.periodDurationMinutes,
        currentPeriod: gameData.currentPeriod || initialState.currentPeriod,
        gameStatus: gameData.gameStatus || initialState.gameStatus,
        subIntervalMinutes: gameData.subIntervalMinutes ?? initialState.subIntervalMinutes ?? 5, // Added final fallback
        completedIntervalDurations: gameData.completedIntervalDurations ?? initialState.completedIntervalDurations ?? [], // Added final fallback
        lastSubConfirmationTimeSeconds: gameData.lastSubConfirmationTimeSeconds ?? initialState.lastSubConfirmationTimeSeconds ?? 0, // Added final fallback
        selectedPlayerIds: gameData.selectedPlayerIds || [],
        seasonId: gameData.seasonId ?? '',
        tournamentId: gameData.tournamentId ?? '',
        gameLocation: gameData.location || '',
        gameTime: gameData.time || '',
        homeOrAway: gameData.teamOnLeft ?? initialState.homeOrAway,
      } as Partial<AppState> 
      : initialState;
    
    const historyState: AppState = {
      ...(isInitialDefaultLoad ? initialState : stateToApply as AppState),
      availablePlayers: availablePlayers, // Always use the current master roster for history snapshots
      playersOnField: stateToApply.playersOnField || initialState.playersOnField,
      opponents: stateToApply.opponents || initialState.opponents,
      drawings: stateToApply.drawings || initialState.drawings,
      showPlayerNames: stateToApply.showPlayerNames === undefined ? initialState.showPlayerNames : stateToApply.showPlayerNames,
      teamName: stateToApply.teamName || initialState.teamName,
      gameEvents: stateToApply.gameEvents || initialState.gameEvents,
      opponentName: stateToApply.opponentName || initialState.opponentName,
      gameDate: stateToApply.gameDate || initialState.gameDate,
      homeScore: stateToApply.homeScore ?? initialState.homeScore,
      awayScore: stateToApply.awayScore ?? initialState.awayScore,
      gameNotes: stateToApply.gameNotes || initialState.gameNotes,
      homeOrAway: stateToApply.homeOrAway || initialState.homeOrAway,
      numberOfPeriods: stateToApply.numberOfPeriods || initialState.numberOfPeriods,
      periodDurationMinutes: stateToApply.periodDurationMinutes || initialState.periodDurationMinutes,
      currentPeriod: stateToApply.currentPeriod || initialState.currentPeriod,
      gameStatus: stateToApply.gameStatus || initialState.gameStatus,
      selectedPlayerIds: stateToApply.selectedPlayerIds || initialState.selectedPlayerIds,
      seasonId: stateToApply.seasonId ?? initialState.seasonId,
      tournamentId: stateToApply.tournamentId ?? initialState.tournamentId,
      gameLocation: stateToApply.gameLocation || initialState.gameLocation,
      gameTime: stateToApply.gameTime || initialState.gameTime,
      subIntervalMinutes: stateToApply.subIntervalMinutes ?? initialState.subIntervalMinutes ?? 5,
      completedIntervalDurations: stateToApply.completedIntervalDurations ?? initialState.completedIntervalDurations ?? [],
      lastSubConfirmationTimeSeconds: stateToApply.lastSubConfirmationTimeSeconds ?? initialState.lastSubConfirmationTimeSeconds ?? 0,
    };

    setHistory([historyState]);
    setHistoryIndex(0);

    setPlayersOnField(stateToApply.playersOnField || []);
    setOpponents(stateToApply.opponents || []);
    setDrawings(stateToApply.drawings || []);
    setShowPlayerNames(stateToApply.showPlayerNames === undefined ? initialState.showPlayerNames : stateToApply.showPlayerNames);
    setTeamName(stateToApply.teamName || initialState.teamName);
    setGameEvents(stateToApply.gameEvents || []);
    setOpponentName(stateToApply.opponentName || initialState.opponentName);
    setGameDate(stateToApply.gameDate || initialState.gameDate);
    setHomeScore(stateToApply.homeScore ?? 0);
    setAwayScore(stateToApply.awayScore ?? 0);
    setGameNotes(stateToApply.gameNotes || '');
    setNumberOfPeriods(stateToApply.numberOfPeriods || initialState.numberOfPeriods);
    setPeriodDurationMinutes(stateToApply.periodDurationMinutes || initialState.periodDurationMinutes);
    setCurrentPeriod(stateToApply.currentPeriod || initialState.currentPeriod);
    setGameStatus(stateToApply.gameStatus || initialState.gameStatus);
    setSubIntervalMinutes(stateToApply.subIntervalMinutes ?? initialState.subIntervalMinutes ?? 5); // Ensure non-undefined fallback
    setCompletedIntervalDurations(stateToApply.completedIntervalDurations ?? initialState.completedIntervalDurations ?? []); // Ensure non-undefined fallback
    setLastSubConfirmationTimeSeconds(stateToApply.lastSubConfirmationTimeSeconds ?? initialState.lastSubConfirmationTimeSeconds ?? 0); // Ensure non-undefined fallback
    setSelectedPlayerIds(stateToApply.selectedPlayerIds || []); // These are game-specific
    setSeasonId(stateToApply.seasonId ?? '');
    setTournamentId(stateToApply.tournamentId ?? '');
    setGameLocation(stateToApply.gameLocation || '');
    setGameTime(stateToApply.gameTime || '');
    setHomeOrAway(stateToApply.homeOrAway || initialState.homeOrAway);

    // If specific gameData was loaded, its availablePlayers might be different
    // from the master roster. This is for historical accuracy of that game.
    // The global `availablePlayers` (from useGameState, set by master roster load) is used for PlayerBar.
    // The `gameData.availablePlayers` is used if we need to know who *was* available when that game was saved.
    // For `playersForCurrentGame`, it should use the master `availablePlayers` filtered by `selectedPlayerIds`.
    console.log('[LOAD GAME STATE] Finished applying state. Current master availablePlayers:', availablePlayers);
  };

  // --- Effect to load game state when currentGameId changes or savedGames updates ---
  useEffect(() => {
    console.log('[EFFECT game load] currentGameId or savedGames changed:', { currentGameId });
    if (!initialLoadComplete) {
      console.log('[EFFECT game load] Initial load not complete, skipping game state application.');
      return; 
    }

    let gameToLoad: GameData | null = null;
    if (currentGameId && currentGameId !== DEFAULT_GAME_ID && savedGames[currentGameId]) {
      console.log(`[EFFECT game load] Found game data for ${currentGameId}`);
      gameToLoad = savedGames[currentGameId] as unknown as GameData; // Cast if necessary
    } else {
      console.log('[EFFECT game load] No specific game to load or ID is default. Applying default game state.');
      // No specific game to load from savedGames, ensure defaults are applied
      // loadGameStateFromData(null) will apply initialState defaults.
      // The master `availablePlayers` is already set by the initial app load effect.
    }
    // Call loadGameStateFromData; it handles null correctly (applies initialState)
    // This will set up the game-specific details (scores, events, selected players for *that* game)
    // but will NOT overwrite the master availablePlayers roster.
    loadGameStateFromData(gameToLoad);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentGameId, savedGames, initialLoadComplete]); // IMPORTANT: initialLoadComplete ensures this runs after master roster is loaded.

  // --- Save state to localStorage ---
  useEffect(() => {
    // Only auto-save if loaded AND we have a proper game ID (not the default unsaved one)
    const autoSave = async () => {
      if (isLoaded && currentGameId && currentGameId !== DEFAULT_GAME_ID) {
        console.log(`Auto-saving state for game ID: ${currentGameId}`);
        try {
          // 1. Create the current game state snapshot (excluding history)
          const currentSnapshot: AppState = {
            playersOnField,
            opponents,
            drawings,
            availablePlayers, // <<< ADD BACK: Include roster available *at time of save*
            showPlayerNames,
            teamName,
            gameEvents,
            opponentName,
            gameDate,
            homeScore,
            awayScore,
            gameNotes,
            numberOfPeriods, // Read current state
            periodDurationMinutes, // Read current state
            currentPeriod,
            gameStatus,
            selectedPlayerIds,
            seasonId,
            tournamentId,
            gameLocation,
            gameTime,
            // Add timer related state
            subIntervalMinutes,
            completedIntervalDurations,
            lastSubConfirmationTimeSeconds,
            homeOrAway,
          };

          // 2. Save the game snapshot using utility
          await utilSaveGame(currentGameId, currentSnapshot);
          
          // 3. Save App Settings (only the current game ID) using utility
          await utilSaveCurrentGameIdSetting(currentGameId);

        } catch (error) {
          console.error("Failed to auto-save state to localStorage:", error);
          alert("Error saving game."); // Notify user
        }
      } else if (isLoaded && currentGameId === DEFAULT_GAME_ID) {
        console.log("Not auto-saving as this is an unsaved game (no ID assigned yet)");
      }
    };
    autoSave();
    // Dependencies: Include all state variables that are part of the saved snapshot
  }, [isLoaded, currentGameId,
      playersOnField, opponents, drawings, availablePlayers, // <<< ADD availablePlayers
      showPlayerNames, teamName,
      gameEvents, opponentName, gameDate, homeScore, awayScore, gameNotes,
      numberOfPeriods, periodDurationMinutes, // ADDED back dependencies
      currentPeriod, gameStatus,
      selectedPlayerIds, seasonId, tournamentId, // <<< ENSURE seasonId & tournamentId ARE HERE
      gameLocation, gameTime, subIntervalMinutes,
      completedIntervalDurations, lastSubConfirmationTimeSeconds, homeOrAway
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
    // Update state directly
    setPlayersOnField([]);
    setOpponents([]);
    setDrawings([]);
    // Save reset state to history
    saveStateToHistory({ playersOnField: [], opponents: [], drawings: [] });
  }, [saveStateToHistory, setDrawings, setOpponents, setPlayersOnField]); 

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

  // --- Toggle Player Names Handler ---
  const handleTogglePlayerNames = () => {
    console.log('Toggling player names');
    const nextShowNames = !showPlayerNames;
    setShowPlayerNames(nextShowNames);
    saveStateToHistory({ showPlayerNames: nextShowNames });
  };

  // --- Team Name Handler ---
  const handleTeamNameChange = (newName: string) => {
    const trimmedName = newName.trim();
    if (trimmedName) {
        console.log("Updating team name to:", trimmedName);
        // Directly update state
        setTeamName(trimmedName);
        // Also save to session history for undo/redo
        saveStateToHistory({ teamName: trimmedName });
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
      // REMOVED: setAvailablePlayers(prevState.availablePlayers);
      setShowPlayerNames(prevState.showPlayerNames);
      setTeamName(prevState.teamName); // Undo team name
      setGameEvents(prevState.gameEvents); // Restore game events
      setHomeScore(prevState.homeScore); // Restore scores
      setAwayScore(prevState.awayScore);
      setOpponentName(prevState.opponentName);
      setGameDate(prevState.gameDate);
      setGameNotes(prevState.gameNotes);
      setNumberOfPeriods(prevState.numberOfPeriods);
      setPeriodDurationMinutes(prevState.periodDurationMinutes);
      setCurrentPeriod(prevState.currentPeriod);
      setGameStatus(prevState.gameStatus);
      setSelectedPlayerIds(prevState.selectedPlayerIds);
      setSeasonId(prevState.seasonId ?? ''); // Use default if undefined
      setTournamentId(prevState.tournamentId ?? ''); // Use default if undefined
      setGameLocation(prevState.gameLocation ?? '');
      setGameTime(prevState.gameTime ?? '');
      setSubIntervalMinutes(prevState.subIntervalMinutes ?? 5); // Restore sub interval
      setCompletedIntervalDurations(prevState.completedIntervalDurations ?? []); // Restore intervals
      setLastSubConfirmationTimeSeconds(prevState.lastSubConfirmationTimeSeconds ?? 0); // Restore last sub time
      // <<< ADD: Restore home/away status (undo) >>>
      setHomeOrAway(prevState.homeOrAway);
      // Recalculate next sub due time based on restored state?
      // For simplicity, we might skip recalculating nextSubDueTimeSeconds on undo/redo
      // It will naturally correct itself on the next sub or interval change.

      setHistoryIndex(prevStateIndex);
      // Restore timer runtime state if needed here too (timeElapsed, isRunning?)
      // Generally, undo/redo shouldn't affect the running timer state.
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
      // REMOVED: setAvailablePlayers(nextState.availablePlayers);
      setShowPlayerNames(nextState.showPlayerNames);
      setTeamName(nextState.teamName); // Redo team name
      setGameEvents(nextState.gameEvents); // Restore game events
      setHomeScore(nextState.homeScore); // Restore scores
      setAwayScore(nextState.awayScore);
      setOpponentName(nextState.opponentName);
      setGameDate(nextState.gameDate);
      setGameNotes(nextState.gameNotes);
      setNumberOfPeriods(nextState.numberOfPeriods);
      setPeriodDurationMinutes(nextState.periodDurationMinutes);
      setCurrentPeriod(nextState.currentPeriod);
      setGameStatus(nextState.gameStatus);
      setSelectedPlayerIds(nextState.selectedPlayerIds);
      setSeasonId(nextState.seasonId ?? ''); // Use default if undefined
      setTournamentId(nextState.tournamentId ?? ''); // Use default if undefined
      setGameLocation(nextState.gameLocation ?? '');
      setGameTime(nextState.gameTime ?? '');
      setSubIntervalMinutes(nextState.subIntervalMinutes ?? 5); // Restore sub interval
      setCompletedIntervalDurations(nextState.completedIntervalDurations ?? []); // Restore intervals
      setLastSubConfirmationTimeSeconds(nextState.lastSubConfirmationTimeSeconds ?? 0); // Restore last sub time
      // <<< ADD: Restore home/away status (redo) >>>
      setHomeOrAway(nextState.homeOrAway);
      // Similar to undo, skip recalculating nextSubDueTimeSeconds here.
      
      setHistoryIndex(nextStateIndex);
      // Restore timer runtime state if needed here too
    } else {
      console.log("Cannot redo: at end of history");
    }
  };

  // --- Timer Handlers ---
  const handleStartPauseTimer = () => {
    if (gameStatus === 'notStarted') {
      // Start the game (first period)
      setGameStatus('inProgress');
      setCurrentPeriod(1);
      setTimeElapsedInSeconds(0); // Ensure timer starts from 0
      setCompletedIntervalDurations([]); // Reset for a completely new game start
      setLastSubConfirmationTimeSeconds(0);
      setNextSubDueTimeSeconds(subIntervalMinutes * 60);
      setSubAlertLevel('none');
      setIsTimerRunning(true);
      console.log("Game started, Period 1.");
    } else if (gameStatus === 'periodEnd') {
      // Start the next period
      const nextPeriod = currentPeriod + 1;
      setCurrentPeriod(nextPeriod);
      setGameStatus('inProgress');
      // Reset sub timer for the new period relative to the end of the previous
      const previousPeriodEndTime = (nextPeriod - 1) * periodDurationMinutes * 60;
      setTimeElapsedInSeconds(previousPeriodEndTime); // Start timer from period end time
      // DO NOT reset completedIntervalDurations here
      setLastSubConfirmationTimeSeconds(previousPeriodEndTime);
      setNextSubDueTimeSeconds(previousPeriodEndTime + (subIntervalMinutes * 60));
      setSubAlertLevel('none');
      setIsTimerRunning(true);
      console.log(`Starting Period ${nextPeriod}.`);
    } else if (gameStatus === 'inProgress') {
      // Pause or resume the current period
      setIsTimerRunning(prev => !prev);
      console.log(isTimerRunning ? "Timer paused." : "Timer resumed.");
    } else if (gameStatus === 'gameEnd') {
      // Game has ended, do nothing or maybe allow reset?
      console.log("Game has ended. Cannot start/pause.");
    }
  };

  const handleResetTimer = () => {
    // Reset the entire game state related to time and periods
    setTimeElapsedInSeconds(0);
    setIsTimerRunning(false);
    setSubIntervalMinutes(5); // Reset sub interval to default
    setNextSubDueTimeSeconds(5 * 60); // Reset based on default interval
    setSubAlertLevel('none');
    setLastSubConfirmationTimeSeconds(0);
    setCompletedIntervalDurations([]); // Correctly reset here
    setCurrentPeriod(1);
    setGameStatus('notStarted'); // Reset game status
    // We don't save to history here, as this is a full reset, often preceding a new game setup
    console.log("Timer and game progress reset.");
  };

  const handleSubstitutionMade = () => {
    const duration = timeElapsedInSeconds - lastSubConfirmationTimeSeconds;
    const currentElapsedTime = timeElapsedInSeconds; // Capture current time *before* state updates
    const currentIntervalMins = subIntervalMinutes; // Capture interval
    const currentPeriodNumber = currentPeriod; // Capture current period

    // Create the log entry
    const newIntervalLog: IntervalLog = {
      period: currentPeriodNumber,
      duration: duration,
      timestamp: currentElapsedTime
    };
    
    // Update non-alert states immediately
    setCompletedIntervalDurations(prev => [newIntervalLog, ...prev]); // Add the new log object
    setLastSubConfirmationTimeSeconds(currentElapsedTime);
    
    // Calculate the next due time based on the previous one
    let newDueTime = 0;
    setNextSubDueTimeSeconds(prevDueTime => { 
        newDueTime = prevDueTime + currentIntervalMins * 60;
        return newDueTime;
    });

    // Delay the subAlertLevel update slightly
    setTimeout(() => {
        const newWarningTime = newDueTime - 60;
        let newAlertLevel: 'none' | 'warning' | 'due' = 'none';
        if (currentElapsedTime >= newDueTime) { 
            newAlertLevel = 'due'; 
        } else if (newWarningTime >= 0 && currentElapsedTime >= newWarningTime) {
            newAlertLevel = 'warning';
        }
        setSubAlertLevel(newAlertLevel); // Set the calculated level after the delay
        console.log(`Sub alert level updated after delay: ${newAlertLevel}`);
    }, 50); // Short delay (e.g., 50ms)
    
    console.log(`Sub made at ${currentElapsedTime}s. Duration: ${duration}s. Next due: ${newDueTime}s. (Alert update delayed)`);
  };

  const handleSetSubInterval = (minutes: number) => {
    const newMinutes = Math.max(1, minutes);
    setSubIntervalMinutes(newMinutes);
    // Save the new interval to history
    saveStateToHistory({ subIntervalMinutes: newMinutes });

    let currentElapsedTime = 0;
    setTimeElapsedInSeconds(prev => { 
        currentElapsedTime = prev;
        return prev;
    });

    const newIntervalSec = newMinutes * 60;
    let newDueTime = Math.ceil((currentElapsedTime + 1) / newIntervalSec) * newIntervalSec;
    if (newDueTime <= currentElapsedTime) {
      newDueTime += newIntervalSec;
    }
    if (newDueTime === 0) newDueTime = newIntervalSec; 
    
    setNextSubDueTimeSeconds(newDueTime);

    // Re-evaluate alert status immediately, considering the interval length
    const warningTime = newDueTime - 60;
    let newAlertLevel: 'none' | 'warning' | 'due' = 'none';
    if (currentElapsedTime >= newDueTime) {
        newAlertLevel = 'due';
    } else if (warningTime >= 0 && currentElapsedTime >= warningTime) {
        // Show warning if warning time is valid (>= 0) and current time reached it
        newAlertLevel = 'warning';
    }
    setSubAlertLevel(newAlertLevel);

    console.log(`Interval set to ${newMinutes}m. Current time: ${currentElapsedTime}s. Next due: ${newDueTime}s. New Alert: ${newAlertLevel}`);
  };

  const handleToggleLargeTimerOverlay = () => {
    setShowLargeTimerOverlay(!showLargeTimerOverlay);
  };

  const handleToggleInstructions = () => {
    setIsInstructionsOpen(!isInstructionsOpen);
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
    const scorer = availablePlayers.find(p => p.id === scorerId);
    const assister = assisterId ? availablePlayers.find(p => p.id === assisterId) : undefined; // Keep finding assister object if ID provided

    if (!scorer) {
      console.error("Scorer not found!");
      return;
    }

    const newEvent: GameEvent = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // Simple unique ID
      type: 'goal',
      time: timeElapsedInSeconds,
      scorerId: scorer.id, // Store only ID
      assisterId: assister?.id, // Store only ID if exists
    };

    const newGameEvents = [...gameEvents, newEvent];
    // const newHomeScore = homeScore + 1; // Increment home score when logging a goal -- OLD LOGIC
    let newHomeScore = homeScore;
    let newAwayScore = awayScore;

    if (homeOrAway === 'home') {
      newHomeScore += 1;
    } else {
      newAwayScore += 1;
    }
    
    setGameEvents(newGameEvents);
    // setHomeScore(newHomeScore); // Update the home score -- OLD LOGIC
    setHomeScore(newHomeScore);
    setAwayScore(newAwayScore);
    // REMOVED: Force new reference for availablePlayers state as well
    // setAvailablePlayers(prev => [...prev]); 
    saveStateToHistory({ 
      gameEvents: newGameEvents,
      // homeScore: newHomeScore // Include updated score in history -- OLD LOGIC
      homeScore: newHomeScore,
      awayScore: newAwayScore
    });
    setIsGoalLogModalOpen(false); // Close modal after logging
  };

  // NEW Handler to log an opponent goal
  const handleLogOpponentGoal = (time: number) => {
    console.log(`Logging opponent goal at time: ${time}`);
    const newEvent: GameEvent = {
      id: `oppGoal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      type: 'opponentGoal', // Use a distinct type
      time: time,
      // Assign placeholder/generic identifiers for opponent
      scorerId: 'opponent', 
      // No assister for opponent goals in this model
    };

    const newGameEvents = [...gameEvents, newEvent];
    // const newAwayScore = awayScore + 1; -- OLD LOGIC
    let newHomeScore = homeScore;
    let newAwayScore = awayScore;

    if (homeOrAway === 'home') {
      newAwayScore += 1;
    } else {
      newHomeScore += 1;
    }

    setGameEvents(newGameEvents);
    // setAwayScore(newAwayScore); -- OLD LOGIC
    setHomeScore(newHomeScore);
    setAwayScore(newAwayScore);
    // REMOVED: Force new reference for availablePlayers state as well
    // setAvailablePlayers(prev => [...prev]);
    saveStateToHistory({ 
      gameEvents: newGameEvents, 
      // awayScore: newAwayScore -- OLD LOGIC
      homeScore: newHomeScore,
      awayScore: newAwayScore 
    });
    setIsGoalLogModalOpen(false); // Close modal after logging
  };

  // Handler to update an existing game event
  const handleUpdateGameEvent = (updatedEvent: GameEvent) => {
    const eventIndex = gameEvents.findIndex(e => e.id === updatedEvent.id);
    if (eventIndex === -1) {
      console.error("Event to update not found:", updatedEvent.id);
      return;
    }

    // Ensure the updatedEvent doesn't contain the old name fields if passed in
    const cleanUpdatedEvent: GameEvent = {
      id: updatedEvent.id,
      type: updatedEvent.type,
      time: updatedEvent.time,
      scorerId: updatedEvent.scorerId,
      assisterId: updatedEvent.assisterId,
    };

    // Create a new array with the updated event
    const newGameEvents = [
      ...gameEvents.slice(0, eventIndex),
      cleanUpdatedEvent, // Use the cleaned event
      ...gameEvents.slice(eventIndex + 1)
    ];

    setGameEvents(newGameEvents); // Update state directly first
    saveStateToHistory({ gameEvents: newGameEvents }); // Save the updated events array to history
    console.log("Updated game event:", updatedEvent.id);
  };

  // Handler to delete a game event
  const handleDeleteGameEvent = (goalId: string) => {
    console.log(`Attempting to delete game event: ${goalId}`);
    const eventIndex = gameEvents.findIndex(e => e.id === goalId);
    if (eventIndex === -1) {
      console.error("Event to delete not found:", goalId);
      return;
    }

    // Determine if the event was a home goal or away goal to adjust score
    const eventToDelete = gameEvents[eventIndex];
    let newHomeScore = homeScore;
    let newAwayScore = awayScore;
    if (eventToDelete.type === 'goal') {
        // newHomeScore = Math.max(0, homeScore - 1); // Decrement home score -- OLD LOGIC
        if (homeOrAway === 'home') {
          newHomeScore = Math.max(0, homeScore - 1);
        } else {
          newAwayScore = Math.max(0, awayScore - 1);
        }
    } else if (eventToDelete.type === 'opponentGoal') {
        // newAwayScore = Math.max(0, awayScore - 1); // Decrement away score -- OLD LOGIC
        if (homeOrAway === 'home') {
          newAwayScore = Math.max(0, awayScore - 1);
        } else {
          newHomeScore = Math.max(0, homeScore - 1);
        }
    }

    // Create a new array excluding the deleted event
    const newGameEvents = [
      ...gameEvents.slice(0, eventIndex),
      ...gameEvents.slice(eventIndex + 1)
    ];

    setGameEvents(newGameEvents);
    // Update scores if they changed
    if (newHomeScore !== homeScore) setHomeScore(newHomeScore);
    if (newAwayScore !== awayScore) setAwayScore(newAwayScore);

    // Save the state change to history
    saveStateToHistory({ 
        gameEvents: newGameEvents, 
        homeScore: newHomeScore, 
        awayScore: newAwayScore 
    }); 
    console.log("Deleted game event and updated state/history:", goalId);
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
    setIsGameStatsModalOpen(!isGameStatsModalOpen);
  };

  // Placeholder handlers for updating game info (will be passed to modal)
  const handleOpponentNameChange = (newName: string) => {
    console.log('[page.tsx] handleOpponentNameChange called with:', newName); // <<< ADD LOG
    setOpponentName(newName);
    saveStateToHistory({ opponentName: newName });
  };
  const handleGameDateChange = (newDate: string) => {
    setGameDate(newDate);
    saveStateToHistory({ gameDate: newDate });
  };
  const handleHomeScoreChange = (newScore: number) => {
    setHomeScore(newScore);
    saveStateToHistory({ homeScore: newScore });
  };
  const handleAwayScoreChange = (newScore: number) => {
    setAwayScore(newScore);
    saveStateToHistory({ awayScore: newScore });
  };
  const handleGameNotesChange = (notes: string) => {
    setGameNotes(notes);
    saveStateToHistory({ gameNotes: notes });
  };

  // --- Handlers for Game Structure ---
  const handleSetNumberOfPeriods = (periods: number) => { 
    // Keep the check inside
    if (periods === 1 || periods === 2) {
      // Keep the type assertion for the state setter
      const validPeriods = periods as (1 | 2); 
      setNumberOfPeriods(validPeriods);
      saveStateToHistory({ numberOfPeriods: validPeriods });
      console.log(`Number of periods set to: ${validPeriods}`);
    } else {
      console.warn(`Invalid number of periods attempted: ${periods}. Must be 1 or 2.`);
    }
  };

  const handleSetPeriodDuration = (minutes: number) => {
    const newMinutes = Math.max(1, minutes);
    setPeriodDurationMinutes(newMinutes);
    saveStateToHistory({ periodDurationMinutes: newMinutes }); // Save immediately
    console.log(`Period duration set to: ${newMinutes} minutes.`);
    
  };

  // Training Resources Modal
  const handleToggleTrainingResources = () => {
    setIsTrainingResourcesOpen(!isTrainingResourcesOpen);
  };

  // NEW: Handler for Hard Reset
  const handleHardResetApp = useCallback(async () => {
    if (window.confirm(t('controlBar.hardResetConfirmation') ?? "Are you sure you want to completely reset the application? All saved data (players, stats, positions) will be permanently lost.")) {
      try {
        console.log("Performing hard reset using utility...");
        await utilResetAppSettings(); // Use utility function
        // The following season/tournament keys are not part of gamePersistence, handle separately if needed or move them to gamePersistence.
        // localStorage.removeItem(SEASONS_LIST_KEY); 
        // localStorage.removeItem(TOURNAMENTS_LIST_KEY);
        window.location.reload();
      } catch (error) {
        console.error("Error during hard reset:", error);
        alert("Failed to reset application data.");
      }
    }
  }, [t]); // Add t to dependency array

  // --- NEW: Handler to Reset Only Current Game Stats/Timer ---
  
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

  // Function to handle the actual saving
  const handleSaveGame = async (gameName: string) => {
    console.log(`Attempting to save game: '${gameName}'`);
    // Manual loading and error state setting is now handled by the useMutation hook.

    let idToSave: string;
    // Determine if overwriting the game that is currently loaded and IS NOT the default placeholder ID.
    const isOverwritingExistingLoadedGame = currentGameId && currentGameId !== DEFAULT_GAME_ID;

    if (isOverwritingExistingLoadedGame) {
      idToSave = currentGameId; // Use the ID of the currently loaded game for overwriting.
      console.log(`Overwriting existing game with ID: ${idToSave}`);
    } else {
      // This is a new save (either "Save As" for a loaded game, or saving an unsaved DEFAULT_GAME_ID game).
      idToSave = `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      console.log(`Saving as new game with ID: ${idToSave}`);
    }

    const currentSnapshot: AppState = {
      playersOnField,
      opponents,
      drawings,
      availablePlayers: availablePlayers, // Snapshot of the roster at the time of save
      showPlayerNames,
      teamName,
      gameEvents,
      opponentName: opponentName, 
      gameDate: gameDate,
      homeScore,
      awayScore,
      gameNotes,
      numberOfPeriods,
      periodDurationMinutes,
      currentPeriod,
      gameStatus,
      selectedPlayerIds, 
      seasonId,
      tournamentId,
      gameLocation, 
      gameTime, 
      subIntervalMinutes,
      completedIntervalDurations,
      lastSubConfirmationTimeSeconds,
      homeOrAway,
    };

    // Call the mutation
    saveGameMutation.mutate({
      gameName, // For error messages
      gameIdToSave: idToSave,
      snapshot: currentSnapshot,
      // isOverwrite: isOverwritingExistingLoadedGame // This can be inferred or handled in onSuccess/onError if needed by `variables`
    });
  };

  // Function to handle loading a selected game
  const handleLoadGame = async (gameId: string) => {
    console.log(`Loading game with ID: ${gameId}`);
    setGameLoadError(null);
    setIsGameLoading(true);
    setProcessingGameId(gameId);

    const stateToLoad = savedGames[gameId];

    if (stateToLoad) {
      try {
        // Apply the loaded state
        setPlayersOnField(stateToLoad.playersOnField);
        setOpponents(stateToLoad.opponents || []);
        setDrawings(stateToLoad.drawings || []);
        // REMOVED: setAvailablePlayers(stateToLoad.availablePlayers || []);
        setShowPlayerNames(stateToLoad.showPlayerNames);
        setTeamName(stateToLoad.teamName || initialState.teamName);
        setGameEvents(stateToLoad.gameEvents || []);
        setOpponentName(stateToLoad.opponentName || initialState.opponentName);
        setGameDate(stateToLoad.gameDate || initialState.gameDate);
        setHomeScore(stateToLoad.homeScore || 0);
        setAwayScore(stateToLoad.awayScore || 0);
        setGameNotes(stateToLoad.gameNotes || '');
        setNumberOfPeriods(stateToLoad.numberOfPeriods || 2);
        setPeriodDurationMinutes(stateToLoad.periodDurationMinutes || 10);
        setCurrentPeriod(stateToLoad.currentPeriod || 1);
        setGameStatus(stateToLoad.gameStatus || 'notStarted');
        setSelectedPlayerIds(stateToLoad.selectedPlayerIds || []);
        setSeasonId(stateToLoad.seasonId ?? '');
        setTournamentId(stateToLoad.tournamentId ?? '');
        setGameLocation(stateToLoad.gameLocation || '');
        setGameTime(stateToLoad.gameTime || '');
        // FIX: Add final default values
        setSubIntervalMinutes(stateToLoad.subIntervalMinutes ?? initialState.subIntervalMinutes ?? 5);
        setCompletedIntervalDurations(stateToLoad.completedIntervalDurations ?? initialState.completedIntervalDurations ?? []);
        setLastSubConfirmationTimeSeconds(stateToLoad.lastSubConfirmationTimeSeconds ?? initialState.lastSubConfirmationTimeSeconds ?? 0);
        // <<< ADD: Load home/away status (game load) >>>
        setHomeOrAway(stateToLoad.homeOrAway ?? initialState.homeOrAway);

        // Reset session-specific state
        setHistory([stateToLoad]);
        setHistoryIndex(0);
        setTimeElapsedInSeconds(0);
        setIsTimerRunning(false);
        setSubAlertLevel('none');

        // Update current game ID and save settings
        setCurrentGameId(gameId);
        await utilSaveCurrentGameIdSetting(gameId);

        console.log(`Game ${gameId} loaded successfully.`);
        handleCloseLoadGameModal();

      } catch(error) {
          console.error("Error applying loaded game state:", error);
          // alert("Error loading game state."); // Replaced by error state
          setGameLoadError(t('loadGameModal.errors.loadFailed', 'Error loading game state. Please try again.'));
      } finally {
        setIsGameLoading(false);
        setProcessingGameId(null);
      }
    } else {
      console.error(`Game state not found for ID: ${gameId}`);
      // alert(`Could not find saved game: ${gameId}`); // Replaced by error state
      setGameLoadError(t('loadGameModal.errors.notFound', 'Could not find saved game: {gameId}', { gameId }));
      setIsGameLoading(false); // Ensure loading is reset if game not found upfront
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
      const deletedGameId = await utilDeleteGame(gameId); // Assign return value

      if (deletedGameId) { // Check if deletion was successful (gameId returned)
        // Update local state for immediate UI responsiveness
        const updatedSavedGames = { ...savedGames };
        delete updatedSavedGames[deletedGameId]; // Use returned ID
        setSavedGames(updatedSavedGames);

        console.log(`Game ${deletedGameId} deleted from state and persistence.`);

        // If the deleted game was the currently loaded one, reset to initial state
        if (currentGameId === deletedGameId) { // Use returned ID
          console.log("Currently loaded game was deleted. Resetting to initial state.");
          
          // Apply initial state directly
          setPlayersOnField(initialState.playersOnField);
          setOpponents(initialState.opponents);
          setDrawings(initialState.drawings);
          // Also reset availablePlayers from useGameState if appropriate, or use masterRoster
          // setAvailablePlayers(initialState.availablePlayers); // This is from useGameState, consider if direct reset is needed or if it refetches
          setShowPlayerNames(initialState.showPlayerNames);
          setTeamName(initialState.teamName);
          setGameEvents(initialState.gameEvents);
          setOpponentName(initialState.opponentName);
          setGameDate(initialState.gameDate);
          setHomeScore(initialState.homeScore);
          setAwayScore(initialState.awayScore);
          setGameNotes(initialState.gameNotes);
          setNumberOfPeriods(initialState.numberOfPeriods);
          setPeriodDurationMinutes(initialState.periodDurationMinutes);
          setCurrentPeriod(initialState.currentPeriod);
          setGameStatus(initialState.gameStatus);
          setSelectedPlayerIds(initialState.selectedPlayerIds);
          setSeasonId(initialState.seasonId);
          setTournamentId(initialState.tournamentId);
          setGameLocation(initialState.gameLocation || '');
          setGameTime(initialState.gameTime || '');
          setSubIntervalMinutes(initialState.subIntervalMinutes ?? 5);
          setCompletedIntervalDurations(initialState.completedIntervalDurations ?? []);
          setLastSubConfirmationTimeSeconds(initialState.lastSubConfirmationTimeSeconds ?? 0);
          setHomeOrAway(initialState.homeOrAway);

          // Reset session-specific state
          setHistory([initialState]);
          setHistoryIndex(0);
          setTimeElapsedInSeconds(0);
          setIsTimerRunning(false);
          setSubAlertLevel('none');

          // Update current game ID to DEFAULT_GAME_ID
          setCurrentGameId(DEFAULT_GAME_ID);
          await utilSaveCurrentGameIdSetting(DEFAULT_GAME_ID);
        }
        // queryClient.invalidateQueries(['savedGames']); // Already handled by direct state update and if LoadGameModal re-renders
      } else {
        // utilDeleteGame returned null (e.g., game not found by the utility, and it didn't throw)
        console.warn(`handleDeleteGame: utilDeleteGame returned null for gameId: ${gameId}. Game might not have been found or ID was invalid.`);
        setGameDeleteError(t('loadGameModal.errors.deleteFailedNotFound', 'Error deleting game: {gameId}. Game not found or ID was invalid.', { gameId }));
      }
    } catch (error) {
      console.error("Error deleting game state:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setGameDeleteError(t('loadGameModal.errors.deleteFailedCatch', 'Error deleting saved game: {gameId}. Details: {errorMessage}', { gameId, errorMessage }));
    } finally {
      setIsGameDeleting(false);
      setProcessingGameId(null);
    }
  };

  // Function to export all saved games as a single JSON file (RENAMED & PARAMETERIZED)
  const handleExportAllGamesJson = () => {
    const gameIdsToExport = Object.keys(savedGames).filter(id => id !== DEFAULT_GAME_ID);

    if (gameIdsToExport.length === 0) {
        alert(t('loadGameModal.noGamesToExport', 'No saved games to export.'));
        return;
    }

    const gamesToExport = gameIdsToExport.reduce((acc, id) => {
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
    }, {} as SavedGamesCollection & { [key: string]: { seasonName?: string | null, tournamentName?: string | null } }); // Adjust type slightly

    try {
      const jsonString = JSON.stringify(gamesToExport, null, 2); // Export only filtered games
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      // Generate filename with timestamp and filter
      const now = new Date();
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
      // REMOVE unused filterName variable
      // const filterName = 'All';
      a.download = `SoccerApp_AllGames_${timestamp}.json`; 
      
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`All games exported successfully as JSON.`);
    } catch (error) {
      console.error(`Failed to export all games as JSON:`, error);
      alert(t('loadGameModal.exportAllJsonError', 'Error exporting games as JSON.')); // Generic error message
    }
  };

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
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Function to export all saved games as Excel/CSV (RENAMED & PARAMETERIZED)
  const handleExportAllGamesCsv = () => {
    const gameIdsToExport = Object.keys(savedGames).filter(id => id !== DEFAULT_GAME_ID);

    if (gameIdsToExport.length === 0) {
      alert(t('loadGameModal.noGamesToExport', 'No saved games to export.'));
      return;
    }
    console.log(`Starting CSV export for ${gameIdsToExport.length} games...`);

    try {
      const allRows: string[] = [];
      const EOL = '\r\n'; // Use CRLF for Excel compatibility
      const DELIMITER = ';'; // Use semicolon for better Excel compatibility

      gameIdsToExport.forEach((gameId, index) => {
        const game = savedGames[gameId];
        if (!game) return; // Skip if game data is missing

        // --- Game Separator ---
        if (index > 0) {
          allRows.push(''); // Add a blank separator row between games
        }
        allRows.push(`=== GAME START: ${escapeCsvField(gameId)} ===`);

        // --- Section: Game Info ---
        allRows.push('Game Info');
        allRows.push(`${escapeCsvField('Game Date:')}${DELIMITER}${escapeCsvField(game.gameDate)}`);
        allRows.push(`${escapeCsvField('Home Team:')}${DELIMITER}${escapeCsvField(game.teamName)}`);
        allRows.push(`${escapeCsvField('Away Team:')}${DELIMITER}${escapeCsvField(game.opponentName)}`);
        allRows.push(`${escapeCsvField('Home Score:')}${DELIMITER}${escapeCsvField(game.homeScore)}`);
        allRows.push(`${escapeCsvField('Away Score:')}${DELIMITER}${escapeCsvField(game.awayScore)}`);
        allRows.push(`${escapeCsvField('Location:')}${DELIMITER}${escapeCsvField(game.gameLocation)}`); // Added Location
        allRows.push(`${escapeCsvField('Time:')}${DELIMITER}${escapeCsvField(game.gameTime)}`);     // Added Time
        // --- ADD Season/Tournament Info --- 
        const seasonName = game.seasonId ? seasons.find(s => s.id === game.seasonId)?.name : '';
        const tournamentName = game.tournamentId ? tournaments.find(t => t.id === game.tournamentId)?.name : '';
        allRows.push(`${escapeCsvField('Season:')}${DELIMITER}${escapeCsvField(seasonName || (game.seasonId ? game.seasonId : 'None'))}`);
        allRows.push(`${escapeCsvField('Tournament:')}${DELIMITER}${escapeCsvField(tournamentName || (game.tournamentId ? game.tournamentId : 'None'))}`);
        allRows.push(''); // Blank separator row

        // --- Section: Game Settings ---
        allRows.push('Game Settings');
        allRows.push(`${escapeCsvField('Number of Periods:')}${DELIMITER}${escapeCsvField(game.numberOfPeriods)}`);
        allRows.push(`${escapeCsvField('Period Duration (min):')}${DELIMITER}${escapeCsvField(game.periodDurationMinutes)}`);
        allRows.push(`${escapeCsvField('Substitution Interval (min):')}${DELIMITER}${escapeCsvField(game.subIntervalMinutes ?? '?')} `); // Added Sub Interval
        allRows.push(''); // Blank separator row

        // --- Section: Substitution Intervals ---
        allRows.push('Substitution Intervals');
        allRows.push(`${escapeCsvField('Period')}${DELIMITER}${escapeCsvField('Duration (mm:ss)')}`);
        const intervals = game.completedIntervalDurations || [];
        if (intervals.length > 0) {
          // Sort intervals by timestamp (which reflects end time)
          intervals.sort((a, b) => a.timestamp - b.timestamp).forEach(log => {
            allRows.push(`${escapeCsvField(log.period)}${DELIMITER}${escapeCsvField(formatTime(log.duration))}`);
          });
        } else {
          allRows.push('No substitutions recorded');
        }
        allRows.push(''); // Blank separator row

        // --- Section: Player Stats ---
        allRows.push('Player Stats');
        // Add Fair Play column header
        allRows.push(`${escapeCsvField('Player')}${DELIMITER}${escapeCsvField('Goals')}${DELIMITER}${escapeCsvField('Assists')}${DELIMITER}${escapeCsvField('Points')}${DELIMITER}${escapeCsvField('Fair Play')}`);
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
                allRows.push(`${escapeCsvField(player.name)}${DELIMITER}${escapeCsvField(player.goals)}${DELIMITER}${escapeCsvField(player.assists)}${DELIMITER}${escapeCsvField(player.totalScore)}${DELIMITER}${escapeCsvField(player.fairPlay ? 'Yes' : 'No')}`);
            });
        } else {
            allRows.push('No player stats recorded');
        }
        allRows.push(''); // Blank separator row

        // --- Section: Event Log ---
        allRows.push('Event Log');
        allRows.push(`${escapeCsvField('Time')}${DELIMITER}${escapeCsvField('Type')}${DELIMITER}${escapeCsvField('Scorer')}${DELIMITER}${escapeCsvField('Assister')}`);
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
                allRows.push(`${escapeCsvField(timeFormatted)}${DELIMITER}${escapeCsvField(type)}${DELIMITER}${scorer}${DELIMITER}${assister}`);
            });
        } else {
            allRows.push('No goals logged');
        }
        allRows.push(''); // Blank separator row

        // --- Section: Notes ---
        allRows.push('Notes:');
        // Handle multi-line notes by enclosing in quotes if necessary
        allRows.push(escapeCsvField(game.gameNotes || '')); 
        
        // --- Game End Separator ---
        allRows.push(`=== GAME END: ${escapeCsvField(gameId)} ===`);
      });

      // --- Combine and Download ---
      const csvString = allRows.join(EOL);
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' }); // Specify charset
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      // Generate filename with timestamp
      const now = new Date();
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
      // REMOVE unused filterName variable
      // const filterName = 'All'; // Corrected filterName usage
      a.download = `SoccerApp_AllGames_${timestamp}.csv`; // Use .csv extension and filter name
      
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log(`All games exported successfully as CSV.`);

    } catch (error) {
      console.error(`Failed to export all games as CSV:`, error);
      alert(t('loadGameModal.exportAllExcelError', 'Error exporting games as CSV.'));
    }
  };

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
  }, [updatePlayerMutation, t]); // Added t for translations if used in error
  
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

  const handleRemovePlayerForModal = useCallback(async (playerId: string) => {
    console.log(`[Page.tsx] handleRemovePlayerForModal called for ID: ${playerId}`);
    setRosterError(null);
    setIsRosterUpdating(true);
    let newPlayersOnFieldState: Player[] = [];
    try {
      const success = await removePlayer(playerId);
      if (success) {
        const newRoster = await getMasterRoster();
        setAvailablePlayers(newRoster);
        
        setPlayersOnField(prev => {
          newPlayersOnFieldState = prev.filter(p => p.id !== playerId);
          return newPlayersOnFieldState;
        }); 
        
        const updatedSelectedIds = selectedPlayerIds.filter(id => id !== playerId);
        setSelectedPlayerIds(updatedSelectedIds);
        
        saveStateToHistory({ 
          playersOnField: newPlayersOnFieldState, // Use the computed new state
          selectedPlayerIds: updatedSelectedIds 
        });
        console.log(`[Page.tsx] Player ${playerId} removed from roster and field/selection.`);
      } else {
        console.error(`[Page.tsx] Failed to remove player ${playerId} (masterRosterManager.removePlayer returned false).`);
        setRosterError(`Error removing player. The operation may have failed.`);
      }
    } catch (error) {
      console.error(`[Page.tsx] Exception when removing player ${playerId}:`, error);
      setRosterError(`An unexpected error occurred while removing player. Please try again.`);
    } finally {
      setIsRosterUpdating(false);
    }
  }, [selectedPlayerIds, saveStateToHistory, setAvailablePlayers, setPlayersOnField, setSelectedPlayerIds, setIsRosterUpdating, setRosterError]);

  const handleAddPlayerForModal = useCallback(async (playerData: { name: string; jerseyNumber: string; notes: string; nickname: string }) => {
    console.log('[Page.tsx] handleAddPlayerForModal called with:', playerData);
    setRosterError(null); // Clear previous errors
    setIsRosterUpdating(true);
    try {
      const newPlayer = await addPlayer({ 
        name: playerData.name, 
        jerseyNumber: playerData.jerseyNumber, 
        notes: playerData.notes,
        nickname: playerData.nickname,
      }); 
      if (newPlayer) {
        console.log('[Page.tsx] Player added by masterRosterManager:', newPlayer);
        const updatedRoster = await getMasterRoster();
        setAvailablePlayers(updatedRoster);
        const updatedSelectedIds = [...selectedPlayerIds, newPlayer.id];
        setSelectedPlayerIds(updatedSelectedIds);
        saveStateToHistory({ selectedPlayerIds: updatedSelectedIds });
        console.log(`[Page.tsx] Added new player to roster and selection: ${newPlayer.name} (ID: ${newPlayer.id})`);
        // Optionally, close modal on success, or let the modal handle it
      } else {
        console.error(`[Page.tsx] Failed to add player ${playerData.name} (masterRosterManager.addPlayer returned null).`);
        setRosterError(`Error adding player ${playerData.name}. The operation may have failed.`);
        // alert() is removed, error state will be used by modal
      }
    } catch (error) {
      console.error(`[Page.tsx] Exception when adding player ${playerData.name}:`, error);
      setRosterError(`An unexpected error occurred while adding player ${playerData.name}. Please try again.`);
      // alert() is removed
    } finally {
      setIsRosterUpdating(false);
    }
  }, [selectedPlayerIds, saveStateToHistory, setAvailablePlayers, setSelectedPlayerIds, setIsRosterUpdating, setRosterError]);

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
  }, [availablePlayers, setGoalieStatusMutation, t]); // Added t and setGoalieStatusMutation, removed others

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
  const handleTogglePlayerSelection = useCallback((playerId: string) => {
    const currentIndex = selectedPlayerIds.indexOf(playerId);
    let newSelectedIds: string[];

    if (currentIndex === -1) {
      // Add player to selection
      newSelectedIds = [...selectedPlayerIds, playerId];
    } else {
      // Remove player from selection
      newSelectedIds = selectedPlayerIds.filter(id => id !== playerId);
    }

    setSelectedPlayerIds(newSelectedIds);
    saveStateToHistory({ selectedPlayerIds: newSelectedIds }); // Save selection to history
    console.log(`Updated selected players: ${newSelectedIds.length} players`);
  }, [selectedPlayerIds, saveStateToHistory]); // Dependencies

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
          availablePlayers, // <<< ADD BACK: Include roster available *at time of save*
          showPlayerNames,
          teamName,
          gameEvents,
          opponentName,
          gameDate,
          homeScore,
          awayScore,
          gameNotes,
          numberOfPeriods,
          periodDurationMinutes,
          currentPeriod,
          gameStatus,
          selectedPlayerIds,
          seasonId,
          tournamentId,
          gameLocation,
          gameTime,
          // Add timer related state
          subIntervalMinutes,
          completedIntervalDurations,
          lastSubConfirmationTimeSeconds,
          homeOrAway,
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
  }, [
    currentGameId,
    savedGames,
    playersOnField,
    opponents,
    drawings,
    availablePlayers,
    showPlayerNames,
    teamName,
    gameEvents,
    opponentName,
    gameDate,
    homeScore,
    awayScore,
    gameNotes,
    numberOfPeriods,
    periodDurationMinutes,
    currentPeriod,
    gameStatus,
    selectedPlayerIds,
    seasonId,
    tournamentId,
    gameLocation,
    gameTime,
    setSavedGames,
    setHistory,
    setHistoryIndex,
    handleOpenSaveGameModal, // Keep dependency: used in else block
    subIntervalMinutes,
    completedIntervalDurations,
    lastSubConfirmationTimeSeconds,
    homeOrAway
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
    // REVERT to original
    setGameLocation(location);
    saveStateToHistory({ gameLocation: location });
  };
  const handleGameTimeChange = (time: string) => {
    // REVERT to original
    setGameTime(time);
    saveStateToHistory({ gameTime: time });
  };

  // Add handler for home/away status
  const handleSetHomeOrAway = (status: 'home' | 'away') => {
    setHomeOrAway(status);
    saveStateToHistory({ homeOrAway: status });
  };

  // --- NEW Handlers for Setting Season/Tournament ID ---
  const handleSetSeasonId = useCallback((newSeasonId: string | null) => {
    const idToSet = newSeasonId || ''; // Ensure empty string instead of null
    console.log('[page.tsx] handleSetSeasonId called with:', idToSet);
    setSeasonId(idToSet);
    // --- Re-enable clearing other ID --- 
    if (idToSet) setTournamentId('');
    // -----------------------------------
    saveStateToHistory({ seasonId: idToSet, tournamentId: idToSet ? '' : tournamentId }); // <<< RE-ENABLE HISTORY
  }, [setSeasonId, setTournamentId, saveStateToHistory, tournamentId]); // <<< Update dependencies

  const handleSetTournamentId = useCallback((newTournamentId: string | null) => {
    const idToSet = newTournamentId || ''; // Ensure empty string instead of null
    console.log('[page.tsx] handleSetTournamentId called with:', idToSet);
    setTournamentId(idToSet);
    // --- Re-enable clearing other ID --- 
    if (idToSet) setSeasonId('');
    // -----------------------------------
    saveStateToHistory({ tournamentId: idToSet, seasonId: idToSet ? '' : seasonId }); // <<< RE-ENABLE HISTORY
  }, [setTournamentId, setSeasonId, saveStateToHistory, seasonId]); // <<< Update dependencies

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
  }, [savedGames, t, seasons, tournaments]); // REMOVED: seasons, tournaments

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
  }, [savedGames, t]); // Correctly removed seasons and tournaments

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
      console.log('[handleStartNewGameWithSetup] Received Params:', { numPeriods, periodDuration });
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
          // Timer/Sub State - Use TOP-LEVEL initialState defaults (or current settings?)
          // Let's stick with initialState defaults for timer/sub settings for now
          subIntervalMinutes: initialState.subIntervalMinutes ?? 5,
          completedIntervalDurations: [], // Always reset intervals
          lastSubConfirmationTimeSeconds: 0, // Always reset last sub time
      };

      // Log the constructed state *before* saving
      console.log('[handleStartNewGameWithSetup] Constructed newGameState:', {
          periods: newGameState.numberOfPeriods,
          duration: newGameState.periodDurationMinutes,
          // REMOVED: numAvailablePlayers: newGameState.availablePlayers.length // Log roster size
      });

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
    setPlayerIdsForNewGame(selectedPlayerIds); // Use the current selection
    setIsNewGameSetupModalOpen(true); // Open setup modal (moved here for save & continue path)

  }, [t, currentGameId, savedGames, /* handleOpenSaveGameModal, */ handleQuickSaveGame, setIsNewGameSetupModalOpen, 
      // <<< ADD dependencies >>>
      availablePlayers, selectedPlayerIds, setPlayerIdsForNewGame
     ]); 
  // --- END Start New Game Handler ---

  // New handler to place all selected players on the field at once
  const handlePlaceAllPlayers = useCallback(() => {
    // Get the list of selected players who are not yet on the field
    const selectedButNotOnField = selectedPlayerIds.filter(id => 
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
  }, [playersOnField, selectedPlayerIds, availablePlayers, saveStateToHistory, setPlayersOnField]);

  // --- END Quick Save Handler ---

  // --- Step 3: Handler for Importing Games ---
  const handleImportGamesFromJson = useCallback(async (jsonContent: string) => {
    console.log("handleImportGamesFromJson called.");
    setGamesImportError(null);
    setIsGamesImporting(true);

    let importedGames: SavedGamesCollection = {};
    let skippedCount = 0;
    let importedCount = 0;
    const newGamesToImport: SavedGamesCollection = {}; // Renamed to avoid conflict

    try {
      importedGames = JSON.parse(jsonContent);
      
      if (typeof importedGames !== 'object' || importedGames === null || Array.isArray(importedGames)) {
        throw new Error("Invalid format: Imported data is not a valid game collection object.");
      }

      console.log(`Parsed ${Object.keys(importedGames).length} games from JSON.`);

      for (const gameId in importedGames) {
        if (Object.prototype.hasOwnProperty.call(importedGames, gameId)) {
          const gameData = importedGames[gameId];
          if (typeof gameData !== 'object' || gameData === null || !gameData.teamName || !gameData.gameDate) {
             console.warn(`Skipping game ${gameId} due to invalid/missing core properties.`);
             skippedCount++;
             continue; 
          }

          if (savedGames[gameId]) {
            console.log(`Skipping import for existing game ID: ${gameId}`);
            skippedCount++;
          } else {
            console.log(`Marking new game for import: ${gameId}`);
            newGamesToImport[gameId] = gameData;
            importedCount++;
          }
        }
      }

      if (importedCount > 0) {
        console.log(`Adding ${importedCount} new games to state and localStorage using saveAllGames.`);
        const updatedSavedGamesCollection = { ...savedGames, ...newGamesToImport };
        await utilSaveAllGames(updatedSavedGamesCollection); // Use utility function to save all merged games
        setSavedGames(updatedSavedGamesCollection); // Also update local state for immediate UI responsiveness
        alert(t('loadGameModal.importSuccess', 
                  `Successfully imported ${importedCount} game(s). Skipped ${skippedCount} game(s) with existing IDs.`)
              ?.replace('{importedCount}', String(importedCount))
              ?.replace('{skippedCount}', String(skippedCount)) ?? `Imported: ${importedCount}, Skipped: ${skippedCount}`);
      } else if (skippedCount > 0) {
        alert(t('loadGameModal.importSkippedOnly', 
                   `Import complete. Skipped ${skippedCount} game(s) because they already exist.`)
                ?.replace('{skippedCount}', String(skippedCount)) ?? `Skipped all ${skippedCount} existing games.`);
      } else {
        alert(t('loadGameModal.importNoNewGames', 'No new games found in the file to import.'));
      }

    } catch (error) {
      console.error("Failed to import games:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      // alert(t('loadGameModal.importError', 'Import failed: {errorMessage}')
      //       ?.replace('{errorMessage}', errorMessage) ?? `Import failed: ${errorMessage}`);
      setGamesImportError(t('loadGameModal.importError', 'Import failed: {errorMessage}', { errorMessage }));
    } finally {
      setIsGamesImporting(false);
    }

  }, [savedGames, setSavedGames, t]); 
  // --- End Step 3 --- 

  // --- NEW: Handlers for Game Settings Modal --- (Placeholder open/close)

  // Render null or a loading indicator until state is loaded
  // Note: Console log added before the check itself
  if (!isLoaded) {
    // You might want a more sophisticated loading indicator
    console.log('Rendering Loading Indicator because !isLoaded');
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>;
  }

  // Final console log before returning the main JSX
  console.log('[Home Render] highlightRosterButton:', highlightRosterButton); // Log state on render

  // ATTEMPTING TO EXPLICITLY REMOVE THE CONDITIONAL HOOK
  // The useEffect for highlightRosterButton that was here (around lines 2977-2992)
  // should be removed as it's called conditionally and its correct version is at the top level.

  return (
    // Main container with flex column layout
    <div className="flex flex-col h-screen bg-gray-900 text-white relative">
      {/* REMOVED Fullscreen Toggle Button from here */}

      {/* Replace Suspense with a regular div */}
      <div className="flex flex-col h-full">
      {/* Top Player Bar - Filter players based on selection */}
      <PlayerBar
        players={playersForCurrentGame} // Pass the filtered list
        // <<< Remove teamName and onTeamNameChange props again >>>
        // teamName={teamName}
        // onTeamNameChange={handleTeamNameChange}
        // CORRECT prop name back to onPlayerDragStartFromBar
        onPlayerDragStartFromBar={handlePlayerDragStartFromBar}
        selectedPlayerIdFromBar={draggingPlayerFromBarInfo?.id} // Pass the selected ID
        onBarBackgroundClick={handleDeselectPlayer} // Pass deselect handler
        // REMOVE: onRenamePlayer prop
        // onRenamePlayer={handleRenamePlayer} 
        gameEvents={gameEvents} // Pass game events for badges
        onPlayerTapInBar={handlePlayerTapInBar} // Pass the new tap handler
        onToggleGoalie={handleToggleGoalieForModal} // Pass the handler from the hook
      />
      
      {/* <<< ADD the GameInfoBar here >>> */}
      <GameInfoBar 
        teamName={teamName}
        opponentName={opponentName}
        homeScore={homeScore}
        awayScore={awayScore}
        homeOrAway={homeOrAway} // Pass the prop
        // <<< REMOVE timeElapsedInSeconds prop >>>
        onTeamNameChange={handleTeamNameChange}
        onOpponentNameChange={handleOpponentNameChange}
      />

      {/* Opponent Bar (Optional) */}

      {/* Main content */}
      <main className="flex-1 relative overflow-hidden">
        {showLargeTimerOverlay && (
          <TimerOverlay 
              // Pass all required props as defined in TimerOverlayProps
              timeElapsedInSeconds={timeElapsedInSeconds} 
              subAlertLevel={subAlertLevel}
              onSubstitutionMade={handleSubstitutionMade} 
              completedIntervalDurations={completedIntervalDurations} // This line should now pass IntervalLog[]
              subIntervalMinutes={subIntervalMinutes}
              onSetSubInterval={handleSetSubInterval}
              isTimerRunning={isTimerRunning}
              onStartPauseTimer={handleStartPauseTimer}
              onResetTimer={handleResetTimer}
              onToggleGoalLogModal={handleToggleGoalLogModal}
              onRecordOpponentGoal={() => handleLogOpponentGoal(timeElapsedInSeconds)}
              // Game score props
              teamName={teamName}
              opponentName={opponentName}
              homeScore={homeScore}
              awayScore={awayScore}
              homeOrAway={homeOrAway} // Pass prop
              // Last substitution time
              lastSubTime={lastSubConfirmationTimeSeconds}
              // Game Structure props & handlers
              numberOfPeriods={numberOfPeriods}
              periodDurationMinutes={periodDurationMinutes}
              currentPeriod={currentPeriod}
              gameStatus={gameStatus}
              onOpponentNameChange={handleOpponentNameChange}
          />
        )}
        <SoccerField
          players={playersOnField}
          opponents={opponents}
          drawings={drawings}
          showPlayerNames={showPlayerNames}
          onPlayerDrop={handleDropOnField}
          onPlayerMove={handlePlayerMove}
          onPlayerMoveEnd={handlePlayerMoveEnd}
          onDrawingStart={handleDrawingStart}
          onDrawingAddPoint={handleDrawingAddPoint}
          onDrawingEnd={handleDrawingEnd}
          onPlayerRemove={handlePlayerRemove} // Pass the newly added handler
          onOpponentMove={handleOpponentMove}
          onOpponentMoveEnd={handleOpponentMoveEnd}
          onOpponentRemove={handleOpponentRemove}
          draggingPlayerFromBarInfo={draggingPlayerFromBarInfo}
          onPlayerDropViaTouch={handlePlayerDropViaTouch}
          onPlayerDragCancelViaTouch={handlePlayerDragCancelViaTouch}
          // ADD timeElapsedInSeconds prop
          timeElapsedInSeconds={timeElapsedInSeconds}
        />
      </main>

      {/* Control Bar */}
      <ControlBar
        onAddOpponent={handleAddOpponent} // Pass handler from hook
        onClearDrawings={handleClearDrawings} // Correctly passed here
        onToggleNames={handleTogglePlayerNames} 
        showPlayerNames={showPlayerNames} 
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onResetField={handleResetField} 
        // Remove the timeElapsedInSeconds prop
        showLargeTimerOverlay={showLargeTimerOverlay}
        onToggleLargeTimerOverlay={handleToggleLargeTimerOverlay}
        onToggleTrainingResources={handleToggleTrainingResources}
        // REMOVE Unused Props
        // isFullscreen={isFullscreen}
        // onToggleFullScreen={toggleFullScreen}
        onToggleGoalLogModal={handleToggleGoalLogModal}
        onToggleGameStatsModal={handleToggleGameStatsModal}
        onHardResetApp={handleHardResetApp}
        onOpenLoadGameModal={handleOpenLoadGameModal}
        onStartNewGame={handleStartNewGame}
        onOpenRosterModal={openRosterModal} // Pass the handler
        onQuickSave={handleQuickSaveGame} // Pass the quick save handler
        // ADD props for Game Settings button
        onOpenGameSettingsModal={handleOpenGameSettingsModal}
        isGameLoaded={!!(currentGameId && currentGameId !== DEFAULT_GAME_ID)} // <-- CHECK FOR VALID GAME ID
        onPlaceAllPlayers={handlePlaceAllPlayers} // New prop for placing all players
        highlightRosterButton={highlightRosterButton} // <<< PASS THE HIGHLIGHT PROP
      />
        {/* Instructions Modal */}
        <InstructionsModal 
          isOpen={isInstructionsOpen} 
          onClose={handleToggleInstructions}
        />
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
          availablePlayers={availablePlayers}
          currentTime={timeElapsedInSeconds}
        />
        {/* Game Stats Modal - Restore props for now */}
        <GameStatsModal
          isOpen={isGameStatsModalOpen}
          onClose={handleToggleGameStatsModal}
          teamName={teamName}
          opponentName={opponentName}
          gameDate={gameDate}
          gameLocation={gameLocation}
          gameTime={gameTime}
          gameNotes={gameNotes}
          homeScore={homeScore}
          awayScore={awayScore}
          homeOrAway={homeOrAway} // Pass the prop
          availablePlayers={availablePlayers}
          gameEvents={gameEvents}
          onOpponentNameChange={handleOpponentNameChange}
          onGameDateChange={handleGameDateChange}
          onHomeScoreChange={handleHomeScoreChange}
          onAwayScoreChange={handleAwayScoreChange}
          onGameNotesChange={handleGameNotesChange}
          onUpdateGameEvent={handleUpdateGameEvent}
          onDeleteGameEvent={handleDeleteGameEvent}
          selectedPlayerIds={selectedPlayerIds}
          savedGames={savedGames}
          currentGameId={currentGameId}
          seasonId={seasonId}
          tournamentId={tournamentId}
          onExportOneJson={handleExportOneJson}
          onExportOneCsv={handleExportOneCsv}
          // ADD Aggregate export handlers
          onExportAggregateJson={handleExportAggregateJson}
          onExportAggregateCsv={handleExportAggregateCsv}
        />
        {/* Save Game Modal */}
        <SaveGameModal
          isOpen={isSaveGameModalOpen}
          onClose={handleCloseSaveGameModal}
          onSave={handleSaveGame} 
          teamName={teamName}
          opponentName={opponentName}
          gameDate={gameDate}
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
          onExportAllJson={handleExportAllGamesJson}
          onExportAllExcel={handleExportAllGamesCsv} // Pass renamed CSV handler
          onExportOneJson={handleExportOneJson}
          onExportOneCsv={handleExportOneCsv}
          onImportJson={handleImportGamesFromJson} // <-- Step 4: Pass the handler prop
          currentGameId={currentGameId || undefined} // Convert null to undefined
          // Pass loading and error state props for LoadGameModal
          isLoadingGamesList={isLoadingGamesList}
          loadGamesListError={loadGamesListError}
          isGameLoading={isGameLoading}
          gameLoadError={gameLoadError}
          isGameDeleting={isGameDeleting}
          gameDeleteError={gameDeleteError}
          isGamesImporting={isGamesImporting}
          gamesImportError={gamesImportError}
          processingGameId={processingGameId}
        />

        {/* Conditionally render the New Game Setup Modal */}
        {isNewGameSetupModalOpen && (
          <NewGameSetupModal
            isOpen={isNewGameSetupModalOpen}
            initialPlayerSelection={playerIdsForNewGame} // <<< Pass the state here
            onStart={handleStartNewGameWithSetup} // CORRECTED Handler
            onCancel={handleCancelNewGameSetup} 
          />
        )}

        {/* Roster Settings Modal */}
        <RosterSettingsModal
          isOpen={isRosterModalOpen}
          onClose={closeRosterModal}
          availablePlayers={availablePlayers} // Use availablePlayers from useGameState
          onRenamePlayer={handleRenamePlayerForModal}
          onToggleGoalie={handleToggleGoalieForModal}
          onSetJerseyNumber={handleSetJerseyNumberForModal}
          onSetPlayerNotes={handleSetPlayerNotesForModal}
          onRemovePlayer={handleRemovePlayerForModal} 
          onAddPlayer={handleAddPlayerForModal}
          selectedPlayerIds={selectedPlayerIds}
          onTogglePlayerSelection={handleTogglePlayerSelection}
          teamName={teamName}
          onTeamNameChange={handleTeamNameChange}
          // Pass loading and error states
          isRosterUpdating={isRosterUpdating}
          rosterError={rosterError}
        />

        {/* ADD the new Game Settings Modal - ADD missing props */}
        <GameSettingsModal
          isOpen={isGameSettingsModalOpen} // Corrected State Variable
          onClose={handleCloseGameSettingsModal}
          currentGameId={currentGameId}
          teamName={teamName}
          opponentName={opponentName}
          gameDate={gameDate}
          gameLocation={gameLocation}
          gameTime={gameTime}
          gameNotes={gameNotes}
          homeScore={homeScore}
          awayScore={awayScore}
          onOpponentNameChange={handleOpponentNameChange}
          onGameDateChange={handleGameDateChange}
          onGameLocationChange={handleGameLocationChange}
          onGameTimeChange={handleGameTimeChange}
          onGameNotesChange={handleGameNotesChange}
          onUpdateGameEvent={handleUpdateGameEvent}
          onAwardFairPlayCard={handleAwardFairPlayCard} // Pass the required handler
          onDeleteGameEvent={handleDeleteGameEvent}
          gameEvents={gameEvents}
          availablePlayers={availablePlayers}
          seasonId={seasonId}
          tournamentId={tournamentId}
          numPeriods={numberOfPeriods}
          periodDurationMinutes={periodDurationMinutes}
          onNumPeriodsChange={handleSetNumberOfPeriods}
          onPeriodDurationChange={handleSetPeriodDuration}
          // Pass the new handlers
          onSeasonIdChange={handleSetSeasonId}
          onTournamentIdChange={handleSetTournamentId}
          // <<< ADD: Pass Home/Away state and handler >>>
          homeOrAway={homeOrAway}
          onSetHomeOrAway={handleSetHomeOrAway}
        />

      </div>

      {/* <<< ADD Roster Prompt Toast >>> */}
      {/* <div 
        className={`
          fixed bottom-16 right-4 bg-indigo-600/90 backdrop-blur-sm text-white 
          rounded-lg shadow-lg p-3 transition-all duration-300 ease-in-out
          ${showRosterPrompt ? 'translate-y-0 opacity-100' : 'translate-y-12 opacity-0 pointer-events-none'}
          flex items-center gap-3 max-w-xs z-50
        `}
      >
        <div className="flex-1">
          <p className="text-sm font-medium">
            {t('rosterPrompt.message', 'Set up your roster now?')}
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <button 
            onClick={handleConfirmRosterPrompt} 
            className="px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs"
            title={t('rosterPrompt.confirmTooltip', 'Open Roster Settings') ?? undefined}
          >
            {t('rosterPrompt.confirm', 'Yes')}
          </button>
          <button 
            onClick={dismissRosterPrompt} 
            className="p-1 text-white/70 hover:text-white"
            title={t('rosterPrompt.dismissTooltip', 'Dismiss') ?? undefined}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div> */}

    </div>
  );
}
