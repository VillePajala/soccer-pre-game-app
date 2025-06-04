# Supabase & Clerk Migration Checklist

This checklist provides concrete, actionable steps for migrating from localStorage to Supabase with Clerk authentication. Each step includes specific actions, file paths, and success criteria.

## Pre-Migration Checklist

- [ ] All unit tests passing (`npm run test:unit`)
- [ ] All E2E tests passing (`npm run test:e2e`)
- [ ] Current branch is up to date with master
- [ ] No uncommitted changes

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

#### 1.4.1 Create Supabase Service
- [x] Create directory: `src/utils/supabase/`
- [x] Create `src/utils/supabase/seasons.ts` (see migration plan)
- [x] Verify TypeScript compiles without errors

#### 1.4.2 Test Supabase Service
- [x] Create `src/utils/supabase/seasons.test.ts`
- [x] Implement all CRUD operation tests
- [x] Run tests: `npm run test:unit src/utils/supabase/seasons.test.ts`
- [x] All tests passing

#### 1.4.3 Create Migration Component
- [ ] Create directory: `src/components/DataMigration/` (Note: Deferred/Re-evaluate)
- [ ] Create `src/components/DataMigration/SeasonsMigration.tsx` (Note: Deferred/Re-evaluate)
- [ ] Verify component renders without errors (Note: Deferred/Re-evaluate)

#### 1.4.4 Test Migration Component
- [ ] Create `src/components/DataMigration/SeasonsMigration.test.tsx` (Note: Deferred/Re-evaluate)
- [ ] Test successful migration scenario (Note: Deferred/Re-evaluate)
- [ ] Test error handling (Note: Deferred/Re-evaluate)
- [ ] Test progress tracking (Note: Deferred/Re-evaluate)
- [ ] All tests passing (Note: Deferred/Re-evaluate)

#### 1.4.5 Update Seasons Utility
- [ ] Backup current `src/utils/seasons.ts`
- [ ] Update to support both localStorage and Supabase
- [ ] Run existing tests: `npm run test:unit src/utils/seasons.test.ts`
- [ ] All existing tests still passing
- [ ] Add tests for authenticated scenario
- [ ] All new tests passing

- [ ] Commit: `git commit -m "feat: implement seasons migration to Supabase"`

### 1.5 Verify First Migration
- [ ] Create test page to trigger migration
- [ ] Test with empty localStorage
- [ ] Test with existing seasons in localStorage
- [ ] Verify data appears in Supabase
- [ ] Verify localStorage is cleared after migration

## Phase 2: Remaining Entity Migrations

### 2.1 Tournaments Migration
- [ ] Create `src/utils/supabase/tournaments.ts`
- [ ] Create `src/utils/supabase/tournaments.test.ts`
- [ ] Create `src/components/DataMigration/TournamentsMigration.tsx`
- [ ] Create `src/components/DataMigration/TournamentsMigration.test.tsx`
- [ ] Update `src/utils/tournaments.ts`
- [ ] All tests passing
- [ ] Commit: `git commit -m "feat: implement tournaments migration"`

### 2.2 Players (Master Roster) Migration
- [ ] Create `src/utils/supabase/players.ts`
- [ ] Create `src/utils/supabase/players.test.ts`
- [ ] Create `src/components/DataMigration/PlayersMigration.tsx`
- [ ] Create `src/components/DataMigration/PlayersMigration.test.tsx`
- [ ] Update `