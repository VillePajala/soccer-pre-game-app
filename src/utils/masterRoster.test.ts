import { 
  getMasterRoster,
  saveMasterRoster,
  addPlayerToRoster,
  updatePlayerInRoster,
  removePlayerFromRoster,
  setPlayerGoalieStatus,
  setPlayerFairPlayCardStatus
} from './masterRoster';
import { MASTER_ROSTER_KEY } from '@/config/constants';
import type { Player } from '@/types';

describe('Master Roster Utilities', () => {
  // Setup mock data
  const mockPlayers: Player[] = [
    { id: 'player_1', name: 'John Doe', jerseyNumber: '10', isGoalie: false, receivedFairPlayCard: false },
    { id: 'player_2', name: 'Jane Smith', jerseyNumber: '7', isGoalie: true, receivedFairPlayCard: false }
  ];

  // Mock localStorage
  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn(),
    length: 0,
    key: jest.fn()
  };

  // Replace global localStorage with mock
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('getMasterRoster', () => {
    it('should return an empty array if no roster is stored', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = getMasterRoster();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith(MASTER_ROSTER_KEY);
      expect(result).toEqual([]);
    });

    it('should return the parsed roster if it exists', () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
      
      const result = getMasterRoster();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith(MASTER_ROSTER_KEY);
      expect(result).toEqual(mockPlayers);
    });

    it('should return an empty array and log error if JSON is invalid', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const result = getMasterRoster();
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('saveMasterRoster', () => {
    it('should save the roster to localStorage', () => {
      saveMasterRoster(mockPlayers);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        JSON.stringify(mockPlayers)
      );
    });

    it('should log error if localStorage throws', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Storage quota exceeded');
      localStorageMock.setItem.mockImplementation(() => { throw error; });
      
      saveMasterRoster(mockPlayers);
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('addPlayerToRoster', () => {
    it('should add a player to the roster with generated ID', () => {
      // Mock getCurrentRoster to return empty array
      localStorageMock.getItem.mockReturnValue(JSON.stringify([]));
      
      const playerData = { name: 'New Player', jerseyNumber: '23' };
      const result = addPlayerToRoster(playerData);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe(playerData.name);
      expect(result?.jerseyNumber).toBe(playerData.jerseyNumber);
      expect(result?.id).toContain('player_');
      
      // Verify localStorage was updated
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.any(String)
      );
    });

    it('should return null if player name is empty', () => {
      const playerData = { name: '' };
      const result = addPlayerToRoster(playerData);
      
      expect(result).toBeNull();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('updatePlayerInRoster', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
    });

    it('should update an existing player', () => {
      const updateData = { name: 'Updated Name', jerseyNumber: '99' };
      const result = updatePlayerInRoster('player_1', updateData);
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('player_1');
      expect(result?.name).toBe(updateData.name);
      expect(result?.jerseyNumber).toBe(updateData.jerseyNumber);
      
      // Verify localStorage was updated with player_1 having new data
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.stringContaining('Updated Name')
      );
    });

    it('should return null if player not found', () => {
      const updateData = { name: 'Updated Name' };
      const result = updatePlayerInRoster('non_existent_id', updateData);
      
      expect(result).toBeNull();
      // localStorage should not be updated
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should not allow empty player name', () => {
      const updateData = { name: '' };
      const result = updatePlayerInRoster('player_1', updateData);
      
      expect(result).toBeNull();
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('removePlayerFromRoster', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
    });

    it('should remove a player and return true if successful', () => {
      const result = removePlayerFromRoster('player_1');
      
      expect(result).toBe(true);
      
      // Verify localStorage was updated without player_1
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.not.stringContaining('John Doe')
      );
    });

    it('should return false if player not found', () => {
      const result = removePlayerFromRoster('non_existent_id');
      
      expect(result).toBe(false);
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('setPlayerGoalieStatus', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
    });

    it('should update goalie status to true', () => {
      const result = setPlayerGoalieStatus('player_1', true);
      
      expect(result).not.toBeNull();
      expect(result?.isGoalie).toBe(true);
      
      // Verify localStorage was updated
      const updatedRosterString = localStorageMock.setItem.mock.calls[0][1];
      const updatedRoster = JSON.parse(updatedRosterString);
      const updatedPlayer = updatedRoster.find((p: Player) => p.id === 'player_1');
      expect(updatedPlayer.isGoalie).toBe(true);
    });

    it('should update goalie status to false', () => {
      // player_2 is already goalie
      const result = setPlayerGoalieStatus('player_2', false);
      
      expect(result).not.toBeNull();
      expect(result?.isGoalie).toBe(false);
    });
  });

  describe('setPlayerFairPlayCardStatus', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
    });

    it('should update fair play card status', () => {
      const result = setPlayerFairPlayCardStatus('player_1', true);
      
      expect(result).not.toBeNull();
      expect(result?.receivedFairPlayCard).toBe(true);
      
      // Verify localStorage was updated
      const updatedRosterString = localStorageMock.setItem.mock.calls[0][1];
      const updatedRoster = JSON.parse(updatedRosterString);
      const updatedPlayer = updatedRoster.find((p: Player) => p.id === 'player_1');
      expect(updatedPlayer.receivedFairPlayCard).toBe(true);
    });
  });
}); 