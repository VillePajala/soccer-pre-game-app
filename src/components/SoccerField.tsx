'use client'; // Need this for client-side interactions like canvas

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Player } from '@/types'; // Import Player from types
import { Point, Opponent, TacticalDisc } from '@/app/page'; // Import Point and Opponent from page

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
  // ADD prop for timer display
  timeElapsedInSeconds: number;
  isTacticsBoardView: boolean;
  tacticalDiscs: TacticalDisc[];
  onTacticalDiscMove: (discId: string, relX: number, relY: number) => void;
  onTacticalDiscRemove: (discId: string) => void;
  onToggleTacticalDiscType: (discId: string) => void;
}

// Constants
const PLAYER_RADIUS = 20;
const DOUBLE_TAP_TIME_THRESHOLD = 300; // ms
const DOUBLE_TAP_POS_THRESHOLD = 15; // pixels

// Helper function to format time (defined locally for now)
const formatTime = (totalSeconds: number): string => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

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
  timeElapsedInSeconds,
  isTacticsBoardView,
  tacticalDiscs,
  onTacticalDiscMove,
  onTacticalDiscRemove,
  onToggleTacticalDiscType
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDraggingPlayer, setIsDraggingPlayer] = useState<boolean>(false);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [isDraggingOpponent, setIsDraggingOpponent] = useState<boolean>(false);
  const [draggingOpponentId, setDraggingOpponentId] = useState<string | null>(null);
  const [isDraggingTacticalDisc, setIsDraggingTacticalDisc] = useState<boolean>(false);
  const [draggingTacticalDiscId, setDraggingTacticalDiscId] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [activeTouchId, setActiveTouchId] = useState<number | null>(null);
  const [lastTapInfo, setLastTapInfo] = useState<{ time: number; x: number; y: number; targetId: string | null; targetType: 'player' | 'opponent' | 'tactical' | null } | null>(null);

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
    context.fillStyle = isTacticsBoardView ? '#04A777' : '#059669'; 
    context.fillRect(0, 0, W, H);

    // --- Draw Tactical Mode Border ---
    if (isTacticsBoardView) {
      context.strokeStyle = '#F59E0B'; // A vibrant amber/orange
      context.lineWidth = 4;
      context.strokeRect(0, 0, W, H);
    }

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
    if (!isTacticsBoardView) {
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
    }

    // --- Draw Tactical Discs ---
    if (isTacticsBoardView) {
      tacticalDiscs.forEach(disc => {
        const absX = disc.relX * W;
        const absY = disc.relY * H;
        if (!Number.isFinite(absX) || !Number.isFinite(absY)) {
          console.warn("Skipping tactical disc due to non-finite calculated position", { disc, absX, absY });
          return;
        }

        context.beginPath();
        context.arc(absX, absY, PLAYER_RADIUS, 0, Math.PI * 2);
        context.save();
        context.shadowColor = 'rgba(0, 0, 0, 0.5)';
        context.shadowBlur = 5;
        context.shadowOffsetX = 1;
        context.shadowOffsetY = 2;

        if (disc.type === 'home') {
          context.fillStyle = '#7E22CE'; // Purple
          context.strokeStyle = '#581C87';
        } else if (disc.type === 'opponent') {
          context.fillStyle = '#DC2626'; // Red
          context.strokeStyle = '#B91C1C';
        } else if (disc.type === 'goalie') {
          context.fillStyle = '#F97316'; // Orange
          context.strokeStyle = '#D97706';
        }

        context.fill();
        context.restore();
        context.lineWidth = 1.5;
        context.stroke();
      });
    }

    // --- Draw Players ---
    const playerRadius = PLAYER_RADIUS;
    if (!isTacticsBoardView) {
    players.forEach(player => {
      if (typeof player.relX !== 'number' || typeof player.relY !== 'number') {
        return;
      }
      const absX = player.relX * W;
      const absY = player.relY * H;
      if (!Number.isFinite(absX) || !Number.isFinite(absY)) {
        console.warn("Skipping player due to non-finite calculated position", { player, absX, absY });
        return;
      }

      // Draw the player disk
      context.beginPath();
      context.arc(absX, absY, playerRadius, 0, Math.PI * 2);
      context.save();
      context.shadowColor = 'rgba(0, 0, 0, 0.5)';
      context.shadowBlur = 5;
      context.shadowOffsetX = 1;
      context.shadowOffsetY = 2;
      // Set fill color based on goalie status
      context.fillStyle = player.isGoalie ? '#F97316' : (player.color || '#7E22CE'); // Use orange for goalie
      context.fill();
      context.restore();

      // Draw default border (thin purple)
      context.strokeStyle = '#581C87'; // Default border color (purple-900)
      context.lineWidth = 1.5; // Default border width
      context.stroke(); 

      // Draw player name
      if (showPlayerNames) {
        // Always use default text color (yellow on field)
        context.fillStyle = '#FDE047';
        context.font = '600 11px Inter, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        // Use nickname if available, otherwise fall back to full name
        context.fillText(player.nickname || player.name, absX, absY);
      }
    });
    }

    // --- Restore context --- 
    context.restore();
  }, [players, opponents, drawings, showPlayerNames, isTacticsBoardView, tacticalDiscs]); // Remove gameEvents dependency

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

  // --- Event Position Helper ---
  // Function to get the relative position of an event within the canvas
  const getRelativeEventPosition = (
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement> | TouchEvent,
    specificTouchId?: number | null
  ): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) { // Handle both React and native TouchEvents
        let touch: Touch | React.Touch | undefined;
        // Access changedTouches directly - it exists on both types
        const touches = e.changedTouches;
        if (specificTouchId !== undefined && specificTouchId !== null) {
            // Find the specific touch by identifier
            touch = Array.from(touches).find(t => t.identifier === specificTouchId);
        } else if (touches.length > 0) {
             // Fallback to the first changed touch if no specific ID
             touch = touches[0];
        }

        if (!touch) return null; 
        clientX = touch.clientX;
        clientY = touch.clientY;
    } else { // It's a MouseEvent
      clientX = e.clientX;
      clientY = e.clientY;
    }

    // Check for invalid dimensions before calculating relative position
    if (rect.width <= 0 || rect.height <= 0) {
        console.warn("Canvas has invalid dimensions, cannot calculate relative position.");
        return null;
    }

    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;
    
    // Clamp values between 0 and 1 (optional, but good practice)
    const clampedX = Math.max(0, Math.min(1, relX));
    const clampedY = Math.max(0, Math.min(1, relY));

    return { relX: clampedX, relY: clampedY };
  };

  // Helper to check if a point (clientX, clientY) is within a player disk - Corrected Canvas Logic
  const isPointInPlayer = useCallback((eventClientX: number, eventClientY: number, player: Player): boolean => {
    const canvas = canvasRef.current;
    if (!canvas || player.relX === undefined || player.relY === undefined) return false;
    const rect = canvas.getBoundingClientRect();
    // Calculate absolute player center based on canvas size and relative coordinates
    const absPlayerX = player.relX * rect.width;
    const absPlayerY = player.relY * rect.height;
    // Calculate absolute event position relative to the canvas origin
    const absEventX = eventClientX - rect.left;
    const absEventY = eventClientY - rect.top;
    // Calculate distance squared
    const dx = absEventX - absPlayerX;
    const dy = absEventY - absPlayerY;
    // Compare distance squared to radius squared
    return dx * dx + dy * dy <= PLAYER_RADIUS * PLAYER_RADIUS;
  }, []); // No dependencies needed as PLAYER_RADIUS is constant and rect is read inside

  // Helper to check if a point (clientX, clientY) is within an opponent disk - Corrected Canvas Logic
  const isPointInOpponent = useCallback((eventClientX: number, eventClientY: number, opponent: Opponent): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    // Calculate absolute opponent center
    const absOpponentX = opponent.relX * rect.width;
    const absOpponentY = opponent.relY * rect.height;
    // Calculate absolute event position relative to canvas
    const absEventX = eventClientX - rect.left;
    const absEventY = eventClientY - rect.top;
    // Calculate distance squared
    const dx = absEventX - absOpponentX;
    const dy = absEventY - absOpponentY;
    // Compare distance squared to radius squared (opponent radius is slightly smaller)
    const opponentRadiusSq = (PLAYER_RADIUS * 0.9) * (PLAYER_RADIUS * 0.9);
    return dx * dx + dy * dy <= opponentRadiusSq;
  }, []); // No dependencies needed

  const isPointInTacticalDisc = useCallback((eventClientX: number, eventClientY: number, disc: TacticalDisc): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const absDiscX = disc.relX * rect.width;
    const absDiscY = disc.relY * rect.height;
    const absEventX = eventClientX - rect.left;
    const absEventY = eventClientY - rect.top;
    const dx = absEventX - absDiscX;
    const dy = absEventY - absDiscY;
    return dx * dx + dy * dy <= PLAYER_RADIUS * PLAYER_RADIUS;
  }, []);

  // --- Mouse/Touch Handlers (Logic largely the same, but use CSS size for abs calcs) ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const relPos = getRelativeEventPosition(e);
    if (!relPos) return;

    if (isTacticsBoardView) {
      if (e.detail === 2) {
        for (const disc of tacticalDiscs) {
          if (isPointInTacticalDisc(e.clientX, e.clientY, disc)) {
            if (disc.type === 'home') {
              onToggleTacticalDiscType(disc.id);
            } else {
              onTacticalDiscRemove(disc.id);
            }
            return;
          }
        }
      }
      for (const disc of tacticalDiscs) {
        if (isPointInTacticalDisc(e.clientX, e.clientY, disc)) {
          setIsDraggingTacticalDisc(true);
          setDraggingTacticalDiscId(disc.id);
          if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
          return;
        }
      }
    } else {
    // *** Check if placing a tapped player ***
    if (draggingPlayerFromBarInfo) {
      console.log("Field MouseDown: Placing player from bar tap:", draggingPlayerFromBarInfo.id);
      onPlayerDrop(draggingPlayerFromBarInfo.id, relPos.relX, relPos.relY);
      // IMPORTANT: Clear the selection state after placing
      // This needs to happen in the parent (page.tsx), 
      // so we might need a new callback prop like `onPlayerPlaceFromBar()` 
      // OR rely on handleDropOnField in page.tsx to clear it.
        // For now, let's assume handleDropOnField in page.tsx clears draggingPlayerFromBarInfo.
      // For now, let's assume handleDropOnField in page.tsx clears draggingPlayerFromBarInfo.
      return; // Don't proceed with other actions
    }

    // Double-click check
    if (e.detail === 2) {
      for (const player of players) {
        // Pass event clientX/Y and the player object
        if (isPointInPlayer(e.clientX, e.clientY, player)) {
          onPlayerRemove(player.id);
          return;
        }
      }
      for (const opponent of opponents) {
        // Pass event clientX/Y and the opponent object
        if (isPointInOpponent(e.clientX, e.clientY, opponent)) {
          onOpponentRemove(opponent.id);
          return;
        }
      }
    }

    // Drag check
    for (const player of players) {
      // Pass event clientX/Y and the player object
      if (isPointInPlayer(e.clientX, e.clientY, player)) {
        setIsDraggingPlayer(true);
        setDraggingPlayerId(player.id);
        if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
        return;
      }
    }
    for (const opponent of opponents) {
        // Pass event clientX/Y and the opponent object
        if (isPointInOpponent(e.clientX, e.clientY, opponent)) {
            setIsDraggingOpponent(true);
            setDraggingOpponentId(opponent.id);
            if (canvasRef.current) canvasRef.current.style.cursor = 'grabbing';
            return;
          }
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

    if (isDraggingTacticalDisc && draggingTacticalDiscId) {
      onTacticalDiscMove(draggingTacticalDiscId, relPos.relX, relPos.relY);
    } else if (isDraggingPlayer && draggingPlayerId) {
      onPlayerMove(draggingPlayerId, relPos.relX, relPos.relY); // Pass relative
    } else if (isDraggingOpponent && draggingOpponentId) {
      onOpponentMove(draggingOpponentId, relPos.relX, relPos.relY); // Pass relative
    } else if (isDrawing) {
      onDrawingAddPoint(relPos); // Pass relative
    } else {
      // Hover check
      let hovering = false;
      if (isTacticsBoardView) {
        for (const disc of tacticalDiscs) {
          if (isPointInTacticalDisc(e.clientX, e.clientY, disc)) { hovering = true; break; }
        }
      } else {
      for (const player of players) {
        // Pass event clientX/Y and the player object
        if (isPointInPlayer(e.clientX, e.clientY, player)) { hovering = true; break; }
      }
      if (!hovering) {
          for (const opponent of opponents) {
              // Pass event clientX/Y and the opponent object
              if (isPointInOpponent(e.clientX, e.clientY, opponent)) { hovering = true; break; }
            }
          }
      }
      if (canvasRef.current) {
        canvasRef.current.style.cursor = hovering ? 'grab' : 'default';
      }
    }
  };

  const handleMouseUp = () => {
    if (isDraggingTacticalDisc) {
      setIsDraggingTacticalDisc(false);
      setDraggingTacticalDiscId(null);
    } else if (isDraggingPlayer) {
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

  // --- Touch Handlers ---
  const handleTouchStart = useCallback((e: TouchEvent) => { // Changed event type, wrapped in useCallback
    if (e.touches.length > 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchId = touch.identifier;
    setActiveTouchId(touchId);
    const relPos = getRelativeEventPosition(e, touchId);
    if (!relPos) { setActiveTouchId(null); return; }

    if (isTacticsBoardView) {
      e.preventDefault();
      // Double Tap Logic for tactical discs
      const now = Date.now();
      let tappedTargetId: string | null = null;
      for (const disc of tacticalDiscs) {
        if (isPointInTacticalDisc(touch.clientX, touch.clientY, disc)) {
          tappedTargetId = disc.id;
          break;
        }
      }

      if (lastTapInfo && tappedTargetId && lastTapInfo.targetId === tappedTargetId && lastTapInfo.targetType === 'tactical') {
        const timeDiff = now - lastTapInfo.time;
        const distDiff = Math.sqrt(Math.pow(touch.clientX - rect.left - lastTapInfo.x, 2) + Math.pow(touch.clientY - rect.top - lastTapInfo.y, 2));
        if (timeDiff < DOUBLE_TAP_TIME_THRESHOLD && distDiff < DOUBLE_TAP_POS_THRESHOLD) {
          const disc = tacticalDiscs.find(d => d.id === tappedTargetId);
          if (disc) {
            if (disc.type === 'home') {
              onToggleTacticalDiscType(disc.id);
            } else {
              onTacticalDiscRemove(disc.id);
            }
          }
          setLastTapInfo(null);
          setActiveTouchId(null);
          return;
        }
      }
      setLastTapInfo({ time: now, x: touch.clientX - rect.left, y: touch.clientY - rect.top, targetId: tappedTargetId, targetType: 'tactical' });
      
      // Dragging tactical disc
      if (tappedTargetId) {
        setIsDraggingTacticalDisc(true);
        setDraggingTacticalDiscId(tappedTargetId);
      } else {
        setIsDrawing(true);
        onDrawingStart(relPos);
      }
      return;
    }

    // *** Check if placing a tapped player ***
    if (draggingPlayerFromBarInfo) {
        console.log("Field TouchStart: Placing player from bar tap:", draggingPlayerFromBarInfo.id);
        // Don't preventDefault here for placing, allow potential scroll if placement fails
        onPlayerDropViaTouch(relPos.relX, relPos.relY);
        setActiveTouchId(null); 
        return; 
    }

    const now = Date.now();
    let tappedTargetId: string | null = null;
    let tappedTargetType: 'player' | 'opponent' | 'tactical' | null = null;

    if (isTacticsBoardView) {
      for (const disc of tacticalDiscs) {
        if (isPointInTacticalDisc(touch.clientX, touch.clientY, disc)) {
          tappedTargetId = disc.id;
          tappedTargetType = 'tactical';
          break;
        }
      }
    } else {
    // Find tapped target
    for (const player of players) {
      // Pass event clientX/Y and the player object
      if (isPointInPlayer(touch.clientX, touch.clientY, player)) {
        tappedTargetId = player.id; tappedTargetType = 'player'; break;
      }
    }
    if (!tappedTargetId) {
        for (const opponent of opponents) {
            // Pass event clientX/Y and the opponent object
            if (isPointInOpponent(touch.clientX, touch.clientY, opponent)) {
                tappedTargetId = opponent.id; tappedTargetType = 'opponent'; break;
              }
            }
        }
    }

    // Double Tap Logic
    // Need absolute event position relative to canvas for distance check
    const absEventX = touch.clientX - rect.left;
    const absEventY = touch.clientY - rect.top;
    if (lastTapInfo && tappedTargetId && lastTapInfo.targetId === tappedTargetId && lastTapInfo.targetType === tappedTargetType) {
      const timeDiff = now - lastTapInfo.time;
      // Use absolute canvas coords for distance check
      const distDiff = Math.sqrt(Math.pow(absEventX - lastTapInfo.x, 2) + Math.pow(absEventY - lastTapInfo.y, 2)); 
      if (timeDiff < DOUBLE_TAP_TIME_THRESHOLD && distDiff < DOUBLE_TAP_POS_THRESHOLD) {
        if (tappedTargetType === 'player') {
          onPlayerRemove(tappedTargetId);
        } else if (tappedTargetType === 'opponent') {
          onOpponentRemove(tappedTargetId);
        } else if (tappedTargetType === 'tactical') {
          const disc = tacticalDiscs.find(d => d.id === tappedTargetId);
          if (disc) {
            if (disc.type === 'home') {
              onToggleTacticalDiscType(disc.id);
            } else {
              onTacticalDiscRemove(disc.id);
            }
          }
        }
        setLastTapInfo(null); setActiveTouchId(null); e.preventDefault(); return;
      }
    }
    // Store tap info using absolute canvas coords
    setLastTapInfo({ time: now, x: absEventX, y: absEventY, targetId: tappedTargetId, targetType: tappedTargetType });

    // Start Dragging or Drawing
    if (tappedTargetType === 'player' && tappedTargetId) {
        setIsDraggingPlayer(true); setDraggingPlayerId(tappedTargetId); 
        e.preventDefault(); // Prevent scroll ONLY when starting player drag
    } else if (tappedTargetType === 'opponent' && tappedTargetId) {
        setIsDraggingOpponent(true); setDraggingOpponentId(tappedTargetId); 
        e.preventDefault(); // Prevent scroll ONLY when starting opponent drag
    } else if (tappedTargetType === 'tactical' && tappedTargetId) {
        setIsDraggingTacticalDisc(true);
        setDraggingTacticalDiscId(tappedTargetId);
        e.preventDefault();
    } else {
        if (!draggingPlayerFromBarInfo) { // Ensure not placing player
            setIsDrawing(true); onDrawingStart(relPos); 
            e.preventDefault(); // Prevent scroll ONLY when starting drawing
        }
    }
  }, [ // Added dependencies for useCallback
    draggingPlayerFromBarInfo, isPointInPlayer, isPointInOpponent,
    lastTapInfo, onDrawingStart, onOpponentRemove, onPlayerDropViaTouch, 
    onPlayerRemove, players, opponents, isTacticsBoardView, tacticalDiscs,
    onTacticalDiscMove, onTacticalDiscRemove, onToggleTacticalDiscType, isPointInTacticalDisc
  ]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (activeTouchId === null) return; 

    const currentTouch = Array.from(e.changedTouches).find(t => t.identifier === activeTouchId);
    if (!currentTouch) return; 

    // Prevent default only needed if dragging/drawing
    if (isDraggingPlayer || isDraggingOpponent || isDrawing || isDraggingTacticalDisc) {
      // We know this listener is non-passive, so preventDefault is safe
       e.preventDefault(); 
    }
    
    const pos = getRelativeEventPosition(e, activeTouchId); // Pass native event
    if (!pos) return;

    if (isDraggingTacticalDisc && draggingTacticalDiscId) {
      onTacticalDiscMove(draggingTacticalDiscId, pos.relX, pos.relY);
    } else if (isDraggingPlayer && draggingPlayerId) {
      onPlayerMove(draggingPlayerId, pos.relX, pos.relY);
    } else if (isDraggingOpponent && draggingOpponentId) {
      onOpponentMove(draggingOpponentId, pos.relX, pos.relY);
    } else if (isDrawing) {
      onDrawingAddPoint(pos);
    }
  }, [activeTouchId, isDrawing, isDraggingPlayer, isDraggingOpponent, draggingPlayerId, draggingOpponentId, onPlayerMove, onOpponentMove, onDrawingAddPoint, isDraggingTacticalDisc, draggingTacticalDiscId, onTacticalDiscMove]); // Added dependencies

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

    if (isDraggingTacticalDisc) {
      setIsDraggingTacticalDisc(false);
      setDraggingTacticalDiscId(null);
    } else if (isDraggingPlayer) { onPlayerMoveEnd(); setIsDraggingPlayer(false); setDraggingPlayerId(null); }
    else if (isDraggingOpponent && draggingOpponentId) { onOpponentMoveEnd(draggingOpponentId); setIsDraggingOpponent(false); setDraggingOpponentId(null); }
    else if (isDrawing) { onDrawingEnd(); setIsDrawing(false); }

    setActiveTouchId(null);
  };

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
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)); // Use rect.width
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)); // Use rect.height

    onPlayerDrop(droppedPlayerId, relX, relY); // Pass relative coords
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  };

  // --- Effect for Manual Event Listeners --- 
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Add listeners manually with passive: false
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });

    // Cleanup function to remove the listeners
    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
    };
  }, [handleTouchStart, handleTouchMove]); // Re-run if the handler function instances change

  // --- Render Canvas ---
  return (
    <div className={`w-full h-full relative bg-green-700 ${isTacticsBoardView ? 'glow-orange' : ''}`}>
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full touch-none" // Added touch-none
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchEnd={handleTouchEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      />
      {/* Optional: Render player names/numbers as separate HTML elements over the canvas? */}
      
      {/* <<< Change Timer Position to Bottom-Right >>> */}
      <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs font-mono px-2 py-1 rounded pointer-events-none select-none z-10">
        {formatTime(timeElapsedInSeconds)}
      </div>
    </div>
  );
};

export default SoccerField; 