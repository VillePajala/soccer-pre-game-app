# Demand Correction Feature Plan

## Overview
Certain matches are more demanding than others, making raw performance scores hard to compare. This plan introduces an optional *Demand Correction* toggle in the player statistics view. When enabled, each game's ratings are weighted by a difficulty factor so performances in tougher matches count more.

## 1. Extend Game Data
- Add an optional `demandFactor?: number` to `AppState` in `src/types/game.ts`.
- Default value is `1` when not set. Allowed range `0.5`–`1.5` provides subtle adjustments.
- Include this field when saving and loading games through existing localStorage helpers.
- Expose a numeric input or slider in **GameSettingsModal** and **NewGameSetupModal** so coaches can record the difficulty for each match.

## 2. Weighting Logic
- Update `calculatePlayerAssessmentAverages` and `calculateTeamAssessmentAverages` in `src/utils/assessmentStats.ts`.
- Accept a boolean `useDemandCorrection` argument.
- When enabled, multiply each player's metric value and overall score by `game.demandFactor` before summing.
- Divide the totals by the sum of demand factors instead of the plain game count.
- Keep existing behaviour unchanged when `useDemandCorrection` is false.

## 3. Player Stats Toggle
- In `PlayerStatsView`, add a small checkbox or toggle labeled with a new translation key like `playerStats.useDemandCorrection`.
- Store the toggle state in component state or persist it via `appSettings.ts`.
- Recompute averages with the flag whenever the toggle changes.
- Display a tooltip explaining that the option weights ratings by game difficulty.

## 4. Additional Considerations
- Ensure the demand factor is optional so older saved games remain compatible.
- Add translations for the new label and tooltip in both English and Finnish.
- Write unit tests covering weighted average calculations and the new toggle behaviour.
- Update manual testing docs to verify that enabling the toggle changes displayed averages.

This feature will help coaches compare player performance more fairly when some opponents present tougher challenges.

## Status
- [x] Demand correction toggle implemented and documented.
