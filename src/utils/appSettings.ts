import {
  APP_SETTINGS_KEY,
  LAST_HOME_TEAM_NAME_KEY,
  MASTER_ROSTER_KEY,
  SAVED_GAMES_KEY,
  SEASONS_LIST_KEY,
  TOURNAMENTS_LIST_KEY,
} from '@/config/storageKeys';
import {
  getLocalStorageItem,
  setLocalStorageItem,
  removeLocalStorageItem,
} from './localStorage';
import logger from '@/utils/logger';
/**
 * Interface for application settings
 */
export interface AppSettings {
  currentGameId: string | null;
  lastHomeTeamName?: string;
  language?: string;
  hasSeenAppGuide?: boolean;
  autoBackupEnabled?: boolean;
  autoBackupIntervalHours?: number;
  lastBackupTime?: string;
  // Add other settings as needed
}

/**
 * Default application settings
 */
const DEFAULT_APP_SETTINGS: AppSettings = {
  currentGameId: null,
  lastHomeTeamName: '',
  language: 'en',
  hasSeenAppGuide: false,
  autoBackupEnabled: false,
  autoBackupIntervalHours: 24,
  lastBackupTime: undefined,
};

/**
 * Gets the application settings from localStorage
 * @returns A promise that resolves to the application settings
 */
export const getAppSettings = async (): Promise<AppSettings> => {
  try {
    const settingsJson = getLocalStorageItem(APP_SETTINGS_KEY);
    if (!settingsJson) {
      return DEFAULT_APP_SETTINGS;
    }

    const settings = JSON.parse(settingsJson);
    return { ...DEFAULT_APP_SETTINGS, ...settings };
  } catch (error) {
    logger.error('Error getting app settings from localStorage:', error);
    return DEFAULT_APP_SETTINGS; // Fallback to default on error
  }
};

/**
 * Saves the application settings to localStorage
 * @param settings - The settings to save
 * @returns A promise that resolves to true if successful, false otherwise
 */
export const saveAppSettings = async (settings: AppSettings): Promise<boolean> => {
  try {
    setLocalStorageItem(APP_SETTINGS_KEY, JSON.stringify(settings));
    return true;
  } catch (error) {
    logger.error('Error saving app settings to localStorage:', error);
    return false;
  }
};

/**
 * Updates specific application settings while preserving others
 * @param settingsUpdate - Partial settings to update
 * @returns A promise that resolves to the updated settings
 */
export const updateAppSettings = async (settingsUpdate: Partial<AppSettings>): Promise<AppSettings> => {
  // Get current settings. If this fails, the error will propagate.
  const currentSettings = await getAppSettings();
  const updatedSettings = { ...currentSettings, ...settingsUpdate };

  // Try to save the updated settings.
  const saveSuccess = await saveAppSettings(updatedSettings);

  if (!saveSuccess) {
    // saveAppSettings already logs the specific localStorage error.
    // We throw a new error here to indicate that the update operation itself failed.
    // This error will be caught by the calling functions (e.g., saveCurrentGameIdSetting).
    throw new Error('Failed to save updated settings via saveAppSettings within updateAppSettings.');
  }
  // If save was successful, return the updated settings.
  return updatedSettings;
};

/**
 * Gets the current game ID
 * @returns A promise that resolves to the current game ID, or null if not set
 */
export const getCurrentGameIdSetting = async (): Promise<string | null> => {
  // Wait for getAppSettings to resolve
  const settings = await getAppSettings();
  return settings.currentGameId;
};

/**
 * Saves the current game ID setting
 * @param gameId - The game ID to save
 * @returns A promise that resolves to true if successful, false otherwise
 */
export const saveCurrentGameIdSetting = async (gameId: string | null): Promise<boolean> => {
  try {
    // Wait for updateAppSettings to resolve
    await updateAppSettings({ currentGameId: gameId });
    return true;
  } catch {
    // updateAppSettings already logs errors. We indicate failure here.
    return false;
  }
};

/**
 * Gets the last used home team name
 * @returns A promise that resolves to the last home team name, or empty string if not set
 */
export const getLastHomeTeamName = async (): Promise<string> => {
  try {
    // Try the modern approach first (using appSettings)
    // Wait for getAppSettings to resolve
    const settings = await getAppSettings();
    if (settings.lastHomeTeamName) {
      return Promise.resolve(settings.lastHomeTeamName);
    }
    
    // Fall back to legacy approach (using dedicated key)
    const legacyValue = getLocalStorageItem(LAST_HOME_TEAM_NAME_KEY);
    return legacyValue || '';
  } catch (error) {
    logger.error('Error getting last home team name:', error);
    return '';
  }
};

/**
 * Saves the last used home team name
 * @param teamName - The team name to save
 * @returns A promise that resolves to true if successful, false otherwise
 */
export const saveLastHomeTeamName = async (teamName: string): Promise<boolean> => {
  try {
    // Save in both the modern way and legacy way for backwards compatibility
    // Wait for updateAppSettings to resolve
    await updateAppSettings({ lastHomeTeamName: teamName });
    setLocalStorageItem(LAST_HOME_TEAM_NAME_KEY, teamName); // Legacy sync save
    return true;
  } catch (error) {
    logger.error('Error saving last home team name:', error);
    return false;
  }
};

/**
 * Gets whether the user has seen the app guide
 * @returns A promise that resolves to true if seen, false otherwise
 */
export const getHasSeenAppGuide = async (): Promise<boolean> => {
  const settings = await getAppSettings();
  return settings.hasSeenAppGuide ?? false;
};

/**
 * Saves the hasSeenAppGuide flag
 * @param value - Whether the guide has been viewed
 * @returns A promise that resolves to true if successful, false otherwise
 */
export const saveHasSeenAppGuide = async (value: boolean): Promise<boolean> => {
  try {
    await updateAppSettings({ hasSeenAppGuide: value });
    return true;
  } catch {
    return false;
  }
};

/**
 * Clears all application settings, resetting to defaults
 * @returns A promise that resolves to true if successful, false otherwise
 */
export const resetAppSettings = async (): Promise<boolean> => {
  try {
    // Clear all known keys from localStorage
    removeLocalStorageItem(APP_SETTINGS_KEY);
    removeLocalStorageItem(SAVED_GAMES_KEY);
    removeLocalStorageItem(MASTER_ROSTER_KEY);
    removeLocalStorageItem(SEASONS_LIST_KEY);
    removeLocalStorageItem(TOURNAMENTS_LIST_KEY);
    // For legacy compatibility, also clear this if it exists
    removeLocalStorageItem(LAST_HOME_TEAM_NAME_KEY);

    // After clearing, save the default settings back
    const success = await saveAppSettings(DEFAULT_APP_SETTINGS);
    return success;
  } catch (error) {
    logger.error('Error resetting app settings:', error);
    return false;
  }
};
