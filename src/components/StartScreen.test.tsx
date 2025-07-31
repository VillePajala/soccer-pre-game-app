import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider } from '@/context/AuthContext';

jest.mock('@/i18n', () => ({
  __esModule: true,
  default: {
    language: 'en',
    changeLanguage: jest.fn(),
    isInitialized: true,
    on: jest.fn(),
    off: jest.fn(),
  },
}));

jest.mock('@/utils/appSettings', () => ({
  __esModule: true,
  getAppSettings: jest.fn().mockResolvedValue({ language: 'en' }),
  updateAppSettings: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/utils/fullBackup', () => ({
  __esModule: true,
  exportFullBackup: jest.fn().mockResolvedValue('{}'),
}));

jest.mock('@/utils/sendBackupEmail', () => ({
  __esModule: true,
  sendBackupEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/supabase', () => ({
  __esModule: true,
  default: {
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: jest.fn().mockReturnValue({ data: { subscription: { unsubscribe: jest.fn() } } }),
      signInAnonymously: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    }
  }
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

import i18n from '@/i18n';
import StartScreen from './StartScreen';

describe('StartScreen', () => {
  it('renders all action buttons', () => {
    const handlers = {
      onStartNewGame: jest.fn(),
      onLoadGame: jest.fn(),
      onResumeGame: jest.fn(),
      onCreateSeason: jest.fn(),
      onViewStats: jest.fn(),
    };

    render(
      <AuthProvider>
        <StartScreen
          onStartNewGame={handlers.onStartNewGame}
          onLoadGame={handlers.onLoadGame}
          onResumeGame={handlers.onResumeGame}
          canResume
          isAuthenticated
          onCreateSeason={handlers.onCreateSeason}
          onViewStats={handlers.onViewStats}
        />
      </AuthProvider>
    );

    expect(screen.getByRole('button', { name: 'Resume Last Game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start New Game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load Game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Season/Tournament' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Stats' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'English' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Finnish' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start New Game' }));
    expect(handlers.onStartNewGame).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Resume Last Game' }));
    expect(handlers.onResumeGame).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Finnish' }));
    expect(i18n.changeLanguage).toHaveBeenCalledWith('fi');
  });
});
