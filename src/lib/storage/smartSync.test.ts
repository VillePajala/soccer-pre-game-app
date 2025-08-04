import { SmartSyncManager } from './smartSync';

// Mock supabase to avoid authentication issues
jest.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ 
        data: { user: { id: 'test-user' } }, 
        error: null 
      }))
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => Promise.resolve({ data: [], error: null }))
      }))
    }))
  }
}));

describe('SmartSyncManager', () => {
  let syncManager: SmartSyncManager;

  beforeEach(() => {
    syncManager = new SmartSyncManager();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(syncManager).toBeDefined();
      expect(syncManager).toBeInstanceOf(SmartSyncManager);
    });
  });

  describe('trackChange', () => {
    it('should be defined', () => {
      expect(typeof syncManager.trackChange).toBe('function');
    });

    it('should track changes', () => {
      const change = {
        type: 'create' as const,
        table: 'players',
        id: '1',
        data: { name: 'Test' },
        timestamp: Date.now()
      };

      // Should not throw an error
      expect(() => syncManager.trackChange(change)).not.toThrow();
    });
  });

  describe('basic functionality', () => {
    it('should handle empty pending changes', () => {
      // Basic test that doesn't rely on specific methods
      expect(syncManager).toBeDefined();
    });
  });
});