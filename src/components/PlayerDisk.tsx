'use client';

import React, { useState, useRef, useEffect } from 'react';

interface PlayerDiskProps {
  id: string;
  name: string;
  color?: string; // Optional color, default can be blue
  onRename: (newName: string) => void; // Add rename callback prop
}

const PlayerDisk: React.FC<PlayerDiskProps> = ({
  id,
  name,
  color = 'bg-blue-500',
  onRename,
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

  return (
    <div
      id={`player-${id}`}
      className={`${color} rounded-full w-16 h-16 flex items-center justify-center text-white font-semibold text-sm shadow-md m-2 flex-shrink-0 select-none relative ${isEditing ? 'cursor-default' : 'cursor-grab'}`}
      draggable={!isEditing} // Prevent dragging while editing
      onDragStart={(e) => {
        if (isEditing) {
          e.preventDefault(); // Prevent drag if editing
          return;
        }
        e.dataTransfer.setData('text/plain', id);
        console.log(`Dragging player: ${name} (${id})`);
      }}
      onClick={handleStartEditing} // Start editing on click
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editedName}
          onChange={handleInputChange}
          onBlur={handleFinishEditing} // Finish editing when input loses focus
          onKeyDown={handleKeyDown}    // Finish on Enter, revert on Escape
          className="w-full h-full bg-transparent text-white text-center font-semibold text-sm outline-none border-none p-0 m-0"
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