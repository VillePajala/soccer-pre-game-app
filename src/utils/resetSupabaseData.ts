import { supabase } from '@/lib/supabase';
import logger from '@/utils/logger';

/**
 * Completely resets all user data in Supabase
 * WARNING: This is a destructive operation that cannot be undone
 */
export async function resetAllSupabaseData(): Promise<{
  success: boolean;
  message: string;
  details?: {
    gamesDeleted: number;
    tournamentsDeleted: number;
    seasonsDeleted: number;
    playersDeleted: number;
    settingsDeleted: boolean;
  };
}> {
  logger.log('[ResetSupabaseData] Starting complete data reset...');
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user');
    }
    
    const stats = {
      gamesDeleted: 0,
      tournamentsDeleted: 0,
      seasonsDeleted: 0,
      playersDeleted: 0,
      settingsDeleted: false
    };
    
    // Count existing data before deletion
    const [gamesCount, tournamentsCount, seasonsCount, playersCount, settingsCount] = await Promise.all([
      supabase.from('games').select('*').eq('user_id', user.id),
      supabase.from('tournaments').select('*').eq('user_id', user.id),
      supabase.from('seasons').select('*').eq('user_id', user.id),
      supabase.from('players').select('*').eq('user_id', user.id),
      supabase.from('app_settings').select('*').eq('user_id', user.id)
    ]);
    
    stats.gamesDeleted = gamesCount.data?.length || 0;
    stats.tournamentsDeleted = tournamentsCount.data?.length || 0;
    stats.seasonsDeleted = seasonsCount.data?.length || 0;
    stats.playersDeleted = playersCount.data?.length || 0;
    stats.settingsDeleted = (settingsCount.data?.length || 0) > 0;
    
    // Delete in order to avoid foreign key constraints
    logger.log('[ResetSupabaseData] Deleting games...');
    const { error: gamesError } = await supabase
      .from('games')
      .delete()
      .eq('user_id', user.id);
    
    if (gamesError) {
      throw new Error(`Failed to delete games: ${gamesError.message}`);
    }
    
    logger.log('[ResetSupabaseData] Deleting tournaments...');
    const { error: tournamentsError } = await supabase
      .from('tournaments')
      .delete()
      .eq('user_id', user.id);
    
    if (tournamentsError) {
      throw new Error(`Failed to delete tournaments: ${tournamentsError.message}`);
    }
    
    logger.log('[ResetSupabaseData] Deleting seasons...');
    const { error: seasonsError } = await supabase
      .from('seasons')
      .delete()
      .eq('user_id', user.id);
    
    if (seasonsError) {
      throw new Error(`Failed to delete seasons: ${seasonsError.message}`);
    }
    
    logger.log('[ResetSupabaseData] Deleting players...');
    const { error: playersError } = await supabase
      .from('players')
      .delete()
      .eq('user_id', user.id);
    
    if (playersError) {
      throw new Error(`Failed to delete players: ${playersError.message}`);
    }
    
    logger.log('[ResetSupabaseData] Deleting app settings...');
    const { error: settingsError } = await supabase
      .from('app_settings')
      .delete()
      .eq('user_id', user.id);
    
    if (settingsError) {
      throw new Error(`Failed to delete app settings: ${settingsError.message}`);
    }
    
    logger.log('[ResetSupabaseData] All data cleared successfully');
    
    return {
      success: true,
      message: `Successfully deleted: ${stats.gamesDeleted} games, ${stats.tournamentsDeleted} tournaments, ${stats.seasonsDeleted} seasons, ${stats.playersDeleted} players${stats.settingsDeleted ? ', and app settings' : ''}`,
      details: stats
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('[ResetSupabaseData] Reset failed:', error);
    
    return {
      success: false,
      message: `Reset failed: ${errorMessage}`
    };
  }
}