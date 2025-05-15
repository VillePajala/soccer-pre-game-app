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
  const mockPlayers: Player[] = [
    { id: 'player_1', name: 'John Doe', jerseyNumber: '10', isGoalie: false, receivedFairPlayCard: false },
    { id: 'player_2', name: 'Jane Smith', jerseyNumber: '7', isGoalie: true, receivedFairPlayCard: false }
  ];

  const localStorageMock = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    clear: jest.fn(),
    removeItem: jest.fn(),
    length: 0,
    key: jest.fn()
  };

  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.setItem.mockReset();
    localStorageMock.setItem.mockImplementation(() => {}); 
    localStorageMock.getItem.mockReset();
  });

  describe('getMasterRoster', () => {
    it('should return an empty array if no roster is stored', async () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = await getMasterRoster();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith(MASTER_ROSTER_KEY);
      expect(result).toEqual([]);
    });

    it('should return the parsed roster if it exists', async () => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
      
      const result = await getMasterRoster();
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith(MASTER_ROSTER_KEY);
      expect(result).toEqual(mockPlayers);
    });

    it('should return an empty array and log error if JSON is invalid', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const result = await getMasterRoster();
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('saveMasterRoster', () => {
    it('should save the roster to localStorage and return true', async () => {
      const result = await saveMasterRoster(mockPlayers); 
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        JSON.stringify(mockPlayers)
      );
    });

    it('should return false and log error if localStorage throws', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const error = new Error('Storage quota exceeded');
      localStorageMock.setItem.mockImplementation(() => { throw error; });
      
      const result = await saveMasterRoster(mockPlayers); 
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[saveMasterRoster]'), error);
      consoleSpy.mockRestore();
    });
  });

  describe('addPlayerToRoster', () => {
    it('should add a player to the roster and return the player object', async () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([])); 

      const playerData = { name: 'New Player', jerseyNumber: '23' };
      const result = await addPlayerToRoster(playerData);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe(playerData.name);
      expect(result?.jerseyNumber).toBe(playerData.jerseyNumber);
      expect(result?.id).toContain('player_');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.stringContaining('New Player')
      );
    });

    it('should trim whitespace from player name', async () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([]));
      const playerData = { name: '  Trimmed Player  ' };
      const result = await addPlayerToRoster(playerData);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Trimmed Player');
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should return null and log error if player name is empty', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const playerData = { name: '   ' };
      const result = await addPlayerToRoster(playerData);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player name cannot be empty'));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return null if saving fails during add', async () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([]));
      const saveError = new Error('Save failed!');
      localStorageMock.setItem.mockImplementation(() => { throw saveError; });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await addPlayerToRoster({ name: 'Valid Player' });

      expect(result).toBeNull();
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[saveMasterRoster]'), saveError);
      consoleSpy.mockRestore();
    });
  });

  describe('updatePlayerInRoster', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
    });

    it('should update an existing player and return the updated object', async () => {
      const updateData = { name: 'Updated Name', jerseyNumber: '99' };
      const result = await updatePlayerInRoster('player_1', updateData);
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('player_1');
      expect(result?.name).toBe(updateData.name);
      expect(result?.jerseyNumber).toBe(updateData.jerseyNumber);
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.stringContaining('Updated Name')
      );
    });

    it('should trim whitespace from updated player name', async () => {
      const updateData = { name: '  Trimmed Update   ' };
      const result = await updatePlayerInRoster('player_1', updateData);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Trimmed Update');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.stringContaining('Trimmed Update')
      );
    });

    it('should return null and log error if player not found', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const updateData = { name: 'Updated Name' };
      const result = await updatePlayerInRoster('non_existent_id', updateData);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player with ID non_existent_id not found'));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return null and log error if updated player name is empty', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const updateData = { name: '   ' };
      const result = await updatePlayerInRoster('player_1', updateData);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player name cannot be empty'));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return null if saving fails during update', async () => {
      const saveError = new Error('Save failed!');
      localStorageMock.setItem.mockImplementation(() => { throw saveError; });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await updatePlayerInRoster('player_1', { name: 'Valid Update' });

      expect(result).toBeNull();
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[saveMasterRoster]'), saveError);
      consoleSpy.mockRestore();
    });

    it('should return null and log error if playerId is invalid', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await updatePlayerInRoster('', { name: 'Test' });
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player ID cannot be empty'));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('removePlayerFromRoster', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
    });

    it('should remove a player and return true if successful', async () => {
      const result = await removePlayerFromRoster('player_1');
      expect(result).toBe(true);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.not.stringContaining('player_1')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.stringContaining('player_2') 
      );
    });

    it('should return false if player not found', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await removePlayerFromRoster('non_existent_id');
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player with ID non_existent_id not found'));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return false if saving fails during remove', async () => {
      const saveError = new Error('Save failed!');
      localStorageMock.setItem.mockImplementation(() => { throw saveError; });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await removePlayerFromRoster('player_1');

      expect(result).toBe(false);
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[saveMasterRoster]'), saveError);
      consoleSpy.mockRestore();
    });

    it('should return false and log error if playerId is invalid', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await removePlayerFromRoster('');
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player ID cannot be empty'));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('setPlayerGoalieStatus', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
    });

    it('should update player goalie status and return the player object', async () => {
      const result = await setPlayerGoalieStatus('player_1', true);
      expect(result).not.toBeNull();
      expect(result?.isGoalie).toBe(true);
      expect(result?.id).toBe('player_1');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.stringContaining('"isGoalie":true')
      );
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.stringContaining('player_1')
      );
    });

    it('should return null if player not found', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await setPlayerGoalieStatus('non_existent_id', true);
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player with ID non_existent_id not found'));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return null if saving fails', async () => {
      const saveError = new Error('Save failed!');
      localStorageMock.setItem.mockImplementation(() => { throw saveError; });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await setPlayerGoalieStatus('player_1', true);

      expect(result).toBeNull();
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[saveMasterRoster]'), saveError);
      consoleSpy.mockRestore();
    });
  });

  describe('setPlayerFairPlayCardStatus', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
    });

    it('should update player fair play status and return the player object', async () => {
      const result = await setPlayerFairPlayCardStatus('player_2', true);
      expect(result).not.toBeNull();
      expect(result?.receivedFairPlayCard).toBe(true);
      expect(result?.id).toBe('player_2');
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.stringContaining('"receivedFairPlayCard":true')
      );
       expect(localStorageMock.setItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.stringContaining('player_2')
      );
    });

    it('should return null if player not found', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await setPlayerFairPlayCardStatus('non_existent_id', true);
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player with ID non_existent_id not found'));
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return null if saving fails', async () => {
      const saveError = new Error('Save failed!');
      localStorageMock.setItem.mockImplementation(() => { throw saveError; });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await setPlayerFairPlayCardStatus('player_1', true);

      expect(result).toBeNull();
      expect(localStorageMock.setItem).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[saveMasterRoster]'), saveError); 
      consoleSpy.mockRestore();
    });
  });
}); 