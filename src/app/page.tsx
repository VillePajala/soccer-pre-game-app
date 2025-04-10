'use client';

import React, { useState, useEffect, useCallback } from 'react'; // Added useEffect, useCallback
import SoccerField from '@/components/SoccerField';
import PlayerBar from '@/components/PlayerBar';
import ControlBar from '@/components/ControlBar';
import TimerOverlay from '@/components/TimerOverlay'; // Import TimerOverlay
import InstructionsModal from '@/components/InstructionsModal'; // Import InstructionsModal

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

// Define the structure for the application state (for history)
interface AppState {
  playersOnField: Player[];
  opponents: Opponent[]; 
  drawings: Point[][];
  availablePlayers: Player[]; // Available players don't need coordinates
  showPlayerNames: boolean;
  teamName: string; 
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

  // --- Timer Effect ---
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;

    if (isTimerRunning) {
      intervalId = setInterval(() => {
        setTimeElapsedInSeconds(prevTime => {
          const newTime = prevTime + 1;
          const currentDueTime = nextSubDueTimeSeconds; // Capture current due time
          const warningTime = currentDueTime - 60;

          let newAlertLevel: 'none' | 'warning' | 'due' = 'none';
          if (newTime >= currentDueTime) {
            newAlertLevel = 'due';
          } else if (warningTime >= 0 && newTime >= warningTime) { 
            // Show warning if warning time is valid (>= 0) and current time reached it
            newAlertLevel = 'warning';
          }
          setSubAlertLevel(newAlertLevel);

          return newTime;
        });
      }, 1000);
    } else {
      // Clear interval if it exists and timer is not running
      if (intervalId) {
        clearInterval(intervalId);
      }
    }

    // Cleanup function to clear the interval when the component unmounts
    // or before the effect runs again if isTimerRunning changes
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [isTimerRunning, nextSubDueTimeSeconds, subIntervalMinutes]); // ADD dependencies

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
            setTeamName(currentState.teamName || initialState.teamName); // Load team name
          } else {
            console.warn("Loaded historyIndex is out of bounds.");
            // Fallback to initial state if index is bad
            setPlayersOnField(initialState.playersOnField);
            setOpponents(initialState.opponents);
            setDrawings(initialState.drawings);
            setAvailablePlayers(initialState.availablePlayers);
            setShowPlayerNames(initialState.showPlayerNames);
            setTeamName(initialState.teamName); // Reset team name
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
            setHistory([initialState]);
            setHistoryIndex(0);
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

  // Function to save a new state to history
  const saveState = useCallback((newStateChanges: Partial<AppState>) => {
    setHistory((prevHistory) => {
      const newHistory = prevHistory.slice(0, historyIndex + 1);
      const currentState = newHistory[newHistory.length - 1];
      const nextState: AppState = { ...currentState, ...newStateChanges };
      console.log("Saving new state snapshot:", nextState);
      return [...newHistory, nextState];
    });
    setHistoryIndex((prevIndex) => prevIndex + 1);

    // Apply the changes to the current state
    if (newStateChanges.playersOnField !== undefined) setPlayersOnField(newStateChanges.playersOnField);
    if (newStateChanges.opponents !== undefined) setOpponents(newStateChanges.opponents);
    if (newStateChanges.drawings !== undefined) setDrawings(newStateChanges.drawings);
    if (newStateChanges.availablePlayers !== undefined) setAvailablePlayers(newStateChanges.availablePlayers);
    if (newStateChanges.showPlayerNames !== undefined) setShowPlayerNames(newStateChanges.showPlayerNames);
    if (newStateChanges.teamName !== undefined) setTeamName(newStateChanges.teamName);

  }, [historyIndex]);

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
    saveState({ playersOnField: newPlayersOnField });
    setDraggingPlayerFromBarInfo(null);
  }, [availablePlayers, playersOnField, saveState]);

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
    saveState({ playersOnField });
  }, [playersOnField, saveState]);

  const handlePlayerRemove = useCallback((playerId: string) => {
    const updatedPlayersOnField = playersOnField.filter(p => p.id !== playerId);
    saveState({ playersOnField: updatedPlayersOnField });
  }, [playersOnField, saveState]);
  
  const handleRenamePlayer = useCallback((playerId: string, newName: string) => {
    const updatedAvailablePlayers = availablePlayers.map(p => 
      p.id === playerId ? { ...p, name: newName } : p
    );
    // Also update name if player is on field
    const updatedPlayersOnField = playersOnField.map(p => 
      p.id === playerId ? { ...p, name: newName } : p
    );
    saveState({ 
      availablePlayers: updatedAvailablePlayers, 
      playersOnField: updatedPlayersOnField 
    });
  }, [availablePlayers, playersOnField, saveState]);

  // --- Drawing Handlers (Updated for relative coords) ---
  const handleDrawingStart = useCallback((point: Point) => {
    saveState({ drawings: [...drawings, [point]] }); // Point already uses relX, relY
  }, [drawings, saveState]);

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
    saveState({ drawings });
  }, [drawings, saveState]);

  const handleClearDrawings = useCallback(() => {
    saveState({ drawings: [] });
  }, [saveState]);

  // --- Opponent Handlers (Updated for relative coords) ---
  const handleAddOpponent = useCallback(() => {
    const newOpponentId = `opp-${Math.floor(Math.random() * 1000000)}`;
    const defaultPosition = { relX: 0.5, relY: 0.5 }; // Center position relative
    const newOpponent: Opponent = {
      id: newOpponentId,
      ...defaultPosition,
    };
    saveState({ opponents: [...opponents, newOpponent] });
  }, [opponents, saveState]);

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
    saveState({ opponents });
  }, [opponents, saveState]);

  const handleOpponentRemove = useCallback((opponentId: string) => {
    const updatedOpponents = opponents.filter(opp => opp.id !== opponentId);
    saveState({ opponents: updatedOpponents });
  }, [opponents, saveState]);

  // --- Reset Handler (no change needed) ---
  const handleResetField = useCallback(() => {
    saveState({ playersOnField: [], opponents: [], drawings: [] });
  }, [saveState]);

  // --- Touch Drag from Bar Handlers (Updated for relative coords) ---
  const handlePlayerDragStartFromBar = useCallback((playerInfo: Player) => {
    setDraggingPlayerFromBarInfo(playerInfo);
  }, []);

  const handlePlayerDropViaTouch = useCallback((relX: number, relY: number) => {
    if (draggingPlayerFromBarInfo) {
      handleDropOnField(draggingPlayerFromBarInfo.id, relX, relY); // Pass relX, relY
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
    saveState({ showPlayerNames: nextShowNames });
  };

  // --- Team Name Handler ---
  const handleTeamNameChange = (newName: string) => {
    if (newName.trim()) {
        console.log("Updating team name to:", newName.trim());
        saveState({ teamName: newName.trim() });
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
    if (!isTimerRunning && timeElapsedInSeconds === 0) {
      setCompletedIntervalDurations([]);
      setLastSubConfirmationTimeSeconds(0); 
      setNextSubDueTimeSeconds(subIntervalMinutes * 60);
      setSubAlertLevel('none'); // Reset alert level when starting fresh
      console.log("Starting timer from zero, clearing duration history.");
    }
    setIsTimerRunning(prev => !prev);
  };

  const handleResetTimer = () => {
    setTimeElapsedInSeconds(0);
    setIsTimerRunning(false);
    setNextSubDueTimeSeconds(subIntervalMinutes * 60);
    setSubAlertLevel('none'); // Reset alert level
    setLastSubConfirmationTimeSeconds(0);
  };

  const handleSubstitutionMade = () => {
    const duration = timeElapsedInSeconds - lastSubConfirmationTimeSeconds;
    const currentElapsedTime = timeElapsedInSeconds; // Capture current time *before* state updates
    const currentIntervalMins = subIntervalMinutes; // Capture interval
    
    setCompletedIntervalDurations(prev => [duration, ...prev]); 
    setLastSubConfirmationTimeSeconds(currentElapsedTime);
    
    // Calculate the next due time based on the previous one
    let newDueTime = 0;
    setNextSubDueTimeSeconds(prevDueTime => { 
        newDueTime = prevDueTime + currentIntervalMins * 60;
        return newDueTime;
    });

    // Now, immediately re-evaluate the alert level based on current time and *new* due time
    const newWarningTime = newDueTime - 60;
    let newAlertLevel: 'none' | 'warning' | 'due' = 'none';
    if (currentElapsedTime >= newDueTime) { // Should typically not happen if logic is right
        newAlertLevel = 'due'; 
    } else if (newWarningTime >= 0 && currentElapsedTime >= newWarningTime) {
        // Show warning if warning time is valid (>= 0) and current time reached it
        newAlertLevel = 'warning';
    }
    setSubAlertLevel(newAlertLevel); // Set the calculated level
    
    console.log(`Sub made at ${currentElapsedTime}s. Duration: ${duration}s. Next due: ${newDueTime}s. New Alert: ${newAlertLevel}`);
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
          // Pass fullscreen state and handler down
          isFullscreen={isFullscreen}
          onToggleFullScreen={toggleFullScreen}
        />
        {/* Instructions Modal */}
        <InstructionsModal 
          isOpen={isInstructionsOpen} 
          onClose={() => setIsInstructionsOpen(false)} 
        />
      </div>
    </div>
  );
}


