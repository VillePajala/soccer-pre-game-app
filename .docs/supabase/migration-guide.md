# Supabase Migration Guide

This guide consolidates all repository documentation about migrating the app from `localStorage` to Supabase.

# Migrating to Supabase

This document explains how to move the MatchDay Coach application from storing data in browser `localStorage` to using Supabase as a backend. It assumes familiarity with the current architecture described in [README.md](./README.md) and [CLAUDE.md](./CLAUDE.md).

## 1. Current State Overview

The application is a PWA built with Next.js 15, React 19 and TypeScript. All persistent data is kept in `localStorage` as noted in the project documentation:

```
50  *   **Data Persistence:** Browser `localStorage` API
```
from the [README](./README.md) and

```
54  **Data Persistence**: All data is stored in browser localStorage with async wrappers in `src/utils/localStorage.ts`.
```
from [CLAUDE.md](./CLAUDE.md).

Key modules that interact with storage are:

- `src/utils/masterRoster.ts` and `src/utils/masterRosterManager.ts`
- `src/utils/seasons.ts` and `src/utils/tournaments.ts`
- `src/utils/savedGames.ts`
- `src/utils/appSettings.ts`

`React Query` is already used to fetch from these utilities. This architecture will help in switching to an external API.

## 2. Preparing Supabase

1. **Create a Supabase project** – Sign in to [supabase.com](https://supabase.com) and create a new project. Note the API URL and anon/public key.
2. **Define the database schema** – Tables should mirror the data structures in `src/types`. Example tables:
   - `players`: id (PK), name, nickname, jersey_number, notes, is_goalie, received_fair_play_card.
   - `seasons` and `tournaments`: id (PK), name.
   - `games`: stores the serialized `AppState` object for each game plus metadata such as date and associated season or tournament.
   - `app_settings`: keyed by user (if using auth) for storing settings like `current_game_id`.
3. **Enable Row Level Security (RLS)** – If using authentication, enable RLS and create policies allowing users to access their own data.
4. **Generate service key and anon key** – These credentials will be stored as environment variables in `.env.local`.

### Data Rework Considerations

Before connecting the app to Supabase, review the existing local data for potential schema adjustments:

- **ID formats** – Local records use string IDs like `"player_<timestamp>_<random>"`. Decide whether to keep these values or convert them to UUIDs on import.
- **Flattening game data** – The `AppState` object stores events and assessments as nested arrays. For efficient queries, consider normalising this information into `game_events` and `player_assessments` tables.
- **Season and tournament fields** – Some optional fields (`location`, `periodCount`, `archived`, etc.) may be missing in older records. Populate sensible defaults or handle `null` values during migration.
- **Transformation utilities** – Build helper functions that map the current TypeScript types to the new table structure. These utilities make it easier to validate and transform data during import.
- **App settings per user** – Once authentication is enabled, settings should be keyed by `user_id`. Link existing local settings to the signed‑in user on first login.

## 3. Installing supabase-js

Add the official client library and types:

```bash
npm install @supabase/supabase-js
```

Create a helper module `src/utils/supabaseClient.ts` to instantiate the client using environment variables. This file will export the configured instance for use in queries and mutations.

## 4. Replacing localStorage Utilities

Each storage helper under `src/utils` currently reads or writes to `localStorage`. For example `masterRoster.ts` uses `localStorage.getItem(SEASONS_LIST_KEY)`.

Replace the logic in these utilities with Supabase API calls using `supabase.from('players').select()` and similar operations. Consider using `supabase.rpc()` functions for complex updates.

Return values and error handling should mirror the existing asynchronous interfaces so that components using them do not require large changes.

### Example

Old roster fetcher in `src/utils/masterRoster.ts`:

```ts
export const getMasterRoster = async (): Promise<Player[]> => {
  const rosterJson = localStorage.getItem(MASTER_ROSTER_KEY);
  return rosterJson ? JSON.parse(rosterJson) : [];
};
```

Supabase version:

```ts
import { supabase } from './supabaseClient';

export const getMasterRoster = async (): Promise<Player[]> => {
  const { data, error } = await supabase.from('players').select('*');
  if (error) throw error;
  return data as Player[];
};
```

With these updates, `useGameDataQueries` continues to invoke the same helper functions, but the data now comes from Supabase.

## 5. Handling Authentication

Supabase provides a built-in authentication system. If user accounts are desirable, integrate `@supabase/auth-helpers-nextjs` and protect API routes using sessions. Each user's data can then be stored using their `user.id` as a foreign key. If the app should remain anonymous, you can skip auth and store data keyed by `localStorage` token or by using the public anon key.

## 6. Offline Support

PWA capabilities such as the service worker remain valuable. When moving to Supabase, you can still cache requests using `@supabase/supabase-js` together with `React Query`'s caching.

The service worker in `public/sw.js` currently only passes through requests. Consider implementing a cache-first strategy for API responses to keep the app usable without network connectivity.

## 7. Migrating Existing Data

Users may already have important data saved locally. Provide an export feature that generates a JSON file (the current app already supports this via `exportGamesAsJson`). After deploying Supabase, add an import routine that uploads this JSON into the new database, calling the Supabase APIs for each record.

## 8. Environment Configuration

Create `.env.local` with the following keys:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
```

If server-side operations (such as triggers or scheduled jobs) are needed, also store the service role key as `SUPABASE_SERVICE_KEY` but never expose it to the client.

## 9. Updating React Query Calls

The existing `useGameDataQueries` hook already consolidates queries for roster, seasons, tournaments and saved games. Once the utilities are refactored, this hook will automatically fetch from Supabase. For mutations (adding or updating players, games or settings) use `useMutation` with Supabase API functions, and call `queryClient.invalidateQueries` with the keys defined in `src/config/queryKeys.ts`.

## 10. API Routes (Optional)

Instead of calling Supabase directly from the browser, you may create Next.js API routes under `src/pages/api/` that proxy requests to Supabase. This allows you to enforce additional validation or authentication middleware on the server side. It also hides the Supabase keys from the client. However, direct client-side calls with the anon key are acceptable for many use cases.

## 11. Updating Build Scripts

The script `scripts/generate-manifest.mjs` already updates the service worker timestamp and generates the PWA manifest. Add steps to populate environment variables for Supabase during build on Vercel.

## 12. Testing and Deployment

1. Run `npm run lint` and `npm test` to ensure no regressions.
2. Verify manual workflows listed in `MANUAL_TESTING.md` while connected to Supabase.
3. Deploy to Vercel with the Supabase environment variables configured.

Migrating to Supabase centralizes data, enables real-time features and simplifies backups while the rest of the React front end remains largely unchanged.

---

# Supabase Migration Master Checklist

> **Purpose**  
> A single, self‑contained checklist the AI agent can follow (and tick off) to migrate the PWA from **localStorage** to **Supabase**.

---

## Context
- App: mobile‑first PWA (TypeScript + React)  
- Current persistence: **localStorage** only  
- Target: Supabase (Postgres + Auth + Realtime)  
- Repo: Vite / Next.js layout  
- Node ≥ 18

---

## High‑Level Objective
Migrate the entire persistence layer to Supabase, enabling multi‑user, real‑time sync, **without breaking the existing UX**.

---

## Deliverables
- `/docs/migration-supabase.md`
- `/schema.sql`
- `/src/lib/storageManager.ts`
- `/scripts/migrateLocalToSupabase.ts`
- Unit & integration tests
- Incremental commits (one per major step)

---

## Step‑by‑Step Execution Plan

### Core Steps
- [x] **1 — Inventory Current Data**
  - [x] Parse codebase for every `localStorage.*` usage
  - [x] Generate `/docs/localStorage-map.json` with keys & samples

- [ ] **2 — Design Supabase Schema**
  - [ ] Infer TS interfaces (Game, Player, Stats, Settings…)
  - [ ] Normalise into tables / JSONB as needed
  - [ ] Draft `schema.sql` (tables, PK/FK, RLS, indexes)
  - [ ] Create ER diagram (ASCII / Mermaid)

- [ ] **3 — Bootstrap Supabase Project**
  - [ ] `supabase init` → `.supabase`
  - [ ] `supabase db push` with `schema.sql`
  - [ ] Add anon & service keys to `.env.sample`

- [ ] **4 — Build Storage Abstraction Layer**
  - [ ] Implement `LocalDriver` (wrap existing logic)
  - [ ] Implement `SupabaseDriver` with `@supabase/supabase-js`
  - [ ] Expose runtime‑switchable `storage` API

- [ ] **5 — Refactor App to use `storage`**
  - [ ] Replace direct `localStorage` calls (codemod/regex)
  - [ ] Commit: `refactor(storage): centralise persistence`

- [ ] **6 — Add Authentication**
  - [ ] Enable Email‑Link & OAuth in Supabase
  - [ ] Add `AuthProvider` React context
  - [ ] Store user profile in `profiles` table

- [ ] **7 — Write One‑Shot Migration Script**
  - [ ] Transform local data → Supabase schema
  - [ ] Insert on first login
  - [ ] Set `migrationDone` flag per user

- [ ] **8 — Offline Cache / Sync (optional)**
  - [ ] Add IndexedDB layer (`idb-keyval`)
  - [ ] Queue writes offline, flush on reconnect

- [ ] **9 — Testing & QA**
  - [ ] Unit tests for each driver
  - [ ] Cypress flow: signup → create data → multi‑device

- [ ] **10 — Feature Flag Roll‑Out**
  - [ ] Env var `ENABLE_SUPABASE`
  - [ ] Default false until QA passes

- [ ] **11 — Documentation & Handoff**
  - [ ] Finish `migration-supabase.md`
  - [ ] Update `README.md`

- [ ] **12 — Post‑Migration Cleanup**
  - [ ] Remove unused localStorage keys
  - [ ] Schedule sunset for `LocalDriver`

### Quality Gates
- [ ] ESLint + Prettier pass
- [ ] `pnpm test` green
- [ ] Conventional commit messages
- [ ] No secrets committed

---

## Success Criteria
- All data saved in Supabase; `LocalDriver` only used when flag off  
- Multi‑device sync works with auth  
- One‑shot migration succeeds for legacy users  
- Tests green, docs complete  

---

**Agent protocol:**  
Before each major step, create `/logs/{step}-plan.md` with sub‑tasks & exit criteria. After completing, run tests & lint, then commit to `supabase-migration-{step}` branch and open PR.

---
## TODO Notes

- **Introduce Supabase Backend**
  - Add optional user authentication and cloud sync using Supabase.
  - Keep localStorage as the local cache and synchronize on sign in.

- [x] **Player Performance Evaluations**
  - Add a modal with ten sliders to rate each player after a game.

---

# Refactoring Plan for Supabase & Clerk Migration

## Introduction

This document outlines the refactoring steps needed to prepare our soccer coaching application for migration from localStorage to Supabase, and to integrate Clerk for authentication. The goal is to modify our code structure to make the eventual migration process smoother and less disruptive.

Based on the [migration plan](./MIGRATION_TO_SUPABASE_AND_CLERK.md), we've identified several architectural improvements that should be implemented before the actual migration begins.

## Current Status

We've already made progress in centralizing data access for certain entities:

- ✅ Refactored seasons and tournaments to use utility functions instead of direct localStorage access
- ✅ Centralized type definitions for Season and Tournament in the types directory
- ✅ Converted data utilities to async functions and integrated TanStack Query for loading and mutations

## Refactoring Steps

### 1. Complete Data Access Layer Abstraction

**Objective**: Create a complete abstraction layer for all localStorage operations to provide a single point of change when switching to Supabase.

**Tasks**:
- [x] 1.1. Create `src/utils/masterRoster.ts` with CRUD operations for player management
- [x] 1.2. Create `src/utils/savedGames.ts` with CRUD operations for game state management
- [x] 1.3. Create `src/utils/appSettings.ts` for user preferences and application settings
- [x] 1.4. Refactor components to use these utility functions instead of direct localStorage access
- [x] 1.5. Create consistent error handling patterns across all data utilities

**Success Criteria**:
- No direct localStorage access in component files
- All data operations funnel through utility functions
- Consistent error handling strategy across all data operations

### 2. Prepare for Asynchronous Operations

**Objective**: Adapt the application to handle asynchronous data operations, which will be required when using Supabase.

**Tasks**:
- [x] 2.1. Refactor utility functions to return Promises, even while still using localStorage
- [x] 2.2. Update components to handle async/await or .then() patterns
- [x] 2.3. Add appropriate loading states to components that depend on data
- [x] 2.4. Implement error states for failed data operations
- [x] 2.5. Consider incorporating React Query or SWR for data fetching management

**Success Criteria**:
- Utility functions return Promises
- Components properly handle asynchronous data loading
- User experience includes appropriate loading and error states

### 3. Create User Authentication Context

**Objective**: Prepare the architecture for user-specific data access, which will be required with Clerk authentication.

**Tasks**:
- [ ] 3.1. Create `src/context/AuthContext.tsx` with placeholder authentication state
- [ ] 3.2. Implement `useAuth` hook for accessing authentication state
- [ ] 3.3. Update utility functions to accept a `userId` parameter (which can be null pre-migration)
- [ ] 3.4. Wrap the application with the AuthContext provider
- [ ] 3.5. Prepare components to handle authenticated/unauthenticated states

**Success Criteria**:
- Authentication context is in place and usable
- Components can adapt to authenticated/unauthenticated states
- Data utility functions are prepared for user-scoped data

### 4. Implement Schema Transformation Layer

**Objective**: Create transformation functions to bridge current data structures and planned Supabase schema.

**Tasks**:
- [ ] 4.1. Create `src/utils/transforms/` directory for transformation functions
- [ ] 4.2. Implement transforms between current data structures and planned Supabase schema
- [ ] 4.3. Add validation functions to ensure data integrity
- [ ] 4.4. Create unit tests for transformation functions

**Success Criteria**:
- Clean separation between application data models and storage models
- Robust validation to ensure data integrity
- Test coverage for transformation functions

### 5. Prepare Migration Utilities

**Objective**: Create the foundation for one-time migration from localStorage to Supabase.

**Tasks**:
- [ ] 5.1. Create `src/utils/migration/` directory for migration utilities
- [ ] 5.2. Implement skeleton functions for migrating each data entity
- [ ] 5.3. Add mechanisms to track migration progress and status
- [ ] 5.4. Create UI components for migration feedback

**Success Criteria**:
- Clear migration path for each data entity
- Progress tracking for multi-step migrations
- User feedback mechanisms for migration process

### 6. Centralize and Complete Type Definitions

**Objective**: Ensure all types are centralized and compatible with planned Supabase schema.

**Tasks**:
- [ ] 6.1. Audit and move any remaining inline type definitions to `src/types/`
- [ ] 6.2. Ensure types align with planned Supabase schema
- [ ] 6.3. Add comprehensive JSDoc comments to type definitions
- [ ] 6.4. Implement type guards where appropriate

**Success Criteria**:
- All type definitions centralized in types directory
- Type structures compatible with planned Supabase schema
- Clear documentation for type usage

### 7. Implement Persistent Cache Strategy

**Objective**: Prepare the application for potential offline capabilities if required post-migration.

**Tasks**:
- [ ] 7.1. Evaluate requirements for offline functionality
- [ ] 7.2. Research and choose appropriate caching strategy
- [ ] 7.3. Implement basic caching mechanisms that could work with both localStorage and Supabase

**Success Criteria**:
- Clear understanding of offline requirements
- Strategy document for implementing offline capabilities
- Basic caching mechanisms in place if required

## Progress Tracking

| Step | Description | Status | Completion Date | Notes |
|------|-------------|--------|----------------|-------|
| 1.1  | Create masterRoster utility | ✅ Completed | 2024-07-31 | Created utility functions with consistent error handling pattern and unit tests |
| 1.2  | Create savedGames utility | ✅ Completed | 2024-07-31 | Created comprehensive game management APIs with proper error handling and tests |
| 1.2.1 | Fix type issues in savedGames | ✅ Completed | 2024-08-01 | Resolved type compatibility issues between GameData and AppState, improved error handling |
| 1.3  | Create appSettings utility | ✅ Completed | 2024-07-31 | Created utility with support for both modern settings and legacy settings |
| 1.4  | Refactor components to use utilities | 🔄 In Progress | | Breaking this down into sub-tasks |
| 1.4.1 | Refactor app/page.tsx | ✅ Completed | 2024-08-03 | Extensive refactoring to use TanStack Query for data fetching (masterRoster, seasons, tournaments, savedGames, appSettings). Implemented TanStack Query mutations for saveGame, updatePlayer, setGoalieStatus, removePlayer, addPlayer. Updated other handlers (deleteGame, quickSave, autoSave, import/export, fairPlayCard) to use async utilities. Addressed complex undo/redo scenarios involving roster state. |
| 1.4.2 | Refactor GameSettingsModal | ✅ Completed | 2024-08-01 | Implemented direct calls to savedGames utility functions for data persistence |
| 1.4.2.1 | Add tests for GameSettingsModal | ✅ Completed | 2024-08-01 | Created comprehensive tests for utility function integration and component behavior |
| 1.4.3 | Refactor NewGameSetupModal | ✅ Completed | 2024-08-02 | Replaced direct localStorage access with utility functions for team name persistence |
| 1.4.3.1 | Add tests for NewGameSetupModal | ✅ Completed | 2024-08-02 | Created comprehensive tests for utility function integration with proper test isolation |
| 1.4.4 | Refactor LoadGameModal | ✅ Completed | 2024-08-02 | Verified component uses utility functions/props; updated tests to mock utilities. |
| 1.4.5 | Refactor GameStatsModal | ✅ Completed | 2024-08-02 | Component refactored to use getSeasons/getTournaments utilities; tests already correctly mock these. |
| 1.5  | Implement error handling patterns | ✅ Completed | 2024-08-03 | Implemented for seasons.ts and tournaments.ts. Reviewed masterRoster.ts, which already aligns. |
| 1.5.1 | Refactor src/utils/seasons.ts error handling | ✅ Completed | 2024-08-02 | Aligned with defined error handling strategy (return null/false, console.error). Tests updated. |
| 1.5.2 | Refactor src/utils/tournaments.ts error handling | ✅ Completed | 2024-08-03 | Aligned with defined error handling strategy. Tests updated to match new logging and error details, successfully refactored to test by controlling localStorage mock directly. |
| 1.5.3 | Review src/utils/masterRoster.ts error handling | ✅ Completed | 2024-08-03 | Error handling patterns (return values, console.error with prefixes) already align with project standards. | N/A |
| 1.5.4 | Review src/utils/seasons.ts error handling    | ✅ Completed | 2024-08-03 | Error handling patterns align. | N/A |
| 1.5.5 | Review src/utils/tournaments.ts error handling| ✅ Completed | 2024-08-03 | Error handling patterns align. | N/A |
| 1.6  | Ensure real-time UI updates for GameStatsModal | ✅ Completed | 2024-08-03 | Modified GameStatsModal to use localGameEvents state (derived from gameEvents prop) for its 'currentGame' tab calculations, ensuring immediate UI reflection of new game events. | N/A |
| Feature: Link to Coaching Materials | ✅ Completed | 2024-08-03 | Added a link to external coaching materials (Palloliitto) in the ControlBar settings menu, with i18n translations. | `FEATURE_IDEAS.md` item #2 |
| 2.1  | Make utility functions return Promises | ✅ Completed | 2024-08-03 | Refactored src/utils/appSettings.ts. Components using it (NewGameSetupModal.tsx) and its tests updated. Refactored src/utils/seasons.ts. Components using it (NewGameSetupModal.tsx, GameStatsModal.tsx) and their tests updated. Refactored src/utils/tournaments.ts. Components using it (NewGameSetupModal.tsx, GameStatsModal.tsx) and their tests updated. Refactored src/utils/masterRoster.ts and its tests. Refactored/verified src/utils/savedGames.ts and its tests. All verified. |
| 2.2  | Update components for async operations | ✅ Completed | 2024-08-03 | Components like `page.tsx`, `LoadGameModal.tsx`, `GameSettingsModal.tsx` now handle async operations, primarily through TanStack Query hooks or updated `useEffect` hooks calling async utility functions. `NewGameSetupModal` and `RosterSettingsModal` rely on async handlers/mutations from `page.tsx`. |
| 2.3  | Add loading states | ✅ Completed | 2024-08-03 | Loading states are managed by TanStack Query (`isLoading`, `isPending` flags) for major data fetching and mutations in `page.tsx`. Individual modals also manage their specific loading states (e.g., `isGameLoading` in `LoadGameModal`). |
| 2.4  | Implement error states | ✅ Completed | 2024-08-03 | Error states are managed by TanStack Query (`isError`, `error` objects) in `page.tsx`. Components like `LoadGameModal` and `RosterSettingsModal` use local state for displaying specific operational errors (e.g., `gameLoadError`, `rosterError`). |
| 2.5  | Evaluate React Query/SWR | ✅ Completed | 2024-08-03 | React Query (TanStack Query) has been successfully implemented and is now the core data fetching and server state management library in `page.tsx`. |
| 3.1  | Create AuthContext | 📝 Planned | | |
| 3.2  | Implement useAuth hook | 📝 Planned | | |
| 3.3  | Update utilities for userId parameter | 📝 Planned | | |
| 3.4  | Wrap app with AuthContext provider | 📝 Planned | | |
| 3.5  | Prepare components for auth states | 📝 Planned | | |
| 4.1  | Create transforms directory | 📝 Planned | | |
| 4.2  | Implement transformation functions | 📝 Planned | | |
| 4.3  | Add validation functions | 📝 Planned | | |
| 4.4  | Create transform unit tests | 📝 Planned | | |
| 5.1  | Create migration utilities directory | 📝 Planned | | |
| 5.2  | Implement migration skeleton functions | 📝 Planned | | |
| 5.3  | Add migration progress tracking | 📝 Planned | | |
| 5.4  | Create migration UI components | 📝 Planned | | |
| 6.1  | Audit and move type definitions | 📝 Planned | | |
| 6.2  | Align types with Supabase schema | 📝 Planned | | |
| 6.3  | Add JSDoc comments | 📝 Planned | | |
| 6.4  | Implement type guards | 📝 Planned | | |
| 7.1  | Evaluate offline requirements | 📝 Planned | | |
| 7.2  | Choose caching strategy | 📝 Planned | | |
| 7.3  | Implement basic caching | 📝 Planned | | |

## Legend
- ✅ Completed
- 🔄 In Progress
- 📝 Planned
- ❓ Under Review
- ❌ Blocked

## Next Steps

### Immediate Focus
1. **Thorough Undo/Redo Testing**: Conduct comprehensive testing of Undo/Redo functionality, especially for roster-related changes (name, jersey, goalie status) and player selection, to ensure consistency between `PlayerBar`, on-field display, and historical states.
2. **Review `gameUtils.ts`**: Identify if any functions within `src/utils/gameUtils.ts` are actively used and require refactoring to async, or if the file can be deprecated or significantly cleaned up.
3. **Type System Review**: While `AppState` is the primary type for game state and its usage in `savedGames.ts` is confirmed, a broader review of types, especially the legacy `GameData` interface, could be beneficial for long-term clarity.
4. **General Regression Testing**: After significant refactoring, perform a general sweep of application functionality to catch any unforeseen issues.

### Mid-term Goals
1. **Component Refactoring Completion**: Finish refactoring any remaining components (if any, outside of `page.tsx` and already reviewed modals) to use the utility layer and ensure they all have proper test coverage.
2. **Begin Async Transition (Supabase Specifics)**: While utility functions are async, the next phase of this would be planning the Supabase client integration and how these utilities will call Supabase methods.
3. **Testing Strategy**: Continue implementing comprehensive tests to ensure stability during migration. Use mocks for utility functions to test components in isolation. 

