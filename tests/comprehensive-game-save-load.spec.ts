import { test, expect } from '@playwright/test';
import { SAVED_GAMES_KEY, APP_SETTINGS_KEY, MASTER_ROSTER_KEY, SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY } from '../src/config/constants';

// Field Position Test IDs (assuming data-testid attributes like data-testid="field-pos-goalie")
const FIELD_POSITIONS = {
  GOALIE: 'field-pos-goalie',
  DEFENDER_1: 'field-pos-defender-1',
  MIDFIELDER_1: 'field-pos-midfielder-1',
  FORWARD_1: 'field-pos-forward-1',
};

// Helper data for the comprehensive test
const COMPREHENSIVE_GAME_DETAILS = {
  homeTeamName: 'Comprehensive Home',
  opponentTeamName: 'Comprehensive Away',
  gameDate: '2024-10-15', // YYYY-MM-DD
  gameTime: '15:30', // HH:MM
  gameLocation: 'Central Stadium',
  gameNotes: 'A very important match.\nWith multiple lines of notes.',
  numberOfPeriods: 2,
  periodDurationMinutes: 12,
  seasonName: 'Autumn League 2024',
  seasonId: 'comp-season-1', // ID for pre-seeding
  tournamentName: 'Oktoberfest Cup',
  tournamentId: 'comp-tourn-1', // ID for pre-seeding
};

const PLAYER_DETAILS = [
  { id: 'cp1-id', name: 'Comp Player One', nickname: 'CP1', jerseyNumber: '10', isGoalie: false },
  { id: 'cp2-id', name: 'Comp Player Two', nickname: 'CP2', jerseyNumber: '7', isGoalie: false },
  { id: 'cg1-id', name: 'Comp Goalie One', nickname: 'CG1', jerseyNumber: '1', isGoalie: true },
  { id: 'cp3-id', name: 'Comp Player Three', nickname: 'CP3', jerseyNumber: '11', isGoalie: false },
  { id: 'cp4-id', name: 'Comp Player Four', nickname: 'CP4', jerseyNumber: '22', isGoalie: false },
];

// Define which players will be assigned to which field positions
const PLAYER_ASSIGNMENTS = [
  { playerId: 'cg1-id', positionTestId: FIELD_POSITIONS.GOALIE, expectedPlayerNickname: 'CG1' },
  { playerId: 'cp1-id', positionTestId: FIELD_POSITIONS.DEFENDER_1, expectedPlayerNickname: 'CP1' },
  { playerId: 'cp2-id', positionTestId: FIELD_POSITIONS.MIDFIELDER_1, expectedPlayerNickname: 'CP2' },
  { playerId: 'cp3-id', positionTestId: FIELD_POSITIONS.FORWARD_1, expectedPlayerNickname: 'CP3' },
];

const GAME_EVENTS_DETAILS = [
  { type: 'goal', timeInSeconds: 120, scorerNickname: 'CP1', assisterNickname: 'CP2' }, // 02:00
  { type: 'goal', timeInSeconds: 300, scorerNickname: 'CP2', assisterNickname: null },   // 05:00
  { type: 'opponentGoal', timeInSeconds: 450 },                                       // 07:30
  { type: 'goal', timeInSeconds: 600, scorerNickname: 'CP1', assisterNickname: 'CP3' }, // 10:00
];

// Helper to format time for display in event log (MM:SS)
const formatTimeForEventLog = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Helper to format date for display (DD.MM.YYYY)
const formatDateForDisplay = (isoDate: string): string => {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const parts = isoDate.split('-');
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
};


test.describe('Comprehensive Game Save and Load', () => {
  test.describe.configure({ mode: 'serial' }); // Ensures tests run in order if needed for sequential state
  test.setTimeout(60000); // Set timeout for the test and its hooks to 60 seconds

  let createdGameId: string | null = null; // To store the ID of the game created in the test

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(({ keysToClear, seedKeys, seasonDetails, tournamentDetails, players }) => {
      keysToClear.forEach(key => localStorage.removeItem(key));
      // Pre-seed seasons and tournaments for the test
      localStorage.setItem(seedKeys.seasons, JSON.stringify([{ id: seasonDetails.id, name: seasonDetails.name }]));
      localStorage.setItem(seedKeys.tournaments, JSON.stringify([{ id: tournamentDetails.id, name: tournamentDetails.name }]));
      // Also pre-seed master roster if we are providing IDs for players to be selected for Fair Play
      localStorage.setItem(seedKeys.masterRoster, JSON.stringify(players));
      console.log('Comprehensive test: localStorage cleared and seeded with season/tournament/roster.');
    }, {
       keysToClear: [SAVED_GAMES_KEY, APP_SETTINGS_KEY, MASTER_ROSTER_KEY],
       seedKeys: { seasons: SEASONS_LIST_KEY, tournaments: TOURNAMENTS_LIST_KEY, masterRoster: MASTER_ROSTER_KEY },
       seasonDetails: { id: COMPREHENSIVE_GAME_DETAILS.seasonId, name: COMPREHENSIVE_GAME_DETAILS.seasonName },
       tournamentDetails: { id: COMPREHENSIVE_GAME_DETAILS.tournamentId, name: COMPREHENSIVE_GAME_DETAILS.tournamentName },
       players: PLAYER_DETAILS // Pass player details for seeding master roster
    });
    await page.reload();
    console.log('Comprehensive test: Page reloaded.');

    // Wait for any initial loading indicator (text-based) to disappear
    const loadingTextIndicator = page.getByText(/Loading...|Ladataan.../i);
    try {
      await expect(loadingTextIndicator.first()).toBeVisible({ timeout: 5000 });
      console.log('Text-based loading indicator found, waiting for it to disappear...');
      await expect(loadingTextIndicator.first()).not.toBeVisible({ timeout: 30000 });
      console.log('Text-based loading indicator disappeared.');
    } catch {
      console.log('Text-based loading indicator not found or already gone, proceeding.');
    }

    // Check for and close the New Game Setup Modal if it appears
    const newGameSetupModal = page.getByTestId('new-game-setup-modal');
    try {
      // Wait for a short period to see if the modal appears
      await expect(newGameSetupModal).toBeVisible({ timeout: 10000 }); 
      console.log('New Game Setup Modal is visible in beforeEach, attempting to close it...');
      await newGameSetupModal.getByLabel(/Oman joukkueen nimi/i).fill('DummyHomeBeforeEach');
      await newGameSetupModal.getByLabel(/Vastustajan Nimi/i).fill('DummyAwayBeforeEach');
      await newGameSetupModal.getByRole('button', { name: /Aloita Peli/i }).click();
      await expect(newGameSetupModal).not.toBeVisible({ timeout: 10000 });
      console.log('Dummy game started in beforeEach to close modal.');
    } catch {
      console.log('New Game Setup Modal did not appear within timeout in beforeEach, proceeding.');
    }

    // Wait for the main page to be somewhat stable, e.g., a key control bar button is visible
    await expect(page.locator('button[title="Pelin Asetukset"]')).toBeVisible({ timeout: 25000 });
    console.log('Comprehensive test: Control bar (Game Settings button) visible, initial setup done.');
  });

  test('should save a complex game state and load it back perfectly', async ({ page }) => {
    console.log('Starting comprehensive save/load test...');

    // --- Part 1: Setup Game via UI ---
    console.log('Part 1: Setting up complex game via UI...');

    // 1.1 Create New Game (Basic Info)
    const newGameSetupModal = page.getByTestId('new-game-setup-modal');
    await expect(newGameSetupModal.getByRole('heading', { name: /Uuden Pelin Asetukset/i })).toBeVisible({ timeout: 15000 });
    console.log('New Game Setup Modal is visible.');
    await newGameSetupModal.getByLabel(/Oman joukkueen nimi/i).fill(COMPREHENSIVE_GAME_DETAILS.homeTeamName);
    await newGameSetupModal.getByLabel(/Vastustajan Nimi/i).fill(COMPREHENSIVE_GAME_DETAILS.opponentTeamName);
    await newGameSetupModal.getByRole('button', { name: /Aloita Peli/i }).click();
    await expect(newGameSetupModal).not.toBeVisible();
    console.log('New game created with basic team names.');
    await expect(page.getByText('0 - 0')).toBeVisible({timeout: 10000});
    console.log('Game screen active.');

    // 1.2 Add Players to Roster
    console.log('Adding players to roster...');
    await page.getByRole('button', { name: /Rosteri|Roster/i }).click();
    const rosterModal = page.getByTestId('roster-settings-modal');
    await expect(rosterModal).toBeVisible();
    console.log('Roster modal opened.');

    for (const player of PLAYER_DETAILS) {
      await rosterModal.getByRole('button', { name: /Lisää Pelaaja|Add Player/i }).click();
      const addPlayerForm = rosterModal.locator('form'); // Assuming the form is distinct
      await expect(addPlayerForm.getByRole('heading', { name: /Lisää uusi pelaaja/i})).toBeVisible();
      
      await addPlayerForm.getByLabel(/Nimi/).fill(player.name);
      await addPlayerForm.getByLabel(/Lempinimi/).fill(player.nickname);
      await addPlayerForm.getByLabel(/Numero/).fill(player.jerseyNumber);
      if (player.isGoalie) {
        await addPlayerForm.getByLabel(/Maalivahti/).check();
      }
      await addPlayerForm.getByRole('button', { name: /Tallenna|Save/i }).click();
      await expect(addPlayerForm).not.toBeVisible(); // Form should close after save
      console.log(`Added player: ${player.nickname}`);
    }
    await rosterModal.getByRole('button', { name: /Sulje|Close/i }).click();
    await expect(rosterModal).not.toBeVisible();
    console.log('Players added and roster modal closed.');

    // Quick check: Verify players appear in PlayerBar (based on nickname)
    for (const player of PLAYER_DETAILS) {
      await expect(page.getByTestId('player-bar').getByText(player.nickname)).toBeVisible();
    }
    console.log('Players verified in PlayerBar.');

    // 1.3 Configure Detailed Game Settings
    console.log('Configuring detailed game settings...');
    await page.locator('button[title="Pelin Asetukset"]').click(); // Game Settings button in control bar
    const gameSettingsModal = page.getByTestId('game-settings-modal');
    await expect(gameSettingsModal).toBeVisible();
    console.log('Game Settings modal opened.');

    // Set Date
    const dateLabel = gameSettingsModal.locator('span', { hasText: /Päivämäärä|Date/i });
    const dateContainer = dateLabel.locator('xpath=ancestor::div[contains(@class, "mb-2")]').first();
    // Click on the displayed date text to reveal the input (assuming it's initially a span)
    // The actual displayed text might vary based on current gameDate prop, so find a clickable element in the container.
    await dateContainer.locator('span[class*="valueStyle"]').click(); // Click the display span
    const dateInput = gameSettingsModal.locator('input[type="date"]');
    await dateInput.fill(COMPREHENSIVE_GAME_DETAILS.gameDate);
    await dateInput.blur(); 
    console.log(`Set game date to: ${COMPREHENSIVE_GAME_DETAILS.gameDate}`);

    // Set Time (HH and MM inputs)
    const [hour, minute] = COMPREHENSIVE_GAME_DETAILS.gameTime.split(':');
    await gameSettingsModal.getByPlaceholder(/HH/i).fill(hour);
    await gameSettingsModal.getByPlaceholder(/MM/i).fill(minute);
    // For time, blur might not be needed if onGameTimeChange is triggered on input change.
    console.log(`Set game time to: ${COMPREHENSIVE_GAME_DETAILS.gameTime}`);

    // Set Location
    const locationLabel = gameSettingsModal.locator('span', { hasText: /Paikka|Location/i });
    const locationContainer = locationLabel.locator('xpath=ancestor::div[contains(@class, "mb-2")]').first();
    await locationContainer.locator('span[class*="valueStyle"]').click(); // Click display span
    const locationInput = locationContainer.locator('input[type="text"]'); // Assuming it's a text input after click
    await locationInput.fill(COMPREHENSIVE_GAME_DETAILS.gameLocation);
    await locationInput.blur();
    console.log(`Set game location to: ${COMPREHENSIVE_GAME_DETAILS.gameLocation}`);

    // Set Game Notes
    await gameSettingsModal.getByRole('button', { name: /Muokkaa Muistiinpanoja|Edit Notes/i }).click();
    const notesTextarea = gameSettingsModal.getByPlaceholder(/Syötä muistiinpanot pelistä...|Enter notes about the game.../i);
    await notesTextarea.fill(COMPREHENSIVE_GAME_DETAILS.gameNotes);
    await gameSettingsModal.getByRole('button', { name: /Tallenna Muistiinpanot|Save Notes/i }).click();
    console.log('Set game notes.');

    // Set Number of Periods
    const periodsButton = gameSettingsModal.getByRole('button', { name: String(COMPREHENSIVE_GAME_DETAILS.numberOfPeriods) });
    await periodsButton.click();
    console.log(`Set number of periods to: ${COMPREHENSIVE_GAME_DETAILS.numberOfPeriods}`);
    
    // Set Period Duration
    const durationLabel = gameSettingsModal.locator('span', { hasText: /Kesto|Duration/i });
    const durationContainer = durationLabel.locator('xpath=ancestor::div[contains(@class, "mb-2")]').first();
    await durationContainer.locator('span[class*="valueStyle"]').click(); // Click display span
    const durationInput = durationContainer.locator('input[type="number"]'); // Assuming number input
    await durationInput.fill(String(COMPREHENSIVE_GAME_DETAILS.periodDurationMinutes));
    await durationInput.blur();
    console.log(`Set period duration to: ${COMPREHENSIVE_GAME_DETAILS.periodDurationMinutes} min`);

    // Set Season Association
    const associationSection = gameSettingsModal.locator('span:has-text(/^Yhdistys|Association/i)').locator('xpath=ancestor::div[contains(@class, "mb-2")]');
    await associationSection.getByRole('button', { name: /Kausi\/Sarja|Season\/League/i }).click();
    const seasonSelect = associationSection.locator('select'); // First select after clicking button
    await expect(seasonSelect).toBeVisible();
    await seasonSelect.selectOption({ label: COMPREHENSIVE_GAME_DETAILS.seasonName });
    console.log(`Associated with Season: ${COMPREHENSIVE_GAME_DETAILS.seasonName}`);

    // Set Tournament Association (handle potential UI change if season is selected)
    // If selecting season changes UI, we might need to re-locate or click 'None' first if applicable.
    // For now, assume we can click Tournament button directly.
    await associationSection.getByRole('button', { name: /Turnaus|Tournament/i }).click();
    const tournamentSelect = associationSection.locator('select'); // This might now be the tournament select
    await expect(tournamentSelect).toBeVisible();
    // Ensure the options for tournament are loaded before selecting
    await expect(tournamentSelect.getByText(COMPREHENSIVE_GAME_DETAILS.tournamentName)).toBeVisible();
    await tournamentSelect.selectOption({ label: COMPREHENSIVE_GAME_DETAILS.tournamentName });
    console.log(`Associated with Tournament: ${COMPREHENSIVE_GAME_DETAILS.tournamentName}`);

    // Award Fair Play Card
    const fairPlaySelect = gameSettingsModal.locator('select', { has: page.locator(`option[value="${PLAYER_DETAILS[0].id}"]`) }); // More specific selector for Fair Play
    await fairPlaySelect.selectOption({ value: PLAYER_DETAILS[0].id });
    console.log(`Awarded Fair Play card to: ${PLAYER_DETAILS[0].nickname}`);

    // Close Game Settings Modal
    await gameSettingsModal.getByRole('button', { name: /Sulje|Close/i }).click();
    await expect(gameSettingsModal).not.toBeVisible();
    console.log('Game Settings configured and modal closed.');

    // Part 1.4: Add Game Events
    test.step('Part 1.4: Add Game Events', async () => {
      await page.getByRole('button', { name: /Ottelun tapahtumat|Game Events/i }).click();
      const eventLogModal = page.locator('div[role="dialog"]', { hasText: /Ottelun tapahtumat|Game Events/i });
      await expect(eventLogModal).toBeVisible();

      for (const event of GAME_EVENTS_DETAILS) {
        await eventLogModal.getByRole('button', { name: /Lisää tapahtuma|Add Event/i }).click();
        const addEventForm = eventLogModal.locator('form'); // Assuming the form is identifiable

        // Select event type
        await addEventForm.getByLabel(/Tyyppi|Type/i).selectOption({ label: event.type === 'goal' ? 'Maali (Oma)' : 'Maali (Vastustaja)' });

        // Set time
        const minutes = Math.floor(event.timeInSeconds / 60);
        const seconds = event.timeInSeconds % 60;
        await addEventForm.getByLabel(/Minuutit|Minutes/i).fill(String(minutes));
        await addEventForm.getByLabel(/Sekunnit|Seconds/i).fill(String(seconds));

        if (event.type === 'goal') {
          // Select scorer
          if (event.scorerNickname) {
            await addEventForm.getByLabel(/Tekijä|Scorer/i).selectOption({ label: event.scorerNickname });
          }
          // Select assister
          if (event.assisterNickname) {
            await addEventForm.getByLabel(/Syöttäjä|Assister/i).selectOption({ label: event.assisterNickname });
          }
        }
        await addEventForm.getByRole('button', { name: /Tallenna|Save/i }).click();
      }

      await eventLogModal.getByRole('button', { name: /Sulje|Close/i }).click();
      await expect(eventLogModal).not.toBeVisible();
    });

    // Part 1.5: Assign Players to Field
    test.step('Part 1.5: Assign Players to Field', async () => {
      console.log('Part 1.5: Assigning players to field...');
      for (const assignment of PLAYER_ASSIGNMENTS) {
        // PlayerBar item selector - assuming player bar items have a testid like 'player-bar-item-PLAYER_ID' or can be found by nickname
        // For robustness, let's assume player bar items can be uniquely identified by nickname text.
        const playerInBar = page.getByTestId('player-bar').getByText(assignment.expectedPlayerNickname, { exact: true });
        const fieldPosition = page.getByTestId(assignment.positionTestId);

        await expect(playerInBar).toBeVisible();
        await expect(fieldPosition).toBeVisible(); // Ensure drop target exists

        console.log(`Assigning ${assignment.expectedPlayerNickname} to ${assignment.positionTestId}`);
        await playerInBar.dragTo(fieldPosition);

        // Optional: Add a small delay or an assertion to confirm the player appears on the field immediately
        // This helps ensure the state is updated before the next drag or game save.
        // Example: await expect(fieldPosition.getByText(assignment.expectedPlayerNickname)).toBeVisible({ timeout: 2000 });
        // For now, we will rely on the overall verification in Part 4.4.
      }
      console.log('All players assigned to field positions.');
    });

    // Save Game and Reload
    test.step('Save Game and Reload', async () => {
      // --- Part 2: Trigger Save ---
      console.log('Part 2: Triggering save of the complex game...');
      const appSettingsAfterSetup = await page.evaluate(({ appSettingsKey }) => {
          const appSettingsJson = localStorage.getItem(appSettingsKey);
          return appSettingsJson ? JSON.parse(appSettingsJson) : null;
      }, { appSettingsKey: APP_SETTINGS_KEY });
      createdGameId = appSettingsAfterSetup?.currentGameId;
      expect(createdGameId).toBeTruthy();
      console.log(`Comprehensive game created with ID: ${createdGameId}`);


      // --- Part 3: Reload and Load Game ---
      console.log('Part 3: Reloading application and loading the saved game...');
      await page.reload();
      await expect(page.locator('div.fixed.bottom-0.left-0.right-0.z-10')).toBeVisible({ timeout: 20000 });
      
      const setupModalHeading = page.getByRole('heading', { name: 'Uuden Pelin Asetukset' });
      if (await setupModalHeading.isVisible()) {
          console.log('Unexpected setup modal found after reload, attempting to close it by starting a dummy game...');
          await page.getByLabel(/Oman joukkueen nimi/i).fill('DummyHome');
          await page.getByLabel(/Vastustajan Nimi/i).fill('DummyAway');
          await page.getByRole('button', { name: /Aloita Peli/i }).click();
          await expect(setupModalHeading).not.toBeVisible();
          console.log('Dummy game started to close modal.');
      }

      await page.locator('button[title="controlBar.settings"]').click();
      await page.getByText('Lataa Peli').click();
      const loadGameModal = page.getByTestId('load-game-modal');
      await expect(loadGameModal.getByRole('heading', { name: /Lataa Peli/i })).toBeVisible();
      console.log('Load Game Modal is visible.');

      const gameItemToLoad = loadGameModal.getByTestId(`game-item-${createdGameId}`);
      await expect(gameItemToLoad).toBeVisible();
      await gameItemToLoad.getByRole('button', { name: /Lataa Peli|Load Game/i }).click();
      await expect(loadGameModal).not.toBeVisible();
      console.log(`Game ${createdGameId} loaded.`);

      // --- Part 4: Verification ---
      console.log('Part 4: Verifying all aspects of the loaded game...');
      await expect(page.getByText(COMPREHENSIVE_GAME_DETAILS.homeTeamName)).toBeVisible();
      await expect(page.getByText(COMPREHENSIVE_GAME_DETAILS.opponentTeamName)).toBeVisible();
      console.log('Basic team names verified.');

      await page.locator('button[title="Pelin Asetukset"]').click();
      const gameSettingsModalAfterLoad = page.getByTestId('game-settings-modal'); // Renamed for clarity
      await expect(gameSettingsModalAfterLoad).toBeVisible();
      
      // Verify opponent name again (was just an example, real verification starts here)
      const opponentNameDisplayInSettings = gameSettingsModalAfterLoad.locator(`span:has-text("${COMPREHENSIVE_GAME_DETAILS.opponentTeamName}")`).first();
      await expect(opponentNameDisplayInSettings).toBeVisible();
      console.log('Opponent name in Game Settings modal verified after load.');

      // Verify displayed game date on the main page (if available and formatted)
      const formattedDate = formatDateForDisplay(COMPREHENSIVE_GAME_DETAILS.gameDate);
      // This selector might need to be more specific if the date is not unique or is within a complex structure.
      await expect(page.getByText(formattedDate)).toBeVisible();

      // Part 4.1: Verify Game Settings
      test.step('Part 4.1: Verify Game Settings', async () => {
        await page.getByRole('button', { name: /Pelin asetukset|Game Settings/i }).click();
        const gameSettingsModal = page.locator('div[role="dialog"]', { hasText: /Pelin asetukset|Game Settings/i });
        await expect(gameSettingsModal).toBeVisible();

        // Verify Opponent Name
        await expect(gameSettingsModal.locator('input[value="' + COMPREHENSIVE_GAME_DETAILS.opponentTeamName + '"]')).toBeVisible();

        // Verify Game Date
        const expectedDateForInput = COMPREHENSIVE_GAME_DETAILS.gameDate; 
        await expect(gameSettingsModal.locator('input[type="date"]')).toHaveValue(expectedDateForInput);

        // Verify Game Time
        const [expectedHour, expectedMinute] = COMPREHENSIVE_GAME_DETAILS.gameTime.split(':');
        await expect(gameSettingsModal.locator('input[aria-label="game-time-hour"]')).toHaveValue(expectedHour);
        await expect(gameSettingsModal.locator('input[aria-label="game-time-minute"]')).toHaveValue(expectedMinute);
        
        // Verify Game Location
        await expect(gameSettingsModal.locator('input[value="' + COMPREHENSIVE_GAME_DETAILS.gameLocation + '"]')).toBeVisible();

        // Verify Period Duration
        await expect(gameSettingsModal.locator('select[aria-label="Period duration"]')).toHaveValue(String(COMPREHENSIVE_GAME_DETAILS.periodDurationMinutes));

        // Verify Number of Periods
        await expect(gameSettingsModal.locator('select[aria-label="Number of periods"]')).toHaveValue(String(COMPREHENSIVE_GAME_DETAILS.numberOfPeriods));

        // Verify Game Notes
        await expect(gameSettingsModal.getByLabel(/Muistiinpanot|Notes/i)).toHaveValue(COMPREHENSIVE_GAME_DETAILS.gameNotes);

        // Verify Season Association
        const loadedAssociationSection = gameSettingsModal.locator('span:has-text(/^Yhdistys|Association/i)').locator('xpath=ancestor::div[contains(@class, "mb-2")]');
        await expect(loadedAssociationSection.getByRole('button', { name: COMPREHENSIVE_GAME_DETAILS.seasonName })).toBeVisible();

        // Verify Tournament Association
        await expect(loadedAssociationSection.getByRole('button', { name: COMPREHENSIVE_GAME_DETAILS.tournamentName })).toBeVisible();
        
        // Verify Fair Play Card Awarded
         await expect(gameSettingsModal.getByRole('button', { name: /Kyllä|Yes/i, exact: true })).toBeVisible();

        await gameSettingsModal.getByRole('button', { name: /Sulje|Close/i }).click();
        await expect(gameSettingsModal).not.toBeVisible();
      });

      // Part 4.2: Verify Roster Details
      test.step('Part 4.2: Verify Roster Details', async () => {
        await page.getByRole('button', { name: /Joukkueen kokoonpano|Team Roster/i }).click(); // Or similar button to open roster settings
        const rosterModal = page.locator('div[role="dialog"]', { hasText: /Joukkueen kokoonpano|Team Roster|Muokkaa pelaajia|Edit Players/i });
        await expect(rosterModal).toBeVisible();

        // Assuming players are listed in some form of list/grid within the modal
        // The selectors here will need to be specific to how players are rendered in the Roster settings modal
        for (const player of PLAYER_DETAILS) {
          // Locate the row/container for the player. This is highly dependent on the UI.
          // Example: rosterModal.locator(`div.player-row:has-text("${player.nickname}")`);
          // For now, let's assume each player's details are verifiable by looking for text within the modal.
          // This might need to be more specific, e.g., finding a player row then elements within that row.

          const playerRowLocator = rosterModal.locator('li', { hasText: player.nickname });
          // If players are in a table, it might be something like:
          // const playerRowLocator = rosterModal.locator(`tr:has-text("${player.nickname}")`);
          
          await expect(playerRowLocator).toBeVisible();

          // Verify Full Name (if displayed)
          // For this example, let's assume the full name is part of the playerRowLocator's text or an input field within it.
          // If it's an input field for editing:
          // await expect(playerRowLocator.locator('input[aria-label="Full Name"]')).toHaveValue(player.name);
          // If it's just text:
          await expect(playerRowLocator.getByText(player.name, { exact: true })).toBeVisible(); // Or a more specific selector

          // Verify Nickname (already used to find the row, but good to confirm visibility if it's a distinct element)
          await expect(playerRowLocator.getByText(player.nickname, { exact: true })).toBeVisible();

          // Verify Jersey Number
          // If it's an input field:
          // await expect(playerRowLocator.locator('input[aria-label="Jersey Number"]')).toHaveValue(String(player.jerseyNumber));
          // If it's text:
          await expect(playerRowLocator.getByText(String(player.jerseyNumber))).toBeVisible();

          // Verify Goalie Status
          // This depends on how goalie status is indicated (e.g., a checkbox, an icon, text)
          // Assuming a checkbox that is checked if player.isGoalie is true
          const goalieIndicator = playerRowLocator.locator('[aria-label*="Goalie"], [title*="Goalie"], :text("MV"), :text("GK")');
          if (player.isGoalie) {
            // This assertion depends heavily on how the goalie status is visually represented and whether it's an interactive element
            // For a checkbox: await expect(goalieIndicator.locator('input[type="checkbox"]')).toBeChecked();
            // For a visible icon/text: await expect(goalieIndicator).toBeVisible();
            await expect(goalieIndicator).toBeVisible(); // General check, refine based on actual UI
          } else {
            // If not a goalie, ensure the indicator is not present or not in the "goalie" state
            // await expect(goalieIndicator.locator('input[type="checkbox"]')).not.toBeChecked();
            // Or, if the element itself isn't there for non-goalies:
            // await expect(goalieIndicator).not.toBeVisible(); // This might be too strict if the element always exists.
          }
        }

        await rosterModal.getByRole('button', { name: /Sulje|Close|Valmis|Done/i }).click();
        await expect(rosterModal).not.toBeVisible();
      });

      // Part 4.3: Verify Game Events
      test.step('Part 4.3: Verify Game Events', async () => {
        await page.getByRole('button', { name: /Ottelun tapahtumat|Game Events/i }).click();
        const eventLogModal = page.locator('div[role="dialog"]', { hasText: /Ottelun tapahtumat|Game Events/i });
        await expect(eventLogModal).toBeVisible();

        const eventRows = eventLogModal.locator('ul > li'); // Assuming events are in an unordered list
        await expect(eventRows).toHaveCount(GAME_EVENTS_DETAILS.length);

        for (let i = 0; i < GAME_EVENTS_DETAILS.length; i++) {
          const eventDetail = GAME_EVENTS_DETAILS[i];
          const eventRow = eventRows.nth(i);

          const expectedTime = formatTimeForEventLog(eventDetail.timeInSeconds);
          let expectedTypeText = '';
          if (eventDetail.type === 'goal') expectedTypeText = 'Maali'; // Or check for more specific text if needed
          if (eventDetail.type === 'opponentGoal') expectedTypeText = 'Vast. Maali';

          // Verify time and type (assuming they are in the same text node or identifiable elements)
          // This might need adjustment based on actual HTML structure of the event log items
          await expect(eventRow.getByText(new RegExp(`${expectedTime}.*${expectedTypeText}`))).toBeVisible();

          if (eventDetail.type === 'goal') {
            if (eventDetail.scorerNickname) {
              await expect(eventRow.getByText(eventDetail.scorerNickname)).toBeVisible();
            }
            if (eventDetail.assisterNickname) {
              await expect(eventRow.getByText(eventDetail.assisterNickname)).toBeVisible();
            } else {
              // If no assister, check that it's not displayed or displayed as N/A, depending on implementation
              // For now, let's assume it just won't find the text of an assister if null
            }
          }
        }

        await eventLogModal.getByRole('button', { name: /Sulje|Close/i }).click();
        await expect(eventLogModal).not.toBeVisible();
      });

      // Part 4.4: Verify Players on Field State
      test.step('Part 4.4: Verify Players on Field State', async () => {
        console.log('Part 4.4: Verifying players on field state...');
        for (const assignment of PLAYER_ASSIGNMENTS) {
          const fieldPosition = page.getByTestId(assignment.positionTestId);
          await expect(fieldPosition.getByText(assignment.expectedPlayerNickname, { exact: true })).toBeVisible();
          console.log(`Verified ${assignment.expectedPlayerNickname} at ${assignment.positionTestId}`);
        }
        console.log('All player positions verified.');
      });

      // Part 4.5: Verify Score
      test.step('Part 4.5: Verify Score', async () => {
        let expectedHomeScore = 0;
        let expectedAwayScore = 0;
        for (const event of GAME_EVENTS_DETAILS) {
          if (event.type === 'goal') {
            expectedHomeScore++;
          } else if (event.type === 'opponentGoal') {
            expectedAwayScore++;
          }
        }

        // Assuming score is displayed like: Home Team X - Y Opponent Team
        // Or specific elements for home and away scores exist.
        // Let's look for elements with test-ids or specific roles/text.
        // Example: page.getByTestId('home-score') and page.getByTestId('away-score')
        // For now, let's assume there are elements with the team names and scores nearby.
        // This will likely need adjustment based on the actual UI structure for score display.
        
        // A more robust selector might be needed. Example for a structure like:
        // <div><span>HOME TEAM</span><span>0</span></div>
        // <div><span>AWAY TEAM</span><span>0</span></div>
        // const homeScoreElement = page.locator('div', { hasText: COMPREHENSIVE_GAME_DETAILS.homeTeamName }).locator('span').last();
        // const awayScoreElement = page.locator('div', { hasText: COMPREHENSIVE_GAME_DETAILS.opponentTeamName }).locator('span').last();
        // await expect(homeScoreElement).toHaveText(String(expectedHomeScore));
        // await expect(awayScoreElement).toHaveText(String(expectedAwayScore));
        
        // Using a placeholder selector for now, this needs to be accurate.
        // Assuming a structure like: <div data-testid="home-score">1</div> and <div data-testid="away-score">0</div>
        // Or, if the score is part of a larger text, e.g., "Home Team 1 - 0 Away Team"
        // Let's try to find the score based on its numerical value next to team names if they are distinct elements.

        // Try finding score next to Home team name, assuming it's in a distinct element that is a sibling or child
        const homeTeamScoreLocator = page.locator('h1', { hasText: COMPREHENSIVE_GAME_DETAILS.homeTeamName })
                                        .locator('xpath=following-sibling::span | ./span[contains(@class, "score")] | //span[contains(@data-testid, "home-score")]')
                                        .first(); // Pick the first match if multiple strategies match
        await expect(homeTeamScoreLocator).toHaveText(String(expectedHomeScore));

        const awayTeamScoreLocator = page.locator('h1', { hasText: COMPREHENSIVE_GAME_DETAILS.opponentTeamName })
                                        .locator('xpath=following-sibling::span | ./span[contains(@class, "score")] | //span[contains(@data-testid, "away-score")]')
                                        .first();
        await expect(awayTeamScoreLocator).toHaveText(String(expectedAwayScore));

        console.log(`Verified Score: Home ${expectedHomeScore} - Away ${expectedAwayScore}`);
      });

    });

  });

}); 