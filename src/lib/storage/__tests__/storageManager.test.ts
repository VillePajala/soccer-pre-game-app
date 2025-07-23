// Unit tests for StorageManager
import { StorageManager } from '../storageManager';
import { LocalStorageProvider } from '../localStorageProvider';
import { SupabaseProvider } from '../supabaseProvider';
import { NetworkError, AuthenticationError } from '../types';
import type { StorageConfig } from '../types';

// Mock the providers
jest.mock('../localStorageProvider', () => ({
  LocalStorageProvider: jest.fn(() => ({
    getProviderName: jest.fn().mockReturnValue('localStorage'),
    isOnline: jest.fn().mockResolvedValue(true),
    getPlayers: jest.fn().mockResolvedValue([]),
    savePlayer: jest.fn(),
    updatePlayer: jest.fn(),
    deletePlayer: jest.fn().mockResolvedValue(undefined),
    getSeasons: jest.fn().mockResolvedValue([]),
    saveSeason: jest.fn(),
    updateSeason: jest.fn(),
    deleteSeason: jest.fn().mockResolvedValue(undefined),
    getTournaments: jest.fn().mockResolvedValue([]),
    saveTournament: jest.fn(),
    updateTournament: jest.fn(),
    deleteTournament: jest.fn().mockResolvedValue(undefined),
    getGames: jest.fn().mockResolvedValue([]),
    saveGame: jest.fn(),
    updateGame: jest.fn(),
    deleteGame: jest.fn().mockResolvedValue(undefined),
    getAppSettings: jest.fn().mockResolvedValue({}),
    saveAppSettings: jest.fn(),
    exportData: jest.fn().mockResolvedValue({}),
    importData: jest.fn().mockResolvedValue(undefined),
  }))
}));

jest.mock('../supabaseProvider', () => ({
  SupabaseProvider: jest.fn(() => ({
    getProviderName: jest.fn().mockReturnValue('supabase'),
    isOnline: jest.fn().mockResolvedValue(true),
    getPlayers: jest.fn().mockResolvedValue([]),
    savePlayer: jest.fn(),
    updatePlayer: jest.fn(),
    deletePlayer: jest.fn().mockResolvedValue(undefined),
    getSeasons: jest.fn().mockResolvedValue([]),
    saveSeason: jest.fn(),
    updateSeason: jest.fn(),
    deleteSeason: jest.fn().mockResolvedValue(undefined),
    getTournaments: jest.fn().mockResolvedValue([]),
    saveTournament: jest.fn(),
    updateTournament: jest.fn(),
    deleteTournament: jest.fn().mockResolvedValue(undefined),
    getGames: jest.fn().mockResolvedValue([]),
    saveGame: jest.fn(),
    updateGame: jest.fn(),
    deleteGame: jest.fn().mockResolvedValue(undefined),
    getAppSettings: jest.fn().mockResolvedValue({}),
    saveAppSettings: jest.fn(),
    exportData: jest.fn().mockResolvedValue({}),
    importData: jest.fn().mockResolvedValue(undefined),
  }))
}));

const MockLocalStorageProvider = LocalStorageProvider as jest.MockedClass<typeof LocalStorageProvider>;
const MockSupabaseProvider = SupabaseProvider as jest.MockedClass<typeof SupabaseProvider>;

describe('StorageManager', () => {
  let storageManager: StorageManager;
  let mockLocalProvider: jest.Mocked<LocalStorageProvider>;
  let mockSupabaseProvider: jest.Mocked<SupabaseProvider>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockLocalProvider = new MockLocalStorageProvider() as jest.Mocked<LocalStorageProvider>;
    mockSupabaseProvider = new MockSupabaseProvider() as jest.Mocked<SupabaseProvider>;

    // Mock the constructors to return our mock instances
    MockLocalStorageProvider.mockImplementation(() => mockLocalProvider);
    MockSupabaseProvider.mockImplementation(() => mockSupabaseProvider);

    // Set up default mock behaviors
    mockLocalProvider.getProviderName.mockReturnValue('localStorage');
    mockSupabaseProvider.getProviderName.mockReturnValue('supabase');
    mockLocalProvider.isOnline.mockResolvedValue(true);
    mockSupabaseProvider.isOnline.mockResolvedValue(true);
  });

  describe('Provider Selection', () => {
    it('should use localStorage provider by default', () => {
      const config: StorageConfig = { provider: 'localStorage', fallbackToLocalStorage: true };
      storageManager = new StorageManager(config);
      
      expect(storageManager.getCurrentProviderName()).toBe('localStorage');
    });

    it('should use supabase provider when configured', () => {
      const config: StorageConfig = { provider: 'supabase', fallbackToLocalStorage: true };
      storageManager = new StorageManager(config);
      
      expect(storageManager.getCurrentProviderName()).toBe('supabase');
    });

    it('should allow switching providers', async () => {
      storageManager = new StorageManager();
      expect(storageManager.getCurrentProviderName()).toBe('localStorage');
      
      await storageManager.switchProvider('supabase');
      expect(storageManager.getCurrentProviderName()).toBe('supabase');
    });
  });

  describe('Fallback Logic', () => {
    beforeEach(() => {
      const config: StorageConfig = { provider: 'supabase', fallbackToLocalStorage: true };
      storageManager = new StorageManager(config);
    });

    it('should fallback to localStorage when supabase fails with NetworkError', async () => {
      const mockError = new NetworkError('supabase', 'getPlayers');
      mockSupabaseProvider.getPlayers.mockRejectedValue(mockError);
      mockLocalProvider.getPlayers.mockResolvedValue([
        { id: '1', name: 'Test Player', isGoalie: false, receivedFairPlayCard: false }
      ]);

      const result = await storageManager.getPlayers();
      
      expect(mockSupabaseProvider.getPlayers).toHaveBeenCalled();
      expect(mockLocalProvider.getPlayers).toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Test Player');
    });

    it('should fallback to localStorage when supabase fails with AuthenticationError', async () => {
      const mockError = new AuthenticationError('supabase', 'getPlayers');
      mockSupabaseProvider.getPlayers.mockRejectedValue(mockError);
      mockLocalProvider.getPlayers.mockResolvedValue([]);

      const result = await storageManager.getPlayers();
      
      expect(mockSupabaseProvider.getPlayers).toHaveBeenCalled();
      expect(mockLocalProvider.getPlayers).toHaveBeenCalled();
      expect(result).toEqual([]);
    });

    it('should not fallback for other types of errors', async () => {
      const mockError = new Error('Unknown error');
      mockSupabaseProvider.getPlayers.mockRejectedValue(mockError);

      await expect(storageManager.getPlayers()).rejects.toThrow('Unknown error');
      expect(mockSupabaseProvider.getPlayers).toHaveBeenCalled();
      expect(mockLocalProvider.getPlayers).not.toHaveBeenCalled();
    });

    it('should throw StorageError when both primary and fallback fail', async () => {
      const primaryError = new NetworkError('supabase', 'getPlayers');
      const fallbackError = new Error('Fallback error');
      
      mockSupabaseProvider.getPlayers.mockRejectedValue(primaryError);
      mockLocalProvider.getPlayers.mockRejectedValue(fallbackError);

      await expect(storageManager.getPlayers()).rejects.toThrow('Both primary and fallback storage failed');
      expect(mockSupabaseProvider.getPlayers).toHaveBeenCalled();
      expect(mockLocalProvider.getPlayers).toHaveBeenCalled();
    });
  });

  describe('Player Operations', () => {
    beforeEach(() => {
      storageManager = new StorageManager();
    });

    it('should delegate getPlayers to current provider', async () => {
      const mockPlayers = [
        { id: '1', name: 'Player 1', isGoalie: false, receivedFairPlayCard: false },
        { id: '2', name: 'Player 2', isGoalie: true, receivedFairPlayCard: false }
      ];
      mockLocalProvider.getPlayers.mockResolvedValue(mockPlayers);

      const result = await storageManager.getPlayers();
      
      expect(mockLocalProvider.getPlayers).toHaveBeenCalled();
      expect(result).toEqual(mockPlayers);
    });

    it('should delegate savePlayer to current provider', async () => {
      const mockPlayer = { id: '1', name: 'New Player', isGoalie: false, receivedFairPlayCard: false };
      mockLocalProvider.savePlayer.mockResolvedValue(mockPlayer);

      const result = await storageManager.savePlayer(mockPlayer);
      
      expect(mockLocalProvider.savePlayer).toHaveBeenCalledWith(mockPlayer);
      expect(result).toEqual(mockPlayer);
    });

    it('should delegate deletePlayer to current provider', async () => {
      mockLocalProvider.deletePlayer.mockResolvedValue();

      await storageManager.deletePlayer('player-1');
      
      expect(mockLocalProvider.deletePlayer).toHaveBeenCalledWith('player-1');
    });

    it('should delegate updatePlayer to current provider', async () => {
      const mockUpdates = { name: 'Updated Name' };
      const mockUpdatedPlayer = { id: '1', name: 'Updated Name', isGoalie: false, receivedFairPlayCard: false };
      mockLocalProvider.updatePlayer.mockResolvedValue(mockUpdatedPlayer);

      const result = await storageManager.updatePlayer('player-1', mockUpdates);
      
      expect(mockLocalProvider.updatePlayer).toHaveBeenCalledWith('player-1', mockUpdates);
      expect(result).toEqual(mockUpdatedPlayer);
    });
  });

  describe('Season Operations', () => {
    beforeEach(() => {
      storageManager = new StorageManager();
    });

    it('should delegate getSeasons to current provider', async () => {
      const mockSeasons = [
        { id: '1', name: 'Season 1', startDate: '2024-01-01', endDate: '2024-12-31' }
      ];
      mockLocalProvider.getSeasons.mockResolvedValue(mockSeasons);

      const result = await storageManager.getSeasons();
      
      expect(mockLocalProvider.getSeasons).toHaveBeenCalled();
      expect(result).toEqual(mockSeasons);
    });

    it('should delegate saveSeason to current provider', async () => {
      const mockSeason = { id: '1', name: 'New Season', startDate: '2024-01-01', endDate: '2024-12-31' };
      mockLocalProvider.saveSeason.mockResolvedValue(mockSeason);

      const result = await storageManager.saveSeason(mockSeason);
      
      expect(mockLocalProvider.saveSeason).toHaveBeenCalledWith(mockSeason);
      expect(result).toEqual(mockSeason);
    });
  });

  describe('Configuration Management', () => {
    it('should return current configuration', () => {
      const config: StorageConfig = { provider: 'supabase', fallbackToLocalStorage: false };
      storageManager = new StorageManager(config);
      
      const currentConfig = storageManager.getConfig();
      expect(currentConfig).toEqual(config);
    });

    it('should update configuration and switch providers', () => {
      storageManager = new StorageManager();
      expect(storageManager.getCurrentProviderName()).toBe('localStorage');
      
      const newConfig: StorageConfig = { provider: 'supabase', fallbackToLocalStorage: true };
      storageManager.setConfig(newConfig);
      
      expect(storageManager.getCurrentProviderName()).toBe('supabase');
      expect(storageManager.getConfig()).toEqual(newConfig);
    });
  });

  describe('Connection Testing', () => {
    beforeEach(() => {
      storageManager = new StorageManager();
    });

    it('should test connection and return status', async () => {
      mockLocalProvider.isOnline.mockResolvedValue(true);

      const result = await storageManager.testConnection();
      
      expect(result).toEqual({
        provider: 'localStorage',
        online: true
      });
    });

    it('should handle connection test errors', async () => {
      mockLocalProvider.isOnline.mockRejectedValue(new Error('Connection failed'));

      const result = await storageManager.testConnection();
      
      expect(result).toEqual({
        provider: 'localStorage',
        online: false,
        error: 'Connection failed'
      });
    });
  });

  describe('Provider Name', () => {
    it('should return storage manager provider name', () => {
      storageManager = new StorageManager();
      expect(storageManager.getProviderName()).toBe('storageManager(localStorage)');
    });
  });

  describe('Online Status', () => {
    it('should delegate isOnline to current provider', async () => {
      storageManager = new StorageManager();
      mockLocalProvider.isOnline.mockResolvedValue(true);

      const result = await storageManager.isOnline();
      
      expect(mockLocalProvider.isOnline).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});