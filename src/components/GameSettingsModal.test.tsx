import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react'; // Re-enable fireEvent and within
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import GameSettingsModal from './GameSettingsModal';
import { type GameSettingsModalProps } from './GameSettingsModal';
import { Player, Season, Tournament } from '@/types';
import { GameEvent } from '@/app/page';
// import { SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY } from '@/config/constants'; // Commented out again
import { getSeasons } from '@/utils/seasons';
import { getTournaments } from '@/utils/tournaments';
import { updateGameDetails, updateGameEvent, removeGameEvent } from '@/utils/savedGames';
import * as rosterUtils from '@/utils/masterRoster';
import { useTranslation } from 'react-i18next';

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
      if (key === 'common.hourShort') return 'HH';
      if (key === 'common.minuteShort') return 'MM';
      if (key === 'common.minutesShort') return 'min';
      if (key === 'common.delete') return 'Delete';
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
      if (key === 'gameSettingsModal.duration') return 'Duration';
      if (key === 'gameSettingsModal.editNotes') return 'Edit Notes';
      if (key === 'gameSettingsModal.saveNotes') return 'Save Notes';
      if (key === 'gameSettingsModal.associationSeason') return 'Season/League';
      if (key === 'gameSettingsModal.associationNone') return 'None';
      if (key === 'gameSettingsModal.associationTournament') return 'Tournament';
      if (key === 'gameSettingsModal.title') return 'Game Settings';
      if (key === 'gameSettingsModal.gameInfo') return 'Game Info';
      if (key === 'gameSettingsModal.notes') return 'Game Notes';
      if (key === 'gameSettingsModal.eventLog') return 'Event Log';
      if (key === 'gameSettingsModal.opponent') return 'Opponent';
      if (key === 'gameSettingsModal.venue') return 'Venue';
      if (key === 'gameSettingsModal.associationSectionTitle') return 'Association';
      if (key === 'gameSettingsModal.closeModal') return 'Close';
      if (key === 'gameEvent.type.goal') return 'Goal';
      if (key === 'gameEvent.type.opponentGoal') return 'Opponent Goal';
      return key; 
    },
  }),
}));

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

jest.mock('@/utils/seasons', () => ({ getSeasons: jest.fn() }));
jest.mock('@/utils/tournaments', () => ({ getTournaments: jest.fn() }));
jest.mock('@/utils/savedGames', () => ({
  updateGameDetails: jest.fn(),
  updateGameEvent: jest.fn(),
  removeGameEvent: jest.fn(),
}));
jest.mock('@/utils/masterRoster', () => ({ getMasterRoster: jest.fn() }));

const mockPlayers: Player[] = [
  { id: 'p1', name: 'Player One', isGoalie: false },
  { id: 'p2', name: 'Player Two', isGoalie: true },
  { id: 'p3', name: 'Player Three', isGoalie: false },
];
const mockGameEvents: GameEvent[] = [
  { id: 'goal1', type: 'goal', time: 120, scorerId: 'p1', assisterId: 'p2' },
  { id: 'goal2', type: 'opponentGoal', time: 300 },
];
const mockSeasons: Season[] = [ { id: 's1', name: 'Spring League 2024' }, { id: 's2', name: 'Winter League 2023' }];
const mockTournaments: Tournament[] = [ { id: 't1', name: 'Summer Cup' }, { id: 't2', name: 'Annual Gala' } ];

const defaultProps: GameSettingsModalProps = {
  isOpen: true,
  onClose: mockOnClose,
  currentGameId: 'game123',
  teamName: 'Home Team',
  opponentName: 'Away Team',
  gameDate: '2024-07-31',
  gameLocation: 'Central Park',
  gameTime: '14:30',
  gameNotes: 'Regular season match',
  homeScore: 2,
  awayScore: 1,
  gameEvents: [...mockGameEvents], 
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
  if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return isoDate;
  const parts = isoDate.split('-');
  return `${parts[2]}.${parts[1]}.${parts[0]}`;
};

// Helper to format time from seconds to MM:SS
const formatTimeDisplayTest = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

describe('<GameSettingsModal />', () => {
  const { t } = useTranslation(); 

  beforeEach(() => {
    jest.clearAllMocks();
    (getSeasons as jest.Mock).mockResolvedValue(mockSeasons);
    (getTournaments as jest.Mock).mockResolvedValue(mockTournaments);
    (rosterUtils.getMasterRoster as jest.Mock).mockReturnValue(mockPlayers);
    (updateGameDetails as jest.Mock).mockResolvedValue({ id: 'game123' }); 
    (updateGameEvent as jest.Mock).mockResolvedValue({ id: 'event1' });
    (removeGameEvent as jest.Mock).mockResolvedValue(true);
    window.confirm = jest.fn(() => true); 
    // Clear specific mocks that are checked for number of calls or sequence
    mockOnSetHomeOrAway.mockClear();
  });

  test('renders the modal when isOpen is true', async () => {
    render(<GameSettingsModal {...defaultProps} />);
    await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('heading', { name: t('gameSettingsModal.title') })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: t('gameSettingsModal.gameInfo') })).toBeInTheDocument();
  });

  test('does not render the modal when isOpen is false', () => {
    render(<GameSettingsModal {...defaultProps} isOpen={false} />);
    expect(screen.queryByRole('heading', { name: t('gameSettingsModal.title') })).not.toBeInTheDocument();
  });

  test('calls onClose when the close button is clicked', async () => {
    const user = userEvent.setup();
    render(<GameSettingsModal {...defaultProps} />);
    await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
    const header = screen.getByRole('heading', { name: t('gameSettingsModal.title') }).closest('div');
    if (!header) throw new Error('Modal header not found for close button test');
    const closeButton = within(header).getByRole('button', { name: 'common.close' });
    await user.click(closeButton);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  // Section: Game Info (Editable Fields)
  describe('Game Info Section', () => {
    const getGameInfoSection = () => {
      const section = screen.getByRole('heading', { name: t('gameSettingsModal.gameInfo') }).closest('div');
      if (!section) throw new Error("Game Info section not found");
      return section;
    };

    test('calls onOpponentNameChange and updateGameDetails when opponent name is edited', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<GameSettingsModal {...defaultProps} />);
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      const gameInfoSection = getGameInfoSection();

      const opponentDisplay = within(gameInfoSection).getByText(defaultProps.opponentName);
      await user.click(opponentDisplay);
      const opponentInput = within(gameInfoSection).getByDisplayValue(defaultProps.opponentName);
      const newName = 'New Opponent FC';
      await user.clear(opponentInput);
      await user.type(opponentInput, newName);
      await user.click(screen.getByRole('heading', { name: t('gameSettingsModal.title') })); // Click away to blur/save

      expect(mockOnOpponentNameChange).toHaveBeenCalledWith(newName);
      expect(updateGameDetails).toHaveBeenCalledWith(defaultProps.currentGameId, { awayTeam: newName });
      
      rerender(<GameSettingsModal {...defaultProps} opponentName={newName} />);
      expect(await within(gameInfoSection).findByText(newName)).toBeInTheDocument();
    });

    test('cancels opponent name edit with Escape key', async () => {
      const user = userEvent.setup();
      render(<GameSettingsModal {...defaultProps} />);
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      const gameInfoSection = getGameInfoSection();
      const opponentDisplay = within(gameInfoSection).getByText(defaultProps.opponentName);
      await user.click(opponentDisplay);
      const opponentInput = within(gameInfoSection).getByDisplayValue(defaultProps.opponentName);
      await user.type(opponentInput, 'Some temp value');
      await user.keyboard('{Escape}');
      expect(within(gameInfoSection).getByText(defaultProps.opponentName)).toBeInTheDocument();
      expect(mockOnOpponentNameChange).not.toHaveBeenCalled();
      expect(updateGameDetails).not.toHaveBeenCalled();
    });

    test('calls onGameDateChange and updateGameDetails when game date is edited', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<GameSettingsModal {...defaultProps} />);
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      const gameInfoSection = getGameInfoSection();

      const dateDisplay = within(gameInfoSection).getByText(formatDateForDisplayTest(defaultProps.gameDate));
      await user.click(dateDisplay);
      const dateInput = within(gameInfoSection).getByDisplayValue(defaultProps.gameDate); // Input value is YYYY-MM-DD
      const newDate = '2024-08-15';
      fireEvent.change(dateInput, { target: { value: newDate } });
      await user.click(screen.getByRole('heading', { name: t('gameSettingsModal.title') }));

      expect(mockOnGameDateChange).toHaveBeenCalledWith(newDate);
      expect(updateGameDetails).toHaveBeenCalledWith(defaultProps.currentGameId, { date: newDate });

      rerender(<GameSettingsModal {...defaultProps} gameDate={newDate} />);
      expect(await within(gameInfoSection).findByText(formatDateForDisplayTest(newDate))).toBeInTheDocument();
    });

    test('cancels game date edit with Escape key', async () => {
      const user = userEvent.setup();
      render(<GameSettingsModal {...defaultProps} />);
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      const gameInfoSection = getGameInfoSection();
      const dateDisplay = within(gameInfoSection).getByText(formatDateForDisplayTest(defaultProps.gameDate));
      await user.click(dateDisplay);
      const dateInput = within(gameInfoSection).getByDisplayValue(defaultProps.gameDate);
      fireEvent.change(dateInput, { target: { value: '2099-01-01' } });
      await user.keyboard('{Escape}');
      expect(within(gameInfoSection).getByText(formatDateForDisplayTest(defaultProps.gameDate))).toBeInTheDocument();
      expect(mockOnGameDateChange).not.toHaveBeenCalled();
      expect(updateGameDetails).not.toHaveBeenCalled();
    });

    test('calls onGameLocationChange and updateGameDetails when game location is edited', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<GameSettingsModal {...defaultProps} />);
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      const gameInfoSection = getGameInfoSection();

      const locationDisplay = within(gameInfoSection).getByText(defaultProps.gameLocation!);
      await user.click(locationDisplay);
      const locationInput = within(gameInfoSection).getByDisplayValue(defaultProps.gameLocation!);
      const newLocation = 'New Stadium X';
      await user.clear(locationInput);
      await user.type(locationInput, newLocation);
      await user.click(screen.getByRole('heading', { name: t('gameSettingsModal.title') }));

      expect(mockOnGameLocationChange).toHaveBeenCalledWith(newLocation);
      expect(updateGameDetails).toHaveBeenCalledWith(defaultProps.currentGameId, { location: newLocation });

      rerender(<GameSettingsModal {...defaultProps} gameLocation={newLocation} />);
      expect(await within(gameInfoSection).findByText(newLocation)).toBeInTheDocument();
    });

    test('cancels game location edit with Escape key', async () => {
      const user = userEvent.setup();
      render(<GameSettingsModal {...defaultProps} />);
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      const gameInfoSection = getGameInfoSection();
      const locationDisplay = within(gameInfoSection).getByText(defaultProps.gameLocation!);
      await user.click(locationDisplay);
      const locationInput = within(gameInfoSection).getByDisplayValue(defaultProps.gameLocation!);
      await user.type(locationInput, 'Temporary Venue');
      await user.keyboard('{Escape}');
      expect(within(gameInfoSection).getByText(defaultProps.gameLocation!)).toBeInTheDocument();
      expect(mockOnGameLocationChange).not.toHaveBeenCalled();
      expect(updateGameDetails).not.toHaveBeenCalled();
    });
    
    test('calls onGameTimeChange and updateGameDetails when time inputs change', async () => {
      const user = userEvent.setup();
      render(<GameSettingsModal {...defaultProps} />);
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      const gameInfoSection = getGameInfoSection();

      const hourInput = within(gameInfoSection).getByPlaceholderText(t('common.hourShort'));
      const minuteInput = within(gameInfoSection).getByPlaceholderText(t('common.minuteShort'));
      const initialMinute = defaultProps.gameTime!.split(':')[1];

      await user.clear(hourInput);
      await user.type(hourInput, '10');
      // Blur or change focus to trigger save for EditableTimeField
      await user.click(minuteInput); // Click on another input to trigger blur/save for hour
      expect(mockOnGameTimeChange).toHaveBeenLastCalledWith(`10:${initialMinute}`);
      expect(updateGameDetails).toHaveBeenLastCalledWith(defaultProps.currentGameId, { time: `10:${initialMinute}` });

      await user.clear(minuteInput);
      await user.type(minuteInput, '05');
      await user.click(hourInput); // Click on hour input to trigger blur/save for minute
      expect(mockOnGameTimeChange).toHaveBeenLastCalledWith('10:05'); // Hour is now 10 from previous step
      expect(updateGameDetails).toHaveBeenLastCalledWith(defaultProps.currentGameId, { time: '10:05' });
    });
  });

  // Section: Game Notes
  describe('Game Notes Section', () => {
    const getNotesSection = () => {
      const section = screen.getByRole('heading', { name: t('gameSettingsModal.notes') }).closest('div');
      if (!section) throw new Error("Game Notes section not found");
      return section;
    };

    test('calls onGameNotesChange and updateGameDetails when game notes are edited', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<GameSettingsModal {...defaultProps} />);
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      const notesSection = getNotesSection();

      const editButton = within(notesSection).getByLabelText(t('gameSettingsModal.editNotes'));
      await user.click(editButton);
      const notesTextarea = within(notesSection).getByDisplayValue(defaultProps.gameNotes!);
      const newNotes = 'Updated critical strategy notes.';
      await user.clear(notesTextarea);
      await user.type(notesTextarea, newNotes);
      
      const saveButton = within(notesSection).getByRole('button', { name: t('common.save') });
      await user.click(saveButton);

      expect(mockOnGameNotesChange).toHaveBeenCalledWith(newNotes);
      expect(updateGameDetails).toHaveBeenCalledWith(defaultProps.currentGameId, { notes: newNotes });
      
      rerender(<GameSettingsModal {...defaultProps} gameNotes={newNotes} />);
      // After saving, the editable field might revert to displaying text. 
      // The text might be directly under the main modal content or within a specific container.
      expect(await screen.findByText(newNotes)).toBeInTheDocument(); 
    });

    test('cancels game notes edit with Escape key', async () => {
      const user = userEvent.setup();
      render(<GameSettingsModal {...defaultProps} />);
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      const notesSection = getNotesSection();

      const editButton = within(notesSection).getByLabelText(t('gameSettingsModal.editNotes'));
      await user.click(editButton);
      const notesTextarea = within(notesSection).getByDisplayValue(defaultProps.gameNotes!);
      await user.type(notesTextarea, 'Temporary typing...');
      await user.keyboard('{Escape}');

      expect(within(notesSection).getByText(defaultProps.gameNotes!)).toBeInTheDocument();
      expect(mockOnGameNotesChange).not.toHaveBeenCalled();
      expect(updateGameDetails).not.toHaveBeenCalled();
    });
  });

  // Section: Periods & Duration
  describe('Periods & Duration Section', () => {
    const getGameInfoSection = () => { // Re-using from Game Info, or make it global to the main describe
      const section = screen.getByRole('heading', { name: t('gameSettingsModal.gameInfo') }).closest('div');
      if (!section) throw new Error("Game Info section for periods/duration not found");
      return section;
    };

    test('calls onNumPeriodsChange and updates UI when period button is clicked', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<GameSettingsModal {...defaultProps} numPeriods={2} />);
        await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
        const gameInfoSection = getGameInfoSection();
        
        const period1Button = within(gameInfoSection).getByRole('button', { name: '1' });
        await user.click(period1Button);
        expect(mockOnNumPeriodsChange).toHaveBeenCalledWith(1);
        // Assuming updateGameDetails is NOT called for numPeriods directly, only the callback.
        // If it is, add: expect(updateGameDetails).toHaveBeenCalledWith(defaultProps.currentGameId, { numPeriods: 1 });
        
        rerender(<GameSettingsModal {...defaultProps} numPeriods={1} />);
        // Verify UI update if necessary, e.g., active state of button
        // const activePeriod1Button = within(gameInfoSection).getByRole('button', { name: '1' }); // Removed unused variable
        // Add assertion for active class if applicable, e.g. expect(activePeriod1Button).toHaveClass('active-class'); // Removed comment for now
    });

    test('calls onPeriodDurationChange and updateGameDetails when duration is edited', async () => {
        const user = userEvent.setup();
        const { rerender } = render(<GameSettingsModal {...defaultProps} />);
        await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
        const gameInfoSection = getGameInfoSection();

        const durationDisplay = within(gameInfoSection).getByText(`${defaultProps.periodDurationMinutes} ${t('common.minutesShort')}`);
        await user.click(durationDisplay);
        const durationInput = within(gameInfoSection).getByDisplayValue(String(defaultProps.periodDurationMinutes));
        const newDuration = 25;
        await user.clear(durationInput);
        await user.type(durationInput, String(newDuration));
        await user.click(screen.getByRole('heading', { name: t('gameSettingsModal.title') })); // Blur to save

        expect(mockOnPeriodDurationChange).toHaveBeenCalledWith(newDuration);
        expect(updateGameDetails).toHaveBeenCalledWith(defaultProps.currentGameId, { periodDuration: newDuration });
        
        rerender(<GameSettingsModal {...defaultProps} periodDurationMinutes={newDuration} />);
        expect(await within(gameInfoSection).findByText(`${newDuration} ${t('common.minutesShort')}`)).toBeInTheDocument();
    });

    test('cancels period duration edit with Escape key', async () => {
        const user = userEvent.setup();
        render(<GameSettingsModal {...defaultProps} />);
        await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
        await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
        const gameInfoSection = getGameInfoSection();

        const durationDisplay = within(gameInfoSection).getByText(`${defaultProps.periodDurationMinutes} ${t('common.minutesShort')}`);
        await user.click(durationDisplay);
        const durationInput = within(gameInfoSection).getByDisplayValue(String(defaultProps.periodDurationMinutes));
        await user.type(durationInput, '99');
        await user.keyboard('{Escape}');

        expect(within(gameInfoSection).getByText(`${defaultProps.periodDurationMinutes} ${t('common.minutesShort')}`)).toBeInTheDocument();
        expect(mockOnPeriodDurationChange).not.toHaveBeenCalled();
        expect(updateGameDetails).not.toHaveBeenCalled();
    });
  });
  
  // Section: Home/Away Toggle
  describe('Home/Away Toggle', () => {
    test('calls onSetHomeOrAway when toggle is changed', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<GameSettingsModal {...defaultProps} homeOrAway="home" />);  
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      const gameInfoSection = screen.getByRole('heading', { name: t('gameSettingsModal.gameInfo') }).closest('div');
      if (!gameInfoSection) throw new Error("Game Info section not found for home/away toggle");

      const awayRadio = within(gameInfoSection).getByRole('radio', { name: 'general.away' });
      await user.click(awayRadio);
      expect(mockOnSetHomeOrAway).toHaveBeenCalledWith('away'); // Check first call
      expect(mockOnSetHomeOrAway).toHaveBeenCalledTimes(1);

      // Rerender with the new prop value to reflect the change
      rerender(<GameSettingsModal {...defaultProps} homeOrAway="away" />);

      // Re-query the home radio button before the second click
      const homeRadio = within(gameInfoSection).getByRole('radio', { name: 'general.home' });
      await user.click(homeRadio);
      expect(mockOnSetHomeOrAway).toHaveBeenCalledTimes(2); // Ensure it was called again
      expect(mockOnSetHomeOrAway).toHaveBeenLastCalledWith('home'); // Check last call
    });
  });

  // Section: Association (Season/Tournament)
  describe('Association Section', () => {
    const getAssociationSection = (): HTMLElement => {
      // Find the label span for "Association"
      let associationLabelSpan: HTMLElement | null = null;
      try {
        associationLabelSpan = screen.getByText((content, element) => {
          return element?.tagName.toLowerCase() === 'span' && content.startsWith(t('gameSettingsModal.association'));
        });
      } catch {
        // console.error('Debug: DOM for getAssociationSection (label span not found):', document.body.innerHTML);
        throw new Error("Association label span ('gameSettingsModal.association') not found.");
      }

      // The actual section div should be the parent of this span's container
      const sectionContainer = associationLabelSpan.closest('div.mb-2.md\\:col-span-2.pt-3.mt-2.border-t.border-slate-700');

      if (!sectionContainer || !(sectionContainer instanceof HTMLElement)) {
        // console.error('Debug: DOM for getAssociationSection (section container not found or not HTMLElement):', document.body.innerHTML);
        throw new Error("Association section container (div with specific classes including border-t) not found or is not an HTMLElement.");
      }
      
      // Sanity check: Ensure this container has the expected buttons
      try {
        within(sectionContainer).getByRole('button', { name: t('gameSettingsModal.associationNone') });
        within(sectionContainer).getByRole('button', { name: t('gameSettingsModal.associationSeason') });
        within(sectionContainer).getByRole('button', { name: t('gameSettingsModal.associationTournament') });
      } catch (verificationError) {
        // console.error('Debug: DOM for getAssociationSection (verification error - buttons not found in container):', document.body.innerHTML);
        throw new Error(`Association section container found, but failed to verify expected child buttons. Error: ${verificationError}`);
      }
      
      return sectionContainer as HTMLElement;
    };

    test('initially shows "None" selected and no combobox if no IDs provided', async () => {
      render(<GameSettingsModal {...defaultProps} seasonId={null} tournamentId={null} />);
      // Wait for the useEffect to fetch data, even if it doesn't result in visible options here
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      const associationSection = getAssociationSection();
      expect(within(associationSection).queryByRole('combobox')).not.toBeInTheDocument();
    });

    test('displays season combobox with options when "Season/League" button is clicked', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<GameSettingsModal {...defaultProps} />);  
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      let associationSection = getAssociationSection();
      const seasonButton = within(associationSection).getByRole('button', { name: t('gameSettingsModal.associationSeason') });
      await user.click(seasonButton);
      
      // After the click, onSeasonIdChange(mockSeasons[0].id) and onTournamentIdChange(null) are called.
      // Rerender the component with these new props.
      rerender(<GameSettingsModal {...defaultProps} seasonId={mockSeasons[0].id} tournamentId={null} />);
      
      // Re-fetch associationSection AFTER rerender because its content (the select/combobox) has now appeared or changed.
      associationSection = getAssociationSection(); 
      
      let seasonSelect: HTMLElement | null = null;
      try {
        // waitFor will poll the DOM within the (now updated) associationSection
        await waitFor(async () => {
          seasonSelect = await within(associationSection).findByRole('combobox');
          expect(seasonSelect).toBeInTheDocument();
        });
      } catch (error) {
        // Keep existing debug log if it fails
        console.error('DEBUG: Failed to find combobox. DOM snapshot:', document.body.innerHTML);
        throw error; 
      }
      // Add a null check before using seasonSelect, and throw if null
      if (!seasonSelect) throw new Error('Season select combobox not found after waitFor');

      // Check for options within the found combobox
      await waitFor(() => {
        expect(within(seasonSelect!).getByRole('option', { name: t('gameSettingsModal.selectSeason') })).toBeInTheDocument();
        expect(within(seasonSelect!).getByRole('option', { name: mockSeasons[0].name })).toBeInTheDocument();
        expect(within(seasonSelect!).getByRole('option', { name: mockSeasons[1].name })).toBeInTheDocument();
      });
    });

    test('displays tournament combobox with options when "Tournament" button is clicked', async () => {
      const user = userEvent.setup();
      // Get rerender from the initial render call
      const { rerender } = render(<GameSettingsModal {...defaultProps} />); 
      
      let associationSection = getAssociationSection(); // Get section before click
      const tournamentButton = within(associationSection).getByRole('button', { name: t('gameSettingsModal.associationTournament') });
      await user.click(tournamentButton);

      // After the click, onTournamentIdChange(mockTournaments[0].id) and onSeasonIdChange(null) are called.
      // Rerender the component with these new props.
      rerender(<GameSettingsModal {...defaultProps} tournamentId={mockTournaments[0].id} seasonId={null} />);
      
      // Re-fetch associationSection AFTER rerender
      associationSection = getAssociationSection(); 

      let tournamentSelect: HTMLElement | null = null;
      try {
        await waitFor(async () => {
          tournamentSelect = await within(associationSection).findByRole('combobox');
          expect(tournamentSelect).toBeInTheDocument();
        });
      } catch (error) {
        console.error('DEBUG: Failed to find tournament combobox. DOM snapshot:', document.body.innerHTML);
        throw error; 
      }
      if (!tournamentSelect) throw new Error('Tournament select combobox not found after waitFor');

      await waitFor(() => {
        expect(within(tournamentSelect!).getByRole('option', { name: t('gameSettingsModal.selectTournament') })).toBeInTheDocument();
        expect(within(tournamentSelect!).getByRole('option', { name: mockTournaments[0].name })).toBeInTheDocument();
        expect(within(tournamentSelect!).getByRole('option', { name: mockTournaments[1].name })).toBeInTheDocument();
      });
    });

    test('calls onSeasonIdChange and updateGameDetails when a season is selected', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<GameSettingsModal {...defaultProps} />);  
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      let associationSection = getAssociationSection();
      const seasonButton = within(associationSection).getByRole('button', { name: t('gameSettingsModal.associationSeason') });
      await user.click(seasonButton); // Calls onSeasonIdChange(mockSeasons[0].id), onTournamentId(null)

      // Rerender with props reflecting the button click (making combobox appear)
      rerender(<GameSettingsModal {...defaultProps} seasonId={mockSeasons[0].id} tournamentId={null} />);
      associationSection = getAssociationSection(); // Re-fetch section
      
      let seasonSelectElement: HTMLElement | null = null;
      await waitFor(async () => {
        seasonSelectElement = await within(associationSection).findByRole('combobox');
        expect(seasonSelectElement).toBeInTheDocument();
      });
      if (!seasonSelectElement) throw new Error('Season select combobox for selection test not found');
      
      // User selects an option. This triggers handleSeasonChange in the component.
      // handleSeasonChange calls onSeasonIdChange(selectedValue) and updateGameDetails.
      // Let's select a *different* season to ensure the prop change is distinct for the second call.
      const selectedSeasonId = mockSeasons[1].id; // Choose the second season for selection
      await user.selectOptions(seasonSelectElement!, selectedSeasonId);

      // onSeasonIdChange was called first by button click (with mockSeasons[0].id)
      // then by selectOptions (with selectedSeasonId = mockSeasons[1].id)
      expect(mockOnSeasonIdChange).toHaveBeenCalledWith(mockSeasons[0].id); // From button click
      expect(mockOnSeasonIdChange).toHaveBeenLastCalledWith(selectedSeasonId); // From selectOptions
      expect(mockOnSeasonIdChange).toHaveBeenCalledTimes(2);

      // updateGameDetails is called by handleSeasonChange
      expect(updateGameDetails).toHaveBeenCalledWith(defaultProps.currentGameId, { seasonId: selectedSeasonId, tournamentId: null });
    });

    test('calls onTournamentIdChange and updateGameDetails when a tournament is selected', async () => {
      const user = userEvent.setup();
      const { rerender } = render(<GameSettingsModal {...defaultProps} />);  
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      let associationSection = getAssociationSection();
      const tournamentButton = within(associationSection).getByRole('button', { name: t('gameSettingsModal.associationTournament') });
      await user.click(tournamentButton); // Calls onTournamentIdChange(mockTournaments[0].id), onSeasonIdChange(null)

      // Rerender with props reflecting the button click (making combobox appear)
      rerender(<GameSettingsModal {...defaultProps} tournamentId={mockTournaments[0].id} seasonId={null} />);
      associationSection = getAssociationSection(); // Re-fetch section
      
      let tournamentSelectElement: HTMLElement | null = null;
      await waitFor(async () => {
        tournamentSelectElement = await within(associationSection).findByRole('combobox');
        expect(tournamentSelectElement).toBeInTheDocument();
      });
      if (!tournamentSelectElement) throw new Error('Tournament select combobox for selection test not found');
      
      // User selects an option. This triggers handleTournamentChange in the component.
      // handleTournamentChange calls onTournamentIdChange(selectedValue) and updateGameDetails.
      const selectedTournamentId = mockTournaments[1].id; // Choose the second tournament for selection
      await user.selectOptions(tournamentSelectElement!, selectedTournamentId);

      // onTournamentIdChange was called first by button click (with mockTournaments[0].id)
      // then by selectOptions (with selectedTournamentId = mockTournaments[1].id)
      expect(mockOnTournamentIdChange).toHaveBeenCalledWith(mockTournaments[0].id);
      expect(mockOnTournamentIdChange).toHaveBeenLastCalledWith(selectedTournamentId);
      expect(mockOnTournamentIdChange).toHaveBeenCalledTimes(2);

      // updateGameDetails is called by handleTournamentChange
      expect(updateGameDetails).toHaveBeenCalledWith(defaultProps.currentGameId, { tournamentId: selectedTournamentId, seasonId: null });
    });

    test('switches to "None", clears combobox, and calls callbacks/updateGameDetails when "None" is clicked after selection', async () => {
      const user = userEvent.setup();
      // Start with a season selected, so combobox is visible
      const initialProps = { ...defaultProps, seasonId: mockSeasons[0].id, tournamentId: null };
      const { rerender } = render(<GameSettingsModal {...initialProps} />);  
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1)); // Check after initial render
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      let associationSection = getAssociationSection();
      // Verify combobox is initially present
      expect(await within(associationSection).findByRole('combobox')).toBeInTheDocument();

      const noneButton = within(associationSection).getByRole('button', { name: t('gameSettingsModal.associationNone') });
      await user.click(noneButton);
      // The "None" button click calls onSeasonIdChange(null) and onTournamentIdChange(null).
      
      // Rerender with props reflecting the "None" button click
      rerender(<GameSettingsModal {...defaultProps} seasonId={null} tournamentId={null} />);
      associationSection = getAssociationSection(); // Re-fetch section
      
      // Check that the callbacks were called appropriately
      expect(mockOnSeasonIdChange).toHaveBeenCalledWith(null);
      expect(mockOnTournamentIdChange).toHaveBeenCalledWith(null); 

      // updateGameDetails should NOT be called by the "None" button directly.
      // It IS called when selecting from dropdown, but not here.
      // So, we check it wasn't called with the nullified season/tournament IDs from this action.
      expect(updateGameDetails).not.toHaveBeenCalledWith(defaultProps.currentGameId, { seasonId: null, tournamentId: null });
      
      // Verify combobox is no longer in the document
      expect(within(associationSection).queryByRole('combobox')).not.toBeInTheDocument();
    });
    
    test('loads with correct season selected and combobox visible if seasonId is provided', async () => {
        render(<GameSettingsModal {...defaultProps} seasonId={mockSeasons[0].id} tournamentId={null} />);
        // For this test, season options *should* be visible after data load.
        await screen.findByRole('option', { name: mockSeasons[0].name }); 
        const associationSection = getAssociationSection();
        const seasonSelect = await within(associationSection).findByRole('combobox');
        expect(seasonSelect).toBeInTheDocument();
        expect(seasonSelect).toHaveValue(mockSeasons[0].id);
    });

    test('loads with correct tournament selected and combobox visible if tournamentId is provided', async () => {
        render(<GameSettingsModal {...defaultProps} tournamentId={mockTournaments[0].id} seasonId={null} />);
        // For this test, tournament options *should* be visible after data load.
        await screen.findByRole('option', { name: mockTournaments[0].name });
        const associationSection = getAssociationSection();
        const tournamentSelect = await within(associationSection).findByRole('combobox');
        expect(tournamentSelect).toBeInTheDocument();
        expect(tournamentSelect).toHaveValue(mockTournaments[0].id);
    });
  });

  // Section: Event Log Interactions
  describe('Event Log Interactions', () => {
    // Helper to find an event row, assuming time is a good unique identifier for test purposes
    const findEventRowByTime = async (timeInSeconds: number) => {
      const timeDisplay = formatTimeDisplayTest(timeInSeconds);
      // Wait for the text to appear, as event log might render asynchronously or after other interactions
      const eventTimeCell = await screen.findByText(timeDisplay, {}, { timeout: 3000 }); // Added timeout for findBy
      const eventRow = eventTimeCell.closest('tr');
      if (!eventRow) throw new Error(`Event row for time ${timeDisplay} not found`);
      return eventRow;
    };

    test('edits a goal event successfully (time, scorer, assister)', async () => {
      const user = userEvent.setup();
      const eventToEdit = defaultProps.gameEvents.find(e => e.type === 'goal')!;
      if (!eventToEdit) throw new Error('No goal event found in defaultProps for testing edit');
      
      const { rerender } = render(<GameSettingsModal {...defaultProps} />);  
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      const eventRow = await findEventRowByTime(eventToEdit.time);

      const editButton = within(eventRow).getByRole('button', { name: t('common.edit') });
      await user.click(editButton);

      // Edit time
      const timeInput = within(eventRow).getByDisplayValue(formatTimeDisplayTest(eventToEdit.time));
      const newTimeStr = '03:30'; // 210 seconds
      await user.clear(timeInput);
      await user.type(timeInput, newTimeStr);

      // Edit scorer
      const selectsInRow = within(eventRow).getAllByRole('combobox');
      const scorerSelect = selectsInRow[0];
      const newScorer = mockPlayers.find(p => p.id !== eventToEdit.scorerId)!; // Pick a different player
      await user.selectOptions(scorerSelect, newScorer.id);

      // Edit assister (assuming the second combobox is for assister)
      const assisterSelect = selectsInRow[1];
      const newAssister = mockPlayers.find(p => p.id !== eventToEdit.assisterId && p.id !== newScorer.id)!; // Different from original and new scorer
      await user.selectOptions(assisterSelect, newAssister.id);

      const saveButton = within(eventRow).getByRole('button', { name: t('common.save') });
      await user.click(saveButton);

      const expectedEventUpdatePayload = {
        id: eventToEdit.id,
        type: eventToEdit.type,
        time: 210, // 3 * 60 + 30
        scorerId: newScorer.id,
        assisterId: newAssister.id,
        // Include other properties like forHomeTeam if they exist on GameEvent and are relevant
      };
      
      expect(mockOnUpdateGameEvent).toHaveBeenCalledWith(expect.objectContaining(expectedEventUpdatePayload));
      expect(updateGameEvent).toHaveBeenCalledWith(
        defaultProps.currentGameId,
        defaultProps.gameEvents.findIndex(e => e.id === eventToEdit.id), // Get index of the original event
        expect.objectContaining(expectedEventUpdatePayload)
      );
      
      // Simulate props update and verify UI changes
      const updatedEvents = defaultProps.gameEvents.map(e => 
        e.id === eventToEdit.id ? { ...e, ...expectedEventUpdatePayload } : e
      );
      rerender(<GameSettingsModal {...defaultProps} gameEvents={updatedEvents} />);
      
      // Re-find row by new time, then check scorer/assister names
      const updatedEventRow = await findEventRowByTime(210);
      expect(within(updatedEventRow).getByText(newScorer.name)).toBeInTheDocument();
      expect(within(updatedEventRow).getByText(newAssister.name)).toBeInTheDocument();
    });

    test('deletes a game event successfully after confirmation', async () => {
      const user = userEvent.setup();
      const eventToDelete = defaultProps.gameEvents[0];
      const originalEventCount = defaultProps.gameEvents.length;
      const mockConfirm = jest.spyOn(window, 'confirm').mockReturnValue(true);
      
      const { rerender } = render(<GameSettingsModal {...defaultProps} />); 
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      const eventRow = await findEventRowByTime(eventToDelete.time);

      const deleteButton = within(eventRow).getByRole('button', { name: t('common.delete') });
      await user.click(deleteButton);

      expect(mockConfirm).toHaveBeenCalledTimes(1);
      expect(mockOnDeleteGameEvent).toHaveBeenCalledWith(eventToDelete.id);
      expect(removeGameEvent).toHaveBeenCalledWith(
        defaultProps.currentGameId,
        defaultProps.gameEvents.findIndex(e => e.id === eventToDelete.id) // Index of the event
      );

      // Simulate props update
      const remainingEvents = defaultProps.gameEvents.filter(e => e.id !== eventToDelete.id);
      rerender(<GameSettingsModal {...defaultProps} gameEvents={remainingEvents} />);
      
      // Verify the event row is no longer in the document
      expect(screen.queryByText(formatTimeDisplayTest(eventToDelete.time))).not.toBeInTheDocument();
      expect(screen.getAllByRole('row').length).toBe(originalEventCount); // Header row + remaining event rows

      mockConfirm.mockRestore(); // Clean up spy
    });
  });

  // Section: Error Handling & Edge Cases
  describe('Error Handling & Edge Cases', () => {
    const getGameInfoSection = () => {
      const section = screen.getByRole('heading', { name: t('gameSettingsModal.gameInfo') }).closest('div');
      if (!section) throw new Error("Game Info section not found");
      return section;
    };

    test('handles errors gracefully when updateGameDetails utility throws', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (updateGameDetails as jest.Mock).mockImplementationOnce(() => {
        console.error('[Mocked updateGameDetails] Simulated update failure during game details save.');
        return null;
      });
      
      render(<GameSettingsModal {...defaultProps} />);
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      const gameInfoSection = getGameInfoSection();

      // Action that triggers updateGameDetails: e.g., editing opponent name
      const opponentDisplay = within(gameInfoSection).getByText(defaultProps.opponentName);
      await user.click(opponentDisplay);
      const opponentInput = within(gameInfoSection).getByDisplayValue(defaultProps.opponentName);
      const newName = 'Trigger Update Failure';
      await user.clear(opponentInput);
      await user.type(opponentInput, newName);
      // Click away to blur/save, which should call handleConfirmInlineEdit, then updateGameDetails
      await user.click(screen.getByRole('heading', { name: t('gameSettingsModal.title') })); 

      // Check that the utility's mocked error log was called
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Mocked updateGameDetails] Simulated update failure during game details save.')
      );
      
      // Optionally, assert component state if it should reflect the error
      // e.g., expect(screen.queryByText(newName)).not.toBeInTheDocument(); // Assuming change is reverted or not applied
      // expect(mockOnOpponentNameChange).not.toHaveBeenCalledWith(newName); // Or that the prop callback wasn't successful

      consoleErrorSpy.mockRestore(); // Restore spy
    });

    test('handles errors gracefully when updateGameEvent utility throws', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (updateGameEvent as jest.Mock).mockImplementationOnce(() => {
        console.error('[Mocked updateGameEvent] Simulated event update failure.');
        return null; 
      });

      render(<GameSettingsModal {...defaultProps} gameEvents={mockGameEvents} />);  
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      
      // Action: Edit an existing event
      const eventRows = screen.getAllByRole('row');
      // Assuming the first data row is an editable event (this might need adjustment)
      const editButtonInEventRow = within(eventRows[1]).getByRole('button', { name: t('common.edit') });
      await user.click(editButtonInEventRow);

      // Assuming an input appears for editing, make a change and save
      // This part is highly dependent on the actual DOM structure for event editing
      // For example, if a time input appears:
      const eventTimeInput = screen.getByDisplayValue(formatTimeDisplayTest(mockGameEvents[0].time)); // find input by current value
      await user.clear(eventTimeInput);
      await user.type(eventTimeInput, '03:00');
      
      const saveButton = screen.getByRole('button', { name: t('common.save') }); // Find save button for the event
      await user.click(saveButton);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Mocked updateGameEvent] Simulated event update failure.')
      );
      consoleErrorSpy.mockRestore();
    });

    test('handles errors gracefully when removeGameEvent utility throws', async () => {
      const user = userEvent.setup();
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (removeGameEvent as jest.Mock).mockImplementationOnce(() => {
        console.error('[Mocked removeGameEvent] Simulated event deletion failure.');
        return false; 
      });
      window.confirm = jest.fn(() => true);

      render(<GameSettingsModal {...defaultProps} gameEvents={mockGameEvents} onDeleteGameEvent={mockOnDeleteGameEvent} />);
      await waitFor(() => expect(getSeasons).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(getTournaments).toHaveBeenCalledTimes(1));
      
      // Action: Delete an existing event
      const eventRows = screen.getAllByRole('row');
      const deleteButtonInEventRow = within(eventRows[1]).getByRole('button', { name: t('common.delete') });
      await user.click(deleteButtonInEventRow);

      expect(window.confirm).toHaveBeenCalledTimes(1); // Verify confirm was called
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[Mocked removeGameEvent] Simulated event deletion failure.')
      );
      // Check that onDeleteGameEvent prop was not called or called with error indication if that's the design
      // expect(mockOnDeleteGameEvent).not.toHaveBeenCalledWith(mockGameEvents[0].id); 
      consoleErrorSpy.mockRestore();
    });

    // Tests for getSeasons/getTournaments utility failures are already correctly using waitFor for their specific consoleErrorSpy assertions.
  });

  // ALL TESTS ADDED
});