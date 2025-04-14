'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import { SavedGamesCollection } from '@/app/page'; // Adjust path if necessary
import { FaTrashAlt, FaFolderOpen } from 'react-icons/fa'; // Or other appropriate icons

interface LoadGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoad: (gameId: string) => void;
  onDelete: (gameId: string) => void;
  savedGames: SavedGamesCollection;
}

// Define the default game ID constant if not imported (consider sharing from page.tsx)
const DEFAULT_GAME_ID = '__default_unsaved__'; 

const LoadGameModal: React.FC<LoadGameModalProps> = ({
  isOpen,
  onClose,
  onLoad,
  onDelete,
  savedGames,
}) => {
  const { t } = useTranslation();

  // Get the list of actual saved game IDs (excluding the default/unsaved state)
  const savedGameIds = Object.keys(savedGames).filter(id => id !== DEFAULT_GAME_ID);

  const handleDeleteClick = (gameId: string, gameName: string) => {
    // Use a confirmation dialog
    if (window.confirm(t('loadGameModal.deleteConfirm', `Are you sure you want to delete the saved game "${gameName}"? This action cannot be undone.`)?.replace('{gameName}', gameName))) {
      onDelete(gameId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl p-5 w-full max-w-lg border border-slate-600 flex flex-col max-h-[80vh]">
        <h2 className="text-xl font-semibold mb-4 text-yellow-300 flex-shrink-0">
          {t('loadGameModal.title', 'Load Game')}
        </h2>

        <div className="flex-grow overflow-y-auto mb-4 pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
          {savedGameIds.length > 0 ? (
            <ul className="space-y-2">
              {savedGameIds.map((gameId) => (
                <li key={gameId} className="flex items-center justify-between bg-slate-700/50 p-2 rounded-md">
                  <span className="text-slate-100 truncate mr-2" title={gameId}>
                    {gameId} {/* Display the game name/ID */}
                  </span>
                  <div className="flex space-x-2 flex-shrink-0">
                    <button
                      onClick={() => onLoad(gameId)}
                      className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-150 text-xs"
                      title={t('loadGameModal.loadButtonTooltip', 'Load this game') ?? 'Load'}
                    >
                       <FaFolderOpen />
                    </button>
                    <button
                      onClick={() => handleDeleteClick(gameId, gameId)} // Pass name for confirmation
                      className="p-1.5 bg-red-600 text-white rounded hover:bg-red-700 transition duration-150 text-xs"
                       title={t('loadGameModal.deleteButtonTooltip', 'Delete this saved game') ?? 'Delete'}
                    >
                       <FaTrashAlt />
                    </button>
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

        <div className="flex justify-end mt-auto flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 transition duration-150 text-sm"
          >
            {t('loadGameModal.closeButton', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadGameModal;