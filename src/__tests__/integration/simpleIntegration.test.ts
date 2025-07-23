// Simple integration tests that don't cause circular dependencies
import { checkMigrationStatus, updateMigrationStatus } from '../../lib/migration/migrationStatus';
import { exportLocalStorageData, hasSignificantLocalData } from '../../lib/migration/exportLocalData';

// Mock Supabase
jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    upsert: jest.fn(),
  },
}));

import { supabase } from '../../lib/supabase';

// Mock localStorage
const mockLocalStorage: Record<string, string> = {};

Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: jest.fn((key: string) => mockLocalStorage[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      mockLocalStorage[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete mockLocalStorage[key];
    }),
    clear: jest.fn(() => {
      Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
    }),
  },
});

// Mock utils to avoid circular dependencies
jest.mock('../../utils/masterRosterManager', () => ({
  getMasterRoster: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../../utils/seasons', () => ({
  getSeasons: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../../utils/tournaments', () => ({
  getTournaments: jest.fn(() => Promise.resolve([])),
}));

jest.mock('../../utils/savedGames', () => ({
  getSavedGames: jest.fn(() => Promise.resolve({})),
}));

jest.mock('../../utils/appSettings', () => ({
  getAppSettings: jest.fn(() => Promise.resolve(null)),
}));

import { getMasterRoster } from '../../utils/masterRosterManager';
import { getSeasons } from '../../utils/seasons';
import { getTournaments } from '../../utils/tournaments';
import { getSavedGames } from '../../utils/savedGames';
import { getAppSettings } from '../../utils/appSettings';

describe('Simple Integration Tests', () => {
  const testUserId = 'integration-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Clear mock localStorage
    Object.keys(mockLocalStorage).forEach(key => delete mockLocalStorage[key]);
    
    // Setup default Supabase mocks
    (supabase.single as jest.Mock).mockResolvedValue({ 
      data: null, 
      error: { code: 'PGRST116' } 
    });
    (supabase.upsert as jest.Mock).mockResolvedValue({ error: null });
    
    // Setup default util mocks
    (getMasterRoster as jest.Mock).mockResolvedValue([]);
    (getSeasons as jest.Mock).mockResolvedValue([]);
    (getTournaments as jest.Mock).mockResolvedValue([]);
    (getSavedGames as jest.Mock).mockResolvedValue({});
    (getAppSettings as jest.Mock).mockResolvedValue(null);
  });

  describe('Migration Flow Integration', () => {
    it('should handle complete migration workflow', async () => {
      // Step 1: Setup mock localStorage data
      const mockPlayers = [
        { id: 'p1', name: 'Test Player 1', isGoalie: false, receivedFairPlayCard: false },
        { id: 'p2', name: 'Test Player 2', isGoalie: true, receivedFairPlayCard: false },
      ];
      
      const mockSeasons = [
        { id: 's1', name: 'Test Season', startDate: '2024-01-01', endDate: '2024-12-31' },
      ];

      mockLocalStorage['masterRoster'] = JSON.stringify(mockPlayers);
      mockLocalStorage['seasons'] = JSON.stringify(mockSeasons);
      mockLocalStorage['tournaments'] = JSON.stringify([]);
      mockLocalStorage['savedGames'] = JSON.stringify({});
      mockLocalStorage['appSettings'] = JSON.stringify({ theme: 'light' });

      // Update mocks to return the data
      (getMasterRoster as jest.Mock).mockResolvedValue(mockPlayers);
      (getSeasons as jest.Mock).mockResolvedValue(mockSeasons);
      (getAppSettings as jest.Mock).mockResolvedValue({ theme: 'light' });

      // Step 2: Check initial migration status
      const initialStatus = await checkMigrationStatus(testUserId);
      
      expect(initialStatus.hasLocalData).toBe(true);
      expect(initialStatus.migrationCompleted).toBe(false);
      expect(initialStatus.dataTypes.players).toBe(2);
      expect(initialStatus.dataTypes.seasons).toBe(1);

      // Step 3: Verify significant data detection
      const hasData = await hasSignificantLocalData();
      expect(hasData).toBe(true);

      // Step 4: Export data
      const exportedData = await exportLocalStorageData();
      
      expect(exportedData.data.players).toHaveLength(2);
      expect(exportedData.data.seasons).toHaveLength(1);
      expect(exportedData.stats.totalPlayers).toBe(2);
      expect(exportedData.stats.totalSeasons).toBe(1);

      // Step 5: Start migration
      await updateMigrationStatus(testUserId, {
        migrationStarted: true,
        migrationProgress: 0,
      });

      expect(supabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: testUserId,
          migration_started: true,
          migration_progress: 0,
        }),
        { onConflict: 'user_id' }
      );

      // Step 6: Update progress
      await updateMigrationStatus(testUserId, {
        migrationProgress: 50,
      });

      // Step 7: Complete migration
      await updateMigrationStatus(testUserId, {
        migrationCompleted: true,
        migrationProgress: 100,
      });

      expect(supabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          migration_completed: true,
          migration_progress: 100,
        }),
        { onConflict: 'user_id' }
      );
    });

    it('should handle migration with no local data', async () => {
      // No localStorage data
      const status = await checkMigrationStatus(testUserId);
      
      expect(status.hasLocalData).toBe(false);
      expect(status.migrationCompleted).toBe(false);

      const hasData = await hasSignificantLocalData();
      expect(hasData).toBe(false);
    });

    it('should handle migration errors gracefully', async () => {
      // Setup some data
      (getMasterRoster as jest.Mock).mockResolvedValue([
        { id: 'p1', name: 'Test Player', isGoalie: false, receivedFairPlayCard: false }
      ]);

      // Simulate Supabase error
      (supabase.upsert as jest.Mock).mockResolvedValue({
        error: { message: 'Database connection failed' }
      });

      await expect(updateMigrationStatus(testUserId, {
        migrationStarted: true,
      })).rejects.toEqual({ message: 'Database connection failed' });
    });
  });

  describe('Data Export Integration', () => {
    it('should export data with proper structure', async () => {
      const testPlayers = [
        { id: 'p1', name: 'Export Player', isGoalie: false, receivedFairPlayCard: false }
      ];
      
      (getMasterRoster as jest.Mock).mockResolvedValue(testPlayers);

      const exportData = await exportLocalStorageData();

      expect(exportData).toMatchObject({
        exportVersion: '1.0.0',
        source: 'localStorage',
        data: {
          players: testPlayers,
          seasons: [],
          tournaments: [],
          savedGames: {},
          appSettings: null,
        },
        stats: {
          totalPlayers: 1,
          totalSeasons: 0,
          totalTournaments: 0,
          totalGames: 0,
          hasSettings: false,
        },
      });
    });

    it('should validate exported data', async () => {
      // Mock invalid data
      (getMasterRoster as jest.Mock).mockResolvedValue([
        { id: '', name: 'Invalid Player' } // Missing required fields
      ]);

      await expect(exportLocalStorageData()).rejects.toThrow('Invalid player at index 0');
    });

    it('should handle export with all data types', async () => {
      const mockData = {
        players: [{ id: 'p1', name: 'Player 1', isGoalie: false, receivedFairPlayCard: false }],
        seasons: [{ id: 's1', name: 'Season 1', startDate: '2024-01-01', endDate: '2024-12-31' }],
        tournaments: [{ id: 't1', name: 'Tournament 1', startDate: '2024-06-01', endDate: '2024-06-02' }],
        games: { 'g1': { teamName: 'Team 1', gameState: {}, date: '2024-03-01' } },
        settings: { theme: 'dark', language: 'en' },
      };

      (getMasterRoster as jest.Mock).mockResolvedValue(mockData.players);
      (getSeasons as jest.Mock).mockResolvedValue(mockData.seasons);
      (getTournaments as jest.Mock).mockResolvedValue(mockData.tournaments);
      (getSavedGames as jest.Mock).mockResolvedValue(mockData.games);
      (getAppSettings as jest.Mock).mockResolvedValue(mockData.settings);

      const exportData = await exportLocalStorageData();

      expect(exportData.stats).toEqual({
        totalPlayers: 1,
        totalSeasons: 1,
        totalTournaments: 1,
        totalGames: 1,
        hasSettings: true,
      });
    });
  });

  describe('Offline Data Detection Integration', () => {
    it('should detect significant data correctly', async () => {
      // Test with players only
      (getMasterRoster as jest.Mock).mockResolvedValue([
        { id: 'p1', name: 'Player', isGoalie: false, receivedFairPlayCard: false }
      ]);

      let hasData = await hasSignificantLocalData();
      expect(hasData).toBe(true);

      // Test with seasons only
      (getMasterRoster as jest.Mock).mockResolvedValue([]);
      (getSeasons as jest.Mock).mockResolvedValue([
        { id: 's1', name: 'Season', startDate: '2024-01-01', endDate: '2024-12-31' }
      ]);

      hasData = await hasSignificantLocalData();
      expect(hasData).toBe(true);

      // Test with games only
      (getSeasons as jest.Mock).mockResolvedValue([]);
      (getSavedGames as jest.Mock).mockResolvedValue({
        'g1': { teamName: 'Team', gameState: {}, date: '2024-01-01' }
      });

      hasData = await hasSignificantLocalData();
      expect(hasData).toBe(true);

      // Test with no significant data
      (getSavedGames as jest.Mock).mockResolvedValue({});
      
      hasData = await hasSignificantLocalData();
      expect(hasData).toBe(false);
    });

    it('should handle errors in data detection', async () => {
      (getMasterRoster as jest.Mock).mockRejectedValue(new Error('Failed to get players'));

      const hasData = await hasSignificantLocalData();
      expect(hasData).toBe(false); // Should return false on error
    });
  });

  describe('Migration Status Integration', () => {
    it('should track migration progress correctly', async () => {
      const progressSteps = [0, 25, 50, 75, 100];

      for (const progress of progressSteps) {
        await updateMigrationStatus(testUserId, {
          migrationProgress: progress,
          migrationStarted: progress > 0,
          migrationCompleted: progress === 100,
        });

        expect(supabase.upsert).toHaveBeenCalledWith(
          expect.objectContaining({
            migration_progress: progress,
            migration_started: progress > 0,
            migration_completed: progress === 100,
          }),
          { onConflict: 'user_id' }
        );
      }
    });

    it('should handle migration status retrieval', async () => {
      // Mock Supabase returning migration status
      (supabase.single as jest.Mock).mockResolvedValue({
        data: {
          migration_completed: false,
          migration_started: true,
          migration_progress: 50,
          last_migration_attempt: '2024-01-01T12:00:00Z',
          error_message: null,
        },
        error: null,
      });

      const status = await checkMigrationStatus(testUserId);

      expect(status.migrationCompleted).toBe(false);
      expect(status.migrationStarted).toBe(true);
      expect(status.migrationProgress).toBe(50);
      expect(status.lastMigrationAttempt).toBe('2024-01-01T12:00:00Z');
    });
  });

  describe('Error Recovery Integration', () => {
    it('should handle partial migration failures', async () => {
      // Start migration
      await updateMigrationStatus(testUserId, {
        migrationStarted: true,
        migrationProgress: 30,
      });

      // Simulate failure
      (supabase.upsert as jest.Mock).mockResolvedValueOnce({
        error: { message: 'Network timeout' }
      });

      await expect(updateMigrationStatus(testUserId, {
        migrationProgress: 60,
      })).rejects.toEqual({ message: 'Network timeout' });

      // Recovery - reset and retry
      (supabase.upsert as jest.Mock).mockResolvedValue({ error: null });

      await updateMigrationStatus(testUserId, {
        migrationProgress: 0, // Reset
      });

      await updateMigrationStatus(testUserId, {
        migrationCompleted: true,
        migrationProgress: 100,
      });

      expect(supabase.upsert).toHaveBeenLastCalledWith(
        expect.objectContaining({
          migration_completed: true,
          migration_progress: 100,
        }),
        { onConflict: 'user_id' }
      );
    });

    it('should maintain data integrity during failures', async () => {
      const testPlayers = [
        { id: 'p1', name: 'Test Player', isGoalie: false, receivedFairPlayCard: false }
      ];

      (getMasterRoster as jest.Mock).mockResolvedValue(testPlayers);

      // Even if migration fails, export should still work
      (supabase.upsert as jest.Mock).mockResolvedValue({
        error: { message: 'Migration failed' }
      });

      const exportData = await exportLocalStorageData();
      expect(exportData.data.players).toEqual(testPlayers);
    });
  });
});