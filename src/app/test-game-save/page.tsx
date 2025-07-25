'use client';

import { useState } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function TestGameSavePage() {
  const { user } = useAuth();
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    console.log(message);
  };

  const testDirectSupabaseSave = async () => {
    if (!user) {
      addLog('ERROR: Not authenticated');
      return;
    }

    setLoading(true);
    setLog([]);
    
    try {
      addLog('Testing direct Supabase save...');
      
      // Create a simple test game
      const testGame = {
        user_id: user.id,
        team_name: 'Test Team',
        opponent_name: 'Test Opponent',
        game_date: '2025-01-25',
        home_score: 2,
        away_score: 1,
        home_or_away: 'home',
        game_notes: 'Test game from test-game-save page',
        number_of_periods: 2,
        period_duration_minutes: 45,
        current_period: 2,
        game_status: 'game_end',
        is_played: true,
        season_id: null,
        tournament_id: null,
        game_location: 'Test Field',
        game_time: '14:00',
        game_data: {
          teamName: 'Test Team',
          opponentName: 'Test Opponent',
          gameDate: '2025-01-25',
          homeScore: 2,
          awayScore: 1
        }
      };

      addLog('Game data: ' + JSON.stringify(testGame, null, 2));
      
      // Try to insert directly
      const { data, error } = await supabase
        .from('games')
        .insert(testGame)
        .select()
        .single();
        
      if (error) {
        addLog('ERROR inserting game: ' + JSON.stringify(error, null, 2));
      } else {
        addLog('SUCCESS! Game saved with ID: ' + data.id);
        addLog('Saved game: ' + JSON.stringify(data, null, 2));
      }
      
      // Now try through storage manager
      addLog('\\nTesting through storage manager...');
      addLog('Current storage provider: ' + (storageManager.getProviderName?.() || 'unknown'));
      const testGameForManager = {
        teamName: 'Manager Test Team',
        opponentName: 'Manager Test Opponent',
        gameDate: '2025-01-25',
        homeScore: 3,
        awayScore: 2,
        homeOrAway: 'away',
        gameNotes: 'Test from storage manager',
        numberOfPeriods: 2,
        periodDurationMinutes: 45,
        currentPeriod: 2,
        gameStatus: 'gameEnd',
        isPlayed: true
      };
      
      try {
        const savedGame = await storageManager.saveSavedGame(testGameForManager);
        addLog('Storage manager SUCCESS! Saved: ' + JSON.stringify(savedGame, null, 2));
      } catch (err) {
        addLog('Storage manager ERROR: ' + err);
      }
      
    } catch (error) {
      addLog('CRITICAL ERROR: ' + error);
    } finally {
      setLoading(false);
    }
  };

  const checkGamesTable = async () => {
    if (!user) {
      addLog('ERROR: Not authenticated');
      return;
    }

    addLog('\\nChecking games table...');
    const { data, error } = await supabase
      .from('games')
      .select('id, team_name, opponent_name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5);
      
    if (error) {
      addLog('ERROR checking games: ' + JSON.stringify(error));
    } else {
      addLog(`Found ${data?.length || 0} games:`);
      data?.forEach((game: { id: string; team_name: string; opponent_name: string }, i: number) => {
        addLog(`${i + 1}. ${game.team_name} vs ${game.opponent_name} (${game.id.substring(0, 8)}...)`);
      });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Test Game Save</h1>
      
      <div className="mb-6 space-x-4">
        <button
          onClick={testDirectSupabaseSave}
          disabled={loading || !user}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Save Game'}
        </button>
        
        <button
          onClick={checkGamesTable}
          disabled={loading || !user}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          Check Games Table
        </button>
      </div>

      {!user && (
        <p className="mb-4 text-red-600">You must be signed in to test</p>
      )}

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-auto max-h-96">
        <h2 className="text-lg font-bold mb-2">Log:</h2>
        {log.length === 0 ? (
          <p className="text-gray-500">No activity yet...</p>
        ) : (
          log.map((line, i) => (
            <div key={i} className={
              line.includes('ERROR') ? 'text-red-400' : 
              line.includes('SUCCESS') ? 'text-green-400' : 
              'text-gray-300'
            }>
              {line}
            </div>
          ))
        )}
      </div>

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