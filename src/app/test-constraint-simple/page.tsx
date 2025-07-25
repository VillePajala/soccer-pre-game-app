'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function TestConstraintSimplePage() {
  const { user } = useAuth();
  const [results, setResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const testGameSave = async () => {
    if (!user) {
      setResults(['ERROR: Not authenticated']);
      return;
    }

    setLoading(true);
    const testResults: string[] = [];
    
    // Test with exact values the constraint expects
    const testGame = {
      user_id: user.id,
      team_name: 'Test',
      opponent_name: 'Test',
      game_date: '2025-01-25',
      home_score: 0,
      away_score: 0,
      home_or_away: 'home',
      number_of_periods: 2,
      period_duration_minutes: 45,
      current_period: 1,
      game_status: 'notStarted',
      is_played: false
    };

    try {
      testResults.push('Testing game insert with notStarted...');
      const { data, error } = await supabase
        .from('games')
        .insert(testGame)
        .select()
        .single();

      if (error) {
        testResults.push(`❌ Error: ${error.message}`);
        testResults.push(`Full error: ${JSON.stringify(error, null, 2)}`);
      } else {
        testResults.push(`✅ Success! Game ID: ${data.id}`);
        // Clean up
        await supabase.from('games').delete().eq('id', data.id);
      }
    } catch (err) {
      testResults.push(`❌ Exception: ${err}`);
    }

    // Also test "finished" status
    try {
      testResults.push('\\nTesting game insert with finished...');
      const finishedGame = { ...testGame, game_status: 'finished', is_played: true };
      const { data, error } = await supabase
        .from('games')
        .insert(finishedGame)
        .select()
        .single();

      if (error) {
        testResults.push(`❌ Error: ${error.message}`);
      } else {
        testResults.push(`✅ Success! Game ID: ${data.id}`);
        // Clean up
        await supabase.from('games').delete().eq('id', data.id);
      }
    } catch (err) {
      testResults.push(`❌ Exception: ${err}`);
    }

    setResults(testResults);
    setLoading(false);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Simple Constraint Test</h1>
      
      <div className="mb-6">
        <button
          onClick={testGameSave}
          disabled={loading || !user}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Game Save'}
        </button>
      </div>

      {!user && (
        <p className="text-red-600 mb-4">You must be signed in to test</p>
      )}

      {results.length > 0 && (
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
          {results.map((result, i) => (
            <div key={i} className={
              result.includes('✅') ? 'text-green-400' : 
              result.includes('❌') ? 'text-red-400' : 
              'text-gray-300'
            }>
              {result}
            </div>
          ))}
        </div>
      )}

      <div className="mt-8">
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          Back to App
        </button>
      </div>
    </div>
  );
}