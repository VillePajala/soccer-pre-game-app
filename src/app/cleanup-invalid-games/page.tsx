'use client';

import { useState } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import { useAuthStorage } from '@/hooks/useAuthStorage';

export default function CleanupInvalidGamesPage() {
  const { user } = useAuth();
  useAuthStorage();
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [...prev, `[${timestamp}] ${type.toUpperCase()}: ${message}`]);
  };

  const runCleanup = async () => {
    setLoading(true);
    setLog([]);
    
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const games = await storageManager.getSavedGames() as Record<string, any>;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const players = await storageManager.getPlayers() as any[];
      
      addLog(`Found ${Object.keys(games).length} total games`);
      addLog(`Found ${players.length} players in roster`);
      
      // Create a set of valid player IDs
      const validPlayerIds = new Set(players.map(p => p.id));
      
      // Find games with invalid player IDs
      const gamesToDelete: string[] = [];
      
      Object.entries(games).forEach(([gameId, game]) => {
        let hasInvalidIds = false;
        
        // Check selectedPlayerIds
        if (game.selectedPlayerIds && Array.isArray(game.selectedPlayerIds)) {
          const invalidIds = game.selectedPlayerIds.filter((id: string) => !validPlayerIds.has(id));
          if (invalidIds.length > 0) {
            hasInvalidIds = true;
          }
        }
        
        // Check gameEvents for invalid scorer/assister IDs
        if (game.gameEvents && Array.isArray(game.gameEvents)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          game.gameEvents.forEach((event: any) => {
            if (event.type === 'goal') {
              if (event.scorerId && !validPlayerIds.has(event.scorerId)) {
                hasInvalidIds = true;
              }
              if (event.assisterId && !validPlayerIds.has(event.assisterId)) {
                hasInvalidIds = true;
              }
            }
          });
        }
        
        if (hasInvalidIds) {
          gamesToDelete.push(gameId);
          addLog(`Game ${gameId}: ${game.teamName} vs ${game.opponentName} (${game.gameDate}) has invalid player IDs`, 'error');
        }
      });
      
      addLog(`\nFound ${gamesToDelete.length} games with invalid player IDs`);
      
      if (gamesToDelete.length === 0) {
        addLog('No games to clean up!', 'success');
        return;
      }
      
      // Ask for confirmation
      if (!window.confirm(`This will delete ${gamesToDelete.length} games with invalid player IDs. Continue?`)) {
        addLog('Cleanup cancelled by user', 'info');
        return;
      }
      
      // Delete games with invalid IDs
      addLog('\nDeleting games with invalid player IDs...');
      let deletedCount = 0;
      
      for (const gameId of gamesToDelete) {
        try {
          await storageManager.deleteSavedGame(gameId);
          deletedCount++;
          addLog(`Deleted game ${gameId}`, 'success');
        } catch (error) {
          addLog(`Failed to delete game ${gameId}: ${error}`, 'error');
        }
      }
      
      addLog(`\nCleanup complete! Deleted ${deletedCount}/${gamesToDelete.length} games`, 'success');
      
      // Verify remaining games
      const remainingGames = await storageManager.getSavedGames() as Record<string, unknown>;
      addLog(`\nRemaining games: ${Object.keys(remainingGames).length}`);
      
    } catch (error) {
      addLog(`Critical error: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Cleanup Invalid Games</h1>
      
      <div className="mb-6 p-4 bg-yellow-100 border border-yellow-400 rounded">
        <h2 className="text-xl font-semibold mb-2">⚠️ Warning</h2>
        <p>This will delete all games that reference invalid player IDs.</p>
        <p>This is useful after a failed import where ID mapping didn&apos;t work correctly.</p>
        <p className="mt-2 font-semibold">Make sure you have a backup before proceeding!</p>
      </div>

      <div className="mb-6">
        <button
          onClick={runCleanup}
          disabled={loading || !user}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Running cleanup...' : 'Run Cleanup'}
        </button>
        
        {!user && (
          <p className="mt-2 text-red-600">You must be signed in to run cleanup</p>
        )}
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-auto max-h-96">
        <h2 className="text-lg font-bold mb-2">Cleanup Log:</h2>
        {log.length === 0 ? (
          <p className="text-gray-500">No activity yet...</p>
        ) : (
          log.map((line, i) => (
            <div 
              key={i} 
              className={
                line.includes('ERROR') ? 'text-red-400' : 
                line.includes('SUCCESS') ? 'text-green-400' : 
                'text-gray-300'
              }
            >
              {line}
            </div>
          ))
        )}
      </div>

      <div className="mt-8 space-x-4">
        <button
          onClick={() => window.location.href = '/import-backup'}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go to Import
        </button>
        <button
          onClick={() => window.location.href = '/verify-id-mapping'}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Verify IDs
        </button>
      </div>
    </div>
  );
}