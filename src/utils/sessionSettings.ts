import { OfflineFirstStorageManager } from '@/lib/storage/offlineFirstStorageManager';

export interface SessionSettings {
  deviceFingerprint?: string;
  sessionActivity?: Record<string, unknown>;
}

// Create storage manager instance lazily
let storageManager: OfflineFirstStorageManager | null = null;

const getStorageManager = (): OfflineFirstStorageManager => {
  if (!storageManager && typeof window !== 'undefined') {
    storageManager = new OfflineFirstStorageManager({
      enableOfflineMode: true,
      syncOnReconnect: false, // Session data doesn't need cloud sync
    });
  }
  return storageManager!;
};

/**
 * Get device fingerprint from IndexedDB
 */
export async function getDeviceFingerprint(): Promise<string | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const settings = await getStorageManager().getAppSettings();
    return settings?.deviceFingerprint ?? null;
  } catch (error) {
    console.error('Failed to get device fingerprint:', error);
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
    const currentSettings = await getStorageManager().getAppSettings();
    await getStorageManager().saveAppSettings({
      ...currentSettings,
      deviceFingerprint: fingerprint,
    });
  } catch (error) {
    console.error('Failed to save device fingerprint:', error);
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
    const settings = await getStorageManager().getAppSettings();
    const sessionActivity = settings?.sessionActivity as Record<string, unknown>;
    return sessionActivity?.[userId] ?? null;
  } catch (error) {
    console.error('Failed to get session activity:', error);
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
    const currentSettings = await getStorageManager().getAppSettings();
    const sessionActivity = (currentSettings?.sessionActivity as Record<string, unknown>) || {};
    
    await getStorageManager().saveAppSettings({
      ...currentSettings,
      sessionActivity: {
        ...sessionActivity,
        [userId]: activity,
      },
    });
  } catch (error) {
    console.error('Failed to save session activity:', error);
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
    const currentSettings = await getStorageManager().getAppSettings();
    const sessionActivity = (currentSettings?.sessionActivity as Record<string, unknown>) || {};
    
    delete sessionActivity[userId];
    
    await getStorageManager().saveAppSettings({
      ...currentSettings,
      sessionActivity,
    });
  } catch (error) {
    console.error('Failed to remove session activity:', error);
  }
}