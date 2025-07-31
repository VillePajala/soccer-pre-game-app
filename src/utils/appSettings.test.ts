import {
  getAppSettings,
  saveAppSettings,
  updateAppSettings,
  getCurrentGameIdSetting,
  saveCurrentGameIdSetting,
  getLastHomeTeamName,
  saveLastHomeTeamName,
  resetAppSettings,
  AppSettings
} from './appSettings';

// Mock the storage manager
jest.mock('@/lib/storage', () => ({
  authAwareStorageManager: {
    getAppSettings: jest.fn(),
    saveAppSettings: jest.fn(),
    getItem: jest.fn(),
    setItem: jest.fn(),
  }
}));

// Mock logger to avoid console output during tests
jest.mock('@/utils/logger', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

import { authAwareStorageManager as storageManager } from '@/lib/storage';
import logger from '@/utils/logger';

describe('App Settings Utilities', () => {
  const mockStorageManager = storageManager as jest.Mocked<typeof storageManager>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAppSettings', () => {
    it('should return default settings if nothing is stored', async () => {
      mockStorageManager.getAppSettings.mockResolvedValue(null);
      
      const settings = await getAppSettings();
      
      expect(settings).toEqual({
        currentGameId: null,
        lastHomeTeamName: '',
        language: 'en',
        hasSeenAppGuide: false,
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24,
        lastBackupTime: undefined,
        backupEmail: '',
        useDemandCorrection: false,
        // PWA settings
        installPromptCount: 0,
        installPromptLastDismissed: null,
        appUsageCount: 0,
        installPromptDismissed: null,
        // Session/Security settings
        deviceFingerprint: undefined,
        sessionActivity: {},
      });
    });

    it('should return stored settings', async () => {
      const storedSettings: AppSettings = {
        currentGameId: 'game123',
        language: 'fi',
        hasSeenAppGuide: true,
        autoBackupEnabled: true,
        autoBackupIntervalHours: 48,
        lastBackupTime: '2023-10-01T12:00:00Z',
        backupEmail: 'test@example.com',
        useDemandCorrection: true,
        // PWA settings
        installPromptCount: 0,
        installPromptLastDismissed: null,
        appUsageCount: 0,
        installPromptDismissed: null,
        // Session/Security settings
        deviceFingerprint: undefined,
        sessionActivity: {},
      };
      mockStorageManager.getAppSettings.mockResolvedValue(storedSettings);
      
      const settings = await getAppSettings();
      
      expect(settings).toEqual({
        ...storedSettings,
        lastHomeTeamName: ''
      });
    });

    it('should merge stored partial settings with defaults', async () => {
      const storedSettings = {
        currentGameId: 'game123',
        language: 'fi'
      };
      mockStorageManager.getAppSettings.mockResolvedValue(storedSettings);
      
      const settings = await getAppSettings();
      
      expect(settings).toEqual({
        currentGameId: 'game123',
        lastHomeTeamName: '',
        language: 'fi',
        hasSeenAppGuide: false,
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24,
        lastBackupTime: undefined,
        backupEmail: '',
        useDemandCorrection: false,
        // PWA settings
        installPromptCount: 0,
        installPromptLastDismissed: null,
        appUsageCount: 0,
        installPromptDismissed: null,
        // Session/Security settings
        deviceFingerprint: undefined,
        sessionActivity: {},
      });
    });

    it('should return default settings on error', async () => {
      mockStorageManager.getAppSettings.mockRejectedValue(new Error('Storage error'));
      
      const settings = await getAppSettings();
      
      expect(settings).toEqual({
        currentGameId: null,
        lastHomeTeamName: '',
        language: 'en',
        hasSeenAppGuide: false,
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24,
        lastBackupTime: undefined,
        backupEmail: '',
        useDemandCorrection: false,
        // PWA settings
        installPromptCount: 0,
        installPromptLastDismissed: null,
        appUsageCount: 0,
        installPromptDismissed: null,
        // Session/Security settings
        deviceFingerprint: undefined,
        sessionActivity: {},
      });
      expect(mockLogger.error).toHaveBeenCalledWith('Error getting app settings:', expect.any(Error));
    });
  });

  describe('saveAppSettings', () => {
    it('should save settings to storage', async () => {
      const settings: AppSettings = {
        currentGameId: 'game123',
        language: 'fi',
        hasSeenAppGuide: true,
        autoBackupEnabled: true,
        autoBackupIntervalHours: 48,
        lastBackupTime: '2023-10-01T12:00:00Z',
        backupEmail: 'test@example.com',
        useDemandCorrection: true
      };
      mockStorageManager.saveAppSettings.mockResolvedValue({} as AppSettings);
      
      await saveAppSettings(settings);
      
      expect(mockStorageManager.saveAppSettings).toHaveBeenCalledWith(settings);
    });

    it('should log error if save fails', async () => {
      const settings: AppSettings = {
        currentGameId: 'game123',
        language: 'en'
      };
      const error = new Error('Save failed');
      mockStorageManager.saveAppSettings.mockRejectedValue(error);
      
      await expect(saveAppSettings(settings)).rejects.toThrow('Save failed');
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error saving app settings:', error);
    });
  });

  describe('updateAppSettings', () => {
    it('should update only specified settings', async () => {
      const existingSettings: AppSettings = {
        currentGameId: 'game123',
        language: 'en',
        hasSeenAppGuide: false,
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24,
        lastBackupTime: undefined,
        backupEmail: '',
        useDemandCorrection: false,
        lastHomeTeamName: '',
        // PWA settings
        installPromptCount: 0,
        installPromptLastDismissed: null,
        appUsageCount: 0,
        installPromptDismissed: null,
        // Session/Security settings
        deviceFingerprint: undefined,
        sessionActivity: {},
      };
      mockStorageManager.getAppSettings.mockResolvedValue(existingSettings);
      mockStorageManager.saveAppSettings.mockResolvedValue({} as AppSettings);
      
      const updates = {
        language: 'fi',
        hasSeenAppGuide: true
      };
      
      await updateAppSettings(updates);
      
      expect(mockStorageManager.saveAppSettings).toHaveBeenCalledWith({
        ...existingSettings,
        ...updates
      });
    });

    it('should log error if update fails', async () => {
      const error = new Error('Update failed');
      mockStorageManager.getAppSettings.mockRejectedValue(error);
      
      const updates = {
        language: 'fi'
      };
      
      await updateAppSettings(updates);
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error getting app settings:', error);
    });
  });

  describe('getCurrentGameIdSetting', () => {
    it('should return current game ID from settings', async () => {
      mockStorageManager.getAppSettings.mockResolvedValue({
        currentGameId: 'game123'
      });
      
      const gameId = await getCurrentGameIdSetting();
      
      expect(gameId).toBe('game123');
    });

    it('should return null if no current game ID', async () => {
      mockStorageManager.getAppSettings.mockResolvedValue({
        currentGameId: null
      });
      
      const gameId = await getCurrentGameIdSetting();
      
      expect(gameId).toBeNull();
    });

    it('should return null on error', async () => {
      mockStorageManager.getAppSettings.mockRejectedValue(new Error('Storage error'));
      
      const gameId = await getCurrentGameIdSetting();
      
      expect(gameId).toBeNull();
    });
  });

  describe('saveCurrentGameIdSetting', () => {
    it('should save current game ID', async () => {
      const existingSettings: AppSettings = {
        currentGameId: null,
        language: 'en',
        hasSeenAppGuide: false,
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24,
        lastBackupTime: undefined,
        backupEmail: '',
        useDemandCorrection: false,
        lastHomeTeamName: '',
        // PWA settings
        installPromptCount: 0,
        installPromptLastDismissed: null,
        appUsageCount: 0,
        installPromptDismissed: null,
        // Session/Security settings
        deviceFingerprint: undefined,
        sessionActivity: {},
      };
      mockStorageManager.getAppSettings.mockResolvedValue(existingSettings);
      mockStorageManager.saveAppSettings.mockResolvedValue({} as AppSettings);
      
      await saveCurrentGameIdSetting('game123');
      
      expect(mockStorageManager.saveAppSettings).toHaveBeenCalledWith({
        ...existingSettings,
        currentGameId: 'game123'
      });
    });

    it('should clear current game ID when passed null', async () => {
      const existingSettings: AppSettings = {
        currentGameId: 'game123',
        language: 'en',
        hasSeenAppGuide: false,
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24,
        lastBackupTime: undefined,
        backupEmail: '',
        useDemandCorrection: false,
        lastHomeTeamName: '',
        // PWA settings
        installPromptCount: 0,
        installPromptLastDismissed: null,
        appUsageCount: 0,
        installPromptDismissed: null,
        // Session/Security settings
        deviceFingerprint: undefined,
        sessionActivity: {},
      };
      mockStorageManager.getAppSettings.mockResolvedValue(existingSettings);
      mockStorageManager.saveAppSettings.mockResolvedValue({} as AppSettings);
      
      await saveCurrentGameIdSetting(null);
      
      expect(mockStorageManager.saveAppSettings).toHaveBeenCalledWith({
        ...existingSettings,
        currentGameId: null
      });
    });
  });

  describe('getLastHomeTeamName', () => {
    it('should return last home team name from storage', async () => {
      mockStorageManager.getAppSettings.mockResolvedValue({
        currentGameId: null,
        lastHomeTeamName: 'FC Barcelona'
      });
      
      const teamName = await getLastHomeTeamName();
      
      expect(teamName).toBe('FC Barcelona');
    });

    it('should return empty string if not stored', async () => {
      mockStorageManager.getAppSettings.mockResolvedValue({
        currentGameId: null
      });
      
      const teamName = await getLastHomeTeamName();
      
      expect(teamName).toBe('');
    });

    it('should return empty string on error', async () => {
      mockStorageManager.getAppSettings.mockRejectedValue(new Error('Storage error'));
      
      const teamName = await getLastHomeTeamName();
      
      expect(teamName).toBe('');
      expect(mockLogger.error).toHaveBeenCalledWith('Error getting app settings:', expect.any(Error));
    });
  });

  describe('saveLastHomeTeamName', () => {
    it('should save last home team name to storage', async () => {
      mockStorageManager.getAppSettings.mockResolvedValue({
        currentGameId: null,
        language: 'en'
      });
      mockStorageManager.saveAppSettings.mockResolvedValue({} as AppSettings);
      
      const result = await saveLastHomeTeamName('FC Barcelona');
      
      expect(result).toBe(true);
      expect(mockStorageManager.saveAppSettings).toHaveBeenCalled();
    });

    it('should return false if save fails', async () => {
      // First call succeeds (for getAppSettings in updateAppSettings)
      mockStorageManager.getAppSettings.mockResolvedValue({
        currentGameId: null,
        language: 'en'
      });
      // But saveAppSettings fails
      const error = new Error('Save failed');
      mockStorageManager.saveAppSettings.mockRejectedValue(error);
      
      const result = await saveLastHomeTeamName('FC Barcelona');
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('Error saving last home team name:', error);
    });
  });

  describe('resetAppSettings', () => {
    it('should save default settings', async () => {
      mockStorageManager.saveAppSettings.mockResolvedValue({} as AppSettings);
      
      await resetAppSettings();
      
      expect(mockStorageManager.saveAppSettings).toHaveBeenCalledWith({
        currentGameId: null,
        lastHomeTeamName: '',
        language: 'en',
        hasSeenAppGuide: false,
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24,
        lastBackupTime: undefined,
        backupEmail: '',
        useDemandCorrection: false,
        // PWA settings
        installPromptCount: 0,
        installPromptLastDismissed: null,
        appUsageCount: 0,
        installPromptDismissed: null,
        // Session/Security settings
        deviceFingerprint: undefined,
        sessionActivity: {},
      });
    });

    it('should log error if reset fails', async () => {
      const error = new Error('Reset failed');
      mockStorageManager.saveAppSettings.mockRejectedValue(error);
      
      await resetAppSettings();
      
      expect(mockLogger.error).toHaveBeenCalledWith('Error resetting app settings:', error);
    });
  });
});