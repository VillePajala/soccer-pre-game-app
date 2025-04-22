'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

// REMOVED GameType definition as it's no longer used here
// export type GameType = 'season' | 'tournament'; 

interface SaveGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Update onSave signature - no longer needs gameType
  onSave: (gameName: string) => void; 
  // Pass current info to suggest a default name
  teamName?: string;
  opponentName?: string;
  gameDate?: string;
  // REMOVED currentGameType prop
  // currentGameType?: GameType; 
}

const SaveGameModal: React.FC<SaveGameModalProps> = ({
  isOpen,
  onClose,
  onSave,
  teamName = '',
  opponentName = '',
  gameDate = '',
  // REMOVED currentGameType prop usage
}) => {
  const { t } = useTranslation();
  const [gameName, setGameName] = useState('');
  // REMOVED gameType state
  // const [gameType, setGameType] = useState<GameType>(currentGameType);
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
      // REMOVED setGameType call
      // setGameType(currentGameType); 
      
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select(); 
      }, 100); 
    }
  }, [isOpen, teamName, opponentName, gameDate]); // REMOVED currentGameType from dependency array

  const handleSaveClick = () => {
    const trimmedName = gameName.trim();
    if (trimmedName) {
      // Call onSave without gameType
      onSave(trimmedName); 
      onClose(); 
    } else {
      console.warn("Game name cannot be empty.");
      inputRef.current?.focus(); 
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => { // Simplified type
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
        
        <div className="mb-4">
          <label htmlFor="gameNameInput" className="block text-sm font-medium text-slate-300 mb-1">
            {t('saveGameModal.label', 'Game Name:')}
          </label>
          <input
            ref={inputRef}
            type="text"
            id="gameNameInput"
            value={gameName}
            onChange={(e) => setGameName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('saveGameModal.placeholder', 'e.g., vs Lapa FC (Home)') ?? undefined}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>

        <div className="flex justify-center space-x-3 mt-auto pt-4 border-t border-slate-700/50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 transition duration-150 text-sm"
          >
            {t('saveGameModal.cancelButton', 'Cancel')}
          </button>
          <button
            onClick={handleSaveClick}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-150 text-sm"
          >
            {t('saveGameModal.saveButton', 'Save Game')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveGameModal;
