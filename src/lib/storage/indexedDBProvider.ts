// IndexedDB provider for offline-first storage
import type { IStorageProvider } from './types';
import type { Player, Season, Tournament, TimerState, AppState } from '../../types';
import type { AppSettings } from '../../utils/appSettings';

// IndexedDB schema definition
export interface IndexedDBSchema {
  players: Player[];
  seasons: Season[];
  tournaments: Tournament[];
  saved_games: Record<string, AppState>;
  timer_states: TimerState[];
  sync_queue: SyncQueueItem[];
  app_settings: AppSettings;
}

// Sync queue item for offline operations
export interface SyncQueueItem {
  id: string;
  operation: 'create' | 'update' | 'delete';
  table: keyof IndexedDBSchema;
  data: unknown;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
}

// IndexedDB database configuration
const DB_NAME = 'soccer_coach_app';
const DB_VERSION = 2; // Incremented for gameId -> id migration

export class IndexedDBProvider implements IStorageProvider {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  constructor() {
    // Only initialize IndexedDB in browser environment
    if (typeof window !== 'undefined' && 'indexedDB' in window) {
      this.initPromise = this.initDatabase();
    } else {
      // Server-side fallback - IndexedDB not available
      this.initPromise = Promise.resolve();
    }
  }

  /**
   * Initialize IndexedDB database with proper schema
   */
  private async initDatabase(): Promise<void> {
    // Guard against server-side rendering
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      throw new Error('IndexedDB not available');
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB database'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const oldVersion = event.oldVersion;
        
        // Handle migration from version 1 to 2 (gameId -> id)
        if (oldVersion === 1 && event.newVersion === 2) {
          console.log('[IndexedDB] Migrating from version 1 to 2: gameId -> id field change');
          
          // For saved_games: We must delete and recreate because keyPath changed
          // Unfortunately, this means losing existing data in IndexedDB
          // But users' data should still be in localStorage or Supabase
          if (db.objectStoreNames.contains('saved_games')) {
            db.deleteObjectStore('saved_games');
            console.log('[IndexedDB] Deleted old saved_games store with gameId keyPath');
          }
          
          // For timer_states: Same issue with keyPath change
          if (db.objectStoreNames.contains('timer_states')) {
            db.deleteObjectStore('timer_states');
            console.log('[IndexedDB] Deleted old timer_states store with gameId keyPath');
          }
        }
        
        // Create object stores if they don't exist (will recreate with correct keyPath)
        this.createObjectStores(db);
      };
    });
  }

  /**
   * Create all necessary object stores
   */
  private createObjectStores(db: IDBDatabase): void {
    // Players store
    if (!db.objectStoreNames.contains('players')) {
      const playersStore = db.createObjectStore('players', { keyPath: 'id' });
      playersStore.createIndex('name', 'name', { unique: false });
    }

    // Seasons store
    if (!db.objectStoreNames.contains('seasons')) {
      const seasonsStore = db.createObjectStore('seasons', { keyPath: 'id' });
      seasonsStore.createIndex('name', 'name', { unique: false });
    }

    // Tournaments store
    if (!db.objectStoreNames.contains('tournaments')) {
      const tournamentsStore = db.createObjectStore('tournaments', { keyPath: 'id' });
      tournamentsStore.createIndex('name', 'name', { unique: false });
    }

    // Saved games store
    if (!db.objectStoreNames.contains('saved_games')) {
      const gamesStore = db.createObjectStore('saved_games', { keyPath: 'id' });
      gamesStore.createIndex('timestamp', 'lastSaved', { unique: false });
    }

    // Timer states store
    if (!db.objectStoreNames.contains('timer_states')) {
      const timerStore = db.createObjectStore('timer_states', { keyPath: 'id' });
      timerStore.createIndex('timestamp', 'timestamp', { unique: false });
    }

    // Sync queue store
    if (!db.objectStoreNames.contains('sync_queue')) {
      const syncStore = db.createObjectStore('sync_queue', { keyPath: 'id' });
      syncStore.createIndex('timestamp', 'timestamp', { unique: false });
      syncStore.createIndex('status', 'status', { unique: false });
    }

    // App settings store (single record)
    if (!db.objectStoreNames.contains('app_settings')) {
      db.createObjectStore('app_settings', { keyPath: 'id' });
    }
  }

  /**
   * Ensure database is initialized before operations
   */
  private async ensureInit(): Promise<IDBDatabase> {
    if (this.initPromise) {
      await this.initPromise;
    }
    if (!this.db) {
      throw new Error('IndexedDB not initialized');
    }
    return this.db;
  }

  /**
   * Generic method to get all records from a store
   */
  private async getAllFromStore<T>(storeName: string): Promise<T[]> {
    const db = await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error(`Failed to get all from ${storeName}`));
    });
  }

  /**
   * Generic method to save a record to a store
   */
  private async saveToStore<T>(storeName: string, data: T): Promise<T> {
    const db = await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(data);

      request.onsuccess = () => resolve(data);
      request.onerror = () => reject(new Error(`Failed to save to ${storeName}`));
    });
  }

  /**
   * Generic method to delete a record from a store
   */
  private async deleteFromStore(storeName: string, key: string): Promise<void> {
    const db = await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to delete from ${storeName}`));
    });
  }

  // IStorageProvider implementation

  getProviderName(): string {
    return 'indexedDB';
  }

  async isOnline(): Promise<boolean> {
    // IndexedDB is always "online" - it's local storage
    return true;
  }

  // Player management
  async getPlayers(): Promise<Player[]> {
    return this.getAllFromStore<Player>('players');
  }

  async savePlayer(player: Player): Promise<Player> {
    return this.saveToStore('players', player);
  }

  async deletePlayer(playerId: string): Promise<void> {
    return this.deleteFromStore('players', playerId);
  }

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<Player> {
    const players = await this.getPlayers();
    const existingPlayer = players.find(p => p.id === playerId);
    
    if (!existingPlayer) {
      throw new Error(`Player with id ${playerId} not found`);
    }

    const updatedPlayer = { ...existingPlayer, ...updates };
    return this.savePlayer(updatedPlayer);
  }

  // Season management
  async getSeasons(): Promise<Season[]> {
    return this.getAllFromStore<Season>('seasons');
  }

  async saveSeason(season: Season): Promise<Season> {
    return this.saveToStore('seasons', season);
  }

  async deleteSeason(seasonId: string): Promise<void> {
    return this.deleteFromStore('seasons', seasonId);
  }

  async updateSeason(seasonId: string, updates: Partial<Season>): Promise<Season> {
    const seasons = await this.getSeasons();
    const existingSeason = seasons.find(s => s.id === seasonId);
    
    if (!existingSeason) {
      throw new Error(`Season with id ${seasonId} not found`);
    }

    const updatedSeason = { ...existingSeason, ...updates };
    return this.saveSeason(updatedSeason);
  }

  // Tournament management
  async getTournaments(): Promise<Tournament[]> {
    return this.getAllFromStore<Tournament>('tournaments');
  }

  async saveTournament(tournament: Tournament): Promise<Tournament> {
    return this.saveToStore('tournaments', tournament);
  }

  async deleteTournament(tournamentId: string): Promise<void> {
    return this.deleteFromStore('tournaments', tournamentId);
  }

  async updateTournament(tournamentId: string, updates: Partial<Tournament>): Promise<Tournament> {
    const tournaments = await this.getTournaments();
    const existingTournament = tournaments.find(t => t.id === tournamentId);
    
    if (!existingTournament) {
      throw new Error(`Tournament with id ${tournamentId} not found`);
    }

    const updatedTournament = { ...existingTournament, ...updates };
    return this.saveTournament(updatedTournament);
  }

  // App settings
  async getAppSettings(): Promise<AppSettings | null> {
    const db = await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['app_settings'], 'readonly');
      const store = transaction.objectStore('app_settings');
      const request = store.get('default');

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get app settings'));
    });
  }

  async saveAppSettings(settings: AppSettings): Promise<AppSettings> {
    return this.saveToStore('app_settings', { id: 'default', ...settings });
  }

  // Saved games
  async getSavedGames(): Promise<unknown> {
    const games = await this.getAllFromStore<AppState>('saved_games');
    const gamesRecord: Record<string, AppState> = {};
    
    games.forEach(game => {
      if ('id' in game && game.id && typeof game.id === 'string') {
        gamesRecord[game.id] = game;
      }
    });
    
    return gamesRecord;
  }

  async saveSavedGame(gameData: unknown): Promise<unknown> {
    if (typeof gameData !== 'object' || !gameData || !('id' in gameData)) {
      throw new Error('Invalid game data: missing id');
    }

    return this.saveToStore('saved_games', gameData);
  }

  async deleteSavedGame(gameId: string): Promise<void> {
    return this.deleteFromStore('saved_games', gameId);
  }

  // Backup/restore
  async exportAllData(): Promise<unknown> {
    const [players, seasons, tournaments, games, settings] = await Promise.all([
      this.getPlayers(),
      this.getSeasons(),
      this.getTournaments(),
      this.getSavedGames(),
      this.getAppSettings()
    ]);

    return {
      players,
      seasons,
      tournaments,
      saved_games: games,
      app_settings: settings,
      exported_at: new Date().toISOString()
    };
  }

  async importAllData(data: unknown): Promise<void> {
    if (typeof data !== 'object' || !data) {
      throw new Error('Invalid import data');
    }

    const importData = data as Record<string, unknown>;

    // Import each data type
    if (importData.players && Array.isArray(importData.players)) {
      for (const player of importData.players) {
        await this.savePlayer(player);
      }
    }

    if (importData.seasons && Array.isArray(importData.seasons)) {
      for (const season of importData.seasons) {
        await this.saveSeason(season);
      }
    }

    if (importData.tournaments && Array.isArray(importData.tournaments)) {
      for (const tournament of importData.tournaments) {
        await this.saveTournament(tournament);
      }
    }

    if (importData.saved_games && typeof importData.saved_games === 'object') {
      for (const [gameId, gameData] of Object.entries(importData.saved_games)) {
        await this.saveSavedGame({ ...gameData, id: gameId });
      }
    }

    if (importData.app_settings) {
      await this.saveAppSettings(importData.app_settings as AppSettings);
    }
  }

  // Timer state specific methods
  async getTimerState(gameId: string): Promise<TimerState | null> {
    const db = await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['timer_states'], 'readonly');
      const store = transaction.objectStore('timer_states');
      const request = store.get(gameId);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(new Error('Failed to get timer state'));
    });
  }

  async saveTimerState(timerState: TimerState): Promise<TimerState> {
    return this.saveToStore('timer_states', timerState);
  }

  async deleteTimerState(gameId: string): Promise<void> {
    return this.deleteFromStore('timer_states', gameId);
  }

  // Sync queue management
  async addToSyncQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<void> {
    const syncItem: SyncQueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    };

    await this.saveToStore('sync_queue', syncItem);
  }

  async getSyncQueue(): Promise<SyncQueueItem[]> {
    return this.getAllFromStore<SyncQueueItem>('sync_queue');
  }

  async updateSyncQueueItem(id: string, updates: Partial<SyncQueueItem>): Promise<void> {
    const db = await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const existingItem = getRequest.result;
        if (!existingItem) {
          reject(new Error(`Sync queue item ${id} not found`));
          return;
        }

        const updatedItem = { ...existingItem, ...updates };
        const putRequest = store.put(updatedItem);
        
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(new Error('Failed to update sync queue item'));
      };

      getRequest.onerror = () => reject(new Error('Failed to get sync queue item'));
    });
  }

  async deleteSyncQueueItem(id: string): Promise<void> {
    return this.deleteFromStore('sync_queue', id);
  }

  async clearCompletedSyncItems(): Promise<void> {
    const db = await this.ensureInit();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(['sync_queue'], 'readwrite');
      const store = transaction.objectStore('sync_queue');
      const index = store.index('status');
      const request = index.openCursor(IDBKeyRange.only('completed'));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(new Error('Failed to clear completed sync items'));
    });
  }
}