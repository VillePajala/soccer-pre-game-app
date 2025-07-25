'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export default function CheckGameConstraintsPage() {
  const [constraints, setConstraints] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkConstraints = async () => {
      try {
        // Query to get check constraints for games table
        const { data, error } = await supabase
          .rpc('get_table_constraints', { table_name: 'games' });
          
        if (error) {
          // Try alternative query if RPC doesn't exist
          const { data: tableInfo, error: tableError } = await supabase
            .from('games')
            .select()
            .limit(0);
            
          if (tableError) {
            setConstraints(`Error: ${tableError.message}`);
          } else {
            // Try to get column information
            const { data: columnsData, error: columnsError } = await supabase
              .rpc('get_column_info', { table_name: 'games', column_name: 'game_status' });
              
            if (columnsError) {
              setConstraints('Could not fetch constraint info. The game_status field likely has a check constraint limiting valid values.');
            } else {
              setConstraints(JSON.stringify(columnsData, null, 2));
            }
          }
        } else {
          setConstraints(JSON.stringify(data, null, 2));
        }
      } catch (err) {
        setConstraints(`Error: ${err}`);
      } finally {
        setLoading(false);
      }
    };

    checkConstraints();
  }, []);

  // Let's also try some common game status values
  const testGameStatuses = async () => {
    const statuses = [
      'notStarted',
      'not_started',
      'inProgress', 
      'in_progress',
      'periodEnd',
      'period_end',
      'gameEnd',
      'game_end',
      'completed',
      'finished'
    ];
    
    const results: string[] = [];
    
    for (const status of statuses) {
      try {
        const testGame = {
          user_id: '8e3a12a3-266f-4a0e-bc97-17bf12d58448',
          team_name: 'Test',
          opponent_name: 'Test',
          game_date: '2025-01-25',
          home_score: 0,
          away_score: 0,
          home_or_away: 'home',
          number_of_periods: 2,
          period_duration_minutes: 45,
          current_period: 1,
          game_status: status,
          is_played: false
        };
        
        const { error } = await supabase
          .from('games')
          .insert(testGame);
          
        if (error) {
          results.push(`❌ ${status}: ${error.message}`);
        } else {
          results.push(`✅ ${status}: Valid`);
          // Delete the test game
          await supabase
            .from('games')
            .delete()
            .eq('team_name', 'Test')
            .eq('opponent_name', 'Test');
        }
      } catch (err) {
        results.push(`❌ ${status}: ${err}`);
      }
    }
    
    setConstraints(prev => prev + '\\n\\nGame Status Test Results:\\n' + results.join('\\n'));
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Check Game Constraints</h1>
      
      <div className="mb-4">
        <button
          onClick={testGameStatuses}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Test Game Status Values
        </button>
      </div>
      
      {loading ? (
        <p>Checking constraints...</p>
      ) : (
        <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-sm whitespace-pre-wrap">
          {constraints}
        </div>
      )}
      
      <div className="mt-8">
        <p className="text-sm text-gray-600">
          The error "violates check constraint games_game_status_check" means the game_status 
          field only accepts specific values. We need to use snake_case values instead of camelCase.
        </p>
      </div>
    </div>
  );
}