import { useState, useEffect, useCallback } from 'react';

export interface ConnectionStatus {
  isOnline: boolean;
  isSupabaseReachable: boolean;
  lastChecked: number;
  connectionQuality: 'good' | 'poor' | 'offline';
}

/**
 * Hook to monitor network connection status and Supabase reachability
 */
export const useConnectionStatus = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    isOnline: typeof window !== 'undefined' ? navigator.onLine : false,
    isSupabaseReachable: false,
    lastChecked: Date.now(),
    connectionQuality: typeof window !== 'undefined' ? (navigator.onLine ? 'good' : 'offline') : 'offline'
  });

  // Cache connectivity result for 2 minutes to avoid excessive checks
  const [lastConnectivityCheck, setLastConnectivityCheck] = useState<{
    timestamp: number;
    result: boolean;
  }>({ timestamp: 0, result: false });

  /**
   * Test Supabase connectivity by making a lightweight request with caching
   */
  const checkSupabaseConnection = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || !navigator.onLine) return false;

    // Use cached result if less than 2 minutes old
    const now = Date.now();
    if (now - lastConnectivityCheck.timestamp < 2 * 60 * 1000) {
      return lastConnectivityCheck.result;
    }

    try {
      // Create a simple fetch to check if Supabase domain is reachable
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) return false;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      // Use a simple connectivity test that doesn't require authentication
      // Just test if we can reach the domain - any response (even 404) means it's reachable
      await fetch(`${supabaseUrl}/`, {
        method: 'HEAD', // HEAD request to minimize data transfer
        mode: 'no-cors', // Avoid CORS issues for connectivity test
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      
      // Cache successful result
      setLastConnectivityCheck({ timestamp: now, result: true });
      return true;
    } catch (error) {
      // Network error, timeout, DNS failure, or abort
      console.debug('[useConnectionStatus] Supabase connectivity test failed:', error);
      
      // Cache failed result
      setLastConnectivityCheck({ timestamp: now, result: false });
      return false;
    }
  }, [lastConnectivityCheck]);

  /**
   * Determine connection quality based on response time
   */
  const testConnectionQuality = useCallback(async (): Promise<'good' | 'poor' | 'offline'> => {
    if (typeof window === 'undefined' || !navigator.onLine) return 'offline';

    const startTime = Date.now();
    const isReachable = await checkSupabaseConnection();
    const responseTime = Date.now() - startTime;

    if (!isReachable) return 'offline';
    if (responseTime > 2000) return 'poor'; // > 2 seconds is poor
    return 'good';
  }, [checkSupabaseConnection]);

  /**
   * Update connection status
   */
  const updateStatus = useCallback(async () => {
    const isOnline = typeof window !== 'undefined' ? navigator.onLine : false;
    const isSupabaseReachable = isOnline ? await checkSupabaseConnection() : false;
    const connectionQuality = await testConnectionQuality();

    setStatus({
      isOnline,
      isSupabaseReachable,
      lastChecked: Date.now(),
      connectionQuality
    });
  }, [checkSupabaseConnection, testConnectionQuality]);

  /**
   * Force a connection check
   */
  const checkConnection = useCallback(async () => {
    await updateStatus();
  }, [updateStatus]);

  // Set up event listeners for online/offline events
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      // Check Supabase connection when coming back online
      updateStatus();
    };

    const handleOffline = () => {
      setStatus({
        isOnline: false,
        isSupabaseReachable: false,
        lastChecked: Date.now(),
        connectionQuality: 'offline'
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial connection check
    updateStatus();

    // Periodic connection check every 5 minutes when online (reduced frequency)
    const intervalId = setInterval(() => {
      if (typeof window !== 'undefined' && navigator.onLine) {
        updateStatus();
      }
    }, 5 * 60 * 1000); // 5 minutes instead of 1 minute

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [updateStatus]);

  return {
    ...status,
    checkConnection
  };
};