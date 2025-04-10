'use client'; // Need this for client-side interactions like canvas

import React, { useRef, useEffect } from 'react';
import { Player } from '@/app/page'; // Import the Player type

// Define props for SoccerField
interface SoccerFieldProps {
  players: Player[]; // Accept players placed on the field
  onPlayerDrop: (playerId: string, x: number, y: number) => void; // Add the callback prop
}

const SoccerField: React.FC<SoccerFieldProps> = ({ players, onPlayerDrop }) => {
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

    // Draw players (basic circles for now)
    players.forEach(player => {
      if (player.x !== undefined && player.y !== undefined) {
        context.fillStyle = player.color || 'blue'; // Use player color or default
        context.beginPath();
        context.arc(player.x, player.y, 20, 0, Math.PI * 2); // Simple circle representation (radius 20)
        context.fill();
        // TODO: Optionally draw name if toggled on
      }
    });

    // TODO: Add drawing logic for user drawings

  }, [players]); // Re-run effect if players array changes

  // --- Drag and Drop Handlers ---

  const handleDragOver = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Necessary to allow dropping
    e.dataTransfer.dropEffect = "move"; // Indicate the type of operation
  };

  const handleDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('text/plain');
    const canvas = canvasRef.current;

    if (playerId && canvas) {
      const rect = canvas.getBoundingClientRect();
      // Calculate drop position relative to the canvas
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Call the callback function passed from the parent
      onPlayerDrop(playerId, x, y);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full bg-green-700 cursor-crosshair" // Added cursor style
      onDragOver={handleDragOver} // Add drag over handler
      onDrop={handleDrop}         // Add drop handler
    />
  );
};

export default SoccerField; 