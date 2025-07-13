# Season & Tournament Management Enhancement Plan

This plan expands the organizational features around seasons and tournaments referenced in the project TODO list【F:.docs/TODO.md†L95-L108】.

## 1. Extended Data Model
- Add optional fields to `Season` and `Tournament` objects for default game parameters: `location`, `periodCount`, and `periodDuration`.
- Include `startDate` and `endDate` or an array of explicit game dates for tournaments.
- Support `archived` flag to hide old seasons/tournaments from active menus.
- Allow attaching a default roster ID and rich text `notes`.
- Store optional `color` or `badge` style settings.

## 2. Prefill & Roster Logic
- When creating a new game, auto-populate settings from the selected season or tournament.
- If a default roster is assigned, preselect those players.
- Persist these defaults using existing localStorage helpers.

## 3. UI Updates
- Expand `SeasonTournamentManagementModal` with inputs for the new fields.
- Add archive toggle and quick stats section showing total games and goals.
- Provide buttons to export/import season or tournament setups as JSON.
- Offer a button to generate a calendar (.ics) file when dates are defined.

## 4. Tasks
1. **Data schema changes** – update types and local storage helpers.
2. **Modal form additions** – implement new inputs and archive toggle.
3. **Game creation prefill** – auto-populate new game settings and roster.
4. **Import/export utilities** – allow JSON backup of season/tournament data.
5. **Calendar export** – create `.ics` generation helper.

## Status
- [x] Data schema changes implemented
- [ ] Remaining tasks pending
