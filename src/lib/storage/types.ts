// Storage abstraction types
import type { Player, Season, Tournament, AppSettings } from '../../types';

// Storage provider interface
export interface IStorageProvider {
  // Player management
  getPlayers(): Promise<Player[]>;
  savePlayer(player: Player): Promise<Player>;
  deletePlayer(playerId: string): Promise<void>;
  updatePlayer(playerId: string, updates: Partial<Player>): Promise<Player>;

  // Season management
  getSeasons(): Promise<Season[]>;
  saveSeason(season: Season): Promise<Season>;
  deleteSeason(seasonId: string): Promise<void>;
  updateSeason(seasonId: string, updates: Partial<Season>): Promise<Season>;

  // Tournament management
  getTournaments(): Promise<Tournament[]>;
  saveTournament(tournament: Tournament): Promise<Tournament>;
  deleteTournament(tournamentId: string): Promise<void>;
  updateTournament(tournamentId: string, updates: Partial<Tournament>): Promise<Tournament>;

  // App settings
  getAppSettings(): Promise<AppSettings | null>;
  saveAppSettings(settings: AppSettings): Promise<AppSettings>;

  // Saved games (generic JSON storage)
  getSavedGames(): Promise<any[]>;
  saveSavedGame(gameData: any): Promise<any>;
  deleteSavedGame(gameId: string): Promise<void>;

  // Backup/restore
  exportAllData(): Promise<any>;
  importAllData(data: any): Promise<void>;

  // Provider info
  getProviderName(): string;
  isOnline(): Promise<boolean>;
}

// Storage configuration
export interface StorageConfig {
  provider: 'localStorage' | 'supabase';
  fallbackToLocalStorage: boolean;
}

// Error types
export class StorageError extends Error {
  constructor(
    message: string, 
    public provider: string,
    public operation: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export class NetworkError extends StorageError {
  constructor(provider: string, operation: string, originalError?: Error) {
    super('Network operation failed', provider, operation, originalError);
    this.name = 'NetworkError';
  }
}

export class AuthenticationError extends StorageError {
  constructor(provider: string, operation: string, originalError?: Error) {
    super('Authentication required', provider, operation, originalError);
    this.name = 'AuthenticationError';
  }
}