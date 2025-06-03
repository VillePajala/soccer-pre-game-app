import { supabase } from '@/lib/supabase';
// import type { SupabaseSeason } from './seasons'; // No longer needed if mockSupabaseSeasonResult is removed
import type { Season } from '@/types';

// Mock the supabase client more robustly for chained calls
const mockSupabaseClient = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockSupabaseClient),
  },
}));

// const mockSupabaseUserId = 'test-supabase-user-uuid-123'; // No longer needed for current tests

// Dynamically import the service to ensure it uses the mocked supabase
let seasonsService: {
  getSupabaseSeasons: () => Promise<Season[]>;
  createSupabaseSeason: (seasonData: Omit<Season, 'id'>) => Promise<Season>;
  updateSupabaseSeason: (seasonId: string, seasonUpdateData: Partial<Omit<Season, 'id'>>) => Promise<Season>;
  deleteSupabaseSeason: (seasonId: string) => Promise<boolean>;
};

beforeAll(() => {
  return import('./seasons').then(module => {
    seasonsService = module;
  });
});

describe('Supabase Seasons Service', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSupabaseClient.select.mockClear().mockReturnThis();
    mockSupabaseClient.insert.mockClear().mockReturnThis();
    mockSupabaseClient.update.mockClear().mockReturnThis();
    mockSupabaseClient.delete.mockClear().mockReturnThis();
    mockSupabaseClient.eq.mockClear().mockReturnThis();
    mockSupabaseClient.order.mockClear().mockReturnThis();
    mockSupabaseClient.single.mockClear().mockReturnThis();
    (supabase.from as jest.Mock).mockClear().mockReturnValue(mockSupabaseClient);
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  const mockAppSeasonCreate: Omit<Season, 'id'> = { name: 'New Test Season' };
  const mockAppSeason: Season = { id: 'season-1', name: 'Test Season 1' };

  describe('getSupabaseSeasons', () => {
    it('should throw "User not authenticated" error', async () => {
      mockSupabaseClient.order.mockResolvedValueOnce({ data: [], error: null });
      await expect(seasonsService.getSupabaseSeasons()).rejects.toThrow("User not authenticated or Supabase user ID not found.");
    });

    it('should also throw "User not authenticated" even if Supabase mock would error later', async () => {
      mockSupabaseClient.order.mockResolvedValueOnce({ data: null, error: new Error('Supabase fetch error') });
      await expect(seasonsService.getSupabaseSeasons()).rejects.toThrow("User not authenticated or Supabase user ID not found.");
    });
  });

  describe('createSupabaseSeason', () => {
    it('should throw "User not authenticated" error when creating', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: {}, error: null });
      await expect(seasonsService.createSupabaseSeason(mockAppSeasonCreate)).rejects.toThrow("User not authenticated or Supabase user ID not found for creating season.");
    });

    it('should also throw "User not authenticated" even if Supabase mock would error later on create', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: new Error('Supabase insert error') });
      await expect(seasonsService.createSupabaseSeason(mockAppSeasonCreate)).rejects.toThrow("User not authenticated or Supabase user ID not found for creating season.");
    });
  });

  describe('updateSupabaseSeason', () => {
    const seasonUpdateData: Partial<Omit<Season, 'id'>> = { name: 'Updated Season Name' };
    it('should throw "User not authenticated" error when updating', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: {}, error: null });
      await expect(seasonsService.updateSupabaseSeason(mockAppSeason.id, seasonUpdateData)).rejects.toThrow("User not authenticated or Supabase user ID not found for updating season.");
    });

    it('should also throw "User not authenticated" even if Supabase mock would error later on update', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: new Error('Supabase update error') });
      await expect(seasonsService.updateSupabaseSeason(mockAppSeason.id, seasonUpdateData)).rejects.toThrow("User not authenticated or Supabase user ID not found for updating season.");
    });
  });

  describe('deleteSupabaseSeason', () => {
    it('should throw "User not authenticated" error when deleting', async () => {
      mockSupabaseClient.eq.mockResolvedValueOnce({ error: null, count: 1 });
      await expect(seasonsService.deleteSupabaseSeason(mockAppSeason.id)).rejects.toThrow("User not authenticated or Supabase user ID not found for deleting season.");
    });

    it('should also throw "User not authenticated" even if Supabase mock would error later on delete', async () => {
      mockSupabaseClient.eq.mockResolvedValueOnce({ error: new Error('Supabase delete error'), count: null });
      await expect(seasonsService.deleteSupabaseSeason(mockAppSeason.id)).rejects.toThrow("User not authenticated or Supabase user ID not found for deleting season.");
    });
  });
}); 