'use client'; // Need this for client-side interactions like canvas

import React, { useRef, useEffect } from 'react';
import { Player } from '@/app/page'; // Import the Player type

// Define props for SoccerField
interface SoccerFieldProps {
  players: Player[]; // Accept players placed on the field
}

const SoccerField: React.FC<SoccerFieldProps> = ({ players }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Basic setup: Clear canvas and set background (optional)
    // We might draw the field lines here later
    const parent = canvas.parentElement;
    if (parent) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
      context.fillStyle = 'green'; // Example field color
      context.fillRect(0, 0, canvas.width, canvas.height);
    }

    // TODO: Draw field lines

    // TODO: Draw players from the 'players' prop onto the canvas
    console.log('Players on field (in SoccerField):', players);

    // TODO: Add drawing logic for user drawings

  }, [players]); // Re-run effect if players array changes

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full bg-green-700" // Use Tailwind for initial background
      // TODO: Add event handlers for drag drop (onDrop, onDragOver)
    />
  );
};

export default SoccerField; 