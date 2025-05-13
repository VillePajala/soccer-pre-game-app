import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import GameSettingsModal from './GameSettingsModal';
import { type GameSettingsModalProps } from './GameSettingsModal';
import { Player, Season, Tournament } from '@/types';
import { GameEvent } from '@/app/page';
import { SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY } from '@/config/constants';
import { getSeasons } from '@/utils/seasons';
import { getTournaments } from '@/utils/tournaments';
import { updateGameDetails, updateGameEvent, removeGameEvent } from '@/utils/savedGames';
import * as rosterUtils from '@/utils/masterRoster';

// Mock i18n
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { val: number | string }) => {
      if (options?.val !== undefined) {
        return key.replace('{{val}}', String(options.val));
      }
      if (key === 'common.dateFormat') return 'yyyy-MM-dd';
      if (key === 'common.timeFormat') return 'HH:mm';
      if (key === 'common.none') return 'None';
      if (key === 'common.home') return 'Home';
      if (key === 'common.away') return 'Away';
      if (key === 'common.edit') return 'Edit';
      if (key === 'common.save') return 'Save';
      if (key === 'common.cancel') return 'Cancel';
      if (key === 'gameSettingsModal.opponentNamePlaceholder') return 'Enter opponent name';
      if (key === 'gameSettingsModal.locationPlaceholder') return 'Enter location';
      if (key === 'gameSettingsModal.timePlaceholder') return 'Enter time (HH:MM)';
      if (key === 'gameSettingsModal.gameNotesPlaceholder') return 'Enter game notes...';
      if (key === 'gameSettingsModal.addGoal') return 'Add Goal';
      if (key === 'gameSettingsModal.scorer') return 'Scorer';
      if (key === 'gameSettingsModal.assister') return 'Assister (Optional)';
      if (key === 'gameSettingsModal.noPlayerSelected') return '-- Select Player --';
      if (key === 'gameSettingsModal.confirmDeleteEvent') return 'Are you sure you want to delete this event?';
      if (key === 'gameSettingsModal.fairPlayAward') return 'Fair Play Award';
      if (key === 'gameSettingsModal.awardTo') return 'Award To';
      if (key === 'gameSettingsModal.clearAward') return 'Clear Award';
      if (key === 'gameSettingsModal.noPlayersAvailable') return 'No players available';
      if (key === 'gameSettingsModal.selectSeason') return '-- Select Season --';
      if (key === 'gameSettingsModal.selectTournament') return '-- Select Tournament --';
      if (key === 'gameSettingsModal.periods') return 'Periods';
      if (key === 'gameSettingsModal.durationPerPeriod') return 'Duration (min)';
      if (key === 'gameSettingsModal.associationSeason') return 'Season/League';
      if (key === 'gameSettingsModal.associationNone') return 'None';
      if (key === 'gameSettingsModal.associationTournament') return 'Tournament';
      return key;
    },
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

// Mock all utility functions
jest.mock('@/utils/seasons', () => ({
  getSeasons: jest.fn(),
  addSeason: jest.fn(),
  updateSeason: jest.fn(),
  deleteSeason: jest.fn(),
}));

jest.mock('@/utils/tournaments', () => ({
  getTournaments: jest.fn(),
  addTournament: jest.fn(),
  updateTournament: jest.fn(),
  deleteTournament: jest.fn(),
}));

jest.mock('@/utils/savedGames', () => ({
  updateGameDetails: jest.fn(),
  updateGameEvent: jest.fn(),
  removeGameEvent: jest.fn(),
}));

// Mock roster utils specifically for getMasterRoster in relevant tests
jest.mock('@/utils/masterRoster', () => ({
  getMasterRoster: jest.fn(),
}));

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
    // Setup default responses for mocked functions
    (getSeasons as jest.Mock).mockReturnValue(mockSeasons);
    (getTournaments as jest.Mock).mockReturnValue(mockTournaments);
    (updateGameDetails as jest.Mock).mockReturnValue({ id: 'game123' });
    (updateGameEvent as jest.Mock).mockReturnValue({ id: 'game123' });
    (removeGameEvent as jest.Mock).mockReturnValue({ id: 'game123' });
    (rosterUtils.getMasterRoster as jest.Mock).mockReturnValue(mockPlayers);
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

  test('calls onClose when the close button is clicked', async () => {
    render(<GameSettingsModal {...defaultProps} />);
    const footer = screen.getByText(/Close|Sulje/i).closest('div[class*="justify-end pt-4"]');
    expect(footer).toBeInTheDocument();
    expect(footer).toBeInstanceOf(HTMLElement);
    if (!footer) throw new Error("Modal footer not found or not an HTMLElement");
    const closeButtonInFooter = within(footer as HTMLElement).getByRole('button', { 
      name: (name) => /close|sulje/i.test(name)
    });
    await userEvent.click(closeButtonInFooter);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  test('calls onOpponentNameChange when opponent name input changes and is saved via blur', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<GameSettingsModal {...defaultProps} />);
      const gameInfoSection = screen.getByRole('heading', { 
        name: (name) => /game info/i.test(name) 
      }).closest('div');
      if (!gameInfoSection) throw new Error("Game Info section not found");

      const opponentNameDisplaySpan = within(gameInfoSection).getByText(defaultProps.opponentName);
      await user.click(opponentNameDisplaySpan);

      const opponentInput = within(gameInfoSection).getByDisplayValue(defaultProps.opponentName);
      expect(opponentInput).toBeInTheDocument();

      const newOpponentName = 'New Opponent FC';
      await user.clear(opponentInput);
      await user.type(opponentInput, newOpponentName);
      await user.click(screen.getByRole('heading', { 
        name: (name) => /game settings|pelin asetukset/i.test(name) 
      }));

      expect(mockOnOpponentNameChange).toHaveBeenCalledWith(newOpponentName.trim());

      rerender(<GameSettingsModal {...defaultProps} opponentName={newOpponentName.trim()} />);
      
      expect(screen.queryByDisplayValue(newOpponentName)).not.toBeInTheDocument();
      expect(await within(gameInfoSection).findByText(newOpponentName.trim())).toBeInTheDocument();
  });

  test('calls onGameDateChange when date input changes and is saved via blur', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<GameSettingsModal {...defaultProps} />);
      const gameInfoSection = screen.getByRole('heading', { 
        name: (name) => /game info/i.test(name) 
      }).closest('div');
      if (!gameInfoSection) throw new Error("Game Info section not found");

      const gameDateDisplaySpan = within(gameInfoSection).getByText(formatDateForDisplayTest(defaultProps.gameDate));
      await user.click(gameDateDisplaySpan);
      
      const dateInput = within(gameInfoSection).getByDisplayValue(defaultProps.gameDate);
      expect(dateInput).toBeInTheDocument();

      const newDateISO = '2024-08-01';
      fireEvent.change(dateInput, { target: { value: newDateISO } });
      await user.click(screen.getByRole('heading', { 
        name: (name) => /game settings|pelin asetukset/i.test(name) 
      }));

      expect(mockOnGameDateChange).toHaveBeenCalledWith(newDateISO);

      rerender(<GameSettingsModal {...defaultProps} gameDate={newDateISO} />);
      
      expect(screen.queryByDisplayValue(newDateISO)).not.toBeInTheDocument();
      expect(await within(gameInfoSection).findByText(formatDateForDisplayTest(newDateISO))).toBeInTheDocument();
  });

  test('cancels opponent name edit correctly via Escape key', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} />);
    const gameInfoSection = screen.getByRole('heading', { 
      name: (name) => /game info/i.test(name) 
    }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    const opponentNameDisplaySpan = within(gameInfoSection).getByText(defaultProps.opponentName);
    await user.click(opponentNameDisplaySpan);

    const opponentInput = within(gameInfoSection).getByDisplayValue(defaultProps.opponentName);
    const tempOpponentName = 'Temporary Name';
    await user.clear(opponentInput);
    await user.type(opponentInput, tempOpponentName);

    await user.keyboard('{Escape}');

    expect(screen.queryByDisplayValue(tempOpponentName)).not.toBeInTheDocument();
    expect(within(gameInfoSection).getByText(defaultProps.opponentName)).toBeInTheDocument();
    expect(mockOnOpponentNameChange).not.toHaveBeenCalled();
  });
  
  test('cancels game date edit correctly via Escape key', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} />);
    const gameInfoSection = screen.getByRole('heading', { 
      name: (name) => /game info/i.test(name) 
    }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");
    
    const gameDateDisplaySpan = within(gameInfoSection).getByText(formatDateForDisplayTest(defaultProps.gameDate));
    await user.click(gameDateDisplaySpan);

    // Input type="date" value should be in YYYY-MM-DD format
    const dateInput = within(gameInfoSection).getByDisplayValue(defaultProps.gameDate);
    const tempDateISO = '2025-01-01';
    fireEvent.change(dateInput, { target: { value: tempDateISO } });

    await user.keyboard('{Escape}');

    expect(screen.queryByDisplayValue(tempDateISO)).not.toBeInTheDocument(); 
    expect(within(gameInfoSection).getByText(formatDateForDisplayTest(defaultProps.gameDate))).toBeInTheDocument(); 
    expect(mockOnGameDateChange).not.toHaveBeenCalled();
  });

  // Test for Game Location Change
  test('calls onGameLocationChange when location input changes and is saved via blur', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<GameSettingsModal {...defaultProps} />);
    const gameInfoSection = screen.getByRole('heading', { 
      name: (name) => /game info/i.test(name) 
    }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    // Find the display span (assuming it doesn't have a specific title for edit)
    const locationDisplaySpan = within(gameInfoSection).getByText(defaultProps.gameLocation!);
    await user.click(locationDisplaySpan);

    const locationInput = within(gameInfoSection).getByDisplayValue(defaultProps.gameLocation!);
    expect(locationInput).toBeInTheDocument();

    const newLocation = 'New Stadium';
    await user.clear(locationInput);
    await user.type(locationInput, newLocation);
    await user.click(screen.getByRole('heading', { 
      name: (name) => /game settings|pelin asetukset/i.test(name) 
    }));

    expect(mockOnGameLocationChange).toHaveBeenCalledWith(newLocation.trim());

    rerender(<GameSettingsModal {...defaultProps} gameLocation={newLocation.trim()} />);

    expect(screen.queryByDisplayValue(newLocation)).not.toBeInTheDocument();
    expect(await within(gameInfoSection).findByText(newLocation.trim())).toBeInTheDocument();
  });

  test('cancels game location edit correctly via Escape key', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} />);
    const gameInfoSection = screen.getByRole('heading', { 
      name: (name) => /game info/i.test(name) 
    }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    const locationDisplaySpan = within(gameInfoSection).getByText(defaultProps.gameLocation!);
    await user.click(locationDisplaySpan);

    const locationInput = within(gameInfoSection).getByDisplayValue(defaultProps.gameLocation!);
    const tempLocation = 'Temporary Location';
    await user.clear(locationInput);
    await user.type(locationInput, tempLocation);

    await user.keyboard('{Escape}');

    expect(screen.queryByDisplayValue(tempLocation)).not.toBeInTheDocument();
    expect(within(gameInfoSection).getByText(defaultProps.gameLocation!)).toBeInTheDocument();
    expect(mockOnGameLocationChange).not.toHaveBeenCalled();
  });

  // Test for Game Time Change 
  test('calls onGameTimeChange when hour input changes', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} />);
    const gameInfoSection = screen.getByRole('heading', { 
      name: (name) => /game info/i.test(name) 
    }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    const hourInput = within(gameInfoSection).getByPlaceholderText(/HH/i);
    const initialMinute = defaultProps.gameTime!.split(':')[1];

    expect(hourInput).toBeInTheDocument();
    
    const newHour = '09';
    await user.clear(hourInput);
    await user.type(hourInput, newHour);

    // Check if the callback was called with the correctly formatted time
    expect(mockOnGameTimeChange).toHaveBeenLastCalledWith(`${newHour}:${initialMinute}`);
  });

  test('calls onGameTimeChange when minute input changes', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} />);
    const gameInfoSection = screen.getByRole('heading', { 
      name: (name) => /game info/i.test(name) 
    }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    const minuteInput = within(gameInfoSection).getByPlaceholderText(/MM/i);
    const initialHour = defaultProps.gameTime!.split(':')[0];
    
    expect(minuteInput).toBeInTheDocument();

    const newMinute = '45';
    await user.clear(minuteInput);
    await user.type(minuteInput, newMinute);

    // Check if the callback was called with the correctly formatted time
    expect(mockOnGameTimeChange).toHaveBeenLastCalledWith(`${initialHour}:${newMinute}`);
  });
  
  test('calls onGameTimeChange with empty string when both inputs are cleared', async () => {
      const user = userEvent.setup();
      render(<GameSettingsModal {...defaultProps} />);
      const gameInfoSection = screen.getByRole('heading', { 
        name: (name) => /game info/i.test(name) 
      }).closest('div');
      if (!gameInfoSection) throw new Error("Game Info section not found");
      
      const hourInput = within(gameInfoSection).getByPlaceholderText(/HH/i);
      const minuteInput = within(gameInfoSection).getByPlaceholderText(/MM/i);

      await user.clear(hourInput);
      await user.clear(minuteInput);

      expect(mockOnGameTimeChange).toHaveBeenLastCalledWith('');
  });

  // Test for Game Notes Change
  test('updates game notes correctly when saved', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<GameSettingsModal {...defaultProps} />);
    const notesSection = screen.getByRole('heading', { 
      name: (name) => /game notes/i.test(name) 
    }).closest('div');
    if (!notesSection) throw new Error("Notes section not found");

    // Find the edit button within the notes header
    const editButton = within(notesSection).getByRole('button', { 
      name: (name) => /edit notes/i.test(name) 
    });
    await user.click(editButton);

    const notesTextarea = within(notesSection).getByDisplayValue(defaultProps.gameNotes!);
    expect(notesTextarea).toBeInTheDocument();

    const newNotes = 'Updated game strategy.\\nFocus on defense.';
    await user.clear(notesTextarea);
    await user.type(notesTextarea, newNotes);

    // Find and click the specific Save Notes button for the textarea
    const saveButton = within(notesSection).getByRole('button', { 
      name: (name) => /save notes/i.test(name) 
    });
    await user.click(saveButton);

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
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} />);
    const notesSection = screen.getByRole('heading', { 
      name: (name) => /game notes/i.test(name) 
    }).closest('div');
    if (!notesSection) throw new Error("Notes section not found");

    const editButton = within(notesSection).getByRole('button', { 
      name: (name) => /edit notes/i.test(name) 
    });
    await user.click(editButton);

    const notesTextarea = within(notesSection).getByDisplayValue(defaultProps.gameNotes!);
    const tempNotes = 'Temporary notes...';
    await user.clear(notesTextarea);
    await user.type(notesTextarea, tempNotes);

    // Find and click the cancel button for the textarea
    const cancelButton = within(notesSection).getByRole('button', { 
      name: (name) => /cancel/i.test(name) 
    });
    await user.click(cancelButton);

    // Textarea should be gone, original notes should be displayed
    expect(screen.queryByDisplayValue(tempNotes)).not.toBeInTheDocument();
    expect(screen.getByText(defaultProps.gameNotes!)).toBeInTheDocument();
    expect(mockOnGameNotesChange).not.toHaveBeenCalled();
  });

  // Test for Period Duration Change
  test('calls onPeriodDurationChange when duration input changes and is saved via blur', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<GameSettingsModal {...defaultProps} />);
    const gameInfoSection = screen.getByRole('heading', { 
      name: (name) => /game info/i.test(name) 
    }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    // Find the display span for duration (e.g., "15 min")
    const durationDisplaySpan = within(gameInfoSection).getByText(`${defaultProps.periodDurationMinutes} min`);
    await user.click(durationDisplaySpan);

    // Find the input by its current value
    const durationInput = within(gameInfoSection).getByDisplayValue(String(defaultProps.periodDurationMinutes));
    expect(durationInput).toBeInTheDocument();

    const newDuration = 20;
    await user.clear(durationInput);
    await user.type(durationInput, String(newDuration));
    await user.click(screen.getByRole('heading', { 
      name: (name) => /game settings|pelin asetukset/i.test(name) 
    }));

    expect(mockOnPeriodDurationChange).toHaveBeenCalledWith(newDuration);

    rerender(<GameSettingsModal {...defaultProps} periodDurationMinutes={newDuration} />);

    expect(screen.queryByDisplayValue(String(newDuration))).not.toBeInTheDocument();
    // Check for the new duration text (e.g., "20 min")
    expect(await within(gameInfoSection).findByText(`${newDuration} min`)).toBeInTheDocument();
  });

  test('cancels period duration edit correctly via Escape key', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} />);
    const gameInfoSection = screen.getByRole('heading', { 
      name: (name) => /game info/i.test(name) 
    }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    const durationDisplaySpan = within(gameInfoSection).getByText(`${defaultProps.periodDurationMinutes} min`);
    await user.click(durationDisplaySpan);

    const durationInput = within(gameInfoSection).getByDisplayValue(String(defaultProps.periodDurationMinutes));
    const tempDuration = 99;
    await user.clear(durationInput);
    await user.type(durationInput, String(tempDuration));

    await user.keyboard('{Escape}');

    expect(screen.queryByDisplayValue(String(tempDuration))).not.toBeInTheDocument();
    expect(within(gameInfoSection).getByText(`${defaultProps.periodDurationMinutes} min`)).toBeInTheDocument();
    expect(mockOnPeriodDurationChange).not.toHaveBeenCalled();
  });

  // Test for Home/Away Toggle
  test('calls onSetHomeOrAway when Home/Away toggle is changed', async () => {
    const user = userEvent.setup();
    // Initial state is 'home'
    render(<GameSettingsModal {...defaultProps} />); 
    const gameInfoSection = screen.getByRole('heading', { 
      name: (name) => /game info/i.test(name) 
    }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    const awayLabel = within(gameInfoSection).getByLabelText(/Away/i);
    expect(awayLabel).toBeInTheDocument(); // Ensure the label is found

    // Click the Away label/button
    await user.click(awayLabel);

    // Check if the callback was triggered correctly
    expect(mockOnSetHomeOrAway).toHaveBeenCalledWith('away');
  });

  // Test for Season/Tournament Association
  test('displays season dropdown when Season/League button is clicked', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<GameSettingsModal {...defaultProps} />);
    const associationSection = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'span' && /^Association/i.test(content);
    }).closest('div');
    if (!associationSection) throw new Error("Association section not found");

    const seasonButton = within(associationSection).getByRole('button', { 
      name: 'Season/League'
    });
    await user.click(seasonButton);

    // Rerender with seasonId set to empty string to show the dropdown
    rerender(<GameSettingsModal {...defaultProps} seasonId="" />);

    expect(await within(associationSection).findByRole('combobox')).toBeInTheDocument();
    expect(await within(associationSection).findByText(mockSeasons[0].name)).toBeInTheDocument();
  });
  
  test('calls onSeasonIdChange when a season is selected', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<GameSettingsModal {...defaultProps} seasonId={null} />); 
    const associationSection = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'span' && /^Association/i.test(content);
    }).closest('div');
    if (!associationSection) throw new Error("Association section not found");
    
    const seasonButton = within(associationSection).getByRole('button', { 
      name: 'Season/League'
    });
    await user.click(seasonButton);

    // Rerender with seasonId set to empty string to show the dropdown before selection
    rerender(<GameSettingsModal {...defaultProps} seasonId="" />);

    const seasonSelect = await within(associationSection).findByRole('combobox');
    await user.selectOptions(seasonSelect, mockSeasons[0].id);
    expect(mockOnSeasonIdChange).toHaveBeenCalledWith(mockSeasons[0].id);

    // Rerender with the selected season ID and verify selection
    rerender(<GameSettingsModal {...defaultProps} seasonId={mockSeasons[0].id} />);
    const updatedSelect = await within(associationSection).findByRole('combobox');
    expect(updatedSelect).toHaveValue(mockSeasons[0].id);
  });
  
  test('calls onSeasonIdChange with null when None button is clicked after season selected', async () => {
      const user = userEvent.setup();
      render(<GameSettingsModal {...defaultProps} seasonId={mockSeasons[0].id} />);        
      const associationSection = screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'span' && /^Association/i.test(content);
      }).closest('div');
      if (!associationSection) throw new Error("Association section not found");

      const noneButton = within(associationSection).getByRole('button', { 
        name: 'None'
      });
      await user.click(noneButton);
      expect(mockOnSeasonIdChange).toHaveBeenCalledWith(null);
      expect(mockOnTournamentIdChange).toHaveBeenCalledWith(null);
  });

  // --- ADD TOURNAMENT TESTS HERE ---
  test('displays tournament dropdown when Tournament button is clicked', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<GameSettingsModal {...defaultProps} />);
    const associationSection = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'span' && /^Association/i.test(content);
    }).closest('div');
    if (!associationSection) throw new Error("Association section not found");

    const tournamentButton = within(associationSection).getByRole('button', { 
      name: 'Tournament'
    });
    await user.click(tournamentButton);

    rerender(<GameSettingsModal {...defaultProps} tournamentId="" />); // Show dropdown

    expect(await within(associationSection).findByRole('combobox')).toBeInTheDocument();
    expect(await within(associationSection).findByText(mockTournaments[0].name)).toBeInTheDocument();
  });

  test('calls onTournamentIdChange when a tournament is selected', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<GameSettingsModal {...defaultProps} tournamentId={null} />); 
    const associationSection = screen.getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'span' && /^Association/i.test(content);
    }).closest('div');
    if (!associationSection) throw new Error("Association section not found");
    
    const tournamentButton = within(associationSection).getByRole('button', { 
      name: 'Tournament'
    });
    await user.click(tournamentButton);

    rerender(<GameSettingsModal {...defaultProps} tournamentId="" />); // Show dropdown

    const tournamentSelect = await within(associationSection).findByRole('combobox');
    await user.selectOptions(tournamentSelect, mockTournaments[0].id);
    expect(mockOnTournamentIdChange).toHaveBeenCalledWith(mockTournaments[0].id);

    rerender(<GameSettingsModal {...defaultProps} tournamentId={mockTournaments[0].id} />);
    const updatedSelect = await within(associationSection).findByRole('combobox');
    expect(updatedSelect).toHaveValue(mockTournaments[0].id);
  });
  
  test('calls onTournamentIdChange with null when None button is clicked after tournament selected', async () => {
      const user = userEvent.setup();
      render(<GameSettingsModal {...defaultProps} tournamentId={mockTournaments[0].id} />);        
      const associationSection = screen.getByText((content, element) => {
        return element?.tagName.toLowerCase() === 'span' && /^Association/i.test(content);
      }).closest('div');
      if (!associationSection) throw new Error("Association section not found");

      // Click None button (it should be active because a tournament is selected)
      const noneButton = within(associationSection).getByRole('button', { 
        name: 'None'
      });
      await user.click(noneButton);
      expect(mockOnTournamentIdChange).toHaveBeenCalledWith(null);
      expect(mockOnSeasonIdChange).toHaveBeenCalledWith(null); // Also clears season
  });

  // --- ADD NUMBER OF PERIODS TESTS HERE ---
  test('calls onNumPeriodsChange with 1 when period 1 button is clicked', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} numPeriods={2} />); // Start with 2 periods
    const gameInfoSection = screen.getByRole('heading', { 
      name: (name) => /game info/i.test(name) 
    }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    const period1Button = within(gameInfoSection).getByRole('button', { name: '1' });
    await user.click(period1Button);
    expect(mockOnNumPeriodsChange).toHaveBeenCalledWith(1);
  });

  test('calls onNumPeriodsChange with 2 when period 2 button is clicked', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} numPeriods={1} />); // Start with 1 period
    const gameInfoSection = screen.getByRole('heading', { 
      name: (name) => /game info/i.test(name) 
    }).closest('div');
    if (!gameInfoSection) throw new Error("Game Info section not found");

    const period2Button = within(gameInfoSection).getByRole('button', { name: '2' });
    await user.click(period2Button);
    expect(mockOnNumPeriodsChange).toHaveBeenCalledWith(2);
  });

  test('period buttons reflect current numPeriods prop', () => {
    const { rerender } = render(<GameSettingsModal {...defaultProps} numPeriods={1} />); 
    const gameInfoSection = screen.getByRole('heading', { 
      name: (name) => /game info/i.test(name) 
    }).closest('div');
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
      const user = userEvent.setup();
      const { rerender } = render(<GameSettingsModal {...defaultProps} />);
      
      // Find the row for the event we want to edit using its time
      const eventTimeCell = screen.getByText(formatTimeTest(eventToEdit.time));
      const eventRow = eventTimeCell.closest('tr');
      if (!eventRow) throw new Error("Event row not found");

      // Verify original scorer name is in the row
      expect(within(eventRow).getByText(originalScorerName!)).toBeInTheDocument();

      // Find and click the Edit button within that specific row
      const editButton = within(eventRow).getByRole('button', { 
        name: (name) => /edit|muokkaa/i.test(name) 
      });
      await user.click(editButton);

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
      await user.selectOptions(scorerSelect, newScorer.id);
      expect(scorerSelect).toHaveValue(newScorer.id); // Check if change reflected

      // Find and click the Save button for the event row
      const saveEventButton = within(eventRow).getByRole('button', { name: /Save|Tallenna/i });
      await user.click(saveEventButton);

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
      const user = userEvent.setup();
      const { rerender } = render(<GameSettingsModal {...defaultProps} />);
      const eventToEdit = defaultProps.gameEvents.find(e => e.type === 'goal' && e.scorerId === 'p1')!;
      const originalTimeFormatted = formatTimeTest(eventToEdit.time);

      const eventTimeCell = screen.getByText(originalTimeFormatted);
      const eventRow = eventTimeCell.closest('tr');
      if (!eventRow) throw new Error("Event row not found for editing time");

      const editButton = within(eventRow).getByRole('button', { name: /Edit|Muokkaa/i });
      await user.click(editButton);

      const timeInput = within(eventRow).getByDisplayValue(originalTimeFormatted);
      expect(timeInput).toBeInTheDocument();

      const newTimeFormatted = '05:30';
      const newTimeInSeconds = (5 * 60) + 30; // 330 seconds
      await user.clear(timeInput);
      await user.type(timeInput, newTimeFormatted);
      expect(timeInput).toHaveValue(newTimeFormatted);

      const saveEventButton = within(eventRow).getByRole('button', { name: /Save|Tallenna/i });
      await user.click(saveEventButton);

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
      const user = userEvent.setup();
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
      // Initial check: Assister cell should be empty or not contain a player name if no assister
      // This specific check depends on how empty assisters are rendered.
      // For now, we proceed to edit.

      const editButton = within(eventRow).getByRole('button', { name: /Edit|Muokkaa/i });
      await user.click(editButton);

      const allSelectsInRow = within(eventRow).getAllByRole('combobox');
      const assisterSelect = allSelectsInRow[1]; // Assister select is the second
      expect(assisterSelect).toBeInTheDocument();
      expect(assisterSelect).toHaveValue(''); // Initially no assister selected for this event

      await user.selectOptions(assisterSelect, newAssister.id);
      expect(assisterSelect).toHaveValue(newAssister.id);

      const saveEventButton = within(eventRow).getByRole('button', { name: /Save|Tallenna/i });
      await user.click(saveEventButton);

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
      const user = userEvent.setup();
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
      await user.click(deleteButton);

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

  it('loads seasons and tournaments when opened', async () => {
    render(<GameSettingsModal {...defaultProps} />);
    
    // Verify the utility functions were called
    expect(getSeasons).toHaveBeenCalled();
    expect(getTournaments).toHaveBeenCalled();

    // Check if season appears in dropdown when selected
    const seasonElement = await screen.findByText('Spring League 2024');
    expect(seasonElement).toBeInTheDocument();
  });

  it('calls updateGameDetails when editing opponent name', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} />);
    
    // Find the opponent name element and click to edit
    const opponentElement = screen.getByText('Away Team');
    await user.click(opponentElement);
    
    // Find the input and change the value
    const inputElement = screen.getByDisplayValue('Away Team');
    await user.clear(inputElement);
    await user.type(inputElement, 'New Opponent');
    await user.click(screen.getByRole('heading', { name: /Game Settings|Pelin Asetukset/i }));
    
    // Check if the utility function was called with the right parameters
    expect(updateGameDetails).toHaveBeenCalledWith('game123', { awayTeam: 'New Opponent' });
    expect(mockOnOpponentNameChange).toHaveBeenCalledWith('New Opponent');
  });

  it('calls updateGameDetails when editing game date', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} />);
    
    // Find the date element and click to edit
    const dateElement = screen.getByText('2024-07-31');
    await user.click(dateElement);
    
    // Find the input and change the value
    const inputElement = screen.getByDisplayValue('2024-07-31');
    await user.clear(inputElement);
    await user.type(inputElement, '2024-08-01');
    await user.click(screen.getByRole('heading', { name: /Game Settings|Pelin Asetukset/i }));
    
    // Check if the utility function was called with the right parameters
    expect(updateGameDetails).toHaveBeenCalledWith('game123', { date: '2024-08-01' });
    expect(mockOnGameDateChange).toHaveBeenCalledWith('2024-08-01');
  });

  it('calls updateGameDetails when editing game location', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} />);
    
    // Find the location element and click to edit
    const locationElement = screen.getByText('Central Park');
    await user.click(locationElement);
    
    // Find the input and change the value
    const inputElement = screen.getByDisplayValue('Central Park');
    await user.clear(inputElement);
    await user.type(inputElement, 'New Stadium');
    await user.click(screen.getByRole('heading', { name: /Game Settings|Pelin Asetukset/i }));
    
    // Check if the utility function was called with the right parameters
    expect(updateGameDetails).toHaveBeenCalledWith('game123', { location: 'New Stadium' });
    expect(mockOnGameLocationChange).toHaveBeenCalledWith('New Stadium');
  });

  it('calls updateGameDetails when changing time inputs', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} />);
    
    // Find the hour and minute inputs
    const hourInput = screen.getByPlaceholderText('HH');
    const minuteInput = screen.getByPlaceholderText('MM');
    
    // Change the hour
    await user.clear(hourInput);
    await user.type(hourInput, '19');
    
    // Check if the utility function was called with the right parameters
    expect(updateGameDetails).toHaveBeenLastCalledWith('game123', { time: '19:30' });
    expect(mockOnGameTimeChange).toHaveBeenLastCalledWith('19:30');

    // Change the minute
    await user.clear(minuteInput);
    await user.type(minuteInput, '45');
    
    // Check again
    expect(updateGameDetails).toHaveBeenLastCalledWith('game123', { time: '19:45' });
    expect(mockOnGameTimeChange).toHaveBeenLastCalledWith('19:45');
  });

  it('calls updateGameDetails when editing game notes', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} />);
    
    // Click edit button for notes (since it has an explicit edit button)
    const editButton = screen.getByLabelText('gameSettingsModal.editNotes');
    await user.click(editButton);
    
    // Find the textarea and change the value
    const textareaElement = screen.getByDisplayValue('Regular season match');
    await user.clear(textareaElement);
    await user.type(textareaElement, 'Updated notes here');
    
    // Find the save button and click it
    const saveButton = screen.getByText('Save Notes');
    await user.click(saveButton);
    
    // Check if the utility function was called with the right parameters
    expect(updateGameDetails).toHaveBeenCalledWith('game123', { notes: 'Updated notes here' });
    expect(mockOnGameNotesChange).toHaveBeenCalledWith('Updated notes here');
  });

  it('calls updateGameEvent when editing a goal', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} />);
    
    // Find a goal event and click the edit button
    const editButtons = screen.getAllByTitle('Edit');
    await user.click(editButtons[0]);
    
    // Change time
    const timeInput = screen.getByPlaceholderText('MM:SS');
    await user.clear(timeInput);
    await user.type(timeInput, '06:30');
    
    // Change scorer
    const scorerSelect = within(timeInput.closest('tr')!).getAllByRole('combobox')[0];
    await user.selectOptions(scorerSelect, 'p2');
    
    // Save the changes
    const saveButton = within(timeInput.closest('tr')!).getByTitle('Save');
    await user.click(saveButton);
    
    // Calculate the expected time in seconds (6 minutes 30 seconds = 390 seconds)
    const expectedTimeInSeconds = 390;
    
    // Check if the utility function was called with the right parameters
    expect(updateGameEvent).toHaveBeenCalledWith('game123', 0, expect.objectContaining({
      id: 'goal1',
      time: expectedTimeInSeconds,
      scorerId: 'p2',
    }));
    
    expect(mockOnUpdateGameEvent).toHaveBeenCalledWith(expect.objectContaining({
      id: 'goal1',
      time: expectedTimeInSeconds,
      scorerId: 'p2',
    }));
  });

  it('calls removeGameEvent when deleting a goal', async () => {
    const user = userEvent.setup();
    // Mock confirm to return true
    window.confirm = jest.fn(() => true);
    
    render(<GameSettingsModal {...defaultProps} />);
    
    // Find a goal event and click the delete button
    const deleteButtons = screen.getAllByTitle('common.delete');
    await user.click(deleteButtons[0]);
    
    // Check if confirmation was shown
    expect(window.confirm).toHaveBeenCalled();
    
    // Check if the utility function was called with the right parameters
    expect(removeGameEvent).toHaveBeenCalledWith('game123', 0);
    expect(mockOnDeleteGameEvent).toHaveBeenCalledWith('goal1');
  });

  it('changes season and calls utility function when season dropdown changes', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} />);
    
    // Find the season dropdown and change selection
    const seasonButton = screen.getByRole('button', { name: 'Season/League' });
    await user.click(seasonButton);

    const seasonSelect = screen.getByRole('combobox');
    await user.selectOptions(seasonSelect, mockSeasons[0].id);

    // Check if the utility function was called with the right parameters
    expect(updateGameDetails).toHaveBeenCalledWith('game123', {
      seasonId: mockSeasons[0].id,
      tournamentId: null
    });
    
    expect(mockOnSeasonIdChange).toHaveBeenCalledWith(mockSeasons[0].id);
  });

  it('handles errors gracefully when utility functions throw', async () => {
    const user = userEvent.setup();
    // Setup error mocks
    console.error = jest.fn();
    window.alert = jest.fn();
    
    (updateGameDetails as jest.Mock).mockImplementation(() => {
      throw new Error('Update failed');
    });
    
    render(<GameSettingsModal {...defaultProps} />);
    
    // Find the opponent name element and click to edit
    const gameInfoSectionError = screen.getByRole('heading', { name: 'gameSettingsModal.gameInfo' }).closest('div');
    if (!gameInfoSectionError) throw new Error("Game Info section not found in error test");
    const opponentElement = within(gameInfoSectionError).getByText('Away Team'); // Scope within game info
    await user.click(opponentElement);
    
    // Find the input and change the value
    const inputElement = screen.getByDisplayValue('Away Team');
    await user.clear(inputElement);
    await user.type(inputElement, 'New Opponent');
    await user.click(screen.getByRole('heading', { name: /Game Settings|Pelin Asetukset/i }));
    
    // Check if error was logged and alert was shown
    expect(console.error).toHaveBeenCalled();
    expect(window.alert).toHaveBeenCalled();
  });

  it('does not call utility functions when currentGameId is null', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} currentGameId={null} />);
    
    // Find the opponent name element and click to edit
    const gameInfoSectionNullId = screen.getByRole('heading', { name: 'gameSettingsModal.gameInfo' }).closest('div');
    if (!gameInfoSectionNullId) throw new Error("Game Info section not found in null id test");
    const opponentElement = within(gameInfoSectionNullId).getByText('Away Team'); // Scope within game info
    await user.click(opponentElement);
    
    // Find the input and change the value
    const inputElement = screen.getByDisplayValue('Away Team');
    await user.clear(inputElement);
    await user.type(inputElement, 'New Opponent');
    await user.click(screen.getByRole('heading', { name: /Game Settings|Pelin Asetukset/i }));
    
    // Should still call the callback prop
    expect(mockOnOpponentNameChange).toHaveBeenCalledWith('New Opponent');
    
    // But should not call the utility function
    expect(updateGameDetails).not.toHaveBeenCalled();
  });
}); 