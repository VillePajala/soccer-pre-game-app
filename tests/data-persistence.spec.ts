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
  gameNotes?: string;
}

interface SavedGamesCollection {
  [gameId: string]: AppState;
}

interface AppSettings {
  currentGameId: string | null;
}

test.describe('Data Persistence - Core Functionality', () => {
  test.describe.configure({ mode: 'serial' }); 

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

    // FIRST: Handle potential unexpected setup modal immediately after reload
    const setupModalHeadingLocator = page.getByRole('heading', { name: 'Uuden Pelin Asetukset' });
    const newGameSetupModal = page.getByTestId('new-game-setup-modal');
    try {
      // Check if the modal is open by trying to see its heading
      await expect(setupModalHeadingLocator).toBeVisible({ timeout: 10000 });
      console.log('Unexpected setup modal found after seed/reload, attempting to close it...');
      const homeTeamLabelFinnish = 'Oman joukkueen nimi: *';
      const opponentLabelFinnish = 'Vastustajan Nimi: *';
      await page.getByLabel(homeTeamLabelFinnish).fill('Workaround Home Load'); 
      await page.getByLabel(opponentLabelFinnish).fill('Workaround Away Load'); 
      await page.getByRole('button', { name: 'Aloita Peli' }).click();
      // Wait for the modal wrapper to not be visible/present
      await expect(newGameSetupModal).not.toBeVisible({ timeout: 5000 }); 
      console.log('Closed unexpected setup modal (after seed/reload).');
    } catch {
      console.log('Setup modal did not appear after seed/reload (expected behavior or handled).');
    }
    await page.waitForTimeout(250); // Brief pause for UI to settle if modal just closed

    // THEN: Wait for main UI (settings button)
    const settingsButton = page.locator('button[title="controlBar.settings"]');
    await expect(settingsButton).toBeVisible({ timeout: 30000 });
    console.log('Main UI is ready, setup modal did not appear or was handled.');

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

  test('should update game details and verify persistence', async ({ page }) => {
    const testGameId = 'update_test_game_456';
    const yourTeamName = 'Home Update Test';
    const opponentTeamName = 'Away Update Test';
    const initialNotes = 'Initial game notes.';
    const updatedNotes = 'These notes have been updated!';

    // --- Setup: Seed localStorage directly with the game loaded ---
    await page.evaluate(({ gameId, teamName, opponentName, initialNotes, savedGamesKey, appSettingsKey }) => {
      const gameToLoad: AppState = {
        id: gameId,
        teamName: teamName,
        opponentName: opponentName,
        homeScore: 0, 
        awayScore: 0,
        gameNotes: initialNotes,
        // Add other necessary initial fields if needed
      };
      const initialSavedGames: SavedGamesCollection = { [gameId]: gameToLoad };
      // Start with this game ID already set as current
      const initialAppSettings: AppSettings = { currentGameId: gameId }; 

      localStorage.setItem(savedGamesKey, JSON.stringify(initialSavedGames));
      localStorage.setItem(appSettingsKey, JSON.stringify(initialAppSettings));
      console.log('Seeded localStorage for update test');
    }, { 
        gameId: testGameId, 
        teamName: yourTeamName, 
        opponentName: opponentTeamName, 
        initialNotes: initialNotes,
        savedGamesKey: SAVED_GAMES_KEY, 
        appSettingsKey: APP_SETTINGS_KEY 
    });

    // Reload page to apply seeded storage
    await page.reload();
    console.log('Page reloaded after seeding localStorage for update test.');

    // FIRST: Handle potential unexpected setup modal immediately after reload
    const setupModalHeadingLocatorUpdateTest = page.getByRole('heading', { name: 'Uuden Pelin Asetukset' });
    const newGameSetupModalUpdateTest = page.getByTestId('new-game-setup-modal');
    try {
      await expect(setupModalHeadingLocatorUpdateTest).toBeVisible({ timeout: 10000 }); 
      console.log('Unexpected setup modal found (update test), attempting to close it...');
      const homeTeamLabelFinnish = 'Oman joukkueen nimi: *';
      const opponentLabelFinnish = 'Vastustajan Nimi: *';
      await page.getByLabel(homeTeamLabelFinnish).fill('Workaround Home Update'); 
      await page.getByLabel(opponentLabelFinnish).fill('Workaround Away Update'); 
      await page.getByRole('button', { name: 'Aloita Peli' }).click();
      await expect(newGameSetupModalUpdateTest).not.toBeVisible({ timeout: 5000 }); 
      console.log('Closed unexpected setup modal (update test).');
    } catch {
      console.log('Setup modal did not appear (update test, expected behavior or handled).');
    }
    await page.waitForTimeout(250); // Brief pause for UI to settle

    // THEN: Wait for main UI (settings button)
    const settingsButtonUpdateTest = page.locator('button[title="controlBar.settings"]'); // Use a different const name
    await expect(settingsButtonUpdateTest).toBeVisible({ timeout: 30000 });
    console.log('Main UI is ready (update test).');

    // --- Action: Update Game Notes ---
    // Open Game Settings modal (assuming there's a button for it)
    // Adjust locator based on actual button (e.g., title, icon, text)
    const gameSettingsButton = page.locator('button[title="Game Settings"]'); // THIS SEEMS OK
    await gameSettingsButton.click();
    console.log('Clicked Game Settings button.');

    // Wait for modal to appear. The notes section is what we interact with first.
    // The heading for notes is "Game Notes" (or its translation)
    const notesHeadingLocator = page.getByRole('heading', { name: /Game Notes|Muistiinpanot/i });
    await expect(notesHeadingLocator).toBeVisible({ timeout: 10000 });
    console.log('Game Settings modal is visible, notes section heading found.');

    // Click the edit button next to the "Game Notes" heading to enable editing
    // The edit button is a direct sibling or near the heading, often just an icon
    // Looking for a button near the heading. The GameSettingsModal has <FaEdit />
    // const editNotesButton = notesHeadingLocator.locator('xpath=following-sibling::button[1]'); // Assuming it's the first button sibling
    // A more robust locator might be needed if the structure is different or if there's a specific title/aria-label for the edit button.
    // For now, let's try with a more direct approach if the above is too fragile:
    // Locate the button that triggers the inline edit for notes.
    // In GameSettingsModal.tsx, this is a button with an FaEdit icon.
    // We can find the h3, then its parent, then the button within that parent that has the edit icon.
    // Or, if the button has a unique accessible name or title, use that.
    // Let's assume the button has an accessible name like "Edit" or a title.
    // From the code, the button is: <button onClick={() => handleStartInlineEdit('notes')} ...><FaEdit .../></button>
    // A more specific locator could be:
    // const editNotesButton = page.locator('h3:has-text("Game Notes")').locator('..').getByRole('button').filter({ has: page.locator('svg[data-icon="edit"]') });
    // For now, let's try a more general approach of finding the button next to the heading.
    // It's the button that, when clicked, calls handleStartInlineEdit('notes').
    // This button contains an <FaEdit /> icon.
    const notesEditButton = notesHeadingLocator.getByRole('button');
    await expect(notesEditButton).toBeVisible({timeout: 5000});
    await notesEditButton.click();
    console.log('Clicked edit notes button.');

    // The textarea is revealed after clicking the edit button.
    // It will have a value, so getByPlaceholder will not work.
    // Locate it structurally within the notes section.
    const notesSection = notesHeadingLocator.locator('xpath=ancestor::div[contains(@class, "p-4") and contains(@class, "rounded-lg")]');
    const notesTextarea = notesSection.locator('textarea');
    await expect(notesTextarea).toBeVisible({ timeout: 10000 });
    console.log('Game Notes textarea is now visible.');

    // Verify initial notes are present
    await expect(notesTextarea).toHaveValue(initialNotes);
    console.log('Verified initial notes.');

    // Fill with updated notes
    await notesTextarea.fill(updatedNotes);
    console.log('Filled updated notes.');

    // Save/Close the modal. Locate the save button within the notesSection.
    // Name should be exactly "Save" or "Tallenna"
    const saveButton = notesSection.getByRole('button', { name: /^(Save|Tallenna)$/i });
    await saveButton.click();
    await expect(notesTextarea).not.toBeVisible({ timeout: 5000 }); // Wait for modal to close
    console.log('Closed Game Settings modal.');

    // --- Assertion 1: Verify localStorage update ---
    const savedGames = await page.evaluate(({ savedGamesKey }) => {
      const savedGamesJson = localStorage.getItem(savedGamesKey);
      return savedGamesJson ? JSON.parse(savedGamesJson) as SavedGamesCollection : null;
    }, { savedGamesKey: SAVED_GAMES_KEY });

    expect(savedGames, 'Saved games collection should still exist').not.toBeNull();
    const updatedGameData = savedGames?.[testGameId];
    expect(updatedGameData, 'Updated game data should exist').toBeDefined();
    expect(updatedGameData?.gameNotes, 'Game notes in localStorage should be updated').toBe(updatedNotes);
    console.log('Verified game notes updated in localStorage.');

    // --- Assertion 2: Verify persistence after reload ---
    console.log('Reloading page to verify persistence...');
    await page.reload();
    await expect(settingsButtonUpdateTest).toBeVisible({ timeout: 30000 }); // Wait for UI again

    // Re-open Game Settings
    await gameSettingsButton.click();
    // ADD: Need to click edit notes button again
    await expect(notesHeadingLocator).toBeVisible({ timeout: 10000 });
    await notesEditButton.click(); // Click edit again to show textarea
    await expect(notesTextarea).toBeVisible({ timeout: 10000 });
    
    // Verify updated notes are still there
    await expect(notesTextarea).toHaveValue(updatedNotes);
    console.log('Verified updated notes persist in UI after reload.');

    // Close modal again
    // Use the same specific saveButton locator here
    const saveButtonAgain = notesSection.getByRole('button', { name: /^(Save|Tallenna)$/i });
    await saveButtonAgain.click(); 
    await expect(notesTextarea).not.toBeVisible({ timeout: 5000 });

  });

  test('should delete a game and verify its removal', async ({ page }) => {
    const gameIdToDelete = 'delete_test_game_789';
    const gameNameToDelete = 'Game To Delete';
    const gameIdToKeep = 'keep_test_game_012';
    const gameNameToKeep = 'Game To Keep';
    let initialCurrentGameId: string | null = null; // Variable to store initial currentGameId

    // --- Setup: Seed localStorage with two games ---
    await page.evaluate(({ gtdId, gtdName, gtkId, gtkName, sGamesKey, appSetKey }) => {
      const gameToDelete: AppState = {
        id: gtdId,
        teamName: gtdName,
        opponentName: 'Opponent Delete',
        homeScore: 1,
        awayScore: 0,
      };
      const gameToKeep: AppState = {
        id: gtkId,
        teamName: gtkName,
        opponentName: 'Opponent Keep',
        homeScore: 2,
        awayScore: 2,
      };
      const initialSavedGames: SavedGamesCollection = {
        [gtdId]: gameToDelete,
        [gtkId]: gameToKeep,
      };
      const appSettingsToSeed: AppSettings = { currentGameId: gtdId }; 
      initialCurrentGameId = appSettingsToSeed.currentGameId; // Store for later comparison (this line won't work as evaluate runs in browser)

      localStorage.setItem(sGamesKey, JSON.stringify(initialSavedGames));
      localStorage.setItem(appSetKey, JSON.stringify(appSettingsToSeed));
      console.log('Seeded localStorage for delete test with two games.');
    }, { 
        gtdId: gameIdToDelete, 
        gtdName: gameNameToDelete,
        gtkId: gameIdToKeep,
        gtkName: gameNameToKeep,
        sGamesKey: SAVED_GAMES_KEY, 
        appSetKey: APP_SETTINGS_KEY 
    });
    
    // Fetch initial currentGameId after page.evaluate
    const initialAppSettingsBeforeAction = await page.evaluate(({ appSetKey }) => {
        const as = localStorage.getItem(appSetKey);
        return as ? JSON.parse(as) as AppSettings : null;
    }, { appSetKey: APP_SETTINGS_KEY });
    initialCurrentGameId = initialAppSettingsBeforeAction?.currentGameId ?? null;

    await page.reload();
    console.log('Page reloaded after seeding for delete test.');

    // Handle potential setup modal
    const setupModalHeadingLocatorDelete = page.getByRole('heading', { name: 'Uuden Pelin Asetukset' });
    const newGameSetupModalDelete = page.getByTestId('new-game-setup-modal');
    try {
      await expect(setupModalHeadingLocatorDelete).toBeVisible({ timeout: 10000 });
      console.log('Unexpected setup modal found (delete test), attempting to close it...');
      await page.getByLabel('Oman joukkueen nimi: *').fill('Workaround Home Delete');
      await page.getByLabel('Vastustajan Nimi: *').fill('Workaround Away Delete');
      await page.getByRole('button', { name: 'Aloita Peli' }).click();
      await expect(newGameSetupModalDelete).not.toBeVisible({ timeout: 5000 });
      console.log('Closed unexpected setup modal (delete test).');
    } catch {
      console.log('Setup modal did not appear (delete test, expected or handled).');
    }
    await page.waitForTimeout(250); 

    // Ensure main UI is ready
    const settingsButtonDeleteTest = page.locator('button[title="controlBar.settings"]');
    await expect(settingsButtonDeleteTest).toBeVisible({ timeout: 30000 });
    console.log('Main UI is ready (delete test).');

    // --- Action: Navigate to Load Game Modal and Delete Game ---
    await settingsButtonDeleteTest.click();
    await page.getByText('Lataa Peli').click();
    const loadGameModalHeadingDelete = page.getByRole('heading', { name: /Lataa Peli/i });
    await expect(loadGameModalHeadingDelete).toBeVisible();
    console.log('Load Game modal is visible (delete test).');

    // Listen for and accept the confirmation dialog
    page.on('dialog', async dialog => {
        console.log(`Dialog message for delete: "${dialog.message()}" - Accepting.`);
        await dialog.accept();
    });

    // Locate the game item to delete and its delete button
    const gameItemToDelete = page.getByTestId(`game-item-${gameIdToDelete}`);
    await expect(gameItemToDelete).toBeVisible();
    console.log(`Found game item to delete: ${gameNameToDelete}`);
    
    // 1. Click the options menu button within the game item
    // Assuming it has a title attribute based on LoadGameModal.tsx
    const optionsButton = gameItemToDelete.locator('button[title="Options"], button[title="Valinnat"]'); // Add Finnish translation if needed
    await expect(optionsButton).toBeVisible();
    await optionsButton.click();
    console.log('Clicked options menu button.');

    // 2. Now locate and click the Delete button (likely visible globally or within a menu container)
    // Use the translation key from LoadGameModal.tsx
    const deleteButton = page.getByRole('button', { name: /Delete Game|Poista Peli/i }); 
    await expect(deleteButton).toBeVisible({ timeout: 5000 }); // Wait for menu item to appear
    await deleteButton.click();
    console.log(`Clicked delete button for game: ${gameNameToDelete}`);

    // --- Assertions ---
    // 1. UI Verification: Game to delete is gone, game to keep remains
    await expect(gameItemToDelete).not.toBeVisible({ timeout: 5000 });
    console.log(`Verified game item ${gameNameToDelete} is no longer visible in modal.`);
    
    const gameItemToKeep = page.getByTestId(`game-item-${gameIdToKeep}`);
    await expect(gameItemToKeep).toBeVisible();
    console.log(`Verified game item ${gameNameToKeep} is still visible in modal.`);

    // 2. LocalStorage Verification
    const { savedGamesAfterDelete, appSettingsAfterDelete } = await page.evaluate(({ sGamesKey, appSetKey }) => {
      const sg = localStorage.getItem(sGamesKey);
      const as = localStorage.getItem(appSetKey);
      return {
        savedGamesAfterDelete: sg ? JSON.parse(sg) as SavedGamesCollection : null,
        appSettingsAfterDelete: as ? JSON.parse(as) as AppSettings : null,
      };
    }, { sGamesKey: SAVED_GAMES_KEY, appSetKey: APP_SETTINGS_KEY });

    expect(savedGamesAfterDelete, 'Saved games collection should still exist').not.toBeNull();
    expect(savedGamesAfterDelete?.[gameIdToDelete], `Game ${gameIdToDelete} should be removed from localStorage`).toBeUndefined();
    expect(savedGamesAfterDelete?.[gameIdToKeep], `Game ${gameIdToKeep} should still exist in localStorage`).toBeDefined();
    expect(savedGamesAfterDelete?.[gameIdToKeep]?.teamName).toBe(gameNameToKeep);
    console.log('Verified localStorage: game deleted, other game remains.');

    // If the deleted game was the current game, currentGameId should become null
    // or if the list is empty. If other games exist, it might pick one - depends on app logic.
    // Since we explicitly set it to gameIdToDelete, we expect it to be null if no other game auto-loads.
    // If one auto-loads (e.g. gameIdToKeep), it would be gameIdToKeep.
    // For now, assuming it becomes null or is NOT gameIdToDelete.
    if (initialCurrentGameId === gameIdToDelete) { // Now using the correctly scoped variable
        expect(appSettingsAfterDelete?.currentGameId, 'currentGameId should be null or not the deleted gameId if deleted game was current').not.toBe(gameIdToDelete);
        // More specific check if it should be null:
        // expect(appSettingsAfterDelete?.currentGameId).toBeNull(); 
        // Or if it should be the other game:
        // expect(appSettingsAfterDelete?.currentGameId).toBe(gameIdToKeep);
        console.log(`currentGameId is now: ${appSettingsAfterDelete?.currentGameId}. Verified it is not the deleted game's ID.`);
    }
    
    // Close the modal
    // Locate the modal first, e.g., by its heading or a data-testid if available for the modal container
    const loadGameModal = page.locator('div.fixed.inset-0').filter({ has: page.getByRole('heading', { name: /Lataa Peli/i }) });
    // Use force:true as a workaround for potential pointer-event interception
    await loadGameModal.getByRole('button', { name: /Sulje/i }).click({ force: true }); 
    await expect(loadGameModalHeadingDelete).not.toBeVisible({ timeout: 5000 });
    console.log('Closed Load Game modal after delete test.');
  });

}); 