'use client';

import { useAuthStorage } from '@/hooks/useAuthStorage';

/**
 * Component to ensure auth state is synced with storage manager
 * Should be placed high in the component tree, after AuthProvider
 */
export default function AuthStorageSync() {
  // This hook syncs auth state with storage manager
  useAuthStorage();
  
  // This component doesn't render anything
  return null;
}