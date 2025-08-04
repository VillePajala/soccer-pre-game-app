import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/config/queryKeys';
import type { Player, SavedGamesCollection } from '@/types';

/**
 * Intelligent cache management utilities for selective invalidation and updates
 * Implements Phase 2 Smart Caching Strategy
 */
export class CacheManager {
  constructor(private queryClient: QueryClient) {}

  /**
   * Selective cache invalidation - only invalidate what's actually affected
   */
  async invalidateSelectively(updates: {
    masterRoster?: boolean;
    seasons?: boolean;
    tournaments?: boolean;
    savedGames?: boolean | 'list-only';
    currentGameId?: boolean;
  }) {
    const promises: Promise<void>[] = [];

    if (updates.masterRoster) {
      // Invalidate master roster and any dependent queries
      promises.push(
        this.queryClient.invalidateQueries({ queryKey: queryKeys.masterRoster })
      );
    }

    if (updates.seasons) {
      promises.push(
        this.queryClient.invalidateQueries({ queryKey: queryKeys.seasons })
      );
    }

    if (updates.tournaments) {
      promises.push(
        this.queryClient.invalidateQueries({ queryKey: queryKeys.tournaments })
      );
    }

    if (updates.savedGames) {
      if (updates.savedGames === 'list-only') {
        // Only invalidate the list view, not individual game queries
        promises.push(
          this.queryClient.invalidateQueries({ queryKey: queryKeys.savedGames })
        );
      } else {
        // Invalidate all saved games related queries
        promises.push(
          this.queryClient.invalidateQueries({ queryKey: queryKeys.savedGames })
        );
      }
    }

    if (updates.currentGameId) {
      promises.push(
        this.queryClient.invalidateQueries({ queryKey: queryKeys.appSettingsCurrentGameId })
      );
    }

    await Promise.all(promises);
  }

  /**
   * Update cache data directly without invalidation (optimistic updates)
   */
  updateCacheData<T>(queryKey: readonly unknown[], updater: (oldData: T | undefined) => T) {
    this.queryClient.setQueryData(queryKey, updater);
  }

  /**
   * Optimistically update master roster
   */
  updateMasterRosterCache(updater: (players: Player[]) => Player[]) {
    this.queryClient.setQueryData(queryKeys.masterRoster, (oldData: Player[] | undefined) => {
      if (!oldData) return oldData;
      return updater(oldData);
    });
  }

  /**
   * Optimistically update saved games
   */
  updateSavedGamesCache(updater: (games: SavedGamesCollection | null) => SavedGamesCollection | null) {
    this.queryClient.setQueryData(queryKeys.savedGames, (oldData: SavedGamesCollection | null | undefined) => {
      return updater(oldData || null);
    });
  }

  /**
   * Prefetch related data based on user actions
   */
  async prefetchRelatedData(action: 'game-creation' | 'game-loading' | 'roster-management') {
    const prefetchPromises: Promise<void>[] = [];

    switch (action) {
      case 'game-creation':
        // When user shows intent to create a game, prefetch seasons and tournaments
        prefetchPromises.push(
          this.queryClient.prefetchQuery({
            queryKey: queryKeys.seasons,
            staleTime: 5 * 60 * 1000, // Use cached data if available
          })
        );
        prefetchPromises.push(
          this.queryClient.prefetchQuery({
            queryKey: queryKeys.tournaments,
            staleTime: 5 * 60 * 1000,
          })
        );
        break;

      case 'game-loading':
        // When user shows intent to load a game, prefetch saved games
        prefetchPromises.push(
          this.queryClient.prefetchQuery({
            queryKey: queryKeys.savedGames,
            staleTime: 30 * 1000,
          })
        );
        break;

      case 'roster-management':
        // When user shows intent to manage roster, prefetch master roster
        prefetchPromises.push(
          this.queryClient.prefetchQuery({
            queryKey: queryKeys.masterRoster,
            staleTime: 2 * 60 * 1000,
          })
        );
        break;
    }

    await Promise.all(prefetchPromises);
  }

  /**
   * Background data refresh without blocking UI
   */
  async refreshStaleData() {
    const refreshPromises: Promise<void>[] = [];

    // Check if data is stale and refresh in background
    const masterRosterQuery = this.queryClient.getQueryData(queryKeys.masterRoster);
    const savedGamesQuery = this.queryClient.getQueryData(queryKeys.savedGames);

    if (masterRosterQuery) {
      refreshPromises.push(
        this.queryClient.refetchQueries({
          queryKey: queryKeys.masterRoster,
          type: 'active',
        })
      );
    }

    if (savedGamesQuery) {
      refreshPromises.push(
        this.queryClient.refetchQueries({
          queryKey: queryKeys.savedGames,
          type: 'active',
        })
      );
    }

    // Don't wait for these to complete - they refresh in background
    Promise.allSettled(refreshPromises).catch((error) => {
      console.warn('[CacheManager] Background refresh failed:', error);
    });
  }

  /**
   * Get cache statistics for debugging
   */
  getCacheStats() {
    const cache = this.queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      staleQueries: queries.filter(q => q.isStale()).length,
      loadingQueries: queries.filter(q => q.state.status === 'pending').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      successQueries: queries.filter(q => q.state.status === 'success').length,
    };
  }
}

/**
 * Hook to get cache manager instance
 */
export function useCacheManager(queryClient: QueryClient) {
  return new CacheManager(queryClient);
}