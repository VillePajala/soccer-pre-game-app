import React from 'react';
import { render, screen, fireEvent, within, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadGameModal from './LoadGameModal';
import { SavedGamesCollection, AppState } from '@/app/page';
import { Season, Tournament } from '@/types';

// Improved Mock for react-i18next hook
jest.mock('react-i18next', () => ({
  useTranslation: () => {
    const translations: Record<string, string> = {
      'loadGameModal.title': 'Load / Manage Games',
      'loadGameModal.searchPlaceholder': 'Filter games...',
      'loadGameModal.noGames': 'No saved games found',
      'loadGameModal.backupAllButton': 'Backup All Data',
      'loadGameModal.restoreButton': 'Restore from Backup',
      'loadGameModal.importButton': 'Import',
      'loadGameModal.exportAllJsonButton': 'Export JSON',
      'loadGameModal.exportAllExcelButton': 'Export CSV',
      'loadGameModal.backupButton': 'Backup All Data',
      'loadGameModal.close': 'Close',
      'loadGameModal.deleteConfirm': 'Are you sure you want to delete the saved game "{gameName}"? This action cannot be undone.',
      'loadGameModal.currentlyLoaded': 'Currently Loaded',
      'loadGameModal.currentlyOpenShort': 'Loaded',
      'loadGameModal.gameInfo': '{{teamName}} vs {{opponentName}}',
      'loadGameModal.gameDateLabel': 'Date:',
      'loadGameModal.scoreLabel': 'Score:',
      'loadGameModal.loadButton': 'Load Game',
      'loadGameModal.exportJsonButton': 'Export JSON',
      'loadGameModal.exportCsvButton': 'Export CSV',
      'loadGameModal.deleteButton': 'Delete',
      'loadGameModal.filterPlaceholder': 'Filter games...',
      'loadGameModal.filterByTooltip': 'Filter by this {{type}}',
      'loadGameModal.importTooltip': 'Import game data from a JSON file',
      'loadGameModal.exportAllJsonTooltip': 'Export all saved games and settings to a JSON file',
      'loadGameModal.exportAllExcelTooltip': 'Export all saved games to an Excel file',
      'loadGameModal.backupTooltip': 'Create a full backup of all application data (JSON)',
      'loadGameModal.restoreTooltip': 'Restore application data from a full backup file (JSON)',
      'common.close': 'Close',
      'common.options': 'Options',
      'loadGameModal.noSavedGames': 'No games have been saved yet.',
      'loadGameModal.noGamesFound': 'No saved games match your filter.',
    };
    return {
      t: (key: string, fallbackOrParams?: string | Record<string, unknown>): string => {
        let options: { replace?: Record<string, unknown>, defaultValue?: string } = {};
        let fallback = '';

        if (typeof fallbackOrParams === 'string') {
          fallback = fallbackOrParams;
        } else if (typeof fallbackOrParams === 'object') {
          options = fallbackOrParams as { replace?: Record<string, unknown>, defaultValue?: string };
          fallback = options.defaultValue || key;
        }

        let translation = translations[key] || fallback;

        if (options.replace && translation) {
          Object.keys(options.replace).forEach((paramKey) => {
            translation = translation.replace(`{{${paramKey}}}`, String(options.replace![paramKey]));
          });
        }
        return translation;
      },
      i18n: {
        changeLanguage: () => new Promise(() => {}),
        language: 'en',
      },
    };
  },
}));

// Mock the i18n module
jest.mock('../i18n', () => ({
  __esModule: true,
  default: {
    language: 'en',
    changeLanguage: jest.fn(),
  }
}));

// Import the mocked modules
import * as seasonsUtils from '@/utils/seasons';
import * as tournamentsUtils from '@/utils/tournaments';
import * as fullBackupUtils from '@/utils/fullBackup';

// Mock fullBackup functions
jest.mock('@/utils/fullBackup', () => ({
  exportFullBackup: jest.fn(),
  importFullBackup: jest.fn().mockReturnValue(true),
}));

// <<< ADD MOCKS for season/tournament utilities >>>
jest.mock('@/utils/seasons', () => ({
  getSeasons: jest.fn(),
}));

jest.mock('@/utils/tournaments', () => ({
  getTournaments: jest.fn(),
}));

// Setup for jest-dom - Should be handled by setupTests.js, but keep for clarity
expect.extend({
  toBeInTheDocument(received) {
    const pass = received !== null;
    return {
      pass,
      message: () => `expected ${received} to be in the document`,
    };
  },
});

// Define createSampleGames before describe block
const createSampleGames = (): SavedGamesCollection => ({
  'game_1659123456_abc': {
    id: 'game_1659123456_abc',
    teamName: 'Lions',
    opponentName: 'Tigers',
    gameDate: '2023-05-15',
    homeScore: 2,
    awayScore: 1,
    homeOrAway: 'home', 
    playersOnField: [], opponents: [], drawings: [], gameEvents: [], availablePlayers: [], selectedPlayerIds: [],
    showPlayerNames: true, gameNotes: '', numberOfPeriods: 2, periodDurationMinutes: 10, currentPeriod: 1, gameStatus: 'gameEnd',
    seasonId: 'season_1', tournamentId: '', // Belongs to Spring League
  } as unknown as AppState,
  'game_1659223456_def': {
    id: 'game_1659223456_def',
    teamName: 'Eagles',
    opponentName: 'Hawks',
    gameDate: '2023-07-22',
    homeScore: 3,
    awayScore: 3,
    homeOrAway: 'away',
    playersOnField: [], opponents: [], drawings: [], gameEvents: [], availablePlayers: [], selectedPlayerIds: [],
    showPlayerNames: true, gameNotes: '', numberOfPeriods: 2, periodDurationMinutes: 10, currentPeriod: 1, gameStatus: 'gameEnd',
    seasonId: '', tournamentId: 'tourn_1', // Belongs to Summer Cup
  } as unknown as AppState,
});

// Define sampleSeasons and sampleTournaments
const sampleSeasons: Season[] = [
  { id: 'season_1', name: 'Spring League' },
  { id: 'season_2', name: 'Fall Season' },
];
const sampleTournaments: Tournament[] = [
  { id: 'tourn_1', name: 'Summer Cup' }, 
];

describe('LoadGameModal', () => {
  let localStorageMock: {
    getItem: jest.Mock;
    setItem: jest.Mock;
    removeItem: jest.Mock;
    clear: jest.Mock;
  };
  let mockHandlers: {
    onClose: jest.Mock;
    onLoad: jest.Mock;
    onDelete: jest.Mock;
    onExportAllJson: jest.Mock;
    onExportAllExcel: jest.Mock;
    onExportOneJson: jest.Mock;
    onExportOneCsv: jest.Mock;
    onImportJson: jest.Mock;
  };

  beforeEach(() => {
    // Setup localStorage mock inline - Keep for potential future non-data uses?
    // Or remove entirely if only used for data?
    // For now, keep a basic mock but don't populate season/tournament keys.
    let store: Record<string, string> = {};
    localStorageMock = {
      getItem: jest.fn(key => store[key] || null),
      setItem: jest.fn((key, value) => { store[key] = String(value); }),
      removeItem: jest.fn(key => { delete store[key]; }),
      clear: jest.fn(() => { store = {}; }),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    
    // Clear mocks
    (window.confirm as jest.Mock).mockClear();
    (fullBackupUtils.exportFullBackup as jest.Mock).mockClear();
    (fullBackupUtils.importFullBackup as jest.Mock).mockClear();
    (seasonsUtils.getSeasons as jest.Mock).mockClear().mockResolvedValue(sampleSeasons);
    (tournamentsUtils.getTournaments as jest.Mock).mockClear().mockResolvedValue(sampleTournaments);

    mockHandlers = {
      onClose: jest.fn(),
      onLoad: jest.fn(),
      onDelete: jest.fn(),
      onExportAllJson: jest.fn(),
      onExportAllExcel: jest.fn(),
      onExportOneJson: jest.fn(),
      onExportOneCsv: jest.fn(),
      onImportJson: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('renders modal title and basic game info when open', async () => {
    render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
    
    // Check for modal title
    expect(await screen.findByRole('heading', { name: /Load \/ Manage Games/i })).toBeInTheDocument();

    // Check for a specific game item
    const eaglesGameContainer = await screen.findByTestId('game-item-game_1659223456_def');
    expect(eaglesGameContainer).toBeInTheDocument();

    // Check for team names and score within the card
    expect(within(eaglesGameContainer).getByText('Hawks vs Eagles')).toBeInTheDocument();
    expect(within(eaglesGameContainer).getByText('3 - 3')).toBeInTheDocument();
    
    // Check for date
    expect(within(eaglesGameContainer).getByText(/22\.7\.2023/)).toBeInTheDocument();
  });

  describe('Rendering', () => {
    it('renders the component with saved games list', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      
      // Find container and assert H3 content
      const lionsContainer = await screen.findByTestId('game-item-game_1659123456_abc');
      const lionsHeading = await within(lionsContainer).findByRole('heading', { level: 3 });
      expect(lionsHeading).toHaveTextContent(/Lions vs Tigers/i); // Check text content of H3

      const eaglesContainer = await screen.findByTestId('game-item-game_1659223456_def');
      const eaglesHeading = await within(eaglesContainer).findByRole('heading', { level: 3 });
      // Remember this renders as Hawks vs Eagles due to homeOrAway: 'away'
      expect(eaglesHeading).toHaveTextContent(/Hawks vs Eagles/i); 

      // Wait for any pending state updates from the useEffect to complete
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });
    });

    it('indicates currently loaded game with a badge', async () => {
      render(
        <LoadGameModal
          isOpen={true}
          savedGames={createSampleGames()}
          currentGameId="game_1659123456_abc"
          {...mockHandlers}
        />
      );
      // Use data-testid selector and assert type
      const loadedGameContainer = await screen.findByText('Lions vs Tigers');
      const gameItemContainer = loadedGameContainer.closest('[data-testid^="game-item-"]') as HTMLElement;
      expect(gameItemContainer).toBeInTheDocument(); 
      // Use within with the asserted HTMLElement
      expect(within(gameItemContainer).getByText('Currently Loaded')).toBeInTheDocument(); 

      // Wait for async effects to settle
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });
    });

    it('displays a message when there are no saved games', async () => {
      render(
        <LoadGameModal
          isOpen={true}
          savedGames={{}} // Pass empty object
          {...mockHandlers}
        />
      );
      // Check for the specific "no saved games yet" message
      expect(await screen.findByText(/No games have been saved yet/i)).toBeInTheDocument();
      // Ensure no game items are rendered
      expect(screen.queryByTestId(/game-item-/)).not.toBeInTheDocument();

      // Wait for async effects to settle (e.g., season/tournament loading)
      // If sampleSeasons is not empty, this button should appear.
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });
    });

    it('displays a message when filters match no games', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      
      // Wait for initial async data (seasons/tournaments) to load as it affects filtering
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText('Filter games...'); // getBy is fine if it's there sync
      // await act is not strictly necessary for fireEvent if no immediate state update is awaited by it,
      // but good practice. If findByText below handles waiting, it might be okay.
      // For clarity and robustness, let's keep it or ensure the findByText is sufficient.
      fireEvent.change(searchInput, { target: { value: 'NonExistentGameName' } });
      
      expect(await screen.findByText(/No saved games match your filter/i)).toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('filters games based on search input', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />); 
      
      // Wait for initial async data (seasons/tournaments) to load as it affects filtering
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });

      const searchInput = screen.getByPlaceholderText(/Filter games/i);
      fireEvent.change(searchInput, { target: { value: 'Lions' } });
      // Wait for potential re-renders
      expect(await screen.findByText('Lions vs Tigers')).toBeInTheDocument();
      expect(screen.queryByText('Eagles vs Hawks')).not.toBeInTheDocument(); // This should be fine, queryBy doesn't wait
      // A slightly more robust check for absence if timing is an issue could be:
      // await waitFor(() => expect(screen.queryByText('Eagles vs Hawks')).not.toBeInTheDocument());
    });

    it('filters games by clicking season badge', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });

      const seasonBadge = await screen.findByText('Spring League');
      fireEvent.click(seasonBadge);
      expect(await screen.findByTestId('game-item-game_1659123456_abc')).toBeInTheDocument();
      expect(screen.queryByTestId('game-item-game_1659223456_def')).not.toBeInTheDocument();
    });

    it('filters games by clicking tournament badge', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });

      const tournamentBadge = await screen.findByText('Summer Cup');
      fireEvent.click(tournamentBadge);
      expect(await screen.findByTestId('game-item-game_1659223456_def')).toBeInTheDocument();
      expect(screen.queryByTestId('game-item-game_1659123456_abc')).not.toBeInTheDocument();
    });

    it('clears badge filter by clicking the active badge again', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });

      const seasonBadge = await screen.findByText('Spring League');
      fireEvent.click(seasonBadge); // Apply filter
      expect(screen.queryByTestId('game-item-game_1659223456_def')).not.toBeInTheDocument();
      fireEvent.click(seasonBadge); // Click again to clear
      expect(await screen.findByTestId('game-item-game_1659223456_def')).toBeInTheDocument(); // Other game should reappear
    });

    it('clears badge filter when search input is cleared', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });
      
      // Apply badge filter first
      const seasonBadge = await screen.findByText('Spring League');
      fireEvent.click(seasonBadge);
      expect(screen.getByText('Lions vs Tigers')).toBeInTheDocument();
      expect(screen.queryByText(/Hawks vs Eagles/)).not.toBeInTheDocument();

      // Add search text
      const searchInput = screen.getByPlaceholderText(/Filter games/i);
      fireEvent.change(searchInput, { target: { value: 'Lion' } });
      expect(screen.getByText('Lions vs Tigers')).toBeInTheDocument();

      // Clear search text
      fireEvent.change(searchInput, { target: { value: '' } });

      // Both games should be visible again, indicating filter is cleared
      expect(screen.getByText('Lions vs Tigers')).toBeInTheDocument();
      // Use findByText for the second game as it might re-render
      expect(await screen.findByText(/Hawks vs Eagles/)).toBeInTheDocument();
    });
  });

  describe('Game Actions (Load/Delete)', () => {
    it('loads a game when the Load button is clicked', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });
      const lionsGameContainer = await screen.findByTestId('game-item-game_1659123456_abc');
      const loadButton = within(lionsGameContainer).getByRole('button', { name: /Load/i });
      fireEvent.click(loadButton);
      expect(mockHandlers.onLoad).toHaveBeenCalledWith('game_1659123456_abc');
      expect(mockHandlers.onClose).toHaveBeenCalled(); // Also check if modal closes
    });

    it('deletes a game when delete is confirmed', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });
      const eaglesGameContainer = await screen.findByTestId('game-item-game_1659223456_def');
      (window.confirm as jest.Mock).mockReturnValueOnce(true);
      const optionsButton = within(eaglesGameContainer).getByTitle('Options');
      fireEvent.click(optionsButton);
      const deleteButton = await screen.findByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButton);
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Eagles vs Hawks')); // Corrected order
      expect(mockHandlers.onDelete).toHaveBeenCalledWith('game_1659223456_def');
    });

    it('does not delete a game when delete is cancelled', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });
      const eaglesGameContainer = await screen.findByTestId('game-item-game_1659223456_def');
      (window.confirm as jest.Mock).mockReturnValueOnce(false);
      const optionsButton = within(eaglesGameContainer).getByTitle('Options');
      fireEvent.click(optionsButton);
      const deleteButton = await screen.findByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButton);
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Eagles vs Hawks')); // Corrected order
      expect(mockHandlers.onDelete).not.toHaveBeenCalled();
    });
  });

  describe('Import/Export/Backup Actions', () => {
    // Individual game exports
    it('calls onExportOneJson when Export JSON is clicked', async () => {
       const gameIdToTest = 'game_1659123456_abc';
       render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
       await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });
       const gameContainer = await screen.findByTestId(`game-item-${gameIdToTest}`);
       const optionsButton = within(gameContainer).getByTitle('Options'); // getByTitle is likely fine after container is found
       
       fireEvent.click(optionsButton);
       
       // Wait for the menu container using the new data-testid
       const menuContainer = await screen.findByTestId(`game-item-menu-${gameIdToTest}`);
       
       // Find the button WITHIN the menu container
       const exportJsonButton = within(menuContainer).getByRole('button', { name: /^Export JSON$/i }); 
       fireEvent.click(exportJsonButton);
       
       expect(mockHandlers.onExportOneJson).toHaveBeenCalledWith(gameIdToTest);
    });

    it('calls onExportOneCsv when Export CSV is clicked', async () => {
       const gameIdToTest = 'game_1659123456_abc';
       render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
       await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });
       const gameContainer = await screen.findByTestId(`game-item-${gameIdToTest}`);
       const optionsButton = within(gameContainer).getByTitle('Options'); // getByTitle is likely fine
       
       fireEvent.click(optionsButton);

       // Wait for the menu container
       const menuContainer = await screen.findByTestId(`game-item-menu-${gameIdToTest}`);
       
       // Find the button WITHIN the menu container
       const exportCsvButton = within(menuContainer).getByRole('button', { name: /^Export CSV$/i });
       fireEvent.click(exportCsvButton);
       
       expect(mockHandlers.onExportOneCsv).toHaveBeenCalledWith(gameIdToTest);
    });

    // Global actions
    it('calls onExportAllJson when global Export JSON is clicked', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });
      const exportAllJsonButton = await screen.findByRole('button', { name: /Export All/i });
      fireEvent.click(exportAllJsonButton);
      expect(mockHandlers.onExportAllJson).toHaveBeenCalled();
    });

    it('calls onExportAllExcel when global Export CSV is clicked', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });
      const exportAllExcelButton = await screen.findByRole('button', { name: /Export All/i });
      fireEvent.click(exportAllExcelButton);
      expect(mockHandlers.onExportAllExcel).toHaveBeenCalled();
    });

    it('calls exportFullBackup when Backup All Data is clicked', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });
      const backupButton = await screen.findByRole('button', { name: /Backup All Data/i });
      fireEvent.click(backupButton);
      // Use jest.requireMock to get the mocked function
      const { exportFullBackup: exportMock } = jest.requireMock('@/utils/fullBackup');
      expect(exportMock).toHaveBeenCalled();
    });

    it('triggers file input click when Import button is clicked', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });
       const fileInput = await screen.findByTestId('import-json-input') as HTMLInputElement;

       const clickSpy = jest.spyOn(fileInput, 'click').mockImplementation(() => {});
       const importButton = await screen.findByRole('button', { name: /Import/i });
       fireEvent.click(importButton);

       expect(clickSpy).toHaveBeenCalled();
       
       clickSpy.mockRestore();
    });

    it('triggers file input click when Restore button is clicked', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      await waitFor(() => {
        expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
        expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
      });
      const restoreFileInput = screen.getByTestId('restore-backup-input') as HTMLInputElement;
      const clickSpy = jest.spyOn(restoreFileInput, 'click').mockImplementation(() => {});
      const restoreButton = screen.getByRole('button', { name: /Restore/i });
      fireEvent.click(restoreButton);
      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    describe('File Handling (Import/Restore)', () => {
      let alertSpy: jest.SpyInstance;

      beforeEach(() => {
        alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      });

      afterEach(() => {
        alertSpy.mockRestore();
      });

      it('calls onImportJson with file content on successful import file selection', async () => {
        render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
        await waitFor(() => {
          expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
          expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
        });
        const fileInput = await screen.findByTestId('import-json-input') as HTMLInputElement;

        const fileContent = JSON.stringify({ gameData: 'test' });
        const file = new File([fileContent], 'import.json', { type: 'application/json' });
        const mockReadAsText = jest.fn();
        let capturedOnload: ((event: ProgressEvent<FileReader>) => void) | null = null;
        const mockReader = {
          set onload(handler: ((event: ProgressEvent<FileReader>) => void) | null) { capturedOnload = handler; },
          readAsText: mockReadAsText,
          result: fileContent
        };
        const fileReaderSpy = jest.spyOn(window, 'FileReader').mockImplementation(() => mockReader as unknown as FileReader);

        await act(async () => {
          fireEvent.change(fileInput, { target: { files: [file] } });
          if (capturedOnload) {
            capturedOnload({ target: mockReader } as unknown as ProgressEvent<FileReader>);
          }
        });

        expect(mockReadAsText).toHaveBeenCalledWith(file);
        expect(mockHandlers.onImportJson).toHaveBeenCalledWith(fileContent);
        expect(alertSpy).not.toHaveBeenCalled();
        fileReaderSpy.mockRestore();
      });

      it('shows alert on FileReader error during import', async () => {
        render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
        await waitFor(() => {
          expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
          expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
        });
        const fileInput = await screen.findByTestId('import-json-input') as HTMLInputElement;

        const file = new File(['{}'], 'error.json', { type: 'application/json' });
        const mockReadAsText = jest.fn();
        let capturedOnerror: (() => void) | null = null;
        const mockReader = {
          onload: null,
          set onerror(handler: (() => void) | null) { capturedOnerror = handler; },
          readAsText: mockReadAsText,
          error: new Error('Mock read error')
        };
        const fileReaderSpy = jest.spyOn(window, 'FileReader').mockImplementation(() => mockReader as unknown as FileReader);

        await act(async () => {
          fireEvent.change(fileInput, { target: { files: [file] } });
          if (capturedOnerror) {
            capturedOnerror();
          }
        });

        expect(mockReadAsText).toHaveBeenCalledWith(file);
        expect(mockHandlers.onImportJson).not.toHaveBeenCalled();
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Error reading file content'));
        fileReaderSpy.mockRestore();
      });

      it('shows alert on JSON processing error during import', async () => {
        render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
        await waitFor(() => {
          expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
          expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
        });
         const fileInput = await screen.findByTestId('import-json-input') as HTMLInputElement;
         
         const invalidJsonContent = 'invalid json';
         const file = new File([invalidJsonContent], 'invalid.json', { type: 'application/json' });
         mockHandlers.onImportJson.mockImplementationOnce(() => { throw new Error("Simulated processing error"); });
         const mockReadAsText = jest.fn();
         let capturedOnload: ((event: ProgressEvent<FileReader>) => void) | null = null;
         const mockReader = { 
           set onload(handler: ((event: ProgressEvent<FileReader>) => void) | null) { capturedOnload = handler; },
           readAsText: mockReadAsText, 
           result: invalidJsonContent 
         };
         const fileReaderSpy = jest.spyOn(window, 'FileReader').mockImplementation(() => mockReader as unknown as FileReader);

         await act(async () => {
            fireEvent.change(fileInput, { target: { files: [file] } });
            if (capturedOnload) {
               capturedOnload({ target: mockReader } as unknown as ProgressEvent<FileReader>);
            }
         });
         
         expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Error processing file content')); 
         fileReaderSpy.mockRestore();
      });

      it('calls importFullBackup with file content on successful restore file selection', async () => {
         render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
         await waitFor(() => {
          expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
          expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
        });
         const restoreInput = await screen.findByTestId('restore-backup-input') as HTMLInputElement;
         
         const fileContent = JSON.stringify({ meta: { schema: 1 }, localStorage: {} });
         const file = new File([fileContent], 'backup.json', { type: 'application/json' });
         const { importFullBackup: importFullBackupMock } = jest.requireMock('@/utils/fullBackup');
         const mockReadAsText = jest.fn();
         let capturedOnload: ((event: ProgressEvent<FileReader>) => void) | null = null;
         const mockReader = { 
           set onload(handler: ((event: ProgressEvent<FileReader>) => void) | null) { capturedOnload = handler; },
           readAsText: mockReadAsText, 
           result: fileContent 
         };
         const fileReaderSpy = jest.spyOn(window, 'FileReader').mockImplementation(() => mockReader as unknown as FileReader);
         
         await act(async () => {
           fireEvent.change(restoreInput, { target: { files: [file] } });
           if (capturedOnload) {
             capturedOnload({ target: mockReader } as unknown as ProgressEvent<FileReader>);
           }
         });

         expect(mockReadAsText).toHaveBeenCalledWith(file);
         expect(importFullBackupMock).toHaveBeenCalledWith(fileContent);
         expect(alertSpy).not.toHaveBeenCalled();
         fileReaderSpy.mockRestore();
      });

      test('shows alert on FileReader error during restore', async () => {
        const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
        
        render(<LoadGameModal isOpen={true} savedGames={{}} {...mockHandlers} />);
        await waitFor(() => {
          expect(seasonsUtils.getSeasons).toHaveBeenCalledTimes(1);
          expect(tournamentsUtils.getTournaments).toHaveBeenCalledTimes(1);
        });

        let capturedOnerror: (() => void) | null = null;

        const mockFileReaderInstance = {
          readAsText: jest.fn(),
          result: null,
          error: new DOMException("Mock read error", "NotReadableError"),
          set onerror(handler: (() => void) | null) { capturedOnerror = handler; },
          get onload() { return null; }, 
          set onload(_handler: null) { /* No-op for error test */ },
          get readyState() { return 2; },
        };
        const fileReaderSpy = jest.spyOn(window, 'FileReader').mockImplementation(() => mockFileReaderInstance as unknown as FileReader);

        // Find the actual file input for restore
        const restoreFileInput = await screen.findByTestId('restore-backup-input');
        const testFile = new File(['some backup content'], 'backup.json', { type: 'application/json' });

        // Simulate the file input change event
        await act(async () => {
          fireEvent.change(restoreFileInput, { target: { files: [testFile] } });
        });

        // Now, manually trigger the captured onerror handler
        if (capturedOnerror) {
          await act(async () => {
            capturedOnerror!(); 
          });
        } else {
          throw new Error("FileReader's onerror handler was not captured by the mock for restore.");
        }
        
        expect(alertMock).toHaveBeenCalledTimes(1);
        expect(alertMock).toHaveBeenCalledWith(expect.stringContaining('Error reading file content'));
        
        alertMock.mockRestore();
        fileReaderSpy.mockRestore(); 
      });
    });
  });
});