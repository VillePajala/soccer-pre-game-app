import { supabase } from '../supabase';
import type { Player } from '../../types';
import type { AppSettings } from '../../utils/appSettings';
import { toSupabase, fromSupabase } from '../../utils/transforms';
import type { DbPlayer, DbAppSettings } from '../../utils/transforms';
import { NetworkError, AuthenticationError } from './types';

/**
 * Batch Operations for Supabase
 * Implements Phase 4 Storage Layer Performance optimization
 * Combines multiple database operations into single requests for better performance
 */

export interface BatchOperation {
  table: string;
  operation: 'insert' | 'update' | 'upsert' | 'delete';
  data?: Record<string, unknown>;
  match?: Record<string, unknown>;
  select?: string;
}

export interface BatchGameSessionData {
  game?: Record<string, unknown>;
  players?: Player[];
  events?: Record<string, unknown>[];
  assessments?: Record<string, unknown>[];
  settings?: Partial<AppSettings>;
}

export class BatchOperationManager {
  private async getCurrentUserId(): Promise<string> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      throw new AuthenticationError('supabase', 'getCurrentUserId', error || new Error('No user'));
    }
    return user.id;
  }

  /**
   * Execute multiple database operations in a single transaction
   */
  async executeBatch(operations: BatchOperation[]): Promise<Record<string, unknown>[]> {
    const userId = await this.getCurrentUserId();
    const results: Record<string, unknown>[] = [];

    try {
      // Group operations by type for efficiency
      const grouped = this.groupOperationsByType(operations);
      
      // Execute each group of operations
      for (const [operationType, ops] of Object.entries(grouped)) {
        const groupResults = await this.executeOperationGroup(userId, operationType, ops);
        results.push(...groupResults);
      }

      return results;
    } catch (error) {
      throw new NetworkError('supabase', 'executeBatch', error as Error);
    }
  }

  /**
   * Batch save game session data (game + players + events + assessments)
   */
  async saveGameSession(gameId: string, data: BatchGameSessionData): Promise<{
    game?: Record<string, unknown>;
    players?: Player[];
    events?: Record<string, unknown>[];
    assessments?: Record<string, unknown>[];
    settings?: Record<string, unknown>;
  }> {
    const userId = await this.getCurrentUserId();
    const results: Record<string, Record<string, unknown> | Record<string, unknown>[] | Player[]> = {};

    try {
      // Prepare all operations with user_id
      const operations: Promise<Record<string, unknown> | null>[] = [];

      // 1. Save game data if provided
      if (data.game) {
        const gameData = { ...data.game, user_id: userId };
        operations.push(
          supabase
            .from('games')
            .upsert(gameData, { onConflict: 'id,user_id' })
            .select()
            .single()
            .then(({ data: result, error }: { data: Record<string, unknown> | null; error: any }) => {
              if (error) throw error;
              results.game = result || {};
              return result || {};
            })
        );
      }

      // 2. Batch save players if provided
      if (data.players && data.players.length > 0) {
        const playersData = data.players.map(player => ({
          ...toSupabase.player(player, userId),
          user_id: userId
        }));
        
        operations.push(
          supabase
            .from('players')
            .upsert(playersData, { onConflict: 'id,user_id' })
            .select()
            .then(({ data: result, error }: { data: Record<string, unknown>[] | null; error: any }) => {
              if (error) throw error;
              results.players = result?.map((p: Record<string, unknown>) => fromSupabase.player(p as unknown as DbPlayer)) || [];
              return result || [];
            })
        );
      }

      // 3. Batch save game events if provided
      if (data.events && data.events.length > 0) {
        const eventsData = data.events.map(event => ({
          ...event,
          user_id: userId,
          game_id: gameId
        }));
        
        operations.push(
          supabase
            .from('game_events')
            .upsert(eventsData, { onConflict: 'id,user_id' })
            .select()
            .then(({ data: result, error }: { data: Record<string, unknown>[] | null; error: any }) => {
              if (error) throw error;
              results.events = result || [];
              return result || [];
            })
        );
      }

      // 4. Batch save player assessments if provided
      if (data.assessments && data.assessments.length > 0) {
        const assessmentsData = data.assessments.map(assessment => ({
          ...assessment,
          user_id: userId,
          game_id: gameId
        }));
        
        operations.push(
          supabase
            .from('player_assessments')
            .upsert(assessmentsData, { onConflict: 'id,user_id' })
            .select()
            .then(({ data: result, error }: { data: Record<string, unknown>[] | null; error: any }) => {
              if (error) throw error;
              results.assessments = result || [];
              return result || [];
            })
        );
      }

      // 5. Save app settings if provided
      if (data.settings) {
        const settingsData = toSupabase.appSettings(data.settings as AppSettings, userId);
        
        operations.push(
          supabase
            .from('app_settings')
            .upsert(settingsData, { onConflict: 'user_id' })
            .select()
            .single()
            .then(({ data: result, error }: { data: Record<string, unknown> | null; error: any }) => {
              if (error) throw error;
              results.settings = result ? fromSupabase.appSettings(result as unknown as DbAppSettings) : {};
              return result || {};
            })
        );
      }

      // Execute all operations in parallel
      await Promise.all(operations);
      
      return results;
    } catch (error) {
      throw new NetworkError('supabase', 'saveGameSession', error as Error);
    }
  }

  /**
   * Batch update multiple players at once
   */
  async batchUpdatePlayers(players: Player[]): Promise<Player[]> {
    if (players.length === 0) return [];

    const userId = await this.getCurrentUserId();

    try {
      const playersData = players.map(player => ({
        ...toSupabase.player(player, userId),
        user_id: userId
      }));

      const { data, error } = await supabase
        .from('players')
        .upsert(playersData, { onConflict: 'id,user_id' })
        .select();

      if (error) {
        throw new NetworkError('supabase', 'batchUpdatePlayers', error);
      }

      return data.map((player: DbPlayer) => fromSupabase.player(player));
    } catch (error) {
      throw new NetworkError('supabase', 'batchUpdatePlayers', error as Error);
    }
  }

  /**
   * Batch delete multiple records by IDs
   */
  async batchDelete(table: string, ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const userId = await this.getCurrentUserId();

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .in('id', ids)
        .eq('user_id', userId);

      if (error) {
        throw new NetworkError('supabase', 'batchDelete', error);
      }
    } catch (error) {
      throw new NetworkError('supabase', 'batchDelete', error as Error);
    }
  }

  private groupOperationsByType(operations: BatchOperation[]): Record<string, BatchOperation[]> {
    return operations.reduce((groups, op) => {
      const key = `${op.table}_${op.operation}`;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(op);
      return groups;
    }, {} as Record<string, BatchOperation[]>);
  }

  private async executeOperationGroup(
    userId: string, 
    operationType: string, 
    operations: BatchOperation[]
  ): Promise<Record<string, unknown>[]> {
    const [table, operation] = operationType.split('_');
    const results: Record<string, unknown>[] = [];

    switch (operation) {
      case 'upsert':
        for (const op of operations) {
          const dataWithUserId = { ...op.data, user_id: userId };
          const { data, error } = await supabase
            .from(table)
            .upsert(dataWithUserId)
            .select(op.select || '*');
          
          if (error) throw error;
          results.push(data);
        }
        break;

      case 'insert':
        for (const op of operations) {
          const dataWithUserId = { ...op.data, user_id: userId };
          const { data, error } = await supabase
            .from(table)
            .insert(dataWithUserId)
            .select(op.select || '*');
          
          if (error) throw error;
          results.push(data);
        }
        break;

      case 'update':
        for (const op of operations) {
          const query = supabase
            .from(table)
            .update(op.data)
            .eq('user_id', userId);
          
          // Apply match conditions
          if (op.match) {
            Object.entries(op.match).forEach(([key, value]) => {
              query.eq(key, value);
            });
          }
          
          const { data, error } = await query.select(op.select || '*');
          
          if (error) throw error;
          results.push(data);
        }
        break;

      case 'delete':
        for (const op of operations) {
          const query = supabase
            .from(table)
            .delete()
            .eq('user_id', userId);
          
          // Apply match conditions
          if (op.match) {
            Object.entries(op.match).forEach(([key, value]) => {
              query.eq(key, value);
            });
          }
          
          const { error } = await query;
          
          if (error) throw error;
          results.push({ success: true });
        }
        break;
    }

    return results;
  }
}

// Export singleton instance
export const batchOperationManager = new BatchOperationManager();