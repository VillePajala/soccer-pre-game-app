'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Player, GameEvent } from '@/app/page'; // Import Player & GameEvent type
import {
    HiOutlinePencil, // Keep pencil for edit button
    HiOutlineShieldCheck, // Goalie icon
    HiOutlineUserCircle, // Default player icon
    HiOutlineTrophy // Trophy for top scorer
} from 'react-icons/hi2';

interface PlayerDiskProps {
  id: string;
  name: string;
  color?: string;
  isGoalie?: boolean; // Add goalie status prop
  // Bar specific props
  onPlayerDragStartFromBar?: (player: Player) => void;
  onRenamePlayer?: (id: string, newName: string) => void;
  selectedPlayerIdFromBar?: string | null;
  gameEvents: GameEvent[]; // Add gameEvents prop
  onPlayerTapInBar?: (player: Player) => void; // New prop for tap action
  onToggleGoalie?: (playerId: string) => void; // Need this prop
}

// Define badge component
const StatBadge: React.FC<{ count: number, bgColor: string, positionClasses: string, title: string }> = ({ count, bgColor, positionClasses, title }) => (
  <div 
    title={title}
    className={`absolute ${positionClasses} w-5 h-5 rounded-full ${bgColor} flex items-center justify-center text-xs font-bold text-slate-900 shadow-md pointer-events-none`}
  >
    {count}
  </div>
);

const PlayerDisk: React.FC<PlayerDiskProps> = ({
  id,
  name,
  color = '#7E22CE', // Default to purple-700 if no color passed
  isGoalie = false, // Default goalie status
  onPlayerDragStartFromBar,
  onRenamePlayer,
  selectedPlayerIdFromBar,
  gameEvents,
  onPlayerTapInBar,
  onToggleGoalie // Destructure goalie toggle handler
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTapTimeRef = useRef<number>(0);
  const [isTopScorer, setIsTopScorer] = useState(false);
  
  // Update editedName if the name prop changes (e.g., via undo/redo)
  useEffect(() => {
    setEditedName(name);
  }, [name]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Calculate goals and assists for this player
  const playerStats = useMemo(() => {
    const goals = gameEvents.filter(event => event.type === 'goal' && event.scorerId === id).length;
    const assists = gameEvents.filter(event => event.type === 'goal' && event.assisterId === id).length;
    return { goals, assists };
  }, [gameEvents, id]);

  const handleFinishEditing = () => {
    if (isEditing) {
      setIsEditing(false);
      const trimmedName = editedName.trim();
      if (trimmedName && trimmedName !== name && onRenamePlayer) {
        onRenamePlayer(id, trimmedName);
      }
      // No need to reset editedName here, useEffect handles external changes
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedName(name); // Reset to original name on Escape
    }
  };

  // --- Simplified Event Handlers for Selection --- 
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || isEditing) return;
    e.preventDefault();
    // Single click selects
    if (onPlayerTapInBar) {
      onPlayerTapInBar({ id, name, color, isGoalie });
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
     if (isEditing) return;
     // Basic start, no complex logic needed now
  };
  
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
     if (isEditing) return;
     e.preventDefault();
     // Simple tap selects
     if (onPlayerTapInBar) {
      onPlayerTapInBar({ id, name, color, isGoalie });
     }
  };

  // --- Goalie Toggle Icon Handler ---
  const handleToggleGoalieClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation(); // IMPORTANT: Prevent click from triggering disk selection
    if (onToggleGoalie) {
      onToggleGoalie(id);
    }
  };

  // HTML Drag and Drop
  const handleDragStart = () => {
    if (!onPlayerDragStartFromBar) return;
    const playerData = { id, name, color, isGoalie };
    onPlayerDragStartFromBar(playerData);
  };

  // Conditional styling based on context (in bar or not)
  const isInBar = !!onPlayerDragStartFromBar;
  const diskSizeClasses = isInBar ? "w-16 h-16 p-1" : "w-20 h-20 p-2"; // Smaller size when in bar
  const textSizeClasses = isInBar ? "text-xs" : "text-sm";
  const inputPaddingClasses = isInBar ? "px-1 py-0.5" : "px-2 py-1";
  const inputWidthClass = isInBar ? "w-14" : "w-16";
  const selectionRingClass = selectedPlayerIdFromBar === id ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900' : '';
  const goalieFillColor = '#F97316'; // Orange-500
  const defaultFillColor = color || '#7E22CE'; // Existing default purple
  const defaultTextColor = 'text-white';

  return (
    <div
      className={`relative ${diskSizeClasses} rounded-full flex flex-col items-center justify-center cursor-pointer shadow-lg m-2 transition-all duration-150 ease-in-out ${selectionRingClass}`}
      style={{ backgroundColor: isGoalie ? goalieFillColor : defaultFillColor }}
      draggable={isInBar && !isEditing}
      onDragStart={handleDragStart}
      // Use simplified selection handlers
      onMouseDown={isInBar ? handleMouseDown : undefined}
      onTouchStart={isInBar ? handleTouchStart : undefined} 
      onTouchEnd={isInBar ? handleTouchEnd : undefined}
      onTouchCancel={isInBar ? handleTouchEnd : undefined} 
    >
      {/* Goalie Toggle Icon (Only when selected) */}
      {selectedPlayerIdFromBar === id && onToggleGoalie && (
        <button
          title={isGoalie ? "Unset Goalie" : "Set Goalie"}
          // Use button for better accessibility & event handling
          className="absolute top-0 left-0 transform -translate-x-1 -translate-y-1 p-1 bg-slate-600 hover:bg-slate-500 rounded-full shadow-md z-10"
          onClick={handleToggleGoalieClick}
          onTouchEnd={handleToggleGoalieClick} // Handle touch as well
        >
          <HiOutlineShieldCheck className={`w-5 h-5 ${isGoalie ? 'text-emerald-400' : 'text-slate-300'}`} />
        </button>
      )}

      {/* Name / Edit Input */}
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editedName}
          onChange={handleInputChange}
          onBlur={handleFinishEditing}
          onKeyDown={handleKeyDown}
          className={`bg-transparent text-center font-semibold outline-none rounded ${inputPaddingClasses} ${inputWidthClass} ${textSizeClasses} text-white`}
        />
      ) : (
        <>
          {/* Player Name */}
          <span className={`font-semibold ${textSizeClasses} ${defaultTextColor} break-words text-center leading-tight max-w-full px-1`}>
            {name}
          </span>
        </>
      )}
      {/* Goal Badge */}
      {playerStats.goals > 0 && (
        <StatBadge 
          count={playerStats.goals} 
          bgColor="bg-yellow-400" 
          positionClasses="top-0 right-0 transform translate-x-1 -translate-y-1"
          title={`${playerStats.goals} Goals`}
        />
      )}
      {/* Assist Badge */}
      {playerStats.assists > 0 && (
        <StatBadge 
          count={playerStats.assists} 
          bgColor="bg-slate-400" 
          positionClasses="bottom-0 right-0 transform translate-x-1 translate-y-1"
          title={`${playerStats.assists} Assists`}
        />
      )}
    </div>
  );
};

export default PlayerDisk;