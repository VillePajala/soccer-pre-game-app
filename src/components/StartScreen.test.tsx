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
      onCreateSeason: jest.fn(),
      onViewStats: jest.fn(),
    };

    render(
      <StartScreen
        onStartNewGame={handlers.onStartNewGame}
        onLoadGame={handlers.onLoadGame}
        onCreateSeason={handlers.onCreateSeason}
        onViewStats={handlers.onViewStats}
      />
    );

    expect(screen.getByRole('button', { name: 'Start New Game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Load Game' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Season/Tournament' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'View Stats' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start New Game' }));
    expect(handlers.onStartNewGame).toHaveBeenCalled();
  });
});
