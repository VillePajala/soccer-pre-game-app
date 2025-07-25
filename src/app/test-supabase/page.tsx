'use client';

import { useState } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { supabase } from '@/lib/supabase';

export default function TestSupabasePage() {
  const [results, setResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    console.log(message);
    setResults(prev => [...prev, `${new Date().toISOString()}: ${message}`]);
  };

  const runTests = async () => {
    setResults([]);
    setIsLoading(true);

    try {
      // Test 1: Check provider
      const provider = storageManager.getProviderName?.() || 'unknown';
      addResult(`Current provider: ${provider}`);

      // Test 2: Check Supabase auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        addResult(`Auth error: ${authError.message}`);
      } else {
        addResult(`Authenticated: ${user ? 'Yes, user ID: ' + user.id : 'No'}`);
      }

      // Test 3: Try to create a test player
      if (user) {
        addResult('Attempting to create test player...');
        try {
          const testPlayer = {
            id: '',
            name: `Test Player ${Date.now()}`,
            jerseyNumber: '99',
            notes: 'Created by test page'
          };
          const savedPlayer = await storageManager.savePlayer(testPlayer);
          addResult(`Test player created: ${JSON.stringify(savedPlayer)}`);
          
          // Try to delete it
          if (savedPlayer.id) {
            await storageManager.deletePlayer(savedPlayer.id);
            addResult('Test player deleted successfully');
          }
        } catch (error) {
          addResult(`Error creating test player: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Test 4: List current players
      try {
        const players = await storageManager.getPlayers();
        addResult(`Current players count: ${players.length}`);
      } catch (error) {
        addResult(`Error getting players: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

    } catch (error) {
      addResult(`General error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Supabase Connection Test</h1>
      
      <button
        onClick={runTests}
        disabled={isLoading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 mb-4"
      >
        {isLoading ? 'Running Tests...' : 'Run Tests'}
      </button>

      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded">
        <h2 className="font-semibold mb-2">Test Results:</h2>
        {results.length === 0 ? (
          <p className="text-gray-500">Click "Run Tests" to start</p>
        ) : (
          <ul className="space-y-1 font-mono text-sm">
            {results.map((result, index) => (
              <li key={index} className="break-all">{result}</li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded">
        <p className="text-sm">
          This page tests your Supabase connection. Make sure you're logged in first!
        </p>
      </div>
    </div>
  );
}