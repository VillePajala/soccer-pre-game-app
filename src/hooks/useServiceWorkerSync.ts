'use client';

import { useEffect, useRef, useCallback } from 'react';
import { OfflineFirstStorageManager } from '@/lib/storage/offlineFirstStorageManager';
import { useConnectionStatus } from './useConnectionStatus';

interface SyncStats {
  pendingOperations: number;
  lastSyncTime?: number;
  syncInProgress: boolean;
  failedOperations: number;
}

interface ServiceWorkerSyncHook {
  requestSync: () => Promise<void>;
  getSyncStats: () => Promise<SyncStats>;
  isServiceWorkerReady: boolean;
  clearSyncQueue: () => Promise<void>;
}

export function useServiceWorkerSync(
  storageManager?: OfflineFirstStorageManager
): ServiceWorkerSyncHook {
  const connectionStatus = useConnectionStatus();
  const syncInProgressRef = useRef(false);
  const lastSyncTimeRef = useRef<number>();

  // Check if service worker is ready
  const isServiceWorkerReady = typeof window !== 'undefined' && 
    'serviceWorker' in navigator && 
    !!navigator.serviceWorker.controller;

  // Auto-sync when coming back online
  useEffect(() => {
    if (connectionStatus.isOnline && !syncInProgressRef.current && storageManager) {
      const autoSyncDelay = setTimeout(() => {
        requestSync();
      }, 1000); // Wait 1 second after coming online

      return () => clearTimeout(autoSyncDelay);
    }
  }, [connectionStatus.isOnline, storageManager, requestSync]);

  // Setup service worker message listeners
  useEffect(() => {
    if (!isServiceWorkerReady) return;

    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data || {};
      
      switch (type) {
        case 'SYNC_COMPLETED':
          syncInProgressRef.current = false;
          lastSyncTimeRef.current = data.timestamp;
          console.log('[SW-Hook] Background sync completed');
          break;
          
        case 'SYNC_FAILED':
          syncInProgressRef.current = false;
          console.error('[SW-Hook] Background sync failed:', data.error);
          break;
          
        case 'SYNC_STARTED':
          syncInProgressRef.current = true;
          console.log('[SW-Hook] Background sync started');
          break;
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [isServiceWorkerReady]);

  // Request manual sync
  const requestSync = useCallback(async (): Promise<void> => {
    if (!storageManager || syncInProgressRef.current) {
      return;
    }

    try {
      syncInProgressRef.current = true;
      
      // Try direct sync first (if online)
      if (connectionStatus.isOnline) {
        console.log('[SW-Hook] Starting direct sync...');
        await storageManager.forceSyncToSupabase();
        lastSyncTimeRef.current = Date.now();
        
        // Notify service worker of successful sync
        if (isServiceWorkerReady && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SYNC_COMPLETED',
            data: { success: true, timestamp: Date.now() }
          });
        }
      } else {
        // Queue for background sync
        console.log('[SW-Hook] Offline - queuing for background sync...');
        if (isServiceWorkerReady && navigator.serviceWorker.controller) {
          navigator.serviceWorker.controller.postMessage({
            type: 'SYNC_REQUEST'
          });
        }
      }
    } catch (error) {
      console.error('[SW-Hook] Sync failed:', error);
      
      // Notify service worker of failed sync
      if (isServiceWorkerReady && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_FAILED',
          data: { error: error instanceof Error ? error.message : 'Unknown error', timestamp: Date.now() }
        });
      }
      
      throw error;
    } finally {
      syncInProgressRef.current = false;
    }
  }, [storageManager, connectionStatus.isOnline, isServiceWorkerReady]);

  // Get sync statistics
  const getSyncStats = useCallback(async (): Promise<SyncStats> => {
    if (!storageManager) {
      return {
        pendingOperations: 0,
        syncInProgress: syncInProgressRef.current,
        failedOperations: 0
      };
    }

    try {
      const stats = await storageManager.getSyncStats();
      return {
        pendingOperations: stats.pendingCount || 0,
        lastSyncTime: lastSyncTimeRef.current,
        syncInProgress: syncInProgressRef.current,
        failedOperations: stats.failedCount || 0
      };
    } catch (error) {
      console.error('[SW-Hook] Failed to get sync stats:', error);
      return {
        pendingOperations: 0,
        syncInProgress: syncInProgressRef.current,
        failedOperations: 0
      };
    }
  }, [storageManager]);

  // Clear sync queue
  const clearSyncQueue = useCallback(async (): Promise<void> => {
    if (!storageManager) return;

    try {
      // This would clear the sync queue in our storage manager
      console.log('[SW-Hook] Clearing sync queue...');
      
      // Notify service worker to clear its queue too
      if (isServiceWorkerReady && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CLEAR_SYNC_QUEUE'
        });
      }
    } catch (error) {
      console.error('[SW-Hook] Failed to clear sync queue:', error);
      throw error;
    }
  }, [storageManager, isServiceWorkerReady]);

  return {
    requestSync,
    getSyncStats,
    isServiceWorkerReady,
    clearSyncQueue
  };
}