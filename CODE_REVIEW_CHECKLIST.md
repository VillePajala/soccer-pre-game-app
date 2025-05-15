# Code Review Checklist for Soccer Coaching App

This checklist will guide the deep code review process, focusing on quality, maintainability, and readiness for migration to Supabase and Clerk.

## 1. Supabase & Clerk Migration Readiness
- [ ] **Asynchronous Operations:** All data fetching and mutation operations use `async/await` and return Promises.
- [ ] **`localStorage` Usage:** All `localStorage` access points are clearly identified (e.g., via wrapper functions like `utilGetFromLocalStorage`) and marked for replacement with Supabase calls.
- [ ] **Authentication/User Management:** Logic related to user identity or saved games (if user-specific) is abstracted sufficiently for easy integration with Clerk.
- [ ] **Client-Side Storage Dependencies:** No critical dependencies on client-side storage that would be lost or difficult to migrate if not handled by Supabase.
- [ ] **Environment Variables:** Configuration for Supabase (URL, anon key) is planned to be handled via environment variables.

## 2. TanStack Query Usage
- [ ] **Effectiveness:** Queries and mutations are used appropriately for server state.
- [ ] **`queryKey` Management:** `queryKey`s are consistent, descriptive, and well-managed (e.g., using factory functions if complex).
- [ ] **Callback Logic:** `onSuccess`, `onError`, `onSettled`, and `onMutate` handlers are implemented correctly and efficiently.
- [ ] **Loading/Error States:** UI properly reflects `isPending`, `isError`, `isSuccess` states for queries and mutations.
- [ ] **Data Invalidation & Refetching:** Data invalidation (`queryClient.invalidateQueries`) and refetching strategies are optimal and occur when necessary (e.g., after mutations).
- [ ] **Optimistic Updates:** Consider if optimistic updates are appropriate for any mutations and if they are implemented correctly.

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
- [ ] **`GameStatsModal` Updates:** Verify that player statistics in `GameStatsModal` update in real-time with game events, without requiring a "Quick Save".
- [ ] **Player Drag-and-Drop on Field:** Ensure this functionality is still working as expected if it was present.

## 9. Internationalization (i18n)
- [ ] **String Coverage:** All user-facing strings are internationalized using the i18n library.
- [ ] **Translation Files:** Translation files (`translation.json`) are well-organized and up-to-date.
- [ ] **Key Management:** Translation keys are descriptive and consistently used.
- [ ] **Programmatic Translations:** Verify the hybrid system in `src/i18n.ts` correctly loads and overrides translations from JSON files.
- [ ] **Language Switching:** If applicable, language switching functionality works correctly.

## 10. Performance
- [ ] **Rendering Performance:** Identify and optimize any performance bottlenecks related to component rendering (e.g., large lists, frequent updates).
- [ ] **Bundle Size:** Check for opportunities to reduce bundle size (e.g., code splitting, lazy loading components/routes).
- [ ] **Data Fetching:** Ensure data fetching is efficient and not over-fetching or under-fetching.

## 11. Accessibility (a11y)
- [ ] **Semantic HTML:** Use semantic HTML elements where appropriate.
- [ ] **Keyboard Navigation:** Ensure all interactive elements are keyboard accessible.
- [ ] **ARIA Attributes:** Use ARIA attributes to enhance accessibility where necessary.
- [ ] **Color Contrast:** Check for sufficient color contrast for text and UI elements.

## 12. Testing
- [ ] **Unit Tests:** Consider adding unit tests for critical utility functions and complex logic.
- [ ] **Integration Tests:** Consider if integration tests are needed for key user flows.
- [ ] **End-to-End Tests:** (Future consideration) Plan for end-to-end tests for overall application stability.

We can add or modify items as we go. How does this initial structure look to you?
Shall we start with the first section, "Supabase & Clerk Migration Readiness"? 