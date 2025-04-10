'use client'; // Needed for useState

import React, { useState } from 'react'; // Import useState
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

// Placeholder data moved here
const initialAvailablePlayers: Player[] = [
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

export default function Home() {
  // State for players in the top bar
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(
    initialAvailablePlayers
  );
  // State for players placed on the field
  const [playersOnField, setPlayersOnField] = useState<Player[]>([]);

  // Function to update the position of a player already on the field
  const handlePlayerMove = (playerId: string, x: number, y: number) => {
    console.log(`Moving player ${playerId} to (${x}, ${y}) in state`);
    setPlayersOnField((prev) =>
      prev.map((p) => (p.id === playerId ? { ...p, x, y } : p))
    );
  };

  // Handles drops onto the field (both initial add and moves)
  const handleDropOnField = (playerId: string, x: number, y: number) => {
    // Check if player is already on the field (signifying a move)
    const playerIsOnField = playersOnField.some((p) => p.id === playerId);

    if (playerIsOnField) {
      // Player is already on the field, just update position
      // Note: This might be redundant if mousemove already called handlePlayerMove,
      // but good for handling drops if we use HTML D&D for repositioning later.
      console.log(`Drop Move detected for ${playerId} to (${x}, ${y})`);
      handlePlayerMove(playerId, x, y);
    } else {
      // Player is not on the field, try adding from available list
      const playerToAdd = availablePlayers.find((p) => p.id === playerId);
      if (playerToAdd) {
        console.log(`Adding player ${playerId} from bar at (${x}, ${y})`);
        setPlayersOnField((prev) => [...prev, { ...playerToAdd, x, y }]);
        setAvailablePlayers((prev) => prev.filter((p) => p.id !== playerId));
      } else {
        console.warn(`Dropped player ID ${playerId} not found on field or in bar.`);
      }
    }
  };

  // TODO: Add handler for dragging players off the field (back to bar? delete?)

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Pass availablePlayers state to PlayerBar */}
      <PlayerBar players={availablePlayers} />

      {/* Main Field Area */}
      <div className="flex-grow bg-green-600 p-4 flex items-center justify-center relative"> {/* Added relative positioning for potential absolute positioning of players */}
        {/* Pass playersOnField state and drop handler to SoccerField */}
        <SoccerField
          players={playersOnField}
          onPlayerDrop={handleDropOnField} // Handles initial drop from bar
          onPlayerMove={handlePlayerMove} // Handles moving existing players via mouse events
        />
      </div>

      {/* Bottom Control Bar */}
      <ControlBar />
    </div>
  );
}
