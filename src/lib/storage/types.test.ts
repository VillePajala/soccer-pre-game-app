import { NetworkError, AuthenticationError } from './types';

describe('Storage Types', () => {
  describe('NetworkError', () => {
    it('should create network error with message', () => {
      const error = new NetworkError('supabase', 'test', new Error('Test error'));
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Network operation failed');
      expect(error.provider).toBe('supabase');
      expect(error.operation).toBe('test');
    });

    it('should create network error without base error', () => {
      const error = new NetworkError('localStorage', 'save');
      expect(error).toBeInstanceOf(Error);
      expect(error.provider).toBe('localStorage');
      expect(error.operation).toBe('save');
    });
  });

  describe('AuthenticationError', () => {
    it('should create authentication error with message', () => {
      const error = new AuthenticationError('supabase', 'login', new Error('Auth failed'));
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Authentication required');
      expect(error.provider).toBe('supabase');
      expect(error.operation).toBe('login');
    });

    it('should create authentication error without base error', () => {
      const error = new AuthenticationError('supabase', 'getUser');
      expect(error).toBeInstanceOf(Error);
      expect(error.provider).toBe('supabase');
      expect(error.operation).toBe('getUser');
    });
  });
});