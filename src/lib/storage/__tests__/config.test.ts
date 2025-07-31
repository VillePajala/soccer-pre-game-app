// Tests for storage configuration utilities
import { 
  getStorageConfig, 
  isSupabaseEnabled, 
  isFallbackDisabled, 
  getProviderType,
  validateSupabaseConfig,
  getConfigInfo,
  DEFAULT_STORAGE_CONFIG
} from '../config';

describe('Storage Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('getStorageConfig', () => {
    it('should return localStorage as default provider', () => {
      delete process.env.NEXT_PUBLIC_ENABLE_SUPABASE;
      delete process.env.NEXT_PUBLIC_DISABLE_FALLBACK;

      const config = getStorageConfig();
      
      expect(config).toEqual({
        provider: 'localStorage',
        fallbackToLocalStorage: true,
      });
    });

    it('should return supabase when feature flag is enabled', () => {
      process.env.NEXT_PUBLIC_ENABLE_SUPABASE = 'true';
      delete process.env.NEXT_PUBLIC_DISABLE_FALLBACK;

      const config = getStorageConfig();
      
      expect(config).toEqual({
        provider: 'supabase',
        fallbackToLocalStorage: true,
      });
    });

    it('should disable fallback when feature flag is set', () => {
      process.env.NEXT_PUBLIC_ENABLE_SUPABASE = 'true';
      process.env.NEXT_PUBLIC_DISABLE_FALLBACK = 'true';

      const config = getStorageConfig();
      
      expect(config).toEqual({
        provider: 'supabase',
        fallbackToLocalStorage: false,
      });
    });
  });

  describe('isSupabaseEnabled', () => {
    it('should return false by default', () => {
      delete process.env.NEXT_PUBLIC_ENABLE_SUPABASE;
      expect(isSupabaseEnabled()).toBe(false);
    });

    it('should return true when explicitly enabled', () => {
      process.env.NEXT_PUBLIC_ENABLE_SUPABASE = 'true';
      expect(isSupabaseEnabled()).toBe(true);
    });

    it('should return false for non-true values', () => {
      process.env.NEXT_PUBLIC_ENABLE_SUPABASE = 'false';
      expect(isSupabaseEnabled()).toBe(false);

      process.env.NEXT_PUBLIC_ENABLE_SUPABASE = '1';
      expect(isSupabaseEnabled()).toBe(false);
    });
  });

  describe('isFallbackDisabled', () => {
    it('should return false by default', () => {
      delete process.env.NEXT_PUBLIC_DISABLE_FALLBACK;
      expect(isFallbackDisabled()).toBe(false);
    });

    it('should return true when explicitly disabled', () => {
      process.env.NEXT_PUBLIC_DISABLE_FALLBACK = 'true';
      expect(isFallbackDisabled()).toBe(true);
    });
  });

  describe('getProviderType', () => {
    it('should return localStorage by default', () => {
      delete process.env.NEXT_PUBLIC_ENABLE_SUPABASE;
      expect(getProviderType()).toBe('localStorage');
    });

    it('should return supabase when enabled', () => {
      process.env.NEXT_PUBLIC_ENABLE_SUPABASE = 'true';
      expect(getProviderType()).toBe('supabase');
    });
  });

  describe('validateSupabaseConfig', () => {
    beforeEach(() => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        configurable: true
      });
    });

    it('should not throw when Supabase is disabled', () => {
      process.env.NEXT_PUBLIC_ENABLE_SUPABASE = 'false';
      expect(() => validateSupabaseConfig()).not.toThrow();
    });

    it('should not throw in test environment', () => {
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'test',
        configurable: true
      });
      process.env.NEXT_PUBLIC_ENABLE_SUPABASE = 'true';
      expect(() => validateSupabaseConfig()).not.toThrow();
    });

    it('should return false and log error when Supabase enabled but URL missing', () => {
      process.env.NEXT_PUBLIC_ENABLE_SUPABASE = 'true';
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = validateSupabaseConfig();
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('required environment variables are missing'));
      
      consoleSpy.mockRestore();
    });

    it('should return false and log error when Supabase enabled but key missing', () => {
      process.env.NEXT_PUBLIC_ENABLE_SUPABASE = 'true';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = validateSupabaseConfig();
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('required environment variables are missing'));
      
      consoleSpy.mockRestore();
    });

    it('should not throw when both URL and key are provided', () => {
      process.env.NEXT_PUBLIC_ENABLE_SUPABASE = 'true';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key-that-is-longer-than-32-characters';

      expect(() => validateSupabaseConfig()).not.toThrow();
    });
  });

  describe('getConfigInfo', () => {
    it('should return configuration information', () => {
      process.env.NEXT_PUBLIC_ENABLE_SUPABASE = 'false';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-key';
      Object.defineProperty(process.env, 'NODE_ENV', {
        value: 'development',
        configurable: true
      });

      const info = getConfigInfo();

      expect(info).toEqual({
        provider: 'localStorage',
        fallbackEnabled: true,
        supabaseConfigured: true,
        environment: 'development',
      });
    });

    it('should detect unconfigured Supabase', () => {
      process.env.NEXT_PUBLIC_ENABLE_SUPABASE = 'true';
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'your_supabase_project_url';
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'your_supabase_anon_key';

      const info = getConfigInfo();

      expect(info.supabaseConfigured).toBe(false);
    });
  });

  describe('DEFAULT_STORAGE_CONFIG', () => {
    it('should have correct default values', () => {
      expect(DEFAULT_STORAGE_CONFIG).toEqual({
        provider: 'localStorage',
        fallbackToLocalStorage: true,
      });
    });
  });
});