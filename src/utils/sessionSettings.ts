import { authAwareStorageManager as storageManager } from '@/lib/storage';
import type { AppSettings } from './appSettings';
import { isRecord } from '@/utils/typeGuards';
import logger from '@/utils/logger';

export interface SessionSettings {
  deviceFingerprint?: string;
  sessionActivity?: Record<string, unknown>;
}

/**
 * Get device fingerprint from IndexedDB
 */
export async function getDeviceFingerprint(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const settings = await storageManager.getAppSettings();
    const fingerprint = settings?.deviceFingerprint ?? null;
    logger.debug('Retrieved device fingerprint from storage:', {
      found: !!fingerprint,
      length: fingerprint?.length,
      ending: fingerprint?.slice(-10)
    });
    return fingerprint;
  } catch (error) {
    logger.error('Failed to get device fingerprint:', error);
    return null;
  }
}

/**
 * Save device fingerprint to IndexedDB
 */
export async function saveDeviceFingerprint(fingerprint: string): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const currentSettings = await storageManager.getAppSettings();
    const updatedSettings: AppSettings = {
      ...currentSettings,
      deviceFingerprint: fingerprint,
      // Ensure currentGameId is properly typed
      currentGameId: currentSettings?.currentGameId ?? null,
    };
    await storageManager.saveAppSettings(updatedSettings);
    logger.debug('Successfully saved device fingerprint to storage:', {
      length: fingerprint.length,
      ending: fingerprint.slice(-10)
    });
  } catch (error) {
    logger.error('Failed to save device fingerprint:', error);
  }
}

/**
 * Get session activity for a user
 */
export async function getSessionActivity(userId: string): Promise<unknown> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const settings = await storageManager.getAppSettings();
    const sessionActivity = settings?.sessionActivity;
    
    if (!isRecord(sessionActivity)) {
      return null;
    }
    
    return sessionActivity[userId] ?? null;
  } catch (error) {
    logger.error('Failed to get session activity:', error);
    return null;
  }
}

/**
 * Save session activity for a user
 */
export async function saveSessionActivity(userId: string, activity: unknown): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const currentSettings = await storageManager.getAppSettings();
    const existingActivity = currentSettings?.sessionActivity;
    const sessionActivity = isRecord(existingActivity) ? existingActivity : {};
    
    const updatedSettings: AppSettings = {
      ...currentSettings,
      currentGameId: currentSettings?.currentGameId ?? null,
      sessionActivity: {
        ...sessionActivity,
        [userId]: activity,
      },
    };
    
    await storageManager.saveAppSettings(updatedSettings);
  } catch (error) {
    logger.error('Failed to save session activity:', error);
  }
}

/**
 * Remove session activity for a user
 */
export async function removeSessionActivity(userId: string): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const currentSettings = await storageManager.getAppSettings();
    const existingActivity = currentSettings?.sessionActivity;
    const sessionActivity = isRecord(existingActivity) ? { ...existingActivity } : {};
    
    delete sessionActivity[userId];
    
    const updatedSettings: AppSettings = {
      ...currentSettings,
      currentGameId: currentSettings?.currentGameId ?? null,
      sessionActivity,
    };
    
    await storageManager.saveAppSettings(updatedSettings);
  } catch (error) {
    logger.error('Failed to remove session activity:', error);
  }
}