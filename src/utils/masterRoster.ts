import { Player } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabasePlayers } from './supabase/players';

/**
 * Retrieves the master roster for the authenticated user from Supabase.
 * @param supabase - The authenticated Supabase client.
 * @returns A promise that resolves to an array of Player objects.
 */
export const getMasterRoster = async (supabase: SupabaseClient): Promise<Player[]> => {
	if (!supabase) {
		throw new Error('Supabase client is required.');
	}
	return getSupabasePlayers(supabase);
};

export default getMasterRoster;