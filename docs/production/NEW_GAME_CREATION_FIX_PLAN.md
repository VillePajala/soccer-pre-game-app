# New Game Creation – End-to-End Stabilization Plan

## Objective
Ensure that opening the New Game Setup modal is instant and reliable, background data loads predictably, and clicking “Confirm & Start Game” always creates a game (or clearly reports why not) across local/dev/prod. Eliminate the recurring “stuck skeleton” and “confirm does nothing” symptoms.

## Current Symptoms (from logs/user reports)
- Service Worker errors when modal opens: “Failed to execute 'put' on 'Cache': Request method 'POST' is unsupported.”
- Background hooks time out: `[useRosterData]` (5s), `[useSavedGamesData]` (5s), `[useGameCreationData]` (8s).
- Modal skeleton appears to hang; UI feels blocked even though it’s a Suspense fallback.
- Post sign-in, refetch paused in modal; with auth-empty fallbacks, lists remain empty.
- Confirm appears to do nothing if create-inputs are open or save is queued.

## Root Causes (code-level)
- Service worker (SW) intercepts and caches all API requests, including POSTs; Cache API rejects non-GET → runtime errors and broken network flows.
- Modal pauses refetch while open; queries return “empty defaults” on transient auth errors and never retry → persistent emptiness.
- Save queue debounces/queues creation behind earlier saves; no visible submit state → “no-op” perception.
- Confirm disabled when add-season/tournament inputs are open/pending → user believes submit failed.
- Transient auth gap immediately after sign-in (`auth.getUser()`); provider throws AuthenticationError; without retry, initial create fails.
- a11y warnings (Radix Dialog) and CSP noise add confusion in logs; not blockers but degrade signal.

## Fix Scope
- Service Worker: Only cache GET; never touch POST/PUT/PATCH/DELETE; always return a valid Response in all branches. Exclude metrics and Supabase writes from caching.
- Modal UX: Provide explicit submitting state; keep Confirm enabled unless a mutation is actually in flight.
- Background data: Permit a one-shot refetch shortly after modal open even if refetch is paused, to cover sign-in stabilization.
- Save queue: Process new-game creation saves immediately (no debounce) and show progress.
- Provider auth: Retry once if `getCurrentUserId()` fails due to immediate post-sign-in gap.
- Validation clarity: Modal surfaces validation/submit errors with toasts; users aren’t left guessing.
- Optional: Preload modal chunk after sign-in to avoid initial Suspense delay.

## Changes Implemented
- SW: `public/sw.js`
  - Skip caching for non-GET requests; respond directly with `fetch(request)`.
  - Cache only GET 200 responses; return cached or a fallback Response when offline.
  - Ensure a `Response` is returned in all code paths.
- Modal state: `src/components/NewGameSetupModal.tsx`
  - Added `isSubmitting` with “Creating…” label; Confirm disabled only when submitting or a mutation is actually pending.
- Background refetch: `src/hooks/useGameCreationData.ts`
  - Added one-shot refetch (~1.2s) after open when refetch is paused to overcome transient auth.
- Save queue: `src/hooks/useGameDataManager.ts`
  - Creation save enqueued with `immediate=true`; runs without debounce delay.
- Provider auth retry: `src/lib/storage/supabaseProvider.ts`
  - If `getCurrentUserId()` fails, retry once after ~400ms before proceeding.

## Remaining Improvements (recommended)
- Preload modal chunk after sign-in: route-level preload or `import()` warmup to reduce initial Suspense time.
- Clarify validations in `NewGameSetupModal`:
  - Allow Confirm when create-inputs are visible but blank; treat them as optional unless user explicitly submits.
  - Ensure toasts are visible in-view (not offscreen) on failure.
- Reduce hook rule violations (conditional hooks) noted by CI warnings to avoid nondeterministic behavior in edge cases.
- a11y: Add `DialogTitle` and `aria-describedby` for dialogs per Radix guidance.
- CSP: Stop SW from fetching external avatars (or allow-list if required) to reduce console noise.

## Rollout Plan
1. Local
   - Clear SW/caches: DevTools → Application → Service Workers → Update/Unregister, Clear storage → Clear site data; hard reload.
   - Validate creation flow:
     - Open modal immediately after sign-in: lists should hydrate (one-shot refetch), UI interactive.
     - Click Confirm: button shows “Creating…”, modal closes, app switches to new game.
   - Confirm no SW POST errors; no lingering 401/404 noise from probes.

2. Staging
   - Deploy and force SW update (version bump comment in `sw.js`).
   - Verification checklist (see below) with multiple accounts.

3. Production
   - Deploy during low-traffic window; communicate SW update requirement.
   - Monitor sentry for SW errors and new-game creation timings (p50/p95).

## Verification Checklist
- SW behavior
  - No “[SW] Failed to execute 'put' on 'Cache': Request method 'POST' is unsupported”.
  - API POSTs (metrics, Supabase writes) bypass cache; GETs cache on 200 only.
  - Offline navigation returns offline.html; API GET fallback returns 503 JSON.

- Modal behavior
  - Opening modal after sign-in shows interactive form quickly; dropdowns hydrate within a second if cached; otherwise after one-shot refetch.
  - Confirm shows “Creating…” and closes upon success; main view switches to the new game.
  - Validation toasts appear when fields invalid; Confirm is not disabled silently.

- Backend writes
  - Supabase insert path logs (dev): “Inserting new game…”, then success.
  - On transient auth gap, provider retry allows operation without manual retry.

- Background hooks
  - No persistent 5s/8s timeouts after SW update; occasional initial warnings acceptable immediately post-sign-in.

## Monitoring & Metrics
- Admin monitoring page: ensure Web Vitals and create timings are visible.
- Sentry: track errors in `saveSavedGame`, `getCurrentUserId`, SW fetch handler exceptions.
- Logs to watch in dev:
  - `[SUPABASE] Inserting new game… / Game inserted successfully`.
  - `[GameCreation] t3/t4/t5` sequence in `HomePage`.

## Risks & Mitigations
- Stale SW on client: instruct users to refresh/update SW; include version bump in SW comment.
- RLS mismatches: ensure `user_id` ownership for players/seasons/tournaments; add a debug toggle to show current `auth.uid()` and object `user_id`.
- Conditional hooks: fix systematically to avoid subtle regressions.

## Timeline
- Day 0: Ship SW update + modal/save/provider changes (done locally).
- Day 1: Verify staging; fix a11y titles; add optional modal preloading.
- Day 2: Production rollout; monitor and address any edge cases.

## Operational Playbook
- If a user reports “stuck skeleton”: 
  - Ask them to hard reload (SW update) once.
  - Verify modal lists refetch; if still empty, check Supabase queries and RLS.
- If “Confirm does nothing”:
  - Look for submitting state; check for validation toasts.
  - Inspect logs for `[GameCreation] t3/t4` and Supabase insert; if missing, triage queue or provider.

---

Last updated: YYYY-MM-DD
