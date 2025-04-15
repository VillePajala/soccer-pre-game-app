'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Player, GameEvent } from '@/app/page'; // Import Player & GameEvent type

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
  onPlayerTapInBar // Destructure new prop
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Refs for double-tap detection
  const lastTapTimeRef = useRef<number>(0);
  // Refs for touch drag vs scroll detection
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const touchStartTimeRef = useRef<number>(0);
  const isScrollingRef = useRef<boolean>(false);

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

  const handleStartEditing = () => {
    if (onRenamePlayer) {
      setIsEditing(true);
    }
  };

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

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    // Handle left click for selection/drag start
    if (e.button === 0 && onPlayerDragStartFromBar && !isEditing) { 
      console.log("Mouse down/click on PlayerDisk in bar, selecting player.", { id, name, color });
       // Call the new tap handler to set the selection state
       if (onPlayerTapInBar) {
         e.preventDefault(); // Prevent text selection, etc.
         onPlayerTapInBar({ id, name, color });
       } else {
         console.warn("onPlayerTapInBar handler not provided to PlayerDisk");
         // Fallback drag initiation if needed
         // onPlayerDragStartFromBar({ id, name, color }); 
       }
    }
    // Allow right-click etc. for context menus if added later
  };

  const handleDoubleClick = () => {
    console.log("Double-click detected, starting edit.");
    handleStartEditing();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Only care about touch interactions in the bar for drag/scroll differentiation
    if (onPlayerDragStartFromBar) {
      // Record initial touch details
      const touch = e.touches[0];
      touchStartXRef.current = touch.clientX;
      touchStartYRef.current = touch.clientY;
      touchStartTimeRef.current = Date.now();
      isScrollingRef.current = false; // Reset scrolling flag
      console.log(`Touch start on PlayerDisk: ${name} at (${touchStartXRef.current}, ${touchStartYRef.current})`);
      // Don't call onPlayerDragStartFromBar immediately
    }
    // Don't stop propagation or prevent default initially, allow parent scroll handler
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!onPlayerDragStartFromBar || isScrollingRef.current) {
        // If not in the bar, or already detected as scrolling, do nothing
        return;
    }

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartXRef.current);
    const deltaY = Math.abs(touch.clientY - touchStartYRef.current);
    const SCROLL_THRESHOLD = 10; // Pixels threshold to detect scroll

    // Check if horizontal movement exceeds threshold and is greater than vertical
    if (deltaX > SCROLL_THRESHOLD && deltaX > deltaY) {
        console.log(`Scroll detected on ${name}. DeltaX: ${deltaX}`);
        isScrollingRef.current = true; // Mark as scrolling
    }
     // If isScrollingRef is true, the browser's default scroll should take over
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (onPlayerDragStartFromBar && !isEditing) {
      
      // *** Check for scroll first ***
      if (isScrollingRef.current) {
        console.log(`Touch end on ${name}: Was detected as a scroll, doing nothing.`);
        isScrollingRef.current = false; // Reset scroll flag
        lastTapTimeRef.current = 0; // Reset tap ref
        // DO NOT call e.preventDefault() here - allow native scroll behavior
        return; 
      }

      // *** If not a scroll, proceed with tap/double-tap/drag logic ***
      const currentTime = Date.now();
      const timeSinceLastTap = currentTime - lastTapTimeRef.current;
      const touchDuration = currentTime - touchStartTimeRef.current;
      const TAP_DURATION_THRESHOLD = 300; // ms threshold for a tap

      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        // Double tap detected (and was not a scroll)
        console.log("Double-tap detected in bar, starting edit.");
        handleStartEditing();
        lastTapTimeRef.current = 0; // Reset tap time
        e.preventDefault(); // Keep preventDefault ONLY for the double-tap action
      } else if (touchDuration < TAP_DURATION_THRESHOLD) {
        // Single Tap Detected (not a scroll, short duration) -> Initiate Drag/Selection
        console.log(`Single tap on ${name} in bar detected (duration: ${touchDuration}ms), selecting player.`);
        lastTapTimeRef.current = currentTime; // Record time for potential double-tap

        // Call the new tap handler to set the selection state
        if (onPlayerTapInBar) {
             e.preventDefault(); // Prevent default for the tap selection action
             onPlayerTapInBar({ id, name, color });
        } else {
            // Fallback or if only drag is supported (shouldn't happen with our setup)
            // onPlayerDragStartFromBar({ id, name, color });
             console.warn("onPlayerTapInBar handler not provided to PlayerDisk");
        }

      } else {
         // Touch was too long or didn't fit tap criteria, and wasn't a scroll
         console.log(`Touch end on ${name}: Not a valid tap/double-tap (duration: ${touchDuration}ms) or scroll.`);
         lastTapTimeRef.current = 0; // Reset tap time if it wasn't a valid action
         // DO NOT call e.preventDefault() here
      }

      // Reset scroll flag (should be false anyway if we reached here)
      isScrollingRef.current = false;
    }
    // No special action needed if not in the bar or already editing, or if handled as scroll
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
  const goalieTextColor = 'text-purple-900'; // Dark purple text for goalie

  // We might not need the onDragStart handler anymore if tap selection works
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
     if (onPlayerDragStartFromBar && !isEditing) {
       console.log("HTML Drag Start on PlayerDisk", {id});
       // Set data transfer - ensure this matches what SoccerField expects if using HTML D&D
       const playerData = JSON.stringify({ id }); // Only need ID usually
       e.dataTransfer.setData('application/json', playerData);
       e.dataTransfer.effectAllowed = 'move';
       // Set the dragging state via the provided handler
       onPlayerDragStartFromBar({ id, name, color }); 
     } else {
       e.preventDefault(); // Prevent dragging if not applicable
     }
  };

  return (
    <div
      className={`relative ${diskSizeClasses} rounded-full flex flex-col items-center justify-center cursor-pointer shadow-lg m-2 transition-all duration-150 ease-in-out ${selectionRingClass}`}
      style={{ backgroundColor: isGoalie ? goalieFillColor : defaultFillColor }}
      draggable={isInBar && !isEditing}
      onDragStart={handleDragStart} // Keep HTML drag start for now
      onMouseDown={isInBar ? handleMouseDown : undefined} // Use modified mousedown
      onDoubleClick={isInBar ? handleDoubleClick : undefined} // Double-click only in bar
      onTouchStart={isInBar ? handleTouchStart : undefined}
      onTouchMove={isInBar ? handleTouchMove : undefined}
      onTouchEnd={isInBar ? handleTouchEnd : undefined}
      onTouchCancel={isInBar ? handleTouchEnd : undefined} // Treat cancel like end for tap/drag logic
    >
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