// Supabase storage provider implementation
import type { IStorageProvider } from './types';
import { StorageError, NetworkError, AuthenticationError } from './types';
import type { Player, Season, Tournament } from '../../types';
import type { AppSettings } from '../../utils/appSettings';
import { supabase } from '../supabase';
import { toSupabase, fromSupabase } from '../../utils/transforms';

export class SupabaseProvider implements IStorageProvider {
  
  getProviderName(): string {
    return 'supabase';
  }

  async isOnline(): Promise<boolean> {
    try {
      const { error } = await supabase.from('players').select('count').limit(1);
      return !error;
    } catch {
      return false;
    }
  }

  private async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new AuthenticationError('supabase', 'getCurrentUserId', error || new Error('No user'));
    }
    return user.id;
  }

  // Player management
  async getPlayers(): Promise<Player[]> {
    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) {
        throw new NetworkError('supabase', 'getPlayers', error);
      }

      return data.map(fromSupabase.player);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to get players', 'supabase', 'getPlayers', error as Error);
    }
  }

  async savePlayer(player: Player): Promise<Player> {
    console.log('[SupabaseProvider] savePlayer called with:', player);
    try {
      const userId = await this.getCurrentUserId();
      console.log('[SupabaseProvider] Current user ID:', userId);
      const supabasePlayer = toSupabase.player(player, userId);
      console.log('[SupabaseProvider] Transformed player for Supabase:', supabasePlayer);

      let result;
      if (player.id) {
        // Update existing player
        const { data, error } = await supabase
          .from('players')
          .update(supabasePlayer)
          .eq('id', player.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          throw new NetworkError('supabase', 'savePlayer', error);
        }
        result = data;
      } else {
        // Create new player
        const { data, error } = await supabase
          .from('players')
          .insert(supabasePlayer)
          .select()
          .single();

        if (error) {
          console.error('[SupabaseProvider] Error inserting player:', error);
          throw new NetworkError('supabase', 'savePlayer', error);
        }
        console.log('[SupabaseProvider] Player inserted successfully:', data);
        result = data;
      }

      return fromSupabase.player(result);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to save player', 'supabase', 'savePlayer', error as Error);
    }
  }

  async deletePlayer(playerId: string): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId)
        .eq('user_id', userId);

      if (error) {
        throw new NetworkError('supabase', 'deletePlayer', error);
      }
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to delete player', 'supabase', 'deletePlayer', error as Error);
    }
  }

  async updatePlayer(playerId: string, updates: Partial<Player>): Promise<Player> {
    try {
      const userId = await this.getCurrentUserId();
      const supabaseUpdates = toSupabase.playerUpdate(updates, userId);

      const { data, error } = await supabase
        .from('players')
        .update(supabaseUpdates)
        .eq('id', playerId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new NetworkError('supabase', 'updatePlayer', error);
      }

      return fromSupabase.player(data);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to update player', 'supabase', 'updatePlayer', error as Error);
    }
  }

  // Season management
  async getSeasons(): Promise<Season[]> {
    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('seasons')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) {
        throw new NetworkError('supabase', 'getSeasons', error);
      }

      return data.map(fromSupabase.season);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to get seasons', 'supabase', 'getSeasons', error as Error);
    }
  }

  async saveSeason(season: Season): Promise<Season> {
    console.log('[SupabaseProvider] saveSeason called with:', season);
    try {
      const userId = await this.getCurrentUserId();
      const supabaseSeason = toSupabase.season(season, userId);
      console.log('[SupabaseProvider] Transformed season for Supabase:', supabaseSeason);

      let result;
      if (season.id) {
        // Update existing season
        const { data, error } = await supabase
          .from('seasons')
          .update(supabaseSeason)
          .eq('id', season.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          throw new NetworkError('supabase', 'saveSeason', error);
        }
        result = data;
      } else {
        // Create new season
        const { data, error } = await supabase
          .from('seasons')
          .insert(supabaseSeason)
          .select()
          .single();

        if (error) {
          throw new NetworkError('supabase', 'saveSeason', error);
        }
        result = data;
      }

      return fromSupabase.season(result);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to save season', 'supabase', 'saveSeason', error as Error);
    }
  }

  async deleteSeason(seasonId: string): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const { error } = await supabase
        .from('seasons')
        .delete()
        .eq('id', seasonId)
        .eq('user_id', userId);

      if (error) {
        throw new NetworkError('supabase', 'deleteSeason', error);
      }
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to delete season', 'supabase', 'deleteSeason', error as Error);
    }
  }

  async updateSeason(seasonId: string, updates: Partial<Season>): Promise<Season> {
    try {
      const userId = await this.getCurrentUserId();
      const supabaseUpdates = toSupabase.seasonUpdate(updates, userId);

      const { data, error } = await supabase
        .from('seasons')
        .update(supabaseUpdates)
        .eq('id', seasonId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new NetworkError('supabase', 'updateSeason', error);
      }

      return fromSupabase.season(data);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to update season', 'supabase', 'updateSeason', error as Error);
    }
  }

  // Tournament management
  async getTournaments(): Promise<Tournament[]> {
    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('user_id', userId)
        .order('name');

      if (error) {
        throw new NetworkError('supabase', 'getTournaments', error);
      }

      return data.map(fromSupabase.tournament);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to get tournaments', 'supabase', 'getTournaments', error as Error);
    }
  }

  async saveTournament(tournament: Tournament): Promise<Tournament> {
    console.log('[SupabaseProvider] saveTournament called with:', tournament);
    try {
      const userId = await this.getCurrentUserId();
      const supabaseTournament = toSupabase.tournament(tournament, userId);
      console.log('[SupabaseProvider] Transformed tournament for Supabase:', supabaseTournament);

      let result;
      if (tournament.id) {
        // Update existing tournament
        const { data, error } = await supabase
          .from('tournaments')
          .update(supabaseTournament)
          .eq('id', tournament.id)
          .eq('user_id', userId)
          .select()
          .single();

        if (error) {
          throw new NetworkError('supabase', 'saveTournament', error);
        }
        result = data;
      } else {
        // Create new tournament
        const { data, error } = await supabase
          .from('tournaments')
          .insert(supabaseTournament)
          .select()
          .single();

        if (error) {
          throw new NetworkError('supabase', 'saveTournament', error);
        }
        result = data;
      }

      return fromSupabase.tournament(result);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to save tournament', 'supabase', 'saveTournament', error as Error);
    }
  }

  async deleteTournament(tournamentId: string): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId)
        .eq('user_id', userId);

      if (error) {
        throw new NetworkError('supabase', 'deleteTournament', error);
      }
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to delete tournament', 'supabase', 'deleteTournament', error as Error);
    }
  }

  async updateTournament(tournamentId: string, updates: Partial<Tournament>): Promise<Tournament> {
    try {
      const userId = await this.getCurrentUserId();
      const supabaseUpdates = toSupabase.tournamentUpdate(updates, userId);

      const { data, error } = await supabase
        .from('tournaments')
        .update(supabaseUpdates)
        .eq('id', tournamentId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        throw new NetworkError('supabase', 'updateTournament', error);
      }

      return fromSupabase.tournament(data);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to update tournament', 'supabase', 'updateTournament', error as Error);
    }
  }

  // App settings (simplified implementation for now)
  async getAppSettings(): Promise<AppSettings | null> {
    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No settings found, return null
          return null;
        }
        throw new NetworkError('supabase', 'getAppSettings', error);
      }

      return fromSupabase.appSettings(data);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to get app settings', 'supabase', 'getAppSettings', error as Error);
    }
  }

  async saveAppSettings(settings: AppSettings): Promise<AppSettings> {
    console.log('[SupabaseProvider] saveAppSettings called with:', settings);
    try {
      const userId = await this.getCurrentUserId();
      const supabaseSettings = toSupabase.appSettings(settings, userId);
      console.log('[SupabaseProvider] Transformed settings for Supabase:', supabaseSettings);

      const { data, error } = await supabase
        .from('app_settings')
        .upsert(supabaseSettings, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        console.error('[SupabaseProvider] Error saving app settings:', error);
        throw new NetworkError('supabase', 'saveAppSettings', error);
      }

      return fromSupabase.appSettings(data);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to save app settings', 'supabase', 'saveAppSettings', error as Error);
    }
  }

  // Saved games (simplified - using games table)
  async getSavedGames(): Promise<unknown> {
    try {
      const userId = await this.getCurrentUserId();
      const { data, error } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new NetworkError('supabase', 'getSavedGames', error);
      }

      // Convert array to object format expected by the app
      const gamesCollection: Record<string, unknown> = {};
      data.forEach((game: any) => {
        const transformedGame = fromSupabase.game(game);
        gamesCollection[game.id] = transformedGame;
      });
      
      return gamesCollection;
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to get saved games', 'supabase', 'getSavedGames', error as Error);
    }
  }

  async saveSavedGame(gameData: unknown): Promise<unknown> {
    console.log('[SupabaseProvider] saveSavedGame called with:', gameData);
    try {
      const userId = await this.getCurrentUserId();
      const supabaseGame = toSupabase.game(gameData, userId);
      console.log('[SupabaseProvider] Transformed game for Supabase:', supabaseGame);

      const { data, error } = await supabase
        .from('games')
        .upsert(supabaseGame, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('[SupabaseProvider] Error saving game:', error);
        throw new NetworkError('supabase', 'saveSavedGame', error);
      }

      return fromSupabase.game(data);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to save game', 'supabase', 'saveSavedGame', error as Error);
    }
  }

  async deleteSavedGame(gameId: string): Promise<void> {
    try {
      const userId = await this.getCurrentUserId();
      const { error } = await supabase
        .from('games')
        .delete()
        .eq('id', gameId)
        .eq('user_id', userId);

      if (error) {
        throw new NetworkError('supabase', 'deleteSavedGame', error);
      }
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to delete saved game', 'supabase', 'deleteSavedGame', error as Error);
    }
  }

  // Backup/restore
  async exportAllData(): Promise<unknown> {
    try {
      const userId = await this.getCurrentUserId();
      
      // Fetch all data including games
      const [players, seasons, tournaments, gamesResponse, settings] = await Promise.all([
        this.getPlayers(),
        this.getSeasons(),
        this.getTournaments(),
        supabase
          .from('games')
          .select('*')
          .eq('user_id', userId),
        this.getAppSettings()
      ]);

      if (gamesResponse.error) {
        throw new NetworkError('supabase', 'exportAllData', gamesResponse.error);
      }

      // Transform games back to local format
      const games: Record<string, unknown> = {};
      for (const game of gamesResponse.data) {
        const localGame = fromSupabase.game(game);
        games[localGame.id] = localGame;
      }

      return {
        players,
        seasons,
        tournaments,
        savedGames: games,
        appSettings: settings,
        exportDate: new Date().toISOString(),
        version: '1.0',
        source: 'supabase'
      };
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to export data', 'supabase', 'exportAllData', error as Error);
    }
  }

  async importAllData(data: unknown): Promise<void> {
    try {
      const importData = data as {
        players?: Player[];
        seasons?: Season[];
        tournaments?: Tournament[];
        savedGames?: Record<string, unknown>;
        appSettings?: AppSettings;
      };

      const errors: string[] = [];

      // Import players
      if (importData.players?.length) {
        for (const player of importData.players) {
          try {
            await this.savePlayer(player);
          } catch (error) {
            errors.push(`Failed to import player ${player.name}: ${error}`);
          }
        }
      }

      // Import seasons
      if (importData.seasons?.length) {
        for (const season of importData.seasons) {
          try {
            await this.saveSeason(season);
          } catch (error) {
            errors.push(`Failed to import season ${season.name}: ${error}`);
          }
        }
      }

      // Import tournaments
      if (importData.tournaments?.length) {
        for (const tournament of importData.tournaments) {
          try {
            await this.saveTournament(tournament);
          } catch (error) {
            errors.push(`Failed to import tournament ${tournament.name}: ${error}`);
          }
        }
      }

      // Import games
      if (importData.savedGames) {
        for (const [gameId, game] of Object.entries(importData.savedGames)) {
          try {
            await this.saveSavedGame(game);
          } catch (error) {
            errors.push(`Failed to import game ${gameId}: ${error}`);
          }
        }
      }

      // Import settings
      if (importData.appSettings) {
        try {
          await this.saveAppSettings(importData.appSettings);
        } catch (error) {
          errors.push(`Failed to import app settings: ${error}`);
        }
      }

      if (errors.length > 0) {
        throw new Error(`Import completed with errors: ${errors.join('; ')}`);
      }
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      throw new StorageError('Failed to import data', 'supabase', 'importAllData', error as Error);
    }
  }
}