// Unit tests for IndexedDB cache functionality
import { IndexedDBCache, type CacheEntry } from '../indexedDBCache';

// Mock idb-keyval
jest.mock('idb-keyval', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
}));

import { get, set, del, keys } from 'idb-keyval';

const mockGet = get as jest.Mock;
const mockSet = set as jest.Mock;
const mockDel = del as jest.Mock;
const mockKeys = keys as jest.Mock;

describe('IndexedDBCache', () => {
  let cache: IndexedDBCache;
  const testPrefix = 'test-cache';
  const testVersion = '1.0.0';
  const testTTL = 60 * 1000; // 1 minute

  beforeEach(() => {
    jest.clearAllMocks();
    cache = new IndexedDBCache(testPrefix, testTTL, testVersion);
    
    // Mock current time for consistent testing
    jest.spyOn(Date, 'now').mockReturnValue(1000000000000); // Fixed timestamp
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Cache Key Generation', () => {
    it('should generate cache keys with prefix', async () => {
      const testData = { test: 'data' };
      await cache.set('test-key', testData);

      expect(mockSet).toHaveBeenCalledWith(
        'test-cache:test-key',
        expect.objectContaining({
          data: testData,
          version: testVersion,
          timestamp: 1000000000000,
        })
      );
    });
  });

  describe('set method', () => {
    it('should store data with default TTL and version', async () => {
      const testData = { id: 1, name: 'Test' };
      
      await cache.set('key1', testData);

      expect(mockSet).toHaveBeenCalledWith(
        'test-cache:key1',
        {
          data: testData,
          timestamp: 1000000000000,
          version: testVersion,
          expiresAt: 1000000000000 + testTTL,
        }
      );
    });

    it('should store data with custom TTL', async () => {
      const testData = { id: 1, name: 'Test' };
      const customTTL = 120 * 1000; // 2 minutes
      
      await cache.set('key1', testData, { ttl: customTTL });

      expect(mockSet).toHaveBeenCalledWith(
        'test-cache:key1',
        {
          data: testData,
          timestamp: 1000000000000,
          version: testVersion,
          expiresAt: 1000000000000 + customTTL,
        }
      );
    });

    it('should store data without expiration when TTL is 0', async () => {
      const testData = { id: 1, name: 'Test' };
      
      await cache.set('key1', testData, { ttl: 0 });

      expect(mockSet).toHaveBeenCalledWith(
        'test-cache:key1',
        {
          data: testData,
          timestamp: 1000000000000,
          version: testVersion,
          expiresAt: undefined,
        }
      );
    });

    it('should store data with custom version', async () => {
      const testData = { id: 1, name: 'Test' };
      const customVersion = '2.0.0';
      
      await cache.set('key1', testData, { version: customVersion });

      expect(mockSet).toHaveBeenCalledWith(
        'test-cache:key1',
        {
          data: testData,
          timestamp: 1000000000000,
          version: customVersion,
          expiresAt: 1000000000000 + testTTL,
        }
      );
    });
  });

  describe('get method', () => {
    it('should retrieve valid cached data', async () => {
      const testData = { id: 1, name: 'Test' };
      const cacheEntry: CacheEntry = {
        data: testData,
        timestamp: 1000000000000,
        version: testVersion,
        expiresAt: 1000000000000 + testTTL,
      };

      mockGet.mockResolvedValue(cacheEntry);

      const result = await cache.get('key1');

      expect(mockGet).toHaveBeenCalledWith('test-cache:key1');
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent key', async () => {
      mockGet.mockResolvedValue(undefined);

      const result = await cache.get('nonexistent');

      expect(result).toBeNull();
    });

    it('should delete and return null for expired data', async () => {
      const testData = { id: 1, name: 'Test' };
      const expiredEntry: CacheEntry = {
        data: testData,
        timestamp: 1000000000000,
        version: testVersion,
        expiresAt: 999999999999, // Expired
      };

      mockGet.mockResolvedValue(expiredEntry);

      const result = await cache.get('key1');

      expect(mockDel).toHaveBeenCalledWith('test-cache:key1');
      expect(result).toBeNull();
    });

    it('should delete and return null for incompatible version', async () => {
      const testData = { id: 1, name: 'Test' };
      const oldVersionEntry: CacheEntry = {
        data: testData,
        timestamp: 1000000000000,
        version: '0.9.0', // Old version
        expiresAt: 1000000000000 + testTTL,
      };

      mockGet.mockResolvedValue(oldVersionEntry);

      const result = await cache.get('key1');

      expect(mockDel).toHaveBeenCalledWith('test-cache:key1');
      expect(result).toBeNull();
    });

    it('should return data without expiration time', async () => {
      const testData = { id: 1, name: 'Test' };
      const neverExpiresEntry: CacheEntry = {
        data: testData,
        timestamp: 1000000000000,
        version: testVersion,
        // No expiresAt
      };

      mockGet.mockResolvedValue(neverExpiresEntry);

      const result = await cache.get('key1');

      expect(result).toEqual(testData);
    });

    it('should handle errors and return null', async () => {
      mockGet.mockRejectedValue(new Error('IndexedDB error'));

      const result = await cache.get('key1');

      expect(result).toBeNull();
    });
  });

  describe('has method', () => {
    it('should return true for valid cached data', async () => {
      const validEntry: CacheEntry = {
        data: 'test',
        timestamp: 1000000000000,
        version: testVersion,
        expiresAt: 1000000000000 + testTTL,
      };

      mockGet.mockResolvedValue(validEntry);

      const result = await cache.has('key1');

      expect(result).toBe(true);
    });

    it('should return false for non-existent key', async () => {
      mockGet.mockResolvedValue(undefined);

      const result = await cache.has('nonexistent');

      expect(result).toBe(false);
    });

    it('should return false for expired data', async () => {
      const expiredEntry: CacheEntry = {
        data: 'test',
        timestamp: 1000000000000,
        version: testVersion,
        expiresAt: 999999999999, // Expired
      };

      mockGet.mockResolvedValue(expiredEntry);

      const result = await cache.has('key1');

      expect(result).toBe(false);
    });

    it('should return false for incompatible version', async () => {
      const oldVersionEntry: CacheEntry = {
        data: 'test',
        timestamp: 1000000000000,
        version: '0.9.0', // Old version
        expiresAt: 1000000000000 + testTTL,
      };

      mockGet.mockResolvedValue(oldVersionEntry);

      const result = await cache.has('key1');

      expect(result).toBe(false);
    });

    it('should handle errors and return false', async () => {
      mockGet.mockRejectedValue(new Error('IndexedDB error'));

      const result = await cache.has('key1');

      expect(result).toBe(false);
    });
  });

  describe('delete method', () => {
    it('should delete cache entry', async () => {
      await cache.delete('key1');

      expect(mockDel).toHaveBeenCalledWith('test-cache:key1');
    });

    it('should handle errors silently', async () => {
      mockDel.mockRejectedValue(new Error('Delete failed'));

      await expect(cache.delete('key1')).resolves.not.toThrow();
    });
  });

  describe('getAllKeys method', () => {
    it('should return filtered keys with prefix removed', async () => {
      const allKeys = [
        'test-cache:key1',
        'test-cache:key2',
        'other-cache:key3',
        'test-cache:key4',
      ];

      mockKeys.mockResolvedValue(allKeys);

      const result = await cache.getAllKeys();

      expect(result).toEqual(['key1', 'key2', 'key4']);
    });

    it('should handle non-string keys', async () => {
      const allKeys = [
        'test-cache:key1',
        123, // Non-string key
        'test-cache:key2',
      ];

      mockKeys.mockResolvedValue(allKeys);

      const result = await cache.getAllKeys();

      expect(result).toEqual(['key1', 'key2']);
    });

    it('should handle errors and return empty array', async () => {
      mockKeys.mockRejectedValue(new Error('Keys failed'));

      const result = await cache.getAllKeys();

      expect(result).toEqual([]);
    });
  });

  describe('clearAll method', () => {
    it('should delete all cache entries with prefix', async () => {
      const cacheKeys = ['key1', 'key2', 'key3'];
      
      // Mock getAllKeys to return test keys
      jest.spyOn(cache, 'getAllKeys').mockResolvedValue(cacheKeys);

      await cache.clearAll();

      expect(mockDel).toHaveBeenCalledTimes(3);
      expect(mockDel).toHaveBeenCalledWith('test-cache:key1');
      expect(mockDel).toHaveBeenCalledWith('test-cache:key2');
      expect(mockDel).toHaveBeenCalledWith('test-cache:key3');
    });

    it('should handle errors silently', async () => {
      jest.spyOn(cache, 'getAllKeys').mockRejectedValue(new Error('Get keys failed'));

      await expect(cache.clearAll()).resolves.not.toThrow();
    });
  });

  describe('clearExpired method', () => {
    it('should clear expired and version-incompatible entries', async () => {
      const allKeys = ['key1', 'key2', 'key3', 'key4'];
      const entries: Record<string, CacheEntry> = {
        'test-cache:key1': {
          data: 'valid',
          timestamp: 1000000000000,
          version: testVersion,
          expiresAt: 1000000000000 + testTTL, // Valid
        },
        'test-cache:key2': {
          data: 'expired',
          timestamp: 1000000000000,
          version: testVersion,
          expiresAt: 999999999999, // Expired
        },
        'test-cache:key3': {
          data: 'old-version',
          timestamp: 1000000000000,
          version: '0.9.0', // Old version
          expiresAt: 1000000000000 + testTTL,
        },
        'test-cache:key4': {
          data: 'valid-no-expiry',
          timestamp: 1000000000000,
          version: testVersion,
          // No expiresAt - never expires
        },
      };

      jest.spyOn(cache, 'getAllKeys').mockResolvedValue(allKeys);
      mockGet.mockImplementation((key: string) => Promise.resolve(entries[key]));

      const clearedCount = await cache.clearExpired();

      expect(clearedCount).toBe(2); // key2 (expired) and key3 (old version)
      expect(mockDel).toHaveBeenCalledWith('test-cache:key2');
      expect(mockDel).toHaveBeenCalledWith('test-cache:key3');
      expect(mockDel).not.toHaveBeenCalledWith('test-cache:key1');
      expect(mockDel).not.toHaveBeenCalledWith('test-cache:key4');
    });

    it('should handle errors and return 0', async () => {
      jest.spyOn(cache, 'getAllKeys').mockRejectedValue(new Error('Clear expired failed'));

      const result = await cache.clearExpired();

      expect(result).toBe(0);
    });
  });

  describe('getStats method', () => {
    it('should return correct cache statistics', async () => {
      const allKeys = ['key1', 'key2', 'key3'];
      const entries: Record<string, CacheEntry> = {
        'test-cache:key1': {
          data: 'valid',
          timestamp: 1000000000000,
          version: testVersion,
          expiresAt: 1000000000000 + testTTL, // Valid
        },
        'test-cache:key2': {
          data: 'expired',
          timestamp: 1000000000000,
          version: testVersion,
          expiresAt: 999999999999, // Expired
        },
        'test-cache:key3': {
          data: 'old-version',
          timestamp: 1000000000000,
          version: '0.9.0', // Old version
          expiresAt: 1000000000000 + testTTL,
        },
      };

      jest.spyOn(cache, 'getAllKeys').mockResolvedValue(allKeys);
      mockGet.mockImplementation((key: string) => Promise.resolve(entries[key]));

      const stats = await cache.getStats();

      expect(stats.totalEntries).toBe(3);
      expect(stats.expiredEntries).toBe(1); // key2
      expect(stats.oldVersionEntries).toBe(1); // key3
      expect(stats.totalSize).toBeGreaterThan(0);
    });

    it('should handle errors and return zero stats', async () => {
      jest.spyOn(cache, 'getAllKeys').mockRejectedValue(new Error('Stats failed'));

      const stats = await cache.getStats();

      expect(stats).toEqual({
        totalEntries: 0,
        totalSize: 0,
        expiredEntries: 0,
        oldVersionEntries: 0,
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete cache lifecycle', async () => {
      const testData = { id: 1, name: 'Integration Test' };
      
      // Set data
      await cache.set('lifecycle-key', testData);
      expect(mockSet).toHaveBeenCalled();

      // Check existence
      const validEntry: CacheEntry = {
        data: testData,
        timestamp: 1000000000000,
        version: testVersion,
        expiresAt: 1000000000000 + testTTL,
      };
      mockGet.mockResolvedValue(validEntry);

      const exists = await cache.has('lifecycle-key');
      expect(exists).toBe(true);

      // Get data
      const retrieved = await cache.get('lifecycle-key');
      expect(retrieved).toEqual(testData);

      // Delete data
      await cache.delete('lifecycle-key');
      expect(mockDel).toHaveBeenCalledWith('test-cache:lifecycle-key');
    });
  });
});