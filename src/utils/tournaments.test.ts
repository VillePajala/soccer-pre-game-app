import { TOURNAMENTS_LIST_KEY } from '@/config/constants';
import { getTournaments, saveTournaments, addTournament, updateTournament, deleteTournament } from './tournaments';
import type { Tournament } from '@/types';

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
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[getTournaments]'));
    });
  });

  describe('saveTournaments', () => {
    it('should save tournaments to localStorage and return true', () => {
      const result = saveTournaments(sampleTournaments);
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(TOURNAMENTS_LIST_KEY, JSON.stringify(sampleTournaments));
      expect(JSON.parse(store[TOURNAMENTS_LIST_KEY])).toEqual(sampleTournaments);
    });

    it('should overwrite existing tournaments and return true', () => {
      const initialTournaments: Tournament[] = [{ id: 't0', name: 'Old Cup' }];
      localStorageMock.setItem(TOURNAMENTS_LIST_KEY, JSON.stringify(initialTournaments));
      const result = saveTournaments(sampleTournaments);
      expect(result).toBe(true);
      expect(JSON.parse(store[TOURNAMENTS_LIST_KEY])).toEqual(sampleTournaments);
    });

    it('should return false and log an error if saving fails', () => {
      localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('Storage full'); });
      const result = saveTournaments(sampleTournaments);
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[saveTournaments]'));
    });
  });

  describe('addTournament', () => {
    it('should add a new tournament and return the new object', () => {
      const newTournamentName = 'Newcomers Trophy';
      const newTournament = addTournament(newTournamentName);
      expect(newTournament).not.toBeNull();
      expect(newTournament?.name).toBe(newTournamentName);
      const tournamentsInStorage = getTournaments();
      expect(tournamentsInStorage).toHaveLength(1);
      expect(tournamentsInStorage[0]).toEqual(newTournament);
    });

    it('should add to existing list and return the new object', () => {
      saveTournaments([sampleTournaments[0]]);
      const newTournamentName = 'Invitational Cup';
      const newTournament = addTournament(newTournamentName);
      expect(newTournament).not.toBeNull();
      expect(newTournament?.name).toBe(newTournamentName);
      const tournamentsInStorage = getTournaments();
      expect(tournamentsInStorage).toHaveLength(2);
      expect(tournamentsInStorage.find(t => t.id === newTournament?.id)).toEqual(newTournament);
    });

    it('should trim whitespace from name when adding', () => {
      const newTournamentName = '  Main Event Challenge  ';
      const newTournament = addTournament(newTournamentName);
      expect(newTournament).not.toBeNull();
      expect(newTournament?.name).toBe('Main Event Challenge');
    });

    it('should return null and log error if name is empty', () => {
      expect(addTournament('')).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Tournament name cannot be empty'));
      expect(addTournament('   ')).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    });

    it('should return null and log error if name already exists', () => {
      saveTournaments([sampleTournaments[0]]); // 'Regional Cup Q1'
      const duplicateName = 'regional cup q1';
      expect(addTournament(duplicateName)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`name \"${sampleTournaments[0].name}\" already exists`));
    });

    it('should return null if saving fails during add', () => {
      localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('Save failed'); });
      const newTournamentName = 'Ephemeral Tourney';
      expect(addTournament(newTournamentName)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[saveTournaments]'));
    });
  });

  describe('updateTournament', () => {
    beforeEach(() => {
      saveTournaments([...sampleTournaments]);
    });

    it('should update existing tournament and return updated object', () => {
      const tournamentToUpdate: Tournament = { ...sampleTournaments[0], name: 'Regional Cup Q1 - Finals' };
      const updatedTournament = updateTournament(tournamentToUpdate);
      expect(updatedTournament).not.toBeNull();
      expect(updatedTournament?.name).toBe('Regional Cup Q1 - Finals');
      expect(getTournaments().find(t => t.id === sampleTournaments[0].id)).toEqual(updatedTournament);
    });

    it('should trim whitespace from updated name', () => {
      const tournamentToUpdate: Tournament = { ...sampleTournaments[0], name: '   Regional Cup Q1 Trimmed   ' };
      const updatedTournament = updateTournament(tournamentToUpdate);
      expect(updatedTournament).not.toBeNull();
      expect(updatedTournament?.name).toBe('Regional Cup Q1 Trimmed');
      expect(getTournaments().find(t => t.id === sampleTournaments[0].id)?.name).toBe('Regional Cup Q1 Trimmed');
    });

    it('should return null and log error if trying to update non-existent tournament', () => {
      const nonExistentTournament: Tournament = { id: 't99', name: 'Phantom Tournament' };
      expect(updateTournament(nonExistentTournament)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`Tournament with ID ${nonExistentTournament.id} not found`));
    });

    it('should return null and log error if updated name conflicts with another tournament', () => {
      const tournamentToUpdate: Tournament = { ...sampleTournaments[0], name: sampleTournaments[1].name.toLowerCase() }; // Use name of t2
      expect(updateTournament(tournamentToUpdate)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`Another tournament with name \"${sampleTournaments[1].name}\" already exists`));
    });

    it('should return null if saving fails during update', () => {
      localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('Save failed'); });
      const tournamentToUpdate: Tournament = { ...sampleTournaments[0], name: 'Update Fail Tourney' };
      expect(updateTournament(tournamentToUpdate)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[saveTournaments]'));
    });

    it('should return null and log error for invalid update data', () => {
      const invalidTournament: Tournament = { ...sampleTournaments[0], name: '   ' };
      expect(updateTournament(invalidTournament)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid tournament data provided'));
      const invalidTournamentNoId = { name: 'Valid Name' } as Tournament; // Missing ID
      expect(updateTournament(invalidTournamentNoId)).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledTimes(2); // Called again
    });
  });

  describe('deleteTournament', () => {
    beforeEach(() => {
      saveTournaments([...sampleTournaments]);
    });

    it('should delete existing tournament by ID and return true', () => {
      const tournamentIdToDelete = sampleTournaments[1].id;
      const result = deleteTournament(tournamentIdToDelete);
      expect(result).toBe(true);
      const tournamentsInStorage = getTournaments();
      expect(tournamentsInStorage).toHaveLength(sampleTournaments.length - 1);
      expect(tournamentsInStorage.find((t: Tournament) => t.id === tournamentIdToDelete)).toBeUndefined();
    });

    it('should return false and log error if trying to delete non-existent ID', () => {
      const nonExistentId = 't99';
      const result = deleteTournament(nonExistentId);
      expect(result).toBe(false);
      expect(getTournaments()).toHaveLength(sampleTournaments.length);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`Tournament with id ${nonExistentId} not found`));
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should handle deleting last tournament and return true', () => {
      saveTournaments([sampleTournaments[0]]);
      const result = deleteTournament(sampleTournaments[0].id);
      expect(result).toBe(true);
      expect(getTournaments()).toEqual([]);
    });

    it('should return false if saving fails during delete', () => {
      localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('Save failed'); });
      const tournamentIdToDelete = sampleTournaments[1].id;
      expect(deleteTournament(tournamentIdToDelete)).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[saveTournaments]'));
      expect(getTournaments().find((t: Tournament) => t.id === tournamentIdToDelete)).toBeDefined();
    });

    it('should return false and log error for invalid delete ID', () => {
      expect(deleteTournament('')).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid tournament ID provided'));
    });
  });
}); 