import { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { getSupabaseClient } from '@/lib/supabase'; // Import the new function

export const useCurrentSupabaseUser = () => {
  const { user: clerkUser, isSignedIn } = useUser();
  const { getToken } = useAuth(); // Get the getToken function from Clerk
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const mapUser = async () => {
      if (isSignedIn && clerkUser) {
        setIsLoading(true);
        setError(null);
        try {
          // 1. Get Clerk token for Supabase
          // It's good practice to use a specific template if configured in Clerk dashboard for Supabase.
          // If not, getToken() without a template might work but ensure claims are correct.
          const clerkToken = await getToken(); // Using default, add { template: 'supabase' } if you have one

          if (!clerkToken) {
            throw new Error("Clerk token not available.");
          }

          // 2. Get an authenticated Supabase client
          const authedSupabase = getSupabaseClient(clerkToken);

          // 3. Check if user exists in your public.users table
          console.log(`Attempting to find Supabase user for Clerk ID: ${clerkUser.id}`);
          const { data: existingUser, error: fetchError } = await authedSupabase
            .from('users')
            .select('id, clerk_auth_id')
            .eq('clerk_auth_id', clerkUser.id)
            .single();

          if (fetchError && fetchError.code !== 'PGRST116') { 
            console.error("Error fetching user from public.users:", fetchError);
            throw fetchError;
          }

          if (existingUser) {
            console.log("Found existing Supabase user:", existingUser.id);
            setSupabaseUserId(existingUser.id);
          } else {
            console.log(`User with Clerk ID ${clerkUser.id} not found in Supabase. Creating...`);
            const userEmail = clerkUser.primaryEmailAddress?.emailAddress || null;
            console.log(`Attempting to insert new user with Clerk ID ${clerkUser.id} and email ${userEmail}`);
            const { data: newUser, error: insertError } = await authedSupabase // Use authed client
              .from('users')
              .insert({
                clerk_auth_id: clerkUser.id,
                email: userEmail, 
              })
              .select('id')
              .single();

            if (insertError) {
              console.error("Error creating user in public.users:", insertError);
              throw insertError;
            }
            if (newUser) {
              console.log("New user created in Supabase with ID:", newUser.id);
              setSupabaseUserId(newUser.id);
            } else {
              console.error("Failed to create user in Supabase and retrieve ID. newUser data is null or undefined.");
              throw new Error("Failed to create user in Supabase and retrieve ID.");
            }
          }
        } catch (e) {
          console.error("Error in mapUser function:", e);
          setError(e as Error);
          setSupabaseUserId(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        console.log("Clerk user not signed in or clerkUser object is null.");
        setSupabaseUserId(null);
        setIsLoading(false);
        setError(null);
      }
    };

    mapUser();
  }, [isSignedIn, clerkUser, getToken]); // Added getToken to dependency array

  return { supabaseUserId, isLoading, error, isSignedIn };
}; 