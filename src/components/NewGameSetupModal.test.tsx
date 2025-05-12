import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import NewGameSetupModal from './NewGameSetupModal';
import { getLastHomeTeamName, saveLastHomeTeamName } from '@/utils/appSettings';
import { getSeasons, addSeason } from '@/utils/seasons';
import { getTournaments, addTournament } from '@/utils/tournaments';

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

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key,
  }),
}));

describe('NewGameSetupModal', () => {
  const mockOnStart = jest.fn();
  const mockOnCancel = jest.fn();
  const defaultProps = {
    isOpen: true,
    initialPlayerSelection: ['player1', 'player2'],
    onStart: mockOnStart,
    onCancel: mockOnCancel,
  };

  const mockSeasons = [
    { id: 'season1', name: 'Spring 2024' },
    { id: 'season2', name: 'Summer 2024' }
  ];

  const mockTournaments = [
    { id: 'tournament1', name: 'City Cup' },
    { id: 'tournament2', name: 'Regional Tournament' }
  ];

  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock return values
    (getLastHomeTeamName as jest.Mock).mockReturnValue('Last Team');
    (getSeasons as jest.Mock).mockReturnValue(mockSeasons);
    (getTournaments as jest.Mock).mockReturnValue(mockTournaments);
    (addSeason as jest.Mock).mockImplementation((name) => {
      const newSeason = { id: `new-${name}`, name };
      return [...mockSeasons, newSeason];
    });
    (addTournament as jest.Mock).mockImplementation((name) => {
      const newTournament = { id: `new-${name}`, name };
      return [...mockTournaments, newTournament];
    });
  });

  test('loads the last home team name from appSettings utility', () => {
    render(<NewGameSetupModal {...defaultProps} />);
    
    // Check if the utility function was called
    expect(getLastHomeTeamName).toHaveBeenCalled();
    
    // Verify the home team input is populated with the value from getLastHomeTeamName
    const homeTeamInput = screen.getByLabelText(/Home Team Name/i);
    expect(homeTeamInput).toHaveValue('Last Team');
  });

  test('loads seasons and tournaments using utility functions when opened', () => {
    render(<NewGameSetupModal {...defaultProps} />);
    
    // Verify the utility functions were called
    expect(getSeasons).toHaveBeenCalled();
    expect(getTournaments).toHaveBeenCalled();
    
    // Check if the seasons and tournaments appear in the dropdowns
    expect(screen.getByText('Spring 2024')).toBeInTheDocument();
    expect(screen.getByText('City Cup')).toBeInTheDocument();
  });

  test('saves last home team name using utility function on start', () => {
    render(<NewGameSetupModal {...defaultProps} />);
    
    // Update home team name
    const homeTeamInput = screen.getByLabelText(/Home Team Name/i);
    fireEvent.change(homeTeamInput, { target: { value: 'New Team Name' } });
    
    // Fill required opponent field
    const opponentInput = screen.getByLabelText(/Opponent/i);
    fireEvent.change(opponentInput, { target: { value: 'Opponent Team' } });
    
    // Click start button
    const startButton = screen.getByText(/Start/i);
    fireEvent.click(startButton);
    
    // Verify utility function was called with the correct value
    expect(saveLastHomeTeamName).toHaveBeenCalledWith('New Team Name');
    
    // Verify onStart callback was called with appropriate params
    expect(mockOnStart).toHaveBeenCalledWith(
      expect.arrayContaining(['player1', 'player2']),
      'New Team Name',
      'Opponent Team',
      expect.any(String), // date
      '',
      '',
      null,
      null,
      2, // default periods
      10, // default duration
      'home' // default venue
    );
  });

  test('adds a new season using utility function', () => {
    render(<NewGameSetupModal {...defaultProps} />);
    
    // Find the season section first by its label
    const seasonSection = screen.getByText('Season:').closest('div');
    if (!seasonSection) throw new Error('Season section not found');
    
    // Click create new season button within the season section
    const createSeasonButton = within(seasonSection).getByText(/Create New/);
    fireEvent.click(createSeasonButton);
    
    // Enter new season name
    const seasonNameInput = screen.getByPlaceholderText(/Enter new season name/i);
    fireEvent.change(seasonNameInput, { target: { value: 'Fall 2024' } });
    
    // Click add button
    const addButton = screen.getByText(/Add/i);
    fireEvent.click(addButton);
    
    // Verify utility function was called with correct params
    expect(addSeason).toHaveBeenCalledWith('Fall 2024');
  });

  test('adds a new tournament using utility function', () => {
    render(<NewGameSetupModal {...defaultProps} />);
    
    // Find tournament section and click create new button
    const allCreateButtons = screen.getAllByText(/Create New/, { selector: 'button' });
    // The second button should be for tournament
    fireEvent.click(allCreateButtons[1]);
    
    // Enter new tournament name
    const tournamentNameInput = screen.getByPlaceholderText(/Enter new tournament name/i);
    fireEvent.change(tournamentNameInput, { target: { value: 'National Cup' } });
    
    // Click add button
    const addButton = screen.getByText(/Add/i);
    fireEvent.click(addButton);
    
    // Verify utility function was called with correct params
    expect(addTournament).toHaveBeenCalledWith('National Cup');
  });

  test('does not call onStart if home team name is empty', () => {
    render(<NewGameSetupModal {...defaultProps} />);
    
    // Clear home team name
    const homeTeamInput = screen.getByLabelText(/Home Team Name/i);
    fireEvent.change(homeTeamInput, { target: { value: '' } });
    
    // Fill opponent name
    const opponentInput = screen.getByLabelText(/Opponent/i);
    fireEvent.change(opponentInput, { target: { value: 'Opponent Team' } });
    
    // Mock window.alert
    window.alert = jest.fn();
    
    // Click start button
    const startButton = screen.getByText(/Start/i);
    fireEvent.click(startButton);
    
    // Verify utility function was not called
    expect(saveLastHomeTeamName).not.toHaveBeenCalled();
    
    // Verify onStart callback was not called
    expect(mockOnStart).not.toHaveBeenCalled();
    
    // Verify alert was shown
    expect(window.alert).toHaveBeenCalled();
  });

  test('calls onCancel when cancel/skip button is clicked', () => {
    render(<NewGameSetupModal {...defaultProps} />);
    
    const cancelButton = screen.getByText(/Skip/i);
    fireEvent.click(cancelButton);
    
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
}); 