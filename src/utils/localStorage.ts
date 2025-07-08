export const getStorage = (): Storage | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch (error) {
    console.error('[localStorage] Access error:', error);
    return null;
  }
};

export const getLocalStorageItem = (key: string): string | null => {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch (error) {
    console.error(`[getLocalStorageItem] Error getting item for key "${key}":`, error);
    return null;
  }
};

export const setLocalStorageItem = (key: string, value: string): void => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, value);
  } catch (error) {
    console.error(`[setLocalStorageItem] Error setting item for key "${key}":`, error);
  }
};

export const removeLocalStorageItem = (key: string): void => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch (error) {
    console.error(`[removeLocalStorageItem] Error removing item for key "${key}":`, error);
  }
};

export const clearLocalStorage = (): void => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.clear();
  } catch (error) {
    console.error('[clearLocalStorage] Error clearing localStorage:', error);
  }
};
