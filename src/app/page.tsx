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
};

export default function Home() {
  // --- State Management ---
  const [playersOnField, setPlayersOnField] = useState<Player[]>(initialState.playersOnField);
  const [drawings, setDrawings] = useState<Point[][]>(initialState.drawings);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(initialState.availablePlayers);

  // History State
  const [history, setHistory] = useState<AppState[]>([initialState]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Function to save a new state to history
  const saveState = useCallback((newState: Partial<AppState>) => {
    const currentState = history[historyIndex];
    const nextState: AppState = {
      playersOnField: newState.playersOnField ?? currentState.playersOnField,
      drawings: newState.drawings ?? currentState.drawings,
      availablePlayers: newState.availablePlayers ?? currentState.availablePlayers,
    };

    // Avoid saving if state hasn't actually changed (simple check)
    if (JSON.stringify(nextState) === JSON.stringify(currentState)) {
      console.log("State hasn't changed, not saving history.");
      return;
    }

    console.log("Saving new state to history");
    const newHistory = history.slice(0, historyIndex + 1); // Discard redo states
    newHistory.push(nextState);

    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);

    // Update actual state (this might seem redundant, but ensures consistency)
    setPlayersOnField(nextState.playersOnField);
    setDrawings(nextState.drawings);
    setAvailablePlayers(nextState.availablePlayers);

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
    saveState({ playersOnField });
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
    saveState(nextState); // Save the calculated new state
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
    // The visual state (drawings) is already updated, just save it
    saveState({ drawings });
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
      setHistoryIndex(nextStateIndex);
    } else {
      console.log("Cannot redo: at end of history");
    }
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <PlayerBar players={availablePlayers} />

      <div className="flex-grow bg-green-600 p-4 flex items-center justify-center relative">
        <SoccerField
          players={playersOnField}
          drawings={drawings}
          onPlayerDrop={handleDropOnField}
          onPlayerMove={handlePlayerMove} // Still used for live visual update
          onPlayerMoveEnd={handlePlayerMoveEnd} // Call this when drag finishes
          onDrawingStart={handleDrawingStart}
          onDrawingAddPoint={handleDrawingAddPoint} // Still used for live visual update
          onDrawingEnd={handleDrawingEnd}
        />
      </div>

      {/* Pass undo/redo handlers and status to ControlBar */}
      <ControlBar onUndo={handleUndo} onRedo={handleRedo} canUndo={canUndo} canRedo={canRedo} />
    </div>
  );
}
