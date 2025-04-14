'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface SaveGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (gameName: string) => void;
  // Pass current info to suggest a default name
  teamName?: string;
  opponentName?: string;
  gameDate?: string;
}

const SaveGameModal: React.FC<SaveGameModalProps> = ({
  isOpen,
  onClose,
  onSave,
  teamName = '',
  opponentName = '',
  gameDate = '',
}) => {
  const { t } = useTranslation();
  const [gameName, setGameName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset name input when modal opens, using suggested name
  useEffect(() => {
    if (isOpen) {
      // Construct default name if info is available
      let defaultName = '';
      if (teamName && opponentName && gameDate) {
        // Format: Home_vs_Away_YYYY-MM-DD
        const formattedTeam = teamName.replace(/\\s+/g, '_');
        const formattedOpponent = opponentName.replace(/\\s+/g, '_');
        defaultName = `${formattedTeam}_vs_${formattedOpponent}_${gameDate}`;
      }
      
      setGameName(defaultName); // Set the generated or empty name
      // Focus the input field shortly after modal opens
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select(); // Select the text for easy replacement
      }, 100); 
    }
  }, [isOpen, teamName, opponentName, gameDate]); // Add new props to dependency array

  const handleSaveClick = () => {
    const trimmedName = gameName.trim();
    if (trimmedName) {
      onSave(trimmedName);
      onClose(); // Close modal after saving
    } else {
      // Optionally show an error/prompt if the name is empty
      console.warn("Game name cannot be empty.");
      inputRef.current?.focus(); // Refocus input
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
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl p-5 w-full max-w-md border border-slate-600">
        <h2 className="text-xl font-semibold mb-4 text-yellow-300">
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
            className="w-full px-3 py-2 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex justify-end space-x-3">
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
