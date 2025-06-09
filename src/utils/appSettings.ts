import { APP_SETTINGS_KEY, LAST_HOME_TEAM_NAME_KEY } from '@/config/constants';
import { getSupabaseClientWithoutRLS } from '@/lib/supabase';
import { getSupabaseCurrentGameId } from './supabase/appSettings';

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
 * @returns A promise that resolves to the application settings
 */
export const getAppSettings = async (): Promise<AppSettings> => {
  try {
    const settingsJson = localStorage.getItem(APP_SETTINGS_KEY);
    if (!settingsJson) {
      return Promise.resolve(DEFAULT_APP_SETTINGS);
    }
    
    const settings = JSON.parse(settingsJson);
    return Promise.resolve({ ...DEFAULT_APP_SETTINGS, ...settings });
  } catch (error) {
    console.error('Error getting app settings from localStorage:', error);
    return Promise.resolve(DEFAULT_APP_SETTINGS); // Resolve with default on error
  }
};

/**
 * Saves the application settings to localStorage
 * @param settings - The settings to save
 * @returns A promise that resolves to true if successful, false otherwise
 */
export const saveAppSettings = async (settings: AppSettings): Promise<boolean> => {
  try {
    localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
    return Promise.resolve(true);
  } catch (error) {
    console.error('Error saving app settings to localStorage:', error);
    return Promise.resolve(false);
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
 * Gets the current game ID for an authenticated user from Supabase.
 * @param clerkToken - The JWT token from Clerk.
 * @param internalSupabaseUserId - The internal Supabase User ID (UUID).
 * @returns A promise that resolves to the current game ID, or null if not set.
 */
export const getCurrentGameIdSetting = async (clerkToken: string, internalSupabaseUserId: string): Promise<string | null> => {
  if (!clerkToken || !internalSupabaseUserId) {
    throw new Error("Authentication details are required.");
  }
  const supabaseClient = getSupabaseClientWithoutRLS();
  return getSupabaseCurrentGameId(supabaseClient, internalSupabaseUserId);
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
    return Promise.resolve(true);
  } catch {
    // updateAppSettings already logs errors. We indicate failure here.
    return Promise.resolve(false);
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
    const legacyValue = localStorage.getItem(LAST_HOME_TEAM_NAME_KEY);
    return Promise.resolve(legacyValue || '');
  } catch (error) {
    console.error('Error getting last home team name:', error);
    return Promise.resolve('');
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
    localStorage.setItem(LAST_HOME_TEAM_NAME_KEY, teamName); // Legacy sync save
    return Promise.resolve(true);
  } catch (error) {
    console.error('Error saving last home team name:', error);
    return Promise.resolve(false);
  }
};

/**
 * Clears all application settings, resetting to defaults
 * @returns A promise that resolves to true if successful, false otherwise
 */
export const resetAppSettings = async (): Promise<boolean> => {
  try {
    // Wait for saveAppSettings to resolve
    const success = await saveAppSettings(DEFAULT_APP_SETTINGS);
    return Promise.resolve(success);
  } catch (error) {
    console.error('Error resetting app settings:', error);
    return Promise.resolve(false);
  }
}; 