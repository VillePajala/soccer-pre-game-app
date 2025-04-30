'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SavedGamesCollection, Season, Tournament } from '@/app/page'; // Removed unused GameEvent
import { SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY } from '@/config/constants';
import i18n from '../i18n'; // Import i18n directly
import { 
  HiOutlineDocumentArrowDown, 
  HiOutlineEllipsisVertical,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineTableCells,
  HiOutlineXCircle,
  HiOutlineDocumentArrowUp,
} from 'react-icons/hi2';
// REMOVE unused Fa icons and useGameState hook
// import { FaTimes, FaUpload, FaDownload, FaTrash, FaExclamationTriangle, FaSearch } from 'react-icons/fa';
// import { useGameState } from '@/hooks/useGameState';

interface LoadGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (gameId: string) => void;
  onDelete: (gameId: string) => void;
  savedGames: SavedGamesCollection;
  onExportAllJson: () => void;
  onExportAllExcel: () => void;
  onExportOneJson: (gameId: string) => void;
  onExportOneCsv: (gameId: string) => void;
  onImportJson: (jsonContent: string) => void;
  currentGameId?: string; // Add prop for currently loaded game
}

// Define the default game ID constant if not imported (consider sharing from page.tsx)
const DEFAULT_GAME_ID = '__default_unsaved__'; 

const LoadGameModal: React.FC<LoadGameModalProps> = ({
  isOpen,
  onClose,
  onLoad,
  onDelete,
  savedGames,
  onExportAllJson,
  onExportAllExcel,
  onExportOneJson,
  onExportOneCsv,
  onImportJson,
  currentGameId,
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
      try {
        const storedSeasons = localStorage.getItem(SEASONS_LIST_KEY);
        setSeasons(storedSeasons ? JSON.parse(storedSeasons) : []);
      } catch (error) {
        console.error("Failed to load or parse seasons:", error);
        setSeasons([]); 
      }
      try {
        const storedTournaments = localStorage.getItem(TOURNAMENTS_LIST_KEY);
        setTournaments(storedTournaments ? JSON.parse(storedTournaments) : []);
      } catch (error) {
        console.error("Failed to load or parse tournaments:", error);
        setTournaments([]);
      }
    }
  }, [isOpen]);

  // Filter logic updated to only use searchText
  const filteredGameIds = useMemo(() => {
    return Object.keys(savedGames)
      .filter(id => id !== DEFAULT_GAME_ID)
      .filter(id => { // Filter by Search Text
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
      })
      .filter(id => { // Filter by Active Season/Tournament Badge
        if (!filterType || !filterId) return true; // No badge filter active
        const gameData = savedGames[id];
        if (!gameData) return false;
        if (filterType === 'season') {
          return gameData.seasonId === filterId;
        }
        if (filterType === 'tournament') {
          return gameData.tournamentId === filterId;
        }
        return false; // Should not happen
      })
      .sort((a, b) => {
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
  }, [savedGames, searchText, seasons, tournaments, filterType, filterId]); // Added dependencies

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
      console.log('No file selected');
      return;
    }

    console.log(`File selected: ${file.name}, size: ${file.size}`);
    // Placeholder for now - Step 2 will read the file content
    // For now, just call the prop to show connection (can test with dummy string)
    // onImportJson(`Placeholder content for ${file.name}`); 

    // Clear the input value to allow re-selecting the same file
    event.target.value = '';
  };
  // --- End Step 1 Handlers ---

  if (!isOpen) return null;

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
              style={{ display: 'none' }} // Visually hide the input
              id="import-json-input"
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
        <div
          className="flex-grow mb-4 pr-2 -mr-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50"
        >
          {filteredGameIds.length > 0 ? (
            <div className="space-y-4">
              {filteredGameIds.map((gameId) => {
                const gameData = savedGames[gameId];
                if (!gameData) return null; // Skip if data is missing

                // Find Season/Tournament Name
                const season = seasons.find(s => s.id === gameData.seasonId);
                const tournament = tournaments.find(tourn => tourn.id === gameData.tournamentId);
                const contextName = season?.name || tournament?.name;
                const contextType = season ? 'Season' : (tournament ? 'Tournament' : null);
                const contextId = season?.id || tournament?.id;
                
                // Determine display names based on the specific game's homeOrAway setting
                const displayHomeTeamName = gameData.homeOrAway === 'home' ? (gameData.teamName || 'Team') : (gameData.opponentName || 'Opponent');
                const displayAwayTeamName = gameData.homeOrAway === 'home' ? (gameData.opponentName || 'Opponent') : (gameData.teamName || 'Team');

                // Format date nicely (e.g., "Apr 20, 2025" in English or "20.4.2025" in Finnish)
                let formattedDate = t('common.noDate', 'No Date');
                try {
                    if (gameData.gameDate) {
                        const dateObj = new Date(gameData.gameDate);
                        const currentLanguage = i18n.language; // Get current language
                        
                        if (currentLanguage === 'fi') {
                            // Finnish date format: DD.MM.YYYY
                            formattedDate = dateObj.toLocaleDateString('fi-FI', {
                                year: 'numeric', 
                                month: 'numeric', 
                                day: 'numeric'
                            });
                        } else {
                            // English/default format: "Apr 20, 2025"
                            formattedDate = dateObj.toLocaleDateString('en-US', { 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                            });
                        }
                    }
                } catch (e) {
                    console.error("Error formatting date:", gameData.gameDate, e);
                    // Fallback to original string if formatting fails
                    formattedDate = gameData.gameDate || formattedDate;
                }
                
                return (
                  <div 
                    key={gameId} 
                    className={`bg-slate-700/70 p-3 rounded-lg shadow-lg border transition-colors duration-150 hover:bg-slate-600/80 ${
                      currentGameId === gameId 
                        ? 'border-yellow-400 shadow-[0_0_10px_rgba(250,204,21,0.4)]' 
                        : 'border-slate-600/80'
                    }`}
                  >
                    {/* Row 1: Team Names, Badge, Score */}
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      {/* Left: Team names and optional badge */}
                      <div className="flex-1 min-w-0"> {/* min-w-0 helps truncation */}
                        <h3 className="text-sm font-semibold text-slate-100 truncate">
                          {/* Use display names */}
                          {displayHomeTeamName} vs {displayAwayTeamName}
                        </h3>
                        {contextName && contextType && contextId && (
                          <button 
                            onClick={() => handleBadgeClick(contextType.toLowerCase() as ('season' | 'tournament'), contextId)}
                            className={`inline-block mt-0.5 text-2xs uppercase font-medium tracking-wide ${contextType === 'Tournament' ? 'bg-purple-600/80' : 'bg-blue-600/80'} text-white/90 px-1.5 py-0.5 rounded whitespace-nowrap shadow-sm transition-opacity hover:opacity-80 ${
                              filterType === contextType.toLowerCase() && filterId === contextId ? 'ring-2 ring-offset-1 ring-offset-slate-700 ring-yellow-400' : ''
                            }`}
                            title={t('loadGameModal.filterByTooltip', 'Filter by {{name}}', { name: contextName }) ?? `Filter by ${contextName}`}
                          >
                            {contextName}
                          </button>
                        )}
                      </div>
                      {/* Right: Score */}
                      <span className="font-bold text-lg text-yellow-400 tracking-wider flex-shrink-0 pt-px">
                        {gameData.homeScore ?? 0} - {gameData.awayScore ?? 0}
                      </span>
                    </div>

                    {/* Row 2: Date/Location/Time and Status */}
                    <div className="flex items-center text-xs text-slate-300 mb-2.5">
                      {currentGameId === gameId && (
                        <span className="inline-flex items-center bg-yellow-500/90 text-slate-900 text-2xs font-bold px-1.5 py-0.5 rounded-sm mr-1.5 shadow-sm">
                          {t('loadGameModal.currentlyOpenShort', 'OPEN')}
                        </span>
                      )}
                      <span className="truncate"> {/* Allow date line to truncate */}
                        {formattedDate}
                        {(gameData.gameLocation || gameData.gameTime) && ' • '}
                        {gameData.gameLocation && (
                          <span className="text-slate-400">{gameData.gameLocation}</span>
                        )}
                        {gameData.gameLocation && gameData.gameTime && ' • '}
                        {gameData.gameTime && (
                          <span className="text-slate-400">{gameData.gameTime}</span>
                        )}
                      </span>
                    </div>

                    {/* Row 3: Actions */}
                    <div className="flex items-center pt-1.5 border-t border-slate-600/40">
                      {/* Load Button */}
                      <button 
                        onClick={() => { onLoad(gameId); onClose(); }}
                        className="flex-grow mr-2 px-2.5 py-1.5 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition duration-150 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-400 focus:ring-offset-1 focus:ring-offset-slate-700 flex items-center justify-center"
                      >
                        <HiOutlineDocumentArrowDown className="w-3.5 h-3.5 mr-1" />
                        {t('loadGameModal.loadButton', 'Load Game')}
                      </button>
                    
                      {/* Actions Menu */}                      
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => {
                             e.stopPropagation(); 
                             setOpenMenuId(openMenuId === gameId ? null : gameId);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-200 rounded-full hover:bg-slate-600/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500"
                        >
                           <HiOutlineEllipsisVertical className="w-5 h-5" />
                        </button>

                        {openMenuId === gameId && (
                           <div 
                             ref={menuRef} 
                             className={`absolute right-0 mt-2 w-48 bg-slate-700 rounded-md shadow-lg py-1 z-10 border border-slate-600`}
                           >
                             
                             <button 
                                onClick={(e) => { e.stopPropagation(); onExportOneJson(gameId); setOpenMenuId(null); }} 
                                className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 flex items-center gap-2"
                              >
                                <HiOutlineDocumentText className="w-4 h-4"/> {t('loadGameModal.exportJson', 'Export JSON')}
                             </button>
                             <button 
                                onClick={(e) => { e.stopPropagation(); onExportOneCsv(gameId); setOpenMenuId(null); }} 
                                className="w-full text-left px-4 py-2 text-sm text-slate-200 hover:bg-slate-600 flex items-center gap-2"
                              >
                                 <HiOutlineTableCells className="w-4 h-4"/> {t('loadGameModal.exportCsv', 'Export CSV')}
                              </button>
                              <div className="my-1 h-px bg-slate-600"></div> {/* Separator */}
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteClick(gameId, displayHomeTeamName + ' vs ' + displayAwayTeamName); }}
                                className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 flex items-center gap-2"
                              >
                                <HiOutlineTrash className="w-4 h-4"/> {t('loadGameModal.delete', 'Delete Game')}
                              </button>
                           </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-slate-400 text-center py-8">
              {t('loadGameModal.noGamesFound', 'No saved games match your filter.')}
            </p>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-auto pt-4 flex justify-end flex-shrink-0 border-t border-slate-700/50">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-100 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-indigo-500"
            >
              {t('common.close', 'Close')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default LoadGameModal;