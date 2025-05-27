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

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback || key,
  }),
}));

describe('NewGameSetupModal', () => {
  const mockOnStart = jest.fn();
  const mockOnCancel = jest.fn();

  const mockAddSeasonMutation = {
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isError: false,
    isIdle: true,
    isSuccess: false,
    error: null,
    data: undefined,
    reset: jest.fn(),
    variables: undefined,
    status: 'idle' as const,
    failureCount: 0,
    failureReason: null,
    context: undefined,
    isPaused: false,
    submittedAt: 0,
  } as any;
  
  const mockAddTournamentMutation = {
    mutate: jest.fn(),
    mutateAsync: jest.fn(),
    isPending: false,
    isError: false,
    isIdle: true,
    isSuccess: false,
    error: null,
    data: undefined,
    reset: jest.fn(),
    variables: undefined,
    status: 'idle' as const,
    failureCount: 0,
    failureReason: null,
    context: undefined,
    isPaused: false,
    submittedAt: 0,
  } as any;
  
  const defaultProps = {
    isOpen: true,
    initialPlayerSelection: ['player1', 'player2'],
    onStart: mockOnStart,
    onCancel: mockOnCancel,
    addSeasonMutation: mockAddSeasonMutation as UseMutationResult<Season | null, Error, { name: string }, unknown>,
    addTournamentMutation: mockAddTournamentMutation as UseMutationResult<Tournament | null, Error, { name: string }, unknown>,
    isAddingSeason: false,
    isAddingTournament: false,
  };

  const mockSeasonsData = [
    { id: 'season1', name: 'Spring 2024' },
    { id: 'season2', name: 'Summer 2024' }
  ];

  const mockTournamentsData = [
    { id: 'tournament1', name: 'City Cup' },
    { id: 'tournament2', name: 'Regional Tournament' }
  ];

  const mockPlayersData = [
    { id: 'player1', name: 'John Doe', jerseyNumber: 10 },
    { id: 'player2', name: 'Jane Smith', jerseyNumber: 7 }
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Make all async functions return resolved promises immediately
    (getLastHomeTeamName as jest.Mock).mockResolvedValue('Last Team');
    (saveLastHomeTeamName as jest.Mock).mockResolvedValue(true);
    (getMasterRoster as jest.Mock).mockResolvedValue(mockPlayersData);
    (getSeasons as jest.Mock).mockResolvedValue(mockSeasonsData);
    (getTournaments as jest.Mock).mockResolvedValue(mockTournamentsData);
    
    // Make mutation functions return resolved promises
    (addSeason as jest.Mock).mockImplementation(async (name) => {
      const newSeason = { id: `new-${name}`, name };
      return Promise.resolve(newSeason);
    });
    (addTournament as jest.Mock).mockImplementation(async (name) => {
      const newTournament = { id: `new-${name}`, name };
      return Promise.resolve(newTournament);
    });

    // Setup mock mutation async functions
    (mockAddSeasonMutation.mutateAsync as jest.Mock).mockImplementation(async ({ name }: { name: string }) => {
      const newSeason = { id: `new-${name}`, name };
      return Promise.resolve(newSeason);
    });
    
    (mockAddTournamentMutation.mutateAsync as jest.Mock).mockImplementation(async ({ name }: { name: string }) => {
      const newTournament = { id: `new-${name}`, name };
      return Promise.resolve(newTournament);
    });
  });

  // Helper function to properly render and wait for loading to complete
  const renderAndWaitForLoad = async () => {
    const { container } = render(<NewGameSetupModal {...defaultProps} />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading setup data...')).not.toBeInTheDocument();
    }, { timeout: 10000 });
    
    // Ensure form is rendered
    await waitFor(() => {
      expect(screen.getByLabelText(/Your Team Name/i)).toBeInTheDocument();
    }, { timeout: 5000 });
    
    return { container };
  };

  test('loads the last home team name from appSettings utility and populates input', async () => {
    await renderAndWaitForLoad();
    
    expect(getLastHomeTeamName).toHaveBeenCalled();
    
    const homeTeamInput = screen.getByLabelText(/Your Team Name/i);
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
    
    const homeTeamInput = screen.getByLabelText(/Your Team Name/i);
    fireEvent.change(homeTeamInput, { target: { value: 'New Team Name' } });
    
    const opponentInput = screen.getByLabelText(/Opponent Name.*:/i);
    fireEvent.change(opponentInput, { target: { value: 'Opponent Team' } });
    
    const startButton = screen.getByText(/Confirm & Start Game/i);
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(saveLastHomeTeamName).toHaveBeenCalledWith('New Team Name');
    });
    
    expect(mockOnStart).toHaveBeenCalledWith(
      expect.arrayContaining(['player1', 'player2']),
      'New Team Name',
      'Opponent Team',
      expect.any(String),
      '',
      '',
      null,
      null,
      2, 
      10, 
      'home' 
    );
  });

  test('adds a new season using utility function', async () => {
    await renderAndWaitForLoad();
    
    const seasonSection = screen.getByText(/Season:/i).closest('div');
    if (!seasonSection) throw new Error('Season section not found');
    
    // Look for the create season button by its translation key text
    fireEvent.click(within(seasonSection).getByText('newGameSetupModal.createSeason'));
    
    const seasonNameInput = screen.getByPlaceholderText(/Enter new season name/i);
    fireEvent.change(seasonNameInput, { target: { value: 'Fall 2024' } });
    
    fireEvent.click(screen.getByText(/Add/i));
    
    await waitFor(() => expect(mockAddSeasonMutation.mutateAsync).toHaveBeenCalledWith({ name: 'Fall 2024' }));
    
    await waitFor(() => {
        expect(screen.getByText('Fall 2024')).toBeInTheDocument();
    });
  });

  test('adds a new tournament using utility function', async () => {
    await renderAndWaitForLoad();
    
    // Find the tournament section and click the create button
    const tournamentSection = screen.getByText(/Tournament:/i).closest('div');
    if (!tournamentSection) throw new Error('Tournament section not found');
    
    fireEvent.click(within(tournamentSection).getByText('newGameSetupModal.createTournament'));
    
    const tournamentNameInput = screen.getByPlaceholderText(/Enter new tournament name/i);
    fireEvent.change(tournamentNameInput, { target: { value: 'National Cup' } });
    
    fireEvent.click(screen.getByText(/Add/i));
    
    await waitFor(() => expect(mockAddTournamentMutation.mutateAsync).toHaveBeenCalledWith({ name: 'National Cup' }));
    await waitFor(() => {
        expect(screen.getByText('National Cup')).toBeInTheDocument();
    });
  });

  test('does not call onStart if home team name is empty, and saveLastHomeTeamName is not called', async () => {
    await renderAndWaitForLoad();
    
    const homeTeamInput = screen.getByLabelText(/Your Team Name/i);
    fireEvent.change(homeTeamInput, { target: { value: '' } });
    
    const opponentInput = screen.getByLabelText(/Opponent Name.*:/i);
    fireEvent.change(opponentInput, { target: { value: 'Opponent Team' } });
    
    window.alert = jest.fn();
    
    const startButton = screen.getByText(/Confirm & Start Game/i);
    fireEvent.click(startButton);
    
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });

    expect(saveLastHomeTeamName).not.toHaveBeenCalled();
    expect(mockOnStart).not.toHaveBeenCalled();
  });

  test('calls onCancel when cancel button is clicked', async () => {
    await renderAndWaitForLoad();
    
    const cancelButton = screen.getByText(/Cancel/i);
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });

  test('should render loading state initially and then form after data loads', async () => {
    await act(async () => {
      render(<NewGameSetupModal {...defaultProps} />);
    });
    
    // Should show loading initially
    expect(screen.getByText('Loading setup data...')).toBeInTheDocument();
    
    // Wait for loading to complete
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
    
    await waitFor(() => {
      expect(screen.queryByText('Loading setup data...')).not.toBeInTheDocument();
    }, { timeout: 10000 });
    
    // Should show form after loading
    expect(screen.getByLabelText(/Your Team Name/i)).toBeInTheDocument();
  });

  test('debug: check if mocks are being called', async () => {
    render(<NewGameSetupModal {...defaultProps} />);
    
    // Check if the component renders at all
    expect(screen.getByText('Loading setup data...')).toBeInTheDocument();
    
    // Check if mocks are being called
    await waitFor(() => {
      expect(getMasterRoster).toHaveBeenCalled();
      expect(getLastHomeTeamName).toHaveBeenCalled();
      expect(getSeasons).toHaveBeenCalled();
      expect(getTournaments).toHaveBeenCalled();
    }, { timeout: 1000 });
    
    // Log what the mocks returned
    console.log('getMasterRoster returned:', (getMasterRoster as jest.Mock).mock.results);
    console.log('getLastHomeTeamName returned:', (getLastHomeTeamName as jest.Mock).mock.results);
    console.log('getSeasons returned:', (getSeasons as jest.Mock).mock.results);
    console.log('getTournaments returned:', (getTournaments as jest.Mock).mock.results);
  }, 10000);
}); 