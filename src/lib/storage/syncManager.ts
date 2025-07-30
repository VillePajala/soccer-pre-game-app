import type { IndexedDBProvider, SyncQueueItem } from './indexedDBProvider';
import type { IStorageProvider } from './types';
// StorageError will be used for future error handling
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { StorageError } from './types';
import type { Player, Season, Tournament } from '../../types';
import type { AppSettings } from '../../utils/appSettings';

export type ConflictResolutionStrategy = 'last-write-wins' | 'merge' | 'user-choice';

export interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  conflicts: SyncConflict[];
  errors: Error[];
}

export interface SyncConflict {
  item: SyncQueueItem;
  localData: unknown;
  remoteData: unknown;
  resolution?: 'local' | 'remote' | 'merged';
}

export interface SyncOptions {
  maxRetries: number;
  batchSize: number;
  conflictResolution: ConflictResolutionStrategy;
  onProgress?: (progress: { completed: number; total: number }) => void;
}

/**
 * Manages synchronization between IndexedDB and Supabase
 */
export class SyncManager {
  private isSyncing = false;
  private syncPromise: Promise<SyncResult> | null = null;

  constructor(
    private indexedDB: IndexedDBProvider,
    private supabase: IStorageProvider,
    private defaultOptions: SyncOptions = {
      maxRetries: 3,
      batchSize: 10,
      conflictResolution: 'last-write-wins'
    }
  ) {}

  /**
   * Queue an operation for synchronization
   */
  async queueOperation(
    operation: 'create' | 'update' | 'delete',
    table: keyof import('./indexedDBProvider').IndexedDBSchema,
    data: unknown
  ): Promise<void> {
    await this.indexedDB.addToSyncQueue({
      operation,
      table,
      data
    });
  }

  /**
   * Check if sync is currently in progress
   */
  get isSyncInProgress(): boolean {
    return this.isSyncing;
  }

  /**
   * Get current sync promise if syncing
   */
  get currentSyncPromise(): Promise<SyncResult> | null {
    return this.syncPromise;
  }

  /**
   * Sync all pending operations with Supabase
   */
  async syncToSupabase(options: Partial<SyncOptions> = {}): Promise<SyncResult> {
    // If already syncing, return the current sync promise
    if (this.isSyncing && this.syncPromise) {
      return this.syncPromise;
    }

    const syncOptions = { ...this.defaultOptions, ...options };
    
    this.isSyncing = true;
    this.syncPromise = this.performSync(syncOptions);

    try {
      const result = await this.syncPromise;
      return result;
    } finally {
      this.isSyncing = false;
      this.syncPromise = null;
    }
  }

  /**
   * Perform the actual synchronization
   */
  private async performSync(options: SyncOptions): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      syncedItems: 0,
      failedItems: 0,
      conflicts: [],
      errors: []
    };

    try {
      // Get all pending sync items
      const syncQueue = await this.indexedDB.getSyncQueue();
      const pendingItems = syncQueue.filter(item => 
        item.status === 'pending' || item.status === 'failed'
      );

      if (pendingItems.length === 0) {
        return result;
      }

      // Process items in batches
      const batches = this.createBatches(pendingItems, options.batchSize);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        for (const item of batch) {
          try {
            await this.syncItem(item, options);
            result.syncedItems++;
            
            // Update progress
            if (options.onProgress) {
              options.onProgress({
                completed: result.syncedItems + result.failedItems,
                total: pendingItems.length
              });
            }
          } catch {
            result.failedItems++;
            result.errors.push(error as Error);
            
            // Update item status based on retry count
            if (item.retryCount >= options.maxRetries) {
              await this.indexedDB.updateSyncQueueItem(item.id, {
                status: 'failed',
                retryCount: item.retryCount + 1
              });
            } else {
              await this.indexedDB.updateSyncQueueItem(item.id, {
                retryCount: item.retryCount + 1
              });
            }
          }
        }
      }

      // Clean up completed items
      await this.indexedDB.clearCompletedSyncItems();

      // Overall success if we synced more items than failed
      result.success = result.syncedItems > result.failedItems;

    } catch (error) {
      result.success = false;
      result.errors.push(error as Error);
    }

    return result;
  }

  /**
   * Sync a single item to Supabase
   */
  private async syncItem(item: SyncQueueItem, options: SyncOptions): Promise<void> {
    // Mark as syncing
    await this.indexedDB.updateSyncQueueItem(item.id, { status: 'syncing' });

    try {
      switch (item.operation) {
        case 'create':
          await this.syncCreateOperation(item, options);
          break;
        case 'update':
          await this.syncUpdateOperation(item, options);
          break;
        case 'delete':
          await this.syncDeleteOperation(item);
          break;
      }

      // Mark as completed
      await this.indexedDB.updateSyncQueueItem(item.id, { status: 'completed' });
      
    } catch (error) {
      // Reset to pending for retry
      await this.indexedDB.updateSyncQueueItem(item.id, { status: 'pending' });
      throw error;
    }
  }

  /**
   * Sync a create operation
   */
  private async syncCreateOperation(item: SyncQueueItem): Promise<void> {
    switch (item.table) {
      case 'players':
        await this.supabase.savePlayer(item.data as Player);
        break;
      case 'seasons':
        await this.supabase.saveSeason(item.data as Season);
        break;
      case 'tournaments':
        await this.supabase.saveTournament(item.data as Tournament);
        break;
      case 'saved_games':
        await this.supabase.saveSavedGame(item.data);
        break;
      case 'app_settings':
        await this.supabase.saveAppSettings(item.data as AppSettings);
        break;
      default:
        throw new Error(`Unsupported table for create: ${item.table}`);
    }
  }

  /**
   * Sync an update operation
   */
  private async syncUpdateOperation(item: SyncQueueItem, options: SyncOptions): Promise<void> {
    const data = item.data as Player;
    
    if (!data.id) {
      throw new Error('Update operation requires data with id field');
    }

    // Check for conflicts by comparing with remote data
    const hasConflict = await this.checkForConflicts(item);
    
    if (hasConflict && options.conflictResolution === 'user-choice') {
      // Add to conflicts for user resolution
      // For now, we'll use last-write-wins as fallback
      console.warn('Conflict detected, using last-write-wins strategy');
    }

    switch (item.table) {
      case 'players':
        await this.supabase.updatePlayer(data.id, data);
        break;
      case 'seasons':
        await this.supabase.updateSeason(data.id, data);
        break;
      case 'tournaments':
        await this.supabase.updateTournament(data.id, data);
        break;
      case 'app_settings':
        await this.supabase.saveAppSettings(data);
        break;
      default:
        throw new Error(`Unsupported table for update: ${item.table}`);
    }
  }

  /**
   * Sync a delete operation
   */
  private async syncDeleteOperation(item: SyncQueueItem): Promise<void> {
    const data = item.data as Player;
    
    if (!data.id) {
      throw new Error('Delete operation requires data with id field');
    }

    switch (item.table) {
      case 'players':
        await this.supabase.deletePlayer(data.id);
        break;
      case 'seasons':
        await this.supabase.deleteSeason(data.id);
        break;
      case 'tournaments':
        await this.supabase.deleteTournament(data.id);
        break;
      case 'saved_games':
        await this.supabase.deleteSavedGame(data.id);
        break;
      default:
        throw new Error(`Unsupported table for delete: ${item.table}`);
    }
  }

  /**
   * Check for conflicts between local and remote data
   */
  private async checkForConflicts(item: SyncQueueItem): Promise<boolean> {
    // For now, we'll implement a simple timestamp-based conflict detection
    // In a real implementation, this would compare actual data
    try {
      const data = item.data as Player;
      
      // If the item has a lastModified timestamp, we can compare it
      if (data.lastModified && typeof data.lastModified === 'number') {
        // Check if remote data is newer than our local change
        // This is simplified - real implementation would fetch remote data
        return false; // No conflict for now
      }
      
      return false;
    } catch {
      // If we can't check for conflicts, assume no conflict
      return false;
    }
  }

  /**
   * Create batches from sync items
   */
  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    
    return batches;
  }

  /**
   * Get sync statistics
   */
  async getSyncStats(): Promise<{
    pendingCount: number;
    failedCount: number;
    lastSyncTime: number | null;
  }> {
    const syncQueue = await this.indexedDB.getSyncQueue();
    
    const pendingCount = syncQueue.filter(item => item.status === 'pending').length;
    const failedCount = syncQueue.filter(item => item.status === 'failed').length;
    
    // Get last successful sync time (this would be stored separately in a real implementation)
    const lastSyncTime = null; // TODO: Implement proper last sync tracking
    
    return {
      pendingCount,
      failedCount,
      lastSyncTime
    };
  }

  /**
   * Clear all sync queue items (useful for testing)
   */
  async clearSyncQueue(): Promise<void> {
    const syncQueue = await this.indexedDB.getSyncQueue();
    
    for (const item of syncQueue) {
      await this.indexedDB.deleteSyncQueueItem(item.id);
    }
  }

  /**
   * Retry failed sync items
   */
  async retryFailedItems(options: Partial<SyncOptions> = {}): Promise<SyncResult> {
    const syncQueue = await this.indexedDB.getSyncQueue();
    const failedItems = syncQueue.filter(item => item.status === 'failed');
    
    // Reset failed items to pending
    for (const item of failedItems) {
      await this.indexedDB.updateSyncQueueItem(item.id, {
        status: 'pending',
        retryCount: 0
      });
    }
    
    return this.syncToSupabase(options);
  }
}