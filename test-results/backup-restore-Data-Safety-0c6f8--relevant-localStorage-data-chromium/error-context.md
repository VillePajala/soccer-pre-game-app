# Test info

- Name: Data Safety - Backup & Restore >> should generate a backup file containing all relevant localStorage data
- Location: C:\Users\E915908\Documents\Projects\soccer-app\tests\backup-restore.spec.ts:60:9

# Error details

```
Error: Timed out 10000ms waiting for expect(locator).toBeVisible()

Locator: locator('button[title="controlBar.settings"]')
Expected: visible
Received: <element(s) not found>
Call log:
  - expect.toBeVisible with timeout 10000ms
  - waiting for locator('button[title="controlBar.settings"]')

    at C:\Users\E915908\Documents\Projects\soccer-app\tests\backup-restore.spec.ts:76:45
```

# Page snapshot

```yaml
- text: Loading...
```

# Test source

```ts
   1 | import { test, expect, Page } from '@playwright/test';
   2 | import { 
   3 |     SAVED_GAMES_KEY, 
   4 |     APP_SETTINGS_KEY, 
   5 |     SEASONS_LIST_KEY, 
   6 |     TOURNAMENTS_LIST_KEY, 
   7 |     MASTER_ROSTER_KEY, 
   8 |     LAST_HOME_TEAM_NAME_KEY 
   9 | } from '../src/config/constants';
   10 |
   11 | // Helper function to get all relevant localStorage data from the browser context
   12 | async function getLocalStorageData(page: Page): Promise<Record<string, any>> {
   13 |     return await page.evaluate(({ keys }: { keys: string[] }) => {
   14 |         const data: { [key: string]: any } = {};
   15 |         keys.forEach((key: string) => {
   16 |             const item = localStorage.getItem(key);
   17 |             try {
   18 |                 data[key] = item ? JSON.parse(item) : null;
   19 |             } catch (parseError) {
   20 |                 console.warn(`Failed to parse localStorage item ${key}:`, parseError);
   21 |                 data[key] = item; // Store as raw string if JSON parse fails
   22 |             }
   23 |         });
   24 |         return data;
   25 |     }, { keys: [SAVED_GAMES_KEY, APP_SETTINGS_KEY, SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY, MASTER_ROSTER_KEY, LAST_HOME_TEAM_NAME_KEY] });
   26 | }
   27 |
   28 | test.describe('Data Safety - Backup & Restore', () => {
   29 |
   30 |     test.beforeEach(async ({ page }) => {
   31 |         await page.goto('/');
   32 |         // Clear localStorage before each test
   33 |         await page.evaluate(() => localStorage.clear());
   34 |
   35 |         // --- Setup Initial Data for tests in this suite ---
   36 |         const initialDataForSuite = {
   37 |              [SAVED_GAMES_KEY]: { 'game1': { id: 'game1', teamName: 'Test Team', opponentName: 'Test Opponent', homeScore: 1, awayScore: 0 }},
   38 |              [APP_SETTINGS_KEY]: { currentGameId: 'game1' },
   39 |              [SEASONS_LIST_KEY]: [{ id: 's1', name: 'Test Season' }],
   40 |              [TOURNAMENTS_LIST_KEY]: [],
   41 |              [MASTER_ROSTER_KEY]: [{ id: 'p1', name: 'Test Player' }],
   42 |              [LAST_HOME_TEAM_NAME_KEY]: 'Test Team'
   43 |         };
   44 |         await page.evaluate((data: Record<string, any>) => {
   45 |              for (const key in data) {
   46 |                  if (data[key] !== null && data[key] !== undefined) {
   47 |                      localStorage.setItem(key, JSON.stringify(data[key]));
   48 |                  } else {
   49 |                      localStorage.removeItem(key);
   50 |                  }
   51 |              }
   52 |          }, initialDataForSuite);
   53 |         console.log('Initial localStorage data set.');
   54 |
   55 |         // --- Reload page to load initial data --- 
   56 |         await page.reload();
   57 |         console.log('Page reloaded after setting localStorage.');
   58 |     });
   59 |
   60 |     test('should generate a backup file containing all relevant localStorage data', async ({ page }) => {
   61 |         // --- 1. Initial Data is already set by beforeEach --- 
   62 |         // Reference the data if needed for assertions later
   63 |         const initialData = {
   64 |             [SAVED_GAMES_KEY]: { 'game1': { id: 'game1', teamName: 'Test Team', opponentName: 'Test Opponent', homeScore: 1, awayScore: 0 }},
   65 |             [APP_SETTINGS_KEY]: { currentGameId: 'game1' },
   66 |             [SEASONS_LIST_KEY]: [{ id: 's1', name: 'Test Season' }],
   67 |             [TOURNAMENTS_LIST_KEY]: [],
   68 |             [MASTER_ROSTER_KEY]: [{ id: 'p1', name: 'Test Player' }],
   69 |             [LAST_HOME_TEAM_NAME_KEY]: 'Test Team'
   70 |         };
   71 |
   72 |         // --- 2. Trigger Backup --- 
   73 |         const settingsButtonLocator = page.locator('button[title="controlBar.settings"]');
   74 |         
   75 |         // Wait for the button to be visible before clicking
>  76 |         await expect(settingsButtonLocator).toBeVisible({ timeout: 10000 }); 
      |                                             ^ Error: Timed out 10000ms waiting for expect(locator).toBeVisible()
   77 |         console.log('Settings button is visible.');
   78 |         await settingsButtonLocator.click();
   79 |         console.log('Clicked settings button.');
   80 |
   81 |         // <<< RE-ADD EXPLICIT WAIT for menu dropdown >>>
   82 |         await page.waitForTimeout(500); // Wait 500ms for menu to appear
   83 |         console.log('Waited for menu to appear.');
   84 |         // <<< END RE-ADD >>>
   85 |
   86 |         // Click Load Game menu item using getByText locator
   87 |         await page.getByText('Lataa Peli').click(); // Changed locator
   88 |         console.log('Clicked Load Game menu item using getByText.');
   89 |
   90 |         // Wait for modal to be visible (use Finnish text)
   91 |         await expect(page.getByRole('heading', { name: /Lataa Peli/i })).toBeVisible();
   92 |         
   93 |         // Fetch the actual data from localStorage *before* triggering the backup
   94 |         const actualLocalStorageData = await getLocalStorageData(page);
   95 |         // We'll compare the downloaded data against this actualLocalStorageData
   96 |
   97 |         // --- 3. Capture Download and Verify Data using waitForEvent --- 
   98 |         // Start waiting for the download *before* clicking the backup button
   99 |         const downloadPromise = page.waitForEvent('download');
  100 |
  101 |         // Click the Backup button (using Finnish text shown in the UI)
  102 |         await page.getByRole('button', { name: /Varmuuskopioi Kaikki Tiedot/i }).click();
  103 |
  104 |         // Wait for the download event to complete
  105 |         const download = await downloadPromise;
  106 |
  107 |         // Read the downloaded file content
  108 |         const readStream = await download.createReadStream();
  109 |         const chunks = [];
  110 |         for await (const chunk of readStream) {
  111 |             chunks.push(chunk);
  112 |         }
  113 |         const backupFileContentString = Buffer.concat(chunks).toString('utf-8');
  114 |
  115 |         // Ensure we captured valid backup data string
  116 |         expect(backupFileContentString, 'Should have captured backup content string via download').not.toBe('');
  117 |
  118 |         // Parse the captured data
  119 |         let downloadedBackupData: Record<string, any>; 
  120 |         try {
  121 |             downloadedBackupData = JSON.parse(backupFileContentString);
  122 |         } catch (parseError: any) { 
  123 |             throw new Error(`Failed to parse downloaded backup JSON: ${parseError.message}`);
  124 |         }
  125 |
  126 |         console.log('Successfully captured and parsed backup data via download event.');
  127 |
  128 |         // --- 4. Assertions on Downloaded Data --- 
  129 |         // Basic structure checks
  130 |         expect(downloadedBackupData.meta, 'Downloaded backup should have meta field').toBeDefined();
  131 |         expect(downloadedBackupData.meta.schema, 'Downloaded meta schema should be 1').toBe(1);
  132 |         expect(downloadedBackupData.localStorage, 'Downloaded backup should have localStorage field').toBeDefined();
  133 |
  134 |         // Verify the content matches the actual localStorage data fetched earlier
  135 |         // Using the actual keys expected in the backup file structure
  136 |         expect(downloadedBackupData.localStorage.savedSoccerGames, 'Saved games data mismatch in download').toEqual(actualLocalStorageData[SAVED_GAMES_KEY]);
  137 |         expect(downloadedBackupData.localStorage.soccerAppSettings, 'App settings data mismatch in download').toEqual(actualLocalStorageData[APP_SETTINGS_KEY]);
  138 |         expect(downloadedBackupData.localStorage.soccerSeasons, 'Seasons data mismatch in download').toEqual(actualLocalStorageData[SEASONS_LIST_KEY]);
  139 |         expect(downloadedBackupData.localStorage.soccerTournaments, 'Tournaments data mismatch in download').toEqual(actualLocalStorageData[TOURNAMENTS_LIST_KEY]);
  140 |         expect(downloadedBackupData.localStorage.soccerMasterRoster, 'Master roster data mismatch in download').toEqual(actualLocalStorageData[MASTER_ROSTER_KEY]);
  141 |
  142 |         console.log('Downloaded backup data verification successful.');
  143 |     });
  144 |
  145 |     // --- Add Backup Restore Success Test --- 
  146 |     test('should successfully restore data from a valid backup file', async ({ page }) => {
  147 |         // --- 1. Initial setup - Create state A ---
  148 |         await page.goto('/');
  149 |         await page.evaluate(() => localStorage.clear());
  150 |         
  151 |         // Set up initial State A - this will be what we backup
  152 |         const stateA = {
  153 |             [SAVED_GAMES_KEY]: { 
  154 |                 'backupTest1': { 
  155 |                     id: 'backupTest1', 
  156 |                     teamName: 'Backup Team A', 
  157 |                     opponentName: 'Backup Opponent A', 
  158 |                     homeScore: 5, 
  159 |                     awayScore: 2 
  160 |                 } 
  161 |             },
  162 |             [APP_SETTINGS_KEY]: { currentGameId: 'backupTest1' },
  163 |             [SEASONS_LIST_KEY]: [{ id: 'backupSeason', name: 'Backup Season' }],
  164 |             [TOURNAMENTS_LIST_KEY]: [{ id: 'backupTournament', name: 'Backup Tournament' }],
  165 |             [MASTER_ROSTER_KEY]: [{ id: 'backupPlayer', name: 'Backup Player' }]
  166 |         };
  167 |         
  168 |         // Apply State A to localStorage
  169 |         await page.evaluate((data: Record<string, any>) => {
  170 |             for (const key in data) {
  171 |                 if (data[key] !== null && data[key] !== undefined) {
  172 |                      localStorage.setItem(key, JSON.stringify(data[key]));
  173 |                  } else {
  174 |                      localStorage.removeItem(key);
  175 |                  }
  176 |             }
```