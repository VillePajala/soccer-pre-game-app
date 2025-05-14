import { 
  getMasterRoster,
  // saveMasterRoster, // No longer directly imported for tests, mock is used by other fns
  addPlayerToRoster,
  updatePlayerInRoster,
  removePlayerFromRoster,
  setPlayerGoalieStatus,
  setPlayerFairPlayCardStatus
} from './masterRoster';
import { MASTER_ROSTER_KEY } from '@/config/constants';
import type { Player } from '@/types';

jest.mock('./masterRoster', () => ({
  ...jest.requireActual('./masterRoster'),
  saveMasterRoster: jest.fn(), // This mock will be configured in tests
}));

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
    // Ensure the mock for saveMasterRoster (if used by other fns) is reset or set to a default
    (jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster.mockReset();
  });

  afterEach(() => {
    // jest.resetAllMocks(); // Covered by clearAllMocks in beforeEach for this structure
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
    const { saveMasterRoster: actualSaveMasterRoster } = jest.requireActual<typeof import('./masterRoster')>('./masterRoster');

    it('should save the roster to localStorage and return true', async () => {
      const result = await actualSaveMasterRoster(mockPlayers);
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
      
      const result = await actualSaveMasterRoster(mockPlayers);
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[saveMasterRoster]'), error);
      consoleSpy.mockRestore();
    });
  });

  describe('addPlayerToRoster', () => {
    it('should add a player to the roster and return the player object', async () => {
      // Mock getMasterRoster to return empty array initially
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([])); 
      // Mock saveMasterRoster to succeed
      (jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster.mockResolvedValue(true);


      const playerData = { name: 'New Player', jerseyNumber: '23' };
      const result = await addPlayerToRoster(playerData);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe(playerData.name);
      expect(result?.jerseyNumber).toBe(playerData.jerseyNumber);
      expect(result?.id).toContain('player_');
      
      // Verify saveMasterRoster was called correctly
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'New Player' })])
      );
    });

    it('should trim whitespace from player name', async () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([]));
      (jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster.mockResolvedValue(true);
      const playerData = { name: '  Trimmed Player  ' };
      const result = await addPlayerToRoster(playerData);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Trimmed Player');
    });

    it('should return null and log error if player name is empty', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const playerData = { name: '   ' };
      const result = await addPlayerToRoster(playerData);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player name cannot be empty'));
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return null if saving fails during add', async () => {
      localStorageMock.getItem.mockReturnValueOnce(JSON.stringify([]));
      // Mock saveMasterRoster to fail
      (jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster.mockResolvedValue(false);
      // Spy on console.error for saveMasterRoster's internal logging
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await addPlayerToRoster({ name: 'Valid Player' });

      expect(result).toBeNull();
      // Check that saveMasterRoster was called, and it would have logged its own error
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).toHaveBeenCalled();
      // We expect saveMasterRoster to log its own error, so we don't double-check the message here if it's specific to saveMasterRoster
      // If addPlayerToRoster had its own distinct error for this case, we'd check that.
      // For now, just ensure console.error was called, implying saveMasterRoster handled logging.
      // If saveMasterRoster itself wasn't mocked but its localStorage.setItem was, then we'd assert the specific saveMasterRoster error message.
      expect(consoleSpy).toHaveBeenCalled(); // At least one error was logged (likely from saveMasterRoster)
      consoleSpy.mockRestore();
    });
  });

  describe('updatePlayerInRoster', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
    });

    it('should update an existing player and return the updated object', async () => {
      (jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster.mockResolvedValue(true);
      const updateData = { name: 'Updated Name', jerseyNumber: '99' };
      const result = await updatePlayerInRoster('player_1', updateData);
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('player_1');
      expect(result?.name).toBe(updateData.name);
      expect(result?.jerseyNumber).toBe(updateData.jerseyNumber);
      
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 'player_1', name: 'Updated Name' })])
      );
    });

    it('should trim whitespace from updated player name', async () => {
      (jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster.mockResolvedValue(true);
      const updateData = { name: '  Trimmed Update   ' };
      const result = await updatePlayerInRoster('player_1', updateData);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Trimmed Update');
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ name: 'Trimmed Update' })])
      );
    });

    it('should return null and log error if player not found', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const updateData = { name: 'Updated Name' };
      const result = await updatePlayerInRoster('non_existent_id', updateData);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player with ID non_existent_id not found'));
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return null and log error if updated player name is empty', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const updateData = { name: '   ' };
      const result = await updatePlayerInRoster('player_1', updateData);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player name cannot be empty'));
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return null if saving fails during update', async () => {
      (jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster.mockResolvedValue(false);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await updatePlayerInRoster('player_1', { name: 'Valid Update' });

      expect(result).toBeNull();
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).toHaveBeenCalled();
      // saveMasterRoster would log its own error.
      expect(consoleSpy).toHaveBeenCalled(); 
      consoleSpy.mockRestore();
    });

    it('should return null and log error if playerId is invalid', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await updatePlayerInRoster('', { name: 'Test' });
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player ID cannot be empty'));
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('removePlayerFromRoster', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
    });

    it('should remove a player and return true if successful', async () => {
      (jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster.mockResolvedValue(true);
      const result = await removePlayerFromRoster('player_1');
      
      expect(result).toBe(true);
      
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).toHaveBeenCalledWith(
        expect.not.arrayContaining([expect.objectContaining({ id: 'player_1' })])
      );
    });

    it('should return false and log error if player not found', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await removePlayerFromRoster('non_existent_id');
      
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player with ID non_existent_id not found'));
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return false if saving fails during remove', async () => {
      (jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster.mockResolvedValue(false);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await removePlayerFromRoster('player_1');
      
      expect(result).toBe(false);
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).toHaveBeenCalled();
      // saveMasterRoster would log its own error.
      expect(consoleSpy).toHaveBeenCalled(); 
      consoleSpy.mockRestore();
    });

    it('should return false and log error if playerId is invalid', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await removePlayerFromRoster('');
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player ID cannot be empty'));
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('setPlayerGoalieStatus', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
    });

    it('should update player goalie status and return the player object', async () => {
      (jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster.mockResolvedValue(true);
      const result = await setPlayerGoalieStatus('player_1', true);
      
      expect(result).not.toBeNull();
      expect(result?.isGoalie).toBe(true);
      expect(result?.id).toBe('player_1');
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 'player_1', isGoalie: true })])
      );
    });

    it('should return null if player not found', async () => {
      (jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster.mockResolvedValue(true); // save won't be called
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await setPlayerGoalieStatus('non_existent_id', true);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player with ID non_existent_id not found'));
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return null if saving fails', async () => {
      (jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster.mockResolvedValue(false);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await setPlayerGoalieStatus('player_1', true);

      expect(result).toBeNull();
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled(); // saveMasterRoster logs
      consoleSpy.mockRestore();
    });
  });

  describe('setPlayerFairPlayCardStatus', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
    });

    it('should update player fair play status and return the player object', async () => {
      (jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster.mockResolvedValue(true);
      const result = await setPlayerFairPlayCardStatus('player_2', true);
      
      expect(result).not.toBeNull();
      expect(result?.receivedFairPlayCard).toBe(true);
      expect(result?.id).toBe('player_2');
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ id: 'player_2', receivedFairPlayCard: true })])
      );
    });

    it('should return null if player not found', async () => {
      (jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster.mockResolvedValue(true);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await setPlayerFairPlayCardStatus('non_existent_id', true);
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player with ID non_existent_id not found'));
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should return null if saving fails', async () => {
      (jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster.mockResolvedValue(false);
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const result = await setPlayerFairPlayCardStatus('player_1', true);

      expect(result).toBeNull();
      expect((jest.requireMock('./masterRoster') as { saveMasterRoster: jest.Mock }).saveMasterRoster).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalled(); // saveMasterRoster logs
      consoleSpy.mockRestore();
    });
  });
}); 