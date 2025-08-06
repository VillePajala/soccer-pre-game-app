import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useViewMode, isPointInBounds, getDistance, canInteract } from '../useViewMode';
import { useUIStore } from '@/stores/uiStore';
import type { Point } from '@/types';

// Mock dependencies
jest.mock('@/utils/logger');
jest.mock('@/stores/uiStore');

describe('useViewMode', () => {
  beforeEach(() => {
    // Reset UI store state
    useUIStore.getState().resetAll();
  });

  describe('Basic Functionality', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useViewMode());

      // Check view modes
      expect(result.current.viewModes.isTacticsBoardView).toBe(false);
      expect(result.current.viewModes.isDrawingMode).toBe(false);
      expect(result.current.viewModes.isPlayerSelectionMode).toBe(false);
      expect(result.current.viewModes.isFieldEditMode).toBe(false);

      // Check display options
      expect(result.current.displayOptions.showPlayerNames).toBe(true);
      expect(result.current.displayOptions.showPlayerNumbers).toBe(false);
      expect(result.current.displayOptions.showOpponents).toBe(true);
      expect(result.current.displayOptions.showTacticalElements).toBe(true);

      // Check drawing state
      expect(result.current.drawing.isDrawing).toBe(false);
      expect(result.current.drawing.currentPoints).toEqual([]);
      expect(result.current.drawing.tool).toBe(null);
      expect(result.current.drawing.color).toBe('#000000');
      expect(result.current.drawing.thickness).toBe(2);

      // Check dragging state
      expect(result.current.dragging.isDraggingPlayer).toBe(false);
      expect(result.current.dragging.draggingPlayerId).toBe(null);
      expect(result.current.dragging.isAnyDragging).toBe(false);

      // Check selection state
      expect(result.current.selection.selectedPlayerIds).toEqual([]);
      expect(result.current.selection.selectedOpponentIds).toEqual([]);
      expect(result.current.selection.selectedTacticalElements).toEqual([]);

      expect(result.current.migrationStatus).toBe('zustand');
    });
  });

  describe('View Mode Management', () => {
    it('should toggle tactics board view', () => {
      const { result } = renderHook(() => useViewMode());

      act(() => {
        result.current.setTacticsBoardView(true);
      });

      expect(result.current.viewModes.isTacticsBoardView).toBe(true);

      act(() => {
        result.current.setTacticsBoardView(false);
      });

      expect(result.current.viewModes.isTacticsBoardView).toBe(false);
    });

    it('should toggle drawing mode', () => {
      const { result } = renderHook(() => useViewMode());

      act(() => {
        result.current.setDrawingMode(true);
      });

      expect(result.current.viewModes.isDrawingMode).toBe(true);

      act(() => {
        result.current.setDrawingMode(false);
      });

      expect(result.current.viewModes.isDrawingMode).toBe(false);
    });

    it('should toggle player selection mode', () => {
      const { result } = renderHook(() => useViewMode());

      act(() => {
        result.current.setPlayerSelectionMode(true);
      });

      expect(result.current.viewModes.isPlayerSelectionMode).toBe(true);
    });

    it('should toggle field edit mode', () => {
      const { result } = renderHook(() => useViewMode());

      act(() => {
        result.current.setFieldEditMode(true);
      });

      expect(result.current.viewModes.isFieldEditMode).toBe(true);
    });
  });

  describe('Display Options', () => {
    it('should toggle display preferences', () => {
      const { result } = renderHook(() => useViewMode());

      act(() => {
        result.current.setShowPlayerNames(false);
      });
      expect(result.current.displayOptions.showPlayerNames).toBe(false);

      act(() => {
        result.current.setShowPlayerNumbers(true);
      });
      expect(result.current.displayOptions.showPlayerNumbers).toBe(true);

      act(() => {
        result.current.setShowOpponents(false);
      });
      expect(result.current.displayOptions.showOpponents).toBe(false);

      act(() => {
        result.current.setShowTacticalElements(false);
      });
      expect(result.current.displayOptions.showTacticalElements).toBe(false);
    });
  });

  describe('Drawing Functionality', () => {
    it('should manage drawing tools', () => {
      const { result } = renderHook(() => useViewMode());

      act(() => {
        result.current.setDrawingTool('pen');
      });
      expect(result.current.drawing.tool).toBe('pen');

      act(() => {
        result.current.setDrawingColor('#ff0000');
      });
      expect(result.current.drawing.color).toBe('#ff0000');

      act(() => {
        result.current.setDrawingThickness(5);
      });
      expect(result.current.drawing.thickness).toBe(5);
    });

    it('should handle drawing interaction', () => {
      const { result } = renderHook(() => useViewMode());

      const startPoint: Point = { relX: 0.5, relY: 0.5 };
      const nextPoint: Point = { relX: 0.6, relY: 0.6 };

      act(() => {
        result.current.startDrawing(startPoint);
      });

      expect(result.current.drawing.isDrawing).toBe(true);
      expect(result.current.drawing.currentPoints).toEqual([startPoint]);

      act(() => {
        result.current.addDrawingPoint(nextPoint);
      });

      expect(result.current.drawing.currentPoints).toEqual([startPoint, nextPoint]);

      act(() => {
        result.current.endDrawing();
      });

      expect(result.current.drawing.isDrawing).toBe(false);
      expect(result.current.drawing.currentPoints).toEqual([]);
    });

    it('should clear current drawing', () => {
      const { result } = renderHook(() => useViewMode());

      const point: Point = { relX: 0.5, relY: 0.5 };

      act(() => {
        result.current.startDrawing(point);
        result.current.clearCurrentDrawing();
      });

      expect(result.current.drawing.currentPoints).toEqual([]);
    });
  });

  describe('Dragging State Management', () => {
    it('should manage player dragging', () => {
      const { result } = renderHook(() => useViewMode());

      act(() => {
        result.current.startDraggingPlayer('player1');
      });

      expect(result.current.dragging.isDraggingPlayer).toBe(true);
      expect(result.current.dragging.draggingPlayerId).toBe('player1');
      expect(result.current.dragging.isAnyDragging).toBe(true);

      act(() => {
        result.current.endDraggingPlayer();
      });

      expect(result.current.dragging.isDraggingPlayer).toBe(false);
      expect(result.current.dragging.draggingPlayerId).toBe(null);
      expect(result.current.dragging.isAnyDragging).toBe(false);
    });

    it('should manage opponent dragging', () => {
      const { result } = renderHook(() => useViewMode());

      act(() => {
        result.current.startDraggingOpponent('opponent1');
      });

      expect(result.current.dragging.isDraggingOpponent).toBe(true);
      expect(result.current.dragging.draggingOpponentId).toBe('opponent1');

      act(() => {
        result.current.endDraggingOpponent();
      });

      expect(result.current.dragging.isDraggingOpponent).toBe(false);
      expect(result.current.dragging.draggingOpponentId).toBe(null);
    });

    it('should manage tactical disc dragging', () => {
      const { result } = renderHook(() => useViewMode());

      act(() => {
        result.current.startDraggingTacticalDisc('disc1');
      });

      expect(result.current.dragging.isDraggingTacticalDisc).toBe(true);
      expect(result.current.dragging.draggingTacticalDiscId).toBe('disc1');

      act(() => {
        result.current.endDraggingTacticalDisc();
      });

      expect(result.current.dragging.isDraggingTacticalDisc).toBe(false);
      expect(result.current.dragging.draggingTacticalDiscId).toBe(null);
    });

    it('should manage ball dragging', () => {
      const { result } = renderHook(() => useViewMode());

      act(() => {
        result.current.startDraggingBall();
      });

      expect(result.current.dragging.isDraggingBall).toBe(true);

      act(() => {
        result.current.endDraggingBall();
      });

      expect(result.current.dragging.isDraggingBall).toBe(false);
    });
  });

  describe('Selection Management', () => {
    it('should manage player selection', () => {
      const { result } = renderHook(() => useViewMode());

      act(() => {
        result.current.selectPlayer('player1');
        result.current.selectPlayer('player2');
      });

      expect(result.current.selection.selectedPlayerIds).toEqual(['player1', 'player2']);

      act(() => {
        result.current.deselectPlayer('player1');
      });

      expect(result.current.selection.selectedPlayerIds).toEqual(['player2']);

      act(() => {
        result.current.clearPlayerSelection();
      });

      expect(result.current.selection.selectedPlayerIds).toEqual([]);
    });

    it('should manage opponent selection', () => {
      const { result } = renderHook(() => useViewMode());

      act(() => {
        result.current.selectOpponent('opponent1');
      });

      expect(result.current.selection.selectedOpponentIds).toEqual(['opponent1']);

      act(() => {
        result.current.deselectOpponent('opponent1');
      });

      expect(result.current.selection.selectedOpponentIds).toEqual([]);
    });
  });

  describe('Utility Actions', () => {
    it('should reset view to defaults', () => {
      const { result } = renderHook(() => useViewMode());

      // Change some settings
      act(() => {
        result.current.setTacticsBoardView(true);
        result.current.setDrawingMode(true);
        result.current.selectPlayer('player1');
      });

      // Reset view
      act(() => {
        result.current.resetView();
      });

      expect(result.current.viewModes.isTacticsBoardView).toBe(false);
      expect(result.current.viewModes.isDrawingMode).toBe(false);
      expect(result.current.selection.selectedPlayerIds).toEqual([]);
    });
  });

  describe('Legacy Mode', () => {
    it('should use legacy implementation when migration safety is enabled', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
      });

      const { result } = renderHook(() => useViewMode());

      expect(result.current.migrationStatus).toBe('legacy');

      // All values should be defaults in legacy mode
      expect(result.current.viewModes.isTacticsBoardView).toBe(false);
      expect(result.current.drawing.isDrawing).toBe(false);
      expect(result.current.dragging.isDraggingPlayer).toBe(false);

      // Actions should be no-ops
      act(() => {
        result.current.setTacticsBoardView(true);
      });

      expect(result.current.viewModes.isTacticsBoardView).toBe(false);
    });
  });
});

describe('Utility Functions', () => {
  describe('isPointInBounds', () => {
    it('should check if point is within bounds', () => {
      expect(isPointInBounds({ relX: 0.5, relY: 0.5 }, 800, 600)).toBe(true);
      expect(isPointInBounds({ relX: -0.1, relY: 0.5 }, 800, 600)).toBe(false);
      expect(isPointInBounds({ relX: 1.1, relY: 0.5 }, 800, 600)).toBe(false);
      expect(isPointInBounds({ relX: 0.5, relY: -0.1 }, 800, 600)).toBe(false);
      expect(isPointInBounds({ relX: 0.5, relY: 1.1 }, 800, 600)).toBe(false);
    });
  });

  describe('getDistance', () => {
    it('should calculate distance between points', () => {
      const p1: Point = { relX: 0, relY: 0 };
      const p2: Point = { relX: 1, relY: 0 };
      expect(getDistance(p1, p2)).toBe(1);

      const p3: Point = { relX: 0, relY: 0 };
      const p4: Point = { relX: 0.3, relY: 0.4 };
      expect(getDistance(p3, p4)).toBeCloseTo(0.5, 5);
    });
  });

  describe('canInteract', () => {
    it('should determine if interactions are allowed', () => {
      expect(canInteract({
        isTacticsBoardView: false,
        isDrawingMode: false,
        isPlayerSelectionMode: false,
        isFieldEditMode: false,
      })).toBe(true);

      expect(canInteract({
        isTacticsBoardView: true,
        isDrawingMode: false,
        isPlayerSelectionMode: false,
        isFieldEditMode: false,
      })).toBe(false);

      expect(canInteract({
        isTacticsBoardView: false,
        isDrawingMode: true,
        isPlayerSelectionMode: false,
        isFieldEditMode: false,
      })).toBe(false);
    });
  });
});