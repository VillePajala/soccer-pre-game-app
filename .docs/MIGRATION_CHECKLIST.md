# Supabase & Clerk Migration Checklist

This checklist provides concrete, actionable steps for migrating from localStorage to Supabase with Clerk authentication. Each step includes specific actions, file paths, and success criteria.

## Pre-Migration Checklist

- [ ] All unit tests passing (`npm run test:unit`)
- [ ] All E2E tests passing (`npm run test:e2e`)
- [ ] Current branch is up to date with master
- [ ] No uncommitted changes

## Phase 1: Setup and First Entity Migration

### 1.1 Branch Setup
- [ ] Create migration branch: `git checkout -b feat/supabase-clerk-migration`
- [ ] Push branch to remote: `git push -u origin feat/supabase-clerk-migration`

### 1.2 Supabase Project Setup
- [ ] Create Supabase project at https://supabase.com
- [ ] Copy project URL and anon key from Settings > API
- [ ] Create `.env.local` with:
  ```
  NEXT_PUBLIC_SUPABASE_URL=your_url_here
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
  ```
- [ ] Add `.env.local` to `.gitignore`
- [ ] Install Supabase: `npm install @supabase/supabase-js`
- [ ] Create `src/lib/supabase.ts` (see migration plan for code)
- [ ] Create `src/lib/supabase.test.ts`
- [ ] Run tests: `npm run test:unit src/lib/supabase.test.ts`
- [ ] Commit: `git commit -m "feat: setup Supabase client"`

### 1.3 Database Schema Creation
Execute in Supabase SQL Editor (in order):

#### Users Table
- [ ] Execute users table SQL (see migration plan section 1.3.1)
- [ ] Verify table created in Supabase dashboard
- [ ] Verify RLS policy is active

#### Players Table  
- [ ] Execute players table SQL
- [ ] Verify table and indexes created
- [ ] Verify RLS policy is active

#### App Settings Table
- [ ] Execute app_settings table SQL
- [ ] Verify table created
- [ ] Verify RLS policy is active

#### Seasons Table
- [ ] Execute seasons table SQL
- [ ] Verify table created
- [ ] Verify RLS policy is active

#### Tournaments Table
- [ ] Execute tournaments table SQL
- [ ] Verify table created
- [ ] Verify RLS policy is active

#### Saved Games Table
- [ ] Execute saved_games table SQL
- [ ] Verify table and all columns created
- [ ] Verify foreign keys are set up
- [ ] Verify RLS policy is active

- [ ] Commit: `git commit -m "feat: create Supabase database schema"`

### 1.4 First Entity Migration: Seasons

#### 1.4.1 Create Supabase Service
- [ ] Create directory: `src/utils/supabase/`
- [ ] Create `src/utils/supabase/seasons.ts` (see migration plan)
- [ ] Verify TypeScript compiles without errors

#### 1.4.2 Test Supabase Service
- [ ] Create `src/utils/supabase/seasons.test.ts`
- [ ] Implement all CRUD operation tests
- [ ] Run tests: `npm run test:unit src/utils/supabase/seasons.test.ts`
- [ ] All tests passing

#### 1.4.3 Create Migration Component
- [ ] Create directory: `src/components/DataMigration/`
- [ ] Create `src/components/DataMigration/SeasonsMigration.tsx`
- [ ] Verify component renders without errors

#### 1.4.4 Test Migration Component
- [ ] Create `src/components/DataMigration/SeasonsMigration.test.tsx`
- [ ] Test successful migration scenario
- [ ] Test error handling
- [ ] Test progress tracking
- [ ] All tests passing

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
- [ ] Update `src/utils/masterRoster.ts`
- [ ] All tests passing
- [ ] Commit: `git commit -m "feat: implement players migration"`

### 2.3 App Settings Migration
- [ ] Create `src/utils/supabase/appSettings.ts`
- [ ] Create `src/utils/supabase/appSettings.test.ts`
- [ ] Create `src/components/DataMigration/AppSettingsMigration.tsx`
- [ ] Create `src/components/DataMigration/AppSettingsMigration.test.tsx`
- [ ] Update `src/utils/appSettings.ts`
- [ ] All tests passing
- [ ] Commit: `git commit -m "feat: implement app settings migration"`

### 2.4 Saved Games Migration (Complex)
- [ ] Create `src/utils/supabase/savedGames.ts`
- [ ] Create `src/utils/supabase/savedGames.test.ts`
- [ ] Create `src/components/DataMigration/SavedGamesMigration.tsx`
- [ ] Create `src/components/DataMigration/SavedGamesMigration.test.tsx`
- [ ] Update `src/utils/savedGames.ts`
- [ ] Test with various game states
- [ ] Test error recovery for corrupted data
- [ ] All tests passing
- [ ] Commit: `git commit -m "feat: implement saved games migration"`

## Phase 3: Clerk Authentication

### 3.1 Clerk Setup
- [ ] Create Clerk application at https://clerk.com
- [ ] Configure authentication methods
- [ ] Copy API keys
- [ ] Add to `.env.local`:
  ```
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_key
  CLERK_SECRET_KEY=your_secret_key
  ```
- [ ] Install Clerk: `npm install @clerk/nextjs`
- [ ] Commit: `git commit -m "feat: setup Clerk authentication"`

### 3.2 Implement Authentication
- [ ] Update `src/app/layout.tsx` with ClerkProvider
- [ ] Create `src/middleware.ts` for route protection
- [ ] Create sign-in/sign-up pages
- [ ] Add UserButton component
- [ ] Test authentication flow
- [ ] Commit: `git commit -m "feat: implement Clerk authentication UI"`

### 3.3 Connect Clerk to Supabase
- [ ] Create webhook endpoint for user creation
- [ ] Implement user mapping logic
- [ ] Test new user creation flow
- [ ] Test existing user login flow
- [ ] Commit: `git commit -m "feat: connect Clerk users to Supabase"`

### 3.4 Create Migration Orchestrator
- [ ] Create `src/components/DataMigration/MigrationOrchestrator.tsx`
- [ ] Implement migration flow for all entities
- [ ] Add progress tracking UI
- [ ] Test complete migration flow
- [ ] Commit: `git commit -m "feat: implement migration orchestrator"`

## Phase 4: Testing & Refinement

### 4.1 Integration Testing
- [ ] Test new user signup → data creation flow
- [ ] Test existing user login → data migration flow
- [ ] Test all CRUD operations with authentication
- [ ] Verify RLS policies work correctly

### 4.2 E2E Testing
- [ ] Update E2E tests for authentication
- [ ] Add E2E tests for migration flow
- [ ] Add E2E tests for authenticated data operations
- [ ] All E2E tests passing

### 4.3 Performance Testing
- [ ] Test with large datasets
- [ ] Optimize slow queries
- [ ] Add appropriate indexes

### 4.4 Error Handling
- [ ] Test network failure scenarios
- [ ] Test rate limiting
- [ ] Ensure graceful degradation

## Phase 5: Deployment Preparation

### 5.1 Documentation
- [ ] Update README with setup instructions
- [ ] Document environment variables
- [ ] Create migration guide for users
- [ ] Update API documentation

### 5.2 Staging Deployment
- [ ] Deploy to staging environment
- [ ] Test complete flow in staging
- [ ] Fix any issues found

### 5.3 Production Preparation
- [ ] Create rollback plan
- [ ] Prepare monitoring/alerts
- [ ] Schedule maintenance window
- [ ] Prepare user communications

## Final Steps

- [ ] Code review by team
- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security audit complete
- [ ] Documentation complete
- [ ] Merge PR: `feat/supabase-clerk-migration` → `master`
- [ ] Deploy to production
- [ ] Monitor for issues
- [ ] Celebrate! 🎉

## Rollback Plan

If issues arise:
1. Revert to previous commit on master
2. Restore localStorage functionality
3. Investigate and fix issues
4. Re-attempt migration

## Success Metrics

- [ ] All existing functionality works
- [ ] Users can authenticate successfully
- [ ] Data migrates without loss
- [ ] Performance is acceptable
- [ ] No security vulnerabilities
- [ ] User experience is smooth 