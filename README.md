# PEPO Soccer App

A web application designed for PEPO coaches and teams to manage game timing, track statistics, visualize player positions, and access relevant team resources during matches.

<img src=".docs/images/screenshot_timer_view_with_substitutions_play_time_records.jpg" alt="Timer and Substitution Tracking" width="300"/> <img src=".docs/images/screeshot_tactics_view.jpg" alt="Main Tactics View" width="300"/> 

## Key Features

*   **Match Timer:**
    *   Start, pause, and reset game timer.
    *   Supports configurable period duration and number of periods (1 or 2).
    *   Large timer overlay view for clear visibility.
*   **Substitution Management:**
    *   Set substitution interval duration (in minutes).
    *   Visual alerts (warning/due) for upcoming substitution times.
    *   Record when substitutions are made.
    *   Track time since the last substitution.
    *   View completed interval durations in the timer overlay.
*   **Game Statistics:**
    *   Log goals for the home team (PEPO), including scorer and optional assister.
    *   Quickly record opponent goals.
    *   View a filterable and sortable player stats table (Goals, Assists, Points).
    *   Review a time-sorted event log (Goals, Opponent Goals).
    *   Edit game information (opponent name, date, score).
    *   Add and edit game notes.
*   **Data Export:**
    *   Export detailed game statistics (game info, final score, event log, player stats, notes) to JSON format.
    *   Export a human-readable summary to CSV format (compatible with Excel).
*   **Basic Tactics Board:**
    *   Drag & Drop players from the bar to the field.
    *   Move players and simple opponent markers on the field.
    *   Toggle player name visibility.
    *   Freehand drawing tool.
*   **Player Management:**
    *   Edit player names in the top bar.
    *   Edit team and opponent names.
*   **PEPO Resources:**
    *   Direct links to Taso and Tulospalvelu within the settings menu.
    *   Access to training resources (via modal).
*   **Usability:**
    *   Internationalization (English/Finnish).
    *   State persistence using browser local storage.
    *   In-app hard reset option.
    *   Fullscreen mode.
    *   Touch-friendly controls.
    *   Undo/Redo for board changes.
    *   Integrated help guide.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **UI Library:** [React](https://reactjs.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **Internationalization:** [i18next](https://www.i18next.com/) and [react-i18next](https://react.i18next.com/)

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

## Resetting Application Data

If you need to completely reset the application and clear all stored data (players, positions, stats, etc.), you can use the "Hard Reset App" option found at the bottom of the Settings menu (cog icon). Alternatively, clear the browser's Local Storage for this site (key: `soccerTacticsAppState`).

---

*Feel free to contribute or report issues!*
