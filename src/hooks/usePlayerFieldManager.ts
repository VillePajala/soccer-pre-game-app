import { useState, useCallback } from 'react';
import type { Player, Opponent, Point, AppState } from '@/types';
import logger from '@/utils/logger';

interface UsePlayerFieldManagerProps {
  playersOnField: Player[];
  setPlayersOnField: React.Dispatch<React.SetStateAction<Player[]>>;
  setOpponents: React.Dispatch<React.SetStateAction<Opponent[]>>;
  setDrawings: React.Dispatch<React.SetStateAction<Point[][]>>;
  setTacticalDrawings: React.Dispatch<React.SetStateAction<Point[][]>>;
  availablePlayers: Player[];
  selectedPlayerIds: string[];
  handlePlayerDrop: (player: Player, pos: { relX: number; relY: number }) => void;
  saveStateToHistory: (state: Partial<AppState>) => void;
  handleClearDrawings: () => void;
  clearTacticalElements: () => void;
  isTacticsBoardView: boolean;
}

export const usePlayerFieldManager = ({
  playersOnField,
  setPlayersOnField,
  setOpponents,
  setDrawings,
  setTacticalDrawings,
  availablePlayers,
  selectedPlayerIds,
  handlePlayerDrop,
  saveStateToHistory,
  handleClearDrawings,
  clearTacticalElements,
  isTacticsBoardView,
}: UsePlayerFieldManagerProps) => {
  const [draggingPlayerFromBarInfo, setDraggingPlayerFromBarInfo] = useState<Player | null>(null);

  const handleDropOnField = useCallback(
    (playerId: string, relX: number, relY: number) => {
      const droppedPlayer = availablePlayers.find(p => p.id === playerId);
      if (droppedPlayer) {
        handlePlayerDrop(droppedPlayer, { relX, relY });
      } else {
        logger.error(`[usePlayerFieldManager] Dropped player ${playerId} not found`);
      }
    },
    [availablePlayers, handlePlayerDrop],
  );

  const handlePlayerMove = useCallback(
    (playerId: string, relX: number, relY: number) => {
      setPlayersOnField(prev => prev.map(p => (p.id === playerId ? { ...p, relX, relY } : p)));
    },
    [setPlayersOnField],
  );

  const handlePlayerMoveEnd = useCallback(() => {
    saveStateToHistory({ playersOnField });
  }, [playersOnField, saveStateToHistory]);

  const handlePlayerRemove = useCallback(
    (playerId: string) => {
      const updated = playersOnField.filter(p => p.id !== playerId);
      setPlayersOnField(updated);
      saveStateToHistory({ playersOnField: updated });
    },
    [playersOnField, saveStateToHistory, setPlayersOnField],
  );

  const handlePlayerDragStartFromBar = useCallback((playerInfo: Player) => {
    setDraggingPlayerFromBarInfo(playerInfo);
    logger.log('[usePlayerFieldManager] Drag start', playerInfo);
  }, []);

  const handlePlayerTapInBar = useCallback(
    (playerInfo: Player | null) => {
      if (draggingPlayerFromBarInfo?.id === playerInfo?.id) {
        setDraggingPlayerFromBarInfo(null);
      } else {
        setDraggingPlayerFromBarInfo(playerInfo);
      }
    },
    [draggingPlayerFromBarInfo],
  );

  const handlePlayerDropViaTouch = useCallback(
    (relX: number, relY: number) => {
      if (draggingPlayerFromBarInfo) {
        logger.log('[usePlayerFieldManager] Drop via touch', draggingPlayerFromBarInfo.id);
        handleDropOnField(draggingPlayerFromBarInfo.id, relX, relY);
        setDraggingPlayerFromBarInfo(null);
      }
    },
    [draggingPlayerFromBarInfo, handleDropOnField],
  );

  const handlePlayerDragCancelViaTouch = useCallback(() => {
    setDraggingPlayerFromBarInfo(null);
  }, []);

  const handleResetField = useCallback(() => {
    if (isTacticsBoardView) {
      clearTacticalElements();
    } else {
      setPlayersOnField([]);
      setOpponents([]);
      setDrawings([]);
      saveStateToHistory({ playersOnField: [], opponents: [], drawings: [] });
    }
  }, [
    isTacticsBoardView,
    clearTacticalElements,
    setPlayersOnField,
    setOpponents,
    setDrawings,
    saveStateToHistory,
  ]);

  const handleClearDrawingsForView = useCallback(() => {
    if (isTacticsBoardView) {
      setTacticalDrawings([]);
      saveStateToHistory({ tacticalDrawings: [] });
    } else {
      handleClearDrawings();
    }
  }, [isTacticsBoardView, setTacticalDrawings, saveStateToHistory, handleClearDrawings]);

  const handlePlaceAllPlayers = useCallback(() => {
    const selectedButNotOnField = selectedPlayerIds.filter(
      id => !playersOnField.some(p => p.id === id),
    );
    if (selectedButNotOnField.length === 0) return;

    const playersToPlace = selectedButNotOnField
      .map(id => availablePlayers.find(p => p.id === id))
      .filter((p): p is Player => p !== undefined);

    const newFieldPlayers: Player[] = [...playersOnField];

    const goalieIndex = playersToPlace.findIndex(p => p.isGoalie);
    let goalie: Player | null = null;
    if (goalieIndex !== -1) {
      goalie = playersToPlace.splice(goalieIndex, 1)[0];
    }
    if (goalie) {
      newFieldPlayers.push({ ...goalie, relX: 0.5, relY: 0.95 });
    }

    const remainingCount = playersToPlace.length;

    // Robust position generator: grid layout spanning safe field area
    const generatePositions = (count: number): { relX: number; relY: number }[] => {
      if (count <= 0) return [];
      const paddingX = 0.12; // left/right padding
      const paddingYTop = 0.2; // keep players off the very bottom (goalie area) and top
      const paddingYBottom = 0.85;
      // Choose columns/rows based on sqrt to keep grid square-ish
      const cols = Math.ceil(Math.sqrt(count));
      const rows = Math.ceil(count / cols);
      const spanX = 1 - paddingX * 2;
      const spanY = paddingYBottom - paddingYTop;
      const stepX = cols > 1 ? spanX / (cols - 1) : 0;
      const stepY = rows > 1 ? spanY / (rows - 1) : 0;
      const positions: { relX: number; relY: number }[] = [];
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (positions.length >= count) break;
          const relX = paddingX + c * stepX;
          const relY = paddingYTop + r * stepY;
          positions.push({ relX, relY });
        }
      }
      return positions;
    };

    const positions = generatePositions(remainingCount);

    playersToPlace.forEach((player, index) => {
      const pos = positions[index];
      // Defensive guard (should not trigger due to generator length)
      const safeRelX = pos ? pos.relX : 0.5;
      const safeRelY = pos ? pos.relY : 0.5;
      newFieldPlayers.push({ ...player, relX: safeRelX, relY: safeRelY });
    });

    setPlayersOnField(newFieldPlayers);
    saveStateToHistory({ playersOnField: newFieldPlayers });
  }, [
    selectedPlayerIds,
    playersOnField,
    availablePlayers,
    setPlayersOnField,
    saveStateToHistory,
  ]);

  return {
    states: { draggingPlayerFromBarInfo },
    handlers: {
      handleDropOnField,
      handlePlayerMove,
      handlePlayerMoveEnd,
      handlePlayerRemove,
      handlePlayerDragStartFromBar,
      handlePlayerTapInBar,
      handlePlayerDropViaTouch,
      handlePlayerDragCancelViaTouch,
      handlePlaceAllPlayers,
      handleResetField,
      handleClearDrawingsForView,
    },
    setDraggingPlayerFromBarInfo,
  } as const;
};

export type UsePlayerFieldManagerReturn = ReturnType<typeof usePlayerFieldManager>;
export default usePlayerFieldManager;

