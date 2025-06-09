# Supabase & Clerk Migration Checklist

This checklist provides concrete, actionable steps for migrating from localStorage to Supabase with Clerk authentication. Each step includes specific actions, file paths, and success criteria.

## Pre-Migration Checklist

- [x] All unit tests passing (`npm run test:unit`)
- [x] All E2E tests passing (`npm run test:e2e`)
- [x] Current branch is up to date with master
- [x] No uncommitted changes

## Phase 1: Setup and First Entity Migration

### 1.1 Branch Setup
- [x] Create migration branch: `git checkout -b feat/supabase-clerk-migration`
- [x] Push branch to remote: `git push -u origin feat/supabase-clerk-migration`

### 1.2 Supabase Project Setup
- [x] Create Supabase project at https://supabase.com
- [x] Copy project URL and anon key from Settings > API
- [x] Create `.env.local` with:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_url_here
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
  ```
- [x] Add `.env.local` to `.gitignore`
- [x] Install Supabase: `npm install @supabase/supabase-js`
- [x] Create `src/lib/supabase.ts` (see migration plan for code)
- [x] Create `src/lib/supabase.test.ts`
- [x] Run tests: `npm run test:unit src/lib/supabase.test.ts`
- [x] Commit: `git commit -m "feat: setup Supabase client"`

### 1.3 Database Schema Creation
Execute in Supabase SQL Editor (in order):

#### Users Table
- [x] Execute users table SQL (see migration plan section 1.3.1)
- [x] Verify table created in Supabase dashboard
- [x] Verify RLS policy is active

#### Players Table
- [x] Execute players table SQL
- [x] Verify table and indexes created
- [x] Verify RLS policy is active

#### App Settings Table
- [x] Execute app_settings table SQL
- [x] Verify table created
- [x] Verify RLS policy is active

#### Seasons Table
- [x] Execute seasons table SQL
- [x] Verify table created
- [x] Verify RLS policy is active

#### Tournaments Table
- [x] Execute tournaments table SQL
- [x] Verify table created
- [x] Verify RLS policy is active

#### Saved Games Table
- [x] Execute saved_games table SQL
- [x] Verify table and all columns created
- [x] Verify foreign keys are set up
- [x] Verify RLS policy is active

- [x] Commit: `git commit -m "feat: create Supabase database schema"`

### 1.4 First Entity Migration: Seasons
- [x] Create Supabase service `src/utils/supabase/seasons.ts`
- [x] Create and pass tests for `src/utils/supabase/seasons.test.ts`
- [x] Update `src/utils/seasons.ts` utility to use the Supabase service.
- [x] Rewrite tests for `src/utils/seasons.test.ts` to mock Supabase calls and auth.

- [x] Commit: `git commit -m "feat: Implement Supabase service layer and refactor utility for Seasons"`

## Phase 2: Remaining Entity Migrations (On Hold)

*This phase is on hold pending full implementation of auth and user data connection.*

- [ ] Tournaments Migration
- [ ] Players (Master Roster) Migration
- [ ] Saved Games Migration
- [ ] App Settings Migration

## Phase 3: Clerk Authentication & Route Protection

### 3.1 Clerk Setup
- [x] Create Clerk application at https://clerk.com
- [x] Configure authentication methods in Clerk dashboard
- [x] Copy API keys to `.env.local`
- [x] Add required Clerk URL variables to `.env.local` (`NEXT_PUBLIC_CLERK_SIGN_IN_URL`, etc.)
- [x] Install Clerk: `npm install @clerk/nextjs @clerk/themes`
- [x] Commit: `git commit -m "feat: setup Clerk authentication"`

### 3.2 Implement Authentication Flow
- [x] Update `src/app/layout.tsx` with ClerkProvider
- [x] Create `src/middleware.ts` to protect all routes by default
- [x] Create custom sign-in page `src/app/sign-in/[[...sign-in]]/page.tsx`
- [x] Create custom sign-up page `src/app/sign-up/[[...sign-up]]/page.tsx`
- [x] Style sign-in/sign-up pages to match application branding
- [x] Implement custom account menu in `src/components/ControlBar.tsx` to handle sign-out
- [x] Test and verify sign-in, sign-up, and sign-out flows are working correctly
- [x] Commit: `git commit -m "feat: implement Clerk authentication UI and route protection"`

### 3.3 Connect Clerk to Supabase
- [x] Set up Supabase as a JWT provider in Clerk dashboard
- [x] Create `users` table with Clerk foreign key
- [x] Create `useCurrentSupabaseUser.ts` hook to map Clerk user to Supabase user
- [x] Test that a new user in Clerk automatically creates a corresponding user in the Supabase `users` table.

- [x] Commit: `git commit -m "feat: connect Clerk and Supabase user identities"`

## Phase 4: Connecting User Data (Current Focus)

### 4.1 Review & Refactor Data Queries
- [x] **Seasons:** Verified `useQuery` for seasons in `page.tsx` is correctly using `supabaseUserId` and is enabled only when `isSignedIn`.
- [x] **Tournaments:** Refactored `getTournaments` and updated `useQuery` to be authenticated.
- [x] **Master Roster:** Refactored `getMasterRoster` and updated `useQuery` to be authenticated.
- [x] **App Settings:** Refactored `getCurrentGameIdSetting` and updated `useQuery` to be authenticated.

### 4.2 Review & Refactor Data Mutations
- [x] **Seasons:** `addSeason` migrated to Supabase.
- [ ] **Seasons:** `updateSeason` functionality not present in UI. Migration deferred.
- [ ] **Seasons:** `deleteSeason` functionality not present in UI. Migration deferred.
- [x] **Tournaments:** `addTournament` migrated to Supabase.
- [ ] **Tournaments:** `updateTournament` functionality not present in UI. Migration deferred.
- [ ] **Tournaments:** `deleteTournament` functionality not present in UI. Migration deferred.
- [ ] **Master Roster:** 
    - [x] `addPlayer` migrated to Supabase.
    - [x] `updatePlayer` migrated to Supabase.
    - [x] `setGoalieStatus` migrated to Supabase.
    - [x] `removePlayer` migrated to Supabase.
    - [x] `setFairPlayCardStatus` migrated to Supabase.
- [ ] **Saved Games:**
    - [ ] `saveGame` migration incomplete due to issues.
    - [ ] `deleteGame` migration to be planned.
- [ ] **App Settings:** 
    - [x] `saveCurrentGameIdSetting` migrated to Supabase.

## Phase 5: Post-Migration Cleanup & Refinement

### 5.1 Old Data Migration
- [x] **Decision:** No automatic data migration will be performed. Existing `localStorage` data will not be moved to Supabase. The app will start fresh for all users on the new backend.

### 5.2 UI Refinement based on Auth State
- [ ] Ensure loading indicators are shown correctly while auth state is being determined.
- [ ] Prevent modals (like "New Game Setup") from showing to unauthenticated users.
- [ ] Review all UI components to ensure they handle the `null` state for user data before it loads.

### 5.3 Final Testing
- [ ] Full E2E test of the entire application flow for a new user.
- [ ] Full E2E test for a returning user with data migration.
- [ ] Review and remove any temporary debugging code.