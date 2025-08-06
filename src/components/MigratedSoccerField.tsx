'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  useGameStore, 
  useGameSession, 
  useGameTimer,
  useFieldState 
} from '@/stores/gameStore';
import { useGameView } from '@/stores/uiStore';
import { Player, Point, Opponent } from '@/types';
// import tinycolor from 'tinycolor2'; // TODO: Remove if not needed
import logger from '@/utils/logger';
import type { SoccerFieldProps } from './SoccerField';

/**
 * Migrated SoccerField component that uses Zustand stores
 * Maintains same interface as legacy component but with centralized state
 */
export const MigratedSoccerField: React.FC<SoccerFieldProps> = ({
  // Props that will be overridden by store values
  players: propPlayers,
  opponents: propOpponents,
  drawings: propDrawings,
  showPlayerNames: propShowPlayerNames,
  timeElapsedInSeconds: propTimeElapsed,
  isTacticsBoardView: propIsTacticsBoardView,
  tacticalDiscs: propTacticalDiscs,
  tacticalBallPosition: propTacticalBallPosition,
  
  // Props that are still used for compatibility
  onPlayerDrop: _onPlayerDrop,
  onPlayerMove,
  onPlayerMoveEnd,
  onDrawingStart,
  onDrawingAddPoint,
  onDrawingEnd,
  onPlayerRemove,
  onOpponentMove,
  onOpponentMoveEnd,
  onOpponentRemove,
  draggingPlayerFromBarInfo: _draggingPlayerFromBarInfo,
  onPlayerDropViaTouch: _onPlayerDropViaTouch,
  onPlayerDragCancelViaTouch: _onPlayerDragCancelViaTouch,
  onTacticalDiscMove: _onTacticalDiscMove,
  onTacticalDiscRemove: _onTacticalDiscRemove,
  onToggleTacticalDiscType: _onToggleTacticalDiscType,
  onTacticalBallMove: _onTacticalBallMove,
}) => {
  // Get values from Zustand stores
  const gameSession = useGameSession();
  const { timeElapsed } = useGameTimer();
  const field = useFieldState();
  const gameStore = useGameStore();
  // const uiStore = useUIStore(); // TODO: Use when implementing UI state
  const gameView = useGameView();
  
  // Use store values instead of props where available
  const displayPlayers = field.playersOnField.length > 0 ? field.playersOnField : propPlayers;
  const displayOpponents = field.opponents.length > 0 ? field.opponents : propOpponents;
  const displayDrawings = field.drawings.length > 0 ? field.drawings : propDrawings;
  const displayShowPlayerNames = gameSession.showPlayerNames !== undefined ? gameSession.showPlayerNames : propShowPlayerNames;
  const displayTimeElapsed = timeElapsed || propTimeElapsed;
  const displayTacticalDiscs = field.tacticalDiscs.length > 0 ? field.tacticalDiscs : propTacticalDiscs;
  const displayTacticalBallPosition = field.tacticalBallPosition || propTacticalBallPosition;
  const displayIsTacticsBoardView = gameView.isTacticsBoardView !== undefined ? gameView.isTacticsBoardView : propIsTacticsBoardView;

  // Local component state
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDraggingPlayer, setIsDraggingPlayer] = useState<boolean>(false);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [isDraggingOpponent, setIsDraggingOpponent] = useState<boolean>(false);
  const [draggingOpponentId, setDraggingOpponentId] = useState<string | null>(null);
  // const [isDraggingTacticalDisc, setIsDraggingTacticalDisc] = useState<boolean>(false);
  // const [draggingTacticalDiscId, setDraggingTacticalDiscId] = useState<string | null>(null);
  // const [isDraggingBall, setIsDraggingBall] = useState<boolean>(false);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  // const [activeTouchId, setActiveTouchId] = useState<number | null>(null);
  // const [lastTapInfo, setLastTapInfo] = useState<{ 
  //   time: number; 
  //   x: number; 
  //   y: number; 
  //   targetId: string | null; 
  //   targetType: 'player' | 'opponent' | 'tactical' | 'ball' | null 
  // } | null>(null);
  const [ballImage, setBallImage] = useState<HTMLImageElement | null>(null);
  const drawingFrameRef = useRef<number | null>(null);

  // Constants
  const PLAYER_RADIUS = 20;
  // const DOUBLE_TAP_TIME_THRESHOLD = 300;
  // const DOUBLE_TAP_POS_THRESHOLD = 15;

  // Load ball image
  useEffect(() => {
    const img = new Image();
    img.src = '/ball.png';
    img.onload = () => setBallImage(img);
  }, []);

  // Cleanup animation frame on unmount
  useEffect(() => {
    const currentFrame = drawingFrameRef.current;
    return () => {
      if (currentFrame) {
        cancelAnimationFrame(currentFrame);
      }
    };
  }, []);

  // Helper function to format time
  const formatTime = (totalSeconds: number): string => {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  // Helper function to create noise pattern
  const createNoisePattern = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    opacity: number
  ): CanvasPattern | null => {
    if (typeof document === 'undefined') return null;

    const noiseCanvas = document.createElement('canvas');
    noiseCanvas.width = width;
    noiseCanvas.height = height;
    const noiseCtx = noiseCanvas.getContext('2d');
    if (!noiseCtx) return null;

    const imageData = noiseCtx.createImageData(width, height);
    const data = imageData.data;
    const alpha = opacity * 255;
    for (let i = 0; i < data.length; i += 4) {
      const randomValue = Math.random() > 0.5 ? 255 : 0;
      data[i] = randomValue;
      data[i + 1] = randomValue;
      data[i + 2] = randomValue;
      data[i + 3] = alpha;
    }
    noiseCtx.putImageData(imageData, 0, 0);

    const pattern = ctx.createPattern(noiseCanvas, 'repeat');
    return pattern;
  };

  // Enhanced player movement handlers with store integration
  // const handlePlayerDropWithStore = useCallback((playerId: string, relX: number, relY: number) => {
  //   // Update store
  //   gameStore.movePlayer(playerId, { relX, relY });
  //   // Also call parent handler for compatibility
  //   onPlayerDrop(playerId, relX, relY);
  // }, [gameStore, onPlayerDrop]);

  const handlePlayerMoveWithStore = useCallback((playerId: string, relX: number, relY: number) => {
    // Update store
    gameStore.movePlayer(playerId, { relX, relY });
    // Also call parent handler for compatibility
    onPlayerMove(playerId, relX, relY);
  }, [gameStore, onPlayerMove]);

  const handlePlayerRemoveWithStore = useCallback((playerId: string) => {
    // Update store
    gameStore.removePlayerFromField(playerId);
    // Also call parent handler for compatibility
    onPlayerRemove(playerId);
  }, [gameStore, onPlayerRemove]);

  // Enhanced opponent handlers with store integration
  const handleOpponentMoveWithStore = useCallback((opponentId: string, relX: number, relY: number) => {
    // Update store
    gameStore.moveOpponent(opponentId, { relX, relY });
    // Also call parent handler for compatibility
    onOpponentMove(opponentId, relX, relY);
  }, [gameStore, onOpponentMove]);

  const handleOpponentRemoveWithStore = useCallback((opponentId: string) => {
    // Update store
    gameStore.removeOpponent(opponentId);
    // Also call parent handler for compatibility
    onOpponentRemove(opponentId);
  }, [gameStore, onOpponentRemove]);

  // Enhanced tactical handlers with store integration
  // const handleTacticalDiscMoveWithStore = useCallback((discId: string, relX: number, relY: number) => {
  //   // Update store
  //   gameStore.moveTacticalDisc(discId, { relX, relY });
  //   // Also call parent handler for compatibility
  //   onTacticalDiscMove(discId, relX, relY);
  // }, [gameStore, onTacticalDiscMove]);

  // const handleTacticalDiscRemoveWithStore = useCallback((discId: string) => {
  //   // Update store
  //   gameStore.removeTacticalDisc(discId);
  //   // Also call parent handler for compatibility
  //   onTacticalDiscRemove(discId);
  // }, [gameStore, onTacticalDiscRemove]);

  // const handleTacticalBallMoveWithStore = useCallback((position: Point) => {
  //   // Update store
  //   gameStore.setTacticalBallPosition(position);
  //   // Also call parent handler for compatibility
  //   onTacticalBallMove(position);
  // }, [gameStore, onTacticalBallMove]);

  // Enhanced drawing handlers with store integration
  const handleDrawingStartWithStore = useCallback((point: Point) => {
    // Start new drawing in store
    gameStore.addDrawing([point]);
    // Also call parent handler for compatibility
    onDrawingStart(point);
  }, [gameStore, onDrawingStart]);

  const handleDrawingAddPointWithStore = useCallback((point: Point) => {
    // Add point to current drawing in store
    const currentDrawings = field.drawings;
    if (currentDrawings.length > 0) {
      const lastDrawing = currentDrawings[currentDrawings.length - 1];
      const updatedDrawings = [
        ...currentDrawings.slice(0, -1),
        [...lastDrawing, point]
      ];
      gameStore.setDrawings(updatedDrawings);
    }
    // Also call parent handler for compatibility
    onDrawingAddPoint(point);
  }, [field.drawings, gameStore, onDrawingAddPoint]);

  // Helper functions for position and collision detection
  const getRelativeEventPosition = (e: React.MouseEvent | React.TouchEvent): { relX: number; relY: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    if (rect.width === 0 || rect.height === 0) {
      logger.warn("Canvas has invalid dimensions, cannot calculate relative position.");
      return null;
    }

    const relX = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

    return { relX, relY };
  };

  const isPointInPlayer = useCallback((eventClientX: number, eventClientY: number, player: Player): boolean => {
    const canvas = canvasRef.current;
    if (!canvas || player.relX === undefined || player.relY === undefined) return false;
    const rect = canvas.getBoundingClientRect();
    const absPlayerX = player.relX * rect.width;
    const absPlayerY = player.relY * rect.height;
    const absEventX = eventClientX - rect.left;
    const absEventY = eventClientY - rect.top;
    const dx = absEventX - absPlayerX;
    const dy = absEventY - absPlayerY;
    return dx * dx + dy * dy <= PLAYER_RADIUS * PLAYER_RADIUS;
  }, []);

  const isPointInOpponent = useCallback((eventClientX: number, eventClientY: number, opponent: Opponent): boolean => {
    const canvas = canvasRef.current;
    if (!canvas) return false;
    const rect = canvas.getBoundingClientRect();
    const absOpponentX = opponent.relX * rect.width;
    const absOpponentY = opponent.relY * rect.height;
    const absEventX = eventClientX - rect.left;
    const absEventY = eventClientY - rect.top;
    const dx = absEventX - absOpponentX;
    const dy = absEventY - absOpponentY;
    const opponentRadiusSq = (PLAYER_RADIUS * 0.9) * (PLAYER_RADIUS * 0.9);
    return dx * dx + dy * dy <= opponentRadiusSq;
  }, []);

  // const isPointInTacticalDisc = useCallback((eventClientX: number, eventClientY: number, disc: TacticalDisc): boolean => {
  //   const canvas = canvasRef.current;
  //   if (!canvas) return false;
  //   const rect = canvas.getBoundingClientRect();
  //   const absDiscX = disc.relX * rect.width;
  //   const absDiscY = disc.relY * rect.height;
  //   const absEventX = eventClientX - rect.left;
  //   const absEventY = eventClientY - rect.top;
  //   const dx = absEventX - absDiscX;
  //   const dy = absEventY - absDiscY;
  //   return dx * dx + dy * dy <= PLAYER_RADIUS * PLAYER_RADIUS;
  // }, []);

  // const isPointInBall = useCallback((eventClientX: number, eventClientY: number): boolean => {
  //   if (!displayTacticalBallPosition) return false;
  //   const canvas = canvasRef.current;
  //   if (!canvas) return false;
  //   const rect = canvas.getBoundingClientRect();
  //   const ballRadius = PLAYER_RADIUS;
  //   const absBallX = displayTacticalBallPosition.relX * rect.width;
  //   const absBallY = displayTacticalBallPosition.relY * rect.height;
  //   const absEventX = eventClientX - rect.left;
  //   const absEventY = eventClientY - rect.top;
  //   const dx = absEventX - absBallX;
  //   const dy = absEventY - absBallY;
  //   return dx * dx + dy * dy <= ballRadius * ballRadius;
  // }, [displayTacticalBallPosition]);

  // Drawing logic - simplified version focusing on core functionality
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // const rect = canvas.getBoundingClientRect(); // TODO: Remove if not needed
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Draw soccer field background
    ctx.fillStyle = '#2d5016';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Add grass texture
    const noisePattern = createNoisePattern(ctx, 50, 50, 0.15);
    if (noisePattern) {
      ctx.fillStyle = noisePattern;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }

    // Draw field markings
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);

    // Draw field border
    ctx.strokeRect(10, 10, canvasWidth - 20, canvasHeight - 20);

    // Draw center line
    ctx.beginPath();
    ctx.moveTo(canvasWidth / 2, 10);
    ctx.lineTo(canvasWidth / 2, canvasHeight - 10);
    ctx.stroke();

    // Draw center circle
    ctx.beginPath();
    ctx.arc(canvasWidth / 2, canvasHeight / 2, 50, 0, 2 * Math.PI);
    ctx.stroke();

    // Draw penalty areas
    const penaltyWidth = 100;
    const penaltyHeight = 60;
    
    // Left penalty area
    ctx.strokeRect(10, (canvasHeight - penaltyHeight) / 2, penaltyWidth, penaltyHeight);
    
    // Right penalty area
    ctx.strokeRect(canvasWidth - penaltyWidth - 10, (canvasHeight - penaltyHeight) / 2, penaltyWidth, penaltyHeight);

    // Draw goal areas
    const goalWidth = 40;
    const goalHeight = 20;
    
    // Left goal area
    ctx.strokeRect(10, (canvasHeight - goalHeight) / 2, goalWidth, goalHeight);
    
    // Right goal area
    ctx.strokeRect(canvasWidth - goalWidth - 10, (canvasHeight - goalHeight) / 2, goalWidth, goalHeight);

    // Draw drawings/tactical lines
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 3;
    displayDrawings.forEach(drawing => {
      if (drawing.length > 1) {
        ctx.beginPath();
        const firstPoint = drawing[0];
        ctx.moveTo(firstPoint.relX * canvasWidth, firstPoint.relY * canvasHeight);
        for (let i = 1; i < drawing.length; i++) {
          const point = drawing[i];
          ctx.lineTo(point.relX * canvasWidth, point.relY * canvasHeight);
        }
        ctx.stroke();
      }
    });

    // Draw players
    displayPlayers.forEach(player => {
      if (player.relX !== undefined && player.relY !== undefined) {
        const x = player.relX * canvasWidth;
        const y = player.relY * canvasHeight;
        
        // Player circle
        ctx.fillStyle = player.color || '#4285f4';
        ctx.beginPath();
        ctx.arc(x, y, PLAYER_RADIUS, 0, 2 * Math.PI);
        ctx.fill();
        
        // Player border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Player number/name
        if (displayShowPlayerNames && player.name) {
          ctx.fillStyle = '#ffffff';
          ctx.font = '12px Arial';
          ctx.textAlign = 'center';
          ctx.fillText(player.name, x, y + 4);
        }
      }
    });

    // Draw opponents
    displayOpponents.forEach(opponent => {
      const x = opponent.relX * canvasWidth;
      const y = opponent.relY * canvasHeight;
      
      // Opponent circle (smaller and different color)
      ctx.fillStyle = '#ff4444';
      ctx.beginPath();
      ctx.arc(x, y, PLAYER_RADIUS * 0.9, 0, 2 * Math.PI);
      ctx.fill();
      
      // Opponent border
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw tactical discs (in tactics board view)
    if (displayIsTacticsBoardView) {
      displayTacticalDiscs.forEach(disc => {
        const x = disc.relX * canvasWidth;
        const y = disc.relY * canvasHeight;
        
        ctx.fillStyle = disc.type === 'home' ? '#4285f4' : '#ff4444';
        ctx.beginPath();
        ctx.arc(x, y, PLAYER_RADIUS, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Draw tactical ball
      if (displayTacticalBallPosition && ballImage) {
        const x = displayTacticalBallPosition.relX * canvasWidth;
        const y = displayTacticalBallPosition.relY * canvasHeight;
        const ballSize = PLAYER_RADIUS;
        ctx.drawImage(ballImage, x - ballSize/2, y - ballSize/2, ballSize, ballSize);
      }
    }

    // Draw timer in corner
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText(formatTime(displayTimeElapsed), 20, 30);

  }, [
    displayPlayers, 
    displayOpponents, 
    displayDrawings, 
    displayShowPlayerNames, 
    displayTimeElapsed,
    displayIsTacticsBoardView,
    displayTacticalDiscs,
    displayTacticalBallPosition,
    ballImage
  ]);

  // Draw on every state change
  useEffect(() => {
    draw();
  }, [draw]);

  // Mouse and touch event handlers (simplified for core functionality)
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const relPos = getRelativeEventPosition(e);
    if (!relPos) return;

    // Check if clicking on player
    for (const player of displayPlayers) {
      if (isPointInPlayer(e.clientX, e.clientY, player)) {
        setIsDraggingPlayer(true);
        setDraggingPlayerId(player.id);
        return;
      }
    }

    // Check if clicking on opponent
    for (const opponent of displayOpponents) {
      if (isPointInOpponent(e.clientX, e.clientY, opponent)) {
        setIsDraggingOpponent(true);
        setDraggingOpponentId(opponent.id);
        return;
      }
    }

    // Start drawing if not in tactics board view
    if (!displayIsTacticsBoardView) {
      setIsDrawing(true);
      handleDrawingStartWithStore(relPos);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const relPos = getRelativeEventPosition(e);
    if (!relPos) return;

    if (isDraggingPlayer && draggingPlayerId) {
      handlePlayerMoveWithStore(draggingPlayerId, relPos.relX, relPos.relY);
    } else if (isDraggingOpponent && draggingOpponentId) {
      handleOpponentMoveWithStore(draggingOpponentId, relPos.relX, relPos.relY);
    } else if (isDrawing) {
      handleDrawingAddPointWithStore(relPos);
    }
  };

  const handleMouseUp = () => {
    if (isDraggingPlayer) {
      setIsDraggingPlayer(false);
      setDraggingPlayerId(null);
      onPlayerMoveEnd();
    } else if (isDraggingOpponent) {
      setIsDraggingOpponent(false);
      setDraggingOpponentId(null);
      onOpponentMoveEnd(draggingOpponentId || '');
    } else if (isDrawing) {
      setIsDrawing(false);
      onDrawingEnd();
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Double-click to remove players/opponents
    for (const player of displayPlayers) {
      if (isPointInPlayer(e.clientX, e.clientY, player)) {
        handlePlayerRemoveWithStore(player.id);
        return;
      }
    }

    for (const opponent of displayOpponents) {
      if (isPointInOpponent(e.clientX, e.clientY, opponent)) {
        handleOpponentRemoveWithStore(opponent.id);
        return;
      }
    }
  };

  return (
    <canvas
      ref={canvasRef}
      width={800}
      height={600}
      className="w-full h-full border border-slate-300 rounded-lg cursor-crosshair"
      style={{ 
        aspectRatio: '4/3',
        maxWidth: '100%',
        maxHeight: '70vh'
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
      onMouseLeave={handleMouseUp}
    />
  );
};

export default React.memo(MigratedSoccerField);