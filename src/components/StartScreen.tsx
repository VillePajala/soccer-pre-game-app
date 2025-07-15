'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';

interface StartScreenProps {
  onStartNewGame: () => void;
  onLoadGame: () => void;
  onResumeGame?: () => void;
  onCreateSeason: () => void;
  onViewStats: () => void;
  canResume?: boolean;
}

const StartScreen: React.FC<StartScreenProps> = ({
  onStartNewGame,
  onLoadGame,
  onResumeGame,
  onCreateSeason,
  onViewStats,
  canResume = false,
}) => {
  const { t } = useTranslation();

  const buttonStyle =
    'px-4 py-2 rounded-md text-lg font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 bg-gradient-to-b from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 text-white w-64';

  const containerStyle =
    'relative flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 font-display overflow-hidden';

  const titleStyle = 'text-4xl font-bold text-yellow-400 tracking-wide drop-shadow-lg mb-8';

  return (
    <div className={containerStyle}>
      <div className="absolute inset-0 bg-noise-texture" />
      <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light" />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent" />
      <div className="absolute -inset-[50px] bg-sky-400/5 blur-2xl top-0 opacity-50" />
      <div className="absolute -inset-[50px] bg-indigo-600/5 blur-2xl bottom-0 opacity-50" />

      <div className="relative z-10 flex flex-col items-center space-y-4">
        <Image
          src="/pepo-logo.png"
          alt="MatchDay Coach Logo"
          width={128}
          height={128}
          className="mb-4"
        />
        <h1 className={titleStyle}>MatchDay Coach</h1>
        {canResume && onResumeGame ? (
          <button className={buttonStyle} onClick={onResumeGame}>
            {t('startScreen.resumeGame', 'Resume Last Game')}
          </button>
        ) : null}
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
    </div>
  );
};

export default StartScreen;
