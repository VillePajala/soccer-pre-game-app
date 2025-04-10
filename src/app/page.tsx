'use client'; // Needed for useState

import React, { useState, useEffect, useCallback } from 'react'; // Added useEffect, useCallback
import SoccerField from '@/components/SoccerField';
import PlayerBar from '@/components/PlayerBar';
import ControlBar from '@/components/ControlBar';
import TimerOverlay from '@/components/TimerOverlay'; // Import TimerOverlay

// Define the Player type
export interface Player {
  id: string;
  name: string;
  x?: number; // Optional: X-coordinate on the field
  y?: number; // Optional: Y-coordinate on the field
  color?: string; // Optional: Specific color for the disk
}

// Define the Point type for drawing
export interface Point {
  x: number;
  y: number
}

// Define the Opponent type
export interface Opponent {
  id: string;
  x: number;
  y: number;
}

// Define the shape of our state snapshot for history
interface AppState {
  playersOnField: Player[];
  drawings: Point[][];
  availablePlayers: Player[]; // Include available players for full undo/redo
  showPlayerNames: boolean; // Add to state snapshot
  opponents: Opponent[]; // Add opponents to state snapshot
}

// Placeholder data moved here
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
  playersOnField: [],
  drawings: [],
  availablePlayers: initialAvailablePlayersData,
  showPlayerNames: true, // Default to showing names
  opponents: [], // Initialize opponents
};

// Define localStorage key
const LOCAL_STORAGE_KEY = 'soccerTacticsAppState';

export default function Home() {
  // --- State Management ---
  const [playersOnField, setPlayersOnField] = useState<Player[]>(initialState.playersOnField);
  const [drawings, setDrawings] = useState<Point[][]>(initialState.drawings);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(initialState.availablePlayers);
  const [showPlayerNames, setShowPlayerNames] = useState<boolean>(initialState.showPlayerNames);
  const [opponents, setOpponents] = useState<Opponent[]>(initialState.opponents); // Add opponent state
  const [history, setHistory] = useState<AppState[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false); // Flag to prevent overwriting loaded state

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
          const currentIntervalMinutes = subIntervalMinutes; // Capture current interval
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

            // Set history and index first
            setHistory(loadedHistory);
            setHistoryIndex(loadedIndex);

            // Update visual state based on loaded history index
            setPlayersOnField(currentState.playersOnField);
            setDrawings(currentState.drawings);
            setAvailablePlayers(currentState.availablePlayers);
            setShowPlayerNames(currentState.showPlayerNames);
            setOpponents(currentState.opponents || []); // Load opponents (handle potentially missing key)
          } else {
            console.warn("Loaded historyIndex is out of bounds.");
            // Fallback to initial state if index is bad
            setPlayersOnField(initialState.playersOnField);
            setDrawings(initialState.drawings);
            setAvailablePlayers(initialState.availablePlayers);
            setShowPlayerNames(initialState.showPlayerNames);
            setOpponents(initialState.opponents);
          }
        } else {
            console.warn("Loaded data structure is invalid. Resetting to initial state.");
            // Reset to initial state if structure is wrong
            setPlayersOnField(initialState.playersOnField);
            setDrawings(initialState.drawings);
            setAvailablePlayers(initialState.availablePlayers);
            setShowPlayerNames(initialState.showPlayerNames);
            setOpponents(initialState.opponents);
            setHistory([initialState]);
            setHistoryIndex(0);
        }
      } else {
          console.log("No saved state found in localStorage. Using initial state.");
          // Explicitly set initial state if nothing is saved
          setPlayersOnField(initialState.playersOnField);
          setDrawings(initialState.drawings);
          setAvailablePlayers(initialState.availablePlayers);
          setShowPlayerNames(initialState.showPlayerNames);
          setOpponents(initialState.opponents);
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

  // Function to save a new state to history
  const saveState = useCallback((newState: Partial<AppState>) => {
    const currentState = history[historyIndex];
    const nextState: AppState = {
      playersOnField: newState.playersOnField ?? currentState.playersOnField,
      drawings: newState.drawings ?? currentState.drawings,
      availablePlayers: newState.availablePlayers ?? currentState.availablePlayers,
      showPlayerNames: newState.showPlayerNames ?? currentState.showPlayerNames,
      opponents: newState.opponents ?? currentState.opponents, // Include opponents
    };

    if (JSON.stringify(nextState) === JSON.stringify(currentState)) {
      console.log("State hasn't changed, not saving history.");
      return;
    }

    console.log("Saving new state to history");
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(nextState);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    setPlayersOnField(nextState.playersOnField);
    setDrawings(nextState.drawings);
    setAvailablePlayers(nextState.availablePlayers);
    setShowPlayerNames(nextState.showPlayerNames);
    setOpponents(nextState.opponents); // Update opponents visual state

  }, [history, historyIndex]);

  // --- Action Handlers (modified to use saveState) ---

  // Called frequently during drag, but saveState is called by onPlayerMoveEnd
  const handlePlayerMove = (playerId: string, x: number, y: number) => {
    // Update visual state immediately for smoothness
    setPlayersOnField((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, x, y } : p))
    );
  };

  // Called when a drag operation (player move) finishes
  const handlePlayerMoveEnd = () => {
    console.log("Player move ended, saving state.");
    // Save the current visual state (playersOnField) to history
    // Important: Create a *new* object/array reference for saveState
    saveState({ playersOnField: [...playersOnField] });
  };

  // Handles drops from PlayerBar OR completed drag/drop *within* the field
  const handleDropOnField = (playerId: string, x: number, y: number) => {
    const playerIsOnField = playersOnField.some((p) => p.id === playerId);
    const currentState = history[historyIndex];
    let nextState: Partial<AppState> = {};

    if (playerIsOnField) {
      // It's a move that just finished via drop (alternative to mouse up)
      console.log(`Drop Move finished for ${playerId} to (${x}, ${y})`);
      nextState = {
        playersOnField: currentState.playersOnField.map((p) =>
          p.id === playerId ? { ...p, x, y } : p
        )
      };
    } else {
      // Adding a player from the bar
      const playerToAdd = availablePlayers.find((p) => p.id === playerId);
      if (playerToAdd) {
        console.log(`Adding player ${playerId} via drop at (${x}, ${y})`);
        nextState = {
          playersOnField: [...currentState.playersOnField, { ...playerToAdd, x, y }],
          availablePlayers: currentState.availablePlayers.filter((p) => p.id !== playerId),
        };
      } else {
        console.warn(`Drop: Player ID ${playerId} not found.`);
        return; // Don't save state if nothing happened
      }
    }
    // Important: Ensure new references are passed to saveState if modifying based on currentState
    saveState({ 
      playersOnField: nextState.playersOnField ? [...nextState.playersOnField] : undefined,
      availablePlayers: nextState.availablePlayers ? [...nextState.availablePlayers] : undefined
    }); 
  };

  // Drawing handlers: only save state when drawing ends
  const handleDrawingStart = (point: Point) => {
    console.log('Drawing started at:', point);
    // Visually start the line immediately
    setDrawings((prev) => [...prev, [point]]);
  };

  const handleDrawingAddPoint = (point: Point) => {
    // Visually update the line immediately
    setDrawings((prev) => {
      const currentDrawing = prev[prev.length - 1];
      const updatedDrawing = [...currentDrawing, point];
      return [...prev.slice(0, -1), updatedDrawing];
    });
  };

  const handleDrawingEnd = () => {
    console.log('Drawing ended, saving state.');
    // Ensure a new array reference is passed to saveState
    saveState({ drawings: drawings.map(path => [...path]) });
  };

  // --- Handle Removing Player from Field ---
  const handlePlayerRemove = (playerId: string) => {
    console.log(`Attempting to remove player ${playerId} from field.`);
    const playerToRemove = playersOnField.find(p => p.id === playerId);

    if (!playerToRemove) {
      console.warn(`Player ${playerId} not found on field.`);
      return;
    }

    // Create the player object to add back to available (without x, y)
    const playerToReturn = { id: playerToRemove.id, name: playerToRemove.name };

    // Remove from field
    const nextPlayersOnField = playersOnField.filter(p => p.id !== playerId);

    // Add back to available and sort
    const nextAvailablePlayers = [...availablePlayers, playerToReturn];
    nextAvailablePlayers.sort((a, b) => {
      const numA = parseInt(a.id.substring(1));
      const numB = parseInt(b.id.substring(1));
      return numA - numB;
    });

    // Update visual state immediately (optional, but can feel smoother)
    // setPlayersOnField(nextPlayersOnField);
    // setAvailablePlayers(nextAvailablePlayers);

    // Save the state change
    saveState({ 
      playersOnField: nextPlayersOnField, 
      availablePlayers: nextAvailablePlayers 
    });
  };

  // --- Toggle Player Names Handler ---
  const handleTogglePlayerNames = () => {
    console.log('Toggling player names');
    const nextShowNames = !showPlayerNames;
    setShowPlayerNames(nextShowNames);
    saveState({ showPlayerNames: nextShowNames });
  };

  // --- Rename Player Handler ---
  const handleRenamePlayer = (playerId: string, newName: string) => {
    if (!newName.trim()) {
      console.warn("Player name cannot be empty.");
      return; // Or revert to old name?
    }
    console.log(`Renaming player ${playerId} to ${newName}`);
    const updatedAvailablePlayers = availablePlayers.map(p =>
      p.id === playerId ? { ...p, name: newName.trim() } : p
    );
    // Also update player on field if they exist there with the same ID
    const updatedPlayersOnField = playersOnField.map(p => 
      p.id === playerId ? { ...p, name: newName.trim() } : p
    );

    setAvailablePlayers(updatedAvailablePlayers); // Update visual state immediately
    setPlayersOnField(updatedPlayersOnField); // Update field players too

    saveState({ 
        availablePlayers: updatedAvailablePlayers,
        playersOnField: updatedPlayersOnField
    });
  };

  // --- Undo/Redo Handlers ---
  const handleUndo = () => {
    if (historyIndex > 0) {
      console.log("Undoing...");
      const prevStateIndex = historyIndex - 1;
      const prevState = history[prevStateIndex];
      setPlayersOnField(prevState.playersOnField);
      setDrawings(prevState.drawings);
      setAvailablePlayers(prevState.availablePlayers);
      setShowPlayerNames(prevState.showPlayerNames);
      setHistoryIndex(prevStateIndex);
      setOpponents(prevState.opponents); // Undo opponents
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
      setDrawings(nextState.drawings);
      setAvailablePlayers(nextState.availablePlayers);
      setShowPlayerNames(nextState.showPlayerNames);
      setHistoryIndex(nextStateIndex);
      setOpponents(nextState.opponents); // Redo opponents
    } else {
      console.log("Cannot redo: at end of history");
    }
  };

  // --- Reset Field Handler ---
  const handleResetField = () => {
    console.log("Resetting field state (robustly)...");
    const currentState = history[historyIndex];

    // 1. Create a map of current names from both field and available players
    const currentNames = new Map<string, string>();
    currentState.availablePlayers.forEach(p => currentNames.set(p.id, p.name));
    currentState.playersOnField.forEach(p => currentNames.set(p.id, p.name)); // Overwrites if player was on field

    // 2. Start with the initial list of all players (deep copy)
    const resetAvailablePlayers = JSON.parse(JSON.stringify(initialAvailablePlayersData));

    // 3. Update names in the initial list based on the current names map
    resetAvailablePlayers.forEach((player: Player) => {
      if (currentNames.has(player.id)) {
        player.name = currentNames.get(player.id)!; // Update name if it was changed
      }
    });

    // 4. Sort the final list by ID (optional but good for consistency)
    resetAvailablePlayers.sort((a: Player, b: Player) => {
        const numA = parseInt(a.id.substring(1));
        const numB = parseInt(b.id.substring(1));
        return numA - numB;
    });

    // 5. Define the reset state
    const resetState: Partial<AppState> = {
        playersOnField: [],
        drawings: [],
        availablePlayers: resetAvailablePlayers, // Use the rebuilt list
        showPlayerNames: true, // Reset to default
        opponents: [], // Clear opponents on reset
    };

    // 6. Save the new state
    saveState(resetState);
  };

  // --- Add Opponent Handler ---
  const handleAddOpponent = () => {
    const newOpponentId = `opp-${Date.now()}`;
    const defaultPosition = { x: 100, y: 100 }; // Default placement
    const newOpponent: Opponent = {
      id: newOpponentId,
      ...defaultPosition,
    };
    console.log("Adding opponent:", newOpponentId);
    saveState({ opponents: [...opponents, newOpponent] });
  };

  // --- Opponent Handlers ---
  const handleOpponentMove = (opponentId: string, x: number, y: number) => {
    // Update visual state immediately for smoothness
    setOpponents((prev) =>
      prev.map((opp) => (opp.id === opponentId ? { ...opp, x, y } : opp))
    );
  };

  const handleOpponentMoveEnd = (opponentId: string) => {
    // Save the current state of opponents to history
    console.log(`Opponent ${opponentId} move ended, saving state.`);
    // Important: Create a *new* array reference for saveState
    saveState({ opponents: [...opponents] });
  };

  const handleOpponentRemove = (opponentId: string) => {
    console.log(`Removing opponent ${opponentId}...`);
    const nextOpponents = opponents.filter(opp => opp.id !== opponentId);
    saveState({ opponents: nextOpponents });
  };

  // --- Clear Drawings Handler ---
  const handleClearDrawings = () => {
    // Only clear if there are drawings to clear
    if (drawings.length > 0) {
      console.log("Clearing drawings...");
      saveState({ drawings: [] });
    } else {
      console.log("No drawings to clear.");
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
    setShowLargeTimerOverlay(prev => !prev);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <PlayerBar players={availablePlayers} onRenamePlayer={handleRenamePlayer} />

      <div className="flex-grow bg-green-600 flex items-center justify-center relative">
        <SoccerField
          players={playersOnField}
          drawings={drawings}
          showPlayerNames={showPlayerNames}
          onPlayerDrop={handleDropOnField}
          onPlayerMove={handlePlayerMove}
          onPlayerMoveEnd={handlePlayerMoveEnd}
          onDrawingStart={handleDrawingStart}
          onDrawingAddPoint={handleDrawingAddPoint}
          onDrawingEnd={handleDrawingEnd}
          onPlayerRemove={handlePlayerRemove}
          opponents={opponents}
          onOpponentMove={handleOpponentMove}
          onOpponentMoveEnd={handleOpponentMoveEnd}
          onOpponentRemove={handleOpponentRemove}
        />
        {showLargeTimerOverlay && (
          <TimerOverlay 
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
      </div>

      <ControlBar
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onToggleNames={handleTogglePlayerNames}
        onResetField={handleResetField}
        onClearDrawings={handleClearDrawings}
        onAddOpponent={handleAddOpponent}
        // Timer props
        timeElapsedInSeconds={timeElapsedInSeconds}
        isTimerRunning={isTimerRunning}
        onStartPauseTimer={handleStartPauseTimer}
        onResetTimer={handleResetTimer}
        // Timer Overlay props
        showLargeTimerOverlay={showLargeTimerOverlay}
        onToggleLargeTimerOverlay={handleToggleLargeTimerOverlay}
      />
    </div>
  );
}


