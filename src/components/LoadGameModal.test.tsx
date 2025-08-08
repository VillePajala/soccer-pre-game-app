import React from 'react';
import { render, screen, fireEvent, within, act } from '@/__tests__/test-utils';
import '@testing-library/jest-dom';
import LoadGameModal from './LoadGameModal';
import { SavedGamesCollection, AppState, PlayerAssessment } from '@/types';
import { Season, Tournament } from '@/types';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, options?: { replace?: Record<string, string> }) => {
      let translation = key;
      if (options?.replace) {
        Object.entries(options.replace).forEach(([k, v]) => {
          translation = translation.replace(`{{${k}}}`, v);
          });
        }
        return translation;
      },
      i18n: {
        changeLanguage: () => new Promise(() => {}),
      },
  }),
}));

// Mock utility modules
jest.mock('@/utils/seasons');
jest.mock('@/utils/tournaments');

import * as seasonsUtils from '@/utils/seasons';
import * as tournamentsUtils from '@/utils/tournaments';

// Sample Data - need to provide more complete season and tournament objects
const sampleSeasons: Season[] = [{ 
  id: 'season_1', 
  name: 'Spring League',
  location: 'Local',
  archived: false
} as Season];
const sampleTournaments: Tournament[] = [{ 
  id: 'tourn_1', 
  name: 'Summer Cup',
  location: 'Tournament Center',
  archived: false
} as Tournament];

const createSampleGames = (): SavedGamesCollection => ({
  'game_1659123456_abc': {
    teamName: 'Lions',
    opponentName: 'Tigers',
    gameDate: '2023-05-15',
    gameTime: '14:00',
    homeOrAway: 'home',
    seasonId: 'season_1',
    tournamentId: '',
    isPlayed: true,
    homeScore: 2,
    awayScore: 1,
    selectedPlayerIds: ['p1', 'p2'],
    assessments: { p1: {} as unknown as PlayerAssessment },
    gameStatus: 'finished'
  } as unknown as AppState,
  'game_1659223456_def': {
    teamName: 'Eagles',
    opponentName: 'Hawks',
    gameDate: '2023-07-22',
    gameTime: '16:00',
    homeOrAway: 'away',
    seasonId: '',
    tournamentId: 'tourn_1',
    isPlayed: false,
    homeScore: 0,
    awayScore: 0,
    selectedPlayerIds: ['p1'],
    assessments: { p1: {} as unknown as PlayerAssessment },
    gameStatus: 'notStarted'
  } as unknown as AppState,
});

describe('LoadGameModal', () => {
  const mockHandlers = {
    onClose: jest.fn(),
    onLoad: jest.fn().mockResolvedValue(undefined),
    onDelete: jest.fn(),
    onExportOneJson: jest.fn(),
    onExportOneCsv: jest.fn(),
  };

  beforeEach(() => {
    (seasonsUtils.getSeasons as jest.Mock).mockResolvedValue(sampleSeasons);
    (tournamentsUtils.getTournaments as jest.Mock).mockResolvedValue(sampleTournaments);
    (window.confirm as jest.Mock) = jest.fn();
    Object.values(mockHandlers).forEach(mock => mock.mockClear());
  });

  const renderModal = (props = {}) => {
    const defaultProps = {
      isOpen: true,
      savedGames: createSampleGames(),
      ...mockHandlers,
      ...props,
    };
    return render(<LoadGameModal {...defaultProps} />);
  };
  
  it('renders correctly and displays games', async () => {
    renderModal();
    
    // Wait for the modal to load games
    await screen.findByText('Hawks');
    
    // Check if both games are rendered
    expect(screen.getByText('Hawks')).toBeInTheDocument();
    expect(screen.getByText('Eagles')).toBeInTheDocument();
    expect(screen.getByText('Lions')).toBeInTheDocument();
    expect(screen.getByText('Tigers')).toBeInTheDocument();
  });

  it('filters games by search input', async () => {
    renderModal();
    await screen.findByText('Hawks'); // wait for load
    
    const searchInput = screen.getByPlaceholderText('loadGameModal.filterPlaceholder');
      fireEvent.change(searchInput, { target: { value: 'Lions' } });

    expect(await screen.findByText('Lions')).toBeInTheDocument();
    expect(screen.getByText('Tigers')).toBeInTheDocument();
    expect(screen.queryByText('Hawks')).not.toBeInTheDocument();
    });

  it('shows a NOT PLAYED badge for unplayed games', async () => {
    renderModal();
    const badge = await screen.findByText('loadGameModal.unplayedBadge');
    expect(badge).toBeInTheDocument();
  });

  it('filters to only unplayed games when toggle checked', async () => {
    renderModal();
    await screen.findByText('Hawks');

    const toggle = screen.getByLabelText('loadGameModal.showUnplayedOnly');
    fireEvent.click(toggle);

    expect(screen.queryByText('Lions')).not.toBeInTheDocument();
    expect(screen.getByText('Hawks')).toBeInTheDocument();
    expect(screen.getByText('Eagles')).toBeInTheDocument();
  });

  it('calls onLoad and onClose when a game is loaded', async () => {
    renderModal();
    const lionsTeam = await screen.findByText('Lions');
    const gameItem = lionsTeam.closest('li')!;
    const expandButton = within(gameItem).getByRole('button', { expanded: false });
    fireEvent.click(expandButton);
    const loadButton = within(gameItem).getByRole('button', { name: /loadGameModal.loadButton/i });

    await act(async () => {
      fireEvent.click(loadButton);
    });
    
    expect(mockHandlers.onLoad).toHaveBeenCalledWith('game_1659123456_abc');
    expect(mockHandlers.onClose).toHaveBeenCalled();
  });

  it('calls onDelete when delete is confirmed', async () => {
    (window.confirm as jest.Mock).mockReturnValue(true);
    renderModal();
    const hawksTeam = await screen.findByText('Hawks');
    const gameItem = hawksTeam.closest('li')!;
    const expandButton = within(gameItem).getByRole('button', { expanded: false });
    fireEvent.click(expandButton);
    
    // Find the delete button directly (no dropdown menu anymore)
    const deleteButton = within(gameItem).getByTitle('loadGameModal.deleteMenuItem');
    fireEvent.click(deleteButton);
    
    expect(window.confirm).toHaveBeenCalled();
    expect(mockHandlers.onDelete).toHaveBeenCalledWith('game_1659223456_def');
  });

  // Backup functionality has been moved to SettingsModal
});