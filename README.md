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
*   **Data Persistence:** Browser `localStorage` API *(deprecated; migrating to Supabase)*
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

3.  **Create a `.env.local` file:**
    ```bash
    cp .env.example .env.local
    ```
    Then fill in your Supabase project details:
    `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and feature
    flags such as `NEXT_PUBLIC_ENABLE_SUPABASE`.

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) with your browser to start using the app.

   When launched, a **Start Screen** appears with options to start a new game, load an existing one, create a season or tournament, or view statistics. Select an action to continue to the main field view.

## Running Tests

Install project dependencies with `npm install` as shown above. Then execute the automated test suite with:

```bash
npm test
# or
npm run test:unit
```

The tests rely on [Jest](https://jestjs.io/) and [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).

## Environment Variables

Create a `.env.local` file using `.env.example` as a template. The key variables are:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
# Enable Supabase storage
NEXT_PUBLIC_ENABLE_SUPABASE=true
# Optional fallback behavior
NEXT_PUBLIC_DISABLE_FALLBACK=false
# Server-side service key (optional)
SUPABASE_SERVICE_KEY=your-service-role-key
```

These values configure Supabase access and feature flags.

## Important Notes

*   **Data Storage:** By default all data is kept in your browser's `localStorage`. When `NEXT_PUBLIC_ENABLE_SUPABASE=true`, your data will be synced to your Supabase project instead. Either way, continue using the **Full Backup** feature to safeguard your records.
*   **Deprecation Notice:** localStorage support will be removed in a future release. Please migrate your data to Supabase.
*   **Offline Use:** To get the best experience, install the app on your device when prompted by your browser ("Add to Home Screen" on mobile, or an install icon in the address bar on desktop).

---

*This project is under active development. Feel free to contribute or report issues!**

## License

This project is the exclusive intellectual property of Ville Pajala.  
All rights reserved. No part of this codebase may be copied, reused, or distributed without explicit permission.

## Contributions

By contributing to this project, you agree to transfer all IP rights of your contributions to Ville Pajala.  
See [CONTRIBUTING.md](./CONTRIBUTING.md) for full terms.
