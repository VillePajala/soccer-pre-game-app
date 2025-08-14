'use client';

import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

/**
 * Hook to warm up Supabase connection after authentication.
 * This prevents cold-start penalties on first data fetches.
 */
export function useSupabaseWarmup(isAuthenticated: boolean) {
  const hasWarmedUp = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !hasWarmedUp.current) {
      hasWarmedUp.current = true;
      
      // Perform a lightweight ping to warm up the connection
      const warmupConnection = async () => {
        try {
          const startTime = performance.now();
          
          // Perform a simple auth check to warm up TLS/JIT/DB path
          const { data: { user: _user }, error } = await supabase.auth.getUser();
          
          const endTime = performance.now();
          const duration = endTime - startTime;
          
          if (error) {
            logger.warn('[useSupabaseWarmup] Failed to warm connection:', error);
          } else {
            logger.debug(`[useSupabaseWarmup] Connection warmed in ${duration.toFixed(2)}ms`);
            
            // Mark performance for monitoring
            if (typeof performance !== 'undefined' && performance.mark) {
              performance.mark('supabase-connection-warmed');
              performance.measure(
                'supabase-warmup-duration',
                { start: startTime, end: endTime }
              );
            }
          }
        } catch (error) {
          logger.error('[useSupabaseWarmup] Error warming connection:', error);
        }
      };

      // Small delay to not interfere with initial page render
      setTimeout(warmupConnection, 100);
    }
  }, [isAuthenticated]);

  // Reset on logout
  useEffect(() => {
    if (!isAuthenticated) {
      hasWarmedUp.current = false;
    }
  }, [isAuthenticated]);
}