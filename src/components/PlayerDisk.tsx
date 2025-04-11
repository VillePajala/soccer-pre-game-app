'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Player } from '@/app/page'; // Import Player type for the callback

interface PlayerDiskProps {
  id: string;
  name: string;
  color?: string; // Optional color, default can be blue
  onRename: (newName: string) => void; // Add rename callback prop
  onPlayerDragStartFromBar?: (player: Player) => void; // Optional callback for touch drag start
  isSelected?: boolean; // Add isSelected prop
}

const PlayerDisk: React.FC<PlayerDiskProps> = ({
  id,
  name,
  color = 'bg-purple-700',
  onRename,
  onPlayerDragStartFromBar,
  isSelected = false, // Destructure isSelected prop with default value
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);
  // Ref to store the timestamp of the last tap for double-tap detection
  const lastTapTimeRef = useRef<number>(0);

  // Refs to track touch interaction details for differentiating tap/drag from scroll
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const touchStartTimeRef = useRef<number>(0);
  const isScrollingRef = useRef<boolean>(false);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select(); // Select text for easy replacement
    }
  }, [isEditing]);

  const handleStartEditing = () => {
    // Prevent starting edit if already editing, also maybe prevent during drag?
    if (!isEditing) {
      setEditedName(name); // Reset edited name to current name
      setIsEditing(true);
    }
  };

  const handleFinishEditing = () => {
    if (isEditing) {
      setIsEditing(false);
      const trimmedName = editedName.trim();
      if (trimmedName && trimmedName !== name) {
        onRename(trimmedName); // Call parent handler only if name changed and is not empty
      }
      // If name is empty or unchanged, it implicitly reverts visually when isEditing becomes false
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedName(e.target.value);
  };

  const handleKeyDown = (_e: React.KeyboardEvent<HTMLInputElement>) => {
    if (_e.key === 'Enter') {
      handleFinishEditing();
    } else if (_e.key === 'Escape') {
      // Revert changes on Escape
      setEditedName(name);
      setIsEditing(false);
    }
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

  // Click handler: Edit on double-click in bar, single-click on field
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onPlayerDragStartFromBar) {
        // In the PlayerBar: Only edit on double-click
        if (e.detail === 2) {
            console.log("Double-click detected in bar, starting edit.");
            handleStartEditing();
        } else {
             console.log("Single click in bar ignored (drag is separate).");
             // Single click does nothing, drag is handled by drag-and-drop library or touch
        }
    } else {
        // On the Field: Start editing on single click (current behavior)
        console.log("Single click on field, starting edit.");
        handleStartEditing();
    }
  };

  // TouchEnd handler: Edit on double-tap in bar, select/initiate drag on single tap
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    // Only handle logic if in the bar and not currently editing
    if (onPlayerDragStartFromBar && !isEditing) {
      const currentTime = Date.now();
      const timeSinceLastTap = currentTime - lastTapTimeRef.current;
      const touchDuration = currentTime - touchStartTimeRef.current;

      // Check if it was a scroll gesture
      if (isScrollingRef.current) {
        console.log(`Touch end on ${name}: Was a scroll, doing nothing.`);
        isScrollingRef.current = false; // Reset scroll flag
        return; // Do not process as tap/double-tap
      }

      // --- Handle Tap / Double Tap (only if not scrolling) ---
      const TAP_DURATION_THRESHOLD = 300; // ms threshold for a tap

      if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
        // Double tap detected (and was not a scroll)
        console.log("Double-tap detected in bar, starting edit.");
        handleStartEditing();
        lastTapTimeRef.current = 0; // Reset tap time
        e.preventDefault(); // Prevent potential further actions like click
      } else if (touchDuration < TAP_DURATION_THRESHOLD) {
        // Single Tap Detected (not a scroll, short duration)
        console.log(`Single tap on ${name} in bar detected (duration: ${touchDuration}ms), initiating drag/selection.`);
        lastTapTimeRef.current = currentTime; // Record time for potential double-tap

        // *** Initiate the drag/selection ***
        // Prevent default touch behavior *only* if we are initiating the drag
        e.preventDefault(); // Prevent click event after tap if needed
        onPlayerDragStartFromBar({ id, name, color }); // Call the selection/drag handler

      } else {
         // Touch was too long to be a tap, likely a press/hold then maybe scroll attempt cancelled early
         console.log(`Touch end on ${name}: Not a tap (duration: ${touchDuration}ms) or scroll.`);
         lastTapTimeRef.current = currentTime; // Still record for double tap start
      }

      // Reset scroll flag just in case
      isScrollingRef.current = false;
    }
    // No special action needed if not in the bar or already editing
  };

  return (
    <div
      id={`player-${id}`}
      className={`
        ${color} text-yellow-300 rounded-full w-16 h-16 flex items-center justify-center 
        font-semibold text-sm shadow-md my-2 mr-2 flex-shrink-0 select-none relative 
        ${isEditing ? 'cursor-text' : 'cursor-grab'} 
        hover:brightness-110 transition-all duration-150
        ${isSelected ? 'ring-2 ring-offset-2 ring-yellow-400 ring-offset-slate-900' : ''} // Add ring if selected
      `}
      // Use the new handlers
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove} // Add touch move handler
      onTouchEnd={handleTouchEnd}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editedName}
          onChange={handleInputChange}
          onBlur={handleFinishEditing} // Finish editing when input loses focus
          onKeyDown={handleKeyDown}    // Finish on Enter, revert on Escape
          className="w-full h-full bg-transparent text-yellow-300 text-center font-semibold text-sm outline-none border-none p-0 m-0"
          // Prevent click event from bubbling up and restarting edit immediately
          onClick={(e) => e.stopPropagation()} 
        />
      ) : (
        name // Display name normally
      )}
    </div>
  );
};

export default PlayerDisk; 