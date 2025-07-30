'use client';

import { useState } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { getSavedGames } from '@/utils/savedGames';
import { useAuth } from '@/context/AuthContext';

export default function DebugLoadGames() {
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const checkAuthState = async () => {
    setLoading(true);
    try {
      const authState = (storageManager as any).getAuthState();
      setResult(prev => prev + '\nAuth State: ' + JSON.stringify(authState, null, 2));
      setResult(prev => prev + '\nUser from useAuth: ' + (user ? user.email : 'null'));
    } catch (error) {
      setResult(prev => prev + '\nAuth State Error: ' + error);
    }
    setLoading(false);
  };

  const testDirectSupabase = async () => {
    setLoading(true);
    try {
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      
      const { data: { user } } = await supabase.auth.getUser();
      setResult(prev => prev + '\nDirect Supabase User: ' + (user ? user.email : 'null'));
      
      if (user) {
        const { data, error } = await supabase.from('games').select('id').eq('user_id', user.id);
        if (error) {
          setResult(prev => prev + '\nSupabase Query Error: ' + JSON.stringify(error));
        } else {
          setResult(prev => prev + '\nGames found: ' + (data ? data.length : 0));
        }
      }
    } catch (error) {
      setResult(prev => prev + '\nDirect Supabase Error: ' + error);
    }
    setLoading(false);
  };

  const testGetSavedGames = async () => {
    setLoading(true);
    try {
      setResult(prev => prev + '\nCalling getSavedGames...');
      const games = await getSavedGames();
      setResult(prev => prev + '\nGames object: ' + JSON.stringify(Object.keys(games).length) + ' games found');
      setResult(prev => prev + '\nFirst few game IDs: ' + Object.keys(games).slice(0, 3).join(', '));
    } catch (error) {
      setResult(prev => prev + '\ngetSavedGames Error: ' + error);
    }
    setLoading(false);
  };

  const testStorageManager = async () => {
    setLoading(true);
    try {
      setResult(prev => prev + '\nCalling storageManager.getSavedGames directly...');
      const games = await storageManager.getSavedGames();
      setResult(prev => prev + '\nStorage Manager Games: ' + JSON.stringify(games ? Object.keys(games).length : 'null'));
    } catch (error) {
      setResult(prev => prev + '\nStorage Manager Error: ' + error);
    }
    setLoading(false);
  };

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-white">
      <h1 className="text-2xl mb-4">Debug Load Games</h1>
      
      <div className="space-y-4 mb-8">
        <button 
          onClick={checkAuthState}
          disabled={loading}
          className="bg-blue-600 px-4 py-2 rounded disabled:opacity-50"
        >
          Check Auth State
        </button>
        
        <button 
          onClick={testDirectSupabase}
          disabled={loading}
          className="bg-green-600 px-4 py-2 rounded disabled:opacity-50 ml-4"
        >
          Test Direct Supabase
        </button>
        
        <button 
          onClick={testStorageManager}
          disabled={loading}
          className="bg-purple-600 px-4 py-2 rounded disabled:opacity-50 ml-4"
        >
          Test Storage Manager
        </button>
        
        <button 
          onClick={testGetSavedGames}
          disabled={loading}
          className="bg-orange-600 px-4 py-2 rounded disabled:opacity-50 ml-4"
        >
          Test getSavedGames
        </button>
      </div>
      
      <pre className="bg-gray-800 p-4 rounded whitespace-pre-wrap">
        {result || 'Click a button to test'}
      </pre>
    </div>
  );
}