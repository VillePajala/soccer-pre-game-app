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
  [key: string]: unknown; // Use unknown instead of any for better type safety
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
    test.describe.configure({ mode: 'serial' }); // Run tests in this file serially

    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        // Clear localStorage before each test
        await page.evaluate(() => localStorage.clear());

        // --- Setup Initial Data for tests in this suite ---
        const initialDataForSuite = {
             [SAVED_GAMES_KEY]: { 'game1': { id: 'game1', teamName: 'Test Team', opponentName: 'Test Opponent', homeScore: 1, awayScore: 0 }},
             [APP_SETTINGS_KEY]: { currentGameId: 'game1' }, // This should prevent setup modal
             [SEASONS_LIST_KEY]: [{ id: 's1', name: 'Test Season' }],
             [TOURNAMENTS_LIST_KEY]: [],
             [MASTER_ROSTER_KEY]: [{ id: 'p1', name: 'Test Player' }],
             [LAST_HOME_TEAM_NAME_KEY]: 'Test Team'
        };
        await page.evaluate((data: Partial<LocalStorageValues>) => {
             for (const key in data) {
                 if (data[key] !== null && data[key] !== undefined) {
                     localStorage.setItem(key, JSON.stringify(data[key]));
                 } else {
                     localStorage.removeItem(key);
                 }
             }
         }, initialDataForSuite);
        console.log('Initial localStorage data set for backup/restore suite.');

        // --- Reload page to load initial data --- 
        await page.reload();
        // Add a slightly longer wait for the page to potentially stabilize after reload, before modal check
        await page.waitForLoadState('domcontentloaded'); 
        await page.waitForTimeout(500); // Increased from 250ms if it was there, or added.
        console.log('Page reloaded and waited, now checking for setup modal in backup/restore suite.');
        
        // Handle potential unexpected setup modal (copied from data-persistence.spec.ts)
        const setupModalHeadingLocator = page.getByRole('heading', { name: 'Uuden Pelin Asetukset' });
        const newGameSetupModal = page.getByTestId('new-game-setup-modal'); // Ensure this test ID exists or adjust
        try {
          await expect(setupModalHeadingLocator).toBeVisible({ timeout: 10000 }); // Check if modal appears
          console.log('Unexpected setup modal found in backup/restore suite, attempting to close it...');
          const homeTeamLabelFinnish = 'Oman joukkueen nimi: *';
          const opponentLabelFinnish = 'Vastustajan Nimi: *';
          await page.getByLabel(homeTeamLabelFinnish).fill('Workaround Home BR'); 
          await page.getByLabel(opponentLabelFinnish).fill('Workaround Away BR'); 
          await page.getByRole('button', { name: 'Aloita Peli' }).click();
          await expect(newGameSetupModal).not.toBeVisible({ timeout: 5000 }); 
          console.log('Closed unexpected setup modal in backup/restore suite.');
        } catch {
          console.log('Setup modal did not appear in backup/restore suite (expected or handled).');
        }
        await page.waitForTimeout(250); // Brief pause for UI to settle

        // --- Ensure the main UI is ready before tests start ---
        await expect(page.locator('body')).toBeVisible(); // Basic check for body
        const mainSettingsButton = page.locator('button[title="controlBar.settings"]');
        await expect(mainSettingsButton).toBeVisible({ timeout: 30000 }); 
        console.log('Main UI confirmed ready after reload in backup/restore suite.');
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
        await page.evaluate((data: Partial<LocalStorageValues>) => {
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
            // Cast window to explicitly add the property for the test
            (window as Window & typeof globalThis & { __originalReload?: typeof window.location.reload }).__originalReload = window.location.reload;
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
        await page.evaluate((data: Partial<LocalStorageValues>) => {
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

    // --- Add Backup Restore Failure Tests ---

    test('should show an alert when restoring a non-JSON file', async ({ page }) => {
        console.log('Restore non-JSON test started.');

        // --- 1. Store initial localStorage state for comparison later ---
        const initialLocalStorageState = await getLocalStorageData(page);

        // --- 2. Set up dialog listener ---
        let alertMessage = '';
        page.on('dialog', async dialog => {
            console.log(`Dialog message received: ${dialog.message()}`);
            alertMessage = dialog.message();
            await dialog.dismiss(); // Dismiss the alert
        });

        // --- 3. Trigger Restore and Upload Invalid File ---
        // Open the Load Game modal
        const settingsButtonLocator = page.locator('button[title="controlBar.settings"]');
        await expect(settingsButtonLocator).toBeVisible({ timeout: 10000 });
        await settingsButtonLocator.click();
        await page.getByText('Lataa Peli').click();
        await expect(page.getByRole('heading', { name: /Lataa Peli/i })).toBeVisible();

        // Prepare a non-JSON file content
        const nonJsonContent = 'This is just a text file, not JSON.';
        const nonJsonFile = {
            name: 'invalid.txt',
            mimeType: 'text/plain',
            buffer: Buffer.from(nonJsonContent),
        };

        // Locate the file input for "Restore from Backup"
        // Assuming the input is visually hidden but present, and triggered by a button.
        // We need to find the actual <input type="file"> element.
        // Let's assume it's an input element that becomes targetable, or its associated button.
        // A common pattern is a button that says "Restore from Backup" and a hidden input nearby.
        // For now, trying to locate an input field. If it's more complex, adjust.
        const fileInput = page.locator('input[type="file"][aria-label*="Restore from Backup"], input[type="file"][data-testid*="restore-backup-input"]');
        
        // If the input is not directly visible/labelable, try to find a button that triggers it.
        // This might be necessary if the input itself is styled to be invisible.
        // For this example, we'll assume the input can be found directly or via a more specific selector
        // that matches how it's implemented (e.g., a test ID added to the input).
        // Let's refine this if needed, but often Playwright can interact with hidden inputs if they exist.

        // Click the "Restore from Backup" button to make the input available (if needed)
        // or directly set files if the input is always present.
        // The button is "Palauta Varmuuskopiosta"
        await page.getByRole('button', { name: /Palauta Varmuuskopiosta/i }).click();

        // Wait a brief moment for any potential file dialog to be "ready" (though Playwright handles this)
        await page.waitForTimeout(250);


        // Use setInputFiles on the (potentially hidden) file input element
        await fileInput.setInputFiles(nonJsonFile);

        // --- 4. Assertions ---
        // Wait for the dialog to appear and capture its message
        await expect.poll(async () => alertMessage, { timeout: 10000 })
                    .toContain('Error importing full backup:'); // Or a more specific part of the error

        // Verify the exact error message (adjust based on actual app behavior)
        // This might be "Invalid JSON" or "Failed to parse" or similar.
        // Example: expect(alertMessage).toMatch(/Invalid JSON|Failed to parse/i);
        // For now, let's check for the general error prefix.
        // The actual error from importFullBackup for non-JSON is "SyntaxError: Unexpected token 'T', "This is ju"... is not valid JSON"
        expect(alertMessage).toMatch(/Error importing full backup:.*(Unexpected token|not valid JSON)/i);
        console.log('Verified alert for non-JSON restore.');

        // --- 5. Verify localStorage integrity (optional but good) ---
        const finalLocalStorageState = await getLocalStorageData(page);
        expect(finalLocalStorageState, 'LocalStorage state should not change after failed restore').toEqual(initialLocalStorageState);
        console.log('Verified localStorage remains unchanged after failed non-JSON restore.');

        // --- 6. Close the Load Game Modal ---
        const loadGameModal = page.locator('div.fixed.inset-0 > div.bg-slate-800')
                                  .filter({ has: page.getByRole('heading', { name: /Lataa Peli/i }) });
        const closeButton = loadGameModal.getByRole('button', { name: /Sulje/i });
        await expect(closeButton).toBeVisible({timeout: 5000}); 
        await closeButton.click();
        await expect(page.getByRole('heading', { name: /Lataa Peli/i })).not.toBeVisible({ timeout: 5000 }); 
        console.log('Closed Load Game modal after non-JSON restore test.');
    });

    test('should show an alert when restoring malformed JSON', async ({ page }) => {
        console.log('Restore malformed JSON test started.');

        const initialLocalStorageState = await getLocalStorageData(page);
        let alertMessage = '';
        page.on('dialog', async dialog => {
            console.log(`Dialog message received: ${dialog.message()}`);
            alertMessage = dialog.message();
            await dialog.dismiss();
        });

        const settingsButtonLocator = page.locator('button[title="controlBar.settings"]');
        await expect(settingsButtonLocator).toBeVisible({ timeout: 10000 });
        await settingsButtonLocator.click();
        await page.getByText('Lataa Peli').click();
        await expect(page.getByRole('heading', { name: /Lataa Peli/i })).toBeVisible();

        const malformedJsonContent = '{"meta": {"schema": 1, "exportedAt": "2023-10-01T10:00:00.000Z"}, "localStorage": { "savedSoccerGames": { "game1": { "id": "game1" } } } // Missing closing brace for root object';
        const malformedJsonFile = {
            name: 'malformed.json',
            mimeType: 'application/json',
            buffer: Buffer.from(malformedJsonContent),
        };

        await page.getByRole('button', { name: /Palauta Varmuuskopiosta/i }).click();
        await page.waitForTimeout(250);

        const fileInput = page.locator('input[type="file"][aria-label*="Restore from Backup"], input[type="file"][data-testid*="restore-backup-input"]');
        await fileInput.setInputFiles(malformedJsonFile);

        await expect.poll(async () => alertMessage, { timeout: 10000 })
                    .toContain('Error importing full backup:');
        
        // Check for a syntax error message
        expect(alertMessage).toMatch(/Error importing full backup:.*(Unexpected end of JSON input|SyntaxError|Expected .* after property value)/i);
        console.log('Verified alert for malformed JSON restore.');

        const finalLocalStorageState = await getLocalStorageData(page);
        expect(finalLocalStorageState, 'LocalStorage state should not change after failed malformed JSON restore').toEqual(initialLocalStorageState);
        console.log('Verified localStorage remains unchanged after failed malformed JSON restore.');

        const loadGameModal = page.locator('div.fixed.inset-0 > div.bg-slate-800')
                                  .filter({ has: page.getByRole('heading', { name: /Lataa Peli/i }) });
        const closeButton = loadGameModal.getByRole('button', { name: /Sulje/i });
        await expect(closeButton).toBeVisible({timeout: 5000}); 
        await closeButton.click();
        await expect(page.getByRole('heading', { name: /Lataa Peli/i })).not.toBeVisible({ timeout: 5000 }); 
        console.log('Closed Load Game modal after malformed JSON restore test.');
    });

    test('should show an alert when restoring JSON with missing structure (e.g., no meta key)', async ({ page }) => {
        console.log('Restore missing structure test started.');

        const initialLocalStorageState = await getLocalStorageData(page);
        let alertMessage = '';
        page.on('dialog', async dialog => {
            alertMessage = dialog.message();
            await dialog.dismiss();
        });

        const settingsButtonLocator = page.locator('button[title="controlBar.settings"]');
        await expect(settingsButtonLocator).toBeVisible({ timeout: 10000 });
        await settingsButtonLocator.click();
        await page.getByText('Lataa Peli').click();
        await expect(page.getByRole('heading', { name: /Lataa Peli/i })).toBeVisible();

        const missingStructureContent = JSON.stringify({
            // No 'meta' key
            localStorage: { 
                [SAVED_GAMES_KEY]: { 'game1': { id: 'game1' } } 
            }
        });
        const missingStructureFile = {
            name: 'missing_structure.json',
            mimeType: 'application/json',
            buffer: Buffer.from(missingStructureContent),
        };

        await page.getByRole('button', { name: /Palauta Varmuuskopiosta/i }).click();
        await page.waitForTimeout(250);
        const fileInput = page.locator('input[type="file"][aria-label*="Restore from Backup"], input[type="file"][data-testid*="restore-backup-input"]');
        await fileInput.setInputFiles(missingStructureFile);

        await expect.poll(async () => alertMessage, { timeout: 10000 })
            .toMatch(/Error importing full backup:.*(Invalid format: Missing 'meta' information)/i);
        console.log('Verified alert for missing structure restore.');

        const finalLocalStorageState = await getLocalStorageData(page);
        expect(finalLocalStorageState).toEqual(initialLocalStorageState);
        console.log('Verified localStorage remains unchanged after failed missing structure restore.');

        const loadGameModal = page.locator('div.fixed.inset-0 > div.bg-slate-800').filter({ has: page.getByRole('heading', { name: /Lataa Peli/i }) });
        const closeButton = loadGameModal.getByRole('button', { name: /Sulje/i });
        await expect(closeButton).toBeVisible({timeout: 5000}); 
        await closeButton.click();
        await expect(page.getByRole('heading', { name: /Lataa Peli/i })).not.toBeVisible({ timeout: 5000 }); 
    });

    test('should show an alert when restoring JSON with unsupported schema version', async ({ page }) => {
        console.log('Restore unsupported schema test started.');

        const initialLocalStorageState = await getLocalStorageData(page);
        let alertMessage = '';
        page.on('dialog', async dialog => {
            alertMessage = dialog.message();
            await dialog.dismiss();
        });

        const settingsButtonLocator = page.locator('button[title="controlBar.settings"]');
        await expect(settingsButtonLocator).toBeVisible({ timeout: 10000 });
        await settingsButtonLocator.click();
        await page.getByText('Lataa Peli').click();
        await expect(page.getByRole('heading', { name: /Lataa Peli/i })).toBeVisible();

        const unsupportedSchemaContent = JSON.stringify({
            meta: { schema: 99, exportedAt: new Date().toISOString() }, // Unsupported schema
            localStorage: {
                [SAVED_GAMES_KEY]: { 'game1': { id: 'game1' } }
            }
        });
        const unsupportedSchemaFile = {
            name: 'unsupported_schema.json',
            mimeType: 'application/json',
            buffer: Buffer.from(unsupportedSchemaContent),
        };

        await page.getByRole('button', { name: /Palauta Varmuuskopiosta/i }).click();
        await page.waitForTimeout(250);
        const fileInput = page.locator('input[type="file"][aria-label*="Restore from Backup"], input[type="file"][data-testid*="restore-backup-input"]');
        await fileInput.setInputFiles(unsupportedSchemaFile);

        await expect.poll(async () => alertMessage, { timeout: 10000 })
            .toMatch(/Error importing full backup:.*(Unsupported schema version)/i);
        console.log('Verified alert for unsupported schema restore.');

        const finalLocalStorageState = await getLocalStorageData(page);
        expect(finalLocalStorageState).toEqual(initialLocalStorageState);
        console.log('Verified localStorage remains unchanged after failed unsupported schema restore.');

        const loadGameModal = page.locator('div.fixed.inset-0 > div.bg-slate-800').filter({ has: page.getByRole('heading', { name: /Lataa Peli/i }) });
        const closeButton = loadGameModal.getByRole('button', { name: /Sulje/i });
        await expect(closeButton).toBeVisible({timeout: 5000}); 
        await closeButton.click();
        await expect(page.getByRole('heading', { name: /Lataa Peli/i })).not.toBeVisible({ timeout: 5000 }); 
    });

    // More tests for other failure scenarios (wrong schema) will go here.

}); 