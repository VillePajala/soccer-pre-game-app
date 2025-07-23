# LocalStorage Deprecation Plan

This document describes the process for removing browser `localStorage` usage now that data is stored in Supabase.

## Timeline
- **Phase 1:** display in-app warnings during versions 0.9.x.
- **Phase 2:** disable `localStorage` by default once all active users have migrated (target **2025‑12‑31**).
- **Phase 3:** remove the `localStorage` utilities and driver entirely in version **1.0**.

## Migration completion criteria
- All users successfully sign in to Supabase and sync their data.
- Automated telemetry reports zero `localStorage` access.
- Manual regression tests pass with `localStorage` disabled.

See `docs/migration-troubleshooting.md` for help with migration issues.
