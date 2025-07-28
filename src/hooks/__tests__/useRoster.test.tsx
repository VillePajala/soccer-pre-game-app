import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useRoster } from '../useRoster';

jest.mock('@/utils/masterRosterManager', () => ({
  addPlayer: jest.fn(),
  updatePlayer: jest.fn(),
  removePlayer: jest.fn(),
  setGoalieStatus: jest.fn(),
}));

const { addPlayer, updatePlayer } = jest.requireMock('@/utils/masterRosterManager');

// Create wrapper for React Query
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  
  // Prepopulate query data to avoid issues
  queryClient.setQueryData(['masterRoster'], []);
  
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

describe('useRoster', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('rollback update on error', async () => {
    const player = { id: 'p1', name: 'One', isGoalie: false, jerseyNumber: '', notes: '', receivedFairPlayCard: false };
    updatePlayer.mockRejectedValue(new Error('fail'));
    
    // Use state to maintain stable references
    let hookArgs = { initialPlayers: [player], selectedPlayerIds: [] as string[] };
    
    const { result } = renderHook(
      () => useRoster(hookArgs),
      { wrapper: createWrapper() }
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
    
    // Use state to maintain stable references
    let hookArgs = { initialPlayers: [] as typeof newPlayer[], selectedPlayerIds: [] as string[] };
    
    const { result } = renderHook(
      () => useRoster(hookArgs),
      { wrapper: createWrapper() }
    );

    await act(async () => {
      await result.current.handleAddPlayer({ name: 'Two', jerseyNumber: '', notes: '', nickname: '' });
    });

    expect(result.current.availablePlayers).toEqual([newPlayer]);
    expect(result.current.isRosterUpdating).toBe(false);
  });
});

