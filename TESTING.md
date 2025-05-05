# Testing Strategy for Soccer App

This document outlines the testing strategy, frameworks, and conventions used in this project.

## Overview

We employ a three-layered testing approach:

1. **Unit Tests (Jest):** To verify individual functions and logic in isolation, focusing on core utilities and business logic.
2. **Integration Tests (Jest):** To test how components and services work together, often involving component rendering and state interaction, while still mocking external dependencies like APIs.
3. **End-to-End (E2E) Tests (Playwright):** To test complete user flows and feature integration within a real browser environment.

## Frameworks

* **Unit & Integration Testing:** [Jest](https://jestjs.io/) with `ts-jest` and `next/jest` for TypeScript/Next.js support, and `jsdom` for a simulated browser environment. Uses `@testing-library/react` for component testing.
  * Configuration: `jest.config.js`
  * Setup: `src/setupTests.js` (handles global mocks like `localStorage`)
* **E2E Testing:** [Playwright](https://playwright.dev/) for cross-browser testing of user interactions and complete features.
  * Configuration: `playwright.config.ts`

## Test Types Defined

* **Unit Tests:** Focus on testing individual functions, methods, or classes in isolation with all dependencies mocked (e.g., `src/utils/fullBackup.test.ts`).
* **Integration Tests:** Test how multiple units work together, such as testing React components interacting with hooks or props, verifying rendering based on state, and simulating user events (`src/components/LoadGameModal.test.tsx`). Dependencies like external APIs or complex browser features (like file reading) are often mocked.
* **End-to-End Tests:** Test the application from a user's perspective, interacting with the UI and verifying the expected behavior across the entire system with minimal mocking (e.g., `tests/backup-restore.spec.ts`).

## Running Tests

* **Unit & Integration Tests:**
  ```bash
  npm run test:unit
  ```
* **E2E Tests:**
  ```bash
  npm run test:e2e
  ```
  Or to run a specific file:
  ```bash
  npx playwright test tests/<filename>.spec.ts
  ```
* **View Last E2E Report:**
  ```bash
  npx playwright show-report
  ```
* **Run All Tests (Unit, Integration, and E2E):**
  ```bash
  npm run test:all
  ```
  This will run Jest tests first, followed by Playwright tests if Jest passes.

## Unit & Integration Tests (Jest)

* **Location:** Test files (`*.test.ts`, `*.test.tsx`) are typically located alongside the source files they test within the `src/` directory.
* **Purpose:** Verify the correctness of isolated functions and component interactions.
* **Dependencies:** Mock external dependencies (`localStorage`, `window` APIs, etc.) using `src/setupTests.js` or Jest mocks.
* **Current Coverage:**
  * **`src/utils/fullBackup.test.ts`**: 
    * `importFullBackup`:
      * ✅ Successfully restores valid full and partial backup data, overwriting/preserving localStorage keys correctly.
      * ✅ Handles user cancellation via `window.confirm`.
      * ✅ Handles validation errors: invalid JSON, missing `meta`, missing `localStorage`, unsupported schema.
      * ✅ Handles runtime errors: localStorage quota exceeded.
      * (Skipped: Verification of `setTimeout` for `window.location.reload` on successful import).
    * `exportFullBackup`:
      * ✅ Gathers all relevant keys from localStorage.
      * ✅ Structures the backup data correctly (meta, localStorage content).
      * ✅ Handles missing keys by setting them to null.
      * ✅ Handles invalid JSON in a localStorage item gracefully (logs error, sets value to null).
      * ✅ Verifies correct Blob creation and download link triggering.
  * **`src/components/LoadGameModal.test.tsx`**:
    * ✅ Renders the basic list of saved games correctly (checks heading content).
    * ✅ Indicates the currently loaded game via a badge.
    * ✅ Displays appropriate messages for empty list / no filter match.
    * ✅ Filters games based on search input.
    * ✅ Filters games by clicking season/tournament badges.
    * ✅ Clears badge filters correctly (re-clicking badge, clearing search).
    * ✅ Handles game loading via `onLoad` prop and closes modal.
    * ✅ Handles game deletion via `onDelete` prop (both confirm and cancel paths).
    * ✅ Triggers `onExportOneJson` / `onExportOneCsv` when menu items are clicked.
    * ✅ Triggers `onExportAllJson` / `onExportAllExcel` when global buttons are clicked.
    * ✅ Triggers file input clicks for `Import` and `Restore from Backup`.
    * ✅ Calls `exportFullBackup` mock when `Backup All Data` is clicked.
    * ✅ Handles successful file selection for import (calls `onImportJson`).
    * ✅ Handles successful file selection for restore (calls `importFullBackup` mock).
    * ✅ Shows alert on `FileReader` read errors (for both import and restore).
    * ✅ Shows alert on JSON processing errors during import.
    * ✅ Shows alert propagated from `importFullBackup` on processing errors during restore.
    * (Skipped: Test for `FileReader.onerror` during restore due to mocking difficulty).
* **Configuration:** `jest.config.js` uses `next/jest` preset, environment (`jsdom`), path aliases (`moduleNameMapper`), and ignores the Playwright test directory (`testPathIgnorePatterns`).

## End-to-End Tests (Playwright)

* **Location:** Test files (`*.spec.ts`) are located in the `tests/` directory.
* **Purpose:** Simulate user interactions within a real browser to test complete features and ensure components integrate correctly. Focus on user flows and data persistence as seen by the user.
* **Current Coverage:**
  * `tests/backup-restore.spec.ts`:
    * ✅ `should generate a backup file containing all relevant localStorage data`: Verifies successful backup generation via UI interaction and checks downloaded file content against the live `localStorage` state.
    * ✅ `should successfully restore data from a valid backup file`: Verifies the full cycle of backup generation (via download), state change, and successful restore using the generated backup file via `setInputFiles`, ensuring the state returns correctly.
  * `tests/data-persistence.spec.ts`:
    * ✅ `should save a newly created game to localStorage`: Verifies that creating a new game via the initial setup modal correctly saves the game data and updates app settings in `localStorage`.
* **Techniques:** Uses standard Playwright locators (`getByRole`, `getByText`, ID selectors), `page.waitForEvent('download')` for backups, `locator.setInputFiles()` for restores, and `expect.poll()` for reliably waiting on asynchronous state changes.

## Progress Report

### Completed

* **Infrastructure:**
  * ✅ Created a combined test command `npm run test:all` to run both Jest and Playwright tests
  * ✅ Updated TESTING.md documentation with clear test type definitions

* **Unit & Integration Tests:**
  * ✅ Fixed and improved `fullBackup.test.ts` to properly test both import and export functionality
  * ✅ Added proper mocking for browser APIs (URL, document, localStorage)
  * ✅ Added comprehensive error case handling tests for backup/restore
  * ✅ Added localStorage quota exceeded error handling test
  * ✅ Added partial backup data handling test
  * ✅ Created `game.test.ts` with tests for game data validation, state management, and persistence
  * ✅ Implemented robust test utilities for game state creation and validation

* **E2E Tests:**
  * ✅ Basic backup and restore functionality tests
  * ✅ Initial game creation persistence test

## Next Steps

Based on our testing plan and current progress, here are the immediate next steps:

### Unit Testing

1. **Setup for integration testing**:
   * Configure the Jest environment for testing interactions between components
   * Create shared mocks for common game state dependencies

2. **Create Roster Management Tests**:
   * Create `roster.test.ts` to test player management functionality
   * Test player addition, modification, and removal
   * Test player statistics calculations

### E2E Testing

1. **Enhance `backup-restore.spec.ts`**:
   * Add tests for handling invalid backup files
   * Test error messages and user notifications

2. **Expand `data-persistence.spec.ts`**:
   * Test complete game lifecycle including updates and deletion
   * Test game filtering and listing functionality

### Implementation Plan

For the next development cycle, we should focus on:

1. Roster management unit tests (`roster.test.ts`) - Priority
2. Enhanced backup/restore E2E tests - Secondary focus

Both of these align with our data security focus, ensuring game data is properly managed and that backup/restore functionality is robust against various error scenarios.

## Testing Improvement Plan

This outlines the next steps to achieve better test coverage, with a comprehensive approach using unit tests, integration tests, and E2E tests.

### Unit Testing Plan (Jest)

**Priority 1: Enhance Backup/Restore Coverage**

1. **Expand `fullBackup.test.ts`**:
   * Add test for `importFullBackup` handling localStorage quota exceeded errors
   * Add test for partial backup data (some keys missing but format valid)

**Priority 2: Game Management Unit Tests**

2. **Create `game.test.ts`**:
   * Test game creation/modification/deletion functions
   * Test game data validation
   * Test game associated stats calculations

**Priority 3: Roster Management Unit Tests**

3. **Create `roster.test.ts`**:
   * Test player CRUD operations
   * Test roster data serialization/deserialization
   * Test player stats calculations

**Priority 4: Season/Tournament Unit Tests**

4. **Create `seasons.test.ts`** and/or **`tournaments.test.ts`**:
   * Test CRUD operations for seasons/tournaments
   * Test game associations with seasons/tournaments
   * Test season/tournament data validation

### Integration Testing Plan (Jest)

**Priority 1: Data Store Integration Tests**

1. **Create `dataStore.test.ts`**:
   * Test interactions between game service and localStorage
   * Test interactions between roster service and localStorage
   * Test interactions between seasons/tournaments services and localStorage

**Priority 2: Component Integration Tests**

2. **Create integration tests for key components**:
   * Test game form components with game services
   * Test roster components with roster services
   * Test season/tournament components with their respective services

**Priority 3: Cross-Service Integration Tests**

3. **Create tests for service interactions**:
   * Test game service with roster service (player assignments)
   * Test game service with season/tournament services (game categorization)

### E2E Testing Plan (Playwright)

**Priority 1: Enhance Backup/Restore E2E Tests**

1. **Expand `backup-restore.spec.ts`**:
   * Test attempting to restore invalid files (non-JSON, malformed JSON)
   * Test restoring backups with missing fields or incorrect schema
   * Verify error handling shows appropriate messages to users
   * Test the backup process includes all necessary app data

**Priority 2: Game Data Persistence E2E Tests**

2. **Expand `data-persistence.spec.ts`**:
   * Test complete game lifecycle (create, load, update, save)
   * Test game deletion and cleanup in localStorage
   * Test game filtering and sorting
   * Verify persistence between app sessions

**Priority 3: Roster Management E2E Tests**

3. **Create `roster.spec.ts`**:
   * Test adding players through the UI
   * Test editing player details
   * Test removing players
   * Verify player assignments to games

**Priority 4: Season/Tournament E2E Tests**

4. **Create `seasons-tournaments.spec.ts`**:
   * Test season/tournament creation
   * Test assigning games to seasons/tournaments
   * Test filtering games by season/tournament
   * Test season/tournament deletion with associated games

**Priority 5: Cross-Feature E2E Tests**

5. **Create `data-integrity.spec.ts`**:
   * Test complex scenarios involving multiple features
   * Test backup/restore with complete application data
   * Test app behavior after multiple data manipulations

## Implementation Strategy

1. For each feature area, implement unit tests first to ensure individual functions work correctly
2. Follow with integration tests to verify components and services work together
3. Complete with E2E tests to verify the UI integration and user flows
4. Implement in small batches, focusing on one feature area at a time
5. Run the full test suite after each implementation to ensure no regressions 