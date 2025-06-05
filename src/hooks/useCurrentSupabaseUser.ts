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
          // Get Clerk token using the 'supabase' template
          const clerkToken = await getToken({ template: "supabase" }); 

          if (!clerkToken) {
            throw new Error("Clerk token (supabase template) not available.");
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

          if (fetchError) {
            console.error("Raw fetchError from Supabase users select:", JSON.stringify(fetchError, null, 2), fetchError);
            if (fetchError.code !== 'PGRST116') { 
              console.error("Error fetching user from public.users (and not PGRST116):", fetchError);
              throw fetchError;
            }
            console.log("fetchError was PGRST116 (user not found), proceeding to create.");
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