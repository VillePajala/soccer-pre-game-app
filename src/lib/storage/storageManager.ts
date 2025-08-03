// Storage manager with provider selection and fallback logic
import type { IStorageProvider, StorageConfig } from './types';
import { StorageError, NetworkError, AuthenticationError } from './types';
import { LocalStorageProvider } from './localStorageProvider';
import { SupabaseProvider } from './supabaseProvider';
import type { Player, Season, Tournament } from '../../types';
import type { AppSettings } from '../../utils/appSettings';
import { safeConsoleError } from '../../utils/errorSanitization';

export class StorageManager implements IStorageProvider {
  private localStorage: LocalStorageProvider;
  private supabaseProvider: SupabaseProvider;
  private config: StorageConfig;
  private currentProvider: IStorageProvider;

  constructor(config: StorageConfig = { provider: 'localStorage', fallbackToLocalStorage: true }) {
    this.localStorage = new LocalStorageProvider();
    this.supabaseProvider = new SupabaseProvider();
    this.config = config;
    this.currentProvider = this.selectProvider();
  }

  private selectProvider(): IStorageProvider {
    if (this.config.provider === 'supabase') {
      return this.supabaseProvider;
    }
    return this.localStorage;
  }

  private async executeWithFallback<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const originalProvider = this.currentProvider;
    
    try {
      return await operation();
    } catch (error) {
      // If we're using Supabase and fallback is enabled, try localStorage
      if (
        this.config.provider === 'supabase' &&
        this.config.fallbackToLocalStorage &&
        (error instanceof NetworkError || error instanceof AuthenticationError)
      ) {
        safeConsoleError(error, { operation: operationName, additional: { fallback: 'localStorage' } });
        
        try {
          // Temporarily switch to localStorage for fallback operation
          this.currentProvider = this.localStorage;
          const result = await operation();
          
          // Restore original provider
          this.currentProvider = originalProvider;
          return result;
        } catch (fallbackError) {
          // Ensure currentProvider remains consistent even on fallback failure
          this.currentProvider = originalProvider;
          throw new StorageError(
            `Both primary and fallback storage failed for ${operationName}`,
            'storageManager',
            operationName,
            fallbackError as Error
          );
        }
      }
      
      // If no fallback or fallback not applicable, re-throw original error
      throw error;
    }
  }

  // Configuration methods
  setConfig(config: StorageConfig): void {
    this.config = config;
    this.currentProvider = this.selectProvider();
  }

  getConfig(): StorageConfig {
    return { ...this.config };
  }

  getCurrentProviderName(): string {
    return this.currentProvider.getProviderName();
  }

  // IStorageProvider implementation with fallback logic
  getProviderName(): string {
    return `storageManager(${this.currentProvider.getProviderName()})`;
  }

  async isOnline(): Promise<boolean> {
    return await this.currentProvider.isOnline();
  }

  // Player management
  async getPlayers() {
    return this.executeWithFallback(
      () => this.currentProvider.getPlayers(),
      'getPlayers'
    );
  }

  async savePlayer(player: Player) {
    return this.executeWithFallback(
      () => this.currentProvider.savePlayer(player),
      'savePlayer'
    );
  }

  async deletePlayer(playerId: string) {
    return this.executeWithFallback(
      () => this.currentProvider.deletePlayer(playerId),
      'deletePlayer'
    );
  }

  async updatePlayer(playerId: string, updates: Partial<Player>) {
    return this.executeWithFallback(
      () => this.currentProvider.updatePlayer(playerId, updates),
      'updatePlayer'
    );
  }

  // Season management
  async getSeasons() {
    return this.executeWithFallback(
      () => this.currentProvider.getSeasons(),
      'getSeasons'
    );
  }

  async saveSeason(season: Season) {
    return this.executeWithFallback(
      () => this.currentProvider.saveSeason(season),
      'saveSeason'
    );
  }

  async deleteSeason(seasonId: string) {
    return this.executeWithFallback(
      () => this.currentProvider.deleteSeason(seasonId),
      'deleteSeason'
    );
  }

  async updateSeason(seasonId: string, updates: Partial<Season>) {
    return this.executeWithFallback(
      () => this.currentProvider.updateSeason(seasonId, updates),
      'updateSeason'
    );
  }

  // Tournament management
  async getTournaments() {
    return this.executeWithFallback(
      () => this.currentProvider.getTournaments(),
      'getTournaments'
    );
  }

  async saveTournament(tournament: Tournament) {
    return this.executeWithFallback(
      () => this.currentProvider.saveTournament(tournament),
      'saveTournament'
    );
  }

  async deleteTournament(tournamentId: string) {
    return this.executeWithFallback(
      () => this.currentProvider.deleteTournament(tournamentId),
      'deleteTournament'
    );
  }

  async updateTournament(tournamentId: string, updates: Partial<Tournament>) {
    return this.executeWithFallback(
      () => this.currentProvider.updateTournament(tournamentId, updates),
      'updateTournament'
    );
  }

  // App settings
  async getAppSettings() {
    return this.executeWithFallback(
      () => this.currentProvider.getAppSettings(),
      'getAppSettings'
    );
  }

  async saveAppSettings(settings: AppSettings) {
    return this.executeWithFallback(
      () => this.currentProvider.saveAppSettings(settings),
      'saveAppSettings'
    );
  }

  // Saved games
  async getSavedGames() {
    return this.executeWithFallback(
      () => this.currentProvider.getSavedGames(),
      'getSavedGames'
    );
  }

  async saveSavedGame(gameData: unknown) {
    // CRITICAL BUG FIX: Add debugging for assist-related save operations
    const gameState = gameData as Record<string, unknown>;
    const gameEvents = gameState?.gameEvents as Array<Record<string, unknown>> || [];
    const assistEvents = gameEvents.filter((event: Record<string, unknown>) => event.assisterId) || [];
    console.log(`[STORAGE_MANAGER] saveSavedGame called - Provider: ${this.currentProvider.constructor.name}`);
    console.log(`[STORAGE_MANAGER] Events: ${gameEvents.length || 0}, Assist events: ${assistEvents.length}`);
    
    return this.executeWithFallback(
      () => this.currentProvider.saveSavedGame(gameData),
      'saveSavedGame'
    );
  }

  async deleteSavedGame(gameId: string) {
    return this.executeWithFallback(
      () => this.currentProvider.deleteSavedGame(gameId),
      'deleteSavedGame'
    );
  }

  // Backup/restore
  async exportAllData() {
    return this.executeWithFallback(
      () => this.currentProvider.exportAllData(),
      'exportAllData'
    );
  }

  async importAllData(data: unknown) {
    return this.executeWithFallback(
      () => this.currentProvider.importAllData(data),
      'importAllData'
    );
  }

  // Utility methods
  async testConnection(): Promise<{ provider: string; online: boolean; error?: string }> {
    try {
      const online = await this.currentProvider.isOnline();
      return {
        provider: this.currentProvider.getProviderName(),
        online
      };
    } catch (error) {
      return {
        provider: this.currentProvider.getProviderName(),
        online: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async switchProvider(provider: 'localStorage' | 'supabase'): Promise<void> {
    this.config.provider = provider;
    this.currentProvider = this.selectProvider();
  }
}

// Create storage manager synchronously with inline config
function createStorageManagerSync(): StorageManager {
  // Inline configuration to avoid require() issues
  const enableSupabase = process.env.NEXT_PUBLIC_ENABLE_SUPABASE === 'true';
  const disableFallback = process.env.NEXT_PUBLIC_DISABLE_FALLBACK === 'true';
  
  // Basic validation if Supabase is enabled
  if (enableSupabase && process.env.NODE_ENV !== 'test') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      throw new Error(
        'Supabase is enabled but required environment variables are missing.\n' +
        'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file.\n' +
        'See .env.example for reference.'
      );
    }
  }
  
  const config = {
    provider: enableSupabase ? 'supabase' as const : 'localStorage' as const,
    fallbackToLocalStorage: !disableFallback,
  };
  
  return new StorageManager(config);
}

// Export a singleton instance
export const storageManager = createStorageManagerSync();

// Export types and classes for direct usage if needed
export * from './types';
export { LocalStorageProvider } from './localStorageProvider';
export { SupabaseProvider } from './supabaseProvider';