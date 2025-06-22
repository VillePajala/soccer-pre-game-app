import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Player } from '@/types';
import { AppState } from '@/app/page';
import { calculatePlayerStats, PlayerStats as PlayerStatsData } from '@/utils/playerStats';
import { format } from 'date-fns';
import SparklineChart from './SparklineChart';

interface PlayerStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  player: Player | null;
  savedGames: { [key: string]: AppState };
  onGameClick: (gameId: string) => void;
}

const PlayerStatsModal: React.FC<PlayerStatsModalProps> = ({ isOpen, onClose, player, savedGames, onGameClick }) => {
  const { t } = useTranslation();

  const playerStats: PlayerStatsData | null = useMemo(() => {
    if (!player) return null;
    return calculatePlayerStats(player, savedGames);
  }, [player, savedGames]);

  if (!isOpen || !player || !playerStats) {
    return null;
  }

  const getResultClass = (result: 'W' | 'L' | 'D' | 'N/A') => {
    switch (result) {
      case 'W': return 'bg-green-500';
      case 'L': return 'bg-red-500';
      case 'D': return 'bg-gray-500';
      default: return 'bg-gray-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50 p-4">
      <div className="bg-slate-800 text-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-yellow-400">{player.name}</h2>
            <p className="text-md text-slate-400">#{player.jerseyNumber}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            &times;
          </button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 text-center mb-6 p-4 bg-slate-700/50 rounded-lg">
          <div>
            <p className="text-2xl font-bold">{playerStats.totalGames}</p>
            <p className="text-sm text-slate-400">{t('stats.gamesPlayed', 'Games Played')}</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
              <p className="text-2xl font-bold">{playerStats.totalGoals}</p>
            </div>
            <p className="text-sm text-slate-400">{t('stats.goals', 'Goals')}</p>
            <p className="text-xs text-slate-500">({playerStats.avgGoalsPerGame.toFixed(1)} {t('stats.perGame', '/ game')})</p>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="flex items-center">
              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
              <p className="text-2xl font-bold">{playerStats.totalAssists}</p>
            </div>
            <p className="text-sm text-slate-400">{t('stats.assists', 'Assists')}</p>
            <p className="text-xs text-slate-500">({playerStats.avgAssistsPerGame.toFixed(1)} {t('stats.perGame', '/ game')})</p>
          </div>
        </div>

        {/* Game by Game Stats */}
        <div className="flex-grow overflow-y-auto">
          <h3 className="text-lg font-semibold mb-2">{t('stats.gameLog', 'Game Log')}</h3>
          <div className="mb-4">
            <SparklineChart data={playerStats.gameByGameStats} />
          </div>
          <div className="space-y-2">
            {playerStats.gameByGameStats.length > 0 ? (
              playerStats.gameByGameStats.map(game => (
                <button 
                  key={game.gameId} 
                  className="w-full bg-slate-700 p-3 rounded-md flex justify-between items-center text-left hover:bg-slate-600 transition-colors"
                  onClick={() => onGameClick(game.gameId)}
                >
                  <div className="flex items-center">
                    <span className={`w-2 h-8 rounded-full mr-3 ${getResultClass(game.result)}`}></span>
                    <div>
                      <p className="font-semibold">{t('stats.vs', 'vs')} {game.opponentName}</p>
                      <p className="text-xs text-slate-400">{format(new Date(game.date), 'PP')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p>
                      <span className={game.goals > 0 ? 'text-green-400 font-bold' : ''}>
                        {t('stats.goals_short', 'G')}: {game.goals}
                      </span> | <span className={game.assists > 0 ? 'text-blue-400 font-bold' : ''}>
                        {t('stats.assists_short', 'A')}: {game.assists}
                      </span>
                    </p>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-slate-400 text-center py-4">{t('stats.noGames', 'No game data available.')}</p>
            )}
          </div>
        </div>
        
        <div className="mt-6 text-right border-t border-slate-700 pt-4">
          <button
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerStatsModal; 