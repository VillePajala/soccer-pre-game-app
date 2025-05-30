'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SavedGamesCollection } from '@/app/page'; // Keep this if SavedGamesCollection is from here
import { Season, Tournament } from '@/types'; // Corrected import path
import { 
  HiOutlineDocumentArrowDown, 
  HiOutlineEllipsisVertical,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineTableCells,
  HiOutlineXCircle,
  HiOutlineDocumentArrowUp,
  HiOutlineClock,
  HiOutlineMapPin
} from 'react-icons/hi2';
// REMOVE unused Fa icons and useGameState hook
// import { FaTimes, FaUpload, FaDownload, FaTrash, FaExclamationTriangle, FaSearch } from 'react-icons/fa';
// import { useGameState } from '@/hooks/useGameState';
import { exportFullBackup, importFullBackup } from '@/utils/fullBackup';
// Import new utility functions
import { getSeasons as utilGetSeasons } from '@/utils/seasons';
import { getTournaments as utilGetTournaments } from '@/utils/tournaments';

export interface LoadGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedGames: SavedGamesCollection;
  onLoad: (gameId: string) => void;
  onDelete: (gameId: string) => void;
  onExportAllJson: () => void;
  onExportAllExcel: () => void; // For CSV export
  onExportOneJson: (gameId: string) => void;
  onExportOneCsv: (gameId: string) => void; // For individual CSV
  onImportJson: (jsonContent: string) => void;
  currentGameId?: string; // Optional: to highlight current game

  // NEW Loading and Error State Props
  isLoadingGamesList?: boolean;
  loadGamesListError?: string | null;
  isGameLoading?: boolean;
  gameLoadError?: string | null;
  isGameDeleting?: boolean;
  gameDeleteError?: string | null;
  isGamesImporting?: boolean;
  gamesImportError?: string | null;
  processingGameId?: string | null; // ID of the game item being actively processed (loaded/deleted)
}

// Define the default game ID constant if not imported (consider sharing from page.tsx)
const DEFAULT_GAME_ID = '__default_unsaved__'; 

const LoadGameModal: React.FC<LoadGameModalProps> = ({
  isOpen,
  onClose,
  savedGames,
  onLoad,
  onDelete,
  onExportAllJson,
  onExportAllExcel,
  onExportOneJson,
  onExportOneCsv,
  onImportJson,
  currentGameId,
  // Destructure new props with defaults
  isLoadingGamesList = false,
  loadGamesListError = null,
  isGameLoading = false,
  gameLoadError = null,
  isGameDeleting = false,
  gameDeleteError = null,
  isGamesImporting = false,
  gamesImportError = null,
  processingGameId = null,
}) => {
  const { t } = useTranslation();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>('');
  const [filterType, setFilterType] = useState<'season' | 'tournament' | null>(null);
  const [filterId, setFilterId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const restoreFileInputRef = useRef<HTMLInputElement>(null);

  // State for seasons and tournaments
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  // Load seasons and tournaments on mount or when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchModalData = async () => {
      try {
          const loadedSeasonsData = await utilGetSeasons();
          setSeasons(Array.isArray(loadedSeasonsData) ? loadedSeasonsData : []);
        } catch (error) {
        console.error("Error loading seasons via utility:", error);
        setSeasons([]); 
      }
      try {
          const loadedTournamentsData = await utilGetTournaments();
          setTournaments(Array.isArray(loadedTournamentsData) ? loadedTournamentsData : []);
        } catch (error) {
        console.error("Error loading tournaments via utility:", error);
        setTournaments([]);
      }
      };
      fetchModalData();
    }
  }, [isOpen]);

  // Filter logic updated to only use searchText
  const filteredGameIds = useMemo(() => {
    const initialIds = Object.keys(savedGames).filter(id => id !== DEFAULT_GAME_ID);
    
    const filteredBySearch = initialIds.filter(id => { 
      const gameData = savedGames[id];
      if (!gameData) return false;
      if (!searchText) return true;
      const lowerSearchText = searchText.toLowerCase();
      const teamName = (gameData.teamName || '').toLowerCase();
      const opponentName = (gameData.opponentName || '').toLowerCase();
      const gameDate = (gameData.gameDate || '').toLowerCase();
      const seasonName = seasons.find(s => s.id === gameData.seasonId)?.name.toLowerCase() || '';
      const tournamentName = tournaments.find(tourn => tourn.id === gameData.tournamentId)?.name.toLowerCase() || '';
      return (
        teamName.includes(lowerSearchText) ||
        opponentName.includes(lowerSearchText) ||
        gameDate.includes(lowerSearchText) ||
        seasonName.includes(lowerSearchText) ||
        tournamentName.includes(lowerSearchText)
      );
    });

    const filteredByBadge = filteredBySearch.filter(id => { 
      if (!filterType || !filterId) return true;
      const gameData = savedGames[id];
      if (!gameData) return false;

      let match = false;
      if (filterType === 'season') {
        match = gameData.seasonId === filterId;
      }
      if (filterType === 'tournament') {
        match = gameData.tournamentId === filterId;
      }

      return match;
    });

    const sortedIds = filteredByBadge.sort((a, b) => {
      const gameA = savedGames[a];
      const gameB = savedGames[b];
      
      // Primary sort: by date in descending order (newest first)
      const dateA = gameA.gameDate ? new Date(gameA.gameDate).getTime() : 0;
      const dateB = gameB.gameDate ? new Date(gameB.gameDate).getTime() : 0;

      if (dateB !== dateA) {
        // Handle cases where one date is missing (put games without date last)
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB - dateA;
      }

      // Secondary sort: by timestamp in game ID (descending, newest first)
      // Extract timestamp assuming format "game_TIMESTAMP_RANDOM"
      try {
        const timestampA = parseInt(a.split('_')[1], 10);
        const timestampB = parseInt(b.split('_')[1], 10);
        
        if (!isNaN(timestampA) && !isNaN(timestampB)) {
          return timestampB - timestampA;
        }
      } catch (error) {
        console.warn("Could not parse timestamps from game IDs for secondary sort:", a, b, error);
      }
      
      // Fallback if dates are equal and timestamps can't be parsed
      return 0; 
    });
    return sortedIds;
  }, [savedGames, searchText, seasons, tournaments, filterType, filterId]);

  const handleDeleteClick = (gameId: string, gameName: string) => {
    // Use a confirmation dialog
    if (window.confirm(t('loadGameModal.deleteConfirm', `Are you sure you want to delete the saved game "{gameName}"? This action cannot be undone.`)?.replace('{gameName}', gameName))) {
      onDelete(gameId);
      setOpenMenuId(null); // Close menu after delete
    }
  };
  
  // Effect to close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  // --- Event Handlers ---
  const handleBadgeClick = (type: 'season' | 'tournament', id: string) => {
    if (filterType === type && filterId === id) {
      // Clicked the currently active filter badge, so clear it
      setFilterType(null);
      setFilterId(null);
    } else {
      // Set new filter
      setFilterType(type);
      setFilterId(id);
    }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchText = e.target.value;
    setSearchText(newSearchText);
    // If search text is cleared, also clear badge filter
    if (!newSearchText) {
      setFilterType(null);
      setFilterId(null);
    }
  };

  // --- Step 1: Handlers for Import Button ---
  const handleImportButtonClick = () => {
    // Trigger the hidden file input
    fileInputRef.current?.click();
  };

  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const jsonContent = e.target?.result as string;
        if (jsonContent) {
          onImportJson(jsonContent);
        } else {
          console.error('FileReader error: Result is null or empty.');
          alert(t('loadGameModal.importReadError', 'Error reading file content.'));
        }
      } catch (error) {
        console.error('Error processing file content:', error);
        alert(t('loadGameModal.importProcessError', 'Error processing file content.'));
      }
    };

    reader.onerror = () => {
      console.error('FileReader error:', reader.error);
      alert(t('loadGameModal.importReadError', 'Error reading file content.'));
    };

    reader.readAsText(file);
    event.target.value = '';
  };

  const handleRestoreFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const jsonContent = e.target?.result as string;
        if (jsonContent) {
          importFullBackup(jsonContent);
        } else {
          console.error('FileReader error: Result is null or empty.');
          alert(t('loadGameModal.importReadError', 'Error reading file content.'));
        }
      } catch (error) {
        console.error('Error processing file content:', error);
        alert(t('loadGameModal.importProcessError', 'Error processing file content.'));
      }
    };

    reader.onerror = () => {
      console.error('FileReader error:', reader.error);
      alert(t('loadGameModal.importReadError', 'Error reading file content.'));
    };

    reader.readAsText(file);
    event.target.value = '';
  };
  // --- End Step 1 Handlers ---
  //   const handleRestoreFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => { const file = event.target.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = (e) => { try { const jsonContent = e.target?.result as string; if (jsonContent) { importFullBackup(jsonContent); } } catch (error) { console.error('Error processing file content:', error); } }; reader.readAsText(file); event.target.value = ''; };

  if (!isOpen) return null;

  // Scrollable Content Area
  // Main content: List of saved games or loading/error message
  let mainContent;
  if (isLoadingGamesList) {
    mainContent = (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
        <svg className="animate-spin h-8 w-8 text-indigo-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p>{t('loadGameModal.loadingGames', 'Loading saved games...')}</p>
      </div>
    );
  } else if (loadGamesListError) {
    mainContent = (
      <div className="bg-red-700/20 border border-red-600 text-red-300 px-4 py-3 rounded-md text-sm my-4 mx-2" role="alert">
        <p className="font-semibold mb-1">{t('common.error', 'Error')}:</p>
        <p>{loadGamesListError}</p>
      </div>
    );
  } else if (filteredGameIds.length === 0) {
    const hasFilters = searchText || (filterType && filterId);
    mainContent = (
      <div className="text-center text-slate-500 py-10 italic">
        {hasFilters ? 
          t('loadGameModal.noGamesMatchFilter', 'No saved games match your filter.') :
          t('loadGameModal.noGamesSaved', 'No games have been saved yet.')
        }
      </div>
    );
  } else {
    mainContent = (
      <ul className="scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 pr-1 px-1">
        {/* Display general game load/delete errors here, above the list but inside scroll area if many games */}
        {gameLoadError && processingGameId === null && ( // Show if error is general, not for a specific item in loop
          <li className="px-3 py-2 bg-red-700/20 border-b border-red-600 text-red-300 text-xs" role="alert">
            {gameLoadError}
          </li>
        )}
        {gameDeleteError && processingGameId === null && (
          <li className="px-3 py-2 bg-red-700/20 border-b border-red-600 text-red-300 text-xs" role="alert">
            {gameDeleteError}
          </li>
        )}
        {filteredGameIds.map((gameId) => {
          const game = savedGames[gameId];
          if (!game) return null;
          const isCurrent = gameId === currentGameId;

          // Find Season/Tournament Name
          const season = seasons.find(s => s.id === game.seasonId);
          const tournament = tournaments.find(tourn => tourn.id === game.tournamentId);
          const contextName = season?.name || tournament?.name;
          const contextType = season ? 'Season' : (tournament ? 'Tournament' : null);
          const contextId = season?.id || tournament?.id;
          
          // Determine display names based on the specific game's homeOrAway setting
          const displayHomeTeamName = game.homeOrAway === 'home' ? (game.teamName || 'Team') : (game.opponentName || 'Opponent');
          const displayAwayTeamName = game.homeOrAway === 'home' ? (game.opponentName || 'Opponent') : (game.teamName || 'Team');

          const isProcessingThisGame = processingGameId === gameId;
          const isLoadActionActive = isGameLoading && isProcessingThisGame;
          const disableActions = isGameLoading || isGameDeleting || isGamesImporting;

          // Get game status
          const gameStatus = game.gameStatus || 'notStarted';
          // removed unused isGameOpen

          return (
            <li 
              key={gameId} 
              className={`p-4 transition-colors rounded-lg mb-3 last:mb-0 bg-slate-700/80 border border-slate-600/50 ${
                isCurrent ? 'ring-2 ring-yellow-400/50' : ''
              }`}
              data-testid={`game-item-${gameId}`}
            >
              <div className="flex flex-col space-y-2">
                {/* Header row with teams and score */}
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className={`text-base font-medium ${isCurrent ? 'text-amber-400' : 'text-slate-100'}`}>
                      {displayHomeTeamName} vs {displayAwayTeamName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      {contextName && contextType && contextId && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleBadgeClick(contextType.toLowerCase() as ('season' | 'tournament'), contextId); }}
                          className={`text-xs uppercase font-semibold tracking-wide ${
                            contextType.toLowerCase() === 'tournament' ? 'bg-purple-600' : 'bg-blue-600'
                          } text-white px-2 py-0.5 rounded-sm hover:opacity-90 transition-opacity ${
                            filterType === contextType.toLowerCase() && filterId === contextId ? 'ring-2 ring-white/50' : ''
                          }`}
                          title={t('loadGameModal.filterByTooltip', 'Filter by {{name}}', { name: contextName }) ?? `Filter by ${contextName}`}
                        >
                          {contextName}
                        </button>
                      )}
                      {(gameStatus === 'inProgress') && (
                        <span className="text-xs uppercase font-semibold tracking-wide bg-amber-600 text-white px-2 py-0.5 rounded-sm">
                          OPEN
                        </span>
                      )}
                      {isCurrent && (
                        <span className="text-xs uppercase font-semibold tracking-wide bg-green-600 text-white px-2 py-0.5 rounded-sm">
                          {t('loadGameModal.currentlyLoaded', 'Loaded')}
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Score */}
                  <div className="text-2xl font-bold text-yellow-300 ml-4">
                    {game.homeScore ?? 0} - {game.awayScore ?? 0}
                  </div>
                </div>

                {/* Date, time, location row */}
                <div className="flex items-center text-sm text-slate-400 gap-2 flex-wrap">
                  {game.gameDate && <span>{new Date(game.gameDate).toLocaleDateString('fi-FI')}</span>}
                  {game.gameTime && <span className="flex items-center"><HiOutlineClock className="w-3.5 h-3.5 mr-1 flex-shrink-0" /> {game.gameTime}</span>}
                  {game.gameLocation && <span className="flex items-center"><HiOutlineMapPin className="w-3.5 h-3.5 mr-1 flex-shrink-0" /> {game.gameLocation}</span>}
                </div>

                {/* Actions row */}
                <div className="flex justify-between items-center pt-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onLoad(gameId); onClose(); }}
                    className={`px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors flex items-center justify-center ${
                      isLoadActionActive ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                    disabled={disableActions || isLoadActionActive}
                  >
                    {isLoadActionActive ? (
                      <svg className="animate-spin h-4 w-4 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <HiOutlineDocumentArrowDown className="h-4 w-4 mr-2" />
                    )}
                    {t('loadGameModal.loadButton', 'Lataa Peli')}
                  </button>

                  {/* Actions menu */}
                  <div className="relative inline-block text-left">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === gameId ? null : gameId); }}
                      className={`p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-600 rounded-md transition-colors ${
                        isLoadActionActive ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      disabled={disableActions || isLoadActionActive}
                      title="Options"
                    >
                      <HiOutlineEllipsisVertical className="h-5 w-5" />
                    </button>
                    {openMenuId === gameId && (
                      <div 
                        ref={menuRef} 
                        data-testid={`game-item-menu-${gameId}`}
                        className="absolute right-0 z-20 mt-1 w-40 origin-top-right rounded-md bg-slate-800 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                      >
                        <div className="py-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); onExportOneJson(gameId); setOpenMenuId(null); }}
                            className="group flex w-full items-center px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                          >
                            <HiOutlineDocumentText className="mr-3 h-4 w-4 text-slate-400 group-hover:text-slate-300" />
                            {t('loadGameModal.exportJsonMenuItem', 'Export JSON')}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onExportOneCsv(gameId); setOpenMenuId(null); }}
                            className="group flex w-full items-center px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                          >
                            <HiOutlineTableCells className="mr-3 h-4 w-4 text-slate-400 group-hover:text-slate-300" />
                            {t('loadGameModal.exportExcelMenuItem', 'Export CSV')}
                          </button>
                          <div className="border-t border-slate-700 my-1"></div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(gameId, `${game.teamName || 'Team'} vs ${game.opponentName || 'Opponent'}`); setOpenMenuId(null); }}
                            className="group flex w-full items-center px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300"
                          >
                            <HiOutlineTrash className="mr-3 h-4 w-4" />
                            {t('loadGameModal.deleteMenuItem', 'Delete')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Display item-specific error if processing this game resulted in an error */}
                {isProcessingThisGame && gameLoadError && (
                  <p className="text-xs text-red-400 mt-1 animate-pulse">{gameLoadError}</p>
                )}
                {isProcessingThisGame && gameDeleteError && (
                  <p className="text-xs text-red-400 mt-1 animate-pulse">{gameDeleteError}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl flex flex-col h-[95vh] border border-slate-600">
        <div className="px-6 py-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-yellow-300 text-center">
            {t('loadGameModal.title', 'Lataa Peli')}
        </h2>
        </div>

        {/* Single Search/Filter Row */}
        <div className="px-6 py-3 border-b border-slate-700">
          <input
            type="text"
            placeholder={t('loadGameModal.filterPlaceholder', 'Suodata nimell?/p?iv?m??r?ll?...')}
            value={searchText}
            onChange={handleSearchChange}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Import/Export Buttons Row */}
        <div className="px-6 py-3 flex gap-2 justify-center border-b border-slate-700">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept=".json"
              style={{ display: 'none' }}
              id="import-json-input"
              data-testid="import-json-input"
            />
            {/* Import Button */}
            <button
              onClick={handleImportButtonClick}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium shadow-sm transition-colors"
              title={t('loadGameModal.importTooltip', 'Import games from JSON file') ?? 'Import games from JSON file'}
            >
            <HiOutlineDocumentArrowUp className="w-5 h-5" />
              {t('loadGameModal.importButton', 'Import')}
            </button>
            {/* Export All JSON */}
            <button
              onClick={onExportAllJson}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-sm font-medium shadow-sm transition-colors"
              title={t('loadGameModal.exportAllJsonTooltip', 'Export all games as JSON') ?? 'Export all games as JSON'}
            >
            <HiOutlineDocumentArrowDown className="w-5 h-5" />
            {t('loadGameModal.exportAllJsonButton', 'Export JSON')}
            </button>
             {/* Export All CSV */}
             <button
              onClick={onExportAllExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-sm font-medium shadow-sm transition-colors"
              title={t('loadGameModal.exportAllExcelTooltip', 'Export all games as CSV (Excel compatible)') ?? 'Export all games as CSV'}
            >
            <HiOutlineTableCells className="w-5 h-5" />
            {t('loadGameModal.exportAllExcelButton', 'Export CSV')}
            </button>
        </div>

        {/* Active Filter Badge (if applicable) */}
        {(filterType && filterId) && (
          <div className="px-6 py-2 flex justify-center">
            <div className="flex items-center gap-1 bg-slate-600/50 px-2 py-1 rounded text-xs">
                <span className="text-slate-300">
                  {filterType === 'season' ? t('common.season', 'Season') : t('common.tournament', 'Tournament')}:
                </span>
                <span className="font-medium text-slate-100">
                  {filterType === 'season'
                    ? seasons.find(s => s.id === filterId)?.name
                    : tournaments.find(t => t.id === filterId)?.name}
                </span>
                <button
                  onClick={() => { setFilterType(null); setFilterId(null); }}
                  className="ml-1 text-slate-400 hover:text-red-400"
                  title={t('loadGameModal.clearFilterTooltip', 'Clear filter') ?? 'Clear filter'}
                >
                  <HiOutlineXCircle className="w-3.5 h-3.5" />
                </button>
              </div>
           </div>
        )}

        {/* Game List Area - This takes up remaining space */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {mainContent}
                    </div>

        {/* Footer with Backup/Restore buttons */}
        <div className="px-6 py-4 border-t border-slate-700 space-y-3">
          {/* Import error display */}
          {gamesImportError && (
            <div className="bg-red-700/20 border border-red-600 text-red-300 px-3 py-2 rounded-md text-xs" role="alert">
              <p className="font-medium">{t('loadGameModal.importFailedTitle', 'Import Failed')}:</p>
              <p>{gamesImportError}</p>
            </div>
          )}
          
          {/* Hidden File Input for Restore Backup */}
          <input
            type="file"
            ref={restoreFileInputRef}
            onChange={handleRestoreFileSelected}
            accept=".json"
            style={{ display: "none" }}
            data-testid="restore-backup-input"
          />
          
          {/* Backup/Restore buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={exportFullBackup}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium shadow-sm transition-colors"
            >
              <HiOutlineDocumentArrowDown className="w-5 h-5" />
              {t('loadGameModal.backupButton', 'Backup All Data')}
            </button>
            <button
              onClick={() => restoreFileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium shadow-sm transition-colors"
              disabled={isGamesImporting || isLoadingGamesList || isGameLoading || isGameDeleting}
            >
              {isGamesImporting ? (
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <HiOutlineDocumentArrowUp className="w-5 h-5" />
              )}
              {t('loadGameModal.restoreButton', 'Restore from Backup')}
            </button>
          </div>

          {/* Close button */}
            <button
              onClick={onClose}
            className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-md text-sm font-medium transition-colors"
            disabled={isGamesImporting || isGameLoading || isGameDeleting}
            >
            {t('common.close', 'Sulje')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default LoadGameModal;
