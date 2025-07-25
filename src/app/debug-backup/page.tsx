'use client';

import { useState, useRef } from 'react';

export default function DebugBackupPage() {
  const [analysis, setAnalysis] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      let output = 'Backup File Analysis:\n\n';
      
      // Check for games
      let games = null;
      if (data.localStorage?.savedSoccerGames) {
        games = data.localStorage.savedSoccerGames;
        output += 'Found games in: localStorage.savedSoccerGames\n';
      } else if (data.localStorage?.savedGames) {
        games = data.localStorage.savedGames;
        output += 'Found games in: localStorage.savedGames\n';
      } else if (data.savedGames) {
        games = data.savedGames;
        output += 'Found games in: savedGames\n';
      }
      
      if (games) {
        const gameIds = Object.keys(games);
        output += `Total games: ${gameIds.length}\n\n`;
        
        // Show first 5 games
        output += 'First 5 games:\n';
        gameIds.slice(0, 5).forEach(gameId => {
          const game = games[gameId];
          output += `\nGame ID: ${gameId}\n`;
          output += `  Team: ${game.teamName || 'Unknown'}\n`;
          output += `  Opponent: ${game.opponentName || 'Unknown'}\n`;
          output += `  Score: ${game.homeScore || 0} - ${game.awayScore || 0}\n`;
          output += `  Date: ${game.gameDate || 'Unknown'}\n`;
          output += `  Has ID field: ${game.hasOwnProperty('id')}\n`;
          if (game.id) {
            output += `  ID field value: ${game.id}\n`;
          }
        });
      } else {
        output += 'No games found in backup!\n';
      }
      
      setAnalysis(output);
    } catch (error) {
      setAnalysis(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Debug Backup File</h1>
      
      <div className="mb-6">
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={analyzeFile}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Select Backup File to Debug
        </button>
      </div>

      {analysis && (
        <div className="bg-gray-900 text-gray-100 p-6 rounded-lg overflow-auto">
          <pre className="text-sm font-mono whitespace-pre-wrap">{analysis}</pre>
        </div>
      )}
    </div>
  );
}