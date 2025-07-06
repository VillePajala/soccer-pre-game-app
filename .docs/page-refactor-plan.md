# Refactoring Plan – Splitting `page.tsx`

> **Goal:** Reduce the current 3 500-line `src/app/page.tsx` file into a set of focused, well-tested modules/components so that the page component only orchestrates high-level UI composition.  We will approach this incrementally so the application stays shippable after every step.

---

## 0. Preparation & Safety Net

1. **Baseline green CI** – run the full Jest suite (`npm test -- --watchAll=false`) and make sure everything is already passing.
2. **Branching strategy** – create a long-lived feature branch `refactor/page-split` so we can merge small PRs for each step below.
3. **Snapshot tests** – add a Jest snapshot of the current `Home` page render (shallow render with `render(<Home />)`) so we can detect unintended structural changes while refactoring.
4. **Type-check gate** – ensure `npm run type-check` (tsc --noEmit) is part of CI so that type migrations caused by file moves are caught early.

---

## 1. Extract Fundamental **Types & Constants**  
*(easy – no runtime behaviour change)*

**Tasks**
- Move all interfaces currently declared in `page.tsx` (`Point`, `Opponent`, `GameEvent`, `IntervalLog`, `AppState`, `TacticalDisc`, `SavedGamesCollection`, `TimerState`) to **`src/types/game.ts`**.
- Export them from an index barrel (`src/types/index.ts`) so imports stay short.
- Move the file-local constants `SEASONS_LIST_KEY`, `TIMER_STATE_KEY`, etc. that are not already in `src/config` into **`src/config/storageKeys.ts`**.
- Adjust imports in `page.tsx` (and anywhere else).

**Unit tests**
- TS-only change → run `npm run type-check`; add a dedicated jest test that imports every new type & constant just to assert the module resolves (guards against circular import regressions).

---

## 2. Create `useGameDataQueries` Hook  
*(isolates TanStack Query logic)*

**Tasks**
1. New file `src/hooks/useGameDataQueries.ts` that wraps the five separate `useQuery` calls for roster, seasons, tournaments, saved games, and current game id.
2. The hook returns a typed object `{ masterRoster, seasons, tournaments, savedGames, currentGameId, loading, error }`.
3. Replace the five individual `useQuery` invocations in `page.tsx` with this single hook call.

**Unit tests**
- Mock `@tanstack/react-query` and the underlying utility fns. Test that the hook returns aggregated data and `loading` flag logic works (truthy when **any** query is loading).

---

## 3. Extract **Undo / Redo History** Logic  
*(currently ~120 lines)*

**Tasks**
1. Create `src/hooks/useUndoRedo.ts` implementing the current history array & index handling.
2. Provide API `{ state, set(next), undo(), redo(), canUndo, canRedo }`.
3. Replace the trio `[history, setHistory, historyIndex]` in `page.tsx` with the new hook.

**Unit tests**
- Feed the hook with a dummy `initialState` object; assert push, undo, and redo mutate `state` correctly and `canUndo/Redo` flags update.

---

## 4. Extract **Timer & Visibility / Wake-lock**  
*(largest isolated behaviour)*

**Tasks**
1. New hook `src/hooks/useGameTimer.ts` that owns:
   • `timeElapsedInSeconds`, `isTimerRunning`, `nextSubDueTimeSeconds`, `subAlertLevel`, `lastSubConfirmationTimeSeconds`  
   • side-effects: visibility listener, auto-save of timer state, wake-lock sync.
2. Provide API currently needed by the component: `startPause()`, `reset()`, `ackSubstitution()`, etc.
3. Remove the duplicated `handleVisibilityChange` inner functions in `page.tsx` – they move to the hook.

**Unit tests**
- Use Jest fake timers to test that `timeElapsedInSeconds` increments only while running.
- Simulate page visibility change events to ensure timer pauses/stores state.

---

## 5. Extract **Tactical Board** State & Handlers

**Tasks**
- New hook `src/hooks/useTacticalBoard.ts` managing `isTacticsBoardView`, `tacticalDiscs`, `tacticalDrawings`, `tacticalBallPosition` and related handlers (`handleAddTacticalDisc`, `handleTacticalDiscMove`, …).
- Move formation-placement helper inside (currently inside `handlePlaceAllPlayers`).
- Expose API used by `SoccerField` & `ControlBar`.

**Unit tests**
- Add/Remove disc updates array immutably.
- Toggling disc type cycles through home→opponent→goalie.

---

## 6. Extract **Roster Management** into Dedicated Hook

**Tasks**
- New hook `src/hooks/useRoster.ts` encapsulating `availablePlayers`, mutations (`addPlayer`, `updatePlayer`, `removePlayer`, `setGoalieStatus`) and the highlight/prompt UI flags.
- Provide memoised selectors (`playersForCurrentGame`) and callbacks for bar/roster modal.

**Unit tests**
- Mock `masterRosterManager` utilities and verify optimistic updates roll back on error.

---

## 7. Move **Export / Import** Helpers to Utility File

**Tasks**
- Create `src/utils/exportGames.ts` with `exportJson(game)`, `exportCsv(game)`, `exportAggregateJson(allGames)` & `exportAggregateCsv(allGames)`.
- Delete inline functions `handleExportOneJson`, `handleExportOneCsv`, etc. from `page.tsx` and call utility instead.

**Unit tests**
- Given a minimal `AppState`, verify JSON stringifies correctly and CSV contains header row & formatted times.

---

## 8. Introduce **Modal Visibility Context**  
*(optional but reduces prop-drilling)*

**Tasks**
- Create context provider in `src/contexts/ModalProvider.tsx` that keeps all `isXModalOpen` booleans & their setters.
- Wrap `<Home>` content with the provider; inside, replace the multiple `useState` booleans with context values.

**Unit tests**
- Mount a test component inside the provider, toggle a modal and assert context value updates.

---

## 9. Collapse **Derived Data & Selectors**

**Tasks**
- Identify all `useMemo` inside `page.tsx` that compute derived lists (e.g. `playersForCurrentGame`). Move each to the most relevant hook (`useRoster`, `useGameTimer`, etc.).
- Ensure that memoisation dependencies match the new hook states.

**Unit tests**
- Unit-test selector correctness given mock inputs.

---

## 10. Final **Home Page Slim-down**

At this point `page.tsx` should mostly be:
```tsx
const { stateSlices, callbacks } = use…();
return (
  <main> …high-level layout… </main>
);
```
Remove obsolete code and make sure the line-count drops below ~300 lines.

**Unit tests**
- Update the initial snapshot test from step 0 – it should still match (except for expected prop changes).
- Run full e2e smoke test: render Home, simulate placing a player, saving a game, and opening GoalLog – no runtime errors.

---

## 11. Documentation & Clean-up

1. Update `README.md` with new hooks and architecture description.
2. Add JSDoc comments to each new hook/utility following the existing `STYLE_GUIDE.md`.
3. Delete any dead code left from the extraction.

---

## 12. Gradual Roll-out Checklist (per PR)

- [ ] Code compiles (`npm run type-check`)
- [ ] All unit tests pass (`npm test`)
- [ ] ℹ️ Coverage for the touched area ≥ 80 %
- [ ] ESLint & Prettier clean
- [ ] Reviewer checklist satisfied

---

### Estimated PR Sequence

1. PR-1 – Step 1 (types & constants)
2. PR-2 – Step 2 (aggregated queries)
3. PR-3 – Step 3 (undo/redo)
4. PR-4 – Step 4 (timer)
5. PR-5 – Step 5 (tactical board)
6. PR-6 – Step 6 (roster)
7. PR-7 – Step 7 (export utils)
8. PR-8 – Step 8 (modal context)
9. PR-9 – Step 9 & 10 sweep
10. PR-10 – Docs & clean-up

After each PR merges to `refactor/page-split`, re-run the baseline CI.  Once all steps are merged, raise a final integration PR into `main`.