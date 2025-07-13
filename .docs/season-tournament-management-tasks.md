# Season & Tournament Management Task List

This document tracks work needed to finish the advanced management features for seasons and tournaments.
It builds on the plan in [`season-tournament-management-plan.md`](./season-tournament-management-plan.md).

## 1. Modal Form Enhancements
- [x] Add inputs for default game parameters (location, period count, period duration).
- [x] Allow entering a date range or explicit game dates for tournaments.
- [x] Provide an archive toggle and show quick stats (total games and goals).
- [x] Support notes, default roster selection and optional color/badge settings.

## 2. Game Prefill Logic
- [x] When creating a game linked to a season or tournament, prefill settings from that entity.
- [x] Auto-select the default roster if one is set.

## 3. Import/Export Utilities
- [x] Implement JSON import/export for season and tournament configurations.
- [x] Offer calendar (`.ics`) export when dates are defined.

## Status
- [x] Modal and prefill tasks complete
- [x] Import/export utilities complete
