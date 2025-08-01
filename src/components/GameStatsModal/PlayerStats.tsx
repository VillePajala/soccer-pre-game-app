'use client';

import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import PlayerStatsView from '../PlayerStatsView';
import type { PlayerStatsProps } from './types';

/**
 * Player Statistics Tab Component
 * Handles display of individual player statistics
 */
const PlayerStats = memo<PlayerStatsProps>(({
  players,
  gameEvents,
  selectedPlayerIds,
  savedGames,
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 bg-slate-50 border-b">
          <h3 className="text-lg font-semibold text-slate-900">
            {t('gameStatsModal.playerStats', 'Player Statistics')}
          </h3>
        </div>
        
        <div className="p-4">
          <PlayerStatsView
            players={players}
            gameEvents={gameEvents}
            selectedPlayerIds={selectedPlayerIds}
            savedGames={savedGames}
          />
        </div>
      </div>
    </div>
  );
});

PlayerStats.displayName = 'PlayerStats';

export default PlayerStats;