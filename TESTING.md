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
  * **Utility Tests:**
    * **`src/utils/fullBackup.test.ts`**:
      * `importFullBackup`:
        * ✅ Successfully restores valid full and partial backup data, overwriting/preserving localStorage keys correctly.
        * ✅ Handles user cancellation via `window.confirm`.
        * ✅ Handles validation errors: invalid JSON, missing `meta`, missing `localStorage`, unsupported schema.
        * ✅ Handles runtime errors: localStorage quota exceeded.
        * ✅ Verifies correct Blob creation and download link triggering.
      * `exportFullBackup`:
        * ✅ Gathers all relevant keys from localStorage.
        * ✅ Structures the backup data correctly (meta, localStorage content).
        * ✅ Handles missing keys by setting them to null.
        * ✅ Handles invalid JSON in a localStorage item gracefully (logs error, sets value to null).
        * ✅ Verifies correct Blob creation and download link triggering.

    * **`src/utils/game.test.ts`**:
      * ✅ Validates game state structure (`validateGameState`).
      * ✅ Handles `localStorage` interactions: `saveGame`, `loadGame`, `deleteGame`.
      * ✅ Tests persistence scenarios: saving multiple games, overwriting, deleting non-existent.
      * ✅ Includes helper for creating valid game state (`createValidGameState`).
      * ✅ Tests validation of required fields and data types.

    * **`src/utils/roster.test.ts`**:
      * ✅ Validates player data structure (`validatePlayer`).
      * ✅ Handles `localStorage` interactions: `getRoster`, `saveRoster`, `addPlayer`, `updatePlayer`, `removePlayer`.
      * ✅ Tests goalie assignment logic (`setGoalie`).
      * ✅ Tests persistence scenarios: empty roster, adding/updating/removing players.
      * ✅ Includes helper for creating players (`createPlayer`).
      * ✅ Tests validation of player properties and data types.

    * **`src/utils/rosterUtils.test.ts`**:
      * ✅ Tests roster utility functions.
      * ✅ Tests player data manipulation and validation.
      * ✅ Tests roster state management.

    * **`src/utils/seasons.test.ts`** (New):
      * ✅ Handles `localStorage` interactions for seasons: `getSeasons`, `saveSeasons`.
      * ✅ Tests CRUD operations: `addSeason`, `updateSeason`, `deleteSeason`.
      * ✅ Validates season data (e.g., unique names, non-empty names).
      * ✅ Verifies correct array manipulation and persistence.

    * **`src/utils/tournaments.test.ts`** (New):
      * ✅ Handles `localStorage` interactions for tournaments: `getTournaments`, `saveTournaments`.
      * ✅ Tests CRUD operations: `addTournament`, `updateTournament`, `deleteTournament`.
      * ✅ Validates tournament data (e.g., unique names, non-empty names).
      * ✅ Verifies correct array manipulation and persistence.

  * **Component Tests:**
    * **`src/components/LoadGameModal.test.tsx`**:
      * ✅ Renders the basic list of saved games correctly.
      * ✅ Indicates the currently loaded game via a badge.
      * ✅ Displays appropriate messages for empty list / no filter match.
      * ✅ Filters games based on search input.
      * ✅ Filters games by clicking season/tournament badges.
      * ✅ Clears badge filters correctly (re-clicking badge, clearing search).
      * ✅ Handles game loading via `onLoad` prop and closes modal.
      * ✅ Handles game deletion via `onDelete` prop (both confirm and cancel paths).
      * ✅ Tests file import/export functionality.
      * ✅ Tests backup/restore functionality.
      * ✅ Handles various error scenarios (FileReader errors, JSON parsing errors).
      * ✅ Refactored to use `seasons.ts` and `tournaments.ts` utilities for loading season/tournament filter data.

    * **`src/components/RosterSettingsModal.test.tsx`**:
      * ✅ Renders correctly when open/closed.
      * ✅ Calls `onClose` when close button clicked.
      * ✅ Correctly displays initial goalie status (Set/Unset buttons based on `isGoalie`).
      * ✅ Shows the add player form when "Add Player" is clicked.
      * ✅ Calls `onAddPlayer` with correct data when add form submitted.
      * ✅ Calls `onToggleGoalie` with correct ID when goalie button is clicked.
      * ✅ Tests player editing functionality.
      * ✅ Tests player deletion functionality.

    * **`src/components/GameSettingsModal.test.tsx`**:
      * ✅ Tests game settings management.
      * ✅ Tests opponent information updates.
      * ✅ Tests game date and time settings.
      * ✅ Tests game location settings.
      * ✅ Tests game notes functionality.
      * ✅ Tests period duration settings.
      * ✅ Tests home/away team toggle.
      * ✅ Tests season and tournament associations.
      * ✅ Refactored to use `seasons.ts` and `tournaments.ts` utilities for loading season/tournament selection lists.

    * **`src/components/NewGameSetupModal.test.tsx`** (Assumed - check if test file exists):
      * 🚧 (Tests might need update/creation if not already covering new season/tournament creation via utils)
      * ✅ Refactored to use `seasons.ts` and `tournaments.ts` utilities for adding new seasons/tournaments.

## End-to-End Tests (Playwright)

* **Location:** Test files (`*.spec.ts`) are located in the `tests/` directory.
* **Purpose:** Simulate user interactions within a real browser to test complete features and ensure components integrate correctly. Focus on user flows and data persistence as seen by the user.
* **Current Coverage:**
  * **`tests/backup-restore.spec.ts`**:
    * ✅ Tests backup file generation and content verification.
    * ✅ Tests successful restore from valid backup file.
    * ✅ Tests error handling for invalid backup files.
    * ✅ Verifies data integrity after backup/restore operations.
  * **`tests/data-persistence.spec.ts`**:
    * ✅ Tests game creation and persistence.
    * ✅ Tests game loading and data verification.
    * ✅ Tests game updates and persistence.
    * ✅ Tests game deletion and cleanup.
  * **`tests/roster.spec.ts`**:
    * ✅ Tests player management (add, edit, delete).
    * ✅ Tests player assignments on field.
    * ✅ Tests goalie status management.
    * ✅ Tests roster persistence.
  * **`tests/comprehensive-game-save-load.spec.ts`**:
    * ✅ Tests complete game lifecycle.
    * ✅ Tests player assignments and game events.
    * ✅ Tests game state persistence.
    * ✅ Tests game data validation.
* **Techniques:** Uses standard Playwright locators (`getByRole`, `getByText`, ID selectors), `page.waitForEvent('download')` for backups, `locator.setInputFiles()` for restores, and `expect.poll()` for reliably waiting on asynchronous state changes.

* **Data Management & Refactoring:**
  * ✅ Created `src/utils/seasons.ts` and `src/utils/tournaments.ts` to centralize `localStorage` CRUD operations for seasons and tournaments.
  * ✅ Added corresponding unit tests (`seasons.test.ts`, `tournaments.test.ts`) ensuring these utilities function correctly.
  * ✅ Refactored `NewGameSetupModal.tsx`, `LoadGameModal.tsx`, and `GameSettingsModal.tsx` to utilize the new season/tournament utility functions, improving data flow and separation of concerns.
  * ✅ Consolidated `Season` and `Tournament` TypeScript interface definitions, making `src/app/page.tsx` the primary source and updating utility files to import from there.

## Progress Report

### Completed

* **Infrastructure:**
  * ✅ Created a combined test command `npm run test:all`
  * ✅ Updated TESTING.md documentation with clear test type definitions
  * ✅ Configured Jest + Babel + React Testing Library for integration tests (`LoadGameModal.test.tsx`)

* **Unit & Integration Tests:**
  * ✅ Fixed and improved `fullBackup.test.ts` (import/export, errors, quota, partial data)
  * ✅ Added proper mocking for browser APIs (URL, document, localStorage, etc.)
  * ✅ Created `game.test.ts` with tests for validation, state management, persistence
  * ✅ Created `roster.test.ts` with tests for validation, CRUD, goalie logic, persistence
  * ✅ Implemented and fixed integration tests for `LoadGameModal.test.tsx` (rendering, filtering, actions, import/export/backup triggers, basic file handling - 1 skipped)
  * ✅ Implemented integration tests for `RosterSettingsModal.test.tsx` (rendering, add, goalie status/toggle - edit/delete skipped)

* **E2E Tests:**
  * ✅ Basic backup generation and successful restore (`backup-restore.spec.ts`)
  * ✅ Initial game creation persistence (`data-persistence.spec.ts`)
  * ✅ Fixed localization issue in `backup-restore.spec.ts` close button locator
  * ✅ Cleaned up `any` types in `backup-restore.spec.ts`
  * ✅ Implemented game loading persistence (`data-persistence.spec.ts`)
  * ✅ Implemented game update persistence (notes) (`data-persistence.spec.ts`)
  * ✅ Implemented E2E tests for backup/restore failure scenarios (non-JSON, malformed JSON, missing structure, unsupported schema) in `backup-restore.spec.ts`
  * ✅ Implemented E2E test for game deletion (`data-persistence.spec.ts`)
  * ✅ Refactored initial setup modal logic in `app/page.tsx` for more predictable behavior.
  * ✅ Simplified E2E tests in `data-persistence.spec.ts` and `backup-restore.spec.ts` by removing redundant modal handling due to improved startup logic.
  * ✅ Unskipped and implemented `FileReader` error test in `LoadGameModal.test.tsx`.
  * ✅ Implemented E2E test for adding a player in roster management (`tests/roster.spec.ts`)
  * ✅ Implemented E2E test for editing a player in roster management (`tests/roster.spec.ts`)
  * ✅ Implemented E2E test for deleting a player in roster management (`tests/roster.spec.ts`)
  * ✅ Implemented E2E test for assigning players on field in roster management (`tests/roster.spec.ts`)

## Next Steps

Based on our testing plan and current progress, here are the immediate next steps:

1. **Expand Integration Tests:**
   * Add tests for missing components listed above.
   * Prioritize core gameplay components (`SoccerField`, `TimerOverlay`, `GameStatsModal`).
   * Add tests for PWA features (`InstallPrompt`, `ServiceWorkerRegistration`).

2. **Expand E2E Tests:**
   * Add tests for season/tournament management.
   * Add tests for game statistics and reporting.
   * Add tests for multi-game scenarios.
   * Add tests for PWA installation and offline functionality.

3. **Improve Test Coverage:**
   * Add tests for edge cases and error scenarios.
   * Add tests for internationalization (i18n).
   * Add tests for accessibility features.
   * Add tests for offline functionality.

4. **Test Infrastructure:**
   * Set up continuous integration for automated testing.
   * Configure test coverage reporting.
   * Add performance testing.
   * Add visual regression testing for UI components.

### Implementation Plan

For the next development cycle, we should focus on:

1. Integration tests for `GameSettingsModal`.
    * ✅ Opponent Name (edit, cancel)
    * ✅ Game Date (edit, cancel)
    * ✅ Game Location (edit, cancel)
    * ✅ Game Time (HH, MM, clear)
    * ✅ Game Notes (edit, cancel)
    * ✅ Period Duration (edit, cancel)
    * ✅ Home/Away Toggle
    * ✅ Season Association (display dropdown, select, deselect via None)
    * ✅ Tournament Association (display dropdown, select, deselect via None)
2. E2E tests for remaining roster functionality (goalie toggle, unassign).

## Testing Improvement Plan

This outlines the next steps to achieve better test coverage, with a comprehensive approach using unit tests, integration tests, and E2E tests.

### Unit Testing Plan (Jest)

**Priority 1: Enhance Backup/Restore Coverage**

1. **Expand `fullBackup.test.ts`**: ✅ Done

**Priority 2: Game Management Unit Tests**

2. **Create `game.test.ts`**: ✅ Done

**Priority 3: Roster Management Unit Tests**

3. **Create `roster.test.ts`**: ✅ Done

**Priority 4: Season/Tournament Unit Tests**

4. **Create `seasons.test.ts` and `tournaments.test.ts`**: ✅ Done
   * ✅ Test `localStorage` interactions (get, save).
   * ✅ Test CRUD operations (add, update, delete).
   * ✅ Test data validation (unique names, non-empty names).

### Integration Testing Plan (Jest)

**Priority 1: Component Integration Tests (Expand)**

1. **`LoadGameModal.test.tsx`**: ✅ Done
2. **`RosterSettingsModal.test.tsx`**: ✅ Done (except skipped edit/delete)
3. **Create integration tests for other key components**:
    * Test `GameSettingsModal` component
    * Test components related to seasons/tournaments

**Priority 2: Data Store Integration Tests**

4. **Create `dataStore.test.ts`** (or similar):
    * Test interactions between game service and localStorage
    * Test interactions between roster service and localStorage
    * Test interactions between seasons/tournaments services and localStorage

**Priority 3: Cross-Service Integration Tests**

5. **Create tests for service interactions**:
    * Test game service with roster service (player assignments)
    * Test game service with season/tournament services (game categorization)

### E2E Testing Plan (Playwright)

**Priority 1: Enhance Backup/Restore E2E Tests**

1. **Expand `backup-restore.spec.ts`**:
    * Test attempting to restore invalid files (non-JSON, malformed JSON) ✅
    * Test restoring backups with missing fields or incorrect schema ✅
    * Verify error handling shows appropriate messages to users ✅
    * Test the backup process includes all necessary app data (Refine existing check)

**Priority 2: Game Data Persistence E2E Tests**

2. **Expand `data-persistence.spec.ts`**:
    * Test complete game lifecycle (create ✅, load ✅, update ✅, save ✅, delete ✅)
    * Test game filtering and sorting in the Load Game modal via UI
    * Verify persistence between app sessions

**Priority 3: Roster Management E2E Tests**

3. **Expand `roster.spec.ts`**:
    * Test adding players through the UI ✅
    * Test editing player details ✅
    * Test removing players ✅
    * Verify player assignments to games ✅
    * Test setting goalie status
    * Test unassigning players from field

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

### Missing Test Coverage

The following components currently lack test coverage:

1. **Components:**
   * `ControlBar.tsx`
   * `NewGameSetupModal.tsx`
   * `GameInfoBar.tsx`
   * `GameStatsModal.tsx`
   * `PlayerBar.tsx`
   * `SoccerField.tsx`
   * `TimerOverlay.tsx`
   * `SaveGameModal.tsx`
   * `PlayerDisk.tsx`
   * `InstallPrompt.tsx`
   * `GoalLogModal.tsx`
   * `ServiceWorkerRegistration.tsx`
   * `TrainingResourcesModal.tsx`
   * `InstructionsModal.tsx`
   * `I18nInitializer.tsx`

2. **Features:**
   * Service Worker functionality
   * PWA installation
   * Internationalization (i18n)
   * Training resources
   * Game instructions
   * Goal logging
   * Timer functionality
   * Field player interactions

## Next Steps

1. **Expand Integration Tests:**
   * Add tests for missing components listed above.
   * Prioritize core gameplay components (`SoccerField`, `TimerOverlay`, `GameStatsModal`).
   * Add tests for PWA features (`InstallPrompt`, `ServiceWorkerRegistration`).

2. **Expand E2E Tests:**
   * Add tests for season/tournament management.
   * Add tests for game statistics and reporting.
   * Add tests for multi-game scenarios.
   * Add tests for PWA installation and offline functionality.

3. **Improve Test Coverage:**
   * Add tests for edge cases and error scenarios.
   * Add tests for internationalization (i18n).
   * Add tests for accessibility features.
   * Add tests for offline functionality.

4. **Test Infrastructure:**
   * Set up continuous integration for automated testing.
   * Configure test coverage reporting.
   * Add performance testing.
   * Add visual regression testing for UI components.

## Supabase Migration Testing Requirements

### 1. Data Model Validation Tests

#### Unit Tests
* **`src/utils/dataValidation.test.ts`** (New)
  * ✅ Test validation of all data types against Supabase schema
  * ✅ Test handling of invalid data types
  * ✅ Test data transformation functions
  * ✅ Test null/undefined handling
  * ✅ Test required field validation

#### Integration Tests
* **`src/utils/dataMigration.test.ts`** (New)
  * ✅ Test localStorage to Supabase data transformation
  * ✅ Test Supabase to localStorage data transformation (for offline support)
  * ✅ Test data type conversion and validation
  * ✅ Test handling of missing or malformed data

### 2. Migration Process Tests

#### Unit Tests
* **`src/utils/migrationManager.test.ts`** (New)
  * ✅ Test migration process initialization
  * ✅ Test progress tracking
  * ✅ Test error handling and recovery
  * ✅ Test migration state management
  * ✅ Test cleanup procedures

#### Integration Tests
* **`src/utils/migrationService.test.ts`** (New)
  * ✅ Test complete migration flow
  * ✅ Test partial migration scenarios
  * ✅ Test rollback procedures
  * ✅ Test data integrity verification
  * ✅ Test concurrent migration attempts

### 3. User Data Isolation Tests

#### Unit Tests
* **`src/utils/userDataService.test.ts`** (New)
  * ✅ Test user data access control
  * ✅ Test data scoping to user ID
  * ✅ Test multi-user data isolation
  * ✅ Test user authentication state handling

#### E2E Tests
* **`tests/user-data-isolation.spec.ts`** (New)
  * ✅ Test user-specific data access
  * ✅ Test data isolation between users
  * ✅ Test authentication state affecting data access
  * ✅ Test data migration for new users
  * ✅ Test data migration for existing users

### 4. Migration E2E Tests

* **`tests/migration-flow.spec.ts`** (New)
  * ✅ Test complete migration process
  * ✅ Test migration with existing data
  * ✅ Test migration with no existing data
  * ✅ Test migration with partial data
  * ✅ Test migration error handling
  * ✅ Test migration progress indicators
  * ✅ Test data verification after migration

### 5. Performance Tests

* **`tests/migration-performance.spec.ts`** (New)
  * ✅ Test migration speed with large datasets
  * ✅ Test memory usage during migration
  * ✅ Test network usage during migration
  * ✅ Test concurrent operations during migration

### 6. Error Handling Tests

* **`tests/migration-error-handling.spec.ts`** (New)
  * ✅ Test network failure scenarios
  * ✅ Test authentication failure scenarios
  * ✅ Test data corruption scenarios
  * ✅ Test partial migration failure scenarios
  * ✅ Test recovery procedures

### Implementation Priority

1. **Phase 1: Data Validation**
   * Implement data validation tests
   * Implement data transformation tests
   * Verify all data types match Supabase schema

2. **Phase 2: Migration Process**
   * Implement migration manager tests
   * Implement migration service tests
   * Test complete migration flow

3. **Phase 3: User Data**
   * Implement user data isolation tests
   * Test multi-user scenarios
   * Verify authentication integration

4. **Phase 4: E2E Testing**
   * Implement migration flow tests
   * Test error handling
   * Test performance scenarios

### Test Data Requirements

* Create test datasets for:
  * Empty database
  * Small dataset (1-10 records)
  * Medium dataset (100-1000 records)
  * Large dataset (10000+ records)
  * Corrupted data
  * Malformed data
  * Mixed data types
  * Special characters and Unicode
  * Maximum field lengths

### Test Environment Setup

* Create separate test environments for:
  * Local development
  * Staging
  * Production
* Configure test databases with:
  * Supabase test instance
  * Clerk test instance
  * Mock authentication
  * Test data seeding

### Monitoring and Reporting

* Implement test coverage reporting
* Track migration success rates
* Monitor performance metrics
* Log error scenarios
* Generate test reports

This testing plan should be implemented before proceeding with the Supabase migration to ensure data integrity and system reliability.