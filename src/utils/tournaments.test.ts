import { TOURNAMENTS_LIST_KEY } from '@/config/constants';
import { getTournaments, saveTournaments, addTournament, updateTournament, deleteTournament, Tournament } from './tournaments';

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

// Mock console.error and console.warn
let consoleErrorSpy: jest.SpyInstance;
let consoleWarnSpy: jest.SpyInstance;

beforeEach(() => {
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  consoleErrorSpy.mockRestore();
  consoleWarnSpy.mockRestore();
  localStorageMock.clear();
});

describe('Tournament Management Utilities (localStorage)', () => {
  const sampleTournaments: Tournament[] = [
    { id: 't1', name: 'Regional Cup Q1' },
    { id: 't2', name: 'Champions League Pre-Season' },
    { id: 't3', name: 'Local Charity Shield' },
  ];

  describe('getTournaments', () => {
    it('should return an empty array if no tournaments are in localStorage', () => {
      expect(getTournaments()).toEqual([]);
    });

    it('should return tournaments from localStorage if they exist', () => {
      localStorageMock.setItem(TOURNAMENTS_LIST_KEY, JSON.stringify(sampleTournaments));
      expect(getTournaments()).toEqual(sampleTournaments);
    });

    it('should return an empty array and log an error if localStorage data is malformed', () => {
      localStorageMock.setItem(TOURNAMENTS_LIST_KEY, 'invalid-json-format');
      expect(getTournaments()).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('saveTournaments', () => {
    it('should save tournaments to localStorage', () => {
      saveTournaments(sampleTournaments);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(TOURNAMENTS_LIST_KEY, JSON.stringify(sampleTournaments));
      expect(JSON.parse(store[TOURNAMENTS_LIST_KEY])).toEqual(sampleTournaments);
    });

    it('should overwrite existing tournaments in localStorage', () => {
      const initialTournaments: Tournament[] = [{ id: 't0', name: 'Old Cup' }];
      localStorageMock.setItem(TOURNAMENTS_LIST_KEY, JSON.stringify(initialTournaments));
      saveTournaments(sampleTournaments);
      expect(JSON.parse(store[TOURNAMENTS_LIST_KEY])).toEqual(sampleTournaments);
    });

    it('should log an error if saving to localStorage fails', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage full');
      });
      saveTournaments(sampleTournaments);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('addTournament', () => {
    it('should add a new tournament to an empty list', () => {
      const newTournamentName = 'Newcomers Trophy';
      const updatedTournaments = addTournament(newTournamentName);
      expect(updatedTournaments).toHaveLength(1);
      expect(updatedTournaments[0].name).toBe(newTournamentName);
      expect(getTournaments()).toEqual(updatedTournaments);
    });

    it('should add a new tournament to an existing list', () => {
      saveTournaments([sampleTournaments[0]]);
      const newTournamentName = 'Invitational Cup';
      const updatedTournaments = addTournament(newTournamentName);
      expect(updatedTournaments).toHaveLength(2);
      expect(updatedTournaments.find(t => t.name === newTournamentName)).toBeDefined();
      expect(getTournaments()).toEqual(updatedTournaments);
    });

    it('should trim whitespace from the new tournament name', () => {
      const newTournamentName = '  Main Event Challenge  ';
      const updatedTournaments = addTournament(newTournamentName);
      expect(updatedTournaments[0].name).toBe('Main Event Challenge');
    });

    it('should throw an error if the tournament name is empty', () => {
      expect(() => addTournament('')).toThrow('Tournament name cannot be empty.');
      expect(() => addTournament('   ')).toThrow('Tournament name cannot be empty.');
    });

    it('should throw an error if a tournament with the same name already exists (case-insensitive)', () => {
      saveTournaments([sampleTournaments[0]]); // 'Regional Cup Q1'
      expect(() => addTournament('regional cup q1')).toThrow('A tournament with this name already exists.');
    });
  });

  describe('updateTournament', () => {
    beforeEach(() => {
      saveTournaments([...sampleTournaments]);
    });

    it('should update an existing tournament\'s name', () => {
      const tournamentToUpdate: Tournament = { ...sampleTournaments[0], name: 'Regional Cup Q1 - Finals' };
      const updatedTournaments = updateTournament(tournamentToUpdate);
      expect(updatedTournaments.find(t => t.id === sampleTournaments[0].id)?.name).toBe('Regional Cup Q1 - Finals');
      expect(getTournaments().find(t => t.id === sampleTournaments[0].id)?.name).toBe('Regional Cup Q1 - Finals');
    });

    it('should throw an error if trying to update a non-existent tournament', () => {
      const nonExistentTournament: Tournament = { id: 't99', name: 'Phantom Tournament' };
      expect(() => updateTournament(nonExistentTournament)).toThrow('Tournament not found for update.');
    });
  });

  describe('deleteTournament', () => {
    beforeEach(() => {
      saveTournaments([...sampleTournaments]);
    });

    it('should delete an existing tournament by ID', () => {
      const tournamentIdToDelete = sampleTournaments[1].id;
      const updatedTournaments = deleteTournament(tournamentIdToDelete);
      expect(updatedTournaments).toHaveLength(sampleTournaments.length - 1);
      expect(updatedTournaments.find(t => t.id === tournamentIdToDelete)).toBeUndefined();
      expect(getTournaments().find(t => t.id === tournamentIdToDelete)).toBeUndefined();
    });

    it('should not change the list and warn if trying to delete a non-existent tournament ID', () => {
      const nonExistentId = 't99';
      const updatedTournaments = deleteTournament(nonExistentId);
      expect(updatedTournaments).toHaveLength(sampleTournaments.length);
      expect(updatedTournaments).toEqual(sampleTournaments);
      expect(consoleWarnSpy).toHaveBeenCalledWith(`Tournament with id ${nonExistentId} not found for deletion.`);
    });

    it('should handle deleting the last tournament', () => {
      saveTournaments([sampleTournaments[0]]);
      const updatedTournaments = deleteTournament(sampleTournaments[0].id);
      expect(updatedTournaments).toEqual([]);
      expect(getTournaments()).toEqual([]);
    });
  });
}); 