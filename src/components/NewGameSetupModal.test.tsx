/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import NewGameSetupModal from './NewGameSetupModal';
import { getLastHomeTeamName, saveLastHomeTeamName } from '@/utils/appSettings';
import { getSeasons, addSeason } from '@/utils/seasons';
import { getTournaments, addTournament } from '@/utils/tournaments';
import { getMasterRoster } from '@/utils/masterRosterManager';
import type { UseMutationResult } from '@tanstack/react-query';
import type { Season, Tournament } from '@/types';

// Mock the utility functions
jest.mock('@/utils/appSettings', () => ({
  getLastHomeTeamName: jest.fn(),
  saveLastHomeTeamName: jest.fn(),
}));

jest.mock('@/utils/seasons', () => ({
  getSeasons: jest.fn(),
  addSeason: jest.fn(),
}));

jest.mock('@/utils/tournaments', () => ({
  getTournaments: jest.fn(),
  addTournament: jest.fn(),
}));

jest.mock('@/utils/masterRosterManager', () => ({
  getMasterRoster: jest.fn(),
}));

// More robust i18n mock
const translations: { [key: string]: string } = {
  'newGameSetupModal.title': 'New Game Setup',
  'newGameSetupModal.loading': 'Loading setup data...',
  'newGameSetupModal.homeTeamLabel': 'Your Team Name',
  'newGameSetupModal.homeTeamPlaceholder': 'e.g., Galaxy U10',
  'newGameSetupModal.opponentNameLabel': 'Opponent Name: *',
  'newGameSetupModal.opponentNamePlaceholder': 'Enter opponent name',
  'newGameSetupModal.playersHeader': 'Select Players',
  'newGameSetupModal.playersSelected': 'selected',
  'newGameSetupModal.selectAll': 'Select All',
  'newGameSetupModal.seasonLabel': 'Season:',
  'newGameSetupModal.tournamentLabel': 'Tournament:',
  'newGameSetupModal.createSeason': 'Create new season',
  'newGameSetupModal.createTournament': 'Create new tournament',
  'newGameSetupModal.addSeasonPlaceholder': 'Enter new season name...',
  'newGameSetupModal.addTournamentPlaceholder': 'Enter new tournament name...',
  'common.add': 'Add',
  'common.cancel': 'Cancel',
  'newGameSetupModal.confirmButton': 'Confirm & Start Game',
  'newGameSetupModal.errorHomeTeamRequired': 'Home Team Name is required.',
  'newGameSetupModal.unplayedToggle': 'Not played yet',
};

const mockT = jest.fn((key: string, fallback?: any) => {
    // If a specific translation exists in our map, return it.
    if (translations[key]) {
        return translations[key];
    }
    // If it's an object with a fallback (like for placeholders), use that.
    if (typeof fallback === 'object' && fallback !== null) {
        // A simple attempt to replace placeholders if any.
        let text = translations[key] || key;
        Object.keys(fallback).forEach(placeholder => {
            text = text.replace(`{{${placeholder}}}`, fallback[placeholder]);
        });
        return text;
    }
    // Otherwise, return the fallback string or the key itself.
    return fallback || key;
});

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
  }),
}));

// Polyfill for setImmediate
if (typeof setImmediate === 'undefined') {
  global.setImmediate = ((fn: (...args: any[]) => void, ...args: any[]) => setTimeout(() => fn(...args), 0)) as any;
}

describe('NewGameSetupModal', () => {
  const mockOnStart = jest.fn();
  const mockOnCancel = jest.fn();

  const mockSeasonsData = [{ id: 'season1', name: 'Spring 2024' }, { id: 'season2', name: 'Summer 2024' }];
  const mockTournamentsData = [{ id: 'tournament1', name: 'City Cup' }, { id: 'tournament2', name: 'Regional Tournament' }];
  const mockPlayersData = [
    { id: 'player1', name: 'John Doe', jerseyNumber: '10', isGoalie: false, receivedFairPlayCard: false },
    { id: 'player2', name: 'Jane Smith', jerseyNumber: '7', isGoalie: false, receivedFairPlayCard: false }
  ];

  const mockAddSeasonMutation = {
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false, isError: false, isIdle: true, isSuccess: false, error: null, data: undefined, reset: jest.fn(), variables: undefined, status: 'idle' as const, failureCount: 0, failureReason: null, context: undefined, isPaused: false, submittedAt: 0,
  } as any;
  
  const mockAddTournamentMutation = {
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false, isError: false, isIdle: true, isSuccess: false, error: null, data: undefined, reset: jest.fn(), variables: undefined, status: 'idle' as const, failureCount: 0, failureReason: null, context: undefined, isPaused: false, submittedAt: 0,
  } as any;
  
  const defaultProps = {
    isOpen: true, 
    initialPlayerSelection: ['player1', 'player2'], 
    availablePlayers: mockPlayersData,
    onStart: mockOnStart, 
    onCancel: mockOnCancel,
    addSeasonMutation: mockAddSeasonMutation as UseMutationResult<Season | null, Error, { name: string }, unknown>,
    addTournamentMutation: mockAddTournamentMutation as UseMutationResult<Tournament | null, Error, { name: string }, unknown>,
    isAddingSeason: false, 
    isAddingTournament: false,
    demandFactor: 1,
    onDemandFactorChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockT.mockClear();
    
    (getLastHomeTeamName as jest.Mock).mockResolvedValue('Last Team');
    (saveLastHomeTeamName as jest.Mock).mockResolvedValue(true);
    (getMasterRoster as jest.Mock).mockResolvedValue(mockPlayersData);
    (getSeasons as jest.Mock).mockResolvedValue(mockSeasonsData);
    (getTournaments as jest.Mock).mockResolvedValue(mockTournamentsData);
    
    (addSeason as jest.Mock).mockImplementation(async (name) => ({ id: `new-${name}`, name }));
    (addTournament as jest.Mock).mockImplementation(async (name) => ({ id: `new-${name}`, name }));
    (mockAddSeasonMutation.mutateAsync as jest.Mock).mockImplementation(async ({ name }) => ({ id: `new-${name}`, name }));
    (mockAddTournamentMutation.mutateAsync as jest.Mock).mockImplementation(async ({ name }) => ({ id: `new-${name}`, name }));
  });

  const renderAndWaitForLoad = async () => {
    render(<NewGameSetupModal {...defaultProps} />);
    // Use the translation key for the loading message
    await waitFor(() => 
      expect(screen.queryByText(translations['newGameSetupModal.loading'])).not.toBeInTheDocument(),
      { timeout: 10000 } 
    );
    await waitFor(() => {
        // Use getByRole for a more robust selector
        expect(screen.getByRole('textbox', { name: /Your Team Name/i })).toBeInTheDocument();
    });
  };

  test('loads the last home team name from appSettings utility and populates input', async () => {
    await renderAndWaitForLoad();
    expect(getLastHomeTeamName).toHaveBeenCalled();
    // Use getByRole
    const homeTeamInput = screen.getByRole('textbox', { name: /Your Team Name/i });
    expect(homeTeamInput).toHaveValue('Last Team');
  });

  test('loads seasons and tournaments using utility functions when opened', async () => {
    await renderAndWaitForLoad();
    expect(getSeasons).toHaveBeenCalled();
    expect(getTournaments).toHaveBeenCalled();
    expect(screen.getByText('Spring 2024')).toBeInTheDocument();
    expect(screen.getByText('City Cup')).toBeInTheDocument();
  });

  test('saves last home team name using utility function on start', async () => {
    await renderAndWaitForLoad();
    const homeTeamInput = screen.getByRole('textbox', { name: /Your Team Name/i });
    fireEvent.change(homeTeamInput, { target: { value: 'New Team Name' } });
    const opponentInput = screen.getByRole('textbox', { name: /Opponent Name/i }); 
    fireEvent.change(opponentInput, { target: { value: 'Opponent Team' } });
    const startButton = screen.getByRole('button', { name: /Confirm & Start Game/i });
    
    await act(async () => {
        fireEvent.click(startButton);
    });
    
    await waitFor(() => {
      expect(saveLastHomeTeamName).toHaveBeenCalledWith('New Team Name');
    });
    expect(mockOnStart).toHaveBeenCalledWith(
      expect.arrayContaining(['player1', 'player2']), 'New Team Name', 'Opponent Team',
      expect.any(String), '', '', null, null, 2, 10, 'home', 1, '', '', true
    );
  });

  test('adds a new season using utility function', async () => {
    await renderAndWaitForLoad();
    
    await act(async () => {
        fireEvent.click(screen.getByTitle('Create new season'));
    });
    
    const seasonNameInput = screen.getByPlaceholderText('Enter new season name...');
    fireEvent.change(seasonNameInput, { target: { value: 'Fall 2024' } });
    
    await act(async () => {
        fireEvent.click(screen.getByText('Add'));
    });

    await waitFor(() => expect(mockAddSeasonMutation.mutateAsync).toHaveBeenCalledWith({ name: 'Fall 2024' }));
  });

  test('adds a new tournament using utility function', async () => {
    await renderAndWaitForLoad();

    await act(async () => {
        fireEvent.click(screen.getByTitle('Create new tournament'));
    });

    const tournamentNameInput = screen.getByPlaceholderText('Enter new tournament name...');
    fireEvent.change(tournamentNameInput, { target: { value: 'National Cup' } });

    await act(async () => {
        fireEvent.click(screen.getByText('Add'));
    });
    
    await waitFor(() => expect(mockAddTournamentMutation.mutateAsync).toHaveBeenCalledWith({ name: 'National Cup' }));
  });

  test('passes isPlayed false when not played toggle checked', async () => {
    await renderAndWaitForLoad();
    const opponentInput = screen.getByRole('textbox', { name: /Opponent Name/i });
    fireEvent.change(opponentInput, { target: { value: 'Opponent Team' } });
    const toggle = screen.getByLabelText(translations['newGameSetupModal.unplayedToggle']);
    fireEvent.click(toggle);
    const startButton = screen.getByRole('button', { name: /Confirm & Start Game/i });
    await act(async () => {
        fireEvent.click(startButton);
    });
    await waitFor(() => {
      expect(mockOnStart).toHaveBeenCalledWith(
        expect.arrayContaining(['player1', 'player2']), 'Last Team', 'Opponent Team',
        expect.any(String), '', '', null, null, 2, 10, 'home', 1, '', '', false
      );
    });
  });

  test('does not call onStart if home team name is empty, and saveLastHomeTeamName is not called', async () => {
    await renderAndWaitForLoad();
    const homeTeamInput = screen.getByRole('textbox', { name: /Your Team Name/i });
    fireEvent.change(homeTeamInput, { target: { value: '' } });
    const opponentInput = screen.getByRole('textbox', { name: /Opponent Name/i });
    fireEvent.change(opponentInput, { target: { value: 'Opponent Team' } });
    window.alert = jest.fn();
    const startButton = screen.getByRole('button', { name: /Confirm & Start Game/i });
    
    await act(async () => {
        fireEvent.click(startButton);
    });

    await waitFor(() => {
      // Use translation key for alert message
      expect(window.alert).toHaveBeenCalledWith(translations['newGameSetupModal.errorHomeTeamRequired']);
    });
    expect(saveLastHomeTeamName).not.toHaveBeenCalled();
    expect(mockOnStart).not.toHaveBeenCalled();
  });

  test('calls onCancel when cancel button is clicked', async () => {
    await renderAndWaitForLoad();
    // Use translation key for button text
    const cancelButton = screen.getByText(translations['common.cancel']);
    await act(async () => {
        fireEvent.click(cancelButton);
    });
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test('should render loading state initially and then form after data loads', async () => {
    render(<NewGameSetupModal {...defaultProps} />); 
    // Use translation key for loading text
    expect(screen.getByText(translations['newGameSetupModal.loading'])).toBeInTheDocument();
    
    await waitFor(() => 
      // Use translation key for loading text
      expect(screen.queryByText(translations['newGameSetupModal.loading'])).not.toBeInTheDocument(),
      { timeout: 10000 }
    );
    // Use getByRole
    expect(screen.getByRole('textbox', { name: /Your Team Name/i })).toBeInTheDocument();
  });
});