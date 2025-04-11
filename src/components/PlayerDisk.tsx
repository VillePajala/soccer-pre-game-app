'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Player } from '@/app/page'; // Import Player type

interface PlayerDiskProps {
  id: string;
  name: string;
  color?: string;
  // Bar specific props
  onPlayerDragStartFromBar?: (player: Player) => void;
  onRenamePlayer?: (id: string, newName: string) => void;
  selectedPlayerIdFromBar?: string | null;
}

const PlayerDisk: React.FC<PlayerDiskProps> = ({
  id,
  name,
  color = '#7E22CE', // Default to purple-700 if no color passed
  onPlayerDragStartFromBar,
  onRenamePlayer,
  selectedPlayerIdFromBar,
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
    // Start drag only if onPlayerDragStartFromBar is provided (i.e., in the bar)
    if (onPlayerDragStartFromBar) {
      e.preventDefault(); // Prevent text selection, etc.
      console.log("Mouse down on PlayerDisk in bar, starting drag.", { id, name, color });
      onPlayerDragStartFromBar({ id, name, color });
    }
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
    // Only handle logic if in the bar and not currently editing
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
        e.preventDefault(); // Prevent default ONLY for the double-tap action
      } else if (touchDuration < TAP_DURATION_THRESHOLD) {
        // Single Tap Detected (not a scroll, short duration) -> Initiate Drag/Selection
        console.log(`Single tap on ${name} in bar detected (duration: ${touchDuration}ms), initiating drag/selection.`);
        lastTapTimeRef.current = currentTime; // Record time for potential double-tap

        // *** Initiate the drag/selection ***
        e.preventDefault(); // Prevent default ONLY when initiating the drag/selection via tap
        onPlayerDragStartFromBar({ id, name, color }); // Call the selection/drag handler
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
  const outerRingClass = selectedPlayerIdFromBar === id ? 'ring-4 ring-yellow-400 ring-offset-2 ring-offset-slate-900' : '';

  return (
    <div
      className={`relative ${diskSizeClasses} rounded-full flex items-center justify-center cursor-pointer shadow-lg m-2 transition-all duration-150 ease-in-out ${outerRingClass}`}
      style={{ backgroundColor: color, touchAction: 'pan-y' }} // Allow vertical page scroll, horizontal is handled by bar scroll
      draggable={isInBar && !isEditing} // Only draggable if in bar and not editing
      onDragStart={handleMouseDown} // Use mouse down for HTML drag API
      onMouseDown={isInBar ? handleMouseDown : undefined} // Only attach mouse down if in bar
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
          className={`bg-slate-700 text-yellow-300 ${textSizeClasses} font-semibold outline-none rounded ${inputPaddingClasses} text-center ${inputWidthClass}`}
          onClick={(e) => e.stopPropagation()} // Prevent triggering disk events
        />
      ) : (
        <span 
          className={`text-white ${textSizeClasses} font-semibold text-center break-words line-clamp-2`}
          style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.7)' }} // Add text shadow for readability
        >
          {name}
        </span>
      )}
    </div>
  );
};

export default PlayerDisk; 