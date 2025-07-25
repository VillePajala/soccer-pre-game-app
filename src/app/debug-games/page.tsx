'use client';

import { useState, useEffect } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { getSavedGames } from '@/utils/savedGames';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useAuthStorage } from '@/hooks/useAuthStorage';

export default function DebugGamesPage() {
  const { user } = useAuth();
  useAuthStorage(); // Ensure auth state is synced
  const [debugInfo, setDebugInfo] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const addInfo = (info: string) => {
    setDebugInfo(prev => [...prev, info]);
    console.log(info);
  };

  useEffect(() => {
    const debugGames = async () => {
      setDebugInfo([]);
      
      addInfo(`User authenticated: ${!!user}`);
      addInfo(`User ID: ${user?.id || 'none'}`);
      addInfo(`Storage manager provider: ${storageManager.getProviderName?.() || 'unknown'}`);
      
      // Check games via utility function
      addInfo('\n--- Checking games via getSavedGames() ---');
      try {
        const games = await getSavedGames();
        addInfo(`Type of games: ${typeof games}`);
        addInfo(`Is array: ${Array.isArray(games)}`);
        addInfo(`Keys: ${Object.keys(games).join(', ')}`);
        addInfo(`Number of games: ${Object.keys(games).length}`);
        
        // Show first few games
        const gameKeys = Object.keys(games).slice(0, 3);
        gameKeys.forEach(key => {
          const game = games[key];
          addInfo(`Game ${key}: ${game.teamName} vs ${game.opponentName}`);
        });
      } catch (error) {
        addInfo(`Error getting saved games: ${error}`);
      }
      
      // Check games directly from storage manager
      addInfo('\n--- Checking games via storageManager ---');
      try {
        const managerGames = await storageManager.getSavedGames();
        addInfo(`Type: ${typeof managerGames}`);
        addInfo(`Keys: ${Object.keys(managerGames as object).length}`);
      } catch (error) {
        addInfo(`Error: ${error}`);
      }
      
      // Check games directly from Supabase
      if (user) {
        addInfo('\n--- Checking games directly from Supabase ---');
        try {
          const { data, error } = await supabase
            .from('games')
            .select('id, team_name, opponent_name, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);
            
          if (error) {
            addInfo(`Supabase error: ${error.message}`);
          } else {
            addInfo(`Found ${data?.length || 0} games in Supabase`);
            data?.forEach((game) => {
              addInfo(`- ${game.team_name} vs ${game.opponent_name} (${game.id.substring(0, 8)}...)`);
            });
          }
        } catch (error) {
          addInfo(`Exception: ${error}`);
        }
      }
      
      // Check localStorage
      addInfo('\n--- Checking localStorage ---');
      const localGames = localStorage.getItem('savedGames');
      if (localGames) {
        try {
          const parsed = JSON.parse(localGames);
          addInfo(`localStorage has ${Object.keys(parsed).length} games`);
        } catch {
          addInfo('localStorage has invalid JSON');
        }
      } else {
        addInfo('No savedGames in localStorage');
      }
      
      setLoading(false);
    };

    debugGames();
  }, [user]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Debug Games Storage</h1>
      
      {loading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
          {debugInfo.join('\n')}
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