// Unit tests for export local data functionality
import { exportLocalStorageData, downloadLocalDataExport, getLocalDataSummary, hasSignificantLocalData, validateExportedData } from '../exportLocalData';

// Mock the utility modules
jest.mock('../../../utils/masterRosterManager');
jest.mock('../../../utils/seasons');
jest.mock('../../../utils/tournaments');
jest.mock('../../../utils/savedGames');
jest.mock('../../../utils/appSettings');

import { getMasterRoster } from '../../../utils/masterRosterManager';
import { getSeasons } from '../../../utils/seasons';
import { getTournaments } from '../../../utils/tournaments';
import { getSavedGames } from '../../../utils/savedGames';
import { getAppSettings } from '../../../utils/appSettings';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('Export Local Data', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    
    // Setup default mock implementations
    (getMasterRoster as jest.Mock).mockResolvedValue([]);
    (getSeasons as jest.Mock).mockResolvedValue([]);
    (getTournaments as jest.Mock).mockResolvedValue([]);
    (getSavedGames as jest.Mock).mockResolvedValue({});
    (getAppSettings as jest.Mock).mockResolvedValue(null);
  });

  describe('exportLocalStorageData', () => {
    it('should export all available data types', async () => {
      // Mock data
      const mockPlayers = [
        { id: 'p1', name: 'Player 1', isGoalie: false, receivedFairPlayCard: false },
        { id: 'p2', name: 'Player 2', isGoalie: true, receivedFairPlayCard: false }
      ];

      const mockSeasons = [
        { id: 's1', name: 'Season 1', startDate: '2024-01-01', endDate: '2024-06-01' }
      ];

      const mockTournaments = [
        { id: 't1', name: 'Tournament 1', startDate: '2024-07-01', endDate: '2024-07-15' }
      ];

      const mockGames = {
        'g1': { id: 'g1', date: '2024-03-15', teamName: 'Team A', gameState: {} }
      };

      const mockSettings = {
        currentGameId: 'g1',
        preferredLanguage: 'en',
        theme: 'light'
      };

      // Set up mocks
      (getMasterRoster as jest.Mock).mockResolvedValue(mockPlayers);
      (getSeasons as jest.Mock).mockResolvedValue(mockSeasons);
      (getTournaments as jest.Mock).mockResolvedValue(mockTournaments);
      (getSavedGames as jest.Mock).mockResolvedValue(mockGames);
      (getAppSettings as jest.Mock).mockResolvedValue(mockSettings);

      const exportedData = await exportLocalStorageData();

      expect(exportedData).toEqual({
        exportVersion: '1.0.0',
        exportDate: expect.any(String),
        source: 'localStorage',
        data: {
          players: mockPlayers,
          seasons: mockSeasons,
          tournaments: mockTournaments,
          savedGames: mockGames,
          appSettings: mockSettings
        },
        stats: {
          totalPlayers: 2,
          totalSeasons: 1,
          totalTournaments: 1,
          totalGames: 1,
          hasSettings: true
        }
      });
    });

    it('should handle missing data gracefully', async () => {
      // Only provide players data
      (getMasterRoster as jest.Mock).mockResolvedValue([{ id: 'p1', name: 'Player 1', isGoalie: false, receivedFairPlayCard: false }]);
      (getSeasons as jest.Mock).mockResolvedValue([]);
      (getTournaments as jest.Mock).mockResolvedValue([]);
      (getSavedGames as jest.Mock).mockResolvedValue({});
      (getAppSettings as jest.Mock).mockResolvedValue(null);

      const exportedData = await exportLocalStorageData();

      expect(exportedData.data.players).toHaveLength(1);
      expect(exportedData.data.seasons).toEqual([]);
      expect(exportedData.data.tournaments).toEqual([]);
      expect(exportedData.data.savedGames).toEqual({});
      expect(exportedData.data.appSettings).toBeNull();
      expect(exportedData.stats.totalPlayers).toBe(1);
      expect(exportedData.stats.totalSeasons).toBe(0);
      expect(exportedData.stats.totalTournaments).toBe(0);
      expect(exportedData.stats.totalGames).toBe(0);
      expect(exportedData.stats.hasSettings).toBe(false);
    });

    it('should handle errors from utility functions', async () => {
      // Mock error for getMasterRoster
      (getMasterRoster as jest.Mock).mockRejectedValue(new Error('Failed to get roster'));
      (getSeasons as jest.Mock).mockResolvedValue([{ id: 's1', name: 'Valid Season', startDate: '2024-01-01', endDate: '2024-06-01' }]);
      (getTournaments as jest.Mock).mockResolvedValue([]);
      (getSavedGames as jest.Mock).mockResolvedValue({});
      (getAppSettings as jest.Mock).mockResolvedValue(null);

      // Should throw an error
      await expect(exportLocalStorageData()).rejects.toThrow('Failed to export localStorage data');
    });

    it('should include export timestamp', async () => {
      const beforeExport = new Date().toISOString();
      const exportedData = await exportLocalStorageData();
      const afterExport = new Date().toISOString();

      expect(Date.parse(exportedData.exportDate)).toBeGreaterThanOrEqual(Date.parse(beforeExport));
      expect(Date.parse(exportedData.exportDate)).toBeLessThanOrEqual(Date.parse(afterExport));
    });

    it('should validate exported data', async () => {
      // Mock data with invalid player (missing name)
      (getMasterRoster as jest.Mock).mockResolvedValue([{ id: 'p1' }]);
      (getSeasons as jest.Mock).mockResolvedValue([]);
      (getTournaments as jest.Mock).mockResolvedValue([]);
      (getSavedGames as jest.Mock).mockResolvedValue({});
      (getAppSettings as jest.Mock).mockResolvedValue(null);

      // Should throw validation error
      await expect(exportLocalStorageData()).rejects.toThrow('Invalid player at index 0');
    });
  });

  describe('validateExportedData', () => {
    it('should validate correct export format', () => {
      const validData = {
        exportVersion: '1.0.0',
        exportDate: new Date().toISOString(),
        source: 'localStorage',
        data: {
          players: [
            { id: 'p1', name: 'Player 1', isGoalie: false, receivedFairPlayCard: false }
          ],
          seasons: [
            { id: 's1', name: 'Season 1', startDate: '2024-01-01', endDate: '2024-06-01' }
          ],
          tournaments: [],
          savedGames: {},
          appSettings: null
        },
        stats: {
          totalPlayers: 1,
          totalSeasons: 1,
          totalTournaments: 0,
          totalGames: 0,
          hasSettings: false
        }
      };

      const result = validateExportedData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing required fields', () => {
      const invalidData = {
        data: {
          players: [],
          seasons: [],
          tournaments: [],
          savedGames: {},
          appSettings: null
        }
      };

      const result = validateExportedData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing exportVersion');
      expect(result.errors).toContain('Missing exportDate');
      expect(result.errors).toContain('Missing source');
      expect(result.errors).toContain('Missing stats section');
    });

    it('should detect missing data section', () => {
      const invalidData = {
        exportVersion: '1.0.0',
        exportDate: new Date().toISOString(),
        source: 'localStorage',
        stats: {
          totalPlayers: 0,
          totalSeasons: 0,
          totalTournaments: 0,
          totalGames: 0,
          hasSettings: false
        }
      };

      const result = validateExportedData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing data section');
    });

    it('should detect invalid player data', () => {
      const invalidData = {
        exportVersion: '1.0.0',
        exportDate: new Date().toISOString(),
        source: 'localStorage',
        data: {
          players: [
            { id: 'p1' } // Missing required fields
          ],
          seasons: [],
          tournaments: [],
          savedGames: {},
          appSettings: null
        },
        stats: {
          totalPlayers: 1,
          totalSeasons: 0,
          totalTournaments: 0,
          totalGames: 0,
          hasSettings: false
        }
      };

      const result = validateExportedData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid player data: missing required fields');
    });

    it('should detect invalid season data', () => {
      const invalidData = {
        exportVersion: '1.0.0',
        exportDate: new Date().toISOString(),
        source: 'localStorage',
        data: {
          players: [],
          seasons: [
            { id: 's1' } // Missing required fields
          ],
          tournaments: [],
          savedGames: {},
          appSettings: null
        },
        stats: {
          totalPlayers: 0,
          totalSeasons: 1,
          totalTournaments: 0,
          totalGames: 0,
          hasSettings: false
        }
      };

      const result = validateExportedData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid season data: missing required fields');
    });

    it('should detect invalid tournament data', () => {
      const invalidData = {
        exportVersion: '1.0.0',
        exportDate: new Date().toISOString(),
        source: 'localStorage',
        data: {
          players: [],
          seasons: [],
          tournaments: [
            { id: 't1' } // Missing required fields
          ],
          savedGames: {},
          appSettings: null
        },
        stats: {
          totalPlayers: 0,
          totalSeasons: 0,
          totalTournaments: 1,
          totalGames: 0,
          hasSettings: false
        }
      };

      const result = validateExportedData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid tournament data: missing required fields');
    });

    it('should detect invalid game data', () => {
      const invalidData = {
        exportVersion: '1.0.0',
        exportDate: new Date().toISOString(),
        source: 'localStorage',
        data: {
          players: [],
          seasons: [],
          tournaments: [],
          savedGames: {
            'g1': { id: 'g1' } // Missing required fields
          },
          appSettings: null
        },
        stats: {
          totalPlayers: 0,
          totalSeasons: 0,
          totalTournaments: 0,
          totalGames: 1,
          hasSettings: false
        }
      };

      const result = validateExportedData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid game data: missing required fields');
    });

    it('should handle multiple validation errors', () => {
      const invalidData = {
        // Missing required fields
        data: {
          players: [
            { id: 'p1' } // Invalid player
          ],
          seasons: [
            { id: 's1' } // Invalid season
          ],
          tournaments: [],
          savedGames: {},
          appSettings: null
        }
      };

      const result = validateExportedData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Missing exportVersion');
      // Should detect the missing required fields but not validate the data content
      // since required fields are missing
    });

    it('should handle null or undefined input', () => {
      expect(validateExportedData(null).isValid).toBe(false);
      expect(validateExportedData(undefined).isValid).toBe(false);
      expect(validateExportedData({}).isValid).toBe(false);
    });

    it('should validate data consistency', () => {
      const inconsistentData = {
        exportVersion: '1.0.0',
        exportDate: new Date().toISOString(),
        source: 'localStorage',
        data: {
          players: [
            { id: 'p1', name: 'Player 1', isGoalie: false, receivedFairPlayCard: false },
            { id: 'p2', name: 'Player 2', isGoalie: false, receivedFairPlayCard: false }
          ],
          seasons: [
            { id: 's1', name: 'Season 1', startDate: '2024-01-01', endDate: '2024-06-01' }
          ],
          tournaments: [],
          savedGames: {},
          appSettings: null
        },
        stats: {
          totalPlayers: 1, // Inconsistent - actually has 2 players
          totalSeasons: 1,
          totalTournaments: 0,
          totalGames: 0,
          hasSettings: false
        }
      };

      const result = validateExportedData(inconsistentData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Data types in metadata do not match actual data');
    });
  });

  describe('Integration', () => {
    it('should export and validate data successfully', async () => {
      // Setup mock data
      (getMasterRoster as jest.Mock).mockResolvedValue([
        { id: 'p1', name: 'Player 1', isGoalie: false, receivedFairPlayCard: false }
      ]);
      (getSeasons as jest.Mock).mockResolvedValue([
        { id: 's1', name: 'Season 1', startDate: '2024-01-01', endDate: '2024-06-01' }
      ]);
      (getTournaments as jest.Mock).mockResolvedValue([]);
      (getSavedGames as jest.Mock).mockResolvedValue({});
      (getAppSettings as jest.Mock).mockResolvedValue(null);

      const exportedData = await exportLocalStorageData();
      const validation = validateExportedData(exportedData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
      expect(exportedData.data.players).toHaveLength(1);
      expect(exportedData.data.seasons).toHaveLength(1);
    });
  });
});