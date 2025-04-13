'use client';

import React, { useState, useMemo, useEffect } from 'react'; // Added useEffect
import { useTranslation } from 'react-i18next';
import { Player } from '@/app/page'; // Remove GameEvent import

interface GoalLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogGoal: (scorerId: string, assisterId?: string) => void; // For logging own team's goal
  onLogOpponentGoal?: (time: number) => void; // NEW: For logging opponent's goal
  availablePlayers: Player[];
  currentTime: number; // timeElapsedInSeconds
}

const GoalLogModal: React.FC<GoalLogModalProps> = ({
  isOpen,
  onClose,
  onLogGoal,
  onLogOpponentGoal = () => { console.warn('onLogOpponentGoal handler not provided'); }, // Default handler
  availablePlayers,
  currentTime,
}) => {
  const { t } = useTranslation();
  const [scorerId, setScorerId] = useState<string>('');
  const [assisterId, setAssisterId] = useState<string>(''); // Empty string means no assist

  // Format time MM:SS
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Memoize player options to avoid recalculating on every render
  const playerOptions = useMemo(() => {
    // Sort players alphabetically for easier selection
    const sortedPlayers = [...availablePlayers].sort((a, b) => a.name.localeCompare(b.name));
    return sortedPlayers.map(player => (
      <option key={player.id} value={player.id}>
        {player.name}
      </option>
    ));
  }, [availablePlayers]);

  const handleLogOwnGoalClick = () => {
    if (scorerId) {
      onLogGoal(scorerId, assisterId || undefined); // Pass undefined if assisterId is empty
    }
  };

  const handleLogOpponentGoalClick = () => {
      onLogOpponentGoal(currentTime);
      // No need to reset scorer/assister here as they weren't used
      // Modal close is handled in the parent handler now
  };

  // Reset state when modal closes (or opens)
  useEffect(() => {
      if (isOpen) {
          setScorerId('');
          setAssisterId('');
      }
  }, [isOpen]);


  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose} // Close modal on overlay click
    >
      <div
        className="bg-slate-800 rounded-lg p-6 max-w-sm w-full text-slate-200 shadow-xl relative"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-slate-400 hover:text-slate-100 text-2xl font-bold z-10"
          aria-label={t('goalLogModal.closeButton', 'Close') ?? "Close"}
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4 text-yellow-400 text-center">
          {t('goalLogModal.title', 'Log Goal Event')}
        </h2>

        <div className="space-y-4">
          {/* Time Display */}
          <div className="text-center text-lg">
             {t('goalLogModal.timeLabel', 'Time')}: <span className="font-semibold text-yellow-300">{formatTime(currentTime)}</span>
          </div>

          {/* Scorer Selection */}
          <div>
            <label htmlFor="scorerSelect" className="block text-sm font-medium text-slate-300 mb-1">
              {t('goalLogModal.scorerLabel', 'Scorer')} <span className="text-red-500">*</span>
            </label>
            <select
              id="scorerSelect"
              value={scorerId}
              onChange={(e) => {
                setScorerId(e.target.value);
                // If the new scorer is the same as the current assister, clear the assist
                if (e.target.value && e.target.value === assisterId) {
                  setAssisterId('');
                }
              }}
              className="block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white"
            >
              <option value="" disabled>
                {t('goalLogModal.selectPlaceholder', '-- Select Scorer --')}
              </option>
              {playerOptions}
            </select>
          </div>

          {/* Assister Selection */}
          <div>
            <label htmlFor="assisterSelect" className="block text-sm font-medium text-slate-300 mb-1">
              {t('goalLogModal.assisterLabel', 'Assister (Optional)')}
            </label>
            <select
              id="assisterSelect"
              value={assisterId}
              onChange={(e) => setAssisterId(e.target.value)}
              className="block w-full bg-slate-700 border border-slate-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-white"
              disabled={!scorerId} // Disable if no scorer selected
            >
              <option value="">
                {t('goalLogModal.noAssisterPlaceholder', '-- No Assist --')}
              </option>
              {/* Filter out the selected scorer from assist options */}
              {availablePlayers
                .filter(player => player.id !== scorerId) // Exclude scorer
                .sort((a, b) => a.name.localeCompare(b.name)) // Sort alphabetically
                .map(player => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-white rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500 focus:ring-offset-slate-800"
              >
                {t('goalLogModal.cancelButton', 'Cancel')}
              </button>
              
              <button
                type="button"
                onClick={handleLogOwnGoalClick}
                disabled={!scorerId}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('goalLogModal.logButton', 'Log Goal')}
              </button>

             {/* Log Opponent Goal Button */}
             <button
                type="button"
                onClick={handleLogOpponentGoalClick}
                className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 focus:ring-offset-slate-800"
              >
                {t('goalLogModal.logOpponentButton', 'Log Opponent Goal')}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalLogModal;