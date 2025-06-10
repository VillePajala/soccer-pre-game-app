-- =================================================================
--
-- RLS SCRIPT FOR SOCCER APP
-- Corrected on [Date] based on provided table schemas.
--
-- =================================================================

-- -----------------------------------------------------------------
-- Helper Function: Get internal Supabase user ID from Clerk JWT
-- -----------------------------------------------------------------
-- This function retrieves the Supabase user UUID based on the 
-- Clerk user ID (`sub` claim) from the JWT.
-- It is defined with SECURITY DEFINER to execute with the privileges 
-- of the user that created it, allowing it to bypass RLS to read
-- the public.users table.
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_user_id_by_clerk_id(clerk_id_param text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  -- The column name `clerk_auth_id` is now correct based on the schema.
  SELECT id FROM public.users WHERE clerk_auth_id = clerk_id_param LIMIT 1;
$$;


-- -----------------------------------------------------------------
-- RLS Policies for 'users' table
-- -----------------------------------------------------------------
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop old policies if they exist
DROP POLICY IF EXISTS "Enable read access for own user" ON public.users;
DROP POLICY IF EXISTS "Deny all client-side modification on users" ON public.users;

-- Allow users to read their own user record.
CREATE POLICY "Enable read access for own user" ON public.users
FOR SELECT USING (
  id = public.get_user_id_by_clerk_id(auth.jwt() ->> 'sub')
);

-- Disallow all client-side modification of the users table.
CREATE POLICY "Deny all client-side modification on users" ON public.users
FOR ALL USING (false) WITH CHECK (false);


-- -----------------------------------------------------------------
-- RLS Policies for 'app_settings' table
-- -----------------------------------------------------------------
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable access for own app_settings" ON public.app_settings;

CREATE POLICY "Enable access for own app_settings" ON public.app_settings
FOR ALL USING (
  user_id = public.get_user_id_by_clerk_id(auth.jwt() ->> 'sub')
) WITH CHECK (
  user_id = public.get_user_id_by_clerk_id(auth.jwt() ->> 'sub')
);


-- -----------------------------------------------------------------
-- RLS Policies for 'seasons' table
-- -----------------------------------------------------------------
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable access for own seasons" ON public.seasons;

CREATE POLICY "Enable access for own seasons" ON public.seasons
FOR ALL USING (
  user_id = public.get_user_id_by_clerk_id(auth.jwt() ->> 'sub')
) WITH CHECK (
  user_id = public.get_user_id_by_clerk_id(auth.jwt() ->> 'sub')
);


-- -----------------------------------------------------------------
-- RLS Policies for 'tournaments' table
-- -----------------------------------------------------------------
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable access for own tournaments" ON public.tournaments;

CREATE POLICY "Enable access for own tournaments" ON public.tournaments
FOR ALL USING (
  user_id = public.get_user_id_by_clerk_id(auth.jwt() ->> 'sub')
) WITH CHECK (
  user_id = public.get_user_id_by_clerk_id(auth.jwt() ->> 'sub')
);


-- -----------------------------------------------------------------
-- RLS Policies for 'players' table
-- -----------------------------------------------------------------
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable access for own players" ON public.players;

CREATE POLICY "Enable access for own players" ON public.players
FOR ALL USING (
  user_id = public.get_user_id_by_clerk_id(auth.jwt() ->> 'sub')
) WITH CHECK (
  user_id = public.get_user_id_by_clerk_id(auth.jwt() ->> 'sub')
);


-- -----------------------------------------------------------------
-- RLS Policies for 'saved_games' table
-- -----------------------------------------------------------------
ALTER TABLE public.saved_games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable access for own saved_games" ON public.saved_games;

CREATE POLICY "Enable access for own saved_games" ON public.saved_games
FOR ALL USING (
  user_id = public.get_user_id_by_clerk_id(auth.jwt() ->> 'sub')
) WITH CHECK (
  user_id = public.get_user_id_by_clerk_id(auth.jwt() ->> 'sub')
); 