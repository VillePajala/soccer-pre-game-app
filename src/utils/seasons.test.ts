import { getSupabaseClient } from '@/lib/supabase';
import {
  getSeasons,
  addSeason,
  updateSeason,
  deleteSeason,
} from './seasons';
import {
  getSupabaseSeasons,
  createSupabaseSeason,
  updateSupabaseSeason,
  deleteSupabaseSeason,
} from './supabase/seasons';
import { Season } from '@/types';

// Mock the Supabase client and the Supabase service functions
jest.mock('@/lib/supabase');
jest.mock('./supabase/seasons');

const mockGetSupabaseClient = getSupabaseClient as jest.Mock;
const mockGetSupabaseSeasons = getSupabaseSeasons as jest.Mock;
const mockCreateSupabaseSeason = createSupabaseSeason as jest.Mock;
const mockUpdateSupabaseSeason = updateSupabaseSeason as jest.Mock;
const mockDeleteSupabaseSeason = deleteSupabaseSeason as jest.Mock;

describe('Seasons Utility', () => {
  const mockClerkToken = 'test-clerk-token';
  const mockInternalSupabaseUserId = 'test-user-id';
  const mockSupabaseClient = {}; // Mock client object

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSupabaseClient.mockResolvedValue(mockSupabaseClient);
  });

  // Test getSeasons
  describe('getSeasons', () => {
    it('should call the Supabase service to get seasons', async () => {
      const mockSeasons: Season[] = [{ id: 's1', name: 'Test Season' }];
      mockGetSupabaseSeasons.mockResolvedValue(mockSeasons);

      const result = await getSeasons(mockClerkToken, mockInternalSupabaseUserId);

      expect(mockGetSupabaseClient).toHaveBeenCalledWith(mockClerkToken);
      expect(mockGetSupabaseSeasons).toHaveBeenCalledWith(mockSupabaseClient, mockInternalSupabaseUserId);
      expect(result).toEqual(mockSeasons);
    });

    it('should throw an error if token is missing', async () => {
      await expect(getSeasons('', mockInternalSupabaseUserId)).rejects.toThrow('Clerk token is required.');
    });
  });

  // Test addSeason
  describe('addSeason', () => {
    it('should call the Supabase service to create a season', async () => {
      const newSeasonData = { name: 'New Season' };
      const createdSeason = { id: 's2', ...newSeasonData };
      mockCreateSupabaseSeason.mockResolvedValue(createdSeason);

      const result = await addSeason(mockClerkToken, mockInternalSupabaseUserId, newSeasonData);

      expect(mockCreateSupabaseSeason).toHaveBeenCalledWith(mockSupabaseClient, mockInternalSupabaseUserId, newSeasonData);
      expect(result).toEqual(createdSeason);
    });

    it('should return null if creation fails', async () => {
      mockCreateSupabaseSeason.mockRejectedValue(new Error('DB error'));
      const result = await addSeason(mockClerkToken, mockInternalSupabaseUserId, { name: 'Fail Season' });
      expect(result).toBeNull();
    });
  });

  // Test updateSeason
  describe('updateSeason', () => {
    it('should call the Supabase service to update a season', async () => {
      const seasonToUpdate: Season = { id: 's1', name: 'Updated Name' };
      mockUpdateSupabaseSeason.mockResolvedValue(seasonToUpdate);

      const result = await updateSeason(mockClerkToken, mockInternalSupabaseUserId, seasonToUpdate.id, { name: seasonToUpdate.name });

      expect(mockUpdateSupabaseSeason).toHaveBeenCalledWith(mockSupabaseClient, mockInternalSupabaseUserId, seasonToUpdate.id, { name: seasonToUpdate.name });
      expect(result).toEqual(seasonToUpdate);
    });
  });

  // Test deleteSeason
  describe('deleteSeason', () => {
    it('should call the Supabase service to delete a season', async () => {
      const seasonId = 's1';
      mockDeleteSupabaseSeason.mockResolvedValue(true);

      const result = await deleteSeason(mockClerkToken, mockInternalSupabaseUserId, seasonId);

      expect(mockDeleteSupabaseSeason).toHaveBeenCalledWith(mockSupabaseClient, mockInternalSupabaseUserId, seasonId);
      expect(result).toBe(true);
    });
  });
}); 