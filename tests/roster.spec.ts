import { test, expect, Page, Locator } from '@playwright/test';
import { MASTER_ROSTER_KEY, SAVED_GAMES_KEY, APP_SETTINGS_KEY } from '../src/config/constants'; // Assuming path is correct

// =================================================================================================
// TYPE DEFINITIONS
// =================================================================================================

/**
 * Represents the structure of a player object used in the tests and application.
 */
interface Player {
  id: string;
  name: string;
  nickname?: string;
  jerseyNumber?: string;
  notes?: string;
  isGoalie?: boolean;
}

/**
 * Represents the data required to create or edit a player.
 * ID is optional as it's not needed for creation.
 */
type PlayerData = Omit<Player, 'id'>;


// =================================================================================================
// HELPER CLASSES (PAGE OBJECT MODEL PATTERN)
// =================================================================================================

/**
 * Encapsulates interactions with the application's local storage.
 */
class LocalStorageManager {
  /**
   * Retrieves and parses a JSON item from local storage.
   * @param page - The Playwright Page object.
   * @param key - The local storage key.
   * @returns The parsed data or null if not found.
   */
  static async getItem<T>(page: Page, key: string): Promise<T | null> {
    const json = await page.evaluate((k) => localStorage.getItem(k), key);
    return json ? (JSON.parse(json) as T) : null;
  }

  /**
   * Retrieves the master player roster from local storage.
   */
  static getMasterRoster(page: Page): Promise<Player[] | null> {
    return this.getItem<Player[]>(page, MASTER_ROSTER_KEY);
  }

  /**
   * Retrieves the state of the currently active game from local storage.
   */
  static async getCurrentGameState(page: Page): Promise<any | null> {
    const settings = await this.getItem<{ currentGameId?: string }>(page, APP_SETTINGS_KEY);
    if (!settings?.currentGameId) {
      throw new Error('Could not determine currentGameId from app settings in localStorage.');
    }
    const allGames = await this.getItem<Record<string, any>>(page, SAVED_GAMES_KEY);
    return allGames?.[settings.currentGameId] ?? null;
  }
}

/**
 * Manages setup and teardown actions for tests.
 */
class TestSetup {
  /**
   * Prepares a clean slate for a new game, handling the initial setup modal.
   * @param page - The Playwright Page object.
   */
  static async prepareNewGame(page: Page): Promise<void> {
    await test.step('Clear storage and load initial game setup', async () => {
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();

      const setupModalHeading = page.getByRole('heading', { name: 'Uuden Pelin Asetukset' });
      await expect(setupModalHeading).toBeVisible({ timeout: 15000 });

      await page.getByLabel('Oman joukkueen nimi: *').fill('E2E Home Team');
      await page.getByLabel('Vastustajan Nimi: *').fill('E2E Away Team');
      await page.getByRole('button', { name: 'Aloita Peli' }).click();

      await expect(setupModalHeading).not.toBeVisible({ timeout: 10000 });
      await expect(page.locator('button[title="Roster Settings"]')).toBeVisible({ timeout: 10000 });
    });
  }
}

/**
 * Encapsulates all interactions within the Roster Management modal.
 */
class RosterModal {
  private page: Page;
  
  // Locators
  public readonly modalContainer: Locator;
  public readonly addPlayerButton: Locator;
  public readonly closeButton: Locator;
  public readonly heading: Locator;
  
  constructor(page: Page) {
    this.page = page;
    this.modalContainer = page.locator('div.fixed.inset-0').filter({ has: page.getByRole('heading', { name: /Joukkueen Hallinta/i }) });
    this.heading = this.modalContainer.getByRole('heading', { name: /Joukkueen Hallinta/i });
    this.addPlayerButton = this.modalContainer.getByRole('button', { name: /Add Player|Lisää Pelaaja/i });
    this.closeButton = this.modalContainer.getByRole('button', { name: /Close/i });
  }
  
  /** Opens the roster modal from the main control bar. */
  async open(): Promise<void> {
    await this.page.locator('button[title="Roster Settings"]').click();
    await expect(this.heading).toBeVisible({ timeout: 10000 });
  }
  
  /** Closes the roster modal. */
  async close(): Promise<void> {
    await this.closeButton.click();
    await expect(this.heading).not.toBeVisible({ timeout: 5000 });
  }

  /** Gets the locator for a player row in the roster list by their nickname. */
  private getPlayerRow(nickname: string): Locator {
    // This assumes the nickname is unique and visible text.
    // The player row is the grandparent div of the nickname span.
    return this.modalContainer.getByText(nickname, { exact: true }).locator('xpath=ancestor::div[2]');
  }

  /** Fills out the player details form (for both add and edit). */
  private async fillPlayerForm(playerData: PlayerData): Promise<void> {
    await this.modalContainer.getByPlaceholder('Pelaajan Nimi').fill(playerData.name);
    if(playerData.jerseyNumber) await this.modalContainer.getByPlaceholder('#').fill(playerData.jerseyNumber);
    if(playerData.nickname) await this.modalContainer.getByPlaceholder('Lempinimi (näytöllä)').fill(playerData.nickname);
    if(playerData.notes) await this.modalContainer.getByPlaceholder('Pelaajan muistiinpanot...').fill(playerData.notes);
  }

  /** Clicks the confirm/save button in the form. */
  private async confirmForm(): Promise<void> {
    // The confirm button is identified as the first enabled button with a checkmark icon inside the modal.
    const saveButton = this.modalContainer.locator('button:not([disabled])').filter({ has: this.page.locator('svg[data-icon="check"], svg.w-5.h-5') }).first();
    await saveButton.click();
    // Wait for the form to disappear as confirmation of save.
    await expect(this.modalContainer.getByPlaceholder('Pelaajan Nimi')).not.toBeVisible({ timeout: 5000 });
  }

  /** Adds a new player through the UI. */
  async addPlayer(playerData: PlayerData): Promise<void> {
    await this.addPlayerButton.click();
    await this.fillPlayerForm(playerData);
    await this.confirmForm();
  }

  /** Edits an existing player. */
  async editPlayer(nickname: string, updatedPlayerData: PlayerData): Promise<void> {
    const playerRow = this.getPlayerRow(nickname);
    await playerRow.scrollIntoViewIfNeeded();
    
    // Click the "Toiminnot" (Actions) menu button
    await playerRow.locator('button[title="Toiminnot"]').click();
    
    // Click the "Muokkaa" (Edit) button from the dropdown
    await this.page.getByRole('button', { name: 'Muokkaa' }).click();
    
    // The form should now be visible for editing
    await expect(this.modalContainer.getByPlaceholder('Pelaajan Nimi')).toBeVisible();
    await this.fillPlayerForm(updatedPlayerData);
    await this.confirmForm();
  }

  /** Deletes a player, handling the confirmation dialog. */
  async deletePlayer(nickname: string): Promise<void> {
    // Automatically accept the next confirmation dialog
    this.page.once('dialog', dialog => dialog.accept());
    
    const playerRow = this.getPlayerRow(nickname);
    await playerRow.scrollIntoViewIfNeeded();
    
    await playerRow.locator('button[title="Toiminnot"]').click();
    await this.page.getByRole('button', { name: 'Poista' }).click();

    // The player row should no longer be visible after deletion.
    await expect(playerRow).not.toBeVisible({ timeout: 10000 });
  }
}

/**
 * Encapsulates interactions with the Player Bar and the main Game Field.
 */
class GameFieldManager {
    private page: Page;

    // Locators
    public readonly playerBar: Locator;
    public readonly gameField: Locator;

    constructor(page: Page) {
        this.page = page;
        // A more stable locator for the player bar, using a potential data-testid or a more unique class combination
        this.playerBar = page.locator('.player-bar-container, div.backdrop-blur-md'); 
        // Locator for the game field canvas area
        this.gameField = page.locator('div.bg-green-700:has(canvas)'); 
    }

    /** Gets the locator for a player's disc in the player bar by nickname. */
    getPlayerDisc(nickname: string): Locator {
        return this.playerBar.getByText(nickname, { exact: true });
    }
    
    /** Gets the container of the player disc to check for styling (e.g., assignment ring). */
    getPlayerDiscContainer(nickname: string): Locator {
      return this.getPlayerDisc(nickname).locator('xpath=ancestor::div[contains(@class, "rounded-full")]').first();
    }

    /** Assigns a player to the field by tapping their disc and then the field. */
    async assignPlayerToField(nickname: string): Promise<void> {
        const playerDisc = this.getPlayerDisc(nickname);
        await playerDisc.scrollIntoViewIfNeeded();
        await playerDisc.tap();
        await this.gameField.click(); // Clicks center of the field
    }
}


// =================================================================================================
// TEST SUITE
// =================================================================================================

test.describe('Roster Management E2E', () => {
  test.describe.configure({ mode: 'serial' });

  // Use a shared setup for all tests in this suite
  test.beforeEach(async ({ page }) => {
    await TestSetup.prepareNewGame(page);
  });

  test('should add a new player and verify presence', async ({ page }) => {
    const rosterModal = new RosterModal(page);
    const gameField = new GameFieldManager(page);
    const newPlayer: PlayerData = {
      name: 'Test Player Add',
      jerseyNumber: '99',
      nickname: 'Tester',
      notes: 'This player was added by an E2E test.',
    };

    await test.step('Open roster and add a new player', async () => {
      await rosterModal.open();
      await rosterModal.addPlayer(newPlayer);
      await rosterModal.close();
    });

    await test.step('Verify player appears in the PlayerBar', async () => {
      const playerDisc = gameField.getPlayerDisc(newPlayer.nickname!);
      await playerDisc.scrollIntoViewIfNeeded();
      await expect(playerDisc).toBeVisible();
    });

    await test.step('Verify player data is saved correctly in localStorage', async () => {
      const masterRoster = await LocalStorageManager.getMasterRoster(page);
      const addedPlayer = masterRoster?.find(p => p.name === newPlayer.name);
      
      expect(addedPlayer, 'Added player data not found in localStorage roster').toBeDefined();
      // Use `toMatchObject` for a clean comparison of properties
      expect(addedPlayer).toMatchObject(newPlayer);
    });
  });

  test('should edit an existing player and verify changes', async ({ page }) => {
    const rosterModal = new RosterModal(page);
    const gameField = new GameFieldManager(page);
    const initialPlayer: PlayerData = {
      name: 'Edit Test Player',
      nickname: 'Edittest',
      jerseyNumber: '77',
      notes: 'Initial notes.',
    };
    const updatedPlayer: PlayerData = {
      name: 'Edited Test Player',
      nickname: 'EditedNickname',
      jerseyNumber: '78',
      notes: 'Updated notes after edit.',
    };

    await test.step('Setup: Add the initial player to be edited', async () => {
      await rosterModal.open();
      await rosterModal.addPlayer(initialPlayer);
    });

    await test.step('Action: Edit the player', async () => {
      await rosterModal.editPlayer(initialPlayer.nickname!, updatedPlayer);
      await rosterModal.close();
    });

    await test.step('Verify player is updated in the PlayerBar', async () => {
      await expect(gameField.getPlayerDisc(initialPlayer.nickname!)).not.toBeVisible();
      await expect(gameField.getPlayerDisc(updatedPlayer.nickname!)).toBeVisible();
    });

    await test.step('Verify player data is updated in localStorage', async () => {
      const masterRoster = await LocalStorageManager.getMasterRoster(page);
      const oldPlayer = masterRoster?.find(p => p.name === initialPlayer.name);
      const editedPlayer = masterRoster?.find(p => p.name === updatedPlayer.name);

      expect(oldPlayer, 'Player with old name should not exist').toBeUndefined();
      expect(editedPlayer, 'Edited player data not found').toBeDefined();
      expect(editedPlayer).toMatchObject(updatedPlayer);
    });
  });

  test('should delete a player and verify removal', async ({ page }) => {
    const rosterModal = new RosterModal(page);
    const gameField = new GameFieldManager(page);
    const playerToDelete: PlayerData = { name: 'Delete Me', nickname: 'Deletable', jerseyNumber: '00' };
    const playerToKeep: PlayerData = { name: 'Keep Me', nickname: 'Keeper', jerseyNumber: '01' };

    await test.step('Setup: Add two players', async () => {
      await rosterModal.open();
      await rosterModal.addPlayer(playerToDelete);
      await rosterModal.addPlayer(playerToKeep);
    });

    await test.step('Action: Delete one player', async () => {
      await rosterModal.deletePlayer(playerToDelete.nickname!);
      await rosterModal.close();
    });

    await test.step('Verify player is removed from PlayerBar', async () => {
      await expect(gameField.getPlayerDisc(playerToDelete.nickname!)).not.toBeVisible();
      await expect(gameField.getPlayerDisc(playerToKeep.nickname!)).toBeVisible();
    });

    await test.step('Verify player is removed from localStorage', async () => {
      const masterRoster = await LocalStorageManager.getMasterRoster(page);
      const deletedPlayer = masterRoster?.find(p => p.nickname === playerToDelete.nickname);
      const keptPlayer = masterRoster?.find(p => p.nickname === playerToKeep.nickname);

      expect(deletedPlayer).toBeUndefined();
      expect(keptPlayer).toBeDefined();
    });
  });
  
  test('should assign a player to the field and verify state', async ({ page }) => {
    const rosterModal = new RosterModal(page);
    const gameField = new GameFieldManager(page);
    const player1: PlayerData = { name: 'AssignTest P1', nickname: 'Assign1' };
    const player2: PlayerData = { name: 'AssignTest P2', nickname: 'Assign2' };

    await test.step('Setup: Add two players', async () => {
        await rosterModal.open();
        await rosterModal.addPlayer(player1);
        await rosterModal.addPlayer(player2);
        await rosterModal.close();
    });

    await test.step('Action: Assign Player 1 to the field', async () => {
        await gameField.assignPlayerToField(player1.nickname!);
    });

    await test.step('Verify UI state after assignment', async () => {
        // Assigned player should have a visual indicator (e.g., a ring)
        const player1DiscContainer = gameField.getPlayerDiscContainer(player1.nickname!);
        await expect(player1DiscContainer).toHaveClass(/ring-yellow-400/, { timeout: 5000 });

        // Unassigned player should not have the indicator
        const player2DiscContainer = gameField.getPlayerDiscContainer(player2.nickname!);
        await expect(player2DiscContainer).not.toHaveClass(/ring-yellow-400/, { timeout: 5000 });
    });

    await test.step('Verify assignment state in localStorage', async () => {
        const masterRoster = await LocalStorageManager.getMasterRoster(page);
        const player1Data = masterRoster?.find(p => p.nickname === player1.nickname);
        const player2Data = masterRoster?.find(p => p.nickname === player2.nickname);
        expect(player1Data).toBeDefined();
        expect(player2Data).toBeDefined();

        const gameState = await LocalStorageManager.getCurrentGameState(page);
        expect(gameState, 'Current game state not found in localStorage').toBeDefined();

        // Assumption: Game state has a 'playersOnField' array of player objects. Adjust if structure is different.
        const playersOnField: Player[] = gameState?.playersOnField ?? [];
        expect(playersOnField, 'playersOnField array not found in game state').toBeInstanceOf(Array);
        
        const isPlayer1OnField = playersOnField.some(p => p.id === player1Data!.id);
        const isPlayer2OnField = playersOnField.some(p => p.id === player2Data!.id);

        expect(isPlayer1OnField, `${player1.nickname} should be in the playersOnField array`).toBe(true);
        expect(isPlayer2OnField, `${player2.nickname} should NOT be in the playersOnField array`).toBe(false);
    });
  });
});
