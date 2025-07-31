import { OfflineFirstStorageManager } from '../offlineFirstStorageManager';
import type { Player, TimerState } from '../../../types';

// Mock the providers
jest.mock('../indexedDBProvider');
jest.mock('../supabaseProvider');
jest.mock('../syncManager');

// Mock navigator.onLine
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true
});

// Mock implementations
const mockIndexedDB = {
  getPlayers: jest.fn(),
  savePlayer: jest.fn(),
  deletePlayer: jest.fn(),
  updatePlayer: jest.fn(),
  getSeasons: jest.fn(),
  saveSeason: jest.fn(),
  getAppSettings: jest.fn(),
  saveAppSettings: jest.fn(),
  getSavedGames: jest.fn(),
  saveSavedGame: jest.fn(),
  deleteSavedGame: jest.fn(),
  getTimerState: jest.fn(),
  saveTimerState: jest.fn(),
  deleteTimerState: jest.fn(),
  exportAllData: jest.fn(),
  importAllData: jest.fn(),
  getProviderName: jest.fn().mockReturnValue('indexedDB')
};

const mockSupabase = {
  savePlayer: jest.fn(),
  deletePlayer: jest.fn(),
  updatePlayer: jest.fn(),
  saveSeason: jest.fn(),
  saveAppSettings: jest.fn(),
  saveSavedGame: jest.fn(),
  deleteSavedGame: jest.fn(),
  isOnline: jest.fn().mockResolvedValue(true)
};

const mockSyncManager = {
  queueOperation: jest.fn(),
  syncToSupabase: jest.fn(),
  getSyncStats: jest.fn(),
  retryFailedItems: jest.fn()
};

// Mock modules
jest.mock('../indexedDBProvider', () => ({
  IndexedDBProvider: jest.fn().mockImplementation(() => mockIndexedDB)
}));

jest.mock('../supabaseProvider', () => ({
  SupabaseProvider: jest.fn().mockImplementation(() => mockSupabase)
}));

jest.mock('../syncManager', () => ({
  SyncManager: jest.fn().mockImplementation(() => mockSyncManager)
}));

// Mock navigator at module level
const mockNavigator = {
  onLine: true
};

// Store original navigator
const originalNavigator = global.navigator;

// Mock navigator globally for this test file
global.navigator = mockNavigator as any;

describe('OfflineFirstStorageManager', () => {
  let storageManager: OfflineFirstStorageManager;

  afterAll(() => {
    // Restore original navigator
    global.navigator = originalNavigator;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset all mock functions
    Object.values(mockIndexedDB).forEach(fn => {
      if (jest.isMockFunction(fn)) fn.mockReset();
    });
    Object.values(mockSupabase).forEach(fn => {
      if (jest.isMockFunction(fn)) fn.mockReset();
    });
    Object.values(mockSyncManager).forEach(fn => {
      if (jest.isMockFunction(fn)) fn.mockReset();
    });

    // Restore default mock return values
    mockIndexedDB.getProviderName.mockReturnValue('indexedDB');
    mockSupabase.isOnline.mockResolvedValue(true);

    // Reset navigator.onLine for each test
    mockNavigator.onLine = true;
    
    storageManager = new OfflineFirstStorageManager({
      enableOfflineMode: true,
      syncOnReconnect: true
    });
  });

  describe('Provider Information', () => {
    it('should return correct provider name', () => {
      expect(storageManager.getProviderName()).toBe('offlineFirst(indexedDB)');
    });

    it('should check online status', async () => {
      const isOnline = await storageManager.isOnline();
      expect(isOnline).toBe(true);
      expect(mockSupabase.isOnline).toHaveBeenCalled();
    });

    it('should return false when navigator is offline', async () => {
      mockNavigator.onLine = false;
      mockSupabase.isOnline.mockResolvedValue(false);
      const storageManagerOffline = new OfflineFirstStorageManager();
      
      const isOnline = await storageManagerOffline.isOnline();
      expect(isOnline).toBe(false);
      
      // Restore for other tests
      mockNavigator.onLine = true;
      mockSupabase.isOnline.mockResolvedValue(true);
    });
  });

  describe('Player Management - Online Mode', () => {
    const mockPlayer: Player = {
      id: 'player-1',
      name: 'Test Player',
      jerseyNumber: '10',
      isGoalie: false
    };

    it('should get players from IndexedDB', async () => {
      mockIndexedDB.getPlayers.mockResolvedValue([mockPlayer]);

      const players = await storageManager.getPlayers();

      expect(mockIndexedDB.getPlayers).toHaveBeenCalled();
      expect(players).toEqual([mockPlayer]);
    });

    it('should save player to IndexedDB and sync to Supabase when online', async () => {
      mockIndexedDB.savePlayer.mockResolvedValue(mockPlayer);
      mockSupabase.savePlayer.mockResolvedValue(mockPlayer);

      const result = await storageManager.savePlayer(mockPlayer);

      expect(mockIndexedDB.savePlayer).toHaveBeenCalledWith(mockPlayer);
      expect(mockSupabase.savePlayer).toHaveBeenCalledWith(mockPlayer);
      expect(result).toEqual(mockPlayer);
    });

    it('should queue operation when Supabase sync fails', async () => {
      mockIndexedDB.savePlayer.mockResolvedValue(mockPlayer);
      mockSupabase.savePlayer.mockRejectedValue(new Error('Network error'));

      const result = await storageManager.savePlayer(mockPlayer);

      expect(mockIndexedDB.savePlayer).toHaveBeenCalledWith(mockPlayer);
      expect(mockSyncManager.queueOperation).toHaveBeenCalledWith('create', 'players', mockPlayer);
      expect(result).toEqual(mockPlayer);
    });

    it('should update player in IndexedDB and sync to Supabase', async () => {
      const updates = { name: 'Updated Player' };
      const updatedPlayer = { ...mockPlayer, ...updates };
      
      mockIndexedDB.updatePlayer.mockResolvedValue(updatedPlayer);
      mockSupabase.updatePlayer.mockResolvedValue(updatedPlayer);

      const result = await storageManager.updatePlayer('player-1', updates);

      expect(mockIndexedDB.updatePlayer).toHaveBeenCalledWith('player-1', updates);
      expect(mockSupabase.updatePlayer).toHaveBeenCalledWith('player-1', updates);
      expect(result).toEqual(updatedPlayer);
    });

    it('should delete player from IndexedDB and sync to Supabase', async () => {
      mockIndexedDB.deletePlayer.mockResolvedValue(undefined);
      mockSupabase.deletePlayer.mockResolvedValue(undefined);

      await storageManager.deletePlayer('player-1');

      expect(mockIndexedDB.deletePlayer).toHaveBeenCalledWith('player-1');
      expect(mockSupabase.deletePlayer).toHaveBeenCalledWith('player-1');
    });
  });

  describe('Player Management - Offline Mode', () => {
    const mockPlayer: Player = {
      id: 'player-1',
      name: 'Test Player',
      jerseyNumber: '10',
      isGoalie: false
    };

    beforeEach(() => {
      mockNavigator.onLine = false;
      mockSupabase.isOnline.mockResolvedValue(false);
      storageManager = new OfflineFirstStorageManager({
        enableOfflineMode: true
      });
    });

    it('should save player to IndexedDB and queue for sync when offline', async () => {
      mockIndexedDB.savePlayer.mockResolvedValue(mockPlayer);

      const result = await storageManager.savePlayer(mockPlayer);

      expect(mockIndexedDB.savePlayer).toHaveBeenCalledWith(mockPlayer);
      expect(mockSupabase.savePlayer).not.toHaveBeenCalled();
      expect(mockSyncManager.queueOperation).toHaveBeenCalledWith('create', 'players', mockPlayer);
      expect(result).toEqual(mockPlayer);
    });

    it('should update player in IndexedDB and queue for sync when offline', async () => {
      const updates = { name: 'Updated Player' };
      const updatedPlayer = { ...mockPlayer, ...updates };
      
      mockIndexedDB.updatePlayer.mockResolvedValue(updatedPlayer);

      const result = await storageManager.updatePlayer('player-1', updates);

      expect(mockIndexedDB.updatePlayer).toHaveBeenCalledWith('player-1', updates);
      expect(mockSupabase.updatePlayer).not.toHaveBeenCalled();
      expect(mockSyncManager.queueOperation).toHaveBeenCalledWith('update', 'players', updatedPlayer);
      expect(result).toEqual(updatedPlayer);
    });

    it('should delete player from IndexedDB and queue for sync when offline', async () => {
      mockIndexedDB.deletePlayer.mockResolvedValue(undefined);

      await storageManager.deletePlayer('player-1');

      expect(mockIndexedDB.deletePlayer).toHaveBeenCalledWith('player-1');
      expect(mockSupabase.deletePlayer).not.toHaveBeenCalled();
      expect(mockSyncManager.queueOperation).toHaveBeenCalledWith('delete', 'players', { id: 'player-1' });
    });
  });

  describe('Timer State Management', () => {
    const mockTimerState: TimerState = {
      gameId: 'game-123',
      timeElapsedInSeconds: 450,
      timestamp: Date.now()
    };

    it('should get timer state from IndexedDB', async () => {
      mockIndexedDB.getTimerState.mockResolvedValue(mockTimerState);

      const result = await storageManager.getTimerState('game-123');

      expect(mockIndexedDB.getTimerState).toHaveBeenCalledWith('game-123');
      expect(result).toEqual(mockTimerState);
    });

    it('should save timer state to IndexedDB only (no Supabase sync)', async () => {
      mockIndexedDB.saveTimerState.mockResolvedValue(mockTimerState);

      const result = await storageManager.saveTimerState(mockTimerState);

      expect(mockIndexedDB.saveTimerState).toHaveBeenCalledWith(mockTimerState);
      // Timer state should not be synced to Supabase (real-time state)
      expect(mockSyncManager.queueOperation).not.toHaveBeenCalled();
      expect(result).toEqual(mockTimerState);
    });

    it('should delete timer state from IndexedDB only', async () => {
      mockIndexedDB.deleteTimerState.mockResolvedValue(undefined);

      await storageManager.deleteTimerState('game-123');

      expect(mockIndexedDB.deleteTimerState).toHaveBeenCalledWith('game-123');
      // Timer state deletion should not be synced to Supabase
      expect(mockSyncManager.queueOperation).not.toHaveBeenCalled();
    });
  });

  describe('Saved Games Management', () => {
    const mockGameData = {
      gameId: 'game-123',
      teamName: 'Test Team',
      playersOnField: []
    };

    it('should get saved games from IndexedDB', async () => {
      const mockGames = { 'game-123': mockGameData };
      mockIndexedDB.getSavedGames.mockResolvedValue(mockGames);

      const result = await storageManager.getSavedGames();

      expect(mockIndexedDB.getSavedGames).toHaveBeenCalled();
      expect(result).toEqual(mockGames);
    });

    it('should save game to IndexedDB and sync to Supabase when online', async () => {
      mockIndexedDB.saveSavedGame.mockResolvedValue(mockGameData);
      mockSupabase.saveSavedGame.mockResolvedValue(mockGameData);

      const result = await storageManager.saveSavedGame(mockGameData);

      expect(mockIndexedDB.saveSavedGame).toHaveBeenCalledWith(mockGameData);
      expect(mockSupabase.saveSavedGame).toHaveBeenCalledWith(mockGameData);
      expect(result).toEqual(mockGameData);
    });
  });

  describe('Sync Management', () => {
    it('should force sync to Supabase', async () => {
      const mockResult = {
        success: true,
        syncedItems: 5,
        failedItems: 0,
        conflicts: [],
        errors: []
      };
      
      mockSyncManager.syncToSupabase.mockResolvedValue(mockResult);

      await storageManager.forceSyncToSupabase();

      expect(mockSyncManager.syncToSupabase).toHaveBeenCalled();
    });

    it('should throw error when sync fails', async () => {
      const mockResult = {
        success: false,
        syncedItems: 2,
        failedItems: 3,
        conflicts: [],
        errors: [new Error('Network error')]
      };
      
      mockSyncManager.syncToSupabase.mockResolvedValue(mockResult);

      await expect(storageManager.forceSyncToSupabase())
        .rejects.toThrow('Sync failed: 3 items failed to sync');
    });

    it('should get sync statistics', async () => {
      const mockStats = {
        pendingCount: 2,
        failedCount: 1,
        lastSyncTime: Date.now()
      };
      
      mockSyncManager.getSyncStats.mockResolvedValue(mockStats);

      const result = await storageManager.getSyncStats();

      expect(result).toEqual(mockStats);
    });

    it('should retry failed sync items', async () => {
      const mockResult = {
        success: true,
        syncedItems: 3,
        failedItems: 0,
        conflicts: [],
        errors: []
      };
      
      mockSyncManager.retryFailedItems.mockResolvedValue(mockResult);

      const result = await storageManager.retryFailedSync();

      expect(mockSyncManager.retryFailedItems).toHaveBeenCalled();
      expect(result).toEqual(mockResult);
    });
  });

  describe('Data Import/Export', () => {
    it('should export all data from IndexedDB', async () => {
      const mockExportData = {
        players: [],
        seasons: [],
        tournaments: [],
        saved_games: {},
        app_settings: null
      };
      
      mockIndexedDB.exportAllData.mockResolvedValue(mockExportData);

      const result = await storageManager.exportAllData();

      expect(mockIndexedDB.exportAllData).toHaveBeenCalled();
      expect(result).toEqual(mockExportData);
    });

    it('should import data to IndexedDB and trigger sync', async () => {
      const mockImportData = {
        players: [{ id: 'player-1', name: 'Test Player' }],
        seasons: [],
        tournaments: []
      };
      
      mockIndexedDB.importAllData.mockResolvedValue(undefined);

      await storageManager.importAllData(mockImportData);

      expect(mockIndexedDB.importAllData).toHaveBeenCalledWith(mockImportData);
      
      // Should trigger sync after a delay
      setTimeout(() => {
        expect(mockSyncManager.syncToSupabase).toHaveBeenCalled();
      }, 1100);
    });
  });

  describe('Configuration', () => {
    it('should work with custom configuration', () => {
      const customConfig = {
        enableOfflineMode: false,
        syncOnReconnect: false,
        maxRetries: 5,
        batchSize: 20
      };

      const customStorageManager = new OfflineFirstStorageManager(customConfig);

      expect(customStorageManager.getProviderName()).toBe('offlineFirst(indexedDB)');
    });
  });

  describe('Cleanup', () => {
    it('should clean up event listeners on destroy', () => {
      const removeEventListenerSpy = jest.spyOn(window, 'removeEventListener');

      storageManager.destroy();

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
      expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
    });
  });
});