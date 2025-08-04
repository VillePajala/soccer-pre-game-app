import { OfflineFirstStorageManager } from '@/lib/storage/offlineFirstStorageManager';
import type { AppSettings } from './appSettings';
import logger from '@/utils/logger';

export interface PWASettings {
  installPromptCount: number;
  installPromptLastDismissed: number | null;
  appUsageCount: number;
  installPromptDismissed: number | null;
}

const DEFAULT_PWA_SETTINGS: PWASettings = {
  installPromptCount: 0,
  installPromptLastDismissed: null,
  appUsageCount: 0,
  installPromptDismissed: null,
};

// Create storage manager instance lazily
let storageManager: OfflineFirstStorageManager | null = null;

const getStorageManager = (): OfflineFirstStorageManager => {
  if (!storageManager && typeof window !== 'undefined') {
    storageManager = new OfflineFirstStorageManager({
      enableOfflineMode: true,
      syncOnReconnect: false, // PWA settings don't need cloud sync
    });
  }
  return storageManager!;
};

/**
 * Get PWA settings from IndexedDB
 */
export async function getPWASettings(): Promise<PWASettings> {
  if (typeof window === 'undefined') {
    return DEFAULT_PWA_SETTINGS;
  }

  try {
    const settings = await getStorageManager().getAppSettings();
    
    return {
      installPromptCount: settings?.installPromptCount ?? DEFAULT_PWA_SETTINGS.installPromptCount,
      installPromptLastDismissed: settings?.installPromptLastDismissed ?? DEFAULT_PWA_SETTINGS.installPromptLastDismissed,
      appUsageCount: settings?.appUsageCount ?? DEFAULT_PWA_SETTINGS.appUsageCount,
      installPromptDismissed: settings?.installPromptDismissed ?? DEFAULT_PWA_SETTINGS.installPromptDismissed,
    };
  } catch (error) {
    logger.error('Failed to get PWA settings:', error);
    return DEFAULT_PWA_SETTINGS;
  }
}

/**
 * Save PWA settings to IndexedDB
 */
export async function savePWASettings(updates: Partial<PWASettings>): Promise<void> {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    const currentSettings = await getStorageManager().getAppSettings();
    const updatedSettings: AppSettings = {
      ...currentSettings,
      ...updates,
      // Ensure currentGameId is properly typed from existing settings
      currentGameId: currentSettings?.currentGameId ?? null,
    };
    
    await getStorageManager().saveAppSettings(updatedSettings);
  } catch (error) {
    logger.error('Failed to save PWA settings:', error);
  }
}

/**
 * Increment install prompt count
 */
export async function incrementInstallPromptCount(): Promise<number> {
  const settings = await getPWASettings();
  const newCount = settings.installPromptCount + 1;
  await savePWASettings({ installPromptCount: newCount });
  return newCount;
}

/**
 * Set install prompt dismissed timestamp
 */
export async function setInstallPromptDismissed(timestamp: number): Promise<void> {
  await savePWASettings({ 
    installPromptLastDismissed: timestamp,
    installPromptDismissed: timestamp,
  });
}

/**
 * Get app usage count
 */
export async function getAppUsageCount(): Promise<number> {
  const settings = await getPWASettings();
  return settings.appUsageCount;
}

/**
 * Increment app usage count
 */
export async function incrementAppUsageCount(): Promise<number> {
  const settings = await getPWASettings();
  const newCount = settings.appUsageCount + 1;
  await savePWASettings({ appUsageCount: newCount });
  return newCount;
}

/**
 * Mark install prompt as never show again (999 count)
 */
export async function setInstallPromptNeverShow(): Promise<void> {
  await savePWASettings({ installPromptCount: 999 });
}