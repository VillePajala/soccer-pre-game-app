import { test, expect } from '@playwright/test';
import { SAVED_GAMES_KEY, APP_SETTINGS_KEY } from '../src/config/constants'; // Assuming path is correct

// Define expected localStorage structure interfaces (optional but helpful)
interface GameData {
  id: string;
  opponentName: string;
  teamName: string;
}

interface SavedGamesCollection {
  [gameId: string]: GameData;
}

interface AppSettings {
  currentGameId: string | null;
}

test.describe('Data Persistence - Core Functionality', () => {

  // Clear localStorage before each test to ensure isolation
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear localStorage via the browser's execution context
    await page.evaluate(() => {
      localStorage.clear();
    });
    // Reload might be necessary if the app reads localStorage heavily on initial load
    // await page.reload(); 
    // Let's try without reload first. Add it if needed.
  });

  test('should save a newly created game to localStorage', async ({ page }) => {
    const yourTeamName = 'Home Lions';
    const opponentTeamName = 'Away Tigers';

    // --- Action: Create a New Game ---
    // Go to page (clears storage via beforeEach)
    // Optional: Reload after storage clear if needed
    await page.reload(); 
    console.log('Page reloaded after storage clear.');

    // Wait for the main UI (e.g., Control Bar) to be ready first
    const controlBar = page.locator('.bg-slate-800.p-2.shadow-md'); // Use ControlBar classes
    await expect(controlBar).toBeVisible({ timeout: 15000 }); // Increased timeout slightly
    console.log('Control Bar is visible.');

    // Now check for the setup modal heading
    console.log('Waiting for New Game Setup modal...');
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
    await expect(page.getByText('0 - 0')).toBeVisible(); 

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
    
    console.log(`Test passed: New game created and saved with ID: ${currentGameId}`);
  });

  // --- Add more tests here later for updates, undo, backup, etc. ---

}); 