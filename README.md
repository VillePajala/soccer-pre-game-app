# Coaching Companion

A web application designed for soccer coaches to manage game timing, track statistics, visualize player positions, and access relevant team resources during matches.

## Key Features

*   **Game Setup & Management:**
    *   Create new games specifying team names, opponent, date, location, time, number of periods (1 or 2), period duration, and home/away status.
    *   Link games to user-defined Seasons or Tournaments.
    *   Save multiple game states with custom names or unique IDs.
    *   Load saved games to continue tracking, review stats, or update positions.
    *   Quick save functionality for the current game.
    *   Auto-saving of the current game state after initial setup/load.
    *   Add game-specific notes.
    *   Reset current game state or perform a hard reset of all application data.

*   **Roster Management:**
    *   Maintain a master player roster stored locally.
    *   Add, remove, rename players (full name & nickname).
    *   Assign jersey numbers and player-specific notes.
    *   Mark players as goalies.
    *   Select specific players from the roster for the current match.
    *   Award a "Fair Play" card to one player per game.

*   **Interactive Tactics Board:**
    *   Select and place players from the player bar onto the field.
    *   Move players and opponent markers on the field.
    *   Toggle player name/nickname visibility on field markers.
    *   Freehand drawing tool for tactical annotations with undo/redo.
    *   Clear drawings or reset all player/opponent positions independently.
    *   Place all selected players onto the field in a default formation.

*   **Match Timer & Substitution Management:**
    *   Standard game clock: Start, pause, reset.
    *   Supports configured period duration and number of periods.
    *   Large timer overlay view for clear visibility during the match.
    *   Configurable substitution interval timer (in minutes).
    *   Visual alerts (warning/due) for upcoming substitution times based on the interval.
    *   Record when substitutions are made.
    *   Track completed substitution interval durations.

*   **Event Logging & Scoring:**
    *   Log goals for your team, including scorer and optional assister.
    *   Log opponent goals.
    *   Scores update automatically based on logged events and the home/away setting.
    *   View, edit, and delete logged goal events.

*   **Game Statistics & Export:**
    *   View detailed game statistics including scores, event log, and player stats (Goals, Assists, Points).
    *   Filter games by Season or Tournament in the statistics view.
    *   Calculate aggregate player statistics (GP, G, A, Pts, FP Awards) across filtered games.
    *   Export individual game data as JSON or CSV.
    *   Export aggregate statistics (summary + included game details) as JSON or CSV.
    *   Export all saved games at once as JSON or CSV for backup.
    *   CSV exports use semicolon delimiters for better Excel compatibility.

*   **Usability & Technical:**
    *   Progressive Web App (PWA): Installable on mobile/desktop for offline use.
    *   State persistence using browser `localStorage`.
    *   Responsive design.
    *   Touch-friendly controls.
    *   Integrated help/instructions modal.
    *   Dark theme.
    *   Internationalization support (currently English/Finnish) via `i18next`.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **UI Library:** [React](https://reactjs.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **State Management:** React Hooks (`useState`, `useEffect`, `useCallback`, `useMemo`), Custom Hooks (`useGameState`)
*   **Internationalization:** [i18next](https://www.i18next.com/) / [react-i18next](https://react.i18next.com/)
*   **Storage:** Browser LocalStorage API
*   **PWA:** Service Workers & Web App Manifest

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/VillePajala/soccer-app.git
    cd soccer-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # or yarn install / pnpm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    # or yarn dev / pnpm dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) with your browser.

## Usage Notes

*   **Data Storage:** All game data, roster information, and settings are stored exclusively in your browser's `localStorage`. Clearing your browser data for this site **will permanently delete** all saved games and player information. Use the export features regularly for backups.
*   **Initial Setup:** When starting the app for the first time or after a reset, you'll be prompted to set up the first game. Completing this setup automatically saves the game and enables auto-saving. You can also skip setup and save manually later.
*   **Offline Use:** As a PWA, the app can be installed on your device (look for an install button in the browser bar or use "Add to Home Screen"). Once installed, it works offline.

## Resetting Application Data

If you need to completely reset the application and clear all stored data (players, games, stats, settings), use the "Hard Reset App" option found in the Settings menu (cog icon) in the control bar. **This action is irreversible.**

---

*Feel free to contribute or report issues!*
