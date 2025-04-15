'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Player, GameEvent } from '@/app/page'; // Import Player & GameEvent type
import { FaHandPaper } from 'react-icons/fa'; // Re-import if needed, or choose another icon

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

const LONG_PRESS_DURATION = 750; // ms

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
  
  // Refs for double-tap detection
  const lastTapTimeRef = useRef<number>(0);
  // Refs for touch drag vs scroll detection
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const touchStartTimeRef = useRef<number>(0);
  const isScrollingRef = useRef<boolean>(false);
  // Long press refs
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const didLongPressRef = useRef<boolean>(false); // Flag to prevent tap after long press

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

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleInteractionStart = () => {
    if (!isEditing && onToggleGoalie) {
      didLongPressRef.current = false; // Reset flag
      clearLongPressTimer(); // Clear any previous timer
      longPressTimerRef.current = setTimeout(() => {
        console.log(`Long press detected on ${name}, toggling goalie.`);
        onToggleGoalie(id);
        didLongPressRef.current = true; // Mark that long press occurred
        longPressTimerRef.current = null;
        // Optionally trigger haptic feedback here if possible/desired
      }, LONG_PRESS_DURATION);
    }
  };

  const handleInteractionEnd = (isTap: boolean) => {
    const timerWasActive = !!longPressTimerRef.current;
    clearLongPressTimer();
    
    console.log('[handleInteractionEnd]', { isTap, didLongPress: didLongPressRef.current, timerWasActive });

    // Restore the !didLongPressRef.current check
    if (isTap && !didLongPressRef.current && onPlayerTapInBar) {
      console.log(`Tap detected on ${name}, attempting selection.`);
      onPlayerTapInBar({ id, name, color, isGoalie }); 
    } else if (isTap) {
      console.log(`Tap detected on ${name}, but condition not met for selection (long press already occurred?).`);
    }
    // Reset long press flag AFTER potentially using it in the check above
    didLongPressRef.current = false; 
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || isEditing) return;
    e.preventDefault(); // Prevent default text selection, etc.
    handleInteractionStart();
    // Mouse move/up will handle cancellation/completion
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || isEditing) return;
    handleInteractionEnd(true); // Treat mouseup as a potential tap end
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    // If mouse moves significantly while pressed, cancel long press timer
    if (longPressTimerRef.current) { // Check if timer is active
        // Basic movement threshold - adjust if needed
        // For simplicity, cancelling on *any* mouse move while timer is pending
        console.log("Mouse move cancelled long press timer.");
        clearLongPressTimer();
    }
  };
  
  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    // Cancel long press if mouse leaves while pressed
    clearLongPressTimer();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEditing) return;
    // Record initial touch details for scroll/tap detection
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchStartTimeRef.current = Date.now();
    isScrollingRef.current = false; 
    
    // Start long press detection
    handleInteractionStart();
    // Don't preventDefault initially, allow scroll check in touchMove
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEditing) return;
    if (!longPressTimerRef.current && !isScrollingRef.current) return; // Only process if pressing or haven't decided scroll

    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartXRef.current);
    const deltaY = Math.abs(touch.clientY - touchStartYRef.current);
    const SCROLL_THRESHOLD = 10; 

    // If significant movement detected, mark as scrolling AND cancel long press
    if (deltaX > SCROLL_THRESHOLD || deltaY > SCROLL_THRESHOLD) {
        if (!isScrollingRef.current) {
            console.log("Scroll detected, cancelling long press.");
            isScrollingRef.current = true;
            clearLongPressTimer(); // Cancel long press if scrolling
        }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEditing) return;
    const touchDuration = Date.now() - touchStartTimeRef.current;
    const TAP_DURATION_THRESHOLD = 400; // Increased tap threshold

    // Determine if it was a tap (short duration, didn't scroll)
    const wasTap = touchDuration < TAP_DURATION_THRESHOLD && !isScrollingRef.current;
    
    console.log('[handleTouchEnd]', { touchDuration, isScrolling: isScrollingRef.current, wasTap });
    
    // Prevent default browser actions ONLY if it was a tap (to allow scrolling otherwise)
    if (wasTap) {
      e.preventDefault();
    }
    
    handleInteractionEnd(wasTap);

    isScrollingRef.current = false; // Reset scroll flag
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
      onMouseUp={isInBar ? handleMouseUp : undefined}
      onMouseMove={isInBar ? handleMouseMove : undefined}
      onMouseLeave={isInBar ? handleMouseLeave : undefined}
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