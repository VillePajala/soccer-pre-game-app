'use client';

import React, { useState, useEffect, useCallback } from 'react'; // Added useEffect, useCallback
import SoccerField from '@/components/SoccerField';
import PlayerBar from '@/components/PlayerBar';
import ControlBar from '@/components/ControlBar';
import TimerOverlay from '@/components/TimerOverlay'; // Import TimerOverlay
import InstructionsModal from '@/components/InstructionsModal'; // Import InstructionsModal
import GoalLogModal from '@/components/GoalLogModal'; // Import GoalLogModal
import GameStatsModal from '@/components/GameStatsModal'; // Import GameStatsModal

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

// Define localStorage key
const LOCAL_STORAGE_KEY = 'soccerTacticsAppState';

export default function Home() {
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
  const [gameEvents, setGameEvents] = useState<GameEvent[]>(initialState.gameEvents); // Add gameEvents state
  const [isGoalLogModalOpen, setIsGoalLogModalOpen] = useState<boolean>(false); // Add modal state
  // Add state for game info
  const [opponentName, setOpponentName] = useState<string>(initialState.opponentName);
  const [gameDate, setGameDate] = useState<string>(initialState.gameDate);
  const [homeScore, setHomeScore] = useState<number>(initialState.homeScore);
  const [awayScore, setAwayScore] = useState<number>(initialState.awayScore);
  const [gameNotes, setGameNotes] = useState<string>(initialState.gameNotes);
  // Add state for the stats modal
  const [isGameStatsModalOpen, setIsGameStatsModalOpen] = useState<boolean>(false);

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

  // --- Load state from localStorage on mount ---
  useEffect(() => {
    console.log("Attempting to load state from localStorage...");
    try {
      const savedStateJSON = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (savedStateJSON) {
        const savedData = JSON.parse(savedStateJSON);
        if (savedData && Array.isArray(savedData.history) && typeof savedData.historyIndex === 'number') {
          const loadedHistory: AppState[] = savedData.history;
          const loadedIndex: number = savedData.historyIndex;

          if (loadedIndex >= 0 && loadedIndex < loadedHistory.length) {
            console.log(`Loaded state from localStorage: History length ${loadedHistory.length}, Index ${loadedIndex}`);
            const currentState = loadedHistory[loadedIndex];

            setHistory(loadedHistory);
            setHistoryIndex(loadedIndex);

            setPlayersOnField(currentState.playersOnField);
            setOpponents(currentState.opponents || []); 
            setDrawings(currentState.drawings);
            setAvailablePlayers(currentState.availablePlayers);
            setShowPlayerNames(currentState.showPlayerNames);
            setTeamName(currentState.teamName || initialState.teamName);
            setGameEvents(currentState.gameEvents || []);
            // Load game info state
            setOpponentName(currentState.opponentName || initialState.opponentName);
            setGameDate(currentState.gameDate || initialState.gameDate);
            setHomeScore(currentState.homeScore || 0);
            setAwayScore(currentState.awayScore || 0);
            setGameNotes(currentState.gameNotes || '');
            // Load game structure state
            setNumberOfPeriods(currentState.numberOfPeriods || 2);
            setPeriodDurationMinutes(currentState.periodDurationMinutes || 10);
            setCurrentPeriod(currentState.currentPeriod || 1);
            setGameStatus(currentState.gameStatus || 'notStarted');
          } else {
            console.warn("Loaded historyIndex is out of bounds.");
            // Fallback to initial state if index is bad
            setPlayersOnField(initialState.playersOnField);
            setOpponents(initialState.opponents);
            setDrawings(initialState.drawings);
            setAvailablePlayers(initialState.availablePlayers);
            setShowPlayerNames(initialState.showPlayerNames);
            setTeamName(initialState.teamName); // Reset team name
            setGameEvents(initialState.gameEvents); // Ensure gameEvents are reset on fallback
            // Reset game info state on fallback
            setOpponentName(initialState.opponentName);
            setGameDate(initialState.gameDate);
            setHomeScore(initialState.homeScore);
            setAwayScore(initialState.awayScore);
            setGameNotes(initialState.gameNotes);
            // Reset game structure state on fallback
            setNumberOfPeriods(2);
            setPeriodDurationMinutes(10);
            setCurrentPeriod(1);
            setGameStatus('notStarted');
          }
        } else {
            console.warn("Loaded data structure is invalid. Resetting to initial state.");
            // Reset to initial state if structure is wrong
            setPlayersOnField(initialState.playersOnField);
            setOpponents(initialState.opponents);
            setDrawings(initialState.drawings);
            setAvailablePlayers(initialState.availablePlayers);
            setShowPlayerNames(initialState.showPlayerNames);
            setTeamName(initialState.teamName); // Reset team name
            setGameEvents(initialState.gameEvents); // Ensure gameEvents are reset
            setHistory([initialState]);
            setHistoryIndex(0);
            // Reset game info state
            setOpponentName(initialState.opponentName);
            setGameDate(initialState.gameDate);
            setHomeScore(initialState.homeScore);
            setAwayScore(initialState.awayScore);
            setGameNotes(initialState.gameNotes);
            // Reset game structure state on fallback
            setNumberOfPeriods(2);
            setPeriodDurationMinutes(10);
        }
      } else {
          console.log("No saved state found in localStorage. Using initial state.");
          // Explicitly set initial state if nothing is saved
          setPlayersOnField(initialState.playersOnField);
          setOpponents(initialState.opponents);
          setDrawings(initialState.drawings);
          setAvailablePlayers(initialState.availablePlayers);
          setShowPlayerNames(initialState.showPlayerNames);
          setTeamName(initialState.teamName); // Set initial team name
          setGameEvents(initialState.gameEvents); // Ensure gameEvents are set initially
          // Set initial game info state
          setOpponentName(initialState.opponentName);
          setGameDate(initialState.gameDate);
          setHomeScore(initialState.homeScore);
          setAwayScore(initialState.awayScore);
          setGameNotes(initialState.gameNotes);
          // Set initial game structure state
          setNumberOfPeriods(2);
          setPeriodDurationMinutes(10);
      }
    } catch (error) {
      console.error("Failed to load or parse state from localStorage:", error);
      // Proceed with initial state if loading fails
    }
    setIsLoaded(true); // Mark loading as complete
  }, []); // Empty dependency array ensures this runs only once on mount

  // --- Save state to localStorage whenever history or index changes ---
  useEffect(() => {
    // Only save after initial load is complete
    if (isLoaded) {
      console.log(`Saving state to localStorage (Index: ${historyIndex}, History Length: ${history.length})`);
      try {
        const dataToSave = JSON.stringify({ history, historyIndex });
        localStorage.setItem(LOCAL_STORAGE_KEY, dataToSave);
      } catch (error) {
        console.error("Failed to save state to localStorage:", error);
      }
    }
  }, [history, historyIndex, isLoaded]); // Run when history, index, or loaded status changes

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

  // --- History Management ---
  const saveStateToHistory = useCallback((newState: Partial<AppState>) => {
    const currentAppState: AppState = {
      playersOnField,
      opponents,
      drawings,
      availablePlayers,
      showPlayerNames,
      teamName,
      gameEvents, // Include gameEvents in current state snapshot
      // Include game info in state snapshot
      opponentName,
      gameDate,
      homeScore,
      awayScore,
      gameNotes,
      // Include game structure in state snapshot
      numberOfPeriods,
      periodDurationMinutes,
      currentPeriod,
      gameStatus,
    };
    
    const nextState: AppState = { ...currentAppState, ...newState };

    // Check if next state is actually different from current state
    // Note: Simple JSON stringify comparison works for our data structure
    if (JSON.stringify(nextState) === JSON.stringify(currentAppState)) {
      // console.log("State hasn't changed, skipping history save.");
      return; // Don't save if nothing changed
    }

    // Truncate history if we are undoing/redoing
    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, nextState]);
    setHistoryIndex(newHistory.length);
  }, [history, historyIndex, playersOnField, opponents, drawings, availablePlayers, showPlayerNames, teamName, gameEvents, opponentName, gameDate, homeScore, awayScore, gameNotes, numberOfPeriods, periodDurationMinutes, currentPeriod, gameStatus]); // Add game structure dependencies

  // --- Load state from history on index change ---
  useEffect(() => {
    if (historyIndex >= 0 && historyIndex < history.length) {
      const stateToLoad = history[historyIndex];
      setPlayersOnField(stateToLoad.playersOnField);
      setOpponents(stateToLoad.opponents || []);
      setDrawings(stateToLoad.drawings);
      setAvailablePlayers(stateToLoad.availablePlayers);
      setShowPlayerNames(stateToLoad.showPlayerNames);
      setTeamName(stateToLoad.teamName || initialState.teamName);
      setGameEvents(stateToLoad.gameEvents || []);
      // Load game info from history state
      setOpponentName(stateToLoad.opponentName || initialState.opponentName);
      setGameDate(stateToLoad.gameDate || initialState.gameDate);
      setHomeScore(stateToLoad.homeScore || 0);
      setAwayScore(stateToLoad.awayScore || 0);
      setGameNotes(stateToLoad.gameNotes || '');
      // Load game structure from history state
      setNumberOfPeriods(stateToLoad.numberOfPeriods || 2);
      setPeriodDurationMinutes(stateToLoad.periodDurationMinutes || 10);
      setCurrentPeriod(stateToLoad.currentPeriod || 1);
      setGameStatus(stateToLoad.gameStatus || 'notStarted');
    }
  }, [historyIndex, history]); // History dependency added

  // --- Player Management Handlers (Updated for relative coords) ---
  const handleDropOnField = useCallback((playerId: string, relX: number, relY: number) => {
    const playerToAdd = availablePlayers.find(p => p.id === playerId);
    if (!playerToAdd) return;

    const playerOnFieldIndex = playersOnField.findIndex(p => p.id === playerId);
    let newPlayersOnField: Player[];
    if (playerOnFieldIndex !== -1) {
      // Move existing player
      newPlayersOnField = playersOnField.map(p =>
        p.id === playerId ? { ...p, relX, relY } : p // Use relX, relY
      );
    } else {
      // Add new player
      newPlayersOnField = [...playersOnField, { ...playerToAdd, relX, relY }]; // Use relX, relY
    }
    saveStateToHistory({ playersOnField: newPlayersOnField });
    setDraggingPlayerFromBarInfo(null);
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
    // Also update name if player is on field
    const updatedPlayersOnField = playersOnField.map(p => 
      p.id === playerId ? { ...p, name: newName } : p
    );
    saveStateToHistory({ 
      availablePlayers: updatedAvailablePlayers, 
      playersOnField: updatedPlayersOnField 
    });
  }, [availablePlayers, playersOnField, saveStateToHistory]);

  // --- Drawing Handlers (Updated for relative coords) ---
  const handleDrawingStart = useCallback((point: Point) => {
    saveStateToHistory({ drawings: [...drawings, [point]] }); // Point already uses relX, relY
  }, [drawings, saveStateToHistory]);

  const handleDrawingAddPoint = useCallback((point: Point) => {
    setDrawings(prevDrawings => {
      if (prevDrawings.length === 0) return prevDrawings;
      const currentPath = prevDrawings[prevDrawings.length - 1];
      const updatedPath = [...currentPath, point]; // Point already uses relX, relY
      return [...prevDrawings.slice(0, -1), updatedPath];
    });
    // Save on end
  }, []);

  const handleDrawingEnd = useCallback(() => {
    saveStateToHistory({ drawings });
  }, [drawings, saveStateToHistory]);

  const handleClearDrawings = useCallback(() => {
    saveStateToHistory({ drawings: [] });
  }, [saveStateToHistory]);

  // --- Opponent Handlers (Updated for relative coords) ---
  const handleAddOpponent = useCallback(() => {
    const newOpponentId = `opp-${Math.floor(Math.random() * 1000000)}`;
    const defaultPosition = { relX: 0.5, relY: 0.5 }; // Center position relative
    const newOpponent: Opponent = {
      id: newOpponentId,
      ...defaultPosition,
    };
    saveStateToHistory({ opponents: [...opponents, newOpponent] });
  }, [opponents, saveStateToHistory]);

  const handleOpponentMove = useCallback((opponentId: string, relX: number, relY: number) => {
    setOpponents(prevOpponents => 
      prevOpponents.map(opp => 
        opp.id === opponentId ? { ...opp, relX, relY } : opp // Use relX, relY
      )
    );
    // Save on end
  }, []);

  const handleOpponentMoveEnd = useCallback(() => {
    // _opponentId might be useful later, but currently unused
    console.log("Opponent move ended, saving state.");
    saveStateToHistory({ opponents });
  }, [opponents, saveStateToHistory]);

  const handleOpponentRemove = useCallback((opponentId: string) => {
    const updatedOpponents = opponents.filter(opp => opp.id !== opponentId);
    saveStateToHistory({ opponents: updatedOpponents });
  }, [opponents, saveStateToHistory]);

  // --- Reset Handler (no change needed) ---
  const handleResetField = useCallback(() => {
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
    if (newName.trim()) {
        console.log("Updating team name to:", newName.trim());
        saveStateToHistory({ teamName: newName.trim() });
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

  // NEW Handler to reset game statistics
  const handleResetGameStats = () => {
    console.log("Resetting game stats...");
    // Reset the relevant state variables
    setGameEvents([]);
    setHomeScore(0);
    setAwayScore(0);
    setGameNotes('');
    // Save this reset state to history
    saveStateToHistory({
        gameEvents: [],
        homeScore: 0,
        awayScore: 0,
        gameNotes: '',
    });
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
              lastSubConfirmationTimeSeconds={lastSubConfirmationTimeSeconds}
              // Game Structure props & handlers
              numberOfPeriods={numberOfPeriods}
              periodDurationMinutes={periodDurationMinutes}
              currentPeriod={currentPeriod}
              gameStatus={gameStatus}
              onSetNumberOfPeriods={handleSetNumberOfPeriods}
              onSetPeriodDuration={handleSetPeriodDuration}
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
        isTimerRunning={isTimerRunning}
        onStartPauseTimer={handleStartPauseTimer}
        onResetTimer={handleResetTimer}
        timeElapsedInSeconds={timeElapsedInSeconds}
        showLargeTimerOverlay={showLargeTimerOverlay}
        onToggleLargeTimerOverlay={handleToggleLargeTimerOverlay}
          onToggleInstructions={handleToggleInstructions}
          isFullscreen={isFullscreen}
          onToggleFullScreen={toggleFullScreen}
          onToggleGoalLogModal={handleToggleGoalLogModal}
          onToggleGameStatsModal={handleToggleGameStatsModal}
        />
        {/* Instructions Modal */}
        <InstructionsModal 
          isOpen={isInstructionsOpen} 
          onClose={handleToggleInstructions}
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
          onResetGameStats={handleResetGameStats}
        />
      </div>
    </div>
  );
}


