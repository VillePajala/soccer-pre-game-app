#!/usr/bin/env node

/**
 * RLS Policy Testing Script
 * 
 * This script validates that Row Level Security policies are working correctly
 * by testing data isolation between different authenticated users.
 * 
 * Usage: node scripts/test-rls-policies.mjs
 * 
 * Requirements:
 * - Two test user accounts in Supabase
 * - Environment variables with test user credentials
 * - Supabase configuration
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Test user credentials (these should be set in your test environment)
const TEST_USER_1_EMAIL = process.env.TEST_USER_1_EMAIL;
const TEST_USER_1_PASSWORD = process.env.TEST_USER_1_PASSWORD;
const TEST_USER_2_EMAIL = process.env.TEST_USER_2_EMAIL;
const TEST_USER_2_PASSWORD = process.env.TEST_USER_2_PASSWORD;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase configuration missing');
  console.error('Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

if (!TEST_USER_1_EMAIL || !TEST_USER_1_PASSWORD || !TEST_USER_2_EMAIL || !TEST_USER_2_PASSWORD) {
  console.error('❌ Test user credentials missing');
  console.error('Please set TEST_USER_1_EMAIL, TEST_USER_1_PASSWORD, TEST_USER_2_EMAIL, TEST_USER_2_PASSWORD');
  console.error('');
  console.error('To create test users, run this SQL in your Supabase SQL editor:');
  console.error('');
  console.error('-- Create test user 1');
  console.error(\"INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)\");
  console.error(\"VALUES (gen_random_uuid(), 'test1@example.com', crypt('testpass123', gen_salt('bf')), NOW(), NOW(), NOW());\");
  console.error('');
  console.error('-- Create test user 2');
  console.error(\"INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)\");
  console.error(\"VALUES (gen_random_uuid(), 'test2@example.com', crypt('testpass123', gen_salt('bf')), NOW(), NOW(), NOW());\");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

class RLSPolicyTester {
  constructor() {
    this.testResults = [];
    this.user1Session = null;
    this.user2Session = null;
  }

  async setup() {
    console.log('🔑 Setting up test users...');
    
    // Sign in as user 1
    const { data: user1Data, error: user1Error } = await supabase.auth.signInWithPassword({
      email: TEST_USER_1_EMAIL,
      password: TEST_USER_1_PASSWORD,
    });

    if (user1Error || !user1Data.session) {
      throw new Error(`Failed to sign in user 1: ${user1Error?.message}`);
    }

    this.user1Session = user1Data.session;
    console.log(`✅ User 1 signed in: ${user1Data.user?.email}`);

    // Sign out and sign in as user 2
    await supabase.auth.signOut();

    const { data: user2Data, error: user2Error } = await supabase.auth.signInWithPassword({
      email: TEST_USER_2_EMAIL,
      password: TEST_USER_2_PASSWORD,
    });

    if (user2Error || !user2Data.session) {
      throw new Error(`Failed to sign in user 2: ${user2Error?.message}`);
    }

    this.user2Session = user2Data.session;
    console.log(`✅ User 2 signed in: ${user2Data.user?.email}`);
  }

  async setAuthContext(session) {
    const { error } = await supabase.auth.setSession(session);
    if (error) {
      throw new Error(`Failed to set auth context: ${error.message}`);
    }
  }

  async testPlayersIsolation() {
    console.log('\\n🧪 Testing players table isolation...');

    // User 1 creates a player
    await this.setAuthContext(this.user1Session);
    
    const { data: player, error: createError } = await supabase
      .from('players')
      .insert({
        name: 'RLS Test Player User 1',
        is_goalie: false,
        received_fair_play_card: false
      })
      .select()
      .single();

    if (createError || !player) {
      throw new Error(`User 1 failed to create player: ${createError?.message}`);
    }

    console.log(`  ✅ User 1 created player: ${player.name}`);

    // User 2 tries to access User 1's player
    await this.setAuthContext(this.user2Session);
    
    const { data: unauthorizedAccess, error: accessError } = await supabase
      .from('players')
      .select('*')
      .eq('id', player.id);

    if (unauthorizedAccess && unauthorizedAccess.length > 0) {
      throw new Error('SECURITY BREACH: User 2 can access User 1\\'s player');
    }

    console.log('  ✅ User 2 cannot access User 1\\'s player');

    // User 2 tries to update User 1's player
    const { data: updateData, error: updateError } = await supabase
      .from('players')
      .update({ name: 'Hacked Name' })
      .eq('id', player.id)
      .select();

    if (updateData && updateData.length > 0) {
      throw new Error('SECURITY BREACH: User 2 can modify User 1\\'s player');
    }

    console.log('  ✅ User 2 cannot modify User 1\\'s player');

    // Cleanup
    await this.setAuthContext(this.user1Session);
    await supabase.from('players').delete().eq('id', player.id);

    this.testResults.push({ test: 'players_isolation', status: 'PASSED' });
  }

  async testGamesIsolation() {
    console.log('\\n🧪 Testing games table isolation...');

    // User 1 creates a game
    await this.setAuthContext(this.user1Session);
    
    const { data: game, error: createError } = await supabase
      .from('games')
      .insert({
        team_name: 'RLS Test Team',
        opponent_name: 'RLS Test Opponent',
        game_date: '2025-07-29',
        home_or_away: 'home',
        number_of_periods: 2,
        period_duration_minutes: 45
      })
      .select()
      .single();

    if (createError || !game) {
      throw new Error(`User 1 failed to create game: ${createError?.message}`);
    }

    console.log(`  ✅ User 1 created game: ${game.team_name} vs ${game.opponent_name}`);

    // User 2 tries to access User 1's game
    await this.setAuthContext(this.user2Session);
    
    const { data: unauthorizedAccess } = await supabase
      .from('games')
      .select('*')
      .eq('id', game.id);

    if (unauthorizedAccess && unauthorizedAccess.length > 0) {
      throw new Error('SECURITY BREACH: User 2 can access User 1\\'s game');
    }

    console.log('  ✅ User 2 cannot access User 1\\'s game');

    // Cleanup
    await this.setAuthContext(this.user1Session);
    await supabase.from('games').delete().eq('id', game.id);

    this.testResults.push({ test: 'games_isolation', status: 'PASSED' });
  }

  async testAppSettingsIsolation() {
    console.log('\\n🧪 Testing app_settings table isolation...');

    // User 1 creates app settings
    await this.setAuthContext(this.user1Session);
    
    const { data: settings, error: createError } = await supabase
      .from('app_settings')
      .upsert({
        language: 'en',
        has_seen_app_guide: true
      })
      .select()
      .single();

    if (createError || !settings) {
      throw new Error(`User 1 failed to create app settings: ${createError?.message}`);
    }

    console.log('  ✅ User 1 created app settings');

    // User 2 tries to access User 1's settings
    await this.setAuthContext(this.user2Session);
    
    const { data: unauthorizedAccess } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', settings.id);

    if (unauthorizedAccess && unauthorizedAccess.length > 0) {
      throw new Error('SECURITY BREACH: User 2 can access User 1\\'s app settings');
    }

    console.log('  ✅ User 2 cannot access User 1\\'s app settings');

    // Cleanup
    await this.setAuthContext(this.user1Session);
    await supabase.from('app_settings').delete().eq('id', settings.id);

    this.testResults.push({ test: 'app_settings_isolation', status: 'PASSED' });
  }

  async testGameRelatedTablesIsolation() {
    console.log('\\n🧪 Testing game-related tables isolation...');

    // User 1 creates test data
    await this.setAuthContext(this.user1Session);
    
    // Create player
    const { data: player } = await supabase
      .from('players')
      .insert({
        name: 'RLS Test Player',
        is_goalie: false
      })
      .select()
      .single();

    // Create game
    const { data: game } = await supabase
      .from('games')
      .insert({
        team_name: 'RLS Test Team',
        opponent_name: 'RLS Test Opponent',
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

    // Create game_event
    const { data: gameEvent } = await supabase
      .from('game_events')
      .insert({
        game_id: game.id,
        event_type: 'goal',
        time_seconds: 300,
        scorer_id: player.id
      })
      .select()
      .single();

    console.log('  ✅ User 1 created game event');

    // User 2 tries to access User 1's game event
    await this.setAuthContext(this.user2Session);
    
    const { data: unauthorizedAccess } = await supabase
      .from('game_events')
      .select('*')
      .eq('id', gameEvent.id);

    if (unauthorizedAccess && unauthorizedAccess.length > 0) {
      throw new Error('SECURITY BREACH: User 2 can access User 1\\'s game events');
    }

    console.log('  ✅ User 2 cannot access User 1\\'s game events');

    // Cleanup
    await this.setAuthContext(this.user1Session);
    await supabase.from('game_events').delete().eq('id', gameEvent.id);
    await supabase.from('games').delete().eq('id', game.id);
    await supabase.from('players').delete().eq('id', player.id);

    this.testResults.push({ test: 'game_related_isolation', status: 'PASSED' });
  }

  async runAllTests() {
    console.log('🔒 Starting RLS Policy Security Tests');
    console.log('=====================================');

    try {
      await this.setup();
      await this.testPlayersIsolation();
      await this.testGamesIsolation();
      await this.testAppSettingsIsolation();
      await this.testGameRelatedTablesIsolation();

      console.log('\\n🎉 ALL RLS TESTS PASSED!');
      console.log('=====================================');
      console.log('✅ Data isolation is working correctly');
      console.log('✅ Users cannot access each other\\'s data');
      console.log('✅ App is secure for production deployment');

      // Display results summary
      console.log('\\n📊 Test Results Summary:');
      this.testResults.forEach(result => {
        console.log(`  ${result.status === 'PASSED' ? '✅' : '❌'} ${result.test}: ${result.status}`);
      });

    } catch (error) {
      console.error('\\n🚨 RLS SECURITY TEST FAILED!');
      console.error('=====================================');
      console.error('❌ CRITICAL SECURITY ISSUE DETECTED');
      console.error(`Error: ${error.message}`);
      console.error('\\n⚠️  DO NOT DEPLOY TO PRODUCTION UNTIL THIS IS FIXED!');
      
      process.exit(1);
    } finally {
      // Cleanup: sign out
      await supabase.auth.signOut();
    }
  }
}

// Run the tests
const tester = new RLSPolicyTester();
tester.runAllTests().catch(console.error);