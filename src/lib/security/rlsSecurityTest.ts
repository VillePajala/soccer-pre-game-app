/**
 * Row Level Security (RLS) Policy Test Suite
 * 
 * This file contains comprehensive tests to verify that Supabase RLS policies
 * properly isolate data between users and prevent unauthorized access.
 * 
 * CRITICAL: These tests must pass for production deployment to ensure
 * coaches' data remains completely isolated from other coaches.
 */

import { supabase } from '../supabase';
import type { Database } from '../supabase';

// Test users for security testing (these would be created in test setup)
export interface TestUser {
  id: string;
  email: string;
  accessToken: string;
}

export class RLSSecurityTester {
  private testUser1: TestUser | null = null;
  private testUser2: TestUser | null = null;

  /**
   * Initialize test users (this would typically be done in test setup)
   */
  async initializeTestUsers(): Promise<{ user1: TestUser; user2: TestUser }> {
    // In a real test environment, these users would be created via Supabase Auth
    // For now, we'll simulate the structure
    throw new Error('Test users must be created through Supabase Auth in test environment');
  }

  /**
   * Set authentication context for testing
   */
  private async setAuthContext(user: TestUser): Promise<void> {
    const { error } = await supabase.auth.setSession({
      access_token: user.accessToken,
      refresh_token: '', // Would be provided in real test
    });
    
    if (error) {
      throw new Error(`Failed to set auth context: ${error.message}`);
    }
  }

  /**
   * Test 1: Verify users can only access their own players
   */
  async testPlayersIsolation(): Promise<void> {
    if (!this.testUser1 || !this.testUser2) {
      throw new Error('Test users not initialized');
    }

    // Test as User 1: Create a player
    await this.setAuthContext(this.testUser1);
    
    const { data: user1Player, error: createError } = await supabase
      .from('players')
      .insert({
        name: 'Test Player User 1',
        user_id: this.testUser1.id,
        is_goalie: false,
        received_fair_play_card: false
      })
      .select()
      .single();

    if (createError || !user1Player) {
      throw new Error(`User 1 failed to create player: ${createError?.message}`);
    }

    // Test as User 2: Try to access User 1's player (should fail)
    await this.setAuthContext(this.testUser2);
    
    const { data: unauthorizedAccess, error: accessError } = await supabase
      .from('players')
      .select('*')
      .eq('id', user1Player.id);

    // This should return empty array, not the player
    if (unauthorizedAccess && unauthorizedAccess.length > 0) {
      throw new Error('SECURITY BREACH: User 2 can access User 1\'s player data');
    }

    // Test as User 2: Try to update User 1's player (should fail)
    const { error: updateError } = await supabase
      .from('players')
      .update({ name: 'Hacked Name' })
      .eq('id', user1Player.id);

    // Update should fail or affect 0 rows
    if (!updateError) {
      // Check if the player name was actually changed
      await this.setAuthContext(this.testUser1);
      const { data: checkPlayer } = await supabase
        .from('players')
        .select('name')
        .eq('id', user1Player.id)
        .single();
      
      if (checkPlayer?.name === 'Hacked Name') {
        throw new Error('SECURITY BREACH: User 2 successfully modified User 1\'s player');
      }
    }

    console.log('✅ Players isolation test passed');
  }

  /**
   * Test 2: Verify users can only access their own seasons
   */
  async testSeasonsIsolation(): Promise<void> {
    if (!this.testUser1 || !this.testUser2) {
      throw new Error('Test users not initialized');
    }

    // Test as User 1: Create a season
    await this.setAuthContext(this.testUser1);
    
    const { data: user1Season, error: createError } = await supabase
      .from('seasons')
      .insert({
        name: 'Test Season User 1',
        user_id: this.testUser1.id,
        location: 'Test Location'
      })
      .select()
      .single();

    if (createError || !user1Season) {
      throw new Error(`User 1 failed to create season: ${createError?.message}`);
    }

    // Test as User 2: Try to access User 1's season (should fail)
    await this.setAuthContext(this.testUser2);
    
    const { data: unauthorizedAccess } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', user1Season.id);

    if (unauthorizedAccess && unauthorizedAccess.length > 0) {
      throw new Error('SECURITY BREACH: User 2 can access User 1\'s season data');
    }

    console.log('✅ Seasons isolation test passed');
  }

  /**
   * Test 3: Verify users can only access their own tournaments
   */
  async testTournamentsIsolation(): Promise<void> {
    if (!this.testUser1 || !this.testUser2) {
      throw new Error('Test users not initialized');
    }

    // Test as User 1: Create a tournament
    await this.setAuthContext(this.testUser1);
    
    const { data: user1Tournament, error: createError } = await supabase
      .from('tournaments')
      .insert({
        name: 'Test Tournament User 1',
        user_id: this.testUser1.id,
        location: 'Test Location'
      })
      .select()
      .single();

    if (createError || !user1Tournament) {
      throw new Error(`User 1 failed to create tournament: ${createError?.message}`);
    }

    // Test as User 2: Try to access User 1's tournament (should fail)
    await this.setAuthContext(this.testUser2);
    
    const { data: unauthorizedAccess } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', user1Tournament.id);

    if (unauthorizedAccess && unauthorizedAccess.length > 0) {
      throw new Error('SECURITY BREACH: User 2 can access User 1\'s tournament data');
    }

    console.log('✅ Tournaments isolation test passed');
  }

  /**
   * Test 4: Verify users can only access their own games and related data
   */
  async testGamesIsolation(): Promise<void> {
    if (!this.testUser1 || !this.testUser2) {
      throw new Error('Test users not initialized');
    }

    // Test as User 1: Create a game
    await this.setAuthContext(this.testUser1);
    
    const { data: user1Game, error: createError } = await supabase
      .from('games')
      .insert({
        user_id: this.testUser1.id,
        team_name: 'Test Team',
        opponent_name: 'Test Opponent',
        game_date: '2025-07-29',
        home_or_away: 'home',
        number_of_periods: 2,
        period_duration_minutes: 45
      })
      .select()
      .single();

    if (createError || !user1Game) {
      throw new Error(`User 1 failed to create game: ${createError?.message}`);
    }

    // Test as User 2: Try to access User 1's game (should fail)
    await this.setAuthContext(this.testUser2);
    
    const { data: unauthorizedAccess } = await supabase
      .from('games')
      .select('*')
      .eq('id', user1Game.id);

    if (unauthorizedAccess && unauthorizedAccess.length > 0) {
      throw new Error('SECURITY BREACH: User 2 can access User 1\'s game data');
    }

    console.log('✅ Games isolation test passed');
  }

  /**
   * Test 5: Verify related game tables (game_players, game_events, etc.) are properly isolated
   */
  async testGameRelatedTablesIsolation(): Promise<void> {
    if (!this.testUser1 || !this.testUser2) {
      throw new Error('Test users not initialized');
    }

    // First create necessary data as User 1
    await this.setAuthContext(this.testUser1);
    
    // Create a player
    const { data: player } = await supabase
      .from('players')
      .insert({
        name: 'Test Player',
        user_id: this.testUser1.id
      })
      .select()
      .single();

    // Create a game
    const { data: game } = await supabase
      .from('games')
      .insert({
        user_id: this.testUser1.id,
        team_name: 'Test Team',
        opponent_name: 'Test Opponent',
        game_date: '2025-07-29',
        home_or_away: 'home',
        number_of_periods: 2,
        period_duration_minutes: 45
      })
      .select()
      .single();

    if (!player || !game) {
      throw new Error('Failed to create test data');
    }

    // Create game_player entry
    const { data: gamePlayer } = await supabase
      .from('game_players')
      .insert({
        game_id: game.id,
        player_id: player.id,
        rel_x: 0.5,
        rel_y: 0.5,
        is_on_field: true
      })
      .select()
      .single();

    // Create game_event entry
    const { data: gameEvent } = await supabase
      .from('game_events')
      .insert({
        game_id: game.id,
        event_type: 'goal',
        time_seconds: 600,
        scorer_id: player.id
      })
      .select()
      .single();

    if (!gamePlayer || !gameEvent) {
      throw new Error('Failed to create game-related test data');
    }

    // Test as User 2: Try to access User 1's game-related data (should fail)
    await this.setAuthContext(this.testUser2);

    // Test game_players access
    const { data: unauthorizedGamePlayers } = await supabase
      .from('game_players')
      .select('*')
      .eq('id', gamePlayer.id);

    if (unauthorizedGamePlayers && unauthorizedGamePlayers.length > 0) {
      throw new Error('SECURITY BREACH: User 2 can access User 1\'s game_players data');
    }

    // Test game_events access
    const { data: unauthorizedGameEvents } = await supabase
      .from('game_events')
      .select('*')
      .eq('id', gameEvent.id);

    if (unauthorizedGameEvents && unauthorizedGameEvents.length > 0) {
      throw new Error('SECURITY BREACH: User 2 can access User 1\'s game_events data');
    }

    console.log('✅ Game-related tables isolation test passed');
  }

  /**
   * Test 6: Verify app_settings isolation
   */
  async testAppSettingsIsolation(): Promise<void> {
    if (!this.testUser1 || !this.testUser2) {
      throw new Error('Test users not initialized');
    }

    // Test as User 1: Create app settings
    await this.setAuthContext(this.testUser1);
    
    const { data: user1Settings, error: createError } = await supabase
      .from('app_settings')
      .insert({
        user_id: this.testUser1.id,
        language: 'en',
        has_seen_app_guide: true
      })
      .select()
      .single();

    if (createError || !user1Settings) {
      throw new Error(`User 1 failed to create app settings: ${createError?.message}`);
    }

    // Test as User 2: Try to access User 1's settings (should fail)
    await this.setAuthContext(this.testUser2);
    
    const { data: unauthorizedAccess } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', user1Settings.id);

    if (unauthorizedAccess && unauthorizedAccess.length > 0) {
      throw new Error('SECURITY BREACH: User 2 can access User 1\'s app settings');
    }

    console.log('✅ App settings isolation test passed');
  }

  /**
   * Test 7: Verify timer_states isolation
   */
  async testTimerStatesIsolation(): Promise<void> {
    if (!this.testUser1 || !this.testUser2) {
      throw new Error('Test users not initialized');
    }

    // First create a game as User 1
    await this.setAuthContext(this.testUser1);
    
    const { data: game } = await supabase
      .from('games')
      .insert({
        user_id: this.testUser1.id,
        team_name: 'Test Team',
        opponent_name: 'Test Opponent',
        game_date: '2025-07-29',
        home_or_away: 'home',
        number_of_periods: 2,
        period_duration_minutes: 45
      })
      .select()
      .single();

    if (!game) {
      throw new Error('Failed to create test game');
    }

    // Create timer state
    const { data: user1Timer, error: createError } = await supabase
      .from('timer_states')
      .insert({
        user_id: this.testUser1.id,
        game_id: game.id,
        time_elapsed_seconds: 300,
        timestamp: Date.now()
      })
      .select()
      .single();

    if (createError || !user1Timer) {
      throw new Error(`User 1 failed to create timer state: ${createError?.message}`);
    }

    // Test as User 2: Try to access User 1's timer state (should fail)
    await this.setAuthContext(this.testUser2);
    
    const { data: unauthorizedAccess } = await supabase
      .from('timer_states')
      .select('*')
      .eq('id', user1Timer.id);

    if (unauthorizedAccess && unauthorizedAccess.length > 0) {
      throw new Error('SECURITY BREACH: User 2 can access User 1\'s timer states');
    }

    console.log('✅ Timer states isolation test passed');
  }

  /**
   * Run all RLS security tests
   */
  async runAllTests(): Promise<void> {
    console.log('🔒 Starting RLS Security Test Suite...\n');

    try {
      await this.testPlayersIsolation();
      await this.testSeasonsIsolation();
      await this.testTournamentsIsolation();
      await this.testGamesIsolation();
      await this.testGameRelatedTablesIsolation();
      await this.testAppSettingsIsolation();
      await this.testTimerStatesIsolation();

      console.log('\n🎉 ALL RLS SECURITY TESTS PASSED!');
      console.log('✅ Data isolation between users is properly enforced');
      console.log('✅ App is ready for production deployment from a security perspective');
      
    } catch (error) {
      console.error('\n🚨 RLS SECURITY TEST FAILED!');
      console.error('❌ CRITICAL SECURITY ISSUE DETECTED');
      console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
      console.error('\n⚠️  DO NOT DEPLOY TO PRODUCTION UNTIL THIS IS FIXED!');
      throw error;
    }
  }
}

/**
 * Utility function to run security tests in development/test environments
 */
export async function runRLSSecurityAudit(): Promise<void> {
  const tester = new RLSSecurityTester();
  
  try {
    // In a real test environment, you would initialize actual test users here
    // const { user1, user2 } = await tester.initializeTestUsers();
    
    console.log('⚠️  RLS Security Test Suite requires test users to be set up');
    console.log('This should be run in a test environment with proper test user setup');
    
    // await tester.runAllTests();
    
  } catch (error) {
    console.error('Failed to run RLS security audit:', error);
    throw error;
  }
}