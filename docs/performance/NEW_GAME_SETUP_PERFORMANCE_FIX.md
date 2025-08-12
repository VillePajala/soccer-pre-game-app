# New Game Setup Performance Fix Plan (and How to Apply It App-Wide)

## Problem

- New Game modal blocks on fetching setup data (seasons/tournaments/last team name), so users see a spinner and cannot interact.
- Fetching repeats on every open and doesn't reuse warm cache.
- UI is hard-gated by a single loading flag; no snapshot/skeleton rendering.
- Focus stabilization and possible Supabase cold starts add delay.

## Goals

- **Perceived instant open** (< 200 ms) and immediate typing.
- **Real latency reduction** (pre-warm, avoid duplicate fetches, on-demand heavy data).
- **Graceful UX on slow networks** (fallbacks, retries, background hydrate).

## Step-by-Step Fix for New Game Modal

### 1) Pre-warm After Sign-in (Page Level)
- Immediately prefetch seasons/tournaments (and last team name) after auth and keep in React Query cache.
- Keep this data warm with reasonable stale times; no fetch inside the modal when data is fresh.

### 2) Pass Cached Data to the Modal (Stop Modal-Level Fetches)
- New modal props (or context): `seasons`, `tournaments`, `lastHomeTeamName`.
- Remove the modal's `useEffect` that fetches on open.
- If props are empty (first run), render the form with skeletons and kick off a non-blocking background fetch.

### 3) Snapshot-First Rendering with Skeletons
- Render text inputs enabled immediately.
- Show skeletons in dropdown regions (seasons/tournaments) instead of a page-blocking spinner.
- Hydrate options into the dropdowns when data arrives; don't wipe user input.

### 4) Background Reconciliation (Non-Blocking)
- Merge new options into dropdowns without clearing existing selections if ids match.
- If a selection becomes invalid, show a subtle badge and prompt the user to reselect.

### 5) Refetch Hygiene While Modal is Open
- Pause React Query `refetchOnWindowFocus` and interval refetches for saved games/seasons/tournaments while the modal is open; resume on close.

### 6) Avoid Cold-Start Penalties
- After sign-in, do a tiny Supabase ping (auth/health) to pre-warm TLS/JIT/DB path so the first list queries are fast.

### 7) Timeouts and Graceful Fallbacks
- If background refresh takes > 5–8 seconds, show cached snapshot with a "Refresh" button.
- Never block the form on optional data; only disable the specific control that depends on it.

### 8) Instrumentation
- Add perf marks: modal open, first interactive, data hydrated; surface timings on monitoring page.
- Track cache hit rate for seasons/tournaments and timeout frequency.

### 9) Accessibility & Focus
- Keep focus stabilization, but don't tie it to data readiness; allow immediate focus into the first input.

## Concrete Implementation Tasks

### Page Layer
- Pre-warm via a creation data hook (e.g., `useGameCreationData` using `useQueries`) right after auth success.
- Wire `useGameDataQueries({ pauseRefetch: newGameSetupModal.isOpen })` or equivalent.

### NewGameSetupModal
- Accept `seasons`, `tournaments`, and `lastHomeTeamName` as inputs; remove internal fetching on open.
- Replace full-screen spinner with skeletons only where data is pending (e.g., dropdown regions).
- Preserve selections and inputs across background hydrations.

### Monitoring
- Add `performance.mark()`/`measure()` for "open → interactive" and "open → hydrated".
- Show metrics on the admin monitoring page.

### Guardrails
- Add a 5–8 second timeout for background hydration with a visible non-blocking retry.

## Acceptance Criteria

- ✅ New Game modal is interactive within 200 ms on a warm cache.
- ✅ Dropdowns show skeletons first and hydrate later without blocking input.
- ✅ No duplicate fetches when cached data exists at page level.
- ✅ Under slow network, users can still type and submit; dropdowns hydrate when ready.
- ✅ Perf marks confirm "open → interactive < 200 ms."

## Metrics to Track

- Modal open → first interactive (ms)
- Modal open → data hydrated (ms)
- Cache hit rate for seasons/tournaments
- Timeout/retry counts

## Risks and Mitigations

- **Stale snapshot**: Show "Last updated … ago" and provide a Refresh control.
- **Partial data**: Disable only dependent controls; keep the rest interactive.
- **Race conditions**: Idempotent merges and selection checks by id; avoid wiping user input.

## Apply the Same Pattern Across the App

### Roster Screens
- Pre-warm roster after sign-in, snapshot list instantly, background reconcile to update player details.
- Virtualize long lists; fetch minimal fields for list view; fetch details on-demand.

### Seasons/Tournaments Management
- Minimal list data first; pagination + virtualization; snapshot-first rendering.
- Background reconcile to refresh counts/metadata.

### Assessments/Stats
- Show aggregates first; fetch per-game details and large blobs on-demand.
- Skeleton charts while data hydrates.

### Settings
- Optimistic UI for edits; background persistence via `requestIdleCallback`.

### Admin Monitoring
- Load last metrics snapshot instantly; background refresh; pause refetch while interacting.

## Rollout Plan

**Day 1:** Pre-warm creation data; pass data to modal; remove modal fetches; introduce skeletons.

**Day 2:** Background reconciliation; pause-refetch wiring; timeout + retry guard.

**Day 3:** Instrumentation; validate metrics; polish UX and microcopy.

---

This plan reduces both perceived and actual latency by pre-warming data, rendering instantly from cache, deferring non-critical work, and hydrating in the background. It's the same playbook you can reuse across lists, modals, and dashboards to make the entire app feel snappy.