# MatchDay Coach

A comprehensive PWA for soccer coaches to manage rosters, track live game events, analyze detailed statistics, and design plays on an interactive tactics board. Built for the sideline, available on any device.


## Key Features

The app is designed to be an all-in-one digital assistant for game day, from pre-match planning to post-game analysis.

### ⚽ Tactics & Gameplay

*   **Interactive Field:** Drag and drop players and opponents directly onto the pitch.
*   **Dedicated Tactics Board:** Toggle to a clean, separate view for designing plays. Use colored discs (home, opponent, goalie) and a freehand drawing tool to illustrate strategies.
*   **Live Game Clock:** A simple and reliable timer with start, pause, and reset functionality, including a large overlay view for high visibility.
*   **Substitution Timer:** Set a custom interval to receive on-screen alerts, ensuring timely player rotations.
*   **Drawing & Annotation:** Draw directly on the field in both player view and tactics view to visualize runs and positions. Includes undo/redo support.
*   **Training Resources:** Access warmup plans and drills from a built-in modal, plus quick links to external coaching materials.

### 📊 Statistics & Analysis

*   **Live Event Logging:** Record goals (with scorer and assister), opponent goals, and Fair Play card awards as they happen.
*   **Comprehensive Stats Modal:** View detailed game information and player statistics in one place.
*   **Aggregate Views:** Filter stats by the current game, or see aggregated totals for an entire **Season**, **Tournament**, or **All-Time**.
*   **Sortable Player Data:** Instantly sort players by Games Played, Goals, Assists, Total Points, and Average Points per Game.
*   **Individual Player Deep-Dive:** Click any player to open a dedicated modal showing their complete game log and a **performance trend graph** for goals and assists over time.
*   **Data Export:** Export stats for a single game or aggregated data to **JSON** or **CSV** for offline analysis or sharing.
*   **Performance Ratings:** Assess players after each match on key metrics and view averages and trend graphs. Enable *Weight by Difficulty* to factor in each game's demand level.

### 👥 Roster & Team Management

*   **Master Roster:** Maintain a persistent list of all your players, including names, jersey numbers, and goalie status.
*   **Match-Day Selection:** Easily select which players from the master roster are available for the current game.
*   **Season & Tournament Creation:** Organize your games by creating custom seasons and tournaments.
*   **Management Enhancements:** Store default game settings, assign default rosters, archive old competitions and view quick stats. Import or export season setups for easy reuse.
*   **Full Backup & Restore:** Safeguard your data by exporting and importing a single file containing all players, games, and settings.
*   **Automatic Backups:** Background process periodically saves a full backup file so your data stays safe even if you forget to export manually.
*   **Save & Load Games:** Save an unlimited number of game states and load them back at any time for review or continuation.

### 🚀 Technology & Usability

*   **Progressive Web App (PWA):** Installable on any device (desktop or mobile) for a native, offline-capable experience.
*   **Automatic Update Notifications:** A banner appears in-app when a new version is released, ensuring you're always using the latest features.
*   **Responsive Design:** A clean, touch-friendly interface that works seamlessly on tablets, phones, and laptops.
*   **Internationalization:** Full support for English and Finnish.
*   **Vercel Analytics:** Web analytics are enabled to help improve the user experience.
*   **Settings Modal:** Adjust language, default team name and automatic backup interval, view storage usage and perform a hard reset when needed.

## Tech Stack

*   **Framework:** [Next.js](https://nextjs.org/) (App Router)
*   **Language:** [TypeScript](https://www.typescriptlang.org/)
*   **UI Library:** [React](https://reactjs.org/)
*   **Styling:** [Tailwind CSS](https://tailwindcss.com/)
*   **State Management:** React Hooks (`useState`, `useReducer`, `useContext`) & Custom Hooks
*   **Data Persistence:** Browser `localStorage` API
*   **Internationalization:** [i18next](https://www.i18next.com/) / [react-i18next](https://react-i18next.com/)
*   **PWA:** Custom Service Worker & Web App Manifest
*   **Analytics:** [@vercel/analytics](https://vercel.com/analytics)

## Getting Started

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/VillePajala/soccer-pre-game-app.git
    cd soccer-pre-game-app
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Run the development server:**
    ```bash
    npm run dev
    ```

4.  Open [http://localhost:3000](http://localhost:3000) with your browser to start using the app.

   When launched, a **Start Screen** appears with options to start a new game, load an existing one, create a season or tournament, or view statistics. Select an action to continue to the main field view.

## Supabase Setup

1. Copy `.env.example` to `.env.local` and fill in your Supabase credentials.
2. Enable Supabase by setting `NEXT_PUBLIC_ENABLE_SUPABASE=true` in `.env.local`.
3. Run the migration script from the Settings modal to import your existing data.

See [docs/migration-troubleshooting.md](docs/migration-troubleshooting.md) for common issues.
### Environment Variables
- `NEXT_PUBLIC_ENABLE_SUPABASE` — set to `true` to switch the app to Supabase.
- `NEXT_PUBLIC_DISABLE_FALLBACK` — if `true`, the app will not fall back to localStorage.
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — the anonymous API key.

## Running Tests

Install project dependencies with `npm install` as shown above. Then execute the automated test suite with:

```bash
npm test
# or
npm run test:unit
```

The tests rely on [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

## Important Notes

*   **Data Storage:** All your data is stored in your browser's `localStorage`. This is fast and enables offline use, but it means clearing your browser data will erase everything. **Use the "Full Backup" feature regularly!**
*   **Offline Use:** To get the best experience, install the app on your device when prompted by your browser ("Add to Home Screen" on mobile, or an install icon in the address bar on desktop).

---

*This project is under active development. Feel free to contribute or report issues!**

## License

This project is the exclusive intellectual property of Ville Pajala.  
All rights reserved. No part of this codebase may be copied, reused, or distributed without explicit permission.

## Contributions

By contributing to this project, you agree to transfer all IP rights of your contributions to Ville Pajala.  
See [CONTRIBUTING.md](./CONTRIBUTING.md) for full terms.
