'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useTranslation } from 'react-i18next';
import i18n from '@/i18n';
import {
  updateAppSettings,
  getAppSettings,
} from '@/utils/appSettings';
import { AuthModal } from '@/components/auth/AuthModal';
import { HiOutlineArrowRightOnRectangle, HiCheck } from 'react-icons/hi2';

interface StartScreenProps {
  onStartNewGame: () => void;
  onLoadGame: () => void;
  onResumeGame?: () => void;
  onCreateSeason: () => void;
  onViewStats: () => void;
  canResume?: boolean;
  isAuthenticated?: boolean;
}

const StartScreen: React.FC<StartScreenProps> = ({
  onStartNewGame,
  onLoadGame,
  onResumeGame,
  onCreateSeason,
  onViewStats,
  canResume = false,
  isAuthenticated = false,
}) => {
  const { t } = useTranslation();
  const [language, setLanguage] = useState<string>(i18n.language);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showLoginSuccess, setShowLoginSuccess] = useState(false);

  useEffect(() => {
    getAppSettings().then((settings) => {
      if (settings.language && settings.language !== language) {
        setLanguage(settings.language);
        i18n.changeLanguage(settings.language);
      }
    });
  }, [language]);

  useEffect(() => {
    // Only update if language actually changed from what's in i18n
    if (language !== i18n.language) {
      i18n.changeLanguage(language);
      updateAppSettings({ language }).catch(() => {});
    }
  }, [language]);

  // Show success message when user logs in
  useEffect(() => {
    if (isAuthenticated && showAuthModal) {
      setShowAuthModal(false);
      setShowLoginSuccess(true);
    }
  }, [isAuthenticated, showAuthModal]);

  // Auto-hide success message after 3 seconds
  useEffect(() => {
    if (showLoginSuccess) {
      const timer = setTimeout(() => {
        setShowLoginSuccess(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showLoginSuccess]);

  const buttonStyle =
    'w-64 sm:w-64 md:w-56 px-3 sm:px-4 py-2 sm:py-2 rounded-md text-base sm:text-lg font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500';

  const containerStyle =
    'relative flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-100 font-display overflow-hidden py-8 sm:py-16 md:py-24 px-4';

  const taglineStyle =
    'text-lg sm:text-xl text-slate-300 mb-8 sm:mb-12 text-center max-w-sm drop-shadow-lg bg-slate-800/50 px-4 py-1 rounded-full';

  const titleStyle =
    'text-5xl sm:text-6xl md:text-7xl font-bold text-yellow-400 tracking-wide drop-shadow-lg mb-2 text-center';


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
        priority
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 blur-2xl pointer-events-none"
      />

      <div className="relative z-10 flex flex-col items-center w-full max-w-sm sm:max-w-md">
        <h1 className={titleStyle}>
          <span className="block">MatchDay</span>
          <span className="block">Coach</span>
        </h1>
        <p className={taglineStyle}>{t('startScreen.tagline', 'Elevate Your Game')}</p>
        
        {/* Show different content based on auth state */}
        {!isAuthenticated ? (
          <div className="flex flex-col items-center text-center">
            <button 
              className={buttonStyle} 
              onClick={() => setShowAuthModal(true)}
            >
              <span className="flex items-center justify-center gap-2">
                <HiOutlineArrowRightOnRectangle className="w-4 sm:w-5 h-4 sm:h-5" />
                {t('auth.signIn')}
              </span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-3 sm:space-y-4 w-full max-h-[60vh] sm:max-h-none overflow-y-auto">
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
        )}
      </div>
      
      {/* Success toast notification - positioned in top area */}
      {showLoginSuccess && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2 bg-green-600/90 backdrop-blur-sm border border-green-500/70 text-green-100 px-6 py-3 rounded-lg shadow-lg animate-fade-in">
          <HiCheck className="w-5 h-5" />
          <span className="font-medium">{t('auth.loginSuccess')}</span>
        </div>
      )}
      
      {/* Auth modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}
      
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center space-x-2">
        <button
          aria-label={t('startScreen.languageEnglish', 'English')}
          onClick={() => setLanguage('en')}
          className={`w-10 h-8 rounded-md border text-sm font-bold flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${language === 'en' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'}`}
        >
          EN
        </button>
        <button
          aria-label={t('startScreen.languageFinnish', 'Finnish')}
          onClick={() => setLanguage('fi')}
          className={`w-10 h-8 rounded-md border text-sm font-bold flex items-center justify-center transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${language === 'fi' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-700 border-slate-600 text-white hover:bg-slate-600'}`}
        >
          FI
        </button>
      </div>
    </div>
  );
};

export default StartScreen;
