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
    let positions: { relX: number; relY: number }[] = [];

    if (remainingCount <= 3) {
      if (remainingCount >= 1) positions.push({ relX: 0.5, relY: 0.8 });
      if (remainingCount >= 2) positions.push({ relX: 0.5, relY: 0.5 });
      if (remainingCount >= 3) positions.push({ relX: 0.5, relY: 0.3 });
    } else if (remainingCount <= 7) {
      positions.push({ relX: 0.3, relY: 0.8 });
      positions.push({ relX: 0.7, relY: 0.8 });
      positions.push({ relX: 0.25, relY: 0.6 });
      positions.push({ relX: 0.5, relY: 0.55 });
      positions.push({ relX: 0.75, relY: 0.6 });
      positions.push({ relX: 0.35, relY: 0.3 });
      if (remainingCount >= 7) positions.push({ relX: 0.65, relY: 0.3 });
    } else {
      positions.push({ relX: 0.25, relY: 0.85 });
      positions.push({ relX: 0.5, relY: 0.8 });
      positions.push({ relX: 0.75, relY: 0.85 });
      positions.push({ relX: 0.2, relY: 0.6 });
      positions.push({ relX: 0.4, relY: 0.55 });
      positions.push({ relX: 0.6, relY: 0.55 });
      positions.push({ relX: 0.8, relY: 0.6 });
      positions.push({ relX: 0.5, relY: 0.3 });
      if (remainingCount >= 9) positions.push({ relX: 0.35, relY: 0.3 });
      if (remainingCount >= 10) positions.push({ relX: 0.65, relY: 0.3 });
    }

    positions = positions.slice(0, remainingCount);

    playersToPlace.forEach((player, index) => {
      const pos = positions[index];
      newFieldPlayers.push({ ...player, relX: pos.relX, relY: pos.relY });
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

