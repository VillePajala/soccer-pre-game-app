import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Log the variables to the browser console for debugging
console.log('[Supabase Client] NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl);
console.log('[Supabase Client] NEXT_PUBLIC_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Loaded' : 'MISSING or empty');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("CRITICAL: Supabase URL or Anon Key is missing. Check your .env.local file and ensure it's loaded correctly.")
  throw new Error("Supabase URL or Anon Key is missing from environment variables.")
}

// Export the basic, unauthenticated client for specific public calls (if any)
export const supabaseAnonClient = createClient(supabaseUrl, supabaseAnonKey)

/**
 * Returns a Supabase client instance.
 * If an accessToken is provided (e.g., from Clerk), it configures the client
 * to use that token for authenticated requests. Otherwise, it returns a client
 * initialized with the anon key (for unauthenticated or public access).
 *
 * @param {string | null} [accessToken=null] - The JWT access token for authentication.
 * @returns {SupabaseClient} An instance of the Supabase client.
 */
export const getSupabaseClient = (accessToken: string | null = null): SupabaseClient => {
  if (accessToken) {
    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    })
  }
  return supabaseAnonClient
}

/**
 * Returns a Supabase client that bypasses RLS by not including the Clerk JWT.
 * This is a temporary workaround for the UUID mismatch issue between Clerk and Supabase.
 * 
 * IMPORTANT: This should only be used for queries where we explicitly filter by user_id
 * to maintain security. Do not use this for operations that rely on RLS for security.
 * 
 * @returns {SupabaseClient} An instance of the Supabase client without auth headers.
 */
export const getSupabaseClientWithoutRLS = (): SupabaseClient => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  })
}

/**
 * Returns a Supabase client for authenticated operations that need to bypass RLS
 * due to the Clerk/Supabase UUID mismatch. This client does not include the Clerk JWT
 * but the calling code MUST always filter by the authenticated user's Supabase UUID.
 * 
 * This is a temporary solution until proper JWT mapping is configured between Clerk and Supabase.
 * 
 * @param {string} clerkToken - The Clerk JWT token (used for validation only)
 * @returns {SupabaseClient} An instance of the Supabase client without auth headers.
 * @throws {Error} If no Clerk token is provided
 */
export const getSupabaseClientForAuthenticatedOperations = (clerkToken: string): SupabaseClient => {
  if (!clerkToken) {
    throw new Error("Clerk token is required for authenticated operations");
  }
  
  // We validate that a token exists but don't include it in the client
  // because Supabase RLS expects Supabase UUIDs in the JWT, not Clerk user IDs
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    }
  })
}

// Remove or comment out the old singleton export if it exists
// export const supabase = createClient(supabaseUrl, supabaseAnonKey) 