# Feature Development Ideas

This file tracks potential new features and enhancements for the soccer coaching application.

## User Submitted Ideas

1.  **Enhanced Timer Reliability**:
    *   **Status**: Partially Implemented
    *   **Description**: Improve the game timer to be more reliable, especially when the app is hidden or the browser tab is in the background.
    *   **Current Thoughts on Timing**: Potentially post-migration or requires significant investigation for robust background operation (e.g., web workers, server-side sync).

2.  **Link to Coaching Materials**:
    *   **Status**: Implemented
    *   **Description**: Add a new link in the UI (e.g., in the Control Bar or a new section) that directs users to external coaching materials or resources.
    *   **Current Thoughts on Timing**: Pre-migration (simple UI addition).

3.  **Individual Player Statistics View**:
    *   **Status**: Not Implemented
    *   **Description**: Provide a way to view detailed statistics for individual players, not just aggregated team/game stats.
    *   **Current Thoughts on Timing**: Can be started pre-migration. Complex queries/aggregations might be enhanced post-migration with a database.

4.  **Toggleable Field View (Roster vs. Tactics)**:
    *   **Status**: Implemented
    *   **Description**: Allow the coach to toggle the main field view between the current player/opponent positions and a clean tactics board for drawing plays. The tactics board has its own drawing layer and allows for adding/moving colored discs.
    *   **Current Thoughts on Timing**: Pre-migration (client-side UI/state management).

5.  **Link to Soccer Rules**:
    *   **Status**: Implemented
    *   **Description**: Add an easily accessible link to official soccer rules for quick reference during a game.
    *   **Current Thoughts on Timing**: Pre-migration (simple UI addition).

6.  **Customizable Branding (Logo & Colors)**:
    *   **Status**: Not Implemented
    *   **Description**: Allow users to customize the application's appearance with their own team logo and potentially theme colors.
    *   **Current Thoughts on Timing**: Basic client-side implementation pre-migration. User-specific persistent settings post-migration.

7.  **Real-time Statistics UI Update**:
    *   **Status**: Implemented
    *   **Description**: Ensure that all statistics displayed in the UI (e.g., in GameStatsModal) update immediately as game events occur, without requiring a "Quick Save".
    *   **Current Thoughts on Timing**: Pre-migration (likely a bug fix or client-side reactivity improvement).

8.  **Dedicated Season/Tournament Management Modal**:
    *   **Status**: Implemented
    *   **Description**: Create a separate, more focused modal for creating, editing, and deleting seasons and tournaments, rather than relying on selections within other modals (like Game Settings).
    *   **Current Thoughts on Timing**: Pre-migration (UI/component structure change).

## AI Assistant Suggested Enhancements

*(To be populated with suggestions)*

9.  **Shot Chart/Heatmap for Shots**:
    *   **Status**: Not Implemented
    *   **Description**: Enhance the statistics by visually representing shot locations on the field, perhaps as a heatmap or a simple shot chart. This could be per game or aggregated.
    *   **Current Thoughts on Timing**: Post-migration if storing detailed coordinates and performing complex queries. A simpler version might be feasible pre-migration if coordinates are already part of `GameEvent`.

10. **Pre-set Formations/Tactics Library**:
    *   **Status**: Not Implemented
    *   **Description**: Allow coaches to save and quickly load common formations or tactical setups onto the field.
    *   **Current Thoughts on Timing**: Could start pre-migration for client-side saving. User-specific library would be post-migration.

11. **Enhanced Drawing Tools**:
    *   **Status**: Not Implemented
    *   **Description**: Improve the drawing tools with more options like different line weights, colors, shapes (e.g., circles, rectangles beyond freehand), and perhaps arrows.
    *   **Current Thoughts on Timing**: Pre-migration (UI and canvas logic enhancements).

12. **Player Substitution Tracking**:
    *   **Status**: Partially Implemented
    *   **Description**: Implement a more formal way to track player substitutions, perhaps logging when players come on/off the field. This could feed into individual playing time stats.
    *   **Current Thoughts on Timing**: Pre-migration for basic tracking; more complex stats/reporting post-migration.

13. **Game Plan/Notes Section**:
    *   **Status**: Implemented
    *   **Description**: A dedicated section (perhaps per game or per tournament) where coaches can type up game plans, pre-game notes, or post-game reflections.
    *   **Current Thoughts on Timing**: Pre-migration for simple text fields; robust storage and linking to specific games post-migration. 