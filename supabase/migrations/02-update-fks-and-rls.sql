-- Step 2: Update Foreign Key Relationships
-- This ensures that existing tables correctly reference the new users table.
-- Note: This assumes your tables already have a `user_id` column of type UUID.
-- If not, you may need to alter the tables first.

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

-- Step 3: Update RLS Policies
-- This replaces all existing RLS policies with new ones that use the user mapping.

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Users can manage their own app settings" ON public.app_settings;
DROP POLICY IF EXISTS "Users can manage their own seasons" ON public.seasons;
DROP POLICY IF EXISTS "Users can manage their own tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Users can manage own players" ON public.players;
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

CREATE POLICY "Users can manage own players" ON public.players
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