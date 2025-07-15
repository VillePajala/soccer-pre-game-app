import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import StartScreen from './StartScreen';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

describe('StartScreen', () => {
  it('renders all action buttons', () => {
    const handlers = {
      onStartNewGame: jest.fn(),
      onLoadGame: jest.fn(),
      onResumeGame: jest.fn(),
      onCreateSeason: jest.fn(),
      onViewStats: jest.fn(),
      onAssessPlayers: jest.fn(),
      onOpenSettings: jest.fn(),
    };

    render(
      <StartScreen
        onStartNewGame={handlers.onStartNewGame}
        onLoadGame={handlers.onLoadGame}
        onResumeGame={handlers.onResumeGame}
        canResume
        onCreateSeason={handlers.onCreateSeason}
        onViewStats={handlers.onViewStats}
        onAssessPlayers={handlers.onAssessPlayers}
        onOpenSettings={handlers.onOpenSettings}
        onClose={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: 'Resume Last Game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start New Game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load Game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Season/Tournament' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Stats' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Assess Players' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'App Settings' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start New Game' }));
    expect(handlers.onStartNewGame).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Resume Last Game' }));
    expect(handlers.onResumeGame).toHaveBeenCalled();
  });
});
