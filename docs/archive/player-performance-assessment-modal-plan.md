# Player Performance Assessment Modal Plan

**Overview**

This document outlines the design for a new feature that adds a player performance assessment modal and integrates the collected data into existing statistics views. The goal is to allow coaches to rate each player after a game, generate new statistics from those ratings, and optionally produce a textual player profile using an LLM.

## 1. Performance Assessment Modal

- **Modal Trigger**
  - Accessed from the main game screen, likely via a new button in the `ControlBar` or within `GameStatsModal` after the game.
  - Only visible when a game is in progress or just finished.
- **Player Cards**
  - Display all players selected for the current match (`selectedPlayerIds` from state).
  - Each player card shows the player's name/number and contains ten sliders for performance metrics.
  - Slider values range 1–5. Metric labels will be finalized later and stored in translations.
- **State Handling**
  - Ratings are stored in `AppState` under a new `playerEvaluations` field keyed by player ID and game ID.
  - Use local storage with the existing `SAVED_GAMES_KEY` mechanism so evaluations persist with each saved game.
  - Consider autosaving as sliders change to avoid data loss.
- **UI Style**
  - Follow the existing style guide for modals and controls (`bg-slate` colors, rounded corners).
  - Provide a “Save” or “Close” button to exit the modal.

## 2. Statistics from Performance Data

- **Data Model**
  - Each player evaluation entry contains ten numeric scores per game. Example:
    ```ts
    interface PlayerEvaluation {
      gameId: string;
      playerId: string;
      metrics: number[]; // length 10, values 1-5
    }
    ```
  - Store evaluations inside `AppState` as `playerEvaluations: PlayerEvaluation[]`.
- **Aggregations**
  - Calculate per-metric averages across games for each player.
  - Show totals/averages in the existing `PlayerStatsView` (new section beneath game log).
  - Compute team-wide averages for each metric and expose them in `GameStatsModal` under an "Overall" tab.
- **Display**
  - In `PlayerStatsView`, add a collapsible panel called “Performance Ratings”. List each metric with:
    - Average rating (1–5) and number of games rated.
    - Optionally a sparkline/trend graph if useful.
  - In `GameStatsModal`, allow filtering by game, season, or tournament to view aggregated team performance metrics.
- **Open Questions**
  - How to weight games with missing ratings?
  - Should ratings be editable after saving? Could require a confirmation dialog.

## 3. Player Profile Generation

- **Trigger Button**
  - Add a “Generate Player Profile” button in the player stats panel.
  - When clicked, gather player info (name, position, jersey number, stats, performance averages, notes).
  - Send this data to an LLM endpoint to produce a short textual profile.
- **API Access**
  - No backend: store the LLM API key in local storage under `APP_SETTINGS_KEY` with a `llmApiKey` field.
  - Add a simple settings screen/input to update the key. Use `type="password"` for the input to hide the value.
  - The fetch call will go directly from the browser to the LLM provider.
- **Result Handling**
  - Display the returned text in a modal or expandable section within `PlayerStatsView`.
  - Provide a “Regenerate” option to rerun the request.
  - Include error handling for network failures and invalid API keys.
- **Security Considerations**
  - Remind users that the API key is stored locally and not encrypted.
  - Document the data sent to the LLM to avoid privacy issues.

## 4. Implementation Notes & Options

- **Slider Component**
  - Could reuse an existing slider library (e.g., `@headlessui/react` Slider) or implement a simple custom range input.
  - Ensure touch-friendly controls for mobile users.
- **Performance Modal Placement**
  - Option A: Standalone modal accessible from the main screen.
  - Option B: Integrated as a new tab within `GameStatsModal` to reduce modal clutter.
- **Data Volume**
  - With 10 metrics per player per game, consider limiting stored history or providing export functionality.
- **Further Thoughts**
  - Metrics themselves should be customizable in settings or via translations.
  - Could allow coaches to define their own rating categories in the future.

## 5. Areas Requiring More Exploration

- How to visually summarize multiple metrics without overwhelming the UI.
- Deciding the best default metric set (technical skills, teamwork, stamina, etc.).
- Determining whether LLM-based profile generation should be synchronous (blocking) or handled with a loading state.
- Verifying browser CORS policies with the chosen LLM provider; some providers might block client-side requests.

