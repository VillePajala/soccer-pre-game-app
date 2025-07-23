// Unit tests for the actual export local data functionality
import { 
  exportLocalStorageData, 
  getLocalDataSummary, 
  hasSignificantLocalData,
  downloadLocalDataExport
} from '../exportLocalData';

// Mock the utility functions
jest.mock('../../../utils/masterRosterManager', () => ({
  getMasterRoster: jest.fn(),
}));

jest.mock('../../../utils/seasons', () => ({
  getSeasons: jest.fn(),
}));

jest.mock('../../../utils/tournaments', () => ({
  getTournaments: jest.fn(),
}));

jest.mock('../../../utils/savedGames', () => ({
  getSavedGames: jest.fn(),
}));

jest.mock('../../../utils/appSettings', () => ({
  getAppSettings: jest.fn(),
}));

// Import the mocked functions
import { getMasterRoster } from '../../../utils/masterRosterManager';
import { getSeasons } from '../../../utils/seasons';
import { getTournaments } from '../../../utils/tournaments';
import { getSavedGames } from '../../../utils/savedGames';
import { getAppSettings } from '../../../utils/appSettings';

// Mock DOM APIs for download functionality
const mockCreateElement = jest.fn();
const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
const mockClick = jest.fn();
const mockCreateObjectURL = jest.fn();
const mockRevokeObjectURL = jest.fn();

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
});

Object.defineProperty(document.body, 'appendChild', {
  value: mockAppendChild,
});

Object.defineProperty(document.body, 'removeChild', {
  value: mockRemoveChild,
});

Object.defineProperty(URL, 'createObjectURL', {
  value: mockCreateObjectURL,
});

Object.defineProperty(URL, 'revokeObjectURL', {
  value: mockRevokeObjectURL,
});

describe('Export Local Data (Actual Implementation)', () => {
  // Sample data for testing
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
    'game1': { teamName: 'Team A', gameState: {}, date: '2024-03-15' },
    'game2': { teamName: 'Team B', gameState: {}, date: '2024-03-20' }
  };

  const mockSettings = {
    currentGameId: 'game1',
    preferredLanguage: 'en',
    theme: 'light'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Set up default mock returns
    (getMasterRoster as jest.Mock).mockResolvedValue(mockPlayers);
    (getSeasons as jest.Mock).mockResolvedValue(mockSeasons);
    (getTournaments as jest.Mock).mockResolvedValue(mockTournaments);
    (getSavedGames as jest.Mock).mockResolvedValue(mockGames);
    (getAppSettings as jest.Mock).mockResolvedValue(mockSettings);

    // Mock DOM elements
    mockCreateElement.mockReturnValue({
      href: '',
      download: '',
      click: mockClick,
    });
    mockCreateObjectURL.mockReturnValue('blob:mock-url');
  });

  describe('exportLocalStorageData', () => {
    it('should export all data successfully', async () => {
      const result = await exportLocalStorageData();

      expect(result).toEqual({
        exportVersion: '1.0.0',
        exportDate: expect.any(String),
        source: 'localStorage',
        data: {
          players: mockPlayers,
          seasons: mockSeasons,
          tournaments: mockTournaments,
          savedGames: mockGames,
          appSettings: mockSettings,
        },
        stats: {
          totalPlayers: 2,
          totalSeasons: 1,
          totalTournaments: 1,
          totalGames: 2,
          hasSettings: true,
        },
      });

      // Verify all utility functions were called
      expect(getMasterRoster).toHaveBeenCalled();
      expect(getSeasons).toHaveBeenCalled();
      expect(getTournaments).toHaveBeenCalled();
      expect(getSavedGames).toHaveBeenCalled();
      expect(getAppSettings).toHaveBeenCalled();
    });

    it('should include correct timestamp', async () => {
      const beforeExport = new Date().toISOString();
      const result = await exportLocalStorageData();
      const afterExport = new Date().toISOString();

      expect(new Date(result.exportDate).getTime()).toBeGreaterThanOrEqual(new Date(beforeExport).getTime());
      expect(new Date(result.exportDate).getTime()).toBeLessThanOrEqual(new Date(afterExport).getTime());
    });

    it('should handle empty data', async () => {
      (getMasterRoster as jest.Mock).mockResolvedValue([]);
      (getSeasons as jest.Mock).mockResolvedValue([]);
      (getTournaments as jest.Mock).mockResolvedValue([]);
      (getSavedGames as jest.Mock).mockResolvedValue({});
      (getAppSettings as jest.Mock).mockResolvedValue(null);

      const result = await exportLocalStorageData();

      expect(result.stats).toEqual({
        totalPlayers: 0,
        totalSeasons: 0,
        totalTournaments: 0,
        totalGames: 0,
        hasSettings: false,
      });
    });

    it('should handle utility function errors', async () => {
      (getMasterRoster as jest.Mock).mockRejectedValue(new Error('Failed to get players'));

      await expect(exportLocalStorageData()).rejects.toThrow('Failed to export localStorage data');
    });

    it('should validate exported data', async () => {
      // Mock invalid player data (missing name)
      (getMasterRoster as jest.Mock).mockResolvedValue([{ id: 'p1', name: '' }]);

      await expect(exportLocalStorageData()).rejects.toThrow('Invalid player at index 0');
    });
  });

  describe('getLocalDataSummary', () => {
    it('should return correct summary statistics', async () => {
      const result = await getLocalDataSummary();

      expect(result).toEqual({
        totalPlayers: 2,
        totalSeasons: 1,
        totalTournaments: 1,
        totalGames: 2,
        hasSettings: true,
      });
    });

    it('should handle errors gracefully', async () => {
      (getMasterRoster as jest.Mock).mockRejectedValue(new Error('Database error'));

      const result = await getLocalDataSummary();

      expect(result).toEqual({
        totalPlayers: 0,
        totalSeasons: 0,
        totalTournaments: 0,
        totalGames: 0,
        hasSettings: false,
      });
    });

    it('should handle null app settings', async () => {
      (getAppSettings as jest.Mock).mockResolvedValue(null);

      const result = await getLocalDataSummary();

      expect(result.hasSettings).toBe(false);
    });
  });

  describe('hasSignificantLocalData', () => {
    it('should return true when there is significant data', async () => {
      const result = await hasSignificantLocalData();

      expect(result).toBe(true);
    });

    it('should return false when there is no significant data', async () => {
      (getMasterRoster as jest.Mock).mockResolvedValue([]);
      (getSeasons as jest.Mock).mockResolvedValue([]);
      (getTournaments as jest.Mock).mockResolvedValue([]);
      (getSavedGames as jest.Mock).mockResolvedValue({});

      const result = await hasSignificantLocalData();

      expect(result).toBe(false);
    });

    it('should return true with only players', async () => {
      (getSeasons as jest.Mock).mockResolvedValue([]);
      (getTournaments as jest.Mock).mockResolvedValue([]);
      (getSavedGames as jest.Mock).mockResolvedValue({});

      const result = await hasSignificantLocalData();

      expect(result).toBe(true);
    });

    it('should return true with only seasons', async () => {
      (getMasterRoster as jest.Mock).mockResolvedValue([]);
      (getTournaments as jest.Mock).mockResolvedValue([]);
      (getSavedGames as jest.Mock).mockResolvedValue({});

      const result = await hasSignificantLocalData();

      expect(result).toBe(true);
    });

    it('should return true with only games', async () => {
      (getMasterRoster as jest.Mock).mockResolvedValue([]);
      (getSeasons as jest.Mock).mockResolvedValue([]);
      (getTournaments as jest.Mock).mockResolvedValue([]);

      const result = await hasSignificantLocalData();

      expect(result).toBe(true);
    });
  });

  describe('downloadLocalDataExport', () => {
    it('should create and trigger download', async () => {
      await downloadLocalDataExport();

      expect(mockCreateObjectURL).toHaveBeenCalledWith(expect.any(Blob));
      expect(mockCreateElement).toHaveBeenCalledWith('a');
      expect(mockAppendChild).toHaveBeenCalled();
      expect(mockClick).toHaveBeenCalled();
      expect(mockRemoveChild).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });

    it('should generate correct filename', async () => {
      const today = new Date().toISOString().split('T')[0];
      
      await downloadLocalDataExport();

      const mockLink = mockCreateElement.mock.results[0].value;
      expect(mockLink.download).toBe(`soccer-coach-backup-${today}.json`);
    });

    it('should handle export errors', async () => {
      (getMasterRoster as jest.Mock).mockRejectedValue(new Error('Export failed'));

      await expect(downloadLocalDataExport()).rejects.toThrow();
    });
  });

  describe('Data Validation', () => {
    it('should validate player data structure', async () => {
      (getMasterRoster as jest.Mock).mockResolvedValue([
        { id: '', name: 'Player 1' } // Invalid: empty ID
      ]);

      await expect(exportLocalStorageData()).rejects.toThrow('Invalid player at index 0');
    });

    it('should validate season data structure', async () => {
      (getSeasons as jest.Mock).mockResolvedValue([
        { id: 's1', name: '' } // Invalid: empty name
      ]);

      await expect(exportLocalStorageData()).rejects.toThrow('Invalid season at index 0');
    });

    it('should validate tournament data structure', async () => {
      (getTournaments as jest.Mock).mockResolvedValue([
        { id: '', name: 'Tournament 1' } // Invalid: empty ID
      ]);

      await expect(exportLocalStorageData()).rejects.toThrow('Invalid tournament at index 0');
    });

    it('should validate game data structure', async () => {
      (getSavedGames as jest.Mock).mockResolvedValue({
        'game1': { teamName: '' } // Invalid: empty team name
      });

      await expect(exportLocalStorageData()).rejects.toThrow('Invalid game game1');
    });

    it('should validate data count consistency', async () => {
      // This test ensures the stats match the actual data
      const result = await exportLocalStorageData();

      expect(result.stats.totalPlayers).toBe(result.data.players.length);
      expect(result.stats.totalSeasons).toBe(result.data.seasons.length);
      expect(result.stats.totalTournaments).toBe(result.data.tournaments.length);
      expect(result.stats.totalGames).toBe(Object.keys(result.data.savedGames).length);
      expect(result.stats.hasSettings).toBe(Boolean(result.data.appSettings));
    });
  });

  describe('Integration', () => {
    it('should export and summarize data consistently', async () => {
      const exportData = await exportLocalStorageData();
      const summary = await getLocalDataSummary();

      expect(exportData.stats).toEqual(summary);
    });

    it('should correctly determine significance based on summary', async () => {
      const summary = await getLocalDataSummary();
      const hasData = await hasSignificantLocalData();

      const expectedHasData = summary.totalPlayers > 0 || 
                             summary.totalSeasons > 0 || 
                             summary.totalTournaments > 0 || 
                             summary.totalGames > 0;

      expect(hasData).toBe(expectedHasData);
    });
  });
});