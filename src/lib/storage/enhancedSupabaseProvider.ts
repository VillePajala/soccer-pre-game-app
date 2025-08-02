// Enhanced Supabase provider with Phase 4 performance optimizations
import { SupabaseProvider } from './supabaseProvider';
import type { Player } from '../../types';
import type { AppSettings } from '../../utils/appSettings';
import { batchOperationManager } from './batchOperations';
import { smartSyncManager } from './smartSync';
import { requestDebouncer } from './requestDebouncer';
import { compressionManager } from './compressionUtils';
import { NetworkError } from './types';

/**
 * Enhanced Supabase Provider with Phase 4 Storage Performance Optimizations
 * Extends the base SupabaseProvider with batch operations, smart sync, debouncing, and compression
 */
export class EnhancedSupabaseProvider extends SupabaseProvider {
  
  getProviderName(): string {
    return 'enhanced-supabase';
  }

  /**
   * Batch save multiple players at once for better performance
   */
  async batchSavePlayers(players: Player[]): Promise<Player[]> {
    if (players.length === 0) return [];
    
    try {
      return await batchOperationManager.batchUpdatePlayers(players);
    } catch (error) {
      throw new NetworkError('supabase', 'batchSavePlayers', error as Error);
    }
  }

  /**
   * Save player with debouncing for rapid successive updates
   */
  async savePlayerDebounced(player: Player): Promise<Record<string, unknown>> {
    const result = await requestDebouncer.debouncedPlayerUpdate(
      player.id,
      player as unknown as Record<string, unknown>,
      async (playerId: string, playerData: Record<string, unknown>) => {
        const result = await this.savePlayer(playerData as unknown as Player);
        return result as unknown as Record<string, unknown>;
      }
    );
    return result as Record<string, unknown>;
  }

  /**
   * Batch save game session data (game + players + events + assessments)
   */
  async saveGameSessionBatch(gameId: string, data: {
    game?: Record<string, unknown>;
    players?: Player[];
    events?: Record<string, unknown>[];
    assessments?: Record<string, unknown>[];
    settings?: Partial<AppSettings>;
  }): Promise<Record<string, unknown>> {
    try {
      return await batchOperationManager.saveGameSession(gameId, data);
    } catch (error) {
      throw new NetworkError('supabase', 'saveGameSessionBatch', error as Error);
    }
  }

  /**
   * Save game with debouncing for auto-save scenarios
   */
  async saveGameDebounced(gameId: string, gameData: Record<string, unknown>, priority: 'low' | 'normal' | 'high' = 'normal'): Promise<Record<string, unknown>> {
    const result = await requestDebouncer.debouncedAutoSave(
      `game_${gameId}`,
      gameData,
      async (data: Record<string, unknown>) => {
        // Use existing saveSavedGame method from base class
        const result = await this.saveSavedGame(data);
        return result as unknown as Record<string, unknown>;
      },
      priority
    );
    return result as Record<string, unknown>;
  }

  /**
   * Get only changed data since last sync
   */
  async getChangedPlayers(lastSyncTime?: number): Promise<{
    players: Player[];
    hasMore: boolean;
    nextSyncTime: number;
  }> {
    try {
      const result = await smartSyncManager.getChangedData<Player>('players', lastSyncTime);
      return {
        players: result.items,
        hasMore: result.hasMore,
        nextSyncTime: result.nextSyncTime,
      };
    } catch (error) {
      throw new NetworkError('supabase', 'getChangedPlayers', error as Error);
    }
  }

  /**
   * Smart sync with conflict resolution
   */
  async smartSyncPlayers(
    localPlayers: Player[],
    conflictResolution: 'local-wins' | 'remote-wins' | 'merge' = 'local-wins'
  ): Promise<{
    synced: Player[];
    conflicts: Array<{ local: Player; remote: Player; resolved: Player }>;
  }> {
    try {
      return await smartSyncManager.smartSyncWithConflictResolution(
        'players',
        localPlayers,
        conflictResolution
      );
    } catch (error) {
      throw new NetworkError('supabase', 'smartSyncPlayers', error as Error);
    }
  }

  /**
   * Get games list with minimal fields for better performance
   */
  async getGamesListOptimized(): Promise<Record<string, unknown>[]> {
    try {
      return await compressionManager.fetchGamesListOptimized();
    } catch (error) {
      throw new NetworkError('supabase', 'getGamesListOptimized', error as Error);
    }
  }

  /**
   * Get full game data only when needed
   */
  async getFullGameOptimized(gameId: string): Promise<Record<string, unknown>> {
    try {
      return await compressionManager.fetchFullGameOptimized(gameId);
    } catch (error) {
      throw new NetworkError('supabase', 'getFullGameOptimized', error as Error);
    }
  }

  /**
   * Get player statistics with optimized queries
   */
  async getPlayerStatsOptimized(options?: {
    seasonId?: string;
    tournamentId?: string;
    limit?: number;
  }): Promise<Record<string, unknown>[]> {
    try {
      return await compressionManager.fetchPlayerStatsOptimized(options);
    } catch (error) {
      throw new NetworkError('supabase', 'getPlayerStatsOptimized', error as Error);
    }
  }

  /**
   * Fetch large datasets with pagination
   */
  async fetchLargeDataset<T>(
    table: string,
    fields: string[],
    options: {
      pageSize?: number;
      cursor?: string;
      filters?: Record<string, unknown>;
    } = {}
  ): Promise<{
    data: T[];
    nextCursor?: string;
    hasMore: boolean;
    totalEstimate?: number;
  }> {
    try {
      return await compressionManager.fetchLargeDatasetOptimized<T>(table, fields, options);
    } catch (error) {
      throw new NetworkError('supabase', 'fetchLargeDataset', error as Error);
    }
  }

  /**
   * Track changes for later synchronization
   */
  trackChange(change: {
    type: 'create' | 'update' | 'delete';
    table: string;
    id?: string;
    data?: Record<string, unknown>;
  }): void {
    smartSyncManager.trackChange({
      ...change,
      timestamp: Date.now(),
    });
  }

  /**
   * Sync all pending changes
   */
  async syncPendingChanges(): Promise<{
    synced: number;
    failed: number;
    errors: Record<string, unknown>[];
  }> {
    try {
      return await smartSyncManager.syncPendingChanges();
    } catch (error) {
      throw new NetworkError('supabase', 'syncPendingChanges', error as Error);
    }
  }

  /**
   * Batch delete multiple records
   */
  async batchDelete(table: string, ids: string[]): Promise<void> {
    try {
      await batchOperationManager.batchDelete(table, ids);
    } catch (error) {
      throw new NetworkError('supabase', 'batchDelete', error as Error);
    }
  }

  /**
   * Flush all pending debounced requests
   */
  async flushPendingRequests(): Promise<void> {
    await requestDebouncer.flush();
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    debouncer: {
      pendingBatches: number;
      totalPendingRequests: number;
      oldestRequestAge: number;
    };
    smartSync: {
      pendingChanges: number;
      lastSyncTimes: Record<string, number>;
    };
  } {
    return {
      debouncer: requestDebouncer.getStats(),
      smartSync: smartSyncManager.getSyncStats(),
    };
  }

  /**
   * Reset all optimization state
   */
  reset(): void {
    requestDebouncer.clear();
    smartSyncManager.reset();
  }
}

// Export singleton instance
export const enhancedSupabaseProvider = new EnhancedSupabaseProvider();