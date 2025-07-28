import {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  clearStorage,
  getAllStorageKeys,
  getStorageSize,
} from '../localStorage';

// Mock localStorage
const mockStorage = {
  store: {} as Record<string, string>,
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0,
};

Object.defineProperty(window, 'localStorage', {
  value: mockStorage,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockStorage.store = {};
  mockStorage.length = 0;
  
  // Setup default mock implementations
  mockStorage.getItem.mockImplementation((key: string) => mockStorage.store[key] || null);
  mockStorage.setItem.mockImplementation((key: string, value: string) => {
    mockStorage.store[key] = value;
    mockStorage.length = Object.keys(mockStorage.store).length;
  });
  mockStorage.removeItem.mockImplementation((key: string) => {
    delete mockStorage.store[key];
    mockStorage.length = Object.keys(mockStorage.store).length;
  });
  mockStorage.clear.mockImplementation(() => {
    mockStorage.store = {};
    mockStorage.length = 0;
  });
  mockStorage.key.mockImplementation((index: number) => {
    const keys = Object.keys(mockStorage.store);
    return keys[index] || null;
  });
});

describe('localStorage utility', () => {
  describe('getStorageItem', () => {
    it('should return parsed JSON data', async () => {
      const testData = { name: 'test', value: 123 };
      mockStorage.store['testKey'] = JSON.stringify(testData);
      
      const result = await getStorageItem('testKey');
      expect(result).toEqual(testData);
    });

    it('should return null for non-existent keys', async () => {
      const result = await getStorageItem('nonExistent');
      expect(result).toBeNull();
    });

    it('should handle parsing errors', async () => {
      mockStorage.store['invalidJson'] = 'invalid json {';
      
      const result = await getStorageItem('invalidJson');
      expect(result).toBeNull();
    });

    it('should handle localStorage errors', async () => {
      mockStorage.getItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      
      const result = await getStorageItem('testKey');
      expect(result).toBeNull();
    });
  });

  describe('setStorageItem', () => {
    it('should store JSON stringified data', async () => {
      const testData = { name: 'test', value: 123 };
      
      await setStorageItem('testKey', testData);
      
      expect(mockStorage.setItem).toHaveBeenCalledWith('testKey', JSON.stringify(testData));
    });

    it('should handle storage errors', async () => {
      mockStorage.setItem.mockImplementation(() => {
        throw new Error('Storage full');
      });
      
      // Should not throw error
      await expect(setStorageItem('testKey', { data: 'test' })).resolves.not.toThrow();
    });

    it('should handle circular references in data', async () => {
      const circularData: any = { name: 'test' };
      circularData.self = circularData;
      
      // Should not throw error
      await expect(setStorageItem('testKey', circularData)).resolves.not.toThrow();
    });
  });

  describe('removeStorageItem', () => {
    it('should remove item from storage', async () => {
      mockStorage.store['testKey'] = 'test value';
      
      await removeStorageItem('testKey');
      
      expect(mockStorage.removeItem).toHaveBeenCalledWith('testKey');
    });

    it('should handle removal errors', async () => {
      mockStorage.removeItem.mockImplementation(() => {
        throw new Error('Remove error');
      });
      
      // Should not throw error
      await expect(removeStorageItem('testKey')).resolves.not.toThrow();
    });
  });

  describe('clearStorage', () => {
    it('should clear all storage', async () => {
      mockStorage.store = { key1: 'value1', key2: 'value2' };
      
      await clearStorage();
      
      expect(mockStorage.clear).toHaveBeenCalled();
    });

    it('should handle clear errors', async () => {
      mockStorage.clear.mockImplementation(() => {
        throw new Error('Clear error');
      });
      
      // Should not throw error
      await expect(clearStorage()).resolves.not.toThrow();
    });
  });

  describe('getAllStorageKeys', () => {
    it('should return all storage keys', async () => {
      mockStorage.store = { key1: 'value1', key2: 'value2', key3: 'value3' };
      mockStorage.length = 3;
      
      const keys = await getAllStorageKeys();
      
      expect(keys).toEqual(['key1', 'key2', 'key3']);
    });

    it('should return empty array when no keys exist', async () => {
      mockStorage.store = {};
      mockStorage.length = 0;
      
      const keys = await getAllStorageKeys();
      
      expect(keys).toEqual([]);
    });

    it('should handle key retrieval errors', async () => {
      mockStorage.length = 2;
      mockStorage.key.mockImplementation(() => {
        throw new Error('Key error');
      });
      
      const keys = await getAllStorageKeys();
      
      expect(keys).toEqual([]);
    });
  });

  describe('getStorageSize', () => {
    it('should calculate total storage size', async () => {
      mockStorage.store = {
        key1: 'short',
        key2: 'longer value here',
        key3: JSON.stringify({ complex: 'object', with: ['array', 'data'] }),
      };
      mockStorage.length = 3;
      
      const size = await getStorageSize();
      
      expect(size).toBeGreaterThan(0);
      expect(typeof size).toBe('number');
    });

    it('should return 0 for empty storage', async () => {
      mockStorage.store = {};
      mockStorage.length = 0;
      
      const size = await getStorageSize();
      
      expect(size).toBe(0);
    });

    it('should handle size calculation errors', async () => {
      mockStorage.length = 1;
      mockStorage.key.mockImplementation(() => {
        throw new Error('Size error');
      });
      
      const size = await getStorageSize();
      
      expect(size).toBe(0);
    });
  });
});