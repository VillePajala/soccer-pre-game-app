import { TOURNAMENTS_LIST_KEY } from '@/config/constants';
import { 
  getTournaments, 
  addTournament, 
  updateTournament, 
  deleteTournament,
  saveTournaments // We will test this directly, and also its effects when called by others
} from './tournaments'; 
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
    length: 0,
    key: jest.fn((_index: number) => undefined) 
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });

describe('Tournament Management Utilities (localStorage)', () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    // Reset localStorage mocks and store
    localStorageMock.getItem.mockReset();
    localStorageMock.setItem.mockReset();
    localStorageMock.removeItem.mockReset();
    localStorageMock.clear.mockReset();
    store = {};

    // Default implementations
    localStorageMock.getItem.mockImplementation((key: string) => store[key] || null);
    localStorageMock.setItem.mockImplementation((key: string, value: string) => {
      store[key] = String(value);
    });


    // Setup console spies for each test
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console spies after each test
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });

  const sampleTournaments: Tournament[] = [
    { id: 't1', name: 'Regional Cup Q1' },
    { id: 't2', name: 'Champions League Pre-Season' },
    { id: 't3', name: 'Local Charity Shield' },
  ];

  describe('getTournaments', () => {
    it('should return an empty array if no tournaments are in localStorage', async () => {
      // localStorageMock.getItem will return null by default if store is empty
      expect(await getTournaments()).toEqual([]);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(TOURNAMENTS_LIST_KEY);
    });

    it('should return tournaments from localStorage if they exist', async () => {
      store[TOURNAMENTS_LIST_KEY] = JSON.stringify(sampleTournaments);
      expect(await getTournaments()).toEqual(sampleTournaments);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(TOURNAMENTS_LIST_KEY);
    });

    it('should return an empty array and log an error if localStorage data is malformed', async () => {
      localStorageMock.getItem.mockReturnValue('invalid-json-format');
      expect(await getTournaments()).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[getTournaments] Error getting tournaments from localStorage:'), expect.any(SyntaxError));
    });
  });

  describe('saveTournaments (direct test of the utility)', () => {
    it('should save tournaments to localStorage and return true', async () => {
      const result = await saveTournaments(sampleTournaments);
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(TOURNAMENTS_LIST_KEY, JSON.stringify(sampleTournaments));
      expect(JSON.parse(store[TOURNAMENTS_LIST_KEY])).toEqual(sampleTournaments);
    });

    it('should overwrite existing tournaments and return true', async () => {
      const initialTournaments: Tournament[] = [{ id: 't0', name: 'Old Cup' }];
      store[TOURNAMENTS_LIST_KEY] = JSON.stringify(initialTournaments); 

      const result = await saveTournaments(sampleTournaments);
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(TOURNAMENTS_LIST_KEY, JSON.stringify(sampleTournaments));
      expect(JSON.parse(store[TOURNAMENTS_LIST_KEY])).toEqual(sampleTournaments);
    });

    it('should return false and log an error if saving fails (localStorage.setItem throws)', async () => {
      const errorMsg = 'Storage full';
      localStorageMock.setItem.mockImplementationOnce(() => { 
        throw new Error(errorMsg); 
      });
      const result = await saveTournaments(sampleTournaments);
      expect(result).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(TOURNAMENTS_LIST_KEY, JSON.stringify(sampleTournaments));
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[saveTournaments] Error saving tournaments to localStorage:'), expect.objectContaining({ message: errorMsg }));
    });
  });

  describe('addTournament', () => {
    beforeEach(async () => {
      // Start with an empty list of tournaments in localStorage for most add tests
      store[TOURNAMENTS_LIST_KEY] = JSON.stringify([]);
    });
    
    it('should add a new tournament, save it, and return the new object', async () => {
      const newTournamentName = 'Newcomers Trophy';
      const newTournament = await addTournament(newTournamentName);
      
      expect(newTournament).not.toBeNull();
      expect(newTournament?.name).toBe(newTournamentName);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1); // Called by saveTournaments
      
      const storedTournaments = JSON.parse(store[TOURNAMENTS_LIST_KEY]);
      expect(storedTournaments.length).toBe(1);
      expect(storedTournaments[0]).toEqual(expect.objectContaining({ name: newTournamentName }));
    });

    it('should add to an existing list, save it, and return the new object', async () => {
      store[TOURNAMENTS_LIST_KEY] = JSON.stringify([sampleTournaments[0]]); // Prime with one tournament
      
      const newTournamentName = 'Invitational Cup';
      const newTournament = addTournament(newTournamentName);

      expect(newTournament).not.toBeNull();
      expect(newTournament?.name).toBe(newTournamentName);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);

      const storedTournaments = JSON.parse(store[TOURNAMENTS_LIST_KEY]);
      expect(storedTournaments.length).toBe(2);
      expect(storedTournaments).toEqual(expect.arrayContaining([
        sampleTournaments[0],
        expect.objectContaining({ name: newTournamentName })
      ]));
    });
    
    it('should return null if underlying saveTournaments fails (e.g., localStorage.setItem throws)', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Simulated localStorage error during save');
      });
      const newTournamentName = 'Ephemeral Tourney';
      const result = addTournament(newTournamentName);
      
      expect(result).toBeNull();
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1); // Attempted to save
      // Check for the error logged by saveTournaments
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[saveTournaments] Error saving tournaments to localStorage:'), expect.any(Error));
    });

    it('should return null and log error if name is empty, without attempting to save', () => {
      const result = addTournament('');
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[addTournament] Validation failed: Tournament name cannot be empty.'));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should return null and log error if name already exists (case-insensitive), without attempting to save', () => {
      store[TOURNAMENTS_LIST_KEY] = JSON.stringify([sampleTournaments[0]]); // 'Regional Cup Q1'
      const duplicateName = 'regional cup q1';
      const result = addTournament(duplicateName);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`[addTournament] Validation failed: A tournament with name "${duplicateName}" already exists.`));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('updateTournament', () => {
    beforeEach(() => {
      store[TOURNAMENTS_LIST_KEY] = JSON.stringify([...sampleTournaments]);
    });

    it('should update existing tournament, save it, and return updated object', () => {
      const tournamentToUpdate: Tournament = { ...sampleTournaments[0], name: 'Regional Cup Q1 - Finals' };
      const updatedTournament = updateTournament(tournamentToUpdate);
      
      expect(updatedTournament).not.toBeNull();
      expect(updatedTournament?.name).toBe('Regional Cup Q1 - Finals');
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);

      const storedTournaments = JSON.parse(store[TOURNAMENTS_LIST_KEY]);
      const changed = storedTournaments.find((t: Tournament) => t.id === tournamentToUpdate.id);
      expect(changed?.name).toBe('Regional Cup Q1 - Finals');
    });

    it('should return null if underlying saveTournaments fails (e.g., localStorage.setItem throws)', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Simulated localStorage error during save');
      });
      const tournamentToUpdate: Tournament = { ...sampleTournaments[0], name: 'Update Fail Tourney' };
      const result = updateTournament(tournamentToUpdate);
      
      expect(result).toBeNull();
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1); // Attempted to save
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[saveTournaments] Error saving tournaments to localStorage:'), expect.any(Error));
    });

    it('should return null and log error if tournament to update is not found, without attempting to save', () => {
      const nonExistentTournament: Tournament = { id: 't99', name: 'Phantom Tournament' };
      const result = updateTournament(nonExistentTournament);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`[updateTournament] Tournament with ID ${nonExistentTournament.id} not found.`));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
    
    it('should return null and log error if updated name conflicts, without attempting to save', () => {
      const conflictingName = sampleTournaments[1].name.toUpperCase(); // "CHAMPIONS LEAGUE PRE-SEASON"
      const tournamentToUpdate: Tournament = { ...sampleTournaments[0], name: conflictingName };
      const result = updateTournament(tournamentToUpdate);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`[updateTournament] Validation failed: Another tournament with name "${conflictingName}" already exists.`));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should return null for invalid update data (e.g., empty name), without attempting to save', () => {
      const invalidTournament: Tournament = { ...sampleTournaments[0], name: '   ' };
      const result = updateTournament(invalidTournament);

      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[updateTournament] Invalid tournament data provided for update.'));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('deleteTournament', () => {
    beforeEach(() => {
      store[TOURNAMENTS_LIST_KEY] = JSON.stringify([...sampleTournaments]);
    });

    it('should delete existing tournament by ID, save, and return true', () => {
      const tournamentIdToDelete = sampleTournaments[1].id;
      const result = deleteTournament(tournamentIdToDelete);
      
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);

      const storedTournaments = JSON.parse(store[TOURNAMENTS_LIST_KEY]);
      expect(storedTournaments.find((t: Tournament) => t.id === tournamentIdToDelete)).toBeUndefined();
      expect(storedTournaments.length).toBe(sampleTournaments.length - 1);
    });

    it('should return false if underlying saveTournaments fails (e.g., localStorage.setItem throws)', () => {
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Simulated localStorage error during save');
      });
      const tournamentIdToDelete = sampleTournaments[1].id;
      const result = deleteTournament(tournamentIdToDelete);
      
      expect(result).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1); // Attempted to save
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[saveTournaments] Error saving tournaments to localStorage:'), expect.any(Error));
    });

    it('should return false and log error if tournament to delete is not found, without attempting to save', () => {
      const nonExistentId = 't99';
      const result = deleteTournament(nonExistentId);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining(`[deleteTournament] Tournament with id ${nonExistentId} not found.`));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
    
    it('should return false for invalid delete ID, without attempting to save', () => {
      const result = deleteTournament('');
      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('[deleteTournament] Invalid tournament ID provided.'));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });
}); 