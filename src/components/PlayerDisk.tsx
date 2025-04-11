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

  const handleTouchStart = () => {
    // Only initiate drag if not editing and the handler is provided (i.e., in the bar)
    if (!isEditing && onPlayerDragStartFromBar) {
      console.log(`Touch start on PlayerDisk: ${name}, initiating drag from bar.`);
      // Prevent default touch behavior like scrolling or text selection during drag start
      // Note: Don't prevent default if NOT starting drag, to allow potential scroll on parent
      // e.preventDefault();
      // Call the handler passed from the parent (page.tsx via PlayerBar)
      // We pass the essential player info needed for the drop
      onPlayerDragStartFromBar({ id, name, color });
    }
    // Don't stop propagation, other elements might need touchstart?
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

  // TouchEnd handler: Edit on double-tap in bar
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (onPlayerDragStartFromBar && !isEditing) {
        const currentTime = Date.now();
        const timeSinceLastTap = currentTime - lastTapTimeRef.current;

        if (timeSinceLastTap < 300 && timeSinceLastTap > 0) {
            // Double tap detected
            console.log("Double-tap detected in bar, starting edit.");
            handleStartEditing();
            lastTapTimeRef.current = 0; // Reset tap time
            e.preventDefault(); // Prevent potential further actions like click
        } else {
            // Single tap (or first tap)
            console.log("Single tap in bar detected (or first tap).");
            lastTapTimeRef.current = currentTime;
            // Do nothing else on single tap end (drag started in onTouchStart)
        }
    } 
    // No special action needed if not in the bar, already editing, or if touch didn't start drag
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