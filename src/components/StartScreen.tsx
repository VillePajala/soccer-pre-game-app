'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';

interface StartScreenProps {
  onStartNewGame: () => void;
  onLoadGame: () => void;
  onCreateSeason: () => void;
  onViewStats: () => void;
}

const StartScreen: React.FC<StartScreenProps> = ({
  onStartNewGame,
  onLoadGame,
  onCreateSeason,
  onViewStats,
}) => {
  const { t } = useTranslation();

  const buttonStyle =
    'px-4 py-2 rounded-md text-lg font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 bg-indigo-600 hover:bg-indigo-700 text-white w-64';

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-slate-100 space-y-4">
      <button className={buttonStyle} onClick={onStartNewGame}>
        {t('startScreen.startNewGame', 'Start New Game')}
      </button>
      <button className={buttonStyle} onClick={onLoadGame}>
        {t('startScreen.loadGame', 'Load Game')}
      </button>
      <button className={buttonStyle} onClick={onCreateSeason}>
        {t('startScreen.createSeasonTournament', 'Create Season/Tournament')}
      </button>
      <button className={buttonStyle} onClick={onViewStats}>
        {t('startScreen.viewStats', 'View Stats')}
      </button>
    </div>
  );
};

export default StartScreen;
