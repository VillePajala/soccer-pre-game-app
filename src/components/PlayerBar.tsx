'use client';

import React from 'react';
import PlayerDisk from './PlayerDisk'; // Import the PlayerDisk component
import { Player } from '@/app/page'; // Import the Player type

// Define props for PlayerBar
interface PlayerBarProps {
  players: Player[];
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

const PlayerBar: React.FC<PlayerBarProps> = ({ players }) => { // Destructure players from props
  return (
    <div className="bg-blue-200 p-2 h-20 flex items-center flex-shrink-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-blue-400 scrollbar-track-blue-100">
      {players.map((player) => ( // Use the players prop
        <PlayerDisk key={player.id} id={player.id} name={player.name} />
      ))}
      {/* Add button or mechanism to add/edit players might go here */}
    </div>
  );
};

export default PlayerBar; 