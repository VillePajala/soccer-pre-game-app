# Enhanced Supabase Migration Guide

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
- App: mobile‑first PWA (TypeScript + React)  
- Current persistence: **localStorage** only  
- Target: Supabase (Postgres + Auth + Realtime)  
- Repo: Vite / Next.js layout  
- Node ≥ 18

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

## Step‑by‑Step Execution Plan with Detailed Implementation Guide

### 📊 **MIGRATION PROGRESS SUMMARY**

**Completed Steps:**
- ✅ **STEP 1** - Inventory Current Data (localStorage mapping and pre-migration refactoring)
- ✅ **STEP 2** - Design Supabase Schema (database design, schema.sql, transformation utilities)
- ✅ **STEP 3** - Bootstrap Supabase Project (CLI setup, remote project, schema deployment, environment config)
- ✅ **STEP 4** - Build Storage Abstraction Layer (unified interface, localStorage adapter, Supabase adapter, automatic fallback)

**Current Status:** Ready to begin **STEP 5 - Update Components**

**Key Accomplishments:**
- Remote Supabase project created and linked
- Database schema deployed with 14 tables (users, players, seasons, tournaments, games, game_events, player_assessments, app_settings, etc.)
- Supabase client library installed (@supabase/supabase-js)
- Environment variables configured
- Data transformation utilities implemented (toSupabase.ts, fromSupabase.ts)
- Complete storage abstraction layer built:
  - Unified IStorageProvider interface for consistent data access
  - LocalStorageProvider adapter wrapping existing localStorage utilities
  - SupabaseProvider adapter with full CRUD operations for all data types
  - StorageManager with automatic fallback logic (Supabase → localStorage)
  - Custom error handling with StorageError types
  - Provider switching capability for seamless migration

---

### **STEP 1 — Inventory Current Data** ✅ COMPLETED

- [x] **1.1** Parse codebase for every `localStorage.*` usage
- [x] **1.2** Generate `/docs/localStorage-map.json` with keys & samples

**Note**: Significant pre-migration refactoring has been completed:
- ✅ Data access layer abstraction (utility functions in place)
- ✅ Async operation preparation (all utilities return Promises)  
- ✅ React Query integration (@tanstack/react-query installed and configured)
- ✅ Error handling patterns standardized
- ✅ Component refactoring to use utility layer completed

---

### **STEP 2 — Design Supabase Schema** ✅ COMPLETED

- [x] **2.1** Analyze current TypeScript interfaces in `src/types/index.ts`
  - **Actions:**
    - Review `Player`, `Season`, `Tournament`, `AppState`, `GameEvent` interfaces
    - Document current data relationships and constraints
    - Create mapping document: `localStorage structure → Supabase tables`
  - **Manual Testing:**
    - Verify all localStorage keys from `localStorage-map.json` have corresponding type definitions
    - Check that no data fields are missing from type definitions
    - Validate sample data matches interface definitions

- [x] **2.2** Design normalized database schema
  - **Actions:**
    - Create `users` table for authentication
    - Design `players` table with user_id FK
    - Design `seasons` and `tournaments` tables with user_id FK
    - Design `games` table with relationships to seasons/tournaments
    - Design `game_events` table normalized from AppState.gameEvents
    - Design `app_settings` table with user_id FK
  - **Manual Testing:**
    - Draw entity relationship diagram on paper
    - Verify all foreign key relationships make sense
    - Check that user data isolation is properly designed

- [x] **2.3** Create `schema.sql` file
  - **Actions:**
    - Write CREATE TABLE statements for all tables
    - Add primary keys, foreign keys, and constraints
    - Add indexes for common query patterns
    - Write Row Level Security (RLS) policies
    - Add helpful comments explaining table purposes
  - **Manual Testing:**
    - Run schema.sql in a test PostgreSQL instance
    - Insert sample data to verify constraints work
    - Test RLS policies with different user contexts

- [x] **2.4** Create data transformation utilities
  - **Actions:**
    - Create `src/utils/transforms/toSupabase.ts`
    - Create `src/utils/transforms/fromSupabase.ts` 
    - Write functions to convert localStorage data → Supabase format
    - Write functions to convert Supabase data → app format
  - **Manual Testing:**
    - Test transforms with real localStorage data from development
    - Verify round-trip conversion (localStorage → Supabase → localStorage) produces identical data
    - Test edge cases: missing fields, null values, empty arrays

---

### **STEP 3 — Bootstrap Supabase Project** ✅ COMPLETED

- [x] **3.1** Install Supabase CLI and initialize project ✅ COMPLETED
  - **Actions:**
    - Run `npm install -g supabase`
    - Run `supabase init` in project root
    - Commit `.supabase/` directory to git
  - **Manual Testing:**
    - Verify `.supabase/config.toml` exists and has correct project settings
    - Check that `supabase status` shows project as initialized
    - Ensure git tracks .supabase folder properly
  - **Completion Status:** ✅ Completed in commit 41463a9 - Local Supabase project initialized with config.toml

- [x] **3.2** Create remote Supabase project ✅ COMPLETED
  - **Actions:**
    - Sign up for Supabase account if needed
    - Create new project in Supabase dashboard
    - Note project URL and API keys
    - Link local project: `supabase link --project-ref YOUR_PROJECT_REF`
  - **Manual Testing:**
    - Verify you can access project dashboard at supabase.com
    - Test that `supabase db pull` works without errors
    - Check project settings show correct database configuration
  - **Completion Status:** ✅ Completed in commit 56d2199 - Remote Supabase project created and linked

- [x] **3.3** Apply database schema ✅ COMPLETED
  - **Actions:**
    - Copy `schema.sql` to `supabase/migrations/001_initial_schema.sql`
    - Run `supabase db push`
    - Verify tables created successfully in Supabase dashboard
  - **Manual Testing:**
    - Check Supabase dashboard → Database → Tables shows all expected tables
    - Verify RLS is enabled on tables that need it
    - Test inserting and querying sample data through dashboard
  - **Completion Status:** ✅ Completed in commit 56d2199 - Database schema deployed with 14 tables including users, players, seasons, tournaments, games, game_events, player_assessments, app_settings, etc.

- [x] **3.4** Configure environment variables ✅ COMPLETED
  - **Actions:**
    - Add Supabase URL and anon key to `.env.local`
    - Add same variables to `.env.example`
    - Document environment setup in README
  - **Manual Testing:**
    - Verify `process.env.NEXT_PUBLIC_SUPABASE_URL` is accessible in browser console
    - Test that build process includes environment variables
    - Check that `.env.local` is properly gitignored
  - **Completion Status:** ✅ Completed in commit 56d2199 - Supabase client library installed (@supabase/supabase-js @supabase/auth-helpers-nextjs), environment variables configured (.env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY)

**📋 STEP 3 SUMMARY:** 
All Supabase infrastructure is now in place:
- Local project initialized with supabase/config.toml
- Remote project created and successfully linked
- Complete database schema deployed (14 tables with proper relationships, constraints, and RLS policies)
- Client libraries installed and environment properly configured
- Migration file created: supabase/migrations/20250123000000_initial_schema.sql

---

### **STEP 4 — Build Storage Abstraction Layer** ✅ COMPLETED

- [x] **4.1** Install Supabase client library ✅ COMPLETED
  - **Actions:**
    - ✅ Run `npm install @supabase/supabase-js @supabase/auth-helpers-nextjs`
    - ✅ Create `src/lib/supabase.ts` with client configuration
    - ✅ Export configured Supabase client
  - **Manual Testing:**
    - ✅ Import supabase client in browser console
    - ✅ Verify `supabase.auth.getSession()` returns expected structure
    - ✅ Test basic query: `supabase.from('players').select('count')`
  - **Completion Status:** ✅ Supabase client library already installed in Step 3. Created `src/lib/supabase.ts` with proper client configuration using environment variables.

- [x] **4.2** Create LocalStorageProvider ✅ COMPLETED
  - **Actions:**
    - ✅ Create `src/lib/storage/localStorageProvider.ts`
    - ✅ Wrap existing localStorage utilities with consistent IStorageProvider interface
    - ✅ Implement `getPlayers()`, `savePlayers()`, `getSeasons()`, `saveSeasons()`, etc. methods
    - ✅ Add error handling and logging
  - **Manual Testing:**
    - ✅ Test each CRUD operation through provider interface
    - ✅ Verify existing app functionality works unchanged
    - ✅ Check error handling with invalid localStorage operations
  - **Completion Status:** ✅ LocalStorageProvider created wrapping all existing localStorage utilities (masterRosterManager, seasons, tournaments, savedGames, appSettings) with unified interface.

- [x] **4.3** Create SupabaseProvider ✅ COMPLETED
  - **Actions:**
    - ✅ Create `src/lib/storage/supabaseProvider.ts`
    - ✅ Implement same IStorageProvider interface as LocalStorageProvider
    - ✅ Use transformation utilities for data conversion (toSupabase/fromSupabase)
    - ✅ Handle authentication state and user context
    - ✅ Implement full CRUD operations for all data types (players, seasons, tournaments, games, settings)
  - **Manual Testing:**
    - ✅ Test CRUD operations against Supabase (with test data)
    - ✅ Verify data transformations work correctly
    - ✅ Test error handling with network issues
    - ✅ Check user context is properly applied
  - **Completion Status:** ✅ SupabaseProvider created with complete implementation for all data operations, using transformation utilities and proper error handling.

- [x] **4.4** Create StorageManager abstraction ✅ COMPLETED
  - **Actions:**
    - ✅ Create `src/lib/storage/storageManager.ts`
    - ✅ Implement automatic fallback pattern (Supabase → localStorage)
    - ✅ Add environment flag to control which provider is used
    - ✅ Export unified storage interface through `src/lib/storage/index.ts`
    - ✅ Add custom error types (StorageError, ValidationError, etc.)
  - **Manual Testing:**
    - ✅ Switch between providers and verify same operations work
    - ✅ Test automatic fallback when Supabase is unavailable
    - ✅ Verify error handling is consistent across providers
  - **Completion Status:** ✅ StorageManager created with automatic fallback logic, environment-based provider selection, and comprehensive error handling.

**📋 STEP 4 SUMMARY:** 
Complete storage abstraction layer is now in place:
- Unified IStorageProvider interface for consistent data access across all storage backends
- LocalStorageProvider adapter that wraps existing localStorage utilities
- SupabaseProvider adapter with full CRUD operations for all data types
- StorageManager with intelligent fallback logic (attempts Supabase first, falls back to localStorage)
- Custom error handling with specific error types (StorageError, ValidationError, NetworkError)
- Provider switching capability for seamless migration between storage backends
- All existing app functionality preserved through abstraction layer

---

### **STEP 5 — Update Components** 🚀 READY TO START

- [ ] **5.1** Update masterRosterManager.ts
  - **Actions:**
    - Replace direct localStorage calls with StorageManager
    - Update all CRUD functions to use new interface
    - Maintain existing async function signatures
    - Update error handling to match new patterns
  - **Manual Testing:**
    - Test player creation, editing, deletion through app UI
    - Verify roster loads correctly on app startup
    - Check that player search and filtering still work
    - Test goalie status changes persist correctly
  - **Note**: This step may be minimal since `masterRosterManager.ts` already provides a clean abstraction layer

- [ ] **5.2** Update seasons.ts utility
  - **Actions:**
    - Replace localStorage calls with StorageManager
    - Update season CRUD operations
    - Maintain existing function signatures
  - **Manual Testing:**
    - Create new seasons through game setup modal
    - Verify seasons appear in dropdowns
    - Test season editing and deletion
    - Check season associations with saved games

- [ ] **5.3** Update tournaments.ts utility
  - **Actions:**
    - Replace localStorage calls with StorageManager
    - Update tournament CRUD operations
    - Maintain existing function signatures
  - **Manual Testing:**
    - Create new tournaments through game setup modal
    - Verify tournaments appear in dropdowns
    - Test tournament editing and deletion
    - Check tournament associations with saved games

- [ ] **5.4** Update savedGames.ts utility
  - **Actions:**
    - Replace localStorage calls with StorageManager
    - Update game save/load operations
    - Handle complex AppState serialization
  - **Manual Testing:**
    - Save games during active gameplay
    - Load saved games and verify all state restores correctly
    - Test game deletion and bulk operations
    - Check auto-save functionality works

- [ ] **5.5** Update appSettings.ts utility
  - **Actions:**
    - Replace localStorage calls with StorageManager
    - Update settings CRUD operations
    - Handle user-scoped settings preparation
  - **Manual Testing:**
    - Change app settings (language, preferences)
    - Verify settings persist across app restarts
    - Test settings reset functionality
    - Check that default settings work for new users

- [ ] **5.6** Create comprehensive integration tests
  - **Actions:**
    - Add tests that verify LocalStorageDriver maintains existing behavior
    - Add tests for StorageManager driver switching
    - Test error scenarios and fallback behavior
  - **Manual Testing:**
    - Run full app regression test with LocalStorageDriver
    - Switch to SupabaseDriver and test core workflows
    - Test app behavior when Supabase is unreachable
    - Verify no data loss during driver switches

---

### **STEP 6 — Add Authentication**

- [ ] **6.1** Enable authentication in Supabase
  - **Actions:**
    - Enable Email/Password auth in Supabase dashboard
    - Configure email templates and settings
    - Set up allowed domains and redirect URLs
    - Enable Google OAuth (optional)
  - **Manual Testing:**
    - Test user registration through Supabase Auth UI
    - Verify email confirmation flow works
    - Test password reset functionality
    - Check OAuth login if enabled

- [ ] **6.2** Create AuthProvider component
  - **Actions:**
    - Create `src/context/AuthContext.tsx`
    - Implement `useAuth` hook
    - Handle authentication state management
    - Add login, logout, and session management
  - **Manual Testing:**
    - Test auth state persistence across page reloads
    - Verify auth state updates trigger re-renders
    - Test logout clears all auth state
    - Check session timeout handling

- [ ] **6.3** Add authentication UI components
  - **Actions:**
    - Create login/register modals or pages
    - Add profile management UI
    - Implement auth state indicators
    - Add logout functionality to app navigation
  - **Manual Testing:**
    - Test complete registration flow
    - Verify login/logout UI flow
    - Test form validation and error handling
    - Check responsive design on mobile

- [ ] **6.4** Update SupabaseDriver for user context
  - **Actions:**
    - Modify all database operations to include user_id
    - Add RLS policy enforcement
    - Handle unauthenticated state gracefully
    - Add user isolation for all data operations
  - **Manual Testing:**
    - Test data isolation between different users
    - Verify unauthenticated users can't access data
    - Check that user switching shows different data sets
    - Test error handling for authentication failures

---

### **STEP 7 — Write Migration Script**

- [ ] **7.1** Create migration detection system
  - **Actions:**
    - Add `migration_status` table in Supabase
    - Create functions to check if user needs migration
    - Add migration progress tracking
  - **Manual Testing:**
    - Test migration status detection for new users
    - Verify migration status persists correctly
    - Test migration status for users with/without localStorage data

- [ ] **7.2** Create localStorage data export utility
  - **Actions:**
    - Create `src/utils/migration/exportLocalData.ts`
    - Export all localStorage data in structured format
    - Include data validation and cleanup
  - **Manual Testing:**
    - Export localStorage data from development browser
    - Verify exported data includes all game saves, roster, settings
    - Test export with missing or corrupted localStorage data
    - Check exported data against original localStorage contents

- [ ] **7.3** Create Supabase import utility
  - **Actions:**
    - Create `src/utils/migration/importToSupabase.ts`
    - Transform and insert localStorage data into Supabase
    - Handle ID conflicts and data validation
    - Add progress reporting and error recovery
  - **Manual Testing:**
    - Import exported data into clean Supabase database
    - Verify all games, players, settings imported correctly
    - Test import with partial/corrupted export data
    - Check that imported data displays correctly in app

- [ ] **7.4** Create migration UI flow
  - **Actions:**
    - Create migration modal/page component
    - Add progress indicators and status messages
    - Implement migration trigger on first login
    - Add option to skip migration for new users
  - **Manual Testing:**
    - Test complete migration flow from start to finish
    - Verify progress indicators work correctly
    - Test migration cancellation and retry
    - Check post-migration app functionality

---

### **STEP 8 — Offline Support (Optional)**

- [ ] **8.1** Evaluate offline requirements
  - **Actions:**
    - Document which features need offline support
    - Research IndexedDB integration with Supabase
    - Plan sync conflict resolution strategy
  - **Manual Testing:**
    - Test current app behavior when offline
    - Identify critical offline workflows
    - Check PWA offline capabilities

- [ ] **8.2** Implement IndexedDB caching layer
  - **Actions:**
    - Add `idb-keyval` or similar IndexedDB library
    - Create offline cache manager
    - Implement cache-first data access pattern
  - **Manual Testing:**
    - Test data access when offline
    - Verify cache updates when online
    - Test cache invalidation strategies

---

### **STEP 9 — Testing & QA**

- [ ] **9.1** Create comprehensive unit tests
  - **Actions:**
    - Add tests for all storage drivers
    - Test transformation utilities thoroughly
    - Add authentication flow tests
    - Test migration script functionality
  - **Manual Testing:**
    - Run `npm test` and verify all tests pass
    - Check test coverage is adequate (>80%)
    - Test all edge cases and error scenarios

- [ ] **9.2** Create integration test flows
  - **Actions:**
    - Test complete user signup → data creation → multi-device sync
    - Add tests for offline/online transitions
    - Test migration flows with real data
  - **Manual Testing:**
    - Test complete user journey on multiple devices
    - Verify data sync works correctly
    - Test app behavior during network interruptions

---

### **STEP 10 — Feature Flag Implementation**

- [ ] **10.1** Add Supabase feature flag
  - **Actions:**
    - Add `ENABLE_SUPABASE` environment variable
    - Default to `false` in production
    - Update StorageManager to respect flag
  - **Manual Testing:**
    - Test app with flag enabled/disabled
    - Verify seamless switching between storage backends
    - Check that flag changes don't lose data

---

### **STEP 11 — Documentation & Deployment**

- [ ] **11.1** Update project documentation
  - **Actions:**
    - Update README with Supabase setup instructions
    - Document environment variables
    - Add migration troubleshooting guide
  - **Manual Testing:**
    - Follow setup instructions on fresh machine
    - Verify all environment variables are documented
    - Test migration instructions with real user data

---

### **STEP 12 — Post-Migration Cleanup**

- [ ] **12.1** Plan localStorage deprecation
  - **Actions:**
    - Add deprecation warnings for localStorage usage
    - Plan timeline for removing LocalStorageDriver
    - Document migration completion criteria
  - **Manual Testing:**
    - Verify all users have successfully migrated
    - Test app functionality with localStorage disabled
    - Confirm no localStorage dependencies remain

---

## Step Completion Protocol

**After each step:**
1. **Run Quality Gates:**
   - `npm run lint` - must pass
   - `npm test` - must pass  
   - `npm run build` - must pass
   - Manual testing checklist - must pass

2. **Create commit:**
   - Use conventional commit format: `feat(supabase): implement step X.Y - description`
   - Include detailed commit message explaining changes
   - Reference step number in commit

3. **Update progress:**
   - Mark step as completed: `[x]`
   - Add completion date and notes
   - Update any dependent steps if needed

**Testing Validation:**
- Each step must include manual testing that validates the step's functionality
- Manual testing should cover both happy path and error scenarios
- Testing should verify no regressions in existing functionality
- Cross-browser testing for UI changes

---

## Quality Gates
- [ ] ESLint + Prettier pass
- [ ] `npm test` green
- [ ] Conventional commit messages
- [ ] No secrets committed

---

## Success Criteria
- All data saved in Supabase; `LocalDriver` only used when flag off  
- Multi‑device sync works with auth  
- One‑shot migration succeeds for legacy users  
- Tests green, docs complete  

---

**Agent protocol:**  
Before each major step, create `/logs/{step}-plan.md` with sub‑tasks & exit criteria. After completing, run tests & lint, then commit to `supabase-migration-{step}` branch and open PR.