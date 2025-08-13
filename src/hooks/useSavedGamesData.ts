'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SavedGame } from '@/types';
import { listGames } from '@/utils/savedGames';
import logger from '@/utils/logger';

export interface SavedGamesData {
  games: SavedGame[];
  isLoading: boolean;
  isError: boolean;
  hasTimedOut: boolean;
  refetch: () => void;
}

/**
 * Pre-warm hook for saved games data.
 * Fetches saved games list with React Query caching.
 * Designed to be called immediately after auth to warm the cache.
 */
export function useSavedGamesData(options?: { pauseRefetch?: boolean }) {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const query = useQuery({
    queryKey: ['savedGames'],
    queryFn: listGames,
    staleTime: 2 * 60 * 1000, // 2 minutes (more frequently updated than roster)
    gcTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: !options?.pauseRefetch,
    refetchInterval: options?.pauseRefetch ? false : 5 * 60 * 1000, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  const { data: games, isLoading, isError, refetch } = query;

  // Timeout handling - 5 seconds for saved games
  useEffect(() => {
    if (isLoading && !hasTimedOut) {
      timeoutRef.current = setTimeout(() => {
        setHasTimedOut(true);
        logger.warn('[useSavedGamesData] Background data fetch timed out after 5 seconds');
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
    performance.mark('saved-games-data-requested');
    if (!isLoading) {
      performance.mark('saved-games-data-loaded');
      try {
        performance.measure(
          'saved-games-data-duration',
          'saved-games-data-requested',
          'saved-games-data-loaded'
        );
      } catch {
        // Marks might not exist in all scenarios
      }
    }
  }

  const result: SavedGamesData = {
    games: Array.isArray(games) ? games : [],
    isLoading,
    isError,
    hasTimedOut,
    refetch,
  };

  // Log cache performance
  if (!isLoading) {
    logger.debug('[useSavedGamesData] Data loaded:', {
      gameCount: result.games.length,
      fromCache: !query.isFetching,
    });
  }

  return result;
}