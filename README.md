# MatchDay Coach

A comprehensive Progressive Web App (PWA) for soccer coaches to manage rosters, track live game events, analyze detailed statistics, and design plays on an interactive tactics board. Built for the sideline, available on any device, with cloud synchronization and offline-first capabilities.

## TL;DR Quick Start

### Cloud mode (Supabase)
1. Clone and install
   ```bash
   git clone https://github.com/VillePajala/soccer-pre-game-app.git
   cd soccer-pre-game-app && npm install
   ```
2. Create `.env.local` (see Environment Variables below) with at least:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=...    
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   NEXT_PUBLIC_ENABLE_SUPABASE=true
   ```
3. Run the app
   ```bash
   npm run dev
   ```
4. Sign up in the app, create a team, and start a new game.

### Local mode (no cloud)
- Skip Supabase env vars, run `npm run dev`. Data is stored in the browser (IndexedDB/localStorage). Export/Import backups from Settings anytime.

## Architecture at a glance
- Next.js App Router + client providers
- Storage layers
  - Supabase (Auth, PostgREST) when enabled
  - IndexedDB cache for offline-first reads
  - localStorage fallback if cloud disabled/unavailable
- PWA service worker
  - App shell caching, data-cache for GETs, no caching for non-GET
  - Update banner + Settings action to refresh to latest
- React Query for server state, Zustand for app/session state

## Operational essentials

### PWA updates
- You’ll see an in-app banner when a new version is available. Click Update to activate the new SW and auto-reload.
- You can also check via Settings → Check for updates. The update flow is safe and preserves your data.
  - More: `docs/production/APP_UPDATE_FLOW_FIX_PLAN.md`

### Import/Export (Backups)
- Export a full backup (players, games, seasons, tournaments, settings) from Settings.
- Importing a backup now automatically remaps old player IDs to the new UUIDs.
  - This prevents empty player bars and broken stats after imports.
  - Any unmapped references are safely dropped and listed in the import log.
  - More: `docs/archive/IMPORT_FIX_SUMMARY.md`, `docs/archive/STATS_FIX_SUMMARY.md`

### Reset vs Delete
- Hard Reset App (Settings → Danger Zone):
  - Wipes ALL user data for this account (players, games, seasons, tournaments, settings), clears caches, and reloads. Your login remains.
- Delete Account:
  - Removes your Supabase Auth user and all data. Irreversible.

### Multi‑device sessions
- You can be signed in on multiple devices. Use:
  - Sign out (this device only)
  - Sign out everywhere (global): revokes sessions on all devices (Settings → Account).
  - Session manager handles inactivity timeouts and token refresh.

### Monitoring and error reporting
- Admin monitoring page and Sentry integration are available for diagnostics.
  - More: `docs/production/MONITORING_SETUP.md`, `docs/production/SENTRY_*`

## Support & compatibility
- Desktop: Chrome, Edge, Safari, Firefox (latest)
- Mobile: iOS Safari (PWA install supported), Android Chrome (TWA-ready)
- Offline: Full offline workflow; background sync when back online.



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
*   **Comprehensive Stats Modal:** View detailed game information and player statistics in one place with real-time data updates.
*   **Aggregate Views:** Filter stats by the current game, or see aggregated totals for an entire **Season**, **Tournament**, or **All-Time**.
*   **Sortable Player Data:** Instantly sort players by Games Played, Goals, Assists, Total Points, and Average Points per Game.
*   **Individual Player Deep-Dive:** Click any player to open a dedicated modal showing their complete game log and **interactive performance trend graphs** using Recharts for goals and assists over time.
*   **Data Export:** Export stats for a single game or aggregated data to **JSON** or **CSV** for offline analysis or sharing.
*   **Performance Ratings:** Assess players after each match on key metrics and view averages and trend graphs. Enable *Weight by Difficulty* to factor in each game's demand level.
*   **Advanced Analytics:** Performance trends, season comparisons, and statistical insights with visual data representation.

### 👥 Roster & Team Management

*   **Master Roster:** Maintain a persistent list of all your players, including names, nicknames, jersey numbers, notes, and goalie status.
*   **Match-Day Selection:** Easily select which players from the master roster are available for the current game.
*   **Season & Tournament Creation:** Organize your games by creating custom seasons and tournaments with comprehensive management tools.
*   **Management Enhancements:** Store default game settings, assign default rosters, archive old competitions and view quick stats. Import or export season setups for easy reuse.
*   **Full Backup & Restore:** Safeguard your data by exporting and importing a single file containing all players, games, and settings.
*   **Automatic Backups:** Background process periodically saves a full backup file so your data stays safe even if you forget to export manually.
*   **Save & Load Games:** Save an unlimited number of game states and load them back at any time for review or continuation.
*   **Cloud Synchronization:** Optional Supabase integration for cross-device data sync with secure authentication.

### 🚀 Technology & Usability

*   **Progressive Web App (PWA):** Installable on any device (desktop or mobile) for a native, offline-capable experience with advanced service worker.
*   **Offline-First Architecture:** Full functionality offline with automatic synchronization when connection is restored.
*   **Automatic Update Notifications:** A banner appears in-app when a new version is released, ensuring you're always using the latest features.
*   **Responsive Design:** A clean, touch-friendly interface that works seamlessly on tablets, phones, and laptops.
*   **Internationalization:** Full support for English and Finnish with type-safe translations.
*   **Vercel Analytics:** Web analytics are enabled to help improve the user experience.
*   **Settings Modal:** Adjust language, default team name, automatic backup interval, view storage usage, manage authentication, and perform data management operations.
*   **Enhanced Security:** Session management, rate limiting, and comprehensive security headers for production readiness.
*   **Performance Optimized:** Advanced caching strategies, component splitting, strategic memoization, and lazy loading for optimal performance.

## Tech Stack

*   **Framework:** [Next.js 15.3.5](https://nextjs.org/) with App Router
*   **Language:** [TypeScript 5](https://www.typescriptlang.org/)
*   **UI Library:** [React 19.0.0](https://reactjs.org/)
*   **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
*   **State Management:** [Zustand 5.0.3](https://zustand-demo.pmnd.rs/) for centralized state + [React Query 5.80.10](https://tanstack.com/query/latest) for server state caching
*   **Data Persistence:** Multi-layer architecture with [Supabase 2.52.0](https://supabase.com/), localStorage fallback, and [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) for offline-first caching
*   **Authentication:** [Supabase Auth](https://supabase.com/docs/guides/auth) with session management
*   **Charts & Visualization:** [Recharts 2.15.4](https://recharts.org/)
*   **Validation:** [Zod 3.25.76](https://zod.dev/) for schema validation
*   **Internationalization:** [i18next 24.2.3](https://www.i18next.com/) / [react-i18next 15.4.1](https://react-i18next.com/) with type-safe translations
*   **PWA:** Enhanced Service Worker with background sync & Dynamic Web App Manifest
*   **Analytics:** [@vercel/analytics 1.5.0](https://vercel.com/analytics)
*   **Testing:** [Jest 29.7.0](https://jestjs.io/) with [React Testing Library 16.3.0](https://testing-library.com/)

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
    Then configure your environment variables:
    - **Required for cloud features:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
    - **Feature flags:** `NEXT_PUBLIC_ENABLE_SUPABASE=true`, `NEXT_PUBLIC_ENABLE_OFFLINE_CACHE=true`
    - **Optional:** `NEXT_PUBLIC_DISABLE_FALLBACK=false`, `SUPABASE_SERVICE_KEY`

4.  **Run the development server:**
    ```bash
    npm run dev
    ```

5.  Open [http://localhost:3000](http://localhost:3000) with your browser to start using the app.

   When launched, you can choose to use the app locally (localStorage) or create an account for cloud synchronization. A **Start Screen** appears with options to start a new game, load an existing one, create a season or tournament, or view statistics. Select an action to continue to the main field view.

### Common scripts
```bash
npm run dev           # Start dev server
npm run build         # Production build
npm start             # Start production server
npm run test:unit     # Unit tests
npm run lint          # ESLint
npm run type-check    # TypeScript diagnostics
```

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
# Supabase Configuration (Required for cloud features)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key

# Feature Flags
NEXT_PUBLIC_ENABLE_SUPABASE=true           # Enable cloud synchronization
NEXT_PUBLIC_ENABLE_OFFLINE_CACHE=true     # Enable IndexedDB offline caching
NEXT_PUBLIC_DISABLE_FALLBACK=false        # Control localStorage fallback

# Optional Server-side Keys
SUPABASE_SERVICE_KEY=your-service-role-key  # For server-side operations
```

These values configure the multi-layer storage system and enable/disable specific features. The app works locally without Supabase configuration but requires it for cross-device synchronization.

## Important Notes

*   **Storage Architecture:** The app uses a sophisticated multi-layer storage system:
    - **Cloud Mode:** Data synced to Supabase with offline IndexedDB caching for instant loading
    - **Local Mode:** Data stored in browser localStorage with optional backup/restore
    - **Automatic Fallback:** Seamless fallback from cloud to local storage if needed
*   **Authentication:** Optional but recommended for cross-device synchronization and enhanced features
*   **Offline Experience:** Full functionality available offline with automatic sync when connection is restored
*   **PWA Installation:** Install as a native app from your browser for the best experience ("Add to Home Screen" on mobile, install icon in address bar on desktop)

### Troubleshooting
- Service worker failed to register
  - Ensure `public/sw.js` exists in production and CSP contains `worker-src 'self'` and appropriate `connect-src` entries for Supabase.
- Supabase 401 after sign-in
  - Verify `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY`, and that `NEXT_PUBLIC_ENABLE_SUPABASE=true` in `.env.local`.
- Imported games show no players / stats are zero
  - Re-import with the new importer (auto ID remap). Check the on-page import log for “remapped” and “dropped” counts.
- Update banner doesn’t show
  - Open Settings → Check for updates; verify network requests aren’t blocked by CSP.

## Project Status

This project is **production-ready** and under active development for app store deployment. The comprehensive production readiness plan is documented in `docs/production/PRODUCTION_READINESS_PLAN.md`.

**Current Status:**
- ✅ **Security:** Production-ready authentication, session management, and security headers
- ✅ **Testing:** 815 tests passing with 40.51% coverage of critical business logic
- ✅ **Performance:** Optimized with lazy loading, code splitting, and efficient caching
- ✅ **Architecture:** Offline-first with multi-layer storage and automatic fallback
- 🚧 **App Store Preparation:** TWA packaging and store assets in progress

### Release checklist (summary)
1. Bump version, update release notes (`scripts/generate-release-notes.mjs`).
2. Build and deploy to Vercel.
3. Verify:
   - Update banner appears and updates successfully
   - Monitoring page shows metrics; Sentry test page reports
   - Import/export works; auto ID remap log contains remapped counts
   - PWA install and offline work on a real device
4. Tag and publish.

---

*Feel free to contribute or report issues!*

## License

This project is the exclusive intellectual property of Ville Pajala.  
All rights reserved. No part of this codebase may be copied, reused, or distributed without explicit permission.

## Contributions

By contributing to this project, you agree to transfer all IP rights of your contributions to Ville Pajala.  
See [CONTRIBUTING.md](./CONTRIBUTING.md) for full terms.

Aloha!!!