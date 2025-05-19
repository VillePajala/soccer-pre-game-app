### Manual Testing Plan for Soccer Coaching App

**I. Core Game Mechanics & Field Interaction**

1.  **Player Management on Field:**
    *   [x] Drag and drop players from the PlayerBar onto the field.
    *   [x] Move players around the field.
    *   [x] Remove players from the field (e.g., by dragging them off or using a remove action if available).
    *   [x] Verify player names and jersey numbers display correctly on tokens (if `showPlayerNames` is true).
2.  **Opponent Tokens:**
    *   [x] Add opponent tokens to the field.
    *   [x] Move opponent tokens.
    *   [x] Remove opponent tokens.
3.  **Drawing Tools:**
    *   [x] Use drawing tools to create lines/shapes on the field.
    *   [x] Clear drawings.
4.  **Reset Field:**
    *   [x] Use the "Reset Field" functionality and verify players, opponents, and drawings are cleared from the field.

**II. Player Bar & Roster Interactions**

1.  **Player Selection:**
    *   [x] Tap a player in the PlayerBar to select them (for drag-and-drop).
    *   [x] Tap the selected player again or the bar background to deselect.
2.  **Toggle Player Names:**
    *   [x] Toggle player name visibility using the control bar button and verify it updates on field tokens and potentially in the PlayerBar.
3.  **"Place All Players":**
    *   [x] Select a subset of players in the Roster Settings.
    *   [x] Use the "Place All Players" button and verify selected players are arranged on the field.
    *   [x] Verify it doesn't duplicate players already on the field.

**III. Game Information & Score Management**

1.  **Team & Opponent Names:**
    *   [x] Change your team name (via Roster Settings or Game Info Bar).
    *   [x] Change the opponent's name (via Game Info Bar or Game Settings Modal).
    *   [x] Verify changes are reflected in the UI.
2.  **Score Updates:**
    *   [ ] Manually update home score (e.g., in Game Stats or Game Settings if applicable).
    *   [ ] Manually update away score.
    *   [ ] Verify scores update correctly after logging goals (see Goal Logging section).
3.  **Home/Away Status:**
    *   [x] Change Home/Away status in Game Settings.
    *   [x] Verify the display in Game Info Bar and score logic (who gets points for "team goal") reflects this.

**IV. Timer & Substitution Management**

1.  **Timer Controls:**
    *   [x] Start the timer.
    *   [x] Pause the timer.
    *   [x] Resume the timer.
    *   [x] Reset the timer.
2.  **Period Progression:**
    *   [x] Let the timer run to the end of a period. Verify it stops and status changes to "Period End".
    *   [x] Start the next period.
    *   [x] Let the timer run to the end of the game. Verify status changes to "Game End".
3.  **Substitution Interval:**
    *   [x] Change the substitution interval (e.g., in Timer Overlay or Game Settings).
    *   [x] Verify substitution alerts (warning, due) appear correctly based on the interval.
    *   [x] Confirm a substitution and verify the alert resets/updates.
4.  **Large Timer Overlay:**
    *   [x] Toggle the large timer overlay.
    *   [x] Verify all functionalities within the overlay work as expected (timer controls, sub confirmation, etc.).

**V. Goal Logging & Event Management**

1.  **Log Team Goal:**
    *   [x] Open Goal Log Modal.
    *   [x] Log a goal for your team, selecting a scorer and an optional assister.
    *   [x] Verify the correct score updates (Home/Away based on setting).
    *   [x] Verify the goal appears in the Game Stats event log.
2.  **Log Opponent Goal:**
    *   [x] Open Goal Log Modal (or use quick opponent goal button in Timer Overlay).
    *   [x] Log a goal for the opponent.
    *   [x] Verify the correct score updates.
    *   [x] Verify the opponent goal appears in the Game Stats event log.
3.  **Edit/Delete Goals (via Game Stats Modal):**
    *   [x] Open Game Stats Modal.
    *   [x] Find a logged goal in the event list.
    *   [x] Edit the scorer/assister/time of the goal. Verify changes and score recalculation.
    *   [x] Delete a goal. Verify its removal and score recalculation.
    *   [x] Verify loading/error states during these operations in Game Settings modal (as it shares some logic).

**VI. Game Setup, Settings & Modals**

1.  **New Game Setup Modal:**
    *   [x] On app load (if no game is current), verify the New Game Setup modal appears.
    *   [x] Skip the setup and verify the app loads with a default state.
    *   [x] Trigger "Start New Game" from Control Bar.
    *   [x] Fill all fields: team name, opponent name, date, location, time, number of periods, period duration.
    *   [x] Select/deselect players for the new game.
    *   [x] Add a new Season.
    *   [x] Add a new Tournament.
    *   [x] Start the game and verify all settings are applied.
2.  **Game Settings Modal:**
    *   [x] Open Game Settings Modal.
    *   [x] Modify all fields: Opponent Name, Game Date, Location, Time, Game Notes. (Verify initial values are correct from New Game Setup if you just started a new game).
    *   [x] Modify Number of Periods, Period Duration. (Verify initial values).
    *   [x] Change Season, Change Tournament. (Verify initial values and changes work).
    *   [x] Award a Fair Play card to a player.
    *   [x] Change/Remove the Fair Play card.
    *   [x] Verify changes are saved and reflected in the game state.
    *   [x] Test editing/deleting goals if this functionality is also present/mirrored here (this was part of V.3, mainly confirm UI consistency if applicable).
    *   [x] Verify loading (`isProcessing`) and error states for all save operations.
3.  **Roster Settings Modal:**
    *   [ ] Open Roster Settings Modal.
    *   [ ] Add a new player (name, jersey, notes, nickname).
    *   [ ] Rename an existing player.
    *   [ ] Change a player's jersey number, notes, nickname.
    *   [ ] Toggle a player's goalie status (ensure only one goalie can be active if that's the rule).
    *   [ ] Remove a player from the master roster.
    *   [ ] Select/deselect players for the current match. Verify this updates `playersForCurrentGame` in PlayerBar.
    *   [ ] Change team name via this modal.
    *   [ ] Verify loading (`isRosterUpdating`) and error (`rosterError`) states for all operations.
4.  **Other Modals:**
    *   [ ] Open and close Instructions Modal.
    *   [ ] Open and close Training Resources Modal.
    *   [ ] Open and close Game Stats Modal.
        *   [ ] Verify data display (game info, stats, event log).
        *   [ ] Test filtering if applicable.

**VII. Data Persistence: Saving, Loading, Importing, Exporting**

1.  **Save Game:**
    *   [ ] Modify game state (players on field, score, etc.).
    *   [ ] Open Save Game Modal, enter a name, and save. Verify success and loading/error states.
    *   [ ] Verify the game now has an ID (not `DEFAULT_GAME_ID`).
2.  **Quick Save:**
    *   [ ] With a loaded game, make changes and use "Quick Save". Verify success.
    *   [ ] Reload the app and check if quick-saved changes persisted.
3.  **Auto Save:**
    *   [ ] Make changes to a loaded game and wait (or trigger action if auto-save is event-driven).
    *   [ ] Reload the app and verify changes were auto-saved.
4.  **Load Game (LoadGameModal):**
    *   [ ] Open Load Game Modal. Verify the list of saved games appears.
    *   [ ] Select and load a game. Verify the game state is restored correctly.
    *   [ ] Verify loading/error states for game list and individual game loading/deleting/importing.
5.  **Delete Game (LoadGameModal):**
    *   [ ] Delete a game. Verify it's removed from the list and persistence.
    *   [ ] If the deleted game was the current game, verify the app resets to a default/new state.
6.  **Import Games (LoadGameModal):**
    *   [ ] Prepare a valid JSON file with game data.
    *   [ ] Import the JSON. Verify games are added to the list.
    *   [ ] Test importing a file with existing game IDs (verify they are skipped).
    *   [ ] Test importing an invalid/malformed JSON file.
7.  **Export Games (LoadGameModal & GameStatsModal):**
    *   [ ] Export a single game as JSON. Verify file content.
    *   [ ] Export a single game as CSV. Verify file content and formatting.
    *   [ ] Export all games as JSON. Verify file content.
    *   [ ] Export all games as CSV. Verify file content and formatting.
    *   [ ] From Game Stats Modal, export aggregate stats as JSON.
    *   [ ] From Game Stats Modal, export aggregate stats as CSV.

**VIII. Undo/Redo Functionality**

*   For each of the following action categories, perform an action, then Undo, then Redo, and verify state changes correctly at each step:
    *   [ ] Player movement on field.
    *   [ ] Adding/removing player from field.
    *   [ ] Opponent token movement/add/remove.
    *   [ ] Drawing actions.
    *   [ ] Score changes (manual or via goal).
    *   [ ] Team/Opponent name changes.
    *   [ ] Game settings changes (date, location, time, notes, periods, duration, season, tournament).
    *   [ ] Roster changes (add/rename/remove player, jersey, notes, goalie status).
    *   [ ] Player selection for match (in Roster Settings).
    *   [ ] Timer actions (start/pause if they create history states).
    *   [ ] Fair play card award.

**IX. UI States & Error Handling**

1.  **Loading Indicators:**
    *   [ ] Perform actions that involve data saving/loading (e.g., Save Game, Load Game, Roster updates, Game Settings saves) and verify loading spinners/disabled buttons appear.
2.  **Error Messages:**
    *   [ ] Try to trigger error conditions (e.g., simulate network failure if possible for async utilities, import bad data).
    *   [ ] Verify user-friendly error messages are displayed for:
        *   Game save/load failures.
        *   Roster update failures.
        *   Game settings save failures.
        *   Import/export failures.
3.  **Disabled States:**
    *   [ ] Verify buttons/inputs are appropriately disabled during processing states.

**X. Miscellaneous**

1.  **Hard Reset:**
    *   [ ] Perform a Hard Reset. Verify all data is cleared and the app returns to its initial state.
2.  **Initial Load & Setup Prompt:**
    *   [ ] Clear application data (e.g., via Hard Reset or clearing localStorage).
    *   [ ] On first load, verify the New Game Setup modal appears.
    *   [ ] If a game was previously loaded, verify it loads correctly on app start.
3.  **Roster Button Highlight / Prompt (If applicable):**
    *   [ ] After starting a new game via the setup modal, check if the roster button highlights or a prompt appears as intended. 