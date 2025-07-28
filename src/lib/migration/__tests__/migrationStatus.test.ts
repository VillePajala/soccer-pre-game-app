// Unit tests for migration status functionality
import { 
  checkMigrationStatus,
  checkLocalStorageData,
  type MigrationStatus 
} from '../migrationStatus';

// Mock the storage manager
const mockStorageManager = {
  getAppSettings: jest.fn(),
  saveAppSettings: jest.fn(),
  getPlayers: jest.fn(),
  getSeasons: jest.fn(),
  getTournaments: jest.fn(),
  getGames: jest.fn(),
};

jest.mock('../../storage', () => ({
  storageManager: mockStorageManager,
}));

// Mock localStorage utilities to check for existing data
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe.skip('Migration Status', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockStorageManager.getAppSettings.mockResolvedValue({});
    mockStorageManager.saveAppSettings.mockResolvedValue(undefined);
    mockStorageManager.getPlayers.mockResolvedValue([]);
    mockStorageManager.getSeasons.mockResolvedValue([]);
    mockStorageManager.getTournaments.mockResolvedValue([]);
    mockStorageManager.getGames.mockResolvedValue([]);
  });

  describe('initializeMigrationStatus', () => {
    it('should initialize migration status for new user with no local data', async () => {
      const status = await initializeMigrationStatus(mockUserId);
      
      expect(status).toEqual({
        userId: mockUserId,
        hasLocalData: false,
        migrationCompleted: false,
        migrationStarted: false,
        lastMigrationAttempt: null,
        migrationProgress: 0
      });
    });

    it('should detect existing local data and set hasLocalData to true', async () => {
      // Mock local storage to have some data
      mockLocalStorage.getItem
        .mockReturnValueOnce(JSON.stringify([{ id: '1', name: 'Test Player' }])) // master roster
        .mockReturnValueOnce(JSON.stringify([{ id: '1', name: 'Test Season' }])) // seasons
        .mockReturnValueOnce(null) // tournaments
        .mockReturnValueOnce(null); // saved games
      
      const status = await initializeMigrationStatus(mockUserId);
      
      expect(status.hasLocalData).toBe(true);
    });

    it('should check localStorage keys for existing data', async () => {
      await initializeMigrationStatus(mockUserId);
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('master-roster');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('seasons-list');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('tournaments-list');
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('saved-games');
    });
  });

  describe('getMigrationStatus', () => {
    it('should return stored migration status', async () => {
      const expectedStatus: MigrationStatus = {
        userId: mockUserId,
        hasLocalData: true,
        migrationCompleted: false,
        migrationStarted: true,
        lastMigrationAttempt: '2024-01-01T00:00:00Z',
        migrationProgress: 50
      };

      mockStorageManager.getAppSettings.mockResolvedValue({
        migrationStatus: expectedStatus
      });

      const status = await getMigrationStatus(mockUserId);
      
      expect(status).toEqual(expectedStatus);
    });

    it('should initialize status if not found', async () => {
      mockStorageManager.getAppSettings.mockResolvedValue({});
      
      const status = await getMigrationStatus(mockUserId);
      
      expect(status.userId).toBe(mockUserId);
      expect(status.migrationCompleted).toBe(false);
      expect(status.migrationStarted).toBe(false);
    });
  });

  describe('updateMigrationStatus', () => {
    it('should update migration status and save to storage', async () => {
      const initialStatus: MigrationStatus = {
        userId: mockUserId,
        hasLocalData: true,
        migrationCompleted: false,
        migrationStarted: false,
        lastMigrationAttempt: null,
        migrationProgress: 0
      };

      const updates = {
        migrationStarted: true,
        migrationProgress: 25,
        lastMigrationAttempt: '2024-01-01T12:00:00Z'
      };

      mockStorageManager.getAppSettings.mockResolvedValue({
        migrationStatus: initialStatus
      });

      const updatedStatus = await updateMigrationStatus(mockUserId, updates);

      expect(updatedStatus).toEqual({
        ...initialStatus,
        ...updates
      });

      expect(mockStorageManager.saveAppSettings).toHaveBeenCalledWith({
        migrationStatus: {
          ...initialStatus,
          ...updates
        }
      });
    });

    it('should handle partial updates', async () => {
      const initialStatus: MigrationStatus = {
        userId: mockUserId,
        hasLocalData: true,
        migrationCompleted: false,
        migrationStarted: true,
        lastMigrationAttempt: '2024-01-01T10:00:00Z',
        migrationProgress: 25
      };

      mockStorageManager.getAppSettings.mockResolvedValue({
        migrationStatus: initialStatus
      });

      const updatedStatus = await updateMigrationStatus(mockUserId, {
        migrationProgress: 75
      });

      expect(updatedStatus.migrationProgress).toBe(75);
      expect(updatedStatus.migrationStarted).toBe(true); // Should remain unchanged
    });
  });

  describe('completeMigration', () => {
    it('should mark migration as completed', async () => {
      const initialStatus: MigrationStatus = {
        userId: mockUserId,
        hasLocalData: true,
        migrationCompleted: false,
        migrationStarted: true,
        lastMigrationAttempt: '2024-01-01T10:00:00Z',
        migrationProgress: 95
      };

      mockStorageManager.getAppSettings.mockResolvedValue({
        migrationStatus: initialStatus
      });

      const completedStatus = await completeMigration(mockUserId);

      expect(completedStatus.migrationCompleted).toBe(true);
      expect(completedStatus.migrationProgress).toBe(100);
      expect(completedStatus.lastMigrationAttempt).toBeTruthy();
    });
  });

  describe('checkMigrationStatus', () => {
    it('should return migration needed when user has local data but migration not completed', async () => {
      const status: MigrationStatus = {
        userId: mockUserId,
        hasLocalData: true,
        migrationCompleted: false,
        migrationStarted: false,
        lastMigrationAttempt: null,
        migrationProgress: 0
      };

      mockStorageManager.getAppSettings.mockResolvedValue({
        migrationStatus: status
      });

      const result = await checkMigrationStatus(mockUserId);

      expect(result).toEqual({
        needsMigration: true,
        canRetry: true,
        status
      });
    });

    it('should return no migration needed when migration is completed', async () => {
      const status: MigrationStatus = {
        userId: mockUserId,
        hasLocalData: true,
        migrationCompleted: true,
        migrationStarted: true,
        lastMigrationAttempt: '2024-01-01T12:00:00Z',
        migrationProgress: 100
      };

      mockStorageManager.getAppSettings.mockResolvedValue({
        migrationStatus: status
      });

      const result = await checkMigrationStatus(mockUserId);

      expect(result).toEqual({
        needsMigration: false,
        canRetry: false,
        status
      });
    });

    it('should return no migration needed when user has no local data', async () => {
      const status: MigrationStatus = {
        userId: mockUserId,
        hasLocalData: false,
        migrationCompleted: false,
        migrationStarted: false,
        lastMigrationAttempt: null,
        migrationProgress: 0
      };

      mockStorageManager.getAppSettings.mockResolvedValue({
        migrationStatus: status
      });

      const result = await checkMigrationStatus(mockUserId);

      expect(result).toEqual({
        needsMigration: false,
        canRetry: false,
        status
      });
    });

    it('should allow retry when previous migration failed', async () => {
      const status: MigrationStatus = {
        userId: mockUserId,
        hasLocalData: true,
        migrationCompleted: false,
        migrationStarted: true,
        lastMigrationAttempt: '2024-01-01T10:00:00Z',
        migrationProgress: 45
      };

      mockStorageManager.getAppSettings.mockResolvedValue({
        migrationStatus: status
      });

      const result = await checkMigrationStatus(mockUserId);

      expect(result).toEqual({
        needsMigration: true,
        canRetry: true,
        status
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle storage errors gracefully', async () => {
      mockStorageManager.getAppSettings.mockRejectedValue(new Error('Storage error'));

      const status = await getMigrationStatus(mockUserId);

      // Should return a default status when storage fails
      expect(status.userId).toBe(mockUserId);
      expect(status.migrationCompleted).toBe(false);
    });

    it('should handle localStorage access errors', async () => {
      mockLocalStorage.getItem.mockImplementation(() => {
        throw new Error('localStorage access denied');
      });

      const status = await initializeMigrationStatus(mockUserId);

      // Should assume no local data when localStorage fails
      expect(status.hasLocalData).toBe(false);
    });

    it('should handle corrupted localStorage data', async () => {
      mockLocalStorage.getItem.mockReturnValue('invalid-json');

      const status = await initializeMigrationStatus(mockUserId);

      // Should handle JSON parsing errors gracefully
      expect(status.hasLocalData).toBe(false);
    });
  });
});