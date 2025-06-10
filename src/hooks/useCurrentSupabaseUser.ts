import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { ensureSupabaseUser } from '@/utils/supabase/userSync';

/**
 * Custom hook to get the current user's internal Supabase UUID.
 * It handles the synchronization between Clerk and Supabase.
 *
 * @returns An object containing the Supabase User ID, loading state, sign-in status, and any errors.
 */
export const useCurrentSupabaseUser = () => {
  const { user: clerkUser, isSignedIn, isLoaded: isClerkLoaded } = useUser();
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Don't do anything until Clerk has finished loading its user data.
    if (!isClerkLoaded) {
      return;
    }

    const syncUserWithSupabase = async () => {
      // If the user is not signed in, there's nothing to sync.
      if (!isSignedIn || !clerkUser) {
        setSupabaseUserId(null);
        setIsLoading(false);
        setError(null);
        return;
      }
      
      try {
        setIsLoading(true);
        setError(null);
        
        const internalUserId = await ensureSupabaseUser(
          clerkUser.id,
          clerkUser.primaryEmailAddress?.emailAddress
        );

        setSupabaseUserId(internalUserId);
        
      } catch (e) {
        console.error("Failed to sync Clerk user to Supabase:", e);
        setError(e as Error);
        setSupabaseUserId(null);
      } finally {
        setIsLoading(false);
      }
    };

    syncUserWithSupabase();
  }, [isClerkLoaded, isSignedIn, clerkUser]);

  return { 
    supabaseUserId, 
    isLoading, 
    error, 
    isSignedIn: !!isSignedIn // Ensure boolean
  };
}; 