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
- [ ] The helpers in `src/utils/localStorage.ts` wrap synchronous APIs in async functions. Evaluate replacing them with direct synchronous calls or a unified wrapper that checks for `window` availability. Remove unnecessary `Promise.resolve`/`Promise.reject` usage.
- [ ] Harden error handling in `appSettings.ts` and `savedGames.ts` when localStorage fails (e.g. private browsing).

## 3. Game Import Validation
- [ ] Implement schema validation inside `importGamesFromJson` before persisting data. Use `zod` or similar to ensure each imported object conforms to `AppState`.
- [ ] Add unit tests covering invalid JSON, missing fields and overwrite behaviour.

## 4. Timer Improvements
- [ ] `useGameTimer` recreates its interval every second because `timeElapsedInSeconds` is in the dependency list. Refactor to keep a stable interval while running, using a ref for the latest state.
- [ ] Consider moving the `formatTime` helper from `TimerOverlay.tsx` to a shared utility module.

## 5. User Feedback & Logging
- [ ] Provide visual confirmation when the quick‑save operation succeeds (the TODO near line 1782 of `HomePage.tsx`). A toast notification is sufficient.
- [ ] Replace verbose `console.log` statements with a lightweight logging utility that can be disabled in production builds.

## 6. Translation Maintenance
- [ ] The custom augmentations in `src/i18n.ts` complicate merging JSON locale files. Investigate generating type definitions for translation keys and consolidating all translations in JSON to avoid runtime mutations.

## 7. Additional Testing
- [ ] Extend unit tests for `useGameSessionReducer` to cover score adjustment and timer reset edge cases.
- [ ] Add smoke tests for the modal context to ensure modals do not interfere with each other when opened sequentially.

