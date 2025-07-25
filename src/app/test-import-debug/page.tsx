'use client';

import { useState } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { toSupabase } from '@/utils/transforms';
import { useAuth } from '@/context/AuthContext';

export default function TestImportDebugPage() {
  const { user } = useAuth();
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string) => {
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
    console.log(message);
  };

  const testGameImport = async () => {
    if (!user) {
      addLog('ERROR: Not authenticated');
      return;
    }

    setLoading(true);
    setLog([]);
    
    try {
      // Test game from the backup file format
      const testGame = {
        "teamName": "PePo Keltainen",
        "opponentName": "JIPPO/Valkoinen",
        "gameDate": "2025-06-14",
        "homeScore": 6,
        "awayScore": 10,
        "gameNotes": "",
        "homeOrAway": "away",
        "numberOfPeriods": 1,
        "periodDurationMinutes": 25,
        "currentPeriod": 1,
        "gameStatus": "gameEnd",
        "seasonId": "",
        "tournamentId": "tournament_1750516773105_h3nlikt",
        "gameLocation": "Mikkelin ravirata, kenttä 7",
        "gameTime": "13:00",
        "subIntervalMinutes": 5
      };

      addLog('Original game data:');
      addLog(JSON.stringify(testGame, null, 2));
      
      // Test transformation
      addLog('\n--- Testing transformation ---');
      const transformed = toSupabase.game(testGame, user.id);
      addLog('Transformed game:');
      addLog(JSON.stringify(transformed, null, 2));
      
      // Try to save through storage manager
      addLog('\n--- Testing save through storage manager ---');
      try {
        const result = await storageManager.saveSavedGame(testGame);
        addLog('SUCCESS! Saved game:');
        addLog(JSON.stringify(result, null, 2));
      } catch (error) {
        addLog(`ERROR saving game: ${error}`);
        if (error instanceof Error) {
          addLog(`Error details: ${error.message}`);
        }
      }
      
    } catch (error) {
      addLog(`CRITICAL ERROR: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const testBulkImport = async () => {
    if (!user) {
      addLog('ERROR: Not authenticated');
      return;
    }

    setLoading(true);
    
    try {
      // Simulate importing multiple games
      const gamesToImport = [
        {
          "teamName": "Test Team 1",
          "opponentName": "Opponent 1",
          "gameDate": "2025-01-20",
          "homeScore": 2,
          "awayScore": 1,
          "gameStatus": "gameEnd",
          "homeOrAway": "home"
        },
        {
          "teamName": "Test Team 2",
          "opponentName": "Opponent 2",
          "gameDate": "2025-01-21",
          "homeScore": 3,
          "awayScore": 3,
          "gameStatus": "gameEnd",
          "homeOrAway": "away"
        }
      ];

      addLog('\n--- Testing bulk import ---');
      let successCount = 0;
      
      for (const game of gamesToImport) {
        try {
          await storageManager.saveSavedGame(game);
          successCount++;
          addLog(`✓ Imported: ${game.teamName} vs ${game.opponentName}`);
        } catch (error) {
          addLog(`✗ Failed: ${game.teamName} vs ${game.opponentName} - ${error}`);
        }
      }
      
      addLog(`\nImported ${successCount}/${gamesToImport.length} games successfully`);
      
    } catch (error) {
      addLog(`CRITICAL ERROR: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Test Import Debug</h1>
      
      <div className="mb-6 space-x-4">
        <button
          onClick={testGameImport}
          disabled={loading || !user}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Single Game Import'}
        </button>
        
        <button
          onClick={testBulkImport}
          disabled={loading || !user}
          className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Testing...' : 'Test Bulk Import'}
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
              line.includes('SUCCESS') || line.includes('✓') ? 'text-green-400' : 
              line.includes('✗') ? 'text-red-400' :
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