'use client';

import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TournamentStatsProps } from './types';

/**
 * Tournament Statistics Tab Component
 * Handles display of statistics filtered by tournament
 */
const TournamentStats = memo<TournamentStatsProps>(({
  tournaments,
  selectedTournamentIdFilter,
  onTournamentFilterChange,
  playerStats,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">
          {t('gameStatsModal.tournamentStats', 'Tournament Statistics')}
        </h3>
        
        {/* Tournament Filter */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {t('gameStatsModal.filterByTournament', 'Filter by Tournament')}
          </label>
          <select
            value={selectedTournamentIdFilter || ''}
            onChange={(e) => onTournamentFilterChange(e.target.value || null)}
            className="w-full p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">
              {t('gameStatsModal.allTournaments', 'All Tournaments')}
            </option>
            {tournaments.map((tournament) => (
              <option key={tournament.id} value={tournament.id}>
                {tournament.name}
              </option>
            ))}
          </select>
        </div>

        {/* Stats Summary */}
        <div className="text-center py-8 text-slate-500">
          <p>{t('gameStatsModal.tournamentStatsPlaceholder', 'Tournament statistics will be displayed here.')}</p>
          <p className="text-sm mt-2">
            {t('gameStatsModal.foundGames', 'Found {{count}} games', { count: playerStats.length })}
          </p>
        </div>
      </div>
    </div>
  );
});

TournamentStats.displayName = 'TournamentStats';

export default TournamentStats;