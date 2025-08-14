import {
  getPWASettings,
  savePWASettings,
  incrementInstallPromptCount,
  incrementAppUsageCount,
  setInstallPromptDismissed,
  getAppUsageCount,
  setInstallPromptNeverShow,
} from './pwaSettings';

// Mock logger
jest.mock('@/utils/logger', () => ({
  error: jest.fn(),
  log: jest.fn(),
}));

// Mock the entire storage manager module
jest.mock('@/lib/storage/offlineFirstStorageManager', () => {
  const mockInstance = {
    getAppSettings: jest.fn(),
    saveAppSettings: jest.fn(),
  };
  
  return {
    OfflineFirstStorageManager: jest.fn(() => mockInstance),
    __mockInstance: mockInstance,
  };
});

describe('pwaSettings', () => {
  let mockStorageManager: any;

  beforeEach(() => {
    jest.clearAllMocks();
    // Get the mock instance
    const { OfflineFirstStorageManager } = require('@/lib/storage/offlineFirstStorageManager');
    mockStorageManager = new OfflineFirstStorageManager();
  });

  describe('getPWASettings', () => {
    it('should return default settings in SSR environment', async () => {
      const originalWindow = global.window;
      delete (global as any).window;

      const result = await getPWASettings();
      
      expect(result).toEqual({
        installPromptCount: 0,
        installPromptLastDismissed: null,
        appUsageCount: 0,
        installPromptDismissed: null,
      });

      global.window = originalWindow;
    });

    it('should return PWA settings from storage', async () => {
      const mockSettings = {
        installPromptCount: 5,
        installPromptLastDismissed: 1640995200000,
        appUsageCount: 10,
        installPromptDismissed: 1640995200000,
        currentGameId: null,
      };

      mockStorageManager.getAppSettings.mockResolvedValue(mockSettings);

      const result = await getPWASettings();

      expect(result).toEqual({
        installPromptCount: 5,
        installPromptLastDismissed: 1640995200000,
        appUsageCount: 10,
        installPromptDismissed: 1640995200000,
      });
    });

    it('should return default values for missing fields', async () => {
      mockStorageManager.getAppSettings.mockResolvedValue({
        installPromptCount: 3,
        currentGameId: null,
      });

      const result = await getPWASettings();

      expect(result).toEqual({
        installPromptCount: 3,
        installPromptLastDismissed: null,
        appUsageCount: 0,
        installPromptDismissed: null,
      });
    });

    it('should handle null settings', async () => {
      mockStorageManager.getAppSettings.mockResolvedValue(null);

      const result = await getPWASettings();

      expect(result).toEqual({
        installPromptCount: 0,
        installPromptLastDismissed: null,
        appUsageCount: 0,
        installPromptDismissed: null,
      });
    });

    it('should handle storage errors gracefully', async () => {
      mockStorageManager.getAppSettings.mockRejectedValue(new Error('Storage error'));

      const result = await getPWASettings();

      expect(result).toEqual({
        installPromptCount: 0,
        installPromptLastDismissed: null,
        appUsageCount: 0,
        installPromptDismissed: null,
      });
    });
  });

  describe('savePWASettings', () => {
    const pwaSettings = {
      installPromptCount: 2,
      installPromptLastDismissed: 1640995200000,
      appUsageCount: 5,
      installPromptDismissed: null,
    };

    it('should return early in SSR environment', async () => {
      const originalWindow = global.window;
      delete (global as any).window;

      await savePWASettings(pwaSettings);
      expect(mockStorageManager.getAppSettings).not.toHaveBeenCalled();

      global.window = originalWindow;
    });

    it('should save PWA settings to storage', async () => {
      const existingSettings = { currentGameId: 'game-1' };
      
      mockStorageManager.getAppSettings.mockResolvedValue(existingSettings);
      mockStorageManager.saveAppSettings.mockResolvedValue();

      await savePWASettings(pwaSettings);

      expect(mockStorageManager.saveAppSettings).toHaveBeenCalledWith({
        ...existingSettings,
        ...pwaSettings,
      });
    });

    it('should handle storage errors gracefully', async () => {
      mockStorageManager.getAppSettings.mockRejectedValue(new Error('Storage error'));

      await expect(savePWASettings(pwaSettings)).resolves.not.toThrow();
    });
  });

  describe('incrementInstallPromptCount', () => {
    it('should increment install prompt count', async () => {
      mockStorageManager.getAppSettings
        .mockResolvedValueOnce({ installPromptCount: 2, currentGameId: null })
        .mockResolvedValueOnce({ installPromptCount: 2, currentGameId: null });
      mockStorageManager.saveAppSettings.mockResolvedValue();

      const result = await incrementInstallPromptCount();

      expect(result).toBe(3);
    });
  });

  describe('incrementAppUsageCount', () => {
    it('should increment app usage count', async () => {
      mockStorageManager.getAppSettings
        .mockResolvedValueOnce({ appUsageCount: 10, currentGameId: null })
        .mockResolvedValueOnce({ appUsageCount: 10, currentGameId: null });
      mockStorageManager.saveAppSettings.mockResolvedValue();

      const result = await incrementAppUsageCount();

      expect(result).toBe(11);
    });
  });

  describe('setInstallPromptDismissed', () => {
    it('should set install prompt dismissed timestamp', async () => {
      const mockTimestamp = 1640995200000;
      mockStorageManager.getAppSettings.mockResolvedValue({ currentGameId: null });
      mockStorageManager.saveAppSettings.mockResolvedValue();

      await setInstallPromptDismissed(mockTimestamp);

      expect(mockStorageManager.saveAppSettings).toHaveBeenCalledWith({
        currentGameId: null,
        installPromptLastDismissed: mockTimestamp,
        installPromptDismissed: mockTimestamp,
      });
    });
  });

  describe('getAppUsageCount', () => {
    it('should return app usage count', async () => {
      mockStorageManager.getAppSettings.mockResolvedValue({
        appUsageCount: 15,
        currentGameId: null
      });

      const result = await getAppUsageCount();

      expect(result).toBe(15);
    });
  });

  describe('setInstallPromptNeverShow', () => {
    it('should set install prompt count to 999', async () => {
      mockStorageManager.getAppSettings.mockResolvedValue({ currentGameId: null });
      mockStorageManager.saveAppSettings.mockResolvedValue();

      await setInstallPromptNeverShow();

      expect(mockStorageManager.saveAppSettings).toHaveBeenCalledWith({
        currentGameId: null,
        installPromptCount: 999,
      });
    });
  });
});