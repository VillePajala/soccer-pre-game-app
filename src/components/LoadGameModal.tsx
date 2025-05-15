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
  HiOutlineMagnifyingGlass
} from 'react-icons/hi2';
// REMOVE unused Fa icons and useGameState hook
// import { FaTimes, FaUpload, FaDownload, FaTrash, FaExclamationTriangle, FaSearch } from 'react-icons/fa';
// import { useGameState } from '@/hooks/useGameState';
// Import the new backup functions
// import { exportFullBackup, importFullBackup } from '@/utils/fullBackup'; 
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
  // --- End Step 1 Handlers ---

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
    mainContent = (
      <div className="text-center text-slate-500 py-10 italic">
        {t('loadGameModal.noGamesSaved', 'No games saved yet.')}
      </div>
    );
  } else {
    mainContent = (
      <ul className="divide-y divide-slate-700 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 pr-1">
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
          if (!game) return null; // Should not happen if IDs are from savedGames keys
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
          const disableActions = isGameLoading || isGameDeleting || isGamesImporting; // General disable for other actions

          return (
            <li key={gameId} className={`p-3 hover:bg-slate-700/50 transition-colors ${isCurrent ? 'bg-indigo-800/30' : ''}`}>
              <div className="flex justify-between items-center mb-1">
                <div className="truncate">
                  <h3 className={`text-sm font-semibold ${isCurrent ? 'text-amber-400' : 'text-slate-200'}`}>
                    {/* Use display names */}
                    {displayHomeTeamName} vs {displayAwayTeamName}
                  </h3>
                  {contextName && contextType && contextId && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleBadgeClick(contextType.toLowerCase() as ('season' | 'tournament'), contextId); }}
                      className={`inline-block mt-0.5 text-2xs uppercase font-medium tracking-wide ${contextType === 'Tournament' ? 'bg-purple-600/80' : 'bg-blue-600/80'} text-white/90 px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm transition-opacity hover:opacity-80 ${
                        filterType === contextType.toLowerCase() && filterId === contextId ? 'ring-2 ring-offset-1 ring-offset-slate-700 ring-yellow-400' : ''
                      }`}
                      title={t('loadGameModal.filterByTooltip', 'Filter by {{name}}', { name: contextName }) ?? `Filter by ${contextName}`}
                    >
                      {contextName}
                    </button>
                  )}
                </div>
                <div className="flex space-x-1.5 flex-shrink-0 ml-2">
                  <button
                    onClick={(e) => { e.stopPropagation(); onLoad(gameId); onClose(); }}
                    className={`p-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[50px] ${isLoadActionActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={disableActions || isLoadActionActive}
                    title={t('common.load', 'Load')}
                  >
                    {isLoadActionActive ? (
                      <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <HiOutlineDocumentArrowDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteClick(gameId, (game.teamName || 'Team') + ' vs ' + (game.opponentName || 'Opponent')); }}
                    className={`p-1.5 text-xs bg-red-700 hover:bg-red-800 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[50px] ${isLoadActionActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={disableActions || isLoadActionActive}
                    title={t('common.delete', 'Delete')}
                  >
                    {isLoadActionActive ? (
                      <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      <HiOutlineTrash className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {/* Add more actions like individual export here if needed, with similar disabled logic */}
                  <div className="relative inline-block text-left">
                    <div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenMenuId(isProcessingThisGame ? null : gameId); }}
                        className={`p-1.5 text-xs bg-slate-600 hover:bg-slate-500 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed ${isLoadActionActive ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={disableActions || isLoadActionActive}
                      >
                        <HiOutlineEllipsisVertical className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {isProcessingThisGame && (
                      <div 
                        ref={menuRef} 
                        className={`absolute right-0 z-20 mt-1 w-36 origin-top-right rounded-md bg-slate-700 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}
                      >
                        <div className="py-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); onExportOneJson(gameId); setOpenMenuId(null); }}
                            className={`${
                              isLoadActionActive ? 'opacity-50 cursor-not-allowed' : ''
                            } group flex w-full items-center rounded-md px-2 py-1.5 text-xs text-slate-200`}
                          >
                            <HiOutlineDocumentText className="mr-2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                            {t('loadGameModal.exportJsonShort', 'JSON')}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onExportOneCsv(gameId); setOpenMenuId(null); }}
                            className={`${
                              isLoadActionActive ? 'opacity-50 cursor-not-allowed' : ''
                            } group flex w-full items-center rounded-md px-2 py-1.5 text-xs text-slate-200`}
                          >
                            <HiOutlineTableCells className="mr-2 h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
                            {t('loadGameModal.exportCsvShort', 'CSV')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {/* Display item-specific error if processing this game resulted in an error */}
              {isLoadActionActive && gameLoadError && (
                <p className="text-xs text-red-400 mt-1 animate-pulse">{gameLoadError}</p>
              )}
              {isLoadActionActive && gameDeleteError && (
                <p className="text-xs text-red-400 mt-1 animate-pulse">{gameDeleteError}</p>
              )}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-4 pt-8 sm:pt-4">
      {/* Added pt-8 for small screens to avoid overlap with potential mobile top bars */}
      <div className="bg-slate-800 rounded-lg shadow-xl p-5 w-full max-w-xl border border-slate-600 flex flex-col max-h-[calc(100vh-theme(space.16))] sm:max-h-[calc(100vh-theme(space.8))] overflow-hidden">
        {/* Adjusted max-h for padding top */}
        <h2 className="text-xl font-semibold mb-4 text-yellow-300 flex-shrink-0 text-center">
          {t('loadGameModal.title', 'Load / Manage Games')}
        </h2>

        {/* Filter & Action Row */}
        <div className="mb-4 px-1 flex flex-col sm:flex-row gap-3 flex-shrink-0 items-center">
          {/* Search Input */}
          <input
            type="text"
            placeholder={t('loadGameModal.filterPlaceholder', 'Filter by name/date/season/tournament...')}
            value={searchText}
            onChange={handleSearchChange}
            className="flex-grow px-3 py-1.5 bg-slate-600 border border-slate-500 rounded-md shadow-sm text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-auto"
          />

          {/* Import/Export Buttons */}
          <div className="flex gap-2 flex-shrink-0">
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
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-blue-500 transition-colors"
              title={t('loadGameModal.importTooltip', 'Import games from JSON file') ?? 'Import games from JSON file'}
            >
              <HiOutlineDocumentArrowUp className="w-4 h-4" />
              {t('loadGameModal.importButton', 'Import')}
            </button>
            {/* Export All JSON */}
            <button
              onClick={onExportAllJson}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-md text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-teal-500 transition-colors"
              title={t('loadGameModal.exportAllJsonTooltip', 'Export all games as JSON') ?? 'Export all games as JSON'}
            >
              <HiOutlineDocumentArrowDown className="w-4 h-4" />
              {t('loadGameModal.exportAllJsonButton', 'Export JSON')}
            </button>
             {/* Export All CSV */}
             <button
              onClick={onExportAllExcel}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-emerald-500 transition-colors"
              title={t('loadGameModal.exportAllExcelTooltip', 'Export all games as CSV (Excel compatible)') ?? 'Export all games as CSV'}
            >
               <HiOutlineTableCells className="w-4 h-4" />
               {t('loadGameModal.exportAllExcelButton', 'Export CSV')}
            </button>
          </div>
        </div>

        {/* Active Filter Badge (if applicable) */}
        {(filterType && filterId) && (
           <div className="mb-3 px-1 flex justify-center flex-shrink-0">
              <div className="flex items-center gap-1 bg-slate-600/50 px-2 py-1 rounded text-xs flex-shrink-0">
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

        {/* Game List Area */}
        <div className="flex-grow overflow-y-auto px-1 pb-1 flex flex-col min-h-0"> {/* Added min-h-0 to ensure child flex-grow works */}
          {/* Search Bar - Placed above the list within the scrollable area's parent */}
          <div className="p-3 border-b border-slate-700">
            <label htmlFor="gameSearch" className="sr-only">
              {t('loadGameModal.searchPlaceholder', 'Search games...')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <HiOutlineMagnifyingGlass className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                      </div>
              <input
                type="search"
                name="gameSearch"
                id="gameSearch"
                value={searchText}
                onChange={handleSearchChange}
                className="block w-full pl-9 pr-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={t('loadGameModal.searchPlaceholder', 'Search games...')}
                disabled={isLoadingGamesList || isGameLoading || isGameDeleting || isGamesImporting} // Disable search during any processing
              />
                      </div>
                    </div>
          {mainContent}
                  </div>

        {/* Footer Actions */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-slate-700 space-y-2">
          {/* Import Section - error display and button state */}
          {gamesImportError && (
            <div className="bg-red-700/20 border border-red-600 text-red-300 px-3 py-2 rounded-md text-xs mb-2" role="alert">
              <p className="font-medium">{t('loadGameModal.importFailedTitle', 'Import Failed')}:</p>
              <p>{gamesImportError}</p>
            </div>
          )}
          <div className="flex items-center space-x-2">
            <input
              type="file"
              id="importFile"
              accept=".json"
              onChange={handleFileSelected}
              className="hidden"
              ref={fileInputRef}
              disabled={isGamesImporting || isLoadingGamesList || isGameLoading || isGameDeleting}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-3 py-1.5 text-xs bg-sky-600 hover:bg-sky-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
              disabled={isGamesImporting || isLoadingGamesList || isGameLoading || isGameDeleting}
            >
              {isGamesImporting ? (
                <svg className="animate-spin h-3.5 w-3.5 text-white mr-1.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <HiOutlineDocumentArrowUp className="h-3.5 w-3.5 mr-1.5" />
              )}
              {isGamesImporting ? t('loadGameModal.importing', 'Importing...') : t('loadGameModal.importJson', 'Import JSON')}
            </button>
          </div>
          {/* Export All Buttons */}
          <div className="grid grid-cols-2 gap-x-2">
            <button
              onClick={onExportAllJson}
              className="px-3 py-1.5 text-xs bg-slate-600 hover:bg-slate-500 text-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={isGamesImporting || isLoadingGamesList || isGameLoading || isGameDeleting || filteredGameIds.length === 0}
            >
              <HiOutlineDocumentArrowDown className="h-3.5 w-3.5 mr-1.5" />
              {t('loadGameModal.exportAllJson', 'Export All (JSON)')}
            </button>
            <button
              onClick={onExportAllExcel}
              className="px-3 py-1.5 text-xs bg-slate-600 hover:bg-slate-500 text-slate-200 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={isGamesImporting || isLoadingGamesList || isGameLoading || isGameDeleting || filteredGameIds.length === 0}
            >
              <HiOutlineTableCells className="h-3.5 w-3.5 mr-1.5" />
              {t('loadGameModal.exportAllCsv', 'Export All (CSV)')}
            </button>
          </div>
          <button
            onClick={onClose}
            className="w-full mt-1 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 rounded disabled:opacity-70"
            disabled={isGamesImporting || isGameLoading || isGameDeleting} // Allow close if only list is loading
            >
              {t('common.close', 'Close')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default LoadGameModal;