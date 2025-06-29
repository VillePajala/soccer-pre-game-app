import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Player } from '@/types';
import { AppState } from '@/app/page';
import { calculatePlayerStats, PlayerStats as PlayerStatsData } from '@/utils/playerStats';
import { format } from 'date-fns';
import { fi, enUS } from 'date-fns/locale';
import SparklineChart from './SparklineChart';

interface PlayerStatsViewProps {
  player: Player | null;
  savedGames: { [key: string]: AppState };
  onGameClick: (gameId: string) => void;
}

const PlayerStatsView: React.FC<PlayerStatsViewProps> = ({ player, savedGames, onGameClick }) => {
  const { t, i18n } = useTranslation();

  const playerStats: PlayerStatsData | null = useMemo(() => {
    if (!player) return null;
    return calculatePlayerStats(player, savedGames);
  }, [player, savedGames]);

  if (!player || !playerStats) {
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-slate-400">{t('playerStats.selectPlayer', 'Select a player to view their stats.')}</p>
        </div>
    );
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
    <div className="p-4 sm:p-6 bg-slate-900/70 rounded-lg border border-slate-700 shadow-inner">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-yellow-400">{player.name}</h2>
            <p className="text-md text-slate-400">#{player.jerseyNumber}</p>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-4 gap-4 text-center mb-6 p-4 bg-slate-800/60 rounded-lg">
          <div>
            <p className="text-2xl font-bold text-yellow-400">{playerStats.totalGames}</p>
            <p className="text-sm text-slate-400">{t('playerStats.gamesPlayed', 'Games Played')}</p>
            <p className="text-xs text-slate-500">&nbsp;</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">{playerStats.totalGoals}</p>
            <p className="text-sm text-slate-400">{t('playerStats.goals', 'Goals')}</p>
            <p className="text-xs text-slate-500">({playerStats.avgGoalsPerGame.toFixed(1)} {t('playerStats.perGame', '/ game')})</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">{playerStats.totalAssists}</p>
            <p className="text-sm text-slate-400">{t('playerStats.assists', 'Assists')}</p>
            <p className="text-xs text-slate-500">({playerStats.avgAssistsPerGame.toFixed(1)} {t('playerStats.perGame', '/ game')})</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-400">{playerStats.totalGoals + playerStats.totalAssists}</p>
            <p className="text-sm text-slate-400">{t('playerStats.points', 'Points')}</p>
            <p className="text-xs text-slate-500">({(playerStats.avgGoalsPerGame + playerStats.avgAssistsPerGame).toFixed(1)} {t('playerStats.perGame', '/ game')})</p>
          </div>
        </div>

        {/* Game by Game Stats */}
        <div className="flex-grow">
          <h3 className="text-lg font-semibold mb-2">{t('playerStats.gameLog', 'Game Log')}</h3>
          <div className="mb-4">
            <SparklineChart 
              data={playerStats.gameByGameStats} 
              goalsLabel={t('playerStats.goals', 'Goals')}
              assistsLabel={t('playerStats.assists', 'Assists')}
            />
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {playerStats.gameByGameStats.length > 0 ? (
              playerStats.gameByGameStats.map(game => (
                <button
                  key={game.gameId}
                  className="w-full bg-slate-800/40 border border-slate-700/50 p-3 rounded-md flex justify-between items-center text-left hover:bg-slate-800/60 transition-colors"
                  onClick={() => onGameClick(game.gameId)}
                >
                  <div className="flex items-center">
                    <span className={`w-2 h-8 rounded-full mr-3 ${getResultClass(game.result)}`}></span>
                    <div>
                      <p className="font-semibold">{t('playerStats.vs', 'vs')} {game.opponentName}</p>
                      <p className="text-xs text-slate-400">{format(new Date(game.date), i18n.language === 'fi' ? 'd.M.yyyy' : 'PP', { locale: i18n.language === 'fi' ? fi : enUS })}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="text-center mx-2">
                      <p className={`font-bold text-lg ${game.goals > 0 ? 'text-green-400' : 'text-slate-300'}`}>{game.goals}</p>
                      <p className="text-xs text-slate-400">{t('playerStats.goals', 'Goals')}</p>
                    </div>
                    <div className="text-center mx-2">
                      <p className={`font-bold text-lg ${game.assists > 0 ? 'text-blue-400' : 'text-slate-300'}`}>{game.assists}</p>
                      <p className="text-xs text-slate-400">{t('playerStats.assists', 'Assists')}</p>
                    </div>
                  </div>
                </button>
              ))
            ) : (
              <p className="text-slate-400 text-center py-4">{t('playerStats.noGames', 'No game data available.')}</p>
            )}
          </div>
        </div>
    </div>
  );
};

export default PlayerStatsView; 