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

// Remove or comment out the old singleton export if it exists
// export const supabase = createClient(supabaseUrl, supabaseAnonKey) 