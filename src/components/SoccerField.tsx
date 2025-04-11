'use client'; // Need this for client-side interactions like canvas

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Player, Point, Opponent } from '@/app/page'; // Import types with relative coords

// Define props for SoccerField
interface SoccerFieldProps {
  players: Player[];
  opponents: Opponent[];
  drawings: Point[][];
  showPlayerNames: boolean;
  onPlayerDrop: (playerId: string, relX: number, relY: number) => void; // Use relative coords
  onPlayerMove: (playerId: string, relX: number, relY: number) => void; // Use relative coords
  onPlayerMoveEnd: () => void;
  onDrawingStart: (point: Point) => void; // Point already uses relative
  onDrawingAddPoint: (point: Point) => void; // Point already uses relative
  onDrawingEnd: () => void;
  onPlayerRemove: (playerId: string) => void;
  // Opponent handlers
  onOpponentMove: (opponentId: string, relX: number, relY: number) => void; // Use relative coords
  onOpponentMoveEnd: (opponentId: string) => void;
  onOpponentRemove: (opponentId: string) => void;
  // Touch drag props
  draggingPlayerFromBarInfo: Player | null; 
  onPlayerDropViaTouch: (relX: number, relY: number) => void; // Use relative coords
  onPlayerDragCancelViaTouch: () => void;
}

// Constants
const PLAYER_RADIUS = 20;
const DOUBLE_TAP_TIME_THRESHOLD = 300; // ms
const DOUBLE_TAP_POS_THRESHOLD = 15; // pixels

const SoccerField: React.FC<SoccerFieldProps> = ({
  players,
  opponents,
  drawings,
  showPlayerNames,
  onPlayerDrop,
  onPlayerMove,
  onPlayerMoveEnd,
  onDrawingStart,
  onDrawingAddPoint,
  onDrawingEnd,
  onPlayerRemove,
  onOpponentMove,
  onOpponentMoveEnd,
  onOpponentRemove,
  draggingPlayerFromBarInfo, 
  onPlayerDropViaTouch,
  onPlayerDragCancelViaTouch,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDraggingPlayer, setIsDraggingPlayer] = useState<boolean>(false);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [isDraggingOpponent, setIsDraggingOpponent] = useState<boolean>(false);
  const [draggingOpponentId, setDraggingOpponentId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [activeTouchId, setActiveTouchId] = useState<number | null>(null);
  const [lastTapInfo, setLastTapInfo] = useState<{ time: number; x: number; y: number; targetId: string | null; targetType: 'player' | 'opponent' | null } | null>(null);

  // --- Drawing Logic ---
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
    const W = canvas.width;
    const H = canvas.height;

    // *** SAFETY CHECK: Ensure canvas dimensions are valid ***
    if (W <= 0 || H <= 0 || !Number.isFinite(W) || !Number.isFinite(H)) {
      console.warn("Canvas dimensions are invalid, skipping draw:", { W, H });
      return; 
    }

    // --- Clear and Draw Background/Field Lines --- 
    context.fillStyle = '#059669'; 
    context.fillRect(0, 0, W, H);
    // ... (rest of field line drawing code - safe as it uses W/H directly) ...
    context.strokeStyle = 'rgba(255, 255, 255, 0.6)'; // Lower opacity
    context.lineWidth = 2; // Slightly thicker than before
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
    context.stroke();
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

    // --- Draw User Drawings --- Convert relative points to absolute
    context.strokeStyle = '#FB923C'; // Orange 400
    context.lineWidth = 3;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    drawings.forEach(path => {
      if (path.length < 2) return;
      
      // Check first point validity
      const startX = path[0].relX * W;
      const startY = path[0].relY * H;
      if (!Number.isFinite(startX) || !Number.isFinite(startY)) {
        console.warn("Skipping drawing path due to non-finite start point", path[0]);
        return; // Skip this whole path
      }

      context.beginPath();
      context.moveTo(startX, startY);
      
      for (let i = 1; i < path.length; i++) {
        const pointX = path[i].relX * W;
        const pointY = path[i].relY * H;
        // Check subsequent point validity
        if (!Number.isFinite(pointX) || !Number.isFinite(pointY)) {
          console.warn("Skipping drawing segment due to non-finite point", path[i]);
          // Stop drawing this path segment, but stroke what we have so far
          context.stroke(); 
          context.beginPath(); // Start new path if needed for next valid points
          context.moveTo(pointX, pointY); // Try moving to the next potential point
          continue; // Skip to next point in this path
        }
        context.lineTo(pointX, pointY);
      }
      context.stroke();
    });

    // --- Draw Opponents --- Convert relative positions to absolute
    context.lineWidth = 1.5;
    opponents.forEach(opponent => {
      // *** SAFETY CHECK: Ensure relative coordinates are valid numbers ***
      if (typeof opponent.relX !== 'number' || typeof opponent.relY !== 'number') {
        console.warn("Skipping opponent due to invalid relX/relY", opponent);
        return; // Skip this opponent
      }
      const absX = opponent.relX * W;
      const absY = opponent.relY * H;
      // *** SAFETY CHECK: Ensure calculated absolute coordinates are finite ***
      if (!Number.isFinite(absX) || !Number.isFinite(absY)) {
        console.warn("Skipping opponent due to non-finite calculated position", { opponent, absX, absY });
        return; // Skip this opponent
      }

      context.beginPath();
      context.arc(absX, absY, PLAYER_RADIUS * 0.9, 0, Math.PI * 2);
      context.save();
      context.shadowColor = 'rgba(0, 0, 0, 0.5)';
      context.shadowBlur = 5;
      context.shadowOffsetX = 1;
      context.shadowOffsetY = 2;
      const gradientOpp = context.createRadialGradient(absX - 3, absY - 3, 1, absX, absY, PLAYER_RADIUS * 0.9);
      gradientOpp.addColorStop(0, '#F87171');
      gradientOpp.addColorStop(1, '#DC2626');
      context.fillStyle = gradientOpp;
      context.fill();
      context.restore();
      context.strokeStyle = '#B91C1C';
      context.stroke();
    });

    // --- Draw Players --- Convert relative positions to absolute
    players.forEach(player => {
      // *** SAFETY CHECK: Ensure relative coordinates are valid numbers and exist ***
      if (typeof player.relX !== 'number' || typeof player.relY !== 'number') {
        // This check is important because relX/relY are optional on Player type
        // We only draw players that have been placed (i.e., have coordinates)
        // console.log("Skipping player without coordinates:", player.name); // Optional log
        return; // Skip this player if they don't have coords
      }
      const absX = player.relX * W;
      const absY = player.relY * H;
      // *** SAFETY CHECK: Ensure calculated absolute coordinates are finite ***
      if (!Number.isFinite(absX) || !Number.isFinite(absY)) {
        console.warn("Skipping player due to non-finite calculated position", { player, absX, absY });
        return; // Skip this player
      }

      context.beginPath();
      context.arc(absX, absY, PLAYER_RADIUS, 0, Math.PI * 2);
      context.save();
      context.shadowColor = 'rgba(0, 0, 0, 0.5)';
      context.shadowBlur = 5;
      context.shadowOffsetX = 1;
      context.shadowOffsetY = 2;
      context.fillStyle = player.color || '#7E22CE';
      context.fill();
      context.restore();
      context.strokeStyle = '#581C87';
      context.lineWidth = 1.5;
      context.stroke();

      if (showPlayerNames) {
        context.fillStyle = '#FDE047';
        context.font = '600 11px Inter, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(player.name, absX, absY);
      }
    });
  }, [players, opponents, drawings, showPlayerNames]);

  useEffect(() => {
    draw();
  }, [draw]);

  // --- Event Handlers --- 

  // Unified function to get relative position from events
  const getRelativeEventPosition = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    specificTouchId?: number | null
  ): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();

    let clientX: number;
    let clientY: number;

    if ('touches' in e) {
      let touch: React.Touch | null = null;
      if (specificTouchId !== undefined && specificTouchId !== null) {
        for (let i = 0; i < e.changedTouches.length; i++) {
          if (e.changedTouches[i].identifier === specificTouchId) {
            touch = e.changedTouches[i]; break;
          }
        }
        if (!touch) {
             for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === specificTouchId) {
                    touch = e.touches[i]; break;
                }
            }
        }
      } else {
        touch = e.touches[0];
      }
      if (!touch) return null;
      clientX = touch.clientX;
      clientY = touch.clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const absX = clientX - rect.left;
    const absY = clientY - rect.top;

    // Calculate relative position
    const relX = absX / canvas.width;
    const relY = absY / canvas.height;

    // Clamp values between 0 and 1 to handle edge cases
    return {
      relX: Math.max(0, Math.min(1, relX)),
      relY: Math.max(0, Math.min(1, relY)),
    };
  };

  // --- Hit Detection Helpers (need absolute coords) ---
  const isPointInPlayer = (absEventX: number, absEventY: number, player: Player): boolean => {
    if (player.relX === undefined || player.relY === undefined || !canvasRef.current) return false;
    const canvas = canvasRef.current;
    const absPlayerX = player.relX * canvas.width;
    const absPlayerY = player.relY * canvas.height;
    const dx = absEventX - absPlayerX;
    const dy = absEventY - absPlayerY;
    return dx * dx + dy * dy <= PLAYER_RADIUS * PLAYER_RADIUS;
  };

  const isPointInOpponent = (absEventX: number, absEventY: number, opponent: Opponent): boolean => {
    if (!canvasRef.current) return false;
    const canvas = canvasRef.current;
    const absOpponentX = opponent.relX * canvas.width;
    const absOpponentY = opponent.relY * canvas.height;
    const dx = absEventX - absOpponentX;
    const dy = absEventY - absOpponentY;
    return dx * dx + dy * dy <= (PLAYER_RADIUS * 0.9) * (PLAYER_RADIUS * 0.9);
  };

  // --- Mouse Handlers (Updated to use relative positions) ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const relPos = getRelativeEventPosition(e);
    if (!relPos) return;
    const absPos = { x: relPos.relX * canvas.width, y: relPos.relY * canvas.height }; // Get abs pos for hit detect

    // Double-click check
    if (e.detail === 2) {
      for (const player of players) {
        if (isPointInPlayer(absPos.x, absPos.y, player)) {
          onPlayerRemove(player.id);
          return;
        }
      }
      for (const opponent of opponents) {
        if (isPointInOpponent(absPos.x, absPos.y, opponent)) {
          onOpponentRemove(opponent.id);
          return;
        }
      }
    }

    // Drag check
    for (const player of players) {
      if (isPointInPlayer(absPos.x, absPos.y, player)) {
        setIsDraggingPlayer(true);
        setDraggingPlayerId(player.id);
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
        return;
      }
    }
    for (const opponent of opponents) {
        if (isPointInOpponent(absPos.x, absPos.y, opponent)) {
            setIsDraggingOpponent(true);
            setDraggingOpponentId(opponent.id);
            if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
            return;
        }
    }

    // Start drawing
    setIsDrawing(true);
    onDrawingStart(relPos); // Pass relative pos
    if (canvasRef.current) canvasRef.current.style.cursor = 'crosshair';
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const relPos = getRelativeEventPosition(e);
    if (!relPos) return;
    const absPos = { x: relPos.relX * canvas.width, y: relPos.relY * canvas.height };

    if (isDraggingPlayer && draggingPlayerId) {
      onPlayerMove(draggingPlayerId, relPos.relX, relPos.relY); // Pass relative
    } else if (isDraggingOpponent && draggingOpponentId) {
      onOpponentMove(draggingOpponentId, relPos.relX, relPos.relY); // Pass relative
    } else if (isDrawing) {
      onDrawingAddPoint(relPos); // Pass relative
    } else {
      // Hover check
      let hovering = false;
      for (const player of players) {
        if (isPointInPlayer(absPos.x, absPos.y, player)) { hovering = true; break; }
      }
      if (!hovering) {
          for (const opponent of opponents) {
              if (isPointInOpponent(absPos.x, absPos.y, opponent)) { hovering = true; break; }
          }
      }
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hovering ? 'grab' : 'default';
      }
    }
  };

  const handleMouseUp = () => {
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
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  };

  const handleMouseLeave = () => {
    handleMouseUp(); // Treat leave same as mouse up
  };

  // --- Touch Handlers (Updated to use relative positions) ---
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const touch = e.touches[0];
    const touchId = touch.identifier;
    setActiveTouchId(touchId);

    const relPos = getRelativeEventPosition(e, touchId);
    if (!relPos) {
        setActiveTouchId(null);
        return;
    }
    const absPos = { x: relPos.relX * canvas.width, y: relPos.relY * canvas.height }; // For hit detect

    if (draggingPlayerFromBarInfo) { 
        e.preventDefault(); 
        return; 
    }

    const now = Date.now();
    let tappedTargetId: string | null = null;
    let tappedTargetType: 'player' | 'opponent' | null = null;

    // Find tapped target
    for (const player of players) {
      if (isPointInPlayer(absPos.x, absPos.y, player)) {
        tappedTargetId = player.id; tappedTargetType = 'player'; break;
      }
    }
    if (!tappedTargetId) {
        for (const opponent of opponents) {
            if (isPointInOpponent(absPos.x, absPos.y, opponent)) {
                tappedTargetId = opponent.id; tappedTargetType = 'opponent'; break;
            }
        }
    }

    // Double Tap Logic (uses absPos for distance check)
    if (lastTapInfo && tappedTargetId && lastTapInfo.targetId === tappedTargetId && lastTapInfo.targetType === tappedTargetType) {
      const timeDiff = now - lastTapInfo.time;
      const distDiff = Math.sqrt(Math.pow(absPos.x - lastTapInfo.x, 2) + Math.pow(absPos.y - lastTapInfo.y, 2));
      if (timeDiff < DOUBLE_TAP_TIME_THRESHOLD && distDiff < DOUBLE_TAP_POS_THRESHOLD) {
        if (tappedTargetType === 'player') onPlayerRemove(tappedTargetId);
        else if (tappedTargetType === 'opponent') onOpponentRemove(tappedTargetId);
        setLastTapInfo(null); setActiveTouchId(null); e.preventDefault(); return;
      }
    }
    // Store tap info (using absolute position for distance check later)
    setLastTapInfo({ time: now, x: absPos.x, y: absPos.y, targetId: tappedTargetId, targetType: tappedTargetType });

    // Start Dragging or Drawing (using relative pos for callbacks)
    if (tappedTargetType === 'player' && tappedTargetId) {
        setIsDraggingPlayer(true); setDraggingPlayerId(tappedTargetId); e.preventDefault();
    } else if (tappedTargetType === 'opponent' && tappedTargetId) {
        setIsDraggingOpponent(true); setDraggingOpponentId(tappedTargetId); e.preventDefault();
    } else {
        if (!draggingPlayerFromBarInfo) {
            setIsDrawing(true); onDrawingStart(relPos); e.preventDefault();
        }
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (activeTouchId === null) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (isDraggingPlayer || isDraggingOpponent || isDrawing) {
        e.preventDefault();
    }

    const relPos = getRelativeEventPosition(e, activeTouchId);
    if (!relPos) return;

    if (isDraggingPlayer && draggingPlayerId) {
      onPlayerMove(draggingPlayerId, relPos.relX, relPos.relY); // Pass relative
    } else if (isDraggingOpponent && draggingOpponentId) {
      onOpponentMove(draggingOpponentId, relPos.relX, relPos.relY); // Pass relative
    } else if (isDrawing) {
      onDrawingAddPoint(relPos); // Pass relative
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (draggingPlayerFromBarInfo && activeTouchId !== null) {
        let relevantTouch: React.Touch | null = null;
        for (let i = 0; i < e.changedTouches.length; i++) {
            if (e.changedTouches[i].identifier === activeTouchId) { relevantTouch = e.changedTouches[i]; break; }
        }
        if (relevantTouch) {
            const relPos = getRelativeEventPosition(e, activeTouchId); // Get final relative position
            const canvas = canvasRef.current;
            let droppedOnCanvas = false;
            if (relPos && canvas) {
                const rect = canvas.getBoundingClientRect();
                if ( relevantTouch.clientX >= rect.left && relevantTouch.clientX <= rect.right &&
                     relevantTouch.clientY >= rect.top && relevantTouch.clientY <= rect.bottom ) 
                {
                     droppedOnCanvas = true;
                }
            }
            if (e.type === 'touchend' && droppedOnCanvas && relPos) {
                onPlayerDropViaTouch(relPos.relX, relPos.relY); // Pass relative coords
            } else {
                onPlayerDragCancelViaTouch();
            }
            setActiveTouchId(null); setLastTapInfo(null); 
            return; 
        }
    }

    // Original logic for ending on-canvas actions
    if (activeTouchId === null) return;
    let touchEnded = false;
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === activeTouchId) { touchEnded = true; break; }
    }
    if (!touchEnded) return;

    if (isDraggingPlayer) { onPlayerMoveEnd(); setIsDraggingPlayer(false); setDraggingPlayerId(null); }
    else if (isDraggingOpponent && draggingOpponentId) { onOpponentMoveEnd(draggingOpponentId); setIsDraggingOpponent(false); setDraggingOpponentId(null); }
    else if (isDrawing) { onDrawingEnd(); setIsDrawing(false); }

    setActiveTouchId(null);
  };
  const handleTouchCancel = handleTouchEnd; // Treat cancel same as end

  // --- HTML Drag and Drop Handlers (Updated for relative coords) ---
  const handleDragOver = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json'); // Use json MIME type
    if (!data) return;
    let droppedPlayerId: string;
    try {
        const parsedData = JSON.parse(data);
        droppedPlayerId = parsedData.id;
        if (!droppedPlayerId) throw new Error("ID missing");
    } catch (error) { console.error("Drop data error:", error); return; }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const absX = e.clientX - rect.left;
    const absY = e.clientY - rect.top;
    const relX = Math.max(0, Math.min(1, absX / canvas.width));
    const relY = Math.max(0, Math.min(1, absY / canvas.height));

    onPlayerDrop(droppedPlayerId, relX, relY); // Pass relative coords
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
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
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
    </div>
  );
};

export default SoccerField; 