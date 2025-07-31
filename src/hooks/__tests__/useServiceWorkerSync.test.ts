import { renderHook, act, waitFor } from '@testing-library/react';
import { useServiceWorkerSync } from '../useServiceWorkerSync';
import { OfflineFirstStorageManager } from '@/lib/storage/offlineFirstStorageManager';
import { useConnectionStatus } from '../useConnectionStatus';

// Mock dependencies
jest.mock('../useConnectionStatus');
jest.mock('@/lib/storage/offlineFirstStorageManager');

const mockUseConnectionStatus = useConnectionStatus as jest.MockedFunction<typeof useConnectionStatus>;
const MockOfflineFirstStorageManager = OfflineFirstStorageManager as jest.MockedClass<typeof OfflineFirstStorageManager>;

// Mock service worker
const mockServiceWorkerController = {
  postMessage: jest.fn()
};

const mockServiceWorkerRegistration = {
  sync: {
    register: jest.fn().mockResolvedValue(undefined)
  },
  update: jest.fn().mockResolvedValue(undefined)
};

Object.defineProperty(window.navigator, 'serviceWorker', {
  value: {
    controller: mockServiceWorkerController,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    ready: Promise.resolve(mockServiceWorkerRegistration)
  },
  configurable: true
});

// Mock SyncManager
Object.defineProperty(window, 'SyncManager', {
  value: function SyncManager() {},
  configurable: true
});

describe('useServiceWorkerSync', () => {
  let mockStorageManager: jest.Mocked<OfflineFirstStorageManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    mockStorageManager = {
      forceSyncToSupabase: jest.fn().mockResolvedValue(undefined),
      getSyncStats: jest.fn().mockResolvedValue({
        pendingCount: 5,
        failedCount: 2
      })
    } as any;

    mockUseConnectionStatus.mockReturnValue({
      isOnline: true,
      isSupabaseReachable: true,
      connectionQuality: 'good',
      lastChecked: Date.now(),
      checkConnection: jest.fn()
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('Service Worker Ready State', () => {
    it('should detect when service worker is ready', () => {
      const { result } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      expect(result.current.isServiceWorkerReady).toBe(true);
    });

    it('should detect when service worker is not available', () => {
      // Temporarily remove service worker
      const originalServiceWorker = navigator.serviceWorker;
      delete (navigator as any).serviceWorker;

      const { result } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      expect(result.current.isServiceWorkerReady).toBe(false);

      // Restore service worker
      Object.defineProperty(navigator, 'serviceWorker', {
        value: originalServiceWorker,
        configurable: true
      });
    });

    it('should detect when service worker controller is not available', () => {
      const originalController = navigator.serviceWorker.controller;
      (navigator.serviceWorker as any).controller = null;

      const { result } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      expect(result.current.isServiceWorkerReady).toBe(false);

      // Restore controller
      (navigator.serviceWorker as any).controller = originalController;
    });
  });

  describe('Auto-sync on Connection', () => {
    it('should trigger sync when coming back online', async () => {
      // Start offline
      mockUseConnectionStatus.mockReturnValue({
        isOnline: false,
        isSupabaseReachable: false,
        connectionQuality: 'offline',
        lastChecked: Date.now(),
        checkConnection: jest.fn()
      });

      const { rerender } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      // Go online
      mockUseConnectionStatus.mockReturnValue({
        isOnline: true,
        isSupabaseReachable: true,
        connectionQuality: 'good',
        lastChecked: Date.now(),
        checkConnection: jest.fn()
      });

      rerender();

      // Fast-forward past the auto-sync delay
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(mockStorageManager.forceSyncToSupabase).toHaveBeenCalled();
      });
    });

    it('should not trigger sync if already syncing', async () => {
      const { result } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      // Start a sync
      const syncPromise = result.current.requestSync();

      // Trigger auto-sync by going online
      mockUseConnectionStatus.mockReturnValue({
        isOnline: true,
        isSupabaseReachable: true,
        connectionQuality: 'good',
        lastChecked: Date.now(),
        checkConnection: jest.fn()
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await act(async () => {
        await syncPromise;
      });

      // Should only have been called once
      expect(mockStorageManager.forceSyncToSupabase).toHaveBeenCalledTimes(1);
    });

    it('should not trigger sync without storage manager', () => {
      const { rerender } = renderHook(() => useServiceWorkerSync(undefined));

      // Go online
      mockUseConnectionStatus.mockReturnValue({
        isOnline: true,
        isSupabaseReachable: true,
        connectionQuality: 'good',
        lastChecked: Date.now(),
        checkConnection: jest.fn()
      });

      rerender();

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      expect(mockStorageManager.forceSyncToSupabase).not.toHaveBeenCalled();
    });
  });

  describe('Manual Sync', () => {
    it('should perform direct sync when online', async () => {
      const { result } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      await act(async () => {
        await result.current.requestSync();
      });

      expect(mockStorageManager.forceSyncToSupabase).toHaveBeenCalled();
      expect(mockServiceWorkerController.postMessage).toHaveBeenCalledWith({
        type: 'SYNC_COMPLETED',
        data: { success: true, timestamp: expect.any(Number) }
      });
    });

    it('should queue for background sync when offline', async () => {
      mockUseConnectionStatus.mockReturnValue({
        isOnline: false,
        isSupabaseReachable: false,
        connectionQuality: 'offline',
        lastChecked: Date.now(),
        checkConnection: jest.fn()
      });

      const { result } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      await act(async () => {
        await result.current.requestSync();
      });

      expect(mockStorageManager.forceSyncToSupabase).not.toHaveBeenCalled();
      expect(mockServiceWorkerRegistration.sync.register).toHaveBeenCalledWith('supabase-sync');
    });

    it('should handle sync errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const syncError = new Error('Sync failed');
      mockStorageManager.forceSyncToSupabase.mockRejectedValue(syncError);

      const { result } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      await act(async () => {
        await result.current.requestSync();
      });

      expect(consoleError).toHaveBeenCalledWith('[SW-Hook] Sync failed:', syncError);
      expect(mockServiceWorkerController.postMessage).toHaveBeenCalledWith({
        type: 'SYNC_FAILED',
        data: { error: 'Sync failed', timestamp: expect.any(Number) }
      });

      consoleError.mockRestore();
    });

    it('should not sync if already syncing', async () => {
      const { result } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      // Start first sync (don't await)
      const firstSync = result.current.requestSync();
      
      // Try to start second sync immediately
      const secondSync = result.current.requestSync();

      await act(async () => {
        await Promise.all([firstSync, secondSync]);
      });

      // Should only have been called once
      expect(mockStorageManager.forceSyncToSupabase).toHaveBeenCalledTimes(1);
    });

    it('should handle missing storage manager gracefully', async () => {
      const { result } = renderHook(() => useServiceWorkerSync(undefined));

      await act(async () => {
        await result.current.requestSync();
      });

      // Should complete without error
      expect(mockStorageManager.forceSyncToSupabase).not.toHaveBeenCalled();
    });
  });

  describe('Sync Statistics', () => {
    it('should return sync stats from storage manager', async () => {
      const { result } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      const stats = await act(async () => {
        return await result.current.getSyncStats();
      });

      expect(stats).toEqual({
        pendingOperations: 5,
        failedOperations: 2,
        syncInProgress: false,
        lastSyncTime: undefined
      });

      expect(mockStorageManager.getSyncStats).toHaveBeenCalled();
    });

    it('should return default stats without storage manager', async () => {
      const { result } = renderHook(() => useServiceWorkerSync(undefined));

      const stats = await act(async () => {
        return await result.current.getSyncStats();
      });

      expect(stats).toEqual({
        pendingOperations: 0,
        failedOperations: 0,
        syncInProgress: false,
        lastSyncTime: undefined
      });
    });

    it('should handle storage manager errors', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      mockStorageManager.getSyncStats.mockRejectedValue(new Error('Stats error'));

      const { result } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      const stats = await act(async () => {
        return await result.current.getSyncStats();
      });

      expect(stats).toEqual({
        pendingOperations: 0,
        failedOperations: 0,
        syncInProgress: false
      });

      expect(consoleError).toHaveBeenCalledWith(
        '[SW-Hook] Failed to get sync stats:',
        expect.any(Error)
      );

      consoleError.mockRestore();
    });

    it('should track sync progress correctly', async () => {
      const { result } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      // Start and complete sync
      await act(async () => {
        await result.current.requestSync();
      });

      // Check stats after sync
      const statsAfterCompletion = await result.current.getSyncStats();
      expect(statsAfterCompletion.syncInProgress).toBe(false);
      expect(statsAfterCompletion.lastSyncTime).toBeDefined();
    });
  });

  describe('Clear Sync Queue', () => {
    it('should clear sync queue and notify service worker', async () => {
      const { result } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      await act(async () => {
        await result.current.clearSyncQueue();
      });

      expect(mockServiceWorkerController.postMessage).toHaveBeenCalledWith({
        type: 'CLEAR_SYNC_QUEUE'
      });
    });

    it('should handle missing storage manager gracefully', async () => {
      const { result } = renderHook(() => useServiceWorkerSync(undefined));

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      await act(async () => {
        await result.current.clearSyncQueue();
      });

      // Should complete without error but not post message (no storage manager)
      expect(mockServiceWorkerController.postMessage).not.toHaveBeenCalled();
    });
  });

  describe('Message Listeners', () => {
    it('should setup and cleanup message listeners', async () => {
      const { result, unmount } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      expect(navigator.serviceWorker.addEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );

      unmount();

      expect(navigator.serviceWorker.removeEventListener).toHaveBeenCalledWith(
        'message',
        expect.any(Function)
      );
    });

    it('should handle sync completed messages', async () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      const { result } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const messageHandler = (navigator.serviceWorker.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'message')?.[1];

      if (messageHandler) {
        act(() => {
          messageHandler({
            data: {
              type: 'SYNC_COMPLETED',
              data: { success: true, timestamp: Date.now() }
            }
          });
        });

        expect(consoleLog).toHaveBeenCalledWith('[SW-Hook] Background sync completed');
      }

      consoleLog.mockRestore();
    });

    it('should handle sync failed messages', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation();
      const { result } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const messageHandler = (navigator.serviceWorker.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'message')?.[1];

      if (messageHandler) {
        act(() => {
          messageHandler({
            data: {
              type: 'SYNC_FAILED',
              data: { error: 'Network error', timestamp: Date.now() }
            }
          });
        });

        expect(consoleError).toHaveBeenCalledWith('[SW-Hook] Background sync failed:', 'Network error');
      }

      consoleError.mockRestore();
    });

    it('should handle sync started messages', async () => {
      const consoleLog = jest.spyOn(console, 'log').mockImplementation();
      const { result } = renderHook(() => useServiceWorkerSync(mockStorageManager));

      // Wait for hook to initialize
      await waitFor(() => {
        expect(result.current).toBeTruthy();
      });

      const messageHandler = (navigator.serviceWorker.addEventListener as jest.Mock).mock.calls
        .find(call => call[0] === 'message')?.[1];

      if (messageHandler) {
        act(() => {
          messageHandler({
            data: {
              type: 'SYNC_STARTED',
              data: { timestamp: Date.now() }
            }
          });
        });

        expect(consoleLog).toHaveBeenCalledWith('[SW-Hook] Background sync started');
      }

      consoleLog.mockRestore();
    });
  });
});