import { test, expect, Page } from '@playwright/test';
import { 
    SAVED_GAMES_KEY, 
    APP_SETTINGS_KEY, 
    SEASONS_LIST_KEY, 
    TOURNAMENTS_LIST_KEY, 
    MASTER_ROSTER_KEY, 
    LAST_HOME_TEAM_NAME_KEY 
} from '../src/config/constants';

// Define expected structure for parsed data (can be refined based on actual types)
interface LocalStorageValues {
  [SAVED_GAMES_KEY]?: Record<string, object> | null;
  [APP_SETTINGS_KEY]?: { currentGameId: string | null } | null;
  [SEASONS_LIST_KEY]?: Array<object> | null;
  [TOURNAMENTS_LIST_KEY]?: Array<object> | null;
  [MASTER_ROSTER_KEY]?: Array<object> | null;
  [LAST_HOME_TEAM_NAME_KEY]?: string | null;
  [key: string]: any; // Allow other keys, keep 'any' here for flexibility
}

// Define structure for the backup file format
interface BackupFormat {
  meta: {
    schema: number;
    exportedAt: string;
  };
  localStorage: Partial<LocalStorageValues>; // Use partial as not all keys might be present
}

// Helper function - Use the defined interface
async function getLocalStorageData(page: Page): Promise<LocalStorageValues> {
    return await page.evaluate(({ keys }: { keys: string[] }) => {
        const data: LocalStorageValues = {}; // Use defined interface
        keys.forEach((key: string) => {
            const item = localStorage.getItem(key);
            try {
                data[key] = item ? JSON.parse(item) : null;
            } catch (parseError: unknown) { // Use unknown
                console.warn(`Failed to parse localStorage item ${key}:`, parseError);
                data[key] = item; 
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
        
        // <<< The setup modal should NOT appear here, so no interaction is needed >>>
        // <<< Ensure the main UI is ready before tests start >>>
        await expect(page.locator('body')).toBeVisible(); // Basic check for body
        await expect(page.locator('button[title="controlBar.settings"]')).toBeVisible({ timeout: 15000 }); // Wait for a key UI element
        console.log('Main UI confirmed ready after reload.');
    });

    test('should generate a backup file containing all relevant localStorage data', async ({ page }) => {
        // Test should now start with the main UI visible after beforeEach completes
        console.log('Generate backup test started.');
        
        const settingsButtonLocator = page.locator('button[title="controlBar.settings"]');
        
        // Wait for the button to be visible (should be faster now)
        await expect(settingsButtonLocator).toBeVisible({ timeout: 10000 }); 
        console.log('Settings button is visible.');
        
        // Click the button
        await settingsButtonLocator.click();
        console.log('Clicked settings button.');

        await page.waitForTimeout(500); // Wait for menu
        console.log('Waited for menu.');
        await page.getByText('Lataa Peli').click(); 
        console.log('Clicked Load Game menu item.');

        const loadGameModalHeading = page.getByRole('heading', { name: /Lataa Peli/i });
        await expect(loadGameModalHeading).toBeVisible();
        console.log('Load Game modal is visible.');
        
        const actualLocalStorageData = await getLocalStorageData(page);

        // --- 3. Capture Download --- 
        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: /Varmuuskopioi Kaikki Tiedot/i }).click();
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

        // Use defined BackupFormat type
        let downloadedBackupData: BackupFormat;
        try {
            downloadedBackupData = JSON.parse(backupFileContentString);
        } catch (parseError: unknown) { // Use unknown
            // Check if it's an error instance before accessing message
            const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            throw new Error(`Failed to parse downloaded backup JSON: ${errorMessage}`);
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

        // --- Explicitly close Load Game Modal and wait --- 
        // Find the modal using its heading
        const loadGameModal = page.locator('div.fixed.inset-0 > div.bg-slate-800')
                                  .filter({ has: page.getByRole('heading', { name: /Lataa Peli/i }) });
        
        // Find the close button within the modal using getByRole
        const closeButton = loadGameModal.getByRole('button', { name: /Sulje/i }); // Use Finnish text
        
        // Wait longer for the button to be visible after download
        await expect(closeButton).toBeVisible({timeout: 7000}); 
        await closeButton.click();
        console.log('Clicked Close button on Load Game modal.');
        
        // Wait for the modal heading to NOT be visible as confirmation
        await expect(page.getByRole('heading', { name: /Lataa Peli/i })).not.toBeVisible({ timeout: 5000 }); 
        console.log('Load Game modal is closed.');
        
        // Now it should be safe to interact with the control bar again if needed
        // (e.g., if we needed to click settings button again)
    });

    // --- Add Backup Restore Success Test --- 
    test('should successfully restore data from a valid backup file', async ({ page }) => {
        // Test should start with the main UI visible after beforeEach completes
        console.log('Restore test started.');

        // --- 1. Initial setup - Create state A ---
        // No page.goto or initial clear needed here, handled by beforeEach
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
        
        // The beforeEach should already guarantee the main UI (incl. settings button) is ready
        // console.log('Main UI ready (Settings button visible).');

        // --- 2. Generate and Capture Backup --- 
        await page.evaluate(() => {
            // Only need to mock confirm and reload here
            window.confirm = () => true; // Always confirm for the restore later
            // Cast window to any for custom properties
            (window as any).__originalReload = window.location.reload;
            window.location.reload = () => { console.log("Prevented page reload during test"); }; // Prevent reload
        });
        
        // Define locator and click (keep explicit wait before click)
        const settingsButtonLocator = page.locator('button[title="controlBar.settings"]');
        await expect(settingsButtonLocator).toBeVisible({ timeout: 10000 }); // Keep wait before click
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
        
        // Use defined BackupFormat type
        let capturedBackupData: BackupFormat; 
        try {
            capturedBackupData = JSON.parse(backupFileContentString);
        } catch (parseError: unknown) { // Use unknown
            const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
            throw new Error(`Failed to parse captured backup JSON: ${errorMessage}`);
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