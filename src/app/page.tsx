'use client';

import React, { useState, useEffect, useCallback } from 'react'; // REMOVED unused useRef
import SoccerField from '@/components/SoccerField';
import PlayerBar from '@/components/PlayerBar';
import ControlBar from '@/components/ControlBar';
import TimerOverlay from '@/components/TimerOverlay'; // Import TimerOverlay
import InstructionsModal from '@/components/InstructionsModal'; // Import InstructionsModal
import GoalLogModal from '@/components/GoalLogModal'; // Import GoalLogModal
import GameStatsModal from '@/components/GameStatsModal'; // Import GameStatsModal
import TrainingResourcesModal from '@/components/TrainingResourcesModal'; // Import new modal
import SaveGameModal, { GameType } from '@/components/SaveGameModal'; // Import the new modal
import LoadGameModal from '@/components/LoadGameModal'; // Import the new modal
import NewGameSetupModal from '@/components/NewGameSetupModal'; // Import the new component
import RosterSettingsModal from '@/components/RosterSettingsModal'; // Import the new Roster modal
import { useTranslation } from 'react-i18next'; // Make sure this is imported
import { useGameState, UseGameStateReturn } from '@/hooks/useGameState'; // Import the hook

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
  type: 'goal' | 'opponentGoal';
  time: number; // timeElapsedInSeconds at the moment of logging
  scorerId: string;
  scorerName: string; // Store name at time of event
  assisterId?: string;
  assisterName?: string; // Store name at time of event
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
  gameType: GameType; // Add game type
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
  gameType: 'season', // Default game type
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
  console.log('Before useState(gameType)');
  const [gameType, setGameType] = useState<GameType>(initialState.gameType); // Add state for game type
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
  const [completedIntervalDurations, setCompletedIntervalDurations] = useState<number[]>([]);
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
    console.log("Attempting to load settings and game states from localStorage...");
    let loadedState: AppState | null = null;
    let loadedGameId: string | null = DEFAULT_GAME_ID;

    try {
      // 1. Load App Settings
      const settingsJSON = localStorage.getItem(APP_SETTINGS_KEY);
      if (settingsJSON) {
        const settings: AppSettings = JSON.parse(settingsJSON);
        loadedGameId = settings.currentGameId ?? DEFAULT_GAME_ID; // Use saved game ID or default
        console.log("Loaded settings, currentGameId:", loadedGameId);
      } else {
        console.log("No app settings found, using default game ID.");
      }

      // 2. Load Saved Games Collection
      const savedGamesJSON = localStorage.getItem(SAVED_GAMES_KEY);
      let allGames: SavedGamesCollection = {};
      if (savedGamesJSON) {
        allGames = JSON.parse(savedGamesJSON);
        setSavedGames(allGames); // Store all loaded games in state
        console.log(`Loaded ${Object.keys(allGames).length} saved games.`);
      }

      // 3. Determine which game state to actually load into the app
      if (loadedGameId && allGames[loadedGameId]) {
        loadedState = allGames[loadedGameId];
        console.log(`Loading state for game ID: ${loadedGameId}`);
        setCurrentGameId(loadedGameId); // Set the current game ID state
      } else {
        console.log("No specific saved game found for the current ID, using initial state.");
        // If the default game exists, load it. Otherwise, use hardcoded initial.
        loadedState = allGames[DEFAULT_GAME_ID] ?? null;
        setCurrentGameId(DEFAULT_GAME_ID);
      }

      // 4. Apply the loaded or initial state to the app's state variables
      const stateToApply = loadedState ?? initialState;
      // IMPORTANT: History should probably be per-game. We need to rethink this.
      // For now, let's just load the single state snapshot, not the history.
      // setHistory(stateToApply.history || [stateToApply]); // OLD HISTORY LOADING
      // setHistoryIndex(stateToApply.historyIndex ?? 0); // OLD HISTORY LOADING
      setHistory([stateToApply]); // Start history with the loaded state
      setHistoryIndex(0);

      // Apply state fields (same as before, but from stateToApply)
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
      setNumberOfPeriods(stateToApply.numberOfPeriods || 2);
      setPeriodDurationMinutes(stateToApply.periodDurationMinutes || 10);
      setCurrentPeriod(stateToApply.currentPeriod || 1);
      setGameStatus(stateToApply.gameStatus || 'notStarted');
      // ADDED: Load selected players, defaulting to all if empty/missing
      setSelectedPlayerIds(
        stateToApply.selectedPlayerIds && stateToApply.selectedPlayerIds.length > 0
          ? stateToApply.selectedPlayerIds
          : stateToApply.availablePlayers.map(p => p.id) // Default to all players in loaded state
      );
      // ADDED: Load game type, defaulting if missing
      setGameType(stateToApply.gameType || 'season'); 

      // Reset timer state when loading any game state initially?
      setTimeElapsedInSeconds(0);
      setIsTimerRunning(false);
      setSubAlertLevel('none');
      // Reset other timer/sub related state? Needs consideration.

    } catch (error) {
      console.error("Failed to load or parse state from localStorage:", error);
      // Fallback to complete initial state if any error occurs
      setPlayersOnField(initialState.playersOnField);
      // ... reset all other state variables to initialState values ...
      setHistory([initialState]);
      setHistoryIndex(0);
      setCurrentGameId(DEFAULT_GAME_ID);
      setSavedGames({});
    } finally { // Use finally to ensure this runs after load attempt
        // Determine if we need to show the setup modal AFTER loading
        const finalOpponentName = loadedState?.opponentName ?? initialState.opponentName;
        if (finalOpponentName === 'Opponent' && !hasSkippedInitialSetup) { // <-- Added !hasSkippedInitialSetup check
            console.log('Opponent name is default after load, prompting for setup...');
            setIsNewGameSetupModalOpen(true);
        }
        setIsLoaded(true); // Mark loading as complete
    }
  }, [setAvailablePlayers, setDrawings, setOpponents, setPlayersOnField, hasSkippedInitialSetup]); // <-- Add hasSkippedInitialSetup to dependency array

  // --- Save state to localStorage --- 
  console.log('Before useEffect(auto-save)');
  useEffect(() => {
    // Check if loaded and we have a game ID to save under
    if (isLoaded && currentGameId) { 
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
          selectedPlayerIds: initialState.selectedPlayerIds, // Include selectedPlayerIds
          gameType: initialState.gameType, // Include gameType in the saved state
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
    }
    // Dependencies: Only include state that defines the current game, plus isLoaded and currentGameId
  }, [isLoaded, currentGameId, 
      playersOnField, opponents, drawings, availablePlayers, showPlayerNames, teamName,
      gameEvents, opponentName, gameDate, homeScore, awayScore, gameNotes,
      numberOfPeriods, periodDurationMinutes, currentPeriod, gameStatus,
      selectedPlayerIds, // Add as dependency for saving
      gameType // Add gameType to dependencies
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
    const updatedPlayersOnField = playersOnField.filter(p => p.id !== playerId);
    saveStateToHistory({ playersOnField: updatedPlayersOnField });
  }, [playersOnField, saveStateToHistory]);
  


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
  const handlePlayerTapInBar = useCallback((playerInfo: Player) => {
    // If the tapped player is already selected, deselect them
    if (draggingPlayerFromBarInfo?.id === playerInfo.id) {
      console.log("Tapped already selected player, deselecting:", playerInfo.id);
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
      setHistoryIndex(prevStateIndex);
      // Restore timer state if needed here too
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
      setHistoryIndex(nextStateIndex);
      // Restore timer state if needed here too
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
      setCompletedIntervalDurations([]);
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
      setCompletedIntervalDurations([]); // Clear history for new period
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
    setNextSubDueTimeSeconds(5 * 60);
    setSubAlertLevel('none');
    setLastSubConfirmationTimeSeconds(0);
    setCompletedIntervalDurations([]);
    setCurrentPeriod(1);
    setGameStatus('notStarted'); // Reset game status
    console.log("Timer and game progress reset.");
  };

  console.log('Before handleSubstitutionMade definition');
  const handleSubstitutionMade = () => {
    const duration = timeElapsedInSeconds - lastSubConfirmationTimeSeconds;
    const currentElapsedTime = timeElapsedInSeconds; // Capture current time *before* state updates
    const currentIntervalMins = subIntervalMinutes; // Capture interval
    
    // Update non-alert states immediately
    setCompletedIntervalDurations(prev => [duration, ...prev]); 
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
    const assister = assisterId ? availablePlayers.find(p => p.id === assisterId) : undefined;

    if (!scorer) {
      console.error("Scorer not found!");
      return;
    }

    const newEvent: GameEvent = {
      id: `goal-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`, // Simple unique ID
      type: 'goal',
      time: timeElapsedInSeconds,
      scorerId: scorer.id,
      scorerName: scorer.name, // Store name at time of event
      assisterId: assister?.id,
      assisterName: assister?.name
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
      scorerName: opponentName || 'Opponent', // Use current opponent name or default
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

    // Create a new array with the updated event
    const newGameEvents = [
      ...gameEvents.slice(0, eventIndex),
      updatedEvent,
      ...gameEvents.slice(eventIndex + 1)
    ];

    setGameEvents(newGameEvents); // Update state directly first
    saveStateToHistory({ gameEvents: newGameEvents }); // Save the updated events array to history
    console.log("Updated game event:", updatedEvent.id);
  };

  // --- Button/Action Handlers ---
  
  // RENAMED & UPDATED Handler: Just opens the setup modal after confirmation
  
  
  // NEW: Handler to actually reset state and set opponent/date/type from modal
  console.log('Before useCallback(handleFinalizeNewGame)');
  const handleFinalizeNewGame = useCallback((newOpponentName: string, newGameDate: string, newGameType: GameType) => {
    console.log(`Finalizing new game start. Opponent: ${newOpponentName}, Date: ${newGameDate}, Type: ${newGameType}`);

    // --- Reset State --- 
    // Preserve roster (availablePlayers) but reset their goalie/card status
    const resetAvailablePlayers = availablePlayers.map(p => ({ 
      ...p, 
      isGoalie: false, 
      receivedFairPlayCard: false 
    }));
    setAvailablePlayers(resetAvailablePlayers);
    
    // Reset field state using hook setters
    setPlayersOnField(initialState.playersOnField);
    setOpponents(initialState.opponents);
    setDrawings(initialState.drawings);
    
    // Reset other state managed directly in Home component
    setShowPlayerNames(initialState.showPlayerNames);
    // Keep existing teamName? Or reset?
    // setTeamName(initialState.teamName); // Let's keep team name for now
    setGameEvents(initialState.gameEvents);
    setHomeScore(initialState.homeScore);
    setAwayScore(initialState.awayScore);
    setGameNotes(initialState.gameNotes);
    setNumberOfPeriods(initialState.numberOfPeriods);
    setPeriodDurationMinutes(initialState.periodDurationMinutes);
    setCurrentPeriod(initialState.currentPeriod);
    setGameStatus(initialState.gameStatus);
    setSelectedPlayerIds(resetAvailablePlayers.map(p => p.id)); // Select all players from roster

    // Set the new opponent name, game date, and game type from the modal
    setOpponentName(newOpponentName.trim() || t('gameStatsModal.opponentPlaceholder', 'Opponent'));
    setGameDate(newGameDate || new Date().toISOString().split('T')[0]);
    setGameType(newGameType); // Set the new game type

    // Reset Timer
    setTimeElapsedInSeconds(0);
    setIsTimerRunning(false);
    setSubAlertLevel('none');
    setNextSubDueTimeSeconds(subIntervalMinutes * 60); 
    setCompletedIntervalDurations([]);
    setLastSubConfirmationTimeSeconds(0);

    // Reset History (Session Undo/Redo)
    const newInitialStateForHistory: AppState = {
      playersOnField: initialState.playersOnField,
      opponents: initialState.opponents,
      drawings: initialState.drawings,
      availablePlayers: resetAvailablePlayers, // Use reset roster
      showPlayerNames: initialState.showPlayerNames, 
      teamName: teamName, // Keep current team name
      gameEvents: initialState.gameEvents,
      opponentName: newOpponentName.trim() || t('gameStatsModal.opponentPlaceholder', 'Opponent'),
      gameDate: newGameDate || new Date().toISOString().split('T')[0],
      homeScore: initialState.homeScore,
      awayScore: initialState.awayScore,
      gameNotes: initialState.gameNotes,
      numberOfPeriods: initialState.numberOfPeriods,
      periodDurationMinutes: initialState.periodDurationMinutes,
      currentPeriod: initialState.currentPeriod,
      gameStatus: initialState.gameStatus,
      selectedPlayerIds: resetAvailablePlayers.map(p => p.id),
      gameType: newGameType, // Use new game type
    };
    setHistory([newInitialStateForHistory]); 
    setHistoryIndex(0);
    
    // Update current game ID to reflect it's unsaved
    setCurrentGameId(DEFAULT_GAME_ID);

    console.log("Session state reset with new opponent/date/type.");
    setIsNewGameSetupModalOpen(false); // Close the setup modal
  }, [availablePlayers, setAvailablePlayers, setDrawings, setOpponents, setPlayersOnField, subIntervalMinutes, t, teamName]);

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
  const handleSetNumberOfPeriods = (periods: 1 | 2) => {
    if (gameStatus === 'notStarted') {
      setNumberOfPeriods(periods);
      // No history save needed here, handled implicitly by timer start/reset?
      // Or maybe save it immediately?
      saveStateToHistory({ numberOfPeriods: periods }); // Let's save it
      console.log(`Number of periods set to: ${periods}`);
    } else {
      console.log("Cannot change number of periods after game has started.");
    }
  };

  console.log('Before handleSetPeriodDuration definition');
  const handleSetPeriodDuration = (minutes: number) => {
    const newMinutes = Math.max(1, minutes);
    if (gameStatus === 'notStarted') {
      setPeriodDurationMinutes(newMinutes);
      saveStateToHistory({ periodDurationMinutes: newMinutes }); // Save immediately
      console.log(`Period duration set to: ${newMinutes} minutes.`);
    } else {
      console.log("Cannot change period duration after game has started.");
    }
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
  console.log('Before useCallback(handleResetStatsOnly)');
  const handleResetStatsOnly = useCallback(() => {
    if (window.confirm(t('gameStatsModal.resetConfirmation', 'Are you sure you want to reset all game statistics and timer for the current match? This cannot be undone.') ?? 'Are you sure?')) {
        console.log("Resetting current game stats and timer...");

        // Reset player statuses (Goalie, Fair Play)
        const resetAvailablePlayers = availablePlayers.map(p => ({
            ...p,
            isGoalie: false,             // Reset goalie status
            receivedFairPlayCard: false // Reset fair play status
        }));
        setAvailablePlayers(resetAvailablePlayers); // Update available players state
        // Also reset players currently on field to ensure consistency, although they are cleared below anyway
        const resetPlayersOnField = playersOnField.map(p => ({
            ...p,
            isGoalie: false,
            receivedFairPlayCard: false
        }));
        setPlayersOnField(resetPlayersOnField);

        // Reset scores, events, timer, status, period
        setGameEvents(initialState.gameEvents); // Use initial empty array
        setHomeScore(initialState.homeScore);   // Use initial 0
        setAwayScore(initialState.awayScore);   // Use initial 0
        setTimeElapsedInSeconds(0);
        setIsTimerRunning(false);
        setSubAlertLevel('none');
        setNextSubDueTimeSeconds(subIntervalMinutes * 60); // Reset based on current interval
        setCompletedIntervalDurations([]);
        setLastSubConfirmationTimeSeconds(0);
        setCurrentPeriod(initialState.currentPeriod); // Reset to 1
        setGameStatus(initialState.gameStatus);   // Reset to 'notStarted'

        // Save this reset state to history (important!)
        saveStateToHistory({
            gameEvents: initialState.gameEvents,
            homeScore: initialState.homeScore,
            awayScore: initialState.awayScore,
            availablePlayers: resetAvailablePlayers, // Include reset player statuses in history
            playersOnField: resetPlayersOnField,   // Include reset field players too
            // Include timer/status reset in history state snapshot?
            // For simplicity, maybe only save the core stats reset?
            // Let's keep it simple for now and only explicitly save stats.
            // Timer state will be implicitly reset by the direct state calls above.
            // Status/Period reset also handled above.
        });
        console.log("Current game stats, player statuses, and timer reset complete.");
    }
  }, [t, subIntervalMinutes, saveStateToHistory, availablePlayers, playersOnField, setAvailablePlayers, setPlayersOnField]); // Added player states and setters to dependencies

  // Placeholder handlers for Save/Load Modals
  console.log('Before handleOpenSaveGameModal definition');
  const handleOpenSaveGameModal = () => {
    console.log("Opening Save Game Modal...");
    setIsSaveGameModalOpen(true);
  };

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
  const handleSaveGame = (gameName: string, gameType: GameType) => {
    console.log(`Attempting to save game: '${gameName}' with type: ${gameType}`);
    
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

    let saveSuccess = false; // Flag to track success

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
        // Use the opponentName and gameDate from state for the snapshot
        opponentName: opponentName, 
        gameDate: gameDate,
        homeScore,
        awayScore,
        gameNotes,
        numberOfPeriods,
        periodDurationMinutes,
        currentPeriod,
        gameStatus,
        selectedPlayerIds, // Make sure selectedPlayerIds are saved
        gameType, // Include gameType in the saved state (use state variable)
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
        
        // Reset session-specific state
        setHistory([stateToLoad]); // Start history with just the loaded state
        setHistoryIndex(0);
        setTimeElapsedInSeconds(0); // Reset timer upon loading
        setIsTimerRunning(false);
        setSubAlertLevel('none');
        // Potentially reset other sub-timer states?

        // Update current game ID and save settings
        setCurrentGameId(gameId);
        const currentSettings: AppSettings = { currentGameId: gameId };
        localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(currentSettings));

        console.log(`Game ${gameId} loaded successfully.`);
        handleCloseLoadGameModal(); // Close modal after loading

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

  // Function to export all saved games as a single JSON file (RENAMED)
  console.log('Before handleExportAllGamesJson definition');
  const handleExportAllGamesJson = () => {
    if (Object.keys(savedGames).length === 0) {
      alert(t('loadGameModal.noGamesToExport', 'No saved games to export.'));
      return;
    }

    try {
      const jsonString = JSON.stringify(savedGames, null, 2); // Pretty-print JSON
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      // Generate filename with timestamp
      const now = new Date();
      const timestamp = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}_${now.getHours().toString().padStart(2, '0')}${now.getMinutes().toString().padStart(2, '0')}${now.getSeconds().toString().padStart(2, '0')}`;
      a.download = `SoccerApp_AllGames_${timestamp}.json`; // Keep .json extension
      
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('All games exported successfully as JSON.');
      // Optionally close the load modal after export
      // handleCloseLoadGameModal(); 
    } catch (error) {
      console.error('Failed to export all games as JSON:', error);
      alert(t('loadGameModal.exportAllJsonError', 'Error exporting all games as JSON.')); // Updated error key
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

  // Function to export all saved games as Excel/CSV
  console.log('Before handleExportAllGamesExcel definition');
  const handleExportAllGamesExcel = () => {
    const gameIds = Object.keys(savedGames).filter(id => id !== DEFAULT_GAME_ID);
    if (gameIds.length === 0) {
      alert(t('loadGameModal.noGamesToExport', 'No saved games to export.'));
      return;
    }
    console.log(`Starting Excel export for ${gameIds.length} games...`);

    try {
      const allRows: string[] = [];
      const EOL = '\r\n'; // Use CRLF for Excel compatibility
      const DELIMITER = ';'; // Use semicolon for better Excel compatibility

      gameIds.forEach((gameId, index) => {
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
                const scorer = escapeCsvField(event.scorerName);
                const assister = event.type === 'goal' ? escapeCsvField(event.assisterName) : '';
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
      a.download = `SoccerApp_AllGames_${timestamp}.csv`; // Use .csv extension
      
      a.href = url;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      console.log('All games exported successfully as CSV.');

    } catch (error) {
      console.error('Failed to export all games as CSV:', error);
      alert(t('loadGameModal.exportAllExcelError', 'Error exporting all games as CSV.'));
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
      .sort((a, b) => b.totalScore - a.totalScore || b.goals - a.goals);
      
      if (playerStats && playerStats.length > 0) {
        playerStats.forEach(player => {
            // Add fairPlay data to the row
            rows.push(`${escapeCsvField(player.name)}${DELIMITER}${escapeCsvField(player.goals)}${DELIMITER}${escapeCsvField(player.assists)}${DELIMITER}${escapeCsvField(player.totalScore)}${DELIMITER}${escapeCsvField(player.fairPlay ? 'Yes' : 'No')}`);
        });
      } else {
        rows.push('No player stats recorded');
      }
      rows.push('');

      // --- Section: Event Log ---
      // (Reusing logic similar to handleExportAllGamesExcel)
      rows.push('Event Log');
      rows.push(`${escapeCsvField('Time')}${DELIMITER}${escapeCsvField('Type')}${DELIMITER}${escapeCsvField('Scorer')}${DELIMITER}${escapeCsvField('Assister')}`);
      const sortedEvents = game.gameEvents?.filter(e => e.type === 'goal' || e.type === 'opponentGoal').sort((a, b) => a.time - b.time) || [];
      
      if (sortedEvents.length > 0) {
        sortedEvents.forEach(event => {
            const timeFormatted = formatTime(event.time);
            const type = event.type === 'goal' ? 'Goal' : 'Opponent Goal';
            const scorer = escapeCsvField(event.scorerName);
            const assister = event.type === 'goal' ? escapeCsvField(event.assisterName) : '';
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

  // --- NEW: Handler to Set Player Nickname ---
  console.log('Before useCallback(handleSetPlayerNickname)');
  const handleSetPlayerNickname = useCallback((playerId: string, nickname: string) => {
    const updatedAvailable = availablePlayers.map(p => p.id === playerId ? { ...p, nickname: nickname } : p);
    const updatedOnField = playersOnField.map(p => p.id === playerId ? { ...p, nickname: nickname } : p);

    setAvailablePlayers(updatedAvailable);
    setPlayersOnField(updatedOnField);
    saveStateToHistory({ availablePlayers: updatedAvailable, playersOnField: updatedOnField });
    console.log(`Set nickname for ${playerId} to ${nickname}`);
  }, [availablePlayers, playersOnField, setAvailablePlayers, setPlayersOnField, saveStateToHistory]);

  // --- NEW: Handler to Award Fair Play Card ---
  console.log('Before useCallback(handleAwardFairPlayCard)');
  const handleAwardFairPlayCard = useCallback((playerId: string) => {
    // If playerId is empty string, clear the award for everyone
    const shouldClear = playerId === "";

    const updatedAvailable = availablePlayers.map(p => ({
      ...p,
      // Set to false if clearing OR if a different player ID is provided (implicitly handled by next condition)
      // Set to true ONLY if this player's ID is provided AND we are not clearing
      receivedFairPlayCard: !shouldClear && p.id === playerId ? true : false
    }));
    const updatedOnField = playersOnField.map(p => ({
      ...p,
      // Sync with availablePlayers logic
      receivedFairPlayCard: !shouldClear && p.id === playerId ? true : false
    }));

    setAvailablePlayers(updatedAvailable);
    setPlayersOnField(updatedOnField);
    saveStateToHistory({ availablePlayers: updatedAvailable, playersOnField: updatedOnField });

    if (shouldClear) {
        console.log(`Cleared Fair Play Card award.`);
    } else {
        const awardedPlayer = updatedAvailable.find(p => p.id === playerId);
        // Log awarding, not toggling
        console.log(`Awarded Fair Play Card to ${awardedPlayer?.name ?? playerId}.`);
    }
  }, [availablePlayers, playersOnField, setAvailablePlayers, setPlayersOnField, saveStateToHistory]);

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
              completedIntervalDurations={completedIntervalDurations}
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
              onSetNumberOfPeriods={handleSetNumberOfPeriods}
              onSetPeriodDuration={handleSetPeriodDuration}
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
          onPlayerRemove={handlePlayerRemove}
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
          availablePlayers={availablePlayers}
          currentTime={timeElapsedInSeconds}
        />
        {/* Game Stats Modal */}
        <GameStatsModal 
          isOpen={isGameStatsModalOpen}
          onClose={handleToggleGameStatsModal}
          teamName={teamName}
          opponentName={opponentName}
          gameDate={gameDate}
          homeScore={homeScore}
          awayScore={awayScore}
          availablePlayers={availablePlayers}
          gameEvents={gameEvents}
          gameNotes={gameNotes}
          onOpponentNameChange={handleOpponentNameChange}
          onGameDateChange={handleGameDateChange}
          onHomeScoreChange={handleHomeScoreChange}
          onAwayScoreChange={handleAwayScoreChange}
          onGameNotesChange={handleGameNotesChange}
          onUpdateGameEvent={handleUpdateGameEvent}
          onResetGameStats={handleResetStatsOnly} // Pass the new handler
          onAwardFairPlayCard={handleAwardFairPlayCard} // Pass Fair Play handler
          selectedPlayerIds={selectedPlayerIds} // Pass selected player IDs
          savedGames={savedGames} // Pass saved games collection
        />
        {/* Save Game Modal */}
        <SaveGameModal
          isOpen={isSaveGameModalOpen}
          onClose={handleCloseSaveGameModal}
          onSave={handleSaveGame} 
          teamName={teamName}         // Pass teamName state
          opponentName={opponentName} // Pass opponentName state
          gameDate={gameDate}         // Pass gameDate state     // Pass gameType state
        />
        <LoadGameModal 
          isOpen={isLoadGameModalOpen}
          onClose={handleCloseLoadGameModal}
          savedGames={savedGames} 
          onLoad={handleLoadGame}
          onDelete={handleDeleteGame}
          onExportAllJson={handleExportAllGamesJson}
          onExportAllExcel={handleExportAllGamesExcel}
          onExportOneJson={handleExportOneJson}
          onExportOneCsv={handleExportOneCsv}
        />

        {/* Conditionally render the New Game Setup Modal */}
        {isNewGameSetupModalOpen && (
          <NewGameSetupModal
            isOpen={isNewGameSetupModalOpen}
            onStart={handleFinalizeNewGame} 
            onCancel={handleCancelNewGameSetup} // <-- Pass the function name again
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
          onSetPlayerNickname={handleSetPlayerNickname} // Pass new handler
          onAwardFairPlayCard={handleAwardFairPlayCard}
          // Pass selection state and handler
          selectedPlayerIds={selectedPlayerIds}
          onTogglePlayerSelection={handleTogglePlayerSelection}
        />

      </div>
    </div>
  );
}
