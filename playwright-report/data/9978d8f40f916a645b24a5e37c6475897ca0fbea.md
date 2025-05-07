# Test info

- Name: Data Persistence - Core Functionality >> should delete a game and verify its removal
- Location: C:\Users\E915908\Documents\Projects\soccer-app\tests\data-persistence.spec.ts:358:7

# Error details

```
Error: Timed out 5000ms waiting for expect(locator).not.toBeVisible()

Locator: getByRole('heading', { name: /Lataa Peli/i })
Expected: not visible
Received: visible
Call log:
  - expect.not.toBeVisible with timeout 5000ms
  - waiting for getByRole('heading', { name: /Lataa Peli/i })
    9 × locator resolved to <h2 class="text-xl font-semibold mb-4 text-yellow-300 flex-shrink-0 text-center">Lataa Peli</h2>
      - unexpected value "visible"

    at C:\Users\E915908\Documents\Projects\soccer-app\tests\data-persistence.spec.ts:507:50
```

# Page snapshot

```yaml
- img "Coaching Companion Logo"
- text: Player 1 Player 2 Player 3 Player 4 Player 5 Player 6 Player 7 Player 8 Player 9 Player 10 Player 11 My Team 0 - 0 Opponent
- main: 00:00
- button "controlBar.undo" [disabled]
- button "controlBar.redo" [disabled]
- button "controlBar.toggleNamesHide"
- button "controlBar.placeAllPlayers"
- button "controlBar.clearDrawings"
- button "controlBar.addOpponent"
- button "controlBar.resetField"
- button "Log Goal":
  - img
- button "Roster Settings"
- button "Game Settings"
- button "controlBar.toggleTimerOverlayShow"
- button "controlBar.settings"
- heading "Lataa Peli" [level=2]
- textbox "Suodata nimellä/päivämäärällä..."
- button "Import"
- button "JSON"
- button "EXCEL"
- heading "Opponent Keep vs Game To Keep" [level=3]
- text: 2 - 2 No Date
- button "Lataa Peli"
- button "Options"
- button "Varmuuskopioi Kaikki Tiedot"
- button "Palauta Varmuuskopiosta"
- button "Sulje"
- heading "Uuden Pelin Asetukset" [level=2]
- text: "Oman joukkueen nimi: *"
- 'textbox "Oman joukkueen nimi: *"'
- text: "Vastustajan Nimi: *"
- 'textbox "Vastustajan Nimi: *"'
- text: "Pelin Päivämäärä:"
- textbox "Pelin Päivämäärä:": 2025-05-07
- text: "Kausi:"
- button "Luo Uusi"
- combobox "Kausi:":
  - option "-- Valitse Kausi --" [selected]
- text: "Turnaus:"
- textbox "Syötä uuden turnauksen nimi..."
- button "Lisää" [disabled]
- button "Peruuta"
- text: Paikka (Valinnainen)
- textbox "Paikka (Valinnainen)"
- text: Aika (TT:MM) (Valinnainen)
- spinbutton
- text: ":"
- spinbutton
- text: Jaksot
- button "1"
- button "2"
- text: Kesto (min)
- spinbutton "Kesto (min)": "10"
- text: Venue *
- radio "Home" [checked]
- text: Home
- radio "Away"
- text: Away
- button "Ohita"
- button "Aloita Peli"
- alert
- button "Open Next.js Dev Tools":
  - img
```

# Test source

```ts
  407 |     await page.reload();
  408 |     console.log('Page reloaded after seeding for delete test.');
  409 |
  410 |     // Handle potential setup modal
  411 |     const setupModalHeadingLocatorDelete = page.getByRole('heading', { name: 'Uuden Pelin Asetukset' });
  412 |     const newGameSetupModalDelete = page.getByTestId('new-game-setup-modal');
  413 |     try {
  414 |       await expect(setupModalHeadingLocatorDelete).toBeVisible({ timeout: 10000 });
  415 |       console.log('Unexpected setup modal found (delete test), attempting to close it...');
  416 |       await page.getByLabel('Oman joukkueen nimi: *').fill('Workaround Home Delete');
  417 |       await page.getByLabel('Vastustajan Nimi: *').fill('Workaround Away Delete');
  418 |       await page.getByRole('button', { name: 'Aloita Peli' }).click();
  419 |       await expect(newGameSetupModalDelete).not.toBeVisible({ timeout: 5000 });
  420 |       console.log('Closed unexpected setup modal (delete test).');
  421 |     } catch {
  422 |       console.log('Setup modal did not appear (delete test, expected or handled).');
  423 |     }
  424 |     await page.waitForTimeout(250); 
  425 |
  426 |     // Ensure main UI is ready
  427 |     const settingsButtonDeleteTest = page.locator('button[title="controlBar.settings"]');
  428 |     await expect(settingsButtonDeleteTest).toBeVisible({ timeout: 30000 });
  429 |     console.log('Main UI is ready (delete test).');
  430 |
  431 |     // --- Action: Navigate to Load Game Modal and Delete Game ---
  432 |     await settingsButtonDeleteTest.click();
  433 |     await page.getByText('Lataa Peli').click();
  434 |     const loadGameModalHeadingDelete = page.getByRole('heading', { name: /Lataa Peli/i });
  435 |     await expect(loadGameModalHeadingDelete).toBeVisible();
  436 |     console.log('Load Game modal is visible (delete test).');
  437 |
  438 |     // Listen for and accept the confirmation dialog
  439 |     page.on('dialog', async dialog => {
  440 |         console.log(`Dialog message for delete: "${dialog.message()}" - Accepting.`);
  441 |         await dialog.accept();
  442 |     });
  443 |
  444 |     // Locate the game item to delete and its delete button
  445 |     const gameItemToDelete = page.getByTestId(`game-item-${gameIdToDelete}`);
  446 |     await expect(gameItemToDelete).toBeVisible();
  447 |     console.log(`Found game item to delete: ${gameNameToDelete}`);
  448 |     
  449 |     // 1. Click the options menu button within the game item
  450 |     // Assuming it has a title attribute based on LoadGameModal.tsx
  451 |     const optionsButton = gameItemToDelete.locator('button[title="Options"], button[title="Valinnat"]'); // Add Finnish translation if needed
  452 |     await expect(optionsButton).toBeVisible();
  453 |     await optionsButton.click();
  454 |     console.log('Clicked options menu button.');
  455 |
  456 |     // 2. Now locate and click the Delete button (likely visible globally or within a menu container)
  457 |     // Use the translation key from LoadGameModal.tsx
  458 |     const deleteButton = page.getByRole('button', { name: /Delete Game|Poista Peli/i }); 
  459 |     await expect(deleteButton).toBeVisible({ timeout: 5000 }); // Wait for menu item to appear
  460 |     await deleteButton.click();
  461 |     console.log(`Clicked delete button for game: ${gameNameToDelete}`);
  462 |
  463 |     // --- Assertions ---
  464 |     // 1. UI Verification: Game to delete is gone, game to keep remains
  465 |     await expect(gameItemToDelete).not.toBeVisible({ timeout: 5000 });
  466 |     console.log(`Verified game item ${gameNameToDelete} is no longer visible in modal.`);
  467 |     
  468 |     const gameItemToKeep = page.getByTestId(`game-item-${gameIdToKeep}`);
  469 |     await expect(gameItemToKeep).toBeVisible();
  470 |     console.log(`Verified game item ${gameNameToKeep} is still visible in modal.`);
  471 |
  472 |     // 2. LocalStorage Verification
  473 |     const { savedGamesAfterDelete, appSettingsAfterDelete } = await page.evaluate(({ sGamesKey, appSetKey }) => {
  474 |       const sg = localStorage.getItem(sGamesKey);
  475 |       const as = localStorage.getItem(appSetKey);
  476 |       return {
  477 |         savedGamesAfterDelete: sg ? JSON.parse(sg) as SavedGamesCollection : null,
  478 |         appSettingsAfterDelete: as ? JSON.parse(as) as AppSettings : null,
  479 |       };
  480 |     }, { sGamesKey: SAVED_GAMES_KEY, appSetKey: APP_SETTINGS_KEY });
  481 |
  482 |     expect(savedGamesAfterDelete, 'Saved games collection should still exist').not.toBeNull();
  483 |     expect(savedGamesAfterDelete?.[gameIdToDelete], `Game ${gameIdToDelete} should be removed from localStorage`).toBeUndefined();
  484 |     expect(savedGamesAfterDelete?.[gameIdToKeep], `Game ${gameIdToKeep} should still exist in localStorage`).toBeDefined();
  485 |     expect(savedGamesAfterDelete?.[gameIdToKeep]?.teamName).toBe(gameNameToKeep);
  486 |     console.log('Verified localStorage: game deleted, other game remains.');
  487 |
  488 |     // If the deleted game was the current game, currentGameId should become null
  489 |     // or if the list is empty. If other games exist, it might pick one - depends on app logic.
  490 |     // Since we explicitly set it to gameIdToDelete, we expect it to be null if no other game auto-loads.
  491 |     // If one auto-loads (e.g. gameIdToKeep), it would be gameIdToKeep.
  492 |     // For now, assuming it becomes null or is NOT gameIdToDelete.
  493 |     if (initialCurrentGameId === gameIdToDelete) { // Now using the correctly scoped variable
  494 |         expect(appSettingsAfterDelete?.currentGameId, 'currentGameId should be null or not the deleted gameId if deleted game was current').not.toBe(gameIdToDelete);
  495 |         // More specific check if it should be null:
  496 |         // expect(appSettingsAfterDelete?.currentGameId).toBeNull(); 
  497 |         // Or if it should be the other game:
  498 |         // expect(appSettingsAfterDelete?.currentGameId).toBe(gameIdToKeep);
  499 |         console.log(`currentGameId is now: ${appSettingsAfterDelete?.currentGameId}. Verified it is not the deleted game's ID.`);
  500 |     }
  501 |     
  502 |     // Close the modal
  503 |     // Locate the modal first, e.g., by its heading or a data-testid if available for the modal container
  504 |     const loadGameModal = page.locator('div.fixed.inset-0').filter({ has: page.getByRole('heading', { name: /Lataa Peli/i }) });
  505 |     // Use force:true as a workaround for potential pointer-event interception
  506 |     await loadGameModal.getByRole('button', { name: /Sulje/i }).click({ force: true }); 
> 507 |     await expect(loadGameModalHeadingDelete).not.toBeVisible({ timeout: 5000 });
      |                                                  ^ Error: Timed out 5000ms waiting for expect(locator).not.toBeVisible()
  508 |     console.log('Closed Load Game modal after delete test.');
  509 |   });
  510 |
  511 | }); 
```