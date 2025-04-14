'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface NewGameSetupModalProps {
  isOpen: boolean;
  onStart: (opponentName: string, gameDate: string) => void;
  onCancel: () => void;
}

const NewGameSetupModal: React.FC<NewGameSetupModalProps> = ({
  isOpen,
  onStart,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [opponentName, setOpponentName] = useState('');
  const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const opponentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setOpponentName('');
      setGameDate(new Date().toISOString().split('T')[0]);
      // Focus the opponent name input shortly after modal opens
      setTimeout(() => {
        opponentInputRef.current?.focus();
      }, 100); 
    }
  }, [isOpen]);

  const handleStartClick = () => {
    // Trim opponent name, allow empty date (defaults in finalize handler)
    onStart(opponentName.trim(), gameDate); 
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleStartClick();
    } else if (event.key === 'Escape') {
      onCancel();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4"> {/* Increased z-index */} 
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-slate-600">
        <h2 className="text-xl font-semibold mb-5 text-yellow-300">
          {t('newGameSetupModal.title', 'New Game Setup')}
        </h2>
        
        {/* Opponent Name Input */}
        <div className="mb-4">
          <label htmlFor="opponentNameInput" className="block text-sm font-medium text-slate-300 mb-1">
            {t('newGameSetupModal.opponentLabel', 'Opponent Name:')}
          </label>
          <input
            ref={opponentInputRef}
            type="text"
            id="opponentNameInput"
            value={opponentName}
            onChange={(e) => setOpponentName(e.target.value)}
            onKeyDown={handleKeyDown} // Handle Enter/Escape
            placeholder={t('newGameSetupModal.opponentPlaceholder', 'Enter opponent name') ?? undefined}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Game Date Input */}
        <div className="mb-6">
          <label htmlFor="gameDateInput" className="block text-sm font-medium text-slate-300 mb-1">
            {t('newGameSetupModal.dateLabel', 'Game Date:')}
          </label>
          <input
            type="date"
            id="gameDateInput"
            value={gameDate}
            onChange={(e) => setGameDate(e.target.value)}
            onKeyDown={handleKeyDown} // Handle Enter/Escape
            className="w-full px-3 py-2 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Action Buttons - Centered */}
        <div className="flex justify-center space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 transition duration-150 text-sm"
          >
            {t('newGameSetupModal.cancelButton', 'Cancel')}
          </button>
          <button
            onClick={handleStartClick}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-150 text-sm"
          >
            {t('newGameSetupModal.startButton', 'Start Game')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewGameSetupModal;