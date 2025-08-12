/**
 * View Mode Hook - Unified view state management
 * 
 * This hook provides a comprehensive interface for managing all view-related state
 * in the soccer field component. It centralizes drawing modes, tactical views,
 * and interaction states that were previously distributed across components.
 * 
 * Features:
 * - Unified view mode management (tactics board, drawing, selection)
 * - Drawing interaction state and tools
 * - Dragging state for all field elements
 * - Display preferences (player names, numbers, etc.)
 * - Migration safety with legacy fallback
 */

import { useCallback } from 'react';
import { 
  useUIStore,
  useGameView,
  useDrawingMode,
  useDrawingInteraction,
  useDraggingState,
  useSelectionState,
  useTacticsBoard
} from '@/stores/uiStore';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';
import type { Point } from '@/types';
import logger from '@/utils/logger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface UseViewModeResult {
  // View modes
  viewModes: {
    isTacticsBoardView: boolean;
    isDrawingMode: boolean;
    isPlayerSelectionMode: boolean;
    isFieldEditMode: boolean;
  };
  
  // Display preferences
  displayOptions: {
    showPlayerNames: boolean;
    showPlayerNumbers: boolean;
    showOpponents: boolean;
    showTacticalElements: boolean;
  };
  
  // Drawing state
  drawing: {
    isDrawing: boolean;
    currentPoints: Point[];
    tool: 'pen' | 'line' | 'arrow' | 'circle' | 'eraser' | null;
    color: string;
    thickness: number;
  };
  
  // Dragging state
  dragging: {
    isDraggingPlayer: boolean;
    draggingPlayerId: string | null;
    isDraggingOpponent: boolean;
    draggingOpponentId: string | null;
    isDraggingTacticalDisc: boolean;
    draggingTacticalDiscId: string | null;
    isDraggingBall: boolean;
    isAnyDragging: boolean;
  };
  
  // Selection state
  selection: {
    selectedPlayerIds: string[];
    selectedOpponentIds: string[];
    selectedTacticalElements: string[];
  };
  
  // View mode actions
  setTacticsBoardView: (enabled: boolean) => void;
  setDrawingMode: (enabled: boolean) => void;
  setPlayerSelectionMode: (enabled: boolean) => void;
  setFieldEditMode: (enabled: boolean) => void;
  
  // Display actions
  setShowPlayerNames: (show: boolean) => void;
  setShowPlayerNumbers: (show: boolean) => void;
  setShowOpponents: (show: boolean) => void;
  setShowTacticalElements: (show: boolean) => void;
  
  // Drawing actions
  setDrawingTool: (tool: 'pen' | 'line' | 'arrow' | 'circle' | 'eraser' | null) => void;
  setDrawingColor: (color: string) => void;
  setDrawingThickness: (thickness: number) => void;
  startDrawing: (point: Point) => void;
  addDrawingPoint: (point: Point) => void;
  endDrawing: () => void;
  clearCurrentDrawing: () => void;
  
  // Dragging actions
  startDraggingPlayer: (playerId: string) => void;
  endDraggingPlayer: () => void;
  startDraggingOpponent: (opponentId: string) => void;
  endDraggingOpponent: () => void;
  startDraggingTacticalDisc: (discId: string) => void;
  endDraggingTacticalDisc: () => void;
  startDraggingBall: () => void;
  endDraggingBall: () => void;
  
  // Selection actions
  selectPlayer: (playerId: string) => void;
  deselectPlayer: (playerId: string) => void;
  clearPlayerSelection: () => void;
  selectOpponent: (opponentId: string) => void;
  deselectOpponent: (opponentId: string) => void;
  clearOpponentSelection: () => void;
  
  // Utility actions
  resetView: () => void;
  
  // Migration status
  migrationStatus: 'zustand' | 'legacy';
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

export function useViewMode(): UseViewModeResult {
  const { shouldUseLegacy } = useMigrationSafety('ViewMode');
  const legacyViewMode = useLegacyViewMode();

  // Get all the specialized hooks
  const gameView = useGameView();
  const _tacticsBoard = useTacticsBoard();
  const drawingMode = useDrawingMode();
  const drawingInteraction = useDrawingInteraction();
  const draggingState = useDraggingState();
  const selectionState = useSelectionState();
  
  // Get store actions directly
  const setTacticsBoardViewAction = useUIStore((state) => state.setTacticsBoardView);
  const setDrawingModeAction = useUIStore((state) => state.setDrawingMode);
  const setPlayerSelectionModeAction = useUIStore((state) => state.setPlayerSelectionMode);
  const setFieldEditModeAction = useUIStore((state) => state.setFieldEditMode);
  const addSelectedPlayerIdAction = useUIStore((state) => state.addSelectedPlayerId);
  const removeSelectedPlayerIdAction = useUIStore((state) => state.removeSelectedPlayerId);
  const clearSelectedPlayersAction = useUIStore((state) => state.clearSelectedPlayers);
  const addSelectedOpponentIdAction = useUIStore((state) => state.addSelectedOpponentId);
  const removeSelectedOpponentIdAction = useUIStore((state) => state.removeSelectedOpponentId);
  const clearSelectedOpponentsAction = useUIStore((state) => state.clearSelectedOpponents);
  const resetViewAction = useUIStore((state) => state.resetView);
  
  // ============================================================================
  // View Mode Actions
  // ============================================================================
  
  const setTacticsBoardView = useCallback((enabled: boolean) => {
    setTacticsBoardViewAction(enabled);
    logger.debug('[ViewMode] Tactics board view:', enabled);
  }, [setTacticsBoardViewAction]);
  
  const setDrawingMode = useCallback((enabled: boolean) => {
    setDrawingModeAction(enabled);
    logger.debug('[ViewMode] Drawing mode:', enabled);
  }, [setDrawingModeAction]);
  
  const setPlayerSelectionMode = useCallback((enabled: boolean) => {
    setPlayerSelectionModeAction(enabled);
    logger.debug('[ViewMode] Player selection mode:', enabled);
  }, [setPlayerSelectionModeAction]);
  
  const setFieldEditMode = useCallback((enabled: boolean) => {
    setFieldEditModeAction(enabled);
    logger.debug('[ViewMode] Field edit mode:', enabled);
  }, [setFieldEditModeAction]);
  
  // ============================================================================
  // Drawing Actions with Enhanced Logging
  // ============================================================================
  
  const startDrawing = useCallback((point: Point) => {
    drawingInteraction.startDrawing(point);
    logger.debug('[ViewMode] Started drawing at:', point);
  }, [drawingInteraction]);
  
  const addDrawingPoint = useCallback((point: Point) => {
    drawingInteraction.addDrawingPoint(point);
  }, [drawingInteraction]);
  
  const endDrawing = useCallback(() => {
    const pointCount = drawingInteraction.currentPoints.length;
    drawingInteraction.endDrawing();
    logger.debug('[ViewMode] Ended drawing with', pointCount, 'points');
  }, [drawingInteraction]);
  
  // ============================================================================
  // Selection Actions
  // ============================================================================
  
  const selectPlayer = useCallback((playerId: string) => {
    addSelectedPlayerIdAction(playerId);
    logger.debug('[ViewMode] Selected player:', playerId);
  }, [addSelectedPlayerIdAction]);
  
  const deselectPlayer = useCallback((playerId: string) => {
    removeSelectedPlayerIdAction(playerId);
    logger.debug('[ViewMode] Deselected player:', playerId);
  }, [removeSelectedPlayerIdAction]);
  
  const clearPlayerSelection = useCallback(() => {
    clearSelectedPlayersAction();
    logger.debug('[ViewMode] Cleared player selection');
  }, [clearSelectedPlayersAction]);
  
  const selectOpponent = useCallback((opponentId: string) => {
    addSelectedOpponentIdAction(opponentId);
    logger.debug('[ViewMode] Selected opponent:', opponentId);
  }, [addSelectedOpponentIdAction]);
  
  const deselectOpponent = useCallback((opponentId: string) => {
    removeSelectedOpponentIdAction(opponentId);
    logger.debug('[ViewMode] Deselected opponent:', opponentId);
  }, [removeSelectedOpponentIdAction]);
  
  const clearOpponentSelection = useCallback(() => {
    clearSelectedOpponentsAction();
    logger.debug('[ViewMode] Cleared opponent selection');
  }, [clearSelectedOpponentsAction]);
  
  // ============================================================================
  // Return Interface
  // ============================================================================

  if (shouldUseLegacy) {
    return legacyViewMode;
  }

  return {
    // View modes
    viewModes: {
      isTacticsBoardView: gameView.isTacticsBoardView,
      isDrawingMode: gameView.isDrawingMode,
      isPlayerSelectionMode: gameView.isPlayerSelectionMode,
      isFieldEditMode: gameView.isFieldEditMode,
    },
    
    // Display preferences
    displayOptions: {
      showPlayerNames: gameView.showPlayerNames,
      showPlayerNumbers: gameView.showPlayerNumbers,
      showOpponents: gameView.showOpponents,
      showTacticalElements: gameView.showTacticalElements,
    },
    
    // Drawing state
    drawing: {
      isDrawing: drawingInteraction.isDrawing,
      currentPoints: drawingInteraction.currentPoints,
      tool: drawingMode.tool,
      color: drawingMode.color,
      thickness: drawingMode.thickness,
    },
    
    // Dragging state
    dragging: {
      isDraggingPlayer: draggingState.isDraggingPlayer,
      draggingPlayerId: draggingState.draggingPlayerId,
      isDraggingOpponent: draggingState.isDraggingOpponent,
      draggingOpponentId: draggingState.draggingOpponentId,
      isDraggingTacticalDisc: draggingState.isDraggingTacticalDisc,
      draggingTacticalDiscId: draggingState.draggingTacticalDiscId,
      isDraggingBall: draggingState.isDraggingBall,
      isAnyDragging: draggingState.isAnyDragging,
    },
    
    // Selection state
    selection: {
      selectedPlayerIds: selectionState.selectedPlayerIds,
      selectedOpponentIds: selectionState.selectedOpponentIds,
      selectedTacticalElements: selectionState.selectedTacticalElements,
    },
    
    // View mode actions
    setTacticsBoardView,
    setDrawingMode,
    setPlayerSelectionMode,
    setFieldEditMode,
    
    // Display actions
    setShowPlayerNames: gameView.setShowPlayerNames,
    setShowPlayerNumbers: gameView.setShowPlayerNumbers,
    setShowOpponents: gameView.setShowOpponents,
    setShowTacticalElements: gameView.setShowTacticalElements,
    
    // Drawing actions
    setDrawingTool: drawingMode.setTool,
    setDrawingColor: drawingMode.setColor,
    setDrawingThickness: drawingMode.setThickness,
    startDrawing,
    addDrawingPoint,
    endDrawing,
    clearCurrentDrawing: drawingInteraction.clearCurrentDrawing,
    
    // Dragging actions
    startDraggingPlayer: draggingState.startDraggingPlayer,
    endDraggingPlayer: draggingState.endDraggingPlayer,
    startDraggingOpponent: draggingState.startDraggingOpponent,
    endDraggingOpponent: draggingState.endDraggingOpponent,
    startDraggingTacticalDisc: draggingState.startDraggingTacticalDisc,
    endDraggingTacticalDisc: draggingState.endDraggingTacticalDisc,
    startDraggingBall: draggingState.startDraggingBall,
    endDraggingBall: draggingState.endDraggingBall,
    
    // Selection actions
    selectPlayer,
    deselectPlayer,
    clearPlayerSelection,
    selectOpponent,
    deselectOpponent,
    clearOpponentSelection,
    
    // Utility actions
    resetView: resetViewAction,
    
    // Migration status
    migrationStatus: 'zustand',
  };
}

// ============================================================================
// Legacy Fallback Implementation
// ============================================================================

function useLegacyViewMode(): UseViewModeResult {
  logger.debug('[ViewMode] Using legacy implementation');
  
  // Return a minimal interface for legacy mode
  return {
    viewModes: {
      isTacticsBoardView: false,
      isDrawingMode: false,
      isPlayerSelectionMode: false,
      isFieldEditMode: false,
    },
    
    displayOptions: {
      showPlayerNames: true,
      showPlayerNumbers: false,
      showOpponents: true,
      showTacticalElements: true,
    },
    
    drawing: {
      isDrawing: false,
      currentPoints: [],
      tool: null,
      color: '#000000',
      thickness: 2,
    },
    
    dragging: {
      isDraggingPlayer: false,
      draggingPlayerId: null,
      isDraggingOpponent: false,
      draggingOpponentId: null,
      isDraggingTacticalDisc: false,
      draggingTacticalDiscId: null,
      isDraggingBall: false,
      isAnyDragging: false,
    },
    
    selection: {
      selectedPlayerIds: [],
      selectedOpponentIds: [],
      selectedTacticalElements: [],
    },
    
    // All actions are no-ops in legacy mode
    setTacticsBoardView: () => {},
    setDrawingMode: () => {},
    setPlayerSelectionMode: () => {},
    setFieldEditMode: () => {},
    setShowPlayerNames: () => {},
    setShowPlayerNumbers: () => {},
    setShowOpponents: () => {},
    setShowTacticalElements: () => {},
    setDrawingTool: () => {},
    setDrawingColor: () => {},
    setDrawingThickness: () => {},
    startDrawing: () => {},
    addDrawingPoint: () => {},
    endDrawing: () => {},
    clearCurrentDrawing: () => {},
    startDraggingPlayer: () => {},
    endDraggingPlayer: () => {},
    startDraggingOpponent: () => {},
    endDraggingOpponent: () => {},
    startDraggingTacticalDisc: () => {},
    endDraggingTacticalDisc: () => {},
    startDraggingBall: () => {},
    endDraggingBall: () => {},
    selectPlayer: () => {},
    deselectPlayer: () => {},
    clearPlayerSelection: () => {},
    selectOpponent: () => {},
    deselectOpponent: () => {},
    clearOpponentSelection: () => {},
    resetView: () => {},
    
    migrationStatus: 'legacy',
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Check if a point is within drawing bounds
 */
export function isPointInBounds(point: Point, _width: number, _height: number): boolean {
  return point.relX >= 0 && point.relX <= 1 && point.relY >= 0 && point.relY <= 1;
}

/**
 * Calculate distance between two points
 */
export function getDistance(p1: Point, p2: Point): number {
  const dx = p2.relX - p1.relX;
  const dy = p2.relY - p1.relY;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if a view mode should allow interactions
 */
export function canInteract(viewModes: UseViewModeResult['viewModes']): boolean {
  // Can't interact in tactics board view or when drawing
  return !viewModes.isTacticsBoardView && !viewModes.isDrawingMode;
}