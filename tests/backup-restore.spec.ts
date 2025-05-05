import { test, expect, Page } from '@playwright/test';
import { 
    SAVED_GAMES_KEY, 
    APP_SETTINGS_KEY, 
    SEASONS_LIST_KEY, 
    TOURNAMENTS_LIST_KEY, 
    MASTER_ROSTER_KEY, 
    LAST_HOME_TEAM_NAME_KEY 
} from '../src/config/constants';

// Helper function to get all relevant localStorage data from the browser context
async function getLocalStorageData(page: Page): Promise<Record<string, any>> {
    return await page.evaluate(({ keys }: { keys: string[] }) => {
        const data: { [key: string]: any } = {};
        keys.forEach((key: string) => {
            const item = localStorage.getItem(key);
            try {
                data[key] = item ? JSON.parse(item) : null;
            } catch (parseError) {
                console.warn(`Failed to parse localStorage item ${key}:`, parseError);
                data[key] = item; // Store as raw string if JSON parse fails
            }
        });
        return data;
    }, { keys: [SAVED_GAMES_KEY, APP_SETTINGS_KEY, SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY, MASTER_ROSTER_KEY, LAST_HOME_TEAM_NAME_KEY] });
}

test.describe('Data Safety - Backup & Restore', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Clear localStorage before each test
        await page.evaluate(() => localStorage.clear());

        // --- Setup Initial Data for tests in this suite ---
        const initialDataForSuite = {
             [SAVED_GAMES_KEY]: { 'game1': { id: 'game1', teamName: 'Test Team', opponentName: 'Test Opponent', homeScore: 1, awayScore: 0 }},
             [APP_SETTINGS_KEY]: { currentGameId: 'game1' },
             [SEASONS_LIST_KEY]: [{ id: 's1', name: 'Test Season' }],
             [TOURNAMENTS_LIST_KEY]: [],
             [MASTER_ROSTER_KEY]: [{ id: 'p1', name: 'Test Player' }],
             [LAST_HOME_TEAM_NAME_KEY]: 'Test Team'
        };
        await page.evaluate((data: Record<string, any>) => {
             for (const key in data) {
                 if (data[key] !== null && data[key] !== undefined) {
                     localStorage.setItem(key, JSON.stringify(data[key]));
                 } else {
                     localStorage.removeItem(key);
                 }
             }
         }, initialDataForSuite);
        console.log('Initial localStorage data set.');

        // --- Reload page to load initial data --- 
        await page.reload();
        console.log('Page reloaded after setting localStorage.');
    });

    test('should generate a backup file containing all relevant localStorage data', async ({ page }) => {
        // --- 1. Initial Data is already set by beforeEach --- 
        // Reference the data if needed for assertions later
        const initialData = {
            [SAVED_GAMES_KEY]: { 'game1': { id: 'game1', teamName: 'Test Team', opponentName: 'Test Opponent', homeScore: 1, awayScore: 0 }},
            [APP_SETTINGS_KEY]: { currentGameId: 'game1' },
            [SEASONS_LIST_KEY]: [{ id: 's1', name: 'Test Season' }],
            [TOURNAMENTS_LIST_KEY]: [],
            [MASTER_ROSTER_KEY]: [{ id: 'p1', name: 'Test Player' }],
            [LAST_HOME_TEAM_NAME_KEY]: 'Test Team'
        };

        // --- 2. Trigger Backup --- 
        const settingsButtonLocator = page.locator('button[title="controlBar.settings"]');
        
        // Wait for the button to be visible before clicking
        await expect(settingsButtonLocator).toBeVisible({ timeout: 10000 }); 
        console.log('Settings button is visible.');
        await settingsButtonLocator.click();
        console.log('Clicked settings button.');

        // <<< RE-ADD EXPLICIT WAIT for menu dropdown >>>
        await page.waitForTimeout(500); // Wait 500ms for menu to appear
        console.log('Waited for menu to appear.');
        // <<< END RE-ADD >>>

        // Click Load Game menu item using getByText locator
        await page.getByText('Lataa Peli').click(); // Changed locator
        console.log('Clicked Load Game menu item using getByText.');

        // Wait for modal to be visible (use Finnish text)
        await expect(page.getByRole('heading', { name: /Lataa Peli/i })).toBeVisible();
        
        // Fetch the actual data from localStorage *before* triggering the backup
        const actualLocalStorageData = await getLocalStorageData(page);
        // We'll compare the downloaded data against this actualLocalStorageData

        // --- 3. Capture Download and Verify Data using waitForEvent --- 
        // Start waiting for the download *before* clicking the backup button
        const downloadPromise = page.waitForEvent('download');

        // Click the Backup button (using Finnish text shown in the UI)
        await page.getByRole('button', { name: /Varmuuskopioi Kaikki Tiedot/i }).click();

        // Wait for the download event to complete
        const download = await downloadPromise;

        // Read the downloaded file content
        const readStream = await download.createReadStream();
        const chunks = [];
        for await (const chunk of readStream) {
            chunks.push(chunk);
        }
        const backupFileContentString = Buffer.concat(chunks).toString('utf-8');

        // Ensure we captured valid backup data string
        expect(backupFileContentString, 'Should have captured backup content string via download').not.toBe('');

        // Parse the captured data
        let downloadedBackupData: Record<string, any>; 
        try {
            downloadedBackupData = JSON.parse(backupFileContentString);
        } catch (parseError: any) { 
            throw new Error(`Failed to parse downloaded backup JSON: ${parseError.message}`);
        }

        console.log('Successfully captured and parsed backup data via download event.');

        // --- 4. Assertions on Downloaded Data --- 
        // Basic structure checks
        expect(downloadedBackupData.meta, 'Downloaded backup should have meta field').toBeDefined();
        expect(downloadedBackupData.meta.schema, 'Downloaded meta schema should be 1').toBe(1);
        expect(downloadedBackupData.localStorage, 'Downloaded backup should have localStorage field').toBeDefined();

        // Verify the content matches the actual localStorage data fetched earlier
        // Using the actual keys expected in the backup file structure
        expect(downloadedBackupData.localStorage.savedSoccerGames, 'Saved games data mismatch in download').toEqual(actualLocalStorageData[SAVED_GAMES_KEY]);
        expect(downloadedBackupData.localStorage.soccerAppSettings, 'App settings data mismatch in download').toEqual(actualLocalStorageData[APP_SETTINGS_KEY]);
        expect(downloadedBackupData.localStorage.soccerSeasons, 'Seasons data mismatch in download').toEqual(actualLocalStorageData[SEASONS_LIST_KEY]);
        expect(downloadedBackupData.localStorage.soccerTournaments, 'Tournaments data mismatch in download').toEqual(actualLocalStorageData[TOURNAMENTS_LIST_KEY]);
        expect(downloadedBackupData.localStorage.soccerMasterRoster, 'Master roster data mismatch in download').toEqual(actualLocalStorageData[MASTER_ROSTER_KEY]);

        console.log('Downloaded backup data verification successful.');
    });

    // --- Add Backup Restore Success Test --- 
    test('should successfully restore data from a valid backup file', async ({ page }) => {
        // --- 1. Initial setup - Create state A ---
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());
        
        // Set up initial State A - this will be what we backup
        const stateA = {
            [SAVED_GAMES_KEY]: { 
                'backupTest1': { 
                    id: 'backupTest1', 
                    teamName: 'Backup Team A', 
                    opponentName: 'Backup Opponent A', 
                    homeScore: 5, 
                    awayScore: 2 
                } 
            },
            [APP_SETTINGS_KEY]: { currentGameId: 'backupTest1' },
            [SEASONS_LIST_KEY]: [{ id: 'backupSeason', name: 'Backup Season' }],
            [TOURNAMENTS_LIST_KEY]: [{ id: 'backupTournament', name: 'Backup Tournament' }],
            [MASTER_ROSTER_KEY]: [{ id: 'backupPlayer', name: 'Backup Player' }]
        };
        
        // Apply State A to localStorage
        await page.evaluate((data: Record<string, any>) => {
            for (const key in data) {
                if (data[key] !== null && data[key] !== undefined) {
                     localStorage.setItem(key, JSON.stringify(data[key]));
                 } else {
                     localStorage.removeItem(key);
                 }
            }
        }, stateA);
        console.log('Set up initial State A');
        
        // Handle the new game setup modal that appears on initial load
        await expect(page.getByRole('heading', { name: 'Uuden Pelin Asetukset' })).toBeVisible({ timeout: 10000 });
        await page.getByRole('button', { name: 'Ohita' }).click();
        await expect(page.locator('div.fixed.inset-0.bg-black.bg-opacity-70')).not.toBeVisible({ timeout: 5000 });
        
        // --- 2. Generate and Capture Backup using waitForEvent('download') ---
        await page.evaluate(() => {
            // Only need to mock confirm and reload here
            window.confirm = () => true; // Always confirm for the restore later
            // Cast window to any for custom properties
            (window as any).__originalReload = window.location.reload;
            window.location.reload = () => { console.log("Prevented page reload during test"); }; // Prevent reload
        });
        
        const settingsButtonLocator = page.locator('button[title="controlBar.settings"]');
        
        // Wait for the button to be visible before clicking
        await expect(settingsButtonLocator).toBeVisible({ timeout: 10000 });
        console.log('Settings button is visible for restore test.');
        await settingsButtonLocator.click();
        console.log('Clicked settings button for restore test.');

        await page.getByText('Lataa Peli').click();
        await expect(page.getByRole('heading', { name: /Lataa Peli/i })).toBeVisible();
        
        // Get the ACTUAL localStorage state *just before* triggering the backup
        // This will include stateA + any state from beforeEach
        const preBackupState = await getLocalStorageData(page);
        console.log('Captured pre-backup state for verification');
        
        // Start waiting for the download *before* clicking the button
        const downloadPromise = page.waitForEvent('download');
        
        // Click the Backup button
        await page.getByRole('button', { name: /Varmuuskopioi Kaikki Tiedot/i }).click();
        
        // Wait for the download event to complete
        const download = await downloadPromise;
        
        // Read the downloaded file content
        const readStream = await download.createReadStream();
        const chunks = [];
        for await (const chunk of readStream) {
            chunks.push(chunk);
        }
        const backupFileContentString = Buffer.concat(chunks).toString('utf-8');
        
        // Ensure we captured valid backup data
        expect(backupFileContentString, 'Should have captured backup content string').not.toBe('');
        console.log('Successfully captured real backup data via download event');
        
        // Parse the captured data
        let capturedBackupData: Record<string, any>; 
        try {
            capturedBackupData = JSON.parse(backupFileContentString);
        } catch (parseError: any) { 
            throw new Error(`Failed to parse captured backup JSON: ${parseError.message}`);
        }
        
        // Basic structure checks on the *captured* data
        expect(capturedBackupData.meta, 'Captured backup should have meta field').toBeDefined();
        expect(capturedBackupData.meta.schema, 'Captured meta schema should be 1').toBe(1);
        expect(capturedBackupData.localStorage, 'Captured backup should have localStorage field').toBeDefined();
        
        // Verify the captured backup content matches the preBackupState
        expect(capturedBackupData.localStorage.savedSoccerGames, 'Saved games data mismatch in captured backup').toEqual(preBackupState[SAVED_GAMES_KEY]);
        expect(capturedBackupData.localStorage.soccerAppSettings, 'App settings data mismatch in captured backup').toEqual(preBackupState[APP_SETTINGS_KEY]);
        expect(capturedBackupData.localStorage.soccerSeasons, 'Seasons data mismatch in captured backup').toEqual(preBackupState[SEASONS_LIST_KEY]);
        expect(capturedBackupData.localStorage.soccerTournaments, 'Tournaments data mismatch in captured backup').toEqual(preBackupState[TOURNAMENTS_LIST_KEY]);
        expect(capturedBackupData.localStorage.soccerMasterRoster, 'Master roster data mismatch in captured backup').toEqual(preBackupState[MASTER_ROSTER_KEY]);
        console.log('Verified captured backup matches pre-backup state.');

        // --- 3. Change to a different state (State B) ---
        const stateB = {
            [SAVED_GAMES_KEY]: { 
                'restoreTest2': { 
                    id: 'restoreTest2', 
                    teamName: 'Different Team B', 
                    opponentName: 'Different Opponent B', 
                    homeScore: 1, 
                    awayScore: 3 
                } 
            },
            [APP_SETTINGS_KEY]: { currentGameId: 'restoreTest2' },
            [SEASONS_LIST_KEY]: [],
            [TOURNAMENTS_LIST_KEY]: [],
            [MASTER_ROSTER_KEY]: []
        };
        
        // Apply State B to localStorage
        await page.evaluate((data: Record<string, any>) => {
            for (const key in data) {
                if (data[key] !== null && data[key] !== undefined) {
                     localStorage.setItem(key, JSON.stringify(data[key]));
                 } else {
                     localStorage.removeItem(key);
                 }
            }
        }, stateB);
        console.log('Changed to State B');
        
        // Verify we are indeed in State B before restore
        const stateBData = await getLocalStorageData(page);
        expect(stateBData[SAVED_GAMES_KEY], 'Should be in State B before restore').toEqual(stateB[SAVED_GAMES_KEY]);
        expect(stateBData[SAVED_GAMES_KEY]).not.toEqual(preBackupState[SAVED_GAMES_KEY]); // Check different from pre-backup
        
        // --- 4. Restore from backup using setInputFiles ---
        // Prepare the file payload using the *string content captured earlier*
        const filePayload = {
            name: 'restore-backup.json',
            mimeType: 'application/json',
            buffer: Buffer.from(backupFileContentString) // Use the captured string
        };
        
        // Use the known selector for the file input
        const fileInputSelector = '#restore-backup-input';
        const fileInput = page.locator(fileInputSelector);
        
        // Set the input - this triggers the app's restore logic
        await fileInput.setInputFiles(filePayload);
        
        // --- 5. Verify we're back to the preBackupState ---
        // Use expect.poll for reliable waiting
        await expect.poll(async () => {
            const currentData = await getLocalStorageData(page);
            return currentData[SAVED_GAMES_KEY];
        }, {
            message: `LocalStorage key ${SAVED_GAMES_KEY} did not revert to pre-backup state after restore`,
            timeout: 5000
        }).toEqual(preBackupState[SAVED_GAMES_KEY]); // Compare against the state captured *before* backup

        // Verify all other keys also match the preBackupState
        const restoredData = await getLocalStorageData(page);
        expect(restoredData[APP_SETTINGS_KEY], 'App settings not restored correctly').toEqual(preBackupState[APP_SETTINGS_KEY]);
        expect(restoredData[SEASONS_LIST_KEY], 'Seasons list not restored correctly').toEqual(preBackupState[SEASONS_LIST_KEY]);
        expect(restoredData[TOURNAMENTS_LIST_KEY], 'Tournaments list not restored correctly').toEqual(preBackupState[TOURNAMENTS_LIST_KEY]);
        expect(restoredData[MASTER_ROSTER_KEY], 'Master roster not restored correctly').toEqual(preBackupState[MASTER_ROSTER_KEY]);

        console.log('Successfully verified restore returned to pre-backup state using downloaded backup');
    });

    // --- Add Backup Restore Failure Test --- 
}); 