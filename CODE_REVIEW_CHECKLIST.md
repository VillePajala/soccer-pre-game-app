# Code Review Checklist for Soccer Coaching App

This checklist will guide the deep code review process, focusing on quality, maintainability, and readiness for migration to Supabase and Clerk.

## 1. Supabase & Clerk Migration Readiness
- [X] **Asynchronous Operations:** All data fetching and mutation operations use `async/await` and return Promises.
    - *Note: `src/components/InstallPrompt.tsx` uses synchronous `localStorage.setItem` for UI preference, deemed acceptable. Test files also use sync `localStorage` for setup/teardown.*
- [X] **`localStorage` Usage:** All `localStorage` access points are clearly identified (via wrapper functions or specific async utilities in `src/utils/`) and thus prepared for replacement with Supabase calls.
- [X] **Authentication/User Management:** Data logic is centralized in utility functions, ready to incorporate an internal `userId` once Clerk is integrated (as per `MIGRATION_TO_SUPABASE_AND_CLERK.md`).
- [X] **Client-Side Storage Dependencies:** All critical client-side storage (i.e., data in `localStorage`) is addressed by the Supabase migration plan. No other critical client-side databases are in use for persistent application data.
- [X] **Environment Variables:** Configuration for Supabase (URL, anon key) and Clerk keys is planned to be handled via environment variables, as documented in `MIGRATION_TO_SUPABASE_AND_CLERK.md`.

## 2. TanStack Query Usage
- [X] **Effectiveness:** Queries and mutations are used appropriately for server state (currently `localStorage`, will be Supabase).
- [X] **Effectiveness:** Queries and mutations are now consistently used for server state, including asynchronous CRUD operations for seasons and tournaments via `NewGameSetupModal`.
    - *Note: `utilDeleteGame` and some app settings utilities are still called directly but manage query invalidation; further refactoring to mutations is optional for full consistency but current setup is functional.*
- [X] **`queryKey` Management:** `queryKey`s are consistent, descriptive, and well-managed (e.g., using factory functions if complex).
    - *Note: Created `src/config/queryKeys.ts` and refactored `page.tsx` to use these constants. This makes management easier and less prone to typos.*
- [X] **Callback Logic:** `onSuccess`, `onError` handlers are implemented for mutations (including new ones for addSeason/addTournament) to manage query invalidation, state updates, and basic error logging. `onSettled` and `onMutate` are used where appropriate (e.g. optimistic updates, though not extensively in current scope).
- [X] **Loading/Error States:** UI reflects `isPending`, `isError` states for most critical queries and mutations, particularly within modals. Initial page load has a basic loading indicator. Error messages for failed operations are generally displayed within the relevant modal or logged.
    - *Note: Global UI notification for non-critical background query errors (e.g., initial load of seasons if localStorage is empty) is not implemented but can be a future enhancement. Core mutation operations provide feedback.*
- [X] **Data Invalidation & Refetching:** Data invalidation (`queryClient.invalidateQueries`) and refetching strategies are generally optimal and occur when necessary (e.g., after mutations for master roster, saved games, seasons, tournaments). Query keys are specific, minimizing over/under-invalidation.
    - *Note: `handleDeleteGame` in `page.tsx` directly manipulates local state post-deletion; explicit query invalidation for `savedGames` could be added for strictness but current UI impact is minimal.*
- [ ] **Optimistic Updates:** Consider if optimistic updates are appropriate for any mutations and if they are implemented correctly.
    - [ ] **Optimistic Updates:** Considered. Deferred for now as current `localStorage` backend is fast; revisit when migrating to Supabase where network latency will make optimistic updates more impactful for UX.

## 3. State Management (especially in `src/app/page.tsx`)
- [ ] **Clarity & Coherence:** The overall state management approach (local `useState`, `useReducer`, TanStack Query, Zustand/Jotai if applicable) is clear and coherent.
- [ ] **Separation of Concerns:** Different pieces of state are managed in appropriate places with clear boundaries.
- [ ] **History (Undo/Redo):**
    - [ ] The undo/redo mechanism is robust and correctly captures all relevant state changes (e.g., `availablePlayers`, `playersOnField`, game events, timer state).
    - [ ] Restoring from history correctly updates all dependent UI elements.
- [ ] **`availablePlayers` Synchronization:** `availablePlayers` state is consistently managed and synchronized with `playersOnField` and other dependent states/UI elements.
- [ ] **Prop Drilling:** Minimize prop drilling; consider context or state management libraries for deeply shared state.

## 4. Component Design & Props
- [ ] **Single Responsibility:** Components have a clear and single responsibility.
- [ ] **Props Efficiency:** Props are passed efficiently. Avoid overly complex prop objects if not necessary.
- [ ] **Component Complexity:** Components are not overly complex; break down large components into smaller, manageable ones.
- [ ] **Memoization:** Use `React.memo`, `useMemo`, `useCallback` where appropriate to prevent unnecessary re-renders.

## 5. Async Operations & Error Handling
- [ ] **Consistent Error Handling:** Errors from async operations (API calls, file operations) are handled consistently and gracefully.
- [ ] **User-Friendly Errors:** Error messages displayed to the user are clear and helpful.
- [ ] **Loading Indicators:** Appropriate loading indicators (spinners, skeletons, disabled states) are used for all async operations that involve UI updates.
- [ ] **Timeouts & Retries:** Consider if timeouts or retry mechanisms are needed for critical async operations.

## 6. TypeScript & Type Safety
- [ ] **Type Coverage:** Strive for strong type coverage. Minimize the use of `any`.
- [ ] **Type Definitions:** Types and interfaces are well-defined, accurate, and preferably co-located or in a central `types` directory if shared.
- [ ] **Data Transformations:** Type safety is maintained during data transformations (e.g., `GameData` to `AppState`). Use type guards or validation where necessary.
- [ ] **Utility Types:** Leverage TypeScript utility types (`Partial`, `Omit`, `Pick`, etc.) where appropriate.

## 7. Code Clarity & Maintainability
- [ ] **Readability:** Code is easy to read and understand. Naming conventions for variables, functions, and components are consistent and descriptive.
- [ ] **Simplicity:** Avoid overly complex logic, functions, or components. Refactor complex parts into smaller, simpler units.
- [ ] **Comments:** Comments are used judiciously for non-obvious logic or important context. Avoid comments that merely restate the code.
- [ ] **File & Directory Structure:** The project has a logical and maintainable file and directory structure.
- [ ] **Dead Code:** Remove any unused variables, functions, components, or files.
- [ ] **Consistency:** Code style and patterns are consistent across the codebase. Consider using a linter and formatter (e.g., ESLint, Prettier).

## 8. Specific Bug Fixes & Regressions
- [ ] **Undo/Redo - Player Name:** Verify that undoing a player name change correctly updates the player bar and any other relevant UI.
- [ ] **Undo/Redo - Jersey Number:** Verify that undoing a jersey number change works correctly.
- [ ] **Undo/Redo - Goalie Status:** Verify that undoing goalie status changes correctly updates UI (disc color, top bar), and ensures only one goalie is active.
- [ ] **Player Removal from Field:** Verify that deselecting a player (checkbox in RosterSettingsModal) removes them from `playersOnField` and updates history.
- [ ] **`GameStatsModal` Updates:** Verify that player statistics in `GameStatsModal`