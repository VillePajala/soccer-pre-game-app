'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { Player, GameEvent } from '@/app/page'; // Import Player & GameEvent type
import {
    HiOutlineShieldCheck, // Goalie icon
} from 'react-icons/hi2';

interface PlayerDiskProps {
  id: string;
  fullName: string;
  nickname?: string;
  color?: string;
  isGoalie?: boolean; // Add goalie status prop
  // Bar specific props
  onPlayerDragStartFromBar?: (player: Player) => void;
  onRenamePlayer?: (id: string, playerData: { name: string; nickname: string }) => void;
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
  fullName,
  nickname,
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
  const [editedName, setEditedName] = useState(nickname || fullName);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastTapTimeRef = useRef<number>(0); // Ref for double-tap detection
  
  // Wrap in useCallback - Remove editedName from dependencies
  const handleFinishEditing = useCallback((reason: string = "unknown") => { 
    if (isEditing) {
      console.log(`PlayerDisk (${id}): Finishing edit (Reason: ${reason}).`); // Add log
      setIsEditing(false);
      const trimmedNickname = editedName.trim(); // Reads current state here
      const originalDisplayName = nickname || fullName; // Get original from props

      // Only call rename if the displayed name actually changed
      if (trimmedNickname && trimmedNickname !== originalDisplayName && onRenamePlayer) {
        console.log(`PlayerDisk (${id}): Calling onRenamePlayer with fullName: ${fullName}, nickname: ${trimmedNickname}`); // Log with full name
        // Pass the original fullName and the new trimmedNickname
        onRenamePlayer(id, { name: fullName, nickname: trimmedNickname }); 
      } else if (trimmedNickname !== originalDisplayName) {
          console.log(`PlayerDisk (${id}): Edit finished, but name unchanged or rename function missing.`); // Add log
      }
    }
    // Keep other stable dependencies
    // ADD editedName to the dependency array
  }, [isEditing, id, nickname, fullName, onRenamePlayer, editedName]); 

  // Update editedName if the props change (e.g., via undo/redo)
  useEffect(() => {
    setEditedName(nickname || fullName);
  }, [nickname, fullName]);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
    // Remove handleFinishEditing dependency, only needs isEditing
  }, [isEditing]); 

  // Calculate goals and assists for this player
  const playerStats = useMemo(() => {
    const goals = gameEvents.filter(event => event.type === 'goal' && event.scorerId === id).length;
    const assists = gameEvents.filter(event => event.type === 'goal' && event.assisterId === id).length;
    return { goals, assists };
  }, [gameEvents, id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleFinishEditing("Enter key"); // Pass reason
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditedName(nickname || fullName); // Reset to original nickname/name on Escape
      console.log(`PlayerDisk (${id}): Edit cancelled (Escape key).`); // Log cancellation
    }
  };

  // --- NEW: Handler to explicitly start editing ---
  const handleStartEditing = () => {
    if (onRenamePlayer) { // Check if renaming is allowed
      console.log(`PlayerDisk (${id}): Starting edit.`);
      setIsEditing(true);
    }
  };

  // --- Modified Event Handlers for Selection / Double-Click ---
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || isEditing) return;
    e.preventDefault();

    const currentTime = Date.now();
    if (currentTime - lastTapTimeRef.current < 300) {
      // Double-click detected
      handleStartEditing();
      lastTapTimeRef.current = 0; // Reset tap time
    } else {
      // Single click selects
      if (onPlayerTapInBar) {
        // Pass correct player data including nickname
        onPlayerTapInBar({ id, name: fullName, nickname, color, isGoalie }); 
      }
      lastTapTimeRef.current = currentTime;
    }
  };

  const handleTouchStart = () => {
     if (isEditing) return;
     // Basic start, no complex logic needed now
  };
  
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
     if (isEditing) return;
     e.preventDefault();

     const currentTime = Date.now();
     if (currentTime - lastTapTimeRef.current < 300) {
       // Double-tap detected
       handleStartEditing();
       lastTapTimeRef.current = 0; // Reset tap time
     } else {
       // Simple tap selects
       if (onPlayerTapInBar) {
        // Pass correct player data including nickname
        onPlayerTapInBar({ id, name: fullName, nickname, color, isGoalie });
       }
       lastTapTimeRef.current = currentTime;
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
    // Pass correct player data including nickname
    const playerData: Player = { id, name: fullName, nickname, color, isGoalie }; 
    onPlayerDragStartFromBar(playerData);
  };

  // Conditional styling based on context (in bar or not)
  const isInBar = !!onPlayerDragStartFromBar;
  const diskSizeClasses = isInBar ? "w-16 h-16 p-1" : "w-20 h-20 p-2"; // Smaller size when in bar
  const textSizeClasses = isInBar ? "text-xs" : "text-sm";
  const inputPaddingClasses = isInBar ? "px-1 py-0.5" : "px-2 py-1";
  const inputWidthClass = isInBar ? "w-[56px]" : "w-[64px]"; // Use explicit pixel widths
  const selectionRingClass = selectedPlayerIdFromBar === id ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900' : '';
  const goalieFillColor = '#F97316'; // Orange-500
  const defaultFillColor = color || '#7E22CE'; // Existing default purple
  const defaultTextColor = 'text-white';

  console.log(`PlayerDisk Render (${id}): isEditing = ${isEditing}`); // Add log for render state

  // --- EFFECT: Finish editing if selection changes --- 
  useEffect(() => {
    // If this disk is currently editing AND the selected ID changes to something else
    if (isEditing && selectedPlayerIdFromBar !== id) {
      console.log(`PlayerDisk (${id}): Finishing edit because selection changed to ${selectedPlayerIdFromBar}`);
      handleFinishEditing('Selection Change');
    }
    // We only care about when the selection changes *away* from the edited disk,
    // so we only need selectedPlayerIdFromBar and isEditing as dependencies.
    // Keep handleFinishEditing here as the effect CALLS it.
  }, [selectedPlayerIdFromBar, isEditing, id, handleFinishEditing]); 

  return (
    <div
      className={`relative ${diskSizeClasses} rounded-full flex flex-col items-center justify-center cursor-pointer shadow-lg m-2 transition-all duration-150 ease-in-out ${selectionRingClass}`}
      style={{ backgroundColor: isGoalie ? goalieFillColor : defaultFillColor }}
      draggable={isInBar && !isEditing}
      onDragStart={handleDragStart}
      // Use modified selection handlers
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
          onBlur={() => handleFinishEditing("Blur")} // Pass reason for blur
          onKeyDown={handleKeyDown}
          className={`bg-transparent text-center font-semibold outline-none rounded ${inputPaddingClasses} ${inputWidthClass} ${textSizeClasses} text-white`}
          // Add stopPropagation to prevent clicks *inside* the input interfering
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        />
      ) : (
        <>
          {/* Player Name - Revert to displaying props */}
          <span className={`font-semibold ${textSizeClasses} ${defaultTextColor} break-words text-center leading-tight max-w-full px-1`}>
            {nickname || fullName} {/* Revert to props */} 
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