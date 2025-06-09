# Technical Debt Log

This file tracks known issues, refactoring needs, and areas of the codebase that require future attention.

## Database & Authentication

### RLS and Clerk/Supabase UUID Mismatch
- **Issue:** Supabase Row Level Security (RLS) policies expect `auth.uid()` to contain Supabase UUIDs, but Clerk JWTs contain Clerk user IDs. This causes authentication failures when RLS is enabled.
- **Current Workaround:** Using `getSupabaseClientForAuthenticatedOperations()` which creates an unauthenticated client and relies on manual filtering by `user_id`. This bypasses RLS but requires careful security considerations in every query.
- **Impact:** 
  - All database queries must explicitly filter by `user_id`
  - RLS policies are effectively bypassed, reducing defense-in-depth
  - Error handling must account for both missing data and auth errors
- **Proper Solution:** 
  1. Configure JWT mapping between Clerk and Supabase
  2. Or use Supabase service role key (with careful security handling)
  3. Or modify RLS policies to work with Clerk user IDs
- **Files Affected:**
  - `src/lib/supabase.ts` - Contains the workaround client functions
  - `src/utils/supabase/*.ts` - All Supabase service files
  - All files using Supabase queries

## Testing

### `NewGameSetupModal.test.tsx`
- **Issue:** The entire test suite for the `NewGameSetupModal` component has been skipped (`describe.skip`).
- **Reason:** The tests are consistently failing due to timeout errors and elements not being found. This is caused by complex asynchronous data fetching within the component's `useEffect` hook, which makes it difficult to test reliably with `react-testing-library`.
- **Task:** The test suite needs to be completely rewritten. This will likely require:
    1.  Refactoring the `NewGameSetupModal` component to make its data dependencies more explicit and easier to mock.
    2.  Writing new tests that properly handle asynchronous data loading.
    3.  Potentially using more sophisticated mocking strategies for the data fetching hooks.
- **Priority:** Medium (tests are skipped but not breaking the build).
- **Estimate:** 1-2 days to refactor component and rewrite tests.

## ~~RLS-Bypassing Supabase Client~~ ⚠️ PARTIALLY FIXED
- **Issue:** Several utility files were using `getSupabaseClientWithoutRLS()` which bypassed all Row Level Security policies.
- **Root Cause:** There's a UUID mismatch between Clerk and Supabase - Clerk JWTs contain Clerk user IDs, not Supabase UUIDs, which causes RLS policies to fail.
- **Current Solution:** Introduced `getSupabaseClientForAuthenticatedOperations()` which:
  - Requires a Clerk token for authentication validation
  - Creates a client without the JWT to bypass RLS issues
  - All queries MUST manually filter by the authenticated user's Supabase UUID
- **Files Updated:**
  - `src/app/page.tsx`
  - `src/utils/appSettings.ts`
  - `src/utils/masterRoster.ts`
  - `src/utils/seasons.ts`
  - `src/utils/masterRosterManager.ts`
  - `src/utils/tournaments.ts`
- **Remaining Work:** Proper JWT mapping between Clerk and Supabase needs to be configured on the backend to enable true RLS-based security.
- **Status:** ⚠️ Temporary fix implemented. Security is maintained through manual user_id filtering, but proper RLS configuration is still needed. 