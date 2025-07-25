'use client';

import { useState, useRef } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';

export default function ImportBackupPage() {
  const { user } = useAuth();
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string, type: 'info' | 'success' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    setLog(prev => [...prev, `[${timestamp}] ${type.toUpperCase()}: ${message}`]);
  };

  const clearExistingData = async () => {
    addLog('Clearing existing Supabase data...');
    
    try {
      // Get all existing data
      const [players, seasons, tournaments, games] = await Promise.all([
        storageManager.getPlayers(),
        storageManager.getSeasons(),
        storageManager.getTournaments(),
        storageManager.getSavedGames()
      ]);

      // Delete all players
      for (const player of players) {
        await storageManager.deletePlayer(player.id);
      }
      addLog(`Deleted ${players.length} players`, 'success');

      // Delete all seasons
      for (const season of seasons) {
        await storageManager.deleteSeason(season.id);
      }
      addLog(`Deleted ${seasons.length} seasons`, 'success');

      // Delete all tournaments
      for (const tournament of tournaments) {
        await storageManager.deleteTournament(tournament.id);
      }
      addLog(`Deleted ${tournaments.length} tournaments`, 'success');

      // Delete all games
      const gameIds = Object.keys(games);
      for (const gameId of gameIds) {
        await storageManager.deleteSavedGame(gameId);
      }
      addLog(`Deleted ${gameIds.length} games`, 'success');

    } catch (error) {
      addLog(`Error clearing data: ${error}`, 'error');
      throw error;
    }
  };

  const importBackupData = async (jsonContent: string) => {
    const data = JSON.parse(jsonContent);
    const stats = {
      players: 0,
      seasons: 0,
      tournaments: 0,
      games: 0
    };

    // Detect format
    let masterRoster, seasonsList, tournamentsList, savedGames;
    
    if (data.localStorage) {
      addLog('Detected localStorage format backup');
      masterRoster = data.localStorage.masterRoster || [];
      seasonsList = data.localStorage.seasonsList || [];
      tournamentsList = data.localStorage.tournamentsList || [];
      savedGames = data.localStorage.savedGames || {};
    } else {
      addLog('Detected direct format backup');
      masterRoster = data.players || data.masterRoster || [];
      seasonsList = data.seasons || data.seasonsList || [];
      tournamentsList = data.tournaments || data.tournamentsList || [];
      savedGames = data.savedGames || {};
    }

    // Import players
    addLog(`Importing ${masterRoster.length} players...`);
    for (const player of masterRoster) {
      try {
        const playerToSave = { ...player, id: '' }; // Clear ID to let Supabase generate
        await storageManager.savePlayer(playerToSave);
        stats.players++;
      } catch (error) {
        addLog(`Failed to import player ${player.name}: ${error}`, 'error');
      }
    }
    addLog(`Imported ${stats.players}/${masterRoster.length} players`, 'success');

    // Import seasons
    addLog(`Importing ${seasonsList.length} seasons...`);
    for (const season of seasonsList) {
      try {
        const seasonToSave = { ...season, id: '' };
        await storageManager.saveSeason(seasonToSave);
        stats.seasons++;
      } catch (error) {
        addLog(`Failed to import season ${season.name}: ${error}`, 'error');
      }
    }
    addLog(`Imported ${stats.seasons}/${seasonsList.length} seasons`, 'success');

    // Import tournaments
    addLog(`Importing ${tournamentsList.length} tournaments...`);
    for (const tournament of tournamentsList) {
      try {
        const tournamentToSave = { ...tournament, id: '' };
        await storageManager.saveTournament(tournamentToSave);
        stats.tournaments++;
      } catch (error) {
        addLog(`Failed to import tournament ${tournament.name}: ${error}`, 'error');
      }
    }
    addLog(`Imported ${stats.tournaments}/${tournamentsList.length} tournaments`, 'success');

    // Import games
    const gameIds = Object.keys(savedGames);
    addLog(`Importing ${gameIds.length} games...`);
    for (const gameId of gameIds) {
      try {
        const game = savedGames[gameId];
        if (game && typeof game === 'object') {
          // Ensure game has an ID and clear it for Supabase
          const gameToSave = { ...game, id: '' };
          await storageManager.saveSavedGame(gameToSave);
          stats.games++;
          addLog(`Imported game: ${game.teamName || 'Unknown'} vs ${game.opponentName || 'Unknown'}`, 'info');
        }
      } catch (error) {
        addLog(`Failed to import game ${gameId}: ${error}`, 'error');
      }
    }
    addLog(`Imported ${stats.games}/${gameIds.length} games`, 'success');

    return stats;
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setLog([]);
    
    try {
      addLog(`Selected file: ${file.name}`);
      addLog(`Current storage provider: ${storageManager.getProviderName?.() || 'unknown'}`);
      
      if (!user) {
        addLog('ERROR: You must be signed in to import to Supabase', 'error');
        return;
      }

      // Check if using Supabase
      if (!storageManager.getProviderName?.().includes('supabase')) {
        addLog('WARNING: Not using Supabase storage! The storage manager is using localStorage.', 'error');
        addLog('This usually means the auth state is not synced properly.', 'error');
        addLog('Try going to /fix-auth first to sync auth state.', 'error');
        return;
      }

      const text = await file.text();
      addLog(`File read successfully, size: ${text.length} characters`);

      // Ask for confirmation
      if (!window.confirm(
        'This will DELETE all existing data in Supabase and replace it with the backup. Continue?'
      )) {
        addLog('Import cancelled by user', 'info');
        return;
      }

      // Clear existing data
      await clearExistingData();

      // Import new data
      const stats = await importBackupData(text);

      addLog('=== IMPORT COMPLETE ===', 'success');
      addLog(`Total imported: ${stats.players} players, ${stats.seasons} seasons, ${stats.tournaments} tournaments, ${stats.games} games`, 'success');

      // Verify
      addLog('Verifying import...');
      const [newPlayers, newSeasons, newTournaments, newGames] = await Promise.all([
        storageManager.getPlayers(),
        storageManager.getSeasons(),
        storageManager.getTournaments(),
        storageManager.getSavedGames()
      ]);

      addLog(`Verification: Found ${newPlayers.length} players, ${newSeasons.length} seasons, ${newTournaments.length} tournaments, ${Object.keys(newGames).length} games in storage`, 'success');

    } catch (error) {
      addLog(`CRITICAL ERROR: ${error}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Import Backup (Replace All Data)</h1>
      
      <div className="mb-6 p-4 bg-red-100 border border-red-400 rounded">
        <h2 className="text-xl font-semibold mb-2">⚠️ Warning</h2>
        <p>This will completely REPLACE all data in Supabase with your backup file.</p>
        <p>All existing data will be permanently deleted.</p>
      </div>

      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          disabled={loading || !user}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={loading || !user}
          className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
        >
          {loading ? 'Importing...' : 'Select Backup File to Import'}
        </button>
        
        {!user && (
          <p className="mt-2 text-red-600">You must be signed in to import data</p>
        )}
      </div>

      <div className="bg-gray-900 text-gray-100 p-4 rounded-lg font-mono text-xs overflow-auto max-h-96">
        <h2 className="text-lg font-bold mb-2">Import Log:</h2>
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

      <div className="mt-8">
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Back to App
        </button>
      </div>
    </div>
  );
}