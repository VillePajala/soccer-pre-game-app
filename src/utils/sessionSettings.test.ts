import {
  getDeviceFingerprint,
  saveDeviceFingerprint,
  getSessionActivity,
  saveSessionActivity,
  removeSessionActivity,
} from './sessionSettings';
import { authAwareStorageManager } from '@/lib/storage';
import logger from '@/utils/logger';

// Mock the storage manager
jest.mock('@/lib/storage', () => ({
  authAwareStorageManager: {
    getAppSettings: jest.fn(),
    saveAppSettings: jest.fn(),
  },
}));

// Mock logger
jest.mock('@/utils/logger', () => {
  const mockLogger = {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    log: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

const mockedStorageManager = authAwareStorageManager as jest.Mocked<typeof authAwareStorageManager>;
const mockedLogger = logger as jest.Mocked<typeof logger>;

describe('sessionSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDeviceFingerprint', () => {
    it('should return fingerprint from storage', async () => {
      const mockFingerprint = 'test-fingerprint-123';
      mockedStorageManager.getAppSettings.mockResolvedValue({
        deviceFingerprint: mockFingerprint,
        currentGameId: null,
      });

      const result = await getDeviceFingerprint();
      
      expect(result).toBe(mockFingerprint);
      expect(mockedLogger.debug).toHaveBeenCalled();
    });

    it('should return null when no fingerprint exists', async () => {
      mockedStorageManager.getAppSettings.mockResolvedValue({
        currentGameId: null,
      });

      const result = await getDeviceFingerprint();
      expect(result).toBeNull();
    });

    it('should handle storage errors', async () => {
      const error = new Error('Storage error');
      mockedStorageManager.getAppSettings.mockRejectedValue(error);

      const result = await getDeviceFingerprint();
      
      expect(result).toBeNull();
      expect(mockedLogger.debug).toHaveBeenCalledWith('[SessionSettings] Failed to get device fingerprint (likely during sign out):', error);
    });
  });

  describe('saveDeviceFingerprint', () => {
    it('should save fingerprint to storage', async () => {
      const fingerprint = 'test-fingerprint-456';
      const existingSettings = { currentGameId: 'game-123' };
      
      mockedStorageManager.getAppSettings.mockResolvedValue(existingSettings);

      await saveDeviceFingerprint(fingerprint);

      expect(mockedStorageManager.saveAppSettings).toHaveBeenCalledWith({
        ...existingSettings,
        deviceFingerprint: fingerprint,
        currentGameId: 'game-123',
      });
    });

    it('should handle storage errors', async () => {
      const error = new Error('Save error');
      mockedStorageManager.getAppSettings.mockRejectedValue(error);

      await saveDeviceFingerprint('test-fingerprint');
      
      expect(mockedLogger.debug).toHaveBeenCalledWith('[SessionSettings] Failed to save device fingerprint (likely during sign out):', error);
    });
  });

  describe('getSessionActivity', () => {
    it('should return session activity for user', async () => {
      const userId = 'user-123';
      const userActivity = { lastLogin: '2023-01-01' };
      const sessionActivity = { [userId]: userActivity };

      mockedStorageManager.getAppSettings.mockResolvedValue({
        sessionActivity,
        currentGameId: null,
      });

      const result = await getSessionActivity(userId);
      expect(result).toBe(userActivity);
    });

    it('should return null when user activity not found', async () => {
      mockedStorageManager.getAppSettings.mockResolvedValue({
        currentGameId: null,
      });

      const result = await getSessionActivity('user-123');
      expect(result).toBeNull();
    });

    it('should handle storage errors', async () => {
      const error = new Error('Get error');
      mockedStorageManager.getAppSettings.mockRejectedValue(error);

      const result = await getSessionActivity('user-123');
      
      expect(result).toBeNull();
      expect(mockedLogger.debug).toHaveBeenCalledWith('[SessionSettings] Failed to get session activity (likely during sign out):', error);
    });
  });

  describe('saveSessionActivity', () => {
    it('should save session activity for user', async () => {
      const userId = 'user-123';
      const activity = { lastLogin: '2023-01-01', actions: 5 };
      const existingSettings = { currentGameId: 'game-123' };

      mockedStorageManager.getAppSettings.mockResolvedValue(existingSettings);

      await saveSessionActivity(userId, activity);

      expect(mockedStorageManager.saveAppSettings).toHaveBeenCalledWith({
        currentGameId: 'game-123',
        sessionActivity: {
          [userId]: activity,
        },
      });
    });

    it('should handle storage errors', async () => {
      const error = new Error('Save activity error');
      mockedStorageManager.getAppSettings.mockRejectedValue(error);

      await saveSessionActivity('user-123', { test: true });
      
      expect(mockedLogger.debug).toHaveBeenCalledWith('[SessionSettings] Failed to save session activity (likely during sign out):', error);
    });
  });

  describe('removeSessionActivity', () => {
    it('should remove session activity for user', async () => {
      const userId = 'user-123';
      const existingActivity = {
        [userId]: { lastLogin: '2023-01-01' },
        'user-456': { lastLogin: '2023-01-02' }
      };
      const existingSettings = {
        currentGameId: 'game-123',
        sessionActivity: existingActivity,
      };

      mockedStorageManager.getAppSettings.mockResolvedValue(existingSettings);

      await removeSessionActivity(userId);

      expect(mockedStorageManager.saveAppSettings).toHaveBeenCalledWith({
        currentGameId: 'game-123',
        sessionActivity: {
          'user-456': { lastLogin: '2023-01-02' }
        },
      });
    });

    it('should handle storage errors', async () => {
      const error = new Error('Remove activity error');
      mockedStorageManager.getAppSettings.mockRejectedValue(error);

      await removeSessionActivity('user-123');
      
      expect(mockedLogger.debug).toHaveBeenCalledWith('[SessionSettings] Failed to remove session activity (likely during sign out):', error);
    });
  });
});