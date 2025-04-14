'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { SavedGamesCollection } from '@/app/page'; // Adjust path if necessary
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
  const menuRef = useRef<HTMLDivElement>(null);

  // Get the list of actual saved game IDs (excluding the default/unsaved state)
  const savedGameIds = Object.keys(savedGames).filter(id => id !== DEFAULT_GAME_ID);

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl p-5 w-full max-w-lg border border-slate-600 flex flex-col max-h-[80vh]">
        <h2 className="text-xl font-semibold mb-4 text-yellow-300 flex-shrink-0">
          {t('loadGameModal.title', 'Load Game')}
        </h2>

        <div 
          className="flex-grow mb-4 pr-2"
        >
          {savedGameIds.length > 0 ? (
            <ul className="space-y-2">
              {savedGameIds.map((gameId) => (
                <li key={gameId} className="relative flex items-center justify-between bg-slate-700/50 p-2 rounded-md">
                  <button 
                    onClick={() => { onLoad(gameId); onClose(); }}
                    className="flex-grow text-left text-slate-100 truncate mr-2 p-1 rounded hover:bg-slate-600/50 focus:outline-none focus:ring-1 focus:ring-indigo-400" 
                    title={`${t('loadGameModal.loadButtonTooltip', 'Load this game')}: ${gameId}`}
                  >
                    {gameId}
                  </button>
                  
                  <div className="flex-shrink-0">
                    <button
                      onClick={(e) => {
                         e.stopPropagation(); 
                         setOpenMenuId(openMenuId === gameId ? null : gameId);
                      }}
                      className="p-1.5 text-slate-300 rounded hover:bg-slate-600 hover:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-slate-800"
                      title={t('loadGameModal.actionsMenuTooltip', 'Actions') ?? 'Actions'}
                    >
                       <HiOutlineEllipsisVertical className="w-5 h-5" />
                    </button>

                    {openMenuId === gameId && (
                       <div 
                         ref={menuRef} 
                         className={`absolute right-0 top-full mt-1 w-48 bg-slate-900 border border-slate-700 rounded-md shadow-lg z-50 py-1`}
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
                            onClick={() => handleDeleteClick(gameId, gameId)}
                            className="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-red-600 hover:text-white flex items-center"
                         >
                            <HiOutlineTrash className="w-4 h-4 mr-2" /> {t('loadGameModal.deleteMenuItem', 'Delete')}
                         </button>
                       </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400 italic text-center py-4">
              {t('loadGameModal.noSavedGames', 'No saved games found.')}
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