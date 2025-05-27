import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom'; // For extended matchers
// import userEvent from '@testing-library/user-event'; // Consider using userEvent if fireEvent has issues after installing @testing-library/user-event

import RosterSettingsModal from './RosterSettingsModal';
import type { Player } from '@/types'; // Corrected path relative to components/

// Mock i18n specifically for this test file to silence warnings
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string | undefined) => fallback || key,
  }),
}));

// Mock functions passed as props
const mockOnClose = jest.fn();
const mockOnAddPlayer = jest.fn();
// const mockOnUpdatePlayer = jest.fn(); // Removed - Component uses more granular updates now
const mockOnRemovePlayer = jest.fn(); 
// const mockOnSetGoalie = jest.fn();    // Removed - Component uses onToggleGoalie
const mockOnTeamNameChange = jest.fn();
// Add mocks for newly identified props
const mockOnRenamePlayer = jest.fn();
const mockOnToggleGoalie = jest.fn(); 
const mockOnSetJerseyNumber = jest.fn();
const mockOnSetPlayerNotes = jest.fn();
const mockOnTogglePlayerSelection = jest.fn();

// Sample player data for testing
const mockPlayers: Player[] = [
  { id: 'p1', name: 'Player One', nickname: 'P1', jerseyNumber: '10', isGoalie: false, notes: 'Note 1' },
  { id: 'p2', name: 'Player Two', nickname: 'P2', jerseyNumber: '20', isGoalie: true, notes: 'Note 2' },
];

// Define the full props needed by the component
const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  availablePlayers: mockPlayers, 
  onRenamePlayer: mockOnRenamePlayer,
  onToggleGoalie: mockOnToggleGoalie, 
  onSetJerseyNumber: mockOnSetJerseyNumber,
  onSetPlayerNotes: mockOnSetPlayerNotes,
  onRemovePlayer: mockOnRemovePlayer,
  onAddPlayer: mockOnAddPlayer,
  selectedPlayerIds: [], 
  onTogglePlayerSelection: mockOnTogglePlayerSelection, 
  teamName: 'Test Team Name',
  onTeamNameChange: mockOnTeamNameChange,
};

describe('<RosterSettingsModal />', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  test('renders the modal when isOpen is true', () => {
    render(<RosterSettingsModal {...defaultProps} />);

    // Check for modal heading (adjust text based on actual heading)
    expect(screen.getByRole('heading', { name: /Joukkueen Hallinta|Manage Roster/i })).toBeInTheDocument(); // Updated default text based on component

    // Check if player list is rendered (e.g., by checking for player names/nicknames)
    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();

    // Check for key buttons
    expect(screen.getByRole('button', { name: /Lisää Pelaaja|Add Player/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sulje/i })).toBeInTheDocument();
  });

  test('does not render the modal when isOpen is false', () => {
    render(<RosterSettingsModal {...defaultProps} isOpen={false} />);

    // The modal heading should not be present
    expect(screen.queryByRole('heading', { name: /Joukkueen Hallinta|Manage Roster/i })).not.toBeInTheDocument(); // Updated default text
  });

  test('calls onClose when the Close button is clicked', () => {
    render(<RosterSettingsModal {...defaultProps} />);

    const closeButton = screen.getByRole('button', { name: /Sulje/i });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('correctly displays goalie status for players', () => {
    render(<RosterSettingsModal {...defaultProps} />);

    // Player One (P1) is not a goalie
    const playerOneElement = screen.getByText('P1').closest('div.p-2.rounded-md');
    expect(playerOneElement).toBeInTheDocument();
    expect(playerOneElement).toBeInstanceOf(HTMLElement);
    if (!playerOneElement) throw new Error('Player P1 row not found');
    const playerOneRow = playerOneElement as HTMLElement;

    const setGoalieButtonP1 = within(playerOneRow).getByTitle(/Set Goalie/i);
    expect(setGoalieButtonP1).toBeInTheDocument();
    // Check for classes indicating "not a goalie" status
    // Based on previous DOM output: "border border-slate-700 text-slate-500 opacity-60"
    // We'll check for a prominent one like text-slate-500 and ensure it doesn't have goalie active class
    expect(setGoalieButtonP1).toHaveClass('text-slate-500');
    expect(setGoalieButtonP1).not.toHaveClass('bg-amber-500');


    // Player Two (P2) is a goalie
    const playerTwoElement = screen.getByText('P2').closest('div.p-2.rounded-md');
    expect(playerTwoElement).toBeInTheDocument();
    expect(playerTwoElement).toBeInstanceOf(HTMLElement);
    if (!playerTwoElement) throw new Error('Player P2 row not found');
    const playerTwoRow = playerTwoElement as HTMLElement;
    
    const unsetGoalieButtonP2 = within(playerTwoRow).getByTitle(/Unset Goalie/i);
    expect(unsetGoalieButtonP2).toBeInTheDocument();
    // Check for classes indicating "is a goalie" status
    // Based on previous DOM output: "bg-amber-500 text-white shadow-sm"
    expect(unsetGoalieButtonP2).toHaveClass('bg-amber-500');
    expect(unsetGoalieButtonP2).toHaveClass('text-white');
  });

  test('shows the add player form when "Add Player" button is clicked', () => {
    render(<RosterSettingsModal {...defaultProps} />);

    // Initially, the add player form (e.g., player name input) should not be visible
    // Using English placeholder as i18next might not be fully initialized in test env
    expect(screen.queryByPlaceholderText(/Player Name/i)).not.toBeInTheDocument();

    const addPlayerButton = screen.getByRole('button', { name: /Lisää Pelaaja|Add Player/i });
    fireEvent.click(addPlayerButton);

    // After clicking, the form should be visible
    // We can verify this by checking for a known input field from the form
    expect(screen.getByPlaceholderText(/Player Name/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/#/i)).toBeInTheDocument(); // Jersey number input
    // Optionally, verify the "Save" or "Confirm" button for the new player is visible
    // This requires knowing the accessible name or specific attributes of that button.
    // For now, checking form fields is a good indicator.
  });

  test('adds a new player when form is submitted', () => {
    render(<RosterSettingsModal {...defaultProps} />);

    // Open the add player form
    const addPlayerButton = screen.getByRole('button', { name: /Lisää Pelaaja|Add Player/i });
    fireEvent.click(addPlayerButton);

    // Define new player data
    const newPlayerData = {
      name: 'New Guy',
      nickname: 'Newbie',
      jerseyNumber: '42',
      notes: 'A fresh recruit',
    };

    // Fill the form (using English placeholders due to test env i18n)
    fireEvent.change(screen.getByPlaceholderText(/Player Name/i), { target: { value: newPlayerData.name } });
    fireEvent.change(screen.getByPlaceholderText(/Nickname \(for disc\)/i), { target: { value: newPlayerData.nickname } });
    fireEvent.change(screen.getByPlaceholderText(/#/i), { target: { value: newPlayerData.jerseyNumber } });
    fireEvent.change(screen.getByPlaceholderText(/Player notes.../i), { target: { value: newPlayerData.notes } });

    // Find the container of the action buttons (save, cancel) for the add form
    const addFormActionsContainer = screen.getByPlaceholderText(/Player notes.../i).closest('div.p-3.rounded-md')?.querySelector('div.flex.justify-end.space-x-2.pt-1');
    expect(addFormActionsContainer).toBeInstanceOf(HTMLElement);
    if (!addFormActionsContainer) throw new Error('Add form actions container not found');

    // The save button is expected to be the first button in this container
    const saveButton = within(addFormActionsContainer as HTMLElement).getAllByRole('button')[0];
    expect(saveButton).toBeInTheDocument(); // Ensure it was found
    fireEvent.click(saveButton);

    // Assert onAddPlayer was called with the correct data
    expect(mockOnAddPlayer).toHaveBeenCalledTimes(1);
    expect(mockOnAddPlayer).toHaveBeenCalledWith(newPlayerData);

    // Assert the form is hidden/cleared after successful add
    // (e.g., the name input field is no longer there or its value is reset)
    // For simplicity, we'll check if it's not in the document anymore, assuming it unmounts or hides.
    // If it just clears, we'd check `toHaveValue('')`.
    expect(screen.queryByPlaceholderText(/Player Name/i)).not.toBeInTheDocument();
  });

  test('edits an existing player when edit form is submitted', async () => {
    render(<RosterSettingsModal {...defaultProps} />);

    const playerToEditId = mockPlayers[0].id; // 'p1'
    const originalPlayerData = mockPlayers[0]; // { id: 'p1', name: 'Player One', nickname: 'P1', ... }

    // Find player P1's row using its nickname (asserting it's defined)
    const playerOneElement = screen.getByText(originalPlayerData.nickname!).closest('div.p-2.rounded-md');
    expect(playerOneElement).toBeInTheDocument();
    expect(playerOneElement).toBeInstanceOf(HTMLElement);
    if (!playerOneElement) throw new Error('Player P1 row not found');
    const playerOneRow = playerOneElement as HTMLElement;

    // Click the Actions button (...) for P1
    const actionsButton = within(playerOneRow).getByTitle(/Actions/i);
    fireEvent.click(actionsButton);

    // Wait for the dropdown menu to appear by finding an item within it
    const anyMenuItem = await screen.findByText(/Edit|Delete/i); // Find any item to ensure menu is open
    const dropdownMenu = anyMenuItem.closest('div[class*="absolute right-0 top-full"]'); // Find the menu container
    expect(dropdownMenu).toBeInTheDocument();
    if(!dropdownMenu) throw new Error('Actions dropdown menu not found');

    // Find the specific Edit element *within* the dropdown
    const editElementInDropdown = await within(dropdownMenu as HTMLElement).findByText(/^Edit$/i);
    fireEvent.click(editElementInDropdown); // Click the element containing the text

    // --- Verify Edit Form Appears and is pre-filled --- 
    // Use English placeholders due to test env i18n issues
    const namePlaceholder = /Full Name/i;
    const nicknamePlaceholder = /Nickname \(Display Name\)/i;
    const numberPlaceholder = /#/i;
    const notesPlaceholder = /Player notes.../i;

    const nameInput = await screen.findByPlaceholderText(namePlaceholder);
    const nicknameInput = await screen.findByPlaceholderText(nicknamePlaceholder);
    const numberInput = await screen.findByPlaceholderText(numberPlaceholder);
    const notesInput = await screen.findByPlaceholderText(notesPlaceholder);

    expect(nameInput).toBeInTheDocument();
    expect(nicknameInput).toBeInTheDocument();
    expect(numberInput).toBeInTheDocument();
    expect(notesInput).toBeInTheDocument();

    // Check if values are pre-filled (using originalPlayerData)
    expect(nameInput).toHaveValue(originalPlayerData.name);
    expect(nicknameInput).toHaveValue(originalPlayerData.nickname!);
    expect(numberInput).toHaveValue(originalPlayerData.jerseyNumber!);
    expect(notesInput).toHaveValue(originalPlayerData.notes!);

    // --- Update Player Data --- 
    const updatedPlayerData = {
      name: 'Player One Updated',
      nickname: 'P1-U',
      jerseyNumber: '11',
      notes: 'Updated Note 1',
    };

    fireEvent.change(nameInput, { target: { value: updatedPlayerData.name } });
    fireEvent.change(nicknameInput, { target: { value: updatedPlayerData.nickname } });
    fireEvent.change(numberInput, { target: { value: updatedPlayerData.jerseyNumber } });
    fireEvent.change(notesInput, { target: { value: updatedPlayerData.notes } });

    // --- Find and Click Save Button for Edit Form --- 
    // Find the save button directly by its title
    const saveEditButton = screen.getByRole('button', { name: /Save|Tallenna/i });
    expect(saveEditButton).toBeInTheDocument();
    fireEvent.click(saveEditButton);

    // --- Assert mock handlers were called --- 
    // Note: The component seems to call individual handlers per field change during edit interaction
    // We need to verify the final state handlers are called upon save/confirm
    // Based on props: onRenamePlayer, onSetJerseyNumber, onSetPlayerNotes, onSetNickname (Missing?)
    // Let's assume onRenamePlayer handles both name and nickname based on prop names.

    // Check onRenamePlayer (assuming it handles name + nickname)
    expect(mockOnRenamePlayer).toHaveBeenCalledTimes(1); 
    expect(mockOnRenamePlayer).toHaveBeenCalledWith(playerToEditId, { name: updatedPlayerData.name, nickname: updatedPlayerData.nickname });

    // Check onSetJerseyNumber
    expect(mockOnSetJerseyNumber).toHaveBeenCalledTimes(1);
    expect(mockOnSetJerseyNumber).toHaveBeenCalledWith(playerToEditId, updatedPlayerData.jerseyNumber);

    // Check onSetPlayerNotes
    expect(mockOnSetPlayerNotes).toHaveBeenCalledTimes(1);
    expect(mockOnSetPlayerNotes).toHaveBeenCalledWith(playerToEditId, updatedPlayerData.notes);

    // --- Assert form is hidden --- 
    expect(screen.queryByPlaceholderText(namePlaceholder)).not.toBeInTheDocument();
  });

  test('deletes a player when delete is confirmed', async () => {
    // Mock window.confirm to always return true (confirm deletion)
    const confirmSpy = jest.spyOn(window, 'confirm').mockImplementation(() => true);

    render(<RosterSettingsModal {...defaultProps} />);

    const playerToDeleteId = mockPlayers[1].id; // 'p2'
    const playerToDeleteNickname = mockPlayers[1].nickname; // 'P2'

    // Find player P2's row
    const playerTwoElement = screen.getByText(playerToDeleteNickname!).closest('div.p-2.rounded-md');
    expect(playerTwoElement).toBeInTheDocument();
    expect(playerTwoElement).toBeInstanceOf(HTMLElement);
    if (!playerTwoElement) throw new Error('Player P2 row not found');
    const playerTwoRow = playerTwoElement as HTMLElement;

    // Click the Actions button (...) for P2
    const actionsButton = within(playerTwoRow).getByTitle(/Actions/i);
    fireEvent.click(actionsButton);

    // Wait for the dropdown menu and find the Delete button within it
    const anyMenuItem = await screen.findByText(/Edit|Delete/i); // Use findByText to wait for menu
    const dropdownMenu = anyMenuItem.closest('div[class*="absolute right-0 top-full"]');
    expect(dropdownMenu).toBeInTheDocument();
    if(!dropdownMenu) throw new Error('Actions dropdown menu not found');

    // Find the text "Remove", then its parent button, and click that
    const removeTextElement = await within(dropdownMenu as HTMLElement).findByText(/Remove/i);
    const removeButton = removeTextElement.closest('button');
    expect(removeButton).toBeInTheDocument(); // Ensure the button was found
    if (!removeButton) throw new Error('Remove button not found in actions menu');
    fireEvent.click(removeButton);

    // Assert window.confirm was called
    expect(confirmSpy).toHaveBeenCalledTimes(1);

    // Assert mockOnRemovePlayer was called with the correct ID
    expect(mockOnRemovePlayer).toHaveBeenCalledTimes(1);
    expect(mockOnRemovePlayer).toHaveBeenCalledWith(playerToDeleteId);

    // Restore the original window.confirm
    confirmSpy.mockRestore();
  });

  test('calls onToggleGoalie when goalie button is clicked', () => {
    render(<RosterSettingsModal {...defaultProps} />);

    // Player One (P1) is not a goalie initially
    const playerOneId = mockPlayers[0].id;
    const playerOneElement = screen.getByText('P1').closest('div.p-2.rounded-md');
    if (!playerOneElement) throw new Error('Player P1 row not found');
    const playerOneRow = playerOneElement as HTMLElement;

    // Find the "Set Goalie" button for P1
    const setGoalieButtonP1 = within(playerOneRow).getByTitle(/Set Goalie/i);
    fireEvent.click(setGoalieButtonP1);

    // Assert onToggleGoalie was called for P1
    expect(mockOnToggleGoalie).toHaveBeenCalledTimes(1);
    expect(mockOnToggleGoalie).toHaveBeenCalledWith(playerOneId);

    // Clear mock for next part
    mockOnToggleGoalie.mockClear();

    // Player Two (P2) is a goalie initially
    const playerTwoId = mockPlayers[1].id;
    const playerTwoElement = screen.getByText('P2').closest('div.p-2.rounded-md');
    if (!playerTwoElement) throw new Error('Player P2 row not found');
    const playerTwoRow = playerTwoElement as HTMLElement;

    // Find the "Unset Goalie" button for P2
    const unsetGoalieButtonP2 = within(playerTwoRow).getByTitle(/Unset Goalie/i);
    fireEvent.click(unsetGoalieButtonP2);

    // Assert onToggleGoalie was called for P2
    expect(mockOnToggleGoalie).toHaveBeenCalledTimes(1);
    expect(mockOnToggleGoalie).toHaveBeenCalledWith(playerTwoId);
  });

  test('calls onTeamNameChange when team name is edited', async () => {
    render(<RosterSettingsModal {...defaultProps} />);

    // More robust way to find the edit button, e.g., by its title
    // The component uses t('common.edit', 'Edit') for the title.
    const editButton = screen.getByRole('button', { name: /Edit|Muokkaa/i });
    
    expect(editButton).toBeInTheDocument();
    fireEvent.click(editButton);

    // --- WAIT for the input field to appear --- 
    const teamNameInput = await screen.findByDisplayValue(defaultProps.teamName);
    expect(teamNameInput).toBeInTheDocument();

    const newTeamName = 'New Awesome Team';
    fireEvent.change(teamNameInput, { target: { value: newTeamName } });

    // Find the save button using its title, which we just added.
    // t('rosterSettingsModal.saveTeamName', 'Save Team Name')
    const saveTeamNameButton = screen.getByRole('button', { name: /Save Team Name|Tallenna joukkueen nimi/i });

    fireEvent.click(saveTeamNameButton);

    expect(mockOnTeamNameChange).toHaveBeenCalledTimes(1);
    expect(mockOnTeamNameChange).toHaveBeenCalledWith(newTeamName.trim());

    // Check if the input field is gone (component returned to display mode)
    expect(screen.queryByDisplayValue(newTeamName)).not.toBeInTheDocument();
  });

  // Test for cancelling team name edit
  test('cancels team name edit correctly', async () => {
    render(<RosterSettingsModal {...defaultProps} />);
    const originalTeamName = defaultProps.teamName;

    // Click edit button
    const editButton = screen.getByRole('button', { name: /Edit|Muokkaa/i });
    fireEvent.click(editButton);

    // Wait for input and change its value
    const teamNameInput = await screen.findByDisplayValue(originalTeamName);
    const tempTeamName = 'Temporary Name';
    fireEvent.change(teamNameInput, { target: { value: tempTeamName } });
    expect(teamNameInput).toHaveValue(tempTeamName);

    // Find and click cancel button
    // t('rosterSettingsModal.cancelEditTeamName', 'Cancel Edit Team Name')
    const cancelTeamNameButton = screen.getByRole('button', { name: /Cancel Edit Team Name|Peruuta joukkueen nimen muokkaus/i });
    fireEvent.click(cancelTeamNameButton);

    // Verify input is gone and original name is displayed
    expect(screen.queryByDisplayValue(tempTeamName)).not.toBeInTheDocument();
    expect(screen.getByText(originalTeamName)).toBeInTheDocument();
    expect(mockOnTeamNameChange).not.toHaveBeenCalled(); // Ensure save was not called
  });

  // Add more tests here for:
  // - Displaying goalie status
  // - Clicking Add Player button
  // - Adding a player via the form (testing form fields and calling mockOnAddPlayer)
  // - Clicking Edit button on a player (actions menu -> edit)
  // - Clicking Delete button on a player (actions menu -> delete, handling confirmation)
  // - Clicking Goalie toggle
  // - Editing team name
  // - Toggling player selection
}); 