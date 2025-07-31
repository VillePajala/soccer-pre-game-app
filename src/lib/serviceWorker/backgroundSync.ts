/**
 * Background Sync Integration for Service Worker
 * This module provides utilities to integrate the enhanced service worker
 * with our offline-first IndexedDB and SyncManager system.
 */

import { IndexedDBProvider } from '../storage/indexedDBProvider';
import { SyncManager } from '../storage/syncManager';
import { SupabaseProvider } from '../storage/supabaseProvider';

interface BackgroundSyncOptions {
  maxRetries?: number;
  retryDelay?: number;
  batchSize?: number;
}

interface SyncResult {
  success: boolean;
  syncedItems: number;
  failedItems: number;
  errors: string[];
}

/**
 * Background sync handler that can be used in service worker context
 */
export class BackgroundSyncHandler {
  private indexedDB: IndexedDBProvider;
  private syncManager: SyncManager;
  private supabaseProvider: SupabaseProvider;
  private options: Required<BackgroundSyncOptions>;

  constructor(options: BackgroundSyncOptions = {}) {
    this.options = {
      maxRetries: options.maxRetries || 3,
      retryDelay: options.retryDelay || 1000,
      batchSize: options.batchSize || 5
    };

    // Initialize providers
    this.indexedDB = new IndexedDBProvider();
    this.supabaseProvider = new SupabaseProvider();
    this.syncManager = new SyncManager(this.indexedDB, this.supabaseProvider);
  }

  /**
   * Main sync operation for service worker background sync
   */
  async performBackgroundSync(): Promise<SyncResult> {
    console.log('[BG-Sync] Starting background sync operation...');
    
    try {
      // Check if we can reach Supabase
      const isOnline = await this.checkSupabaseConnectivity();
      if (!isOnline) {
        throw new Error('Supabase is not reachable');
      }

      // Perform sync using our SyncManager
      const result = await this.syncManager.syncToSupabase({
        maxRetries: this.options.maxRetries,
        batchSize: this.options.batchSize
      });

      console.log('[BG-Sync] Background sync completed:', result);
      
      return {
        success: result.success,
        syncedItems: result.syncedItems || 0,
        failedItems: result.failedItems || 0,
        errors: result.errors.map(e =>
          e instanceof Error ? e.message : String(e)
        )
      };
    } catch (error) {
      console.error('[BG-Sync] Background sync failed:', error);
      
      return {
        success: false,
        syncedItems: 0,
        failedItems: 1,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }

  /**
   * Queue a failed request for background sync
   */
  async queueFailedRequest(request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
    timestamp: number;
  }): Promise<void> {
    try {
      console.log('[BG-Sync] Queuing failed request:', request.url);
      
      // Parse the request to determine the operation type
      const operation = this.parseRequestToOperation(request);
      if (operation) {
        await this.syncManager.queueOperation(
          operation.action,
          operation.table as keyof import('../storage/indexedDBProvider').IndexedDBSchema,
          operation.data
        );
      }
    } catch (error) {
      console.error('[BG-Sync] Failed to queue request:', error);
    }
  }

  /**
   * Get sync queue statistics
   */
  async getSyncStats(): Promise<{
    pendingCount: number;
    failedCount: number;
    lastSyncTime?: number;
  }> {
    try {
      return await this.syncManager.getSyncStats();
    } catch (error) {
      console.error('[BG-Sync] Failed to get sync stats:', error);
      return { pendingCount: 0, failedCount: 0 };
    }
  }

  /**
   * Clear the sync queue
   */
  async clearSyncQueue(): Promise<void> {
    try {
      await this.syncManager.clearSyncQueue();
      console.log('[BG-Sync] Sync queue cleared');
    } catch (error) {
      console.error('[BG-Sync] Failed to clear sync queue:', error);
    }
  }

  /**
   * Check if Supabase is reachable
   */
  private async checkSupabaseConnectivity(): Promise<boolean> {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) return false;

      const response = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: 'HEAD',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        }
      });

      return response.ok || response.status === 401; // 401 is fine, means auth is working
    } catch (error) {
      console.warn('[BG-Sync] Supabase connectivity check failed:', error);
      return false;
    }
  }

  /**
   * Parse a failed HTTP request into a sync operation
   */
  private parseRequestToOperation(request: {
    url: string;
    method: string;
    body?: string;
  }): { action: 'create' | 'update' | 'delete'; table: string; data: unknown } | null {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      
      // Extract table name from Supabase REST API path
      // e.g., /rest/v1/players -> 'players'
      const tableIndex = pathParts.indexOf('v1') + 1;
      if (tableIndex <= 0 || tableIndex >= pathParts.length) {
        return null;
      }
      
      const table = pathParts[tableIndex];
      let data = null;
      
      // Parse body data if available
      if (request.body) {
        try {
          data = JSON.parse(request.body);
        } catch (e) {
          console.warn('[BG-Sync] Failed to parse request body:', e);
        }
      }

      // Determine action based on HTTP method
      let action: 'create' | 'update' | 'delete';
      switch (request.method.toUpperCase()) {
        case 'POST':
          action = 'create';
          break;
        case 'PUT':
        case 'PATCH':
          action = 'update';
          break;
        case 'DELETE':
          action = 'delete';
          break;
        default:
          return null; // Only sync write operations
      }

      return { action, table, data };
    } catch (error) {
      console.warn('[BG-Sync] Failed to parse request:', error);
      return null;
    }
  }
}

/**
 * Utility functions for service worker integration
 */
export const ServiceWorkerUtils = {
  /**
   * Create a background sync handler instance
   */
  createBackgroundSyncHandler(options?: BackgroundSyncOptions): BackgroundSyncHandler {
    return new BackgroundSyncHandler(options);
  },

  /**
   * Check if a request should trigger background sync
   */
  shouldSyncRequest(request: Request): boolean {
    const url = new URL(request.url);
    
    // Only sync Supabase API requests
    if (!url.hostname.includes('supabase.co') && !url.pathname.startsWith('/rest/v1/')) {
      return false;
    }

    // Only sync write operations
    return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method.toUpperCase());
  },

  /**
   * Extract sync metadata from a request
   */
  extractSyncMetadata(request: Request): {
    table: string;
    operation: string;
    priority: number;
  } | null {
    try {
      const url = new URL(request.url);
      const pathParts = url.pathname.split('/');
      
      const tableIndex = pathParts.indexOf('v1') + 1;
      if (tableIndex <= 0 || tableIndex >= pathParts.length) {
        return null;
      }
      
      const table = pathParts[tableIndex];
      const operation = request.method.toLowerCase();
      
      // Assign priority based on table importance
      const priority = this.getTablePriority(table);
      
      return { table, operation, priority };
    } catch {
      return null;
    }
  },

  /**
   * Get sync priority for different tables
   */
  getTablePriority(table: string): number {
    const priorities: Record<string, number> = {
      'timer_states': 1,    // Highest priority
      'saved_games': 2,
      'players': 3,
      'app_settings': 4,
      'seasons': 5,
      'tournaments': 6      // Lowest priority
    };
    
    return priorities[table] || 5;
  }
};