import { useAuth } from '../context/AuthContext';
import { useCallback } from 'react';

/**
 * Additional authentication helper hooks
 */
export function useAuthHelpers() {
  const { user, loading } = useAuth();

  const isAuthenticated = useCallback(() => {
    return !loading && user !== null;
  }, [loading, user]);

  const isAnonymous = useCallback(() => {
    return !loading && user === null;
  }, [loading, user]);

  const getUserId = useCallback(() => {
    return user?.id || null;
  }, [user]);

  const getUserEmail = useCallback(() => {
    return user?.email || null;
  }, [user]);

  const isEmailVerified = useCallback(() => {
    return user?.email_confirmed_at !== undefined;
  }, [user]);

  return {
    isAuthenticated,
    isAnonymous,
    getUserId,
    getUserEmail,
    isEmailVerified,
    user,
    loading,
  };
}