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
    // Always sync auth state, even during loading
    
    // Update auth state through a stable API even if wrapped
    const update = (mgr: unknown) => {
      if (mgr instanceof AuthAwareStorageManager) {
        mgr.updateAuthState(!!user, user?.id || null);
        return true;
      }
      if (mgr instanceof OfflineCacheManager) {
        // The OfflineCacheManager proxies to the primary provider via a public method
        (mgr as OfflineCacheManager).setUserId(user?.id || null);
        // Try to reach inner provider if available
        const inner = (mgr as unknown as { primaryProvider?: unknown }).primaryProvider;
        if (inner) return update(inner);
      }
      return false;
    };
    update(authAwareStorageManager);
    
    // Also update offline cache manager with user ID if applicable
    if (authAwareStorageManager instanceof OfflineCacheManager) {
      authAwareStorageManager.setUserId(user?.id || null);
    }
  }, [user, loading]);

  return {
    isAuthenticated: !!user,
    userId: user?.id || null
  };
}