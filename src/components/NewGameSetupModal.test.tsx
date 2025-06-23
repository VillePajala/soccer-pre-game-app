/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent, within, waitFor, act } from '@testing-library/react';
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

// Simplified Mock i18n - always returns the fallback or the key itself
const mockT = jest.fn((key: string, fallback?: any) => {
    // For specific keys that we know the component uses for titles, we can return those
    // but generally, prefer relying on the fallback for text content.
    if (key === 'newGameSetupModal.createSeason') return fallback || 'Create new season';
    if (key === 'newGameSetupModal.createTournament') return fallback || 'Create new tournament';
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
    isOpen: true, initialPlayerSelection: ['player1', 'player2'], onStart: mockOnStart, onCancel: mockOnCancel,
    addSeasonMutation: mockAddSeasonMutation as UseMutationResult<Season | null, Error, { name: string }, unknown>,
    addTournamentMutation: mockAddTournamentMutation as UseMutationResult<Tournament | null, Error, { name: string }, unknown>,
    isAddingSeason: false, isAddingTournament: false,
  };

  const mockSeasonsData = [{ id: 'season1', name: 'Spring 2024' }, { id: 'season2', name: 'Summer 2024' }];
  const mockTournamentsData = [{ id: 'tournament1', name: 'City Cup' }, { id: 'tournament2', name: 'Regional Tournament' }];
  const mockPlayersData = [{ id: 'player1', name: 'John Doe', jerseyNumber: 10 },{ id: 'player2', name: 'Jane Smith', jerseyNumber: 7 }];

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
    // Use the fallback English text for the loading message, as per our simplified mockT
    await waitFor(() => 
      expect(screen.queryByText('Loading setup data...')).not.toBeInTheDocument(),
      { timeout: 10000 } 
    );
    await waitFor(() => {
        // Use fallback for label text
        expect(screen.getByLabelText('Your Team Name')).toBeInTheDocument();
    });
  };

  test('loads the last home team name from appSettings utility and populates input', async () => {
    await renderAndWaitForLoad();
    expect(getLastHomeTeamName).toHaveBeenCalled();
    // Use fallback for label text
    const homeTeamInput = screen.getByLabelText('Your Team Name');
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
    const homeTeamInput = screen.getByLabelText('Your Team Name');
    fireEvent.change(homeTeamInput, { target: { value: 'New Team Name' } });
    // Use fallback for label text, ensure regex matches colon and asterisk
    const opponentInput = screen.getByLabelText(/Opponent Name: \*/i); 
    fireEvent.change(opponentInput, { target: { value: 'Opponent Team' } });
    // Use fallback for button text
    const startButton = screen.getByText('Confirm & Start Game');
    
    await act(async () => {
        fireEvent.click(startButton);
    });
    
    await waitFor(() => {
      expect(saveLastHomeTeamName).toHaveBeenCalledWith('New Team Name');
    });
    expect(mockOnStart).toHaveBeenCalledWith(
      expect.arrayContaining(['player1', 'player2']), 'New Team Name', 'Opponent Team',
      expect.any(String), '', '', null, null, 2, 10, 'home' 
    );
  });

  test('adds a new season using utility function', async () => {
    await renderAndWaitForLoad();
    // Use fallback for label text
    const seasonSection = screen.getByText('Season:').closest('div');
    if (!seasonSection) throw new Error('Season section not found');
    
    await act(async () => {
        // Find by title attribute, using the English fallback as per mockT
        fireEvent.click(within(seasonSection).getByTitle('Create new season'));
    });
    
    // Use fallback for placeholder text
    const seasonNameInput = screen.getByPlaceholderText('Enter new season name...');
    fireEvent.change(seasonNameInput, { target: { value: 'Fall 2024' } });
    
    await act(async () => {
        // Use fallback for button text
        fireEvent.click(screen.getByText('Add'));
    });

    await waitFor(() => expect(mockAddSeasonMutation.mutateAsync).toHaveBeenCalledWith({ name: 'Fall 2024' }));
  });

  test('adds a new tournament using utility function', async () => {
    await renderAndWaitForLoad();
    // Use fallback for label text
    const tournamentSection = screen.getByText('Tournament:').closest('div');
    if (!tournamentSection) throw new Error('Tournament section not found');

    await act(async () => {
        // Find by title attribute, using the English fallback as per mockT
        fireEvent.click(within(tournamentSection).getByTitle('Create new tournament'));
    });

    // Use fallback for placeholder text
    const tournamentNameInput = screen.getByPlaceholderText('Enter new tournament name...');
    fireEvent.change(tournamentNameInput, { target: { value: 'National Cup' } });

    await act(async () => {
        // Use fallback for button text
        fireEvent.click(screen.getByText('Add'));
    });
    
    await waitFor(() => expect(mockAddTournamentMutation.mutateAsync).toHaveBeenCalledWith({ name: 'National Cup' }));
  });

  test('does not call onStart if home team name is empty, and saveLastHomeTeamName is not called', async () => {
    await renderAndWaitForLoad();
    const homeTeamInput = screen.getByLabelText('Your Team Name');
    fireEvent.change(homeTeamInput, { target: { value: '' } });
    const opponentInput = screen.getByLabelText(/Opponent Name: \*/i);
    fireEvent.change(opponentInput, { target: { value: 'Opponent Team' } });
    window.alert = jest.fn();
    const startButton = screen.getByText('Confirm & Start Game');
    
    await act(async () => {
        fireEvent.click(startButton);
    });

    await waitFor(() => {
      // Use fallback for alert message
      expect(window.alert).toHaveBeenCalledWith('Home Team Name is required.');
    });
    expect(saveLastHomeTeamName).not.toHaveBeenCalled();
    expect(mockOnStart).not.toHaveBeenCalled();
  });

  test('calls onCancel when cancel button is clicked', async () => {
    await renderAndWaitForLoad();
    // Use fallback for button text
    const cancelButton = screen.getByText('Cancel');
    await act(async () => {
        fireEvent.click(cancelButton);
    });
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test('should render loading state initially and then form after data loads', async () => {
    render(<NewGameSetupModal {...defaultProps} />); 
    // Use fallback for loading text
    expect(screen.getByText('Loading setup data...')).toBeInTheDocument();
    
    await waitFor(() => 
      // Use fallback for loading text
      expect(screen.queryByText('Loading setup data...')).not.toBeInTheDocument(),
      { timeout: 10000 }
    );
    // Use fallback for label text
    expect(screen.getByLabelText('Your Team Name')).toBeInTheDocument();
  });
});