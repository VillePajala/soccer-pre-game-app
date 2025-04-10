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

    // --- High-DPI Scaling --- 
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect(); 
    const cssWidth = rect.width;
    const cssHeight = rect.height;

    // Set the canvas buffer size to match the physical pixels
    if (canvas.width !== cssWidth * dpr || canvas.height !== cssHeight * dpr) {
      canvas.width = cssWidth * dpr;
      canvas.height = cssHeight * dpr;
    }

    // Reset transform to default state before applying new scaling
    context.resetTransform();
    // Scale the context to draw in CSS pixels
    context.scale(dpr, dpr);
    // --- End High-DPI Scaling ---

    // Now use cssWidth and cssHeight for drawing calculations (W/H equivalent)
    const W = cssWidth;
    const H = cssHeight;

    // *** SAFETY CHECK: Ensure calculated CSS dimensions are valid ***
    if (W <= 0 || H <= 0 || !Number.isFinite(W) || !Number.isFinite(H)) {
      console.warn("Canvas dimensions are invalid, skipping draw:", { W, H });
      return; 
    }

    // --- Clear and Draw Background/Field Lines --- 
    context.fillStyle = '#059669'; 
    context.fillRect(0, 0, W, H);
    context.strokeStyle = 'rgba(255, 255, 255, 0.6)';
    context.lineWidth = 2; // No DPR scaling needed here
    const lineMargin = 5; // No DPR scaling
    const centerRadius = Math.min(W, H) * 0.08; // Use W/H (CSS)
    const penaltyBoxWidth = W * 0.6; // Use W (CSS)
    const penaltyBoxHeight = H * 0.18; // Use H (CSS)
    const goalBoxWidth = W * 0.3; // Use W
    const goalBoxHeight = H * 0.07; // Use H
    const penaltySpotDist = H * 0.12; // Use H
    const cornerRadius = Math.min(W, H) * 0.02; // Use W/H

    // Outer boundary (using CSS W/H and non-scaled margin)
    context.beginPath();
    context.strokeRect(lineMargin, lineMargin, W - 2 * lineMargin, H - 2 * lineMargin);

    // Halfway line
    context.beginPath();
    context.moveTo(lineMargin, H / 2);
    context.lineTo(W - lineMargin, H / 2);
    context.stroke();

    // Center circle
    context.beginPath();
    context.arc(W / 2, H / 2, centerRadius, 0, Math.PI * 2);
    context.stroke();

    // Top Penalty Area & Arc
    context.beginPath();
    const topPenaltyX = (W - penaltyBoxWidth) / 2;
    context.rect(topPenaltyX, lineMargin, penaltyBoxWidth, penaltyBoxHeight);
    context.stroke();
    context.beginPath();
    context.arc(W / 2, lineMargin + penaltyBoxHeight, centerRadius * 0.8, 0, Math.PI, false);
    context.stroke();

    // Top Goal Area
    context.beginPath();
    const topGoalX = (W - goalBoxWidth) / 2;
    context.strokeRect(topGoalX, lineMargin, goalBoxWidth, goalBoxHeight);
    context.stroke();

    // Bottom Penalty Area & Arc
    context.beginPath();
    const bottomPenaltyY = H - lineMargin - penaltyBoxHeight;
    context.rect(topPenaltyX, bottomPenaltyY, penaltyBoxWidth, penaltyBoxHeight);
    context.stroke();
    context.beginPath();
    context.arc(W / 2, H - lineMargin - penaltyBoxHeight, centerRadius * 0.8, Math.PI, 0, false);
    context.stroke();

    // Bottom Goal Area
    context.beginPath();
    const bottomGoalY = H - lineMargin - goalBoxHeight;
    context.strokeRect(topGoalX, bottomGoalY, goalBoxWidth, goalBoxHeight);
    context.stroke();

    // Corner Arcs
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

    // Draw filled spots
    context.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const spotRadius = 3; // No DPR scaling
    // Center Spot
    context.beginPath();
    context.arc(W / 2, H / 2, spotRadius, 0, Math.PI * 2);
    context.fill();
    // Top Penalty Spot
    context.beginPath();
    context.arc(W / 2, lineMargin + penaltySpotDist, spotRadius, 0, Math.PI * 2);
    context.fill();
    // Bottom Penalty Spot
    context.beginPath();
    context.arc(W / 2, H - lineMargin - penaltySpotDist, spotRadius, 0, Math.PI * 2);
    context.fill();
    // --- End Field Lines ---

    // --- Draw User Drawings --- (lineWidth only change needed)
    context.strokeStyle = '#FB923C';
    context.lineWidth = 3; // No DPR scaling
    context.lineCap = 'round';
    context.lineJoin = 'round';
    drawings.forEach(path => {
      if (path.length < 2) return;
      
      // Calculate absolute positions using CSS dimensions (W/H)
      const startX = path[0].relX * W;
      const startY = path[0].relY * H;
      if (!Number.isFinite(startX) || !Number.isFinite(startY)) {
        console.warn("Skipping drawing path due to non-finite start point", path[0]);
        return; 
      }

      context.beginPath();
      context.moveTo(startX, startY);
      
      for (let i = 1; i < path.length; i++) {
        const pointX = path[i].relX * W;
        const pointY = path[i].relY * H;
        if (!Number.isFinite(pointX) || !Number.isFinite(pointY)) {
          console.warn("Skipping drawing segment due to non-finite point", path[i]);
          context.stroke(); 
          context.beginPath();
          context.moveTo(pointX, pointY);
          continue;
        }
        context.lineTo(pointX, pointY);
      }
      context.stroke();
    });

    // --- Draw Opponents --- (No manual scaling needed)
    context.lineWidth = 1.5;
    const opponentRadius = PLAYER_RADIUS * 0.9; // Use original radius
    opponents.forEach(opponent => {
      if (typeof opponent.relX !== 'number' || typeof opponent.relY !== 'number') {
        console.warn("Skipping opponent due to invalid relX/relY", opponent);
        return;
      }
      // Calculate absolute positions using CSS dimensions (W/H)
      const absX = opponent.relX * W;
      const absY = opponent.relY * H;
      if (!Number.isFinite(absX) || !Number.isFinite(absY)) {
        console.warn("Skipping opponent due to non-finite calculated position", { opponent, absX, absY });
        return;
      }

      context.beginPath();
      context.arc(absX, absY, opponentRadius, 0, Math.PI * 2);
      context.save();
      context.shadowColor = 'rgba(0, 0, 0, 0.5)';
      context.shadowBlur = 5; // Original value
      context.shadowOffsetX = 1; // Original value
      context.shadowOffsetY = 2; // Original value
      // Gradient uses original radius
      const gradientOpp = context.createRadialGradient(absX - 3, absY - 3, 1, absX, absY, opponentRadius);
      gradientOpp.addColorStop(0, '#F87171');
      gradientOpp.addColorStop(1, '#DC2626');
      context.fillStyle = gradientOpp;
      context.fill();
      context.restore();
      context.strokeStyle = '#B91C1C';
      context.stroke();
    });

    // --- Draw Players --- (No manual scaling needed)
    const playerRadius = PLAYER_RADIUS; // Use original radius
    players.forEach(player => {
      if (typeof player.relX !== 'number' || typeof player.relY !== 'number') {
        return;
      }
      // Calculate absolute positions using CSS dimensions (W/H)
      const absX = player.relX * W;
      const absY = player.relY * H;
      if (!Number.isFinite(absX) || !Number.isFinite(absY)) {
        console.warn("Skipping player due to non-finite calculated position", { player, absX, absY });
        return;
      }

      context.beginPath();
      context.arc(absX, absY, playerRadius, 0, Math.PI * 2);
      context.save();
      context.shadowColor = 'rgba(0, 0, 0, 0.5)';
      context.shadowBlur = 5; // Original value
      context.shadowOffsetX = 1; // Original value
      context.shadowOffsetY = 2; // Original value
      context.fillStyle = player.color || '#7E22CE';
      context.fill();
      context.restore();
      context.strokeStyle = '#581C87';
      context.lineWidth = 1.5;
      context.stroke();

      if (showPlayerNames) {
        context.fillStyle = '#FDE047';
        context.font = '600 11px Inter, sans-serif'; // Original font size
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(player.name, absX, absY);
      }
    });
  }, [players, opponents, drawings, showPlayerNames]);

  // Add the new ResizeObserver effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const parent = canvas?.parentElement; // Observe the parent which dictates size
    if (!parent || typeof ResizeObserver === 'undefined') {
        // Fallback or handle browsers without ResizeObserver
        console.warn('ResizeObserver not supported or parent not found');
        // Consider adding back the window resize listener as a fallback?
        draw(); // Initial draw attempt
        return; 
    }

    const resizeObserver = new ResizeObserver(entries => {
        // We are only observing one element, so entries[0] is fine
        if (entries[0]) {
            // Call draw whenever the observed element size changes
            draw();
        }
    });

    // Start observing the parent element
    resizeObserver.observe(parent);

    // Cleanup function to disconnect the observer when the component unmounts
    return () => {
        resizeObserver.unobserve(parent);
        resizeObserver.disconnect();
    };
  }, [draw]); // Dependency on `draw` ensures the observer always uses the latest version

  // --- Event Handlers --- 

  // getRelativeEventPosition needs to calculate relative based on CSS size
  const getRelativeEventPosition = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>,
    specificTouchId?: number | null
  ): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect(); // Get dimensions in CSS pixels

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

    // Calculate relative position based on CSS dimensions (rect.width/height)
    const relX = absX / rect.width;
    const relY = absY / rect.height;

    return {
      relX: Math.max(0, Math.min(1, relX)),
      relY: Math.max(0, Math.min(1, relY)),
    };
  };

  // Hit Detection Helpers need to calculate absolute positions based on CSS size
  const isPointInPlayer = (absEventX: number, absEventY: number, player: Player): boolean => {
    if (player.relX === undefined || player.relY === undefined || !canvasRef.current) return false;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect(); // Use CSS dimensions
    const absPlayerX = player.relX * rect.width;
    const absPlayerY = player.relY * rect.height;
    const dx = absEventX - absPlayerX;
    const dy = absEventY - absPlayerY;
    return dx * dx + dy * dy <= PLAYER_RADIUS * PLAYER_RADIUS;
  };

  const isPointInOpponent = (absEventX: number, absEventY: number, opponent: Opponent): boolean => {
    if (!canvasRef.current) return false;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect(); // Use CSS dimensions
    const absOpponentX = opponent.relX * rect.width;
    const absOpponentY = opponent.relY * rect.height;
    const dx = absEventX - absOpponentX;
    const dy = absEventY - absOpponentY;
    return dx * dx + dy * dy <= (PLAYER_RADIUS * 0.9) * (PLAYER_RADIUS * 0.9);
  };

  // --- Mouse/Touch Handlers (Logic largely the same, but use CSS size for abs calcs) ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect(); // Need CSS size

    const relPos = getRelativeEventPosition(e);
    if (!relPos) return;
    const absPos = { x: relPos.relX * rect.width, y: relPos.relY * rect.height }; // Abs pos based on CSS size

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
    const rect = canvas.getBoundingClientRect(); // Need CSS size

    const relPos = getRelativeEventPosition(e);
    if (!relPos) return;
    const absPos = { x: relPos.relX * rect.width, y: relPos.relY * rect.height }; // Abs pos based on CSS size

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

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length > 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect(); // Need CSS size

    const touch = e.touches[0];
    const touchId = touch.identifier;
    setActiveTouchId(touchId);

    const relPos = getRelativeEventPosition(e, touchId);
    if (!relPos) { setActiveTouchId(null); return; }
    const absPos = { x: relPos.relX * rect.width, y: relPos.relY * rect.height }; // Abs pos based on CSS size

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
                const rect = canvas.getBoundingClientRect(); // Use CSS rect
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

  // --- HTML Drag and Drop Handlers (Needs update for CSS size) ---
  const handleDragOver = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json'); 
    if (!data) return;
    let droppedPlayerId: string;
    try {
        const parsedData = JSON.parse(data);
        droppedPlayerId = parsedData.id;
        if (!droppedPlayerId) throw new Error("ID missing");
    } catch (error) { console.error("Drop data error:", error); return; }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect(); // Use CSS rect
    const absX = e.clientX - rect.left;
    const absY = e.clientY - rect.top;
    const relX = Math.max(0, Math.min(1, absX / rect.width)); // Use rect.width
    const relY = Math.max(0, Math.min(1, absY / rect.height)); // Use rect.height

    onPlayerDrop(droppedPlayerId, relX, relY); // Pass relative coords
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  };

  return (
    <div className="relative w-full h-full touch-none">
      <canvas 
        ref={canvasRef}
        className="w-full h-full block touch-none"
        // Set CSS size via className, buffer size is set in draw()
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