# Known Issues and Risks (Backlog)

Date: 2025-08-07
Owner: Engineering

Scope: Functional bugs, inconsistencies, risks, and edge cases identified during code review. This serves as the single backlog for open issues not yet covered by other action plans.

- Total items documented here: 65
- Status key: [ ] Open, [~] Monitoring, [x] Resolved elsewhere

## 1) Functional and logic bugs (high priority)

- [x] Always-true auth condition runs resume check regardless of auth state
  - File: `src/app/page.tsx` (fixed: tightened condition and removed always-true branch)
  - Ref (for context): lines 194–198 where `if (user || !user)` is used
- [x] Pause sets gameStatus to notStarted in provider (should pause, not reset status)
  - File: `src/components/game/GameStateProvider.tsx` (fixed: dispatch `PAUSE_TIMER` and keep status consistent)
  - Ref: lines 157–162 in `pauseGame`
- [x] Duplicate modal open when starting new game (race/flicker risk)
  - File: `src/components/HomePage.tsx` (fixed: await quick save and open modal once)
  - Ref: lines 1646–1682; `newGameSetupModal.open()` invoked twice in the save-&-continue path
- [x] New games default to isPlayed=true
  - File: `src/utils/savedGames.ts` (intentional per product decision; reverted to true by request)
  - Note: Preserves stats for legacy games while allowing explicit marking for planned games

## 2) Persistence/storage contradictions (architecture)

- [x] Docs claim “localStorage-free”, but legacy timer hook still uses localStorage
  - File: `src/hooks/useGameTimer.ts` (fixed: delegate to `useOfflineFirstGameTimer` to persist via IndexedDB)
 - [x] Zustand `persist` stores large app slices in localStorage (risk of quota, SSR access)
  - File: `src/stores/persistenceStore.ts` (fixed: whitelist ultra-light slices only; rely on IndexedDB for heavy data)
 - [x] Documentation contradicts implementation (claims 100% removal of localStorage)
  - File: `docs/production/PRODUCTION_READINESS_PLAN.md` (Section 9) (fixed: clarified IndexedDB is source of truth; localStorage minimized with SSR guards)

## 3) Auth/session bugs

- [x] Sign-out cleanup misses Supabase keys due to extra substring filter
  - File: `src/context/AuthContext.tsx` (fixed: remove all keys starting with `sb-`)
  - Ref: lines ~174–183; previously checked `key.startsWith('sb-') && key.includes('supabase')`

## 4) Types and API mismatches

- [x] `updateGameDetails` omits non-existent `events` instead of `gameEvents`
  - File: `src/utils/savedGames.ts` (fixed: omit `'gameEvents'`)
  - Ref: lines ~331–336
- [x] Game status enums inconsistent (`not_started` vs `notStarted`)
  - Files: `src/stores/gameStore.ts`, `src/components/game/MigratedGameStateProvider.tsx` (fixed: unified to camelCase)
- [x] Context casts `opponents` as `Player[]` (type mismatch risk)
  - Files: `src/types/gameComponents.ts`, `src/components/game/GameStateProvider.tsx` (fixed: typed `opponents` and included in context)

## 5) Timer/substitution inconsistencies

- [x] Provider initial `nextSubDueTimeSeconds` is 0; elsewhere derives from `subIntervalMinutes * 60`
  - File: `src/components/game/GameStateProvider.tsx` (fixed: initialize to `subIntervalMinutes * 60`)
- [x] Mixed fractional vs integer timer accumulation may create off-by-one
  - File: `src/hooks/useGameSessionReducer.ts` (fixed: rounds in `PAUSE_TIMER` and `SET_TIMER_ELAPSED`)

## 6) Security/CSP headers

- [~] Deprecated `X-XSS-Protection` and atypical COEP/COOP; potential cross-origin resource issues
  - File: `next.config.ts`

## 7) UX/flow issues (representative, see extended list)

- [x] Blocking `alert()` in autosave error path disrupts gameplay
  - File: `src/components/HomePage.tsx` (fixed: export alerts replaced with `useToast` toasts)
 - [x] Multi-confirm branching in new game flow; not `await`ing quick-save before opening modal
  - File: `src/components/HomePage.tsx` (fixed: simplified to single confirmation path; quick-save awaited before opening modal)
 - [x] Excessive debug logging in hot paths (autosave, effects)
  - Multiple files (fixed: env-gated logger via `NEXT_PUBLIC_LOG_LEVEL`)
- [~] Legacy vs migrated components coexist (TimerOverlay/GameControls), risk of drift/bloat
  - Files: `src/components/*`, `src/components/game/*` (mitigated: legacy `GameControls` marked as legacy; no direct consumers found)
- [x] Direct `localStorage` usage in store helpers without SSR guards
  - File: `src/stores/persistenceStore.ts` (fixed: added SSR guards around localStorage access)
 - [x] Resume readiness ambiguity due to auth gating vs always-true resume check
  - Files: `src/app/page.tsx`, `src/components/StartScreen.tsx` (fixed: added `useResumeAvailability` hook; page uses it as single source of truth)
- [x] Game event update/remove by index in utils (id is safer)
  - File: `src/utils/savedGames.ts` (fixed: now uses `eventId`)
- [x] “Most recent game” sorting can produce `Invalid Date` and misorder
  - Files: `src/utils/savedGames.ts`, `src/components/HomePage.tsx`, `src/components/LoadGameModal.tsx` (fixed: robust parse with fallback and guards)
 - [x] Persisting large `savedGames` blobs in localStorage may exceed quota
  - File: `src/stores/persistenceStore.ts` (fixed: no `savedGames` slice persisted; IndexedDB only)
 - [x] Inconsistent defaults (period 10 vs 45; sub interval/demand vary)
  - Files: provider, reducer, HomePage, store settings (fixed: unified to 2 periods, 10 min per period, 5 min sub interval)
- [x] CSP may block Supabase or i18n domains if they change
  - File: `next.config.ts` (fixed: `connect-src` allowlist includes Supabase, analytics, i18n endpoints)
 - [x] `/password-reset-help` route referenced; ensure it exists
  - File: `src/app/page.tsx` (fixed: added `src/app/password-reset-help/page.tsx`)
 - [x] Provider exports extras not in `GameStateContextType` (casts to unknown)
  - File: `src/components/game/GameStateProvider.tsx` (fixed: extended `GameStateContextType` to include exported fields)
- [x] Autosave not debounced; can thrash storage/network
  - File: `src/components/HomePage.tsx` (fixed: debounced with a simple queue)
 - [~] Load/init effects complex; double-initialization risks
  - File: `src/components/HomePage.tsx` (partially simplified: single main init effect guarded by combined loading condition)
 - [x] Timer overlay disables Start when `!isLoaded` even if state is otherwise ready
  - File: `src/components/TimerOverlay.tsx` (fixed: Start disabled only when `gameStatus === 'gameEnd'`)
 - [x] Roster duplicate checks not locale/diacritics aware
  - File: `src/hooks/usePlayerRosterManager.ts` (fixed: `Intl.Collator` + NFKD normalization)
- [x] ESLint/TS build errors ignored in Next config (regression risk)
  - File: `next.config.ts` (fixed: enforce in CI; relaxed locally)
 - [ ] `setStorageItem` metadata hardcodes `savedViaSupabase: false` (misleading)
  - File: `src/stores/persistenceStore.ts` (pending: consider adding truthful flag or removing)

## 8) Extended edge cases and risks (tracked for follow-up)

- [ ] `GameControls` duplicate pathways (props vs stores) can drift
  - Monitoring: legacy `GameControls` marked as legacy; prefer `MigratedGameControls`
- [x] StartScreen language effects run twice; risk of flicker
  - File: `src/components/StartScreen.tsx` (fixed: consolidated into single init/sync effect)
- [x] `getLatestGameId` relies on ID timestamp pattern; UUIDs break sort
  - File: `src/utils/savedGames.ts` (fixed: robust date parsing with ID timestamp fallback)
- [x] Period-end timer cleanup swallows storage errors
  - File: `src/hooks/useOfflineFirstGameTimer.ts` (fixed: non-blocking warn with context)
- [x] Timer state cleanup on period end swallows storage errors
  - File: `src/hooks/useOfflineFirstGameTimer.ts` (same as above)
- [x] `VerificationToast` `router.replace('/')` could loop if params reappear
  - File: `src/app/page.tsx` (fixed: guard replace only on root; otherwise strip param in-place)
 - [x] `getFilteredGames` treats empty string as real filter value
  - File: `src/utils/savedGames.ts` (fixed: empty string treated as no filter)
 - [x] No pagination for saved games list; perf risk with many games
  - File: `src/components/LoadGameModal.tsx` (fixed: added client-side pagination and page size selector)
- [ ] Undo/redo uses JSON.stringify snapshot compare (perf risk)
- [ ] Drawing mode separation fragile; risk of losing lines when toggling
- [ ] IndexedDB schema versioning fixed at 1; no migrations implemented
- [~] Error handling often logs without user feedback (besides alert in one path)
  - Ongoing: continuing to replace with toasts in low-traffic paths
- [ ] Persisting `availablePlayers` snapshot increases save payloads
- [ ] Auto-sync of field players from roster mid-game may change UI unexpectedly
- [ ] Date/time sorting depends on locale/timezone; non-24h strings risky
- [ ] Timer overlay typography can overflow on very small screens
- [ ] Some components assume non-null `currentGameId`
- [ ] Large gradients/blur can hurt mobile perf
- [ ] `setSubInterval` next due time rounding can jump when decreasing mid-period
- [ ] Goal event APIs use index in utils; reducer uses ids (mixed paradigm)
- [ ] Toggle goalie allows multiple goalies (no constraint)
- [ ] Tactical discs have no cap (spam risk)
- [ ] “Place all players” assumes 11 slots; ignores extras
- [ ] Opponent name inline edit saves on blur; frequent writes
- [ ] Assessments and stats changes rely on autosave to persist (no immediate commit)
- [ ] Logger sometimes includes potentially sensitive info (emails)
- [ ] `appStateSchema` must keep pace with AppState fields (tactics/timer)
- [ ] Analytics defaults enabled regardless of settings toggle
- [ ] Several async ops not awaited (race conditions in flows)
- [ ] Timer restore vs boundary race at exact end-of-period second
- [ ] `getMostRecentGameId` returns null if dates missing even if games exist
- [ ] Player selection changes not persisted immediately; can be lost on refresh
- [ ] React-icons and heavy imports may increase bundle size

---

## References and linkage

- Complements existing documents:
  - `docs/quality/CODE_QUALITY_REVIEW.md` (overview and plans)
  - `docs/quality/CRITICAL_ISSUES_ACTION_PLAN.md` (weeks 1–2 executables)
  - `docs/quality/HIGH_PRIORITY_IMPROVEMENTS.md`, `docs/quality/LONG_TERM_IMPROVEMENTS.md`

## Suggested next steps

- Prioritize Sections 1–3 for immediate fixes.
- Decide on a single source of truth for persistence and update docs accordingly.
- Add debounced autosave with a save queue.
- Normalize game status + timer semantics across reducer, provider, and hooks.
- Tighten CSP and remove deprecated headers.
