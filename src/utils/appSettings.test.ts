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
import { APP_SETTINGS_KEY, LAST_HOME_TEAM_NAME_KEY } from '@/config/storageKeys';

describe('App Settings Utilities', () => {
  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn(),
    length: 0,
    key: jest.fn()
  };

  // Replace global localStorage with mock
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });

  // Reset mocks before each test
  beforeEach(() => {
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    localStorageMock.clear.mockReset();
    localStorageMock.removeItem.mockReset();
    localStorageMock.key.mockReset();
  });

  describe('getAppSettings', () => {
    it('should return default settings if nothing is stored', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = await getAppSettings();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith(APP_SETTINGS_KEY);
      expect(result).toEqual({
        currentGameId: null,
        lastHomeTeamName: '',
        language: 'en',
        hasSeenAppGuide: false,
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24,
        lastBackupTime: undefined,
        backupEmail: '',
        useDemandCorrection: false
      });
    });

    it('should return merged settings if stored settings exist', async () => {
      const storedSettings = { currentGameId: 'game123', lastHomeTeamName: 'Team X' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedSettings));
      
      const result = await getAppSettings();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith(APP_SETTINGS_KEY);
      expect(result).toEqual({
        currentGameId: 'game123',
        lastHomeTeamName: 'Team X',
        language: 'en', // From default settings
        hasSeenAppGuide: false,
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24,
        lastBackupTime: undefined,
        backupEmail: '',
        useDemandCorrection: false
      });
    });

    it('should handle invalid JSON and return default settings', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const result = await getAppSettings();
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(result).toEqual({
        currentGameId: null,
        lastHomeTeamName: '',
        language: 'en',
        hasSeenAppGuide: false,
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24,
        lastBackupTime: undefined,
        backupEmail: '',
        useDemandCorrection: false
      });
      
      consoleSpy.mockRestore();
    });

    it('should return default settings if localStorage.getItem throws an error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Cannot access localStorage');
      localStorageMock.getItem.mockImplementation(() => { throw error; });

      const result = await getAppSettings();

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error getting item'), error);
      expect(result).toEqual({
        currentGameId: null,
        lastHomeTeamName: '',
        language: 'en',
        hasSeenAppGuide: false,
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24,
        lastBackupTime: undefined,
        backupEmail: '',
        useDemandCorrection: false
      });
      consoleSpy.mockRestore();
    });
  });

  describe('saveAppSettings', () => {
    it('should save settings to localStorage and return true on success', async () => {
      const settings: AppSettings = {
        currentGameId: 'game456',
        lastHomeTeamName: 'Team Y',
        language: 'fi'
      };
      
      const result = await saveAppSettings(settings);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        APP_SETTINGS_KEY,
        JSON.stringify(settings)
      );
      expect(result).toBe(true);
    });

    it('should return false if localStorage.setItem throws an error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Storage quota exceeded');
      localStorageMock.setItem.mockImplementation(() => { throw error; });

      const settings: AppSettings = { currentGameId: 'game123' };
      const result = await saveAppSettings(settings);

      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error setting item'), error);
      expect(result).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('updateAppSettings', () => {
    it('should update only specified settings and return updated settings', async () => {
      const currentSettings: AppSettings = {
        currentGameId: 'game123',
        lastHomeTeamName: 'Team A',
        language: 'en',
        hasSeenAppGuide: false,
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(currentSettings));
      
      const result = await updateAppSettings({ currentGameId: 'game456' });
      
      expect(result).toEqual({
        currentGameId: 'game456', // Updated
        lastHomeTeamName: 'Team A', // Preserved
        language: 'en', // Preserved
        hasSeenAppGuide: false,
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24,
        lastBackupTime: undefined,
        backupEmail: '',
        useDemandCorrection: false
      });
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        APP_SETTINGS_KEY,
        JSON.stringify({
          currentGameId: 'game456',
          lastHomeTeamName: 'Team A',
          language: 'en',
          hasSeenAppGuide: false,
          autoBackupEnabled: false,
          autoBackupIntervalHours: 24,
          lastBackupTime: undefined,
          backupEmail: '',
          useDemandCorrection: false
        })
      );
    });

    it('should update the backup email', async () => {
      const currentSettings: AppSettings = {
        currentGameId: 'game123',
        lastHomeTeamName: 'Team A',
        language: 'en',
        hasSeenAppGuide: false,
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24,
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(currentSettings));

      const result = await updateAppSettings({ backupEmail: 'a@test.com' });

      expect(result).toEqual({
        ...currentSettings,
        lastBackupTime: undefined,
        backupEmail: 'a@test.com',
        useDemandCorrection: false,
      });
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        APP_SETTINGS_KEY,
        JSON.stringify({
          ...currentSettings,
          lastBackupTime: undefined,
          backupEmail: 'a@test.com',
          useDemandCorrection: false,
        })
      );
    });

    it('should throw an error if update fails', async () => {
      const currentSettings: AppSettings = {
        currentGameId: 'initialGame',
        lastHomeTeamName: 'InitialTeam',
        language: 'en',
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24
      };
      // Simulate getAppSettings returning current settings initially
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify(currentSettings));
      // Simulate saveAppSettings failing by making setItem throw an error
      localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('Save failed'); });

      // Expect updateAppSettings to throw the specific error.
      await expect(updateAppSettings({ currentGameId: 'updatedGame' })).rejects.toThrowError(
        'Failed to save updated settings via saveAppSettings within updateAppSettings.'
      );

      // Ensure localStorage.setItem was called (attempted to save)
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
      // Ensure console.error was NOT called by updateAppSettings directly for this error
      // (it's now thrown, and saveAppSettings handles its own console.error for the localStorage part)
    });
  });

  describe('getCurrentGameIdSetting', () => {
    it('should return the current game ID', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        currentGameId: 'game789'
      }));
      
      const result = await getCurrentGameIdSetting();
      
      expect(result).toBe('game789');
      expect(localStorageMock.getItem).toHaveBeenCalledWith(APP_SETTINGS_KEY);
    });

    it('should return null if no current game ID is set', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        currentGameId: null
      }));
      
      const result = await getCurrentGameIdSetting();
      
      expect(result).toBeNull();
    });
  });

  describe('saveCurrentGameIdSetting', () => {
    it('should update only the current game ID setting and return true', async () => {
      const currentSettings: AppSettings = {
        currentGameId: 'oldGameId',
        lastHomeTeamName: 'Team B',
        language: 'fi',
        hasSeenAppGuide: false,
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(currentSettings));
      // Mock setItem to simulate successful save by updateAppSettings
      localStorageMock.setItem.mockImplementation(() => {}); 

      const result = await saveCurrentGameIdSetting('newGameId');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        APP_SETTINGS_KEY,
        JSON.stringify({
          currentGameId: 'newGameId',
          lastHomeTeamName: 'Team B',
          language: 'fi',
          hasSeenAppGuide: false,
          autoBackupEnabled: false,
          autoBackupIntervalHours: 24,
          backupEmail: '',
          useDemandCorrection: false
        })
      );
      expect(result).toBe(true);
    });

    it('should return false if saving fails', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ currentGameId: 'old' }));
      // Simulate error during the setItem call within updateAppSettings
      localStorageMock.setItem.mockImplementationOnce(() => { 
        throw new Error('Cannot save'); 
      });

      const result = await saveCurrentGameIdSetting('newGameId');
      expect(result).toBe(false);
    });
  });

  describe('getLastHomeTeamName', () => {
    it('should return last home team name from app settings', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === APP_SETTINGS_KEY) {
          return JSON.stringify({ lastHomeTeamName: 'Dragons' });
        }
        return null;
      });
      
      const result = await getLastHomeTeamName();
      
      expect(result).toBe('Dragons');
      expect(localStorageMock.getItem).toHaveBeenCalledWith(APP_SETTINGS_KEY);
    });

    it('should fall back to legacy storage if not in app settings', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === APP_SETTINGS_KEY) {
          return JSON.stringify({ language: 'en' }); 
        }
        if (key === LAST_HOME_TEAM_NAME_KEY) {
          return 'Tigers'; 
        }
        return null;
      });
      
      const result = await getLastHomeTeamName();
      
      expect(result).toBe('Tigers');
      expect(localStorageMock.getItem).toHaveBeenCalledWith(APP_SETTINGS_KEY);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(LAST_HOME_TEAM_NAME_KEY);
    });

    it('should return empty string if no value is found', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = await getLastHomeTeamName();
      
      expect(result).toBe('');
    });
  });

  describe('saveLastHomeTeamName', () => {
    it('should save to both app settings and legacy location and return true', async () => {
      const currentSettings: AppSettings = {
        currentGameId: 'game123',
        lastHomeTeamName: 'Old Team Name',
        language: 'en',
        hasSeenAppGuide: false,
        autoBackupEnabled: false,
        autoBackupIntervalHours: 24,
        backupEmail: ''
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(currentSettings)); // For getAppSettings call in updateAppSettings
      localStorageMock.setItem.mockImplementation(() => {}); // Default successful save

      const result = await saveLastHomeTeamName('New Team Name');

      // Check updateAppSettings call (indirectly via setItem for APP_SETTINGS_KEY)
      const appSettingsCall = localStorageMock.setItem.mock.calls.find(
        call => call[0] === APP_SETTINGS_KEY
      );
      expect(appSettingsCall).toBeDefined();
      if (appSettingsCall) {
        const savedSettings = JSON.parse(appSettingsCall[1]);
        expect(savedSettings).toEqual({
          ...currentSettings, // Ensure other settings are preserved
          lastHomeTeamName: 'New Team Name', // The updated value
          useDemandCorrection: false
        });
      }

      // Check legacy save
      expect(localStorageMock.setItem).toHaveBeenCalledWith(LAST_HOME_TEAM_NAME_KEY, 'New Team Name');
      expect(result).toBe(true);
    });

    it('should return false if saving to app settings fails', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({ currentGameId: 'game123' }));
      // Simulate updateAppSettings failing (e.g., its internal saveAppSettings fails)
      localStorageMock.setItem.mockImplementationOnce((key) => { 
        if (key === APP_SETTINGS_KEY) throw new Error('Cannot save app settings');
      }); 
      // Legacy setItem might still be called if not guarded, but the function should return false.
      
      const result = await saveLastHomeTeamName('New Team Name');
      expect(result).toBe(false); 
      // Optionally, verify legacy setItem was not called or handled if error occurs earlier
      // For this setup, it might still be called after the error depending on exact implementation.
      // The primary check is the return value.
    });
  });

  describe('resetAppSettings', () => {
    it('should reset settings to default and return true', async () => {
      // Mock setItem to simulate successful save by saveAppSettings
      localStorageMock.setItem.mockImplementation(() => {});

      const result = await resetAppSettings();
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        APP_SETTINGS_KEY,
        JSON.stringify({
          currentGameId: null,
          lastHomeTeamName: '',
          language: 'en',
          hasSeenAppGuide: false,
          autoBackupEnabled: false,
          autoBackupIntervalHours: 24,
          lastBackupTime: undefined,
          backupEmail: '',
          useDemandCorrection: false
        })
      );
      expect(result).toBe(true);
    });

    it('should return false if resetting fails', async () => {
      localStorageMock.setItem.mockImplementation(() => { 
        throw new Error('Cannot save default settings'); 
      });

      const result = await resetAppSettings();
      expect(result).toBe(false);
    });
  });
}); 