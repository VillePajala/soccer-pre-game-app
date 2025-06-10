/**
 * Ensures a user record exists in the public.users table for a given Clerk user ID
 * by calling a secure server-side API route.
 * 
 * @param clerkUserId - The unique user ID from Clerk authentication.
 * @param email - The user's email address (optional).
 * @returns The internal Supabase UUID for the user.
 * @throws An error if the API call fails or the user cannot be synced.
 */
export async function ensureSupabaseUser(
  clerkUserId: string, 
  email?: string
): Promise<string> {
  try {
    const response = await fetch('/api/sync-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ clerkUserId, email }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to sync user with API.');
    }

    const { supabaseUserId } = await response.json();

    if (!supabaseUserId) {
      throw new Error('API did not return a Supabase user ID.');
    }

    return supabaseUserId;

  } catch (error) {
    console.error('[ensureSupabaseUser] A critical error occurred:', error);
    throw error;
  }
} 