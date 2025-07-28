import { 
  getSeasons, 
  addSeason, 
  updateSeason, 
  deleteSeason,
  saveSeason
} from './seasons'; 
import type { Season } from '@/types';

// Mock the storage manager
jest.mock('@/lib/storage', () => ({
  authAwareStorageManager: {
    getSeasons: jest.fn(),
    saveSeason: jest.fn(),
    updateSeason: jest.fn(),
    deleteSeason: jest.fn(),
  }
}));

// Mock logger to avoid console output during tests
jest.mock('@/utils/logger', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
  return {
    __esModule: true,
    default: mockLogger,
  };
});

import { authAwareStorageManager as storageManager } from '@/lib/storage';
import logger from '@/utils/logger';

describe('Season Management Utilities (Storage Abstraction)', () => {
  const mockStorageManager = storageManager as jest.Mocked<typeof storageManager>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  const sampleSeasons: Season[] = [
    { id: 's1', name: 'Spring League 2023' },
    { id: 's2', name: 'Summer Camp 2023' },
    { id: 's3', name: 'Fall Tournament 2023' },
  ];

  describe('getSeasons', () => {
    it('should return an empty array if no seasons exist', async () => {
      mockStorageManager.getSeasons.mockResolvedValue([]);
      
      const seasons = await getSeasons();
      
      expect(seasons).toEqual([]);
    });

    it('should return seasons from storage manager', async () => {
      mockStorageManager.getSeasons.mockResolvedValue(sampleSeasons);
      
      const seasons = await getSeasons();
      
      expect(seasons).toEqual(sampleSeasons);
    });

    it('should handle seasons with ageGroup property', async () => {
      const seasonsWithAgeGroup = [
        { ...sampleSeasons[0], ageGroup: 'U12' },
        { ...sampleSeasons[1], ageGroup: null },
      ];
      mockStorageManager.getSeasons.mockResolvedValue(seasonsWithAgeGroup);
      
      const seasons = await getSeasons();
      
      expect(seasons[0].ageGroup).toBe('U12');
      expect(seasons[1].ageGroup).toBeUndefined();
    });

    it('should return an empty array and log error on storage failure', async () => {
      const error = new Error('Storage error');
      mockStorageManager.getSeasons.mockRejectedValue(error);
      
      const seasons = await getSeasons();
      
      expect(seasons).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith('[getSeasons] Error reading seasons:', error);
    });
  });

  describe('saveSeason', () => {
    it('should save season and return saved object', async () => {
      const season = sampleSeasons[0];
      mockStorageManager.saveSeason.mockResolvedValue(season);
      
      const result = await saveSeason(season);
      
      expect(result).toEqual(season);
      expect(mockStorageManager.saveSeason).toHaveBeenCalledWith(season);
    });

    it('should throw error and log on save failure', async () => {
      const season = sampleSeasons[0];
      const error = new Error('Save failed');
      mockStorageManager.saveSeason.mockRejectedValue(error);
      
      await expect(saveSeason(season)).rejects.toThrow('Save failed');
      expect(mockLogger.error).toHaveBeenCalledWith('[saveSeason] Error saving season:', error);
    });
  });

  describe('addSeason', () => {
    it('should add a new season and return it', async () => {
      mockStorageManager.getSeasons.mockResolvedValue([]);
      const newSeason = { id: expect.any(String), name: 'Winter Championship' };
      mockStorageManager.saveSeason.mockResolvedValue(newSeason);
      
      const result = await addSeason('Winter Championship');
      
      expect(result).toEqual(newSeason);
      expect(mockStorageManager.saveSeason).toHaveBeenCalled();
    });

    it('should add season with extra fields', async () => {
      mockStorageManager.getSeasons.mockResolvedValue([]);
      const newSeason = { 
        id: expect.any(String), 
        name: 'Test Season',
        ageGroup: 'U14'
      };
      mockStorageManager.saveSeason.mockResolvedValue(newSeason);
      
      const result = await addSeason('Test Season', { ageGroup: 'U14' });
      
      expect(result).toEqual(newSeason);
    });

    it('should return null and log error for empty name', async () => {
      const result = await addSeason('   ');
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('[addSeason] Validation failed: Season name cannot be empty.');
    });

    it('should return null and log error for duplicate name (case-insensitive)', async () => {
      mockStorageManager.getSeasons.mockResolvedValue([sampleSeasons[0]]);
      
      const result = await addSeason('spring league 2023');
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[addSeason] Validation failed: A season with name "spring league 2023" already exists.'
      );
    });

    it('should return null on save failure', async () => {
      mockStorageManager.getSeasons.mockResolvedValue([]);
      const error = new Error('Save failed');
      mockStorageManager.saveSeason.mockRejectedValue(error);
      
      const result = await addSeason('Ephemeral Season');
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith('[addSeason] Unexpected error adding season:', error);
    });
  });

  describe('updateSeason', () => {
    it('should update existing season and return updated object', async () => {
      const updates = { name: 'Updated Name' };
      const updatedSeason = { ...sampleSeasons[0], ...updates };
      mockStorageManager.updateSeason.mockResolvedValue(updatedSeason);
      mockStorageManager.getSeasons.mockResolvedValue([]);
      
      const result = await updateSeason(sampleSeasons[0].id, updates);
      
      expect(result).toEqual(updatedSeason);
      expect(mockStorageManager.updateSeason).toHaveBeenCalledWith(sampleSeasons[0].id, updates);
    });

    it('should return null for invalid season data', async () => {
      const result = await updateSeason('', { name: 'Test' });
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[updateSeason] Invalid parameters provided for update.'
      );
      expect(mockStorageManager.updateSeason).not.toHaveBeenCalled();
    });

    it('should return null on update failure', async () => {
      const error = new Error('Update failed');
      const updates = { name: 'Updated Name' };
      mockStorageManager.updateSeason.mockRejectedValue(error);
      mockStorageManager.getSeasons.mockResolvedValue([]);
      
      const result = await updateSeason(sampleSeasons[0].id, updates);
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[updateSeason] Unexpected error updating season:',
        error
      );
    });
  });

  describe('deleteSeason', () => {
    it('should delete season and return true', async () => {
      mockStorageManager.deleteSeason.mockResolvedValue(undefined);
      
      const result = await deleteSeason('s1');
      
      expect(result).toBe(true);
      expect(mockStorageManager.deleteSeason).toHaveBeenCalledWith('s1');
    });

    it('should return false for invalid season ID', async () => {
      const result = await deleteSeason('');
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith('[deleteSeason] Invalid season ID provided.');
    });

    it('should return false on delete failure', async () => {
      const error = new Error('Delete failed');
      mockStorageManager.deleteSeason.mockRejectedValue(error);
      
      const result = await deleteSeason('s1');
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[deleteSeason] Unexpected error deleting season:',
        error
      );
    });
  });
});