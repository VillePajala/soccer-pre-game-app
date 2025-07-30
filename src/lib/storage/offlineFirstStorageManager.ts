// Offline-first storage manager with IndexedDB and sync capabilities
import type { IStorageProvider, StorageConfig } from './types';
import { StorageError, NetworkError, AuthenticationError } from './types';
import { LocalStorageProvider } from './localStorageProvider';
import { SupabaseProvider } from './supabaseProvider';
import { IndexedDBProvider } from './indexedDBProvider';
import { SyncManager } from './syncManager';
import type { Player, Season, Tournament, TimerState } from '../../types';
import type { AppSettings } from '../../utils/appSettings';

export interface OfflineFirstConfig extends StorageConfig {
  enableOfflineMode: boolean;
  syncOnReconnect: boolean;
  maxRetries: number;
  batchSize: number;
}

/**
 * Enhanced storage manager with offline-first capabilities
 * - Reads from IndexedDB for instant responses
 * - Writes to IndexedDB immediately, then syncs to Supabase
 * - Handles offline/online state transitions
 * - Automatic background sync when connection is restored
 */
export class OfflineFirstStorageManager implements IStorageProvider {
  private localStorage: LocalStorageProvider;
  private supabaseProvider: SupabaseProvider;
  private indexedDB: IndexedDBProvider;
  private syncManager: SyncManager;
  private config: OfflineFirstConfig;
  private isOnlineState: boolean = navigator.onLine;

  constructor(config: Partial<OfflineFirstConfig> = {}) {
    this.config = {
      provider: 'indexedDB',
      fallbackToLocalStorage: true,
      enableOfflineMode: true,
      syncOnReconnect: true,
      maxRetries: 3,
      batchSize: 10,
      ...config
    };

    this.localStorage = new LocalStorageProvider();
    this.supabaseProvider = new SupabaseProvider();
    this.indexedDB = new IndexedDBProvider();
    this.syncManager = new SyncManager(this.indexedDB, this.supabaseProvider, {
      maxRetries: this.config.maxRetries,
      batchSize: this.config.batchSize,
      conflictResolution: 'last-write-wins'
    });

    this.setupConnectionListeners();
  }

  /**
   * Set up listeners for online/offline events
   */
  private setupConnectionListeners(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this));
      window.addEventListener('offline', this.handleOffline.bind(this));
    }
  }

  /**
   * Handle coming back online
   */
  private async handleOnline(): Promise<void> {
    this.isOnlineState = true;
    
    if (this.config.syncOnReconnect) {
      try {
        console.log('🔄 Connection restored, starting sync...');
        const result = await this.syncManager.syncToSupabase();
        
        if (result.success) {
          console.log(`✅ Sync completed: ${result.syncedItems} items synced`);
        } else {
          console.warn(`⚠️ Sync completed with errors: ${result.failedItems} failed`);
        }
      } catch (error) {
        console.error('❌ Sync failed after reconnection:', error);
      }
    }
  }

  /**
   * Handle going offline
   */
  private handleOffline(): void {
    this.isOnlineState = false;
    console.log('📱 App is now offline, using IndexedDB only');
  }

  /**
   * Determine if we should sync to Supabase
   */
  private shouldSyncToSupabase(): boolean {
    return this.isOnlineState && this.config.enableOfflineMode;
  }

  // IStorageProvider implementation

  getProviderName(): string {
    return `offlineFirst(${this.indexedDB.getProviderName()})`;
  }

  async isOnline(): Promise<boolean> {
    if (!this.isOnlineState) return false;
    
    try {
      return await this.supabaseProvider.isOnline();
    } catch {
      return false;
    }
  }

  // Player management - offline-first pattern
  async getPlayers(): Promise<Player[]> {
    // Always read from IndexedDB for instant response
    return this.indexedDB.getPlayers();
  }

  async savePlayer(player: Player): Promise<Player> {
    // Save to IndexedDB immediately
    const savedPlayer = await this.indexedDB.savePlayer(player);
    
    // Sync to Supabase if online, otherwise queue for later
    if (this.shouldSyncToSupabase()) {
      try {
        await this.supabaseProvider.savePlayer(player);
      } catch (error) {
        console.warn('Failed to sync player to Supabase, queuing for later:', error);
        await this.syncManager.queueOperation('create', 'players', player);
      }
    } else {
      // Queue for sync when back online
      await this.syncManager.queueOperation('create', 'players', player);
    }
    
    return savedPlayer;
  }

  async deletePlayer(playerId: string): Promise<void> {
    // Delete from IndexedDB immediately
    await this.indexedDB.deletePlayer(playerId);
    
    // Sync to Supabase if online, otherwise queue for later
    if (this.shouldSyncToSupabase()) {
      try {
        await this.supabaseProvider.deletePlayer(playerId);
      } catch (error) {
        console.warn('Failed to delete player from Supabase, queuing for later:', error);
        await this.syncManager.queueOperation('delete', 'players', { id: playerId });
      }
    } else {
      await this.syncManager.queueOperation('delete', 'players', { id: playerId });
    }
  }

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<Player> {
    // Update in IndexedDB immediately
    const updatedPlayer = await this.indexedDB.updatePlayer(playerId, updates);
    
    // Sync to Supabase if online, otherwise queue for later
    if (this.shouldSyncToSupabase()) {
      try {
        await this.supabaseProvider.updatePlayer(playerId, updates);
      } catch (error) {
        console.warn('Failed to update player in Supabase, queuing for later:', error);
        await this.syncManager.queueOperation('update', 'players', updatedPlayer);
      }
    } else {
      await this.syncManager.queueOperation('update', 'players', updatedPlayer);
    }
    
    return updatedPlayer;
  }

  // Season management - same pattern
  async getSeasons(): Promise<Season[]> {
    return this.indexedDB.getSeasons();
  }

  async saveSeason(season: Season): Promise<Season> {
    const savedSeason = await this.indexedDB.saveSeason(season);
    
    if (this.shouldSyncToSupabase()) {
      try {
        await this.supabaseProvider.saveSeason(season);
      } catch (error) {
        await this.syncManager.queueOperation('create', 'seasons', season);
      }
    } else {
      await this.syncManager.queueOperation('create', 'seasons', season);
    }
    
    return savedSeason;
  }

  async deleteSeason(seasonId: string): Promise<void> {
    await this.indexedDB.deleteSeason(seasonId);
    
    if (this.shouldSyncToSupabase()) {
      try {
        await this.supabaseProvider.deleteSeason(seasonId);
      } catch (error) {
        await this.syncManager.queueOperation('delete', 'seasons', { id: seasonId });
      }
    } else {
      await this.syncManager.queueOperation('delete', 'seasons', { id: seasonId });
    }
  }

  async updateSeason(seasonId: string, updates: Partial<Season>): Promise<Season> {
    const updatedSeason = await this.indexedDB.updateSeason(seasonId, updates);
    
    if (this.shouldSyncToSupabase()) {
      try {
        await this.supabaseProvider.updateSeason(seasonId, updates);
      } catch (error) {
        await this.syncManager.queueOperation('update', 'seasons', updatedSeason);
      }
    } else {
      await this.syncManager.queueOperation('update', 'seasons', updatedSeason);
    }
    
    return updatedSeason;
  }

  // Tournament management - same pattern
  async getTournaments(): Promise<Tournament[]> {
    return this.indexedDB.getTournaments();
  }

  async saveTournament(tournament: Tournament): Promise<Tournament> {
    const savedTournament = await this.indexedDB.saveTournament(tournament);
    
    if (this.shouldSyncToSupabase()) {
      try {
        await this.supabaseProvider.saveTournament(tournament);
      } catch (error) {
        await this.syncManager.queueOperation('create', 'tournaments', tournament);
      }
    } else {
      await this.syncManager.queueOperation('create', 'tournaments', tournament);
    }
    
    return savedTournament;
  }

  async deleteTournament(tournamentId: string): Promise<void> {
    await this.indexedDB.deleteTournament(tournamentId);
    
    if (this.shouldSyncToSupabase()) {
      try {
        await this.supabaseProvider.deleteTournament(tournamentId);
      } catch (error) {
        await this.syncManager.queueOperation('delete', 'tournaments', { id: tournamentId });
      }
    } else {
      await this.syncManager.queueOperation('delete', 'tournaments', { id: tournamentId });
    }
  }

  async updateTournament(tournamentId: string, updates: Partial<Tournament>): Promise<Tournament> {
    const updatedTournament = await this.indexedDB.updateTournament(tournamentId, updates);
    
    if (this.shouldSyncToSupabase()) {
      try {
        await this.supabaseProvider.updateTournament(tournamentId, updates);
      } catch (error) {
        await this.syncManager.queueOperation('update', 'tournaments', updatedTournament);
      }
    } else {
      await this.syncManager.queueOperation('update', 'tournaments', updatedTournament);
    }
    
    return updatedTournament;
  }

  // App settings
  async getAppSettings(): Promise<AppSettings | null> {
    return this.indexedDB.getAppSettings();
  }

  async saveAppSettings(settings: AppSettings): Promise<AppSettings> {
    const savedSettings = await this.indexedDB.saveAppSettings(settings);
    
    if (this.shouldSyncToSupabase()) {
      try {
        await this.supabaseProvider.saveAppSettings(settings);
      } catch (error) {
        await this.syncManager.queueOperation('create', 'app_settings', settings);
      }
    } else {
      await this.syncManager.queueOperation('create', 'app_settings', settings);
    }
    
    return savedSettings;
  }

  // Saved games
  async getSavedGames(): Promise<unknown> {
    return this.indexedDB.getSavedGames();
  }

  async saveSavedGame(gameData: unknown): Promise<unknown> {
    const savedGame = await this.indexedDB.saveSavedGame(gameData);
    
    if (this.shouldSyncToSupabase()) {
      try {
        await this.supabaseProvider.saveSavedGame(gameData);
      } catch (error) {
        await this.syncManager.queueOperation('create', 'saved_games', gameData);
      }
    } else {
      await this.syncManager.queueOperation('create', 'saved_games', gameData);
    }
    
    return savedGame;
  }

  async deleteSavedGame(gameId: string): Promise<void> {
    await this.indexedDB.deleteSavedGame(gameId);
    
    if (this.shouldSyncToSupabase()) {
      try {
        await this.supabaseProvider.deleteSavedGame(gameId);
      } catch (error) {
        await this.syncManager.queueOperation('delete', 'saved_games', { id: gameId });
      }
    } else {
      await this.syncManager.queueOperation('delete', 'saved_games', { id: gameId });
    }
  }

  // Timer state - IndexedDB only (real-time state doesn't need Supabase sync)
  async getTimerState(gameId: string): Promise<TimerState | null> {
    return this.indexedDB.getTimerState(gameId);
  }

  async saveTimerState(timerState: TimerState): Promise<TimerState> {
    return this.indexedDB.saveTimerState(timerState);
  }

  async deleteTimerState(gameId: string): Promise<void> {
    return this.indexedDB.deleteTimerState(gameId);
  }

  // Backup/restore
  async exportAllData(): Promise<unknown> {
    return this.indexedDB.exportAllData();
  }

  async importAllData(data: unknown): Promise<void> {
    await this.indexedDB.importAllData(data);
    
    // After import, trigger sync to push data to Supabase
    if (this.shouldSyncToSupabase()) {
      setTimeout(() => {
        this.syncManager.syncToSupabase().catch(error => {
          console.warn('Failed to sync imported data to Supabase:', error);
        });
      }, 1000);
    }
  }

  // Sync management methods
  async forceSyncToSupabase(): Promise<void> {
    const result = await this.syncManager.syncToSupabase();
    
    if (!result.success) {
      throw new StorageError(
        `Sync failed: ${result.failedItems} items failed to sync`,
        'offlineFirstStorageManager',
        'forceSyncToSupabase'
      );
    }
  }

  async getSyncStats() {
    return this.syncManager.getSyncStats();
  }

  async retryFailedSync() {
    return this.syncManager.retryFailedItems();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline.bind(this));
      window.removeEventListener('offline', this.handleOffline.bind(this));
    }
  }
}