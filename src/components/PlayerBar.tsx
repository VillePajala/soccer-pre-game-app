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
  // Add prop to pass down touch drag start handler
  onPlayerDragStartFromBar?: (player: Player) => void;
  // ID of the player currently being dragged from the bar
  selectedPlayerIdFromBar?: string | null; 
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

const PlayerBar: React.FC<PlayerBarProps> = ({ players, onRenamePlayer, teamName, onTeamNameChange, onPlayerDragStartFromBar, selectedPlayerIdFromBar }) => { // Destructure players and rename handler from props
  const [isEditingTeamName, setIsEditingTeamName] = useState(false);
  const [editedTeamName, setEditedTeamName] = useState(teamName);
  const teamNameInputRef = useRef<HTMLInputElement>(null);
  // Ref for team name double-tap detection
  const teamNameLastTapTimeRef = useRef<number>(0);

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

  // --- New Handlers for Double Click/Tap Team Name Edit ---
  const handleTeamNameClick = (e: React.MouseEvent<HTMLHeadingElement>) => {
    // Edit only on double-click
    if (e.detail === 2) {
        console.log("Team name double-click detected, starting edit.");
        handleStartEditingTeamName();
    } else {
        console.log("Team name single click ignored.");
    }
  };

  const handleTeamNameTouchEnd = (e: React.TouchEvent<HTMLHeadingElement>) => {
    if (!isEditingTeamName) {
        const currentTime = Date.now();
        const timeSinceLastTap = currentTime - teamNameLastTapTimeRef.current;

        if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
            // Double tap detected
            console.log("Team name double-tap detected, starting edit.");
            handleStartEditingTeamName();
            teamNameLastTapTimeRef.current = 0; // Reset tap time
            e.preventDefault(); // Prevent potential further actions
            e.stopPropagation(); // Stop bubbling
        } else {
            // Single tap (or first tap)
            console.log("Team name single tap detected (or first tap).");
            teamNameLastTapTimeRef.current = currentTime;
            // Do nothing else on single tap end
        }
    } 
    // If already editing, touch end doesn't do anything special here
  };
  // --- End New Handlers ---

  return (
    <div 
      className="bg-slate-900/85 backdrop-blur-md pl-8 pr-3 py-2 flex items-center flex-shrink-0 overflow-x-auto whitespace-nowrap scrollbar-thin scrollbar-thumb-slate-700/80 scrollbar-track-slate-800/50 shadow-lg border-b border-slate-700/50"
      // Allow vertical panning (page scroll), disable horizontal panning/zoom to allow custom horizontal scroll
    >
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
            // Use NEW handlers for double-click/tap
            onClick={handleTeamNameClick}
            onTouchEnd={handleTeamNameTouchEnd}
            title="Double-click or double-tap to edit team name"
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
          // Pass the touch drag start handler down to PlayerDisk
          onPlayerDragStartFromBar={onPlayerDragStartFromBar}
          // Pass the isSelected status down
          isSelected={player.id === selectedPlayerIdFromBar}
        />
      ))}
      {/* Add button or mechanism to add/edit players might go here */}
    </div>
  );
};

export default PlayerBar; 