import { 
  getMasterRoster,
  saveMasterRoster,
  addPlayerToRoster,
  updatePlayerInRoster,
  removePlayerFromRoster,
  setPlayerGoalieStatus,
  setPlayerFairPlayCardStatus
} from './masterRoster';
import { MASTER_ROSTER_KEY } from '@/config/storageKeys';
import type { Player } from '@/types';

// Mock the persistence store
let mockGetStorageItem: jest.Mock;
let mockSetStorageItem: jest.Mock;
let mockAddPlayerToRoster: jest.Mock;
let currentRoster: Player[] = [];

jest.mock('@/stores/persistenceStore', () => ({
  usePersistenceStore: {
    getState: jest.fn(() => ({
      getStorageItem: mockGetStorageItem,
      setStorageItem: mockSetStorageItem,
      addPlayerToRoster: mockAddPlayerToRoster,
      masterRoster: currentRoster,
      settings: {
        language: 'en',
        theme: 'auto',
        showPlayerNames: true,
        showPlayerNumbers: false,
        animationsEnabled: true,
        defaultPeriodDuration: 45,
        defaultNumberOfPeriods: 2,
        defaultSubInterval: 15,
        fieldDisplayMode: 'realistic',
        showFieldGrid: false,
        showFieldMarkers: true,
        soundEnabled: true,
        vibrationEnabled: true,
        notificationLevel: 'important',
        enableAnalytics: true,
        enableCrashReporting: true,
        enableExperimentalFeatures: false,
        enableBetaFeatures: false
      }
    }))
  }
}));

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
    value: localStorageMock,
    writable: true
  });

  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.setItem.mockReset();
    localStorageMock.setItem.mockImplementation(() => {}); 
    localStorageMock.getItem.mockReset();
    currentRoster = [...mockPlayers];
    
    // Initialize mocks
    mockGetStorageItem = jest.fn();
    mockSetStorageItem = jest.fn();
    mockAddPlayerToRoster = jest.fn();
    
    // Update the mock to use the new functions
    const { usePersistenceStore } = require('@/stores/persistenceStore');
    usePersistenceStore.getState.mockReturnValue({
      getStorageItem: mockGetStorageItem,
      setStorageItem: mockSetStorageItem,
      addPlayerToRoster: mockAddPlayerToRoster,
      masterRoster: currentRoster,
      settings: {
        language: 'en',
        theme: 'auto',
        showPlayerNames: true,
        showPlayerNumbers: false,
        animationsEnabled: true,
        defaultPeriodDuration: 45,
        defaultNumberOfPeriods: 2,
        defaultSubInterval: 15,
        fieldDisplayMode: 'realistic',
        showFieldGrid: false,
        showFieldMarkers: true,
        soundEnabled: true,
        vibrationEnabled: true,
        notificationLevel: 'important',
        enableAnalytics: true,
        enableCrashReporting: true,
        enableExperimentalFeatures: false,
        enableBetaFeatures: false
      }
    });
  });

  describe('getMasterRoster', () => {
    it('should return an empty array if no roster is stored', async () => {
      mockGetStorageItem.mockResolvedValue(null);
      localStorageMock.getItem.mockReturnValue(null);
      
      const result = await getMasterRoster();
      
      expect(result).toEqual([]);
    });

    it('should return the parsed roster if it exists', async () => {
      mockGetStorageItem.mockResolvedValue(mockPlayers);
      
      const result = await getMasterRoster();
      
      expect(mockGetStorageItem).toHaveBeenCalledWith(MASTER_ROSTER_KEY, []);
      expect(result).toEqual(mockPlayers);
    });

    it('should return an empty array and log error if JSON is invalid', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetStorageItem.mockRejectedValue(new Error('Invalid JSON'));
      localStorageMock.getItem.mockReturnValue('invalid json');
      
      const result = await getMasterRoster();
      
      expect(consoleSpy).toHaveBeenCalled();
      expect(result).toEqual([]);
      consoleSpy.mockRestore();
    });
  });

  describe('saveMasterRoster', () => {
    it('should save the roster to localStorage and return true', async () => {
      mockSetStorageItem.mockResolvedValue(true);
      
      const result = await saveMasterRoster(mockPlayers); 
      expect(result).toBe(true);
      expect(mockSetStorageItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        mockPlayers
      );
    });

    it('should return false and log error if localStorage throws', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockSetStorageItem.mockRejectedValue(new Error('Storage error'));
      localStorageMock.setItem.mockImplementation(() => { 
        throw new Error('Storage quota exceeded'); 
      });
      
      const result = await saveMasterRoster(mockPlayers); 
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('addPlayerToRoster', () => {
    it('should return null if player name is empty', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await addPlayerToRoster({ name: '' });
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player name cannot be empty'));
      consoleSpy.mockRestore();
    });

    it('should add a player to the roster and return the player object', async () => {
      const playerData = { name: 'New Player', jerseyNumber: '99' };
      
      mockGetStorageItem.mockResolvedValue(mockPlayers);
      mockSetStorageItem.mockResolvedValue(true);
      mockAddPlayerToRoster.mockResolvedValue(true);
      
      const result = await addPlayerToRoster(playerData);
      
      expect(result).not.toBeNull();
      expect(result?.name).toBe(playerData.name);
      expect(result?.jerseyNumber).toBe(playerData.jerseyNumber);
      expect(result?.id).toContain('player_');
      expect(result?.isGoalie).toBe(false);
      expect(result?.receivedFairPlayCard).toBe(false);
    });

    it('should trim whitespace from player name', async () => {
      const playerData = { name: '  Trimmed Player  ' };
      
      mockGetStorageItem.mockResolvedValue(mockPlayers);
      mockSetStorageItem.mockResolvedValue(true);
      mockAddPlayerToRoster.mockResolvedValue(true);
      
      const result = await addPlayerToRoster(playerData);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Trimmed Player');
      expect(mockAddPlayerToRoster).toHaveBeenCalled();
    });
  });

  describe('updatePlayerInRoster', () => {
    it('should return null if player name would be empty', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await updatePlayerInRoster('player_1', { name: '  ' });
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player name cannot be empty'));
      consoleSpy.mockRestore();
    });

    it('should update an existing player and return the updated object', async () => {
      const updateData = { name: 'Updated Name', jerseyNumber: '99' };
      const updatedPlayer = { ...mockPlayers[0], ...updateData };
      const updatedRoster = [updatedPlayer, mockPlayers[1]];
      
      mockGetStorageItem.mockResolvedValue(mockPlayers);
      mockSetStorageItem.mockResolvedValue(true);
      
      const result = await updatePlayerInRoster('player_1', updateData);
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('player_1');
      expect(result?.name).toBe(updateData.name);
      expect(result?.jerseyNumber).toBe(updateData.jerseyNumber);
      
      expect(mockSetStorageItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.arrayContaining([
          expect.objectContaining({ id: 'player_1', name: updateData.name }),
          mockPlayers[1]
        ])
      );
    });

    it('should trim whitespace from updated player name', async () => {
      const updateData = { name: '  Trimmed Update   ' };
      const updatedPlayer = { ...mockPlayers[0], name: 'Trimmed Update' };
      
      mockGetStorageItem.mockResolvedValue(mockPlayers);
      mockSetStorageItem.mockResolvedValue(true);
      
      const result = await updatePlayerInRoster('player_1', updateData);
      expect(result).not.toBeNull();
      expect(result?.name).toBe('Trimmed Update');
    });

    it('should return null and log error if player not found', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetStorageItem.mockResolvedValue(mockPlayers);
      
      const result = await updatePlayerInRoster('non_existent_id', { name: 'Test' });
      
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player with ID non_existent_id not found'));
      mockSetStorageItem.mockResolvedValue(true);
      consoleSpy.mockRestore();
    });
  });

  describe('removePlayerFromRoster', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
    });

    it('should remove a player and return true if successful', async () => {
      mockGetStorageItem.mockResolvedValue(mockPlayers);
      mockSetStorageItem.mockResolvedValue(true);
      
      const result = await removePlayerFromRoster('player_1');
      expect(result).toBe(true);
      expect(mockSetStorageItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.arrayContaining([mockPlayers[1]])
      );
      expect(mockSetStorageItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.not.arrayContaining([expect.objectContaining({ id: 'player_1' })])
      );
    });

    it('should return false if player not found', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetStorageItem.mockResolvedValue(mockPlayers);
      
      const result = await removePlayerFromRoster('non_existent_id');
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player with ID non_existent_id not found'));
      mockSetStorageItem.mockResolvedValue(true);
      consoleSpy.mockRestore();
    });

    it('should return false and log error if save fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetStorageItem.mockResolvedValue(mockPlayers);
      mockSetStorageItem.mockRejectedValue(new Error('Save failed'));
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Save failed');
      });
      
      const result = await removePlayerFromRoster('player_1');
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('setPlayerGoalieStatus', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
    });

    it('should update player goalie status and return the player object', async () => {
      mockGetStorageItem.mockResolvedValue(mockPlayers);
      mockSetStorageItem.mockResolvedValue(true);
      
      const result = await setPlayerGoalieStatus('player_1', true);
      expect(result).not.toBeNull();
      expect(result?.isGoalie).toBe(true);
      expect(result?.id).toBe('player_1');
      expect(mockSetStorageItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.arrayContaining([
          expect.objectContaining({ id: 'player_1', isGoalie: true })
        ])
      );
    });

    it('should return null if player not found', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetStorageItem.mockResolvedValue(mockPlayers);
      
      const result = await setPlayerGoalieStatus('non_existent_id', true);
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player with ID non_existent_id not found'));
      mockSetStorageItem.mockResolvedValue(true);
      consoleSpy.mockRestore();
    });
  });

  describe('setPlayerFairPlayCardStatus', () => {
    beforeEach(() => {
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockPlayers));
    });

    it('should update player fair play status and return the player object', async () => {
      mockGetStorageItem.mockResolvedValue(mockPlayers);
      mockSetStorageItem.mockResolvedValue(true);
      
      const result = await setPlayerFairPlayCardStatus('player_2', true);
      expect(result).not.toBeNull();
      expect(result?.receivedFairPlayCard).toBe(true);
      expect(result?.id).toBe('player_2');
      expect(mockSetStorageItem).toHaveBeenCalledWith(
        MASTER_ROSTER_KEY,
        expect.arrayContaining([
          expect.objectContaining({ id: 'player_2', receivedFairPlayCard: true })
        ])
      );
    });

    it('should return null if player not found', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockGetStorageItem.mockResolvedValue(mockPlayers);
      
      const result = await setPlayerFairPlayCardStatus('non_existent_id', true);
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Player with ID non_existent_id not found'));
      mockSetStorageItem.mockResolvedValue(true);
      consoleSpy.mockRestore();
    });
  });
});