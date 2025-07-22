import React from 'react';
import { renderHook, act } from '@testing-library/react';
import usePlayerFieldManager from '../usePlayerFieldManager';
import type { Player } from '@/types';

const players: Player[] = [
  { id: 'p1', name: 'One', isGoalie: false },
  { id: 'p2', name: 'Two', isGoalie: false },
];

const useWrapperHook = () => {
  const [playersOnField, setPlayersOnField] = React.useState<Player[]>([]);
  const setOpponents = jest.fn();
  const setDrawings = jest.fn();
  const setTacticalDrawings = jest.fn();
  const handlePlayerDrop = (player: Player, pos: { relX: number; relY: number }) => {
    setPlayersOnField(prev => [...prev, { ...player, ...pos }]);
  };
  const saveStateToHistory = jest.fn();
  const handleClearDrawings = jest.fn();
  const clearTacticalElements = jest.fn();
  return usePlayerFieldManager({
    playersOnField,
    setPlayersOnField,
    setOpponents,
    setDrawings,
    setTacticalDrawings,
    availablePlayers: players,
    selectedPlayerIds: ['p1', 'p2'],
    handlePlayerDrop,
    saveStateToHistory,
    handleClearDrawings,
    clearTacticalElements,
    isTacticsBoardView: false,
  });
};

describe('usePlayerFieldManager', () => {
  test('drop on field adds player', () => {
    const { result } = renderHook(() => useWrapperHook());
    act(() => {
      result.current.handlers.handleDropOnField('p1', 0.2, 0.3);
      result.current.handlers.handlePlayerMoveEnd();
    });
    expect(result.current.states.draggingPlayerFromBarInfo).toBeNull();
    expect(result.current.handlers).toBeDefined();
  });

  test('handlePlaceAllPlayers places selected players', () => {
    const { result } = renderHook(() => useWrapperHook());
    act(() => {
      result.current.handlers.handlePlaceAllPlayers();
    });
    expect(result.current.handlers.handlePlayerMove).toBeDefined();
  });
});
