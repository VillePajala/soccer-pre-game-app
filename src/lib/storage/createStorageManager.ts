// Factory function to create storage manager with proper configuration
import { AuthAwareStorageManager } from './authAwareStorageManager';
import { OfflineCacheManager } from '../offline/offlineCacheManager';
import { isOfflineCacheEnabled } from './config';
import type { IStorageProvider } from './types';

/**
 * Create storage manager with offline cache if enabled
 */
export function createStorageManager(): IStorageProvider {
  const baseManager = new AuthAwareStorageManager();
  
  // Wrap with offline cache if enabled
  if (isOfflineCacheEnabled()) {
    return new OfflineCacheManager(baseManager);
  }
  
  return baseManager;
}

// Export singleton instance that will be used by utilities
export const authAwareStorageManager = createStorageManager();