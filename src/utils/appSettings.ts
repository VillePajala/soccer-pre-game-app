import { APP_SETTINGS_KEY, LAST_HOME_TEAM_NAME_KEY } from '@/config/constants';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
	getSupabaseCurrentGameId,
	saveSupabaseCurrentGameId as utilSaveSupabaseCurrentGameId,
} from './supabase/appSettings';

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
export const updateAppSettings = async (
	settingsUpdate: Partial<AppSettings>
): Promise<AppSettings> => {
	const currentSettings = await getAppSettings();
	const updatedSettings = { ...currentSettings, ...settingsUpdate };
	const saveSuccess = await saveAppSettings(updatedSettings);

	if (!saveSuccess) {
		throw new Error(
			'Failed to save updated settings via saveAppSettings within updateAppSettings.'
		);
	}
	return updatedSettings;
};

/**
 * Gets the current game ID for an authenticated user from Supabase.
 * @param supabase - The authenticated Supabase client.
 * @returns A promise that resolves to the current game ID string or null.
 */
export const getCurrentGameIdSetting = async (
	supabase: SupabaseClient
): Promise<string | null> => {
	if (!supabase) {
		throw new Error('Supabase client is required.');
	}
	return getSupabaseCurrentGameId(supabase);
};

/**
 * Saves the current game ID setting
 * @param supabase - The authenticated Supabase client.
 * @param gameId - The game ID to save
 * @returns A promise that resolves to true if successful, false otherwise
 */
export const saveCurrentGameIdSetting = async (
	supabase: SupabaseClient,
	gameId: string | null
): Promise<boolean> => {
	if (!supabase) {
		throw new Error('Supabase client is required.');
	}

	try {
		await utilSaveSupabaseCurrentGameId(supabase, gameId);

		// Also update localStorage for immediate offline access if needed
		await updateAppSettings({ currentGameId: gameId });

		return true;
	} catch (error) {
		console.error(
			'Error saving current game ID setting to Supabase and localStorage:',
			error
		);
		return false;
	}
};

/**
 * Gets the last used home team name
 * @returns A promise that resolves to the last home team name, or empty string if not set
 */
export const getLastHomeTeamName = async (): Promise<string> => {
	try {
		const settings = await getAppSettings();
		if (settings.lastHomeTeamName) {
			return Promise.resolve(settings.lastHomeTeamName);
		}

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
export const saveLastHomeTeamName = async (
	teamName: string
): Promise<boolean> => {
	try {
		await updateAppSettings({ lastHomeTeamName: teamName });
		localStorage.setItem(LAST_HOME_TEAM_NAME_KEY, teamName);
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
		const success = await saveAppSettings(DEFAULT_APP_SETTINGS);
		return Promise.resolve(success);
	} catch (error) {
		console.error('Error resetting app settings:', error);
		return Promise.resolve(false);
	}
};