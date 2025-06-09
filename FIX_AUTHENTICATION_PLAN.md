# Fix Authentication Issues - Step-by-Step Plan

**Created:** 2024-12-19
**Status:** Ready to Implement
**Priority:** CRITICAL - Must be completed before continuing migration

## Problem Summary

The app is experiencing authentication failures because:
1. Clerk provides its own user IDs (format: `user_2abc...`)
2. Supabase RLS policies expect Supabase Auth UUIDs
3. The JWT from Clerk contains Clerk IDs, not Supabase UUIDs
4. All authenticated database operations fail with empty error objects

## Current Workaround (Temporary)

We're bypassing RLS by using unauthenticated Supabase clients and manually filtering by user_id. This is:
- ❌ Insecure
- ❌ Not scalable
- ❌ Technical debt
- ✅ Only acceptable as a temporary fix

## Permanent Solution Overview

Implement an internal user mapping system that:
1. Creates a `users` table in Supabase
2. Maps Clerk user IDs to internal Supabase UUIDs
3. Updates all RLS policies to use this mapping
4. Ensures user sync on every sign-in

## Step-by-Step Implementation

### Step 1: Create Users Table in Supabase

Run this SQL in Supabase SQL Editor:

```sql
-- Create internal users table for vendor-agnostic user management
CREATE TABLE public.users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  clerk_auth_id TEXT UNIQUE NOT NULL,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_login_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create index for faster lookups
CREATE INDEX idx_users_clerk_auth_id ON public.users(clerk_auth_id);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policy (users can only see their own data)
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid()::text = clerk_auth_id);
```

**Success Criteria:**
- [ ] Table created successfully
- [ ] Index created
- [ ] RLS enabled
- [ ] Policy created

### Step 2: Update Foreign Key Relationships

Update all existing tables to reference the new users table:

```sql
-- Add foreign key constraints to existing tables
ALTER TABLE public.app_settings 
  ADD CONSTRAINT fk_app_settings_user 
  FOREIGN KEY (user_id) 
  REFERENCES public.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.seasons 
  ADD CONSTRAINT fk_seasons_user 
  FOREIGN KEY (user_id) 
  REFERENCES public.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.tournaments 
  ADD CONSTRAINT fk_tournaments_user 
  FOREIGN KEY (user_id) 
  REFERENCES public.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.players 
  ADD CONSTRAINT fk_players_user 
  FOREIGN KEY (user_id) 
  REFERENCES public.users(id) 
  ON DELETE CASCADE;

ALTER TABLE public.saved_games 
  ADD CONSTRAINT fk_saved_games_user 
  FOREIGN KEY (user_id) 
  REFERENCES public.users(id) 
  ON DELETE CASCADE;
```

**Success Criteria:**
- [ ] All foreign keys added
- [ ] No constraint violations

### Step 3: Update RLS Policies

Replace ALL existing RLS policies with new ones that use the user mapping:

```sql
-- Drop existing policies first
DROP POLICY IF EXISTS "Users can manage their own app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can manage their own seasons" ON public.seasons;
DROP POLICY IF EXISTS "Users can manage their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can manage their own players" ON public.players;
DROP POLICY IF EXISTS "Users can manage their own saved games" ON public.saved_games;

-- Create new policies that use the user mapping
CREATE POLICY "Users can manage their own app settings" ON public.app_settings
  FOR ALL USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_auth_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage their own seasons" ON public.seasons
  FOR ALL USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_auth_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage their own tournaments" ON public.tournaments
  FOR ALL USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_auth_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage their own players" ON public.players
  FOR ALL USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_auth_id = auth.uid()::text
    )
  );

CREATE POLICY "Users can manage their own saved games" ON public.saved_games
  FOR ALL USING (
    user_id IN (
      SELECT id FROM public.users WHERE clerk_auth_id = auth.uid()::text
    )
  );
```

**Success Criteria:**
- [ ] Old policies dropped
- [ ] New policies created
- [ ] Test with a Clerk JWT to verify policies work

### Step 4: Create User Sync Service

Create `src/utils/supabase/userSync.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

// Use service role key for user management (bypasses RLS)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // You'll need to add this to .env.local
);

export async function ensureSupabaseUser(
  clerkUserId: string, 
  email?: string
): Promise<string> {
  try {
    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('clerk_auth_id', clerkUserId)
      .single();
    
    if (existingUser && !fetchError) {
      // Update last login
      await supabaseAdmin
        .from('users')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', existingUser.id);
      
      return existingUser.id;
    }
    
    // Create new user
    const { data: newUser, error: createError } = await supabaseAdmin
      .from('users')
      .insert({
        clerk_auth_id: clerkUserId,
        email: email,
      })
      .select('id')
      .single();
    
    if (createError) {
      throw new Error(`Failed to create Supabase user: ${createError.message}`);
    }
    
    return newUser.id;
  } catch (error) {
    console.error('[ensureSupabaseUser] Error:', error);
    throw error;
  }
}
```

**Success Criteria:**
- [ ] Service created
- [ ] Can create new users
- [ ] Can update existing users
- [ ] Proper error handling

### Step 5: Update useCurrentSupabaseUser Hook

Update `src/hooks/useCurrentSupabaseUser.ts` to use the sync service:

```typescript
import { useAuth } from '@clerk/nextjs';
import { useState, useEffect } from 'react';
import { ensureSupabaseUser } from '@/utils/supabase/userSync';

export function useCurrentSupabaseUser() {
  const { isSignedIn, userId: clerkUserId, user } = useAuth();
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function syncUser() {
      if (!isSignedIn || !clerkUserId) {
        setSupabaseUserId(null);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const internalUserId = await ensureSupabaseUser(
          clerkUserId,
          user?.primaryEmailAddress?.emailAddress
        );
        setSupabaseUserId(internalUserId);
        setError(null);
      } catch (err) {
        console.error('Failed to sync user:', err);
        setError(err as Error);
        setSupabaseUserId(null);
      } finally {
        setIsLoading(false);
      }
    }

    syncUser();
  }, [isSignedIn, clerkUserId, user]);

  return {
    supabaseUserId,
    isLoading,
    isSignedIn,
    error,
  };
}
```

**Success Criteria:**
- [ ] Hook updated
- [ ] Creates user on first sign-in
- [ ] Returns internal UUID
- [ ] Updates last login on subsequent sign-ins

### Step 6: Revert Temporary RLS Bypass

Remove the `getSupabaseClientForAuthenticatedOperations` workaround and go back to using the standard authenticated client:

1. Update `src/lib/supabase.ts` to use proper authentication
2. Remove manual user_id filtering from all service functions
3. Let RLS policies handle access control

**Success Criteria:**
- [ ] Workaround removed
- [ ] Using authenticated clients
- [ ] RLS policies working correctly

### Step 7: Test Everything

1. **Clean Database Test:**
   - [ ] Drop all test data
   - [ ] Sign in as new user
   - [ ] Verify user created in users table
   - [ ] Test creating seasons, tournaments, etc.

2. **Existing User Test:**
   - [ ] Sign in as existing user
   - [ ] Verify last_login_at updated
   - [ ] Verify can access their data
   - [ ] Verify cannot access other users' data

3. **Error Handling Test:**
   - [ ] Test with invalid tokens
   - [ ] Test network failures
   - [ ] Verify graceful error handling

### Step 8: Update Migration Documentation

Update `MIGRATION_TO_SUPABASE_AND_CLERK.md` to reflect:
- [ ] Users table is now implemented
- [ ] Authentication mapping is complete
- [ ] RLS policies are properly configured
- [ ] Next steps for continuing migration

## Environment Variables Needed

Add to `.env.local`:
```env
# Existing
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# New - get from Supabase dashboard > Settings > API
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Timeline Estimate

- Step 1-3: 30 minutes (database changes)
- Step 4-5: 1 hour (code implementation)
- Step 6: 30 minutes (cleanup)
- Step 7: 1 hour (testing)
- Step 8: 15 minutes (documentation)

**Total: ~3.25 hours**

## Notes

- This MUST be completed before continuing with any other migration work
- All future entity migrations will depend on this authentication foundation
- Once complete, the app will have proper multi-user support with security

## Next Steps After Completion

Once this authentication fix is complete, you can resume the migration plan:
1. Complete Tournaments migration (following Seasons pattern)
2. Complete Players migration
3. Complete App Settings migration
4. Complete Saved Games migration (most complex) 