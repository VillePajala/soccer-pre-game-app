import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
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
jest.mock('@/utils/fullBackup');

import * as seasonsUtils from '@/utils/seasons';
import * as tournamentsUtils from '@/utils/tournaments';
import * as fullBackupUtils from '@/utils/fullBackup';

// Sample Data
const sampleSeasons: Season[] = [{ id: 'season_1', name: 'Spring League' }];
const sampleTournaments: Tournament[] = [{ id: 'tourn_1', name: 'Summer Cup' }];

const createSampleGames = (): SavedGamesCollection => ({
  'game_1659123456_abc': {
    teamName: 'Lions',
    opponentName: 'Tigers',
    gameDate: '2023-05-15',
    homeOrAway: 'home',
    seasonId: 'season_1',
    tournamentId: '',
    isPlayed: true,
    selectedPlayerIds: ['p1', 'p2'],
    assessments: { p1: {} as unknown as PlayerAssessment },
  } as unknown as AppState,
  'game_1659223456_def': {
    teamName: 'Eagles',
    opponentName: 'Hawks',
    gameDate: '2023-07-22',
    homeOrAway: 'away',
    seasonId: '',
    tournamentId: 'tourn_1',
    isPlayed: false,
    selectedPlayerIds: ['p1'],
    assessments: { p1: {} as unknown as PlayerAssessment },
  } as unknown as AppState,
});

describe('LoadGameModal', () => {
  const mockHandlers = {
    onClose: jest.fn(),
    onLoad: jest.fn(),
    onDelete: jest.fn(),
    onExportOneJson: jest.fn(),
    onExportOneCsv: jest.fn(),
  };

  beforeEach(() => {
    (seasonsUtils.getSeasons as jest.Mock).mockResolvedValue(sampleSeasons);
    (tournamentsUtils.getTournaments as jest.Mock).mockResolvedValue(sampleTournaments);
    (fullBackupUtils.exportFullBackup as jest.Mock).mockClear();
    (fullBackupUtils.importFullBackup as jest.Mock).mockClear();
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
    expect(await screen.findByText('Lions vs Tigers')).toBeInTheDocument();
    expect(screen.getByText('Hawks vs Eagles')).toBeInTheDocument();
  });

  it('filters games by search input', async () => {
    renderModal();
    await screen.findByText('Lions vs Tigers'); // wait for load
    
    const searchInput = screen.getByPlaceholderText('loadGameModal.filterPlaceholder');
      fireEvent.change(searchInput, { target: { value: 'Lions' } });

    expect(await screen.findByText('Lions vs Tigers')).toBeInTheDocument();
    expect(screen.queryByText('Hawks vs Eagles')).not.toBeInTheDocument();
    });

  it('shows a NOT PLAYED badge for unplayed games', async () => {
    renderModal();
    const badge = await screen.findByText('loadGameModal.unplayedBadge');
    expect(badge).toBeInTheDocument();
  });

  it('filters to only unplayed games when toggle checked', async () => {
    renderModal();
    await screen.findByText('Lions vs Tigers');

    const toggle = screen.getByLabelText('loadGameModal.showUnplayedOnly');
    fireEvent.click(toggle);

    expect(screen.queryByText('Lions vs Tigers')).not.toBeInTheDocument();
    expect(screen.getByText('Hawks vs Eagles')).toBeInTheDocument();
  });

  it('calls onLoad and onClose when a game is loaded', async () => {
    renderModal();
    const gameItem = await screen.findByText('Lions vs Tigers');
    fireEvent.click(gameItem.closest('button')!);
    const loadButton = within(gameItem.closest('li')!).getByRole('button', { name: /loadGameModal.loadButton/i });

    fireEvent.click(loadButton);
    expect(mockHandlers.onLoad).toHaveBeenCalledWith('game_1659123456_abc');
    expect(mockHandlers.onClose).toHaveBeenCalled();
  });

  it('calls onDelete when delete is confirmed', async () => {
    (window.confirm as jest.Mock).mockReturnValue(true);
    renderModal();
    const gameItem = await screen.findByText('Hawks vs Eagles');
    fireEvent.click(gameItem.closest('button')!);
    const optionsButton = within(gameItem.closest('li')!).getByTitle('Options');
    fireEvent.click(optionsButton);

    const deleteButton = await screen.findByRole('button', { name: 'loadGameModal.deleteMenuItem' });
      fireEvent.click(deleteButton);
    
    expect(window.confirm).toHaveBeenCalled();
      expect(mockHandlers.onDelete).toHaveBeenCalledWith('game_1659223456_def');
    });

  it('calls exportFullBackup when the backup button is clicked', async () => {
    renderModal();
    const backupButton = await screen.findByRole('button', { name: 'loadGameModal.backupButton' });
    fireEvent.click(backupButton);
    expect(fullBackupUtils.exportFullBackup).toHaveBeenCalled();
    });

  it('triggers file input when restore button is clicked', async () => {
    renderModal();
    const restoreButton = await screen.findByRole('button', { name: 'loadGameModal.restoreButton' });
    const fileInput = screen.getByTestId('restore-backup-input');
       const clickSpy = jest.spyOn(fileInput, 'click').mockImplementation(() => {});

      fireEvent.click(restoreButton);
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

  it('calls importFullBackup on file selection', async () => {
    renderModal();
    const fileInput = screen.getByTestId('restore-backup-input');
    const fileContent = '{"data":"test"}';
    const file = new File([fileContent], 'backup.json', { type: 'application/json' });

        await act(async () => {
          fireEvent.change(fileInput, { target: { files: [file] } });
    });
    
    // This part is tricky as the FileReader logic is internal.
    // We assume the component calls importFullBackup. A better test might involve spying on FileReader.
    // For now, we trust the implementation calls the mock.
    // Let's add a small delay to see if the async logic inside completes.
    await new Promise(r => setTimeout(r, 100));

    expect(fullBackupUtils.importFullBackup).toHaveBeenCalledWith(fileContent);
  });
});