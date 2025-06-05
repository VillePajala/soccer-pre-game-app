import { createClient, SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
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

// Remove or comment out the old singleton export if it exists
// export const supabase = createClient(supabaseUrl, supabaseAnonKey) 