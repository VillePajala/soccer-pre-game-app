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
import { APP_SETTINGS_KEY, LAST_HOME_TEAM_NAME_KEY } from '@/config/constants';

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
    it('should return default settings if nothing is stored', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = getAppSettings();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith(APP_SETTINGS_KEY);
      expect(result).toEqual({
        currentGameId: null,
        lastHomeTeamName: '',
        language: 'en'
      });
    });

    it('should return merged settings if stored settings exist', () => {
      const storedSettings = { currentGameId: 'game123', lastHomeTeamName: 'Team X' };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(storedSettings));
      
      const result = getAppSettings();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith(APP_SETTINGS_KEY);
      expect(result).toEqual({
        currentGameId: 'game123',
        lastHomeTeamName: 'Team X',
        language: 'en' // From default settings
      });
    });

    it('should handle invalid JSON', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const result = getAppSettings();
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(result).toEqual({
        currentGameId: null,
        lastHomeTeamName: '',
        language: 'en'
      });
      
      consoleSpy.mockRestore();
    });

    it('should handle localStorage errors', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Storage quota exceeded');
      
      // Store original implementation and set temporary one for this test
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = jest.fn(() => { throw error; }); // Use jest.fn() for direct assignment
      
      saveAppSettings({ currentGameId: 'game123' });
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Error saving app settings'), error);
      
      localStorageMock.setItem = originalSetItem; // Restore original implementation
      consoleSpy.mockRestore();
    });
  });

  describe('saveAppSettings', () => {
    it('should save settings to localStorage', () => {
      const settings: AppSettings = {
        currentGameId: 'game456',
        lastHomeTeamName: 'Team Y',
        language: 'fi'
      };
      
      saveAppSettings(settings);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        APP_SETTINGS_KEY,
        JSON.stringify(settings)
      );
    });
  });

  describe('updateAppSettings', () => {
    it('should update only specified settings', () => {
      // Setup current settings
      const currentSettings: AppSettings = {
        currentGameId: 'game123',
        lastHomeTeamName: 'Team A',
        language: 'en'
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(currentSettings));
      
      // Update only currentGameId
      const result = updateAppSettings({ currentGameId: 'game456' });
      
      expect(result).toEqual({
        currentGameId: 'game456', // Updated
        lastHomeTeamName: 'Team A', // Preserved
        language: 'en' // Preserved
      });
      
      // Verify localStorage was updated with all settings
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        APP_SETTINGS_KEY,
        expect.any(String)
      );
      const savedSettings = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedSettings).toEqual({
        currentGameId: 'game456',
        lastHomeTeamName: 'Team A',
        language: 'en'
      });
    });
  });

  describe('getCurrentGameIdSetting', () => {
    it('should return the current game ID', () => {
      // Setup mock settings
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        currentGameId: 'game789'
      }));
      
      const result = getCurrentGameIdSetting();
      
      expect(result).toBe('game789');
      expect(localStorageMock.getItem).toHaveBeenCalledWith(APP_SETTINGS_KEY);
    });

    it('should return null if no current game ID is set', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        currentGameId: null
      }));
      
      const result = getCurrentGameIdSetting();
      
      expect(result).toBeNull();
    });
  });

  describe('saveCurrentGameIdSetting', () => {
    it('should update only the current game ID setting', () => {
      // Setup mock settings
      const currentSettings: AppSettings = {
        currentGameId: 'oldGameId',
        lastHomeTeamName: 'Team B',
        language: 'fi'
      };
      localStorageMock.getItem.mockReturnValue(JSON.stringify(currentSettings));
      
      saveCurrentGameIdSetting('newGameId');
      
      // Verify entire settings object is saved with updated game ID
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        APP_SETTINGS_KEY,
        expect.any(String)
      );
      const savedSettings = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedSettings).toEqual({
        currentGameId: 'newGameId', // Updated
        lastHomeTeamName: 'Team B', // Preserved
        language: 'fi' // Preserved
      });
    });
  });

  describe('getLastHomeTeamName', () => {
    it('should return last home team name from app settings', () => {
      // Setup app settings with lastHomeTeamName
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === APP_SETTINGS_KEY) {
          return JSON.stringify({ lastHomeTeamName: 'Dragons' });
        }
        return null;
      });
      
      const result = getLastHomeTeamName();
      
      expect(result).toBe('Dragons');
      expect(localStorageMock.getItem).toHaveBeenCalledWith(APP_SETTINGS_KEY);
    });

    it('should fall back to legacy storage if not in app settings', () => {
      // Setup app settings without lastHomeTeamName, but with legacy value
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === APP_SETTINGS_KEY) {
          return JSON.stringify({ language: 'en' }); // No lastHomeTeamName
        }
        if (key === LAST_HOME_TEAM_NAME_KEY) {
          return 'Tigers'; // Legacy value
        }
        return null;
      });
      
      const result = getLastHomeTeamName();
      
      expect(result).toBe('Tigers');
      expect(localStorageMock.getItem).toHaveBeenCalledWith(APP_SETTINGS_KEY);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(LAST_HOME_TEAM_NAME_KEY);
    });

    it('should return empty string if no value is found', () => {
      // No values anywhere
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = getLastHomeTeamName();
      
      expect(result).toBe('');
    });
  });

  describe('saveLastHomeTeamName', () => {
    it('should save to both app settings and legacy location', () => {
      // Setup current settings
      localStorageMock.getItem.mockReturnValue(JSON.stringify({
        currentGameId: 'game123',
        language: 'en'
      }));
      
      saveLastHomeTeamName('Eagles');
      
      // Verify app settings was updated
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        APP_SETTINGS_KEY,
        expect.any(String)
      );
      
      // Verify legacy location was also updated
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        LAST_HOME_TEAM_NAME_KEY,
        'Eagles'
      );
      
      // Verify app settings contained the value
      const savedSettings = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedSettings.lastHomeTeamName).toBe('Eagles');
    });
  });

  describe('resetAppSettings', () => {
    it('should reset all settings to defaults', () => {
      resetAppSettings();
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        APP_SETTINGS_KEY,
        expect.any(String)
      );
      
      const savedSettings = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedSettings).toEqual({
        currentGameId: null,
        lastHomeTeamName: '',
        language: 'en'
      });
    });
  });
}); 