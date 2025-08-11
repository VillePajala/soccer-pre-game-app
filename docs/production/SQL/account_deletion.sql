-- Account Deletion Tracking Table and Policies (idempotent & safe)

-- Ensure UUID generation is available (Supabase typically has this enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Use public schema explicitly
CREATE TABLE IF NOT EXISTS public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_deletion_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'cancelled', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT scheduled_after_request CHECK (scheduled_deletion_at >= requested_at)
);

-- Enforce single row per user (latest request overwrites via ON CONFLICT)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'account_deletion_requests_user_id_key'
  ) THEN
    ALTER TABLE public.account_deletion_requests ADD CONSTRAINT account_deletion_requests_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Index for scheduler scanning pending deletions
CREATE INDEX IF NOT EXISTS account_deletion_pending_due_idx
  ON public.account_deletion_requests (scheduled_deletion_at)
  WHERE status = 'pending';

ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own deletion requests" ON public.account_deletion_requests;
CREATE POLICY "Users manage own deletion requests" ON public.account_deletion_requests
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- =============================================================================
-- COMPLETE USER DATA DELETION FUNCTION
-- =============================================================================

-- This function permanently deletes ALL user data across all tables
-- It returns a record of what was deleted for verification
CREATE OR REPLACE FUNCTION delete_user_data(target_user_id UUID)
RETURNS TABLE(deleted_table TEXT, row_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deletion_row_count BIGINT;
BEGIN
    -- Delete in correct order to maintain referential integrity
    -- Start with most dependent tables and work up to main tables
    
    -- 1. Timer states (depends on user_id directly)
    DELETE FROM timer_states WHERE user_id = target_user_id;
    GET DIAGNOSTICS deletion_row_count = ROW_COUNT;
    RETURN QUERY SELECT 'timer_states'::TEXT, deletion_row_count;
    
    -- 2. Player assessments (depends on games)
    DELETE FROM player_assessments 
    WHERE game_id IN (SELECT id FROM games WHERE user_id = target_user_id);
    GET DIAGNOSTICS deletion_row_count = ROW_COUNT;
    RETURN QUERY SELECT 'player_assessments'::TEXT, deletion_row_count;
    
    -- 3. Completed intervals (depends on games)
    DELETE FROM completed_intervals 
    WHERE game_id IN (SELECT id FROM games WHERE user_id = target_user_id);
    GET DIAGNOSTICS deletion_row_count = ROW_COUNT;
    RETURN QUERY SELECT 'completed_intervals'::TEXT, deletion_row_count;
    
    -- 4. Tactical drawings (depends on games)
    DELETE FROM tactical_drawings 
    WHERE game_id IN (SELECT id FROM games WHERE user_id = target_user_id);
    GET DIAGNOSTICS deletion_row_count = ROW_COUNT;
    RETURN QUERY SELECT 'tactical_drawings'::TEXT, deletion_row_count;
    
    -- 5. Tactical discs (depends on games)
    DELETE FROM tactical_discs 
    WHERE game_id IN (SELECT id FROM games WHERE user_id = target_user_id);
    GET DIAGNOSTICS deletion_row_count = ROW_COUNT;
    RETURN QUERY SELECT 'tactical_discs'::TEXT, deletion_row_count;
    
    -- 6. Game drawings (depends on games)
    DELETE FROM game_drawings 
    WHERE game_id IN (SELECT id FROM games WHERE user_id = target_user_id);
    GET DIAGNOSTICS deletion_row_count = ROW_COUNT;
    RETURN QUERY SELECT 'game_drawings'::TEXT, deletion_row_count;
    
    -- 7. Game events (depends on games)
    DELETE FROM game_events 
    WHERE game_id IN (SELECT id FROM games WHERE user_id = target_user_id);
    GET DIAGNOSTICS deletion_row_count = ROW_COUNT;
    RETURN QUERY SELECT 'game_events'::TEXT, deletion_row_count;
    
    -- 8. Game opponents (depends on games)
    DELETE FROM game_opponents 
    WHERE game_id IN (SELECT id FROM games WHERE user_id = target_user_id);
    GET DIAGNOSTICS deletion_row_count = ROW_COUNT;
    RETURN QUERY SELECT 'game_opponents'::TEXT, deletion_row_count;
    
    -- 9. Game players (depends on games and players)
    DELETE FROM game_players 
    WHERE game_id IN (SELECT id FROM games WHERE user_id = target_user_id);
    GET DIAGNOSTICS deletion_row_count = ROW_COUNT;
    RETURN QUERY SELECT 'game_players'::TEXT, deletion_row_count;
    
    -- 10. Games (main table - depends on seasons/tournaments)
    DELETE FROM games WHERE user_id = target_user_id;
    GET DIAGNOSTICS deletion_row_count = ROW_COUNT;
    RETURN QUERY SELECT 'games'::TEXT, deletion_row_count;
    
    -- 11. Players (main table)
    DELETE FROM players WHERE user_id = target_user_id;
    GET DIAGNOSTICS deletion_row_count = ROW_COUNT;
    RETURN QUERY SELECT 'players'::TEXT, deletion_row_count;
    
    -- 12. Tournaments (main table)
    DELETE FROM tournaments WHERE user_id = target_user_id;
    GET DIAGNOSTICS deletion_row_count = ROW_COUNT;
    RETURN QUERY SELECT 'tournaments'::TEXT, deletion_row_count;
    
    -- 13. Seasons (main table)
    DELETE FROM seasons WHERE user_id = target_user_id;
    GET DIAGNOSTICS deletion_row_count = ROW_COUNT;
    RETURN QUERY SELECT 'seasons'::TEXT, deletion_row_count;
    
    -- 14. App settings (user preferences)
    DELETE FROM app_settings WHERE user_id = target_user_id;
    GET DIAGNOSTICS deletion_row_count = ROW_COUNT;
    RETURN QUERY SELECT 'app_settings'::TEXT, deletion_row_count;
    
    -- 15. Finally, mark the account deletion request as completed
    UPDATE account_deletion_requests 
    SET status = 'completed' 
    WHERE user_id = target_user_id AND status = 'pending';
    GET DIAGNOSTICS deletion_row_count = ROW_COUNT;
    RETURN QUERY SELECT 'account_deletion_requests_updated'::TEXT, deletion_row_count;
    
    -- Log successful completion
    RAISE NOTICE 'Successfully deleted all data for user: %', target_user_id;
    
END;
$$;

-- =============================================================================
-- SCHEDULED DELETION PROCESSOR FUNCTION
-- =============================================================================

-- This function should be called by a scheduled job (cron/edge function)
-- to process accounts that have passed their grace period
CREATE OR REPLACE FUNCTION process_expired_account_deletions()
RETURNS TABLE(processed_user_id UUID, deletion_summary TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    expired_request RECORD;
    deletion_results TEXT[];
    deletion_record RECORD;
BEGIN
    -- Find all pending deletion requests that have passed their scheduled date
    FOR expired_request IN 
        SELECT user_id, scheduled_deletion_at
        FROM account_deletion_requests 
        WHERE status = 'pending' 
        AND scheduled_deletion_at <= NOW()
        ORDER BY scheduled_deletion_at ASC
    LOOP
        -- Reset array for each user
        deletion_results := ARRAY[]::TEXT[];
        
        -- Execute the deletion and collect results
        FOR deletion_record IN 
            SELECT deleted_table, row_count 
            FROM delete_user_data(expired_request.user_id)
        LOOP
            deletion_results := deletion_results || (deletion_record.deleted_table || ': ' || deletion_record.row_count || ' rows');
        END LOOP;
        
        -- Return summary of what was processed
        RETURN QUERY SELECT 
            expired_request.user_id,
            array_to_string(deletion_results, ', ');
            
        RAISE NOTICE 'Processed account deletion for user %, scheduled for %', 
            expired_request.user_id, expired_request.scheduled_deletion_at;
    END LOOP;
    
END;
$$;

-- =============================================================================
-- VERIFICATION FUNCTION
-- =============================================================================

-- Function to verify that a user's data has been completely deleted
CREATE OR REPLACE FUNCTION verify_user_data_deleted(target_user_id UUID)
RETURNS TABLE(table_name TEXT, remaining_rows BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    row_count BIGINT;
BEGIN
    -- Check each table for remaining user data
    
    SELECT COUNT(*) INTO row_count FROM timer_states WHERE user_id = target_user_id;
    RETURN QUERY SELECT 'timer_states'::TEXT, row_count;
    
    SELECT COUNT(*) INTO row_count FROM player_assessments pa
    JOIN games g ON pa.game_id = g.id WHERE g.user_id = target_user_id;
    RETURN QUERY SELECT 'player_assessments'::TEXT, row_count;
    
    SELECT COUNT(*) INTO row_count FROM completed_intervals ci
    JOIN games g ON ci.game_id = g.id WHERE g.user_id = target_user_id;
    RETURN QUERY SELECT 'completed_intervals'::TEXT, row_count;
    
    SELECT COUNT(*) INTO row_count FROM tactical_drawings td
    JOIN games g ON td.game_id = g.id WHERE g.user_id = target_user_id;
    RETURN QUERY SELECT 'tactical_drawings'::TEXT, row_count;
    
    SELECT COUNT(*) INTO row_count FROM tactical_discs td
    JOIN games g ON td.game_id = g.id WHERE g.user_id = target_user_id;
    RETURN QUERY SELECT 'tactical_discs'::TEXT, row_count;
    
    SELECT COUNT(*) INTO row_count FROM game_drawings gd
    JOIN games g ON gd.game_id = g.id WHERE g.user_id = target_user_id;
    RETURN QUERY SELECT 'game_drawings'::TEXT, row_count;
    
    SELECT COUNT(*) INTO row_count FROM game_events ge
    JOIN games g ON ge.game_id = g.id WHERE g.user_id = target_user_id;
    RETURN QUERY SELECT 'game_events'::TEXT, row_count;
    
    SELECT COUNT(*) INTO row_count FROM game_opponents go
    JOIN games g ON go.game_id = g.id WHERE g.user_id = target_user_id;
    RETURN QUERY SELECT 'game_opponents'::TEXT, row_count;
    
    SELECT COUNT(*) INTO row_count FROM game_players gp
    JOIN games g ON gp.game_id = g.id WHERE g.user_id = target_user_id;
    RETURN QUERY SELECT 'game_players'::TEXT, row_count;
    
    SELECT COUNT(*) INTO row_count FROM games WHERE user_id = target_user_id;
    RETURN QUERY SELECT 'games'::TEXT, row_count;
    
    SELECT COUNT(*) INTO row_count FROM players WHERE user_id = target_user_id;
    RETURN QUERY SELECT 'players'::TEXT, row_count;
    
    SELECT COUNT(*) INTO row_count FROM tournaments WHERE user_id = target_user_id;
    RETURN QUERY SELECT 'tournaments'::TEXT, row_count;
    
    SELECT COUNT(*) INTO row_count FROM seasons WHERE user_id = target_user_id;
    RETURN QUERY SELECT 'seasons'::TEXT, row_count;
    
    SELECT COUNT(*) INTO row_count FROM app_settings WHERE user_id = target_user_id;
    RETURN QUERY SELECT 'app_settings'::TEXT, row_count;
    
END;
$$;

-- =============================================================================
-- COMMENTS AND DOCUMENTATION
-- =============================================================================

COMMENT ON FUNCTION delete_user_data(UUID) IS 'Permanently deletes all user data across all tables in correct order for referential integrity';
COMMENT ON FUNCTION process_expired_account_deletions() IS 'Processes all account deletion requests that have passed their grace period';
COMMENT ON FUNCTION verify_user_data_deleted(UUID) IS 'Verifies that all user data has been completely removed from the database';

