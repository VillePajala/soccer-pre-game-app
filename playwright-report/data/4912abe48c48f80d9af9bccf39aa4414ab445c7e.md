# Test info

- Name: Data Persistence - Core Functionality >> should save a newly created game to localStorage
- Location: C:\Users\E915908\Documents\Projects\soccer-app\tests\data-persistence.spec.ts:33:7

# Error details

```
Error: Timed out 10000ms waiting for expect(locator).toBeVisible()

Locator: getByRole('heading', { name: 'Uuden Pelin Asetukset' })
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 10000ms
  - waiting for getByRole('heading', { name: 'Uuden Pelin Asetukset' })

    at C:\Users\E915908\Documents\Projects\soccer-app\tests\data-persistence.spec.ts:46:37
```

# Page snapshot

```yaml
- text: Loading...
```

# Test source

```ts
   1 | import { test, expect } from '@playwright/test';
   2 | import { SAVED_GAMES_KEY, APP_SETTINGS_KEY } from '../src/config/constants'; // Assuming path is correct
   3 |
   4 | // Define expected localStorage structure interfaces (optional but helpful)
   5 | interface GameData {
   6 |   id: string;
   7 |   opponentName: string;
   8 |   teamName: string;
   9 | }
   10 |
   11 | interface SavedGamesCollection {
   12 |   [gameId: string]: GameData;
   13 | }
   14 |
   15 | interface AppSettings {
   16 |   currentGameId: string | null;
   17 | }
   18 |
   19 | test.describe('Data Persistence - Core Functionality', () => {
   20 |
   21 |   // Clear localStorage before each test to ensure isolation
   22 |   test.beforeEach(async ({ page }) => {
   23 |     await page.goto('/');
   24 |     // Clear localStorage via the browser's execution context
   25 |     await page.evaluate(() => {
   26 |       localStorage.clear();
   27 |     });
   28 |     // Reload might be necessary if the app reads localStorage heavily on initial load
   29 |     // await page.reload(); 
   30 |     // Let's try without reload first. Add it if needed.
   31 |   });
   32 |
   33 |   test('should save a newly created game to localStorage', async ({ page }) => {
   34 |     const yourTeamName = 'Home Lions';
   35 |     const opponentTeamName = 'Away Tigers';
   36 |
   37 |     // --- Action: Create a New Game ---
   38 |     // Go to page (clears storage via beforeEach)
   39 |     // Optional: Reload after storage clear if needed
   40 |     await page.reload(); 
   41 |     console.log('Page reloaded after storage clear.');
   42 |
   43 |     // Wait for the setup modal to appear automatically
   44 |     console.log('Waiting for New Game Setup modal...');
   45 |     const setupModalHeading = page.getByRole('heading', { name: 'Uuden Pelin Asetukset' });
>  46 |     await expect(setupModalHeading).toBeVisible({ timeout: 10000 });
      |                                     ^ Error: Timed out 10000ms waiting for expect(locator).toBeVisible()
   47 |     console.log('New Game Setup modal is visible.');
   48 |
   49 |     // Find the labels/inputs within the modal
   50 |     const homeTeamLabelFinnish = 'Oman joukkueen nimi: *';
   51 |     const opponentLabelFinnish = 'Vastustajan Nimi: *';
   52 |     
   53 |     // Fill both fields
   54 |     await page.getByLabel(homeTeamLabelFinnish).fill(yourTeamName);
   55 |     await page.getByLabel(opponentLabelFinnish).fill(opponentTeamName);
   56 |     console.log('Filled team names.');
   57 |
   58 |     // Click the "Aloita Peli" button *inside the modal*
   59 |     await page.getByRole('button', { name: 'Aloita Peli' }).click();
   60 |     console.log('Clicked Start Game button in modal.');
   61 |
   62 |     // Wait for the game screen to load (e.g., look for the score)
   63 |     await expect(page.getByText('0 - 0')).toBeVisible(); 
   64 |
   65 |     // --- Assertion: Verify localStorage ---
   66 |     const { savedGames, appSettings } = await page.evaluate(({ savedGamesKey, appSettingsKey }) => {
   67 |       const savedGamesJson = localStorage.getItem(savedGamesKey);
   68 |       const appSettingsJson = localStorage.getItem(appSettingsKey);
   69 |       return {
   70 |         savedGames: savedGamesJson ? JSON.parse(savedGamesJson) as SavedGamesCollection : null,
   71 |         appSettings: appSettingsJson ? JSON.parse(appSettingsJson) as AppSettings : null,
   72 |       };
   73 |     }, { savedGamesKey: SAVED_GAMES_KEY, appSettingsKey: APP_SETTINGS_KEY });
   74 |
   75 |     // 1. Check App Settings
   76 |     expect(appSettings, 'App settings should exist in localStorage').not.toBeNull();
   77 |     expect(appSettings?.currentGameId, 'Current game ID should be set in app settings').not.toBeNull();
   78 |     const currentGameId = appSettings?.currentGameId;
   79 |     expect(typeof currentGameId).toBe('string'); // Ensure it's a string (usually UUID)
   80 |
   81 |     // 2. Check Saved Games Collection
   82 |     expect(savedGames, 'Saved games collection should exist in localStorage').not.toBeNull();
   83 |     
   84 |     // Check that there is exactly one game saved
   85 |     const gameIds = Object.keys(savedGames || {});
   86 |     expect(gameIds.length, 'Should be exactly one game saved').toBe(1);
   87 |
   88 |     // Check that the saved game ID matches the currentGameId
   89 |     expect(gameIds[0], 'Saved game ID should match currentGameId in settings').toBe(currentGameId);
   90 |
   91 |     // 3. Check Specific Game Data
   92 |     const savedGameData = savedGames?.[currentGameId!];
   93 |     expect(savedGameData, 'Data for the current game ID should exist').toBeDefined();
   94 |     expect(savedGameData?.teamName, 'Saved "Your Team" name should match input').toBe(yourTeamName);
   95 |     expect(savedGameData?.opponentName, 'Saved opponent name should match input').toBe(opponentTeamName);
   96 |     
   97 |     console.log(`Test passed: New game created and saved with ID: ${currentGameId}`);
   98 |   });
   99 |
  100 |   // --- Add more tests here later for updates, undo, backup, etc. ---
  101 |
  102 | }); 
```