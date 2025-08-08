// src/utils/fullBackup.test.ts
import { importFullBackup, exportFullBackup } from "./fullBackup";
import {
  SAVED_GAMES_KEY,
  APP_SETTINGS_KEY,
  SEASONS_LIST_KEY,
  TOURNAMENTS_LIST_KEY,
  MASTER_ROSTER_KEY,
} from "@/config/storageKeys"; // Using path alias from jest.config.js

// Mock i18next
jest.mock("i18next", () => ({
  __esModule: true,
  default: {
    t: jest.fn((key: string, options?: any) => {
      const translations: Record<string, string> = {
        "fullBackup.confirmRestore": "Haluatko varmasti palauttaa varmuuskopion?",
        "fullBackup.restoreSuccess": "Varmuuskopio palautettu. Sovellus latautuu uudelleen...",
        "fullBackup.restoreKeyError": `Kohteen ${options?.key || ""} palautus epäonnistui`,
        "fullBackup.restoreError": `Virhe varmuuskopion ${options?.error || ""}`,
        "fullBackup.exportSuccess": "Varmuuskopio vietiin onnistuneesti.",
        "fullBackup.exportError": "Varmuuskopion vienti epäonnistui.",
      };
      return translations[key] || key;
    }),
  },
}))

// Mock localStorage globally for all tests in this file
const localStorageMock = (() => {
  let store: Record<string, string> = {};
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
    getAll: jest.fn(() => store), // Expose method to check the whole store
    // Add mockImplementation to clear mocks
    mockClear: jest.fn(() => {
      store = {}; // Ensure store is cleared
      localStorageMock.getItem.mockClear();
      localStorageMock.setItem.mockClear();
      localStorageMock.removeItem.mockClear();
      localStorageMock.clear.mockClear();
      localStorageMock.getAll.mockClear();
    }),
    // Fix any type - use unknown for generic error
    throwErrorOnSet: jest.fn(
      (key: string, error: unknown = new Error("Storage error")) => {
        localStorageMock.setItem.mockImplementationOnce((k, v) => {
          if (k === key) throw error;
          store[k] = String(v);
        });
      },
    ),
    getQuotaExceededError: jest.fn(() => {
      // Simulate DOMException for quota exceeded by creating a similar object
      const error = {
        name: "QuotaExceededError",
        message: "Simulated Quota Exceeded", // Add a message
        // code: 22, // code is often read-only, might not be needed for checks
      };
      return error; // Return the mock error object
    }),
    length: {
      // Mock length property if needed by code under test
      get: jest.fn(() => Object.keys(store).length),
    },
    key: jest.fn((index: number) => Object.keys(store)[index] || null),
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock });

// Define an interface for Blob that we expect to have a .text() method in tests
interface BlobWithText extends Blob {
  text: () => Promise<string>;
}

// Mock URL.createObjectURL and revokeObjectURL
const mockBlobStore: Record<string, BlobWithText> = {}; // Store BlobWithText
window.URL.createObjectURL = jest.fn((blob: Blob): string => {
  const url = `blob:mock/${Math.random()}`;
  const blobToAugment = blob as BlobWithText; // Cast to our test-specific type

  // Augment the blob with a text() method if it's missing for testing purposes
  if (typeof blobToAugment.text !== "function") {
    blobToAugment.text = jest.fn(async () => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsText(blob); // Use original blob for readAsText
      });
    });
  }
  mockBlobStore[url] = blobToAugment; // Store the (potentially augmented) blob
  return url;
});
window.URL.revokeObjectURL = jest.fn((url: string) => {
  delete mockBlobStore[url];
});

// Mock document.body.appendChild/removeChild
document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();

// Mock window.alert
window.alert = jest.fn();

// Mock window.confirm
Object.defineProperty(window, "confirm", { value: jest.fn() });

// Mock window.location.reload safely
const originalLocation: Location = window.location;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (window as any).location; // Need to delete first to reassign
window.location = {
  ...originalLocation,
  reload: jest.fn(),
};

// Mock setTimeout/clearTimeout - Let Jest infer the spy types
const setTimeoutSpy = jest.spyOn(global, "setTimeout");
const clearTimeoutSpy = jest.spyOn(global, "clearTimeout");

// Define test data types using unknown
// Remove unused types
// REMOVE: interface GameData extends Record<string, unknown> {}
// REMOVE: interface SettingsData extends Record<string, unknown> {}

// More specific types for array elements
interface SeasonObject extends Record<string, unknown> {
  id: string;
  name: string;
}
interface TournamentObject extends Record<string, unknown> {
  id?: string;
  name?: string;
}
interface RosterPlayer extends Record<string, unknown> {
  id: string;
  name?: string;
}

// REMOVE: type SeasonData = Array<SeasonObject>;
// REMOVE: type TournamentData = Array<TournamentObject>;
// REMOVE: type RosterData = Array<RosterPlayer>;

describe("importFullBackup", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    // Call the mockClear method we added to reset everything
    localStorageMock.mockClear();
    // Ensure window object uses the fresh mock (might be redundant but safe)
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    // Reset other mocks used in this suite
    (window.confirm as jest.Mock)?.mockClear();
    (window.alert as jest.Mock)?.mockClear(); // Clear global alert mock if it was set
    (window.location.reload as jest.Mock)?.mockClear();
    setTimeoutSpy.mockClear();
    clearTimeoutSpy.mockClear(); // Ensure clearTimeout is also cleared
    jest.useRealTimers(); // Default to real timers

    // Mock console methods for this describe block
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});
  });

  afterEach(() => {
    // Restore console spies
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe("Success Scenarios", () => {
    it("should successfully restore valid backup data and overwrite localStorage", async () => {
      // Arrange: Define valid backup data
      const validBackupData = {
        meta: { schema: 1, exportedAt: new Date().toISOString() },
        localStorage: {
          [SAVED_GAMES_KEY]: {
            game1: {
              id: "game1",
              teamName: "Test",
              opponentName: "Opponent",
              homeScore: 1,
              awayScore: 0,
            },
          },
          [APP_SETTINGS_KEY]: { currentGameId: "game1" },
          [SEASONS_LIST_KEY]: [{ id: "s1", name: "Test Season" }],
          [TOURNAMENTS_LIST_KEY]: null, // Test null value
          [MASTER_ROSTER_KEY]: [{ id: "p1", name: "Player 1" }],
          // Key not present in backup constants but exists in source file localStorage
          someOtherOldKey: "should be removed if present initially",
        },
      };
      const backupJson = JSON.stringify(validBackupData);

      // Pre-populate localStorage with some different data to ensure overwrite
      localStorageMock.setItem(
        SAVED_GAMES_KEY,
        JSON.stringify({ gameX: { id: "gameX" } }),
      );
      localStorageMock.setItem(
        APP_SETTINGS_KEY,
        JSON.stringify({ currentGameId: "gameX" }),
      );
      localStorageMock.setItem("someOtherOldKey", "initial value");

      // Mock window.confirm to return true (user confirms)
      (window.confirm as jest.Mock).mockReturnValue(true);

      // Alert is globally mocked in beforeEach for this test suite now
      // REMOVE: const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

      // Act: Call the import function
      const result = await importFullBackup(backupJson);

      // Assert: Check results
      expect(result).toBe(true); // Function should indicate success (before reload)

      // Verify localStorage content matches the backup data
      expect(JSON.parse(localStorageMock.getItem(SAVED_GAMES_KEY)!)).toEqual(
        validBackupData.localStorage[SAVED_GAMES_KEY],
      );
      expect(JSON.parse(localStorageMock.getItem(APP_SETTINGS_KEY)!)).toEqual(
        validBackupData.localStorage[APP_SETTINGS_KEY],
      );
      expect(JSON.parse(localStorageMock.getItem(SEASONS_LIST_KEY)!)).toEqual(
        validBackupData.localStorage[SEASONS_LIST_KEY],
      );
      expect(localStorageMock.getItem(TOURNAMENTS_LIST_KEY)).toBeNull(); // Check null was handled
      expect(JSON.parse(localStorageMock.getItem(MASTER_ROSTER_KEY)!)).toEqual(
        validBackupData.localStorage[MASTER_ROSTER_KEY],
      );

      // Verify the non-backup key was removed (because the function iterates only over keys in the backup's localStorage)
      // The value here comes from the backup file, not the initial value set
      expect(localStorageMock.getItem("someOtherOldKey")).toBe(
        JSON.stringify(validBackupData.localStorage.someOtherOldKey),
      );

      // Verify confirmation was called
      expect(window.confirm).toHaveBeenCalledTimes(1);
      expect(window.alert).toHaveBeenCalledWith(
        "Varmuuskopio palautettu. Sovellus latautuu uudelleen...",
      );

      // Verify reload was scheduled via setTimeout
      expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
      expect(setTimeoutSpy).toHaveBeenLastCalledWith(expect.any(Function), 500);

      // Verify the function passed to setTimeout calls reload
      const reloadCallback = setTimeoutSpy.mock.calls[0][0]; // Get the callback function
      reloadCallback(); // Execute the callback
      expect(window.location.reload).toHaveBeenCalledTimes(1); // Now check if reload was called
    });

    it("should successfully import partial backup data with only some keys present", async () => {
      jest.useFakeTimers(); // Use FAKE timers for this test
      // Arrange: Define partial backup data with valid structure but only some keys
      const partialBackupData = {
        meta: { schema: 1, exportedAt: new Date().toISOString() },
        localStorage: {
          // Only include games and settings, omit roster, seasons, and tournaments
          [SAVED_GAMES_KEY]: {
            game1: { id: "game1", teamName: "Partial Test" },
          },
          [APP_SETTINGS_KEY]: { currentGameId: "game1" },
          // Intentionally omitting: MASTER_ROSTER_KEY, SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY
        },
      };
      const backupJson = JSON.stringify(partialBackupData);

      // Pre-populate localStorage with some existing data that should be preserved
      // for keys not in the backup
      const existingRoster = [{ id: "existing1", name: "Existing Player" }];
      localStorageMock.setItem(
        MASTER_ROSTER_KEY,
        JSON.stringify(existingRoster),
      );

      // Mock window.confirm to return true (user confirms)
      (window.confirm as jest.Mock).mockReturnValue(true);

      // Alert is globally mocked
      // REMOVE: const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});

      // Act: Call the import function
      const result = await importFullBackup(backupJson);

      // Assert: Check results
      expect(result).toBe(true); // Function should indicate success

      // Verify backup keys were imported
      expect(JSON.parse(localStorageMock.getItem(SAVED_GAMES_KEY)!)).toEqual(
        partialBackupData.localStorage[SAVED_GAMES_KEY],
      );
      expect(JSON.parse(localStorageMock.getItem(APP_SETTINGS_KEY)!)).toEqual(
        partialBackupData.localStorage[APP_SETTINGS_KEY],
      );

      // Verify keys not in backup were preserved
      expect(JSON.parse(localStorageMock.getItem(MASTER_ROSTER_KEY)!)).toEqual(
        existingRoster,
      );

      // Verify alert and reload were called
      expect(window.alert).toHaveBeenCalledWith(
        "Varmuuskopio palautettu. Sovellus latautuu uudelleen...",
      );

      // Advance timers to see if reload would have been called
      jest.advanceTimersByTime(500);
      expect(window.location.reload).toHaveBeenCalledTimes(1); // Still check reload

      // Restore mocks and timers
      // REMOVE: alertMock.mockRestore(); // Handled in afterEach
      jest.useRealTimers(); // Restore real timers
    });
  });

  describe("User Cancellation", () => {
    it("should return false and not modify localStorage when user cancels import", async () => {
      // Arrange
      const validBackupData = {
        meta: { schema: 1 },
        localStorage: { [SAVED_GAMES_KEY]: { game1: {} } },
      };
      const backupJson = JSON.stringify(validBackupData);
      const initialSavedGames = { gameX: { id: "gameX" } };
      localStorageMock.setItem(
        SAVED_GAMES_KEY,
        JSON.stringify(initialSavedGames),
      ); // Set initial data
      // const initialStoreState = { ...localStorageMock.getAll() }; // Capture initial state (removed as unused for now)

      (window.confirm as jest.Mock).mockReturnValue(false); // User cancels
      const alertMock = jest
        .spyOn(window, "alert")
        .mockImplementation(() => {});

      // Act
      const result = await importFullBackup(backupJson);

      // Assert
      expect(result).toBe(false);
      expect(window.confirm).toHaveBeenCalledTimes(1);
      // Assert that no modification methods were called beyond the initial setup
      expect(localStorageMock.setItem).toHaveBeenCalledTimes(1); // Only the initial setup call
      expect(localStorageMock.removeItem).not.toHaveBeenCalled();
      expect(localStorageMock.clear).not.toHaveBeenCalled();
      expect(window.location.reload).not.toHaveBeenCalled();
      expect(alertMock).not.toHaveBeenCalled();
      alertMock.mockRestore();
    });
  });

  describe("Validation Errors", () => {
    it("should return false and not modify localStorage for invalid JSON input", async () => {
      // Arrange
      const invalidJson = "{ invalid json";

      // Mock window.alert to suppress it during test
      const alertMock = jest
        .spyOn(window, "alert")
        .mockImplementation(() => {});

      // Act
      const result = await importFullBackup(invalidJson);

      // Assert
      expect(result).toBe(false);
      expect(localStorageMock.getAll()).toEqual({}); // Storage unchanged
      expect(window.confirm).not.toHaveBeenCalled(); // Confirmation shouldn't be reached
      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining("Virhe varmuuskopion"),
      ); // Check alert
      expect(window.location.reload).not.toHaveBeenCalled();

      // Restore alert mock
      alertMock.mockRestore();
    });

    it("should return false and show error for missing meta field", async () => {
      // Arrange
      const backupData = { localStorage: {} }; // Missing meta
      const backupJson = JSON.stringify(backupData);

      // Mock window.alert to suppress it during test
      const alertMock = jest
        .spyOn(window, "alert")
        .mockImplementation(() => {});

      // Act
      const result = await importFullBackup(backupJson);

      // Assert
      expect(result).toBe(false);
      expect(localStorageMock.getAll()).toEqual({});
      expect(window.confirm).not.toHaveBeenCalled();
      expect(alertMock).toHaveBeenCalledWith(
        "Virhe varmuuskopion Invalid format: Missing 'meta' information.",
      );
      expect(window.location.reload).not.toHaveBeenCalled();
      alertMock.mockRestore();
    });

    it("should return false and show error for unsupported schema version", async () => {
      // Arrange
      const backupData = { meta: { schema: 2 }, localStorage: {} };
      const backupJson = JSON.stringify(backupData);

      // Mock window.alert to suppress it during test
      const alertMock = jest
        .spyOn(window, "alert")
        .mockImplementation(() => {});

      // Act
      const result = await importFullBackup(backupJson);

      // Assert
      expect(result).toBe(false);
      expect(localStorageMock.getAll()).toEqual({});
      expect(window.confirm).not.toHaveBeenCalled();
      expect(alertMock).toHaveBeenCalledWith(
        "Virhe varmuuskopion Unsupported schema version: 2. This tool supports schema version 1.",
      );
      expect(window.location.reload).not.toHaveBeenCalled();
      alertMock.mockRestore();
    });

    it("should return false and show error for missing localStorage field", async () => {
      // Arrange
      const backupData = { meta: { schema: 1 } }; // Missing localStorage
      const backupJson = JSON.stringify(backupData);

      // Mock window.alert to suppress it during test
      const alertMock = jest
        .spyOn(window, "alert")
        .mockImplementation(() => {});

      // Act
      const result = await importFullBackup(backupJson);

      // Assert
      expect(result).toBe(false);
      expect(localStorageMock.getAll()).toEqual({});
      expect(window.confirm).not.toHaveBeenCalled();
      expect(alertMock).toHaveBeenCalledWith(
        "Virhe varmuuskopion Invalid format: Missing 'localStorage' data object.",
      );
      expect(window.location.reload).not.toHaveBeenCalled();
      alertMock.mockRestore();
    });
  });

  describe("Runtime Errors", () => {
    it("should return false and show error when localStorage quota is exceeded", async () => {
      // Arrange: Define valid backup data
      const validBackupData = {
        meta: { schema: 1, exportedAt: new Date().toISOString() },
        localStorage: {
          [SAVED_GAMES_KEY]: {
            game1: { id: "game1", teamName: "Test", opponentName: "Opponent" },
          },
          [APP_SETTINGS_KEY]: { currentGameId: "game1" },
        },
      };
      const backupJson = JSON.stringify(validBackupData);

      // Mock window.confirm to return true (user confirms)
      (window.confirm as jest.Mock).mockReturnValue(true);

      // Mock localStorage.setItem to throw quota exceeded error for one specific key
      // Use a more targeted approach to only mock for a specific key
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = jest.fn().mockImplementation((key, value) => {
        if (key === SAVED_GAMES_KEY) {
          throw localStorageMock.getQuotaExceededError();
        }
        return originalSetItem(key, value);
      });

      // Mock alert
      const alertMock = jest
        .spyOn(window, "alert")
        .mockImplementation(() => {});

      try {
        // Act: Call the import function
        const result = await importFullBackup(backupJson);

        // Assert: Check results
        expect(result).toBe(false); // Function should indicate failure
        expect(localStorageMock.setItem).toHaveBeenCalled();
        // The actual error message from the implementation contains a different text
        expect(alertMock).toHaveBeenCalledWith(
          expect.stringContaining("Kohteen"),
        );
        expect(window.location.reload).not.toHaveBeenCalled();
      } finally {
        // Always restore the mock, even if the test fails
        localStorageMock.setItem = originalSetItem;
        alertMock.mockRestore();
      }
    });
  });
});

// --- New Describe Block for exportFullBackup ---
describe("exportFullBackup", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;
  let clickSpy: jest.Mock;
  let originalCreateElement: typeof document.createElement;
  let dateSpy: jest.SpyInstance; // To hold the Date spy instance

  beforeEach(() => {
    localStorageMock.mockClear();
    Object.defineProperty(window, "localStorage", {
      value: localStorageMock,
      writable: true,
    });

    (window.URL.createObjectURL as jest.Mock).mockClear();
    (window.URL.revokeObjectURL as jest.Mock).mockClear();
    (document.body.appendChild as jest.Mock).mockClear();
    (document.body.removeChild as jest.Mock).mockClear();
    (window.alert as jest.Mock)?.mockClear();

    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, "log").mockImplementation(() => {});

    clickSpy = jest.fn();
    originalCreateElement = document.createElement;
    document.createElement = jest.fn((tagName: string): HTMLElement => {
      if (tagName.toLowerCase() === "a") {
        const mockAnchor = originalCreateElement.call(
          document,
          "a",
        ) as HTMLAnchorElement;
        mockAnchor.click = clickSpy;
        Object.defineProperty(mockAnchor, "href", {
          writable: true,
          value: "",
        });
        Object.defineProperty(mockAnchor, "download", {
          writable: true,
          value: "",
        });
        Object.defineProperty(mockAnchor, "style", {
          writable: true,
          value: {},
        });
        return mockAnchor;
      }
      return originalCreateElement.call(document, tagName);
    }) as jest.Mock;
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
    document.createElement = originalCreateElement;
    if (dateSpy) {
      dateSpy.mockRestore(); // Restore Date spy if it was created
    }
  });

  it("should trigger download with correct filename and content type", async () => {
    localStorageMock.setItem(SAVED_GAMES_KEY, JSON.stringify({ test: "data" }));
    const expectedDate = new Date(2023, 0, 15, 10, 30, 0); // Fixed date
    // Store the spy instance to restore it in afterEach
    dateSpy = jest.spyOn(global, "Date").mockImplementation(() => expectedDate);

    await exportFullBackup();

    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(document.createElement).toHaveBeenCalledWith("a");

    const mockAnchor = (document.createElement as jest.Mock).mock.results[0]
      .value;
    expect(mockAnchor.download).toBe("SoccerApp_Backup_20230115_103000.json"); // Check filename
    expect(document.body.appendChild).toHaveBeenCalledWith(mockAnchor);
    expect(clickSpy).toHaveBeenCalledTimes(1);
    expect(document.body.removeChild).toHaveBeenCalledWith(mockAnchor);
    expect(window.URL.revokeObjectURL).toHaveBeenCalledWith(expect.any(String));
    expect(window.alert).toHaveBeenCalledWith(
      "Varmuuskopio vietiin onnistuneesti.",
    );

    // No need to restore dateSpy here, afterEach will handle it.
  });

  it("should correctly structure backup data including meta and all localStorage keys", async () => {
    // Arrange
    const gamesData = { game1: { id: "g1", name: "Game One" } };
    const settingsData = { theme: "dark" };
    const rosterDataDb: RosterPlayer[] = [{ id: "p1", name: "Player One" }];
    const seasonsDataDb: SeasonObject[] = [{ id: "s1", name: "Season One" }];
    const tournamentsDataDb: TournamentObject[] = [
      { id: "t1", name: "Tournament One" },
    ];

    localStorageMock.setItem(SAVED_GAMES_KEY, JSON.stringify(gamesData));
    localStorageMock.setItem(APP_SETTINGS_KEY, JSON.stringify(settingsData));
    localStorageMock.setItem(MASTER_ROSTER_KEY, JSON.stringify(rosterDataDb));
    localStorageMock.setItem(SEASONS_LIST_KEY, JSON.stringify(seasonsDataDb));
    localStorageMock.setItem(
      TOURNAMENTS_LIST_KEY,
      JSON.stringify(tournamentsDataDb),
    );
    // localStorageMock.setItem('someOtherCustomKey', JSON.stringify({ custom: 'value' })); // This key is not in APP_DATA_KEYS, so it won't be backed up.

    await exportFullBackup();

    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blobArgument = (window.URL.createObjectURL as jest.Mock).mock
      .calls[0][0] as BlobWithText;
    expect(blobArgument).toBeInstanceOf(Blob);
    expect(blobArgument.type).toBe("application/json");

    const blobText = await blobArgument.text();
    const backupData = JSON.parse(blobText);

    expect(backupData.meta).toBeDefined();
    expect(backupData.meta.schema).toBe(1);
    expect(backupData.meta.exportedAt).toBeDefined();

    expect(backupData.localStorage[SAVED_GAMES_KEY]).toEqual(gamesData);
    expect(backupData.localStorage[APP_SETTINGS_KEY]).toEqual(settingsData);
    expect(backupData.localStorage[MASTER_ROSTER_KEY]).toEqual(rosterDataDb);
    expect(backupData.localStorage[SEASONS_LIST_KEY]).toEqual(seasonsDataDb);
    expect(backupData.localStorage[TOURNAMENTS_LIST_KEY]).toEqual(
      tournamentsDataDb,
    );
    // expect(backupData.localStorage['someOtherCustomKey']).toEqual({ custom: 'value' }); // This key is not expected now.
    expect(backupData.localStorage["someOtherCustomKey"]).toBeUndefined(); // Explicitly check it's not there
  });

  it("should handle missing localStorage keys by setting them to null in backup", async () => {
    localStorageMock.setItem(
      SAVED_GAMES_KEY,
      JSON.stringify({ game1: "data" }),
    );

    await exportFullBackup();

    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blobArgument = (window.URL.createObjectURL as jest.Mock).mock
      .calls[0][0] as Blob;
    const blobText = await blobArgument.text();
    const backupData = JSON.parse(blobText);

    expect(backupData.localStorage[SAVED_GAMES_KEY]).toEqual({ game1: "data" });
    expect(backupData.localStorage[APP_SETTINGS_KEY]).toBeNull();
    expect(backupData.localStorage[MASTER_ROSTER_KEY]).toBeNull();
    expect(backupData.localStorage[SEASONS_LIST_KEY]).toBeNull();
    expect(backupData.localStorage[TOURNAMENTS_LIST_KEY]).toBeNull();
  });

  it("should log an error and set value to null if a localStorage item is malformed JSON", async () => {
    const gamesData = { game1: "valid data" };
    const rosterDataDb: RosterPlayer[] = [{ id: "p1", name: "Valid Player" }]; // Use defined type
    localStorageMock.setItem(SAVED_GAMES_KEY, JSON.stringify(gamesData));
    localStorageMock.setItem(APP_SETTINGS_KEY, "this is not json");
    localStorageMock.setItem(MASTER_ROSTER_KEY, JSON.stringify(rosterDataDb));

    await exportFullBackup();

    expect(window.URL.createObjectURL).toHaveBeenCalledTimes(1);
    const blobArgument = (window.URL.createObjectURL as jest.Mock).mock
      .calls[0][0] as Blob;

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        `Error parsing localStorage item for key ${APP_SETTINGS_KEY}`,
      ),
      expect.any(SyntaxError),
    );

    const blobText = await blobArgument.text();
    const backupData = JSON.parse(blobText);

    expect(backupData.localStorage[SAVED_GAMES_KEY]).toEqual(gamesData);
    expect(backupData.localStorage[MASTER_ROSTER_KEY]).toEqual(rosterDataDb);
    expect(backupData.localStorage[APP_SETTINGS_KEY]).toBeNull();
  });
});
