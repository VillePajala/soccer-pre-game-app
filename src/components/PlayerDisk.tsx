'use client';

import React from 'react';

interface PlayerDiskProps {
  id: string;
  name: string;
  color?: string; // Optional color, default can be blue
}

const PlayerDisk: React.FC<PlayerDiskProps> = ({ id, name, color = 'bg-blue-500' }) => {
  return (
    <div
      id={`player-${id}`}
      className={`${color} rounded-full w-16 h-16 flex items-center justify-center text-white font-bold text-sm cursor-pointer shadow-md m-2 flex-shrink-0 select-none`}
      // Draggable properties will be added later
      draggable="true"
      onDragStart={(e) => {
        // Basic drag data setup (will be refined)
        e.dataTransfer.setData('text/plain', id);
        console.log(`Dragging player: ${name} (${id})`); // Placeholder
      }}
    >
      {name}
    </div>
  );
};

export default PlayerDisk; 