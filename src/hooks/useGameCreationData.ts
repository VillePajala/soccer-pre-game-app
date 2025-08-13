'use client';

import { useState, useRef, useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Season, Tournament } from '@/types';
import { getSeasons } from '@/utils/seasons';
import { getTournaments } from '@/utils/tournaments';
import { getLastHomeTeamName } from '@/utils/appSettings';
import { isAuthenticationError } from '@/utils/authErrorUtils';
import logger from '@/utils/logger';
import { performanceMetrics } from '@/utils/performanceMetrics';

export interface GameCreationData {
  seasons: Season[];
  tournaments: Tournament[];
  lastHomeTeamName: string;
  isLoading: boolean;
  isError: boolean;
  cacheHitRate: number;
  hasTimedOut: boolean;
  refetch: () => void;
}

/**
 * Pre-warm hook for game creation data.
 * Fetches seasons, tournaments, and last team name with React Query caching.
 * Designed to be called immediately after auth to warm the cache.
 */
export function useGameCreationData(options?: { pauseRefetch?: boolean }) {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const queries = useQueries({
    queries: [
      {
        queryKey: ['seasons'],
        queryFn: async () => {
          try {
            return await getSeasons();
          } catch (error) {
            // Handle auth errors gracefully - return empty array instead of retrying forever
            if (isAuthenticationError(error)) {
              logger.warn('[useGameCreationData] Auth error fetching seasons, returning empty array');
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
      },
      {
        queryKey: ['tournaments'],
        queryFn: async () => {
          try {
            return await getTournaments();
          } catch (error) {
            // Handle auth errors gracefully - return empty array instead of retrying forever
            if (isAuthenticationError(error)) {
              logger.warn('[useGameCreationData] Auth error fetching tournaments, returning empty array');
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
      },
      {
        queryKey: ['lastHomeTeamName'],
        queryFn: async () => {
          try {
            return await getLastHomeTeamName();
          } catch (error) {
            // Handle auth errors gracefully - return default team name
            if (isAuthenticationError(error)) {
              logger.warn('[useGameCreationData] Auth error fetching last team name, returning default');
              return 'My Team';
            }
            // Re-throw other errors
            throw error;
          }
        },
        staleTime: 30 * 60 * 1000, // 30 minutes (less frequently updated)
        gcTime: 60 * 60 * 1000, // 1 hour
        refetchOnWindowFocus: !options?.pauseRefetch,
        refetchInterval: options?.pauseRefetch ? false : 30 * 60 * 1000, // 30 minutes
        retry: (failureCount, error) => {
          // Don't retry auth errors
          if (isAuthenticationError(error)) {
            return false;
          }
          // Only retry once for settings
          return failureCount < 1;
        },
        retryDelay: 2000,
      },
    ],
  });

  const [seasonsQuery, tournamentsQuery, lastTeamNameQuery] = queries;

  // Calculate cache hit rate (data available without loading)
  const cacheHits = queries.filter(q => !q.isLoading && q.data !== undefined).length;
  const cacheHitRate = (cacheHits / queries.length) * 100;

  const isLoading = queries.some(q => q.isLoading);
  const isError = queries.some(q => q.isError);

  // Timeout handling - 8 seconds for background data hydration
  useEffect(() => {
    if (isLoading && !hasTimedOut) {
      timeoutRef.current = setTimeout(() => {
        setHasTimedOut(true);
        logger.warn('[useGameCreationData] Background data fetch timed out after 8 seconds');
      }, 8000);
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

  // Refetch function for manual retry
  const refetch = () => {
    setHasTimedOut(false);
    queries.forEach(query => query.refetch());
  };

  // Log performance metrics
  if (typeof performance !== 'undefined') {
    performance.mark('game-creation-data-requested');
    if (!isLoading) {
      performance.mark('game-creation-data-loaded');
      try {
        performance.measure(
          'game-creation-data-duration',
          'game-creation-data-requested',
          'game-creation-data-loaded'
        );
      } catch {
        // Marks might not exist in all scenarios
      }
    }
  }

  const result: GameCreationData = {
    seasons: Array.isArray(seasonsQuery.data) ? seasonsQuery.data : [],
    tournaments: Array.isArray(tournamentsQuery.data) ? tournamentsQuery.data : [],
    lastHomeTeamName: lastTeamNameQuery.data || 'My Team',
    isLoading,
    isError,
    cacheHitRate,
    hasTimedOut,
    refetch,
  };

  // Log cache performance and record metrics
  if (!isLoading) {
    logger.debug('[useGameCreationData] Cache performance:', {
      cacheHitRate: `${cacheHitRate.toFixed(1)}%`,
      seasonsFromCache: !seasonsQuery.isLoading,
      tournamentsFromCache: !tournamentsQuery.isLoading,
      lastTeamNameFromCache: !lastTeamNameQuery.isLoading,
    });
    
    // Record cache hit rate for monitoring
    performanceMetrics.recordCacheHitRate(cacheHitRate);
  }

  return result;
}