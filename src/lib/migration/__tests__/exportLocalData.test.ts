// Unit tests for export local data functionality
import { exportLocalData, validateExportedData } from '../exportLocalData';

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
  });

  describe('exportLocalData', () => {
    it('should export all available data types', async () => {
      // Mock data in localStorage
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

      const mockGames = [
        { id: 'g1', date: '2024-03-15', teamName: 'Team A', gameState: {} }
      ];

      const mockSettings = {
        currentGameId: 'g1',
        preferredLanguage: 'en',
        theme: 'light'
      };

      mockLocalStorage.getItem
        .mockImplementation((key: string) => {
          switch (key) {
            case 'master-roster':
              return JSON.stringify(mockPlayers);
            case 'seasons-list':
              return JSON.stringify(mockSeasons);
            case 'tournaments-list':
              return JSON.stringify(mockTournaments);
            case 'saved-games':
              return JSON.stringify(mockGames);
            case 'app-settings':
              return JSON.stringify(mockSettings);
            default:
              return null;
          }
        });

      const exportedData = await exportLocalData();

      expect(exportedData).toEqual({
        metadata: {
          exportDate: expect.any(String),
          version: '1.0',
          dataTypes: ['players', 'seasons', 'tournaments', 'games', 'settings']
        },
        data: {
          players: mockPlayers,
          seasons: mockSeasons,
          tournaments: mockTournaments,
          games: mockGames,
          settings: mockSettings
        }
      });
    });

    it('should handle missing data gracefully', async () => {
      // Only provide players data
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'master-roster') {
          return JSON.stringify([{ id: 'p1', name: 'Player 1' }]);
        }
        return null;
      });

      const exportedData = await exportLocalData();

      expect(exportedData.data.players).toHaveLength(1);
      expect(exportedData.data.seasons).toEqual([]);
      expect(exportedData.data.tournaments).toEqual([]);
      expect(exportedData.data.games).toEqual([]);
      expect(exportedData.data.settings).toEqual({});
      expect(exportedData.metadata.dataTypes).toEqual(['players']);
    });

    it('should handle corrupted JSON data', async () => {
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'master-roster') {
          return 'invalid-json';
        }
        if (key === 'seasons-list') {
          return JSON.stringify([{ id: 's1', name: 'Valid Season' }]);
        }
        return null;
      });

      const exportedData = await exportLocalData();

      // Should skip corrupted data and continue with valid data
      expect(exportedData.data.players).toEqual([]);
      expect(exportedData.data.seasons).toHaveLength(1);
      expect(exportedData.metadata.dataTypes).toEqual(['seasons']);
    });

    it('should include export timestamp', async () => {
      const beforeExport = new Date().toISOString();
      const exportedData = await exportLocalData();
      const afterExport = new Date().toISOString();

      expect(exportedData.metadata.exportDate).toBeGreaterThanOrEqual(beforeExport);
      expect(exportedData.metadata.exportDate).toBeLessThanOrEqual(afterExport);
    });

    it('should handle localStorage access errors', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });

      const exportedData = await exportLocalData();

      expect(exportedData.data.players).toEqual([]);
      expect(exportedData.data.seasons).toEqual([]);
      expect(exportedData.data.tournaments).toEqual([]);
      expect(exportedData.data.games).toEqual([]);
      expect(exportedData.data.settings).toEqual({});
      expect(exportedData.metadata.dataTypes).toEqual([]);
    });
  });

  describe('validateExportedData', () => {
    it('should validate correct export format', () => {
      const validData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          dataTypes: ['players', 'seasons']
        },
        data: {
          players: [
            { id: 'p1', name: 'Player 1', isGoalie: false, receivedFairPlayCard: false }
          ],
          seasons: [
            { id: 's1', name: 'Season 1', startDate: '2024-01-01', endDate: '2024-06-01' }
          ],
          tournaments: [],
          games: [],
          settings: {}
        }
      };

      const result = validateExportedData(validData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should detect missing metadata', () => {
      const invalidData = {
        data: {
          players: [],
          seasons: [],
          tournaments: [],
          games: [],
          settings: {}
        }
      };

      const result = validateExportedData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing metadata');
    });

    it('should detect missing data section', () => {
      const invalidData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          dataTypes: ['players']
        }
      };

      const result = validateExportedData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing data section');
    });

    it('should detect invalid player data', () => {
      const invalidData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          dataTypes: ['players']
        },
        data: {
          players: [
            { id: 'p1' } // Missing required fields
          ],
          seasons: [],
          tournaments: [],
          games: [],
          settings: {}
        }
      };

      const result = validateExportedData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid player data: missing required fields');
    });

    it('should detect invalid season data', () => {
      const invalidData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          dataTypes: ['seasons']
        },
        data: {
          players: [],
          seasons: [
            { id: 's1' } // Missing required fields
          ],
          tournaments: [],
          games: [],
          settings: {}
        }
      };

      const result = validateExportedData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid season data: missing required fields');
    });

    it('should detect invalid tournament data', () => {
      const invalidData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          dataTypes: ['tournaments']
        },
        data: {
          players: [],
          seasons: [],
          tournaments: [
            { id: 't1' } // Missing required fields
          ],
          games: [],
          settings: {}
        }
      };

      const result = validateExportedData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid tournament data: missing required fields');
    });

    it('should detect invalid game data', () => {
      const invalidData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          dataTypes: ['games']
        },
        data: {
          players: [],
          seasons: [],
          tournaments: [],
          games: [
            { id: 'g1' } // Missing required fields
          ],
          settings: {}
        }
      };

      const result = validateExportedData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Invalid game data: missing required fields');
    });

    it('should handle multiple validation errors', () => {
      const invalidData = {
        // Missing metadata
        data: {
          players: [
            { id: 'p1' } // Invalid player
          ],
          seasons: [
            { id: 's1' } // Invalid season
          ],
          tournaments: [],
          games: [],
          settings: {}
        }
      };

      const result = validateExportedData(invalidData);

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Missing metadata');
      expect(result.errors).toContain('Invalid player data: missing required fields');
      expect(result.errors).toContain('Invalid season data: missing required fields');
    });

    it('should handle null or undefined input', () => {
      expect(validateExportedData(null).isValid).toBe(false);
      expect(validateExportedData(undefined).isValid).toBe(false);
      expect(validateExportedData({}).isValid).toBe(false);
    });

    it('should validate data consistency', () => {
      const inconsistentData = {
        metadata: {
          exportDate: new Date().toISOString(),
          version: '1.0',
          dataTypes: ['players', 'seasons', 'games'] // Claims to have games
        },
        data: {
          players: [
            { id: 'p1', name: 'Player 1', isGoalie: false, receivedFairPlayCard: false }
          ],
          seasons: [
            { id: 's1', name: 'Season 1', startDate: '2024-01-01', endDate: '2024-06-01' }
          ],
          tournaments: [],
          games: [], // But games array is empty
          settings: {}
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
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        switch (key) {
          case 'master-roster':
            return JSON.stringify([
              { id: 'p1', name: 'Player 1', isGoalie: false, receivedFairPlayCard: false }
            ]);
          case 'seasons-list':
            return JSON.stringify([
              { id: 's1', name: 'Season 1', startDate: '2024-01-01', endDate: '2024-06-01' }
            ]);
          default:
            return null;
        }
      });

      const exportedData = await exportLocalData();
      const validation = validateExportedData(exportedData);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toEqual([]);
      expect(exportedData.data.players).toHaveLength(1);
      expect(exportedData.data.seasons).toHaveLength(1);
    });
  });
});