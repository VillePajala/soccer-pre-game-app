'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import { updateAppSettings, getAppSettings } from '@/utils/appSettings';

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
  const [language, setLanguage] = useState<string>(i18n.language);

  useEffect(() => {
    getAppSettings().then((settings) => {
      if (settings.language) {
        setLanguage(settings.language);
      }
    });
  }, []);

  useEffect(() => {
    i18n.changeLanguage(language);
    updateAppSettings({ language }).catch(() => {});
  }, [language]);

  const buttonStyle =
    'w-64 px-4 py-2 rounded-md text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500';

  const containerStyle =
    'relative flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 font-display overflow-hidden py-24';

  const taglineStyle =
    'text-xl text-slate-300 mb-6 text-center max-w-sm drop-shadow-lg italic';

  const titleStyle =
    'text-5xl font-bold text-yellow-400 tracking-wide drop-shadow-lg mb-8 text-center';

  return (
    <div className={containerStyle}>
      <div className="absolute inset-0 bg-noise-texture" />
      <div className="absolute inset-0 bg-gradient-radial from-slate-950 via-slate-900/80 to-slate-900" />
      <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light" />
      <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent" />
      <div className="absolute -inset-[50px] bg-sky-400/5 blur-2xl top-0 opacity-50" />
      <div className="absolute -inset-[50px] bg-indigo-600/5 blur-2xl bottom-0 opacity-50" />
      <Image
        src="/ball.png"
        alt=""
        width={320}
        height={320}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 blur-2xl pointer-events-none"
      />

      <div className="relative z-10 flex flex-col items-center space-y-5">
        <h1 className={titleStyle}>
          <span className="block">MatchDay</span>
          <span className="block">Coach</span>
        </h1>
        <p className={taglineStyle}>{t('startScreen.tagline', 'Elevate Your Game')}</p>
        <div className="flex flex-col items-center">
          <span className="text-sm font-medium text-slate-300 mb-1">
            {t('startScreen.languageLabel', 'Language')}
          </span>
          <div className="flex space-x-2">
            <button
              aria-label={t('startScreen.languageEnglish', 'English')}
              onClick={() => setLanguage('en')}
              className={`w-10 h-8 rounded-md border text-xl flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${language === 'en' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'}`}
            >
              <span role="img" aria-hidden="true">
                🇬🇧
              </span>
            </button>
            <button
              aria-label={t('startScreen.languageFinnish', 'Finnish')}
              onClick={() => setLanguage('fi')}
              className={`w-10 h-8 rounded-md border text-xl flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${language === 'fi' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'}`}
            >
              <span role="img" aria-hidden="true">
                🇫🇮
              </span>
            </button>
          </div>
        </div>
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
