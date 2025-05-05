# Testing Strategy for Soccer App

This document outlines the testing strategy, frameworks, and conventions used in this project.

## Overview

We employ a multi-layered testing approach:

1.  **Unit Tests (Jest):** To verify individual functions and logic in isolation, focusing on core utilities and business logic.
2.  **Integration / End-to-End (E2E) Tests (Playwright):** To test user flows, component interactions, and feature integration within a real browser environment.

## Frameworks

*   **Unit Testing:** [Jest](https://jestjs.io/) with `ts-jest` for TypeScript support and `jsdom` for a simulated browser environment.
    *   Configuration: `jest.config.js`
*   **Integration/E2E Testing:** [Playwright](https://playwright.dev/) for cross-browser testing of user interactions.
    *   Configuration: `playwright.config.ts` (assumed default)

## Running Tests

*   **Unit Tests:**
    ```bash
    npm run test:unit
    ```
*   **Integration/E2E Tests:**
    ```bash
    npm run test:e2e
    ```
    Or to run a specific file:
    ```bash
    npx playwright test tests/<filename>.spec.ts
    ```
*   **View Last E2E Report:**
    ```bash
    npx playwright show-report
    ```

## Unit Tests (Jest)

*   **Location:** Test files (`*.test.ts`) are typically located alongside the source files they test within the `src/` directory.
*   **Purpose:** Verify the correctness of isolated functions, particularly utility functions and complex logic. Mock dependencies like `localStorage`, `window` APIs, and external modules.
*   **Current Coverage (`src/utils/fullBackup.test.ts`):
    *   `importFullBackup`:
        *   Successfully restores valid data and overwrites `localStorage`.
        *   Handles user cancellation via `window.confirm` correctly (returns `false`, no changes).
        *   Handles invalid JSON input gracefully (returns `false`, shows error alert, no changes).
        *   Handles missing `meta` field in backup data (returns `false`, shows error, no changes).
        *   Handles unsupported schema version in backup data (returns `false`, shows error, no changes).
        *   Handles missing `localStorage` field in backup data (returns `false`, shows error, no changes).
*   **Configuration:** `jest.config.js` defines the preset (`ts-jest`), environment (`jsdom`), path aliases (`moduleNameMapper`), and ignores the Playwright test directory (`testPathIgnorePatterns`).

## Integration/E2E Tests (Playwright)

*   **Location:** Test files (`*.spec.ts`) are located in the `tests/` directory.
*   **Purpose:** Simulate user interactions within a real browser to test complete features and ensure components integrate correctly. Focus on user flows and data persistence as seen by the user.
*   **Current Coverage:**
    *   `tests/backup-restore.spec.ts`:
        *   `should generate a backup file containing all relevant localStorage data`: Verifies successful backup generation via UI interaction and checks downloaded file content against the live `localStorage` state.
        *   `should successfully restore data from a valid backup file`: Verifies the full cycle of backup generation (via download), state change, and successful restore using the generated backup file via `setInputFiles`, ensuring the state returns correctly.
    *   `tests/data-persistence.spec.ts`:
        *   `should save a newly created game to localStorage`: Verifies that creating a new game via the initial setup modal correctly saves the game data and updates app settings in `localStorage`.
*   **Techniques:** Uses standard Playwright locators (`getByRole`, `getByText`, ID selectors), `page.waitForEvent('download')` for backups, `locator.setInputFiles()` for restores, and `expect.poll()` for reliably waiting on asynchronous state changes.

## Testing Improvement Plan

This outlines the next steps to achieve better test coverage, particularly around data safety and manipulation.

**Priority 1: Enhance Backup/Restore Coverage**

1.  **Unit Tests (`src/utils/fullBackup.test.ts`):
    *   Add tests for `exportFullBackup` function:
        *   Verify correct data structure and content based on mocked `localStorage.getItem`.
        *   Test scenarios with missing/empty localStorage keys.
    *   Add test for `importFullBackup` handling `localStorage.setItem` errors (e.g., quota exceeded).

2.  **Integration Tests (`tests/backup-restore.spec.ts`):
    *   Add tests for failed restore scenarios:
        *   Test restoring a non-JSON file.
        *   Test restoring invalid JSON.
        *   Test restoring JSON missing the `meta` field.
        *   Test restoring JSON with an unsupported `meta.schema` version.
        *   Test restoring JSON missing the `localStorage` field.
    *   Ensure all failure tests verify that the original state is preserved and appropriate user feedback (e.g., alert) is given.

**Priority 2: Enhance General Data Persistence/Manipulation Coverage**

3.  **Integration Tests (Game Updates - `tests/data-persistence.spec.ts` or new file):
    *   Test loading an existing game.
    *   Test updating game details (score, notes, names) and saving.
    *   Verify changes are persisted in `localStorage`.

4.  **Integration Tests (Game Deletion - `tests/backup-restore.spec.ts`):
    *   Test deleting a game via the "Load Game" modal.
    *   Verify removal from `localStorage` (`SAVED_GAMES_KEY`).
    *   Verify `appSettings.currentGameId` is updated appropriately.

5.  **Integration Tests (Roster Management - New file `tests/roster.spec.ts` recommended):
    *   Test adding a player.
    *   Test editing a player.
    *   Test deleting a player.
    *   Verify changes in `localStorage` (`MASTER_ROSTER_KEY`).

6.  **Integration Tests (Seasons/Tournaments - New file `tests/seasons-tournaments.spec.ts` recommended):
    *   Test creating seasons/tournaments.
    *   Test editing seasons/tournaments.
    *   Test deleting seasons/tournaments.
    *   Verify changes in `localStorage` (`SEASONS_LIST_KEY`, `TOURNAMENTS_LIST_KEY`). 