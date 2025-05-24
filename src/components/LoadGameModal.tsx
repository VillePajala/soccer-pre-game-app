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
      <ul className="overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 pr-1 px-1">
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

          const season = seasons.find(s => s.id === game.seasonId);
          const tournament = tournaments.find(tourn => tourn.id === game.tournamentId);
          const contextName = season?.name || tournament?.name;
          const contextType = season ? 'Season' : (tournament ? 'Tournament' : null);
          const contextId = season?.id || tournament?.id;
          
          const displayHomeTeamName = game.homeOrAway === 'home' ? (game.teamName || 'Team') : (game.opponentName || 'Opponent');
          const displayAwayTeamName = game.homeOrAway === 'home' ? (game.opponentName || 'Opponent') : (game.teamName || 'Team');

          const isProcessingThisGame = processingGameId === gameId;
          const isLoadActionActive = isGameLoading && isProcessingThisGame;
          const disableActions = isGameLoading || isGameDeleting || isGamesImporting;

          let gameDisplayDate = '';
          let gameDisplayTime = '';
          if (game.gameDate) {
            try {
              const dateObj = new Date(game.gameDate);
              gameDisplayDate = dateObj.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric' });
              // Ensure game.gameTime (if it exists and is just HH:MM) is used, otherwise format from gameDate
              if (game.gameTime && /^\\d{2}:\\d{2}$/.test(game.gameTime)) {
                gameDisplayTime = game.gameTime;
              } else {
                gameDisplayTime = dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
              }
            } catch (e) {
              console.warn("Error formatting game date/time:", game.gameDate, game.gameTime, e);
              gameDisplayDate = game.gameDate || '';
              gameDisplayTime = game.gameTime || '';
            }
          }
          
          const scoreDisplay = `${game.homeScore ?? 0} - ${game.awayScore ?? 0}`;

          return (
            <li 
              key={gameId} 
              className={`p-3 transition-colors rounded-md mb-3 last:mb-0 border-2 ${
                isCurrent 
                  ? 'bg-slate-600 border-yellow-400 shadow-xl' // Active game: lighter bg, yellow border, strong shadow
                  : 'bg-slate-750 border-slate-600 hover:bg-slate-700 shadow-md' // Non-active: darker bg, subtle border, subtle hover, normal shadow
              }`}
              data-testid={`game-item-${gameId}`}
            >
              <div className="flex flex-col space-y-2.5">
                {/* Top Row: Teams and Score */}
                <div className="flex justify-between items-start">
                  <div className="flex-grow truncate mr-3">
                    <h3 className={`text-base font-semibold ${isCurrent ? 'text-yellow-300' : 'text-slate-100'}`}>
                      {displayHomeTeamName} vs {displayAwayTeamName}
                    </h3>
                  </div>
                  {(typeof game.homeScore === 'number' && typeof game.awayScore === 'number') && (
                    <div className={`text-xl font-bold ${isCurrent ? 'text-yellow-300' : 'text-amber-400'} flex-shrink-0`}>
                      {scoreDisplay}
                    </div>
                  )}
                </div>

                {/* Middle Row: Badges and Date/Location Info */}
                <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-3 gap-y-1.5 text-xs text-slate-400">
                  {contextName && contextType && contextId && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleBadgeClick(contextType.toLowerCase() as ('season' | 'tournament'), contextId); }}
                      className={`inline-block text-2xs uppercase font-semibold tracking-wider ${
                        contextType === 'Tournament' ? 'bg-purple-500 hover:bg-purple-400' : 'bg-sky-500 hover:bg-sky-400'
                      } text-white px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm transition-all ${
                        filterType === contextType.toLowerCase() && filterId === contextId ? 'ring-2 ring-offset-2 ring-offset-slate-800 ring-yellow-400' : ''
                      }`}
                      title={t('loadGameModal.filterByTooltip', 'Filter by {{name}}', { name: contextName }) ?? `Filter by ${contextName}`}
                    >
                      {contextName}
                    </button>
                  )}
                  
                  <div className="flex items-center gap-x-1.5 flex-wrap">
                    {game.gameStatus === 'notStarted' && (
                         <span className="bg-sky-600/80 text-white/90 px-1.5 py-0.5 rounded text-2xs uppercase font-medium tracking-wide">{t('common.status.open', 'Open')}</span>
                    )}
                    {gameDisplayDate && <span>{gameDisplayDate}</span>}
                    {gameDisplayTime && <span className="text-slate-500">•</span>}
                    {gameDisplayTime && <span>{gameDisplayTime}</span>}
                    {game.gameLocation && <span className="text-slate-500">•</span>}
                    {game.gameLocation && <span className="truncate">{game.gameLocation}</span>}
                  </div>
                </div>

                {/* Bottom Row: Load Button and Actions Menu */}
                <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-slate-600/70">
                  <button
                    onClick={(e) => { e.stopPropagation(); onLoad(gameId); onClose(); }}
                    className={`px-5 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-800 text-white rounded-md disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center min-w-[130px] shadow-md hover:shadow-lg transition-all ${
                      isLoadActionActive ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                    disabled={disableActions || isLoadActionActive}
                    title={t('loadGameModal.loadButtonTooltip', 'Load this game')}
                  >
                    {isLoadActionActive ? (
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      t('loadGameModal.loadButton', 'Load Game')
                    )}
                  </button>
                  
                  <div className="relative inline-block text-left ml-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === gameId ? null : gameId); }}
                      className={`p-2.5 text-sm bg-slate-600 hover:bg-slate-500 focus-visible:ring-1 focus-visible:ring-slate-400 text-slate-200 rounded-md disabled:opacity-60 disabled:cursor-not-allowed shadow-sm hover:shadow-md transition-all ${
                        (disableActions && !isProcessingThisGame) || (isProcessingThisGame && !openMenuId) ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                       disabled={(disableActions && !isProcessingThisGame) || (isProcessingThisGame && isLoadActionActive )}
                       title={t('loadGameModal.actionsMenuTooltip', 'Actions')}
                    >
                      <HiOutlineEllipsisVertical className="h-5 w-5" />
                    </button>
                    {openMenuId === gameId && !isProcessingThisGame && (
                      <div 
                        ref={menuRef} 
                        className={`absolute right-0 bottom-full mb-1 z-20 w-44 origin-bottom-right rounded-md bg-slate-700 shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none`}
                      >
                        <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
                          <button
                            onClick={(e) => { e.stopPropagation(); onExportOneJson(gameId); setOpenMenuId(null); }}
                            className={`group flex w-full items-center rounded-md px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600 hover:text-white disabled:opacity-50`}
                            role="menuitem"
                            disabled={disableActions}
                          >
                            <HiOutlineDocumentText className="mr-2.5 h-4 w-4 text-slate-400 group-hover:text-slate-300" aria-hidden="true" />
                            {t('loadGameModal.exportJsonMenuItem', 'Export JSON')}
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); onExportOneCsv(gameId); setOpenMenuId(null); }}
                            className={`group flex w-full items-center rounded-md px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-600 hover:text-white disabled:opacity-50`}
                            role="menuitem"
                            disabled={disableActions}
                          >
                            <HiOutlineTableCells className="mr-2.5 h-4 w-4 text-slate-400 group-hover:text-slate-300" aria-hidden="true" />
                            {t('loadGameModal.exportExcelMenuItem', 'Export CSV')}
                          </button>
                          <div className="border-t border-slate-600/70 my-1"></div>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(gameId, `${displayHomeTeamName} vs ${displayAwayTeamName}`); }}
                            className={`group flex w-full items-center rounded-md px-3 py-1.5 text-xs text-red-400 hover:bg-red-600 hover:text-white disabled:opacity-50`}
                            role="menuitem"
                            disabled={disableActions}
                          >
                            <HiOutlineTrash className="mr-2.5 h-4 w-4 group-hover:text-red-300" aria-hidden="true" />
                            {t('loadGameModal.deleteMenuItem', 'Delete Game')}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {isProcessingThisGame && gameLoadError && (
                  <p className="text-xs text-red-400 mt-1.5 animate-pulse">{t('loadGameModal.loadErrorItem', 'Error loading: {{error}}', { error: gameLoadError })}</p>
                )}
                {isProcessingThisGame && gameDeleteError && (
                  <p className="text-xs text-red-400 mt-1.5 animate-pulse">{t('loadGameModal.deleteErrorItem', 'Error deleting: {{error}}', { error: gameDeleteError })}</p>
                )}
              </div>
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
