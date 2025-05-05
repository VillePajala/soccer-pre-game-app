// src/utils/fullBackup.test.ts
import { importFullBackup } from './fullBackup'; // Assuming it's exported directly
import { 
  SAVED_GAMES_KEY, 
  APP_SETTINGS_KEY, 
  SEASONS_LIST_KEY, 
  TOURNAMENTS_LIST_KEY, 
  MASTER_ROSTER_KEY 
} from '@/config/constants'; // Using path alias from jest.config.js

// Mock localStorage (Jest uses jsdom which provides a basic mock)
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
    getStore: () => store // Helper to inspect the mock store
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock window.confirm
Object.defineProperty(window, 'confirm', { value: jest.fn() });

// Mock window.location.reload safely
const originalLocation = window.location;
delete (window as any).location; // Need to delete first to reassign
window.location = { 
  ...originalLocation, // Spread original properties
  reload: jest.fn(), // Add mock reload function
};

// Mock setTimeout/clearTimeout
const setTimeout = jest.spyOn(global, 'setTimeout');
const clearTimeout = jest.spyOn(global, 'clearTimeout');

describe('importFullBackup', () => {
  beforeEach(() => {
    // Reset mocks and localStorage before each test
    localStorageMock.clear();
    (window.confirm as jest.Mock).mockClear();
    (window.location.reload as jest.Mock).mockClear();
    setTimeout.mockClear();
    clearTimeout.mockClear();
    jest.useRealTimers(); // Ensure real timers are used unless explicitly faked
  });

  // Test Case 1: Successfully restores valid data
  it('should successfully restore valid backup data and overwrite localStorage', () => {
    // Arrange: Define valid backup data
    const validBackupData = {
      meta: { schema: 1, exportedAt: new Date().toISOString() },
      localStorage: {
        [SAVED_GAMES_KEY]: { game1: { id: 'game1', teamName: 'Test', opponentName: 'Opponent', homeScore: 1, awayScore: 0 } },
        [APP_SETTINGS_KEY]: { currentGameId: 'game1' },
        [SEASONS_LIST_KEY]: [{ id: 's1', name: 'Test Season' }],
        [TOURNAMENTS_LIST_KEY]: null, // Test null value
        [MASTER_ROSTER_KEY]: [{ id: 'p1', name: 'Player 1' }],
        // Key not present in backup constants but exists in source file localStorage
        'someOtherOldKey': 'should be removed if present initially' 
      }
    };
    const backupJson = JSON.stringify(validBackupData);

    // Pre-populate localStorage with some different data to ensure overwrite
    localStorageMock.setItem(SAVED_GAMES_KEY, JSON.stringify({ gameX: { id: 'gameX' } }));
    localStorageMock.setItem(APP_SETTINGS_KEY, JSON.stringify({ currentGameId: 'gameX' }));
    localStorageMock.setItem('someOtherOldKey', 'initial value');

    // Mock window.confirm to return true (user confirms)
    (window.confirm as jest.Mock).mockReturnValue(true);
    
    // Mock alert
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    // Act: Call the import function
    const result = importFullBackup(backupJson);

    // Assert: Check results
    expect(result).toBe(true); // Function should indicate success (before reload)
    
    // Verify localStorage content matches the backup data
    expect(JSON.parse(localStorageMock.getItem(SAVED_GAMES_KEY)!)).toEqual(validBackupData.localStorage[SAVED_GAMES_KEY]);
    expect(JSON.parse(localStorageMock.getItem(APP_SETTINGS_KEY)!)).toEqual(validBackupData.localStorage[APP_SETTINGS_KEY]);
    expect(JSON.parse(localStorageMock.getItem(SEASONS_LIST_KEY)!)).toEqual(validBackupData.localStorage[SEASONS_LIST_KEY]);
    expect(localStorageMock.getItem(TOURNAMENTS_LIST_KEY)).toBeNull(); // Check null was handled
    expect(JSON.parse(localStorageMock.getItem(MASTER_ROSTER_KEY)!)).toEqual(validBackupData.localStorage[MASTER_ROSTER_KEY]);
    
    // Verify the non-backup key was removed (because the function iterates only over keys in the backup's localStorage)
    // The value here comes from the backup file, not the initial value set
    expect(localStorageMock.getItem('someOtherOldKey')).toBe(JSON.stringify(validBackupData.localStorage.someOtherOldKey));
    
    // Verify confirmation was called
    expect(window.confirm).toHaveBeenCalledTimes(1);
    expect(alertMock).toHaveBeenCalledWith('Full backup restored successfully! The application will now reload.');

    // Verify reload was scheduled via setTimeout
    expect(setTimeout).toHaveBeenCalledTimes(1);
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), 500);

    // Verify the function passed to setTimeout calls reload
    const reloadCallback = setTimeout.mock.calls[0][0]; // Get the callback function
    reloadCallback(); // Execute the callback
    expect(window.location.reload).toHaveBeenCalledTimes(1); // Now check if reload was called

    alertMock.mockRestore();
  });

  // Test Case 2: User cancels the confirmation prompt
  it('should return false and not modify localStorage if user cancels confirmation', () => {
     // Arrange: Define valid backup data (content doesn't strictly matter here)
     const validBackupData = { meta: { schema: 1 }, localStorage: { [SAVED_GAMES_KEY]: { game1: {} } } };
     const backupJson = JSON.stringify(validBackupData);
     
     // Pre-populate with initial data
     const initialSavedGames = { gameX: { id: 'gameX' } };
     localStorageMock.setItem(SAVED_GAMES_KEY, JSON.stringify(initialSavedGames));
     const initialStore = { ...localStorageMock.getStore() }; // Capture initial state

     // Mock window.confirm to return false (user cancels)
     (window.confirm as jest.Mock).mockReturnValue(false);
     const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

     // Act
     const result = importFullBackup(backupJson);
     
     // Assert
     expect(result).toBe(false); // Function should indicate cancellation
     expect(window.confirm).toHaveBeenCalledTimes(1);
     expect(localStorageMock.getStore()).toEqual(initialStore); // LocalStorage should be unchanged
     expect(window.location.reload).not.toHaveBeenCalled(); // Reload should not be called
     expect(alertMock).not.toHaveBeenCalled();
     alertMock.mockRestore();
  });

  // Test Case 3: Invalid JSON input
  it('should return false and not modify localStorage for invalid JSON input', () => {
    // Arrange
    const invalidJson = "{ invalid json";
    const initialStore = { ...localStorageMock.getStore() };

    // Mock window.alert to suppress it during test
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    // Act
    const result = importFullBackup(invalidJson);

    // Assert
    expect(result).toBe(false);
    expect(localStorageMock.getStore()).toEqual(initialStore); // Storage unchanged
    expect(window.confirm).not.toHaveBeenCalled(); // Confirmation shouldn't be reached
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Error importing full backup:')); // Check alert
    expect(window.location.reload).not.toHaveBeenCalled();

    // Restore alert mock
    alertMock.mockRestore();
  });
  
  // Test Case 4: Missing 'meta' field
  it('should return false and show error for missing meta field', () => {
    // Arrange
    const backupData = { localStorage: {} }; // Missing meta
    const backupJson = JSON.stringify(backupData);
    const initialStore = { ...localStorageMock.getStore() };
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    // Act
    const result = importFullBackup(backupJson);

    // Assert
    expect(result).toBe(false);
    expect(localStorageMock.getStore()).toEqual(initialStore);
    expect(window.confirm).not.toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Missing \'meta\' information'));
    expect(window.location.reload).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  // Test Case 5: Unsupported schema version
  it('should return false and show error for unsupported schema version', () => {
    // Arrange
    const backupData = { meta: { schema: 2 }, localStorage: {} }; 
    const backupJson = JSON.stringify(backupData);
    const initialStore = { ...localStorageMock.getStore() };
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    // Act
    const result = importFullBackup(backupJson);

    // Assert
    expect(result).toBe(false);
    expect(localStorageMock.getStore()).toEqual(initialStore);
    expect(window.confirm).not.toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Unsupported schema version: 2'));
    expect(window.location.reload).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });
  
  // Test Case 6: Missing 'localStorage' field
   it('should return false and show error for missing localStorage field', () => {
    // Arrange
    const backupData = { meta: { schema: 1 } }; // Missing localStorage
    const backupJson = JSON.stringify(backupData);
    const initialStore = { ...localStorageMock.getStore() };
    const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

    // Act
    const result = importFullBackup(backupJson);

    // Assert
    expect(result).toBe(false);
    expect(localStorageMock.getStore()).toEqual(initialStore);
    expect(window.confirm).not.toHaveBeenCalled();
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Missing \'localStorage\' data object'));
    expect(window.location.reload).not.toHaveBeenCalled();
    alertMock.mockRestore();
  });

  // Add more tests for edge cases:
  // - Backup data contains keys not expected (should they be ignored or cause error?) -> Handled by typing, seems okay.
  // - Backup data is valid JSON but contains malformed data *within* a value (e.g., invalid game object) -> The function seems to trust JSON.parse worked, maybe add tests if needed.
  // - localStorage.setItem throws an error (e.g., quota exceeded) -> Function currently aborts, test this?
}); 