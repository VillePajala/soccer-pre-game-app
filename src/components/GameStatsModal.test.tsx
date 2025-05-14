import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import GameStatsModal from './GameStatsModal';
import { Player, Season, Tournament } from '@/types';
import { GameEvent, SavedGamesCollection, AppState } from '@/app/page';
import * as seasonsUtils from '@/utils/seasons';
import * as tournamentsUtils from '@/utils/tournaments';
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n.test';

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
  seasonId: '',
  tournamentId: '',
  gameLocation: '',
  gameTime: '',
  subIntervalMinutes: 5,
  completedIntervalDurations: [],
  lastSubConfirmationTimeSeconds: 0,
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
    mockGetSeasons.mockReturnValue(sampleSeasonsData);
    mockGetTournaments.mockReturnValue(sampleTournamentsData);
    await i18n.changeLanguage('fi');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders modal title and basic game info when open', () => {
    const props = getDefaultProps();
    renderComponent(props);
    expect(screen.getByRole('heading', { name: i18n.t('gameStatsModal.title') })).toBeInTheDocument();
    
    const gameInfoSection = screen.getByRole('heading', { name: i18n.t('gameStatsModal.gameInfoTitle') }).parentElement?.parentElement;
    expect(gameInfoSection).toBeInTheDocument();
    if (!(gameInfoSection instanceof HTMLElement)) throw new Error("Game info section not found or not an HTMLElement");

    // Team names are present as labels for their scores, and also for the opponent block
    expect(within(gameInfoSection).getAllByText(props.teamName).length).toBeGreaterThanOrEqual(1);
    expect(within(gameInfoSection).getAllByText(props.opponentName).length).toBeGreaterThanOrEqual(1);
    
    // Date is still present
    expect(within(gameInfoSection).getByText(/2\.8\.2024/)).toBeInTheDocument();

    // Score verification based on the new structure
    // Home Score: Label is Home Team Name, next sibling is the score
    const homeTeamNameLabelForScore = within(gameInfoSection).getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'span' && 
             element.textContent === (props.homeOrAway === 'home' ? props.teamName : props.opponentName) &&
             element.nextElementSibling?.textContent === String(props.homeScore);
    });
    expect(homeTeamNameLabelForScore).toBeInTheDocument();
    const homeScoreElement = homeTeamNameLabelForScore.nextElementSibling;
    expect(homeScoreElement).toHaveTextContent(String(props.homeScore));

    // Away Score: Label is Away Team Name, next sibling is the score
    const awayTeamNameLabelForScore = within(gameInfoSection).getByText((content, element) => {
      return element?.tagName.toLowerCase() === 'span' && 
             element.textContent === (props.homeOrAway === 'home' ? props.opponentName : props.teamName) &&
             element.nextElementSibling?.textContent === String(props.awayScore);
    });
    expect(awayTeamNameLabelForScore).toBeInTheDocument();
    const awayScoreElement = awayTeamNameLabelForScore.nextElementSibling;
    expect(awayScoreElement).toHaveTextContent(String(props.awayScore));
  });

  test('loads seasons and tournaments using utility functions on mount', async () => {
    renderComponent(getDefaultProps());
    await waitFor(() => {
      expect(mockGetSeasons).toHaveBeenCalledTimes(1);
      expect(mockGetTournaments).toHaveBeenCalledTimes(1);
    });
  });

  test('displays current game stats by default', () => {
    renderComponent(getDefaultProps());
    expect(screen.getByRole('button', { name: i18n.t('gameStatsModal.tabs.currentGame'), pressed: true })).toBeInTheDocument();

    const playerStatsSection = screen.getByRole('heading', { name: i18n.t('gameStatsModal.playerStatsTitle') }).closest('div');
    expect(playerStatsSection).toBeInTheDocument();
    if (!(playerStatsSection instanceof HTMLElement)) throw new Error("Player stats section not found or not an HTMLElement");

    expect(within(playerStatsSection).getByRole('columnheader', { name: i18n.t('common.player') })).toBeInTheDocument();
    expect(within(playerStatsSection).getByRole('cell', { name: 'Alice' })).toBeInTheDocument();
    expect(within(playerStatsSection).getByRole('cell', { name: /Bob/ })).toBeInTheDocument();
    
    const aliceRow = within(playerStatsSection).getByRole('row', { name: /Alice/i });
    if (!aliceRow) throw new Error("Row for Alice not found");
    // Alice: 1 Goal, 0 Assists = 1 Point. GP is 1. FP is 0.
    expect(aliceRow).toHaveTextContent('Alice'); // Name
    expect(aliceRow).toHaveTextContent('1');    // GP
    expect(aliceRow).toHaveTextContent('1');    // Goals
    expect(aliceRow).toHaveTextContent('0');    // Assists
    expect(aliceRow).toHaveTextContent('1');    // Total Points
  });

  test('displays game event log correctly', () => {
    renderComponent(getDefaultProps());
    expect(screen.getByRole('heading', { name: 'Goal Log' })).toBeInTheDocument();
    
    const eventLogSectionParent = screen.getByRole('heading', { name: 'Goal Log' }).parentElement;
    expect(eventLogSectionParent).toBeInTheDocument();
    if(!(eventLogSectionParent instanceof HTMLElement)) throw new Error("Event log section parent not found or not an HTMLElement");

    const eventLogTable = within(eventLogSectionParent).getByRole('table');
    
    const firstGoalRow = within(eventLogTable).getByText('02:00').closest('tr');
    if (!firstGoalRow) throw new Error("First goal row (02:00) not found");
    expect(within(firstGoalRow).getByText('Maali')).toBeInTheDocument();
    expect(within(firstGoalRow).getByText('Alice')).toBeInTheDocument(); 
    expect(within(firstGoalRow).getByText('Bob')).toBeInTheDocument();   

    const secondGoalRow = within(eventLogTable).getByText('05:00').closest('tr');
    if (!secondGoalRow) throw new Error("Second goal row (05:00) not found");
    expect(within(secondGoalRow).getByText(i18n.t('common.opponentGoal'))).toBeInTheDocument();
    expect(within(secondGoalRow).getByText(getDefaultProps().opponentName)).toBeInTheDocument(); 

    const thirdGoalRow = within(eventLogTable).getByText('08:20').closest('tr');
    if (!thirdGoalRow) throw new Error("Third goal row (08:20) not found");
    expect(within(thirdGoalRow).getByText('Maali')).toBeInTheDocument();
    expect(within(thirdGoalRow).getByText('Bob')).toBeInTheDocument(); 
    const assisterCellsInThirdRow = within(thirdGoalRow).getAllByRole('cell');
    expect(assisterCellsInThirdRow[3].textContent).toBe(''); 
  });

  // Add more tests for:
  // - Switching tabs (Season, Tournament, Overall)
  // - Filtering stats table
  // - Sorting stats table
  // - Editing game info (opponent, date, score)
  // - Editing game notes
  // - Editing/Deleting events from the log
  // - Export functionalities
  // - Fair Play award display/handling (if applicable in this modal)

}); 