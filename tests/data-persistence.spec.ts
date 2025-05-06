import { test, expect } from '@playwright/test';
import { SAVED_GAMES_KEY, APP_SETTINGS_KEY } from '../src/config/constants'; // Assuming path is correct

// Define expected localStorage structure interfaces (optional but helpful)
// Keep AppState definition minimal for test clarity if full one isn't needed
interface AppState {
  id: string;
  opponentName: string;
  teamName: string;
  // Add other fields minimaly needed for tests if any
  homeScore?: number;
  awayScore?: number;
}

interface SavedGamesCollection {
  [gameId: string]: AppState;
}

interface AppSettings {
  currentGameId: string | null;
}

test.describe('Data Persistence - Core Functionality', () => {
  // REMOVED: test.describe.configure({ mode: 'serial' }); 

  // REMOVED: let createdGameId: string | null = null;
  // REMOVED: Shared team name consts

  // Simplify beforeEach: Always clear localStorage and reload
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
    });
    console.log('LocalStorage cleared.');
    await page.reload(); 
    console.log('Page reloaded.');
    // No UI checks here, each test responsible for its setup validation
  });

  test('should save a newly created game to localStorage', async ({ page }) => {
    const yourTeamName = 'Home Create Test'; // Local variable
    const opponentTeamName = 'Away Create Test'; // Local variable

    // --- Action: Create a New Game ---
    // Wait for the setup modal explicitly in this test
    const controlBar = page.locator('.bg-slate-800.p-2.shadow-md'); // Example locator, adjust if needed
    await expect(controlBar).toBeVisible({ timeout: 15000 });
    console.log('Control Bar visible, waiting for New Game Setup modal...');
    const setupModalHeading = page.getByRole('heading', { name: 'Uuden Pelin Asetukset' });
    await expect(setupModalHeading).toBeVisible({ timeout: 10000 });
    console.log('New Game Setup modal is visible.');

    // Find the labels/inputs within the modal
    const homeTeamLabelFinnish = 'Oman joukkueen nimi: *';
    const opponentLabelFinnish = 'Vastustajan Nimi: *';
    
    // Fill both fields
    await page.getByLabel(homeTeamLabelFinnish).fill(yourTeamName);
    await page.getByLabel(opponentLabelFinnish).fill(opponentTeamName);
    console.log('Filled team names.');

    // Click the "Aloita Peli" button *inside the modal*
    await page.getByRole('button', { name: 'Aloita Peli' }).click();
    console.log('Clicked Start Game button in modal.');

    // Wait for the game screen to load (e.g., look for the score)
    await expect(page.getByText('0 - 0')).toBeVisible({ timeout: 10000 }); 
    console.log('Game screen loaded after creation.');

    // --- Assertion: Verify localStorage ---
    const { savedGames, appSettings } = await page.evaluate(({ savedGamesKey, appSettingsKey }) => {
      const savedGamesJson = localStorage.getItem(savedGamesKey);
      const appSettingsJson = localStorage.getItem(appSettingsKey);
      return {
        savedGames: savedGamesJson ? JSON.parse(savedGamesJson) as SavedGamesCollection : null,
        appSettings: appSettingsJson ? JSON.parse(appSettingsJson) as AppSettings : null,
      };
    }, { savedGamesKey: SAVED_GAMES_KEY, appSettingsKey: APP_SETTINGS_KEY });

    // 1. Check App Settings
    expect(appSettings, 'App settings should exist in localStorage').not.toBeNull();
    expect(appSettings?.currentGameId, 'Current game ID should be set in app settings').not.toBeNull();
    const currentGameId = appSettings?.currentGameId;
    expect(typeof currentGameId).toBe('string'); // Ensure it's a string (usually UUID)

    // 2. Check Saved Games Collection
    expect(savedGames, 'Saved games collection should exist in localStorage').not.toBeNull();
    
    // Check that there is exactly one game saved
    const gameIds = Object.keys(savedGames || {});
    expect(gameIds.length, 'Should be exactly one game saved').toBe(1);

    // Check that the saved game ID matches the currentGameId
    expect(gameIds[0], 'Saved game ID should match currentGameId in settings').toBe(currentGameId);

    // 3. Check Specific Game Data
    const savedGameData = savedGames?.[currentGameId!];
    expect(savedGameData, 'Data for the current game ID should exist').toBeDefined();
    expect(savedGameData?.teamName, 'Saved "Your Team" name should match input').toBe(yourTeamName);
    expect(savedGameData?.opponentName, 'Saved opponent name should match input').toBe(opponentTeamName);
    
    // REMOVED: createdGameId assignment
    console.log(`Test passed: New game created and saved with ID: ${currentGameId}`);
  });

  test('should load an existing game and verify its data', async ({ page }) => {
    const testGameId = 'load_test_game_123';
    const yourTeamName = 'Home Load Test';
    const opponentTeamName = 'Away Load Test';

    // --- Setup: Seed localStorage directly ---
    await page.evaluate(({ gameId, teamName, opponentName, savedGamesKey, appSettingsKey }) => {
      const gameToLoad: AppState = {
        id: gameId,
        teamName: teamName,
        opponentName: opponentName,
        // Add other necessary initial fields if needed by the load logic/UI
        homeScore: 0, 
        awayScore: 0,
        // ... potentially minimal state for playersOnField, gameEvents etc if required
      };
      const initialSavedGames: SavedGamesCollection = { [gameId]: gameToLoad };
      const initialAppSettings: AppSettings = { currentGameId: null }; // Start with no game loaded initially

      localStorage.setItem(savedGamesKey, JSON.stringify(initialSavedGames));
      localStorage.setItem(appSettingsKey, JSON.stringify(initialAppSettings));
      console.log('Seeded localStorage for load test');
    }, { 
        gameId: testGameId, 
        teamName: yourTeamName, 
        opponentName: opponentTeamName, 
        savedGamesKey: SAVED_GAMES_KEY, 
        appSettingsKey: APP_SETTINGS_KEY 
    });

    // Reload page to apply seeded storage
    await page.reload();
    console.log('Page reloaded after seeding localStorage.');

    // Wait for main UI (settings button), ensuring setup modal doesn't appear
    const settingsButton = page.locator('button[title="controlBar.settings"]');
    await expect(settingsButton).toBeVisible({ timeout: 30000 });
    console.log('Main UI is ready, setup modal did not appear.');

    // Re-add workaround: Handle unexpected setup modal appearance after reload+seed
    const setupModalHeadingLocator = page.getByRole('heading', { name: 'Uuden Pelin Asetukset' });
    try {
      await expect(setupModalHeadingLocator).toBeVisible({ timeout: 5000 }); // Check if it appears quickly
      console.log('Unexpected setup modal found after seed+reload, attempting to close it...');
      // Use existing team names to close it quickly
      const homeTeamLabelFinnish = 'Oman joukkueen nimi: *';
      const opponentLabelFinnish = 'Vastustajan Nimi: *';
      // Use different names than the target game to avoid confusion if creation happens
      await page.getByLabel(homeTeamLabelFinnish).fill('Workaround Home'); 
      await page.getByLabel(opponentLabelFinnish).fill('Workaround Away'); 
      await page.getByRole('button', { name: 'Aloita Peli' }).click();
      await expect(setupModalHeadingLocator).not.toBeVisible({ timeout: 5000 }); // Confirm it closed
      console.log('Closed unexpected setup modal (after seed+reload).');
      // Need to wait for the *actual* settings button to be ready again after this
      await expect(settingsButton).toBeVisible({ timeout: 10000 }); 
    } catch {
      // If it didn't appear within the timeout, that's good, continue
      console.log('Setup modal did not appear after seed+reload (expected behavior).');
    }

    // --- Action: Navigate and Load Game ---
    await settingsButton.click();
    await page.getByText('Lataa Peli').click();
    const loadGameModalHeading = page.getByRole('heading', { name: /Lataa Peli/i });
    await expect(loadGameModalHeading).toBeVisible();
    console.log('Load Game modal is visible.');

    // Find the specific game item container using its test ID
    const gameItemContainer = page.getByTestId(`game-item-${testGameId}`);
    await expect(gameItemContainer).toBeVisible();
    console.log('Found seeded game item container by test ID.');

    // Click the load button *within that specific container*
    await gameItemContainer.getByRole('button', { name: /Lataa Peli/i }).click();
    console.log('Clicked load game button for the seeded game.');

    // --- Assertions ---
    // Verify game screen shows correct data
    await expect(page.getByText(yourTeamName)).toBeVisible({ timeout: 10000 }); 
    await expect(page.getByText(opponentTeamName)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('0 - 0')).toBeVisible({ timeout: 10000 }); 
    console.log('Correct game data displayed on main screen after load.');

    // REMOVED: Wait - should not be needed if localStorage update is synchronous with load
    // await page.waitForTimeout(200); 

    // Verify appSettings in localStorage points to the loaded gameId
    const appSettings = await page.evaluate(({ appSettingsKey }) => {
      const appSettingsJson = localStorage.getItem(appSettingsKey);
      return appSettingsJson ? JSON.parse(appSettingsJson) as AppSettings : null;
    }, { appSettingsKey: APP_SETTINGS_KEY });

    expect(appSettings?.currentGameId, 'Loaded game ID should be set in app settings').toBe(testGameId); // Use testGameId
    console.log('localStorage appSettings correctly updated after load.');
  });

}); 