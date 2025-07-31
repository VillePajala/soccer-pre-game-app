/**
 * Tests for data transformation utilities from Supabase to application format
 */

import {
  transformPlayerFromSupabase,
  transformSeasonFromSupabase,
  transformTournamentFromSupabase,
  transformGameEventFromSupabase,
  transformPlayerAssessmentFromSupabase,
  transformGameOpponentFromSupabase,
  transformTacticalDiscFromSupabase,
  transformCompletedIntervalFromSupabase,
  reconstructAppStateFromSupabase,
  transformAppSettingsFromSupabase,
  transformTimerStateFromSupabase,
  type SupabaseGameData
} from './fromSupabase';

import type {
  SupabasePlayer,
  SupabaseSeason,
  SupabaseTournament,
  SupabaseGame,
  SupabaseGamePlayer,
  SupabaseGameOpponent,
  SupabaseGameEvent,
  SupabasePlayerAssessment,
  SupabaseAppSettings,
  SupabaseTacticalDisc,
  SupabaseCompletedInterval,
  SupabaseDrawing,
  SupabaseTimerState
} from './toSupabase';

describe('transformPlayerFromSupabase', () => {
  it('should transform player with all fields', () => {
    const supabasePlayer: SupabasePlayer = {
      id: 'player123',
      user_id: 'user123',
      name: 'Test Player',
      nickname: 'Testy',
      jersey_number: 10,
      notes: 'Great player',
      is_goalie: false,
      received_fair_play_card: true,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const result = transformPlayerFromSupabase(supabasePlayer);

    expect(result).toEqual({
      id: 'player123',
      name: 'Test Player',
      nickname: 'Testy',
      jerseyNumber: '10',
      notes: 'Great player',
      isGoalie: false,
      receivedFairPlayCard: true
    });
  });

  it('should handle player with minimal fields', () => {
    const supabasePlayer: SupabasePlayer = {
      id: 'player123',
      user_id: 'user123',
      name: 'Test Player',
      nickname: null,
      jersey_number: null,
      notes: null,
      is_goalie: true,
      received_fair_play_card: false,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const result = transformPlayerFromSupabase(supabasePlayer);

    expect(result).toEqual({
      id: 'player123',
      name: 'Test Player',
      nickname: undefined,
      jerseyNumber: undefined,
      notes: undefined,
      isGoalie: true,
      receivedFairPlayCard: false
    });
  });
});

describe('transformSeasonFromSupabase', () => {
  it('should transform season with all fields', () => {
    const supabaseSeason: SupabaseSeason = {
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
      age_group: 'U15',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const result = transformSeasonFromSupabase(supabaseSeason);

    expect(result).toEqual({
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
    });
  });

  it('should handle season with minimal fields', () => {
    const supabaseSeason: SupabaseSeason = {
      id: 'season123',
      user_id: 'user123',
      name: 'Test Season',
      location: null,
      period_count: null,
      period_duration: null,
      start_date: null,
      end_date: null,
      game_dates: null,
      archived: true,
      default_roster_ids: null,
      notes: null,
      color: null,
      badge: null,
      age_group: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const result = transformSeasonFromSupabase(supabaseSeason);

    expect(result).toEqual({
      id: 'season123',
      name: 'Test Season',
      location: undefined,
      periodCount: undefined,
      periodDuration: undefined,
      startDate: undefined,
      endDate: undefined,
      gameDates: undefined,
      archived: true,
      defaultRoster: undefined,
      notes: undefined,
      color: undefined,
      badge: undefined,
      ageGroup: undefined
    });
  });
});

describe('transformTournamentFromSupabase', () => {
  it('should transform tournament with all fields', () => {
    const supabaseTournament: SupabaseTournament = {
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
      age_group: 'U17',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const result = transformTournamentFromSupabase(supabaseTournament);

    expect(result).toEqual({
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
    });
  });
});

describe('transformGameEventFromSupabase', () => {
  it('should transform goal event with scorer and assister', () => {
    const supabaseEvent: SupabaseGameEvent = {
      id: 'event123',
      game_id: 'game123',
      event_type: 'goal',
      time_seconds: 1200,
      scorer_id: 'player1',
      assister_id: 'player2',
      entity_id: null,
      created_at: '2024-01-01T00:00:00Z'
    };

    const result = transformGameEventFromSupabase(supabaseEvent);

    expect(result).toEqual({
      id: 'event123',
      type: 'goal',
      time: 1200,
      scorerId: 'player1',
      assisterId: 'player2',
      entityId: undefined
    });
  });

  it('should transform substitution event with entity', () => {
    const supabaseEvent: SupabaseGameEvent = {
      id: 'event456',
      game_id: 'game123',
      event_type: 'substitution',
      time_seconds: 2400,
      scorer_id: null,
      assister_id: null,
      entity_id: 'player3',
      created_at: '2024-01-01T00:00:00Z'
    };

    const result = transformGameEventFromSupabase(supabaseEvent);

    expect(result).toEqual({
      id: 'event456',
      type: 'substitution',
      time: 2400,
      scorerId: undefined,
      assisterId: undefined,
      entityId: 'player3'
    });
  });
});

describe('transformPlayerAssessmentFromSupabase', () => {
  it('should transform assessment with all fields', () => {
    const supabaseAssessment: SupabasePlayerAssessment = {
      id: 'assess123',
      game_id: 'game123',
      player_id: 'player123',
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
      created_by: 'coach123',
      created_at: '2024-01-01T00:00:00Z'
    };

    const result = transformPlayerAssessmentFromSupabase(supabaseAssessment);

    expect(result).toEqual({
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
      createdAt: expect.any(Number),
      createdBy: 'coach123'
    });
  });

  it('should handle assessment with empty notes', () => {
    const supabaseAssessment: SupabasePlayerAssessment = {
      id: 'assess123',
      game_id: 'game123',
      player_id: 'player123',
      overall_rating: 7,
      intensity: 7,
      courage: 7,
      duels: 7,
      technique: 7,
      creativity: 7,
      decisions: 7,
      awareness: 7,
      teamwork: 7,
      fair_play: 7,
      impact: 7,
      notes: null,
      minutes_played: 45,
      created_by: 'coach123',
      created_at: '2024-01-01T00:00:00Z'
    };

    const result = transformPlayerAssessmentFromSupabase(supabaseAssessment);

    expect(result.notes).toBe('');
  });
});

describe('transformGameOpponentFromSupabase', () => {
  it('should transform opponent', () => {
    const supabaseOpponent: SupabaseGameOpponent = {
      id: 'opp123',
      game_id: 'game123',
      opponent_id: 'opponent1',
      rel_x: 0.5,
      rel_y: 0.7,
      created_at: '2024-01-01T00:00:00Z'
    };

    const result = transformGameOpponentFromSupabase(supabaseOpponent);

    expect(result).toEqual({
      id: 'opponent1',
      relX: 0.5,
      relY: 0.7
    });
  });
});

describe('transformTacticalDiscFromSupabase', () => {
  it('should transform tactical disc', () => {
    const supabaseDisc: SupabaseTacticalDisc = {
      id: 'disc123',
      game_id: 'game123',
      disc_id: 'disc1',
      rel_x: 0.3,
      rel_y: 0.4,
      disc_type: 'cone',
      created_at: '2024-01-01T00:00:00Z'
    };

    const result = transformTacticalDiscFromSupabase(supabaseDisc);

    expect(result).toEqual({
      id: 'disc1',
      relX: 0.3,
      relY: 0.4,
      type: 'cone'
    });
  });
});

describe('transformCompletedIntervalFromSupabase', () => {
  it('should transform completed interval', () => {
    const supabaseInterval: SupabaseCompletedInterval = {
      id: 'interval123',
      game_id: 'game123',
      period: 1,
      duration: 900,
      timestamp: 1704067200,
      created_at: '2024-01-01T00:00:00Z'
    };

    const result = transformCompletedIntervalFromSupabase(supabaseInterval);

    expect(result).toEqual({
      period: 1,
      duration: 900,
      timestamp: 1704067200
    });
  });
});

describe('reconstructAppStateFromSupabase', () => {
  const mockSupabaseGameData: SupabaseGameData = {
    game: {
      id: 'game123',
      user_id: 'user123',
      game_date: '2024-01-01',
      team_name: 'Home Team',
      opponent_name: 'Away Team',
      home_or_away: 'home',
      home_score: 2,
      away_score: 1,
      game_status: 'gameEnd',
      current_period: 2,
      number_of_periods: 2,
      period_duration_minutes: 30,
      show_player_names: true,
      game_notes: 'Great game!',
      is_played: true,
      season_id: 'season123',
      tournament_id: null,
      tournament_level: null,
      age_group: 'U15',
      demand_factor: 1.2,
      game_location: 'Home Stadium',
      game_time: '14:00',
      sub_interval_minutes: 15,
      last_sub_confirmation_time_seconds: 900,
      tactical_ball_position: { x: 0.5, y: 0.5 },
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    },
    gamePlayers: [
      {
        id: 'gp1',
        game_id: 'game123',
        player_id: 'player1',
        is_on_field: true,
        is_selected: false,
        rel_x: 0.2,
        rel_y: 0.5,
        color: '#FF0000',
        created_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'gp2',
        game_id: 'game123',
        player_id: 'player2',
        is_on_field: false,
        is_selected: true,
        rel_x: null,
        rel_y: null,
        color: '#00FF00',
        created_at: '2024-01-01T00:00:00Z'
      }
    ],
    gameOpponents: [
      {
        id: 'opp1',
        game_id: 'game123',
        opponent_id: 'opponent1',
        rel_x: 0.8,
        rel_y: 0.5,
        created_at: '2024-01-01T00:00:00Z'
      }
    ],
    gameEvents: [
      {
        id: 'event1',
        game_id: 'game123',
        event_type: 'goal',
        time_seconds: 600,
        scorer_id: 'player1',
        assister_id: 'player2',
        entity_id: null,
        created_at: '2024-01-01T00:00:00Z'
      }
    ],
    playerAssessments: [
      {
        id: 'assess1',
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
        notes: 'Great game',
        minutes_played: 60,
        created_by: 'coach123',
        created_at: '2024-01-01T00:00:00Z'
      }
    ],
    tacticalDiscs: [
      {
        id: 'disc1',
        game_id: 'game123',
        disc_id: 'disc-a',
        rel_x: 0.5,
        rel_y: 0.5,
        disc_type: 'cone',
        created_at: '2024-01-01T00:00:00Z'
      }
    ],
    gameDrawings: [
      {
        id: 'draw1',
        game_id: 'game123',
        drawing_type: 'game',
        drawing_data: [[{ relX: 0.1, relY: 0.1 }, { relX: 0.2, relY: 0.2 }]],
        created_at: '2024-01-01T00:00:00Z'
      }
    ],
    tacticalDrawings: [
      {
        id: 'draw2',
        game_id: 'game123',
        drawing_type: 'tactical',
        drawing_data: [[{ relX: 0.3, relY: 0.3 }, { relX: 0.4, relY: 0.4 }]],
        created_at: '2024-01-01T00:00:00Z'
      }
    ],
    completedIntervals: [
      {
        id: 'interval1',
        game_id: 'game123',
        period: 1,
        duration: 1800,
        timestamp: 1704067200,
        created_at: '2024-01-01T00:00:00Z'
      }
    ],
    players: [
      {
        id: 'player1',
        user_id: 'user123',
        name: 'Player One',
        nickname: null,
        jersey_number: 10,
        notes: null,
        is_goalie: false,
        received_fair_play_card: false,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      },
      {
        id: 'player2',
        user_id: 'user123',
        name: 'Player Two',
        nickname: null,
        jersey_number: 7,
        notes: null,
        is_goalie: false,
        received_fair_play_card: true,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z'
      }
    ]
  };

  it('should reconstruct full AppState from Supabase data', () => {
    const result = reconstructAppStateFromSupabase(mockSupabaseGameData);

    expect(result).toMatchObject({
      teamName: 'Home Team',
      opponentName: 'Away Team',
      gameDate: '2024-01-01',
      homeOrAway: 'home',
      homeScore: 2,
      awayScore: 1,
      gameStatus: 'gameEnd',
      currentPeriod: 2,
      numberOfPeriods: 2,
      periodDurationMinutes: 30,
      showPlayerNames: true,
      gameNotes: 'Great game!',
      isPlayed: true,
      seasonId: 'season123',
      tournamentId: '',
      ageGroup: 'U15',
      demandFactor: 1.2,
      gameLocation: 'Home Stadium',
      gameTime: '14:00',
      subIntervalMinutes: 15,
      lastSubConfirmationTimeSeconds: 900,
      tacticalBallPosition: { x: 0.5, y: 0.5 }
    });

    // Check players on field
    expect(result.playersOnField).toHaveLength(1);
    expect(result.playersOnField[0]).toMatchObject({
      id: 'player1',
      name: 'Player One',
      relX: 0.2,
      relY: 0.5,
      color: '#FF0000',
      jerseyNumber: '10'
    });

    // Check available players
    expect(result.availablePlayers).toHaveLength(1);
    expect(result.availablePlayers[0]).toMatchObject({
      id: 'player2',
      name: 'Player Two',
      color: '#00FF00',
      jerseyNumber: '7'
    });

    // Check selected players
    expect(result.selectedPlayerIds).toEqual(['player2']);

    // Check opponents
    expect(result.opponents).toHaveLength(1);
    expect(result.opponents[0]).toEqual({
      id: 'opponent1',
      relX: 0.8,
      relY: 0.5
    });

    // Check game events
    expect(result.gameEvents).toHaveLength(1);
    expect(result.gameEvents[0]).toEqual({
      id: 'event1',
      type: 'goal',
      time: 600,
      scorerId: 'player1',
      assisterId: 'player2',
      entityId: undefined
    });

    // Check assessments
    expect(result.assessments).toHaveProperty('player1');
    expect(result.assessments.player1.overall).toBe(8);

    // Check drawings
    expect(result.drawings).toEqual([[{ x: 0.1, y: 0.1 }, { x: 0.2, y: 0.2 }]]);
    expect(result.tacticalDrawings).toEqual([[{ x: 0.3, y: 0.3 }, { x: 0.4, y: 0.4 }]]);

    // Check tactical discs
    expect(result.tacticalDiscs).toHaveLength(1);
    expect(result.tacticalDiscs[0]).toEqual({
      id: 'disc-a',
      relX: 0.5,
      relY: 0.5,
      type: 'cone'
    });

    // Check completed intervals
    expect(result.completedIntervalDurations).toHaveLength(1);
    expect(result.completedIntervalDurations[0]).toEqual({
      period: 1,
      duration: 1800,
      timestamp: 1704067200
    });
  });

  it('should handle empty drawings arrays', () => {
    const dataWithNoDrawings = {
      ...mockSupabaseGameData,
      gameDrawings: [],
      tacticalDrawings: []
    };

    const result = reconstructAppStateFromSupabase(dataWithNoDrawings);

    expect(result.drawings).toEqual([]);
    expect(result.tacticalDrawings).toEqual([]);
  });

  it('should handle missing player in player map', () => {
    const dataWithMissingPlayer = {
      ...mockSupabaseGameData,
      players: [mockSupabaseGameData.players[0]] // Only include player1
    };

    const result = reconstructAppStateFromSupabase(dataWithMissingPlayer);

    // Should only have player1 on field, player2 should be skipped
    expect(result.playersOnField).toHaveLength(1);
    expect(result.availablePlayers).toHaveLength(0);
    expect(result.selectedPlayerIds).toHaveLength(0);
  });
});

describe('transformAppSettingsFromSupabase', () => {
  it('should transform app settings with all fields', () => {
    const supabaseSettings: SupabaseAppSettings = {
      id: 'settings123',
      user_id: 'user123',
      current_game_id: 'game123',
      last_home_team_name: 'My Team',
      language: 'en',
      has_seen_app_guide: true,
      auto_backup_enabled: true,
      auto_backup_interval_hours: 24,
      use_demand_correction: false,
      install_prompt_dismissed: new Date('2024-01-01'),
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const result = transformAppSettingsFromSupabase(supabaseSettings);

    expect(result).toEqual({
      currentGameId: 'game123',
      lastHomeTeamName: 'My Team',
      language: 'en',
      hasSeenAppGuide: true,
      autoBackupEnabled: true,
      autoBackupIntervalHours: 24,
      useDemandCorrection: false,
      installPromptDismissed: expect.any(String)
    });
  });

  it('should handle settings with null values', () => {
    const supabaseSettings: SupabaseAppSettings = {
      id: 'settings123',
      user_id: 'user123',
      current_game_id: null,
      last_home_team_name: null,
      language: 'fi',
      has_seen_app_guide: false,
      auto_backup_enabled: false,
      auto_backup_interval_hours: 48,
      use_demand_correction: true,
      install_prompt_dismissed: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const result = transformAppSettingsFromSupabase(supabaseSettings);

    expect(result).toEqual({
      currentGameId: null,
      lastHomeTeamName: '',
      language: 'fi',
      hasSeenAppGuide: false,
      autoBackupEnabled: false,
      autoBackupIntervalHours: 48,
      useDemandCorrection: true,
      installPromptDismissed: undefined
    });
  });
});

describe('transformTimerStateFromSupabase', () => {
  it('should transform timer state', () => {
    const supabaseTimerState: SupabaseTimerState = {
      id: 'timer123',
      user_id: 'user123',
      game_id: 'game123',
      time_elapsed_seconds: 1800,
      timestamp: 1704067200,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z'
    };

    const result = transformTimerStateFromSupabase(supabaseTimerState);

    expect(result).toEqual({
      gameId: 'game123',
      timeElapsedInSeconds: 1800,
      timestamp: 1704067200
    });
  });
});