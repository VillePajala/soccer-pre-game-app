import { SEASONS_LIST_KEY } from '@/config/constants';
import { getSeasons, saveSeasons, addSeason, updateSeason, deleteSeason } from './seasons'; // Adjust path as needed
import type { Season } from '@/types'; // Import Season type directly from types

// Mock localStorage
let store: Record<string, string> = {};
const localStorageMock = (() => {
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = String(value);
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock console.error and console.warn to prevent output during tests and allow assertions
let consoleErrorSpy: jest.SpyInstance;
let consoleWarnSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  localStorageMock.clear(); // Clear localStorage mock after each test
});

describe('Season Management Utilities (localStorage)', () => {
  const sampleSeasons: Season[] = [
    { id: 's1', name: 'Spring League 2023' },
    { id: 's2', name: 'Summer Tournament' },
    { id: 's3', name: 'Fall Season' },
  ];

  describe('getSeasons', () => {
    it('should return an empty array if no seasons are in localStorage', () => {
      expect(getSeasons()).toEqual([]);
    });

    it('should return seasons from localStorage if they exist', () => {
      localStorageMock.setItem(SEASONS_LIST_KEY, JSON.stringify(sampleSeasons));
      expect(getSeasons()).toEqual(sampleSeasons);
    });

    it('should return an empty array and log an error if localStorage data is malformed', () => {
      localStorageMock.setItem(SEASONS_LIST_KEY, 'invalid-json');
      expect(getSeasons()).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('saveSeasons', () => {
    it('should save seasons to localStorage', () => {
      saveSeasons(sampleSeasons);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(SEASONS_LIST_KEY, JSON.stringify(sampleSeasons));
      expect(JSON.parse(store[SEASONS_LIST_KEY])).toEqual(sampleSeasons);
    });

    it('should overwrite existing seasons in localStorage', () => {
      const initialSeasons: Season[] = [{ id: 's0', name: 'Old Season' }];
      localStorageMock.setItem(SEASONS_LIST_KEY, JSON.stringify(initialSeasons));
      saveSeasons(sampleSeasons);
      expect(JSON.parse(store[SEASONS_LIST_KEY])).toEqual(sampleSeasons);
    });

    it('should log an error if saving to localStorage fails (e.g., quota exceeded)', () => {
      // Simulate localStorage.setItem throwing an error
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Quota exceeded');
      });
      saveSeasons(sampleSeasons);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('addSeason', () => {
    it('should add a new season to an empty list and return the new season object', () => {
      const newSeasonName = 'Winter Championship';
      const newSeason = addSeason(newSeasonName);
      expect(newSeason).not.toBeNull();
      expect(newSeason?.name).toBe(newSeasonName);
      const seasonsInStorage = getSeasons();
      expect(seasonsInStorage).toHaveLength(1);
      expect(seasonsInStorage[0]).toEqual(newSeason);
    });

    it('should add a new season to an existing list and return the new object', () => {
      saveSeasons([sampleSeasons[0]]);
      const newSeasonName = 'Annual Gala';
      const newSeason = addSeason(newSeasonName);
      expect(newSeason).not.toBeNull();
      expect(newSeason?.name).toBe(newSeasonName);
      const seasonsInStorage = getSeasons();
      expect(seasonsInStorage).toHaveLength(2);
      expect(seasonsInStorage.find(s => s.id === newSeason?.id)).toEqual(newSeason);
    });

    it('should trim whitespace from the new season name', () => {
      const newSeasonName = '  Spaced Out Cup   ';
      const newSeason = addSeason(newSeasonName);
      expect(newSeason).not.toBeNull();
      expect(newSeason?.name).toBe('Spaced Out Cup');
    });

    it('should return null and log error if the season name is empty', () => {
      expect(addSeason('')).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Season name cannot be empty'));
      expect(addSeason('   ')).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });

    it('should return null and log error if a season with the same name already exists', () => {
      saveSeasons([sampleSeasons[0]]); // 'Spring League 2023'
      expect(addSeason('spring league 2023')).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[addSeason] Validation failed: A season with name "spring league 2023" already exists.'));
    });

    it('should return null if saving fails during add', () => {
      localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('Save failed'); });
      expect(addSeason('Ephemeral Season')).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[saveSeasons] Error saving seasons to localStorage:'), expect.any(Error));
    });
  });

  describe('updateSeason', () => {
    beforeEach(() => {
      saveSeasons([...sampleSeasons]); // Ensure seasons are in store before each update test
    });

    it('should update an existing season\'s name and return the updated object', () => {
      const seasonToUpdate: Season = { ...sampleSeasons[0], name: 'Spring League Updated' };
      const updatedSeason = updateSeason(seasonToUpdate);
      expect(updatedSeason).not.toBeNull();
      expect(updatedSeason?.name).toBe('Spring League Updated');
      expect(getSeasons().find(s => s.id === sampleSeasons[0].id)?.name).toBe('Spring League Updated');
    });

    it('should trim whitespace from updated name', () => {
      const seasonToUpdate: Season = { ...sampleSeasons[0], name: '  Trimmed Update ' };
      const updatedSeason = updateSeason(seasonToUpdate);
      expect(updatedSeason).not.toBeNull();
      expect(updatedSeason?.name).toBe('Trimmed Update');
      expect(getSeasons().find(s => s.id === sampleSeasons[0].id)?.name).toBe('Trimmed Update');
    });

    it('should return null and log error if trying to update a non-existent season', () => {
      const nonExistentSeason: Season = { id: 's99', name: 'Ghost Season' };
      expect(updateSeason(nonExistentSeason)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Season with ID s99 not found'));
    });

    it('should return null and log error if updated name conflicts with another season', () => {
      const seasonToUpdate: Season = { ...sampleSeasons[0], name: sampleSeasons[1].name.toUpperCase() }; // "SUMMER TOURNAMENT"
      expect(updateSeason(seasonToUpdate)).toBeNull();
      // The actual function converts the comparison to lower case, so the error message will reflect the input given to updateSeason.
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`[updateSeason] Validation failed: Another season with name "${sampleSeasons[1].name.toUpperCase()}" already exists.`));
    });

    it('should return null if saving fails during update', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Save failed');
      });
      const seasonToUpdate: Season = { ...sampleSeasons[0], name: 'Update Fail Season' };
      expect(updateSeason(seasonToUpdate)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[saveSeasons] Error saving seasons to localStorage:'), expect.any(Error));
    });

    it('should return null and log error for invalid update data (empty name)', () => {
      const invalidSeason: Season = { ...sampleSeasons[0], name: '   ' };
      expect(updateSeason(invalidSeason)).toBeNull();
      // This message comes from the validation within updateSeason itself.
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[updateSeason] Invalid season data provided for update.'));
    });

    it('should return null and log error for invalid update data (missing id)', () => {
      const invalidSeason = { name: 'Valid Name' } as Season;
      expect(updateSeason(invalidSeason)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid season data provided for update'));
    });
  });

  describe('deleteSeason', () => {
    beforeEach(() => {
      saveSeasons([...sampleSeasons]); // Ensure seasons are in store before each delete test
    });

    it('should delete an existing season by ID and return true', () => {
      const seasonIdToDelete = sampleSeasons[1].id;
      const result = deleteSeason(seasonIdToDelete);
      expect(result).toBe(true);
      expect(getSeasons().find(s => s.id === seasonIdToDelete)).toBeUndefined();
    });

    it('should return false and log error if trying to delete a non-existent season ID', () => {
      const nonExistentId = 's99';
      const result = deleteSeason(nonExistentId);
      expect(result).toBe(false);
      expect(getSeasons()).toHaveLength(sampleSeasons.length);
      expect(consoleErrorSpy).toHaveBeenCalledWith(`[deleteSeason] Season with id ${nonExistentId} not found.`);
    });

    it('should handle deleting the last season and return true', () => {
      saveSeasons([sampleSeasons[0]]);
      const result = deleteSeason(sampleSeasons[0].id);
      expect(result).toBe(true);
      expect(getSeasons()).toEqual([]);
    });

    it('should return false if saving fails during delete', () => {
      localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('Save failed'); });
      const seasonIdToDelete = sampleSeasons[1].id;
      expect(deleteSeason(seasonIdToDelete)).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[saveSeasons] Error saving seasons to localStorage:'), expect.any(Error));
      expect(getSeasons().find(s => s.id === seasonIdToDelete)).toBeDefined();
    });

    it('should return false and log error for invalid delete ID', () => {
      expect(deleteSeason('')).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[deleteSeason] Invalid season ID provided'));
    });
  });
}); 