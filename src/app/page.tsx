'use client';

import React, { useState, useEffect, useCallback, useMemo, useReducer, useRef } from 'react';
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
    setGoalieStatus,
    setFairPlayCardStatus // Added this line
} from '@/utils/masterRosterManager';

// Removed unused import of utilGetMasterRoster

// Import utility functions for seasons and tournaments
import { getSeasons as utilGetSeasons, addSeason as utilAddSeason } from '@/utils/seasons';
import { 
  getTournaments as utilGetTournaments, 
  addTournament as utilAddTournament,
} from '@/utils/tournaments';
import {
  getSavedGames as utilGetSavedGames,
  saveGame as utilSaveGame, // For auto-save and handleSaveGame
  deleteGame as utilDeleteGame, // For handleDeleteGame
  saveGames as utilSaveAllGames, // Corrected: For handleImportGamesFromJson (was saveAllGames)
  // GameData // Type // Comment out or remove GameData import if AppState is used directly
} from '@/utils/savedGames';
import {
  getCurrentGameIdSetting, // For initial load
  saveCurrentGameIdSetting as utilSaveCurrentGameIdSetting, // For saving current game ID setting
  resetAppSettings as utilResetAppSettings // For handleHardReset
} from '@/utils/appSettings';
// Import Player from types directory
import { Player, Season, Tournament } from '@/types';
import { GameEvent, AppState, SavedGamesCollection } from '@/types/game';
// Import useQuery, useMutation, useQueryClient
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
// Import async localStorage utilities
import { getLocalStorageItemAsync, setLocalStorageItemAsync, removeLocalStorageItemAsync } from '@/utils/localStorage';
// Import query keys
import { queryKeys } from '@/config/queryKeys';
// Import constants
import { DEFAULT_GAME_ID, MASTER_ROSTER_KEY } from '@/config/constants';
import { useAuth } from '@clerk/nextjs'; // Import useAuth from Clerk
import { useCurrentSupabaseUser } from '@/hooks/useCurrentSupabaseUser'; // Import your hook
import { getSupabaseClientForAuthenticatedOperations } from '@/lib/supabase'; // Import the client getter
import { saveSupabaseGame } from '@/utils/supabase/savedGames';
import { saveSupabaseCurrentGameId } from '@/utils/supabase/appSettings';

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
const SEASONS_LIST_KEY = 'soccerSeasons';
// const TOURNAMENTS_LIST_KEY = 'soccerTournaments'; // Removed unused variable
// const MASTER_ROSTER_KEY = 'soccerMasterRoster'; // <<< NEW KEY for global roster - now imported from constants

// Define structure for settings
// interface AppSettings {
//   currentGameId: string | null;
//   // Add other non-game-specific settings here later if needed
//   // e.g., preferredLanguage: string;
// }

// Define a default Game ID for the initial/unsaved state - now imported from constants



export default function Home() {
  console.log('--- page.tsx RENDER ---');
  const { t } = useTranslation(); // Get translation function
  const queryClient = useQueryClient(); // Get query client instance
  const { getToken } = useAuth(); // Get Clerk's getToken function
  const {
    supabaseUserId,
    isLoading: isSupabaseUserMappingLoading, // Renamed to avoid conflict
    isSignedIn,
    error: supabaseUserError, // Error from the hook
  } = useCurrentSupabaseUser();

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
    queryKey: [queryKeys.masterRoster, supabaseUserId, getToken], // Include dependencies for auth
    queryFn: async () => {
      const token = await getToken({ template: 'supabase' });
      if (!token || !supabaseUserId) {
        console.log('[page.tsx useQuery masterRoster] Token or supabaseUserId not available. Skipping fetch.');
        return [];
      }
      return getMasterRoster(token, supabaseUserId); // Call the manager function
    },
    enabled: !!isSignedIn && !!supabaseUserId && !isSupabaseUserMappingLoading, // Enable only when authenticated
  });

  // --- TanStack Query for Seasons ---
  const {
    data: seasonsQueryResultData,
    isLoading: areSeasonsQueryLoading,
    isError: isSeasonsQueryError,
    error: seasonsQueryErrorData,
    // refetch: refetchSeasons, // Optional: if you need to manually refetch
  } = useQuery<Season[], Error>({
    queryKey: [queryKeys.seasons, supabaseUserId, getToken], // Include dependencies
    queryFn: async () => {
      const token = await getToken({ template: 'supabase' });
      if (!token || !supabaseUserId) {
        console.log('[page.tsx useQuery seasons] Token or supabaseUserId not available. Skipping fetch.');
        return []; 
      }
      console.log(`[page.tsx useQuery seasons] CALLING utilGetSeasons with supabaseUserId: ${supabaseUserId} and token: ${token ? "PRESENT" : "MISSING"}`);
      return utilGetSeasons(token, supabaseUserId);
    },
    enabled: !!isSignedIn && !!supabaseUserId && !isSupabaseUserMappingLoading, 
  });

  // --- TanStack Query for Tournaments ---
  const {
    data: tournamentsQueryResultData,
    isLoading: areTournamentsQueryLoading,
    isError: isTournamentsQueryError,
    error: tournamentsQueryErrorData,
  } = useQuery<Tournament[], Error>({
    queryKey: [queryKeys.tournaments, supabaseUserId, getToken], // Include dependencies
    queryFn: async () => {
      const token = await getToken({ template: 'supabase' });
      if (!token || !supabaseUserId) {
        console.log('[page.tsx useQuery tournaments] Token or supabaseUserId not available. Skipping fetch.');
        return []; 
      }
      return utilGetTournaments(token, supabaseUserId);
    },
    enabled: !!isSignedIn && !!supabaseUserId && !isSupabaseUserMappingLoading, 
  });

  // --- TanStack Query for All Saved Games ---
  const {
    data: allSavedGamesQueryResultData,
    isLoading: isAllSavedGamesQueryLoading,
    isError: isAllSavedGamesQueryError,
    error: allSavedGamesQueryErrorData,
  } = useQuery<SavedGamesCollection | null, Error>({
    queryKey: [queryKeys.savedGames, supabaseUserId, getToken], // Include dependencies for auth
    queryFn: async () => {
      const token = await getToken({ template: 'supabase' });
      if (!token || !supabaseUserId) {
        console.log('[page.tsx useQuery savedGames] Token or supabaseUserId not available. Skipping fetch.');
        return null;
      }
      return utilGetSavedGames(token, supabaseUserId);
    },
    enabled: !!isSignedIn && !!supabaseUserId && !isSupabaseUserMappingLoading, // Enable only when authenticated
    initialData: {}, 
  });

  // --- TanStack Query for Current Game ID Setting ---
  const {
    data: currentGameIdSettingQueryResultData,
    isLoading: isCurrentGameIdSettingQueryLoading,
    isError: isCurrentGameIdSettingQueryError,
    error: currentGameIdSettingQueryErrorData,
  } = useQuery<string | null, Error>({
    queryKey: [queryKeys.appSettingsCurrentGameId, supabaseUserId, getToken], // Include dependencies for auth
    queryFn: async () => {
      const token = await getToken({ template: 'supabase' });
      if (!token || !supabaseUserId) {
        console.log('[page.tsx useQuery currentGameId] Token or supabaseUserId not available. Skipping fetch.');
        return null;
      }
      return getCurrentGameIdSetting(token, supabaseUserId);
    },
    enabled: !!isSignedIn && !!supabaseUserId && !isSupabaseUserMappingLoading, // Enable only when authenticated
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

  // --- Imports for Supabase services ---
  // import { saveSupabaseGame } from '@/utils/supabase/savedGames';
  // import { saveSupabaseCurrentGameId } from '@/utils/supabase/appSettings'; // We'll create this next
  
  // --- Mutation for Saving Game (now using Supabase) ---
  const saveGameMutation = useMutation<
    string,
    Error,
    { gameIdToSave: string; snapshot: AppState; gameName: string; }
  >({
    mutationFn: async ({ gameIdToSave, snapshot }) => {
      const token = await getToken({ template: 'supabase' });
      if (!token || !supabaseUserId) {
        throw new Error("User is not authenticated. Cannot save game.");
      }
      
      const supabaseClient = getSupabaseClientForAuthenticatedOperations(token);

      await Promise.all([
        saveSupabaseGame(supabaseClient, supabaseUserId, gameIdToSave, snapshot),
        saveSupabaseCurrentGameId(supabaseClient, supabaseUserId, gameIdToSave)
      ]);

      return gameIdToSave;
    },
    onSuccess: (savedGameId) => {
      console.log('[Mutation Success] Game saved to Supabase:', savedGameId);
      queryClient.invalidateQueries({ queryKey: [queryKeys.savedGames] });
      queryClient.invalidateQueries({ queryKey: [queryKeys.appSettingsCurrentGameId] });

      if (savedGameId !== currentGameId || currentGameId === DEFAULT_GAME_ID) {
         setCurrentGameId(savedGameId); 
      }
      
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
      const token = await getToken({ template: 'supabase' });
      if (!token || !supabaseUserId) {
        throw new Error("User is not authenticated. Cannot update player.");
      }
      return updatePlayer(token, supabaseUserId, playerId, playerData);
    },
    onSuccess: (updatedPlayer, variables) => {
      console.log('[Mutation Success] Player updated via Supabase:', variables.playerId, updatedPlayer);
      
      queryClient.invalidateQueries({ queryKey: [queryKeys.masterRoster] }); 

      if (updatedPlayer) {
        setPlayersOnField(prevPlayersOnField => {
          const nextPlayersOnField = prevPlayersOnField.map(p => 
            p.id === updatedPlayer.id ? { ...p, ...updatedPlayer } : p
          );
          return nextPlayersOnField;
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
    Player | null,
    Error,
    { playerId: string; isGoalie: boolean; }
  >({
    mutationFn: async ({ playerId, isGoalie }) => {
      const token = await getToken({ template: 'supabase' });
      if (!token || !supabaseUserId) {
        throw new Error("User is not authenticated. Cannot set goalie status.");
      }
      return setGoalieStatus(token, supabaseUserId, playerId, isGoalie);
    },
    onSuccess: (updatedPlayer, variables) => {
      if (updatedPlayer) {
        console.log('[Mutation Success] Goalie status updated via Supabase:', variables.playerId, updatedPlayer);
        queryClient.invalidateQueries({ queryKey: [queryKeys.masterRoster] });

        // This logic correctly updates the UI to reflect the new goalie status
        setPlayersOnField(prevPlayersOnField => {
          const nextPlayersOnField = prevPlayersOnField.map(p => {
            if (p.id === updatedPlayer.id) return { ...p, ...updatedPlayer };
            if (variables.isGoalie && p.isGoalie && p.id !== updatedPlayer.id) return { ...p, isGoalie: false };
            return p;
          });
          return nextPlayersOnField;
        });
        
        setRosterError(null);
      }
    },
    onError: (error, variables) => {
      console.error(`[Mutation Error] Failed to set goalie status for player ${variables.playerId}:`, error);
      setRosterError(t('rosterSettingsModal.errors.goalieStatusFailed', 'Error setting goalie status for player {playerId}. Please try again.', { playerId: variables.playerId }));
    },
  });

  // --- Mutation for Removing Player from Master Roster ---
  const removePlayerMutation = useMutation<
    boolean,
    Error,
    { playerId: string; token: string; internalSupabaseUserId: string; } // Updated variables type
  >({
    mutationFn: async ({ playerId, token, internalSupabaseUserId }) => {
      return removePlayer(token, internalSupabaseUserId, playerId);
    },
    onSuccess: (success, variables) => {
      if (success) {
        console.log('[Mutation Success] Player removed via Supabase:', variables.playerId);
        queryClient.invalidateQueries({ queryKey: [queryKeys.masterRoster] });

        setPlayersOnField(prev => prev.filter(p => p.id !== variables.playerId));
        
        const newSelectedPlayerIds = gameSessionState.selectedPlayerIds.filter(id => id !== variables.playerId);
        dispatchGameSession({ type: 'SET_SELECTED_PLAYER_IDS', payload: newSelectedPlayerIds });
        
        setRosterError(null);
      } else {
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
    Player | null,
    Error,
    { name: string; jerseyNumber: string; notes: string; nickname: string; }
  >({
    mutationFn: async (playerData) => {
      const token = await getToken({ template: 'supabase' });
      if (!token || !supabaseUserId) {
        throw new Error("User is not authenticated. Cannot add player.");
      }
      return addPlayer(token, supabaseUserId, playerData);
    },
    onSuccess: (newPlayer, variables) => {
      if (newPlayer) {
        console.log('[Mutation Success] Player added via Supabase:', newPlayer.name, newPlayer.id);
        queryClient.invalidateQueries({ queryKey: [queryKeys.masterRoster] });
        
        const newSelectedPlayerIds = [...gameSessionState.selectedPlayerIds, newPlayer.id];
        dispatchGameSession({ type: 'SET_SELECTED_PLAYER_IDS', payload: newSelectedPlayerIds });
        
        setRosterError(null);
      } else {
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
    Season | null, 
    Error,         
    { name: string; clerkToken: string; internalSupabaseUserId: string; } 
  >({
    mutationFn: async ({ name }) => { 
      const token = await getToken({ template: 'supabase' });
      if (!token || !supabaseUserId) {
        throw new Error("User is not authenticated. Cannot add season.");
      }
      return utilAddSeason(token, supabaseUserId, { name });
    },
    onSuccess: (newSeason, variables) => { 
      if (newSeason) {
        console.log('[Mutation Success] Season added via Supabase:', newSeason.name, newSeason.id);
        queryClient.invalidateQueries({ queryKey: [queryKeys.seasons] });
      } else {
        console.warn('[Mutation Non-Success] utilAddSeason returned null for season:', variables.name);
      }
    },
    onError: (error, variables) => {
      console.error(`[Mutation Error] Failed to add season ${variables.name}:`, error);
    },
  });

  // --- Mutation for Updating a Season ---
  // TODO: Implement UI to use this mutation
  // const updateSeasonMutation = useMutation<
  //   Season | null,
  //   Error,
  //   { seasonId: string; name: string; }
  // >({
  //   mutationFn: async ({ seasonId, name }) => {
  //     const token = await getToken({ template: 'supabase' });
  //     if (!token || !supabaseUserId) {
  //       throw new Error("User is not authenticated. Cannot update season.");
  //     }
  //     return utilUpdateSeason(token, supabaseUserId, seasonId, { name });
  //   },
  //   onSuccess: (updatedSeason) => {
  //     if (updatedSeason) {
  //       console.log('[Mutation Success] Season updated via Supabase:', updatedSeason.name, updatedSeason.id);
  //       queryClient.invalidateQueries({ queryKey: [queryKeys.seasons] });
  //     }
  //   },
  //   onError: (error, variables) => {
  //     console.error(`[Mutation Error] Failed to update season ${variables.name}:`, error);
  //     // You might want to set an error state here to show in the UI
  //   },
  // });

  // --- Mutation for Adding a new Tournament ---
  const addTournamentMutation = useMutation<
    Tournament | null,
    Error,
    { name: string; clerkToken: string; internalSupabaseUserId: string }
  >({
    mutationFn: async ({ name, clerkToken, internalSupabaseUserId }) => {
      // The new utilAddTournament now expects the token and user ID
      return utilAddTournament(clerkToken, internalSupabaseUserId, { name });
    },
    onSuccess: (newTournament, variables) => {
      if (newTournament) {
        console.log('[Mutation Success] Tournament added via Supabase:', newTournament.name, newTournament.id);
        queryClient.invalidateQueries({ queryKey: [queryKeys.tournaments] });
      } else {
        console.warn('[Mutation Non-Success] utilAddTournament returned null for tournament:', variables.name);
      }
    },
    onError: (error, variables) => {
      console.error(`[Mutation Error] Failed to add tournament ${variables.name}:`, error);
    },
  });

  // --- Mutation for Updating a Tournament ---
  // TODO: Implement UI to use this mutation
  // const updateTournamentMutation = useMutation<
  //   Tournament | null,
  //   Error,
  //   { tournament: Tournament }
  // >({
  //   mutationFn: async ({ tournament }) => {
  //     const token = await getToken({ template: 'supabase' });
  //     if (!token || !supabaseUserId) {
  //       throw new Error("User is not authenticated. Cannot update tournament.");
  //     }
  //     return utilUpdateTournament(token, supabaseUserId, tournament);
  //   },
  //   onSuccess: (updatedTournament) => {
  //     if (updatedTournament) {
  //       console.log('[Mutation Success] Tournament updated via Supabase:', updatedTournament.name);
  //       queryClient.invalidateQueries({ queryKey: [queryKeys.tournaments] });
  //     }
  //   },
  //   onError: (error) => {
  //     console.error(`[Mutation Error] Failed to update tournament:`, error);
  //   },
  // });

  // --- Mutation for Deleting a Tournament ---
  // TODO: Implement UI to use this mutation
  // const deleteTournamentMutation = useMutation<
  //   boolean,
  //   Error,
  //   { tournamentId: string }
  // >({
  //   mutationFn: async ({ tournamentId }) => {
  //     const token = await getToken({ template: 'supabase' });
  //     if (!token || !supabaseUserId) {
  //       throw new Error("User is not authenticated. Cannot delete tournament.");
  //     }
  //     return utilDeleteTournament(token, supabaseUserId, tournamentId);
  //   },
  //   onSuccess: (success, variables) => {
  //     if (success) {
  //       console.log('[Mutation Success] Tournament deleted via Supabase:', variables.tournamentId);
  //       queryClient.invalidateQueries({ queryKey: [queryKeys.tournaments] });
  //     }
  //   },
  //   onError: (error, variables) => {
  //     console.error(`[Mutation Error] Failed to delete tournament ${variables.tournamentId}:`, error);
  //   },
  // });

  // --- Mutation for Deleting a Season ---
  // TODO: Implement UI to use this mutation
  // const deleteSeasonMutation = useMutation<
  //   boolean,
  //   Error,
  //   { seasonId: string; }
  // >({
  //   mutationFn: async ({ seasonId }) => {
  //     const token = await getToken({ template: 'supabase' });
  //     if (!token || !supabaseUserId) {
  //       throw new Error("User is not authenticated. Cannot delete season.");
  //     }
  //     return utilDeleteSeason(token, supabaseUserId, seasonId);
  //   },
  //   onSuccess: (success, variables) => {
  //     if (success) {
  //       console.log('[Mutation Success] Season deleted via Supabase:', variables.seasonId);
  //       queryClient.invalidateQueries({ queryKey: [queryKeys.seasons] });
  //     } else {
  //       // This case might not be hit if the function throws on failure, but included for completeness.
  //       console.warn(`[Mutation Non-Success] deleteSeason returned false for season: ${variables.seasonId}`);
  //     }
  //   },
  //   onError: (error, variables) => {
  //     console.error(`[Mutation Error] Failed to delete season ${variables.seasonId}:`, error);
  //     // You might want to set an error state here to show in the UI
  //   },
  // });

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
    if (isSupabaseUserMappingLoading) {
      console.log('[Seasons Effect] Waiting for Supabase user mapping to complete...');
      return; 
    }

    if (supabaseUserError) {
      console.error('[Seasons Effect] Error during Supabase user mapping:', supabaseUserError);
      setSeasons([]); 
      // REMOVED: setAppLoading(false);
      return;
    }

    if (!isSignedIn || !supabaseUserId) {
      console.log('[Seasons Effect] User not signed in or no Supabase User ID. Clearing seasons.');
      setSeasons([]); 
      // REMOVED: setAppLoading(false);
      return;
    }

    if (areSeasonsQueryLoading) {
      console.log('[Seasons Effect] TanStack Query is loading seasons...');
    } else if (isSeasonsQueryError) {
      console.error('[Seasons Effect] TanStack Query error loading seasons:', seasonsQueryErrorData);
      setSeasons([]); 
      // REMOVED: setAppLoading(false);
    } else if (seasonsQueryResultData) {
      console.log('[Seasons Effect] TanStack Query successfully fetched seasons.');
      setSeasons(Array.isArray(seasonsQueryResultData) ? seasonsQueryResultData : []);
      // REMOVED: setAppLoading(false);
    } else {
      console.log('[Seasons Effect] seasonsQueryResultData is not yet available or query was disabled.');
      setSeasons([]); 
      // REMOVED: setAppLoading(false);
    }
  }, [
    isSignedIn,
    supabaseUserId,
    isSupabaseUserMappingLoading,
    supabaseUserError,
    seasonsQueryResultData, 
    areSeasonsQueryLoading, 
    isSeasonsQueryError,
    seasonsQueryErrorData,
  ]);

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

  // --- Effect for Page Visibility API to handle timer resilience ---
  const timerStateOnHideRef = useRef<{isRunning: boolean; elapsedSeconds: number; timestamp: number} | null>(null);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Page is hidden
        if (gameSessionState.isTimerRunning && gameSessionState.gameStatus === 'inProgress') {
          console.log('[Visibility] Page hidden, timer was running. Pausing and storing state.');
          timerStateOnHideRef.current = {
            isRunning: true,
            elapsedSeconds: gameSessionState.timeElapsedInSeconds,
            timestamp: Date.now(),
          };
          dispatchGameSession({ type: 'SET_TIMER_RUNNING', payload: false });
        }
      } else {
        // Page is visible
        if (timerStateOnHideRef.current && timerStateOnHideRef.current.isRunning) {
          console.log('[Visibility] Page visible, timer was running. Restoring state.');
          const elapsedOfflineMs = Date.now() - timerStateOnHideRef.current.timestamp;
          const correctedElapsedSeconds = timerStateOnHideRef.current.elapsedSeconds + (elapsedOfflineMs / 1000);
          
          // Dispatching SET_TIMER_ELAPSED. The main timer useEffect will catch up game status if period/game ended.
          dispatchGameSession({ type: 'SET_TIMER_ELAPSED', payload: correctedElapsedSeconds });

          // Check game status *after* potential update by SET_TIMER_ELAPSED via main timer effect
          // This requires gameSessionState to be up-to-date here, which it might not be immediately after dispatch.
          // A safer way is to check the status *before* deciding to run, or let the main timer effect restart if conditions met.
          // For now, let's assume if it was running, and game status is still inProgress, we try to resume.
          // The main timer useEffect dependence on gameSessionState.isTimerRunning will kick it back on.
          if (gameSessionState.gameStatus === 'inProgress') { // Check current status
             dispatchGameSession({ type: 'SET_TIMER_RUNNING', payload: true });
          }
          timerStateOnHideRef.current = null;
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [gameSessionState.isTimerRunning, gameSessionState.timeElapsedInSeconds, gameSessionState.gameStatus]); // Dependencies needed to access current state

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
      if (isLoaded && currentGameId && currentGameId !== DEFAULT_GAME_ID) {
        try {
          console.log("Auto-saving state to localStorage (via utility)...");
          const currentSnapshot = {
            // ... copy everything from history for full snapshot
            ...history[historyIndex],
            availablePlayers: masterRosterQueryResultData || availablePlayers, // <<< USE: Master roster as authoritative
          };
        
        // 2. Save the game snapshot using utility
          await utilSaveGame(currentGameId, currentSnapshot as AppState); // Cast to AppState for the util
        
        // 3. Save App Settings (only the current game ID) using utility
          const token = await getToken({ template: 'supabase' });
          if (token && supabaseUserId) {
            await utilSaveCurrentGameIdSetting(token, supabaseUserId, currentGameId);
          }

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
      playersOnField, opponents, drawings, availablePlayers, masterRosterQueryResultData,
      // showPlayerNames, // REMOVED - Covered by gameSessionState
      // Local states that are part of the snapshot but not yet in gameSessionState:
      // gameEvents, // REMOVE - Now from gameSessionState
      gameSessionState,
    ]);

  // **** ADDED: Effect to prompt for setup if default game ID is loaded ****
  useEffect(() => {
    console.log('[Modal Trigger Effect] Running. initialLoadComplete:', initialLoadComplete, 'hasSkipped:', hasSkippedInitialSetup, 'isSignedIn:', isSignedIn);
    // Only run the check *after* initial load is complete, user is signed in, and setup hasn't been skipped
    if (initialLoadComplete && isSignedIn && !hasSkippedInitialSetup) {
      // Check currentGameId *inside* the effect body
      if (currentGameId === DEFAULT_GAME_ID) {
        console.log('Default game ID loaded for signed-in user, prompting for setup...');
        setIsNewGameSetupModalOpen(true);
      } else {
        console.log('Not prompting: Specific game loaded for signed-in user.');
      }
    }
  }, [initialLoadComplete, hasSkippedInitialSetup, currentGameId, isSignedIn]); // Add isSignedIn to dependency array

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
    // const newShowPlayerNames = !gameSessionState.showPlayerNames; // No longer needed for direct history save
    dispatchGameSession({ type: 'TOGGLE_SHOW_PLAYER_NAMES' });
    // REMOVED: saveStateToHistory({ showPlayerNames: newShowPlayerNames }); 
  };

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
    // Dispatch the new action to reset only timer-specific fields
    dispatchGameSession({ type: 'RESET_TIMER_ONLY' }); 
    console.log("Timer reset to start of current period via RESET_TIMER_ONLY action.");
  };

  const handleSubstitutionMade = () => {
    // Dispatch action to reducer
    dispatchGameSession({ type: 'CONFIRM_SUBSTITUTION' });
    console.log(`Substitution confirmed via reducer.`);
  };

  const handleSetSubInterval = (minutes: number) => {
    const newMinutes = Math.max(1, minutes);
    dispatchGameSession({ type: 'SET_SUB_INTERVAL', payload: newMinutes });
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
  const handleHomeScoreChange = (newScore: number) => {
    dispatchGameSession({ type: 'SET_HOME_SCORE', payload: newScore });
  };
  const handleAwayScoreChange = (newScore: number) => {
    dispatchGameSession({ type: 'SET_AWAY_SCORE', payload: newScore });
  };
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
    if (window.confirm(t('controlBar.hardResetConfirmation') ?? "Are you sure you want to completely reset the application? All saved data (players, stats, positions) will be permanently lost.")) {
      try {
        console.log("Performing hard reset using utility...");
        await utilResetAppSettings(); // Use utility function
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
  const handleSaveGame = (gameName: string) => {
    console.log(`Attempting to save game: '${gameName}'`);
    
    let idToSave: string;
    const isOverwritingExistingLoadedGame = currentGameId && currentGameId !== DEFAULT_GAME_ID;

    if (isOverwritingExistingLoadedGame) {
      idToSave = currentGameId;
    } else {
      idToSave = `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }

    const currentSnapshot: AppState = {
      // ... (snapshot creation logic is correct)
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
      playersOnField,
      opponents,
      drawings,
      availablePlayers: masterRosterQueryResultData || availablePlayers,
    };

    // Call the mutation with the prepared variables
    saveGameMutation.mutate({
      gameName,
      gameIdToSave: idToSave,
      snapshot: currentSnapshot,
    });
  };

  // Function to handle loading a selected game
  const handleLoadGame = async (gameId: string) => {
    console.log(`Loading game with ID: ${gameId}`);
    setGameLoadError(null);
    setIsGameLoading(true);
    setProcessingGameId(gameId);

    const gameDataToLoad = savedGames[gameId] as AppState | undefined; // Ensure this is AppState

    if (gameDataToLoad) {
      try {
        // Dispatch to reducer to load the game state
        loadGameStateFromData(gameDataToLoad); // This now primarily uses the reducer

        // Update current game ID and save settings
        setCurrentGameId(gameId);
        const token = await getToken({ template: 'supabase' });
        if (token && supabaseUserId) {
          await utilSaveCurrentGameIdSetting(token, supabaseUserId, gameId);
        }

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
          const token = await getToken({ template: 'supabase' });
          if (token && supabaseUserId) {
            await utilSaveCurrentGameIdSetting(token, supabaseUserId, DEFAULT_GAME_ID);
          }
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
      setRosterError(null);

      try {
        const token = await getToken({ template: 'supabase' });
        if (!token || !supabaseUserId) {
          throw new Error("User is not authenticated. Cannot remove player.");
        }
        // Pass all required variables to the mutation
        await removePlayerMutation.mutateAsync({ playerId, token, internalSupabaseUserId: supabaseUserId });
        
        console.log(`[Page.tsx] removePlayerMutation.mutateAsync successful for removal of ${playerId}.`);
      } catch (error) {
        console.error(`[Page.tsx] Exception during removePlayerMutation.mutateAsync for removal of ${playerId}:`, error);
        if (!removePlayerMutation.error) {
          setRosterError(t('rosterSettingsModal.errors.unexpected', 'An unexpected error occurred.'));
        }
      }
    }, [removePlayerMutation, getToken, supabaseUserId, t]);

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
    console.log(`[page.tsx] handleAwardFairPlayCard called with playerId: ${playerId}`);
    
    const currentlyAwardedPlayerId = availablePlayers.find(p => p.receivedFairPlayCard)?.id;
    const token = await getToken({ template: 'supabase' });
    if (!token || !supabaseUserId) {
        console.error("Cannot update fair play card status, user not authenticated.");
        return;
    }

    // This logic now correctly uses the authenticated mutation
    if (currentlyAwardedPlayerId) {
        try {
            await setFairPlayCardStatus(token, supabaseUserId, currentlyAwardedPlayerId, false);
        } catch (error) {
            console.error(`Failed to clear fair play card for ${currentlyAwardedPlayerId}`, error);
            return;
        }
    }

    if (playerId && playerId !== currentlyAwardedPlayerId) {
        try {
            await setFairPlayCardStatus(token, supabaseUserId, playerId, true);
        } catch (error) {
            console.error(`Failed to award fair play card to ${playerId}`, error);
            return;
        }
    }
    
    queryClient.invalidateQueries({ queryKey: [queryKeys.masterRoster] });

  }, [availablePlayers, getToken, supabaseUserId, queryClient]);

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
        const token = await getToken({ template: 'supabase' });
        if (token && supabaseUserId) {
          await utilSaveCurrentGameIdSetting(token, supabaseUserId, currentGameId); // Save current game ID setting
        }

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
  const handleSetSeasonId = useCallback((newSeasonId: string | null) => {
    const idToSet = newSeasonId || ''; // Ensure empty string instead of null
    console.log('[page.tsx] handleSetSeasonId called with:', idToSet);
    dispatchGameSession({ type: 'SET_SEASON_ID', payload: idToSet }); 
    // REMOVED: saveStateToHistory({ seasonId: idToSet, tournamentId: idToSet ? '' : gameSessionState.tournamentId });
  }, []); // Dependencies removed as reducer handles all logic.

  const handleSetTournamentId = useCallback((newTournamentId: string | null) => {
    const idToSet = newTournamentId || ''; // Ensure empty string instead of null
    console.log('[page.tsx] handleSetTournamentId called with:', idToSet);
    dispatchGameSession({ type: 'SET_TOURNAMENT_ID', payload: idToSet });
    // REMOVED: saveStateToHistory({ tournamentId: idToSet, seasonId: idToSet ? '' : gameSessionState.seasonId });
  }, []); // Dependencies removed as reducer handles all logic.

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
          // Timer/Sub State - Use TOP-LEVEL initialState defaults (or current settings?)
          // Let's stick with initialState defaults for timer/sub settings for now
          subIntervalMinutes: initialState.subIntervalMinutes ?? 5,
          completedIntervalDurations: [], // Always reset intervals
          lastSubConfirmationTimeSeconds: 0, // Always reset last sub time
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
        const token = await getToken({ template: 'supabase' });
        if (token && supabaseUserId) {
          await utilSaveCurrentGameIdSetting(token, supabaseUserId, newGameId);
        }
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

  if (isSupabaseUserMappingLoading || (areSeasonsQueryLoading && isSignedIn && !!supabaseUserId)) {
    return <div>Loading application data...</div>; // More generic loading state
  }

  // Final console log before returning the main JSX
  console.log('[Home Render] highlightRosterButton:', highlightRosterButton); // Log state on render

  // ATTEMPTING TO EXPLICITLY REMOVE THE CONDITIONAL HOOK
  // The useEffect for highlightRosterButton that was here (around lines 2977-2992)
  // should be removed as it's called conditionally and its correct version is at the top level.

  // Log gameEvents before PlayerBar is rendered
  console.log('[page.tsx] About to render PlayerBar, gameEvents for PlayerBar:', JSON.stringify(gameSessionState.gameEvents));

  return (
    // Main container with flex column layout
    <div className="flex flex-col h-screen bg-gray-900 text-white relative">
      {/* TEST VERSION BANNER */}
      <div className="bg-red-600 text-white text-center py-1 text-sm font-bold">
        ⚠️ TEST VERSION - DO NOT USE FOR PRODUCTION ⚠️
      </div>
      
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
          availablePlayers={playersForCurrentGame} // MODIFIED: Pass players selected for the current game
          currentTime={gameSessionState.timeElapsedInSeconds}
        />
        {/* Game Stats Modal - Restore props for now */}
        <GameStatsModal
          isOpen={isGameStatsModalOpen}
          onClose={handleToggleGameStatsModal}
          teamName={gameSessionState.teamName}
          opponentName={gameSessionState.opponentName}
          gameDate={gameSessionState.gameDate}
          gameLocation={gameSessionState.gameLocation} // This is still a local state, might need to be gameSessionState.gameLocation
          gameTime={gameSessionState.gameTime} // This is still a local state, might need to be gameSessionState.gameTime
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
          seasonId={gameSessionState.seasonId} // USE gameSessionState
          tournamentId={gameSessionState.tournamentId} // USE gameSessionState
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
            // Pass the required auth details for the modal to use when calling mutateAsync
            internalSupabaseUserId={supabaseUserId} // Pass only supabaseUserId
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
          gameLocation={gameSessionState.gameLocation} // USE gameSessionState
          gameTime={gameSessionState.gameTime} // This is still local state
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
          seasonId={gameSessionState.seasonId}
          tournamentId={gameSessionState.tournamentId}
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
