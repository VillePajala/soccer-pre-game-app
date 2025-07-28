import {
  getSavedGames,
  saveGame,
  deleteGame,
  getGame,
  getAllGameIds,
  GameData
} from './savedGames';
import type { AppState } from '@/types';

// Mock the storage manager
jest.mock('@/lib/storage', () => ({
  authAwareStorageManager: {
    getSavedGames: jest.fn(),
    saveSavedGame: jest.fn(),
    deleteSavedGame: jest.fn(),
  }
}));

// Mock logger to avoid console output during tests
jest.mock('@/utils/logger', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
    log: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'test-id-123')
}));

import { authAwareStorageManager as storageManager } from '@/lib/storage';
import logger from '@/utils/logger';

describe('Saved Games Utilities', () => {
  const mockStorageManager = storageManager as jest.Mocked<typeof storageManager>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  const mockAppState: AppState = {
    id: 'game123',
    homeTeam: 'Home FC',
    awayTeam: 'Away United',
    date: '2024-01-15',
    homeScore: 0,
    awayScore: 0,
    teamOnLeft: 'home',
    players: [],
    events: [],
    gameStatus: 'notStarted',
    currentPeriod: 1,
    numberOfPeriods: 2,
    periodDuration: 45,
    seasonId: null,
    tournamentId: null,
  };

  const mockGameData: GameData = {
    id: 'game123',
    homeTeam: 'Home FC',
    awayTeam: 'Away United',
    date: '2024-01-15',
    homeScore: 0,
    awayScore: 0,
    teamOnLeft: 'home',
    players: [],
    events: [],
    gameStatus: 'notStarted',
    currentPeriod: 1,
    numberOfPeriods: 2,
    periodDuration: 45,
    seasonId: null,
    tournamentId: null,
  };

  const mockSavedGames = {
    'game123': mockAppState,
    'game456': {
      ...mockAppState,
      id: 'game456',
      homeTeam: 'Team A',
      awayTeam: 'Team B',
      date: '2024-01-16'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getSavedGames', () => {
    it('should return saved games from storage', async () => {
      mockStorageManager.getSavedGames.mockResolvedValue(mockSavedGames);
      
      const games = await getSavedGames();
      
      expect(games).toEqual(mockSavedGames);
    });

    it('should throw error on storage failure', async () => {
      const error = new Error('Storage error');
      mockStorageManager.getSavedGames.mockRejectedValue(error);
      
      await expect(getSavedGames()).rejects.toThrow('Storage error');
      expect(mockLogger.error).toHaveBeenCalledWith('Error getting saved games:', error);
    });
  });

  describe('saveGame', () => {
    it('should save game with ID and data', async () => {
      mockStorageManager.saveSavedGame.mockResolvedValue(mockAppState);
      
      const result = await saveGame('game123', mockGameData);
      
      expect(result).toEqual(mockAppState);
      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockGameData,
          id: 'game123'
        })
      );
    });

    it('should generate ID if not provided in data', async () => {
      const gameDataWithoutId = { ...mockGameData };
      delete (gameDataWithoutId as any).id;
      mockStorageManager.saveSavedGame.mockResolvedValue(mockAppState);
      
      const result = await saveGame('game123', gameDataWithoutId);
      
      expect(result).toEqual(mockAppState);
      expect(mockStorageManager.saveSavedGame).toHaveBeenCalledWith(
        expect.objectContaining({
          ...gameDataWithoutId,
          id: 'game123'
        })
      );
    });

    it('should throw error on save failure', async () => {
      const error = new Error('Save failed');
      mockStorageManager.saveSavedGame.mockRejectedValue(error);
      
      await expect(saveGame('game123', mockGameData)).rejects.toThrow('Save failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Error saving game:', error);
    });
  });

  describe('deleteGame', () => {
    it('should delete game by ID', async () => {
      mockStorageManager.getSavedGames.mockResolvedValue(mockSavedGames);
      mockStorageManager.deleteSavedGame.mockResolvedValue(undefined);
      
      const result = await deleteGame('game123');
      
      expect(result).toBe('game123');
      expect(mockStorageManager.deleteSavedGame).toHaveBeenCalledWith('game123');
    });

    it('should still delete and return ID even if game does not exist', async () => {
      mockStorageManager.deleteSavedGame.mockResolvedValue(undefined);
      
      const result = await deleteGame('nonexistent');
      
      expect(result).toBe('nonexistent');
      expect(mockStorageManager.deleteSavedGame).toHaveBeenCalledWith('nonexistent');
    });

    it('should throw error on delete failure', async () => {
      const error = new Error('Delete failed');
      mockStorageManager.deleteSavedGame.mockRejectedValue(error);
      
      await expect(deleteGame('game123')).rejects.toThrow('Delete failed');
      expect(mockLogger.error).toHaveBeenCalledWith('Error deleting game:', error);
    });
  });

  describe('getGame', () => {
    it('should return game by ID', async () => {
      mockStorageManager.getSavedGames.mockResolvedValue(mockSavedGames);
      
      const game = await getGame('game123');
      
      expect(game).toEqual(mockAppState);
    });

    it('should return null if game does not exist', async () => {
      mockStorageManager.getSavedGames.mockResolvedValue(mockSavedGames);
      
      const game = await getGame('nonexistent');
      
      expect(game).toBeNull();
    });

    it('should throw error on storage failure', async () => {
      const error = new Error('Storage error');
      mockStorageManager.getSavedGames.mockRejectedValue(error);
      
      await expect(getGame('game123')).rejects.toThrow('Storage error');
      expect(mockLogger.error).toHaveBeenCalledWith('Error getting game:', error);
    });
  });

  describe('getAllGameIds', () => {
    it('should return array of all game IDs', async () => {
      mockStorageManager.getSavedGames.mockResolvedValue(mockSavedGames);
      
      const ids = await getAllGameIds();
      
      expect(ids).toEqual(['game123', 'game456']);
    });

    it('should return empty array if no games', async () => {
      mockStorageManager.getSavedGames.mockResolvedValue({});
      
      const ids = await getAllGameIds();
      
      expect(ids).toEqual([]);
    });

    it('should throw error on storage failure', async () => {
      const error = new Error('Storage error');
      mockStorageManager.getSavedGames.mockRejectedValue(error);
      
      await expect(getAllGameIds()).rejects.toThrow('Storage error');
      expect(mockLogger.error).toHaveBeenCalledWith('Error getting all game IDs:', error);
    });
  });
});