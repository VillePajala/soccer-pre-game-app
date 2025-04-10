'use client'; // Needed for useState

import React, { useState, useEffect, useCallback } from 'react'; // Added useEffect, useCallback
import SoccerField from '@/components/SoccerField';
import PlayerBar from '@/components/PlayerBar';
import ControlBar from '@/components/ControlBar';

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
  y: number;
}

// Define the shape of our state snapshot for history
interface AppState {
  playersOnField: Player[];
  drawings: Point[][];
  availablePlayers: Player[]; // Include available players for full undo/redo
  showPlayerNames: boolean; // Add to state snapshot
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
};

// Define localStorage key
const LOCAL_STORAGE_KEY = 'soccerTacticsAppState';

export default function Home() {
  // --- State Management ---
  const [playersOnField, setPlayersOnField] = useState<Player[]>(initialState.playersOnField);
  const [drawings, setDrawings] = useState<Point[][]>(initialState.drawings);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(initialState.availablePlayers);
  const [showPlayerNames, setShowPlayerNames] = useState<boolean>(initialState.showPlayerNames);
  const [history, setHistory] = useState<AppState[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [isLoaded, setIsLoaded] = useState<boolean>(false); // Flag to prevent overwriting loaded state

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
          } else {
            console.warn("Loaded historyIndex is out of bounds.");
          }
        } else {
            console.warn("Loaded data structure is invalid.")
        }
      } else {
          console.log("No saved state found in localStorage.")
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
        showPlayerNames: true // Reset to default
    };

    // 6. Save the new state
    saveState(resetState);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <PlayerBar players={availablePlayers} onRenamePlayer={handleRenamePlayer} />

      <div className="flex-grow bg-green-600 p-4 flex items-center justify-center relative">
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
        />
      </div>

      <ControlBar
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        onToggleNames={handleTogglePlayerNames}
        onResetField={handleResetField}
      />
    </div>
  );
}
