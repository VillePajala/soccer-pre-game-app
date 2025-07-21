import React from 'react';
import { render, screen, waitFor, within, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import GameStatsModal from './GameStatsModal';
import { Player, Season, Tournament } from '@/types';
import { GameEvent, SavedGamesCollection, AppState } from '@/types';
import * as seasonsUtils from '@/utils/seasons';
import * as tournamentsUtils from '@/utils/tournaments';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n.test';

// Mock ResizeObserver for headlessui components
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mocks
jest.mock('@/utils/seasons');
jest.mock('@/utils/tournaments');

const mockGetSeasons = seasonsUtils.getSeasons as jest.Mock;
const mockGetTournaments = tournamentsUtils.getTournaments as jest.Mock;

// Sample Data
const samplePlayers: Player[] = [
  { id: 'p1', name: 'Alice', jerseyNumber: '10', isGoalie: false, notes: '', receivedFairPlayCard: false },
  { id: 'p2', name: 'Bob', jerseyNumber: '7', isGoalie: false, notes: '', receivedFairPlayCard: true }, // Fair play winner
  { id: 'p3', name: 'Charlie', jerseyNumber: '1', isGoalie: true, notes: '', receivedFairPlayCard: false },
];

const sampleGameEvents: GameEvent[] = [
  { id: 'g1', type: 'goal', time: 120, scorerId: 'p1', assisterId: 'p2' },
  { id: 'g2', type: 'opponentGoal', time: 300 },
  { id: 'g3', type: 'goal', time: 500, scorerId: 'p2' },
];

const sampleSeasonsData: Season[] = [
  { id: 's1', name: 'Spring 2024' },
  { id: 's2', name: 'Summer 2024' },
];

const sampleTournamentsData: Tournament[] = [
  { id: 't1', name: 'Cup Finals' },
  { id: 't2', name: 'Invitational' },
];

// Create a minimal AppState object for the mock
const minimalMockAppState: AppState = {
  playersOnField: [],
  opponents: [],
  drawings: [],
  availablePlayers: samplePlayers, // Use sample players for consistency
  showPlayerNames: true,
  teamName: "Test Team", // Match default props
  gameEvents: [],
  opponentName: "Rivals", // Match default props
  gameDate: "2024-08-02", // Match default props
  homeScore: 0,
  awayScore: 0,
  gameNotes: '',
  homeOrAway: 'home',
  numberOfPeriods: 2,
  periodDurationMinutes: 10,
  currentPeriod: 1,
  gameStatus: 'notStarted',
  selectedPlayerIds: [],
  assessments: {},
  seasonId: '',
  tournamentId: '',
  gameLocation: '',
  gameTime: '',
  subIntervalMinutes: 5,
  completedIntervalDurations: [],
  lastSubConfirmationTimeSeconds: 0,
  tacticalDiscs: [],
  tacticalDrawings: [],
  tacticalBallPosition: null,
};

// Use the minimal AppState object for the mockSavedGames collection
const mockSavedGames: SavedGamesCollection = {
   'game1': minimalMockAppState // Ensure the value conforms to AppState
};

// Define a proper interface for the props used in tests
interface TestProps {
  isOpen: boolean;
  onClose: jest.Mock;
  teamName: string;
  opponentName: string;
  gameDate: string;
  homeScore: number;
  awayScore: number;
  homeOrAway: 'home' | 'away';
  availablePlayers: Player[];
  gameEvents: GameEvent[];
  selectedPlayerIds: string[];
  savedGames: SavedGamesCollection;
  currentGameId: string | null;
  seasonId: string | null;
  tournamentId: string | null;
  onOpponentNameChange: jest.Mock;
  onGameDateChange: jest.Mock;
  onHomeScoreChange: jest.Mock;
  onAwayScoreChange: jest.Mock;
  onGameNotesChange: jest.Mock;
  onUpdateGameEvent: jest.Mock;
  onExportOneJson: jest.Mock;
  onExportOneCsv: jest.Mock;
  onDeleteGameEvent: jest.Mock;
  onExportAggregateJson: jest.Mock;
  onExportAggregateCsv: jest.Mock;
  gameLocation?: string;
  gameTime?: string;
  gameNotes?: string;
}

// Default Props function returning the specific type
const getDefaultProps = (): TestProps => ({
  isOpen: true,
  onClose: jest.fn(),
  teamName: 'Test Team',
  opponentName: 'Rivals',
  gameDate: '2024-08-02',
  homeScore: 2,
  awayScore: 1,
  homeOrAway: 'home',
  availablePlayers: samplePlayers,
  gameEvents: sampleGameEvents,
  selectedPlayerIds: ['p1', 'p2', 'p3'],
  savedGames: mockSavedGames,
  currentGameId: 'game1',
  seasonId: 's1',
  tournamentId: null,
  onOpponentNameChange: jest.fn(),
  onGameDateChange: jest.fn(),
  onHomeScoreChange: jest.fn(),
  onAwayScoreChange: jest.fn(),
  onGameNotesChange: jest.fn(),
  onUpdateGameEvent: jest.fn(),
  onExportOneJson: jest.fn(),
  onExportOneCsv: jest.fn(),
  onDeleteGameEvent: jest.fn(),
  onExportAggregateJson: jest.fn(),
  onExportAggregateCsv: jest.fn(),
});

// Helper to render with mocked context/providers if needed
const renderComponent = (props: TestProps) => {
  return render(
    <I18nextProvider i18n={i18n}>
      <GameStatsModal {...props} />
    </I18nextProvider>
  );
};

describe('GameStatsModal', () => {
  beforeEach(async () => {
    mockGetSeasons.mockResolvedValue(sampleSeasonsData);
    mockGetTournaments.mockResolvedValue(sampleTournamentsData);
    await i18n.changeLanguage('fi');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders modal title and basic game info when open', async () => {
    const props = getDefaultProps();
    await act(async () => {
      renderComponent(props);
    });
    
    expect(screen.getByRole('heading', { name: i18n.t('gameStatsModal.titleCurrentGame', 'Ottelutilastot') })).toBeInTheDocument();
    
    const gameInfoSection = screen.getByRole('heading', { name: i18n.t('gameStatsModal.gameInfoTitle', 'Game Information') });
    expect(gameInfoSection).toBeInTheDocument();

    const gameInfoContainer = gameInfoSection.parentElement as HTMLElement;
    
    // Check for team names and scores
    expect(within(gameInfoContainer).getByText(props.teamName)).toBeInTheDocument();
    expect(within(gameInfoContainer).getByText(props.opponentName)).toBeInTheDocument();
    expect(within(gameInfoContainer).getByText(`${props.homeScore} - ${props.awayScore}`)).toBeInTheDocument();
    
    // Check for date
    expect(within(gameInfoContainer).getByText(/2\.8\.2024/)).toBeInTheDocument();
  });

  test('loads seasons and tournaments using utility functions on mount', async () => {
    await act(async () => {
      renderComponent(getDefaultProps());
    });
    await waitFor(() => {
      expect(mockGetSeasons).toHaveBeenCalledTimes(1);
      expect(mockGetTournaments).toHaveBeenCalledTimes(1);
    });
  });

  test('displays current game stats by default', async () => {
    await act(async () => {
      renderComponent(getDefaultProps());
    });
    expect(screen.getByRole('button', { name: i18n.t('gameStatsModal.tabs.currentGame') })).toBeInTheDocument();

    const playerStatsSection = screen.getByRole('heading', { name: i18n.t('gameStatsModal.playerStatsTitle') });
    expect(playerStatsSection).toBeInTheDocument();
    const playerStatsContainer = playerStatsSection.closest('div') as HTMLElement;

    expect(within(playerStatsContainer).getByRole('columnheader', { name: i18n.t('common.player') })).toBeInTheDocument();
    expect(within(playerStatsContainer).getByRole('cell', { name: 'Alice' })).toBeInTheDocument();
    expect(within(playerStatsContainer).getByRole('cell', { name: /Bob/ })).toBeInTheDocument();
    
    const aliceRow = within(playerStatsContainer).getByRole('row', { name: /Alice/i });
    if (!aliceRow) throw new Error("Row for Alice not found");
    // Alice: 1 Goal, 0 Assists = 1 Point. GP is 1. FP is 0.
    expect(aliceRow).toHaveTextContent('Alice'); // Name
    expect(aliceRow).toHaveTextContent('1');    // GP
    expect(aliceRow).toHaveTextContent('1');    // Goals
    expect(aliceRow).toHaveTextContent('0');    // Assists
    expect(aliceRow).toHaveTextContent('1');    // Total Points
  });

  test('shows totals row with aggregated stats', async () => {
    await act(async () => {
      renderComponent(getDefaultProps());
    });

    const totalsRow = screen.getByText(i18n.t('playerStats.totalsRow'));
    const cells = totalsRow.closest('tr')!.querySelectorAll('td');
    expect(cells[1]).toHaveTextContent('3'); // games played total
    expect(cells[2]).toHaveTextContent('2'); // goals total
    expect(cells[3]).toHaveTextContent('1'); // assists total
    expect(cells[4]).toHaveTextContent('3'); // total score
    expect(cells[5]).toHaveTextContent('1.0'); // average points
  });

  test('displays game event log correctly', async () => {
    await act(async () => {
      renderComponent(getDefaultProps());
    });
    const goalLogSection = await screen.findByRole('heading', { name: i18n.t('gameStatsModal.goalLogTitle', 'Goal Log') });
    const goalLogContainer = goalLogSection.parentElement as HTMLElement;

    // Check for the first goal (Alice from Bob)
    const firstGoalCard = within(goalLogContainer).getByText('02:00').closest('div.p-3');
    expect(firstGoalCard).not.toBeNull();
    if (firstGoalCard) {
      expect(within(firstGoalCard as HTMLElement).getByText('Alice')).toBeInTheDocument();
      expect(within(firstGoalCard as HTMLElement).getByText(new RegExp(i18n.t('common.assist', 'Assist') + '.*Bob'))).toBeInTheDocument();
    }

    // Check for the opponent goal
    const opponentGoalCard = within(goalLogContainer).getByText('05:00').closest('div.p-3');
    expect(opponentGoalCard).not.toBeNull();
    if (opponentGoalCard) {
      expect(within(opponentGoalCard as HTMLElement).getByText('Rivals')).toBeInTheDocument();
    }

    // Check for the third goal (Bob, unassisted)
    const thirdGoalCard = within(goalLogContainer).getByText('08:20').closest('div.p-3');
    expect(thirdGoalCard).not.toBeNull();
    if (thirdGoalCard) {
      expect(within(thirdGoalCard as HTMLElement).getByText('Bob')).toBeInTheDocument();
      // Ensure no assister text is present
      expect(within(thirdGoalCard as HTMLElement).queryByText(new RegExp(i18n.t('common.assist', 'Assist')))).not.toBeInTheDocument();
    }
  });

  test('calls onDeleteGameEvent when delete button on an event is clicked and confirmed', async () => {
    const mockProps = getDefaultProps();
    window.confirm = jest.fn(() => true);
    await act(async () => {
      renderComponent(mockProps);
    });

    const goalLogSection = await screen.findByRole('heading', { name: i18n.t('gameStatsModal.goalLogTitle', 'Goal Log') });
    const goalLogContainer = goalLogSection.parentElement as HTMLElement;
    
    const firstGoalCard = within(goalLogContainer).getByText('02:00').closest('div.p-3');
    expect(firstGoalCard).not.toBeNull();

    if (firstGoalCard) {
      const deleteButton = within(firstGoalCard as HTMLElement).getByRole('button', { name: i18n.t('common.delete', 'Delete') });
      fireEvent.click(deleteButton);
    }

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining(i18n.t('gameStatsModal.confirmDeleteEvent')));
    expect(mockProps.onDeleteGameEvent).toHaveBeenCalledWith('g1');
  });

  test('does not call onDeleteGameEvent if delete is cancelled', async () => {
    const mockProps = getDefaultProps();
    window.confirm = jest.fn(() => false);
    await act(async () => {
      renderComponent(mockProps);
    });

    const goalLogSection = await screen.findByRole('heading', { name: i18n.t('gameStatsModal.goalLogTitle', 'Goal Log') });
    const goalLogContainer = goalLogSection.parentElement as HTMLElement;

    const firstGoalCard = within(goalLogContainer).getByText('02:00').closest('div.p-3');
    expect(firstGoalCard).not.toBeNull();

    if (firstGoalCard) {
      const deleteButton = within(firstGoalCard as HTMLElement).getByRole('button', { name: i18n.t('common.delete', 'Delete') });
      fireEvent.click(deleteButton);
    }
    
    expect(window.confirm).toHaveBeenCalledWith(i18n.t('gameStatsModal.confirmDeleteEvent'));
    expect(mockProps.onDeleteGameEvent).not.toHaveBeenCalled();
  });

  test('enters edit mode when edit button on an event is clicked', async () => {
    const mockProps = getDefaultProps();
    await act(async () => {
      renderComponent(mockProps);
    });

    const goalLogSection = await screen.findByRole('heading', { name: i18n.t('gameStatsModal.goalLogTitle', 'Goal Log') });
    const goalLogContainer = goalLogSection.parentElement as HTMLElement;

    const firstGoalCard = within(goalLogContainer).getByText('02:00').closest('div.p-3');
    expect(firstGoalCard).not.toBeNull();

    if (firstGoalCard) {
      const editButton = within(firstGoalCard as HTMLElement).getByRole('button', { name: i18n.t('common.edit', 'Edit') });
      fireEvent.click(editButton);

      // Check that edit mode is entered by looking for save/cancel buttons within the same card
      expect(await within(firstGoalCard as HTMLElement).findByRole('button', { name: i18n.t('common.save', 'Save Changes') })).toBeInTheDocument();
      expect(within(firstGoalCard as HTMLElement).getByRole('button', { name: i18n.t('common.cancel', 'Cancel') })).toBeInTheDocument();
    }
    
    // onUpdateGameEvent should NOT be called until save is clicked
    expect(mockProps.onUpdateGameEvent).not.toHaveBeenCalled();
  });

  test('displays correct data when switching tabs', async () => {
    const props = getDefaultProps();
    await act(async () => {
      renderComponent(props);
    });

    // Initial check (Current Game)
    expect(screen.getByRole('button', { name: i18n.t('gameStatsModal.tabs.currentGame') })).toBeInTheDocument();
    
    // Switch to Season tab and check for season-specific elements
    fireEvent.click(screen.getByRole('button', { name: i18n.t('gameStatsModal.tabs.season') }));
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText(i18n.t('gameStatsModal.filterAllSeasons'))).toBeInTheDocument();
    });

    // Switch to Tournament tab and check for tournament-specific elements
    fireEvent.click(screen.getByRole('button', { name: i18n.t('gameStatsModal.tabs.tournament') }));
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument();
      expect(screen.getByText(i18n.t('gameStatsModal.filterAllTournaments'))).toBeInTheDocument();
    });
  });

  test('deletes a goal when delete is confirmed', async () => {
    const mockProps = getDefaultProps();
    window.confirm = jest.fn(() => true); // Mock window.confirm to return true

    await act(async () => {
      renderComponent(mockProps);
    });

    // Find the delete button for the first goal
    const deleteButtons = await screen.findAllByRole('button', { name: i18n.t('common.delete', 'Delete') });
    fireEvent.click(deleteButtons[0]);

    // Check that onDeleteGameEvent was called with the correct goal ID
    expect(mockProps.onDeleteGameEvent).toHaveBeenCalledWith('g1');
  });

  test('filters player list and selects with mouse', async () => {
    const props = getDefaultProps();
    await act(async () => {
      renderComponent(props);
    });

    fireEvent.click(screen.getByRole('button', { name: i18n.t('gameStatsModal.tabs.player', 'Player') }));

    const user = userEvent.setup();
    const input = await screen.findByPlaceholderText('Search players...');
    await user.type(input, 'Bob');
    const bobOption = await screen.findByRole('option', { name: 'Bob' });
    await user.click(bobOption);

    await screen.findByRole('heading', { name: 'Bob' });
  });

  test('allows selecting player with keyboard', async () => {
    const props = getDefaultProps();
    await act(async () => {
      renderComponent(props);
    });

    fireEvent.click(screen.getByRole('button', { name: i18n.t('gameStatsModal.tabs.player', 'Player') }));

    const input = await screen.findByPlaceholderText('Search players...');
    fireEvent.change(input, { target: { value: 'Cha' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(screen.getByRole('heading', { name: 'Charlie' })).toBeInTheDocument();
  });

  // Add more tests for:
  // - Filtering stats table
  // - Sorting stats table
  // - Editing game notes
  // - Export functionalities
}); 
