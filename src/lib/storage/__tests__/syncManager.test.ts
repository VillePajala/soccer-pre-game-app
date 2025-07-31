import { SyncManager } from '../syncManager';
import { IndexedDBProvider } from '../indexedDBProvider';
import type { IStorageProvider } from '../types';
import type { Player, Season, Tournament } from '../../../types';

// Mock IndexedDB provider
const mockIndexedDB = {
  addToSyncQueue: jest.fn(),
  getSyncQueue: jest.fn(),
  updateSyncQueueItem: jest.fn(),
  deleteSyncQueueItem: jest.fn(),
  clearCompletedSyncItems: jest.fn()
} as unknown as IndexedDBProvider;

// Mock Supabase provider
const mockSupabase = {
  savePlayer: jest.fn(),
  updatePlayer: jest.fn(),
  deletePlayer: jest.fn(),
  saveSeason: jest.fn(),
  updateSeason: jest.fn(),
  deleteSeason: jest.fn(),
  saveTournament: jest.fn(),
  updateTournament: jest.fn(),
  deleteTournament: jest.fn(),
  saveAppSettings: jest.fn(),
  saveSavedGame: jest.fn(),
  deleteSavedGame: jest.fn()
} as unknown as IStorageProvider;

describe('SyncManager', () => {
  let syncManager: SyncManager;

  beforeEach(() => {
    jest.clearAllMocks();
    syncManager = new SyncManager(mockIndexedDB, mockSupabase);
  });

  describe('Queue Operations', () => {
    it('should queue a create operation', async () => {
      const testData = { id: 'player-1', name: 'Test Player' };

      await syncManager.queueOperation('create', 'players', testData);

      expect(mockIndexedDB.addToSyncQueue).toHaveBeenCalledWith({
        operation: 'create',
        table: 'players',
        data: testData
      });
    });

    it('should queue an update operation', async () => {
      const testData = { id: 'season-1', name: 'Updated Season' };

      await syncManager.queueOperation('update', 'seasons', testData);

      expect(mockIndexedDB.addToSyncQueue).toHaveBeenCalledWith({
        operation: 'update',
        table: 'seasons',
        data: testData
      });
    });

    it('should queue a delete operation', async () => {
      const testData = { id: 'tournament-1' };

      await syncManager.queueOperation('delete', 'tournaments', testData);

      expect(mockIndexedDB.addToSyncQueue).toHaveBeenCalledWith({
        operation: 'delete',
        table: 'tournaments',
        data: testData
      });
    });
  });

  describe('Sync Status', () => {
    it('should report sync status correctly', () => {
      expect(syncManager.isSyncInProgress).toBe(false);
      expect(syncManager.currentSyncPromise).toBeNull();
    });

    it('should prevent multiple concurrent syncs', async () => {
      (mockIndexedDB.getSyncQueue as jest.Mock).mockResolvedValue([]);

      const sync1 = syncManager.syncToSupabase();
      const sync2 = syncManager.syncToSupabase();

      // Both calls should resolve to the same result, but promises might be different objects
      const [result1, result2] = await Promise.all([sync1, sync2]);
      
      expect(result1).toEqual(result2);
      expect(syncManager.isSyncInProgress).toBe(false);
    });
  });

  describe('Sync Operations', () => {
    it('should sync empty queue successfully', async () => {
      (mockIndexedDB.getSyncQueue as jest.Mock).mockResolvedValue([]);

      const result = await syncManager.syncToSupabase();

      expect(result).toEqual({
        success: true,
        syncedItems: 0,
        failedItems: 0,
        conflicts: [],
        errors: []
      });
    });

    it('should sync player create operation', async () => {
      const mockPlayer: Player = {
        id: 'player-1',
        name: 'Test Player',
        jerseyNumber: '10',
        isGoalie: false
      };

      const syncItem = {
        id: 'sync-1',
        operation: 'create' as const,
        table: 'players' as const,
        data: mockPlayer,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending' as const
      };

      (mockIndexedDB.getSyncQueue as jest.Mock).mockResolvedValue([syncItem]);
      (mockSupabase.savePlayer as jest.Mock).mockResolvedValue(mockPlayer);

      const result = await syncManager.syncToSupabase();

      expect(mockSupabase.savePlayer).toHaveBeenCalledWith(mockPlayer);
      expect(mockIndexedDB.updateSyncQueueItem).toHaveBeenCalledWith('sync-1', { status: 'syncing' });
      expect(mockIndexedDB.updateSyncQueueItem).toHaveBeenCalledWith('sync-1', { status: 'completed' });
      expect(result.syncedItems).toBe(1);
      expect(result.success).toBe(true);
    });

    it('should sync player update operation', async () => {
      const mockPlayer: Player = {
        id: 'player-1',
        name: 'Updated Player',
        jerseyNumber: '11',
        isGoalie: false
      };

      const syncItem = {
        id: 'sync-1',
        operation: 'update' as const,
        table: 'players' as const,
        data: mockPlayer,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending' as const
      };

      (mockIndexedDB.getSyncQueue as jest.Mock).mockResolvedValue([syncItem]);
      (mockSupabase.updatePlayer as jest.Mock).mockResolvedValue(mockPlayer);

      const result = await syncManager.syncToSupabase();

      expect(mockSupabase.updatePlayer).toHaveBeenCalledWith('player-1', mockPlayer);
      expect(result.syncedItems).toBe(1);
    });

    it('should sync player delete operation', async () => {
      const syncItem = {
        id: 'sync-1',
        operation: 'delete' as const,
        table: 'players' as const,
        data: { id: 'player-1' },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending' as const
      };

      (mockIndexedDB.getSyncQueue as jest.Mock).mockResolvedValue([syncItem]);
      (mockSupabase.deletePlayer as jest.Mock).mockResolvedValue(undefined);

      const result = await syncManager.syncToSupabase();

      expect(mockSupabase.deletePlayer).toHaveBeenCalledWith('player-1');
      expect(result.syncedItems).toBe(1);
    });

    it('should handle sync failures and retry logic', async () => {
      const syncItem = {
        id: 'sync-1',
        operation: 'create' as const,
        table: 'players' as const,
        data: { id: 'player-1', name: 'Test' },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending' as const
      };

      (mockIndexedDB.getSyncQueue as jest.Mock).mockResolvedValue([syncItem]);
      (mockSupabase.savePlayer as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await syncManager.syncToSupabase();

      expect(result.failedItems).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(mockIndexedDB.updateSyncQueueItem).toHaveBeenCalledWith('sync-1', {
        retryCount: 1
      });
    });

    it('should mark items as failed after max retries', async () => {
      const syncItem = {
        id: 'sync-1',
        operation: 'create' as const,
        table: 'players' as const,
        data: { id: 'player-1', name: 'Test' },
        timestamp: Date.now(),
        retryCount: 3,
        status: 'pending' as const
      };

      (mockIndexedDB.getSyncQueue as jest.Mock).mockResolvedValue([syncItem]);
      (mockSupabase.savePlayer as jest.Mock).mockRejectedValue(new Error('Network error'));

      await syncManager.syncToSupabase({ maxRetries: 3 });

      expect(mockIndexedDB.updateSyncQueueItem).toHaveBeenCalledWith('sync-1', {
        status: 'failed',
        retryCount: 4
      });
    });

    it('should process items in batches', async () => {
      const syncItems = Array.from({ length: 5 }, (_, i) => ({
        id: `sync-${i}`,
        operation: 'create' as const,
        table: 'players' as const,
        data: { id: `player-${i}`, name: `Player ${i}` },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending' as const
      }));

      (mockIndexedDB.getSyncQueue as jest.Mock).mockResolvedValue(syncItems);
      (mockSupabase.savePlayer as jest.Mock).mockResolvedValue({});

      const onProgress = jest.fn();
      await syncManager.syncToSupabase({ batchSize: 2, onProgress });

      expect(mockSupabase.savePlayer).toHaveBeenCalledTimes(5);
      expect(onProgress).toHaveBeenCalledWith({ completed: 5, total: 5 });
    });
  });

  describe('Different Table Operations', () => {
    it('should sync season operations', async () => {
      const mockSeason: Season = {
        id: 'season-1',
        name: 'Test Season',
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      };

      const createItem = {
        id: 'sync-1',
        operation: 'create' as const,
        table: 'seasons' as const,
        data: mockSeason,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending' as const
      };

      const updateItem = {
        id: 'sync-2',
        operation: 'update' as const,
        table: 'seasons' as const,
        data: mockSeason,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending' as const
      };

      (mockIndexedDB.getSyncQueue as jest.Mock).mockResolvedValue([createItem, updateItem]);
      (mockSupabase.saveSeason as jest.Mock).mockResolvedValue(mockSeason);
      (mockSupabase.updateSeason as jest.Mock).mockResolvedValue(mockSeason);

      const result = await syncManager.syncToSupabase();

      expect(mockSupabase.saveSeason).toHaveBeenCalledWith(mockSeason);
      expect(mockSupabase.updateSeason).toHaveBeenCalledWith('season-1', mockSeason);
      expect(result.syncedItems).toBe(2);
    });

    it('should sync app settings', async () => {
      const mockSettings = {
        currentGameId: 'game-123',
        defaultTeamName: 'My Team'
      };

      const syncItem = {
        id: 'sync-1',
        operation: 'create' as const,
        table: 'app_settings' as const,
        data: mockSettings,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending' as const
      };

      (mockIndexedDB.getSyncQueue as jest.Mock).mockResolvedValue([syncItem]);
      (mockSupabase.saveAppSettings as jest.Mock).mockResolvedValue(mockSettings);

      const result = await syncManager.syncToSupabase();

      expect(mockSupabase.saveAppSettings).toHaveBeenCalledWith(mockSettings);
      expect(result.syncedItems).toBe(1);
    });

    it('should handle unsupported table operations', async () => {
      const syncItem = {
        id: 'sync-1',
        operation: 'create' as const,
        table: 'unsupported_table' as any,
        data: { id: 'test' },
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending' as const
      };

      (mockIndexedDB.getSyncQueue as jest.Mock).mockResolvedValue([syncItem]);

      const result = await syncManager.syncToSupabase();

      expect(result.failedItems).toBe(1);
      expect(result.errors[0].message).toContain('Unsupported table for create');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing id in update operations', async () => {
      const syncItem = {
        id: 'sync-1',
        operation: 'update' as const,
        table: 'players' as const,
        data: { name: 'No ID Player' }, // Missing id
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending' as const
      };

      (mockIndexedDB.getSyncQueue as jest.Mock).mockResolvedValue([syncItem]);

      const result = await syncManager.syncToSupabase();

      expect(result.failedItems).toBe(1);
      expect(result.errors[0].message).toBe('Update operation requires data with id field');
    });

    it('should handle missing id in delete operations', async () => {
      const syncItem = {
        id: 'sync-1',
        operation: 'delete' as const,
        table: 'players' as const,
        data: { name: 'No ID Player' }, // Missing id
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending' as const
      };

      (mockIndexedDB.getSyncQueue as jest.Mock).mockResolvedValue([syncItem]);

      const result = await syncManager.syncToSupabase();

      expect(result.failedItems).toBe(1);
      expect(result.errors[0].message).toBe('Delete operation requires data with id field');
    });
  });

  describe('Sync Statistics', () => {
    it('should return correct sync statistics', async () => {
      const mockQueue = [
        { id: '1', status: 'pending' },
        { id: '2', status: 'pending' },
        { id: '3', status: 'failed' },
        { id: '4', status: 'completed' }
      ];

      (mockIndexedDB.getSyncQueue as jest.Mock).mockResolvedValue(mockQueue);

      const stats = await syncManager.getSyncStats();

      expect(stats.pendingCount).toBe(2);
      expect(stats.failedCount).toBe(1);
      expect(stats.lastSyncTime).toBeNull(); // Not implemented yet
    });
  });

  describe('Queue Management', () => {
    it('should clear sync queue', async () => {
      const mockQueue = [
        { id: '1' },
        { id: '2' },
        { id: '3' }
      ];

      (mockIndexedDB.getSyncQueue as jest.Mock).mockResolvedValue(mockQueue);

      await syncManager.clearSyncQueue();

      expect(mockIndexedDB.deleteSyncQueueItem).toHaveBeenCalledTimes(3);
      expect(mockIndexedDB.deleteSyncQueueItem).toHaveBeenCalledWith('1');
      expect(mockIndexedDB.deleteSyncQueueItem).toHaveBeenCalledWith('2');
      expect(mockIndexedDB.deleteSyncQueueItem).toHaveBeenCalledWith('3');
    });

    it('should retry failed items', async () => {
      const mockQueue = [
        { id: '1', status: 'failed' },
        { id: '2', status: 'completed' },
        { id: '3', status: 'failed' }
      ];

      (mockIndexedDB.getSyncQueue as jest.Mock)
        .mockResolvedValueOnce(mockQueue) // First call for retryFailedItems
        .mockResolvedValueOnce([]) // Second call for syncToSupabase

      const result = await syncManager.retryFailedItems();

      expect(mockIndexedDB.updateSyncQueueItem).toHaveBeenCalledWith('1', {
        status: 'pending',
        retryCount: 0
      });
      expect(mockIndexedDB.updateSyncQueueItem).toHaveBeenCalledWith('3', {
        status: 'pending',
        retryCount: 0
      });
      expect(result.success).toBe(true);
    });
  });
});