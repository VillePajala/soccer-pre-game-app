'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// REMOVED GameType definition as it's no longer used here
// export type GameType = 'season' | 'tournament'; 

export interface SaveGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (gameName: string) => void;
  teamName: string;
  opponentName: string;
  gameDate: string;
  // Add loading/error state props
  isGameSaving?: boolean;
  gameSaveError?: string | null;
}

const SaveGameModal: React.FC<SaveGameModalProps> = ({
  isOpen,
  onClose,
  onSave,
  teamName,
  opponentName,
  gameDate,
  // Destructure new props
  isGameSaving = false, // Default to false if not provided
  gameSaveError = null,
}) => {
  const { t } = useTranslation();
  const [gameName, setGameName] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset name input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Construct default name if info is available
      let defaultName = '';
      if (teamName && opponentName && gameDate) {
        const formattedTeam = teamName.replace(/\\s+/g, '_');
        const formattedOpponent = opponentName.replace(/\\s+/g, '_');
        defaultName = `${formattedTeam}_vs_${formattedOpponent}_${gameDate}`;
      }
      
      setGameName(defaultName); 
      
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select(); 
      }, 100); 
    }
  }, [isOpen, teamName, opponentName, gameDate]);

  const handleSaveClick = () => {
    const trimmedName = gameName.trim();
    if (trimmedName) {
      onSave(trimmedName); 
      onClose(); 
    } else {
      console.warn("Game name cannot be empty.");
      inputRef.current?.focus(); 
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleSaveClick();
    } else if (event.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-start justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl p-5 w-full max-w-md border border-slate-600 max-h-[calc(100vh-theme(space.8))] overflow-y-auto flex flex-col" style={{minHeight: 'auto'}}>
        <h2 className="text-xl font-semibold mb-6 text-yellow-300 text-center">
          {t('saveGameModal.title', 'Save Game As...')}
        </h2>
        
        <div className="flex-grow overflow-y-auto px-6 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {gameSaveError && (
            <div className="bg-red-700/30 border border-red-600 text-red-300 px-3 py-2 rounded-md text-sm mb-3" role="alert">
              <p>{gameSaveError}</p>
            </div>
          )}
          <label htmlFor="gameName" className="block text-sm font-medium text-slate-300">
            {t('saveGameModal.label', 'Save Game As:')}
          </label>
          <input
            ref={inputRef}
            type="text"
            id="gameName"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            onKeyDown={handleKeyDown}
            className="mt-1 block w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder={`${teamName} vs ${opponentName} (${gameDate})`}
            disabled={isGameSaving}
          />
        </div>

        <div className="flex justify-end items-center pt-4 mt-auto border-t border-slate-700 flex-shrink-0 px-6 pb-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-slate-600 text-slate-200 hover:bg-slate-500 transition-colors text-sm font-medium mr-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isGameSaving}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleSaveClick}
            className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]"
            disabled={!gameName.trim() || isGameSaving}
          >
            {isGameSaving ? (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              t('common.save', 'Save')
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveGameModal;
