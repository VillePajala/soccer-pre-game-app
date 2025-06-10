# Technical Debt Log

This file tracks known issues, refactoring needs, and areas of the codebase that require future attention.

## Database & Authentication

### ~~RLS and Clerk/Supabase UUID Mismatch~~ ✅ FIXED
- **Issue:** Supabase Row Level Security (RLS) policies expect `auth.uid()` to contain Supabase UUIDs, but Clerk JWTs contain Clerk user IDs. This caused authentication failures when RLS is enabled.
- **Resolution:** A user mapping system has been implemented.
  1. A `public.users` table now maps `clerk_auth_id` to an internal Supabase `id` (UUID).
  2. The `useCurrentSupabaseUser` hook ensures this mapping is populated on login.
  3. All RLS policies have been updated to use this `users` table for authentication checks.
  4. All utility functions have been refactored to use the standard, RLS-enforcing `getSupabaseClient(token)` which passes the Clerk JWT.
  5. The temporary RLS-bypassing client functions have been removed from the codebase.
- **Status:** ✅ Fixed. The application now correctly enforces Row Level Security.

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