import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authAwareStorageManager } from '../lib/storage/authAwareStorageManager';

/**
 * Hook that automatically configures storage based on authentication state
 */
export function useAuthAwareStorage() {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      const isAuthenticated = Boolean(user);
      const userId = user?.id || null;
      
      authAwareStorageManager.updateAuthState(isAuthenticated, userId);
    }
  }, [user, loading]);

  return {
    storageManager: authAwareStorageManager,
    isAuthenticated: Boolean(user),
    userId: user?.id || null,
    loading,
  };
}