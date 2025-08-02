import { supabase } from '../supabase';
import { NetworkError, AuthenticationError } from './types';
// Storage optimization imports
import { fromSupabase } from '../../utils/transforms';
import type { DbPlayer, DbSeason, DbTournament } from '../../utils/transforms';

/**
 * Smart Synchronization for Supabase
 * Implements Phase 4 Storage Layer Performance optimization
 * Only syncs changed data to reduce payload sizes and improve performance
 */

export interface SyncChange {
  type: 'create' | 'update' | 'delete';
  table: string;
  id?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export interface SyncPatch {
  op: 'add' | 'replace' | 'remove';
  path: string;
  value?: Record<string, unknown>;
}

export class SmartSyncManager {
  private lastSyncTimestamps: Map<string, number> = new Map();
  private pendingChanges: Map<string, SyncChange[]> = new Map();

  private async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new AuthenticationError('supabase', 'getCurrentUserId', error || new Error('No user'));
    }
    return user.id;
  }

  /**
   * Track a change for later synchronization
   */
  trackChange(change: SyncChange): void {
    const key = `${change.table}_${change.id || 'new'}`;
    
    if (!this.pendingChanges.has(key)) {
      this.pendingChanges.set(key, []);
    }
    
    this.pendingChanges.get(key)!.push(change);
  }

  /**
   * Get only the data that has changed since last sync
   */
  async getChangedData<T>(
    table: string,
    lastSyncTime?: number
  ): Promise<{
    items: T[];
    hasMore: boolean;
    nextSyncTime: number;
  }> {
    const userId = await this.getCurrentUserId();
    const syncTime = lastSyncTime || this.lastSyncTimestamps.get(table) || 0;
    const currentTime = Date.now();

    try {
      // Query for items modified since last sync
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .eq('user_id', userId)
        .gte('updated_at', new Date(syncTime).toISOString())
        .order('updated_at', { ascending: true })
        .limit(100); // Paginate large result sets

      if (error) {
        throw new NetworkError('supabase', 'getChangedData', error);
      }

      // Transform data if needed
      let transformedData: T[] = data || [];
      if (table === 'players') {
        transformedData = data.map((item: Record<string, unknown>) => fromSupabase.player(item as unknown as DbPlayer)) as T[];
      } else if (table === 'seasons') {
        transformedData = data.map((item: Record<string, unknown>) => fromSupabase.season(item as unknown as DbSeason)) as T[];
      } else if (table === 'tournaments') {
        transformedData = data.map((item: Record<string, unknown>) => fromSupabase.tournament(item as unknown as DbTournament)) as T[];
      }

      // Update last sync timestamp
      this.lastSyncTimestamps.set(table, currentTime);

      return {
        items: transformedData,
        hasMore: data.length === 100, // Has more if we hit the limit
        nextSyncTime: currentTime,
      };
    } catch (error) {
      throw new NetworkError('supabase', 'getChangedData', error as Error);
    }
  }

  /**
   * Sync only the pending changes to reduce network traffic
   */
  async syncPendingChanges(): Promise<{
    synced: number;
    failed: number;
    errors: Record<string, unknown>[];
  }> {
    const userId = await this.getCurrentUserId();
    let synced = 0;
    let failed = 0;
    const errors: Record<string, unknown>[] = [];

    for (const [key, changes] of this.pendingChanges.entries()) {
      try {
        await this.syncChangesForEntity(userId, key, changes);
        synced += changes.length;
        this.pendingChanges.delete(key); // Remove synced changes
      } catch (error) {
        failed += changes.length;
        errors.push({ key, error: (error as Error).message });
      }
    }

    return { synced, failed, errors };
  }

  /**
   * Apply JSON Patch-like operations for minimal data transfer
   */
  async applyGamePatches(gameId: string, patches: SyncPatch[]): Promise<void> {
    const userId = await this.getCurrentUserId();

    try {
      // Use Supabase RPC for complex patch operations
      const { error } = await supabase.rpc('apply_game_patches', {
        game_id: gameId,
        user_id: userId,
        patches: patches
      });

      if (error) {
        throw new NetworkError('supabase', 'applyGamePatches', error);
      }
    } catch {
      // Fallback to regular update if RPC doesn't exist
      console.warn('RPC apply_game_patches not available, using fallback');
      await this.applyPatchesFallback(userId, gameId, patches);
    }
  }

  /**
   * Calculate diff between local and remote data
   */
  calculateDiff(localData: Record<string, unknown>, remoteData: Record<string, unknown>): SyncPatch[] {
    const patches: SyncPatch[] = [];

    if (!localData || !remoteData) {
      return patches;
    }

    // Simple diff implementation - can be enhanced with a proper diff library
    const localKeys = Object.keys(localData);
    const remoteKeys = Object.keys(remoteData);

    // Check for updated/added properties
    for (const key of localKeys) {
      if (localData[key] !== remoteData[key]) {
        patches.push({
          op: 'replace',
          path: `/${key}`,
          value: localData[key] as Record<string, unknown>
        });
      }
    }

    // Check for removed properties
    for (const key of remoteKeys) {
      if (!(key in localData)) {
        patches.push({
          op: 'remove',
          path: `/${key}`
        });
      }
    }

    return patches;
  }

  /**
   * Smart sync with conflict resolution
   */
  async smartSyncWithConflictResolution<T>(
    table: string,
    localData: T[],
    conflictResolution: 'local-wins' | 'remote-wins' | 'merge' = 'local-wins'
  ): Promise<{
    synced: T[];
    conflicts: Array<{ local: T; remote: T; resolved: T }>;
  }> {
    const userId = await this.getCurrentUserId();
    const synced: T[] = [];
    const conflicts: Array<{ local: T; remote: T; resolved: T }> = [];

    try {
      // Get remote data with timestamps
      const { data: remoteData, error } = await supabase
        .from(table)
        .select('*, updated_at')
        .eq('user_id', userId);

      if (error) {
        throw new NetworkError('supabase', 'smartSyncWithConflictResolution', error);
      }

      // Create maps for efficient lookups
      const remoteMap = new Map();
      remoteData?.forEach((item: Record<string, unknown>) => {
        remoteMap.set(item.id, item);
      });

      // Process each local item
      for (const localItem of localData) {
        const itemId = (localItem as Record<string, unknown>).id;
        const remoteItem = remoteMap.get(itemId);

        if (!remoteItem) {
          // New item - sync to remote
          synced.push(localItem);
        } else {
          // Check for conflicts based on timestamps
          const localTimestamp = (localItem as Record<string, unknown>).updated_at as number || 0;
          const remoteTimestamp = new Date(remoteItem.updated_at).getTime();

          if (localTimestamp > remoteTimestamp) {
            // Local is newer - use local
            synced.push(localItem);
          } else if (remoteTimestamp > localTimestamp) {
            // Remote is newer - handle conflict
            const resolved = this.resolveConflict(localItem, remoteItem, conflictResolution);
            conflicts.push({ local: localItem, remote: remoteItem, resolved });
            synced.push(resolved);
          } else {
            // Same timestamp - no conflict
            synced.push(localItem);
          }
        }
      }

      return { synced, conflicts };
    } catch (error) {
      throw new NetworkError('supabase', 'smartSyncWithConflictResolution', error as Error);
    }
  }

  private async syncChangesForEntity(userId: string, key: string, changes: SyncChange[]): Promise<void> {
    // Group changes by type for efficiency
    const creates = changes.filter(c => c.type === 'create');
    const updates = changes.filter(c => c.type === 'update');
    const deletes = changes.filter(c => c.type === 'delete');

    // Process creates
    if (creates.length > 0) {
      const table = creates[0].table;
      const createData = creates.map(c => ({ ...c.data, user_id: userId }));
      
      const { error } = await supabase
        .from(table)
        .insert(createData);
      
      if (error) throw error;
    }

    // Process updates
    if (updates.length > 0) {
      for (const update of updates) {
        const { error } = await supabase
          .from(update.table)
          .update(update.data)
          .eq('id', update.id)
          .eq('user_id', userId);
        
        if (error) throw error;
      }
    }

    // Process deletes
    if (deletes.length > 0) {
      for (const deleteOp of deletes) {
        const { error } = await supabase
          .from(deleteOp.table)
          .delete()
          .eq('id', deleteOp.id)
          .eq('user_id', userId);
        
        if (error) throw error;
      }
    }
  }

  private async applyPatchesFallback(userId: string, gameId: string, patches: SyncPatch[]): Promise<void> {
    // Get current game data
    const { data: currentGame, error: fetchError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      throw new NetworkError('supabase', 'applyPatchesFallback', fetchError);
    }

    // Apply patches to current data
    const patchedData = { ...currentGame };
    for (const patch of patches) {
      const path = patch.path.substring(1); // Remove leading '/'
      
      switch (patch.op) {
        case 'replace':
        case 'add':
          patchedData[path] = patch.value;
          break;
        case 'remove':
          delete patchedData[path];
          break;
      }
    }

    // Update the game with patched data
    const { error: updateError } = await supabase
      .from('games')
      .update(patchedData)
      .eq('id', gameId)
      .eq('user_id', userId);

    if (updateError) {
      throw new NetworkError('supabase', 'applyPatchesFallback', updateError);
    }
  }

  private resolveConflict<T>(local: T, remote: T, strategy: 'local-wins' | 'remote-wins' | 'merge'): T {
    switch (strategy) {
      case 'local-wins':
        return local;
      case 'remote-wins':
        return remote;
      case 'merge':
        // Simple merge strategy - can be enhanced based on specific needs
        return { ...remote, ...local };
      default:
        return local;
    }
  }

  /**
   * Clear pending changes and reset sync state
   */
  reset(): void {
    this.pendingChanges.clear();
    this.lastSyncTimestamps.clear();
  }

  /**
   * Get sync statistics
   */
  getSyncStats(): {
    pendingChanges: number;
    lastSyncTimes: Record<string, number>;
  } {
    const pendingCount = Array.from(this.pendingChanges.values())
      .reduce((total, changes) => total + changes.length, 0);

    const lastSyncTimes: Record<string, number> = {};
    for (const [key, timestamp] of this.lastSyncTimestamps.entries()) {
      lastSyncTimes[key] = timestamp;
    }

    return {
      pendingChanges: pendingCount,
      lastSyncTimes,
    };
  }
}

// Export singleton instance
export const smartSyncManager = new SmartSyncManager();