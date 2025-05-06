import React from 'react';
import { render, screen, fireEvent, within, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadGameModal from './LoadGameModal';
import { SavedGamesCollection, Season, Tournament, AppState } from '@/app/page';
import { SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY } from '@/config/constants';

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

// Mock fullBackup functions
jest.mock('@/utils/fullBackup', () => ({
  exportFullBackup: jest.fn(),
  importFullBackup: jest.fn().mockReturnValue(true),
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
    getAll: () => Record<string, string>;
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
    // Setup localStorage mock inline
    let store: Record<string, string> = {};
    localStorageMock = {
      getItem: jest.fn(key => store[key] || null),
      setItem: jest.fn((key, value) => { store[key] = String(value); }),
      removeItem: jest.fn(key => { delete store[key]; }),
      clear: jest.fn(() => { store = {}; }),
      getAll: () => store,
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    
    (window.confirm as jest.Mock).mockClear();

    // Pre-populate localStorage 
    localStorageMock.setItem(SEASONS_LIST_KEY, JSON.stringify(sampleSeasons));
    localStorageMock.setItem(TOURNAMENTS_LIST_KEY, JSON.stringify(sampleTournaments));
    // Note: SAVED_GAMES_KEY is NOT pre-populated here, assuming it's passed via props

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
    });

    it('indicates currently loaded game with a badge', () => {
      render(
        <LoadGameModal
          isOpen={true}
          savedGames={createSampleGames()}
          currentGameId="game_1659123456_abc"
          {...mockHandlers}
        />
      );
      // Use data-testid selector and assert type
      const loadedGameContainer = screen.getByText('Lions vs Tigers').closest('[data-testid^="game-item-"]') as HTMLElement;
      expect(loadedGameContainer).toBeInTheDocument(); 
      // Use within with the asserted HTMLElement
      expect(within(loadedGameContainer).getByText('Loaded')).toBeInTheDocument(); 
    });

    it('displays a message when there are no saved games', () => {
      render(
        <LoadGameModal
          isOpen={true}
          savedGames={{}} // Pass empty object
          {...mockHandlers}
        />
      );
      // Check for the specific "no saved games yet" message
      expect(screen.getByText(/No games have been saved yet/i)).toBeInTheDocument();
      // Ensure no game items are rendered
      expect(screen.queryByTestId(/game-item-/)).not.toBeInTheDocument();
    });

    it('displays a message when filters match no games', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      const searchInput = screen.getByPlaceholderText(/Filter games/i);
      fireEvent.change(searchInput, { target: { value: 'NonExistentTeam' } });
      // Check for the specific "no games match filter" message
      expect(await screen.findByText(/No saved games match your filter/i)).toBeInTheDocument();
      expect(screen.queryByTestId(/game-item-/)).not.toBeInTheDocument();
    });
  });

  describe('Filtering', () => {
    it('filters games based on search input', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />); 
      const searchInput = screen.getByPlaceholderText(/Filter games/i);
      fireEvent.change(searchInput, { target: { value: 'Lions' } });
      // Wait for potential re-renders
      expect(await screen.findByText('Lions vs Tigers')).toBeInTheDocument();
      expect(screen.queryByText('Eagles vs Hawks')).not.toBeInTheDocument();
    });

    it('filters games by season badge when clicked', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      const seasonBadge = await screen.findByRole('button', { name: /Spring League/i });
      fireEvent.click(seasonBadge);
      expect(await screen.findByTestId('game-item-game_1659123456_abc')).toBeInTheDocument();
      expect(screen.queryByTestId('game-item-game_1659223456_def')).not.toBeInTheDocument();
    });

    it('filters games by tournament badge when clicked', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      const tournamentBadge = await screen.findByRole('button', { name: /Summer Cup/i });
      fireEvent.click(tournamentBadge);
      expect(await screen.findByTestId('game-item-game_1659223456_def')).toBeInTheDocument();
      expect(screen.queryByTestId('game-item-game_1659123456_abc')).not.toBeInTheDocument();
    });

    it('clears badge filter when badge is clicked again', async () => {
       render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
       const seasonBadge = await screen.findByRole('button', { name: /Spring League/i });
       fireEvent.click(seasonBadge); // Apply filter
       expect(screen.queryByTestId('game-item-game_1659223456_def')).not.toBeInTheDocument();
       fireEvent.click(seasonBadge); // Click again to clear
       expect(await screen.findByTestId('game-item-game_1659223456_def')).toBeInTheDocument(); // Other game should reappear
    });

    it('clears badge filter when search text is cleared', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      const seasonBadge = await screen.findByRole('button', { name: /Spring League/i });
      fireEvent.click(seasonBadge); // Apply badge filter
      expect(screen.queryByTestId('game-item-game_1659223456_def')).not.toBeInTheDocument();
      
      const searchInput = screen.getByPlaceholderText(/Filter games/i);
      fireEvent.change(searchInput, { target: { value: 'test' } }); // Enter search text
      fireEvent.change(searchInput, { target: { value: '' } }); // Clear search text

      // Both items should be visible again as filters are cleared
      expect(await screen.findByTestId('game-item-game_1659123456_abc')).toBeInTheDocument();
      expect(await screen.findByTestId('game-item-game_1659223456_def')).toBeInTheDocument();
    });
  });

  describe('Game Actions (Load/Delete)', () => {
    it('loads a game when the Load button is clicked', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      const lionsGameContainer = await screen.findByTestId('game-item-game_1659123456_abc');
      const loadButton = within(lionsGameContainer).getByRole('button', { name: /Load/i });
      fireEvent.click(loadButton);
      expect(mockHandlers.onLoad).toHaveBeenCalledWith('game_1659123456_abc');
      expect(mockHandlers.onClose).toHaveBeenCalled(); // Also check if modal closes
    });

    it('deletes a game when delete is confirmed', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      const eaglesGameContainer = await screen.findByTestId('game-item-game_1659223456_def');
      (window.confirm as jest.Mock).mockReturnValueOnce(true);
      const optionsButton = within(eaglesGameContainer).getByTitle('Options');
      fireEvent.click(optionsButton);
      const deleteButton = await screen.findByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButton);
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Eagles vs Hawks'));
      expect(mockHandlers.onDelete).toHaveBeenCalledWith('game_1659223456_def');
    });

    it('does not delete a game when delete is cancelled', async () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      const eaglesGameContainer = await screen.findByTestId('game-item-game_1659223456_def');
      (window.confirm as jest.Mock).mockReturnValueOnce(false);
      const optionsButton = within(eaglesGameContainer).getByTitle('Options');
      fireEvent.click(optionsButton);
      const deleteButton = await screen.findByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButton);
      expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Eagles vs Hawks'));
      expect(mockHandlers.onDelete).not.toHaveBeenCalled();
    });
  });

  describe('Import/Export/Backup Actions', () => {
    // Individual game exports
    it('calls onExportOneJson when Export JSON is clicked', async () => {
       const gameIdToTest = 'game_1659123456_abc';
       render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
       const gameContainer = await screen.findByTestId(`game-item-${gameIdToTest}`);
       const optionsButton = within(gameContainer).getByTitle('Options');
       
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
       const gameContainer = await screen.findByTestId(`game-item-${gameIdToTest}`);
       const optionsButton = within(gameContainer).getByTitle('Options');
       
       fireEvent.click(optionsButton);

       // Wait for the menu container
       const menuContainer = await screen.findByTestId(`game-item-menu-${gameIdToTest}`);
       
       // Find the button WITHIN the menu container
       const exportCsvButton = within(menuContainer).getByRole('button', { name: /^Export CSV$/i });
       fireEvent.click(exportCsvButton);
       
       expect(mockHandlers.onExportOneCsv).toHaveBeenCalledWith(gameIdToTest);
    });

    // Global actions
    it('calls onExportAllJson when global Export JSON is clicked', () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      const exportAllJsonButton = screen.getByRole('button', { name: /Export JSON$/i }); 
      fireEvent.click(exportAllJsonButton);
      expect(mockHandlers.onExportAllJson).toHaveBeenCalled();
    });

    it('calls onExportAllExcel when global Export CSV is clicked', () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      const exportAllExcelButton = screen.getByRole('button', { name: /Export CSV$/i }); 
      fireEvent.click(exportAllExcelButton);
      expect(mockHandlers.onExportAllExcel).toHaveBeenCalled();
    });

    it('calls exportFullBackup when Backup All Data is clicked', () => {
      render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
      const backupButton = screen.getByRole('button', { name: /Backup All Data/i });
      fireEvent.click(backupButton);
      // Use jest.requireMock to get the mocked function
      const { exportFullBackup: exportMock } = jest.requireMock('@/utils/fullBackup');
      expect(exportMock).toHaveBeenCalled();
    });

    it('triggers file input click when Import button is clicked', () => {
       render(<LoadGameModal isOpen={true} savedGames={{}} {...mockHandlers} />);
       const fileInput = screen.getByTestId('import-json-input') as HTMLInputElement;
       const clickSpy = jest.spyOn(fileInput, 'click').mockImplementation(() => {});
       const importButton = screen.getByRole('button', { name: /^Import$/i });
       fireEvent.click(importButton);
       expect(clickSpy).toHaveBeenCalledTimes(1);
       clickSpy.mockRestore();
    });

    it('triggers file input click when Restore button is clicked', () => {
       render(<LoadGameModal isOpen={true} savedGames={{}} {...mockHandlers} />);
       const restoreInput = screen.getByTestId('restore-backup-input') as HTMLInputElement;
       const clickSpy = jest.spyOn(restoreInput, 'click').mockImplementation(() => {});
       const restoreButton = screen.getByRole('button', { name: /Restore from Backup/i });
       fireEvent.click(restoreButton);
       expect(clickSpy).toHaveBeenCalledTimes(1);
       clickSpy.mockRestore();
    });

    describe('File Handling (Import/Restore)', () => {
      let alertSpy: jest.SpyInstance;

      beforeEach(() => {
        // REMOVED render call from here for this specific describe block
        // Find inputs within each test after rendering
        alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      });

      afterEach(() => {
        alertSpy.mockRestore();
      });

      it('calls onImportJson with file content on successful import file selection', async () => {
        // Render and find inputs for this test
        render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
        const fileInput = screen.getByTestId('import-json-input') as HTMLInputElement;
        
        const fileContent = JSON.stringify({ gameData: 'test' });
        const file = new File([fileContent], 'import.json', { type: 'application/json' });
        const mockReadAsText = jest.fn();
        let capturedOnload: ((event: ProgressEvent<FileReader>) => void) | null = null;
        const mockReader = {
          set onload(handler: ((event: ProgressEvent<FileReader>) => void) | null) { capturedOnload = handler; },
          onerror: null,
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
        // Render and find inputs for this test
        render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
        const fileInput = screen.getByTestId('import-json-input') as HTMLInputElement;

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
         // Render and find inputs for this test
         render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
         const fileInput = screen.getByTestId('import-json-input') as HTMLInputElement;
         
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
         // Render and find inputs for this test
         render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
         const restoreInput = screen.getByTestId('restore-backup-input') as HTMLInputElement;
         
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

      // Test FileReader.onerror during restore
      test('shows alert on FileReader error during restore', async () => {
        const mockError = new Error('Mock restore read error');
        const mockAlert = jest.spyOn(window, 'alert').mockImplementation(() => {}); // Re-declare alertSpy locally or ensure it's available
        let capturedOnerror: (() => void) | null = null;

        jest.spyOn(window, 'FileReader').mockImplementation(() => ({
          readAsText: jest.fn(() => {
            // Simulate the error callback being invoked by the browser
            if (capturedOnerror) {
              act(() => {
                 capturedOnerror!(); // Invoke the captured handler
              });
            }
          }),
          result: null,
          error: mockError, // Set the error property
          // Capture the onerror handler when the component assigns it
          set onerror(handler: (() => void) | null) { capturedOnerror = handler; },
          // Provide getters to satisfy TS/React's expectations
          get onload() { return null; }, 
          set onload(handler: null) { /* No-op for error test */ },
          get readyState() { return 2; }, // Indicate loading or done for safety
          abort: jest.fn(),
          addEventListener: jest.fn(),
        } as unknown as FileReader));

        // Render the component specifically for this test
        render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);

        // Find the hidden input directly by its test ID
        const restoreInput = screen.getByTestId('restore-backup-input') as HTMLInputElement;
        expect(restoreInput).toHaveAttribute('type', 'file'); // Verify we got the input
        
        const dummyFile = new File(['dummy content'], 'backup.json', { type: 'application/json' });
        
        // Simulate file selection on the RESTORE input
        await act(async () => {
            fireEvent.change(restoreInput, { target: { files: [dummyFile] } });
        });

        expect(mockAlert).toHaveBeenCalledTimes(1);
        // Assuming the same error message key is used
        expect(mockAlert).toHaveBeenCalledWith('Error reading file content.'); 
        
        mockAlert.mockRestore(); // Restore the local spy
      });

      it('shows alert from importFullBackup on processing error during restore', async () => {
         // Render and find inputs for this test
         render(<LoadGameModal isOpen={true} savedGames={createSampleGames()} {...mockHandlers} />);
         const restoreInput = screen.getByTestId('restore-backup-input') as HTMLInputElement;

         const fileContent = 'invalid json';
         const file = new File([fileContent], 'restore_invalid.json', { type: 'application/json' });
         const { importFullBackup: importFullBackupMock } = jest.requireMock('@/utils/fullBackup');
         importFullBackupMock.mockImplementationOnce(() => { 
           window.alert('Error importing full backup: Invalid format...'); 
           return false; 
         });
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

         expect(importFullBackupMock).toHaveBeenCalledWith(fileContent);
         expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Error importing full backup: Invalid format...')); 
         fileReaderSpy.mockRestore();
      });
    });
  });
}); 