/**
 * Storage Service Provider - Dependency Injection for Storage Operations
 * 
 * This service provider eliminates circular dependencies by providing
 * a centralized way to access storage functionality without direct imports.
 * 
 * 🔧 DEPENDENCY INJECTION FIXES:
 * - Eliminates circular dependencies between FormStore and PersistenceStore
 * - Provides lazy initialization of storage services
 * - Supports service registration and lookup
 * - Enables easy testing with mock services
 */

import logger from '@/utils/logger';

// Storage service interface
export interface StorageService {
  getStorageItem: <T = any>(key: string, defaultValue?: T) => Promise<T | null>;
  setStorageItem: <T = any>(key: string, value: T) => Promise<boolean>;
  removeStorageItem: (key: string) => Promise<boolean>;
  hasStorageItem: (key: string) => Promise<boolean>;
  getStorageKeys: () => Promise<string[]>;
}

// Service registry type
interface ServiceRegistry {
  storageService?: StorageService;
  initialized: boolean;
}

class StorageServiceProvider {
  private registry: ServiceRegistry = {
    initialized: false,
  };

  /**
   * Register the storage service implementation
   */
  registerStorageService(service: StorageService): void {
    this.registry.storageService = service;
    this.registry.initialized = true;
    logger.debug('[StorageServiceProvider] Storage service registered');
  }

  /**
   * Get the storage service instance
   */
  getStorageService(): StorageService | null {
    if (!this.registry.storageService) {
      logger.debug('[StorageServiceProvider] Storage service not yet registered, attempting lazy initialization');
      this.initializeStorageService();
    }
    
    return this.registry.storageService || null;
  }

  /**
   * Lazy initialization of storage service
   * This attempts to import and register the persistence store
   */
  private async initializeStorageService(): Promise<void> {
    if (this.registry.initialized) return;

    try {
      // Dynamic import with proper error handling
      const { usePersistenceStore } = await import('@/stores/persistenceStore');
      const store = usePersistenceStore.getState();
      
      // Create storage service adapter
      const storageService: StorageService = {
        getStorageItem: store.getStorageItem,
        setStorageItem: store.setStorageItem,
        removeStorageItem: store.removeStorageItem,
        hasStorageItem: store.hasStorageItem,
        getStorageKeys: store.getStorageKeys,
      };

      this.registerStorageService(storageService);
    } catch (error) {
      logger.error('[StorageServiceProvider] Failed to initialize storage service:', error);
      // Create fallback localStorage service
      this.createFallbackService();
    }
  }

  /**
   * Create fallback localStorage service when persistence store is unavailable
   */
  private createFallbackService(): void {
    const fallbackService: StorageService = {
      getStorageItem: async <T = any>(key: string, defaultValue?: T): Promise<T | null> => {
        try {
          const item = localStorage.getItem(key);
          if (item === null) return defaultValue ?? null;
          return JSON.parse(item) as T;
        } catch (error) {
          logger.error(`[StorageServiceProvider] Fallback getStorageItem failed for '${key}':`, error);
          return defaultValue ?? null;
        }
      },

      setStorageItem: async <T = any>(key: string, value: T): Promise<boolean> => {
        try {
          localStorage.setItem(key, JSON.stringify(value));
          return true;
        } catch (error) {
          logger.error(`[StorageServiceProvider] Fallback setStorageItem failed for '${key}':`, error);
          return false;
        }
      },

      removeStorageItem: async (key: string): Promise<boolean> => {
        try {
          localStorage.removeItem(key);
          return true;
        } catch (error) {
          logger.error(`[StorageServiceProvider] Fallback removeStorageItem failed for '${key}':`, error);
          return false;
        }
      },

      hasStorageItem: async (key: string): Promise<boolean> => {
        try {
          return localStorage.getItem(key) !== null;
        } catch (error) {
          logger.error(`[StorageServiceProvider] Fallback hasStorageItem failed for '${key}':`, error);
          return false;
        }
      },

      getStorageKeys: async (): Promise<string[]> => {
        try {
          const keys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) keys.push(key);
          }
          return keys;
        } catch (error) {
          logger.error('[StorageServiceProvider] Fallback getStorageKeys failed:', error);
          return [];
        }
      },
    };

    this.registerStorageService(fallbackService);
    logger.debug('[StorageServiceProvider] Fallback localStorage service created');
  }

  /**
   * Reset the service provider (useful for testing)
   */
  reset(): void {
    this.registry = { initialized: false };
  }

  /**
   * Check if storage service is available
   */
  isAvailable(): boolean {
    return this.registry.initialized && !!this.registry.storageService;
  }
}

// Export singleton instance
export const storageServiceProvider = new StorageServiceProvider();

// Export helper function for easy access
export const getStorageService = (): StorageService | null => {
  return storageServiceProvider.getStorageService();
};

// Export async version that ensures initialization
export const getStorageServiceAsync = async (): Promise<StorageService | null> => {
  if (!storageServiceProvider.isAvailable()) {
    await storageServiceProvider['initializeStorageService']();
  }
  return storageServiceProvider.getStorageService();
};
