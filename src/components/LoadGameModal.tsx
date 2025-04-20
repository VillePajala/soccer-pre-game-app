'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SavedGamesCollection, AppState } from '@/app/page'; // Adjust path if necessary, Import AppState
import i18n from '../i18n'; // Import i18n directly
import { 
  HiOutlineDocumentArrowDown, 
  HiOutlineEllipsisVertical,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineTableCells
} from 'react-icons/hi2';

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
}) => {
  const { t } = useTranslation();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'season' | 'tournament'>('all');
  const [searchText, setSearchText] = useState<string>('');
  const menuRef = useRef<HTMLDivElement>(null);

  // Get the list of actual saved game IDs (excluding the default/unsaved state)
  const filteredGameIds = Object.keys(savedGames)
    .filter(id => id !== DEFAULT_GAME_ID) // Exclude default
    .filter(id => { // Filter by type
      const gameData = savedGames[id];
      if (!gameData) return false;
      if (filterType === 'all') return true;
      return gameData.gameType === filterType;
    })
    .filter(id => { // Filter by search text
      const gameData = savedGames[id];
      if (!gameData) return false;
      if (!searchText) return true; // No search text, show all

      const lowerSearchText = searchText.toLowerCase();
      const teamName = (gameData.teamName || '').toLowerCase();
      const opponentName = (gameData.opponentName || '').toLowerCase();
      // Include date in search?
      const gameDate = (gameData.gameDate || '').toLowerCase(); 
      // Optionally format date before searching? 
      // const formattedDate = gameData.gameDate ? new Date(gameData.gameDate).toLocaleDateString().toLowerCase() : '';

      return (
        teamName.includes(lowerSearchText) ||
        opponentName.includes(lowerSearchText) ||
        gameDate.includes(lowerSearchText)
      );
    });

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

  const getFilterButtonLabel = (type: string) => {
    // Simply reference the key directly in the most standard i18next format
    return t(`loadGameModal.filter_${type}`, type.charAt(0).toUpperCase() + type.slice(1));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl p-5 w-full max-w-lg border border-slate-600 flex flex-col max-h-[calc(100vh-theme(space.8))] overflow-hidden min-h-[calc(100vh-theme(space.8))]">
        <h2 className="text-xl font-semibold mb-6 text-yellow-300 flex-shrink-0 text-center">
          {t('loadGameModal.title', 'Load Game')}
        </h2>

        {/* Filter Controls */}
        <div className="mb-4 px-1 flex flex-col sm:flex-row gap-3 flex-shrink-0">
          {/* Text Filter Input */}
          <input 
            type="text"
            placeholder={t('loadGameModal.filterPlaceholder', 'Filter by name/date...')}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="flex-grow px-3 py-1.5 bg-slate-600 border border-slate-500 rounded-md shadow-sm text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
          {/* Type Filter Buttons */}
          <div className="flex items-center justify-center space-x-2 flex-shrink-0">
            {['all', 'season', 'tournament'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type as 'all' | 'season' | 'tournament')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-150 
                  ${filterType === type 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-slate-600 text-slate-300 hover:bg-slate-500'
                  }`}
              >
                {getFilterButtonLabel(type)}
              </button>
            ))}
          </div>
        </div>

        <div 
          className="flex-grow mb-4 pr-2 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50"
        >
          {filteredGameIds.length > 0 ? (
            <div className="space-y-4">
              {filteredGameIds.map((gameId) => {
                const gameData = savedGames[gameId];
                if (!gameData) return null; // Skip if data is missing

                // Determine game type display text and styling
                const gameTypeDisplay = gameData.gameType === 'tournament' 
                  ? t('saveGameModal.gameTypeTournament', 'Tournament') 
                  : t('saveGameModal.gameTypeSeason', 'Season');
                const gameTypeBgColor = gameData.gameType === 'tournament' ? 'bg-purple-600' : 'bg-blue-600';
                const gameTypeTextColor = 'text-white'; // Use white text for both
                
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
                  <div key={gameId} className="bg-slate-700/70 p-5 rounded-lg shadow-lg border border-slate-600/80 flex flex-col gap-4 transition-colors duration-150 hover:bg-slate-600/80">
                    
                    <div className="flex justify-between items-start mb-1">
                      <h3 className="text-lg font-semibold text-slate-100 break-words mr-3">
                        {gameData.teamName || 'Team'} vs {gameData.opponentName || 'Opponent'}
                      </h3>
                      <span className={`text-xs uppercase font-semibold tracking-wider ${gameTypeBgColor} ${gameTypeTextColor} px-2.5 py-1 rounded-full whitespace-nowrap shadow-sm`}>
                        {gameTypeDisplay}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-sm text-slate-300">
                      <span className="text-slate-200">
                        {formattedDate}
                        {/* Display location and time if available */}
                        {gameData.gameLocation && (
                            <span className="block text-xs text-slate-400 mt-1">{gameData.gameLocation}</span>
                        )}
                        {gameData.gameTime && (
                            <span className="block text-xs text-slate-400 mt-1">{gameData.gameTime}</span>
                        )}
                      </span>
                      <span className="font-bold text-xl text-yellow-400 tracking-wider">
                        {gameData.homeScore ?? 0} - {gameData.awayScore ?? 0}
                      </span>
                    </div>

                    <div className="flex justify-between items-center mt-3 pt-4 border-t border-slate-600/60">
                      <button 
                        onClick={() => { onLoad(gameId); onClose(); }}
                        className="flex-grow mr-4 px-4 py-2 bg-blue-600 text-white rounded-md shadow hover:bg-blue-700 transition duration-150 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-700 flex items-center justify-center"
                      >
                        <HiOutlineDocumentArrowDown className="w-5 h-5 mr-2" />
                        {t('loadGameModal.loadButton', 'Load Game')}
                      </button>
                    
                      <div className="relative flex-shrink-0">
                        <button
                          onClick={(e) => {
                             e.stopPropagation(); 
                             setOpenMenuId(openMenuId === gameId ? null : gameId);
                          }}
                          className="p-1.5 text-slate-300 rounded hover:bg-slate-600 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-700"
                          title={t('loadGameModal.actionsMenuTooltip', 'Actions') ?? 'Actions'}
                        >
                           <HiOutlineEllipsisVertical className="w-5 h-5" />
                        </button>

                        {openMenuId === gameId && (
                           <div 
                             ref={menuRef} 
                             className={`absolute right-0 bottom-full mb-1 w-48 bg-slate-900 border border-slate-700 rounded-md shadow-lg z-50 py-1`}
                           >
                             
                             <button 
                                onClick={() => { onExportOneJson(gameId); setOpenMenuId(null); }} 
                                className="w-full text-left px-3 py-1.5 text-sm text-slate-200 hover:bg-teal-700 flex items-center"
                              >
                                <HiOutlineDocumentText className="w-4 h-4 mr-2" /> {t('loadGameModal.exportJsonMenuItem', 'JSON')}
                             </button>
                             <button 
                                onClick={() => { onExportOneCsv(gameId); setOpenMenuId(null); }} 
                                className="w-full text-left px-3 py-1.5 text-sm text-slate-200 hover:bg-emerald-700 flex items-center"
                              >
                                <HiOutlineTableCells className="w-4 h-4 mr-2" /> {t('loadGameModal.exportExcelMenuItem', 'EXCEL')}
                             </button>
                             <div className="border-t border-slate-700 my-1"></div>
                             <button 
                                onClick={() => handleDeleteClick(gameId, `${gameData.teamName || 'Team'} vs ${gameData.opponentName || 'Opponent'}`)}
                                className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-red-600 hover:text-white flex items-center"
                             >
                                <HiOutlineTrash className="w-4 h-4 mr-2" /> {t('loadGameModal.deleteMenuItem', 'Delete')}
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
            <p className="text-slate-400 italic text-center py-4">
              {searchText || filterType !== 'all' 
                ? t('loadGameModal.noFilterResults', 'No games match the current filter.')
                : t('loadGameModal.noSavedGames', 'No saved games found.')}
            </p>
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-slate-600 flex-shrink-0">
          <h3 className="text-sm font-medium text-center text-slate-400 mb-3">
            {t('loadGameModal.exportAllTitle', 'Download All Games')}
          </h3>
          
          <div className="flex space-x-2 justify-center">
            <button
              onClick={onExportAllJson}
              disabled={Object.keys(savedGames).length === 0}
              className="px-4 py-2 min-w-[120px] justify-center bg-teal-600 text-white rounded hover:bg-teal-700 transition duration-150 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              title={t('loadGameModal.exportAllJsonTooltip', 'Export all games to JSON') ?? "Export all games to JSON"}
            >
              <HiOutlineDocumentArrowDown className="w-5 h-5 mr-1.5" />
              {t('loadGameModal.exportAllJsonButton', 'JSON')}
            </button>

            <button
              onClick={onExportAllExcel}
              disabled={Object.keys(savedGames).length === 0}
              className="px-4 py-2 min-w-[120px] justify-center bg-emerald-600 text-white rounded hover:bg-emerald-700 transition duration-150 text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
              title={t('loadGameModal.exportAllExcelTooltip', 'Export all games to a CSV file (Excel compatible)') ?? "Export Excel"}
            >
              <HiOutlineDocumentArrowDown className="w-5 h-5 mr-1.5" />
              {t('loadGameModal.exportAllExcelButton', 'EXCEL')}
            </button>
          </div>
          
          <div className="mt-4 flex justify-center">
             <button
               onClick={onClose}
               className="px-4 py-2 min-w-[248px] justify-center bg-slate-700 text-slate-300 rounded hover:bg-slate-600 hover:text-slate-100 transition duration-150 text-sm flex items-center"
             >
               {t('loadGameModal.closeButton', 'Close')}
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadGameModal;