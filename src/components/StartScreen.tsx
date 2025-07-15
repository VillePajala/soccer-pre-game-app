'use client';

import React from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import {
  HiOutlinePlayCircle,
  HiOutlineFolderOpen,
  HiOutlineTrophy,
  HiOutlineChartBar,
} from 'react-icons/hi2';

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
    'w-64 px-4 py-2 rounded-md text-lg font-semibold flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500';

  const containerStyle =
    'relative flex flex-col items-center justify-center min-h-screen bg-slate-900 text-slate-100 font-display overflow-hidden';

  const taglineStyle =
    'text-xl text-slate-300 mb-10 text-center max-w-sm drop-shadow-lg italic';

  const titleStyle = 'text-4xl font-bold text-yellow-400 tracking-wide drop-shadow-lg mb-8';

  return (
    <div className={containerStyle}>
      <div className="absolute inset-0 bg-noise-texture" />
      <div className="absolute inset-0 bg-gradient-radial from-indigo-900 via-slate-900/80 to-slate-900" />
      <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light" />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-700 opacity-30 animate-gradient" />
      <div className="absolute -inset-[50px] bg-sky-400/5 blur-2xl top-0 opacity-50" />
      <div className="absolute -inset-[50px] bg-indigo-600/5 blur-2xl bottom-0 opacity-50" />

      <div className="relative z-10 flex flex-col items-center space-y-4">
        <Image
          src="/pepo-logo.png"
          alt="MatchDay Coach Logo"
          width={128}
          height={128}
          className="mb-4 animate-pulse-slow"
        />
        <h1 className={titleStyle}>MatchDay Coach</h1>
        <p className={taglineStyle}>{t('startScreen.tagline', 'Elevate Your Game')}</p>
        {canResume && onResumeGame ? (
          <button className={buttonStyle} onClick={onResumeGame}>
            <HiOutlinePlayCircle className="w-5 h-5" />
            {t('startScreen.resumeGame', 'Resume Last Game')}
          </button>
        ) : null}
        <button className={buttonStyle} onClick={onStartNewGame}>
          <HiOutlinePlayCircle className="w-5 h-5" />
          {t('startScreen.startNewGame', 'Start New Game')}
        </button>
        <button className={buttonStyle} onClick={onLoadGame}>
          <HiOutlineFolderOpen className="w-5 h-5" />
          {t('startScreen.loadGame', 'Load Game')}
        </button>
        <button className={buttonStyle} onClick={onCreateSeason}>
          <HiOutlineTrophy className="w-5 h-5" />
          {t('startScreen.createSeasonTournament', 'Create Season/Tournament')}
        </button>
        <button className={buttonStyle} onClick={onViewStats}>
          <HiOutlineChartBar className="w-5 h-5" />
          {t('startScreen.viewStats', 'View Stats')}
        </button>
      </div>
    </div>
  );
};

export default StartScreen;
