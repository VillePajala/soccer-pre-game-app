'use client';

import ModalProvider from '@/contexts/ModalProvider';
import HomePage from '@/components/HomePage';
import StartScreen from '@/components/StartScreen';
import { useState, useEffect } from 'react';
import { getCurrentGameIdSetting } from '@/utils/appSettings';
import { getSavedGames } from '@/utils/savedGames';
import { useAuthStorage } from '@/hooks/useAuthStorage';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const [screen, setScreen] = useState<'start' | 'home'>('start');
  const [initialAction, setInitialAction] = useState<'newGame' | 'loadGame' | 'resumeGame' | 'season' | 'stats' | null>(null);
  const [canResume, setCanResume] = useState(false);
  
  // Get auth state to listen for logout
  const { user } = useAuth();
  
  // Sync auth state with storage manager
  useAuthStorage();

  // Reset to StartScreen when user logs out
  useEffect(() => {
    if (!user && screen === 'home') {
      setScreen('start');
      setInitialAction(null);
    }
  }, [user, screen]);

  useEffect(() => {
    const checkResume = async () => {
      try {
        const lastId = await getCurrentGameIdSetting();
        if (!lastId) return;
        const games = await getSavedGames();
        if (games[lastId]) {
          setCanResume(true);
        }
      } catch {
        setCanResume(false);
      }
    };
    checkResume();
  }, []);

  const handleAction = (
    action: 'newGame' | 'loadGame' | 'resumeGame' | 'season' | 'stats'
  ) => {
    setInitialAction(action);
    setScreen('home');
  };
  
  const handleExplore = () => {
    // Just switch to home screen without any initial action
    setScreen('home');
  };

  return (
    <ModalProvider>
      {screen === 'start' ? (
        <StartScreen
          onStartNewGame={() => handleAction('newGame')}
          onLoadGame={() => handleAction('loadGame')}
          onResumeGame={() => handleAction('resumeGame')}
          canResume={canResume}
          onCreateSeason={() => handleAction('season')}
          onViewStats={() => handleAction('stats')}
          onExplore={handleExplore}
          isAuthenticated={!!user}
        />
      ) : (
        <HomePage initialAction={initialAction ?? undefined} skipInitialSetup />
      )}
    </ModalProvider>
  );
}
