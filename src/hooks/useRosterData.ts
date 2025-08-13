'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Player } from '@/types';
import { getMasterRoster } from '@/utils/masterRoster';
import { isAuthenticationError } from '@/utils/authErrorUtils';
import logger from '@/utils/logger';

export interface RosterData {
  players: Player[];
  isLoading: boolean;
  isError: boolean;
  hasTimedOut: boolean;
  refetch: () => void;
}

/**
 * Pre-warm hook for roster data.
 * Fetches master roster with React Query caching.
 * Designed to be called immediately after auth to warm the cache.
 */
export function useRosterData(options?: { pauseRefetch?: boolean }) {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const query = useQuery({
    queryKey: ['masterRoster'],
    queryFn: async () => {
      try {
        return await getMasterRoster();
      } catch (error) {
        // Handle auth errors gracefully - return empty array instead of retrying forever
        if (isAuthenticationError(error)) {
          logger.warn('[useRosterData] Auth error fetching roster, returning empty array');
          return [];
        }
        // Re-throw other errors
        throw error;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    refetchOnWindowFocus: !options?.pauseRefetch,
    refetchInterval: options?.pauseRefetch ? false : 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry auth errors
      if (isAuthenticationError(error)) {
        return false;
      }
      // Only retry network errors up to 2 times
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const { data: players, isLoading, isError, refetch } = query;

  // Timeout handling - 5 seconds for roster data
  useEffect(() => {
    if (isLoading && !hasTimedOut) {
      timeoutRef.current = setTimeout(() => {
        setHasTimedOut(true);
        logger.warn('[useRosterData] Background data fetch timed out after 5 seconds');
      }, 5000);
    } else {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isLoading, hasTimedOut]);

  // Reset timeout when data arrives
  useEffect(() => {
    if (!isLoading && hasTimedOut) {
      setHasTimedOut(false);
    }
  }, [isLoading, hasTimedOut]);

  // Log performance metrics
  if (typeof performance !== 'undefined') {
    performance.mark('roster-data-requested');
    if (!isLoading) {
      performance.mark('roster-data-loaded');
      try {
        performance.measure(
          'roster-data-duration',
          'roster-data-requested',
          'roster-data-loaded'
        );
      } catch {
        // Marks might not exist in all scenarios
      }
    }
  }

  const result: RosterData = {
    players: Array.isArray(players) ? players : [],
    isLoading,
    isError,
    hasTimedOut,
    refetch,
  };

  // Log cache performance
  if (!isLoading) {
    logger.debug('[useRosterData] Data loaded:', {
      playerCount: result.players.length,
      fromCache: !query.isFetching,
    });
  }

  return result;
}