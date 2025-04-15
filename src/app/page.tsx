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
import SaveGameModal from '@/components/SaveGameModal'; // Import the new modal
import LoadGameModal from '@/components/LoadGameModal'; // Import the new modal
import NewGameSetupModal from '@/components/NewGameSetupModal'; // Import the new component
import RosterSettingsModal from '@/components/RosterSettingsModal'; // Import the new Roster modal
import { useTranslation } from 'react-i18next'; // Make sure this is imported
import { useGameState, UseGameStateReturn } from '@/hooks/useGameState'; // Import the hook

// Define the Player type - Use relative coordinates
export interface Player {
  id: string;
  name: string;
  relX?: number; // Relative X (0.0 to 1.0)
  relY?: number; // Relative Y (0.0 to 1.0)
  color?: string; // Optional: Specific color for the disk
  isGoalie?: boolean; // Optional: Is this player the goalie?
  jerseyNumber?: string; // Optional: Player's jersey number
  notes?: string; // Optional: Notes specific to this player
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
  // REMOVED: useState for playersOnField, opponents, drawings, availablePlayers
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
  // ... Timer state ...
  // ... Modal states ...
  // ... UI/Interaction states ...
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [draggingPlayerFromBarInfo, setDraggingPlayerFromBarInfo] = useState<Player | null>(null);
  const [loggingGoalForPlayerId, setLoggingGoalForPlayerId] = useState<string | null>(null); // Track player selected for goal
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false); // RE-ADD Fullscreen state
  // Persistence state
  const [savedGames, setSavedGames] = useState<SavedGamesCollection>({});
  const [currentGameId, setCurrentGameId] = useState<string | null>(DEFAULT_GAME_ID);

  // --- Timer State (Still needed here) ---
  const [timeElapsedInSeconds, setTimeElapsedInSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [showLargeTimerOverlay, setShowLargeTimerOverlay] = useState<boolean>(false); // State for overlay visibility
  
  // --- Substitution Timer State (Still needed here) ---
  const [subIntervalMinutes, setSubIntervalMinutes] = useState<number>(5); // Default to 5 min
  const [nextSubDueTimeSeconds, setNextSubDueTimeSeconds] = useState<number>(5 * 60);
  const [subAlertLevel, setSubAlertLevel] = useState<'none' | 'warning' | 'due'>('none'); 
  const [completedIntervalDurations, setCompletedIntervalDurations] = useState<number[]>([]);
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
    }
    setIsLoaded(true); // Mark loading as complete
  }, []); // Runs only on mount

  // --- Save state to localStorage --- 
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
      numberOfPeriods, periodDurationMinutes, currentPeriod, gameStatus]);

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
  const handleDropOnField = (playerId: string, relX: number, relY: number) => {
    const droppedPlayer = availablePlayers.find(p => p.id === playerId);
    if (droppedPlayer) {
      handlePlayerDrop(droppedPlayer, { relX, relY }); // Call the handler from the hook
    } else {
      console.error(`Dropped player with ID ${playerId} not found in availablePlayers.`);
    }
  };

  const handlePlayerMove = useCallback((playerId: string, relX: number, relY: number) => {
    // Update visual state immediately
    setPlayersOnField(prevPlayers => 
      prevPlayers.map(p => 
        p.id === playerId ? { ...p, relX, relY } : p // Use relX, relY
      )
    );
    // State saved on move end
  }, []);

  const handlePlayerMoveEnd = useCallback(() => {
    saveStateToHistory({ playersOnField });
  }, [playersOnField, saveStateToHistory]);

  const handlePlayerRemove = useCallback((playerId: string) => {
    const updatedPlayersOnField = playersOnField.filter(p => p.id !== playerId);
    saveStateToHistory({ playersOnField: updatedPlayersOnField });
  }, [playersOnField, saveStateToHistory]);
  


  // --- Reset Handler ---
  const handleResetField = useCallback(() => {
    // Update state directly
    setPlayersOnField([]);
    setOpponents([]);
    setDrawings([]);
    // Save reset state to history
    saveStateToHistory({ playersOnField: [], opponents: [], drawings: [] });
  }, [saveStateToHistory]);

  // --- Touch Drag from Bar Handlers (Updated for relative coords) ---
  const handlePlayerDragStartFromBar = useCallback((playerInfo: Player) => {
    // This is now primarily for HTML Drag and Drop OR potential long-press drag
    setDraggingPlayerFromBarInfo(playerInfo);
    console.log("Setting draggingPlayerFromBarInfo (Drag Start):", playerInfo);
  }, []);

  // NEW Handler for simple tap selection in the bar
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
      setAvailablePlayers(prevState.availablePlayers);
      setShowPlayerNames(prevState.showPlayerNames);
      setTeamName(prevState.teamName); // Undo team name
      setHistoryIndex(prevStateIndex);
      // Restore timer state if needed here too
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
      setShowPlayerNames(nextState.showPlayerNames);
      setTeamName(nextState.teamName); // Redo team name
      setHistoryIndex(nextStateIndex);
      // Restore timer state if needed here too
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

  // RENAMED & UPDATED Handler: Just opens the setup modal after confirmation
  const handleStartNewGame = useCallback(() => {
    // Confirmation remains the same
    if (window.confirm(t('controlBar.startNewGameConfirm', 'Are you sure you want to start a new match? Unsaved data for the current match will be lost.'))) {
      console.log("Start new game confirmed, opening setup modal..." );
      setIsNewGameSetupModalOpen(true); // Open the new modal instead of resetting here
    }
  }, [t]); 

  // NEW: Handler to actually reset state and set opponent/date from modal
  const handleFinalizeNewGame = (newOpponentName: string, newGameDate: string) => {
    console.log(`Finalizing new game start. Opponent: ${newOpponentName}, Date: ${newGameDate}`);
    
    // Preserve current team name and available players
    const preservedTeamName = teamName;
    const preservedAvailablePlayers = availablePlayers.map(p => ({ ...p, isGoalie: false }));
    
    // Reset other state variables to their initial values from initialState
    setPlayersOnField(initialState.playersOnField);
    setOpponents(initialState.opponents);
    setDrawings(initialState.drawings);
    setShowPlayerNames(initialState.showPlayerNames);
    setGameEvents(initialState.gameEvents);
    setTimeElapsedInSeconds(0);
    setIsTimerRunning(false);
    setSubAlertLevel('none');
    setNextSubDueTimeSeconds(5 * 60);
    setCompletedIntervalDurations([]);
    setLastSubConfirmationTimeSeconds(0);
    setHomeScore(initialState.homeScore);
    setAwayScore(initialState.awayScore);
    setGameNotes(initialState.gameNotes);
    setNumberOfPeriods(initialState.numberOfPeriods);
    setPeriodDurationMinutes(initialState.periodDurationMinutes);
    setCurrentPeriod(initialState.currentPeriod);
    setGameStatus(initialState.gameStatus);

    // Set the new opponent name and game date from the modal
    setOpponentName(newOpponentName.trim() || t('gameStatsModal.opponentPlaceholder', 'Opponent')); // Use placeholder if empty
    setGameDate(newGameDate || new Date().toISOString().split('T')[0]); // Default to today if date is invalid/empty

    // Create a new initial state for history that includes the preserved AND new values
    const newInitialStateForHistory: AppState = {
      ...initialState,
      teamName: preservedTeamName,
      availablePlayers: preservedAvailablePlayers,
      opponentName: newOpponentName.trim() || t('gameStatsModal.opponentPlaceholder', 'Opponent'),
      gameDate: newGameDate || new Date().toISOString().split('T')[0],
    };
    
    // Reset session history using the new initial state
    setHistory([newInitialStateForHistory]); 
    setHistoryIndex(0);

    console.log("Session state reset with new opponent/date.");
    setIsNewGameSetupModalOpen(false); // Close the setup modal
  };

  // NEW: Handler to cancel the new game setup
  const handleCancelNewGameSetup = () => {
    console.log("New game setup cancelled.");
    setIsNewGameSetupModalOpen(false);
  };

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
        window.location.reload();
      } catch (error) {
        console.error("Error during hard reset:", error);
        // Optionally show an error message to the user
        alert("Failed to reset application data.");
      }
    }
  }, [t]); // Add t to dependency array

  // Placeholder handlers for Save/Load Modals
  const handleOpenSaveGameModal = () => {
    console.log("Opening Save Game Modal...");
    setIsSaveGameModalOpen(true);
  };

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
    console.log(`Saving game with name: ${gameName}`);
    const gameId = gameName; // Use the name as the ID for simplicity

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
      };

      // 2. Update the savedGames state and localStorage
      const updatedSavedGames = { 
        ...savedGames, 
        [gameId]: currentSnapshot 
      };
      setSavedGames(updatedSavedGames); // Update state in memory
      localStorage.setItem(SAVED_GAMES_KEY, JSON.stringify(updatedSavedGames));

      // 3. Update the current game ID and save settings
      setCurrentGameId(gameId);
      const currentSettings: AppSettings = { currentGameId: gameId };
      localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(currentSettings));
      
      console.log(`Game saved successfully with ID: ${gameId}`);
      // History for the newly saved game should start fresh
      setHistory([currentSnapshot]);
      setHistoryIndex(0);

    } catch (error) {
      console.error("Failed to save game state:", error);
      alert("Error saving game."); // Notify user
    }
    handleCloseSaveGameModal(); // Close modal regardless of success/error for now
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

  // Function to export all saved games as Excel/CSV
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
        allRows.push(`${escapeCsvField('Player')}${DELIMITER}${escapeCsvField('Goals')}${DELIMITER}${escapeCsvField('Assists')}${DELIMITER}${escapeCsvField('Points')}`);
        const playerStats = game.availablePlayers?.map(player => {
          const goals = game.gameEvents?.filter(e => e.type === 'goal' && e.scorerId === player.id).length || 0;
          const assists = game.gameEvents?.filter(e => e.type === 'goal' && e.assisterId === player.id).length || 0;
          const totalScore = goals + assists;
          return { name: player.name, goals, assists, totalScore };
        })
        .filter(p => p.totalScore > 0) // Only include players with stats
        .sort((a, b) => b.totalScore - a.totalScore || b.goals - a.goals); // Sort by points, then goals
        
        if (playerStats && playerStats.length > 0) {
            playerStats.forEach(player => {
                allRows.push(`${escapeCsvField(player.name)}${DELIMITER}${escapeCsvField(player.goals)}${DELIMITER}${escapeCsvField(player.assists)}${DELIMITER}${escapeCsvField(player.totalScore)}`);
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
      rows.push(`${escapeCsvField('Player')}${DELIMITER}${escapeCsvField('Goals')}${DELIMITER}${escapeCsvField('Assists')}${DELIMITER}${escapeCsvField('Points')}`);
      const playerStats = game.availablePlayers?.map(player => {
        const goals = game.gameEvents?.filter(e => e.type === 'goal' && e.scorerId === player.id).length || 0;
        const assists = game.gameEvents?.filter(e => e.type === 'goal' && e.assisterId === player.id).length || 0;
        const totalScore = goals + assists;
        return { name: player.name, goals, assists, totalScore };
      })
      .filter(p => p.totalScore > 0)
      .sort((a, b) => b.totalScore - a.totalScore || b.goals - a.goals);
      
      if (playerStats && playerStats.length > 0) {
        playerStats.forEach(player => {
            rows.push(`${escapeCsvField(player.name)}${DELIMITER}${escapeCsvField(player.goals)}${DELIMITER}${escapeCsvField(player.assists)}${DELIMITER}${escapeCsvField(player.totalScore)}`);
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

  // Effect to load saved state from localStorage on initial mount
  useEffect(() => {
    console.log("Initial mount effect running...");
    let loadedState: AppState | null = null;
    let loadedSettings: AppSettings | null = null;
    let gameIdToLoad = DEFAULT_GAME_ID;

    try {
      // Load settings first to find the last active game ID
      const savedSettingsString = localStorage.getItem(APP_SETTINGS_KEY);
      if (savedSettingsString) {
        loadedSettings = JSON.parse(savedSettingsString);
        gameIdToLoad = loadedSettings?.currentGameId || DEFAULT_GAME_ID;
        setCurrentGameId(gameIdToLoad);
        console.log("Loaded settings, last active game ID:", gameIdToLoad);
      }

      // Load all saved games
      const savedGamesString = localStorage.getItem(SAVED_GAMES_KEY);
      if (savedGamesString) {
        const allSavedGames = JSON.parse(savedGamesString);
        setSavedGames(allSavedGames);
        // Get the specific state for the gameIdToLoad
        loadedState = allSavedGames[gameIdToLoad] || null;
        console.log(`Attempting to load state for game ID: ${gameIdToLoad}. Found:`, !!loadedState);
      }
    } catch (error) {
      console.error("Failed to load or parse state from localStorage:", error);
      // Fallback to initial state if loading fails
      loadedState = null; 
      setSavedGames({}); // Reset saved games if parsing failed
      setCurrentGameId(DEFAULT_GAME_ID);
    }

    // Apply the loaded state or use initial state
    const stateToApply = loadedState || initialState;
    console.log("Applying state:", stateToApply === initialState ? "Initial State" : "Loaded State");
    // Use setters from hook for relevant state
    setPlayersOnField(stateToApply.playersOnField);
    setOpponents(stateToApply.opponents || []);
    setDrawings(stateToApply.drawings);
    setAvailablePlayers(stateToApply.availablePlayers);
    // Apply remaining state directly
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
    
    // Reset non-persistent state
    setHistory([stateToApply]); 
    setHistoryIndex(0);
    setTimeElapsedInSeconds(0);
    setIsTimerRunning(false);
    setSubAlertLevel('none');
    setNextSubDueTimeSeconds(5 * 60);
    setCompletedIntervalDurations([]);
    setLastSubConfirmationTimeSeconds(0);

    // Mark loading as complete
    setIsLoaded(true);
    console.log("State loading complete. isLoaded: true");

    // *** NEW CHECK: Prompt for opponent name if it's the default ***
    const finalOpponentName = stateToApply.opponentName || initialState.opponentName;
    if (finalOpponentName === initialState.opponentName) {
      console.log("Opponent name is default, prompting for setup...");
      setIsNewGameSetupModalOpen(true);
    }

  }, []); // Empty dependency array ensures this runs only once on mount

  // NEW Effect: Check opponent name after initial load is complete
  useEffect(() => {
    if (isLoaded && opponentName === initialState.opponentName) {
        // Check if the modal isn't *already* open to prevent potential loops
        if (!isNewGameSetupModalOpen) { 
            console.log("Opponent name is default after load, prompting for setup...");
            setIsNewGameSetupModalOpen(true);
        }
    }
  }, [isLoaded, opponentName, isNewGameSetupModalOpen]); // Depend on load status and opponent name

  // --- Roster Management Handlers ---
  const openRosterModal = () => setIsRosterModalOpen(true);
  const closeRosterModal = () => setIsRosterModalOpen(false);

  
  const handleSetJerseyNumber = useCallback((playerId: string, number: string) => {
    const updatedAvailable = availablePlayers.map(p => p.id === playerId ? { ...p, jerseyNumber: number } : p);
    const updatedOnField = playersOnField.map(p => p.id === playerId ? { ...p, jerseyNumber: number } : p);

    setAvailablePlayers(updatedAvailable);
    setPlayersOnField(updatedOnField);
    saveStateToHistory({ availablePlayers: updatedAvailable, playersOnField: updatedOnField });
    console.log(`Set jersey number for ${playerId} to ${number}`);
  }, [availablePlayers, playersOnField, setAvailablePlayers, setPlayersOnField, saveStateToHistory]);

  const handleSetPlayerNotes = useCallback((playerId: string, notes: string) => {
    const updatedAvailable = availablePlayers.map(p => p.id === playerId ? { ...p, notes: notes } : p);
    // Notes likely don't need to be tracked for playersOnField unless displayed there

    setAvailablePlayers(updatedAvailable);
    // setPlayersOnField(updatedOnField); // Only if notes are added to PlayerOnField type
    saveStateToHistory({ availablePlayers: updatedAvailable /*, playersOnField: updatedOnField */ });
    console.log(`Set notes for ${playerId}`);
  }, [availablePlayers, setAvailablePlayers, /* playersOnField, setPlayersOnField, */ saveStateToHistory]);

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

  // Render null or a loading indicator until state is loaded
  if (!isLoaded) {
    // You might want a more sophisticated loading indicator
    return <div className="flex items-center justify-center h-screen bg-gray-900 text-white">Loading...</div>;
  }

  return (
    // Main container with flex column layout
    <div className="flex flex-col h-screen bg-gray-900 text-white relative">
      {/* REMOVED Fullscreen Toggle Button from here */}

      {/* Replace Suspense with a regular div */}
      <div className="flex flex-col h-full">
      {/* Top Player Bar */}
      <PlayerBar
        players={availablePlayers}
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
          onResetGameStats={handleStartNewGame}
        />
        {/* Save Game Modal */}
        <SaveGameModal
          isOpen={isSaveGameModalOpen}
          onClose={handleCloseSaveGameModal}
          onSave={handleSaveGame} 
          teamName={teamName}         // Pass teamName state
          opponentName={opponentName} // Pass opponentName state
          gameDate={gameDate}         // Pass gameDate state
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

        {/* NEW: New Game Setup Modal */}
        <NewGameSetupModal 
          isOpen={isNewGameSetupModalOpen}
          onStart={handleFinalizeNewGame}
          onCancel={handleCancelNewGameSetup}
        />

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
        />

      </div>
    </div>
  );
}
