// IndexedDB cache manager for offline support
import { get, set, del, keys } from 'idb-keyval';

export interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  version: string;
  expiresAt?: number;
}

export interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  version?: string;
}

/**
 * IndexedDB cache manager for offline data storage
 */
export class IndexedDBCache {
  private readonly prefix: string;
  private readonly defaultTTL: number;
  private readonly version: string;

  constructor(
    prefix = 'cache',
    defaultTTL = 24 * 60 * 60 * 1000, // 24 hours
    version = '1.0.0'
  ) {
    this.prefix = prefix;
    this.defaultTTL = defaultTTL;
    this.version = version;
  }

  /**
   * Generate cache key with prefix
   */
  private getCacheKey(key: string): string {
    return `${this.prefix}:${key}`;
  }

  /**
   * Check if cache entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    if (!entry.expiresAt) return false;
    return Date.now() > entry.expiresAt;
  }

  /**
   * Check if cache entry version is compatible
   */
  private isVersionCompatible(entry: CacheEntry): boolean {
    return entry.version === this.version;
  }

  /**
   * Store data in IndexedDB cache
   */
  async set<T>(key: string, data: T, options: CacheOptions = {}): Promise<void> {
    const { ttl = this.defaultTTL, version = this.version } = options;
    
    const cacheEntry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      version,
      expiresAt: ttl > 0 ? Date.now() + ttl : undefined,
    };

    const cacheKey = this.getCacheKey(key);
    await set(cacheKey, cacheEntry);
  }

  /**
   * Retrieve data from IndexedDB cache
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = this.getCacheKey(key);
      const entry: CacheEntry<T> | undefined = await get(cacheKey);

      if (!entry) {
        return null;
      }

      // Check version compatibility
      if (!this.isVersionCompatible(entry)) {
        await this.delete(key);
        return null;
      }

      // Check expiration
      if (this.isExpired(entry)) {
        await this.delete(key);
        return null;
      }

      return entry.data;
    } catch (error) {
      console.error('Error retrieving from cache:', error);
      return null;
    }
  }

  /**
   * Check if key exists in cache (without retrieving data)
   */
  async has(key: string): Promise<boolean> {
    try {
      const cacheKey = this.getCacheKey(key);
      const entry: CacheEntry | undefined = await get(cacheKey);
      
      if (!entry) return false;
      if (!this.isVersionCompatible(entry)) return false;
      if (this.isExpired(entry)) return false;
      
      return true;
    } catch (error) {
      console.error('Error checking cache:', error);
      return false;
    }
  }

  /**
   * Delete data from cache
   */
  async delete(key: string): Promise<void> {
    try {
      const cacheKey = this.getCacheKey(key);
      await del(cacheKey);
    } catch (error) {
      console.error('Error deleting from cache:', error);
    }
  }

  /**
   * Get all cache keys with this prefix
   */
  async getAllKeys(): Promise<string[]> {
    try {
      const allKeys = await keys();
      return allKeys
        .filter(key => typeof key === 'string' && key.startsWith(`${this.prefix}:`))
        .map(key => (key as string).replace(`${this.prefix}:`, ''));
    } catch (error) {
      console.error('Error getting cache keys:', error);
      return [];
    }
  }

  /**
   * Clear all cache entries with this prefix
   */
  async clearAll(): Promise<void> {
    try {
      const cacheKeys = await this.getAllKeys();
      await Promise.all(cacheKeys.map(key => this.delete(key)));
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Clear expired entries
   */
  async clearExpired(): Promise<number> {
    try {
      const cacheKeys = await this.getAllKeys();
      let clearedCount = 0;

      for (const key of cacheKeys) {
        const cacheKey = this.getCacheKey(key);
        const entry: CacheEntry | undefined = await get(cacheKey);
        
        if (entry && (this.isExpired(entry) || !this.isVersionCompatible(entry))) {
          await this.delete(key);
          clearedCount++;
        }
      }

      return clearedCount;
    } catch (error) {
      console.error('Error clearing expired cache:', error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<{
    totalEntries: number;
    totalSize: number;
    expiredEntries: number;
    oldVersionEntries: number;
  }> {
    try {
      const cacheKeys = await this.getAllKeys();
      let totalSize = 0;
      let expiredEntries = 0;
      let oldVersionEntries = 0;

      for (const key of cacheKeys) {
        const cacheKey = this.getCacheKey(key);
        const entry: CacheEntry | undefined = await get(cacheKey);
        
        if (entry) {
          totalSize += JSON.stringify(entry).length;
          
          if (this.isExpired(entry)) {
            expiredEntries++;
          }
          
          if (!this.isVersionCompatible(entry)) {
            oldVersionEntries++;
          }
        }
      }

      return {
        totalEntries: cacheKeys.length,
        totalSize,
        expiredEntries,
        oldVersionEntries,
      };
    } catch (error) {
      console.error('Error getting cache stats:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        expiredEntries: 0,
        oldVersionEntries: 0,
      };
    }
  }
}

// Create default cache instances
export const dataCache = new IndexedDBCache('app-data', 24 * 60 * 60 * 1000); // 24 hours
export const syncCache = new IndexedDBCache('sync-queue', 7 * 24 * 60 * 60 * 1000); // 7 days
export const sessionCache = new IndexedDBCache('session', 60 * 60 * 1000); // 1 hour