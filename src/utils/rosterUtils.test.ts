import { Player } from '@/app/page';
import { MASTER_ROSTER_KEY } from '@/config/constants';
import { 
    getMasterRoster, 
    saveMasterRoster, 
    addPlayerToRoster, 
    updatePlayerInRoster, 
    removePlayerFromRoster, 
    setPlayerGoalieStatus 
} from './rosterUtils';

// Mock localStorage using the setup from setupTests.js approach
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = String(value); }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    getAll: jest.fn(() => store),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Helper to create player data
const createPlayerData = (overrides: Partial<Omit<Player, 'id' | 'isGoalie'> > = {}): Omit<Player, 'id' | 'isGoalie'> => ({
  name: 'Test Player',
  jerseyNumber: '00',
  nickname: 'Tester',
  notes: '',
  ...overrides,
});

// --- Test Suite ---
describe('rosterUtils', () => {

  beforeEach(() => {
    // Clear mocks and storage before each test
    localStorageMock.clear();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
  });

  // --- getMasterRoster --- 
  describe('getMasterRoster', () => {
    it('should return an empty array if localStorage is empty', () => {
      expect(getMasterRoster()).toEqual([]);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(MASTER_ROSTER_KEY);
    });

    it('should return the parsed roster from localStorage', () => {
      const mockRoster: Player[] = [{ id: 'p1', name: 'Player 1', isGoalie: false }];
      localStorageMock.setItem(MASTER_ROSTER_KEY, JSON.stringify(mockRoster));
      expect(getMasterRoster()).toEqual(mockRoster);
    });

    it('should return an empty array if localStorage contains invalid JSON', () => {
      localStorageMock.setItem(MASTER_ROSTER_KEY, 'invalid json');
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {}); // Suppress error log
      expect(getMasterRoster()).toEqual([]);
      expect(consoleErrorSpy).toHaveBeenCalled();
      consoleErrorSpy.mockRestore();
    });
  });

  // --- saveMasterRoster --- 
  describe('saveMasterRoster', () => {
    it('should stringify and save the roster to localStorage', () => {
      const rosterToSave: Player[] = [{ id: 'p2', name: 'Player 2', isGoalie: false }];
      saveMasterRoster(rosterToSave);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(MASTER_ROSTER_KEY, JSON.stringify(rosterToSave));
    });

    // Optional: Test error handling (e.g., quota exceeded), requires mocking setItem to throw
  });

  // --- addPlayerToRoster --- 
  describe('addPlayerToRoster', () => {
    it('should add a new player to an empty roster', () => {
      const playerData = createPlayerData({ name: 'Alice' });
      const addedPlayer = addPlayerToRoster(playerData);
      
      expect(addedPlayer).not.toBeNull();
      expect(addedPlayer?.name).toBe('Alice');
      expect(addedPlayer?.id).toBeDefined();
      expect(addedPlayer?.isGoalie).toBe(false);

      const storedRoster = getMasterRoster();
      expect(storedRoster).toHaveLength(1);
      expect(storedRoster[0]).toEqual(addedPlayer);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1); // Initial save
    });

    it('should add a player to an existing roster', () => {
      const initialRoster: Player[] = [{ id: 'p1', name: 'Bob', isGoalie: false }];
      saveMasterRoster(initialRoster);
      localStorageMock.setItem.mockClear(); // Clear initial save call

      const playerData = createPlayerData({ name: 'Charlie' });
      const addedPlayer = addPlayerToRoster(playerData);

      expect(addedPlayer?.name).toBe('Charlie');
      const storedRoster = getMasterRoster();
      expect(storedRoster).toHaveLength(2);
      expect(storedRoster.find(p => p.id === addedPlayer?.id)).toBeDefined();
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1); // Roster save call
    });

    // Optional: Test duplicate checking if implemented
  });

  // --- updatePlayerInRoster ---
  describe('updatePlayerInRoster', () => {
    it('should update the specified player fields', () => {
      const player1: Player = { id: 'p1', name: 'David', jerseyNumber: '10', isGoalie: false };
      saveMasterRoster([player1]);
      localStorageMock.setItem.mockClear();

      const updates: Partial<Omit<Player, 'id'>> = { name: 'David Updated', jerseyNumber: '11' };
      const updatedPlayer = updatePlayerInRoster(player1.id, updates);

      expect(updatedPlayer).not.toBeNull();
      expect(updatedPlayer?.id).toBe(player1.id); // Ensure ID didn't change
      expect(updatedPlayer?.name).toBe('David Updated');
      expect(updatedPlayer?.jerseyNumber).toBe('11');
      expect(updatedPlayer?.isGoalie).toBe(false); // Unchanged field

      const storedRoster = getMasterRoster();
      expect(storedRoster).toHaveLength(1);
      expect(storedRoster[0]).toEqual(updatedPlayer);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });

    it('should return null if player ID is not found', () => {
      saveMasterRoster([{ id: 'p1', name: 'Existing', isGoalie: false }]);
      localStorageMock.setItem.mockClear();

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = updatePlayerInRoster('non-existent-id', { name: 'No Name' });

      expect(result).toBeNull();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('not found for update'));
      consoleWarnSpy.mockRestore();
    });
  });

  // --- removePlayerFromRoster ---
  describe('removePlayerFromRoster', () => {
    it('should remove the player with the specified ID', () => {
      const player1: Player = { id: 'p1', name: 'Eve', isGoalie: false };
      const player2: Player = { id: 'p2', name: 'Frank', isGoalie: false };
      saveMasterRoster([player1, player2]);
      localStorageMock.setItem.mockClear();

      const result = removePlayerFromRoster(player1.id);

      expect(result).toBe(true);
      const storedRoster = getMasterRoster();
      expect(storedRoster).toHaveLength(1);
      expect(storedRoster[0].id).toBe(player2.id);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });

    it('should return false if player ID is not found', () => {
      saveMasterRoster([{ id: 'p1', name: 'Grace', isGoalie: false }]);
      localStorageMock.setItem.mockClear();

      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = removePlayerFromRoster('non-existent-id');

      expect(result).toBe(false);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      expect(getMasterRoster()).toHaveLength(1); // Roster unchanged
      expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('not found for removal'));
      consoleWarnSpy.mockRestore();
    });
  });

  // --- setPlayerGoalieStatus ---
  describe('setPlayerGoalieStatus', () => {
    it('should set the specified player as goalie', () => {
      const player1: Player = { id: 'p1', name: 'Heidi', isGoalie: false };
      saveMasterRoster([player1]);
      localStorageMock.setItem.mockClear();

      const updatedPlayer = setPlayerGoalieStatus(player1.id, true);

      expect(updatedPlayer?.isGoalie).toBe(true);
      const storedRoster = getMasterRoster();
      expect(storedRoster[0].isGoalie).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });

    it('should unset the goalie status if isGoalie is false', () => {
      const player1: Player = { id: 'p1', name: 'Ivan', isGoalie: true };
      saveMasterRoster([player1]);
      localStorageMock.setItem.mockClear();

      const updatedPlayer = setPlayerGoalieStatus(player1.id, false);

      expect(updatedPlayer?.isGoalie).toBe(false);
      const storedRoster = getMasterRoster();
      expect(storedRoster[0].isGoalie).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });

    it('should unset other goalies when setting a new one', () => {
      const player1: Player = { id: 'p1', name: 'Judy', isGoalie: true };
      const player2: Player = { id: 'p2', name: 'Mallory', isGoalie: false };
      saveMasterRoster([player1, player2]);
      localStorageMock.setItem.mockClear();

      const updatedPlayer = setPlayerGoalieStatus(player2.id, true);

      expect(updatedPlayer?.id).toBe(player2.id);
      expect(updatedPlayer?.isGoalie).toBe(true);

      const storedRoster = getMasterRoster();
      expect(storedRoster).toHaveLength(2);
      expect(storedRoster.find(p => p.id === player1.id)?.isGoalie).toBe(false); // Old goalie unset
      expect(storedRoster.find(p => p.id === player2.id)?.isGoalie).toBe(true); // New goalie set
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1);
    });

    it('should return null if player ID is not found', () => {
       const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
       const result = setPlayerGoalieStatus('non-existent-id', true);
       expect(result).toBeNull();
       expect(localStorageMock.setItem).not.toHaveBeenCalled();
       expect(consoleWarnSpy).toHaveBeenCalledWith(expect.stringContaining('not found for setting goalie status'));
       consoleWarnSpy.mockRestore();
    });
  });

}); 