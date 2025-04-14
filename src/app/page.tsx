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
import { useTranslation } from 'react-i18next'; // Make sure this is imported

// Define the Player type - Use relative coordinates
export interface Player {
  id: string;
  name: string;
  relX?: number; // Relative X (0.0 to 1.0)
  relY?: number; // Relative Y (0.0 to 1.0)
  color?: string; // Optional: Specific color for the disk
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
interface AppState {
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

// Placeholder data - No coordinates needed here
const initialAvailablePlayersData: Player[] = [
  { id: 'p1', name: 'Player 1' },
  { id: 'p2', name: 'Player 2' },
  { id: 'p3', name: 'Player 3' },
  { id: 'p4', name: 'Player 4' },
  { id: 'p5', name: 'Player 5' },
  { id: 'p6', name: 'Player 6' },
  { id: 'p7', name: 'Player 7' },
  { id: 'p8', name: 'Player 8' },
  { id: 'p9', name: 'Player 9' },
  { id: 'p10', name: 'Player 10' },
  { id: 'p11', name: 'Player 11' },
];

const initialState: AppState = {
  playersOnField: [], // Start with no players on field
  opponents: [], // Start with no opponents
  drawings: [],
  availablePlayers: initialAvailablePlayersData,
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
  // --- State Management ---
  const [playersOnField, setPlayersOnField] = useState<Player[]>(initialState.playersOnField);
  const [opponents, setOpponents] = useState<Opponent[]>(initialState.opponents);
  const [drawings, setDrawings] = useState<Point[][]>(initialState.drawings);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(initialState.availablePlayers);
  const [showPlayerNames, setShowPlayerNames] = useState<boolean>(initialState.showPlayerNames);
  const [teamName, setTeamName] = useState<string>(initialState.teamName); // Add team name state
  const [history, setHistory] = useState<AppState[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false); // Flag to prevent overwriting loaded state
  // State to track player being dragged FROM the bar (for touch)
  const [draggingPlayerFromBarInfo, setDraggingPlayerFromBarInfo] = useState<Player | null>(null);
  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  // Instructions Modal state
  const [isInstructionsOpen, setIsInstructionsOpen] = useState<boolean>(false);
  // Training Resources Modal state
  const [isTrainingResourcesOpen, setIsTrainingResourcesOpen] = useState<boolean>(false); // Add state for new modal
  // Goal Log Modal state
  const [isGoalLogModalOpen, setIsGoalLogModalOpen] = useState<boolean>(false); // Add modal state
  // Game Stats Modal state
  const [isGameStatsModalOpen, setIsGameStatsModalOpen] = useState<boolean>(false);
  // Game Events state
  const [gameEvents, setGameEvents] = useState<GameEvent[]>(initialState.gameEvents); // Add gameEvents state
  // Game Info state
  const [opponentName, setOpponentName] = useState<string>(initialState.opponentName);
  const [gameDate, setGameDate] = useState<string>(initialState.gameDate);
  const [homeScore, setHomeScore] = useState<number>(initialState.homeScore);
  const [awayScore, setAwayScore] = useState<number>(initialState.awayScore);
  const [gameNotes, setGameNotes] = useState<string>(initialState.gameNotes);
  // --- Timer State ---
  const [timeElapsedInSeconds, setTimeElapsedInSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(false);
  const [showLargeTimerOverlay, setShowLargeTimerOverlay] = useState<boolean>(false); // State for overlay visibility

  // --- Substitution Timer State ---
  const [subIntervalMinutes, setSubIntervalMinutes] = useState<number>(5);
  const [nextSubDueTimeSeconds, setNextSubDueTimeSeconds] = useState<number>(5 * 60);
  // Alert level: 'none', 'warning', 'due'
  const [subAlertLevel, setSubAlertLevel] = useState<'none' | 'warning' | 'due'>('none'); 
  const [completedIntervalDurations, setCompletedIntervalDurations] = useState<number[]>([]);
  const [lastSubConfirmationTimeSeconds, setLastSubConfirmationTimeSeconds] = useState<number>(0);

  // --- Game Structure State ---
  const [numberOfPeriods, setNumberOfPeriods] = useState<1 | 2>(initialState.numberOfPeriods);
  const [periodDurationMinutes, setPeriodDurationMinutes] = useState<number>(initialState.periodDurationMinutes);
  const [currentPeriod, setCurrentPeriod] = useState<number>(initialState.currentPeriod);
  const [gameStatus, setGameStatus] = useState<AppState['gameStatus']>(initialState.gameStatus);

  // Add new state variables here
  const [currentGameId, setCurrentGameId] = useState<string | null>(DEFAULT_GAME_ID); // Track the loaded game ID
  const [savedGames, setSavedGames] = useState<SavedGamesCollection>({}); // Hold all saved games in memory
  // Add state for new modals
  const [isSaveGameModalOpen, setIsSaveGameModalOpen] = useState<boolean>(false);
  const [isLoadGameModalOpen, setIsLoadGameModalOpen] = useState<boolean>(false);

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

  // --- History Management ---
  // IMPORTANT: History is now per-session, not persistently saved per-game in this revision.
  // saveStateToHistory needs to be reviewed/potentially removed or simplified.
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
  const handleDropOnField = useCallback((playerId: string, relX: number, relY: number) => {
    const playerToAdd = availablePlayers.find(p => p.id === playerId);
    if (!playerToAdd) return;

    const playerOnFieldIndex = playersOnField.findIndex(p => p.id === playerId);
    let newPlayersOnField: Player[];
    if (playerOnFieldIndex !== -1) {
      newPlayersOnField = playersOnField.map(p =>
        p.id === playerId ? { ...p, relX, relY } : p
      );
    } else {
      newPlayersOnField = [...playersOnField, { ...playerToAdd, relX, relY }];
    }
    // Directly update state
    setPlayersOnField(newPlayersOnField);
    // Also save to session history for undo/redo
    saveStateToHistory({ playersOnField: newPlayersOnField });
    setDraggingPlayerFromBarInfo(null); // Deselect player from bar
  }, [availablePlayers, playersOnField, saveStateToHistory]);

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
  
  const handleRenamePlayer = useCallback((playerId: string, newName: string) => {
    const updatedAvailablePlayers = availablePlayers.map(p => 
      p.id === playerId ? { ...p, name: newName } : p
    );
    const updatedPlayersOnField = playersOnField.map(p => 
      p.id === playerId ? { ...p, name: newName } : p
    );
    // Directly update state
    setAvailablePlayers(updatedAvailablePlayers);
    setPlayersOnField(updatedPlayersOnField);
    // Also save to session history for undo/redo
    saveStateToHistory({ 
      availablePlayers: updatedAvailablePlayers, 
      playersOnField: updatedPlayersOnField 
    });
  }, [availablePlayers, playersOnField, saveStateToHistory]);

  // --- Drawing Handlers ---
  const handleDrawingStart = useCallback((point: Point) => {
    const newDrawings = [...drawings, [point]];
    setDrawings(newDrawings); // Direct state update
    saveStateToHistory({ drawings: newDrawings }); 
  }, [drawings, saveStateToHistory]);

  const handleDrawingAddPoint = useCallback((point: Point) => {
    // Continuous update for visual feedback - no history save needed here
    setDrawings(prevDrawings => {
      if (prevDrawings.length === 0) return prevDrawings;
      const currentPath = prevDrawings[prevDrawings.length - 1];
      const updatedPath = [...currentPath, point]; 
      return [...prevDrawings.slice(0, -1), updatedPath];
    });
  }, []);

  const handleDrawingEnd = useCallback(() => {
    // Final state is already set by handleDrawingAddPoint, just save to history
    // Ensure the current state from setDrawings is captured by the effect
    // No direct setState call needed here if handleDrawingAddPoint sets it,
    // but need to ensure saveStateToHistory gets the latest state for undo.
    // Let's re-evaluate if this is needed - maybe saveStateToHistory should read current state? 
    // For now, rely on the auto-save effect picking up the final state set by handleDrawingAddPoint.
    saveStateToHistory({ drawings }); // Save final path state to history
  }, [drawings, saveStateToHistory]);

  const handleClearDrawings = useCallback(() => {
    setDrawings([]); // Direct state update
    saveStateToHistory({ drawings: [] });
  }, [saveStateToHistory]);

  // --- Opponent Handlers ---
  const handleAddOpponent = useCallback(() => {
    const newOpponentId = `opp-${Math.floor(Math.random() * 1000000)}`;
    const defaultPosition = { relX: 0.5, relY: 0.5 };
    const newOpponent: Opponent = {
      id: newOpponentId,
      ...defaultPosition,
    };
    const newOpponents = [...opponents, newOpponent];
    setOpponents(newOpponents); // Direct state update
    saveStateToHistory({ opponents: newOpponents });
  }, [opponents, saveStateToHistory]);

  const handleOpponentMove = useCallback((opponentId: string, relX: number, relY: number) => {
    // Continuous update for visual feedback
    setOpponents(prevOpponents => 
      prevOpponents.map(opp => 
        opp.id === opponentId ? { ...opp, relX, relY } : opp
      )
    );
  }, []);

  const handleOpponentMoveEnd = useCallback(() => {
    // Final state set by handleOpponentMove, just save history
    // Rely on auto-save effect for persistence
    saveStateToHistory({ opponents });
  }, [opponents, saveStateToHistory]);

  const handleOpponentRemove = useCallback((opponentId: string) => {
    const updatedOpponents = opponents.filter(opp => opp.id !== opponentId);
    setOpponents(updatedOpponents); // Direct state update
    saveStateToHistory({ opponents: updatedOpponents });
  }, [opponents, saveStateToHistory]);

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

  // RENAMED & UPDATED Handler: Resets the current session to initial state
  const handleStartNewGame = useCallback(() => {
    if (window.confirm(t('controlBar.startNewGameConfirm', 'Are you sure you want to start a new match? Unsaved data for the current match will be lost.'))) {
      console.log("Starting new game (resetting session state)..." );
      // Reset all state variables to their initial values from initialState
      setPlayersOnField(initialState.playersOnField);
      setOpponents(initialState.opponents);
      setDrawings(initialState.drawings);
      setAvailablePlayers(initialState.availablePlayers);
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
      setTimeElapsedInSeconds(0);
      setIsTimerRunning(false);
      setSubAlertLevel('none');
      // Reset sub timer related state if needed
      // setSubIntervalMinutes(initialState.subIntervalMinutes); // Assuming 5 is default
      setNextSubDueTimeSeconds(5 * 60);
      setCompletedIntervalDurations([]);
      setLastSubConfirmationTimeSeconds(0);

      // Reset session history
      setHistory([initialState]); 
      setHistoryIndex(0);

      // Optionally set current game ID back to default unsaved
      // setCurrentGameId(DEFAULT_GAME_ID); 
      // Decide if we want this. For now, keep the same gameId but reset its content.
      // Auto-save will overwrite the previous state for the current game ID.

      console.log("Session state reset to initial values.");
    }
  }, [t]); // Add t to dependencies for the confirmation message

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
        onRenamePlayer={handleRenamePlayer}
        teamName={teamName}
        onTeamNameChange={handleTeamNameChange}
        onPlayerDragStartFromBar={handlePlayerDragStartFromBar}
        selectedPlayerIdFromBar={draggingPlayerFromBarInfo?.id}
          onBarBackgroundClick={handleDeselectPlayer}
          gameEvents={gameEvents}
          onPlayerTapInBar={handlePlayerTapInBar}
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
        onAddOpponent={handleAddOpponent}
        onClearDrawings={handleClearDrawings}
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
          onLoad={handleLoadGame} 
          onDelete={handleDeleteGame} 
          savedGames={savedGames} 
        />
      </div>
    </div>
  );
}


