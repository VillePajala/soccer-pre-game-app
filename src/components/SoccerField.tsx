'use client'; // Need this for client-side interactions like canvas

import React, { useRef, useEffect, useState } from 'react';
import { Player, Point, Opponent } from '@/app/page'; // Import Opponent type

// Define props for SoccerField
interface SoccerFieldProps {
  players: Player[];
  opponents: Opponent[]; // Add opponents prop
  drawings: Point[][]; // Add drawings prop
  showPlayerNames: boolean; // Add the visibility prop
  onPlayerDrop: (playerId: string, x: number, y: number) => void;
  onPlayerMove: (playerId: string, x: number, y: number) => void;
  onPlayerMoveEnd: () => void; // Add the move end callback prop
  onDrawingStart: (point: Point) => void; // Add drawing callbacks
  onDrawingAddPoint: (point: Point) => void;
  onDrawingEnd: () => void;
  onPlayerRemove: (playerId: string) => void; // Add the remove handler prop
  // Opponent handlers
  onOpponentMove: (opponentId: string, x: number, y: number) => void;
  onOpponentMoveEnd: (opponentId: string) => void;
  onOpponentRemove: (opponentId: string) => void; // Add opponent remove prop
}

// Define player/opponent radius for hit detection and drawing
const PLAYER_RADIUS = 25; // Use a fixed pixel radius to prevent distortion

const SoccerField: React.FC<SoccerFieldProps> = ({
  players,
  opponents, // Destructure opponents prop
  drawings, // Destructure new props
  showPlayerNames, // Destructure the new prop
  onPlayerDrop,
  onPlayerMove,
  onPlayerMoveEnd, // Destructure the new prop
  onDrawingStart,
  onDrawingAddPoint,
  onDrawingEnd,
  onPlayerRemove, // Destructure the remove handler
  // Opponent handlers
  onOpponentMove,
  onOpponentMoveEnd,
  onOpponentRemove, // Destructure opponent remove handler
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Player Dragging State
  const [isDraggingPlayer, setIsDraggingPlayer] = useState<boolean>(false);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  // Opponent Dragging State
  const [isDraggingOpponent, setIsDraggingOpponent] = useState<boolean>(false);
  const [draggingOpponentId, setDraggingOpponentId] = useState<string | null>(null);
  // Drawing State
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

    context.fillStyle = '#059669'; // Use Tailwind Emerald 600
    context.fillRect(0, 0, canvas.width, canvas.height);

    // --- Draw Field Lines --- 
    context.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    context.lineWidth = 2;
    const W = canvas.width;
    const H = canvas.height;
    const lineMargin = 5; 
    const centerRadius = Math.min(W, H) * 0.08;
    const penaltyBoxWidth = W * 0.6;
    const penaltyBoxHeight = H * 0.18;
    const goalBoxWidth = W * 0.3;
    const goalBoxHeight = H * 0.07;
    const penaltySpotDist = H * 0.12;
    const cornerRadius = Math.min(W, H) * 0.02;

    // Outer boundary
    context.beginPath();
    context.strokeRect(lineMargin, lineMargin, W - 2 * lineMargin, H - 2 * lineMargin);

    // Halfway line (Horizontal)
    context.beginPath();
    context.moveTo(lineMargin, H / 2); // Start at left edge, middle height
    context.lineTo(W - lineMargin, H / 2); // End at right edge, middle height
    context.stroke();

    // Center circle
    context.beginPath();
    context.arc(W / 2, H / 2, centerRadius, 0, Math.PI * 2);
    context.stroke();

    // Top Penalty Area & Arc
    context.beginPath(); // Path for rectangle
    const topPenaltyX = (W - penaltyBoxWidth) / 2;
    context.rect(topPenaltyX, lineMargin, penaltyBoxWidth, penaltyBoxHeight); // Define rect path
    context.stroke(); // Stroke JUST the rectangle
    context.beginPath(); // Start NEW path for the arc
    context.arc(W / 2, lineMargin + penaltyBoxHeight, centerRadius * 0.8, 0, Math.PI, false);
    context.stroke(); // Stroke JUST the arc

    // Top Goal Area
    context.beginPath();
    const topGoalX = (W - goalBoxWidth) / 2;
    context.strokeRect(topGoalX, lineMargin, goalBoxWidth, goalBoxHeight);
    context.stroke(); // Explicitly stroke path

    // Bottom Penalty Area & Arc
    context.beginPath(); // Path for rectangle
    const bottomPenaltyY = H - lineMargin - penaltyBoxHeight;
    context.rect(topPenaltyX, bottomPenaltyY, penaltyBoxWidth, penaltyBoxHeight); // Define rect path
    context.stroke(); // Stroke JUST the rectangle
    context.beginPath(); // Start NEW path for the arc
    context.arc(W / 2, H - lineMargin - penaltyBoxHeight, centerRadius * 0.8, Math.PI, 0, false);
    context.stroke(); // Stroke JUST the arc

    // Bottom Goal Area
    context.beginPath();
    const bottomGoalY = H - lineMargin - goalBoxHeight;
    context.strokeRect(topGoalX, bottomGoalY, goalBoxWidth, goalBoxHeight);
    context.stroke(); // Explicitly stroke path

    // Corner Arcs (each needs its own path)
    context.beginPath();
    context.arc(lineMargin, lineMargin, cornerRadius, 0, Math.PI / 2);
    context.stroke();
    context.beginPath();
    context.arc(W - lineMargin, lineMargin, cornerRadius, Math.PI / 2, Math.PI);
    context.stroke();
    context.beginPath();
    context.arc(lineMargin, H - lineMargin, cornerRadius, Math.PI * 1.5, 0);
    context.stroke();
    context.beginPath();
    context.arc(W - lineMargin, H - lineMargin, cornerRadius, Math.PI, Math.PI * 1.5);
    context.stroke();

    // Draw filled spots (need separate fill style and paths)
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    // Center Spot
    context.beginPath();
    context.arc(W / 2, H / 2, 3, 0, Math.PI * 2);
    context.fill();
    // Top Penalty Spot
    context.beginPath();
    context.arc(W / 2, lineMargin + penaltySpotDist, 3, 0, Math.PI * 2);
    context.fill();
    // Bottom Penalty Spot
    context.beginPath();
    context.arc(W / 2, H - lineMargin - penaltySpotDist, 3, 0, Math.PI * 2);
    context.fill();
    // --- End Field Lines ---

    // Draw user drawings
    context.strokeStyle = '#06B6D4'; // Cyan 500 for user drawings
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

    // Draw opponents (before players?)
    context.fillStyle = '#EF4444'; // Red color for opponents
    context.strokeStyle = '#DC2626'; // Darker red border for better contrast?
    context.lineWidth = 2;
    opponents.forEach(opponent => {
      context.beginPath();
      context.arc(opponent.x, opponent.y, PLAYER_RADIUS * 0.9, 0, Math.PI * 2); // Slightly smaller radius
      context.fill();
      context.stroke();
    });

    // Draw players (on top of drawings and opponents)
    players.forEach(player => {
      if (player.x !== undefined && player.y !== undefined) {
        context.fillStyle = player.color || '#3B82F6';
        context.strokeStyle = '#1D4ED8'; // Darker blue border for better contrast
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

  // Redraw canvas whenever players, opponents, drawings, or name visibility change
  useEffect(() => {
    draw();
  }, [players, opponents, drawings, showPlayerNames]); // Add opponents and showPlayerNames dependency

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

  // Helper for opponent hit detection (slightly smaller radius)
  const isPointInOpponent = (x: number, y: number, opponent: Opponent): boolean => {
    const dx = x - opponent.x;
    const dy = y - opponent.y;
    return dx * dx + dy * dy <= (PLAYER_RADIUS * 0.9) * (PLAYER_RADIUS * 0.9);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    if (!pos) return;

    // Check for player double-click first
    if (e.detail === 2) {
        for (const player of players) {
          if (isPointInPlayer(pos.x, pos.y, player)) {
            console.log("Native double click detected on player:", player.id);
            onPlayerRemove(player.id);
            return; // Stop further processing
          }
        }
        // Check for opponent double-click
        for (const opponent of opponents) {
          if (isPointInOpponent(pos.x, pos.y, opponent)) {
            console.log("Native double click detected on opponent:", opponent.id);
            onOpponentRemove(opponent.id);
            return; // Stop further processing
          }
        }
    }

    // Check for player drag start
    for (const player of players) {
      if (isPointInPlayer(pos.x, pos.y, player)) {
        setIsDraggingPlayer(true);
        setDraggingPlayerId(player.id);
        canvasRef.current?.style.setProperty('cursor', 'grabbing');
        return; // Start player drag
      }
    }

    // Check for opponent drag start
    for (const opponent of opponents) {
      if (isPointInOpponent(pos.x, pos.y, opponent)) {
        setIsDraggingOpponent(true);
        setDraggingOpponentId(opponent.id);
        canvasRef.current?.style.setProperty('cursor', 'grabbing');
        return; // Start opponent drag
      }
    }

    // If not dragging anything, start drawing
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

    // Handle opponent dragging
    if (isDraggingOpponent && draggingOpponentId) {
      onOpponentMove(draggingOpponentId, pos.x, pos.y);
      return; // Don't draw while dragging opponent
    }

    // Handle drawing
    if (isDrawing) {
      onDrawingAddPoint(pos);
      // Redrawing happens via useEffect in parent when `drawings` state changes
    }

    // Update cursor if not actively dragging/drawing
    if (!isDrawing && !isDraggingPlayer && !isDraggingOpponent) {
      let hoveringPlayer = false;
      for (const player of players) {
        if (isPointInPlayer(pos.x, pos.y, player)) {
          hoveringPlayer = true;
          break;
        }
      }
      // Add check for hovering opponent
      let hoveringOpponent = false;
      if (!hoveringPlayer) { // Only check opponent if not hovering player
          for (const opponent of opponents) {
            if (isPointInOpponent(pos.x, pos.y, opponent)) {
              hoveringOpponent = true;
              break;
            }
          }
      }
      canvasRef.current?.style.setProperty('cursor', hoveringPlayer || hoveringOpponent ? 'grab' : 'crosshair');
    }
  };

  const handleMouseUp = () => {
    if (isDraggingPlayer) {
      setIsDraggingPlayer(false);
      setDraggingPlayerId(null);
      onPlayerMoveEnd(); // Call the callback when player drag ends
      canvasRef.current?.style.setProperty('cursor', 'crosshair');
    }
    if (isDraggingOpponent && draggingOpponentId) {
      onOpponentMoveEnd(draggingOpponentId);
      setIsDraggingOpponent(false);
      setDraggingOpponentId(null);
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
    if (isDraggingOpponent && draggingOpponentId) {
      onOpponentMoveEnd(draggingOpponentId);
      setIsDraggingOpponent(false);
      setDraggingOpponentId(null);
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