'use client';

import { useState, useRef } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';
import logger from '@/utils/logger';
import { safeImportDataParse } from '@/utils/safeJson';

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

      // Delete all players in parallel
      await Promise.all(
        players.map(player =>
          storageManager.deletePlayer(player.id).catch(err => {
            addLog(`Failed to delete player ${player.id}: ${err}`, 'error');
          })
        )
      );
      addLog(`Deleted ${players.length} players`, 'success');

      // Delete all seasons in parallel
      await Promise.all(
        seasons.map(season =>
          storageManager.deleteSeason(season.id).catch(err => {
            addLog(`Failed to delete season ${season.id}: ${err}`, 'error');
          })
        )
      );
      addLog(`Deleted ${seasons.length} seasons`, 'success');

      // Delete all tournaments in parallel
      await Promise.all(
        tournaments.map(tournament =>
          storageManager.deleteTournament(tournament.id).catch(err => {
            addLog(`Failed to delete tournament ${tournament.id}: ${err}`, 'error');
          })
        )
      );
      addLog(`Deleted ${tournaments.length} tournaments`, 'success');

      // Delete all games in parallel
      const gamesObj = games as Record<string, unknown>;
      const gameIds = Object.keys(gamesObj);
      await Promise.all(
        gameIds.map(gameId =>
          storageManager.deleteSavedGame(gameId).catch(err => {
            addLog(`Failed to delete game ${gameId}: ${err}`, 'error');
          })
        )
      );
      addLog(`Deleted ${gameIds.length} games`, 'success');

    } catch (error) {
      addLog(`Error clearing data: ${error}`, 'error');
      throw error;
    }
  };

  const importBackupData = async (jsonContent: string) => {
    const parseResult = safeImportDataParse(jsonContent, (data): data is Record<string, unknown> => {
      return typeof data === 'object' && data !== null;
    });
    
    if (!parseResult.success) {
      throw new Error(`Invalid backup file: ${parseResult.error}`);
    }
    
    const data = parseResult.data!
    const stats = {
      players: 0,
      seasons: 0,
      tournaments: 0,
      games: 0
    };
    
    // ID mapping to track old IDs to new IDs
    const playerIdMap = new Map<string, string>();
    const seasonIdMap = new Map<string, string>();
    const tournamentIdMap = new Map<string, string>();

    // Detect format
    let masterRoster, seasonsList, tournamentsList, savedGames;
    
    if (data.localStorage) {
      addLog('Detected localStorage format backup');
      // Check for both old and new key names
      masterRoster = data.localStorage.masterRoster || data.localStorage.soccerMasterRoster || [];
      seasonsList = data.localStorage.seasonsList || data.localStorage.soccerSeasons || [];
      tournamentsList = data.localStorage.tournamentsList || data.localStorage.soccerTournaments || [];
      savedGames = data.localStorage.savedGames || data.localStorage.savedSoccerGames || {};
      
      // Log what we found
      addLog(`Found keys: ${Object.keys(data.localStorage).join(', ')}`);
    } else {
      addLog('Detected direct format backup');
      masterRoster = data.players || data.masterRoster || [];
      seasonsList = data.seasons || data.seasonsList || [];
      tournamentsList = data.tournaments || data.tournamentsList || [];
      savedGames = data.savedGames || {};
    }

    // Import players and build ID mapping
    addLog(`Importing ${masterRoster.length} players...`);
    for (const player of masterRoster) {
      try {
        const oldId = player.id;
        const playerToSave = { ...player, id: '' }; // Clear ID to let Supabase generate
        const savedPlayer = await storageManager.savePlayer(playerToSave);
        
        // Map old ID to new ID
        if (oldId && savedPlayer.id) {
          playerIdMap.set(oldId, savedPlayer.id);
          addLog(`Mapped player ID: ${oldId} → ${savedPlayer.id} (${savedPlayer.name})`, 'info');
        } else {
          addLog(`Warning: Could not map player ${player.name} - old ID: ${oldId}, new ID: ${savedPlayer.id}`, 'error');
        }
        
        stats.players++;
      } catch (error) {
        addLog(`Failed to import player ${player.name}: ${error}`, 'error');
      }
    }
    addLog(`Imported ${stats.players}/${masterRoster.length} players`, 'success');

    // Import seasons and build ID mapping
    addLog(`Importing ${seasonsList.length} seasons...`);
    for (const season of seasonsList) {
      try {
        const oldId = season.id;
        const seasonToSave = { ...season, id: '' };
        
        // Update defaultRosterId with new player IDs
        if (seasonToSave.defaultRosterId && Array.isArray(seasonToSave.defaultRosterId)) {
          seasonToSave.defaultRosterId = seasonToSave.defaultRosterId.map((oldPlayerId: string) => 
            playerIdMap.get(oldPlayerId) || oldPlayerId
          );
        }
        
        const savedSeason = await storageManager.saveSeason(seasonToSave);
        
        // Map old ID to new ID
        if (oldId && savedSeason.id) {
          seasonIdMap.set(oldId, savedSeason.id);
        }
        
        stats.seasons++;
      } catch (error) {
        addLog(`Failed to import season ${season.name}: ${error}`, 'error');
      }
    }
    addLog(`Imported ${stats.seasons}/${seasonsList.length} seasons`, 'success');

    // Import tournaments and build ID mapping
    addLog(`Importing ${tournamentsList.length} tournaments...`);
    for (const tournament of tournamentsList) {
      try {
        const oldId = tournament.id;
        const tournamentToSave = { ...tournament, id: '' };
        
        // Update defaultRosterId with new player IDs
        if (tournamentToSave.defaultRosterId && Array.isArray(tournamentToSave.defaultRosterId)) {
          tournamentToSave.defaultRosterId = tournamentToSave.defaultRosterId.map((oldPlayerId: string) => 
            playerIdMap.get(oldPlayerId) || oldPlayerId
          );
        }
        
        // Update seasonId with new season ID
        if (tournamentToSave.seasonId) {
          tournamentToSave.seasonId = seasonIdMap.get(tournamentToSave.seasonId) || tournamentToSave.seasonId;
        }
        
        const savedTournament = await storageManager.saveTournament(tournamentToSave);
        
        // Map old ID to new ID
        if (oldId && savedTournament.id) {
          tournamentIdMap.set(oldId, savedTournament.id);
        }
        
        stats.tournaments++;
      } catch (error) {
        addLog(`Failed to import tournament ${tournament.name}: ${error}`, 'error');
      }
    }
    addLog(`Imported ${stats.tournaments}/${tournamentsList.length} tournaments`, 'success');

    // Import games with updated player/season/tournament IDs
    const gameIds = Object.keys(savedGames);
    addLog(`Importing ${gameIds.length} games...`);
    for (const gameId of gameIds) {
      const game = savedGames[gameId];
      try {
        if (game && typeof game === 'object') {
          // Don't include any ID - let Supabase generate a new UUID
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { id, ...gameWithoutId } = game;
          
          // Update selectedPlayerIds with new IDs
          if (gameWithoutId.selectedPlayerIds && Array.isArray(gameWithoutId.selectedPlayerIds)) {
            const originalIds = [...gameWithoutId.selectedPlayerIds];
            gameWithoutId.selectedPlayerIds = gameWithoutId.selectedPlayerIds.map((oldId: string) => {
              const newId = playerIdMap.get(oldId);
              if (!newId) {
                addLog(`Warning: No mapping found for player ID ${oldId} in game`, 'error');
              }
              return newId || oldId;
            });
            addLog(`Updated selectedPlayerIds: ${originalIds.length} IDs mapped`, 'info');
          }
          
          // Update availablePlayers with new IDs (if present)
          if (gameWithoutId.availablePlayers && Array.isArray(gameWithoutId.availablePlayers)) {
            gameWithoutId.availablePlayers = gameWithoutId.availablePlayers.map(
              (player: { id: string } & Record<string, unknown>) => ({
                ...player,
                id: playerIdMap.get(player.id) || player.id
              })
            );
          }
          
          // Update playersOnField with new IDs
          if (gameWithoutId.playersOnField && Array.isArray(gameWithoutId.playersOnField)) {
            gameWithoutId.playersOnField = gameWithoutId.playersOnField.map(
              (fieldPlayer: { id: string } & Record<string, unknown>) => ({
                ...fieldPlayer,
                id: playerIdMap.get(fieldPlayer.id) || fieldPlayer.id
              })
            );
          }
          
          // Update gameEvents with new player IDs
          if (gameWithoutId.gameEvents && Array.isArray(gameWithoutId.gameEvents)) {
            gameWithoutId.gameEvents = gameWithoutId.gameEvents.map(
              (event: { scorerId?: string; assisterId?: string } & Record<string, unknown>) => {
                const updatedEvent = { ...event };
                if (event.scorerId) {
                  updatedEvent.scorerId = playerIdMap.get(event.scorerId) || event.scorerId;
                }
                if (event.assisterId) {
                  updatedEvent.assisterId = playerIdMap.get(event.assisterId) || event.assisterId;
                }
                return updatedEvent;
              }
            );
          }
          
          // Update season and tournament IDs
          if (gameWithoutId.seasonId) {
            gameWithoutId.seasonId = seasonIdMap.get(gameWithoutId.seasonId) || gameWithoutId.seasonId;
          }
          if (gameWithoutId.tournamentId) {
            gameWithoutId.tournamentId = tournamentIdMap.get(gameWithoutId.tournamentId) || gameWithoutId.tournamentId;
          }
          
          await storageManager.saveSavedGame(gameWithoutId);
          stats.games++;
          addLog(`Imported game: ${game.teamName || 'Unknown'} vs ${game.opponentName || 'Unknown'}`, 'info');
        }
      } catch (error) {
        addLog(`Failed to import game ${gameId}: ${error}`, 'error');
        logger.error('Game import error:', error);
        logger.error('Game data that failed:', game);
      }
    }
    addLog(`Imported ${stats.games}/${gameIds.length} games`, 'success');

    return { 
      stats, 
      playerIdMap, 
      seasonIdMap, 
      tournamentIdMap 
    };
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
      const result = await importBackupData(text);

      addLog('=== IMPORT COMPLETE ===', 'success');
      addLog(`Total imported: ${result.stats.players} players, ${result.stats.seasons} seasons, ${result.stats.tournaments} tournaments, ${result.stats.games} games`, 'success');
      
      // Show ID mapping summary
      addLog('\n=== ID MAPPING SUMMARY ===', 'info');
      addLog(`Player ID mappings created: ${result.playerIdMap.size}`, 'info');
      addLog(`Season ID mappings created: ${result.seasonIdMap.size}`, 'info');
      addLog(`Tournament ID mappings created: ${result.tournamentIdMap.size}`, 'info');
      
      if (result.playerIdMap.size === 0) {
        addLog('WARNING: No player ID mappings were created! This will cause invalid references.', 'error');
      }

      // Wait a moment for database to commit
      addLog('Waiting for database sync...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify
      addLog('Verifying import...');
      const [newPlayers, newSeasons, newTournaments, newGames] = await Promise.all([
        storageManager.getPlayers(),
        storageManager.getSeasons(),
        storageManager.getTournaments(),
        storageManager.getSavedGames()
      ]);

      addLog(`Verification: Found ${newPlayers.length} players, ${newSeasons.length} seasons, ${newTournaments.length} tournaments, ${Object.keys(newGames as Record<string, unknown>).length} games in storage`, 'success');

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