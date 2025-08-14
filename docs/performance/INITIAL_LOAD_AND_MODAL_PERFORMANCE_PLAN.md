# Initial Load and Modal Performance Plan (Sign-in → Statistics / Load Game)

## Objective

Reduce initial and perceived load time right after sign‑in and when opening heavy modals like `Statistics` and `Load Game` by combining real speedups (less work, caching, indexes) with perceived speed improvements (instant UI with skeletons and prefetching).

## Scope

- First minutes after sign‑in
- Opening `LoadGameModal` and `GameStatsModal`
- Prefetch, caching and UI skeletons

## Step-by-step plan

1) Instrument and measure (baseline)
- Add performance marks:
  - signIn→firstModalPaint
  - modalOpen→moduleLoaded
  - moduleLoaded→dataReady
  - Critical fetch durations (games list, seasons, tournaments, stats aggregates)
- Log to console initially; later wire to telemetry/monitoring.
- Acceptance: Each phase duration visible in DevTools and logs.

2) Instant UI with skeletons
- Add lightweight skeletons to `LoadGameModal` and `GameStatsModal` (header, tabs, rows/cards).
- Ensure immediate render via `React.Suspense` fallback; never block on code/data.
- Acceptance: Modal appears within ~100–200ms with placeholders.

3) Prefetch heavy modal code after sign‑in
- After auth success, prefetch in background:
  - `LoadGameModal`
  - `GameStatsModal` (and tabs)
- Use `requestIdleCallback` + a 1–2s delay; also prefetch on hover/focus of menu items.
- Add webpack prefetch hints for these chunks.
- Acceptance: Warm session does not wait on JS chunk load.

4) Prefetch small, critical data after sign‑in
- Kick off low‑priority fetches for:
  - Games list (minimal columns: id, date, opponent, score)
  - Stats metadata (seasons, tournaments)
- Place results into client cache/state.
- Acceptance: First open uses warm cache; background SWR runs.

5) Add client cache with persistence
- Use TanStack Query or SWR for these queries.
- Persist cache to IndexedDB; set `staleTime` 5–15 minutes and `cacheTime` 1–6 hours.
- Hydrate on app start so UI can render instantly from cache.
- Acceptance: Returning users see instant lists; silent refresh updates.

6) Slim and batch queries
- Load Game list:
  - Select only required columns
  - Paginate (limit ~50) with infinite scroll
  - Sort by indexed column (date desc)
- Statistics:
  - Split into metadata call + on‑demand aggregates per tab
  - Return only fields needed for the active tab
- Acceptance: Payload size and TTFB reduced by >30%.

7) Supabase/database tuning
- Verify/add indexes:
  - `games(user_id, created_at desc)`
  - `game_events(game_id)`
  - `player_events(player_id, game_id)` (or equivalent joins)
- Consider RPCs for common aggregates; materialized views for large historical data.
- Acceptance: P95 query latency improved and stable (per Supabase metrics).

8) Connection warm‑up and network hints
- Add `<link rel="preconnect" href="https://<supabase-project>.supabase.co">` and storage/CDN domains.
- Keep gzip/brotli enabled; ensure HTTP/2.
- Acceptance: Reduced DNS/TLS cost for first fetches.

9) Defer non‑critical work
- Lazy‑load charts (e.g., Player tab) only when selected.
- Default to the cheapest statistics tab initially (e.g., Current Game).
- Use `requestIdleCallback` for non‑critical derived calculations.
- Acceptance: Fewer main‑thread long tasks; faster perceived readiness.

10) Service Worker (optional but high impact)
- Precache modal chunks and fonts; `stale‑while‑revalidate` for list endpoints.
- Background sync to refresh caches shortly after sign‑in.
- Acceptance: Instant modals and lists when returning; resilient on flaky networks.

11) Error/timeout handling for smoother perception
- Adaptive timeouts (baseline 6–10s; clamp around observed P95 × multiplier).
- Retries with exponential backoff + jitter.
- Always show partial results from cache while retrying.
- Acceptance: Fewer stalls; graceful degraded experience.

12) Validate, monitor, iterate
- Track weekly:
  - Time to first modal paint
  - Modal data‑ready time
  - Cache hit rate (lists)
  - Supabase P95 latency
- Tune `staleTime`, prefetch timing, and index coverage as needed.

## Where to implement in this repo

- Prefetch code/data after sign‑in: `src/services/ComponentRegistry.ts` and auth success handler.
- Skeletons and Suspense: `src/components/LoadGameModal.tsx`, `src/components/GameStatsModal/*`.
- Client cache: hooks in `src/hooks/` or `src/lib/` integrated with existing stores.
- Query slimming: Supabase calls under `src/lib/storage/*` or `src/services/*`.
- DB indexes: add to `schema.sql` and migrate.

## Expected impact

- Modal open perceived latency: ~100–300ms (skeletons + prefetch)
- First data render: sub‑second on warm cache; ~1–2s cold
- Reduced network/compute from slimmer queries and caching

## Notes

- Aligns with `docs/performance/APP_WIDE_PERFORMANCE_PLAN.md` and complements `docs/load-game-performance-fix.md` with a sign‑in and modal‑focused plan.
