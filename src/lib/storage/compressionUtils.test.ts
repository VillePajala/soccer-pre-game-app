import { CompressionManager } from './compressionUtils';

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

describe('CompressionManager', () => {
  let compressionManager: CompressionManager;

  beforeEach(() => {
    compressionManager = new CompressionManager();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      expect(compressionManager).toBeDefined();
      expect(compressionManager).toBeInstanceOf(CompressionManager);
    });
  });

  describe('fetchOptimized', () => {
    it('should be defined', () => {
      expect(typeof compressionManager.fetchOptimized).toBe('function');
    });
  });
});