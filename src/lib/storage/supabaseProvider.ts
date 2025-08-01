// Supabase storage provider implementation with Phase 4 performance optimizations
import type { IStorageProvider } from './types';
import { StorageError, NetworkError, AuthenticationError } from './types';
import type { Player, Season, Tournament } from '../../types';
import type { AppSettings } from '../../utils/appSettings';
import { supabase } from '../supabase';
import { toSupabase, fromSupabase } from '../../utils/transforms';
import type { DbSeason, DbTournament, DbPlayer, DbAppSettings, DbGame } from '../../utils/transforms';
import { compressionManager, FIELD_SELECTIONS } from './compressionUtils';

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

  // Player management with Phase 4 optimizations
  async getPlayers(): Promise<Player[]> {
    try {
      // Use optimized field selection for better performance
      const data = await compressionManager.fetchOptimized<DbPlayer>(
        'players',
        {
          table: 'players',
          fields: [...FIELD_SELECTIONS.playersFull.fields] as string[]
        },
        {
          orderBy: 'name',
          ascending: true
        }
      );

      return data.map((player: DbPlayer) => fromSupabase.player(player));
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to get players', 'supabase', 'getPlayers', error as Error);
    }
  }

  async savePlayer(player: Player): Promise<Player> {
    try {
      const userId = await this.getCurrentUserId();
      
      // For players with local IDs (e.g., player_123_abc), treat as new
      const isLocalId = player.id && player.id.startsWith('player_');
      const playerForSupabase = isLocalId ? { ...player, id: '' } : player;
      
      const supabasePlayer = toSupabase.player(playerForSupabase, userId);

      let result;
      if (playerForSupabase.id && !isLocalId) {
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
          throw new NetworkError('supabase', 'savePlayer', error);
        }
        result = data;
      }

      return fromSupabase.player(result as DbPlayer);
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

      return fromSupabase.player(data as DbPlayer);
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

      return data.map((season: DbSeason) => fromSupabase.season(season));
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to get seasons', 'supabase', 'getSeasons', error as Error);
    }
  }

  async saveSeason(season: Season): Promise<Season> {
    try {
      const userId = await this.getCurrentUserId();
      
      // For seasons with local IDs (e.g., season_123_abc), treat as new
      const isLocalId = season.id && season.id.startsWith('season_');
      const seasonForSupabase = isLocalId ? { ...season, id: '' } : season;
      
      const supabaseSeason = toSupabase.season(seasonForSupabase, userId);

      let result;
      if (seasonForSupabase.id && !isLocalId) {
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

      return fromSupabase.season(result as DbSeason);
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

      return fromSupabase.season(data as DbSeason);
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

      return data.map((tournament: DbTournament) => fromSupabase.tournament(tournament));
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to get tournaments', 'supabase', 'getTournaments', error as Error);
    }
  }

  async saveTournament(tournament: Tournament): Promise<Tournament> {
    try {
      const userId = await this.getCurrentUserId();
      
      // For tournaments with local IDs (e.g., tournament_123_abc), treat as new
      const isLocalId = tournament.id && tournament.id.startsWith('tournament_');
      const tournamentForSupabase = isLocalId ? { ...tournament, id: '' } : tournament;
      
      const supabaseTournament = toSupabase.tournament(tournamentForSupabase, userId);

      // Debug: Log what we're trying to save (remove in production)
      if (process.env.NODE_ENV === 'development') {
        console.log('[SupabaseProvider] Tournament save data:', {
          tournament: tournament.name,
          isLocalId,
          hasId: Boolean(tournamentForSupabase.id)
        });
      }

      let result;
      if (tournamentForSupabase.id && !isLocalId) {
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
          console.error('[SupabaseProvider] Tournament save error:', {
            error,
            supabaseTournament,
            errorDetails: error.details,
            errorMessage: error.message,
            errorCode: error.code
          });
          throw new NetworkError('supabase', 'saveTournament', error);
        }
        result = data;
      }

      return fromSupabase.tournament(result as DbTournament);
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

      // Debug: Log what we're trying to update
      console.log('[SupabaseProvider] Tournament update data:', {
        tournamentId,
        updates,
        supabaseUpdates
      });

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

      return fromSupabase.tournament(data as DbTournament);
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

      return fromSupabase.appSettings(data as DbAppSettings);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to get app settings', 'supabase', 'getAppSettings', error as Error);
    }
  }

  async saveAppSettings(settings: AppSettings): Promise<AppSettings> {
    try {
      const userId = await this.getCurrentUserId();
      const supabaseSettings = toSupabase.appSettings(settings, userId);

      const { data, error } = await supabase
        .from('app_settings')
        .upsert(supabaseSettings, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) {
        throw new NetworkError('supabase', 'saveAppSettings', error);
      }

      return fromSupabase.appSettings(data as DbAppSettings);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to save app settings', 'supabase', 'saveAppSettings', error as Error);
    }
  }

  // Saved games - simplified version that works
  async getSavedGames(): Promise<unknown> {
    try {
      const userId = await this.getCurrentUserId();
      
      // First, try the simple approach that was working before
      const { data: gamesData, error: gamesError } = await supabase
        .from('games')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (gamesError) {
        throw new NetworkError('supabase', 'getSavedGames', gamesError);
      }

      // Convert array to object format expected by the app
      const gamesCollection: Record<string, unknown> = {};
      
      // For now, just transform the basic game data
      // This ensures the app continues to work even if the complex query fails
      for (const game of gamesData) {
        const transformedGame = fromSupabase.game(game as DbGame);
        gamesCollection[game.id] = transformedGame;
      }
      
      // Try to fetch related data separately for each game
      // This is less efficient but more reliable
      for (const game of gamesData) {
        try {
          const currentGame = gamesCollection[game.id] as Record<string, unknown>;
          
          // Only fetch events if they don't already exist in game_data
          if (!currentGame.gameEvents || (Array.isArray(currentGame.gameEvents) && currentGame.gameEvents.length === 0)) {
            // Fetch game events
            const { data: events } = await supabase
              .from('game_events')
              .select('*')
              .eq('game_id', game.id);
            
            if (events && events.length > 0) {
              currentGame.gameEvents = events.map((e: Record<string, unknown>) => ({
                id: e.id,
                type: e.event_type,
                time: e.time_seconds,
                scorerId: e.scorer_id,
                assisterId: e.assister_id,
                entityId: e.entity_id
              }));
            }
          }
        } catch {
          // Silently continue if events can't be fetched for a specific game
        }
      }
      
      return gamesCollection;
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof NetworkError) {
        throw error;
      }
      throw new StorageError('Failed to get saved games', 'supabase', 'getSavedGames', error as Error);
    }
  }

  async saveSavedGame(gameData: unknown): Promise<unknown> {
    try {
      const userId = await this.getCurrentUserId();
      const supabaseGame = toSupabase.game(gameData, userId) as Record<string, unknown> & { id?: string };

      let result;
      
      // If game has no ID, do an insert (not upsert)
      if (!supabaseGame.id) {
        const { data, error } = await supabase
          .from('games')
          .insert(supabaseGame)
          .select()
          .single();
          
        if (error) {
          throw new NetworkError('supabase', 'saveSavedGame', error);
        }
        result = data;
      } else {
        const { data, error } = await supabase
          .from('games')
          .upsert(supabaseGame, { onConflict: 'id' })
          .select()
          .single();
          
        if (error) {
          throw new NetworkError('supabase', 'saveSavedGame', error);
        }
        result = data;
      }

      return fromSupabase.game(result as DbGame);
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
      // Fetch all data including games using the provider's methods
      const [players, seasons, tournaments, games, settings] = await Promise.all([
        this.getPlayers(),
        this.getSeasons(),
        this.getTournaments(),
        this.getSavedGames(), // Use the provider's getSavedGames method
        this.getAppSettings()
      ]);

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