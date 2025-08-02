import { EnhancedSupabaseProvider } from './enhancedSupabaseProvider';
import type { Player } from '../../types';

// Mock the dependencies
jest.mock('./batchOperations', () => ({
  batchOperationManager: {
    batchUpdatePlayers: jest.fn(),
    saveGameSession: jest.fn(),
  }
}));

jest.mock('./requestDebouncer', () => ({
  requestDebouncer: {
    debouncedPlayerUpdate: jest.fn(),
    debouncedAutoSave: jest.fn(),
  }
}));

describe('EnhancedSupabaseProvider', () => {
  let provider: EnhancedSupabaseProvider;

  beforeEach(() => {
    // Mock the Supabase client
    const mockSupabase = {
      from: jest.fn(() => ({
        select: jest.fn(() => Promise.resolve({ data: [], error: null })),
        insert: jest.fn(() => ({
          select: jest.fn(() => Promise.resolve({ data: [], error: null }))
        })),
        upsert: jest.fn(() => ({
          select: jest.fn(() => Promise.resolve({ data: [], error: null }))
        }))
      }))
    };

    provider = new EnhancedSupabaseProvider(mockSupabase as any);
    jest.clearAllMocks();
  });

  describe('getProviderName', () => {
    it('should return enhanced-supabase', () => {
      expect(provider.getProviderName()).toBe('enhanced-supabase');
    });
  });

  describe('batchSavePlayers', () => {
    it('should handle empty players array', async () => {
      const result = await provider.batchSavePlayers([]);
      expect(result).toEqual([]);
    });

    it('should call batch operation manager', async () => {
      const mockPlayers: Player[] = [
        { id: '1', name: 'Player 1', isGoalie: false, assessments: {} }
      ];

      const { batchOperationManager } = require('./batchOperations');
      batchOperationManager.batchUpdatePlayers.mockResolvedValue(mockPlayers);

      const result = await provider.batchSavePlayers(mockPlayers);
      
      expect(batchOperationManager.batchUpdatePlayers).toHaveBeenCalledWith(mockPlayers);
      expect(result).toEqual(mockPlayers);
    });
  });

  describe('savePlayerDebounced', () => {
    it('should debounce player saves', async () => {
      const mockPlayer: Player = { id: '1', name: 'Player 1', isGoalie: false, assessments: {} };
      const mockResult = { id: '1', saved: true };

      const { requestDebouncer } = require('./requestDebouncer');
      requestDebouncer.debouncedPlayerUpdate.mockResolvedValue(mockResult);

      const result = await provider.savePlayerDebounced(mockPlayer);
      
      expect(requestDebouncer.debouncedPlayerUpdate).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('saveGameSessionBatch', () => {
    it('should batch save game session data', async () => {
      const gameId = 'game123';
      const gameData = {
        game: { id: gameId, status: 'playing' },
        players: [],
        events: [],
        assessments: []
      };

      const { batchOperationManager } = require('./batchOperations');
      batchOperationManager.saveGameSession.mockResolvedValue({ success: true });

      const result = await provider.saveGameSessionBatch(gameId, gameData);
      
      expect(batchOperationManager.saveGameSession).toHaveBeenCalledWith(gameId, gameData);
      expect(result).toEqual({ success: true });
    });
  });

  describe('saveGameDebounced', () => {
    it('should debounce game saves', async () => {
      const gameId = 'game123';
      const gameData = { status: 'playing' };
      const mockResult = { id: gameId, saved: true };

      const { requestDebouncer } = require('./requestDebouncer');
      requestDebouncer.debouncedAutoSave.mockResolvedValue(mockResult);

      const result = await provider.saveGameDebounced(gameId, gameData);
      
      expect(requestDebouncer.debouncedAutoSave).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });

    it('should use priority parameter', async () => {
      const gameId = 'game123';
      const gameData = { status: 'playing' };
      const priority = 'high';

      const { requestDebouncer } = require('./requestDebouncer');
      requestDebouncer.debouncedAutoSave.mockResolvedValue({});

      await provider.saveGameDebounced(gameId, gameData, priority);
      
      const callArgs = requestDebouncer.debouncedAutoSave.mock.calls[0];
      expect(callArgs[3]).toBe(priority);
    });
  });
});