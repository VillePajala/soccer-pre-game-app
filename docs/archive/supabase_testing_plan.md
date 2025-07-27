
# Supabase Functionality Manual Testing Plan

This document outlines a detailed plan for manually testing all Supabase-related functionalities to ensure data integrity, synchronization, and user experience are working as expected.

---

## 1. User Authentication and Session Management

**Objective:** Verify that user authentication with Supabase is working correctly and that the application handles user sessions properly.

*   **1.1. Sign Up:**
    *   [ ] Create a new account using a unique email and password.
    *   [ ] Verify that a new user is created in the `auth.users` table in Supabase.
    *   [ ] Verify that the user is automatically logged in and redirected to the main application.

*   **1.2. Log In:**
    *   [ ] Log out of the application.
    *   [ ] Log in with the newly created account.
    *   [ ] Verify that the login is successful and the user is redirected to the main application.

*   **1.3. Log Out:**
    *   [ ] Log out of the application.
    *   [ ] Verify that the user is redirected to the login page.
    *   [ ] Verify that you can no longer access authenticated routes.

*   **1.4. Session Persistence:**
    *   [ ] Log in to the application.
    *   [ ] Refresh the page.
    *   [ ] Verify that the user remains logged in.
    *   [ ] Close and reopen the browser.
    *   [ ] Verify that the user remains logged in.

---

## 2. Roster Management (Players)

**Objective:** Ensure that player data is correctly created, read, updated, and deleted (CRUD) and that it's properly associated with the user.

*   **2.1. Create Player:**
    *   [ ] Navigate to the "Manage Roster" screen.
    *   [ ] Add a new player with a unique name, jersey number, and notes.
    *   [ ] Verify that the new player appears in the roster list in the UI.
    *   [ ] Verify that a new record is created in the `players` table in Supabase, with the correct `user_id`.

*   **2.2. Read Players:**
    *   [ ] Refresh the page and navigate back to the "Manage Roster" screen.
    *   [ ] Verify that all previously created players are displayed correctly.

*   **2.3. Update Player:**
    *   [ ] Edit an existing player's name, jersey number, and notes.
    *   [ ] Verify that the changes are reflected in the UI.
    *   [ ] Verify that the corresponding record in the `players` table in Supabase is updated.

*   **2.4. Delete Player:**
    *   [ ] Delete a player from the roster.
    *   [ ] Verify that the player is removed from the UI.
    *   [ ] Verify that the corresponding record is deleted from the `players` table in Supabase.

---

## 3. Game and Event Management

**Objective:** Verify that game data and game events are correctly created, updated, and associated with players.

*   **3.1. Create a New Game:**
    *   [ ] Start a new game, providing a team name, opponent name, and other details.
    *   [ ] Verify that a new record is created in the `games` table in Supabase.

*   **3.2. Record Game Events:**
    *   [ ] During the game, record several goals, assigning scorers and assisters from the roster.
    *   [ ] Verify that new records are created in the `game_events` table for each goal, with the correct `game_id`, `scorer_id`, and `assister_id`.

*   **3.3. End and Save Game:**
    *   [ ] End the game and save it.
    *   [ ] Verify that the game's status is updated in the `games` table.

*   **3.4. Load Saved Game:**
    *   [ ] From the "Load Game" modal, select and load the previously saved game.
    *   [ ] Verify that all game details and events are loaded correctly.

---

## 4. Statistics Calculation

**Objective:** Ensure that player and team statistics are calculated correctly based on the data in Supabase.

*   **4.1. Player Statistics:**
    *   [ ] After recording several games with goals and assists, navigate to the player statistics screen.
    *   [ ] Verify that the goals, assists, and total points for each player are calculated and displayed correctly.

*   **4.2. Team Statistics:**
    *   [ ] Check the team statistics.
    *   [ ] Verify that the team's record (wins, losses, ties) and total goals for and against are correct.

*   **4.3. Real-time Updates:**
    *   [ ] With the statistics screen open in one browser tab, record a new goal in another tab.
    *   [ ] Verify that the statistics are updated in near real-time (or after a refresh, depending on the implementation).

---

## 5. Data Migration and ID Fixing

**Objective:** Verify that the data migration and ID fixing scripts work as expected.

*   **5.1. Run the Player ID Fixer:**
    *   [ ] Navigate to the `/fix-player-ids` page.
    *   [ ] Click the "Start Player ID Fix" button.
    *   [ ] Verify that the script completes successfully and reports the number of events and games fixed.
    *   [ ] Navigate to the `/diagnose-uuid-issue` page and verify that there are no more "unmatched" player issues.

---

## 6. Backup and Restore

**Objective:** Ensure that the backup and restore functionality works correctly and maintains data integrity.

*   **6.1. Create a Backup:**
    *   [ ] Find and use the export functionality to create a backup of your data.
    *   [ ] Open the downloaded JSON file and verify that it contains all your players, seasons, tournaments, and games, including game events.

*   **6.2. Restore from Backup:**
    *   [ ] Navigate to the `/import-backup` page.
    *   [ ] Select the backup file you just created.
    *   [ ] Confirm that you want to delete all existing data and proceed with the import.
    *   [ ] Verify that the import process completes successfully and that the log shows the correct number of imported items.
    *   [ ] After the import, thoroughly check the application to ensure that all data has been restored correctly and that all relationships (e.g., players in games) are intact.

---

## 7. Offline Functionality (If Applicable)

**Objective:** Verify that the application handles offline scenarios gracefully.

*   **7.1. Go Offline:**
    *   [ ] Disconnect your computer from the internet.

*   **7.2. Perform Offline Actions:**
    *   [ ] While offline, create a new player and record a new game event.
    *   [ ] Verify that the changes are reflected in the UI (optimistic updates).

*   **7.3. Go Online and Synchronize:**
    *   [ ] Reconnect your computer to the internet.
    *   [ ] Verify that the changes you made while offline are automatically synchronized with Supabase.
    *   [ ] Check the Supabase tables to confirm that the new data has been saved correctly. 