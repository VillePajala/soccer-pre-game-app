'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TranslationKey } from '@/i18n-types';
import { Player, Season, Tournament } from '@/types';
import { AppState } from '@/types';
import { calculatePlayerStats, PlayerStats as PlayerStatsData } from '@/utils/playerStats';
import { calculatePlayerAssessmentAverages, getPlayerAssessmentTrends, getPlayerAssessmentNotes } from '@/utils/assessmentStats';
import { getAppSettings, updateAppSettings } from '@/utils/appSettings';
import { format } from 'date-fns';
import { fi, enUS } from 'date-fns/locale';
import SparklineChart from './SparklineChart';
import RatingBar from './RatingBar';
import MetricTrendChart from './MetricTrendChart';
import MetricAreaChart from './MetricAreaChart';

interface PlayerStatsViewProps {
  player: Player | null;
  savedGames: { [key: string]: AppState };
  onGameClick: (gameId: string) => void;
  seasons: Season[];
  tournaments: Tournament[];
}

const PlayerStatsView: React.FC<PlayerStatsViewProps> = ({ player, savedGames, onGameClick, seasons, tournaments }) => {
  const { t, i18n } = useTranslation();

  const [showRatings, setShowRatings] = useState(false);
  const [selectedMetric, setSelectedMetric] = useState('goalsAssists');
  const [useDemandCorrection, setUseDemandCorrection] = useState(false);

  useEffect(() => {
    getAppSettings().then(s => {
      setUseDemandCorrection(s.useDemandCorrection ?? false);
    });
  }, []);

  const assessmentAverages = useMemo(() => {
    if (!player) return null;
    return calculatePlayerAssessmentAverages(player.id, savedGames, useDemandCorrection);
  }, [player, savedGames, useDemandCorrection]);

  const assessmentTrends = useMemo(() => {
    if (!player) return null;
    return getPlayerAssessmentTrends(player.id, savedGames);
  }, [player, savedGames]);

  const assessmentNotes = useMemo(() => {
    if (!player) return [];
    return getPlayerAssessmentNotes(player.id, savedGames);
  }, [player, savedGames]);

  const playerStats: PlayerStatsData | null = useMemo(() => {
    if (!player) return null;
    return calculatePlayerStats(player, savedGames, seasons, tournaments);
  }, [player, savedGames, seasons, tournaments]);

  if (!player || !playerStats) {
    return (
        <div className="flex items-center justify-center h-full">
            <p className="text-slate-400">{t('playerStats.selectPlayer', 'Select a player to view their stats.')}</p>
        </div>
    );
  }

  const metricOptions = [
    { key: 'goalsAssists', label: t('playerStats.goalsAssists', 'Goals & Assists') },
    { key: 'goals', label: t('playerStats.goals', 'Goals') },
    { key: 'assists', label: t('playerStats.assists', 'Assists') },
    { key: 'points', label: t('playerStats.points', 'Points') },
    ...(assessmentTrends ? Object.keys(assessmentTrends).map(m => ({ key: m, label: t(`assessmentMetrics.${m}` as TranslationKey, m) })) : [])
  ];

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

        {/* Game by Game Stats - Title and Chart */}
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">{t('playerStats.gameLog', 'Game Log')}</h3>
          <div className="mb-2">
            <label htmlFor="metric-select" className="block text-sm font-medium text-slate-300 mb-1">{t('playerStats.metricSelect', 'Select Metric')}</label>
            <select
              id="metric-select"
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded-md text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {metricOptions.map(opt => (
                <option key={opt.key} value={opt.key}>{opt.label}</option>
              ))}
            </select>
          </div>
        <div className="mb-4">
          {selectedMetric === 'goalsAssists' ? (
            <SparklineChart
              data={playerStats.gameByGameStats}
              goalsLabel={t('playerStats.goals', 'Goals')}
              assistsLabel={t('playerStats.assists', 'Assists')}
            />
          ) : (
            <MetricAreaChart
              data={
                selectedMetric === 'goals' || selectedMetric === 'assists' || selectedMetric === 'points'
                  ? playerStats.gameByGameStats.map(g => ({ date: g.date, value: g[selectedMetric] }))
                  : (assessmentTrends?.[selectedMetric] || [])
              }
              label={metricOptions.find(o => o.key === selectedMetric)?.label || selectedMetric}
            />
          )}
        </div>
      </div>

      {assessmentAverages && (
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setShowRatings(v => !v)}
            className="text-left w-full bg-slate-800/60 p-3 rounded-lg flex justify-between items-center"
            aria-expanded={showRatings}
          >
            <span className="font-semibold">{t('playerStats.performanceRatings', 'Performance Ratings')}</span>
            <span className="text-sm text-slate-400">{showRatings ? '-' : '+'}</span>
          </button>
          {showRatings && (
            <div className="mt-2 space-y-4 text-sm">
              <label className="flex items-center space-x-2 px-2">
                <input
                  type="checkbox"
                  checked={useDemandCorrection}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setUseDemandCorrection(val);
                    updateAppSettings({ useDemandCorrection: val }).catch(() => {});
                  }}
                  title={t('playerStats.useDemandCorrectionTooltip', 'When enabled, ratings from harder games count more')}
                  className="form-checkbox h-4 w-4 text-indigo-600 bg-slate-600 border-slate-500 rounded focus:ring-indigo-500"
                />
                <span>{t('playerStats.useDemandCorrection', 'Weight by Difficulty')}</span>
              </label>
              <div className="space-y-2">
                {Object.entries(assessmentAverages.averages).map(([metric, avg]) => (
                  <div key={metric} className="flex items-center space-x-2 px-2">
                    <span className="w-28 shrink-0">{t(`assessmentMetrics.${metric}` as TranslationKey, metric)}</span>
                    <RatingBar value={avg} />
                  </div>
                ))}
                <div className="flex items-center space-x-2 px-2 mt-2">
                  <span className="w-28 shrink-0">{t('playerAssessmentModal.overallLabel', 'Overall')}</span>
                  <RatingBar value={assessmentAverages.overall} />
                </div>
                <div className="flex items-center space-x-2 px-2">
                  <span className="w-28 shrink-0">{t('playerStats.avgRating', 'Avg Rating')}</span>
                  <RatingBar value={assessmentAverages.finalScore} />
                </div>
                <div className="text-xs text-slate-400 text-right">
                  {assessmentAverages.count} {t('playerStats.ratedGames', 'rated')}
                </div>
              </div>
              {assessmentTrends && (
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(assessmentTrends).map(([metric, data]) => (
                    <div key={metric} className="bg-slate-800/40 p-2 rounded">
                      <p className="text-xs text-slate-300 mb-1">{t(`assessmentMetrics.${metric}` as TranslationKey, metric)}</p>
                      <MetricTrendChart data={data} />
                    </div>
                  ))}
                </div>
              )}
              {assessmentNotes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-1">{t('playerStats.notes', 'Assessment Notes')}</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {assessmentNotes.map(n => (
                      <li key={n.date} className="text-xs text-slate-300">
                        {new Date(n.date).toLocaleDateString()} - {n.notes}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

        {/* Performance by Season/Tournament */}
        <div className="space-y-4 mt-2">
          {Object.keys(playerStats.performanceBySeason).length > 0 && (
            <div className="bg-slate-800/60 p-3 rounded-lg">
              <h4 className="text-md font-semibold text-slate-200 mb-2">{t('playerStats.seasonPerformance', 'Season Performance')}</h4>
              <div className="space-y-2">
                {Object.entries(playerStats.performanceBySeason).map(([id, stats]) => (
                  <div key={id} className="p-2 bg-slate-700/50 rounded-md">
                    <p className="font-semibold text-slate-100 mb-1">{stats.name}</p>
                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div><p className="font-bold text-yellow-400">{stats.gamesPlayed}</p><p className="text-xs text-slate-400">{t('playerStats.gamesPlayed_short', 'GP')}</p></div>
                      <div><p className="font-bold text-yellow-400">{stats.goals}</p><p className="text-xs text-slate-400">{t('playerStats.goals', 'Goals')}</p></div>
                      <div><p className="font-bold text-yellow-400">{stats.assists}</p><p className="text-xs text-slate-400">{t('playerStats.assists', 'Assists')}</p></div>
                      <div><p className="font-bold text-yellow-400">{stats.points}</p><p className="text-xs text-slate-400">{t('playerStats.points', 'Points')}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {Object.keys(playerStats.performanceByTournament).length > 0 && (
            <div className="bg-slate-800/60 p-3 rounded-lg">
              <h4 className="text-md font-semibold text-slate-200 mb-2">{t('playerStats.tournamentPerformance', 'Tournament Performance')}</h4>
              <div className="space-y-2">
                {Object.entries(playerStats.performanceByTournament).map(([id, stats]) => (
                  <div key={id} className="p-2 bg-slate-700/50 rounded-md">
                    <p className="font-semibold text-slate-100 mb-1">{stats.name}</p>
                    <div className="grid grid-cols-4 gap-2 text-center text-sm">
                      <div><p className="font-bold text-yellow-400">{stats.gamesPlayed}</p><p className="text-xs text-slate-400">{t('playerStats.gamesPlayed_short', 'GP')}</p></div>
                      <div><p className="font-bold text-yellow-400">{stats.goals}</p><p className="text-xs text-slate-400">{t('playerStats.goals', 'Goals')}</p></div>
                      <div><p className="font-bold text-yellow-400">{stats.assists}</p><p className="text-xs text-slate-400">{t('playerStats.assists', 'Assists')}</p></div>
                      <div><p className="font-bold text-yellow-400">{stats.points}</p><p className="text-xs text-slate-400">{t('playerStats.points', 'Points')}</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Individual Game Log List */}
        <div className="flex-grow mt-4">
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {playerStats.gameByGameStats.length > 0 ? (
              playerStats.gameByGameStats.map(game => (
                <button
                  key={game.gameId}
                  className="relative w-full bg-slate-800/40 border border-slate-700/50 p-4 rounded-md flex justify-between items-center text-left hover:bg-slate-800/60 transition-colors shadow-inner"
                  onClick={() => onGameClick(game.gameId)}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent pointer-events-none rounded-md" />
                  <span className={`absolute inset-y-0 left-0 w-1 rounded-l-md ${getResultClass(game.result)}`}></span>
                  <div className="flex items-center pl-2">
                    <div>
                      <p className="font-semibold drop-shadow-lg">{t('playerStats.vs', 'vs')} {game.opponentName}</p>
                      <p className="text-xs text-slate-400">{format(new Date(game.date), i18n.language === 'fi' ? 'd.M.yyyy' : 'PP', { locale: i18n.language === 'fi' ? fi : enUS })}</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    <div className="text-center mx-2">
                      <p className={`font-bold text-xl ${game.goals > 0 ? 'text-green-400' : 'text-slate-300'}`}>{game.goals}</p>
                      <p className="text-xs text-slate-400">{t('playerStats.goals', 'Goals')}</p>
                    </div>
                    <div className="text-center mx-2">
                      <p className={`font-bold text-xl ${game.assists > 0 ? 'text-blue-400' : 'text-slate-300'}`}>{game.assists}</p>
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