import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import NewGameSetupModal from './NewGameSetupModal';
import { getLastHomeTeamName, saveLastHomeTeamName } from '@/utils/appSettings';
import { getSeasons, addSeason } from '@/utils/seasons';
import { getTournaments, addTournament } from '@/utils/tournaments';
import { getMasterRoster } from '@/utils/masterRosterManager';

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
  
  // Mock mutation objects with proper typing
  const mockAddSeasonMutation = {
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: null,
    reset: jest.fn(),
    variables: undefined,
    isIdle: false,
    isSuccess: false,
    status: 'idle' as const,
    failureCount: 0,
    failureReason: null,
    mutateAsync: jest.fn(),
  };
  
  const mockAddTournamentMutation = {
    mutate: jest.fn(),
    isPending: false,
    isError: false,
    error: null,
    data: null,
    reset: jest.fn(),
    variables: undefined,
    isIdle: false,
    isSuccess: false,
    status: 'idle' as const,
    failureCount: 0,
    failureReason: null,
    mutateAsync: jest.fn(),
  };
  
  const defaultProps = {
    isOpen: true,
    initialPlayerSelection: ['player1', 'player2'],
    onStart: mockOnStart,
    onCancel: mockOnCancel,
    addSeasonMutation: mockAddSeasonMutation as any, // eslint-disable-line @typescript-eslint/no-explicit-any
    addTournamentMutation: mockAddTournamentMutation as any, // eslint-disable-line @typescript-eslint/no-explicit-any
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

  let consoleErrorSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    
    (getLastHomeTeamName as jest.Mock).mockResolvedValue('Last Team');
    (saveLastHomeTeamName as jest.Mock).mockResolvedValue(true);
    (getMasterRoster as jest.Mock).mockResolvedValue(mockPlayersData);

    (getSeasons as jest.Mock).mockResolvedValue(mockSeasonsData);
    (getTournaments as jest.Mock).mockResolvedValue(mockTournamentsData);
    
    (addSeason as jest.Mock).mockImplementation(async (name) => {
      const newSeason = { id: `new-${name}`, name };
      return Promise.resolve(newSeason);
    });
    (addTournament as jest.Mock).mockImplementation(async (name) => {
      const newTournament = { id: `new-${name}`, name };
      return Promise.resolve(newTournament);
    });

    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  // Helper function to wait for loading to complete
  const waitForLoadingToComplete = async () => {
    await waitFor(() => {
      expect(screen.queryByText('Loading setup data...')).not.toBeInTheDocument();
    }, { timeout: 3000 });
  };

  test('loads the last home team name from appSettings utility and populates input', async () => {
    render(<NewGameSetupModal {...defaultProps} />);
    
    // Wait for loading to complete
    await waitForLoadingToComplete();
    
    expect(getLastHomeTeamName).toHaveBeenCalled();
    
    const homeTeamInput = screen.getByLabelText(/Your Team Name/i);
    expect(homeTeamInput).toHaveValue('Last Team');
  });

  test('loads seasons and tournaments using utility functions when opened', async () => {
    render(<NewGameSetupModal {...defaultProps} />);
    
    // Wait for loading to complete
    await waitForLoadingToComplete();
    
    expect(getSeasons).toHaveBeenCalled();
    expect(getTournaments).toHaveBeenCalled();
    
    expect(screen.getByText('Spring 2024')).toBeInTheDocument();
    expect(screen.getByText('City Cup')).toBeInTheDocument();
  });

  test('saves last home team name using utility function on start', async () => {
    render(<NewGameSetupModal {...defaultProps} />);
    
    // Wait for loading to complete
    await waitForLoadingToComplete();
    
    const homeTeamInput = screen.getByLabelText(/Your Team Name/i);
    fireEvent.change(homeTeamInput, { target: { value: 'New Team Name' } });
    
    const opponentInput = screen.getByLabelText(/Opponent Name/i);
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
    render(<NewGameSetupModal {...defaultProps} />);
    
    // Wait for loading to complete
    await waitForLoadingToComplete();
    
    const seasonSection = screen.getByText(/Season:/i).closest('div');
    if (!seasonSection) throw new Error('Season section not found');
    
    fireEvent.click(within(seasonSection).getByText(/Creating.../i));
    
    const seasonNameInput = screen.getByPlaceholderText(/Enter new season name/i);
    fireEvent.change(seasonNameInput, { target: { value: 'Fall 2024' } });
    
    fireEvent.click(screen.getByText(/Add/i));
    
    await waitFor(() => expect(addSeason).toHaveBeenCalledWith('Fall 2024'));
    
    await waitFor(() => {
        expect(screen.getByText('Fall 2024')).toBeInTheDocument();
    });
  });

  test('adds a new tournament using utility function', async () => {
    render(<NewGameSetupModal {...defaultProps} />);
    
    // Wait for loading to complete
    await waitForLoadingToComplete();
    
    const allCreateButtons = screen.getAllByText(/Creating.../i, { selector: 'button' });
    fireEvent.click(allCreateButtons[1]);
    
    const tournamentNameInput = screen.getByPlaceholderText(/Enter new tournament name/i);
    fireEvent.change(tournamentNameInput, { target: { value: 'National Cup' } });
    
    fireEvent.click(screen.getByText(/Add/i));
    
    await waitFor(() => expect(addTournament).toHaveBeenCalledWith('National Cup'));
    await waitFor(() => {
        expect(screen.getByText('National Cup')).toBeInTheDocument();
    });
  });

  test('does not call onStart if home team name is empty, and saveLastHomeTeamName is not called', async () => {
    render(<NewGameSetupModal {...defaultProps} />);
    
    // Wait for loading to complete
    await waitForLoadingToComplete();
    
    const homeTeamInput = screen.getByLabelText(/Your Team Name/i);
    fireEvent.change(homeTeamInput, { target: { value: '' } });
    
    const opponentInput = screen.getByLabelText(/Opponent Name/i);
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
    render(<NewGameSetupModal {...defaultProps} />);
    
    // Wait for loading to complete
    await waitForLoadingToComplete();
    
    const cancelButton = screen.getByText(/Cancel/i);
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
}); 
