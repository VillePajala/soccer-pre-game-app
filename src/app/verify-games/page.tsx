'use client';

import { useState, useEffect } from 'react';
import { authAwareStorageManager as storageManager } from '@/lib/storage';
import { useAuth } from '@/context/AuthContext';

export default function VerifyGamesPage() {
  const { user } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadGames = async () => {
      if (!user) return;
      
      try {
        const savedGames = await storageManager.getSavedGames();
        const gamesList = Object.entries(savedGames).map(([id, game]) => ({
          id,
          ...game
        }));
        setGames(gamesList);
      } catch (error) {
        console.error('Error loading games:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGames();
  }, [user]);

  const deleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this game?')) return;
    
    try {
      await storageManager.deleteSavedGame(gameId);
      // Reload games
      const savedGames = await storageManager.getSavedGames();
      const gamesList = Object.entries(savedGames).map(([id, game]) => ({
        id,
        ...game
      }));
      setGames(gamesList);
    } catch (error) {
      console.error('Error deleting game:', error);
    }
  };

  if (!user) {
    return (
      <div className="p-8">
        <p>Please sign in to view games</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <p>Loading games...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Verify Imported Games</h1>
      
      <div className="mb-4">
        <p className="text-lg">Total games: {games.length}</p>
      </div>

      <div className="space-y-4">
        {games.map((game, index) => (
          <div key={game.id} className="bg-gray-100 p-4 rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">Game {index + 1}</h3>
                <p><strong>ID:</strong> {game.id}</p>
                <p><strong>Team:</strong> {game.teamName || 'No team name'}</p>
                <p><strong>Opponent:</strong> {game.opponentName || 'No opponent name'}</p>
                <p><strong>Score:</strong> {game.homeScore || 0} - {game.awayScore || 0}</p>
                <p><strong>Date:</strong> {game.gameDate || 'No date'}</p>
                <p><strong>Status:</strong> {game.gameStatus || 'No status'}</p>
                {game.opponentName && game.opponentName.match(/^\d+$/) && (
                  <p className="text-red-600 font-semibold">⚠️ Opponent name appears to be corrupted!</p>
                )}
              </div>
              <button
                onClick={() => deleteGame(game.id)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 space-x-4">
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Go Back to App
        </button>
        <button
          onClick={() => window.location.href = '/import-backup'}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Import Again
        </button>
      </div>
    </div>
  );
}