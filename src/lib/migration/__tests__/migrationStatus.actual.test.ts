// Unit tests for the actual migration status functionality
import { 
  checkMigrationStatus, 
  updateMigrationStatus, 
  checkLocalStorageData
} from '../migrationStatus';

// Import to get access to mocked functions
import { supabase } from '../../supabase';

// Mock the supabase client
jest.mock('../../supabase', () => ({
  supabase: {
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn(),
    upsert: jest.fn(),
  },
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('Migration Status (Actual Implementation)', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    (supabase.single as jest.Mock).mockResolvedValue({ data: null, error: { code: 'PGRST116' } });
    (supabase.upsert as jest.Mock).mockResolvedValue({ error: null });
  });

  describe('checkLocalStorageData', () => {
    it('should detect localStorage data correctly', () => {
      // Mock localStorage data
      mockLocalStorage.getItem
        .mockImplementation((key: string) => {
          switch (key) {
            case 'masterRoster':
              return JSON.stringify([{ id: 'p1', name: 'Player 1' }]);
            case 'seasons':
              return JSON.stringify([{ id: 's1', name: 'Season 1' }]);
            case 'tournaments':
              return JSON.stringify([]);
            case 'savedGames':
              return JSON.stringify({ 'game1': { teamName: 'Team A' } });
            case 'appSettings':
              return JSON.stringify({ theme: 'light' });
            default:
              return null;
          }
        });

      const result = checkLocalStorageData();

      expect(result).toEqual({
        players: 1,
        seasons: 1,
        tournaments: 0,
        games: 1,
        settings: true
      });
    });

    it('should handle missing localStorage data', () => {
      mockLocalStorage.getItem.mockReturnValue(null);

      const result = checkLocalStorageData();

      expect(result).toEqual({
        players: 0,
        seasons: 0,
        tournaments: 0,
        games: 0,
        settings: false
      });
    });

    it('should handle corrupted JSON gracefully with fallback values', () => {
      mockLocalStorage.getItem
        .mockImplementation((key: string) => {
          if (key === 'masterRoster') return 'invalid-json';
          return '[]';
        });

      // The current implementation uses safeLocalStorageGet which doesn't throw
      // but returns fallback values instead
      expect(() => checkLocalStorageData()).not.toThrow();
      const result = checkLocalStorageData();
      expect(result.players).toBe(0); // fallback to empty array
    });
  });

  describe('checkMigrationStatus', () => {
    it('should return migration status from Supabase when available', async () => {
      const mockSupabaseData = {
        migration_completed: true,
        migration_started: true,
        last_migration_attempt: '2024-01-01T12:00:00Z',
        migration_progress: 100,
        error_message: null,
      };

      (supabase.single as jest.Mock).mockResolvedValue({ 
        data: mockSupabaseData, 
        error: null 
      });

      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'masterRoster') return JSON.stringify([{ id: 'p1' }]);
        if (key === 'appSettings') return JSON.stringify({ theme: 'light' });
        return '[]';
      });

      const result = await checkMigrationStatus(mockUserId);

      expect(result).toEqual({
        userId: mockUserId,
        hasLocalData: true,
        migrationCompleted: true,
        migrationStarted: true,
        lastMigrationAttempt: '2024-01-01T12:00:00Z',
        migrationProgress: 100,
        errorMessage: null,
        dataTypes: {
          players: 1,
          seasons: 0,
          tournaments: 0,
          games: 0,
          settings: true
        }
      });
    });

    it('should handle new user with no migration record', async () => {
      (supabase.single as jest.Mock).mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' } // No rows returned
      });

      mockLocalStorage.getItem.mockReturnValue('[]');

      const result = await checkMigrationStatus(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(result.migrationCompleted).toBe(false);
      expect(result.migrationStarted).toBe(false);
      expect(result.migrationProgress).toBe(0);
    });

    it('should handle Supabase errors gracefully', async () => {
      (supabase.single as jest.Mock).mockResolvedValue({ 
        data: null, 
        error: { code: 'CONNECTION_ERROR', message: 'Network error' }
      });

      const result = await checkMigrationStatus(mockUserId);

      expect(result.userId).toBe(mockUserId);
      expect(result.migrationCompleted).toBe(false);
      expect(result.migrationStarted).toBe(false);
      expect(result.errorMessage).toBe(null);
    });

    it('should correctly detect hasLocalData', async () => {
      (supabase.single as jest.Mock).mockResolvedValue({ 
        data: null, 
        error: { code: 'PGRST116' }
      });

      // Mock some local data
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        if (key === 'masterRoster') return JSON.stringify([{ id: 'p1' }]);
        return '[]';
      });

      const result = await checkMigrationStatus(mockUserId);

      expect(result.hasLocalData).toBe(true);
    });
  });

  describe('updateMigrationStatus', () => {
    it('should update migration status in Supabase', async () => {
      const updates = {
        migrationStarted: true,
        migrationProgress: 50,
        lastMigrationAttempt: '2024-01-01T12:00:00Z'
      };

      (supabase.upsert as jest.Mock).mockResolvedValue({ error: null });

      await updateMigrationStatus(mockUserId, updates);

      expect(supabase.from).toHaveBeenCalledWith('migration_status');
      expect(supabase.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: mockUserId,
          migration_started: true,
          migration_progress: 50,
          last_migration_attempt: '2024-01-01T12:00:00Z',
          updated_at: expect.any(String)
        })
      );
    });

    it('should handle Supabase update errors', async () => {
      (supabase.upsert as jest.Mock).mockResolvedValue({ 
        error: { message: 'Update failed' }
      });

      await expect(updateMigrationStatus(mockUserId, { migrationProgress: 75 }))
        .rejects.toEqual({ message: 'Update failed' });
    });

    it('should include timestamp when lastMigrationAttempt is not provided', async () => {
      const beforeUpdate = new Date().toISOString();
      
      await updateMigrationStatus(mockUserId, { migrationProgress: 25 });
      
      const afterUpdate = new Date().toISOString();
      const callArgs = (supabase.upsert as jest.Mock).mock.calls[0][0];
      
      expect(new Date(callArgs.last_migration_attempt).getTime()).toBeGreaterThanOrEqual(new Date(beforeUpdate).getTime());
      expect(new Date(callArgs.last_migration_attempt).getTime()).toBeLessThanOrEqual(new Date(afterUpdate).getTime());
    });
  });

  describe('Integration', () => {
    it('should work with real localStorage keys', () => {
      // Use the actual localStorage keys that the app uses
      mockLocalStorage.getItem.mockImplementation((key: string) => {
        const realKeys = {
          'masterRoster': JSON.stringify([{ id: 'p1', name: 'Test Player' }]),
          'seasons': JSON.stringify([]),
          'tournaments': JSON.stringify([]),
          'savedGames': JSON.stringify({}),
          'appSettings': null
        };
        return realKeys[key as keyof typeof realKeys] || null;
      });

      const result = checkLocalStorageData();

      expect(result.players).toBe(1);
      expect(result.seasons).toBe(0);
      expect(result.tournaments).toBe(0);
      expect(result.games).toBe(0);
      expect(result.settings).toBe(false);
    });
  });
});