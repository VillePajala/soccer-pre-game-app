'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Player } from '@/app/page'; // Import Player type for the callback

interface PlayerDiskProps {
  id: string;
  name: string;
  color?: string; // Optional color, default can be blue
  onRename: (newName: string) => void; // Add rename callback prop
  onPlayerDragStartFromBar?: (player: Player) => void; // Optional callback for touch drag start
}

const PlayerDisk: React.FC<PlayerDiskProps> = ({
  id,
  name,
  color = 'bg-purple-700',
  onRename,
  onPlayerDragStartFromBar,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleFinishEditing();
    } else if (e.key === 'Escape') {
      // Revert changes on Escape
      setEditedName(name);
      setIsEditing(false);
    }
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    // Only initiate drag if not editing and the handler is provided
    if (!isEditing && onPlayerDragStartFromBar) {
      console.log(`Touch start on PlayerDisk: ${name}, initiating drag from bar.`);
      // Prevent default touch behavior like scrolling or text selection
      e.preventDefault(); 
      // Call the handler passed from the parent (page.tsx via PlayerBar)
      // We pass the essential player info needed for the drop
      onPlayerDragStartFromBar({ id, name, color }); 
    }
    // We don't stop propagation here, in case parent elements need touchstart
    // for other reasons (though unlikely here). 
    // If the touch *doesn't* start a drag (e.g., we are editing), 
    // it might proceed to trigger the onClick for starting an edit, which is fine.
  };

  return (
    <div
      id={`player-${id}`}
      className={`${color} text-yellow-300 rounded-full w-16 h-16 flex items-center justify-center font-semibold text-sm shadow-md my-2 mr-2 flex-shrink-0 select-none relative ${isEditing ? 'cursor-text' : 'cursor-grab'} hover:brightness-110 transition-all duration-150`}
      onClick={(_e) => { // Rename 'e' to '_e' as it's unused in the if-branch
          // Prevent starting edit if a drag was just initiated by touch
          // This check might be brittle; relies on touchstart firing just before click
          // A better approach might involve a small delay or state check if issues arise.
          // For now, if the drag handler exists, we assume touchstart handled it.
          if (onPlayerDragStartFromBar) {
              console.log("onClick prevented on touch device, assuming touch handled drag/edit start logic.");
              // _e.preventDefault(); // Might not be needed if touchstart already did
              // _e.stopPropagation(); // Stop click bubbling further if needed
          } else {
            // Normal mouse click behavior
            handleStartEditing(); 
          }
      }}
      onTouchStart={handleTouchStart} // Add touch start handler
      // Add onTouchEnd to handle starting edits on tap for touch devices
      onTouchEnd={(e) => {
          // If a drag wasn't started from this component (meaning it was likely a tap)
          // and we are not already editing, start editing.
          if (!isEditing && onPlayerDragStartFromBar) {
              // Check if touchstart potentially initiated a drag (logic might need refinement)
              // A simple way: if touchstart is followed quickly by touchend without move,
              // treat as a tap. This is complex. Let's try a simpler approach first:
              // If the drag state wasn't set by touchstart, assume tap.
              // This requires parent state knowledge or a delay, let's stick to basic tap for now.
              
              // Basic tap detection: if onPlayerDragStartFromBar exists (meaning we are in the bar),
              // trigger edit on touch end. This might conflict slightly if drag is super short.
              console.log("onTouchEnd detected on PlayerDisk in Bar, potential tap for edit.");
              handleStartEditing();
              // Prevent the subsequent onClick from also firing if possible
              e.preventDefault(); 
          } 
          // No special action needed if not in the bar or already editing.
      }}
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