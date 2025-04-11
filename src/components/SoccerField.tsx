'use client'; // Need this for client-side interactions like canvas

import React, { useRef, useEffect, useState, useCallback } from 'react';
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
  // Add props for handling touch drags from PlayerBar
  draggingPlayerFromBarInfo: Player | null; 
  onPlayerDropViaTouch: (x: number, y: number) => void;
  onPlayerDragCancelViaTouch: () => void;
}

// Define player/opponent radius for hit detection and drawing
const PLAYER_RADIUS = 20; // Reduced size for smaller appearance on field
const DOUBLE_TAP_TIME_THRESHOLD = 300; // ms for double tap detection
const DOUBLE_TAP_POS_THRESHOLD = 15; // pixels for double tap proximity

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
  // Destructure touch drag props
  draggingPlayerFromBarInfo, 
  onPlayerDropViaTouch,
  onPlayerDragCancelViaTouch,
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
  const [activeTouchId, setActiveTouchId] = useState<number | null>(null); // Track the primary touch for drawing/dragging
  // Double Tap State
  const [lastTapInfo, setLastTapInfo] = useState<{ time: number; x: number; y: number; targetId: string | null; targetType: 'player' | 'opponent' | null } | null>(null);

  // --- Drawing Logic wrapped in useCallback ---
  // Dependencies: Need to list everything used inside draw that comes from props or state
  const draw = useCallback(() => { 
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
    context.strokeStyle = 'rgba(255, 255, 255, 0.6)'; // Lower opacity
    context.lineWidth = 2; // Slightly thicker than before
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
    context.strokeStyle = '#FB923C'; // Orange 400 for user drawings
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

    // Draw opponents 
    context.lineWidth = 1.5; // Keep border thin
    opponents.forEach(opponent => {
      context.beginPath();
      context.arc(opponent.x, opponent.y, PLAYER_RADIUS * 0.9, 0, Math.PI * 2);
      context.save(); // Save context state before applying shadow/gradient
      // Inner Shadow
      context.shadowColor = 'rgba(0, 0, 0, 0.5)';
      context.shadowBlur = 5;
      context.shadowOffsetX = 1;
      context.shadowOffsetY = 2;
      // Radial Gradient Fill
      const gradientOpp = context.createRadialGradient(opponent.x - 3, opponent.y - 3, 1, opponent.x, opponent.y, PLAYER_RADIUS * 0.9);
      gradientOpp.addColorStop(0, '#F87171'); // Lighter red center (red-400)
      gradientOpp.addColorStop(1, '#DC2626'); // Darker red edge (red-600)
      context.fillStyle = gradientOpp;
      context.fill();
      context.restore(); // Restore context (removes shadow for stroke)
      // Stroke (border)
      context.strokeStyle = '#B91C1C'; // Even darker red border (red-700)
      context.stroke();
    });

    // Draw players 
    // context.lineWidth = 1.5; // No border needed now
    players.forEach(player => {
      if (player.x !== undefined && player.y !== undefined) {
        context.beginPath();
        context.arc(player.x, player.y, PLAYER_RADIUS, 0, Math.PI * 2);
        context.save(); // Save context state
        // Inner Shadow (same as opponent)
        context.shadowColor = 'rgba(0, 0, 0, 0.5)';
        context.shadowBlur = 5;
        context.shadowOffsetX = 1;
        context.shadowOffsetY = 2;
        // Use flat color matching PlayerDisk default
        context.fillStyle = player.color || '#7E22CE'; // CHANGED default from #3B82F6 (blue-500) to #7E22CE (purple-700)
        context.fill();
        context.restore(); // Restore context (removes shadow)
        // Stroke (border) - RE-ADD for consistent look with shadow
        context.strokeStyle = '#581C87'; // CHANGED from #1E40AF (blue-800) to #581C87 (purple-900)
        context.lineWidth = 1.5; 
        context.stroke();

        // Draw name if toggled on
        if (showPlayerNames) {
          context.fillStyle = '#FDE047'; // CHANGED from #FACC15 (yellow-400) to #FDE047 (yellow-300)
          // context.strokeStyle = 'rgba(0,0,0,0.7)'; // Remove outline
          // context.lineWidth = 2.5; 
          context.font = '600 11px Inter, sans-serif'; // Match font-semibold, size, and family 
          context.textAlign = 'center';
          context.textBaseline = 'middle';
          // context.strokeText(player.name, player.x, player.y); // Remove outline
          context.fillText(player.name, player.x, player.y); // Fill only
        }
      }
    });
  // List dependencies for useCallback: props used inside draw
  }, [players, opponents, drawings, showPlayerNames]); 

  // Redraw canvas whenever relevant props change
  // REMOVED: eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    draw(); // Now depends on the memoized draw function
  // Add draw itself as a dependency
  }, [draw]); 

  // --- Event Handlers ---

  // Unified function to get position from Mouse or Touch events
  const getEventPosition = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    specificTouchId?: number | null
  ): { x: number; y: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX: number;
    let clientY: number;

    if ('touches' in e) { // Touch event
      let touch: React.Touch | null = null;
      if (specificTouchId !== undefined && specificTouchId !== null) {
        // Find the specific touch if an ID is provided (for move/end)
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === specificTouchId) {
            touch = e.changedTouches[i];
            break;
          }
        }
        // Fallback for move events if not in changedTouches (less common but possible)
        if (!touch) {
             for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === specificTouchId) {
                    touch = e.touches[i];
                    break;
                }
            }
        }
      } else {
        // Use the first touch if no specific ID (for start)
        touch = e.touches[0];
      }

      if (!touch) return null; // No relevant touch found
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else { // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    };
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
    // Allow only left clicks (button 0)
    if (e.button !== 0) return;

    const pos = getEventPosition(e);
    if (!pos) return;

    // Check for double-click removal first
    if (e.detail === 2) { // Standard double-click detection
      for (const player of players) {
        if (player.x && player.y && isPointInPlayer(pos.x, pos.y, player)) {
          onPlayerRemove(player.id);
          return; // Prevent starting a drag on double-click remove
        }
      }
      for (const opponent of opponents) {
        if (isPointInOpponent(pos.x, pos.y, opponent)) {
          onOpponentRemove(opponent.id);
          return; // Prevent starting a drag on double-click remove
        }
      }
    }

    // Check if dragging a player
    for (const player of players) {
      if (player.x && player.y && isPointInPlayer(pos.x, pos.y, player)) {
        setIsDraggingPlayer(true);
        setDraggingPlayerId(player.id);
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
        return; // Found player to drag, exit
      }
    }

    // Check if dragging an opponent
    for (const opponent of opponents) {
        if (isPointInOpponent(pos.x, pos.y, opponent)) {
            setIsDraggingOpponent(true);
            setDraggingOpponentId(opponent.id);
            if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
            return; // Found opponent to drag, exit
        }
    }

    // If not dragging, start drawing
    setIsDrawing(true);
    onDrawingStart(pos);
    if (canvasRef.current) canvasRef.current.style.cursor = 'crosshair';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getEventPosition(e);
    if (!pos) return;

    if (isDraggingPlayer && draggingPlayerId) {
      onPlayerMove(draggingPlayerId, pos.x, pos.y);
    } else if (isDraggingOpponent && draggingOpponentId) {
      onOpponentMove(draggingOpponentId, pos.x, pos.y);
    } else if (isDrawing) {
      onDrawingAddPoint(pos);
    } else {
      // Change cursor to grab on hover over draggable items
      let hovering = false;
      for (const player of players) {
        if (player.x && player.y && isPointInPlayer(pos.x, pos.y, player)) {
          hovering = true;
          break;
        }
      }
      if (!hovering) {
          for (const opponent of opponents) {
              if (isPointInOpponent(pos.x, pos.y, opponent)) {
                  hovering = true;
                  break;
              }
          }
      }

      if (canvasRef.current) {
        canvasRef.current.style.cursor = hovering ? 'grab' : 'default';
      }
    }
  };

  const handleMouseUp = () => {
    if (isDraggingPlayer) {
      onPlayerMoveEnd(); // Call the end handler
      setIsDraggingPlayer(false);
      setDraggingPlayerId(null);
    } else if (isDraggingOpponent && draggingOpponentId) { // Check opponent state
        onOpponentMoveEnd(draggingOpponentId); // Call opponent end handler
        setIsDraggingOpponent(false);
        setDraggingOpponentId(null);
    } else if (isDrawing) {
      onDrawingEnd();
      setIsDrawing(false);
    }
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  };

  const handleMouseLeave = () => {
    // If dragging or drawing stops when mouse leaves canvas
    if (isDraggingPlayer) {
      onPlayerMoveEnd();
      setIsDraggingPlayer(false);
      setDraggingPlayerId(null);
    } else if (isDraggingOpponent && draggingOpponentId) { // Check opponent state
        onOpponentMoveEnd(draggingOpponentId);
        setIsDraggingOpponent(false);
        setDraggingOpponentId(null);
    } else if (isDrawing) {
      onDrawingEnd();
      setIsDrawing(false);
    }
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  };

  // --- Touch Handlers ---

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent mouse event emulation
    // e.preventDefault(); // Still maybe problematic

    if (e.touches.length > 1) return; // Ignore multi-touch gestures for now

    const touch = e.touches[0];
    const touchId = touch.identifier;
    // Set the active touch ID immediately, needed for drop detection even if we don't drag/draw on canvas
    setActiveTouchId(touchId); 

    const pos = getEventPosition(e, touchId);
    if (!pos) {
        setActiveTouchId(null); // Clear if position is invalid
        return;
    }

    // If a drag from the bar is in progress, don't initiate any *new* actions on the canvas itself (drag/draw/double-tap check).
    // Just track the touch ID so onTouchEnd can handle the drop.
    if (draggingPlayerFromBarInfo) { 
        console.log("TouchStart on Field detected while dragging from bar. Allowing drop on TouchEnd.");
        // Prevent default scrolling while user is dragging *potentially* onto the canvas
        e.preventDefault(); 
        return; 
    }

    const now = Date.now();
    let tappedTargetId: string | null = null;
    let tappedTargetType: 'player' | 'opponent' | null = null;

    // Check for tap on player
    for (const player of players) {
      if (player.x && player.y && isPointInPlayer(pos.x, pos.y, player)) {
        tappedTargetId = player.id;
        tappedTargetType = 'player';
        break;
      }
    }

    // Check for tap on opponent if no player found
    if (!tappedTargetId) {
        for (const opponent of opponents) {
            if (isPointInOpponent(pos.x, pos.y, opponent)) {
                tappedTargetId = opponent.id;
                tappedTargetType = 'opponent';
                break;
            }
        }
    }

    // Double Tap Logic
    if (lastTapInfo && tappedTargetId && lastTapInfo.targetId === tappedTargetId && lastTapInfo.targetType === tappedTargetType) {
      const timeDiff = now - lastTapInfo.time;
      const distDiff = Math.sqrt(Math.pow(pos.x - lastTapInfo.x, 2) + Math.pow(pos.y - lastTapInfo.y, 2));

      if (timeDiff < DOUBLE_TAP_TIME_THRESHOLD && distDiff < DOUBLE_TAP_POS_THRESHOLD) {
        // Double tap detected!
        if (tappedTargetType === 'player') {
            onPlayerRemove(tappedTargetId);
        } else if (tappedTargetType === 'opponent') {
            onOpponentRemove(tappedTargetId);
        }
        setLastTapInfo(null); // Reset tap info
        setActiveTouchId(null); // Ensure no drag starts
        e.preventDefault(); // Prevent initiating drag/draw after remove
        return;
      }
    }

    // Store tap info for potential double tap next time
    setLastTapInfo({ time: now, x: pos.x, y: pos.y, targetId: tappedTargetId, targetType: tappedTargetType });


    // --- Start Dragging or Drawing ---
    if (tappedTargetType === 'player' && tappedTargetId) {
        setIsDraggingPlayer(true);
        setDraggingPlayerId(tappedTargetId);
        setActiveTouchId(touchId);
        e.preventDefault(); // Prevent scroll/drag start when grabbing player
    } else if (tappedTargetType === 'opponent' && tappedTargetId) {
        setIsDraggingOpponent(true);
        setDraggingOpponentId(tappedTargetId);
        setActiveTouchId(touchId);
        e.preventDefault(); // Prevent scroll/drag start when grabbing opponent
    } else {
        // If not hitting a player or opponent, start drawing
        if (!draggingPlayerFromBarInfo) {
            setIsDrawing(true);
            onDrawingStart(pos);
            setActiveTouchId(touchId);
            e.preventDefault(); // Prevent scroll/drag start when drawing
        }
    }
  };


  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTouchId === null) return; // Only track the finger that started the action

    // *** Crucially prevent page scrolling during canvas interaction ***
    if (isDraggingPlayer || isDraggingOpponent || isDrawing) {
        e.preventDefault();
    }

    const pos = getEventPosition(e, activeTouchId);
    if (!pos) return;

    if (isDraggingPlayer && draggingPlayerId) {
      onPlayerMove(draggingPlayerId, pos.x, pos.y);
    } else if (isDraggingOpponent && draggingOpponentId) {
      onOpponentMove(draggingOpponentId, pos.x, pos.y);
    } else if (isDrawing) {
      onDrawingAddPoint(pos);
    }
  };

  const handleTouchEndOrCancel = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // If we are dragging a player *from the bar*, handle the drop/cancel
    if (draggingPlayerFromBarInfo && activeTouchId !== null) {
        // Find the specific touch that ended/cancelled
        let relevantTouch: React.Touch | null = null;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === activeTouchId) {
                relevantTouch = e.changedTouches[i];
                break;
            }
        }

        if (relevantTouch) {
            const pos = getEventPosition(e, activeTouchId); // Get final position

            // Check if the touch ended *within* the canvas bounds
            // Note: getEventPosition returns null if touch is outside canvas, but let's be explicit
            const canvas = canvasRef.current;
            let droppedOnCanvas = false;
            if (pos && canvas) {
                const rect = canvas.getBoundingClientRect();
                // Use clientX/Y from the touch event directly for bounds check relative to viewport
                if ( relevantTouch.clientX >= rect.left &&
                     relevantTouch.clientX <= rect.right &&
                     relevantTouch.clientY >= rect.top &&
                     relevantTouch.clientY <= rect.bottom ) 
                {
                     droppedOnCanvas = true;
                }
            }

            if (e.type === 'touchend' && droppedOnCanvas && pos) {
                console.log("Touch ended on canvas while dragging from bar", pos);
                onPlayerDropViaTouch(pos.x, pos.y);
            } else {
                // If touch cancelled, ended outside canvas, or pos was invalid
                console.log("Touch cancelled or ended off-canvas while dragging from bar");
                onPlayerDragCancelViaTouch();
            }

            // Clear touch ID and return, as this touch event is handled.
            setActiveTouchId(null);
            // Reset lastTapInfo to prevent accidental double-tap triggers after drag-drop
            setLastTapInfo(null); 
            return; 
        }
        // If the ending touch wasn't the one we tracked for the bar-drag, 
        // fall through to potentially handle other touch end logic, though unlikely.
    }

    // --- Original logic for ending drags/draws initiated *on* the canvas ---
    if (activeTouchId === null) return;

    // Check if the ending touch matches the tracked touch for on-canvas actions
    let touchEnded = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) {
            touchEnded = true;
            break;
        }
    }

    if (!touchEnded) return; // This end/cancel event doesn't correspond to our active touch


    // Reset states based on what action was active
    if (isDraggingPlayer) {
      onPlayerMoveEnd();
      setIsDraggingPlayer(false);
      setDraggingPlayerId(null);
    } else if (isDraggingOpponent && draggingOpponentId) {
      onOpponentMoveEnd(draggingOpponentId);
      setIsDraggingOpponent(false);
      setDraggingOpponentId(null);
    } else if (isDrawing) {
      onDrawingEnd();
      setIsDrawing(false);
    }

    // Always clear the active touch ID
    setActiveTouchId(null);

    // We don't reset lastTapInfo here, it's reset on successful double tap or overwritten by the next tap.
  };

  // --- HTML Drag and Drop Handlers (for PlayerBar drops) ---
  const handleDragOver = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent default browser behavior
    const data = e.dataTransfer.getData('application/reactflow'); // Or your custom data type

    // Basic check if data exists
    if (!data) {
      console.error("No data transferred on drop");
      return;
    }

    let droppedPlayerId: string;
    try {
        const parsedData = JSON.parse(data);
        droppedPlayerId = parsedData.id; // Assuming your data has an 'id'
        if (!droppedPlayerId) throw new Error("ID missing in dropped data");
    } catch (error) {
        console.error("Failed to parse dropped data:", error, "Raw data:", data);
        return; // Stop if data is invalid
    }


    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    onPlayerDrop(droppedPlayerId, x, y); // Call the callback prop
    if (canvasRef.current) canvasRef.current.style.cursor = 'default'; // Reset cursor after drop
  };

  return (
    <div className="relative w-full h-full touch-none">
      <canvas 
        ref={canvasRef}
        className="w-full h-full block touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}  
        onTouchEnd={handleTouchEndOrCancel}
        onTouchCancel={handleTouchEndOrCancel}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
    </div>
  );
};

export default SoccerField; 