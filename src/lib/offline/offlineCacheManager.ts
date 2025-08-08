// Offline cache manager for storage abstraction layer
import { IndexedDBCache, dataCache, syncCache } from './indexedDBCache';
import type { IStorageProvider } from '../storage/types';
import type { Player, Season, Tournament } from '../../types';
import type { AppSettings } from '../../utils/appSettings';

export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  table: 'players' | 'seasons' | 'tournaments' | 'games' | 'app_settings';
  data: unknown;
  userId: string;
  timestamp: number;
  retryCount: number;
  lastError?: string;
}

export interface OfflineStatus {
  isOnline: boolean;
  hasOfflineData: boolean;
  syncQueueSize: number;
  lastSyncAttempt?: Date;
  lastSuccessfulSync?: Date;
}

/**
 * Offline cache manager that wraps storage providers with caching capabilities
 */
export class OfflineCacheManager implements IStorageProvider {
  private primaryProvider: IStorageProvider;
  private cache: IndexedDBCache;
  private isOnlineCache: boolean = navigator.onLine;
  private userId: string | null = null;

  constructor(primaryProvider: IStorageProvider) {
    this.primaryProvider = primaryProvider;
    this.cache = dataCache;
    
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline.bind(this));
    window.addEventListener('offline', this.handleOffline.bind(this));
  }

  private handleOnline(): void {
    this.isOnlineCache = true;
    this.processSyncQueue();
  }

  private handleOffline(): void {
    this.isOnlineCache = false;
  }

  /**
   * Set the current user ID for cache namespacing
   */
  setUserId(userId: string | null): void {
    this.userId = userId;
  }

  /**
   * Generate cache key with user context
   * For savedGames, we use a consistent key to avoid data loss during auth transitions
   * since the storage manager handles provider switching
   */
  private getCacheKey(key: string): string {
    // For savedGames, use a consistent cache key regardless of auth state
    // since the underlying storage manager handles provider switching
    if (key === 'savedGames') {
      return 'savedGames';
    }
    return this.userId ? `${this.userId}:${key}` : `anon:${key}`;
  }

  getProviderName(): string {
    return `offline(${this.primaryProvider.getProviderName()})`;
  }

  async isOnline(): Promise<boolean> {
    if (!this.isOnlineCache) return false;
    
    try {
      return await this.primaryProvider.isOnline();
    } catch {
      return false;
    }
  }

  // Player management with caching
  async getPlayers(): Promise<Player[]> {
    const cacheKey = this.getCacheKey('players');
    
    try {
      // Try primary provider if online
      if (this.isOnlineCache) {
        const players = await this.primaryProvider.getPlayers();
        // Cache the result
        await this.cache.set(cacheKey, players, { ttl: 30 * 60 * 1000 }); // 30 minutes
        return players;
      }
    } catch {
      // Failed to fetch players from primary provider
    }

    // Fallback to cache
    const cachedPlayers = await this.cache.get<Player[]>(cacheKey);
    if (cachedPlayers) {
      return cachedPlayers;
    }

    throw new Error('No players available offline');
  }

  async savePlayer(player: Player): Promise<Player> {
    const cacheKey = this.getCacheKey('players');
    
    try {
      if (this.isOnlineCache) {
        // Save to primary provider
        const savedPlayer = await this.primaryProvider.savePlayer(player);
        
        // Update cache
        const cachedPlayers = await this.cache.get<Player[]>(cacheKey) || [];
        const updatedPlayers = cachedPlayers.filter(p => p.id !== savedPlayer.id);
        updatedPlayers.push(savedPlayer);
        await this.cache.set(cacheKey, updatedPlayers);
        
        return savedPlayer;
      }
    } catch {
      // Failed to save player to primary provider
    }

    // Queue for sync
    await this.queueForSync('create', 'players', player);
    
    // Update cache optimistically
    const cachedPlayers = await this.cache.get<Player[]>(cacheKey) || [];
    const updatedPlayers = cachedPlayers.filter(p => p.id !== player.id);
    updatedPlayers.push(player);
    await this.cache.set(cacheKey, updatedPlayers);
    
    return player;
  }

  async deletePlayer(playerId: string): Promise<void> {
    const cacheKey = this.getCacheKey('players');
    
    try {
      if (this.isOnlineCache) {
        await this.primaryProvider.deletePlayer(playerId);
        
        // Update cache
        const cachedPlayers = await this.cache.get<Player[]>(cacheKey) || [];
        const updatedPlayers = cachedPlayers.filter(p => p.id !== playerId);
        await this.cache.set(cacheKey, updatedPlayers);
        
        return;
      }
    } catch {
      // Failed to delete player from primary provider
    }

    // Queue for sync
    await this.queueForSync('delete', 'players', { id: playerId });
    
    // Update cache optimistically
    const cachedPlayers = await this.cache.get<Player[]>(cacheKey) || [];
    const updatedPlayers = cachedPlayers.filter(p => p.id !== playerId);
    await this.cache.set(cacheKey, updatedPlayers);
  }

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<Player> {
    const cacheKey = this.getCacheKey('players');
    
    try {
      if (this.isOnlineCache) {
        const updatedPlayer = await this.primaryProvider.updatePlayer(playerId, updates);
        
        // Update cache
        const cachedPlayers = await this.cache.get<Player[]>(cacheKey) || [];
        const playerIndex = cachedPlayers.findIndex(p => p.id === playerId);
        if (playerIndex >= 0) {
          cachedPlayers[playerIndex] = updatedPlayer;
          await this.cache.set(cacheKey, cachedPlayers);
        }
        
        return updatedPlayer;
      }
    } catch {
      // Failed to update player in primary provider
    }

    // Queue for sync
    await this.queueForSync('update', 'players', { id: playerId, ...updates });
    
    // Update cache optimistically
    const cachedPlayers = await this.cache.get<Player[]>(cacheKey) || [];
    const playerIndex = cachedPlayers.findIndex(p => p.id === playerId);
    if (playerIndex >= 0) {
      cachedPlayers[playerIndex] = { ...cachedPlayers[playerIndex], ...updates };
      await this.cache.set(cacheKey, cachedPlayers);
      return cachedPlayers[playerIndex];
    }
    
    throw new Error('Player not found in cache');
  }

  // Similar patterns for seasons, tournaments, etc. - simplified for now
  async getSeasons(): Promise<Season[]> {
    return this.getCachedOrFetch('seasons', () => this.primaryProvider.getSeasons());
  }

  async saveSeason(season: Season): Promise<Season> {
    return this.saveWithCache('seasons', season, () => this.primaryProvider.saveSeason(season));
  }

  async deleteSeason(seasonId: string): Promise<void> {
    return this.deleteWithCache('seasons', seasonId, () => this.primaryProvider.deleteSeason(seasonId));
  }

  async updateSeason(seasonId: string, updates: Partial<Season>): Promise<Season> {
    return this.updateWithCache('seasons', seasonId, updates, (id, upd) => this.primaryProvider.updateSeason(id, upd));
  }

  async getTournaments(): Promise<Tournament[]> {
    return this.getCachedOrFetch('tournaments', () => this.primaryProvider.getTournaments());
  }

  async saveTournament(tournament: Tournament): Promise<Tournament> {
    return this.saveWithCache('tournaments', tournament, () => this.primaryProvider.saveTournament(tournament));
  }

  async deleteTournament(tournamentId: string): Promise<void> {
    return this.deleteWithCache('tournaments', tournamentId, () => this.primaryProvider.deleteTournament(tournamentId));
  }

  async updateTournament(tournamentId: string, updates: Partial<Tournament>): Promise<Tournament> {
    return this.updateWithCache('tournaments', tournamentId, updates, (id, upd) => this.primaryProvider.updateTournament(id, upd));
  }

  async getAppSettings(): Promise<AppSettings | null> {
    return this.getCachedOrFetch('appSettings', () => this.primaryProvider.getAppSettings());
  }

  async saveAppSettings(settings: AppSettings): Promise<AppSettings> {
    return this.saveWithCache('appSettings', settings, () => this.primaryProvider.saveAppSettings(settings));
  }

  async getSavedGames(): Promise<unknown> {
    return this.getCachedOrFetch('savedGames', () => this.primaryProvider.getSavedGames());
  }

  async saveSavedGame(gameData: unknown): Promise<unknown> {
    // CRITICAL BUG FIX: Add debugging for assist-related save operations
    const gameState = gameData as Record<string, unknown>;
    const gameEvents = gameState?.gameEvents as Array<Record<string, unknown>> || [];
    const assistEvents = gameEvents.filter((event: Record<string, unknown>) => event.assisterId) || [];
    console.log(`[OFFLINE_CACHE] saveSavedGame called - Primary provider: ${this.primaryProvider.constructor.name}`);
    console.log(`[OFFLINE_CACHE] Events: ${gameEvents.length || 0}, Assist events: ${assistEvents.length}`);
    
    return this.saveWithCache('savedGames', gameData, () => this.primaryProvider.saveSavedGame(gameData));
  }

  async deleteSavedGame(gameId: string): Promise<void> {
    return this.deleteWithCache('savedGames', gameId, () => this.primaryProvider.deleteSavedGame(gameId));
  }

  async exportAllData(): Promise<unknown> {
    // Always try primary provider for exports
    return this.primaryProvider.exportAllData();
  }

  async importAllData(data: unknown): Promise<void> {
    // Always try primary provider for imports
    return this.primaryProvider.importAllData(data);
  }

  // Helper methods for common caching patterns
  private async getCachedOrFetch<T>(key: string, fetchFn: () => Promise<T>): Promise<T> {
    const cacheKey = this.getCacheKey(key);
    
    try {
      if (this.isOnlineCache) {
        const data = await fetchFn();
        await this.cache.set(cacheKey, data, { ttl: 30 * 60 * 1000 });
        return data;
      }
    } catch {
      // Failed to fetch from primary provider
    }

    const cachedData = await this.cache.get<T>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    throw new Error(`No ${key} available offline`);
  }

  private async saveWithCache<T>(key: string, item: T, saveFn: () => Promise<T>): Promise<T> {
    try {
      if (this.isOnlineCache) {
        const savedItem = await saveFn();
        // Update cache would go here
        return savedItem;
      }
    } catch {
      // Failed to save to primary provider
    }

    await this.queueForSync('create', key as SyncQueueItem['table'], item);
    return item;
  }

  private async deleteWithCache(key: string, id: string, deleteFn: () => Promise<void>): Promise<void> {
    try {
      if (this.isOnlineCache) {
        await deleteFn();
        return;
      }
    } catch {
      // Failed to delete from primary provider
    }

    await this.queueForSync('delete', key as SyncQueueItem['table'], { id });
  }

  private async updateWithCache<T>(key: string, id: string, updates: Partial<T>, updateFn: (id: string, updates: Partial<T>) => Promise<T>): Promise<T> {
    try {
      if (this.isOnlineCache) {
        return await updateFn(id, updates);
      }
    } catch {
      // Failed to update in primary provider
    }

    await this.queueForSync('update', key as SyncQueueItem['table'], { id, ...updates });
    // For simplicity, return updates cast as T (in real implementation, merge with cached data)
    return updates as T;
  }

  /**
   * Queue operation for background sync
   */
  private async queueForSync(operation: SyncQueueItem['operation'], table: SyncQueueItem['table'], data: unknown): Promise<void> {
    if (!this.userId) return;

    const queueItem: SyncQueueItem = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      operation,
      table,
      data,
      userId: this.userId,
      timestamp: Date.now(),
      retryCount: 0,
    };

    await syncCache.set(queueItem.id, queueItem);
  }

  /**
   * Process sync queue when back online
   */
  private async processSyncQueue(): Promise<void> {
    try {
      const queueKeys = await syncCache.getAllKeys();

      for (const key of queueKeys) {
        const queueItem = await syncCache.get<SyncQueueItem>(key);
        if (!queueItem) continue;

        try {
          await this.processSyncItem(queueItem);
          await syncCache.delete(key);
        } catch (error) {
          queueItem.retryCount++;
          queueItem.lastError = error instanceof Error ? error.message : 'Unknown error';
          
          if (queueItem.retryCount >= 3) {
            await syncCache.delete(key);
          } else {
            await syncCache.set(key, queueItem);
          }
        }
      }
    } catch {
      // Error processing sync queue
    }
  }

  /**
   * Process individual sync queue item
   */
  private async processSyncItem(_item: SyncQueueItem): Promise<void> {
    // This would implement the actual sync logic based on operation type
    // For now, just a placeholder
  }

  /**
   * Get offline status
   */
  async getOfflineStatus(): Promise<OfflineStatus> {
    const queueKeys = await syncCache.getAllKeys();
    const hasOfflineData = await this.cache.getAllKeys().then(keys => keys.length > 0);

    return {
      isOnline: this.isOnlineCache && await this.isOnline(),
      hasOfflineData,
      syncQueueSize: queueKeys.length,
      // lastSyncAttempt and lastSuccessfulSync would be tracked in implementation
    };
  }

  /**
   * Clear all offline data
   */
  async clearOfflineData(): Promise<void> {
    await this.cache.clearAll();
    await syncCache.clearAll();
  }
}