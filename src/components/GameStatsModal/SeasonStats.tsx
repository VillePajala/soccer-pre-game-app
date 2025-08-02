'use client';

import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { SeasonStatsProps } from './types';

/**
 * Season Statistics Tab Component
 * Handles display of statistics filtered by season
 */
const SeasonStats = memo<SeasonStatsProps>(({
  seasons,
  selectedSeasonIdFilter,
  onSeasonFilterChange,
  playerStats,
  // ... other props would be used here
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {t('gameStatsModal.seasonStats', 'Season Statistics')}
        </h3>
        
        {/* Season Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t('gameStatsModal.filterBySeason', 'Filter by Season')}
          </label>
          <select
            value={selectedSeasonIdFilter || ''}
            onChange={(e) => onSeasonFilterChange(e.target.value || null)}
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">
              {t('gameStatsModal.allSeasons', 'All Seasons')}
            </option>
            {seasons.map((season) => (
              <option key={season.id} value={season.id}>
                {season.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stats Summary */}
        <div className="text-center py-8 text-slate-500">
          <p>{t('gameStatsModal.seasonStatsPlaceholder', 'Season statistics will be displayed here.')}</p>
          <p className="text-sm mt-2">
            {t('gameStatsModal.foundGames', 'Found {{count}} games', { count: playerStats.length })}
          </p>
        </div>
      </div>
    </div>
  );
});

SeasonStats.displayName = 'SeasonStats';

export default SeasonStats;