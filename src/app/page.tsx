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

  // Handler for dropping a player onto the field
  const handleDropOnField = (playerId: string, x: number, y: number) => {
    console.log(`Player ${playerId} dropped at (${x}, ${y})`);

    // Find the player in the available list
    const playerToAdd = availablePlayers.find((p) => p.id === playerId);

    if (playerToAdd) {
      // Add player to field with coordinates
      setPlayersOnField((prev) => [...prev, { ...playerToAdd, x, y }]);

      // Remove player from available list
      setAvailablePlayers((prev) => prev.filter((p) => p.id !== playerId));
    } else {
      console.warn(`Player with ID ${playerId} not found in available players.`);
      // Handle case where player might already be on field (repositioning - later)
    }
  };

  // TODO: Add handler for dragging players already on the field
  // TODO: Add handler for dragging players off the field (back to bar? delete?)

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* Pass availablePlayers state to PlayerBar */}
      <PlayerBar players={availablePlayers} />

      {/* Main Field Area */}
      <div className="flex-grow bg-green-600 p-4 flex items-center justify-center relative"> {/* Added relative positioning for potential absolute positioning of players */}
        {/* Pass playersOnField state and drop handler to SoccerField */}
        <SoccerField players={playersOnField} onPlayerDrop={handleDropOnField} />
      </div>

      {/* Bottom Control Bar */}
      <ControlBar />
    </div>
  );
}
