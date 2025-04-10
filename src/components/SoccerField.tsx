'use client'; // Need this for client-side interactions like canvas

import React, { useRef, useEffect, useState } from 'react';
import { Player } from '@/app/page'; // Import the Player type

// Define props for SoccerField
interface SoccerFieldProps {
  players: Player[]; // Accept players placed on the field
  onPlayerDrop: (playerId: string, x: number, y: number) => void; // Add the callback prop
  onPlayerMove: (playerId: string, x: number, y: number) => void; // Add the move callback prop
}

// Define player radius for hit detection and drawing
const PLAYER_RADIUS = 25; // Increased slightly for easier clicking

const SoccerField: React.FC<SoccerFieldProps> = ({ players, onPlayerDrop, onPlayerMove }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);

  // --- Drawing Logic --- (Moved drawing into a reusable function)
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    // Ensure canvas size matches parent
    const parent = canvas.parentElement;
    if (parent && (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight)) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    // Clear canvas and draw background
    context.fillStyle = '#34D399'; // Use a specific green from Tailwind palette (green-400)
    context.fillRect(0, 0, canvas.width, canvas.height);

    // TODO: Draw field lines (e.g., center circle, penalty boxes)

    // Draw players
    players.forEach(player => {
      if (player.x !== undefined && player.y !== undefined) {
        context.fillStyle = player.color || '#3B82F6'; // Tailwind blue-500
        context.strokeStyle = '#E5E7EB'; // gray-200 border
        context.lineWidth = 2;
        context.beginPath();
        context.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
        context.fill();
        context.stroke();

        // TODO: Draw name if toggled on (consider clipping)
        // Example: Draw name
        // context.fillStyle = 'white';
        // context.font = 'bold 12px sans-serif';
        // context.textAlign = 'center';
        // context.textBaseline = 'middle';
        // context.fillText(player.name, player.x, player.y);
      }
    });

    // TODO: Add logic for user drawings (lines/arrows)
  };

  // Redraw canvas whenever players change
  useEffect(() => {
    draw();
  }, [players]);

  // --- Event Handlers ---

  // Gets mouse position relative to canvas
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  // Check if a point is inside a player circle
  const isPointInPlayer = (x: number, y: number, player: Player): boolean => {
    if (player.x === undefined || player.y === undefined) return false;
    const dx = x - player.x;
    const dy = y - player.y;
    return dx * dx + dy * dy <= PLAYER_RADIUS * PLAYER_RADIUS;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    if (!pos) return;

    // Check if click is on any player
    for (const player of players) {
      if (isPointInPlayer(pos.x, pos.y, player)) {
        setIsDragging(true);
        setDraggingPlayerId(player.id);
        console.log(`Started dragging player: ${player.id}`);
        canvasRef.current?.style.setProperty('cursor', 'grabbing');
        return; // Found a player, start drag
      }
    }
    // If click was not on a player, potential start for drawing?
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    if (!pos) return;

    // Update cursor based on hover
    let hoveringPlayer = false;
    for (const player of players) {
      if (isPointInPlayer(pos.x, pos.y, player)) {
        hoveringPlayer = true;
        break;
      }
    }
    if (!isDragging) {
       canvasRef.current?.style.setProperty('cursor', hoveringPlayer ? 'grab' : 'crosshair');
    }

    // If currently dragging a player, update their position
    if (isDragging && draggingPlayerId && pos) {
      onPlayerMove(draggingPlayerId, pos.x, pos.y);
      // Redrawing happens via useEffect when `players` state changes in parent
    }
    // If not dragging player, potential drawing logic?
  };

  const handleMouseUp = () => {
    if (isDragging) {
      console.log(`Stopped dragging player: ${draggingPlayerId}`);
      setIsDragging(false);
      setDraggingPlayerId(null);
      canvasRef.current?.style.setProperty('cursor', 'grab'); // Or crosshair if not over player
    }
  };

  const handleMouseLeave = () => {
    // Stop dragging if mouse leaves canvas
    if (isDragging) {
      console.log(`Stopped dragging (mouse left canvas): ${draggingPlayerId}`);
      setIsDragging(false);
      setDraggingPlayerId(null);
      canvasRef.current?.style.setProperty('cursor', 'crosshair');
    }
  };

  // --- HTML Drag and Drop Handlers (for PlayerBar drops) ---
  const handleDragOver = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const playerId = e.dataTransfer.getData('text/plain');
    const canvas = canvasRef.current;
    if (!playerId || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Let the parent handle the drop logic (add or move)
    onPlayerDrop(playerId, x, y);
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full bg-green-400" // Match draw background
      onDragOver={handleDragOver} // For drops from PlayerBar
      onDrop={handleDrop}         // For drops from PlayerBar
      onMouseDown={handleMouseDown} // Start dragging player on field
      onMouseMove={handleMouseMove} // Handle dragging / cursor change
      onMouseUp={handleMouseUp}     // Stop dragging
      onMouseLeave={handleMouseLeave} // Stop dragging if leaves canvas
    />
  );
};

export default SoccerField; 