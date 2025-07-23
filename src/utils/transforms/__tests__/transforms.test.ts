// Unit tests for data transformation utilities
import { toSupabase, fromSupabase } from '../index';
import type { Player, Season, Tournament } from '../../../types';
import type { AppSettings } from '../../appSettings';

describe('Data Transformation Utilities', () => {
  const mockUserId = 'user-123';

  describe('Player Transformations', () => {
    const mockPlayer: Player = {
      id: 'player-1',
      name: 'John Doe',
      nickname: 'Johnny',
      jerseyNumber: '10',
      notes: 'Good player',
      isGoalie: false,
      receivedFairPlayCard: true
    };

    describe('toSupabase.player', () => {
      it('should transform player to Supabase format', () => {
        const result = toSupabase.player(mockPlayer, mockUserId);

        expect(result).toEqual({
          id: 'player-1',
          user_id: mockUserId,
          name: 'John Doe',
          nickname: 'Johnny',
          jerseyNumber: '10',
          notes: 'Good player',
          is_goalie: false,
          received_fair_play_card: true
        });
      });

      it('should handle missing optional fields', () => {
        const minimalPlayer: Player = {
          id: 'player-2',
          name: 'Jane Doe',
          isGoalie: true,
          receivedFairPlayCard: false
        };

        const result = toSupabase.player(minimalPlayer, mockUserId);

        expect(result).toEqual({
          id: 'player-2',
          user_id: mockUserId,
          name: 'Jane Doe',
          is_goalie: true,
          received_fair_play_card: false
        });
      });
    });

    describe('toSupabase.playerUpdate', () => {
      it('should transform player updates to Supabase format', () => {
        const updates: Partial<Player> = {
          name: 'Updated Name',
          isGoalie: true,
          receivedFairPlayCard: false
        };

        const result = toSupabase.playerUpdate(updates, mockUserId);

        expect(result).toEqual({
          name: 'Updated Name',
          user_id: mockUserId,
          is_goalie: true,
          received_fair_play_card: false
        });
      });

      it('should only include provided fields', () => {
        const partialUpdates: Partial<Player> = {
          name: 'New Name'
        };

        const result = toSupabase.playerUpdate(partialUpdates, mockUserId);

        expect(result).toEqual({
          name: 'New Name',
          user_id: mockUserId
        });
        expect(result).not.toHaveProperty('is_goalie');
        expect(result).not.toHaveProperty('received_fair_play_card');
      });
    });

    describe('fromSupabase.player', () => {
      it('should transform player from Supabase format', () => {
        const supabasePlayer = {
          id: 'player-1',
          user_id: mockUserId,
          name: 'John Doe',
          nickname: 'Johnny',
          jersey_number: '10',
          notes: 'Good player',
          is_goalie: false,
          received_fair_play_card: true,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        };

        const result = fromSupabase.player(supabasePlayer);

        expect(result).toEqual({
          id: 'player-1',
          name: 'John Doe',
          nickname: 'Johnny',
          jerseyNumber: '10',
          notes: 'Good player',
          isGoalie: false,
          receivedFairPlayCard: true
        });
      });
    });
  });

  describe('Season Transformations', () => {
    const mockSeason: Season = {
      id: 'season-1',
      name: 'Spring 2024',
      location: 'Local Field',
      periodCount: 2,
      periodDuration: 45,
      startDate: '2024-03-01',
      endDate: '2024-06-01',
      gameDates: ['2024-03-15', '2024-04-15'],
      archived: false,
      defaultRosterId: 'roster-1',
      notes: 'Great season',
      color: '#007bff',
      ageGroup: 'U12'
    };

    describe('toSupabase.season', () => {
      it('should transform season to Supabase format', () => {
        const result = toSupabase.season(mockSeason, mockUserId);

        expect(result).toEqual({
          id: 'season-1',
          user_id: mockUserId,
          name: 'Spring 2024',
          location: 'Local Field',
          period_count: 2,
          period_duration: 45,
          start_date: '2024-03-01',
          end_date: '2024-06-01',
          game_dates: ['2024-03-15', '2024-04-15'],
          archived: false,
          default_roster_ids: 'roster-1',
          notes: 'Great season',
          color: '#007bff',
          age_group: 'U12'
        });
      });
    });

    describe('fromSupabase.season', () => {
      it('should transform season from Supabase format', () => {
        const supabaseSeason = {
          id: 'season-1',
          user_id: mockUserId,
          name: 'Spring 2024',
          location: 'Local Field',
          period_count: 2,
          period_duration: 45,
          start_date: '2024-03-01',
          end_date: '2024-06-01',
          game_dates: ['2024-03-15', '2024-04-15'],
          archived: false,
          default_roster_ids: 'roster-1',
          notes: 'Great season',
          color: '#007bff',
          age_group: 'U12',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        };

        const result = fromSupabase.season(supabaseSeason);

        expect(result).toEqual({
          id: 'season-1',
          name: 'Spring 2024',
          location: 'Local Field',
          periodCount: 2,
          periodDuration: 45,
          startDate: '2024-03-01',
          endDate: '2024-06-01',
          gameDates: ['2024-03-15', '2024-04-15'],
          archived: false,
          defaultRosterId: 'roster-1',
          notes: 'Great season',
          color: '#007bff',
          ageGroup: 'U12'
        });
      });
    });
  });

  describe('Tournament Transformations', () => {
    const mockTournament: Tournament = {
      id: 'tournament-1',
      name: 'Summer Cup',
      location: 'City Stadium',
      startDate: '2024-07-01',
      endDate: '2024-07-15',
      periodCount: 2,
      periodDuration: 30,
      gameDates: ['2024-07-05', '2024-07-10'],
      archived: false,
      defaultRosterId: 'roster-2',
      notes: 'Annual tournament',
      color: '#28a745',
      ageGroup: 'U14'
    };

    describe('toSupabase.tournament', () => {
      it('should transform tournament to Supabase format', () => {
        const result = toSupabase.tournament(mockTournament, mockUserId);

        expect(result).toEqual({
          id: 'tournament-1',
          user_id: mockUserId,
          name: 'Summer Cup',
          location: 'City Stadium',
          start_date: '2024-07-01',
          end_date: '2024-07-15',
          period_count: 2,
          period_duration: 30,
          game_dates: ['2024-07-05', '2024-07-10'],
          archived: false,
          default_roster_ids: 'roster-2',
          notes: 'Annual tournament',
          color: '#28a745',
          age_group: 'U14'
        });
      });
    });

    describe('fromSupabase.tournament', () => {
      it('should transform tournament from Supabase format', () => {
        const supabaseTournament = {
          id: 'tournament-1',
          user_id: mockUserId,
          name: 'Summer Cup',
          location: 'City Stadium',
          start_date: '2024-07-01',
          end_date: '2024-07-15',
          period_count: 2,
          period_duration: 30,
          game_dates: ['2024-07-05', '2024-07-10'],
          archived: false,
          default_roster_ids: 'roster-2',
          notes: 'Annual tournament',
          color: '#28a745',
          age_group: 'U14',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        };

        const result = fromSupabase.tournament(supabaseTournament);

        expect(result).toEqual({
          id: 'tournament-1',
          name: 'Summer Cup',
          location: 'City Stadium',
          startDate: '2024-07-01',
          endDate: '2024-07-15',
          periodCount: 2,
          periodDuration: 30,
          gameDates: ['2024-07-05', '2024-07-10'],
          archived: false,
          defaultRosterId: 'roster-2',
          notes: 'Annual tournament',
          color: '#28a745',
          ageGroup: 'U14'
        });
      });
    });
  });

  describe('App Settings Transformations', () => {
    const mockAppSettings: AppSettings = {
      currentGameId: 'game-123',
      lastBackupDate: '2024-01-01',
      preferredLanguage: 'en',
      theme: 'light'
    };

    describe('toSupabase.appSettings', () => {
      it('should transform app settings to Supabase format', () => {
        const result = toSupabase.appSettings(mockAppSettings, mockUserId);

        expect(result).toEqual({
          user_id: mockUserId,
          current_game_id: 'game-123',
          last_backup_date: '2024-01-01',
          preferred_language: 'en',
          theme: 'light'
        });
      });
    });

    describe('fromSupabase.appSettings', () => {
      it('should transform app settings from Supabase format', () => {
        const supabaseSettings = {
          id: 'settings-1',
          user_id: mockUserId,
          current_game_id: 'game-123',
          last_backup_date: '2024-01-01',
          preferred_language: 'en',
          theme: 'light',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z'
        };

        const result = fromSupabase.appSettings(supabaseSettings);

        expect(result).toEqual({
          currentGameId: 'game-123',
          lastBackupDate: '2024-01-01',
          preferredLanguage: 'en',
          theme: 'light'
        });
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle null and undefined values in transformations', () => {
      const playerWithNulls: Player = {
        id: 'player-1',
        name: 'Test Player',
        nickname: undefined,
        jerseyNumber: null as unknown as string,
        notes: '',
        isGoalie: false,
        receivedFairPlayCard: false
      };

      const result = toSupabase.player(playerWithNulls, mockUserId);

      expect(result).toEqual({
        id: 'player-1',
        user_id: mockUserId,
        name: 'Test Player',
        nickname: undefined,
        jerseyNumber: null,
        notes: '',
        is_goalie: false,
        received_fair_play_card: false
      });
    });

    it('should handle empty objects in transformations', () => {
      const emptyUpdates: Partial<Player> = {};

      const result = toSupabase.playerUpdate(emptyUpdates, mockUserId);

      expect(result).toEqual({
        user_id: mockUserId
      });
    });
  });
});