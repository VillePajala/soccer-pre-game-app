import { 
  getTournaments, 
  addTournament, 
  updateTournament, 
  deleteTournament,
  saveTournament
} from './tournaments'; 
import type { Tournament } from '@/types';

// Mock the storage manager
jest.mock('@/lib/storage', () => ({
  authAwareStorageManager: {
    getTournaments: jest.fn(),
    saveTournament: jest.fn(),
    updateTournament: jest.fn(),
    deleteTournament: jest.fn(),
  }
}));

// Mock logger to avoid console output during tests
jest.mock('@/utils/logger', () => ({
  default: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  }
}));

import { authAwareStorageManager as storageManager } from '@/lib/storage';
import logger from '@/utils/logger';

describe('Tournament Management Utilities (Storage Abstraction)', () => {
  const mockStorageManager = storageManager as jest.Mocked<typeof storageManager>;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  const sampleTournaments: Tournament[] = [
    { id: 't1', name: 'Regional Cup Q1' },
    { id: 't2', name: 'Champions League Pre-Season' },
    { id: 't3', name: 'Local Charity Shield' },
  ];

  describe('getTournaments', () => {
    it('should return an empty array if no tournaments exist', async () => {
      mockStorageManager.getTournaments.mockResolvedValue([]);
      
      const result = await getTournaments();
      
      expect(result).toEqual([]);
      expect(mockStorageManager.getTournaments).toHaveBeenCalledTimes(1);
    });

    it('should return tournaments from storage manager', async () => {
      mockStorageManager.getTournaments.mockResolvedValue(sampleTournaments);
      
      const result = await getTournaments();
      
      expect(result).toEqual(sampleTournaments);
      expect(mockStorageManager.getTournaments).toHaveBeenCalledTimes(1);
    });

    it('should handle null values for optional fields', async () => {
      const tournamentsWithNulls = [
        { id: 't1', name: 'Test', level: null, ageGroup: null }
      ];
      mockStorageManager.getTournaments.mockResolvedValue(tournamentsWithNulls as any);
      
      const result = await getTournaments();
      
      expect(result).toEqual([
        { id: 't1', name: 'Test', level: undefined, ageGroup: undefined }
      ]);
    });

    it('should return an empty array and log error on storage failure', async () => {
      const error = new Error('Storage error');
      mockStorageManager.getTournaments.mockRejectedValue(error);
      
      const result = await getTournaments();
      
      expect(result).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[getTournaments] Error getting tournaments:',
        error
      );
    });
  });

  describe('saveTournament', () => {
    it('should save tournament and return saved object', async () => {
      const tournament = sampleTournaments[0];
      mockStorageManager.saveTournament.mockResolvedValue(tournament);
      
      const result = await saveTournament(tournament);
      
      expect(result).toEqual(tournament);
      expect(mockStorageManager.saveTournament).toHaveBeenCalledWith(tournament);
    });

    it('should throw error and log on save failure', async () => {
      const tournament = sampleTournaments[0];
      const error = new Error('Save failed');
      mockStorageManager.saveTournament.mockRejectedValue(error);
      
      await expect(saveTournament(tournament)).rejects.toThrow(error);
      
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[saveTournament] Error saving tournament:',
        error
      );
    });
  });

  describe('addTournament', () => {
    it('should add a new tournament and return it', async () => {
      const newName = 'New Tournament';
      const newTournament = { id: 't4', name: newName };
      
      mockStorageManager.getTournaments.mockResolvedValue(sampleTournaments);
      mockStorageManager.saveTournament.mockResolvedValue(newTournament);
      
      const result = await addTournament(newName);
      
      expect(result).toEqual(newTournament);
      expect(mockStorageManager.saveTournament).toHaveBeenCalledWith(
        expect.objectContaining({
          name: newName,
          id: expect.stringContaining('tournament_')
        })
      );
    });

    it('should add tournament with extra fields', async () => {
      const newName = 'New Tournament';
      const extra = { level: 'Regional', ageGroup: 'U16' };
      const newTournament = { id: 't4', name: newName, ...extra };
      
      mockStorageManager.getTournaments.mockResolvedValue([]);
      mockStorageManager.saveTournament.mockResolvedValue(newTournament);
      
      const result = await addTournament(newName, extra);
      
      expect(result).toEqual(newTournament);
      expect(mockStorageManager.saveTournament).toHaveBeenCalledWith(
        expect.objectContaining({
          name: newName,
          ...extra
        })
      );
    });

    it('should return null and log error for empty name', async () => {
      const result = await addTournament('');
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[addTournament] Validation failed: Tournament name cannot be empty.'
      );
      expect(mockStorageManager.saveTournament).not.toHaveBeenCalled();
    });

    it('should return null and log error for duplicate name (case-insensitive)', async () => {
      mockStorageManager.getTournaments.mockResolvedValue(sampleTournaments);
      
      const result = await addTournament('regional cup q1');
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[addTournament] Validation failed: A tournament with name "regional cup q1" already exists.'
      );
      expect(mockStorageManager.saveTournament).not.toHaveBeenCalled();
    });

    it('should return null on save failure', async () => {
      const error = new Error('Save failed');
      mockStorageManager.getTournaments.mockResolvedValue([]);
      mockStorageManager.saveTournament.mockRejectedValue(error);
      
      const result = await addTournament('New Tournament');
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[addTournament] Error adding tournament:',
        error
      );
    });
  });

  describe('updateTournament', () => {
    it('should update existing tournament and return updated object', async () => {
      const updatedTournament = { ...sampleTournaments[0], name: 'Updated Name' };
      mockStorageManager.updateTournament.mockResolvedValue(updatedTournament);
      
      const result = await updateTournament(updatedTournament);
      
      expect(result).toEqual(updatedTournament);
      expect(mockStorageManager.updateTournament).toHaveBeenCalledWith(updatedTournament);
    });

    it('should return null for invalid tournament data', async () => {
      const invalidTournament = { ...sampleTournaments[0], name: '   ' };
      
      const result = await updateTournament(invalidTournament);
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[updateTournament] Invalid tournament data provided for update.'
      );
      expect(mockStorageManager.updateTournament).not.toHaveBeenCalled();
    });

    it('should return null on update failure', async () => {
      const tournament = sampleTournaments[0];
      const error = new Error('Update failed');
      mockStorageManager.updateTournament.mockRejectedValue(error);
      
      const result = await updateTournament(tournament);
      
      expect(result).toBeNull();
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[updateTournament] Error updating tournament:',
        error
      );
    });
  });

  describe('deleteTournament', () => {
    it('should delete tournament and return true', async () => {
      mockStorageManager.deleteTournament.mockResolvedValue(undefined);
      
      const result = await deleteTournament('t1');
      
      expect(result).toBe(true);
      expect(mockStorageManager.deleteTournament).toHaveBeenCalledWith('t1');
    });

    it('should return false for invalid tournament ID', async () => {
      const result = await deleteTournament('');
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[deleteTournament] Invalid tournament ID provided.'
      );
      expect(mockStorageManager.deleteTournament).not.toHaveBeenCalled();
    });

    it('should return false on delete failure', async () => {
      const error = new Error('Delete failed');
      mockStorageManager.deleteTournament.mockRejectedValue(error);
      
      const result = await deleteTournament('t1');
      
      expect(result).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[deleteTournament] Error deleting tournament:',
        error
      );
    });
  });
});