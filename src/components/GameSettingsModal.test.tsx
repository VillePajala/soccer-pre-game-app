import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameSettingsModal from './GameSettingsModal';
import { type GameSettingsModalProps } from './GameSettingsModal';
import { Player, GameEvent, Season, Tournament } from '@/app/page'; // Adjust path if needed
import { SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY } from '@/config/constants';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, fallback: string) => fallback || key,
  }),
}));

// Mock props
const mockOnClose = jest.fn();
const mockOnOpponentNameChange = jest.fn();
const mockOnGameDateChange = jest.fn();
const mockOnGameLocationChange = jest.fn();
const mockOnGameTimeChange = jest.fn();
const mockOnGameNotesChange = jest.fn();
const mockOnUpdateGameEvent = jest.fn();
const mockOnAwardFairPlayCard = jest.fn();
const mockOnDeleteGameEvent = jest.fn();
const mockOnNumPeriodsChange = jest.fn();
const mockOnPeriodDurationChange = jest.fn();
const mockOnSeasonIdChange = jest.fn();
const mockOnTournamentIdChange = jest.fn();
const mockOnSetHomeOrAway = jest.fn();

// Sample Data
const mockPlayers: Player[] = [
  { id: 'p1', name: 'Player One', isGoalie: false },
  { id: 'p2', name: 'Player Two', isGoalie: true },
];
const mockGameEvents: GameEvent[] = [
  { id: 'goal1', type: 'goal', time: 120, scorerId: 'p1' },
  { id: 'goal2', type: 'opponentGoal', time: 300 },
];
const mockSeasons: Season[] = [
  { id: 's1', name: 'Spring League 2024' },
];
const mockTournaments: Tournament[] = [
  { id: 't1', name: 'Summer Cup' },
];

const defaultProps: GameSettingsModalProps = {
  isOpen: true,
  onClose: mockOnClose,
  currentGameId: 'game123',
  teamName: 'Home Team',
  opponentName: 'Away Team',
  gameDate: '2024-07-31', // Use ISO format (YYYY-MM-DD) for the prop
  gameLocation: 'Central Park',
  gameTime: '14:30',
  gameNotes: 'Regular season match',
  homeScore: 2,
  awayScore: 1,
  gameEvents: mockGameEvents,
  availablePlayers: mockPlayers, 
  numPeriods: 2,
  periodDurationMinutes: 15,
  onOpponentNameChange: mockOnOpponentNameChange,
  onGameDateChange: mockOnGameDateChange,
  onGameLocationChange: mockOnGameLocationChange,
  onGameTimeChange: mockOnGameTimeChange,
  onGameNotesChange: mockOnGameNotesChange,
  onUpdateGameEvent: mockOnUpdateGameEvent,
  onDeleteGameEvent: mockOnDeleteGameEvent,
  onAwardFairPlayCard: mockOnAwardFairPlayCard,
  onNumPeriodsChange: mockOnNumPeriodsChange,
  onPeriodDurationChange: mockOnPeriodDurationChange,
  seasonId: null,
  tournamentId: null,
  onSeasonIdChange: mockOnSeasonIdChange,
  onTournamentIdChange: mockOnTournamentIdChange,
  homeOrAway: 'home',
  onSetHomeOrAway: mockOnSetHomeOrAway,
};

// Test-side helper to format ISO date to DD.MM.YYYY for display assertions
const formatDateForDisplayTest = (isoDate: string): string => {
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return isoDate; // Or throw error, or return a default like 'Invalid Date'
  }
  const parts = isoDate.split('-');
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
};

// Mock localStorage for seasons/tournaments lookup within the component
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => { store[key] = String(value); }),
    removeItem: jest.fn((key: string) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    __setStore: (newStore: Record<string, string>) => { store = newStore; }
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('<GameSettingsModal />', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.__setStore({
        [SEASONS_LIST_KEY]: JSON.stringify(mockSeasons),
        [TOURNAMENTS_LIST_KEY]: JSON.stringify(mockTournaments)
    });
  });

  test('renders the modal when isOpen is true', () => {
    render(<GameSettingsModal {...defaultProps} />);
    expect(screen.getByRole('heading', { name: /Game Settings|Pelin Asetukset/i })).toBeInTheDocument();

    const gameInfoSection = screen.getByRole('heading', { name: /Game Info/i }).closest('div');
    expect(gameInfoSection).toBeInTheDocument();
    if (!gameInfoSection) throw new Error("Game Info section not found");

    expect(within(gameInfoSection).getByText(defaultProps.opponentName)).toBeInTheDocument();
    expect(within(gameInfoSection).getByText(formatDateForDisplayTest(defaultProps.gameDate))).toBeInTheDocument(); 
    expect(within(gameInfoSection).getByText(defaultProps.gameLocation!)).toBeInTheDocument();
    
    // GameNotes is in a separate card, not within gameInfoSection
    expect(screen.getByText(defaultProps.gameNotes!)).toBeInTheDocument(); 
  });

  test('does not render the modal when isOpen is false', () => {
    render(<GameSettingsModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('heading', { name: /Game Settings|Pelin Asetukset/i })).not.toBeInTheDocument();
  });

  test('calls onClose when the close button is clicked', () => {
    render(<GameSettingsModal {...defaultProps} />);
    const footer = screen.getByText(/Close|Sulje/i).closest('div[class*="justify-end pt-4"]');
    expect(footer).toBeInTheDocument();
    expect(footer).toBeInstanceOf(HTMLElement);
    if (!footer) throw new Error("Modal footer not found or not an HTMLElement");
    const closeButtonInFooter = within(footer as HTMLElement).getByRole('button', { name: /Close|Sulje/i });
    fireEvent.click(closeButtonInFooter);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onOpponentNameChange when opponent name input changes and is saved via blur', async () => {
      const { rerender } = render(<GameSettingsModal {...defaultProps} />); 
      const gameInfoSection = screen.getByRole('heading', { name: /Game Info/i }).closest('div');
      if (!gameInfoSection) throw new Error("Game Info section not found");

      const opponentNameDisplaySpan = within(gameInfoSection).getByText(defaultProps.opponentName);
      fireEvent.click(opponentNameDisplaySpan);

      const opponentInput = within(gameInfoSection).getByDisplayValue(defaultProps.opponentName);
      expect(opponentInput).toBeInTheDocument();
      
      const newOpponentName = 'New Opponent FC';
      fireEvent.change(opponentInput, { target: { value: newOpponentName } });
      fireEvent.blur(opponentInput); 
      
      expect(mockOnOpponentNameChange).toHaveBeenCalledWith(newOpponentName.trim());
      
      rerender(<GameSettingsModal {...defaultProps} opponentName={newOpponentName.trim()} />);
      
      expect(screen.queryByDisplayValue(newOpponentName)).not.toBeInTheDocument();
      expect(await within(gameInfoSection).findByText(newOpponentName.trim())).toBeInTheDocument(); 
  });

  test('calls onGameDateChange when date input changes and is saved via blur', async () => {
      const { rerender } = render(<GameSettingsModal {...defaultProps} />);
      const gameInfoSection = screen.getByRole('heading', { name: /Game Info/i }).closest('div');
      if (!gameInfoSection) throw new Error("Game Info section not found");

      const gameDateDisplaySpan = within(gameInfoSection).getByText(formatDateForDisplayTest(defaultProps.gameDate));
      fireEvent.click(gameDateDisplaySpan);
      
      const dateInput = within(gameInfoSection).getByDisplayValue(defaultProps.gameDate); 
      expect(dateInput).toBeInTheDocument();

      const newDateISO = '2024-08-01';
      fireEvent.change(dateInput, { target: { value: newDateISO } });
      fireEvent.blur(dateInput); 

      expect(mockOnGameDateChange).toHaveBeenCalledWith(newDateISO);
      
      rerender(<GameSettingsModal {...defaultProps} gameDate={newDateISO} />);
      
      expect(screen.queryByDisplayValue(newDateISO)).not.toBeInTheDocument(); 
      expect(await within(gameInfoSection).findByText(formatDateForDisplayTest(newDateISO))).toBeInTheDocument(); 
  });

  test('cancels opponent name edit correctly via Escape key', async () => {
    render(<GameSettingsModal {...defaultProps} />);
    const gameInfoSection = screen.getByRole('heading', { name: /Game Info/i }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    const opponentNameDisplaySpan = within(gameInfoSection).getByText(defaultProps.opponentName);
    fireEvent.click(opponentNameDisplaySpan);

    const opponentInput = within(gameInfoSection).getByDisplayValue(defaultProps.opponentName);
    const tempOpponentName = 'Temporary Name';
    fireEvent.change(opponentInput, { target: { value: tempOpponentName } });

    fireEvent.keyDown(opponentInput, { key: 'Escape', code: 'Escape' }); // Trigger cancel

    expect(screen.queryByDisplayValue(tempOpponentName)).not.toBeInTheDocument();
    expect(within(gameInfoSection).getByText(defaultProps.opponentName)).toBeInTheDocument();
    expect(mockOnOpponentNameChange).not.toHaveBeenCalled();
  });
  
  test('cancels game date edit correctly via Escape key', async () => {
    render(<GameSettingsModal {...defaultProps} />);
    const gameInfoSection = screen.getByRole('heading', { name: /Game Info/i }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");
    
    const gameDateDisplaySpan = within(gameInfoSection).getByText(formatDateForDisplayTest(defaultProps.gameDate));
    fireEvent.click(gameDateDisplaySpan);

    // Input type="date" value should be in YYYY-MM-DD format
    const dateInput = within(gameInfoSection).getByDisplayValue(defaultProps.gameDate);
    const tempDateISO = '2025-01-01';
    fireEvent.change(dateInput, { target: { value: tempDateISO } });

    fireEvent.keyDown(dateInput, { key: 'Escape', code: 'Escape' }); // Trigger cancel

    expect(screen.queryByDisplayValue(tempDateISO)).not.toBeInTheDocument(); 
    expect(within(gameInfoSection).getByText(formatDateForDisplayTest(defaultProps.gameDate))).toBeInTheDocument(); 
    expect(mockOnGameDateChange).not.toHaveBeenCalled();
  });

  // Test for Game Location Change
  test('calls onGameLocationChange when location input changes and is saved via blur', async () => {
    const { rerender } = render(<GameSettingsModal {...defaultProps} />);
    const gameInfoSection = screen.getByRole('heading', { name: /Game Info/i }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    // Find the display span (assuming it doesn't have a specific title for edit)
    const locationDisplaySpan = within(gameInfoSection).getByText(defaultProps.gameLocation!);
    fireEvent.click(locationDisplaySpan);

    const locationInput = within(gameInfoSection).getByDisplayValue(defaultProps.gameLocation!);
    expect(locationInput).toBeInTheDocument();

    const newLocation = 'New Stadium';
    fireEvent.change(locationInput, { target: { value: newLocation } });
    fireEvent.blur(locationInput); // Trigger save via blur

    expect(mockOnGameLocationChange).toHaveBeenCalledWith(newLocation.trim());

    rerender(<GameSettingsModal {...defaultProps} gameLocation={newLocation.trim()} />);

    expect(screen.queryByDisplayValue(newLocation)).not.toBeInTheDocument();
    expect(await within(gameInfoSection).findByText(newLocation.trim())).toBeInTheDocument();
  });

  test('cancels game location edit correctly via Escape key', async () => {
    render(<GameSettingsModal {...defaultProps} />);
    const gameInfoSection = screen.getByRole('heading', { name: /Game Info/i }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    const locationDisplaySpan = within(gameInfoSection).getByText(defaultProps.gameLocation!);
    fireEvent.click(locationDisplaySpan);

    const locationInput = within(gameInfoSection).getByDisplayValue(defaultProps.gameLocation!);
    const tempLocation = 'Temporary Location';
    fireEvent.change(locationInput, { target: { value: tempLocation } });

    fireEvent.keyDown(locationInput, { key: 'Escape', code: 'Escape' }); // Trigger cancel

    expect(screen.queryByDisplayValue(tempLocation)).not.toBeInTheDocument();
    expect(within(gameInfoSection).getByText(defaultProps.gameLocation!)).toBeInTheDocument();
    expect(mockOnGameLocationChange).not.toHaveBeenCalled();
  });

  // Test for Game Time Change 
  test('calls onGameTimeChange when hour input changes', async () => {
    render(<GameSettingsModal {...defaultProps} />);
    const gameInfoSection = screen.getByRole('heading', { name: /Game Info/i }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    const hourInput = within(gameInfoSection).getByPlaceholderText(/HH/i);
    const initialMinute = defaultProps.gameTime!.split(':')[1];

    expect(hourInput).toBeInTheDocument();
    
    const newHour = '09';
    fireEvent.change(hourInput, { target: { value: newHour } });

    // Check if the callback was called with the correctly formatted time
    expect(mockOnGameTimeChange).toHaveBeenCalledWith(`${newHour}:${initialMinute}`);
  });

  test('calls onGameTimeChange when minute input changes', async () => {
    render(<GameSettingsModal {...defaultProps} />);
    const gameInfoSection = screen.getByRole('heading', { name: /Game Info/i }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    const minuteInput = within(gameInfoSection).getByPlaceholderText(/MM/i);
    const initialHour = defaultProps.gameTime!.split(':')[0];
    
    expect(minuteInput).toBeInTheDocument();

    const newMinute = '45';
    fireEvent.change(minuteInput, { target: { value: newMinute } });

    // Check if the callback was called with the correctly formatted time
    expect(mockOnGameTimeChange).toHaveBeenCalledWith(`${initialHour}:${newMinute}`);
  });
  
  test('calls onGameTimeChange with empty string when both inputs are cleared', async () => {
      render(<GameSettingsModal {...defaultProps} />);
      const gameInfoSection = screen.getByRole('heading', { name: /Game Info/i }).closest('div');
      if (!gameInfoSection) throw new Error("Game Info section not found");
      
      const hourInput = within(gameInfoSection).getByPlaceholderText(/HH/i);
      const minuteInput = within(gameInfoSection).getByPlaceholderText(/MM/i);

      fireEvent.change(hourInput, { target: { value: '' } });
      // Callback might be called with partial time here, we check the final state
      fireEvent.change(minuteInput, { target: { value: '' } });

      expect(mockOnGameTimeChange).toHaveBeenLastCalledWith('');
  });

  // Test for Game Notes Change
  test('updates game notes correctly when saved', async () => {
    const { rerender } = render(<GameSettingsModal {...defaultProps} />);
    const notesSection = screen.getByRole('heading', { name: /Game Notes/i }).closest('div');
    if (!notesSection) throw new Error("Notes section not found");

    // Find the edit button within the notes header
    const editButton = within(notesSection).getByRole('button', { name: /Edit Notes/i });
    fireEvent.click(editButton);

    const notesTextarea = within(notesSection).getByDisplayValue(defaultProps.gameNotes!);
    expect(notesTextarea).toBeInTheDocument();

    const newNotes = 'Updated game strategy.\nFocus on defense.';
    fireEvent.change(notesTextarea, { target: { value: newNotes } });

    // Find and click the specific Save Notes button for the textarea
    const saveButton = within(notesSection).getByRole('button', { name: /Save Notes/i });
    fireEvent.click(saveButton);

    expect(mockOnGameNotesChange).toHaveBeenCalledWith(newNotes);

    // Rerender with updated props
    rerender(<GameSettingsModal {...defaultProps} gameNotes={newNotes} />);

    // Textarea should be gone, new notes should be displayed
    expect(screen.queryByDisplayValue(newNotes)).not.toBeInTheDocument();
    // Use findByText as the update might be async
    // Need to handle potential whitespace/newline differences in display vs query
    expect(await screen.findByText((content, element) => {
      // Allow for differences in whitespace normalization between textarea value and rendered text
      const hasText = (node: Element | null) => node?.textContent?.replace(/\s+/g, ' ') === newNotes.replace(/\s+/g, ' ');
      const nodeHasText = hasText(element);
      const childrenDontHaveText = Array.from(element?.children || []).every(child => !hasText(child));
      return nodeHasText && childrenDontHaveText;
    })).toBeInTheDocument();
  });

  test('cancels game notes edit correctly', async () => {
    render(<GameSettingsModal {...defaultProps} />);
    const notesSection = screen.getByRole('heading', { name: /Game Notes/i }).closest('div');
    if (!notesSection) throw new Error("Notes section not found");

    const editButton = within(notesSection).getByRole('button', { name: /Edit Notes/i });
    fireEvent.click(editButton);

    const notesTextarea = within(notesSection).getByDisplayValue(defaultProps.gameNotes!);
    const tempNotes = 'Temporary notes...';
    fireEvent.change(notesTextarea, { target: { value: tempNotes } });

    // Find and click the cancel button for the textarea
    const cancelButton = within(notesSection).getByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelButton);

    // Textarea should be gone, original notes should be displayed
    expect(screen.queryByDisplayValue(tempNotes)).not.toBeInTheDocument();
    expect(screen.getByText(defaultProps.gameNotes!)).toBeInTheDocument();
    expect(mockOnGameNotesChange).not.toHaveBeenCalled();
  });

  // Test for Period Duration Change
  test('calls onPeriodDurationChange when duration input changes and is saved via blur', async () => {
    const { rerender } = render(<GameSettingsModal {...defaultProps} />);
    const gameInfoSection = screen.getByRole('heading', { name: /Game Info/i }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    // Find the display span for duration (e.g., "15 min")
    const durationDisplaySpan = within(gameInfoSection).getByText(`${defaultProps.periodDurationMinutes} min`);
    fireEvent.click(durationDisplaySpan);

    // Find the input by its current value
    const durationInput = within(gameInfoSection).getByDisplayValue(String(defaultProps.periodDurationMinutes));
    expect(durationInput).toBeInTheDocument();

    const newDuration = 20;
    fireEvent.change(durationInput, { target: { value: String(newDuration) } });
    fireEvent.blur(durationInput); // Trigger save via blur

    expect(mockOnPeriodDurationChange).toHaveBeenCalledWith(newDuration);

    rerender(<GameSettingsModal {...defaultProps} periodDurationMinutes={newDuration} />);

    expect(screen.queryByDisplayValue(String(newDuration))).not.toBeInTheDocument();
    // Check for the new duration text (e.g., "20 min")
    expect(await within(gameInfoSection).findByText(`${newDuration} min`)).toBeInTheDocument();
  });

  test('cancels period duration edit correctly via Escape key', async () => {
    render(<GameSettingsModal {...defaultProps} />);
    const gameInfoSection = screen.getByRole('heading', { name: /Game Info/i }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    const durationDisplaySpan = within(gameInfoSection).getByText(`${defaultProps.periodDurationMinutes} min`);
    fireEvent.click(durationDisplaySpan);

    const durationInput = within(gameInfoSection).getByDisplayValue(String(defaultProps.periodDurationMinutes));
    const tempDuration = 99;
    fireEvent.change(durationInput, { target: { value: String(tempDuration) } });

    fireEvent.keyDown(durationInput, { key: 'Escape', code: 'Escape' }); // Trigger cancel

    expect(screen.queryByDisplayValue(String(tempDuration))).not.toBeInTheDocument();
    expect(within(gameInfoSection).getByText(`${defaultProps.periodDurationMinutes} min`)).toBeInTheDocument();
    expect(mockOnPeriodDurationChange).not.toHaveBeenCalled();
  });

  // Test for Home/Away Toggle
  test('calls onSetHomeOrAway when Home/Away toggle is changed', async () => {
    // Initial state is 'home'
    render(<GameSettingsModal {...defaultProps} />); 
    const gameInfoSection = screen.getByRole('heading', { name: /Game Info/i }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    const awayLabel = within(gameInfoSection).getByLabelText(/Away/i);
    expect(awayLabel).toBeInTheDocument(); // Ensure the label is found

    // Click the Away label/button
    fireEvent.click(awayLabel);

    // Check if the callback was triggered correctly
    expect(mockOnSetHomeOrAway).toHaveBeenCalledWith('away');

    // Optional: Rerender with new state and check UI update
    // const { rerender } = render(<GameSettingsModal {...defaultProps} />); // If render wasn't destructured earlier
    // rerender(<GameSettingsModal {...defaultProps} homeOrAway={'away'} />);
    // Find the away input again and check if it's checked (more complex due to sr-only)
    // Check if the associated label has the active style
    // expect(awayLabel).toHaveClass('bg-teal-600'); // Example check
  });

  // Test for Season/Tournament Association
  test('displays season dropdown when Season/League button is clicked', async () => {
    const { rerender } = render(<GameSettingsModal {...defaultProps} />);
    const associationSection = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'span' && /^Association/i.test(content);
    }).closest('div');
    if (!associationSection) throw new Error("Association section not found");

    const seasonButton = within(associationSection).getByRole('button', { name: /Season\/League/i });
    fireEvent.click(seasonButton);

    // Rerender with seasonId set to empty string to show the dropdown
    rerender(<GameSettingsModal {...defaultProps} seasonId="" />);

    expect(await within(associationSection).findByRole('combobox')).toBeInTheDocument();
    expect(await within(associationSection).findByText(mockSeasons[0].name)).toBeInTheDocument();
  });
  
  test('calls onSeasonIdChange when a season is selected', async () => {
    const { rerender } = render(<GameSettingsModal {...defaultProps} seasonId={null} />); 
    const associationSection = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'span' && /^Association/i.test(content);
    }).closest('div');
    if (!associationSection) throw new Error("Association section not found");
    
    const seasonButton = within(associationSection).getByRole('button', { name: /Season\/League/i });
    fireEvent.click(seasonButton);

    // Rerender with seasonId set to empty string to show the dropdown before selection
    rerender(<GameSettingsModal {...defaultProps} seasonId="" />);

    const seasonSelect = await within(associationSection).findByRole('combobox');
    fireEvent.change(seasonSelect, { target: { value: mockSeasons[0].id } });
    expect(mockOnSeasonIdChange).toHaveBeenCalledWith(mockSeasons[0].id);

    // Rerender with the selected season ID and verify selection
    rerender(<GameSettingsModal {...defaultProps} seasonId={mockSeasons[0].id} />);
    const updatedSelect = await within(associationSection).findByRole('combobox');
    expect(updatedSelect).toHaveValue(mockSeasons[0].id);
  });
  
  test('calls onSeasonIdChange with null when None button is clicked after season selected', async () => {
      render(<GameSettingsModal {...defaultProps} seasonId={mockSeasons[0].id} />);        
      const associationSection = screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'span' && /^Association/i.test(content);
      }).closest('div');
      if (!associationSection) throw new Error("Association section not found");

      const noneButton = within(associationSection).getByRole('button', { name: /None/i });
      fireEvent.click(noneButton);
      expect(mockOnSeasonIdChange).toHaveBeenCalledWith(null);
      expect(mockOnTournamentIdChange).toHaveBeenCalledWith(null);
  });

  // --- ADD TOURNAMENT TESTS HERE ---
  test('displays tournament dropdown when Tournament button is clicked', async () => {
    const { rerender } = render(<GameSettingsModal {...defaultProps} />); 
    const associationSection = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'span' && /^Association/i.test(content);
    }).closest('div');
    if (!associationSection) throw new Error("Association section not found");

    const tournamentButton = within(associationSection).getByRole('button', { name: /Tournament/i });
    fireEvent.click(tournamentButton);

    rerender(<GameSettingsModal {...defaultProps} tournamentId="" />); // Show dropdown

    expect(await within(associationSection).findByRole('combobox')).toBeInTheDocument();
    expect(await within(associationSection).findByText(mockTournaments[0].name)).toBeInTheDocument();
  });

  test('calls onTournamentIdChange when a tournament is selected', async () => {
    const { rerender } = render(<GameSettingsModal {...defaultProps} tournamentId={null} />); 
    const associationSection = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'span' && /^Association/i.test(content);
    }).closest('div');
    if (!associationSection) throw new Error("Association section not found");
    
    const tournamentButton = within(associationSection).getByRole('button', { name: /Tournament/i });
    fireEvent.click(tournamentButton);

    rerender(<GameSettingsModal {...defaultProps} tournamentId="" />); // Show dropdown

    const tournamentSelect = await within(associationSection).findByRole('combobox');
    fireEvent.change(tournamentSelect, { target: { value: mockTournaments[0].id } });
    expect(mockOnTournamentIdChange).toHaveBeenCalledWith(mockTournaments[0].id);

    rerender(<GameSettingsModal {...defaultProps} tournamentId={mockTournaments[0].id} />);
    const updatedSelect = await within(associationSection).findByRole('combobox');
    expect(updatedSelect).toHaveValue(mockTournaments[0].id);
  });
  
  test('calls onTournamentIdChange with null when None button is clicked after tournament selected', async () => {
      render(<GameSettingsModal {...defaultProps} tournamentId={mockTournaments[0].id} />);        
      const associationSection = screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'span' && /^Association/i.test(content);
      }).closest('div');
      if (!associationSection) throw new Error("Association section not found");

      // Click None button (it should be active because a tournament is selected)
      const noneButton = within(associationSection).getByRole('button', { name: /None/i });
      fireEvent.click(noneButton);
      expect(mockOnTournamentIdChange).toHaveBeenCalledWith(null);
      expect(mockOnSeasonIdChange).toHaveBeenCalledWith(null); // Also clears season
  });

  // --- ADD NUMBER OF PERIODS TESTS HERE ---
  test('calls onNumPeriodsChange with 1 when period 1 button is clicked', () => {
    render(<GameSettingsModal {...defaultProps} numPeriods={2} />); // Start with 2 periods
    const gameInfoSection = screen.getByRole('heading', { name: /Game Info/i }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    const period1Button = within(gameInfoSection).getByRole('button', { name: '1' });
    fireEvent.click(period1Button);
    expect(mockOnNumPeriodsChange).toHaveBeenCalledWith(1);
  });

  test('calls onNumPeriodsChange with 2 when period 2 button is clicked', () => {
    render(<GameSettingsModal {...defaultProps} numPeriods={1} />); // Start with 1 period
    const gameInfoSection = screen.getByRole('heading', { name: /Game Info/i }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    const period2Button = within(gameInfoSection).getByRole('button', { name: '2' });
    fireEvent.click(period2Button);
    expect(mockOnNumPeriodsChange).toHaveBeenCalledWith(2);
  });

  test('period buttons reflect current numPeriods prop', () => {
    const { rerender } = render(<GameSettingsModal {...defaultProps} numPeriods={1} />); 
    const gameInfoSection = screen.getByRole('heading', { name: /Game Info/i }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    let period1Button = within(gameInfoSection).getByRole('button', { name: '1' });
    let period2Button = within(gameInfoSection).getByRole('button', { name: '2' });
    // Assuming active button has 'bg-indigo-600' and inactive has 'bg-slate-700'
    expect(period1Button).toHaveClass('bg-indigo-600');
    expect(period2Button).toHaveClass('bg-slate-700');

    rerender(<GameSettingsModal {...defaultProps} numPeriods={2} />);
    period1Button = within(gameInfoSection).getByRole('button', { name: '1' }); // Re-fetch after rerender
    period2Button = within(gameInfoSection).getByRole('button', { name: '2' });
    expect(period1Button).toHaveClass('bg-slate-700');
    expect(period2Button).toHaveClass('bg-indigo-600');
  });

  // --- ADD EVENT LOG INTERACTION TESTS HERE ---
  describe('Event Log Interactions', () => {
    const eventToEdit = defaultProps.gameEvents.find(e => e.type === 'goal' && e.scorerId === 'p1')!;
    const originalScorerName = mockPlayers.find(p => p.id === eventToEdit.scorerId)?.name;
    const newScorer = mockPlayers.find(p => p.id === 'p2')!;

    // Helper to format time from seconds to MM:SS for this test suite, mirroring component
    const formatTimeTest = (timeInSeconds: number): string => {
      const minutes = Math.floor(timeInSeconds / 60);
      const seconds = timeInSeconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    };

    test('successfully edits an event scorer', async () => {
      const { rerender } = render(<GameSettingsModal {...defaultProps} />);
      
      // Find the row for the event we want to edit using its time
      const eventTimeCell = screen.getByText(formatTimeTest(eventToEdit.time));
      const eventRow = eventTimeCell.closest('tr');
      if (!eventRow) throw new Error("Event row not found");

      // Verify original scorer name is in the row
      expect(within(eventRow).getByText(originalScorerName!)).toBeInTheDocument();

      // Find and click the Edit button within that specific row
      const editButton = within(eventRow).getByRole('button', { name: /Edit|Muokkaa/i });
      fireEvent.click(editButton);

      // Verify input fields are now visible in the row
      expect(within(eventRow).getByPlaceholderText(/MM:SS/i)).toBeInTheDocument(); // Time input
      
      // New way to find scorer and assister selects
      const allSelectsInRow = within(eventRow).getAllByRole('combobox');
      const scorerSelect = allSelectsInRow[0]; // Scorer select is the first
      const assisterSelect = allSelectsInRow[1]; // Assister select is the second

      expect(scorerSelect).toBeInTheDocument();
      expect(scorerSelect).toHaveValue(eventToEdit.scorerId!); // Assert initial value of scorer select

      expect(assisterSelect).toBeInTheDocument();
      // Optionally, assert initial value of assister select if needed (e.g., empty or specific assisterId)
      // For now, just ensuring it's found is part of the original test's structure implicitly.

      // Change the scorer
      fireEvent.change(scorerSelect, { target: { value: newScorer.id } });
      expect(scorerSelect).toHaveValue(newScorer.id); // Check if change reflected

      // Find and click the Save button for the event row
      const saveEventButton = within(eventRow).getByRole('button', { name: /Save|Tallenna/i });
      fireEvent.click(saveEventButton);

      // Assert that the mock function was called with the correct updated event data
      const expectedUpdatedEvent: Partial<GameEvent> = {
        id: eventToEdit.id,
        time: eventToEdit.time, // Assuming time is not changed in this specific test
        scorerId: newScorer.id,
        // assisterId: eventToEdit.assisterId, // Or new assister if changed
      };
      expect(mockOnUpdateGameEvent).toHaveBeenCalledWith(expect.objectContaining(expectedUpdatedEvent));

      // Rerender with potentially updated props (if gameEvents prop updates parent)
      // This depends on how the parent component manages and passes gameEvents
      const updatedEventsWithNewScorer = defaultProps.gameEvents.map(event =>
        event.id === eventToEdit.id ? { ...event, scorerId: newScorer.id } : event
      );
      rerender(<GameSettingsModal {...defaultProps} gameEvents={updatedEventsWithNewScorer} />);

      // Verify the original scorer's name is gone and the new scorer's name is displayed
      expect(within(eventRow).queryByText(originalScorerName!)).not.toBeInTheDocument();
      expect(await within(eventRow).findByText(newScorer.name)).toBeInTheDocument();
    });

    test('successfully edits an event time', async () => {
      const { rerender } = render(<GameSettingsModal {...defaultProps} />); 
      const eventToEdit = defaultProps.gameEvents.find(e => e.type === 'goal' && e.scorerId === 'p1')!;
      const originalTimeFormatted = formatTimeTest(eventToEdit.time);

      const eventTimeCell = screen.getByText(originalTimeFormatted);
      const eventRow = eventTimeCell.closest('tr');
      if (!eventRow) throw new Error("Event row not found for editing time");

      const editButton = within(eventRow).getByRole('button', { name: /Edit|Muokkaa/i });
      fireEvent.click(editButton);

      const timeInput = within(eventRow).getByDisplayValue(originalTimeFormatted);
      expect(timeInput).toBeInTheDocument();

      const newTimeFormatted = '05:30';
      const newTimeInSeconds = (5 * 60) + 30; // 330 seconds
      fireEvent.change(timeInput, { target: { value: newTimeFormatted } });
      expect(timeInput).toHaveValue(newTimeFormatted);

      const saveEventButton = within(eventRow).getByRole('button', { name: /Save|Tallenna/i });
      fireEvent.click(saveEventButton);

      const expectedUpdatedEvent: Partial<GameEvent> = {
        id: eventToEdit.id,
        time: newTimeInSeconds,
        scorerId: eventToEdit.scorerId, // Scorer remains the same
      };
      expect(mockOnUpdateGameEvent).toHaveBeenCalledWith(expect.objectContaining(expectedUpdatedEvent));

      const updatedEventsWithNewTime = defaultProps.gameEvents.map(event =>
        event.id === eventToEdit.id ? { ...event, time: newTimeInSeconds } : event
      );
      rerender(<GameSettingsModal {...defaultProps} gameEvents={updatedEventsWithNewTime} />);

      // Verify the UI now shows the new time
      expect(within(eventRow).queryByDisplayValue(newTimeFormatted)).not.toBeInTheDocument(); // Input should be gone
      expect(await within(eventRow).findByText(newTimeFormatted)).toBeInTheDocument();
    });

    test('successfully edits an event assister', async () => {
      const { rerender } = render(<GameSettingsModal {...defaultProps} />); 
      // Use the first event which is a goal by p1, initially no assister in mockGameEvents
      const eventToEdit = defaultProps.gameEvents.find(e => e.type === 'goal' && e.scorerId === 'p1')!;
      const scorerName = mockPlayers.find(p => p.id === eventToEdit.scorerId)?.name;
      const newAssister = mockPlayers.find(p => p.id === 'p2')!; // Player Two as the new assister

      const eventTimeCell = screen.getByText(formatTimeTest(eventToEdit.time));
      const eventRow = eventTimeCell.closest('tr');
      if (!eventRow) throw new Error("Event row not found for editing assister");

      // Verify scorer is present, assister column should be initially empty for this event
      expect(within(eventRow).getByText(scorerName!)).toBeInTheDocument();
      // const assisterCells = within(eventRow).getAllByRole('cell'); // Removed unused variable
      // Assister is typically the 4th cell (index 3): Time, Type, Scorer, Assister
      // Initial check: Assister cell should be empty or not contain a player name if no assister
      // This specific check depends on how empty assisters are rendered.
      // For now, we proceed to edit.

      const editButton = within(eventRow).getByRole('button', { name: /Edit|Muokkaa/i });
      fireEvent.click(editButton);

      const allSelectsInRow = within(eventRow).getAllByRole('combobox');
      const assisterSelect = allSelectsInRow[1]; // Assister select is the second
      expect(assisterSelect).toBeInTheDocument();
      expect(assisterSelect).toHaveValue(''); // Initially no assister selected for this event

      fireEvent.change(assisterSelect, { target: { value: newAssister.id } });
      expect(assisterSelect).toHaveValue(newAssister.id);

      const saveEventButton = within(eventRow).getByRole('button', { name: /Save|Tallenna/i });
      fireEvent.click(saveEventButton);

      const expectedUpdatedEvent: Partial<GameEvent> = {
        id: eventToEdit.id,
        scorerId: eventToEdit.scorerId,
        assisterId: newAssister.id,
      };
      expect(mockOnUpdateGameEvent).toHaveBeenCalledWith(expect.objectContaining(expectedUpdatedEvent));

      const updatedEventsWithNewAssister = defaultProps.gameEvents.map(event =>
        event.id === eventToEdit.id ? { ...event, assisterId: newAssister.id } : event
      );
      rerender(<GameSettingsModal {...defaultProps} gameEvents={updatedEventsWithNewAssister} />);

      // Verify the UI now shows the new assister
      // The assister cell should now contain the new assister's name.
      expect(await within(eventRow).findByText(newAssister.name)).toBeInTheDocument();
    });

    test('successfully deletes an event', async () => {
      // Mock window.confirm
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);

      const { rerender } = render(<GameSettingsModal {...defaultProps} />); 
      const eventToDelete = defaultProps.gameEvents.find(e => e.type === 'goal' && e.scorerId === 'p1')!;
      const eventTimeFormatted = formatTimeTest(eventToDelete.time);

      // Find the event row
      const eventTimeCell = screen.getByText(eventTimeFormatted);
      const eventRow = eventTimeCell.closest('tr');
      if (!eventRow) throw new Error("Event row not found for deletion");

      // Find and click the Delete button within that row
      // The delete button has a title like "Delete" or "Poista"
      const deleteButton = within(eventRow).getByRole('button', { name: /Delete|Poista/i });
      fireEvent.click(deleteButton);

      // Check that window.confirm was called
      expect(mockConfirm).toHaveBeenCalledTimes(1);
      // Check that the onDeleteGameEvent callback was called with the correct event ID
      expect(defaultProps.onDeleteGameEvent).toHaveBeenCalledWith(eventToDelete.id);

      // Rerender the component with the event removed (simulating parent update)
      const updatedEventsAfterDelete = defaultProps.gameEvents.filter(event => event.id !== eventToDelete.id);
      rerender(<GameSettingsModal {...defaultProps} gameEvents={updatedEventsAfterDelete} />);

      // Verify the event row is no longer in the document
      // Check if the cell containing the event time is gone
      expect(screen.queryByText(eventTimeFormatted)).not.toBeInTheDocument();

      // Clean up mock
      mockConfirm.mockRestore();
    });

    // TODO: Add more tests for event log:
    // - Editing event time
    // - Editing assister
    // - Cancelling an edit
    // - Deleting an event
    // - Adding a new event (if functionality exists in this modal, or separate component)
    // - Interaction with opponent goals (if editable/deletable)
  });

}); 