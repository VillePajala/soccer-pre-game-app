import logger from '@/utils/logger';
import { encryptString, decryptString } from './encryption';
import { getEncryptionPassphrase } from './appSettings';

export const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (error) {
    logger.error('[localStorage] Access error:', error);
    return null;
  }
};

export const getLocalStorageItem = (key: string): string | null => {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch (error) {
    logger.error(`[getLocalStorageItem] Error getting item for key "${key}":`, error);
    throw error;
  }
};

export const getSecureLocalStorageItem = async (key: string): Promise<string | null> => {
  const raw = getLocalStorageItem(key);
  const pass = await getEncryptionPassphrase();
  if (raw && pass) {
    try {
      return await decryptString(raw, pass);
    } catch (e) {
      logger.error('[localStorage] decrypt error:', e);
      return null;
    }
  }
  return raw;
};

export const setLocalStorageItem = (key: string, value: string): void => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch (error) {
    logger.error(`[setLocalStorageItem] Error setting item for key "${key}":`, error);
    throw error;
  }
};

export const setSecureLocalStorageItem = async (key: string, value: string): Promise<void> => {
  const pass = await getEncryptionPassphrase();
  if (pass) {
    try {
      const enc = await encryptString(value, pass);
      setLocalStorageItem(key, enc);
      return;
    } catch (e) {
      logger.error('[localStorage] encrypt error:', e);
    }
  }
  setLocalStorageItem(key, value);
};

export const removeLocalStorageItem = (key: string): void => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch (error) {
    logger.error(`[removeLocalStorageItem] Error removing item for key "${key}":`, error);
    throw error;
  }
};

export const clearLocalStorage = (): void => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.clear();
  } catch (error) {
    logger.error('[clearLocalStorage] Error clearing localStorage:', error);
    throw error;
  }
};
