import { supabase } from './supabase';

describe('Supabase Client', () => {
  it('should be initialized', () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase).toBe('object');
  });

  it('should have an auth object', () => {
    expect(supabase.auth).toBeDefined();
    expect(typeof supabase.auth).toBe('object');
  });

  it('should have a from method for querying tables', () => {
    expect(supabase.from).toBeDefined();
    expect(typeof supabase.from).toBe('function');
  });
}); 