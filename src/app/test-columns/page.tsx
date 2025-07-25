'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export default function TestColumnsPage() {
  const { user } = useAuth();
  const [columns, setColumns] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkColumns = async () => {
      try {
        // Try to get table info using a query that will fail but show column info
        const { error } = await supabase
          .from('games')
          .select()
          .limit(0);
          
        if (error) {
          setColumns(`Error (expected): ${error.message}`);
        } else {
          setColumns('Query succeeded - checking columns...');
        }
        
        // Also try to insert an empty game to see what columns are required
        if (user) {
          const { error: insertError } = await supabase
            .from('games')
            .insert({
              user_id: user.id
            });
            
          if (insertError) {
            setColumns(prev => prev + '\n\nInsert error (this shows required fields):\n' + insertError.message);
          }
        }
      } catch (err) {
        setColumns(`Error: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    checkColumns();
  }, [user]);

  const testMinimalGame = async () => {
    if (!user) {
      setColumns(prev => prev + '\n\nERROR: Not authenticated');
      return;
    }

    setColumns(prev => prev + '\n\nTesting minimal game insert...');
    
    // Start with absolute minimum and add fields until it works
    const minimalGame = {
      user_id: user.id,
      team_name: 'Minimal Test',
      opponent_name: 'Minimal Opponent',
      game_date: '2025-01-25'
    };

    const { data, error } = await supabase
      .from('games')
      .insert(minimalGame)
      .select()
      .single();
      
    if (error) {
      setColumns(prev => prev + '\n\nMinimal game error: ' + error.message);
      
      // Try adding more fields
      const gameWithMore = {
        ...minimalGame,
        home_or_away: 'home',
        game_status: 'notStarted'
      };
      
      const { error: error2 } = await supabase
        .from('games')
        .insert(gameWithMore)
        .select()
        .single();
        
      if (error2) {
        setColumns(prev => prev + '\n\nWith home_or_away and status: ' + error2.message);
      } else {
        setColumns(prev => prev + '\n\nSUCCESS with home_or_away and game_status!');
      }
    } else {
      setColumns(prev => prev + '\n\nSUCCESS with minimal fields! ID: ' + data.id);
      // Clean up
      await supabase.from('games').delete().eq('id', data.id);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Test Games Table Columns</h1>
      
      <div className="mb-4">
        <button
          onClick={testMinimalGame}
          disabled={!user}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Test Minimal Game Insert
        </button>
      </div>
      
      {loading ? (
        <p>Checking columns...</p>
      ) : (
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
          {columns}
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