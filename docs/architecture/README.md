# Architecture Overview

Status: Active

Last Updated: 2025-08-11

Owner: Engineering

Audience: Contributors

This overview summarizes the current architecture and links to deep-dive documents.

## Application Layers

- UI: Next.js 15 App Router, React 19, Tailwind CSS 4
- State: Zustand for client state, React Query for server/cache state
- Persistence: Multi-layer storage
  - Supabase (cloud sync, Auth)
  - IndexedDB (offline cache)
  - localStorage (fallback + small prefs)
- PWA: Custom service worker, dynamic manifest

## Key Concepts

- Game Session: Timer, score, periods, status
- Entities: Players, Seasons, Tournaments, Games, Events, Assessments
- Offline-first: Fully usable offline with sync when online

## Security

- Supabase Auth for sessions
- Security headers and CSP configured in production
- See: `security.md`

## References

- State management migration: `../quality/guides/STATE_MANAGEMENT_MIGRATION.md`
- Storage migration plan: `storage-migration.md`
- Security: `security.md`
- Database schema: `../reference/database-schema.md`
- Style guide: `../project/STYLE_GUIDE.md`

## Code Map

- `src/app/page.tsx` orchestrator
- `src/hooks/` core hooks (game session, game state)
- `src/utils/` storage and helpers

## ADRs

Planned. Capture major decisions (Zustand + RQ, multi-layer storage, PWA caching) here.


