import { APP_SETTINGS_KEY, LAST_HOME_TEAM_NAME_KEY } from '@/config/constants';

/**
 * Interface for application settings
 */
export interface AppSettings {
  currentGameId: string | null;
  lastHomeTeamName?: string;
  language?: string;
  // Add other settings as needed
}

/**
 * Default application settings
 */
const DEFAULT_APP_SETTINGS: AppSettings = {
  currentGameId: null,
  lastHomeTeamName: '',
  language: 'en',
};

/**
 * Gets the application settings from localStorage
 * @returns The application settings
 */
export const getAppSettings = (): AppSettings => {
  try {
    const settingsJson = localStorage.getItem(APP_SETTINGS_KEY);
    if (!settingsJson) {
      return DEFAULT_APP_SETTINGS;
    }
    
    const settings = JSON.parse(settingsJson);
    return { ...DEFAULT_APP_SETTINGS, ...settings };
  } catch (error) {
    console.error('Error getting app settings from localStorage:', error);
    return DEFAULT_APP_SETTINGS;
  }
};

/**
 * Saves the application settings to localStorage
 * @param settings - The settings to save
 */
export const saveAppSettings = (settings: AppSettings): void => {
  try {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving app settings to localStorage:', error);
  }
};

/**
 * Updates specific application settings while preserving others
 * @param settingsUpdate - Partial settings to update
 * @returns The updated settings
 */
export const updateAppSettings = (settingsUpdate: Partial<AppSettings>): AppSettings => {
  try {
    const currentSettings = getAppSettings();
    const updatedSettings = { ...currentSettings, ...settingsUpdate };
    saveAppSettings(updatedSettings);
    return updatedSettings;
  } catch (error) {
    console.error('Error updating app settings:', error);
    return getAppSettings(); // Return current settings in case of error
  }
};

/**
 * Gets the current game ID
 * @returns The current game ID, or null if not set
 */
export const getCurrentGameIdSetting = (): string | null => {
  return getAppSettings().currentGameId;
};

/**
 * Saves the current game ID setting
 * @param gameId - The game ID to save
 */
export const saveCurrentGameIdSetting = (gameId: string | null): void => {
  updateAppSettings({ currentGameId: gameId });
};

/**
 * Gets the last used home team name
 * @returns The last home team name, or empty string if not set
 */
export const getLastHomeTeamName = (): string => {
  try {
    // Try the modern approach first (using appSettings)
    const settings = getAppSettings();
    if (settings.lastHomeTeamName) {
      return settings.lastHomeTeamName;
    }
    
    // Fall back to legacy approach (using dedicated key)
    const legacyValue = localStorage.getItem(LAST_HOME_TEAM_NAME_KEY);
    return legacyValue || '';
  } catch (error) {
    console.error('Error getting last home team name:', error);
    return '';
  }
};

/**
 * Saves the last used home team name
 * @param teamName - The team name to save
 */
export const saveLastHomeTeamName = (teamName: string): void => {
  try {
    // Save in both the modern way and legacy way for backwards compatibility
    updateAppSettings({ lastHomeTeamName: teamName });
    localStorage.setItem(LAST_HOME_TEAM_NAME_KEY, teamName);
  } catch (error) {
    console.error('Error saving last home team name:', error);
  }
};

/**
 * Clears all application settings, resetting to defaults
 */
export const resetAppSettings = (): void => {
  try {
    saveAppSettings(DEFAULT_APP_SETTINGS);
  } catch (error) {
    console.error('Error resetting app settings:', error);
  }
}; 