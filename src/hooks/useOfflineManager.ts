import { useState, useEffect, useCallback } from 'react';
import { OfflineCacheManager } from '../lib/offline/offlineCacheManager';
import { storageManager } from '../lib/storage';
import { useAuth } from '../context/AuthContext';
import { useErrorHandler } from './useErrorHandler';
import type { OfflineStatus } from '../lib/offline/offlineCacheManager';

interface OfflineManagerState {
  isOnline: boolean;
  offlineStatus: OfflineStatus | null;
  cacheManager: OfflineCacheManager | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to manage offline capabilities and sync status
 */
export function useOfflineManager() {
  const { user } = useAuth();
  const { } = useErrorHandler();
  const [state, setState] = useState<OfflineManagerState>({
    isOnline: navigator.onLine,
    offlineStatus: null,
    cacheManager: null,
    isLoading: true,
    error: null,
  });

  // Initialize offline cache manager
  useEffect(() => {
    try {
      const cacheManager = new OfflineCacheManager(storageManager);
      
      // Set user context for cache namespacing
      if (user) {
        cacheManager.setUserId(user.id);
      }

      setState(prev => ({
        ...prev,
        cacheManager,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Failed to initialize offline manager:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to initialize offline manager',
        isLoading: false,
      }));
    }
  }, [user]);

  // Update offline status
  const updateOfflineStatus = useCallback(async () => {
    if (!state.cacheManager) return;

    try {
      const offlineStatus = await state.cacheManager.getOfflineStatus();
      setState(prev => ({
        ...prev,
        offlineStatus,
        isOnline: offlineStatus.isOnline,
      }));
    } catch (error) {
      console.error('Failed to get offline status:', error);
    }
  }, [state.cacheManager]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      updateOfflineStatus();
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      updateOfflineStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status check
    updateOfflineStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateOfflineStatus]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!state.cacheManager || !state.isOnline) return;

    try {
      // Trigger background sync via service worker
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'SYNC_DATA'
        });
      }

      // Update status after sync attempt
      setTimeout(updateOfflineStatus, 1000);
    } catch (error) {
      console.error('Failed to trigger sync:', error);
    }
  }, [state.cacheManager, state.isOnline, updateOfflineStatus]);

  // Clear offline data
  const clearOfflineData = useCallback(async () => {
    if (!state.cacheManager) return;

    try {
      await state.cacheManager.clearOfflineData();
      updateOfflineStatus();
    } catch (error) {
      console.error('Failed to clear offline data:', error);
    }
  }, [state.cacheManager, updateOfflineStatus]);

  // Get cached data size estimate
  const getCacheSize = useCallback(async (): Promise<number> => {
    if (!state.cacheManager) return 0;

    try {
      // This would need to be implemented in the cache manager
      // For now, return 0
      return 0;
    } catch (error) {
      console.error('Failed to get cache size:', error);
      return 0;
    }
  }, [state.cacheManager]);

  return {
    isOnline: state.isOnline,
    offlineStatus: state.offlineStatus,
    cacheManager: state.cacheManager,
    isLoading: state.isLoading,
    error: state.error,
    
    // Actions
    triggerSync,
    clearOfflineData,
    getCacheSize,
    updateOfflineStatus,
    
    // Computed values
    hasOfflineData: state.offlineStatus?.hasOfflineData ?? false,
    syncQueueSize: state.offlineStatus?.syncQueueSize ?? 0,
    needsSync: (state.offlineStatus?.syncQueueSize ?? 0) > 0,
  };
}