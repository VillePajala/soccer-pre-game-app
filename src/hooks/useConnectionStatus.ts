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
    isOnline: navigator.onLine,
    isSupabaseReachable: false,
    lastChecked: Date.now(),
    connectionQuality: navigator.onLine ? 'good' : 'offline'
  });

  /**
   * Test Supabase connectivity by making a lightweight request
   */
  const checkSupabaseConnection = useCallback(async (): Promise<boolean> => {
    if (!navigator.onLine) return false;

    try {
      // Create a simple fetch to Supabase REST API health check
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) return false;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      return response.ok || response.status === 401; // 401 is fine, means auth is working
    } catch {
      // Network error, timeout, or abort
      return false;
    }
  }, []);

  /**
   * Determine connection quality based on response time
   */
  const testConnectionQuality = useCallback(async (): Promise<'good' | 'poor' | 'offline'> => {
    if (!navigator.onLine) return 'offline';

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
    const isOnline = navigator.onLine;
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

    // Periodic connection check every 30 seconds when online
    const intervalId = setInterval(() => {
      if (navigator.onLine) {
        updateStatus();
      }
    }, 30000);

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