import {
  getSeasons,
  addSeason,
  updateSeason,
  deleteSeason,
  authProvider, // Import for spying
} from './seasons';
import type { Season } from '@/types';

// Mock the Supabase service functions that are dependencies of this module
jest.mock('./supabase/seasons', () => ({
  __esModule: true,
  getSupabaseSeasons: jest.fn(),
  createSupabaseSeason: jest.fn(),
  updateSupabaseSeason: jest.fn(),
  deleteSupabaseSeason: jest.fn(),
}));

// Import the mocked Supabase service functions to assert they are called
import {
  getSupabaseSeasons as fetchSeasonsFromSupabaseMock,
  createSupabaseSeason as addSeasonToSupabaseMock,
  updateSupabaseSeason as updateSeasonInSupabaseMock,
  deleteSupabaseSeason as deleteSeasonFromSupabaseMock,
} from './supabase/seasons';

const mockInternalSupabaseUserId = 'test-user-id-from-authprovider';

describe('Utility: src/utils/seasons.ts', () => {
  let authSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    authSpy = jest.spyOn(authProvider, 'getAuthenticatedSupabaseUserId');
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    authSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  describe('getSeasons', () => {
    it('should call fetchSeasonsFromSupabase with user ID if authenticated', async () => {
      authSpy.mockResolvedValue(mockInternalSupabaseUserId);
      const mockSupabaseSeasons: Season[] = [{ id: 's1', name: 'Supa Season' }];
      (fetchSeasonsFromSupabaseMock as jest.Mock).mockResolvedValue(mockSupabaseSeasons);

      const result = await getSeasons();

      expect(authSpy).toHaveBeenCalledTimes(1);
      expect(fetchSeasonsFromSupabaseMock).toHaveBeenCalledWith(mockInternalSupabaseUserId);
      expect(result).toEqual(mockSupabaseSeasons);
    });

    it('should throw error if not authenticated', async () => {
      authSpy.mockResolvedValue(null);
      await expect(getSeasons()).rejects.toThrow("User not authenticated. Please log in to manage seasons.");
      expect(fetchSeasonsFromSupabaseMock).not.toHaveBeenCalled();
    });

    it('should propagate error from fetchSeasonsFromSupabase', async () => {
      authSpy.mockResolvedValue(mockInternalSupabaseUserId);
      const dbError = new Error('Supabase DB Error');
      (fetchSeasonsFromSupabaseMock as jest.Mock).mockRejectedValue(dbError);
      await expect(getSeasons()).rejects.toThrow(dbError);
    });
  });

  describe('addSeason', () => {
    const newSeasonData: Omit<Season, 'id'> = { name: '  New Season ' };
    const trimmedSeasonData: Omit<Season, 'id'> = { name: 'New Season' };
    const createdSeason: Season = { id: 'sNew', ...trimmedSeasonData };

    it('should call addSeasonToSupabase with user ID and trimmed data if authenticated', async () => {
      authSpy.mockResolvedValue(mockInternalSupabaseUserId);
      (addSeasonToSupabaseMock as jest.Mock).mockResolvedValue(createdSeason);

      const result = await addSeason(newSeasonData);

      expect(authSpy).toHaveBeenCalledTimes(1);
      expect(addSeasonToSupabaseMock).toHaveBeenCalledWith(mockInternalSupabaseUserId, trimmedSeasonData);
      expect(result).toEqual(createdSeason);
    });

    it('should throw error if not authenticated for add', async () => {
      authSpy.mockResolvedValue(null);
      await expect(addSeason(newSeasonData)).rejects.toThrow("User not authenticated. Please log in to add a season.");
      expect(addSeasonToSupabaseMock).not.toHaveBeenCalled();
    });

    it('should throw error if season name is empty or whitespace', async () => {
      authSpy.mockResolvedValue(mockInternalSupabaseUserId);
      await expect(addSeason({ name: '' })).rejects.toThrow("Season name cannot be empty.");
      await expect(addSeason({ name: '   ' })).rejects.toThrow("Season name cannot be empty.");
      expect(addSeasonToSupabaseMock).not.toHaveBeenCalled();
    });

    it('should propagate error from addSeasonToSupabase', async () => {
      authSpy.mockResolvedValue(mockInternalSupabaseUserId);
      const dbError = new Error('Supabase DB Error on add');
      (addSeasonToSupabaseMock as jest.Mock).mockRejectedValue(dbError);
      await expect(addSeason(newSeasonData)).rejects.toThrow(dbError);
    });
  });

  describe('updateSeason', () => {
    const seasonIdToUpdate = 's1';
    const updateData: Partial<Omit<Season, 'id'>> = { name: '  Updated Name  ' };
    const trimmedUpdateData: Partial<Omit<Season, 'id'>> = { name: 'Updated Name' };
    const updatedSeason: Season = { id: seasonIdToUpdate, name: 'Updated Name' };

    it('should call updateSeasonInSupabase with user ID, season ID and trimmed data if authenticated', async () => {
      authSpy.mockResolvedValue(mockInternalSupabaseUserId);
      (updateSeasonInSupabaseMock as jest.Mock).mockResolvedValue(updatedSeason);

      const result = await updateSeason(seasonIdToUpdate, updateData);

      expect(authSpy).toHaveBeenCalledTimes(1);
      expect(updateSeasonInSupabaseMock).toHaveBeenCalledWith(mockInternalSupabaseUserId, seasonIdToUpdate, trimmedUpdateData);
      expect(result).toEqual(updatedSeason);
    });

    it('should throw error if not authenticated for update', async () => {
      authSpy.mockResolvedValue(null);
      await expect(updateSeason(seasonIdToUpdate, updateData)).rejects.toThrow("User not authenticated. Please log in to update a season.");
      expect(updateSeasonInSupabaseMock).not.toHaveBeenCalled();
    });

    it('should throw error if seasonId is not provided', async () => {
      authSpy.mockResolvedValue(mockInternalSupabaseUserId);
      await expect(updateSeason('', updateData)).rejects.toThrow("Season ID is required for update.");
      expect(updateSeasonInSupabaseMock).not.toHaveBeenCalled();
    });

    it('should throw error if updateData is empty or null', async () => {
      authSpy.mockResolvedValue(mockInternalSupabaseUserId);
      // @ts-expect-error testing invalid input
      await expect(updateSeason(seasonIdToUpdate, null)).rejects.toThrow("No update data provided.");
      await expect(updateSeason(seasonIdToUpdate, {})).rejects.toThrow("No update data provided.");
      expect(updateSeasonInSupabaseMock).not.toHaveBeenCalled();
    });
    
    it('should throw error if updateData name is empty string after trim', async () => {
      authSpy.mockResolvedValue(mockInternalSupabaseUserId);
      await expect(updateSeason(seasonIdToUpdate, { name: '   ' })).rejects.toThrow("Season name cannot be empty if provided for update.");
      expect(updateSeasonInSupabaseMock).not.toHaveBeenCalled();
    });

    it('should propagate error from updateSeasonInSupabase', async () => {
      authSpy.mockResolvedValue(mockInternalSupabaseUserId);
      const dbError = new Error('Supabase DB Error on update');
      (updateSeasonInSupabaseMock as jest.Mock).mockRejectedValue(dbError);
      await expect(updateSeason(seasonIdToUpdate, updateData)).rejects.toThrow(dbError);
    });
  });

  describe('deleteSeason', () => {
    const seasonIdToDelete = 's1';

    it('should call deleteSeasonFromSupabase with user ID and season ID if authenticated', async () => {
      authSpy.mockResolvedValue(mockInternalSupabaseUserId);
      (deleteSeasonFromSupabaseMock as jest.Mock).mockResolvedValue(true);

      const result = await deleteSeason(seasonIdToDelete);

      expect(authSpy).toHaveBeenCalledTimes(1);
      expect(deleteSeasonFromSupabaseMock).toHaveBeenCalledWith(mockInternalSupabaseUserId, seasonIdToDelete);
      expect(result).toBe(true);
    });

    it('should throw error if not authenticated for delete', async () => {
      authSpy.mockResolvedValue(null);
      await expect(deleteSeason(seasonIdToDelete)).rejects.toThrow("User not authenticated. Please log in to delete a season.");
      expect(deleteSeasonFromSupabaseMock).not.toHaveBeenCalled();
    });

    it('should throw error if seasonId is not provided for delete', async () => {
      authSpy.mockResolvedValue(mockInternalSupabaseUserId);
      await expect(deleteSeason('')).rejects.toThrow("Season ID is required for deletion.");
      expect(deleteSeasonFromSupabaseMock).not.toHaveBeenCalled();
    });

    it('should propagate error from deleteSeasonFromSupabase', async () => {
      authSpy.mockResolvedValue(mockInternalSupabaseUserId);
      const dbError = new Error('Supabase DB Error on delete');
      (deleteSeasonFromSupabaseMock as jest.Mock).mockRejectedValue(dbError);
      await expect(deleteSeason(seasonIdToDelete)).rejects.toThrow(dbError);
    });
  });
}); 