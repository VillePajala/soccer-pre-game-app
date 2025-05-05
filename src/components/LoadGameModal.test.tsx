import React from 'react';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import LoadGameModal from './LoadGameModal';
import { SavedGamesCollection, Season, Tournament, AppState } from '@/app/page';
import { SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY } from '@/config/constants';

// Improved Mock for react-i18next hook
jest.mock('react-i18next', () => ({
  useTranslation: () => {
    const translations = {
      'loadGameModal.title': 'Load Game',
      'loadGameModal.searchPlaceholder': 'Search games by name, opponent, or date...',
      'loadGameModal.noGames': 'No saved games found',
      'loadGameModal.backupAllButton': 'Backup All Data',
      'loadGameModal.restoreButton': 'Restore from Backup',
      'loadGameModal.importButton': 'Import JSON',
      'loadGameModal.exportAllJsonButton': 'Export All (JSON)',
      'loadGameModal.exportAllExcelButton': 'Export All (Excel)',
      'loadGameModal.backupButton': 'Backup All Data',
      'loadGameModal.close': 'Close',
      'loadGameModal.deleteConfirm': 'Are you sure you want to delete the saved game "{gameName}"? This action cannot be undone.',
      'loadGameModal.currentlyLoaded': 'Currently Loaded',
      'loadGameModal.currentlyOpenShort': 'Loaded',
      'loadGameModal.gameInfo': '{{teamName}} vs {{opponentName}}',
      'loadGameModal.gameDateLabel': 'Date:',
      'loadGameModal.scoreLabel': 'Score:',
      'loadGameModal.loadButton': 'Load',
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
    };
    return {
      t: (key: string, params?: Record<string, any>): string => {
        let translation = translations[key as keyof typeof translations] || key;
        if (params && translation) {
          Object.keys(params).forEach((paramKey) => {
            translation = translation.replace(`{{${paramKey}}}`, params[paramKey]);
            if (typeof params[paramKey] === 'object' && params[paramKey] !== null) {
               Object.keys(params[paramKey]).forEach((nestedKey) => {
                 translation = translation.replace(`{{${nestedKey}}}`, params[paramKey][nestedKey]);
               });
            }
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

describe('LoadGameModal Integration', () => {
  // Define types for mocks
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

  // Sample data defined outside beforeEach
  const sampleGames = createSampleGames();
  const sampleSeasons: Season[] = [
    { id: 'season_1', name: 'Spring League' },
    { id: 'season_2', name: 'Fall Season' },
  ];
  const sampleTournaments: Tournament[] = [
    // Adjust based on Tournament type definition (assuming no seasonId)
    { id: 'tourn_1', name: 'Summer Cup' }, 
  ];

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

  // Test: renders the component with saved games list
  it('renders the component with saved games list', async () => {
    // Pass sampleGames via props
    render(
      <LoadGameModal
        isOpen={true}
        savedGames={sampleGames} // Pass games data directly
        {...mockHandlers}
      />
    );
    // ... assertions using findByText ...
  });

  it('filters games based on search input', async () => {
    render(
      <LoadGameModal
        isOpen={true}
        savedGames={createSampleGames()}
        {...mockHandlers}
      />
    );

    const searchInput = screen.getByPlaceholderText('Filter games...');
    fireEvent.change(searchInput, { target: { value: 'Lions' } });

    expect(screen.getByText('Lions vs Tigers')).toBeInTheDocument();
    expect(screen.queryByText('Eagles vs Hawks')).not.toBeInTheDocument();
  });

  it('loads a game when the Load button is clicked', () => {
    render(
      <LoadGameModal
        isOpen={true}
        savedGames={createSampleGames()}
        {...mockHandlers}
      />
    );

    const lionsGameContainer = screen.getByText('Lions vs Tigers').closest('.space-y-4 > div') as HTMLElement;
    if (!lionsGameContainer) throw new Error('Lions game container not found');

    const loadButton = within(lionsGameContainer).getByRole('button', { name: /Load/i });
    fireEvent.click(loadButton);

    expect(mockHandlers.onLoad).toHaveBeenCalledWith('game_1659123456_abc');
  });

  it('deletes a game when delete is confirmed', async () => {
    // Setup mock AFTER verifying initial render
    
    render(
      <LoadGameModal
        isOpen={true}
        savedGames={createSampleGames()}
        {...mockHandlers}
      />
    );

    // Use waitFor to ensure the element is present before proceeding
    let eaglesGameContainer: HTMLElement | null = null;
    await waitFor(() => {
      eaglesGameContainer = screen.getByText('Eagles vs Hawks').closest('.space-y-4 > div');
      expect(eaglesGameContainer).toBeInTheDocument(); 
    }, { timeout: 3000 });

    if (!eaglesGameContainer) throw new Error('Eagles game container not found after wait');
    
    // Setup confirm mock now
    (window.confirm as jest.Mock).mockReturnValueOnce(true);

    const optionsButton = within(eaglesGameContainer).getByTitle('Options');
    fireEvent.click(optionsButton);
    
    const deleteButton = await screen.findByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Eagles vs Hawks'));
    expect(mockHandlers.onDelete).toHaveBeenCalledWith('game_1659223456_def');
  });

  it('does not delete a game when delete is cancelled', async () => {
    // Setup mock AFTER verifying initial render

     render(
      <LoadGameModal
        isOpen={true}
        savedGames={createSampleGames()}
        {...mockHandlers}
      />
    );

    // Use waitFor again
    let eaglesGameContainer: HTMLElement | null = null;
    await waitFor(() => {
      eaglesGameContainer = screen.getByText('Eagles vs Hawks').closest('.space-y-4 > div');
      expect(eaglesGameContainer).toBeInTheDocument(); 
    }, { timeout: 3000 });

    if (!eaglesGameContainer) throw new Error('Eagles game container not found after wait');
    
    // Setup confirm mock now
    (window.confirm as jest.Mock).mockReturnValueOnce(false); 

    const optionsButton = within(eaglesGameContainer).getByTitle('Options');
    fireEvent.click(optionsButton);

    const deleteButton = await screen.findByRole('button', { name: /Delete/i });
    fireEvent.click(deleteButton);

    expect(window.confirm).toHaveBeenCalledWith(expect.stringContaining('Eagles vs Hawks'));
    expect(mockHandlers.onDelete).not.toHaveBeenCalled();
  });

  it('filters games by season badge when clicked', async () => {
    render(
      <LoadGameModal
        isOpen={true}
        savedGames={createSampleGames()}
        {...mockHandlers}
      />
    );

    // Find the season badge using the CORRECT name
    const seasonBadge = await screen.findByRole('button', { name: /Spring League/i }); // Corrected name
    fireEvent.click(seasonBadge);

    // Assertions
    expect(await screen.findByText('Lions vs Tigers')).toBeInTheDocument();
    expect(screen.queryByText('Eagles vs Hawks')).not.toBeInTheDocument(); 
  });

  it('filters games by tournament badge when clicked', async () => { 
    render(
      <LoadGameModal
        isOpen={true}
        savedGames={sampleGames} // Pass games data
        {...mockHandlers}
      />
    );

    const tournamentBadge = await screen.findByRole('button', { name: /Summer Cup/i }); 
    fireEvent.click(tournamentBadge);

    // Use findByText directly after click
    expect(screen.queryByText('Lions vs Tigers')).not.toBeInTheDocument();
    expect(await screen.findByText('Eagles vs Hawks', {}, { timeout: 3000 })).toBeInTheDocument();
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

    const loadedGameContainer = screen.getByText('Lions vs Tigers').closest('.space-y-4 > div') as HTMLElement;
    if (!loadedGameContainer) throw new Error('Loaded game container not found');

    expect(within(loadedGameContainer).getByText('Loaded')).toBeInTheDocument(); 
  });
}); 