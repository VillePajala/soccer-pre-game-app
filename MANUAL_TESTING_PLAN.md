### Manual Testing Plan for Soccer Coaching App

**CRITICAL UNTESTED AREAS** ⚠️
- Import/Export functionality (Section VII.6-7)
- Undo/Redo functionality (Section VIII)
- Error handling and edge cases (Section IX)
- Hard reset and initial setup (Section X)

---

**I. Core Game Mechanics & Field Interaction**

1.  **Player Management on Field:**
    *   [x] Drag and drop players from the PlayerBar onto the field.
    *   [x] Move players around the field.
    *   [x] Remove players from the field (e.g., by dragging them off or using a remove action if available).
    *   [x] Verify player names and jersey numbers display correctly on tokens (if `showPlayerNames` is true).
    *   [ ] **NEW:** Test dragging multiple players quickly in succession
    *   [ ] **NEW:** Test player placement at field boundaries/corners
    *   [ ] **NEW:** Verify goalie visual distinction (orange color) on field
2.  **Opponent Tokens:**
    *   [x] Add opponent tokens to the field.
    *   [x] Move opponent tokens.
    *   [x] Remove opponent tokens.
    *   [ ] **NEW:** Test maximum number of opponents on field
    *   [ ] **NEW:** Test opponent placement overlapping with players
3.  **Drawing Tools:**
    *   [x] Use drawing tools to create lines/shapes on the field.
    *   [x] Clear drawings.
    *   [ ] **NEW:** Test drawing very long/complex paths
    *   [ ] **NEW:** Test drawing while players are moving
4.  **Reset Field:**
    *   [x] Use the "Reset Field" functionality and verify players, opponents, and drawings are cleared from the field.
    *   [ ] **NEW:** Test reset during active timer
    *   [ ] **NEW:** Test reset with unsaved changes

**II. Player Bar & Roster Interactions**

1.  **Player Selection:**
    *   [x] Tap a player in the PlayerBar to select them (for drag-and-drop).
    *   [x] Tap the selected player again or the bar background to deselect.
    *   [ ] **NEW:** Test selection with empty roster
    *   [ ] **NEW:** Test selection persistence across modal opens/closes
2.  **Toggle Player Names:**
    *   [x] Toggle player name visibility using the control bar button and verify it updates on field tokens and potentially in the PlayerBar.
    *   [ ] **NEW:** Test toggle during game in progress
3.  **"Place All Players":**
    *   [x] Select a subset of players in the Roster Settings.
    *   [x] Use the "Place All Players" button and verify selected players are arranged on the field.
    *   [x] Verify it doesn't duplicate players already on the field.
    *   [ ] **NEW:** Test with only 1 player selected
    *   [ ] **NEW:** Test with all players already on field

**III. Game Information & Score Management**

1.  **Team & Opponent Names:**
    *   [x] Change your team name (via Roster Settings or Game Info Bar).
    *   [x] Change the opponent's name (via Game Info Bar or Game Settings Modal).
    *   [x] Verify changes are reflected in the UI.
    *   [ ] **NEW:** Test with very long team names
    *   [ ] **NEW:** Test with special characters/emojis in names
2.  **Score Updates:**
    *   [x] Manually update home score (e.g., in Game Stats or Game Settings if applicable).
    *   [x] Manually update away score.
    *   [x] Verify scores update correctly after logging goals (see Goal Logging section).
    *   [ ] **NEW:** Test score updates during period transitions
    *   [ ] **NEW:** Test negative score prevention
3.  **Home/Away Status:**
    *   [x] Change Home/Away status in Game Settings.
    *   [x] Verify the display in Game Info Bar and score logic (who gets points for "team goal") reflects this.
    *   [ ] **NEW:** Test changing status mid-game with existing goals

**IV. Timer & Substitution Management**

1.  **Timer Controls:**
    *   [x] Start the timer.
    *   [x] Pause the timer.
    *   [x] Resume the timer.
    *   [x] Reset the timer.
    *   [ ] **NEW:** Test rapid start/pause toggling
    *   [ ] **NEW:** Test timer accuracy over extended period (5+ minutes)
2.  **Period Progression:**
    *   [x] Let the timer run to the end of a period. Verify it stops and status changes to "Period End".
    *   [x] Start the next period.
    *   [x] Let the timer run to the end of the game. Verify status changes to "Game End".
    *   [ ] **NEW:** Test changing period settings mid-game
    *   [ ] **NEW:** Test single period game flow
3.  **Substitution Interval:**
    *   [x] Change the substitution interval (e.g., in Timer Overlay or Game Settings).
    *   [x] Verify substitution alerts (warning, due) appear correctly based on the interval.
    *   [x] Confirm a substitution and verify the alert resets/updates.
    *   [ ] **NEW:** Test sub alerts across period boundaries
    *   [ ] **NEW:** Test very short sub intervals (1 minute)
4.  **Large Timer Overlay:**
    *   [x] Toggle the large timer overlay.
    *   [x] Verify all functionalities within the overlay work as expected (timer controls, sub confirmation, etc.).
    *   [ ] **NEW:** Test overlay on different screen sizes
    *   [ ] **NEW:** Test all controls work in overlay mode

**V. Goal Logging & Event Management**

1.  **Log Team Goal:**
    *   [x] Open Goal Log Modal.
    *   [x] Log a goal for your team, selecting a scorer and an optional assister.
    *   [x] Verify the correct score updates (Home/Away based on setting).
    *   [x] Verify the goal appears in the Game Stats event log.
    *   [ ] **NEW:** Test goal logging with no players in roster
    *   [ ] **NEW:** Test self-assist prevention
2.  **Log Opponent Goal:**
    *   [x] Open Goal Log Modal (or use quick opponent goal button in Timer Overlay).
    *   [x] Log a goal for the opponent.
    *   [x] Verify the correct score updates.
    *   [x] Verify the opponent goal appears in the Game Stats event log.
    *   [ ] **NEW:** Test logging goals at time 00:00
3.  **Edit/Delete Goals (via Game Stats Modal):**
    *   [x] Open Game Stats Modal.
    *   [x] Find a logged goal in the event list.
    *   [x] Edit the scorer/assister/time of the goal. Verify changes and score recalculation.
    *   [x] Delete a goal. Verify its removal and score recalculation.
    *   [x] Verify loading/error states during these operations in Game Settings modal (as it shares some logic).
    *   [ ] **NEW:** Test editing goal to different period time
    *   [ ] **NEW:** Test bulk goal operations (multiple edits/deletes)

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
    *   [ ] **NEW:** Test starting new game with game in progress
    *   [ ] **NEW:** Test duplicate season/tournament names
    *   [ ] **NEW:** Test future dates and past dates
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
    *   [ ] **NEW:** Test concurrent edits (multiple fields at once)
    *   [ ] **NEW:** Test very long game notes
3.  **Roster Settings Modal:**
    *   [x] Open Roster Settings Modal.
    *   [x] Add a new player (name, jersey, notes, nickname).
    *   [x] Rename an existing player.
    *   [x] Change a player's jersey number, notes, nickname.
    *   [x] Toggle a player's goalie status (ensure only one goalie can be active if that's the rule).
    *   [x] Remove a player from the master roster.
    *   [x] Select/deselect players for the current match. Verify this updates `playersForCurrentGame` in PlayerBar.
    *   [x] Change team name via this modal.
    *   [x] Verify loading (`isRosterUpdating`) and error (`rosterError`) states for all operations.
    *   [ ] **NEW:** Test duplicate player names
    *   [ ] **NEW:** Test duplicate jersey numbers
    *   [ ] **NEW:** Test removing player who has scored goals
    *   [ ] **NEW:** Test maximum roster size limits
4.  **Other Modals:**
    *   [x] Open and close Instructions Modal.
    *   [x] Open and close Training Resources Modal.
    *   [x] Open and close Game Stats Modal.
        *   [x] Verify data display (game info, stats, event log).
        *   [x] Test filtering if applicable.
    *   [ ] **NEW:** Test modal stacking (opening one while another is open)
    *   [ ] **NEW:** Test ESC key to close modals

**VII. Data Persistence: Saving, Loading, Importing, Exporting** 🔴 **CRITICAL**

1.  **Save Game:**
    *   [x] Modify game state (players on field, score, etc.).
    *   [x] Open Save Game Modal, enter a name, and save. Verify success and loading/error states.
    *   [x] Verify the game now has an ID (not `DEFAULT_GAME_ID`).
    *   [ ] **NEW:** Test saving with empty game name
    *   [ ] **NEW:** Test saving during active timer
2.  **Quick Save:**
    *   [x] With a loaded game, make changes and use "Quick Save". Verify success.
    *   [x] Reload the app and check if quick-saved changes persisted.
    *   [ ] **NEW:** Test quick save on unsaved game
3.  **Auto Save:**
    *   [x] Make changes to a loaded game and wait (or trigger action if auto-save is event-driven).
    *   [x] Reload the app and verify changes were auto-saved.
    *   [ ] **NEW:** Test auto-save conflict scenarios
4.  **Load Game (LoadGameModal):**
    *   [x] Open Load Game Modal. Verify the list of saved games appears.
    *   [x] Select and load a game. Verify the game state is restored correctly.
    *   [x] Verify loading/error states for game list and individual game loading/deleting/importing.
    *   [ ] **NEW:** Test loading with many saved games (20+)
    *   [ ] **NEW:** Test search/filter functionality
5.  **Delete Game (LoadGameModal):**
    *   [x] Delete a game. Verify it's removed from the list and persistence.
    *   [x] If the deleted game was the current game, verify the app resets to a default/new state.
    *   [ ] **NEW:** Test deleting last remaining game
6.  **Import Games (LoadGameModal):** 🔴 **UNTESTED**
    *   [ ] Prepare a valid JSON file with game data.
    *   [ ] Import the JSON. Verify games are added to the list.
    *   [ ] Test importing a file with existing game IDs (verify they are skipped).
    *   [ ] Test importing an invalid/malformed JSON file.
    *   [ ] Test importing very large JSON file (100+ games)
    *   [ ] Test importing file with missing required fields
    *   [ ] Test importing file with extra/unknown fields
7.  **Export Games (LoadGameModal & GameStatsModal):** 🔴 **UNTESTED**
    *   [ ] Export a single game as JSON. Verify file content.
    *   [ ] Export a single game as CSV. Verify file content and formatting.
    *   [ ] Export all games as JSON. Verify file content.
    *   [ ] Export all games as CSV. Verify file content and formatting.
    *   [ ] From Game Stats Modal, export aggregate stats as JSON.
    *   [ ] From Game Stats Modal, export aggregate stats as CSV.
    *   [ ] Test export with special characters in data
    *   [ ] Test export with no games
    *   [ ] Verify exported files can be re-imported

**VIII. Undo/Redo Functionality** 🔴 **COMPLETELY UNTESTED**

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
    *   [ ] **NEW:** Test undo/redo limits (max history)
    *   [ ] **NEW:** Test undo/redo after save/load
    *   [ ] **NEW:** Test rapid undo/redo sequences

**IX. UI States & Error Handling** 🔴 **NEEDS ATTENTION**

1.  **Loading Indicators:**
    *   [ ] Perform actions that involve data saving/loading (e.g., Save Game, Load Game, Roster updates, Game Settings saves) and verify loading spinners/disabled buttons appear.
    *   [ ] Test interrupting operations (closing modal during save)
2.  **Error Messages:**
    *   [ ] Try to trigger error conditions (e.g., simulate network failure if possible for async utilities, import bad data).
    *   [ ] Verify user-friendly error messages are displayed for:
        *   Game save/load failures.
        *   Roster update failures.
        *   Game settings save failures.
        *   Import/export failures.
    *   [ ] Test localStorage quota exceeded scenarios
    *   [ ] Test corrupted localStorage data recovery
3.  **Disabled States:**
    *   [ ] Verify buttons/inputs are appropriately disabled during processing states.
    *   [ ] Test keyboard navigation when elements are disabled

**X. Miscellaneous** 🔴 **CRITICAL FOR MIGRATION**

1.  **Hard Reset:**
    *   [ ] Perform a Hard Reset. Verify all data is cleared and the app returns to its initial state.
    *   [ ] Verify confirmation dialog prevents accidental reset
    *   [ ] Test that seasons/tournaments are also cleared
2.  **Initial Load & Setup Prompt:**
    *   [ ] Clear application data (e.g., via Hard Reset or clearing localStorage).
    *   [ ] On first load, verify the New Game Setup modal appears.
    *   [ ] If a game was previously loaded, verify it loads correctly on app start.
    *   [ ] Test with corrupted currentGameId setting
3.  **Roster Button Highlight / Prompt (If applicable):**
    *   [ ] After starting a new game via the setup modal, check if the roster button highlights or a prompt appears as intended.

**XI. Cross-Browser & Device Testing** 🔴 **NEW SECTION**

1.  **Browser Compatibility:**
    *   [ ] Test on Chrome (latest)
    *   [ ] Test on Firefox (latest)
    *   [ ] Test on Safari (latest)
    *   [ ] Test on Edge (latest)
    *   [ ] Test on mobile browsers (iOS Safari, Chrome Android)
2.  **Responsive Design:**
    *   [ ] Test on desktop (1920x1080)
    *   [ ] Test on tablet (iPad size)
    *   [ ] Test on mobile (iPhone/Android size)
    *   [ ] Test landscape/portrait orientations
3.  **Touch Interactions:**
    *   [ ] Test all touch gestures on actual touch devices
    *   [ ] Test multi-touch scenarios
    *   [ ] Test touch vs mouse interaction differences

**XII. Performance & Stress Testing** 🔴 **NEW SECTION**

1.  **Large Data Sets:**
    *   [ ] Test with 50+ players in roster
    *   [ ] Test with 100+ saved games
    *   [ ] Test with very long game (2+ hours)
    *   [ ] Test with many goals/events (50+)
2.  **Memory Leaks:**
    *   [ ] Monitor memory usage during extended play session
    *   [ ] Test repeated modal open/close cycles
    *   [ ] Test repeated save/load cycles
3.  **Concurrent Operations:**
    *   [ ] Test multiple rapid state changes
    *   [ ] Test operations during auto-save

---

## Testing Priority Before Migration

### 🔴 **MUST TEST** (Critical for data integrity):
1. **All Import/Export functionality** - Essential for data migration
2. **Hard Reset functionality** - Need to ensure clean slate works
3. **Undo/Redo system** - Core functionality that affects state management
4. **Error handling** - Must handle edge cases gracefully
5. **Initial setup flow** - Critical for new user experience

### 🟡 **SHOULD TEST** (Important for completeness):
1. Cross-browser compatibility
2. Performance with large datasets
3. All edge cases marked as "NEW"

### 🟢 **NICE TO TEST** (Can be done post-migration):
1. Extended performance testing
2. Accessibility features
3. Keyboard navigation

---

## Recommended Testing Approach

1. **Create Test Data Set:**
   - Create 5-10 games with various states
   - Include games with many events, different settings
   - Export this as your baseline test data

2. **Test Critical Paths:**
   - Complete game flow: Setup → Play → Save → Export
   - Data integrity: Export → Clear → Import → Verify
   - Error recovery: Corrupt data → Load → Verify graceful handling

3. **Document Issues:**
   - Keep a log of any issues found
   - Rate severity (Critical/High/Medium/Low)
   - Fix critical issues before migration

4. **Regression Testing:**
   - After fixes, re-test affected areas
   - Ensure no new issues introduced 