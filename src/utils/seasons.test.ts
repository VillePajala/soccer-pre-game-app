import { SEASONS_LIST_KEY } from '@/config/constants';
import { getSeasons, saveSeasons, addSeason, updateSeason, deleteSeason, Season } from './seasons'; // Adjust path as needed

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
    it('should add a new season to an empty list', () => {
      const newSeasonName = 'Winter Championship';
      const updatedSeasons = addSeason(newSeasonName);
      expect(updatedSeasons).toHaveLength(1);
      expect(updatedSeasons[0].name).toBe(newSeasonName);
      expect(getSeasons()).toEqual(updatedSeasons);
    });

    it('should add a new season to an existing list', () => {
      saveSeasons([sampleSeasons[0]]);
      const newSeasonName = 'Annual Gala';
      const updatedSeasons = addSeason(newSeasonName);
      expect(updatedSeasons).toHaveLength(2);
      expect(updatedSeasons.find(s => s.name === newSeasonName)).toBeDefined();
      expect(getSeasons()).toEqual(updatedSeasons);
    });

    it('should trim whitespace from the new season name', () => {
      const newSeasonName = '  Spaced Out Cup   ';
      const updatedSeasons = addSeason(newSeasonName);
      expect(updatedSeasons[0].name).toBe('Spaced Out Cup');
    });

    it('should throw an error if the season name is empty', () => {
      expect(() => addSeason('')).toThrow('Season name cannot be empty.');
      expect(() => addSeason('   ')).toThrow('Season name cannot be empty.');
    });

    it('should throw an error if a season with the same name already exists (case-insensitive)', () => {
      saveSeasons([sampleSeasons[0]]); // 'Spring League 2023'
      expect(() => addSeason('spring league 2023')).toThrow('A season with this name already exists.');
    });
  });

  describe('updateSeason', () => {
    beforeEach(() => {
      saveSeasons([...sampleSeasons]); // Ensure seasons are in store before each update test
    });

    it('should update an existing season\'s name', () => {
      const seasonToUpdate: Season = { ...sampleSeasons[0], name: 'Spring League Updated' };
      const updatedSeasons = updateSeason(seasonToUpdate);
      expect(updatedSeasons.find(s => s.id === sampleSeasons[0].id)?.name).toBe('Spring League Updated');
      expect(getSeasons().find(s => s.id === sampleSeasons[0].id)?.name).toBe('Spring League Updated');
    });

    // Add more properties to Season interface to test updating them, e.g., startDate
    // it('should update other properties of an existing season', () => {
    //   const seasonToUpdate: Season = { ...sampleSeasons[1], details: 'New details' };
    //   const updatedSeasons = updateSeason(seasonToUpdate);
    //   expect(updatedSeasons.find(s => s.id === sampleSeasons[1].id)?.details).toBe('New details');
    // });

    it('should throw an error if trying to update a non-existent season', () => {
      const nonExistentSeason: Season = { id: 's99', name: 'Ghost Season' };
      expect(() => updateSeason(nonExistentSeason)).toThrow('Season not found for update.');
    });
  });

  describe('deleteSeason', () => {
    beforeEach(() => {
      saveSeasons([...sampleSeasons]); // Ensure seasons are in store before each delete test
    });

    it('should delete an existing season by ID', () => {
      const seasonIdToDelete = sampleSeasons[1].id; // 's2'
      const updatedSeasons = deleteSeason(seasonIdToDelete);
      expect(updatedSeasons).toHaveLength(sampleSeasons.length - 1);
      expect(updatedSeasons.find(s => s.id === seasonIdToDelete)).toBeUndefined();
      expect(getSeasons().find(s => s.id === seasonIdToDelete)).toBeUndefined();
    });

    it('should not change the list and warn if trying to delete a non-existent season ID', () => {
      const nonExistentId = 's99';
      const updatedSeasons = deleteSeason(nonExistentId);
      expect(updatedSeasons).toHaveLength(sampleSeasons.length);
      expect(updatedSeasons).toEqual(sampleSeasons); // List should be unchanged
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Season with id ${nonExistentId} not found for deletion.`);
    });

    it('should handle deleting the last season', () => {
      saveSeasons([sampleSeasons[0]]);
      const updatedSeasons = deleteSeason(sampleSeasons[0].id);
      expect(updatedSeasons).toEqual([]);
      expect(getSeasons()).toEqual([]);
    });
  });
}); 