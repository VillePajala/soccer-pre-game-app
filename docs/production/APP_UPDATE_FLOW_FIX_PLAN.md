# App Update Flow – Consolidation and UX Plan

Goal: Ensure the app clearly indicates when an update is available and allows users to update without uninstalling, with a consistent, reliable, and testable flow across platforms.

## Current State (observed)

- Two registration paths exist:
  - `src/components/ServiceWorkerRegistration.tsx` registers `public/sw.js`, shows an `UpdateBanner`, fetches `release-notes.json`, and posts `SKIP_WAITING`.
  - `src/components/EnhancedServiceWorkerRegistration.tsx` registers `public/sw-enhanced.js`, exposes a top update banner, and handles SW ↔ client messages (sync, cache status, clear cache).
- `public/sw.js` implements basic app shell/data caching, guards POST requests, supports `SKIP_WAITING`, and includes a “Build Timestamp”.
- `public/sw-enhanced.js` implements richer features: background sync plumbing, cache segmentation, client messaging, push handlers, and `SKIP_WAITING`.
- The hamburger menu already shows manual update controls via `useManualUpdates` and `utils/serviceWorkerUtils` (check/force update, version info via `release-notes.json`).

Risks:
- Dual SW scripts/registrations can lead to inconsistent state (users on different SWs; missing update signals).
- Update indication is not guaranteed to be visible unless a specific banner mounts.
- No periodic update checks; users may sit on old versions.
- Release notes exist but are only surfaced transiently in banners.

## Decision

Standardize on a SINGLE service worker and a SINGLE registration component to avoid split behavior.

- Option A (Recommended): Use the enhanced flow
  - Keep `public/sw-enhanced.js` and `EnhancedServiceWorkerRegistration`.
  - Rationale: Provides upgrade path for offline sync, cache insights, and better user messaging without re-architecting later.
- Option B: Use the simple flow
  - Keep `public/sw.js` and `ServiceWorkerRegistration`.
  - Rationale: Simpler footprint; fewer moving parts.

Either path is fine, but pick one and remove the other registration from runtime.

## Step-by-Step Plan

1) Consolidate to a single SW and registration
- Pick Option A or B above.
- Ensure only the chosen registration component is mounted in `app/layout.tsx` or your top-level wrapper, not both.
- Ensure the chosen SW script path matches the registration (`/sw.js` or `/sw-enhanced.js`).
- Confirm dev behavior: SW disabled/unregistered on localhost; enabled in production.

2) Normalize SW script behavior
- Confirm `SKIP_WAITING` message handling exists and calls `self.skipWaiting()`.
- Confirm `activate` claims clients (`clients.claim()`), and cache cleanup only targets intended cache names.
- Ensure non-GET requests are never cached; fetch and return directly.
- Keep an explicit “Build Timestamp” comment at the end for version diffing.
- Guard fetch handler against non-http protocols and failures; always return a `Response`.

3) Registration: immediate update detection and reload
- On successful registration:
  - If `registration.waiting` exists, set `updateAvailable=true` immediately.
  - Attach `registration.onupdatefound` and watch `installing.state`; when `installed` and a controller exists, set `updateAvailable=true`.
  - Call `registration.update()` once on mount to proactively check for updates.
  - Listen for `navigator.serviceWorker` `controllerchange` and reload the page (already implemented in both components).

4) Global update state for UI surfaces
- Create/standardize a single source of truth (e.g., React context or a small store) that holds:
  - `updateAvailable: boolean`
  - `isUpdating: boolean`
  - optional `releaseNotes: string` and versions
- Registration component writes this state; UI surfaces read it.

5) UI surfaces and visibility
- Persistent indicator: Small dot/badge on the hamburger menu icon when `updateAvailable` is true.
- Menu item: “Update available” entry that opens a dialog showing release notes and an “Update now” action.
- Banner: Keep a top-of-screen banner for high-visibility updates (can be dismissible; keep a way to re-open via menu).
- Ensure this is visible across major screens (avoid hiding behind Suspense-only branches).

6) Release notes and versioning
- Ensure a reliable `release-notes.json` is generated per deploy containing at least `{ version, notes, date }`.
- Registration fetches release notes with `cache: 'no-store'` and stores in global state.
- Show current version (from `release-notes.json` or `package.json`) in the menu About section.
- Optionally compare SW build timestamp vs stored last-loaded timestamp to label “New version available: vX → vY”.

7) Periodic update checks (lightweight)
- Trigger a manual `registration.update()` on:
  - App start
  - App returning to foreground (`visibilitychange`)
  - Optional: every 15–30 minutes of active usage
- Debounce checks to avoid noisy network traffic.

8) Update action
- “Update now” posts `{ type: 'SKIP_WAITING' }` to `registration.waiting`.
- Show a brief “Updating…” overlay while waiting for `controllerchange`.
- On `controllerchange`, reload automatically.

9) Telemetry and logs
- Log the following (to Sentry/console):
  - Update detected (version A → B, timestamps)
  - Update accepted (time-to-accept)
  - Update failed (no controllerchange in N seconds)
- Capture counts to observe adoption of updates.

10) Edge cases and safeguards
- If no SW is registered or SW not supported, still show a “Reload app” menu item with cache-busting reload.
- If users are stuck on a very old SW (e.g., >30 days), show a “Force refresh” item that clears PWA caches and reloads.
- iOS (Safari) PWA quirks:
  - No background sync; SW updates may feel less deterministic.
  - Keep manual update paths prominent.

11) QA checklist
- Browsers: Chrome, Safari (including iOS PWA), Firefox, Edge.
- Scenarios:
  - Fresh install → new deploy → indicator appears → Update now → reload → version increments.
  - App open during deploy → indicator appears without navigation.
  - Dismiss banner → menu badge remains; update still discoverable.
  - Offline/online transitions don’t break update detection.
  - POST requests are never cached by SW; no SW errors in console.
  - Release notes load and display consistently.
  - Multiple tabs: only one needs to accept update; others reload on focus.

12) Rollout plan
- Phase 1: Consolidate to one SW + registration; keep banner + menu items; add menu badge.
- Phase 2: Add periodic checks and About/version display; add telemetry counters.
- Phase 3: Optimize copy, i18n, and ensure A11y for indicators and modals.

## Acceptance Criteria

- Only one service worker is registered and active across all clients in production.
- Users see a persistent indicator (badge) when an update is available, plus a clear “Update now” action.
- Clicking “Update now” swaps the SW via `SKIP_WAITING` and reloads the app.
- Release notes are displayed on demand and are fetchable per build.
- Manual “Check for updates” in the menu shows accurate status and version.
- No caching of non-GET requests; no SW-related errors in console under normal usage.

## Mapping to Code (for implementation reference; no code here)

- Registration: choose one of
  - `src/components/EnhancedServiceWorkerRegistration.tsx`
  - `src/components/ServiceWorkerRegistration.tsx`
- Service worker script: choose one of
  - `public/sw-enhanced.js`
  - `public/sw.js`
- Manual update utilities and menu integration:
  - `src/hooks/useManualUpdates.ts`
  - `src/utils/serviceWorkerUtils.ts`
  - `src/components/ControlBar.tsx` (menu items already present)
- Build artifacts:
  - `scripts/generate-release-notes.mjs` (or similar) to produce `public/release-notes.json`

Note: After consolidating, remove or comment out the unused registration component to prevent accidental dual registration.


