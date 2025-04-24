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

// Define the Player type - Use relative coordinates
export interface Player {
  id: string;
  name: string; // Full name
  nickname?: string; // Optional nickname (e.g., first name) for display on disc
  relX?: number; // Relative X (0.0 to 1.0)
  relY?: number; // Relative Y (0.0 to 1.0)
  color?: string; // Optional: Specific color for the disk
  isGoalie?: boolean; // Optional: Is this player the goalie?
  jerseyNumber?: string; // Optional: Player's jersey number
  notes?: string; // Optional: Notes specific to this player
  receivedFairPlayCard?: boolean; // Optional: Did this player receive the fair play card?
}

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
  type: 'goal' | 'opponentGoal' | 'substitution' | 'periodEnd' | 'gameEnd';
  time: number; // Time in seconds relative to the start of the game
  scorerId?: string; // Player ID of the scorer (optional)
  assisterId?: string; // Player ID of the assister (optional)
  // Additional fields might be needed for other event types
}

// Define structure for substitution interval logs
export interface IntervalLog {
  period: number;
  duration: number; // Duration in seconds
  timestamp: number; // Unix timestamp when the interval ended
}

// ADD PlayerStatRow interface (copied from GameStatsModal for type safety)
// Ideally, move this to a shared types file later
export interface PlayerStatRow extends Player {
  goals: number;
  assists: number;
  totalScore: number;
  fpAwards?: number;
  gamesPlayed: number;
}

// Define the structure for the application state (for history)
export interface AppState {
  playersOnField: Player[];
  opponents: Opponent[]; 
  drawings: Point[][];
  showPlayerNames: boolean; 
  teamName: string; 
  gameEvents: GameEvent[]; // Add game events to state
  // Add game info state
  opponentName: string;
  gameDate: string;
  homeScore: number;
  awayScore: number;
  gameNotes: string; // Add game notes to state
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
  showPlayerNames: true,
  teamName: "My Team",
  gameEvents: [], // Initialize game events as empty array
  // Initialize game info
  opponentName: "Opponent",
  gameDate: new Date().toISOString().split('T')[0], // Default to today's date YYYY-MM-DD
  homeScore: 0,
  awayScore: 0,
  gameNotes: '', // Initialize game notes as empty string
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
const SAVED_GAMES_KEY = 'savedSoccerGames';
const APP_SETTINGS_KEY = 'soccerAppSettings';
const SEASONS_LIST_KEY = 'soccerSeasons';
const TOURNAMENTS_LIST_KEY = 'soccerTournaments';
const MASTER_ROSTER_KEY = 'soccerMasterRoster'; // <<< NEW KEY for global roster

// Define structure for settings
interface AppSettings {
  currentGameId: string | null;
  // Add other non-game-specific settings here later if needed
  // e.g., preferredLanguage: string;
}

// Define structure for saved games collection
export interface SavedGamesCollection {
  [gameId: string]: AppState; // Use AppState for the game state structure
}

// NEW: Define structure for Seasons and Tournaments
export interface Season {
  id: string; // Unique identifier (e.g., 'season_2024_spring')
  name: string; // User-friendly name (e.g., "Spring League 2024")
  // Add more fields later if needed (e.g., startDate, endDate)
}

export interface Tournament {
  id: string; // Unique identifier (e.g., 'tournament_summer_cup_2024')
  name: string; // User-friendly name (e.g., "Summer Cup 2024")
  // Add more fields later if needed (e.g., date, location)
}

// Define a default Game ID for the initial/unsaved state
const DEFAULT_GAME_ID = '__default_unsaved__';



export default function Home() {
  const { t } = useTranslation(); // Get translation function

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
    availablePlayers,
    setPlayersOnField,
    setOpponents,
    setDrawings, 
    setAvailablePlayers,
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
    handleRenamePlayer, // Destructure the handler
    handleToggleGoalie // Destructure the goalie handler
  }: UseGameStateReturn = useGameState({ initialState, saveStateToHistory });

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
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false); // RE-ADD Fullscreen state
  // Persistence state
  const [savedGames, setSavedGames] = useState<SavedGamesCollection>({});
  const [currentGameId, setCurrentGameId] = useState<string | null>(DEFAULT_GAME_ID);
  // ADD State for seasons/tournaments lists
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

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
  const [hasSkippedInitialSetup, setHasSkippedInitialSetup] = useState<boolean>(false); // <-- Add this state
  // Add state to track if new game setup should open after saving
  const [isStartingNewGameAfterSave, setIsStartingNewGameAfterSave] = useState<boolean>(false); // <<< RE-ADD THIS LINE
  // ADD state for the new Game Settings modal
  const [isGameSettingsModalOpen, setIsGameSettingsModalOpen] = useState<boolean>(false);

  // --- Derived State for Filtered Players ---
  const playersForCurrentGame = useMemo(() => {
    // Ensure both lists are ready before filtering
    if (!availablePlayers || !selectedPlayerIds) {
        return [];
    }
    return availablePlayers.filter(p => selectedPlayerIds.includes(p.id));
  }, [availablePlayers, selectedPlayerIds]);

  // --- Handlers (Remaining in Home component or to be moved) ---
  // REMOVED: handlePlayerDrop (now comes from useGameState hook)
  // ... other handlers ...

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
    console.log('Initial Load Effect Triggered');

    // +++ NEW: Load Master Roster +++
    let loadedMasterRoster: Player[] = [];
    try {
        const rosterJson = localStorage.getItem(MASTER_ROSTER_KEY);
        if (rosterJson) {
            loadedMasterRoster = JSON.parse(rosterJson);
            console.log(`Loaded master roster from localStorage: ${loadedMasterRoster.length} players`);
        } else {
            console.log('No master roster found in localStorage, using initial data.');
            loadedMasterRoster = initialAvailablePlayersData; // Use default
            localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(loadedMasterRoster)); // Save default
        }
    } catch (error) {
        console.error('Failed to load or parse master roster:', error);
        // Fallback to initial data in case of error
        loadedMasterRoster = initialAvailablePlayersData;
    }
    // Set the global roster state
    setAvailablePlayers(loadedMasterRoster);
    // +++ END NEW: Load Master Roster +++

    // 1. Load saved games collection
    let loadedGames: SavedGamesCollection = {};
    try {
      const savedGamesJson = localStorage.getItem(SAVED_GAMES_KEY);
      if (savedGamesJson) {
        loadedGames = JSON.parse(savedGamesJson);
        console.log('Loaded saved games from localStorage:', Object.keys(loadedGames).length, 'games');
      } else {
        console.log('No saved games found in localStorage.');
      }
    } catch (error) {
      console.error('Failed to load or parse saved games:', error);
    }
    setSavedGames(loadedGames);

    // --- ADD Loading for Seasons and Tournaments ---
    try {
      const storedSeasons = localStorage.getItem(SEASONS_LIST_KEY);
      const loadedSeasons = storedSeasons ? JSON.parse(storedSeasons) : [];
      setSeasons(loadedSeasons);
      console.log('Loaded seasons:', loadedSeasons.length);
    } catch (error) { console.error("Failed to load seasons:", error); setSeasons([]); }
    
    try {
      const storedTournaments = localStorage.getItem(TOURNAMENTS_LIST_KEY);
      const loadedTournaments = storedTournaments ? JSON.parse(storedTournaments) : [];
      setTournaments(loadedTournaments);
      console.log('Loaded tournaments:', loadedTournaments.length);
    } catch (error) { console.error("Failed to load tournaments:", error); setTournaments([]); }
    // --- END Loading for Seasons and Tournaments ---

    // 2. Load app settings to find the last game ID
    let loadedSettings: AppSettings | null = null;
    try {
      const settingsJson = localStorage.getItem(APP_SETTINGS_KEY);
      if (settingsJson) {
        loadedSettings = JSON.parse(settingsJson);
        console.log('Loaded app settings:', loadedSettings);
      }
    } catch (error) {
      console.error('Failed to load or parse app settings:', error);
    }
    const lastGameId = loadedSettings?.currentGameId ?? DEFAULT_GAME_ID;
    setCurrentGameId(lastGameId);

    // 3. Load the state of the last game (or default if none/error)
    const loadedState = loadedGames[lastGameId] ?? null;
    if (loadedState) {
      console.log(`Loading state for game ID: ${lastGameId}`);
    } else if (lastGameId !== DEFAULT_GAME_ID) {
      console.warn(`State for last game ID (${lastGameId}) not found in saved games. Loading default.`);
      setCurrentGameId(DEFAULT_GAME_ID); // Fallback to default ID if state is missing
    }

    // 4. Apply the loaded or initial state
    const stateToApply = loadedState ?? initialState;
    setHistory([stateToApply]);
    setHistoryIndex(0);

    setPlayersOnField(stateToApply.playersOnField);
    setOpponents(stateToApply.opponents || []);
    setDrawings(stateToApply.drawings);
    // REMOVED: setAvailablePlayers(stateToApply.availablePlayers);
    setShowPlayerNames(stateToApply.showPlayerNames);
    setTeamName(stateToApply.teamName || initialState.teamName);
    setGameEvents(stateToApply.gameEvents || []);
    setOpponentName(stateToApply.opponentName || initialState.opponentName);
    setGameDate(stateToApply.gameDate || initialState.gameDate);
    setHomeScore(stateToApply.homeScore || 0);
    setAwayScore(stateToApply.awayScore || 0);
    setGameNotes(stateToApply.gameNotes || '');
    setNumberOfPeriods(stateToApply.numberOfPeriods || initialState.numberOfPeriods);
    setPeriodDurationMinutes(stateToApply.periodDurationMinutes || initialState.periodDurationMinutes);
    setCurrentPeriod(stateToApply.currentPeriod || initialState.currentPeriod);
    setGameStatus(stateToApply.gameStatus || initialState.gameStatus);
    // FIX: Add final default values
    setSubIntervalMinutes(stateToApply.subIntervalMinutes ?? initialState.subIntervalMinutes ?? 5);
    setCompletedIntervalDurations(stateToApply.completedIntervalDurations ?? initialState.completedIntervalDurations ?? []);
    setLastSubConfirmationTimeSeconds(stateToApply.lastSubConfirmationTimeSeconds ?? initialState.lastSubConfirmationTimeSeconds ?? 0);
    setSelectedPlayerIds(stateToApply.selectedPlayerIds || []);
    setSeasonId(stateToApply.seasonId ?? '');
    setTournamentId(stateToApply.tournamentId ?? '');
    setGameLocation(stateToApply.gameLocation || '');
    setGameTime(stateToApply.gameTime || '');

    setIsLoaded(true);
    console.log('Initial load complete. isLoaded set to true.');

  // ADD missing dependencies AGAIN
    }, [setPlayersOnField, setOpponents, setDrawings, setAvailablePlayers]);

  // *** ADDED: Central useEffect for loading state based on currentGameId ***
  useEffect(() => {
    console.log('[Loading Effect] Running due to change in currentGameId or savedGames.', { currentGameId });
    
    // Determine the state to load
    let stateToLoad: AppState | null = null;
    if (currentGameId && currentGameId !== DEFAULT_GAME_ID && savedGames[currentGameId]) {
      console.log(`[Loading Effect] Found state for game ID: ${currentGameId} in savedGames.`);
      stateToLoad = savedGames[currentGameId];
    } else if (currentGameId === DEFAULT_GAME_ID) {
      console.log('[Loading Effect] currentGameId is DEFAULT_GAME_ID, using initial state.');
      stateToLoad = initialState;
    } else {
      console.warn(`[Loading Effect] No valid state found for currentGameId: ${currentGameId}. Falling back to initial state.`);
      stateToLoad = initialState;
      // Optional: Reset currentGameId if state was missing for a specific ID?
      // setCurrentGameId(DEFAULT_GAME_ID); 
    }

    // Apply the loaded state using individual state setters
    if (stateToLoad) {
      console.log('[Loading Effect] Applying loaded state:', stateToLoad);
      setPlayersOnField(stateToLoad.playersOnField || []);
      setOpponents(stateToLoad.opponents || []);
      setDrawings(stateToLoad.drawings || []);
      // REMOVED: setAvailablePlayers(stateToLoad.availablePlayers || []);
      setShowPlayerNames(stateToLoad.showPlayerNames ?? true);
      setTeamName(stateToLoad.teamName || initialState.teamName);
      setGameEvents(stateToLoad.gameEvents || []);
      setOpponentName(stateToLoad.opponentName || initialState.opponentName);
      setGameDate(stateToLoad.gameDate || initialState.gameDate);
      setHomeScore(stateToLoad.homeScore || 0);
      setAwayScore(stateToLoad.awayScore || 0);
      setGameNotes(stateToLoad.gameNotes || '');
      setNumberOfPeriods(stateToLoad.numberOfPeriods || initialState.numberOfPeriods);
      setPeriodDurationMinutes(stateToLoad.periodDurationMinutes || initialState.periodDurationMinutes);
      setCurrentPeriod(stateToLoad.currentPeriod || initialState.currentPeriod);
      setGameStatus(stateToLoad.gameStatus || initialState.gameStatus);
      setSelectedPlayerIds(stateToLoad.selectedPlayerIds || initialState.selectedPlayerIds || []);
      setSeasonId(stateToLoad.seasonId ?? '');
      setTournamentId(stateToLoad.tournamentId ?? '');
      setGameLocation(stateToLoad.gameLocation || '');
      setGameTime(stateToLoad.gameTime || '');
      setSubIntervalMinutes(stateToLoad.subIntervalMinutes ?? initialState.subIntervalMinutes ?? 5);
      setCompletedIntervalDurations(stateToLoad.completedIntervalDurations ?? initialState.completedIntervalDurations ?? []);
      setLastSubConfirmationTimeSeconds(stateToLoad.lastSubConfirmationTimeSeconds ?? initialState.lastSubConfirmationTimeSeconds ?? 0);

      // Reset session-specific state based on loaded game status
      // Always reset timer state when loading any game state
      setTimeElapsedInSeconds(0); // Reset timer to 0 on load
      setIsTimerRunning(false); // Ensure timer is paused on load
      
      // Recalculate next sub time based on loaded state
      const lastSubTime = stateToLoad.lastSubConfirmationTimeSeconds ?? 0;
      const intervalMins = stateToLoad.subIntervalMinutes ?? 5;
      const intervalSecs = intervalMins * 60;

      // If loading a started game, set next sub time relative to the last sub time.
      // If loading a notStarted game, set next sub time relative to 0.
      let nextDue = intervalSecs; // Default for notStarted
      if (stateToLoad.gameStatus !== 'notStarted' && lastSubTime > 0) {
          // Calculate based on last sub time
          nextDue = Math.ceil((lastSubTime + 1) / intervalSecs) * intervalSecs;
          if (nextDue <= lastSubTime) { // Ensure next due is in the future relative to last sub
              nextDue += intervalSecs;
          } 
      } else if (stateToLoad.gameStatus !== 'notStarted' && lastSubTime === 0) {
          // Game started, but no subs made yet, next due is simply the interval
          nextDue = intervalSecs;
      }
      // If status is notStarted, nextDue remains intervalSecs from the default above

      setNextSubDueTimeSeconds(nextDue);
      setSubAlertLevel('none'); // Reset alert on load

      // Reset history to start with the loaded state
      setHistory([stateToLoad]);
      setHistoryIndex(0);
      console.log('[Loading Effect] State applied successfully.');
    }

  }, [currentGameId, savedGames]); // Keep dependencies simple - only react to ID or data change

  // --- Save state to localStorage ---
  useEffect(() => {
    // Only auto-save if loaded AND we have a proper game ID (not the default unsaved one)
    if (isLoaded && currentGameId && currentGameId !== DEFAULT_GAME_ID) {
      console.log(`Auto-saving state for game ID: ${currentGameId}`);
      try {
        // 1. Create the current game state snapshot (excluding history)
        const currentSnapshot: AppState = {
          playersOnField,
          opponents,
          drawings,
          // REMOVED: availablePlayers,
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
        };

        // 2. Read the *current* collection from localStorage
        let allSavedGames: SavedGamesCollection = {};
        const savedGamesJSON = localStorage.getItem(SAVED_GAMES_KEY);
        if (savedGamesJSON) {
          try {
            allSavedGames = JSON.parse(savedGamesJSON);
          } catch (e) { console.error("Error parsing saved games from localStorage:", e); }
        }
        
        // 3. Update the specific game in the collection
        const updatedSavedGamesCollection = {
          ...allSavedGames,
          [currentGameId]: currentSnapshot // Use idToSave here
        };

        // 4. Save the updated collection back to localStorage
        localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(updatedSavedGamesCollection));
        
        // 5. Save App Settings (only the current game ID)
        const currentSettings: AppSettings = { currentGameId };
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(currentSettings));

      } catch (error) {
        console.error("Failed to auto-save state to localStorage:", error);
      }
    } else if (isLoaded && currentGameId === DEFAULT_GAME_ID) {
      console.log("Not auto-saving as this is an unsaved game (no ID assigned yet)");
    }
    // Dependencies: Include all state variables that are part of the saved snapshot
  }, [isLoaded, currentGameId,
      playersOnField, opponents, drawings, // REMOVED: availablePlayers,
      showPlayerNames, teamName,
      gameEvents, opponentName, gameDate, homeScore, awayScore, gameNotes,
      numberOfPeriods, periodDurationMinutes, // ADDED back dependencies
      currentPeriod, gameStatus,
      selectedPlayerIds, seasonId, tournamentId, 
      gameLocation, gameTime, subIntervalMinutes, 
      completedIntervalDurations, lastSubConfirmationTimeSeconds
    ]);

  // **** ADDED: Effect to prompt for setup if opponent name is default ****
  useEffect(() => {
    // Only run this check after the initial load is complete
    // and if the user hasn't explicitly skipped the setup
    // REMOVED CHECK: and the modal isn't already open (e.g., from the load effect)
    // Check if opponent name is still the default after loading, and we haven't skipped.
    if (isLoaded && opponentName === 'Opponent' && !hasSkippedInitialSetup) {
      console.log('Opponent name is default after load, prompting for setup...');
      // Avoid reopening if it was just closed by the setup function
      // We might need a more robust check here later if this isn't enough.
      // For now, relying on opponentName having been updated by the load effect.
      setIsNewGameSetupModalOpen(true);
    }
    // REMOVED isNewGameSetupModalOpen from dependencies
  }, [isLoaded, opponentName, hasSkippedInitialSetup]); // Dependencies for the check

  // --- Fullscreen API Logic ---
  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  useEffect(() => {
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange); // Safari/Chrome
    document.addEventListener('mozfullscreenchange', handleFullscreenChange); // Firefox
    document.addEventListener('MSFullscreenChange', handleFullscreenChange); // IE/Edge

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, [handleFullscreenChange]);

  const toggleFullScreen = async () => {
    const elem = document.documentElement; // Target the whole page

    if (!document.fullscreenElement) {
      try {
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ('webkitRequestFullscreen' in elem && typeof elem.webkitRequestFullscreen === 'function') { /* Safari */
          await elem.webkitRequestFullscreen();
        } else if ('msRequestFullscreen' in elem && typeof elem.msRequestFullscreen === 'function') { /* IE11 */
          await elem.msRequestFullscreen();
        }
        setIsFullscreen(true);
      } catch (err) {
        // Type check for error handling
        if (err instanceof Error) {
            console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        } else {
            console.error(`An unknown error occurred attempting to enable full-screen mode:`, err);
        }
        setIsFullscreen(false); // Ensure state is correct if request fails
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ('webkitExitFullscreen' in document && typeof document.webkitExitFullscreen === 'function') { /* Safari */
          await document.webkitExitFullscreen();
        } else if ('msExitFullscreen' in document && typeof document.msExitFullscreen === 'function') { /* IE11 */
          await document.msExitFullscreen();
        }
        setIsFullscreen(false);
      } catch (err) {
        // Type check for error handling
         if (err instanceof Error) {
             console.error(`Error attempting to disable full-screen mode: ${err.message} (${err.name})`);
         } else {
             console.error(`An unknown error occurred attempting to disable full-screen mode:`, err);
         }
         // State might already be false due to event listener, but set explicitly just in case
         setIsFullscreen(false);
      }
    }
  };

  // --- Player Management Handlers (Updated for relative coords) ---
  // Wrapped handleDropOnField in useCallback as suggested (line 500)
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
    const newHomeScore = homeScore + 1; // Increment home score when logging a goal
    
    setGameEvents(newGameEvents);
    setHomeScore(newHomeScore); // Update the home score
    // REMOVED: Force new reference for availablePlayers state as well
    // setAvailablePlayers(prev => [...prev]); 
    saveStateToHistory({ 
      gameEvents: newGameEvents,
      homeScore: newHomeScore // Include updated score in history
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
    const newAwayScore = awayScore + 1;

    setGameEvents(newGameEvents);
    setAwayScore(newAwayScore);
    // REMOVED: Force new reference for availablePlayers state as well
    // setAvailablePlayers(prev => [...prev]);
    saveStateToHistory({ 
      gameEvents: newGameEvents, 
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
        newHomeScore = Math.max(0, homeScore - 1); // Decrement home score
    } else if (eventToDelete.type === 'opponentGoal') {
        newAwayScore = Math.max(0, awayScore - 1); // Decrement away score
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
  const handleHardResetApp = useCallback(() => {
    if (window.confirm(t('controlBar.hardResetConfirmation') ?? "Are you sure you want to completely reset the application? All saved data (players, stats, positions) will be permanently lost.")) {
      try {
        console.log("Performing hard reset...");
        localStorage.removeItem(SAVED_GAMES_KEY);
        localStorage.removeItem(APP_SETTINGS_KEY);
        localStorage.removeItem(SEASONS_LIST_KEY);
        localStorage.removeItem(TOURNAMENTS_LIST_KEY);
        window.location.reload();
      } catch (error) {
        console.error("Error during hard reset:", error);
        // Optionally show an error message to the user
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
    
    // Determine the ID to save under
    let idToSave: string;
    const isOverwriting = currentGameId && currentGameId !== DEFAULT_GAME_ID;

    if (isOverwriting) {
      // Use the existing game ID if we are overwriting
      idToSave = currentGameId;
      console.log(`Overwriting existing game with ID: ${idToSave}`);
    } else {
      // Generate a new ID if it's a new save or the default unsaved state
      idToSave = `game_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      console.log(`Saving as new game with ID: ${idToSave}`);
    }

    let saveSuccess = false;

    try {
      // 1. Create the current game state snapshot
      // Ensure location and time from component state are included
      const currentSnapshot: AppState = {
        playersOnField,
        opponents,
        drawings,
        // REMOVED: availablePlayers,
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
        gameLocation, // Include current gameLocation state
        gameTime, // Include current gameTime state
        // Add timer related state
        subIntervalMinutes,
        completedIntervalDurations,
        lastSubConfirmationTimeSeconds,
      };

      // 2. Update the savedGames state and localStorage using the determined ID
      const updatedSavedGames = { 
        ...savedGames, 
        [idToSave]: currentSnapshot // Use idToSave here
      };
      setSavedGames(updatedSavedGames); // Update state in memory
      localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(updatedSavedGames));

      // 3. Update the current game ID ONLY IF it was a NEW save
      //    Also update settings in localStorage
      if (!isOverwriting) {
        setCurrentGameId(idToSave);
        const currentSettings: AppSettings = { currentGameId: idToSave };
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(currentSettings));
      } else {
        // If overwriting, ensure the settings still point to the correct (existing) ID
        const currentSettings: AppSettings = { currentGameId: idToSave };
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(currentSettings));
      }
      
      console.log(`Game saved successfully with ID: ${idToSave}`);
      // History for the newly saved/overwritten game should start fresh
      setHistory([currentSnapshot]);
      setHistoryIndex(0);
      saveSuccess = true; // Mark save as successful

    } catch (error) {
      console.error("Failed to save game state:", error);
      alert("Error saving game."); // Notify user
      saveSuccess = false;
    }

    handleCloseSaveGameModal(); // Close save modal regardless of success/error

    // If save was successful AND we were intending to start a new game, open the setup modal
    if (saveSuccess && isStartingNewGameAfterSave) {
      console.log("Save successful, opening new game setup modal...");
      setIsNewGameSetupModalOpen(true);
      setIsStartingNewGameAfterSave(false); // Reset the flag
    }
  };

  // Function to handle loading a selected game
  const handleLoadGame = (gameId: string) => {
    console.log(`Loading game with ID: ${gameId}`);
    const stateToLoad = savedGames[gameId];

    if (stateToLoad) {
      try {
        // Apply the loaded state
        setPlayersOnField(stateToLoad.playersOnField);
        setOpponents(stateToLoad.opponents || []);
        setDrawings(stateToLoad.drawings);
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

        // Reset session-specific state
        setHistory([stateToLoad]);
        setHistoryIndex(0);
        setTimeElapsedInSeconds(0);
        setIsTimerRunning(false);
        setSubAlertLevel('none');

        // Update current game ID and save settings
        setCurrentGameId(gameId);
        const currentSettings: AppSettings = { currentGameId: gameId };
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(currentSettings));

        console.log(`Game ${gameId} loaded successfully.`);
        handleCloseLoadGameModal();

      } catch(error) {
          console.error("Error applying loaded game state:", error);
          alert("Error loading game state.");
      }
    } else {
      console.error(`Game state not found for ID: ${gameId}`);
      alert(`Could not find saved game: ${gameId}`);
    }
  };

  // Function to handle deleting a saved game
  const handleDeleteGame = (gameId: string) => {
    console.log(`Deleting game with ID: ${gameId}`);
    if (gameId === DEFAULT_GAME_ID) {
      console.warn("Cannot delete the default unsaved state.");
      return; // Prevent deleting the default placeholder
    }

    try {
      // Create a new collection excluding the deleted game
      const updatedSavedGames = { ...savedGames };
      delete updatedSavedGames[gameId];

      setSavedGames(updatedSavedGames); // Update state
      localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(updatedSavedGames)); // Update storage

      console.log(`Game ${gameId} deleted.`);

      // If the deleted game was the currently loaded one, load the default state
      if (currentGameId === gameId) {
        console.log("Currently loaded game was deleted. Loading default state.");
        handleLoadGame(DEFAULT_GAME_ID); // Load the default (might be empty or last unsaved)
      }
      // Keep the modal open after delete? Or close? Let's keep it open for now.
      // handleCloseLoadGameModal(); 

    } catch (error) {
      console.error("Error deleting game state:", error);
      alert("Error deleting saved game.");
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
        .sort((a: any, b: any) => b.totalScore - a.totalScore || b.goals - a.goals); // Sort by points, then goals
        
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
      .sort((a: any, b: any) => b.totalScore - a.totalScore || b.goals - a.goals); // Sort by points, then goals
      
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
  const openRosterModal = () => setIsRosterModalOpen(true);
  const closeRosterModal = () => setIsRosterModalOpen(false);

  
  const handleSetJerseyNumber = useCallback((playerId: string, number: string) => {
    const updatedAvailable = availablePlayers.map(p => p.id === playerId ? { ...p, jerseyNumber: number } : p);
    const updatedOnField = playersOnField.map(p => p.id === playerId ? { ...p, jerseyNumber: number } : p);

    setAvailablePlayers(updatedAvailable);
    setPlayersOnField(updatedOnField);
    // Save updated global roster
    localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(updatedAvailable));
    // Save only playersOnField change to game history (if needed)
    saveStateToHistory({ playersOnField: updatedOnField });
    console.log(`Set jersey number for ${playerId} to ${number}`);
  }, [availablePlayers, playersOnField, setAvailablePlayers, setPlayersOnField, saveStateToHistory]);

  const handleSetPlayerNotes = useCallback((playerId: string, notes: string) => {
    const updatedAvailable = availablePlayers.map(p => p.id === playerId ? { ...p, notes: notes } : p);
    // Notes likely don't need to be tracked for playersOnField unless displayed there

    setAvailablePlayers(updatedAvailable);
    // Save updated global roster
    localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(updatedAvailable));
    // No game history change needed for notes unless they affect playersOnField
    // saveStateToHistory({ availablePlayers: updatedAvailable /*, playersOnField: updatedOnField */ });
    console.log(`Set notes for ${playerId}`);
    // Removed playersOnField dependencies as they aren't used
  }, [availablePlayers, setAvailablePlayers, /* playersOnField, setPlayersOnField, */ saveStateToHistory]);

  const handleRemovePlayerFromRoster = useCallback((playerId: string) => {
    if (window.confirm(`Are you sure you want to remove player ${availablePlayers.find(p=>p.id === playerId)?.name ?? playerId} from the roster? This cannot be undone easily.`)) {
      const updatedAvailable = availablePlayers.filter(p => p.id !== playerId);
      const updatedOnField = playersOnField.filter(p => p.id !== playerId); // Also remove from field
      const updatedSelectedIds = selectedPlayerIds.filter(id => id !== playerId); // Also remove from selection

      setAvailablePlayers(updatedAvailable);
      setPlayersOnField(updatedOnField);
      setSelectedPlayerIds(updatedSelectedIds); // Update selection state
      // Save updated global roster
      localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(updatedAvailable));
      // Save field and selection changes to game history
      saveStateToHistory({ playersOnField: updatedOnField, selectedPlayerIds: updatedSelectedIds });
      console.log(`Removed player ${playerId} from roster, field, and selection.`);
    }
    // Added selectedPlayerIds and setSelectedPlayerIds dependencies
  }, [availablePlayers, playersOnField, selectedPlayerIds, setAvailablePlayers, setPlayersOnField, setSelectedPlayerIds, saveStateToHistory]);

  // --- NEW: Handler to Award Fair Play Card ---
  const handleAwardFairPlayCard = useCallback((playerId: string | null) => {
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
      localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(updatedAvailablePlayers));
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

  // --- Handler to Add a Player to the Roster (Updated) ---
  const handleAddPlayer = useCallback((playerData: { name: string; jerseyNumber: string; notes: string; nickname: string }) => {
    const newPlayer: Player = {
        id: `player-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: playerData.name,
        nickname: playerData.nickname, // Add nickname
        jerseyNumber: playerData.jerseyNumber,
        notes: playerData.notes,
        isGoalie: false, // Default new players to not be goalies
        // relX, relY will be undefined initially
    };

    const updatedAvailable = [...availablePlayers, newPlayer];
    setAvailablePlayers(updatedAvailable); // Update state hook
    // Save updated global roster
    localStorage.setItem(MASTER_ROSTER_KEY, JSON.stringify(updatedAvailable));
    // Add the new player to the current game's selection automatically
    const updatedSelectedIds = [...selectedPlayerIds, newPlayer.id];
    setSelectedPlayerIds(updatedSelectedIds);
    // Save the selection change to game history
    saveStateToHistory({ selectedPlayerIds: updatedSelectedIds });
    console.log(`Added new player: ${newPlayer.name} (ID: ${newPlayer.id}). Saved roster and updated selection.`);
    // Added selectedPlayerIds, setSelectedPlayerIds dependencies
  }, [availablePlayers, selectedPlayerIds, setAvailablePlayers, setSelectedPlayerIds, saveStateToHistory]);

  // ---- MOVE handleStartNewGame UP ----
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
        // User chose OK (Save) -> Set flag, open save modal, and stop here.
        // handleSaveGame will handle opening the new game modal after save.
        console.log("User chose to save before starting new game.");
        setIsStartingNewGameAfterSave(true);
        handleOpenSaveGameModal();
        return; // Stop the flow here; saving process takes over
      } else {
        // User chose Cancel (Discard) -> Proceed to next confirmation
        console.log("Discarding current game changes to start new game.");
        // Reset the flag just in case (shouldn't be needed, but good practice)
        setIsStartingNewGameAfterSave(false);
      }
    }

    // Confirmation for actually starting new game (shown always after discard, or directly if default game)
    if (window.confirm(t('controlBar.startNewMatchConfirmation', 'Are you sure you want to start a new match? Any unsaved progress will be lost.') ?? 'Are you sure?')) {
      console.log("Start new game confirmed, opening setup modal..." );
      setIsNewGameSetupModalOpen(true); // Open the setup modal
    } else {
      // If user cancels the second confirmation, reset the flag
      setIsStartingNewGameAfterSave(false);
    }
  }, [t, currentGameId, savedGames, handleOpenSaveGameModal]); // Dependencies
  // ---- END MOVE handleStartNewGame UP ----

  // --- NEW: Quick Save Handler ---
  const handleQuickSaveGame = useCallback(() => {
    if (currentGameId && currentGameId !== DEFAULT_GAME_ID) {
      console.log(`Quick saving game with ID: ${currentGameId}`);
      try {
        // 1. Create the current game state snapshot
        const currentSnapshot: AppState = {
          playersOnField,
          opponents,
          drawings,
          // REMOVED: availablePlayers,
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
        };

        // 2. Update the savedGames state and localStorage
        const updatedSavedGames = { ...savedGames, [currentGameId]: currentSnapshot };
        setSavedGames(updatedSavedGames);
        localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(updatedSavedGames));

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
      console.log("No current game ID, opening Save As modal instead.");
      handleOpenSaveGameModal();
    }
  }, [
    currentGameId,
    savedGames,
    playersOnField,
    opponents,
    drawings,
    // REMOVED: availablePlayers,
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
    handleOpenSaveGameModal, // Added dependency
    subIntervalMinutes,
    completedIntervalDurations,
    lastSubConfirmationTimeSeconds
  ]);
  // --- END Quick Save Handler ---

  // --- NEW: Handlers for Game Settings Modal --- (Placeholder open/close)
  
  const handleOpenGameSettingsModal = () => {
    // REMOVE check: No longer needed as we always generate an ID
    // if (currentGameId && currentGameId !== DEFAULT_GAME_ID) {
      setIsGameSettingsModalOpen(true);
    // } else {
    //   alert(t('gameSettings.noGameLoadedError', 'Cannot edit settings. No game loaded or current game is unsaved.') ?? 'No game loaded to edit settings.');
    // }
  };
  const handleCloseGameSettingsModal = () => {
    setIsGameSettingsModalOpen(false);
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

  // --- NEW Handlers for Setting Season/Tournament ID ---
  const handleSetSeasonId = (newSeasonId: string | null) => {
    const idToSet = newSeasonId || ''; // Ensure empty string instead of null
    setSeasonId(idToSet);
    // If setting a season, clear the tournament
    if (idToSet) setTournamentId(''); 
    saveStateToHistory({ seasonId: idToSet, tournamentId: idToSet ? '' : tournamentId });
    console.log(`[page.tsx] Set Season ID to: ${idToSet}. Cleared Tournament ID.`);
  };

  const handleSetTournamentId = (newTournamentId: string | null) => {
    const idToSet = newTournamentId || ''; // Ensure empty string instead of null
    setTournamentId(idToSet);
    // If setting a tournament, clear the season
    if (idToSet) setSeasonId('');
    saveStateToHistory({ tournamentId: idToSet, seasonId: idToSet ? '' : seasonId });
    console.log(`[page.tsx] Set Tournament ID to: ${idToSet}. Cleared Season ID.`);
  };

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
  
  const handleExportAggregateJson = useCallback((gameIds: string[], aggregateStats: PlayerStatRow[]) => {
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

  const handleExportAggregateCsv = useCallback((gameIds: string[], aggregateStats: PlayerStatRow[]) => {
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
  const handleStartNewGameWithSetup = useCallback((
    opponentName: string,
    gameDate: string,
    gameLocation: string,
    gameTime: string,
    seasonId: string | null,
    tournamentId: string | null,
    numPeriods: 1 | 2, // Parameter
    periodDuration: number // Parameter
  ) => {
      // ADD LOGGING HERE:
      console.log('[handleStartNewGameWithSetup] Received Params:', { numPeriods, periodDuration });
      // No need to log initialState references anymore

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
          teamName: teamName, // Use current teamName state
          // Roster/Player State - Roster is global
          // REMOVED: availablePlayers: availablePlayers,
          selectedPlayerIds: availablePlayers.map(p => p.id), // <-- BASE ON CURRENT GLOBAL ROSTER
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
        const updatedSavedGames = {
          ...savedGames,
          [newGameId]: newGameState
        };
        setSavedGames(updatedSavedGames);
        localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(updatedSavedGames));
        console.log(`Explicitly saved initial state for new game ID: ${newGameId}`);

        const currentSettings: AppSettings = { currentGameId: newGameId };
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(currentSettings));
        console.log(`Updated app settings with new game ID: ${newGameId}`);

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
      setIsStartingNewGameAfterSave(false);

  }, [
    // Keep necessary dependencies
    teamName,
    savedGames,
    availablePlayers, // Still need availablePlayers to derive selectedPlayerIds
    initialState.subIntervalMinutes, // Explicitly depend on the default value used
    setSavedGames,
    setHistory,
    setHistoryIndex,
    setCurrentGameId,
    setIsNewGameSetupModalOpen,
    setIsStartingNewGameAfterSave
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

  // Render null or a loading indicator until state is loaded
  // Note: Console log added before the check itself
  if (!isLoaded) {
    // You might want a more sophisticated loading indicator
    console.log('Rendering Loading Indicator because !isLoaded');
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>;
  }

  // Final console log before returning the main JSX
  return (
    // Main container with flex column layout
    <div className="flex flex-col h-screen bg-gray-900 text-white relative">
      {/* REMOVED Fullscreen Toggle Button from here */}

      {/* Replace Suspense with a regular div */}
      <div className="flex flex-col h-full">
      {/* Top Player Bar - Filter players based on selection */}
      <PlayerBar
        players={playersForCurrentGame} // Pass the filtered list
        teamName={teamName}
        onTeamNameChange={handleTeamNameChange}
        // CORRECT prop name back to onPlayerDragStartFromBar
        onPlayerDragStartFromBar={handlePlayerDragStartFromBar}
        selectedPlayerIdFromBar={draggingPlayerFromBarInfo?.id} // Pass the selected ID
        onBarBackgroundClick={handleDeselectPlayer} // Pass deselect handler
        // REMOVE: onRenamePlayer prop
        // onRenamePlayer={handleRenamePlayer} 
        gameEvents={gameEvents} // Pass game events for badges
        onPlayerTapInBar={handlePlayerTapInBar} // Pass the new tap handler
        onToggleGoalie={handleToggleGoalie} // Pass the handler from the hook
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
          onToggleInstructions={handleToggleInstructions}
          onToggleTrainingResources={handleToggleTrainingResources}
          isFullscreen={isFullscreen}
          onToggleFullScreen={toggleFullScreen}
          onToggleGoalLogModal={handleToggleGoalLogModal}
          onToggleGameStatsModal={handleToggleGameStatsModal}
          onHardResetApp={handleHardResetApp}
          onOpenSaveGameModal={handleOpenSaveGameModal}
          onOpenLoadGameModal={handleOpenLoadGameModal}
          onStartNewGame={handleStartNewGame}
          onOpenRosterModal={openRosterModal} // Pass the handler
          onQuickSave={handleQuickSaveGame} // Pass the quick save handler
          // ADD props for Game Settings button
          onOpenGameSettingsModal={handleOpenGameSettingsModal}
          isGameLoaded={!!(currentGameId && currentGameId !== DEFAULT_GAME_ID)} // <-- CHECK FOR VALID GAME ID
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
          onSave={handleSaveGame} // Updated signature
          teamName={teamName}
          opponentName={opponentName}
          gameDate={gameDate}
          // We will need to pass season/tournament info here later
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
        />

        {/* Conditionally render the New Game Setup Modal */}
        {isNewGameSetupModalOpen && (
          <NewGameSetupModal
            isOpen={isNewGameSetupModalOpen}
            onStart={handleStartNewGameWithSetup} // CORRECTED Handler
            onCancel={handleCancelNewGameSetup} 
          />
        )}

        {/* Roster Settings Modal */}
        <RosterSettingsModal
          isOpen={isRosterModalOpen}
          onClose={closeRosterModal}
          availablePlayers={availablePlayers}
          onRenamePlayer={handleRenamePlayer}
          onToggleGoalie={handleToggleGoalie}
          onSetJerseyNumber={handleSetJerseyNumber}
          onSetPlayerNotes={handleSetPlayerNotes}
          onRemovePlayer={handleRemovePlayerFromRoster}
          onAddPlayer={handleAddPlayer} 
          // onRenamePlayer expects { name: string; nickname: string } from the hook now
          // onAwardFairPlayCard was removed
          // Pass selection state and handler (RE-ADD this)
          selectedPlayerIds={selectedPlayerIds}
          onTogglePlayerSelection={handleTogglePlayerSelection}
          teamName={teamName}
          onTeamNameChange={handleTeamNameChange}
        />

        {/* ADD the new Game Settings Modal - ADD missing props */}
        <GameSettingsModal
          isOpen={isGameSettingsModalOpen}
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
          selectedPlayerIds={selectedPlayerIds}
          seasonId={seasonId}
          tournamentId={tournamentId}
          numPeriods={numberOfPeriods}
          periodDurationMinutes={periodDurationMinutes}
          onNumPeriodsChange={handleSetNumberOfPeriods}
          onPeriodDurationChange={handleSetPeriodDuration}
          // Pass the new handlers
          onSeasonIdChange={handleSetSeasonId}
          onTournamentIdChange={handleSetTournamentId}
          savedGames={savedGames} // Pass the savedGames state down
        />

      </div>
    </div>
  );
}
