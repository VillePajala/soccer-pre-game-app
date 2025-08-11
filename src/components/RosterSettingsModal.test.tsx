import React from 'react';
import { render, screen, fireEvent } from '@/__tests__/test-utils';
import '@testing-library/jest-dom';

import RosterSettingsModal from './RosterSettingsModal';
import type { Player } from '@/types';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | undefined) => fallback || key,
  }),
}));

const mockOnClose = jest.fn();
const mockOnAddPlayer = jest.fn();
const mockOnRemovePlayer = jest.fn();
const mockOnTeamNameChange = jest.fn();
const mockOnRenamePlayer = jest.fn();
const mockOnSetJerseyNumber = jest.fn();
const mockOnSetPlayerNotes = jest.fn();
const mockOnTogglePlayerSelection = jest.fn();
const mockOnOpenPlayerStats = jest.fn();

const mockPlayers: Player[] = [
  { id: 'p1', name: 'Player One', nickname: 'P1', jerseyNumber: '10', notes: 'Note 1' },
  { id: 'p2', name: 'Player Two', nickname: 'P2', jerseyNumber: '20', notes: 'Note 2' },
];

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  availablePlayers: mockPlayers,
  onRenamePlayer: mockOnRenamePlayer,
  onSetJerseyNumber: mockOnSetJerseyNumber,
  onSetPlayerNotes: mockOnSetPlayerNotes,
  onRemovePlayer: mockOnRemovePlayer,
  onAddPlayer: mockOnAddPlayer,
  selectedPlayerIds: [],
  onTogglePlayerSelection: mockOnTogglePlayerSelection,
  teamName: 'Test Team Name',
  onTeamNameChange: mockOnTeamNameChange,
  onOpenPlayerStats: mockOnOpenPlayerStats,
};

describe('<RosterSettingsModal />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders the modal when isOpen is true', () => {
    render(<RosterSettingsModal {...defaultProps} />);
    expect(screen.getByText('rosterSettingsModal.title')).toBeInTheDocument();
    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'rosterSettingsModal.addPlayerButton' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'common.doneButton' })).toBeInTheDocument();
  });

  test('does not render when isOpen is false', () => {
    render(<RosterSettingsModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Manage Roster')).not.toBeInTheDocument();
  });

  test('calls onClose when Done button is clicked', () => {
    render(<RosterSettingsModal {...defaultProps} />);
    const doneButton = screen.getByRole('button', { name: 'common.doneButton' });
    fireEvent.click(doneButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('shows add player form when Add Player button is clicked', () => {
    render(<RosterSettingsModal {...defaultProps} />);
    const addButton = screen.getByRole('button', { name: 'rosterSettingsModal.addPlayerButton' });
    fireEvent.click(addButton);
    expect(screen.getByPlaceholderText('rosterSettingsModal.playerNamePlaceholder')).toBeInTheDocument();
  });

  test('adds a new player when form is submitted', () => {
    render(<RosterSettingsModal {...defaultProps} />);
    
    // Open form
    const addButtons = screen.getAllByRole('button', { name: 'rosterSettingsModal.addPlayerButton' });
    const mainAddButton = addButtons.find(button => !button.hasAttribute('disabled'));
    if (!mainAddButton) throw new Error('No enabled Add Player button found');
    fireEvent.click(mainAddButton);
    
    // Fill form
    const newPlayer = {
      name: 'New Player',
      nickname: 'NP',
      jerseyNumber: '99',
      notes: 'Test notes'
    };
    
    fireEvent.change(screen.getByPlaceholderText('rosterSettingsModal.playerNamePlaceholder'), { target: { value: newPlayer.name }});
    fireEvent.change(screen.getByPlaceholderText('rosterSettingsModal.nicknamePlaceholder'), { target: { value: newPlayer.nickname }});
    fireEvent.change(screen.getByPlaceholderText('rosterSettingsModal.jerseyHeader'), { target: { value: newPlayer.jerseyNumber }});
    fireEvent.change(screen.getByPlaceholderText('rosterSettingsModal.notesPlaceholder'), { target: { value: newPlayer.notes }});
    
    // Submit - click the confirm add player button
    const submitButton = screen.getByRole('button', { name: 'rosterSettingsModal.confirmAddPlayer' });
    fireEvent.click(submitButton);
    
    expect(mockOnAddPlayer).toHaveBeenCalledWith(newPlayer);
  });

  test('edits player when edit form is submitted', () => {
    render(<RosterSettingsModal {...defaultProps} />);
    
    // Find and click edit button for P1
    const editButtons = screen.getAllByTitle('Muokkaa');
    fireEvent.click(editButtons[0]); // First edit button should be for P1
    
    // Fill edit form
    const updatedData = {
      name: 'Updated Name',
      nickname: 'UN',
      jerseyNumber: '11',
      notes: 'Updated notes'
    };
    
    fireEvent.change(screen.getByDisplayValue('Player One'), { target: { value: updatedData.name }});
    fireEvent.change(screen.getByDisplayValue('P1'), { target: { value: updatedData.nickname }});
    fireEvent.change(screen.getByDisplayValue('10'), { target: { value: updatedData.jerseyNumber }});
    fireEvent.change(screen.getByDisplayValue('Note 1'), { target: { value: updatedData.notes }});
    
    // Save
    fireEvent.click(screen.getByTitle('Tallenna'));
    
    expect(mockOnRenamePlayer).toHaveBeenCalledWith('p1', { name: updatedData.name, nickname: updatedData.nickname });
    expect(mockOnSetJerseyNumber).toHaveBeenCalledWith('p1', updatedData.jerseyNumber);
    expect(mockOnSetPlayerNotes).toHaveBeenCalledWith('p1', updatedData.notes);
  });

  test('removes player when remove button is clicked', () => {
    window.confirm = jest.fn(() => true);
    render(<RosterSettingsModal {...defaultProps} />);
    
    const removeButtons = screen.getAllByTitle('common.remove');
    fireEvent.click(removeButtons[0]); // Remove first player
    
    expect(mockOnRemovePlayer).toHaveBeenCalledWith('p1');
  });

  test('edits team name', () => {
    render(<RosterSettingsModal {...defaultProps} />);
    
    // Click the team name container to edit
    fireEvent.click(screen.getByText('Test Team Name'));
    
    // Change the name
    const input = screen.getByDisplayValue('Test Team Name');
    fireEvent.change(input, { target: { value: 'New Team Name' }});
    
    // Save by blurring
    fireEvent.blur(input);
    
    expect(mockOnTeamNameChange).toHaveBeenCalledWith('New Team Name');
  });

  test('toggles player selection', () => {
    render(<RosterSettingsModal {...defaultProps} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Select first player
    
    expect(mockOnTogglePlayerSelection).toHaveBeenCalledWith('p1');
  });

  test('opens player stats', () => {
    render(<RosterSettingsModal {...defaultProps} />);

    const statsButtons = screen.getAllByTitle('common.stats');
    fireEvent.click(statsButtons[0]); // Open stats for first player

    expect(mockOnOpenPlayerStats).toHaveBeenCalledWith('p1');
  });

  test('filters players by search input', () => {
    render(<RosterSettingsModal {...defaultProps} />);
    const searchInput = screen.getByPlaceholderText('rosterSettingsModal.searchPlaceholder');
    fireEvent.change(searchInput, { target: { value: 'Two' } });
    expect(screen.queryByText('P1')).not.toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
  });

});