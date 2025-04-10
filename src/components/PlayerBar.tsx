'use client';

import React from 'react';
import PlayerDisk from './PlayerDisk'; // Import the PlayerDisk component
import { Player } from '@/app/page'; // Import the Player type

// Define props for PlayerBar
interface PlayerBarProps {
  players: Player[];
  onRenamePlayer: (playerId: string, newName: string) => void; // Add rename handler prop
}

// Placeholder data - this would eventually come from state/localStorage
// const availablePlayers = [
//   { id: 'p1', name: 'Player 1' },
//   { id: 'p2', name: 'Player 2' },
//   { id: 'p3', name: 'Player 3' },
//   { id: 'p4', name: 'Player 4' },
//   { id: 'p5', name: 'Player 5' },
//   { id: 'p6', name: 'Player 6' },
//   { id: 'p7', name: 'Player 7' },
//   { id: 'p8', name: 'Player 8' },
//   { id: 'p9', name: 'Player 9' },
//   { id: 'p10', name: 'Player 10' },
//   { id: 'p11', name: 'Player 11' },
// ];

const PlayerBar: React.FC<PlayerBarProps> = ({ players, onRenamePlayer }) => { // Destructure players and rename handler from props
  return (
    <div className="bg-slate-900 p-3 h-20 flex items-center flex-shrink-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-800 shadow-md">
      {players.map((player) => ( // Use the players prop
        <PlayerDisk
          key={player.id}
          id={player.id}
          name={player.name}
          onRename={(newName) => onRenamePlayer(player.id, newName)} // Pass specific rename call
        />
      ))}
      {/* Add button or mechanism to add/edit players might go here */}
    </div>
  );
};

export default PlayerBar; 