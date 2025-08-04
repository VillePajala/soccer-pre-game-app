'use client';

import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { OverallStatsProps } from './types';

/**
 * Overall Statistics Tab Component
 * Handles display of overall statistics across all games
 */
const OverallStats = memo<OverallStatsProps>(({
  playerStats,
  savedGames,
}) => {
  const { t } = useTranslation();

  const totalGames = Object.keys(savedGames).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {t('gameStatsModal.overallStats', 'Overall Statistics')}
        </h3>
        
        {/* Overall Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">{totalGames}</div>
            <div className="text-sm text-slate-600">
              {t('gameStatsModal.totalGames', 'Total Games')}
            </div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">{playerStats.length}</div>
            <div className="text-sm text-slate-600">
              {t('gameStatsModal.activePlayers', 'Active Players')}
            </div>
          </div>
          <div className="text-center p-4 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">
              {playerStats.reduce((sum, stat) => sum + (stat.goals || 0), 0)}
            </div>
            <div className="text-sm text-slate-600">
              {t('gameStatsModal.totalGoals', 'Total Goals')}
            </div>
          </div>
        </div>

        {/* Stats Placeholder */}
        <div className="text-center py-8 text-slate-500">
          <p>{t('gameStatsModal.overallStatsPlaceholder', 'Overall statistics will be displayed here.')}</p>
        </div>
      </div>
    </div>
  );
});

OverallStats.displayName = 'OverallStats';

export default OverallStats;