/**
 * Compression & Field Selection Utilities
 * Implements Phase 4 Storage Layer Performance optimization
 * Reduces payload sizes by selecting only needed fields and compressing data
 */

import { supabase } from '../supabase';
import { NetworkError, AuthenticationError } from './types';

export interface FieldSelection {
  table: string;
  fields: string[];
  relations?: Record<string, string[]>;
}

export interface CompressedPayload {
  data: Record<string, unknown>;
  compressed: boolean;
  originalSize: number;
  compressedSize: number;
}

export class CompressionManager {
  private readonly COMPRESSION_THRESHOLD = 1024; // Only compress payloads > 1KB

  private async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new AuthenticationError('supabase', 'getCurrentUserId', error || new Error('No user'));
    }
    return user.id;
  }

  /**
   * Fetch data with optimized field selection
   */
  async fetchOptimized<T>(
    table: string,
    selection: FieldSelection,
    options?: {
      limit?: number;
      offset?: number;
      orderBy?: string;
      ascending?: boolean;
      filters?: Record<string, unknown>;
    }
  ): Promise<T[]> {
    const userId = await this.getCurrentUserId();

    try {
      // Build field selection string
      let selectString = selection.fields.join(', ');
      
      // Add relations if specified
      if (selection.relations) {
        const relationStrings = Object.entries(selection.relations).map(
          ([relation, fields]) => `${relation}(${fields.join(', ')})`
        );
        selectString += ', ' + relationStrings.join(', ');
      }

      // Build query
      let query = supabase
        .from(table)
        .select(selectString)
        .eq('user_id', userId);

      // Apply filters
      if (options?.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      // Apply ordering
      if (options?.orderBy) {
        query = query.order(options.orderBy, { 
          ascending: options.ascending ?? true 
        });
      }

      // Apply pagination
      if (options?.limit) {
        query = query.limit(options.limit);
      }
      if (options?.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
      }

      const { data, error } = await query;

      if (error) {
        throw new NetworkError('supabase', 'fetchOptimized', error);
      }

      return data || [];
    } catch (error) {
      throw new NetworkError('supabase', 'fetchOptimized', error as Error);
    }
  }

  /**
   * Fetch games list with minimal fields for performance
   */
  async fetchGamesListOptimized(): Promise<Record<string, unknown>[]> {
    return this.fetchOptimized('games', {
      table: 'games',
      fields: [
        'id',
        'team_name',
        'opponent_name', 
        'game_date',
        'game_time',
        'home_score',
        'away_score',
        'is_played',
        'updated_at'
      ]
    }, {
      orderBy: 'game_date',
      ascending: false
    });
  }

  /**
   * Fetch full game data only when needed
   */
  async fetchFullGameOptimized(gameId: string): Promise<Record<string, unknown>> {
    const userId = await this.getCurrentUserId();

    try {
      const { data, error } = await supabase
        .from('games')
        .select(`
          *,
          game_events(*),
          player_assessments(*)
        `)
        .eq('id', gameId)
        .eq('user_id', userId)
        .single();

      if (error) {
        throw new NetworkError('supabase', 'fetchFullGameOptimized', error);
      }

      return data;
    } catch (error) {
      throw new NetworkError('supabase', 'fetchFullGameOptimized', error as Error);
    }
  }

  /**
   * Fetch player stats with aggregated fields
   */
  async fetchPlayerStatsOptimized(options?: {
    seasonId?: string;
    tournamentId?: string;
    limit?: number;
  }): Promise<Record<string, unknown>[]> {
    const userId = await this.getCurrentUserId();

    try {
      let query = supabase
        .from('player_stats_view') // Assuming a database view for aggregated stats
        .select(`
          player_id,
          player_name,
          games_played,
          total_goals,
          total_assists,
          avg_rating,
          total_fair_play_points
        `)
        .eq('user_id', userId);

      if (options?.seasonId) {
        query = query.eq('season_id', options.seasonId);
      }
      if (options?.tournamentId) {
        query = query.eq('tournament_id', options.tournamentId);
      }
      if (options?.limit) {
        query = query.limit(options.limit);
      }

      const { data, error } = await query.order('total_goals', { ascending: false });

      if (error) {
        // Fallback to manual aggregation if view doesn't exist
        return this.fetchPlayerStatsFallback();
      }

      return data || [];
    } catch (error) {
      throw new NetworkError('supabase', 'fetchPlayerStatsOptimized', error as Error);
    }
  }

  /**
   * Compress large payloads before sending
   */
  async compressPayload(data: Record<string, unknown>): Promise<CompressedPayload> {
    const jsonString = JSON.stringify(data);
    const originalSize = new Blob([jsonString]).size;

    if (originalSize < this.COMPRESSION_THRESHOLD) {
      return {
        data,
        compressed: false,
        originalSize,
        compressedSize: originalSize
      };
    }

    try {
      // Use browser's compression if available
      if (typeof CompressionStream !== 'undefined') {
        const stream = new CompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        writer.write(new TextEncoder().encode(jsonString));
        writer.close();

        const chunks: Uint8Array[] = [];
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            chunks.push(value);
          }
        }

        const compressedArray = new Uint8Array(
          chunks.reduce((acc, chunk) => acc + chunk.length, 0)
        );
        let offset = 0;
        for (const chunk of chunks) {
          compressedArray.set(chunk, offset);
          offset += chunk.length;
        }

        // Convert to base64 for storage
        const compressedData = btoa(String.fromCharCode.apply(null, Array.from(compressedArray)));
        
        return {
          data: compressedData as unknown as Record<string, unknown>,
          compressed: true,
          originalSize,
          compressedSize: compressedData.length
        };
      }

      // Fallback: Simple string compression
      return this.simpleCompress(data, originalSize);
    } catch (error) {
      console.warn('Compression failed, using uncompressed data:', error);
      return {
        data,
        compressed: false,
        originalSize,
        compressedSize: originalSize
      };
    }
  }

  /**
   * Decompress payload
   */
  async decompressPayload(payload: CompressedPayload): Promise<Record<string, unknown>> {
    if (!payload.compressed) {
      return payload.data;
    }

    try {
      if (typeof DecompressionStream !== 'undefined') {
        // Use browser's decompression
        const compressedString = atob(payload.data as unknown as string);
        const compressedArray = new Uint8Array(compressedString.length);
        for (let i = 0; i < compressedString.length; i++) {
          compressedArray[i] = compressedString.charCodeAt(i);
        }
        
        const stream = new DecompressionStream('gzip');
        const writer = stream.writable.getWriter();
        const reader = stream.readable.getReader();

        writer.write(compressedArray);
        writer.close();

        const chunks: Uint8Array[] = [];
        let done = false;

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;
          if (value) {
            chunks.push(value);
          }
        }

        const decompressedArray = new Uint8Array(
          chunks.reduce((acc, chunk) => acc + chunk.length, 0)
        );
        let offset = 0;
        for (const chunk of chunks) {
          decompressedArray.set(chunk, offset);
          offset += chunk.length;
        }

        const jsonString = new TextDecoder().decode(decompressedArray);
        return JSON.parse(jsonString);
      }

      // Fallback: Simple decompression
      return this.simpleDecompress(payload.data as unknown as string);
    } catch (error) {
      console.error('Decompression failed:', error);
      throw new Error('Failed to decompress payload');
    }
  }

  /**
   * Optimize query for large datasets with pagination
   */
  async fetchLargeDatasetOptimized<T>(
    table: string,
    fields: string[],
    options: {
      pageSize?: number;
      cursor?: string;
      filters?: Record<string, unknown>;
    } = {}
  ): Promise<{
    data: T[];
    nextCursor?: string;
    hasMore: boolean;
    totalEstimate?: number;
  }> {
    const userId = await this.getCurrentUserId();
    const pageSize = options.pageSize || 50;

    try {
      let query = supabase
        .from(table)
        .select(fields.join(', '), { count: 'estimated' })
        .eq('user_id', userId);

      // Apply filters
      if (options.filters) {
        Object.entries(options.filters).forEach(([key, value]) => {
          query = query.eq(key, value);
        });
      }

      // Apply cursor-based pagination
      if (options.cursor) {
        query = query.gt('id', options.cursor);
      }

      // Limit results
      query = query.order('id').limit(pageSize + 1); // +1 to check if there's more

      const { data, error, count } = await query;

      if (error) {
        throw new NetworkError('supabase', 'fetchLargeDatasetOptimized', error);
      }

      const results = data || [];
      const hasMore = results.length > pageSize;
      const returnData = hasMore ? results.slice(0, pageSize) : results;
      const nextCursor = hasMore ? results[pageSize - 1].id : undefined;

      return {
        data: returnData as T[],
        nextCursor,
        hasMore,
        totalEstimate: count || undefined
      };
    } catch (error) {
      throw new NetworkError('supabase', 'fetchLargeDatasetOptimized', error as Error);
    }
  }

  private simpleCompress(data: Record<string, unknown>, originalSize: number): CompressedPayload {
    // Simple JSON compression - remove whitespace and use shorter keys
    const compressed = JSON.stringify(data, null, 0);
    
    return {
      data: JSON.parse(compressed),
      compressed: false, // Not actually compressed, just optimized
      originalSize,
      compressedSize: compressed.length
    };
  }

  private simpleDecompress(data: string): Record<string, unknown> {
    return JSON.parse(data);
  }

  private async fetchPlayerStatsFallback(): Promise<Record<string, unknown>[]> {
    // Fallback implementation using standard queries
    // This would need to be implemented based on your specific schema
    console.warn('Using fallback player stats query');
    return [] as Record<string, unknown>[];
  }
}

// Pre-defined field selections for common queries
export const FIELD_SELECTIONS = {
  gamesList: {
    table: 'games',
    fields: ['id', 'team_name', 'opponent_name', 'game_date', 'game_time', 'home_score', 'away_score', 'is_played']
  },
  playersBasic: {
    table: 'players', 
    fields: ['id', 'name', 'nickname', 'jersey_number', 'is_goalie']
  },
  playersFull: {
    table: 'players',
    fields: ['id', 'name', 'nickname', 'jersey_number', 'is_goalie', 'notes', 'received_fair_play_card']
  },
  seasonsBasic: {
    table: 'seasons',
    fields: ['id', 'name', 'year', 'start_date', 'end_date']
  },
  tournamentsBasic: {
    table: 'tournaments', 
    fields: ['id', 'name', 'start_date', 'end_date', 'season_id']
  }
} as const;

// Export singleton instance
export const compressionManager = new CompressionManager();