/**
 * Asynchronous wrapper for localStorage.getItem.
 * @param key - The key of the item to retrieve.
 * @returns A promise that resolves to the item's value, or null if not found or an error occurs.
 */
export const getLocalStorageItemAsync = async (key: string): Promise<string | null> => {
  try {
    const item = localStorage.getItem(key);
    return Promise.resolve(item);
  } catch (error) {
    console.error(`[getLocalStorageItemAsync] Error getting item for key "${key}":`, error);
    return Promise.resolve(null); // Resolve with null on error to avoid unhandled rejections
  }
};

/**
 * Asynchronous wrapper for localStorage.setItem.
 * @param key - The key of the item to set.
 * @param value - The value to set for the item.
 * @returns A promise that resolves when the item has been set, or rejects on error.
 */
export const setLocalStorageItemAsync = async (key: string, value: string): Promise<void> => {
  try {
    localStorage.setItem(key, value);
    return Promise.resolve();
  } catch (error) {
    console.error(`[setLocalStorageItemAsync] Error setting item for key "${key}":`, error);
    return Promise.reject(error); // Reject on error
  }
};

/**
 * Asynchronous wrapper for localStorage.removeItem.
 * @param key - The key of the item to remove.
 * @returns A promise that resolves when the item has been removed, or rejects on error.
 */
export const removeLocalStorageItemAsync = async (key: string): Promise<void> => {
  try {
    localStorage.removeItem(key);
    return Promise.resolve();
  } catch (error) {
    console.error(`[removeLocalStorageItemAsync] Error removing item for key "${key}":`, error);
    return Promise.reject(error); // Reject on error
  }
};

/**
 * Asynchronous wrapper for localStorage.clear.
 * @returns A promise that resolves when localStorage has been cleared, or rejects on error.
 */
export const clearLocalStorageAsync = async (): Promise<void> => {
  try {
    localStorage.clear();
    return Promise.resolve();
  } catch (error) {
    console.error('[clearLocalStorageAsync] Error clearing localStorage:', error);
    return Promise.reject(error); // Reject on error
  }
}; 