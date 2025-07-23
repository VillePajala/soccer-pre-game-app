import logger from '@/utils/logger';

let warnedDeprecation = false;
const warnDeprecation = () => {
  if (!warnedDeprecation) {
    logger.warn(
      '[localStorage] Deprecation notice: localStorage support will be removed after the Supabase migration.'
    );
    warnedDeprecation = true;
  }
};

export const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  warnDeprecation();
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
