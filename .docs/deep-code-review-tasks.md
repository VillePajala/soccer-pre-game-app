# Deep Code Review Task List

This document captures follow up tasks discovered during a deeper pass over the codebase. The focus is on potential bugs, suboptimal patterns and areas lacking polish.

## 1. React Hook Dependency Audits
- [x] Examine every `useEffect` and `useCallback` in `src/components/HomePage.tsx` for missing dependencies. ESLint currently warns about several omissions (e.g. lines ~738, 961, 1292, 1371, 1517). Fix dependency arrays or restructure callbacks to prevent stale closures.
- [x] Enable the `react-hooks/exhaustive-deps` rule project wide to prevent future regressions.

Manual verification after implementing the above:
  1. Start the development server and ensure the roster and saved games load without errors when visiting the home page.
  2. Start a new game and verify the timer and game state update as players are added and removed.
  3. Open the roster settings modal and try adding, renaming and removing a player. The UI should react immediately without stale data.
  4. Perform a quick save, reload the page and confirm the saved game can be loaded with the correct lineup.
  5. Switch the app language using the language selector to confirm translations still update across the page.

## 2. Local Storage Utilities
- [x] The helpers in `src/utils/localStorage.ts` wrap synchronous APIs in async functions. Evaluate replacing them with direct synchronous calls or a unified wrapper that checks for `window` availability. Remove unnecessary `Promise.resolve`/`Promise.reject` usage.
- [x] Harden error handling in `appSettings.ts` and `savedGames.ts` when localStorage fails (e.g. private browsing).

Manual verification after implementing the above:
  1. Disable localStorage in the browser's devtools (simulate private mode) and confirm that saving settings displays an error but the app does not crash.
  2. Create a new game and ensure it still appears in the saved games list after a page reload.
  3. Import a backup file and verify that overwriting existing data prompts the user for confirmation and succeeds.
  4. Trigger quota exceeded errors via devtools and confirm graceful error messages are shown for saving games or settings.

## 3. Game Import Validation
- [x] Implement schema validation inside `importGamesFromJson` before persisting data. Use `zod` or similar to ensure each imported object conforms to `AppState`.
- [x] Add unit tests covering invalid JSON, missing fields and overwrite behaviour.

Manual verification after implementing the above:
  1. Attempt to import a JSON file with missing required fields and confirm an error is displayed.
  2. Import a valid backup file and verify all games appear correctly in the saved games list.
  3. Try importing a mix of valid and invalid games and ensure the import is rejected with no partial data saved.
  4. Overwrite an existing game when prompted and confirm the new data replaces the old game.

## 4. Timer Improvements
- [x] `useGameTimer` recreates its interval every second because `timeElapsedInSeconds` is in the dependency list. Refactor to keep a stable interval while running, using a ref for the latest state.
- [x] Consider moving the `formatTime` helper from `TimerOverlay.tsx` to a shared utility module.

Manual verification after implementing the above:
  1. Start a new game and ensure the timer counts smoothly without resetting every second.
  2. Pause and resume play and verify the timer resumes from the correct elapsed time.
  3. Let the timer reach the end of a period and confirm it stops and advances the game state correctly.
  4. Reload the page while a period is running and confirm the timer state restores from localStorage.

## 5. User Feedback & Logging
- [x] Provide visual confirmation when the quick‑save operation succeeds (the TODO near line 1782 of `HomePage.tsx`). A toast notification is sufficient.
- [x] Replace verbose `console.log` statements with a lightweight logging utility that can be disabled in production builds.

Status: **Done**

Manual verification after implementing the above:
  1. Perform a quick save and verify a green toast briefly appears confirming success.
  2. Disable localStorage to force a quick save error and confirm an alert is shown and the error is logged.
  3. Open the browser console in development and ensure log messages appear via the logger utility.
  4. Build the project for production and confirm informational logs no longer appear in the console.

## 6. Translation Maintenance
- [x] The custom augmentations in `src/i18n.ts` complicate merging JSON locale files. Investigate generating type definitions for translation keys and consolidating all translations in JSON to avoid runtime mutations.

Manual verification after implementing the above:
  1. Run `npm run generate:i18n-types` and verify `npx tsc src/i18n-types.ts` completes without errors.
  2. Switch languages in the app and confirm all strings render correctly without runtime warnings.

## 7. Additional Testing
- [ ] Extend unit tests for `useGameSessionReducer` to cover score adjustment and timer reset edge cases.
- [ ] Add smoke tests for the modal context to ensure modals do not interfere with each other when opened sequentially.

Manual verification after implementing the above:
  1. Run all Jest suites and ensure new reducer tests pass.
  2. Manually open and close each modal in succession to confirm they do not overlap or freeze the UI.

