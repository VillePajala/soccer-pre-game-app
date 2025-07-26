'use client';

import { useState, useEffect } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { useAuthStorage } from '@/hooks/useAuthStorage';

export default function CheckDuplicateGamesPage() {
  const { user } = useAuth();
  useAuthStorage();
  const [output, setOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const runCheck = async () => {
    setLoading(true);
    const log: string[] = [];
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const games = await storageManager.getSavedGames() as Record<string, any>;
      
      log.push('=== DUPLICATE GAMES CHECK ===');
      log.push(`Total games: ${Object.keys(games).length}\n`);
      
      // Group games by key attributes to find duplicates
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type GameGroup = { id: string; game: any };
      const gameGroups = new Map<string, Array<GameGroup>>();
      
      Object.entries(games).forEach(([id, game]) => {
        // Create a key from unique game attributes
        const key = `${game.teamName}|${game.opponentName}|${game.gameDate}`;
        
        if (!gameGroups.has(key)) {
          gameGroups.set(key, []);
        }
        
        gameGroups.get(key)!.push({ id, game });
      });
      
      // Find groups with duplicates
      let duplicateCount = 0;
      gameGroups.forEach((group, key) => {
        if (group.length > 1) {
          duplicateCount++;
          log.push(`\nDuplicate set ${duplicateCount}: ${key}`);
          log.push(`Found ${group.length} copies:`);
          
          group.forEach((item) => {
            log.push(`  - ID: ${item.id}`);
            log.push(`    Has events: ${item.game.gameEvents?.length || 0}`);
            log.push(`    Is played: ${item.game.isPlayed}`);
            log.push(`    Selected players: ${item.game.selectedPlayerIds?.length || 0}`);
            
            // Show sample player IDs to see which version has old vs new IDs
            if (item.game.selectedPlayerIds && item.game.selectedPlayerIds.length > 0) {
              log.push(`    Sample player IDs: ${item.game.selectedPlayerIds.slice(0, 3).join(', ')}`);
            }
          });
        }
      });
      
      if (duplicateCount === 0) {
        log.push('\n✅ No duplicate games found');
      } else {
        log.push(`\n❌ Found ${duplicateCount} sets of duplicate games`);
        log.push(`This explains why you have ${Object.keys(games).length} games instead of 33`);
      }
      
      // Check ID patterns
      log.push('\n=== ID PATTERN ANALYSIS ===');
      let oldIdCount = 0;
      let newIdCount = 0;
      
      Object.entries(games).forEach(([, game]) => {
        if (game.selectedPlayerIds && Array.isArray(game.selectedPlayerIds)) {
          const hasOldIds = game.selectedPlayerIds.some((pid: string) => 
            pid.startsWith('p') || pid.startsWith('player-')
          );
          const hasNewIds = game.selectedPlayerIds.some((pid: string) => 
            pid.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
          );
          
          if (hasOldIds) oldIdCount++;
          if (hasNewIds) newIdCount++;
        }
      });
      
      log.push(`Games with old-style player IDs: ${oldIdCount}`);
      log.push(`Games with UUID player IDs: ${newIdCount}`);
      
    } catch (error) {
      log.push(`Error: ${error}`);
    }
    
    setOutput(log);
    setLoading(false);
  };

  useEffect(() => {
    if (user) {
      runCheck();
    }
  }, [user]);

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Check Duplicate Games</h1>
      
      <button
        onClick={runCheck}
        disabled={loading}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {loading ? 'Running...' : 'Re-run Check'}
      </button>
      
      <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs whitespace-pre-wrap">
        {output.join('\n')}
      </pre>
      
      <div className="mt-4 p-4 bg-yellow-100 rounded">
        <h2 className="font-bold">What this checks:</h2>
        <ul className="list-disc list-inside mt-2">
          <li>Identifies duplicate games (same teams and date)</li>
          <li>Shows which version has old vs new player IDs</li>
          <li>Helps explain why there are more games than expected</li>
        </ul>
      </div>
    </div>
  );
}