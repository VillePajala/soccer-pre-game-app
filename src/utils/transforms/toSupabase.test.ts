/**
 * Tests for data transformation utilities to Supabase format
 */

import {
  transformPlayerToSupabase,
  transformSeasonToSupabase,
  transformTournamentToSupabase,
  transformGameToSupabase,
  transformGamePlayersToSupabase,
  transformGameOpponentsToSupabase,
  transformGameEventsToSupabase,
  transformPlayerAssessmentsToSupabase,
  transformTacticalDiscsToSupabase,
  transformDrawingsToSupabase,
  transformCompletedIntervalsToSupabase,
  transformAppSettingsToSupabase,
  transformTimerStateToSupabase
} from './toSupabase';

import type { 
  Player, 
  Season, 
  Tournament, 
  AppState, 
  GameEvent, 
  PlayerAssessment,
  TacticalDisc,
  Point,
  Opponent,
  IntervalLog
} from '@/types';

describe('transformPlayerToSupabase', () => {
  const userId = 'user123';

  it('should transform player with all fields', () => {
    const player: Player = {
      id: 'player123',
      name: 'Test Player',
      nickname: 'Testy',
      jerseyNumber: '10',
      notes: 'Great player',
      isGoalie: false,
      receivedFairPlayCard: true
    };

    const result = transformPlayerToSupabase(player, userId);

    expect(result).toEqual({
      id: 'player123',
      user_id: 'user123',
      name: 'Test Player',
      nickname: 'Testy',
      jersey_number: '10',
      notes: 'Great player',
      is_goalie: false,
      received_fair_play_card: true
    });
  });

  it('should handle player with minimal fields', () => {
    const player: Player = {
      id: 'player123',
      name: 'Test Player'
    };

    const result = transformPlayerToSupabase(player, userId);

    expect(result).toEqual({
      id: 'player123',
      user_id: 'user123',
      name: 'Test Player',
      nickname: null,
      jersey_number: null,
      notes: null,
      is_goalie: false,
      received_fair_play_card: false
    });
  });

  it('should handle undefined optional fields', () => {
    const player: Player = {
      id: 'player123',
      name: 'Test Player',
      nickname: undefined,
      jerseyNumber: undefined,
      notes: undefined,
      isGoalie: undefined,
      receivedFairPlayCard: undefined
    };

    const result = transformPlayerToSupabase(player, userId);

    expect(result).toEqual({
      id: 'player123',
      user_id: 'user123',
      name: 'Test Player',
      nickname: null,
      jersey_number: null,
      notes: null,
      is_goalie: false,
      received_fair_play_card: false
    });
  });
});

describe('transformSeasonToSupabase', () => {
  const userId = 'user123';

  it('should transform season with all fields', () => {
    const season: Season = {
      id: 'season123',
      name: 'Test Season',
      location: 'Test Location',
      periodCount: 2,
      periodDuration: 30,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      gameDates: ['2024-01-15', '2024-01-30'],
      archived: false,
      defaultRoster: ['player1', 'player2'],
      notes: 'Season notes',
      color: '#FF0000',
      badge: '⚽',
      ageGroup: 'U15'
    };

    const result = transformSeasonToSupabase(season, userId);

    expect(result).toEqual({
      id: 'season123',
      user_id: 'user123',
      name: 'Test Season',
      location: 'Test Location',
      period_count: 2,
      period_duration: 30,
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      game_dates: ['2024-01-15', '2024-01-30'],
      archived: false,
      default_roster_ids: ['player1', 'player2'],
      notes: 'Season notes',
      color: '#FF0000',
      badge: '⚽',
      age_group: 'U15'
    });
  });

  it('should handle season with minimal fields', () => {
    const season: Season = {
      id: 'season123',
      name: 'Test Season'
    };

    const result = transformSeasonToSupabase(season, userId);

    expect(result).toEqual({
      id: 'season123',
      user_id: 'user123',
      name: 'Test Season',
      location: null,
      period_count: null,
      period_duration: null,
      start_date: null,
      end_date: null,
      game_dates: null,
      archived: false,
      default_roster_ids: null,
      notes: null,
      color: null,
      badge: null,
      age_group: null
    });
  });
});

describe('transformTournamentToSupabase', () => {
  const userId = 'user123';

  it('should transform tournament with all fields', () => {
    const tournament: Tournament = {
      id: 'tourn123',
      name: 'Test Tournament',
      location: 'Stadium',
      periodCount: 2,
      periodDuration: 20,
      startDate: '2024-06-01',
      endDate: '2024-06-03',
      gameDates: ['2024-06-01', '2024-06-02', '2024-06-03'],
      archived: false,
      defaultRoster: ['player1', 'player2'],
      notes: 'Tournament notes',
      color: '#00FF00',
      badge: '🏆',
      level: 'National',
      ageGroup: 'U17'
    };

    const result = transformTournamentToSupabase(tournament, userId);

    expect(result).toEqual({
      id: 'tourn123',
      user_id: 'user123',
      name: 'Test Tournament',
      location: 'Stadium',
      period_count: 2,
      period_duration: 20,
      start_date: '2024-06-01',
      end_date: '2024-06-03',
      game_dates: ['2024-06-01', '2024-06-02', '2024-06-03'],
      archived: false,
      default_roster_ids: ['player1', 'player2'],
      notes: 'Tournament notes',
      color: '#00FF00',
      badge: '🏆',
      level: 'National',
      age_group: 'U17'
    });
  });
});

describe('transformGameToSupabase', () => {
  const gameId = 'game123';
  const userId = 'user123';

  it('should transform game with all fields', () => {
    const appState: AppState = {
      teamName: 'Home Team',
      opponentName: 'Away Team',
      gameDate: '2024-01-01',
      gameTime: '14:00',
      gameLocation: 'Home Stadium',
      homeOrAway: 'home',
      numberOfPeriods: 2,
      periodDurationMinutes: 30,
      subIntervalMinutes: 15,
      homeScore: 2,
      awayScore: 1,
      currentPeriod: 2,
      gameStatus: 'gameEnd',
      isPlayed: true,
      showPlayerNames: true,
      gameNotes: 'Great game!',
      seasonId: 'season123',
      tournamentId: 'tourn123',
      tournamentLevel: 'Regional',
      ageGroup: 'U15',
      demandFactor: 1.2,
      lastSubConfirmationTimeSeconds: 900,
      tacticalBallPosition: { relX: 0.5, relY: 0.5 },
      playersOnField: [],
      availablePlayers: [],
      selectedPlayerIds: [],
      gameEvents: [],
      showSavedNotification: false,
      lastSavedGame: null,
      language: 'en' as const,
      lastAssessmentCreatedAt: null,
      rosterLastModifiedAt: null,
      selectedPositions: null,
      seasonColor: undefined,
      tournamentColor: undefined,
      gameName: '',
      savedAt: null
    };

    const result = transformGameToSupabase(gameId, appState, userId);

    expect(result).toEqual({
      id: 'game123',
      user_id: 'user123',
      season_id: 'season123',
      tournament_id: 'tourn123',
      team_name: 'Home Team',
      opponent_name: 'Away Team',
      game_date: '2024-01-01',
      game_time: '14:00',
      game_location: 'Home Stadium',
      home_or_away: 'home',
      number_of_periods: 2,
      period_duration_minutes: 30,
      sub_interval_minutes: 15,
      home_score: 2,
      away_score: 1,
      current_period: 2,
      game_status: 'gameEnd',
      is_played: true,
      show_player_names: true,
      game_notes: 'Great game!',
      tournament_level: 'Regional',
      age_group: 'U15',
      demand_factor: 1.2,
      last_sub_confirmation_time_seconds: 900,
      tactical_ball_position: { x: 0.5, y: 0.5 }
    });
  });

  it('should handle game with minimal fields', () => {
    const appState: AppState = {
      teamName: 'Team',
      opponentName: 'Opponent',
      gameDate: '2024-01-01',
      homeOrAway: 'away',
      numberOfPeriods: 1,
      periodDurationMinutes: 20,
      homeScore: 0,
      awayScore: 0,
      currentPeriod: 1,
      gameStatus: 'notStarted',
      showPlayerNames: false,
      playersOnField: [],
      availablePlayers: [],
      selectedPlayerIds: [],
      gameEvents: [],
      showSavedNotification: false,
      lastSavedGame: null,
      language: 'en' as const,
      seasonId: null,
      tournamentId: null,
      lastAssessmentCreatedAt: null,
      rosterLastModifiedAt: null,
      selectedPositions: null,
      seasonColor: undefined,
      tournamentColor: undefined,
      gameName: '',
      gameLocation: '',
      savedAt: null
    };

    const result = transformGameToSupabase(gameId, appState, userId);

    expect(result.season_id).toBeNull();
    expect(result.tournament_id).toBeNull();
    expect(result.game_time).toBeNull();
    expect(result.game_location).toBeNull();
    expect(result.sub_interval_minutes).toBeNull();
    expect(result.is_played).toBe(false);
    expect(result.game_notes).toBeNull();
  });
});

describe('transformGamePlayersToSupabase', () => {
  it('should transform players on field and available players', () => {
    const appState: Partial<AppState> = {
      playersOnField: [
        {
          id: 'player1',
          name: 'Player 1',
          relX: 0.2,
          relY: 0.5,
          color: '#FF0000'
        },
        {
          id: 'player2',
          name: 'Player 2',
          relX: 0.8,
          relY: 0.5,
          color: '#00FF00'
        }
      ],
      availablePlayers: [
        {
          id: 'player3',
          name: 'Player 3',
          color: '#0000FF'
        },
        {
          id: 'player4',
          name: 'Player 4'
        }
      ],
      selectedPlayerIds: ['player1', 'player3']
    };

    const result = transformGamePlayersToSupabase('game123', appState as AppState);

    expect(result).toHaveLength(4);
    
    // Check players on field
    expect(result[0]).toEqual({
      game_id: 'game123',
      player_id: 'player1',
      rel_x: 0.2,
      rel_y: 0.5,
      color: '#FF0000',
      is_selected: true,
      is_on_field: true
    });
    
    expect(result[1]).toEqual({
      game_id: 'game123',
      player_id: 'player2',
      rel_x: 0.8,
      rel_y: 0.5,
      color: '#00FF00',
      is_selected: false,
      is_on_field: true
    });
    
    // Check available players
    expect(result[2]).toEqual({
      game_id: 'game123',
      player_id: 'player3',
      rel_x: null,
      rel_y: null,
      color: '#0000FF',
      is_selected: true,
      is_on_field: false
    });
    
    expect(result[3]).toEqual({
      game_id: 'game123',
      player_id: 'player4',
      rel_x: null,
      rel_y: null,
      color: null,
      is_selected: false,
      is_on_field: false
    });
  });

  it('should handle duplicate players in both lists', () => {
    const appState: Partial<AppState> = {
      playersOnField: [
        {
          id: 'player1',
          name: 'Player 1',
          relX: 0.5,
          relY: 0.5
        }
      ],
      availablePlayers: [
        {
          id: 'player1',
          name: 'Player 1'
        },
        {
          id: 'player2',
          name: 'Player 2'
        }
      ],
      selectedPlayerIds: []
    };

    const result = transformGamePlayersToSupabase('game123', appState as AppState);

    // Should only have 2 players, not 3
    expect(result).toHaveLength(2);
    
    // player1 should only appear once as on field
    const player1Results = result.filter(p => p.player_id === 'player1');
    expect(player1Results).toHaveLength(1);
    expect(player1Results[0].is_on_field).toBe(true);
  });
});

describe('transformGameOpponentsToSupabase', () => {
  it('should transform opponents', () => {
    const opponents: Opponent[] = [
      { id: 'opp1', relX: 0.3, relY: 0.4 },
      { id: 'opp2', relX: 0.7, relY: 0.6 }
    ];

    const result = transformGameOpponentsToSupabase('game123', opponents);

    expect(result).toEqual([
      {
        game_id: 'game123',
        opponent_id: 'opp1',
        rel_x: 0.3,
        rel_y: 0.4
      },
      {
        game_id: 'game123',
        opponent_id: 'opp2',
        rel_x: 0.7,
        rel_y: 0.6
      }
    ]);
  });

  it('should handle empty opponents array', () => {
    const result = transformGameOpponentsToSupabase('game123', []);
    expect(result).toEqual([]);
  });
});

describe('transformGameEventsToSupabase', () => {
  it('should transform various game events', () => {
    const events: GameEvent[] = [
      {
        id: 'event1',
        type: 'goal',
        time: 600,
        scorerId: 'player1',
        assisterId: 'player2'
      },
      {
        id: 'event2',
        type: 'substitution',
        time: 1200,
        entityId: 'player3'
      },
      {
        id: 'event3',
        type: 'periodEnd',
        time: 1800
      }
    ];

    const result = transformGameEventsToSupabase('game123', events);

    expect(result).toEqual([
      {
        id: 'event1',
        game_id: 'game123',
        event_type: 'goal',
        time_seconds: 600,
        scorer_id: 'player1',
        assister_id: 'player2',
        entity_id: null
      },
      {
        id: 'event2',
        game_id: 'game123',
        event_type: 'substitution',
        time_seconds: 1200,
        scorer_id: null,
        assister_id: null,
        entity_id: 'player3'
      },
      {
        id: 'event3',
        game_id: 'game123',
        event_type: 'periodEnd',
        time_seconds: 1800,
        scorer_id: null,
        assister_id: null,
        entity_id: null
      }
    ]);
  });
});

describe('transformPlayerAssessmentsToSupabase', () => {
  it('should transform player assessments', () => {
    const assessments: { [playerId: string]: PlayerAssessment } = {
      'player1': {
        overall: 8,
        sliders: {
          intensity: 9,
          courage: 8,
          duels: 7,
          technique: 8,
          creativity: 7,
          decisions: 9,
          awareness: 8,
          teamwork: 9,
          fair_play: 10,
          impact: 8
        },
        notes: 'Great performance',
        minutesPlayed: 60,
        createdAt: Date.now(),
        createdBy: 'coach123'
      },
      'player2': {
        overall: 7,
        sliders: {
          intensity: 7,
          courage: 7,
          duels: 7,
          technique: 7,
          creativity: 7,
          decisions: 7,
          awareness: 7,
          teamwork: 7,
          fair_play: 7,
          impact: 7
        },
        notes: '',
        minutesPlayed: 45,
        createdAt: Date.now(),
        createdBy: 'coach123'
      }
    };

    const result = transformPlayerAssessmentsToSupabase('game123', assessments);

    expect(result).toHaveLength(2);
    
    expect(result[0]).toEqual({
      game_id: 'game123',
      player_id: 'player1',
      overall_rating: 8,
      intensity: 9,
      courage: 8,
      duels: 7,
      technique: 8,
      creativity: 7,
      decisions: 9,
      awareness: 8,
      teamwork: 9,
      fair_play: 10,
      impact: 8,
      notes: 'Great performance',
      minutes_played: 60,
      created_by: 'coach123'
    });
    
    expect(result[1].notes).toBeNull();
  });

  it('should handle empty assessments object', () => {
    const result = transformPlayerAssessmentsToSupabase('game123', {});
    expect(result).toEqual([]);
  });
});

describe('transformTacticalDiscsToSupabase', () => {
  it('should transform tactical discs', () => {
    const discs: TacticalDisc[] = [
      { id: 'disc1', relX: 0.3, relY: 0.4, type: 'home' },
      { id: 'disc2', relX: 0.7, relY: 0.6, type: 'opponent' },
      { id: 'disc3', relX: 0.5, relY: 0.1, type: 'goalie' }
    ];

    const result = transformTacticalDiscsToSupabase('game123', discs);

    expect(result).toEqual([
      {
        game_id: 'game123',
        disc_id: 'disc1',
        rel_x: 0.3,
        rel_y: 0.4,
        disc_type: 'home'
      },
      {
        game_id: 'game123',
        disc_id: 'disc2',
        rel_x: 0.7,
        rel_y: 0.6,
        disc_type: 'opponent'
      },
      {
        game_id: 'game123',
        disc_id: 'disc3',
        rel_x: 0.5,
        rel_y: 0.1,
        disc_type: 'goalie'
      }
    ]);
  });
});

describe('transformDrawingsToSupabase', () => {
  it('should transform field drawings', () => {
    const drawings: Point[][] = [
      [{ relX: 0.1, relY: 0.1 }, { relX: 0.2, relY: 0.2 }],
      [{ relX: 0.3, relY: 0.3 }, { relX: 0.4, relY: 0.4 }, { relX: 0.5, relY: 0.5 }]
    ];

    const result = transformDrawingsToSupabase('game123', drawings, 'field');

    expect(result).toEqual([{
      game_id: 'game123',
      drawing_data: drawings,
      drawing_type: 'field'
    }]);
  });

  it('should transform tactical drawings', () => {
    const drawings: Point[][] = [
      [{ relX: 0.6, relY: 0.6 }, { relX: 0.7, relY: 0.7 }]
    ];

    const result = transformDrawingsToSupabase('game123', drawings, 'tactical');

    expect(result).toEqual([{
      game_id: 'game123',
      drawing_data: drawings,
      drawing_type: 'tactical'
    }]);
  });

  it('should return empty array for no drawings', () => {
    expect(transformDrawingsToSupabase('game123', [], 'field')).toEqual([]);
    expect(transformDrawingsToSupabase('game123', null as any, 'field')).toEqual([]);
    expect(transformDrawingsToSupabase('game123', undefined as any, 'field')).toEqual([]);
  });
});

describe('transformCompletedIntervalsToSupabase', () => {
  it('should transform completed intervals', () => {
    const intervals: IntervalLog[] = [
      { period: 1, duration: 900, timestamp: 1704067200 },
      { period: 1, duration: 900, timestamp: 1704068100 },
      { period: 2, duration: 900, timestamp: 1704069000 }
    ];

    const result = transformCompletedIntervalsToSupabase('game123', intervals);

    expect(result).toEqual([
      {
        game_id: 'game123',
        period: 1,
        duration: 900,
        timestamp: 1704067200
      },
      {
        game_id: 'game123',
        period: 1,
        duration: 900,
        timestamp: 1704068100
      },
      {
        game_id: 'game123',
        period: 2,
        duration: 900,
        timestamp: 1704069000
      }
    ]);
  });

  it('should handle empty intervals', () => {
    const result = transformCompletedIntervalsToSupabase('game123', []);
    expect(result).toEqual([]);
  });
});

describe('transformAppSettingsToSupabase', () => {
  const userId = 'user123';

  it('should transform app settings with all fields', () => {
    const settings = {
      currentGameId: 'game123',
      lastHomeTeamName: 'My Team',
      language: 'en',
      hasSeenAppGuide: true,
      autoBackupEnabled: true,
      autoBackupIntervalHours: 24,
      useDemandCorrection: false,
      installPromptDismissed: 1704067200
    };

    const result = transformAppSettingsToSupabase(settings, userId);

    expect(result).toEqual({
      user_id: 'user123',
      current_game_id: 'game123',
      last_home_team_name: 'My Team',
      language: 'en',
      has_seen_app_guide: true,
      auto_backup_enabled: true,
      auto_backup_interval_hours: 24,
      use_demand_correction: false,
      install_prompt_dismissed: 1704067200
    });
  });

  it('should handle missing fields with defaults', () => {
    const settings = {};

    const result = transformAppSettingsToSupabase(settings, userId);

    expect(result).toEqual({
      user_id: 'user123',
      current_game_id: null,
      last_home_team_name: null,
      language: 'en',
      has_seen_app_guide: false,
      auto_backup_enabled: false,
      auto_backup_interval_hours: 24,
      use_demand_correction: false,
      install_prompt_dismissed: null
    });
  });

  it('should handle null/undefined values', () => {
    const settings = {
      currentGameId: null,
      lastHomeTeamName: undefined,
      language: null,
      hasSeenAppGuide: null,
      autoBackupEnabled: undefined,
      autoBackupIntervalHours: null,
      useDemandCorrection: undefined,
      installPromptDismissed: null
    };

    const result = transformAppSettingsToSupabase(settings, userId);

    expect(result.current_game_id).toBeNull();
    expect(result.last_home_team_name).toBeNull();
    expect(result.language).toBe('en');
    expect(result.has_seen_app_guide).toBe(false);
    expect(result.auto_backup_enabled).toBe(false);
    expect(result.auto_backup_interval_hours).toBe(24);
    expect(result.use_demand_correction).toBe(false);
    expect(result.install_prompt_dismissed).toBeNull();
  });
});

describe('transformTimerStateToSupabase', () => {
  const userId = 'user123';

  it('should transform timer state', () => {
    const timerState = {
      gameId: 'game123',
      timeElapsedInSeconds: 1800,
      timestamp: 1704067200
    };

    const result = transformTimerStateToSupabase(timerState, userId);

    expect(result).toEqual({
      user_id: 'user123',
      game_id: 'game123',
      time_elapsed_seconds: 1800,
      timestamp: 1704067200
    });
  });
});