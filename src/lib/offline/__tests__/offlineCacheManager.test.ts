// Unit tests for offline cache manager functionality
import { OfflineCacheManager } from '../offlineCacheManager';
import type { IStorageProvider } from '../../storage/types';
import type { Player, Season, Tournament } from '../../../types';

// Mock the IndexedDBCache
jest.mock('../indexedDBCache', () => ({
  IndexedDBCache: jest.fn().mockImplementation(() => ({
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn(),
    clearAll: jest.fn(),
  })),
  dataCache: {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn(),
    clearAll: jest.fn(),
  },
  syncCache: {
    set: jest.fn(),
    get: jest.fn(),
    delete: jest.fn(),
    getAllKeys: jest.fn(),
    clearAll: jest.fn(),
  },
}));

import { dataCache, syncCache } from '../indexedDBCache';

const mockCache = dataCache as jest.Mocked<typeof dataCache>;
const mockSyncCache = syncCache as jest.Mocked<typeof syncCache>;

// Mock primary storage provider
const mockPrimaryProvider: jest.Mocked<IStorageProvider> = {
  getProviderName: jest.fn(() => 'MockProvider'),
  isOnline: jest.fn(() => Promise.resolve(true)),
  getPlayers: jest.fn(),
  savePlayer: jest.fn(),
  deletePlayer: jest.fn(),
  updatePlayer: jest.fn(),
  getSeasons: jest.fn(),
  saveSeason: jest.fn(),
  deleteSeason: jest.fn(),
  updateSeason: jest.fn(),
  getTournaments: jest.fn(),
  saveTournament: jest.fn(),
  deleteTournament: jest.fn(),
  updateTournament: jest.fn(),
  getAppSettings: jest.fn(),
  saveAppSettings: jest.fn(),
  getSavedGames: jest.fn(),
  saveSavedGame: jest.fn(),
  deleteSavedGame: jest.fn(),
  exportAllData: jest.fn(),
  importAllData: jest.fn(),
};

// Mock window.addEventListener
const mockAddEventListener = jest.fn();

Object.defineProperty(window, 'addEventListener', {
  value: mockAddEventListener,
});

Object.defineProperty(navigator, 'onLine', {
  value: true,
  writable: true,
});

describe('OfflineCacheManager', () => {
  let offlineManager: OfflineCacheManager;
  const testUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset navigator.onLine
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
    });

    offlineManager = new OfflineCacheManager(mockPrimaryProvider);
    offlineManager.setUserId(testUserId);

    // Default mock returns
    mockCache.get.mockResolvedValue(null);
    mockCache.getAllKeys.mockResolvedValue([]);
    mockSyncCache.getAllKeys.mockResolvedValue([]);
  });

  describe('Constructor and Setup', () => {
    it('should set up event listeners for online/offline events', () => {
      expect(mockAddEventListener).toHaveBeenCalledWith('online', expect.any(Function));
      expect(mockAddEventListener).toHaveBeenCalledWith('offline', expect.any(Function));
    });

    it('should initialize with navigator.onLine status', () => {
      expect(offlineManager.getProviderName()).toBe('offline(MockProvider)');
    });
  });

  describe('User ID Management', () => {
    it('should generate cache keys with user context', async () => {
      const testData = [{ id: 'p1', name: 'Player 1' }] as Player[];
      mockPrimaryProvider.getPlayers.mockResolvedValue(testData);

      await offlineManager.getPlayers();

      expect(mockCache.set).toHaveBeenCalledWith(
        'user-123:players',
        testData,
        { ttl: 30 * 60 * 1000 }
      );
    });

    it('should generate anonymous cache keys when no user ID', async () => {
      offlineManager.setUserId(null);
      const testData = [{ id: 'p1', name: 'Player 1' }] as Player[];
      mockPrimaryProvider.getPlayers.mockResolvedValue(testData);

      await offlineManager.getPlayers();

      expect(mockCache.set).toHaveBeenCalledWith(
        'anon:players',
        testData,
        { ttl: 30 * 60 * 1000 }
      );
    });
  });

  describe('Online/Offline Detection', () => {
    it('should return primary provider online status when online', async () => {
      mockPrimaryProvider.isOnline.mockResolvedValue(true);

      const result = await offlineManager.isOnline();

      expect(result).toBe(true);
    });

    it('should return false when navigator is offline', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      offlineManager = new OfflineCacheManager(mockPrimaryProvider);

      const result = await offlineManager.isOnline();

      expect(result).toBe(false);
    });

    it('should return false when primary provider fails', async () => {
      mockPrimaryProvider.isOnline.mockRejectedValue(new Error('Network error'));

      const result = await offlineManager.isOnline();

      expect(result).toBe(false);
    });
  });

  describe('Player Management', () => {
    const testPlayers: Player[] = [
      { id: 'p1', name: 'Player 1', isGoalie: false, receivedFairPlayCard: false },
      { id: 'p2', name: 'Player 2', isGoalie: true, receivedFairPlayCard: false },
    ];

    describe('getPlayers', () => {
      it('should fetch from primary provider when online', async () => {
        mockPrimaryProvider.getPlayers.mockResolvedValue(testPlayers);

        const result = await offlineManager.getPlayers();

        expect(mockPrimaryProvider.getPlayers).toHaveBeenCalled();
        expect(mockCache.set).toHaveBeenCalledWith(
          'user-123:players',
          testPlayers,
          { ttl: 30 * 60 * 1000 }
        );
        expect(result).toEqual(testPlayers);
      });

      it('should fallback to cache when primary provider fails', async () => {
        mockPrimaryProvider.getPlayers.mockRejectedValue(new Error('Network error'));
        mockCache.get.mockResolvedValue(testPlayers);

        const result = await offlineManager.getPlayers();

        expect(mockCache.get).toHaveBeenCalledWith('user-123:players');
        expect(result).toEqual(testPlayers);
      });

      it('should throw error when no cached data available', async () => {
        mockPrimaryProvider.getPlayers.mockRejectedValue(new Error('Network error'));
        mockCache.get.mockResolvedValue(null);

        await expect(offlineManager.getPlayers()).rejects.toThrow('No players available offline');
      });

      it('should use cache when offline', async () => {
        Object.defineProperty(navigator, 'onLine', { value: false });
        offlineManager = new OfflineCacheManager(mockPrimaryProvider);
        offlineManager.setUserId(testUserId);
        mockCache.get.mockResolvedValue(testPlayers);

        const result = await offlineManager.getPlayers();

        expect(mockPrimaryProvider.getPlayers).not.toHaveBeenCalled();
        expect(mockCache.get).toHaveBeenCalledWith('user-123:players');
        expect(result).toEqual(testPlayers);
      });
    });

    describe('savePlayer', () => {
      const newPlayer: Player = { id: 'p3', name: 'New Player', isGoalie: false, receivedFairPlayCard: false };

      it('should save to primary provider when online', async () => {
        mockPrimaryProvider.savePlayer.mockResolvedValue(newPlayer);
        mockCache.get.mockResolvedValue(testPlayers);

        const result = await offlineManager.savePlayer(newPlayer);

        expect(mockPrimaryProvider.savePlayer).toHaveBeenCalledWith(newPlayer);
        expect(mockCache.set).toHaveBeenCalledWith(
          'user-123:players',
          expect.arrayContaining([newPlayer])
        );
        expect(result).toEqual(newPlayer);
      });

      it('should queue for sync when primary provider fails', async () => {
        mockPrimaryProvider.savePlayer.mockRejectedValue(new Error('Network error'));
        mockCache.get.mockResolvedValue(testPlayers);

        const result = await offlineManager.savePlayer(newPlayer);

        expect(mockSyncCache.set).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            operation: 'create',
            table: 'players',
            data: newPlayer,
            userId: testUserId,
          })
        );
        expect(result).toEqual(newPlayer);
      });

      it('should update cache optimistically when offline', async () => {
        Object.defineProperty(navigator, 'onLine', { value: false });
        offlineManager = new OfflineCacheManager(mockPrimaryProvider);
        offlineManager.setUserId(testUserId);
        mockCache.get.mockResolvedValue(testPlayers);

        const result = await offlineManager.savePlayer(newPlayer);

        expect(mockPrimaryProvider.savePlayer).not.toHaveBeenCalled();
        expect(mockCache.set).toHaveBeenCalledWith(
          'user-123:players',
          expect.arrayContaining([newPlayer])
        );
        expect(result).toEqual(newPlayer);
      });
    });

    describe('deletePlayer', () => {
      const playerId = 'p1';

      it('should delete from primary provider when online', async () => {
        mockPrimaryProvider.deletePlayer.mockResolvedValue(undefined);
        mockCache.get.mockResolvedValue(testPlayers);

        await offlineManager.deletePlayer(playerId);

        expect(mockPrimaryProvider.deletePlayer).toHaveBeenCalledWith(playerId);
        expect(mockCache.set).toHaveBeenCalledWith(
          'user-123:players',
          expect.not.arrayContaining([expect.objectContaining({ id: playerId })])
        );
      });

      it('should queue for sync when primary provider fails', async () => {
        mockPrimaryProvider.deletePlayer.mockRejectedValue(new Error('Network error'));
        mockCache.get.mockResolvedValue(testPlayers);

        await offlineManager.deletePlayer(playerId);

        expect(mockSyncCache.set).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            operation: 'delete',
            table: 'players',
            data: { id: playerId },
            userId: testUserId,
          })
        );
      });
    });

    describe('updatePlayer', () => {
      const playerId = 'p1';
      const updates = { name: 'Updated Player' };

      it('should update in primary provider when online', async () => {
        const updatedPlayer = { ...testPlayers[0], ...updates };
        mockPrimaryProvider.updatePlayer.mockResolvedValue(updatedPlayer);
        mockCache.get.mockResolvedValue(testPlayers);

        const result = await offlineManager.updatePlayer(playerId, updates);

        expect(mockPrimaryProvider.updatePlayer).toHaveBeenCalledWith(playerId, updates);
        expect(result).toEqual(updatedPlayer);
      });

      it('should queue for sync when primary provider fails', async () => {
        mockPrimaryProvider.updatePlayer.mockRejectedValue(new Error('Network error'));
        mockCache.get.mockResolvedValue(testPlayers);

        const result = await offlineManager.updatePlayer(playerId, updates);

        expect(mockSyncCache.set).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            operation: 'update',
            table: 'players',
            data: { id: playerId, ...updates },
            userId: testUserId,
          })
        );
        expect(result).toEqual({ ...testPlayers[0], ...updates });
      });

      it('should throw error when player not found in cache', async () => {
        mockPrimaryProvider.updatePlayer.mockRejectedValue(new Error('Network error'));
        mockCache.get.mockResolvedValue([]);

        await expect(offlineManager.updatePlayer('nonexistent', updates))
          .rejects.toThrow('Player not found in cache');
      });
    });
  });

  describe('Generic Cache Patterns', () => {
    const testSeasons: Season[] = [
      { id: 's1', name: 'Season 1', startDate: '2024-01-01', endDate: '2024-06-01' },
    ];

    it('should use getCachedOrFetch for seasons', async () => {
      mockPrimaryProvider.getSeasons.mockResolvedValue(testSeasons);

      const result = await offlineManager.getSeasons();

      expect(mockPrimaryProvider.getSeasons).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith(
        'user-123:seasons',
        testSeasons,
        { ttl: 30 * 60 * 1000 }
      );
      expect(result).toEqual(testSeasons);
    });

    it('should use saveWithCache for tournaments', async () => {
      const tournament: Tournament = { id: 't1', name: 'Tournament 1', startDate: '2024-07-01', endDate: '2024-07-15' };
      mockPrimaryProvider.saveTournament.mockResolvedValue(tournament);

      const result = await offlineManager.saveTournament(tournament);

      expect(mockPrimaryProvider.saveTournament).toHaveBeenCalledWith(tournament);
      expect(result).toEqual(tournament);
    });
  });

  describe('Saved Games with Consistent Cache Keys', () => {
    const testGames = { 'game-1': { id: 'game-1', teamName: 'Test Team' } };

    it('should use consistent cache key for savedGames regardless of auth state', async () => {
      mockPrimaryProvider.getSavedGames.mockResolvedValue(testGames);

      const result = await offlineManager.getSavedGames();

      expect(mockPrimaryProvider.getSavedGames).toHaveBeenCalled();
      expect(mockCache.set).toHaveBeenCalledWith(
        'savedGames',  // Not user-namespaced
        testGames,
        { ttl: 30 * 60 * 1000 }
      );
      expect(result).toEqual(testGames);
    });

    it('should use consistent cache key even when user ID is null', async () => {
      offlineManager.setUserId(null);
      mockPrimaryProvider.getSavedGames.mockResolvedValue(testGames);

      const result = await offlineManager.getSavedGames();

      expect(mockCache.set).toHaveBeenCalledWith(
        'savedGames',  // Still not user-namespaced
        testGames,
        { ttl: 30 * 60 * 1000 }
      );
      expect(result).toEqual(testGames);
    });

    it('should fallback to cached savedGames with consistent key', async () => {
      mockPrimaryProvider.getSavedGames.mockRejectedValue(new Error('Network error'));
      mockCache.get.mockResolvedValue(testGames);

      const result = await offlineManager.getSavedGames();

      expect(mockCache.get).toHaveBeenCalledWith('savedGames');
      expect(result).toEqual(testGames);
    });
  });

  describe('Sync Queue Management', () => {
    it('should not queue operations when no user ID', async () => {
      offlineManager.setUserId(null);
      mockPrimaryProvider.savePlayer.mockRejectedValue(new Error('Network error'));

      const player: Player = { id: 'p1', name: 'Player', isGoalie: false, receivedFairPlayCard: false };
      await offlineManager.savePlayer(player);

      expect(mockSyncCache.set).not.toHaveBeenCalled();
    });

    it('should generate unique sync queue IDs', async () => {
      mockPrimaryProvider.savePlayer.mockRejectedValue(new Error('Network error'));
      
      const player1: Player = { id: 'p1', name: 'Player 1', isGoalie: false, receivedFairPlayCard: false };
      const player2: Player = { id: 'p2', name: 'Player 2', isGoalie: false, receivedFairPlayCard: false };

      await offlineManager.savePlayer(player1);
      await offlineManager.savePlayer(player2);

      expect(mockSyncCache.set).toHaveBeenCalledTimes(2);
      
      const call1 = mockSyncCache.set.mock.calls[0];
      const call2 = mockSyncCache.set.mock.calls[1];
      
      expect(call1[0]).not.toEqual(call2[0]); // Different IDs
    });
  });

  describe('Offline Status', () => {
    it('should return correct offline status', async () => {
      mockCache.getAllKeys.mockResolvedValue(['key1', 'key2']);
      mockSyncCache.getAllKeys.mockResolvedValue(['sync1']);
      mockPrimaryProvider.isOnline.mockResolvedValue(true);

      const status = await offlineManager.getOfflineStatus();

      expect(status).toEqual({
        isOnline: true,
        hasOfflineData: true,
        syncQueueSize: 1,
      });
    });

    it('should indicate offline when no network', async () => {
      Object.defineProperty(navigator, 'onLine', { value: false });
      offlineManager = new OfflineCacheManager(mockPrimaryProvider);
      mockCache.getAllKeys.mockResolvedValue([]);
      mockSyncCache.getAllKeys.mockResolvedValue([]);

      const status = await offlineManager.getOfflineStatus();

      expect(status.isOnline).toBe(false);
    });
  });

  describe('Data Export/Import', () => {
    it('should always use primary provider for exports', async () => {
      const exportData = { players: [], seasons: [] };
      mockPrimaryProvider.exportAllData.mockResolvedValue(exportData);

      const result = await offlineManager.exportAllData();

      expect(mockPrimaryProvider.exportAllData).toHaveBeenCalled();
      expect(result).toEqual(exportData);
    });

    it('should always use primary provider for imports', async () => {
      const importData = { players: [], seasons: [] };

      await offlineManager.importAllData(importData);

      expect(mockPrimaryProvider.importAllData).toHaveBeenCalledWith(importData);
    });
  });

  describe('Cache Management', () => {
    it('should clear all offline data', async () => {
      await offlineManager.clearOfflineData();

      expect(mockCache.clearAll).toHaveBeenCalled();
      expect(mockSyncCache.clearAll).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle cache errors gracefully', async () => {
      mockPrimaryProvider.getPlayers.mockRejectedValue(new Error('Network error'));
      mockCache.get.mockRejectedValue(new Error('Cache error'));

      await expect(offlineManager.getPlayers()).rejects.toThrow('Cache error');
    });

    it('should handle sync cache errors gracefully', async () => {
      mockPrimaryProvider.savePlayer.mockRejectedValue(new Error('Network error'));
      mockSyncCache.set.mockRejectedValue(new Error('Sync cache error'));

      const player: Player = { id: 'p1', name: 'Player', isGoalie: false, receivedFairPlayCard: false };
      
      // Should throw the sync cache error since it's not caught
      await expect(offlineManager.savePlayer(player)).rejects.toThrow('Sync cache error');
    });
  });

  describe('Online/Offline Event Handling', () => {
    it('should handle online event', () => {
      // Get the online handler from addEventListener call
      const onlineHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'online'
      )?.[1];

      expect(onlineHandler).toBeDefined();
      
      // Calling the handler should not throw
      expect(() => onlineHandler?.()).not.toThrow();
    });

    it('should handle offline event', () => {
      // Get the offline handler from addEventListener call
      const offlineHandler = mockAddEventListener.mock.calls.find(
        call => call[0] === 'offline'
      )?.[1];

      expect(offlineHandler).toBeDefined();
      
      // Calling the handler should not throw
      expect(() => offlineHandler?.()).not.toThrow();
    });
  });
});