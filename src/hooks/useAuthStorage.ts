'use client';

import { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authAwareStorageManager } from '@/lib/storage';
import { AuthAwareStorageManager } from '@/lib/storage/authAwareStorageManager';
import { OfflineCacheManager } from '@/lib/offline/offlineCacheManager';

/**
 * Hook to synchronize auth state with storage manager
 */
export function useAuthStorage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      console.log('[useAuthStorage] Auth state sync:', { 
        userEmail: user?.email, 
        userId: user?.id, 
        isAuthenticated: !!user 
      });
      
      // Get the base manager (might be wrapped in offline cache)
      let manager = authAwareStorageManager;
      
      // If wrapped in offline cache, get the primary provider
      if (manager instanceof OfflineCacheManager) {
        const offlineManager = manager as OfflineCacheManager;
        manager = (offlineManager as unknown as { primaryProvider: AuthAwareStorageManager }).primaryProvider;
      }
      
      // Update auth state if it's an AuthAwareStorageManager
      if (manager instanceof AuthAwareStorageManager) {
        console.log('[useAuthStorage] Updating auth state in manager');
        manager.updateAuthState(!!user, user?.id || null);
      }
      
      // Also update offline cache manager with user ID if applicable
      if (authAwareStorageManager instanceof OfflineCacheManager) {
        authAwareStorageManager.setUserId(user?.id || null);
      }
    }
  }, [user, loading]);

  return {
    isAuthenticated: !!user,
    userId: user?.id || null
  };
}