import {
  getSeasons,
  addSeason,
  updateSeason,
  deleteSeason,
} from './seasons';
import type { Season } from '@/types';
import { getSupabaseClient } from '@/lib/supabase';
import type { SupabaseClient } from '@supabase/supabase-js';

// Mock the Supabase service functions that are dependencies of this module
jest.mock('./supabase/seasons', () => ({
  __esModule: true,
  getSupabaseSeasons: jest.fn(),
  createSupabaseSeason: jest.fn(),
  updateSupabaseSeason: jest.fn(),
  deleteSupabaseSeason: jest.fn(),
}));

// Mock the getSupabaseClient function from @/lib/supabase
const mockAuthedSupabaseClient = {} as SupabaseClient;

jest.mock('@/lib/supabase', () => ({
  __esModule: true,
  getSupabaseClient: jest.fn(() => mockAuthedSupabaseClient),
  supabaseAnonClient: jest.fn(), // Also mock anon client if it were used as fallback
}));

// Import the mocked Supabase service functions to assert they are called
import {
  getSupabaseSeasons as fetchSeasonsFromSupabaseServiceMock,
  createSupabaseSeason as addSeasonToSupabaseServiceMock,
  updateSupabaseSeason as updateSeasonInSupabaseServiceMock,
  deleteSupabaseSeason as deleteSeasonFromSupabaseServiceMock,
} from './supabase/seasons';

const mockInternalSupabaseUserId = 'test-user-id-123';
const mockClerkToken = 'mock-clerk-jwt-token';

describe('Utility: src/utils/seasons.ts', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  describe('getSeasons', () => {
    it('should get authed client and call service with user ID and client', async () => {
      const mockSupabaseSeasons: Season[] = [{ id: 's1', name: 'Supa Season' }];
      (fetchSeasonsFromSupabaseServiceMock as jest.Mock).mockResolvedValue(mockSupabaseSeasons);

      const result = await getSeasons(mockClerkToken, mockInternalSupabaseUserId);

      expect(getSupabaseClient).toHaveBeenCalledWith(mockClerkToken);
      expect(fetchSeasonsFromSupabaseServiceMock).toHaveBeenCalledWith(mockAuthedSupabaseClient, mockInternalSupabaseUserId);
      expect(result).toEqual(mockSupabaseSeasons);
    });

    it('should throw error if clerkToken is not provided', async () => {
       // @ts-expect-error testing invalid input
      await expect(getSeasons(null, mockInternalSupabaseUserId)).rejects.toThrow("Clerk token is required.");
    });

    it('should throw error if internalSupabaseUserId is not provided', async () => {
       // @ts-expect-error testing invalid input
      await expect(getSeasons(mockClerkToken, null)).rejects.toThrow("User not authenticated or Supabase ID not provided to getSeasons.");
    });

    it('should propagate error from fetchSeasonsFromSupabaseService', async () => {
      const dbError = new Error('Service Error Fetch');
      (fetchSeasonsFromSupabaseServiceMock as jest.Mock).mockRejectedValue(dbError);
      await expect(getSeasons(mockClerkToken, mockInternalSupabaseUserId)).rejects.toThrow(dbError);
    });
  });

  describe('addSeason', () => {
    const newSeasonData: Omit<Season, 'id'> = { name: '  New Season ' };
    const trimmedSeasonData: Omit<Season, 'id'> = { name: 'New Season' };
    const createdSeason: Season = { id: 'sNew', ...trimmedSeasonData };

    it('should get authed client and call service with user ID, client, and trimmed data', async () => {
      (addSeasonToSupabaseServiceMock as jest.Mock).mockResolvedValue(createdSeason);
      const result = await addSeason(mockClerkToken, mockInternalSupabaseUserId, newSeasonData);

      expect(getSupabaseClient).toHaveBeenCalledWith(mockClerkToken);
      expect(addSeasonToSupabaseServiceMock).toHaveBeenCalledWith(mockAuthedSupabaseClient, mockInternalSupabaseUserId, trimmedSeasonData);
      expect(result).toEqual(createdSeason);
    });
    
    it('should throw if clerkToken is not provided for add', async () => {
      // @ts-expect-error testing invalid input
      await expect(addSeason(null, mockInternalSupabaseUserId, newSeasonData)).rejects.toThrow("Clerk token is required.");
    });

    it('should throw if internalSupabaseUserId is not provided for add', async () => {
      // @ts-expect-error testing invalid input
      await expect(addSeason(mockClerkToken, null, newSeasonData)).rejects.toThrow("User not authenticated or Supabase ID not provided to addSeason.");
    });

    it('should throw error if season name is empty or whitespace', async () => {
      await expect(addSeason(mockClerkToken, mockInternalSupabaseUserId, { name: '' })).rejects.toThrow("Season name cannot be empty.");
      await expect(addSeason(mockClerkToken, mockInternalSupabaseUserId, { name: '   ' })).rejects.toThrow("Season name cannot be empty.");
    });

     it('should propagate error from addSeasonToSupabaseService', async () => {
      const dbError = new Error('Service Error on add');
      (addSeasonToSupabaseServiceMock as jest.Mock).mockRejectedValue(dbError);
      await expect(addSeason(mockClerkToken, mockInternalSupabaseUserId, newSeasonData)).rejects.toThrow(dbError);
    });
  });

  describe('updateSeason', () => {
    const seasonIdToUpdate = 's1';
    const updateData: Partial<Omit<Season, 'id'>> = { name: '  Updated Name  ' };
    const trimmedUpdateData: Partial<Omit<Season, 'id'>> = { name: 'Updated Name' };
    const updatedSeason: Season = { id: seasonIdToUpdate, name: 'Updated Name' };

    it('should get authed client and call service with user ID, client, season ID and trimmed data', async () => {
      (updateSeasonInSupabaseServiceMock as jest.Mock).mockResolvedValue(updatedSeason);
      const result = await updateSeason(mockClerkToken, mockInternalSupabaseUserId, seasonIdToUpdate, updateData);

      expect(getSupabaseClient).toHaveBeenCalledWith(mockClerkToken);
      expect(updateSeasonInSupabaseServiceMock).toHaveBeenCalledWith(mockAuthedSupabaseClient, mockInternalSupabaseUserId, seasonIdToUpdate, trimmedUpdateData);
      expect(result).toEqual(updatedSeason);
    });

    it('should throw if clerkToken is not provided for update', async () => {
      // @ts-expect-error testing invalid input
      await expect(updateSeason(null, mockInternalSupabaseUserId, seasonIdToUpdate, updateData)).rejects.toThrow("Clerk token is required.");
    });

    it('should throw if internalSupabaseUserId is not provided for update', async () => {
      // @ts-expect-error testing invalid input
      await expect(updateSeason(mockClerkToken, null, seasonIdToUpdate, updateData)).rejects.toThrow("User not authenticated or Supabase ID not provided to updateSeason.");
    });

    it('should throw error if seasonId is not provided', async () => {
      await expect(updateSeason(mockClerkToken, mockInternalSupabaseUserId, '', updateData)).rejects.toThrow("Season ID is required for update.");
    });

    it('should throw error if updateData is empty or null', async () => {
      // @ts-expect-error testing invalid input
      await expect(updateSeason(mockClerkToken, mockInternalSupabaseUserId, seasonIdToUpdate, null)).rejects.toThrow("No update data provided.");
      await expect(updateSeason(mockClerkToken, mockInternalSupabaseUserId, seasonIdToUpdate, {})).rejects.toThrow("No update data provided.");
    });

    it('should throw error if updateData name is empty string after trim', async () => {
      await expect(updateSeason(mockClerkToken, mockInternalSupabaseUserId, seasonIdToUpdate, { name: '   ' })).rejects.toThrow("Season name cannot be empty if provided for update.");
    });

    it('should propagate error from updateSeasonInSupabaseService', async () => {
      const dbError = new Error('Service Error on update');
      (updateSeasonInSupabaseServiceMock as jest.Mock).mockRejectedValue(dbError);
      await expect(updateSeason(mockClerkToken, mockInternalSupabaseUserId, seasonIdToUpdate, updateData)).rejects.toThrow(dbError);
    });
  });

  describe('deleteSeason', () => {
    const seasonIdToDelete = 's1';

    it('should get authed client and call service with user ID, client and season ID', async () => {
      (deleteSeasonFromSupabaseServiceMock as jest.Mock).mockResolvedValue(true);
      const result = await deleteSeason(mockClerkToken, mockInternalSupabaseUserId, seasonIdToDelete);

      expect(getSupabaseClient).toHaveBeenCalledWith(mockClerkToken);
      expect(deleteSeasonFromSupabaseServiceMock).toHaveBeenCalledWith(mockAuthedSupabaseClient, mockInternalSupabaseUserId, seasonIdToDelete);
      expect(result).toBe(true);
    });

    it('should throw if clerkToken is not provided for delete', async () => {
      // @ts-expect-error testing invalid input
      await expect(deleteSeason(null, mockInternalSupabaseUserId, seasonIdToDelete)).rejects.toThrow("Clerk token is required.");
    });

    it('should throw if internalSupabaseUserId is not provided for delete', async () => {
      // @ts-expect-error testing invalid input
      await expect(deleteSeason(mockClerkToken, null, seasonIdToDelete)).rejects.toThrow("User not authenticated or Supabase ID not provided to deleteSeason.");
    });

    it('should throw error if seasonId is not provided', async () => {
      await expect(deleteSeason(mockClerkToken, mockInternalSupabaseUserId, '')).rejects.toThrow("Season ID is required for deletion.");
    });

    it('should propagate error from deleteSeasonFromSupabaseService', async () => {
      const dbError = new Error('Service Error on delete');
      (deleteSeasonFromSupabaseServiceMock as jest.Mock).mockRejectedValue(dbError);
      await expect(deleteSeason(mockClerkToken, mockInternalSupabaseUserId, seasonIdToDelete)).rejects.toThrow(dbError);
    });
  });
}); 