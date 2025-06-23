# Data Safety Test Plan

This document tracks the implementation of automated tests focused on ensuring data persistence, integrity, and recoverability, particularly concerning `localStorage` and future cloud migration.

## Test Suites & Scenarios

### 1. Basic Data Persistence (`tests/data-persistence.spec.ts`)

- [x] **Game Creation Persistence:** Verify that creating a new game with team/opponent names correctly saves the game data to `localStorage`. (Implemented in `data-persistence.spec.ts`)

### 2. Backup & Restore (`tests/backup-restore.spec.ts`)

- [x] **Backup Generation:** Verify that triggering a backup generates a file containing all relevant `localStorage` data (`SAVED_GAMES_KEY`, `APP_SETTINGS_KEY`, `SEASONS_LIST_KEY`, `TOURNAMENTS_LIST_KEY`, `MASTER_ROSTER_KEY`). (Implemented - Note: `LAST_HOME_TEAM_NAME_KEY` intentionally excluded).
- [x] **Restore Success:** Verify restoring from a valid backup file correctly overwrites `localStorage` with the backup content. (Implemented in `backup-restore.spec.ts` using both UI-based and direct function testing)
- [ ] **Restore Failure (Invalid/Corrupted File):** Verify attempting to restore from an invalid file does not corrupt or clear existing `localStorage` data.
- [ ] **Restore Failure (Schema Mismatch):** Verify restoring from a backup with an older/different schema version is handled gracefully (e.g., rejects restore, attempts migration if applicable).
- [ ] **Backup/Restore Empty State:** Verify backup/restore works correctly when `localStorage` is initially empty.

### 3. Data Persistence Across Sessions/Reloads (`tests/session-persistence.spec.ts` - *To be created*)

- [ ] **Game Update Persistence:** Modify game details (score, notes), save, reload, and verify changes persist.
- [ ] **Roster Update Persistence:** Add/modify/delete players, reload, and verify changes persist in `MASTER_ROSTER_KEY`.
- [ ] **Settings Update Persistence:** Modify relevant app settings (`APP_SETTINGS_KEY`), reload, and verify changes persist.
- [ ] **Season/Tournament Creation Persistence:** Create seasons/tournaments, reload, and verify they exist in `SEASONS_LIST_KEY`/`TOURNAMENTS_LIST_KEY`.

### 4. Data Integrity (`tests/data-integrity.spec.ts` - *To be created*)

- [ ] **Game Association Integrity:** Ensure games saved with season/tournament IDs retain the correct association after reload/load.
- [ ] **Data Type Integrity:** After various operations, fetch data and verify correct data types (numbers, strings, arrays, booleans) for key properties.
- [ ] **Roster/Game Player ID Integrity:** Ensure player IDs used within game objects (`availablePlayers`, `playersOnField`, event logs) correspond to valid IDs in `MASTER_ROSTER_KEY`.

### 5. Destructive Operations (`tests/destructive-operations.spec.ts` - *To be created*)

- [ ] **Hard Reset:** Verify the hard reset function completely clears all relevant application data keys from `localStorage`.
- [ ] **Game Deletion:** Verify deleting a saved game correctly removes it from `SAVED_GAMES_KEY` without affecting other games.
- [ ] **Roster Player Deletion:** Verify deleting a player from the master roster handles potential references in saved games gracefully (e.g., removes player from game rosters, marks as inactive, etc. - depends on desired behavior).
- [ ] **Season/Tournament Deletion:** Verify deleting seasons/tournaments updates associated games appropriately (e.g., clears the association ID). 