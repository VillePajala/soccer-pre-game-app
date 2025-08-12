// Client-side admin authentication hook
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { isUserAdmin, AdminRole, hasAdminRole } from '@/lib/auth/adminAuth';

export interface AdminAuthState {
  isAdmin: boolean;
  isLoading: boolean;
  user: any;
  role?: AdminRole;
  hasRole: (role: AdminRole) => boolean;
  checkingAuth: boolean;
}

export function useAdminAuth(): AdminAuthState {
  const { user, loading } = useAuth();
  const [checkingAuth, setCheckingAuth] = useState(true);
  
  useEffect(() => {
    if (!loading) {
      // Small delay to ensure user data is fully loaded
      setTimeout(() => setCheckingAuth(false), 100);
    }
  }, [loading]);
  
  const isAdmin = user ? isUserAdmin(user) : false;
  const role = user?.user_metadata?.role || user?.app_metadata?.role;
  
  const hasRole = (requiredRole: AdminRole): boolean => {
    return hasAdminRole(user, requiredRole);
  };
  
  return {
    isAdmin,
    isLoading: loading || checkingAuth,
    user,
    role,
    hasRole,
    checkingAuth
  };
}

// Helper hook for protecting admin components
export function useRequireAdmin() {
  const adminAuth = useAdminAuth();
  const [hasTriedLogin, setHasTriedLogin] = useState(false);
  
  // Track when user logs in but is not admin
  const shouldShowLogin = !adminAuth.isLoading && !adminAuth.isAdmin;
  const showAccessDenied = !adminAuth.isLoading && adminAuth.user && !adminAuth.isAdmin;
  
  return {
    ...adminAuth,
    canAccess: adminAuth.isAdmin,
    shouldShowLogin: shouldShowLogin && !showAccessDenied,
    showAccessDenied,
    hasTriedLogin,
    setHasTriedLogin
  };
}