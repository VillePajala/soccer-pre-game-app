'use client';

import React, { useState, useEffect, useRef } from 'react';
import PlayerDisk from './PlayerDisk'; // Import the PlayerDisk component
import { Player } from '@/app/page'; // Import the Player type
import Image from 'next/image'; // ADDED Import

// Define props for PlayerBar
interface PlayerBarProps {
  players: Player[];
  onRenamePlayer: (playerId: string, newName: string) => void; // Add rename handler prop
  teamName: string;
  onTeamNameChange: (newName: string) => void;
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

const PlayerBar: React.FC<PlayerBarProps> = ({ players, onRenamePlayer, teamName, onTeamNameChange }) => { // Destructure players and rename handler from props
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [editedTeamName, setEditedTeamName] = useState(teamName);
  const teamNameInputRef = useRef<HTMLInputElement>(null);

  // Effect to update local state if prop changes (e.g., undo/redo)
  useEffect(() => {
    setEditedTeamName(teamName);
  }, [teamName]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingTeamName && teamNameInputRef.current) {
      teamNameInputRef.current.focus();
      teamNameInputRef.current.select();
    }
  }, [isEditingTeamName]);

  const handleStartEditingTeamName = () => {
     if (!isEditingTeamName) {
      setEditedTeamName(teamName);
      setIsEditingTeamName(true);
    }
  };

  const handleFinishEditingTeamName = () => {
     if (isEditingTeamName) {
      setIsEditingTeamName(false);
      const trimmedName = editedTeamName.trim();
      if (trimmedName && trimmedName !== teamName) {
        onTeamNameChange(trimmedName); 
      }
    }
  };

  const handleTeamNameInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedTeamName(e.target.value);
  };

  const handleTeamNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleFinishEditingTeamName();
    } else if (e.key === 'Escape') {
      setEditedTeamName(teamName);
      setIsEditingTeamName(false);
    }
  };

  return (
    <div className="bg-slate-900/85 backdrop-blur-md pl-8 pr-3 py-2 flex items-center flex-shrink-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-slate-700/80 scrollbar-track-slate-800/50 shadow-lg border-b border-slate-700/50">
      {/* Team Name Display/Edit */}
      <div className="flex flex-col items-center flex-shrink-0 mr-8 py-4">
        <Image 
          src="/pepo-logo.png" 
          alt="PEPO Logo" 
          width={64}
          height={64}
          className="mb-1 flex-shrink-0"
        />
        {isEditingTeamName ? (
          <input
            ref={teamNameInputRef}
            type="text"
            value={editedTeamName}
            onChange={handleTeamNameInputChange}
            onBlur={handleFinishEditingTeamName}
            onKeyDown={handleTeamNameKeyDown}
            className="bg-slate-700 text-yellow-400 text-lg font-semibold outline-none rounded px-2 py-1"
            onClick={(e) => e.stopPropagation()} 
          />
        ) : (
          <h2 
            className="text-yellow-400 text-lg font-semibold cursor-pointer hover:text-yellow-300 truncate"
            onClick={handleStartEditingTeamName}
            title="Click to edit team name"
          >
            {teamName}
          </h2>
        )}
      </div>

      {/* Player Disks */}
      {players.map((player) => (
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