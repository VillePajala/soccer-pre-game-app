// Storage manager with provider selection and fallback logic
import type { IStorageProvider, StorageConfig } from './types';
import { StorageError, NetworkError, AuthenticationError } from './types';
import { LocalStorageProvider } from './localStorageProvider';
import { SupabaseProvider } from './supabaseProvider';

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
    try {
      return await operation();
    } catch (error) {
      // If we're using Supabase and fallback is enabled, try localStorage
      if (
        this.config.provider === 'supabase' &&
        this.config.fallbackToLocalStorage &&
        (error instanceof NetworkError || error instanceof AuthenticationError)
      ) {
        console.warn(`Supabase ${operationName} failed, falling back to localStorage:`, error.message);
        
        // Temporarily switch to localStorage for this operation
        const originalProvider = this.currentProvider;
        this.currentProvider = this.localStorage;
        
        try {
          const result = await operation();
          this.currentProvider = originalProvider; // Restore original provider
          return result;
        } catch (fallbackError) {
          this.currentProvider = originalProvider; // Restore original provider
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

  async savePlayer(player: unknown) {
    return this.executeWithFallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => this.currentProvider.savePlayer(player as any),
      'savePlayer'
    );
  }

  async deletePlayer(playerId: string) {
    return this.executeWithFallback(
      () => this.currentProvider.deletePlayer(playerId),
      'deletePlayer'
    );
  }

  async updatePlayer(playerId: string, updates: unknown) {
    return this.executeWithFallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => this.currentProvider.updatePlayer(playerId, updates as any),
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

  async saveSeason(season: unknown) {
    return this.executeWithFallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => this.currentProvider.saveSeason(season as any),
      'saveSeason'
    );
  }

  async deleteSeason(seasonId: string) {
    return this.executeWithFallback(
      () => this.currentProvider.deleteSeason(seasonId),
      'deleteSeason'
    );
  }

  async updateSeason(seasonId: string, updates: unknown) {
    return this.executeWithFallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => this.currentProvider.updateSeason(seasonId, updates as any),
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

  async saveTournament(tournament: unknown) {
    return this.executeWithFallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => this.currentProvider.saveTournament(tournament as any),
      'saveTournament'
    );
  }

  async deleteTournament(tournamentId: string) {
    return this.executeWithFallback(
      () => this.currentProvider.deleteTournament(tournamentId),
      'deleteTournament'
    );
  }

  async updateTournament(tournamentId: string, updates: unknown) {
    return this.executeWithFallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => this.currentProvider.updateTournament(tournamentId, updates as any),
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

  async saveAppSettings(settings: unknown) {
    return this.executeWithFallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => this.currentProvider.saveAppSettings(settings as any),
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
    return this.executeWithFallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => this.currentProvider.saveSavedGame(gameData as any),
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      () => this.currentProvider.importAllData(data as any),
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

// Export a singleton instance
export const storageManager = new StorageManager();

// Export types and classes for direct usage if needed
export * from './types';
export { LocalStorageProvider } from './localStorageProvider';
export { SupabaseProvider } from './supabaseProvider';