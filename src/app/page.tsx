'use client';

import React, { useState, useEffect, useCallback, useMemo, useReducer } from 'react';
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
// Import async localStorage utilities
import { getLocalStorageItemAsync, setLocalStorageItemAsync, removeLocalStorageItemAsync } from '@/utils/localStorage';
// Import query keys
import { queryKeys } from '@/config/queryKeys';
// Also import addSeason and addTournament for the new mutations
import { addSeason as utilAddSeason } from '@/utils/seasons';
import { addTournament as utilAddTournament } from '@/utils/tournaments';

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
  // Timer related state to persist (NON-VOLATILE ONES)
  subIntervalMinutes?: number; // Add sub interval
  completedIntervalDurations?: IntervalLog[]; // Add completed interval logs
  lastSubConfirmationTimeSeconds?: number; // Add last substitution confirmation time
  // VOLATILE TIMER STATES REMOVED:
  // timeElapsedInSeconds?: number;
  // isTimerRunning?: boolean;
  // nextSubDueTimeSeconds?: number;
  // subAlertLevel?: 'none' | 'warning' | 'due';
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
  };

  const [gameSessionState, dispatchGameSession] = useReducer(gameSessionReducer, initialGameSessionData);

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
  // const [showPlayerNames, setShowPlayerNames] = useState<boolean>(initialState.showPlayerNames); // REMOVE - Migrated to gameSessionState
  // const [gameEvents, setGameEvents] = useState<GameEvent[]>(initialState.gameEvents); // REMOVE - Migrated to gameSessionState
  // const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(initialState.selectedPlayerIds); // REMOVE - Migrated to gameSessionState
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
  const [initialLoadComplete, setInitialLoadComplete] = useState<boolean>(false);
  const [hasSkippedInitialSetup, setHasSkippedInitialSetup] = useState<boolean>(false);
  const [isGameSettingsModalOpen, setIsGameSettingsModalOpen] = useState<boolean>(false); // <<< ADDED State Declaration

  // --- Timer State (Still needed here) ---
  const [showLargeTimerOverlay, setShowLargeTimerOverlay] = useState<boolean>(false); // State for overlay visibility
  
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

        // Add the new player to selectedPlayerIds and save to history
        // let nextSelectedPlayerIds: string[] = []; // REMOVE local variable
        // setSelectedPlayerIds(prev => { // REMOVE direct state update
        //   nextSelectedPlayerIds = [...prev, newPlayer.id];
        //   return nextSelectedPlayerIds;
        // });
        const newSelectedPlayerIds = [...gameSessionState.selectedPlayerIds, newPlayer.id];
        dispatchGameSession({ type: 'SET_SELECTED_PLAYER_IDS', payload: newSelectedPlayerIds });
        
        saveStateToHistory({ selectedPlayerIds: newSelectedPlayerIds }); // USE newSelectedPlayerIds

        setRosterError(null);
      } else {
        // This case might indicate a duplicate name or some other non-exception failure from addPlayer
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
    if (!gameSessionState.selectedPlayerIds || gameSessionState.selectedPlayerIds.length === 0) { // USE gameSessionState
        return availablePlayers; 
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

    if (gameSessionState.isTimerRunning && gameSessionState.gameStatus === 'inProgress') {
      intervalId = setInterval(() => {
        const currentTime = gameSessionState.timeElapsedInSeconds;
        const potentialNewTime = currentTime + 1;

        if (potentialNewTime >= periodEndTimeSeconds) {
          clearInterval(intervalId!); // Stop the interval
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
      if (intervalId) {
        clearInterval(intervalId);
      }
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [gameSessionState.isTimerRunning, gameSessionState.gameStatus, gameSessionState.currentPeriod, gameSessionState.periodDurationMinutes, gameSessionState.numberOfPeriods, gameSessionState.timeElapsedInSeconds, gameSessionState.nextSubDueTimeSeconds]); // Reflect isTimerRunning from gameSessionState

  // --- Load state from localStorage on mount (REVISED) ---
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

    // Dispatch action to reducer to handle loading game data
    // The reducer will set all fields in gameSessionState, including resetting volatile timer fields.
    if (gameData) {
      // Map GameData fields to GameSessionState partial payload
      const payload: Partial<GameSessionState> = {
        teamName: gameData.homeTeam,
        opponentName: gameData.awayTeam,
        gameDate: gameData.date,
        homeScore: gameData.homeScore,
        awayScore: gameData.awayScore,
        gameNotes: gameData.notes,
        homeOrAway: gameData.teamOnLeft,
        numberOfPeriods: gameData.numberOfPeriods,
        periodDurationMinutes: gameData.periodDuration,
        currentPeriod: gameData.currentPeriod,
        gameStatus: gameData.gameStatus,
        selectedPlayerIds: gameData.selectedPlayerIds,
        seasonId: gameData.seasonId ?? undefined, // Ensure undefined if null for reducer
        tournamentId: gameData.tournamentId ?? undefined, // Ensure undefined if null for reducer
        gameLocation: gameData.location,
        gameTime: gameData.time,
        gameEvents: gameData.events, // Assuming GameEvent in GameData matches GameEvent in GameSessionState
        subIntervalMinutes: gameData.subIntervalMinutes,
        completedIntervalDurations: gameData.completedIntervalDurations,
        lastSubConfirmationTimeSeconds: gameData.lastSubConfirmationTimeSeconds,
        showPlayerNames: gameData.showPlayerNames,
        // Volatile timer states (timeElapsedInSeconds, isTimerRunning, nextSubDueTimeSeconds, subAlertLevel)
        // are NOT taken from gameData. The reducer's LOAD_PERSISTED_GAME_DATA will initialize them.
      };
      dispatchGameSession({ type: 'LOAD_PERSISTED_GAME_DATA', payload });
    } else {
      // If no gameData, reset to initial state derived from page.tsx's initialState
      // The initialGameSessionData used by useReducer already reflects this.
      // We can dispatch a reset action that uses initialGameSessionData.
      dispatchGameSession({ type: 'RESET_TO_INITIAL_STATE', payload: initialGameSessionData });
    }

    // Update non-reducer states (these will eventually be migrated or handled differently)
    // For fields not yet in gameSessionState but are in GameData, update their local states if needed.
    // This part will shrink as more state moves to the reducer.
    setPlayersOnField(gameData?.playersOnField || (isInitialDefaultLoad ? initialState.playersOnField : []));
    setOpponents(gameData?.opponents || (isInitialDefaultLoad ? initialState.opponents : []));
    setDrawings(gameData?.drawings || (isInitialDefaultLoad ? initialState.drawings : []));
    
    // Update gameEvents from gameData if present, otherwise from initial state if it's an initial default load
    // setGameEvents(gameData?.events || (isInitialDefaultLoad ? initialState.gameEvents : [])); // REMOVE - Handled by LOAD_PERSISTED_GAME_DATA in reducer

    // Update selectedPlayerIds, seasonId, tournamentId, gameLocation, gameTime from gameData
    // These are also part of gameSessionState now, but local states might still be used by some components directly.
    // Prefer sourcing from gameSessionState once components are updated.
    // setSelectedPlayerIds(gameData?.selectedPlayerIds || (isInitialDefaultLoad ? initialState.selectedPlayerIds : [])); // REMOVE - Handled by LOAD_PERSISTED_GAME_DATA
    setSeasonId(gameData?.seasonId || (isInitialDefaultLoad ? initialState.seasonId : ''));
    setTournamentId(gameData?.tournamentId || (isInitialDefaultLoad ? initialState.tournamentId : ''));
    setGameLocation(gameData?.location || (isInitialDefaultLoad ? initialState.gameLocation : '') || '');
    setGameTime(gameData?.time || (isInitialDefaultLoad ? initialState.gameTime : '') || '');
    // setShowPlayerNames(gameData?.showPlayerNames === undefined ? (isInitialDefaultLoad ? initialState.showPlayerNames : true) : gameData.showPlayerNames); // REMOVE - Handled by LOAD_PERSISTED_GAME_DATA in reducer


    // History state should be based on the new gameSessionState + other states
    // For simplicity, we'll form history state AFTER the reducer has processed the load.
    // This requires a slight delay or a way to access the state post-dispatch if saveStateToHistory is called immediately.
    // For now, let's assume gameSessionState is updated for the next render cycle.
    // A more robust way would be to have LOAD_PERSISTED_GAME_DATA return the new state or use a useEffect.

    // Construct historyState using the *potentially* updated gameSessionState for the next render.
    // And combine with other non-reducer states.
    const newHistoryState: AppState = {
      // Persistable fields from gameSessionState
      teamName: gameData?.homeTeam ?? initialGameSessionData.teamName,
      opponentName: gameData?.awayTeam ?? initialGameSessionData.opponentName,
      gameDate: gameData?.date ?? initialGameSessionData.gameDate,
      homeScore: gameData?.homeScore ?? initialGameSessionData.homeScore,
      awayScore: gameData?.awayScore ?? initialGameSessionData.awayScore,
      gameNotes: gameData?.notes ?? initialGameSessionData.gameNotes,
      homeOrAway: gameData?.teamOnLeft ?? initialGameSessionData.homeOrAway,
      numberOfPeriods: gameData?.numberOfPeriods ?? initialGameSessionData.numberOfPeriods,
      periodDurationMinutes: gameData?.periodDuration ?? initialGameSessionData.periodDurationMinutes,
      currentPeriod: gameData?.currentPeriod ?? initialGameSessionData.currentPeriod, // Will be updated by reducer
      gameStatus: gameData?.gameStatus ?? initialGameSessionData.gameStatus, // Will be updated by reducer
      seasonId: gameData?.seasonId ?? initialGameSessionData.seasonId,
      tournamentId: gameData?.tournamentId ?? initialGameSessionData.tournamentId,
      gameLocation: gameData?.location ?? initialGameSessionData.gameLocation,
      gameTime: gameData?.time ?? initialGameSessionData.gameTime,
      subIntervalMinutes: gameData?.subIntervalMinutes ?? initialGameSessionData.subIntervalMinutes,
      completedIntervalDurations: gameData?.completedIntervalDurations ?? initialGameSessionData.completedIntervalDurations,
      lastSubConfirmationTimeSeconds: gameData?.lastSubConfirmationTimeSeconds ?? initialGameSessionData.lastSubConfirmationTimeSeconds,
      showPlayerNames: gameData?.showPlayerNames === undefined ? initialGameSessionData.showPlayerNames : gameData.showPlayerNames,
      selectedPlayerIds: gameData?.selectedPlayerIds ?? initialGameSessionData.selectedPlayerIds,
      gameEvents: gameData?.events ?? initialGameSessionData.gameEvents,

      // Non-reducer states
      playersOnField: gameData?.playersOnField || initialState.playersOnField,
      opponents: gameData?.opponents || initialState.opponents,
      drawings: gameData?.drawings || initialState.drawings,
      
      // availablePlayers for history snapshot. Use master roster.
      availablePlayers: masterRosterQueryResultData || availablePlayers,

      // Volatile fields NOT from gameData - should be default/reset values
      // These are not directly part of AppState for saving, but history might need them if it captured live state.
      // However, for loading a game, these should reflect a "freshly loaded" state.
      // The reducer handles resetting these in gameSessionState.
      // AppState definition itself needs to be clear about what it stores for history vs. saving.
      // For now, AppState matches GameData more closely in terms of what's *persisted*.
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
          seasonId: gameSessionState.seasonId,
          tournamentId: gameSessionState.tournamentId,
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
    } else if (isLoaded && currentGameId === DEFAULT_GAME_ID) {
      console.log("Not auto-saving as this is an unsaved game (no ID assigned yet)");
    }
    };
    autoSave();
    // Dependencies: Include all state variables that are part of the saved snapshot
  }, [isLoaded, currentGameId,
      playersOnField, opponents, drawings, availablePlayers, 
      // showPlayerNames, // REMOVED - Covered by gameSessionState
      // Local states that are part of the snapshot but not yet in gameSessionState:
      // gameEvents, // REMOVE - Now from gameSessionState
      gameSessionState,
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
    console.log('Toggling player names via reducer');
    // The new value will be the opposite of the current value in gameSessionState
    const newShowPlayerNames = !gameSessionState.showPlayerNames;
    dispatchGameSession({ type: 'TOGGLE_SHOW_PLAYER_NAMES' });
    // Save to history with the optimistically determined new value
    saveStateToHistory({ showPlayerNames: newShowPlayerNames }); 
  };

  // --- Team Name Handler ---
  const handleTeamNameChange = (newName: string) => {
    const trimmedName = newName.trim();
    if (trimmedName) {
        console.log("Updating team name to:", trimmedName);
        // Directly update state - REPLACED
        // setTeamName(trimmedName); 
        dispatchGameSession({ type: 'SET_TEAM_NAME', payload: trimmedName });
        // Also save to session history for undo/redo
        saveStateToHistory({ teamName: trimmedName }); // We will adjust saveStateToHistory later
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
          seasonId: prevState.seasonId, // Ensure seasonId is from prevState
          tournamentId: prevState.tournamentId, // Ensure tournamentId is from prevState
          gameLocation: prevState.gameLocation, // Ensure gameLocation is from prevState
          gameTime: prevState.gameTime // Ensure gameTime is from prevState
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
          seasonId: nextState.seasonId, // Ensure seasonId is from nextState
          tournamentId: nextState.tournamentId, // Ensure tournamentId is from nextState
          gameLocation: nextState.gameLocation, // Ensure gameLocation is from nextState
          gameTime: nextState.gameTime // Ensure gameTime is from nextState
        } 
      }); 
      dispatchGameSession({ type: 'SET_SUB_INTERVAL', payload: nextState.subIntervalMinutes ?? 5 }); 
      // setSelectedPlayerIds(nextState.selectedPlayerIds); // REMOVE - Handled by LOAD_STATE_FROM_HISTORY
      // setSeasonId(nextState.seasonId ?? ''); // REMOVE - Handled by LOAD_STATE_FROM_HISTORY
      // setTournamentId(nextState.tournamentId ?? ''); // REMOVE - Handled by LOAD_STATE_FROM_HISTORY
      // setGameLocation(nextState.gameLocation ?? ''); // REMOVE - Handled by LOAD_STATE_FROM_HISTORY
      // setGameTime(nextState.gameTime ?? ''); // REMOVE - Handled by LOAD_STATE_FROM_HISTORY
      dispatchGameSession({ type: 'SET_HOME_OR_AWAY', payload: nextState.homeOrAway });
      setHistoryIndex(nextStateIndex);
    } else {
      console.log("Cannot redo: at end of history");
    }
  };

  // --- Timer Handlers ---
  const handleStartPauseTimer = () => {
    if (gameSessionState.gameStatus === 'notStarted') {
      // Start the game (first period)
      dispatchGameSession({ 
        type: 'START_PERIOD', 
        payload: { 
          nextPeriod: 1, 
          periodDurationMinutes: gameSessionState.periodDurationMinutes, 
          subIntervalMinutes: gameSessionState.subIntervalMinutes // Use from gameSessionState
        } 
      });
      // setTimeElapsedInSeconds(0); // Handled by reducer
      // setCompletedIntervalDurations([]); // Handled by reducer's START_PERIOD for period 1
      // setLastSubConfirmationTimeSeconds(0); // Handled by reducer
      // setIsTimerRunning(true); // REMOVE - Handled by reducer's START_PERIOD
      console.log("Game started, Period 1.");
    } else if (gameSessionState.gameStatus === 'periodEnd') {
      // Start the next period
      const nextPeriod = gameSessionState.currentPeriod + 1;
      dispatchGameSession({ 
        type: 'START_PERIOD', 
        payload: { 
          nextPeriod: nextPeriod, 
          periodDurationMinutes: gameSessionState.periodDurationMinutes, 
          subIntervalMinutes: gameSessionState.subIntervalMinutes // Use from gameSessionState
        }
      });
      // setIsTimerRunning(true); // REMOVE - Handled by reducer's START_PERIOD
      console.log(`Starting Period ${nextPeriod}.`);
    } else if (gameSessionState.gameStatus === 'inProgress') {
      // Pause or resume the current period
      dispatchGameSession({ type: 'SET_TIMER_RUNNING', payload: !gameSessionState.isTimerRunning });
      console.log(gameSessionState.isTimerRunning ? "Timer paused." : "Timer resumed."); 
    } else if (gameSessionState.gameStatus === 'gameEnd') {
      // Game has ended, do nothing or maybe allow reset?
      console.log("Game has ended. Cannot start/pause.");
    }
  };

  const handleResetTimer = () => {
    // Reset the entire game state related to time and periods
    dispatchGameSession({ type: 'RESET_TIMER_AND_GAME_PROGRESS', payload: { subIntervalMinutes: gameSessionState.subIntervalMinutes } }); // Pass current subInterval
    // setTimeElapsedInSeconds(0); // Handled by RESET_TIMER_AND_GAME_PROGRESS
    // setIsTimerRunning(false); // Handled by RESET_TIMER_AND_GAME_PROGRESS
    // setSubIntervalMinutes(5); // This should be part of gameSessionState now, reducer handles reset or keeps current
    // setNextSubDueTimeSeconds(5 * 60); // Handled by reducer
    // setSubAlertLevel('none'); // Handled by reducer
    // setLastSubConfirmationTimeSeconds(0); // Handled by reducer
    // setCompletedIntervalDurations([]); // Handled by reducer
    console.log("Timer and game progress reset via reducer.");
  };

  const handleSubstitutionMade = () => {
    // Dispatch action to reducer
    dispatchGameSession({ type: 'CONFIRM_SUBSTITUTION' });
    console.log(`Substitution confirmed via reducer.`);
  };

  const handleSetSubInterval = (minutes: number) => {
    const newMinutes = Math.max(1, minutes);
    dispatchGameSession({ type: 'SET_SUB_INTERVAL', payload: newMinutes });
    saveStateToHistory({ subIntervalMinutes: newMinutes }); // Keep for history for now
    console.log(`Sub interval set to ${newMinutes}m via reducer.`);
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

    // Save to history. The gameEvents in gameSessionState will be updated by the dispatch.
    // So, when saveStateToHistory reads gameSessionState (if it's modified to do so, or if a useEffect saves history),
    // it will have the new event. For now, we pass the event as it was.
    // A more robust solution is needed for history if we want it to perfectly mirror the post-dispatch state.
    // We are assuming that history is primarily for undoing this specific action.
    saveStateToHistory({ 
      gameEvents: [...gameSessionState.gameEvents, newEvent], // Optimistically add new event
      homeScore: gameSessionState.homeOrAway === 'home' ? gameSessionState.homeScore + 1 : gameSessionState.homeScore,
      awayScore: gameSessionState.homeOrAway === 'away' ? gameSessionState.awayScore + 1 : gameSessionState.awayScore,
    });
    setIsGoalLogModalOpen(false);
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
    
    saveStateToHistory({ 
      gameEvents: [...gameSessionState.gameEvents, newEvent], // Optimistically add new event
      homeScore: gameSessionState.homeOrAway === 'away' ? gameSessionState.homeScore + 1 : gameSessionState.homeScore,
      awayScore: gameSessionState.homeOrAway === 'home' ? gameSessionState.awayScore + 1 : gameSessionState.awayScore,
    });
    setIsGoalLogModalOpen(false);
  };

  // Handler to update an existing game event
  const handleUpdateGameEvent = (updatedEvent: GameEvent) => {
    const cleanUpdatedEvent: GameEvent = { id: updatedEvent.id, type: updatedEvent.type, time: updatedEvent.time, scorerId: updatedEvent.scorerId, assisterId: updatedEvent.assisterId }; // Keep cleaning
    
    dispatchGameSession({ type: 'UPDATE_GAME_EVENT', payload: cleanUpdatedEvent });
    
    // For history, construct the new events array after the update
    const newGameEventsAfterUpdate = gameSessionState.gameEvents.map(e => 
      e.id === cleanUpdatedEvent.id ? cleanUpdatedEvent : e
    );
    saveStateToHistory({ gameEvents: newGameEventsAfterUpdate }); 
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
    
    // For history, save the state reflecting the deletion.
    const newGameEventsAfterDelete = gameSessionState.gameEvents.filter(e => e.id !== goalId);
    saveStateToHistory({ 
        gameEvents: newGameEventsAfterDelete, 
        // Scores will be updated by the reducer and reflected in gameSessionState.
        // The history snapshot for scores might need adjustment if it relies on immediate state post-dispatch.
    }); 
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
    setIsGameStatsModalOpen(!isGameStatsModalOpen);
  };

  // Placeholder handlers for updating game info (will be passed to modal)
  const handleOpponentNameChange = (newName: string) => {
    console.log('[page.tsx] handleOpponentNameChange called with:', newName);
    dispatchGameSession({ type: 'SET_OPPONENT_NAME', payload: newName });
    saveStateToHistory({ opponentName: newName }); // Stays for now
  };
  const handleGameDateChange = (newDate: string) => {
    dispatchGameSession({ type: 'SET_GAME_DATE', payload: newDate });
    saveStateToHistory({ gameDate: newDate }); // Stays for now
  };
  const handleHomeScoreChange = (newScore: number) => {
    dispatchGameSession({ type: 'SET_HOME_SCORE', payload: newScore });
    saveStateToHistory({ homeScore: newScore });
  };
  const handleAwayScoreChange = (newScore: number) => {
    dispatchGameSession({ type: 'SET_AWAY_SCORE', payload: newScore });
    saveStateToHistory({ awayScore: newScore });
  };
  const handleGameNotesChange = (notes: string) => {
    dispatchGameSession({ type: 'SET_GAME_NOTES', payload: notes });
    saveStateToHistory({ gameNotes: notes });
  };

  // --- Handlers for Game Structure ---
  const handleSetNumberOfPeriods = (periods: number) => { 
    // Keep the check inside
    if (periods === 1 || periods === 2) {
      // Keep the type assertion for the state setter
      const validPeriods = periods as (1 | 2); 
      dispatchGameSession({ type: 'SET_NUMBER_OF_PERIODS', payload: validPeriods });
      saveStateToHistory({ numberOfPeriods: validPeriods });
      console.log(`Number of periods set to: ${validPeriods}`);
    } else {
      console.warn(`Invalid number of periods attempted: ${periods}. Must be 1 or 2.`);
    }
  };

  const handleSetPeriodDuration = (minutes: number) => {
    const newMinutes = Math.max(1, minutes);
    dispatchGameSession({ type: 'SET_PERIOD_DURATION', payload: newMinutes });
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
        availablePlayers: masterRosterQueryResultData || availablePlayers, // Master roster snapshot
        
        // Volatile timer states are EXCLUDED.
      };

    saveGameMutation.mutate({
      gameName,
      gameIdToSave: idToSave,
      snapshot: currentSnapshot as AppState, // Cast to AppState for the util
    });
  };

  // Function to handle loading a selected game
  const handleLoadGame = async (gameId: string) => {
    console.log(`Loading game with ID: ${gameId}`);
    setGameLoadError(null);
    setIsGameLoading(true);
    setProcessingGameId(gameId);

    const gameDataToLoad = savedGames[gameId] as unknown as GameData | undefined; // Get from savedGames

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
        delete updatedSavedGames[deletedGameId];
        setSavedGames(updatedSavedGames);
        console.log(`Game ${deletedGameId} deleted from state and persistence.`);

        if (currentGameId === deletedGameId) {
          console.log("Currently loaded game was deleted. Resetting to initial state via reducer.");
          // Dispatch action to reset to the initial state
          dispatchGameSession({ type: 'RESET_TO_INITIAL_STATE', payload: initialGameSessionData });
          
          // Reset other non-reducer states using initialState (from page.tsx)
          setPlayersOnField(initialState.playersOnField || []); 
          setOpponents(initialState.opponents || []); 
          setDrawings(initialState.drawings || []); 
          // setGameEvents(initialState.gameEvents || []); // REMOVE - Handled by RESET_TO_INITIAL_STATE
          setSeasonId(initialState.seasonId || '');
          setTournamentId(initialState.tournamentId || '');
          setGameLocation(initialState.gameLocation || '');
          setGameTime(initialState.gameTime || '');
          // setShowPlayerNames(initialState.showPlayerNames); // REMOVE - Handled by RESET_TO_INITIAL_STATE dispatch

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
        const game = savedGames[gameId]; // This is of type AppState
        if (!game) return; // Skip if game data is missing

        // --- Game Separator ---
        if (index > 0) {
          allRows.push(''); // Add a blank separator row between games
        }
        allRows.push(`=== GAME START: ${escapeCsvField(gameId)} ===`);

        // --- Section: Game Info ---
        allRows.push('Game Info');
        allRows.push(`${escapeCsvField('Game Date:')} ${DELIMITER} ${escapeCsvField(game.gameDate)}`);
        allRows.push(`${escapeCsvField('Team Name:')} ${DELIMITER} ${escapeCsvField(game.teamName)}`);
        allRows.push(`${escapeCsvField('Opponent Name:')} ${DELIMITER} ${escapeCsvField(game.opponentName)}`);
        allRows.push(`${escapeCsvField('Location:')} ${DELIMITER} ${escapeCsvField(game.gameLocation)}`);
        allRows.push(`${escapeCsvField('Time:')} ${DELIMITER} ${escapeCsvField(game.gameTime)}`);
        allRows.push(`${escapeCsvField('Home/Away:')} ${DELIMITER} ${escapeCsvField(game.homeOrAway)}`);
        allRows.push(`${escapeCsvField('Final Score (Home-Away):')} ${DELIMITER} ${escapeCsvField(game.homeScore)} - ${escapeCsvField(game.awayScore)}`);
        allRows.push(`${escapeCsvField('Game Status:')} ${DELIMITER} ${escapeCsvField(game.gameStatus)}`);
        allRows.push(`${escapeCsvField('Number of Periods:')} ${DELIMITER} ${escapeCsvField(game.numberOfPeriods)}`);
        allRows.push(`${escapeCsvField('Period Duration (min):')} ${DELIMITER} ${escapeCsvField(game.periodDurationMinutes)}`);
        allRows.push(`${escapeCsvField('Current Period:')} ${DELIMITER} ${escapeCsvField(game.currentPeriod)}`);
        allRows.push(`${escapeCsvField('Sub Interval (min):')} ${DELIMITER} ${escapeCsvField(game.subIntervalMinutes)}`);
        const seasonName = game.seasonId ? seasons.find(s => s.id === game.seasonId)?.name : 'N/A';
        const tournamentName = game.tournamentId ? tournaments.find(t => t.id === game.tournamentId)?.name : 'N/A';
        allRows.push(`${escapeCsvField('Season:')} ${DELIMITER} ${escapeCsvField(seasonName)}`);
        allRows.push(`${escapeCsvField('Tournament:')} ${DELIMITER} ${escapeCsvField(tournamentName)}`);
        allRows.push(`${escapeCsvField('Game Notes:')} ${DELIMITER} ${escapeCsvField(game.gameNotes)}`);
        allRows.push(''); // Blank row

        // --- Section: Events ---
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

      // ... (previous code, likely handleSetPlayerNotesForModal's closing `}, [updatePlayerMutation]);` ) ...
    // }, [updatePlayerMutation]); // This might be the dependency array of the previous function. Ensure it's correct.

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
    }, [removePlayerMutation, t]); // CORRECTED Dependencies: only removePlayerMutation and t (for translations)

    // ... (start of handleAddPlayerForModal) ...
      // ... (ensure this is after the closing `}, [removePlayerMutation, t]);` of handleRemovePlayerForModal)

    const handleAddPlayerForModal = useCallback(async (playerData: { name: string; jerseyNumber: string; notes: string; nickname: string }) => {
      console.log('[Page.tsx] handleAddPlayerForModal attempting mutation with:', playerData);
      setRosterError(null); // Clear previous specific errors
      // setIsRosterUpdating(true); // This line is removed - UI should use addPlayerMutation.isPending

      try {
        await addPlayerMutation.mutateAsync(playerData);
        // onSuccess in addPlayerMutation now handles:
        // - queryClient.invalidateQueries({ queryKey: ['masterRoster'] });
        // - setSelectedPlayerIds update (adds new player)
        // - saveStateToHistory call
        // - setRosterError(null) on success path
        console.log(`[Page.tsx] addPlayerMutation.mutateAsync successful for adding player: ${playerData.name}.`);
      } catch (error) {
        // Errors are primarily handled by the mutation's onError callback, which calls setRosterError.
        // This catch block is for any other unexpected error from mutateAsync itself.
        console.error(`[Page.tsx] Exception during addPlayerMutation.mutateAsync for player ${playerData.name}:`, error);
        // Optionally, if you want a generic fallback error here:
        // if (!addPlayerMutation.isError) { // Or check error type if more specific handling is needed
        //   setRosterError(t('rosterSettingsModal.errors.unexpected', 'An unexpected error occurred.'));
        // }
      }
      // finally { // This block is removed
        // setIsRosterUpdating(false); // This line is removed - UI should use addPlayerMutation.isPending
      // }
    }, [addPlayerMutation, t]); // CORRECTED Dependencies: only addPlayerMutation and t

    // ... (start of handleToggleGoalieForModal)

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
       const currentSelectedPlayerIds = gameSessionState.selectedPlayerIds; // Read from gameSessionState
       const currentIndex = currentSelectedPlayerIds.indexOf(playerId);
       let nextSelectedPlayerIds: string[];
       let nextPlayersOnField = playersOnField; // Start with current players on field

       if (currentIndex === -1) {
           // Player is being selected, add to selection
           nextSelectedPlayerIds = [...currentSelectedPlayerIds, playerId];
           // No change to playersOnField when selecting, they are added via drag/drop or "Place All"
       } else {
           // Player is being deselected, remove from selection
           nextSelectedPlayerIds = currentSelectedPlayerIds.filter(id => id !== playerId);
           // Also remove this player from the field if they were on it
           nextPlayersOnField = playersOnField.filter(p => p.id !== playerId);
       }
       
       dispatchGameSession({ type: 'SET_SELECTED_PLAYER_IDS', payload: nextSelectedPlayerIds });

       // Save to history: include selectedPlayerIds and playersOnField (if it changed)
       const historyUpdate: Partial<AppState> = { selectedPlayerIds: nextSelectedPlayerIds };
       if (JSON.stringify(playersOnField) !== JSON.stringify(nextPlayersOnField)) {
           historyUpdate.playersOnField = nextPlayersOnField;
       }
       saveStateToHistory(historyUpdate);
       
       // Update playersOnField state if it changed
       if (historyUpdate.playersOnField) {
           setPlayersOnField(nextPlayersOnField);
       }
       
       console.log(`Updated selected players: ${nextSelectedPlayerIds.length} players. Players on field: ${nextPlayersOnField.length}`);
   }, [playersOnField, saveStateToHistory, setPlayersOnField, gameSessionState.selectedPlayerIds]); // Dependency array updated 
                                                              // setSelectedPlayerIds is updated via its functional update form

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
    dispatchGameSession({ type: 'SET_HOME_OR_AWAY', payload: status });
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
        gameEvents={gameSessionState.gameEvents} // Pass game events for badges
        onPlayerTapInBar={handlePlayerTapInBar} // Pass the new tap handler
        onToggleGoalie={handleToggleGoalieForModal} // Pass the handler from the hook
      />
      
      {/* <<< ADD the GameInfoBar here >>> */}
      <GameInfoBar 
        teamName={gameSessionState.teamName}
        opponentName={gameSessionState.opponentName}
        homeScore={gameSessionState.homeScore}
        awayScore={gameSessionState.awayScore}
        homeOrAway={gameSessionState.homeOrAway} // Pass the prop
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
              timeElapsedInSeconds={gameSessionState.timeElapsedInSeconds} 
              subAlertLevel={gameSessionState.subAlertLevel}
              onSubstitutionMade={handleSubstitutionMade} 
              completedIntervalDurations={gameSessionState.completedIntervalDurations || []}
              subIntervalMinutes={gameSessionState.subIntervalMinutes}
              onSetSubInterval={handleSetSubInterval}
              isTimerRunning={gameSessionState.isTimerRunning}
              onStartPauseTimer={handleStartPauseTimer}// Corrected prop name
              onResetTimer={handleResetTimer}
              onToggleGoalLogModal={handleToggleGoalLogModal}
              onRecordOpponentGoal={() => handleLogOpponentGoal(gameSessionState.timeElapsedInSeconds)}
              // Game score props
              teamName={gameSessionState.teamName}
              opponentName={gameSessionState.opponentName}
              homeScore={gameSessionState.homeScore}
              awayScore={gameSessionState.awayScore}
              homeOrAway={gameSessionState.homeOrAway}
              // Last substitution time
              lastSubTime={gameSessionState.lastSubConfirmationTimeSeconds}
              // Game Structure props
              numberOfPeriods={gameSessionState.numberOfPeriods}
              periodDurationMinutes={gameSessionState.periodDurationMinutes}
              currentPeriod={gameSessionState.currentPeriod}
              gameStatus={gameSessionState.gameStatus}
              onOpponentNameChange={handleOpponentNameChange}
              // REMOVE Duplicate props that were causing errors:
              // timeElapsedInSeconds={gameSessionState.timeElapsedInSeconds}
              // isTimerRunning={gameSessionState.isTimerRunning}
              // subIntervalMinutes={gameSessionState.subIntervalMinutes}
              // nextSubDueTimeSeconds={gameSessionState.nextSubDueTimeSeconds} // Not a prop of TimerOverlay
              // subAlertLevel={gameSessionState.subAlertLevel}
          />
        )}
        <SoccerField
          players={playersOnField}
          opponents={opponents}
          drawings={drawings}
          showPlayerNames={gameSessionState.showPlayerNames} // USE gameSessionState
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
          timeElapsedInSeconds={gameSessionState.timeElapsedInSeconds}
        />
      </main>

      {/* Control Bar */}
      <ControlBar
        onAddOpponent={handleAddOpponent} // Pass handler from hook
        onClearDrawings={handleClearDrawings} // Correctly passed here
        onToggleNames={handleTogglePlayerNames} 
        showPlayerNames={gameSessionState.showPlayerNames} // USE gameSessionState
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onResetField={handleResetField} 
        // REMOVE props not defined in ControlBarProps:
        // isTimerRunning={gameSessionState.isTimerRunning} 
        // onStartPauseTimer={handleStartPauseTimer} 
        // onResetTimer={handleResetTimer} 
        showLargeTimerOverlay={showLargeTimerOverlay}
        onToggleLargeTimerOverlay={handleToggleLargeTimerOverlay}
        onToggleTrainingResources={handleToggleTrainingResources}
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
          currentTime={gameSessionState.timeElapsedInSeconds}
        />
        {/* Game Stats Modal - Restore props for now */}
        <GameStatsModal
          isOpen={isGameStatsModalOpen}
          onClose={handleToggleGameStatsModal}
          teamName={gameSessionState.teamName}
          opponentName={gameSessionState.opponentName}
          gameDate={gameSessionState.gameDate}
          gameLocation={gameLocation} // This is still a local state, might need to be gameSessionState.gameLocation
          gameTime={gameTime} // This is still a local state, might need to be gameSessionState.gameTime
          gameNotes={gameSessionState.gameNotes}
          homeScore={gameSessionState.homeScore}
          awayScore={gameSessionState.awayScore}
          homeOrAway={gameSessionState.homeOrAway} // Pass the prop
          availablePlayers={availablePlayers}
          gameEvents={gameSessionState.gameEvents} // This is still local state, should be gameSessionState.gameEvents
          onOpponentNameChange={handleOpponentNameChange}
          onGameDateChange={handleGameDateChange}
          onHomeScoreChange={handleHomeScoreChange}
          onAwayScoreChange={handleAwayScoreChange}
          onGameNotesChange={handleGameNotesChange}
          onUpdateGameEvent={handleUpdateGameEvent}
          onDeleteGameEvent={handleDeleteGameEvent}
             selectedPlayerIds={gameSessionState.selectedPlayerIds} 
          savedGames={savedGames}
          currentGameId={currentGameId}
          seasonId={seasonId} // This is local state, should be gameSessionState.seasonId
          tournamentId={tournamentId} // This is local state, should be gameSessionState.tournamentId
          // REMOVE props not defined in GameStatsModalProps:
          // numPeriods={gameSessionState.numberOfPeriods}
          // periodDurationMinutes={gameSessionState.periodDurationMinutes}
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
          onToggleGoalie={handleToggleGoalieForModal}
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
        />

        {/* ADD the new Game Settings Modal - ADD missing props */}
        <GameSettingsModal
          isOpen={isGameSettingsModalOpen} // Corrected State Variable
          onClose={handleCloseGameSettingsModal}
          currentGameId={currentGameId}
          teamName={gameSessionState.teamName} 
          opponentName={gameSessionState.opponentName}
          gameDate={gameSessionState.gameDate}
          gameLocation={gameLocation}
          gameTime={gameTime}
          gameNotes={gameSessionState.gameNotes}
          homeScore={gameSessionState.homeScore}
          awayScore={gameSessionState.awayScore}
          onOpponentNameChange={handleOpponentNameChange}
          onGameDateChange={handleGameDateChange}
          onGameLocationChange={handleGameLocationChange}
          onGameTimeChange={handleGameTimeChange}
          onGameNotesChange={handleGameNotesChange}
          onUpdateGameEvent={handleUpdateGameEvent}
          onAwardFairPlayCard={handleAwardFairPlayCard} // Pass the required handler
          onDeleteGameEvent={handleDeleteGameEvent}
          gameEvents={gameSessionState.gameEvents}
          availablePlayers={availablePlayers}
          seasonId={seasonId}
          tournamentId={tournamentId}
          numPeriods={gameSessionState.numberOfPeriods}
          periodDurationMinutes={gameSessionState.periodDurationMinutes}
          onNumPeriodsChange={handleSetNumberOfPeriods}
          onPeriodDurationChange={handleSetPeriodDuration}
          // Pass the new handlers
          onSeasonIdChange={handleSetSeasonId}
          onTournamentIdChange={handleSetTournamentId}
          // <<< ADD: Pass Home/Away state and handler >>>
          homeOrAway={gameSessionState.homeOrAway}
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
