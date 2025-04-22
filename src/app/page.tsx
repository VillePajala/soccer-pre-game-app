'use client';

import React, { useState, useEffect, useCallback } from 'react';
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
  availablePlayers: Player[]; // Available players don't need coordinates
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
  availablePlayers: initialAvailablePlayersData, // Use the updated initial data
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
  gameStatus: 'notStarted',
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

// Define new localStorage keys for seasons and tournaments
export const SEASONS_LIST_KEY = 'soccerSeasonsList';
export const TOURNAMENTS_LIST_KEY = 'soccerTournamentsList';

// Define a default Game ID for the initial/unsaved state
const DEFAULT_GAME_ID = '__default_unsaved__';



export default function Home() {
  console.log('Before useTranslation');
  const { t } = useTranslation(); // Get translation function

  // --- History Management (Still needed here for now) ---
  console.log('Before useState(history)');
  const [history, setHistory] = useState<AppState[]>([initialState]);
  console.log('Before useState(historyIndex)');
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  console.log('Before useCallback(saveStateToHistory)');
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
  console.log('Before useGameState');
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
  console.log('Before useState(showPlayerNames)');
  const [showPlayerNames, setShowPlayerNames] = useState<boolean>(initialState.showPlayerNames);
  console.log('Before useState(teamName)');
  const [teamName, setTeamName] = useState<string>(initialState.teamName);
  console.log('Before useState(gameEvents)');
  const [gameEvents, setGameEvents] = useState<GameEvent[]>(initialState.gameEvents);
  console.log('Before useState(opponentName)');
  const [opponentName, setOpponentName] = useState<string>(initialState.opponentName);
  console.log('Before useState(gameDate)');
  const [gameDate, setGameDate] = useState<string>(initialState.gameDate);
  console.log('Before useState(homeScore)');
  const [homeScore, setHomeScore] = useState<number>(initialState.homeScore);
  console.log('Before useState(awayScore)');
  const [awayScore, setAwayScore] = useState<number>(initialState.awayScore);
  console.log('Before useState(gameNotes)');
  const [gameNotes, setGameNotes] = useState<string>(initialState.gameNotes);
  console.log('Before useState(numberOfPeriods)');
  const [numberOfPeriods, setNumberOfPeriods] = useState<1 | 2>(initialState.numberOfPeriods);
  console.log('Before useState(periodDurationMinutes)');
  const [periodDurationMinutes, setPeriodDurationMinutes] = useState<number>(initialState.periodDurationMinutes);
  console.log('Before useState(currentPeriod)');
  const [currentPeriod, setCurrentPeriod] = useState<number>(initialState.currentPeriod);
  console.log('Before useState(gameStatus)');
  const [gameStatus, setGameStatus] = useState<'notStarted' | 'inProgress' | 'periodEnd' | 'gameEnd'>(initialState.gameStatus);
  console.log('Before useState(selectedPlayerIds)');
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(initialState.selectedPlayerIds); // Add state for selected player IDs
  console.log('Before useState(seasonId)');
  const [seasonId, setSeasonId] = useState<string>(initialState.seasonId); // Initialize state for season ID
  console.log('Before useState(tournamentId)');
  const [tournamentId, setTournamentId] = useState<string>(initialState.tournamentId); // Initialize state for tournament ID
  // Add state for location and time
  console.log('Before useState(gameLocation)');
  const [gameLocation, setGameLocation] = useState<string>(initialState.gameLocation || '');
  console.log('Before useState(gameTime)');
  const [gameTime, setGameTime] = useState<string>(initialState.gameTime || '');
  // ... Timer state ...
  // ... Modal states ...
  // ... UI/Interaction states ...
  console.log('Before useState(isLoaded)');
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  console.log('Before useState(draggingPlayerFromBarInfo)');
  const [draggingPlayerFromBarInfo, setDraggingPlayerFromBarInfo] = useState<Player | null>(null);
  console.log('Before useState(isFullscreen)');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false); // RE-ADD Fullscreen state
  // Persistence state
  console.log('Before useState(savedGames)');
  const [savedGames, setSavedGames] = useState<SavedGamesCollection>({});
  console.log('Before useState(currentGameId)');
  const [currentGameId, setCurrentGameId] = useState<string | null>(DEFAULT_GAME_ID);

  // --- Timer State (Still needed here) ---
  console.log('Before useState(timeElapsedInSeconds)');
  const [timeElapsedInSeconds, setTimeElapsedInSeconds] = useState<number>(0);
  console.log('Before useState(isTimerRunning)');
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  console.log('Before useState(showLargeTimerOverlay)');
  const [showLargeTimerOverlay, setShowLargeTimerOverlay] = useState<boolean>(false); // State for overlay visibility
  
  // --- Substitution Timer State (Still needed here) ---
  console.log('Before useState(subIntervalMinutes)');
  const [subIntervalMinutes, setSubIntervalMinutes] = useState<number>(5); // Default to 5 min
  console.log('Before useState(nextSubDueTimeSeconds)');
  const [nextSubDueTimeSeconds, setNextSubDueTimeSeconds] = useState<number>(5 * 60);
  console.log('Before useState(subAlertLevel)');
  const [subAlertLevel, setSubAlertLevel] = useState<'none' | 'warning' | 'due'>('none'); 
  console.log('Before useState(completedIntervalDurations)');
  const [completedIntervalDurations, setCompletedIntervalDurations] = useState<IntervalLog[]>([]); // Use IntervalLog[]
  console.log('Before useState(lastSubConfirmationTimeSeconds)');
  const [lastSubConfirmationTimeSeconds, setLastSubConfirmationTimeSeconds] = useState<number>(0);
  
  // --- Modal States (Still needed here) ---
  console.log('Before useState(isInstructionsOpen)');
  const [isInstructionsOpen, setIsInstructionsOpen] = useState<boolean>(false);
  console.log('Before useState(isTrainingResourcesOpen)');
  const [isTrainingResourcesOpen, setIsTrainingResourcesOpen] = useState<boolean>(false); 
  console.log('Before useState(isGoalLogModalOpen)');
  const [isGoalLogModalOpen, setIsGoalLogModalOpen] = useState<boolean>(false); 
  console.log('Before useState(isGameStatsModalOpen)');
  const [isGameStatsModalOpen, setIsGameStatsModalOpen] = useState<boolean>(false);
  console.log('Before useState(isNewGameSetupModalOpen)');
  const [isNewGameSetupModalOpen, setIsNewGameSetupModalOpen] = useState<boolean>(false);
  console.log('Before useState(isSaveGameModalOpen)');
  const [isSaveGameModalOpen, setIsSaveGameModalOpen] = useState<boolean>(false);
  console.log('Before useState(isLoadGameModalOpen)');
  const [isLoadGameModalOpen, setIsLoadGameModalOpen] = useState<boolean>(false);
  console.log('Before useState(isRosterModalOpen)');
  const [isRosterModalOpen, setIsRosterModalOpen] = useState<boolean>(false); // State for the new modal
  console.log('Before useState(hasSkippedInitialSetup)');
  const [hasSkippedInitialSetup, setHasSkippedInitialSetup] = useState<boolean>(false); // <-- Add this state
  // Add state to track if new game setup should open after saving
  const [isStartingNewGameAfterSave, setIsStartingNewGameAfterSave] = useState<boolean>(false);
  // ADD state for the new Game Settings modal
  const [isGameSettingsModalOpen, setIsGameSettingsModalOpen] = useState<boolean>(false);

  // --- Handlers (Remaining in Home component or to be moved) ---
  // REMOVED: handlePlayerDrop (now comes from useGameState hook)
  // ... other handlers ...

  // --- Timer Effect ---
  console.log('Before useEffect(timer)');
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
  console.log('Before useEffect(initial load)');
  useEffect(() => {
    console.log('Initial Load Effect Triggered');
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
    setAvailablePlayers(stateToApply.availablePlayers);
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

  }, []); // Run only once on mount

  // --- Save state to localStorage --- 
  console.log('Before useEffect(auto-save)');
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
          [currentGameId]: currentSnapshot 
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
    // Dependencies: Only include state that defines the current game, plus isLoaded and currentGameId
  }, [isLoaded, currentGameId, 
      playersOnField, opponents, drawings, availablePlayers, showPlayerNames, teamName,
      gameEvents, opponentName, gameDate, homeScore, awayScore, gameNotes,
      numberOfPeriods, periodDurationMinutes, currentPeriod, gameStatus,
      selectedPlayerIds, // Add as dependency for saving
      seasonId, // Add season ID to dependencies
      tournamentId, // Add tournament ID to dependencies
      completedIntervalDurations,
      lastSubConfirmationTimeSeconds
    ]);

  // **** ADDED: Effect to prompt for setup if opponent name is default ****
  useEffect(() => {
    // Only run this check after the initial load is complete
    // and if the user hasn't explicitly skipped the setup
    // and the modal isn't already open (e.g., from the load effect)
    if (isLoaded && opponentName === 'Opponent' && !hasSkippedInitialSetup && !isNewGameSetupModalOpen) {
      console.log('Opponent name is default after load, prompting for setup...');
      setIsNewGameSetupModalOpen(true);
    }
  }, [isLoaded, opponentName, hasSkippedInitialSetup, isNewGameSetupModalOpen]); // Dependencies for the check

  // --- Fullscreen API Logic ---
  console.log('Before useCallback(handleFullscreenChange)');
  const handleFullscreenChange = useCallback(() => {
    setIsFullscreen(!!document.fullscreenElement);
  }, []);

  console.log('Before useEffect(fullscreen listener)');
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

  console.log('Before useCallback(toggleFullScreen)');
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
  console.log('Before useCallback(handleDropOnField)');
  const handleDropOnField = useCallback((playerId: string, relX: number, relY: number) => {
    const droppedPlayer = availablePlayers.find(p => p.id === playerId);
    if (droppedPlayer) {
      handlePlayerDrop(droppedPlayer, { relX, relY }); // Call the handler from the hook
    } else {
      console.error(`Dropped player with ID ${playerId} not found in availablePlayers.`);
    }
  // ADDED dependencies based on ESLint warning
  }, [availablePlayers, handlePlayerDrop]); 

  console.log('Before useCallback(handlePlayerMove)');
  const handlePlayerMove = useCallback((playerId: string, relX: number, relY: number) => {
    // Update visual state immediately
    setPlayersOnField(prevPlayers => 
      prevPlayers.map(p => 
        p.id === playerId ? { ...p, relX, relY } : p
      )
    );
    // State saved on move end
  // ADDED dependency based on ESLint warning (line 517)
  }, [setPlayersOnField]);

  console.log('Before useCallback(handlePlayerMoveEnd)');
  const handlePlayerMoveEnd = useCallback(() => {
    saveStateToHistory({ playersOnField });
  }, [playersOnField, saveStateToHistory]);

  console.log('Before useCallback(handlePlayerRemove)');
  const handlePlayerRemove = useCallback((playerId: string) => {
    console.log(`Removing player ${playerId} from field`);
    const updatedPlayersOnField = playersOnField.filter(p => p.id !== playerId);
    setPlayersOnField(updatedPlayersOnField);
    saveStateToHistory({ playersOnField: updatedPlayersOnField });
  }, [playersOnField, saveStateToHistory]); // Add dependencies
  


  // --- Reset Handler ---
  console.log('Before useCallback(handleResetField)');
  const handleResetField = useCallback(() => {
    // Update state directly
    setPlayersOnField([]);
    setOpponents([]);
    setDrawings([]);
    // Save reset state to history
    saveStateToHistory({ playersOnField: [], opponents: [], drawings: [] });
  // ADDED dependencies based on ESLint warning (line 538)
  }, [saveStateToHistory, setDrawings, setOpponents, setPlayersOnField]);

  // --- Touch Drag from Bar Handlers (Updated for relative coords) ---
  console.log('Before useCallback(handlePlayerDragStartFromBar)');
  const handlePlayerDragStartFromBar = useCallback((playerInfo: Player) => {
    // This is now primarily for HTML Drag and Drop OR potential long-press drag
    setDraggingPlayerFromBarInfo(playerInfo);
    console.log("Setting draggingPlayerFromBarInfo (Drag Start):", playerInfo);
  }, []);

  // NEW Handler for simple tap selection in the bar
  console.log('Before useCallback(handlePlayerTapInBar)');
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

  console.log('Before useCallback(handlePlayerDropViaTouch)');
  const handlePlayerDropViaTouch = useCallback((relX: number, relY: number) => {
    // This handler might be less relevant now if tap-on-field works
    if (draggingPlayerFromBarInfo) {
      console.log("Player Drop Via Touch (field):", { id: draggingPlayerFromBarInfo.id, relX, relY });
      handleDropOnField(draggingPlayerFromBarInfo.id, relX, relY); 
      setDraggingPlayerFromBarInfo(null); // Deselect player after placing
    }
  }, [draggingPlayerFromBarInfo, handleDropOnField]);

  console.log('Before useCallback(handlePlayerDragCancelViaTouch)');
  const handlePlayerDragCancelViaTouch = useCallback(() => {
    setDraggingPlayerFromBarInfo(null);
  }, []);

  // --- Toggle Player Names Handler ---
  console.log('Before handleTogglePlayerNames definition');
  const handleTogglePlayerNames = () => {
    console.log('Toggling player names');
    const nextShowNames = !showPlayerNames;
    setShowPlayerNames(nextShowNames);
    saveStateToHistory({ showPlayerNames: nextShowNames });
  };

  // --- Team Name Handler ---
  console.log('Before handleTeamNameChange definition');
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
  console.log('Before handleUndo definition');
  const handleUndo = () => {
    if (historyIndex > 0) {
      console.log("Undoing...");
      const prevStateIndex = historyIndex - 1;
      const prevState = history[prevStateIndex];
      setPlayersOnField(prevState.playersOnField);
      setOpponents(prevState.opponents);
      setDrawings(prevState.drawings);
      setAvailablePlayers(prevState.availablePlayers);
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

  console.log('Before handleRedo definition');
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      console.log("Redoing...");
      const nextStateIndex = historyIndex + 1;
      const nextState = history[nextStateIndex];
      setPlayersOnField(nextState.playersOnField);
      setOpponents(nextState.opponents);
      setDrawings(nextState.drawings);
      setAvailablePlayers(nextState.availablePlayers);
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
  console.log('Before handleStartPauseTimer definition');
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

  console.log('Before handleResetTimer definition');
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

  console.log('Before handleSubstitutionMade definition');
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

  console.log('Before handleSetSubInterval definition');
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

  console.log('Before handleToggleLargeTimerOverlay definition');
  const handleToggleLargeTimerOverlay = () => {
    setShowLargeTimerOverlay(!showLargeTimerOverlay);
  };

  console.log('Before handleToggleInstructions definition');
  const handleToggleInstructions = () => {
    setIsInstructionsOpen(!isInstructionsOpen);
  };

  // Handler to specifically deselect player when bar background is clicked
  console.log('Before handleDeselectPlayer definition');
  const handleDeselectPlayer = () => {
    if (draggingPlayerFromBarInfo) { // Only log if there was a selection
      console.log("Deselecting player by clicking bar background.");
      setDraggingPlayerFromBarInfo(null);
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  // Handler to open/close the goal log modal
  console.log('Before handleToggleGoalLogModal definition');
  const handleToggleGoalLogModal = () => {
    setIsGoalLogModalOpen(!isGoalLogModalOpen);
  };

  // Handler to add a goal event
  console.log('Before handleAddGoalEvent definition');
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
    saveStateToHistory({ 
      gameEvents: newGameEvents,
      homeScore: newHomeScore // Include updated score in history
    });
    setIsGoalLogModalOpen(false); // Close modal after logging
  };

  // NEW Handler to log an opponent goal
  console.log('Before handleLogOpponentGoal definition');
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
    saveStateToHistory({ 
      gameEvents: newGameEvents, 
      awayScore: newAwayScore 
    });
    setIsGoalLogModalOpen(false); // Close modal after logging
  };

  // Handler to update an existing game event
  console.log('Before handleUpdateGameEvent definition');
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
  console.log('Before handleDeleteGameEvent definition');
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
  console.log('Before useCallback(handleFinalizeNewGame)');
  // Update signature to accept seasonId/tournamentId from the modal
    // Update signature to accept seasonId/tournamentId from the modal
    const handleFinalizeNewGame = useCallback((newOpponentName: string, newGameDate: string, newGameLocation: string, newGameTime: string, selectedSeasonId: string | null, selectedTournamentId: string | null) => {
      console.log(`Finalizing new game start. Opponent: ${newOpponentName}, Date: ${newGameDate}, SeasonID: ${selectedSeasonId}, TournamentID: ${selectedTournamentId}, Location: ${newGameLocation}, Time: ${newGameTime}`);
  
      const newInitialStateForHistory: AppState = {
        ...initialState,
        playersOnField: [],
        opponents: [],
        drawings: [],
        availablePlayers: availablePlayers,
        teamName: teamName,
        gameEvents: [],
        opponentName: newOpponentName,
        gameDate: newGameDate,
        homeScore: 0,
        awayScore: 0,
        gameNotes: '',
        numberOfPeriods: initialState.numberOfPeriods,
        periodDurationMinutes: initialState.periodDurationMinutes,
        currentPeriod: 1,
        gameStatus: 'notStarted',
        selectedPlayerIds: availablePlayers.map(p => p.id),
        // Use the IDs passed from the modal
        seasonId: selectedSeasonId ?? '',
        tournamentId: selectedTournamentId ?? '',
        gameLocation: newGameLocation,
        gameTime: newGameTime,
        // Ensure defaults are applied when creating new game state
        subIntervalMinutes: initialState.subIntervalMinutes ?? 5,
        completedIntervalDurations: [], // Always start with empty for a new game
        lastSubConfirmationTimeSeconds: 0, // Always start with 0 for a new game
      };
  
      // Update component state directly from this new initial state, ensuring defaults
      setPlayersOnField(newInitialStateForHistory.playersOnField);
      setOpponents(newInitialStateForHistory.opponents);
      setDrawings(newInitialStateForHistory.drawings);
      setShowPlayerNames(newInitialStateForHistory.showPlayerNames);
      setTeamName(newInitialStateForHistory.teamName);
      setGameEvents(newInitialStateForHistory.gameEvents);
      setOpponentName(newInitialStateForHistory.opponentName);
      setGameDate(newInitialStateForHistory.gameDate);
      setHomeScore(newInitialStateForHistory.homeScore);
      setAwayScore(newInitialStateForHistory.awayScore);
      setGameNotes(newInitialStateForHistory.gameNotes);
      setNumberOfPeriods(newInitialStateForHistory.numberOfPeriods);
      setPeriodDurationMinutes(newInitialStateForHistory.periodDurationMinutes);
      setCurrentPeriod(newInitialStateForHistory.currentPeriod);
      setGameStatus(newInitialStateForHistory.gameStatus);
      setSelectedPlayerIds(newInitialStateForHistory.selectedPlayerIds);
      setSeasonId(newInitialStateForHistory.seasonId);
      setTournamentId(newInitialStateForHistory.tournamentId);
      // Use ?? '' for potentially undefined string values from initialState
      setGameLocation(newInitialStateForHistory.gameLocation ?? '');
      setGameTime(newInitialStateForHistory.gameTime ?? '');
      // Ensure sub-timer state is also reset using the guaranteed defaults
      setSubIntervalMinutes(newInitialStateForHistory.subIntervalMinutes ?? 5);
      setCompletedIntervalDurations(newInitialStateForHistory.completedIntervalDurations ?? []);
      setLastSubConfirmationTimeSeconds(newInitialStateForHistory.lastSubConfirmationTimeSeconds ?? 0);
  
      // Reset session timer state
      setTimeElapsedInSeconds(0);
      setIsTimerRunning(false);
      setSubAlertLevel('none');
  
      // Reset history
      setHistory([newInitialStateForHistory]);
      setHistoryIndex(0);
  
      // Auto-save logic
      if (newOpponentName.trim()) {
        const newGameId = `game_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const formattedTeam = teamName.replace(/\s+/g, '_');
        const formattedOpponent = newOpponentName.trim().replace(/\s+/g, '_');
        const defaultName = `${formattedTeam}_vs_${formattedOpponent}_${newGameDate || new Date().toISOString().split('T')[0]}`;
  
        const currentSnapshot: AppState = {
          ...newInitialStateForHistory
        };
  
        const updatedSavedGames = {
          ...savedGames,
          [newGameId]: currentSnapshot
        };
        setSavedGames(updatedSavedGames);
        localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(updatedSavedGames));
  
        setCurrentGameId(newGameId);
        const currentSettings: AppSettings = { currentGameId: newGameId };
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(currentSettings));
  
        console.log(`Automatically created save file: ${defaultName} (ID: ${newGameId})`);
      } else {
        setCurrentGameId(DEFAULT_GAME_ID);
        console.log("Setup skipped or incomplete - no auto-save created. User will need to save manually.");
      }
  
      console.log("Session state reset with new game info.");
      setIsNewGameSetupModalOpen(false); // Close the setup modal
      // Dependencies updated to reflect parameters and used state
    }, [availablePlayers, savedGames, setDrawings, setOpponents, setPlayersOnField, teamName, initialState.numberOfPeriods, initialState.periodDurationMinutes, initialState.subIntervalMinutes]);
  
  // NEW: Handler to cancel the new game setup
  console.log('Before useCallback(handleCancelNewGameSetup)');
  const handleCancelNewGameSetup = useCallback(() => {
    console.log("New game setup cancelled.");
    setHasSkippedInitialSetup(true); // <-- Add the skip flag logic here
    setIsNewGameSetupModalOpen(false);
  }, []);

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
  console.log('Before handleSetNumberOfPeriods definition');
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

  console.log('Before handleSetPeriodDuration definition');
  const handleSetPeriodDuration = (minutes: number) => {
    const newMinutes = Math.max(1, minutes);
    setPeriodDurationMinutes(newMinutes);
    saveStateToHistory({ periodDurationMinutes: newMinutes }); // Save immediately
    console.log(`Period duration set to: ${newMinutes} minutes.`);
    
  };

  // Training Resources Modal
  console.log('Before handleToggleTrainingResources definition');
  const handleToggleTrainingResources = () => {
    setIsTrainingResourcesOpen(!isTrainingResourcesOpen);
  };

  // NEW: Handler for Hard Reset
  console.log('Before useCallback(handleHardResetApp)');
  const handleHardResetApp = useCallback(() => {
    if (window.confirm(t('controlBar.hardResetConfirmation') ?? "Are you sure you want to completely reset the application? All saved data (players, stats, positions) will be permanently lost.")) {
      try {
        console.log("Performing hard reset...");
        localStorage.removeItem(SAVED_GAMES_KEY);
        localStorage.removeItem(APP_SETTINGS_KEY);
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
  console.log('Before handleOpenSaveGameModal definition');
  const handleOpenSaveGameModal = useCallback(() => { // Wrap in useCallback
    console.log("Opening Save Game Modal...");
    setIsSaveGameModalOpen(true);
  }, []); // Add dependency array

  console.log('Before handleCloseSaveGameModal definition');
  const handleCloseSaveGameModal = () => {
    setIsSaveGameModalOpen(false);
  };

  console.log('Before handleOpenLoadGameModal definition');
  const handleOpenLoadGameModal = () => {
    console.log("Opening Load Game Modal...");
    setIsLoadGameModalOpen(true);
  };

  console.log('Before handleCloseLoadGameModal definition');
  const handleCloseLoadGameModal = () => {
    setIsLoadGameModalOpen(false);
  };

  // Function to handle the actual saving
  console.log('Before handleSaveGame definition');
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
        availablePlayers,
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
  console.log('Before handleLoadGame definition');
  const handleLoadGame = (gameId: string) => {
    console.log(`Loading game with ID: ${gameId}`);
    const stateToLoad = savedGames[gameId];

    if (stateToLoad) {
      try {
        // Apply the loaded state
        setPlayersOnField(stateToLoad.playersOnField);
        setOpponents(stateToLoad.opponents || []);
        setDrawings(stateToLoad.drawings);
        setAvailablePlayers(stateToLoad.availablePlayers);
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
  console.log('Before handleDeleteGame definition');
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
  console.log('Before handleExportAllGamesJson definition');
  const handleExportAllGamesJson = () => {
    const gameIdsToExport = Object.keys(savedGames).filter(id => id !== DEFAULT_GAME_ID);

    if (gameIdsToExport.length === 0) {
        alert(t('loadGameModal.noGamesToExport', 'No saved games to export.'));
        return;
    }

    const gamesToExport = gameIdsToExport.reduce((acc, id) => {
        acc[id] = savedGames[id];
        return acc;
    }, {} as SavedGamesCollection);

    try {
      const jsonString = JSON.stringify(gamesToExport, null, 2); // Export only filtered games
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      // Generate filename with timestamp and filter
      const now = new Date();
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
      const filterName = 'All';
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
  console.log('Before escapeCsvField definition');
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
  console.log('Before formatTime definition');
  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Function to export all saved games as Excel/CSV (RENAMED & PARAMETERIZED)
  console.log('Before handleExportAllGamesCsv definition');
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
        const playerStats = game.availablePlayers?.map(player => {
          const goals = game.gameEvents?.filter(e => e.type === 'goal' && e.scorerId === player.id).length || 0;
          const assists = game.gameEvents?.filter(e => e.type === 'goal' && e.assisterId === player.id).length || 0;
          const totalScore = goals + assists;
          // Include fairPlay status
          return { name: player.name, goals, assists, totalScore, fairPlay: player.receivedFairPlayCard };
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
                const scorerName = event.type === 'goal' 
                  ? game.availablePlayers?.find(p => p.id === event.scorerId)?.name ?? event.scorerId // Fallback to ID if not found
                  : game.opponentName || 'Opponent'; // Use game's opponent name for opponent goals
                const assisterName = event.type === 'goal' && event.assisterId
                  ? game.availablePlayers?.find(p => p.id === event.assisterId)?.name ?? event.assisterId // Fallback to ID
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
      const filterName = 'All'; // Corrected filterName usage
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
  console.log('Before handleExportOneJson definition');
  const handleExportOneJson = (gameId: string) => {
    const gameData = savedGames[gameId];
    if (!gameData) {
      alert(`Error: Could not find game data for ${gameId}`);
      return;
    }
    console.log(`Exporting game ${gameId} as JSON...`);
    try {
      const jsonString = JSON.stringify({ [gameId]: gameData }, null, 2); // Export as { gameId: gameData }
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

  console.log('Before handleExportOneCsv definition');
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
      const playerStats = game.availablePlayers?.map(player => {
        const goals = game.gameEvents?.filter(e => e.type === 'goal' && e.scorerId === player.id).length || 0;
        const assists = game.gameEvents?.filter(e => e.type === 'goal' && e.assisterId === player.id).length || 0;
        const totalScore = goals + assists;
        // Include fairPlay status
        return { name: player.name, goals, assists, totalScore, fairPlay: player.receivedFairPlayCard };
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
            const scorerName = event.type === 'goal' 
              ? game.availablePlayers?.find(p => p.id === event.scorerId)?.name ?? event.scorerId // Fallback to ID if not found
              : game.opponentName || 'Opponent'; // Use game's opponent name for opponent goals
            const assisterName = event.type === 'goal' && event.assisterId
              ? game.availablePlayers?.find(p => p.id === event.assisterId)?.name ?? event.assisterId // Fallback to ID
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
  console.log('Before openRosterModal definition');
  const openRosterModal = () => setIsRosterModalOpen(true);
  console.log('Before closeRosterModal definition');
  const closeRosterModal = () => setIsRosterModalOpen(false);

  
  console.log('Before useCallback(handleSetJerseyNumber)');
  const handleSetJerseyNumber = useCallback((playerId: string, number: string) => {
    const updatedAvailable = availablePlayers.map(p => p.id === playerId ? { ...p, jerseyNumber: number } : p);
    const updatedOnField = playersOnField.map(p => p.id === playerId ? { ...p, jerseyNumber: number } : p);

    setAvailablePlayers(updatedAvailable);
    setPlayersOnField(updatedOnField);
    saveStateToHistory({ availablePlayers: updatedAvailable, playersOnField: updatedOnField });
    console.log(`Set jersey number for ${playerId} to ${number}`);
  }, [availablePlayers, playersOnField, setAvailablePlayers, setPlayersOnField, saveStateToHistory]);

  console.log('Before useCallback(handleSetPlayerNotes)');
  const handleSetPlayerNotes = useCallback((playerId: string, notes: string) => {
    const updatedAvailable = availablePlayers.map(p => p.id === playerId ? { ...p, notes: notes } : p);
    // Notes likely don't need to be tracked for playersOnField unless displayed there

    setAvailablePlayers(updatedAvailable);
    // setPlayersOnField(updatedOnField); // Only if notes are added to PlayerOnField type
    saveStateToHistory({ availablePlayers: updatedAvailable /*, playersOnField: updatedOnField */ });
    console.log(`Set notes for ${playerId}`);
  }, [availablePlayers, setAvailablePlayers, /* playersOnField, setPlayersOnField, */ saveStateToHistory]);

  console.log('Before useCallback(handleRemovePlayerFromRoster)');
  const handleRemovePlayerFromRoster = useCallback((playerId: string) => {
    if (window.confirm(`Are you sure you want to remove player ${availablePlayers.find(p=>p.id === playerId)?.name ?? playerId} from the roster? This cannot be undone easily.`)) {
      const updatedAvailable = availablePlayers.filter(p => p.id !== playerId);
      const updatedOnField = playersOnField.filter(p => p.id !== playerId); // Also remove from field

      setAvailablePlayers(updatedAvailable);
      setPlayersOnField(updatedOnField);
      saveStateToHistory({ availablePlayers: updatedAvailable, playersOnField: updatedOnField });
      console.log(`Removed player ${playerId} from roster and field.`);
    }
  }, [availablePlayers, playersOnField, setAvailablePlayers, setPlayersOnField, saveStateToHistory]);

  // --- NEW: Handler to Award Fair Play Card ---
  console.log('Before useCallback(handleAwardFairPlayCard)');
  const handleAwardFairPlayCard = useCallback((playerId: string | null) => {
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
          updatedAvailablePlayers = updatedAvailablePlayers.map(p =>
              p.id === playerId ? { ...p, receivedFairPlayCard: true } : p
          );
          updatedPlayersOnField = updatedPlayersOnField.map(p =>
              p.id === playerId ? { ...p, receivedFairPlayCard: true } : p
          );
      }
      // If playerId is null, we only cleared the existing card.
      // If playerId is the same as currentlyAwardedPlayerId, we cleared it and don't re-award.

      setAvailablePlayers(updatedAvailablePlayers);
      setPlayersOnField(updatedPlayersOnField);
      saveStateToHistory({ availablePlayers: updatedAvailablePlayers, playersOnField: updatedPlayersOnField });

      console.log(`Updated Fair Play card award. ${playerId ? `Awarded to ${playerId}` : 'Cleared'}`);
  }, [availablePlayers, playersOnField, setAvailablePlayers, setPlayersOnField, saveStateToHistory, currentGameId]);

  // --- NEW: Handler to Toggle Player Selection for Current Match ---
  console.log('Before useCallback(handleTogglePlayerSelection)');
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
  console.log('Before useCallback(handleAddPlayer)');
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
    saveStateToHistory({ availablePlayers: updatedAvailable }); // Save to session history
    console.log(`Added new player: ${newPlayer.name} (ID: ${newPlayer.id})`);
  }, [availablePlayers, setAvailablePlayers, saveStateToHistory]);

  // ---- MOVE handleStartNewGame UP ----
  console.log('Before useCallback(handleStartNewGame)');
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
    handleOpenSaveGameModal, // Added dependency
    subIntervalMinutes,
    completedIntervalDurations,
    lastSubConfirmationTimeSeconds
  ]);
  // --- END Quick Save Handler ---

  // --- NEW: Handlers for Game Settings Modal --- (Placeholder open/close)
  const handleOpenGameSettingsModal = () => {
    // Add check: Only open if a game is loaded (not default)
    if (currentGameId && currentGameId !== DEFAULT_GAME_ID) {
      setIsGameSettingsModalOpen(true);
    } else {
      alert(t('gameSettings.noGameLoadedError', 'Cannot edit settings. No game loaded or current game is unsaved.') ?? 'No game loaded to edit settings.');
    }
  };
  const handleCloseGameSettingsModal = () => {
    setIsGameSettingsModalOpen(false);
  };

  // --- Placeholder Handlers for GameSettingsModal (will be implemented properly later) ---
  const handleGameLocationChange = (location: string) => {
    setGameLocation(location);
    saveStateToHistory({ gameLocation: location });
  };
  const handleGameTimeChange = (time: string) => {
    setGameTime(time);
    saveStateToHistory({ gameTime: time });
  };

  // --- AGGREGATE EXPORT HANDLERS --- 
  
  // Helper to get Filter Name (Season/Tournament)
  const getFilterContextName = (tab: string, filterId: string, seasons: Season[], tournaments: Tournament[]): string => {
    if (tab === 'season' && filterId !== 'all') {
        return seasons.find(s => s.id === filterId)?.name || filterId;
    }
    if (tab === 'tournament' && filterId !== 'all') {
        return tournaments.find(t => t.id === filterId)?.name || filterId;
    }
    if (tab === 'overall') return 'Overall';
    return 'Unknown Filter'; // Fallback
  };
  
  console.log('Before handleExportAggregateJson definition');
  const handleExportAggregateJson = useCallback((gameIds: string[], aggregateStats: PlayerStatRow[]) => {
    console.log(`Exporting aggregate JSON for ${gameIds.length} games.`);
    if (gameIds.length === 0) {
        alert(t('export.noGamesInSelection', 'No games match the current filter.'));
        return;
    }

    // Retrieve full game data for the included IDs
    const gamesData = gameIds.reduce((acc, id) => {
        if (savedGames[id]) {
            acc[id] = savedGames[id];
        }
        return acc;
    }, {} as SavedGamesCollection);

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
  }, [savedGames, t]); // Dependency on savedGames and t

  console.log('Before handleExportAggregateCsv definition');
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
  }, [savedGames, t]); // Dependency on savedGames and t

  // --- END AGGREGATE EXPORT HANDLERS ---

  // Render null or a loading indicator until state is loaded
  // Note: Console log added before the check itself
  console.log('Before checking isLoaded');
  if (!isLoaded) {
    // You might want a more sophisticated loading indicator
    console.log('Rendering Loading Indicator because !isLoaded');
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>;
  }

  // Final console log before returning the main JSX
  console.log('Before returning main JSX');
  return (
    // Main container with flex column layout
    <div className="flex flex-col h-screen bg-gray-900 text-white relative">
      {/* REMOVED Fullscreen Toggle Button from here */}

      {/* Replace Suspense with a regular div */}
      <div className="flex flex-col h-full">
      {/* Top Player Bar - Filter players based on selection */}
      <PlayerBar
        players={availablePlayers.filter(p => selectedPlayerIds.includes(p.id))} // Pass only selected players
        onRenamePlayer={handleRenamePlayer} // Pass the handler from the hook
        teamName={teamName}
        onTeamNameChange={handleTeamNameChange}
        onPlayerDragStartFromBar={handlePlayerDragStartFromBar}
        selectedPlayerIdFromBar={draggingPlayerFromBarInfo?.id}
          onBarBackgroundClick={handleDeselectPlayer}
          gameEvents={gameEvents}
          onPlayerTapInBar={handlePlayerTapInBar}
          onToggleGoalie={handleToggleGoalie} // Pass the handler from the hook
        />
        
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
        timeElapsedInSeconds={timeElapsedInSeconds}
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
          isGameLoaded={currentGameId !== null && currentGameId !== DEFAULT_GAME_ID}
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
          onAwardFairPlayCard={handleAwardFairPlayCard}
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
            onStart={handleFinalizeNewGame} // Prop type matches function signature now
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
          onAwardFairPlayCard={handleAwardFairPlayCard}
          // Pass selection state and handler
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
          onAwardFairPlayCard={handleAwardFairPlayCard}
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
        />

      </div>
    </div>
  );
}
