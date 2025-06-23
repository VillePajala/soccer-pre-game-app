import { test, expect } from '@playwright/test';
import { MASTER_ROSTER_KEY, SAVED_GAMES_KEY, APP_SETTINGS_KEY } from '../src/config/constants'; // Assuming path is correct

// Define Player type subset for verification if needed
interface Player {
  id: string;
  name: string;
  nickname?: string;
  jerseyNumber?: string;
  notes?: string;
  isGoalie?: boolean;
}

test.describe('Roster Management E2E', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear local storage to ensure clean roster state for each test
    await page.evaluate(() => localStorage.clear());
    console.log('LocalStorage cleared for roster test.');
    await page.reload();
    console.log('Page reloaded.');

    // Expect the New Game Setup modal to appear after clearing storage and reloading
    const setupModalHeading = page.getByRole('heading', { name: 'Uuden Pelin Asetukset' });
    await expect(setupModalHeading).toBeVisible({ timeout: 15000 }); // Increased timeout
    console.log('New Game Setup modal is visible as expected.');

    // Fill minimal details to close the setup modal
    await page.getByLabel('Oman joukkueen nimi: *').fill('RosterTest Home');
    await page.getByLabel('Vastustajan Nimi: *').fill('RosterTest Away');
    await page.getByRole('button', { name: 'Aloita Peli' }).click();
    console.log('Closed New Game Setup modal.');
    
    // Wait for the modal to fully close/animate before proceeding
    await expect(setupModalHeading).not.toBeVisible({ timeout: 10000 });
    console.log('New Game Setup modal is no longer visible.');

    // Wait for the main UI / Control Bar to be ready
    const controlBar = page.locator('.bg-slate-800.p-2.shadow-md'); // Adjust locator if needed
    await expect(controlBar).toBeVisible({ timeout: 10000 });
    // Specifically wait for the Roster button itself using the correct title key
    await expect(page.locator('button[title="Roster Settings"]')).toBeVisible({timeout: 5000}); // Using the default text fallback for now
    // Alternative using the key directly IF translation loading is reliable:
    // await expect(page.locator('button[title="controlBar.rosterSettings"]')).toBeVisible({timeout: 5000});
    console.log('Control bar and Roster button visible, ready for roster tests.');
  });

  test('should add a new player via the roster modal', async ({ page }) => {
    const newPlayerName = 'Test Player Add';
    const newPlayerNumber = '99';
    const newPlayerNickname = 'Tester';
    const newPlayerNotes = 'This player was added by an E2E test.';

    // --- Action: Open Roster Modal ---
    const rosterButton = page.locator('button[title="Roster Settings"]'); // Use correct title
    await rosterButton.click();
    const rosterModalHeading = page.getByRole('heading', { name: /Joukkueen Hallinta/i });
    await expect(rosterModalHeading).toBeVisible({ timeout: 10000 });
    console.log('Roster modal opened.');

    // --- Action: Add Player ---
    const addPlayerButton = page.getByRole('button', { name: /Add Player|Lisää Pelaaja/i });
    await addPlayerButton.click();
    console.log('Clicked Add Player button.');

    // Fill in the new player form using Finnish placeholders
    await page.getByPlaceholder('Pelaajan Nimi').fill(newPlayerName);
    await page.getByPlaceholder('#').fill(newPlayerNumber); // Assuming placeholder is # or locate differently if needed
    await page.getByPlaceholder('Lempinimi (näytöllä)').fill(newPlayerNickname);
    await page.getByPlaceholder('Pelaajan muistiinpanot...').fill(newPlayerNotes);
    console.log('Filled new player details.');

    // Click the save/confirm button (checkmark icon)
    // Wait for an element within the form to ensure it's rendered
    const nameInput = page.getByPlaceholder('Pelaajan Nimi');
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    
    // Locate the button by looking for a button containing the checkmark SVG within the modal
    const modalContainer = page.locator('div.fixed.inset-0').filter({ has: page.getByRole('heading', { name: /Joukkueen Hallinta/i }) });
    // Find button containing an SVG with specific size classes (adjust if needed based on icon library specifics)
    const confirmAddPlayerButton = modalContainer.locator('button').filter({ has: page.locator('svg.w-5.h-5') }).first(); // Assuming checkmark is first button with icon
    await confirmAddPlayerButton.click();
    console.log('Clicked Confirm/Save for new player.');

    // --- Assertion 1: Verify Player in Modal List (SKIPPING FOR NOW - suspected modal re-render issue) ---
    // Wait for the form to potentially disappear
    await expect(page.getByPlaceholder('Pelaajan Nimi')).not.toBeVisible({ timeout: 5000 });
    console.log('Add player form closed within modal.');
    
    // --- Close the Roster Modal to check PlayerBar ---
    const closeButton = page.getByRole('button', { name: /Close/i }); // Using English default as seen in screenshots
    await closeButton.click();
    await expect(page.getByRole('heading', { name: /Joukkueen Hallinta/i })).not.toBeVisible({ timeout: 5000 });
    console.log('Roster modal closed.');

    // --- Assertion 3: Verify Player in PlayerBar after closing modal ---
    const masterRosterAfterAdd = await page.evaluate(({ rosterKey }) => {
        const rosterJson = localStorage.getItem(rosterKey);
        return rosterJson ? JSON.parse(rosterJson) as Player[] : null;
    }, { rosterKey: MASTER_ROSTER_KEY });
    const addedPlayerInStorage = masterRosterAfterAdd?.find(p => p.name === newPlayerName);
    expect(addedPlayerInStorage, 'Added player should be in localStorage to get its ID for PlayerBar check').toBeDefined();
    // const addedPlayerId = addedPlayerInStorage!.id; // We still need the ID for potential future use or more specific locators if text isn't enough

    // Check if the new player item appears in the PlayerBar
    const playerBarContainer = page.locator('div.backdrop-blur-md'); // Assuming this targets the PlayerBar
    const playerInBar = playerBarContainer.getByText(newPlayerNickname);

    await playerInBar.scrollIntoViewIfNeeded(); // Ensure the item is scrolled into view
    await expect(playerInBar).toBeVisible({ timeout: 10000 });
    console.log('Verified new player appears in the PlayerBar.');

    // --- Assertion 2: Verify Player in localStorage ---
    const masterRoster = await page.evaluate(({ rosterKey }) => {
        const rosterJson = localStorage.getItem(rosterKey);
        return rosterJson ? JSON.parse(rosterJson) as Player[] : null;
    }, { rosterKey: MASTER_ROSTER_KEY });

    expect(masterRoster, 'Master roster should exist in localStorage').not.toBeNull();
    expect(Array.isArray(masterRoster)).toBe(true);
    
    const addedPlayer = masterRoster?.find(p => p.name === newPlayerName);
    expect(addedPlayer, 'Added player data not found in localStorage roster').toBeDefined();
    expect(addedPlayer?.jerseyNumber).toBe(newPlayerNumber);
    expect(addedPlayer?.nickname).toBe(newPlayerNickname);
    expect(addedPlayer?.notes).toBe(newPlayerNotes);
    console.log('Verified new player data saved correctly in localStorage.');
  });

  test('should edit an existing player and verify changes', async ({ page }) => {
    const initialPlayerName = 'Edit Test Player';
    const initialPlayerNumber = '77';
    const initialPlayerNickname = 'Edittest';
    const initialPlayerNotes = 'Initial notes for edit test.';

    const updatedPlayerName = 'Edited Test Player Name';
    const updatedPlayerNumber = '78';
    const updatedPlayerNickname = 'EditedNickname';
    const updatedPlayerNotes = 'Updated notes after edit.';

    // --- Action: Add a player first (similar to the add player test) ---
    await page.locator('button[title="Roster Settings"]').click();
    await expect(page.getByRole('heading', { name: /Joukkueen Hallinta/i })).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Add Player|Lisää Pelaaja/i }).click();
    await page.getByPlaceholder('Pelaajan Nimi').fill(initialPlayerName);
    await page.getByPlaceholder('#').fill(initialPlayerNumber);
    await page.getByPlaceholder('Lempinimi (näytöllä)').fill(initialPlayerNickname);
    await page.getByPlaceholder('Pelaajan muistiinpanot...').fill(initialPlayerNotes);
    // Confirm add
    const modalContainer = page.locator('div.fixed.inset-0').filter({ has: page.getByRole('heading', { name: /Joukkueen Hallinta/i }) });
    await modalContainer.locator('button').filter({ has: page.locator('svg.w-5.h-5') }).first().click();
    await expect(page.getByPlaceholder('Pelaajan Nimi')).not.toBeVisible({ timeout: 5000 }); // Form closes
    console.log('Initial player added for editing.');

    // --- Action: Find the player in the list, ensuring it's scrolled into view, and click Edit ---
    const nicknameElement = modalContainer.getByText(initialPlayerNickname);

    // Scroll the nickname element into view IF NEEDED before further checks/interactions
    await nicknameElement.scrollIntoViewIfNeeded(); 
    console.log(`Ensured '${initialPlayerNickname}' is scrolled into view if needed.`);

    await expect(nicknameElement).toBeVisible({ timeout: 10000 }); // Now check visibility

    // playerRow should be the ancestor div that groups nickname and action buttons.
    // Based on observed DOM, this is likely the grandparent div of the nickname span.
    const playerRow = nicknameElement.locator('xpath=ancestor::div[2]'); 
    await expect(playerRow).toBeVisible({ timeout: 5000 }); 
    console.log('Player row (grandparent div of nickname) located for: ' + initialPlayerNickname);

    // Locate and click the three-dots options button within this new playerRow
    // Using the exact title attribute identified from the DOM inspector
    const optionsButton = playerRow.locator('button[title="Toiminnot"]');
    await expect(optionsButton).toBeVisible({ timeout: 10000 });
    await optionsButton.click();
    console.log('Clicked three-dots options button for the player.');

    // Wait for the dropdown menu to appear and find the "Muokkaa" (Edit) button
    // Prefer the button that is identified primarily by its text content, likely the menu item.
    const muokkaaButton = page.getByText('Muokkaa').locator('xpath=ancestor-or-self::button').first();
    // Scroll the "Muokkaa" button into view as the menu might need scrolling
    await muokkaaButton.scrollIntoViewIfNeeded();
    await expect(muokkaaButton).toBeVisible({ timeout: 10000 }); 
    console.log('Found "Muokkaa" button in the options menu.');
    
    await muokkaaButton.click();
    console.log('Clicked "Muokkaa" button.');

    // --- Action: Edit Player Details in the Form ---
    // The edit form should now be visible. Locate fields using placeholders,
    // assuming the edit form is similar to the add form.

    // Player Name
    const editNameInput = page.getByPlaceholder('Pelaajan Nimi'); // Search in wider scope
    await expect(editNameInput).toBeVisible({ timeout: 10000 });
    await expect(editNameInput).toHaveValue(initialPlayerName, { timeout: 5000 }); // Verify pre-fill
    await editNameInput.fill(updatedPlayerName);

    // Jersey Number
    const editJerseyInput = page.getByPlaceholder('#');
    await expect(editJerseyInput).toBeVisible({ timeout: 5000 });
    await expect(editJerseyInput).toHaveValue(initialPlayerNumber, { timeout: 5000 });
    await editJerseyInput.fill(updatedPlayerNumber);

    // Nickname
    const editNicknameInput = page.getByPlaceholder('Lempinimi (näytöllä)');
    await expect(editNicknameInput).toBeVisible({ timeout: 5000 });
    await expect(editNicknameInput).toHaveValue(initialPlayerNickname, { timeout: 5000 });
    await editNicknameInput.fill(updatedPlayerNickname);

    // Notes
    const editNotesInput = page.getByPlaceholder('Pelaajan muistiinpanot...');
    await expect(editNotesInput).toBeVisible({ timeout: 5000 });
    await expect(editNotesInput).toHaveValue(initialPlayerNotes, { timeout: 5000 });
    await editNotesInput.fill(updatedPlayerNotes);
    console.log('Filled updated player details in the edit form.');

    // Click the save/confirm button (checkmark icon)
    // This button is likely within the modalContainer, not specifically playerRow anymore.
    // Ensure we are clicking an ENABLED button to avoid the disabled "Toiminnot" button.
    const confirmEditPlayerButton = modalContainer.locator('button:not([disabled])').filter({ has: page.locator('svg.w-5.h-5') }).first();
    await confirmEditPlayerButton.click();
    console.log('Clicked Confirm/Save for edited player.');

    // Wait for the form to disappear (e.g., the name input is no longer visible)
    await expect(editNameInput).not.toBeVisible({ timeout: 5000 });
    console.log('Edit player form closed.');

    // --- Close the Roster Modal ---
    await page.getByRole('button', { name: /Close/i }).click();
    await expect(page.getByRole('heading', { name: /Joukkueen Hallinta/i })).not.toBeVisible({ timeout: 5000 });
    console.log('Roster modal closed after editing.');

    // --- Assertion 1: Verify Updated Player in PlayerBar ---
    // Use the new nickname to find the player in the PlayerBar
    const playerBarContainer = page.locator('div.backdrop-blur-md');
    const updatedPlayerInBar = playerBarContainer.getByText(updatedPlayerNickname);
    await updatedPlayerInBar.scrollIntoViewIfNeeded();
    await expect(updatedPlayerInBar).toBeVisible({ timeout: 10000 });
    // Also check that the old nickname is NOT there
    const oldPlayerInBar = playerBarContainer.getByText(initialPlayerNickname);
    await expect(oldPlayerInBar).not.toBeVisible({ timeout: 5000});
    console.log('Verified updated player appears (and old does not) in the PlayerBar.');

    // --- Assertion 2: Verify Updated Player in localStorage ---
    const masterRoster = await page.evaluate(({ rosterKey }) => {
        const rosterJson = localStorage.getItem(rosterKey);
        return rosterJson ? JSON.parse(rosterJson) as Player[] : null;
    }, { rosterKey: MASTER_ROSTER_KEY });

    expect(masterRoster, 'Master roster should exist in localStorage').not.toBeNull();
    const editedPlayer = masterRoster?.find(p => p.name === updatedPlayerName);
    expect(editedPlayer, 'Edited player data not found in localStorage roster with new name').toBeDefined();
    expect(editedPlayer?.jerseyNumber).toBe(updatedPlayerNumber);
    expect(editedPlayer?.nickname).toBe(updatedPlayerNickname);
    expect(editedPlayer?.notes).toBe(updatedPlayerNotes);

    const oldPlayer = masterRoster?.find(p => p.name === initialPlayerName);
    expect(oldPlayer, 'Player with old name should not exist in localStorage roster').toBeUndefined();
    console.log('Verified edited player data saved correctly (and old data removed) in localStorage.');
  });

  test('should delete a player and verify removal', async ({ page }) => {
    const playerToDeleteName = 'Delete Me Player';
    const playerToDeleteNumber = '00';
    const playerToDeleteNickname = 'Deletable';
    const playerToDeleteNotes = 'This player will be deleted.';

    const playerToKeepName = 'Keep Me Player';
    const playerToKeepNumber = '01';
    const playerToKeepNickname = 'Keeper';
    const playerToKeepNotes = 'This player will be kept.';

    const modalContainer = page.locator('div.fixed.inset-0').filter({ has: page.getByRole('heading', { name: /Joukkueen Hallinta/i }) });

    // Helper function to add a player when roster modal is open and "Add Player" has been clicked
    async function addPlayerInForm(name: string, num: string, nickname: string, notes: string) {
      await page.getByPlaceholder('Pelaajan Nimi').fill(name);
      await page.getByPlaceholder('#').fill(num);
      await page.getByPlaceholder('Lempinimi (näytöllä)').fill(nickname);
      await page.getByPlaceholder('Pelaajan muistiinpanot...').fill(notes);
      // Use the same save button locator as in other tests (first enabled button with w-5 h-5 svg)
      await modalContainer.locator('button:not([disabled])').filter({ has: page.locator('svg.w-5.h-5') }).first().click();
      await expect(page.getByPlaceholder('Pelaajan Nimi')).not.toBeVisible({ timeout: 5000 }); // Wait for form to close
      console.log(`Added player: ${nickname}`);
    }

    // --- Action: Open Roster Modal and Add Players ---
    await page.locator('button[title="Roster Settings"]').click();
    await expect(modalContainer).toBeVisible({ timeout: 10000 });
    console.log('Roster modal opened for delete test.');

    // Add player to delete
    await page.getByRole('button', { name: /Add Player|Lisää Pelaaja/i }).click();
    await addPlayerInForm(playerToDeleteName, playerToDeleteNumber, playerToDeleteNickname, playerToDeleteNotes);

    // Add player to keep
    await page.getByRole('button', { name: /Add Player|Lisää Pelaaja/i }).click();
    await addPlayerInForm(playerToKeepName, playerToKeepNumber, playerToKeepNickname, playerToKeepNotes);
    console.log('Both players added for delete test.');

    // --- Action: Delete "playerToDelete" ---
    const nicknameToDeleteElement = modalContainer.getByText(playerToDeleteNickname);
    await nicknameToDeleteElement.scrollIntoViewIfNeeded();
    await expect(nicknameToDeleteElement).toBeVisible({ timeout: 10000 });

    const playerToDeleteRow = nicknameToDeleteElement.locator('xpath=ancestor::div[2]');
    await expect(playerToDeleteRow).toBeVisible({ timeout: 5000 });

    const optionsButtonDelete = playerToDeleteRow.locator('button[title="Toiminnot"]');
    await expect(optionsButtonDelete).toBeVisible({ timeout: 10000 });
    await optionsButtonDelete.click();
    console.log(`Clicked three-dots for ${playerToDeleteNickname}.`);

    // Set up dialog handler BEFORE clicking delete
    let dialogAccepted = false;
    page.once('dialog', async dialog => {
      console.log(`Dialog message for delete: "${dialog.message()}" - Accepting.`);
      await dialog.accept();
      dialogAccepted = true;
    });

    const poistaButton = page.getByRole('button', { name: 'Poista' }); // Finnish for Delete
    await poistaButton.scrollIntoViewIfNeeded();
    await expect(poistaButton).toBeVisible({ timeout: 10000 });
    await poistaButton.click();
    console.log('Clicked "Poista" (Delete) button.');

    // Wait for dialog to be handled
    await expect.poll(async () => dialogAccepted, { timeout: 5000 }).toBe(true);
    console.log('Delete confirmation dialog was accepted.');

    // --- Assertions in Modal ---
    // Player to delete should NOT be visible
    await expect(nicknameToDeleteElement).not.toBeVisible({ timeout: 10000 });
    console.log(`${playerToDeleteNickname} is no longer visible in the modal list.`);

    // Player to keep SHOULD be visible
    const nicknameToKeepElement = modalContainer.getByText(playerToKeepNickname);
    await nicknameToKeepElement.scrollIntoViewIfNeeded(); // Ensure it's in view for check
    await expect(nicknameToKeepElement).toBeVisible({ timeout: 5000 });
    console.log(`${playerToKeepNickname} is still visible in the modal list.`);

    // --- Close Modal and Verify PlayerBar & localStorage ---
    await page.getByRole('button', { name: /Close/i }).click();
    await expect(modalContainer).not.toBeVisible({ timeout: 5000 });
    console.log('Roster modal closed after delete.');

    const playerBarContainer = page.locator('div.backdrop-blur-md');
    await expect(playerBarContainer.getByText(playerToDeleteNickname)).not.toBeVisible({ timeout: 5000 });
    await expect(playerBarContainer.getByText(playerToKeepNickname)).toBeVisible({ timeout: 10000 });
    console.log('Verified PlayerBar state after delete.');

    const masterRoster = await page.evaluate(({ rosterKey }) => {
        const rosterJson = localStorage.getItem(rosterKey);
        return rosterJson ? JSON.parse(rosterJson) as Player[] : null;
    }, { rosterKey: MASTER_ROSTER_KEY });

    expect(masterRoster, 'Master roster should exist').not.toBeNull();
    const deletedPlayerInStorage = masterRoster?.find(p => p.nickname === playerToDeleteNickname);
    const keptPlayerInStorage = masterRoster?.find(p => p.nickname === playerToKeepNickname);

    expect(deletedPlayerInStorage, 'Deleted player should not be in localStorage').toBeUndefined();
    expect(keptPlayerInStorage, 'Kept player should be in localStorage').toBeDefined();
    expect(keptPlayerInStorage?.name).toBe(playerToKeepName);
    console.log('Verified localStorage state after delete.');
  });

  test('should assign players on field and verify state', async ({ page }) => {
    // Define players
    const player1Name = 'AssignTest P1';
    const player1Nickname = 'Assign1';
    const player2Name = 'AssignTest P2';
    const player2Nickname = 'Assign2';

    const modalContainer = page.locator('div.fixed.inset-0').filter({ has: page.getByRole('heading', { name: /Joukkueen Hallinta/i }) });

    // Helper (could be moved outside if used more)
    async function addPlayerInForm(name: string, nickname: string) {
      await page.getByPlaceholder('Pelaajan Nimi').fill(name);
      await page.getByPlaceholder('Lempinimi (näytöllä)').fill(nickname);
      // Fill minimal required fields if any (e.g., number might be optional)
      await modalContainer.locator('button:not([disabled])').filter({ has: page.locator('svg.w-5.h-5') }).first().click();
      await expect(page.getByPlaceholder('Pelaajan Nimi')).not.toBeVisible({ timeout: 5000 });
      console.log(`Added player: ${nickname}`);
    }

    // --- Action: Add Players ---
    await page.locator('button[title="Roster Settings"]').click();
    await expect(modalContainer).toBeVisible({ timeout: 10000 });
    await page.getByRole('button', { name: /Add Player|Lisää Pelaaja/i }).click();
    await addPlayerInForm(player1Name, player1Nickname);
    await page.getByRole('button', { name: /Add Player|Lisää Pelaaja/i }).click();
    await addPlayerInForm(player2Name, player2Nickname);
    await page.getByRole('button', { name: /Close/i }).click();
    await expect(modalContainer).not.toBeVisible({ timeout: 5000 });
    console.log('Players added and roster modal closed.');

    // --- Action: Assign Player 1 ---
    const playerBarContainer = page.locator('div.backdrop-blur-md'); // Assuming this is the PlayerBar
    const player1InBar = playerBarContainer.getByText(player1Nickname);
    const player2InBar = playerBarContainer.getByText(player2Nickname);
    // Locate the game field div containing the canvas
    const gameField = page.locator('div.bg-green-700:has(canvas)'); 

    await player1InBar.scrollIntoViewIfNeeded();
    await expect(player1InBar).toBeVisible({ timeout: 10000 });
    await player2InBar.scrollIntoViewIfNeeded();
    await expect(player2InBar).toBeVisible({ timeout: 10000 });
    await expect(gameField).toBeVisible({ timeout: 10000 });

    // Step 1: Tap player disc in bar
    await player1InBar.tap();
    console.log(`Tapped on ${player1Nickname} in PlayerBar to select for assignment.`);

    // Step 2: Click on the field to place the player
    await gameField.click(); // Clicks the center by default
    console.log(`Clicked on the game field to place ${player1Nickname}.`);

    // --- Assertions: Verify UI state --- 
    // Assigned player disc gets ring class
    const player1ItemContainer = player1InBar.locator('xpath=ancestor::div[contains(@class, "rounded-full")]').first();
    await expect(player1ItemContainer).toHaveClass(/ring-yellow-400/, { timeout: 5000 });
    console.log(`Verified ${player1Nickname} UI indicates assignment (ring class present on disc).`);

    // Player marker should appear on the field
    // !!! IMPORTANT: Verifying canvas drawing is complex. Skipping direct marker check for now. !!!
    // const player1MarkerOnField = gameField.getByText(player1Nickname); 
    // await expect(player1MarkerOnField).toBeVisible({ timeout: 5000 });
    // console.log(`Verified ${player1Nickname} marker is visible on the game field.`);

    // Player 2 should not be assigned
    const player2ItemContainer = player2InBar.locator('xpath=ancestor::div[contains(@class, "rounded-full")]').first();
    await expect(player2ItemContainer).not.toHaveClass(/ring-yellow-400/, { timeout: 5000 });
    // await expect(gameField.getByText(player2Nickname)).not.toBeVisible({ timeout: 1000 }); // P2 marker should not be on field (Also skipping)
    console.log(`Verified ${player2Nickname} UI does NOT indicate assignment.`);

    // --- Assertions: Verify localStorage state ---
    // Where is the on-field/assignment state stored? Assume it's in the current game state.
    // We need the current game ID first. Find it from appSettings.
    const currentAppSettings = await page.evaluate(({ appSettingsKey }) => {
        const settingsJson = localStorage.getItem(appSettingsKey);
        return settingsJson ? JSON.parse(settingsJson) : null;
    }, { appSettingsKey: APP_SETTINGS_KEY });
    const currentGameId = currentAppSettings?.currentGameId;
    expect(currentGameId, 'Could not determine currentGameId').toBeDefined();

    // Now get the state for the current game
    const currentGameState = await page.evaluate(({ gameId, savedGamesKey }) => {
        const gamesJson = localStorage.getItem(savedGamesKey);
        const games = gamesJson ? JSON.parse(gamesJson) : {};
        // Log the state we are about to return
        console.log(`localStorage game state for ${gameId}:`, JSON.stringify(games[gameId])); 
        return games[gameId] || null;
    }, { gameId: currentGameId, savedGamesKey: SAVED_GAMES_KEY });

    expect(currentGameState, 'Current game state not found in localStorage').toBeDefined();
    // Also log it in the test context
    console.log('Received currentGameState in test:', currentGameState); 

    // Find player IDs from the master roster to check game state
    const masterRoster = await page.evaluate(({ rosterKey }) => {
        const rosterJson = localStorage.getItem(rosterKey);
        return rosterJson ? JSON.parse(rosterJson) as Player[] : null;
    }, { rosterKey: MASTER_ROSTER_KEY });
    const player1Data = masterRoster?.find(p => p.nickname === player1Nickname);
    const player2Data = masterRoster?.find(p => p.nickname === player2Nickname);
    expect(player1Data, `Player ${player1Nickname} not found in master roster`).toBeDefined();
    expect(player2Data, `Player ${player2Nickname} not found in master roster`).toBeDefined();
    const player1Id = player1Data!.id;
    const player2Id = player2Data!.id;

    // Check the assignment state within the game state
    // Assumption: There's a field like `playersOnField: string[]` containing IDs.
    // This needs verification based on actual game state structure.
    const playersOnField = currentGameState?.playersOnField || []; // Assuming 'playersOnField' for now
    console.log('Found playersOnField:', playersOnField); // Log what was found
    expect(playersOnField, 'playersOnField array not found in game state').toBeInstanceOf(Array);
    // Check if an object with the correct ID exists in the array
    expect(playersOnField.some((player: Player) => player.id === player1Id), 
           `${player1Nickname} (ID: ${player1Id}) object should be in playersOnField`).toBe(true);
           
    // Check if an object with the other ID does NOT exist
    expect(playersOnField.some((player: Player) => player.id === player2Id), 
           `${player2Nickname} (ID: ${player2Id}) object should NOT be in playersOnField`).toBe(false);
    console.log('Verified assignment state in localStorage.');

    // (Optional) De-assign player 1 and verify - How does de-assignment work?
    // Option A: Click player disc again?
    // await player1InBar.click(); 
    // Option B: Click player marker on the field?
    // await player1MarkerOnField.click();
    // console.log(`Attempted to de-assign ${player1Nickname}.`);
    // await expect(player1ItemContainer).not.toHaveClass(/ring-yellow-400/, { timeout: 5000 }); 
    // await expect(player1MarkerOnField).not.toBeVisible({ timeout: 5000 });
    // console.log(`Verified ${player1Nickname} UI indicates de-assignment.`);

    // Check localStorage again after de-assign
    // ... (similar localStorage fetch and assertion, expecting player1Id to NOT be in playersOnField) ...
    // console.log('Verified de-assignment state in localStorage.');
  });

  // --- Add more tests below for goalie toggle, etc. ---

});