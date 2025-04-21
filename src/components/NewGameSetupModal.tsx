'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GameType } from './SaveGameModal';

interface NewGameSetupModalProps {
  isOpen: boolean;
  onStart: (opponentName: string, gameDate: string, gameType: GameType, gameLocation: string, gameTime: string) => void;
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
  const [gameType, setGameType] = useState<GameType>('season');
  const [gameLocation, setGameLocation] = useState('');
  const [gameHour, setGameHour] = useState<string>('');
  const [gameMinute, setGameMinute] = useState<string>('');
  const opponentInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setOpponentName('');
      setGameDate(new Date().toISOString().split('T')[0]);
      setGameType('season');
      setGameLocation('');
      setGameHour('');
      setGameMinute('');
      setTimeout(() => {
        opponentInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const handleStartClick = () => {
    const trimmedOpponentName = opponentName.trim();
    if (!trimmedOpponentName) {
      alert(t('newGameSetupModal.opponentRequiredAlert', 'Please enter an opponent name.'));
      opponentInputRef.current?.focus();
      return;
    }

    const hour = parseInt(gameHour, 10);
    const minute = parseInt(gameMinute, 10);
    let combinedTime = '';

    if (gameHour === '' && gameMinute === '') {
      combinedTime = '';
    } else if (!isNaN(hour) && !isNaN(minute) && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      combinedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    } else {
      alert(t('newGameSetupModal.invalidTimeAlert', 'Please enter a valid time (Hour 0-23, Minute 0-59) or leave both fields empty.'));
      return;
    }

    onStart(trimmedOpponentName, gameDate, gameType, gameLocation.trim(), combinedTime);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleStartClick();
    } else if (event.key === 'Escape') {
      onCancel();
    }
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 2) {
      setGameHour(value);
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 2) {
      setGameMinute(value);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md border border-slate-600">
        <h2 className="text-xl font-semibold mb-5 text-yellow-300">
          {t('newGameSetupModal.title')}
        </h2>
        
        <div className="mb-4">
          <label htmlFor="opponentNameInput" className="block text-sm font-medium text-slate-300 mb-1">
            {t('newGameSetupModal.opponentLabel')}
          </label>
          <input
            ref={opponentInputRef}
            type="text"
            id="opponentNameInput"
            value={opponentName}
            onChange={(e) => setOpponentName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('newGameSetupModal.opponentPlaceholder') ?? undefined}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="mb-6">
          <label htmlFor="gameDateInput" className="block text-sm font-medium text-slate-300 mb-1">
            {t('newGameSetupModal.dateLabel')}
          </label>
          <input
            type="date"
            id="gameDateInput"
            value={gameDate}
            onChange={(e) => setGameDate(e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="mb-4">
          <label htmlFor="gameLocationInput" className="block text-sm font-medium text-slate-300 mb-1">
            {t('newGameSetupModal.locationLabel', 'Location (Optional)')}
          </label>
          <input
            type="text"
            id="gameLocationInput"
            value={gameLocation}
            onChange={(e) => setGameLocation(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('newGameSetupModal.locationPlaceholder', 'e.g., Home Field, Stadium X') ?? undefined}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t('newGameSetupModal.timeLabel', 'Time (HH:MM) (Optional)')}
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              id="gameHourInput"
              value={gameHour}
              onChange={handleHourChange}
              onKeyDown={handleKeyDown}
              placeholder={t('newGameSetupModal.hourPlaceholder', 'HH') ?? 'HH'}
              min="0"
              max="23"
              className="w-1/2 px-3 py-2 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center"
            />
            <span className="text-slate-400 font-bold">:</span>
            <input
              type="number"
              id="gameMinuteInput"
              value={gameMinute}
              onChange={handleMinuteChange}
              onKeyDown={handleKeyDown}
              placeholder={t('newGameSetupModal.minutePlaceholder', 'MM') ?? 'MM'}
              min="0"
              max="59"
              className="w-1/2 px-3 py-2 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center"
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {t('newGameSetupModal.gameTypeLabel', 'Game Type:')}
          </label>
          <div className="flex space-x-4">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="newGameType"
                value="season"
                checked={gameType === 'season'}
                onChange={() => setGameType('season')}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-slate-500 bg-slate-700"
              />
              <span className="text-sm text-slate-200">{t('newGameSetupModal.gameTypeSeason', 'Season')}</span>
            </label>
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="radio"
                name="newGameType"
                value="tournament"
                checked={gameType === 'tournament'}
                onChange={() => setGameType('tournament')}
                className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-slate-500 bg-slate-700"
              />
              <span className="text-sm text-slate-200">{t('newGameSetupModal.gameTypeTournament', 'Tournament')}</span>
            </label>
          </div>
        </div>

        <div className="flex justify-center space-x-3">
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 transition-colors text-sm"
          >
            {t('newGameSetupModal.skipButton', 'Skip (No Auto-Save)')}
          </button>
          <button
            onClick={handleStartClick}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-150 text-sm"
          >
            {t('newGameSetupModal.startButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewGameSetupModal;