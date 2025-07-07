import { useState, useCallback } from 'react';
import type { Point, TacticalDisc, AppState } from '@/types';

interface UseTacticalBoardArgs {
  initialDiscs?: TacticalDisc[];
  initialDrawings?: Point[][];
  initialBallPosition?: Point | null;
  saveStateToHistory: (partial: Partial<AppState>) => void;
}

export const useTacticalBoard = ({
  initialDiscs = [],
  initialDrawings = [],
  initialBallPosition = { relX: 0.5, relY: 0.5 },
  saveStateToHistory,
}: UseTacticalBoardArgs) => {
  const [isTacticsBoardView, setIsTacticsBoardView] = useState(false);
  const [tacticalDiscs, setTacticalDiscs] = useState<TacticalDisc[]>(initialDiscs);
  const [tacticalDrawings, setTacticalDrawings] = useState<Point[][]>(initialDrawings);
  const [tacticalBallPosition, setTacticalBallPosition] = useState<Point | null>(initialBallPosition);

  const handleToggleTacticsBoard = useCallback(() => {
    setIsTacticsBoardView((prev) => !prev);
  }, []);

  const handleAddTacticalDisc = useCallback(
    (type: 'home' | 'opponent') => {
      const newDisc: TacticalDisc = {
        id: `tactical-${type}-${Date.now()}`,
        relX: 0.5,
        relY: 0.5,
        type,
      };
      const newDiscs = [...tacticalDiscs, newDisc];
      setTacticalDiscs(newDiscs);
      saveStateToHistory({ tacticalDiscs: newDiscs });
    },
    [tacticalDiscs, saveStateToHistory]
  );

  const handleTacticalDiscMove = useCallback(
    (discId: string, relX: number, relY: number) => {
      const newDiscs = tacticalDiscs.map((d) => (d.id === discId ? { ...d, relX, relY } : d));
      setTacticalDiscs(newDiscs);
      saveStateToHistory({ tacticalDiscs: newDiscs });
    },
    [tacticalDiscs, saveStateToHistory]
  );

  const handleTacticalDiscRemove = useCallback(
    (discId: string) => {
      const newDiscs = tacticalDiscs.filter((d) => d.id !== discId);
      setTacticalDiscs(newDiscs);
      saveStateToHistory({ tacticalDiscs: newDiscs });
    },
    [tacticalDiscs, saveStateToHistory]
  );

  const handleToggleTacticalDiscType = useCallback(
    (discId: string) => {
      const newDiscs = tacticalDiscs.map((d) => {
        if (d.id === discId) {
          const nextType =
            d.type === 'home' ? 'opponent' : d.type === 'opponent' ? 'goalie' : 'home';
          return { ...d, type: nextType as typeof d.type };
        }
        return d;
      });
      setTacticalDiscs(newDiscs);
      saveStateToHistory({ tacticalDiscs: newDiscs });
    },
    [tacticalDiscs, saveStateToHistory]
  );

  const handleTacticalBallMove = useCallback(
    (position: Point) => {
      setTacticalBallPosition(position);
      saveStateToHistory({ tacticalBallPosition: position });
    },
    [saveStateToHistory]
  );

  const handleTacticalDrawingStart = useCallback((point: Point) => {
    setTacticalDrawings((prev) => [...prev, [point]]);
  }, []);

  const handleTacticalDrawingAddPoint = useCallback((point: Point) => {
    setTacticalDrawings((prev) => {
      const drawings = [...prev];
      if (drawings.length > 0) {
        drawings[drawings.length - 1].push(point);
      }
      return drawings;
    });
  }, []);

  const handleTacticalDrawingEnd = useCallback(() => {
    saveStateToHistory({ tacticalDrawings });
  }, [tacticalDrawings, saveStateToHistory]);

  const clearTacticalElements = useCallback(() => {
    setTacticalDiscs([]);
    setTacticalDrawings([]);
    const resetBall = { relX: 0.5, relY: 0.5 };
    setTacticalBallPosition(resetBall);
    saveStateToHistory({ tacticalDiscs: [], tacticalDrawings: [], tacticalBallPosition: resetBall });
  }, [saveStateToHistory]);

  return {
    isTacticsBoardView,
    setIsTacticsBoardView,
    tacticalDiscs,
    tacticalDrawings,
    tacticalBallPosition,
    handleToggleTacticsBoard,
    handleAddTacticalDisc,
    handleTacticalDiscMove,
    handleTacticalDiscRemove,
    handleToggleTacticalDiscType,
    handleTacticalBallMove,
    handleTacticalDrawingStart,
    handleTacticalDrawingAddPoint,
    handleTacticalDrawingEnd,
    clearTacticalElements,
    setTacticalDiscs,
    setTacticalDrawings,
    setTacticalBallPosition,
  };
};

