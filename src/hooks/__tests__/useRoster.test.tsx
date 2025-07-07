import { renderHook, act } from '@testing-library/react';
import { useRoster } from '../useRoster';

jest.mock('@/utils/masterRosterManager', () => ({
  addPlayer: jest.fn(),
  updatePlayer: jest.fn(),
  removePlayer: jest.fn(),
  setGoalieStatus: jest.fn(),
}));


const { addPlayer, updatePlayer } = jest.requireMock('@/utils/masterRosterManager');

describe('useRoster', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('rollback update on error', async () => {
    const player = { id: 'p1', name: 'One', isGoalie: false, jerseyNumber: '', notes: '', receivedFairPlayCard: false };
    updatePlayer.mockRejectedValue(new Error('fail'));
    const { result } = renderHook(() =>
      useRoster({ initialPlayers: [player], selectedPlayerIds: [] })
    );

    await act(async () => {
      await result.current.handleUpdatePlayer('p1', { name: 'Two' });
    });

    expect(result.current.availablePlayers[0].name).toBe('One');
    expect(result.current.isRosterUpdating).toBe(false);
  });

  test('adds player on success', async () => {
    const newPlayer = { id: 'p2', name: 'Two', isGoalie: false, jerseyNumber: '', notes: '', receivedFairPlayCard: false };
    addPlayer.mockResolvedValue(newPlayer);
    const { result } = renderHook(() =>
      useRoster({ initialPlayers: [], selectedPlayerIds: [] })
    );

    await act(async () => {
      await result.current.handleAddPlayer({ name: 'Two', jerseyNumber: '', notes: '', nickname: '' });
    });

    expect(result.current.availablePlayers).toEqual([newPlayer]);
    expect(result.current.isRosterUpdating).toBe(false);
  });
});

