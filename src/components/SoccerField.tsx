'use client'; // Need this for client-side interactions like canvas

import React, { useRef, useEffect, useState } from 'react';
import { Player, Point } from '@/app/page'; // Import Point type

// Define props for SoccerField
interface SoccerFieldProps {
  players: Player[];
  drawings: Point[][]; // Add drawings prop
  showPlayerNames: boolean; // Add the visibility prop
  onPlayerDrop: (playerId: string, x: number, y: number) => void;
  onPlayerMove: (playerId: string, x: number, y: number) => void;
  onPlayerMoveEnd: () => void; // Add the move end callback prop
  onDrawingStart: (point: Point) => void; // Add drawing callbacks
  onDrawingAddPoint: (point: Point) => void;
  onDrawingEnd: () => void;
  onPlayerRemove: (playerId: string) => void; // Add the remove handler prop
}

// Define player radius for hit detection and drawing
const PLAYER_RADIUS = 25; // Increased slightly for easier clicking

const SoccerField: React.FC<SoccerFieldProps> = ({
  players,
  drawings, // Destructure new props
  showPlayerNames, // Destructure the new prop
  onPlayerDrop,
  onPlayerMove,
  onPlayerMoveEnd, // Destructure the new prop
  onDrawingStart,
  onDrawingAddPoint,
  onDrawingEnd,
  onPlayerRemove, // Destructure the remove handler
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDraggingPlayer, setIsDraggingPlayer] = useState<boolean>(false); // Renamed for clarity
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false); // State for drawing mode

  // --- Drawing Logic ---
  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const parent = canvas.parentElement;
    if (parent && (canvas.width !== parent.clientWidth || canvas.height !== parent.clientHeight)) {
      canvas.width = parent.clientWidth;
      canvas.height = parent.clientHeight;
    }

    context.fillStyle = '#34D399';
    context.fillRect(0, 0, canvas.width, canvas.height);

    // Draw field lines (placeholder)
    // context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    // context.lineWidth = 2;
    // context.beginPath();
    // context.moveTo(canvas.width / 2, 0);
    // context.lineTo(canvas.width / 2, canvas.height);
    // context.stroke();

    // Draw user drawings
    context.strokeStyle = '#FFFFFF'; // White lines
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    drawings.forEach(path => {
      if (path.length < 2) return; // Need at least 2 points for a line
      context.beginPath();
      context.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i++) {
        context.lineTo(path[i].x, path[i].y);
      }
      context.stroke();
    });

    // Draw players (on top of drawings)
    players.forEach(player => {
      if (player.x !== undefined && player.y !== undefined) {
        context.fillStyle = player.color || '#3B82F6';
        context.strokeStyle = '#E5E7EB';
        context.lineWidth = 2;
        context.beginPath();
        context.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
        context.fill();
        context.stroke();

        // Draw name if toggled on
        if (showPlayerNames) {
          context.fillStyle = 'white'; // Or black, depending on disk color
          context.font = 'bold 12px sans-serif';
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          // Simple text rendering, might need refinement for long names
          context.fillText(player.name, player.x, player.y);
        }
      }
    });
  };

  // Redraw canvas whenever players, drawings, or name visibility change
  useEffect(() => {
    draw();
  }, [players, drawings, showPlayerNames]); // Add showPlayerNames dependency

  // --- Event Handlers ---
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const isPointInPlayer = (x: number, y: number, player: Player): boolean => {
    if (player.x === undefined || player.y === undefined) return false;
    const dx = x - player.x;
    const dy = y - player.y;
    return dx * dx + dy * dy <= PLAYER_RADIUS * PLAYER_RADIUS;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    if (!pos) return;

    // Double-click detection logic
    const doubleClickThreshold = 300; // milliseconds
    const now = Date.now();
    if (e.detail === 2) { // Check if it's a native double click event first
        for (const player of players) {
          if (isPointInPlayer(pos.x, pos.y, player)) {
            console.log("Native double click detected on player:", player.id);
            onPlayerRemove(player.id);
            return; // Stop further processing
          }
        }
    }

    // Fallback or primary logic for player drag start
    for (const player of players) {
      if (isPointInPlayer(pos.x, pos.y, player)) {
        setIsDraggingPlayer(true);
        setDraggingPlayerId(player.id);
        canvasRef.current?.style.setProperty('cursor', 'grabbing');
        return; // Start player drag
      }
    }

    // If not dragging a player, start drawing
    setIsDrawing(true);
    onDrawingStart(pos);
    canvasRef.current?.style.setProperty('cursor', 'crosshair'); // Ensure crosshair while drawing
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    if (!pos) return;

    // Handle player dragging
    if (isDraggingPlayer && draggingPlayerId) {
      onPlayerMove(draggingPlayerId, pos.x, pos.y);
      return; // Don't draw while dragging player
    }

    // Handle drawing
    if (isDrawing) {
      onDrawingAddPoint(pos);
      // Redrawing happens via useEffect in parent when `drawings` state changes
    }

    // Update cursor if not actively dragging/drawing
    if (!isDrawing && !isDraggingPlayer) {
      let hoveringPlayer = false;
      for (const player of players) {
        if (isPointInPlayer(pos.x, pos.y, player)) {
          hoveringPlayer = true;
          break;
        }
      }
      canvasRef.current?.style.setProperty('cursor', hoveringPlayer ? 'grab' : 'crosshair');
    }
  };

  const handleMouseUp = () => {
    if (isDraggingPlayer) {
      setIsDraggingPlayer(false);
      setDraggingPlayerId(null);
      onPlayerMoveEnd(); // Call the callback when player drag ends
      canvasRef.current?.style.setProperty('cursor', 'crosshair');
    }
    if (isDrawing) {
      setIsDrawing(false);
      onDrawingEnd();
      canvasRef.current?.style.setProperty('cursor', 'crosshair');
    }
  };

  const handleMouseLeave = () => {
    if (isDraggingPlayer) {
      setIsDraggingPlayer(false);
      setDraggingPlayerId(null);
      onPlayerMoveEnd(); // Also call if mouse leaves while dragging
      canvasRef.current?.style.setProperty('cursor', 'crosshair');
    }
    if (isDrawing) {
      setIsDrawing(false);
      onDrawingEnd(); // End drawing if mouse leaves
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
    onPlayerDrop(playerId, x, y);
  };

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full bg-green-400"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
    />
  );
};

export default SoccerField; 