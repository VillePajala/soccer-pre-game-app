import { supabase } from '@/lib/supabase';
import type { Season } from '@/types';
import type { SupabaseSeason } from './seasons'; // Import SupabaseSeason for mock data typing

// Mock the supabase client more robustly for chained calls
const mockSupabaseClient = {
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockReturnThis(),
  match: jest.fn().mockReturnThis(),
};

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => mockSupabaseClient),
  },
}));

const mockInternalSupabaseUserId = 'test-user-uuid-12345';

// Dynamically import the service to ensure it uses the mocked supabase
let seasonsService: {
  getSupabaseSeasons: (internalSupabaseUserId: string) => Promise<Season[]>;
  createSupabaseSeason: (internalSupabaseUserId: string, seasonData: Omit<Season, 'id'>) => Promise<Season>;
  updateSupabaseSeason: (internalSupabaseUserId: string, seasonId: string, seasonUpdateData: Partial<Omit<Season, 'id'>>) => Promise<Season>;
  deleteSupabaseSeason: (internalSupabaseUserId: string, seasonId: string) => Promise<boolean>;
};

beforeAll(() => {
  return import('./seasons').then(module => {
    seasonsService = module;
  });
});

describe('Supabase Seasons Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure all methods on mockSupabaseClient are cleared and set to return this for chaining
    Object.values(mockSupabaseClient).forEach(mockFn => {
      if (jest.isMockFunction(mockFn)) {
        mockFn.mockClear().mockReturnThis();
      }
    });
    (supabase.from as jest.Mock).mockClear().mockReturnValue(mockSupabaseClient);
  });

  const mockAppSeasonCreate: Omit<Season, 'id'> = { name: 'New Test Season' };
  const mockAppSeason: Season = { id: 'season-1', name: 'Test Season 1' };
  const mockSupabaseSeasonResult: SupabaseSeason = {
    id: 'season-1',
    user_id: mockInternalSupabaseUserId,
    name: 'Test Season 1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  describe('getSupabaseSeasons', () => {
    it('should fetch seasons for the given user ID and map to Season[]', async () => {
      mockSupabaseClient.order.mockResolvedValueOnce({ 
        data: [mockSupabaseSeasonResult], 
        error: null 
      });
      
      const seasons = await seasonsService.getSupabaseSeasons(mockInternalSupabaseUserId);
      expect(supabase.from).toHaveBeenCalledWith('seasons');
      expect(mockSupabaseClient.select).toHaveBeenCalledWith('*');
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', mockInternalSupabaseUserId);
      expect(mockSupabaseClient.order).toHaveBeenCalledWith('created_at', { ascending: false });
      expect(seasons).toEqual([{ id: mockSupabaseSeasonResult.id, name: mockSupabaseSeasonResult.name }]);
    });

    it('should throw if internalSupabaseUserId is not provided', async () => {
      // @ts-expect-error testing invalid input
      await expect(seasonsService.getSupabaseSeasons(null)).rejects.toThrow("Internal Supabase User ID is required.");
      // @ts-expect-error testing invalid input
      await expect(seasonsService.getSupabaseSeasons(undefined)).rejects.toThrow("Internal Supabase User ID is required.");
      await expect(seasonsService.getSupabaseSeasons('')).rejects.toThrow("Internal Supabase User ID is required.");
    });

    it('should throw if Supabase returns an error on fetch', async () => {
      mockSupabaseClient.order.mockResolvedValueOnce({ data: null, error: new Error('Supabase fetch error') });
      await expect(seasonsService.getSupabaseSeasons(mockInternalSupabaseUserId)).rejects.toThrow('Supabase fetch error');
    });
  });

  describe('createSupabaseSeason', () => {
    it('should create a season with the given user ID and return the mapped Season object', async () => {
      const createdData = { ...mockSupabaseSeasonResult, id: 'new-season-xyz', name: mockAppSeasonCreate.name };
      mockSupabaseClient.single.mockResolvedValueOnce({ data: createdData, error: null });

      const newSeason = await seasonsService.createSupabaseSeason(mockInternalSupabaseUserId, mockAppSeasonCreate);
      expect(supabase.from).toHaveBeenCalledWith('seasons');
      expect(mockSupabaseClient.insert).toHaveBeenCalledWith(expect.objectContaining({
        user_id: mockInternalSupabaseUserId,
        name: mockAppSeasonCreate.name,
        id: expect.any(String) // Check that an ID is generated
      }));
      expect(mockSupabaseClient.select).toHaveBeenCalled();
      expect(mockSupabaseClient.single).toHaveBeenCalled();
      expect(newSeason).toEqual({ id: createdData.id, name: createdData.name });
    });
    
    it('should throw if internalSupabaseUserId is not provided for create', async () => {
      // @ts-expect-error testing invalid input
      await expect(seasonsService.createSupabaseSeason(null, mockAppSeasonCreate)).rejects.toThrow("Internal Supabase User ID is required for creating season.");
    });

    it('should throw if Supabase returns an error on create', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: new Error('Supabase insert error') });
      await expect(seasonsService.createSupabaseSeason(mockInternalSupabaseUserId, mockAppSeasonCreate)).rejects.toThrow('Supabase insert error');
    });
  });

  describe('updateSupabaseSeason', () => {
    const seasonUpdateData: Partial<Omit<Season, 'id'>> = { name: 'Updated Season Name' };
    it('should update a season with the given user ID and return the mapped Season object', async () => {
      const updatedData = { ...mockSupabaseSeasonResult, name: seasonUpdateData.name! };
      mockSupabaseClient.single.mockResolvedValueOnce({ data: updatedData, error: null });

      const updatedSeason = await seasonsService.updateSupabaseSeason(mockInternalSupabaseUserId, mockAppSeason.id, seasonUpdateData);
      expect(supabase.from).toHaveBeenCalledWith('seasons');
      expect(mockSupabaseClient.update).toHaveBeenCalledWith(expect.objectContaining({
        name: seasonUpdateData.name,
        updated_at: expect.any(String)
      }));
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('id', mockAppSeason.id);
      expect(mockSupabaseClient.eq).toHaveBeenCalledWith('user_id', mockInternalSupabaseUserId);
      expect(mockSupabaseClient.select).toHaveBeenCalled();
      expect(mockSupabaseClient.single).toHaveBeenCalled();
      expect(updatedSeason).toEqual({ id: updatedData.id, name: updatedData.name });
    });

    it('should throw if internalSupabaseUserId is not provided for update', async () => {
      // @ts-expect-error testing invalid input
      await expect(seasonsService.updateSupabaseSeason(null, mockAppSeason.id, seasonUpdateData)).rejects.toThrow("Internal Supabase User ID is required for updating season.");
    });

    it('should throw if Supabase returns an error on update', async () => {
      mockSupabaseClient.single.mockResolvedValueOnce({ data: null, error: new Error('Supabase update error') });
      await expect(seasonsService.updateSupabaseSeason(mockInternalSupabaseUserId, mockAppSeason.id, seasonUpdateData)).rejects.toThrow('Supabase update error');
    });
  });

  describe('deleteSupabaseSeason', () => {
    it('should delete a season with the given user ID and return true', async () => {
      mockSupabaseClient.match.mockResolvedValueOnce({ error: null, count: 1 });
      
      const result = await seasonsService.deleteSupabaseSeason(mockInternalSupabaseUserId, mockAppSeason.id);
      expect(supabase.from).toHaveBeenCalledWith('seasons');
      expect(mockSupabaseClient.delete).toHaveBeenCalled();
      expect(mockSupabaseClient.match).toHaveBeenCalledWith({ id: mockAppSeason.id, user_id: mockInternalSupabaseUserId });
      expect(result).toBe(true);
    });

    it('should throw if internalSupabaseUserId is not provided for delete', async () => {
      // @ts-expect-error testing invalid input
      await expect(seasonsService.deleteSupabaseSeason(null, mockAppSeason.id)).rejects.toThrow("Internal Supabase User ID is required for deleting season.");
    });

    it('should throw if Supabase returns an error on delete', async () => {
      mockSupabaseClient.match.mockResolvedValueOnce({ error: new Error('Supabase delete error'), count: null });
      await expect(seasonsService.deleteSupabaseSeason(mockInternalSupabaseUserId, mockAppSeason.id)).rejects.toThrow('Supabase delete error');
    });

     it('should return false if no rows were deleted by Supabase', async () => {
      mockSupabaseClient.match.mockResolvedValueOnce({ error: null, count: 0 });
      const result = await seasonsService.deleteSupabaseSeason(mockInternalSupabaseUserId, 'non-existent-id');
      expect(mockSupabaseClient.match).toHaveBeenCalledWith({ id: 'non-existent-id', user_id: mockInternalSupabaseUserId });
      expect(result).toBe(false);
    });
  });
}); 