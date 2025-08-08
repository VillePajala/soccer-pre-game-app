'use client';

import React, { useState, useMemo, useEffect } from 'react'; // Added useEffect
import { useTranslation } from 'react-i18next'; 
import { useToast } from '@/contexts/ToastProvider';
import { Player } from '@/types'; // Import from types instead of page
import logger from '@/utils/logger';
import MigrationErrorBoundary from './MigrationErrorBoundary';

interface GoalLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogGoal: (scorerId: string, assisterId?: string) => void; // For logging own team's goal
  onLogOpponentGoal: (time: number) => void; // ADDED: Handler for opponent goal
  availablePlayers: Player[];
  currentTime: number; // timeElapsedInSeconds
}

const GoalLogModal: React.FC<GoalLogModalProps> = ({
  isOpen,
  onClose,
  onLogGoal,
  onLogOpponentGoal, // ADDED: Destructure the new handler
  availablePlayers,
  currentTime,
}) => {
  const { t } = useTranslation(); 
  const { showToast } = useToast();

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
      // Validate that scorer exists in available players
        const scorer = availablePlayers.find(p => p.id === scorerId);
        if (!scorer) {
          showToast(t('goalLogModal.scorerNotFound', 'Selected scorer is no longer available'), 'error');
          setScorerId(''); // Clear invalid selection
          return;
        }
      
      // Validate that assister exists if selected
        if (assisterId) {
        const assister = availablePlayers.find(p => p.id === assisterId);
        if (!assister) {
          showToast(t('goalLogModal.assisterNotFound', 'Selected assister is no longer available'), 'error');
          setAssisterId(''); // Clear invalid selection
          return;
        }
      }
      
      // Call the goal logging function - it will handle the modal closing
      try {
        onLogGoal(scorerId, assisterId || undefined); // Pass undefined if assisterId is empty
        // Don't call onClose() here - let the success handler close the modal
      } catch (error) {
        logger.error('Error logging goal:', error);
        // Modal stays open for retry
      }
    } else {
      showToast(t('goalLogModal.selectScorer', 'Please select a scorer'), 'info');
    }
  };

  // Handler for the new Opponent Goal button
  const handleLogOpponentGoalClick = () => {
    try {
      onLogOpponentGoal(currentTime); // Call the passed handler with the current time
      // Don't call onClose() here - let the success handler close the modal
    } catch (error) {
      logger.error('Error logging opponent goal:', error);
      showToast(t('goalLogModal.opponentLogFailed', 'Failed to log opponent goal. Please try again.'), 'error');
      // Modal stays open for retry
    }
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
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] font-display">
      <div className="bg-slate-800 flex flex-col h-full w-full bg-noise-texture relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light pointer-events-none" />

        {/* Header */}
        <div className="flex justify-center items-center pt-10 pb-4 px-6 backdrop-blur-sm bg-slate-900/20 border-b border-slate-700/20 flex-shrink-0">
          <h2 className="text-3xl font-bold text-yellow-400 tracking-wide drop-shadow-lg">
            {t('goalLogModal.title', 'Log Goal Event')}
          </h2>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-6 space-y-6">
          <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
            <div className="text-center text-lg mb-4">
              <span className="text-slate-300">{t('goalLogModal.timeLabel', 'Time')}: </span>
              <span className="font-semibold text-yellow-400 font-mono text-xl">{formatTime(currentTime)}</span>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="scorerSelect" className="block text-sm font-medium text-slate-300 mb-1">
                  {t('goalLogModal.scorerLabel', 'Scorer')} <span className="text-red-500">*</span>
                </label>
                <select
                  id="scorerSelect"
                  value={scorerId}
                  onChange={(e) => {
                    setScorerId(e.target.value);
                    if (e.target.value && e.target.value === assisterId) {
                      setAssisterId('');
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="" disabled>{t('goalLogModal.selectPlaceholder', '-- Select Scorer --')}</option>
                  {playerOptions}
                </select>
              </div>

              <div>
                <label htmlFor="assisterSelect" className="block text-sm font-medium text-slate-300 mb-1">
                  {t('goalLogModal.assisterLabel', 'Assister (Optional)')}
                </label>
                <select
                  id="assisterSelect"
                  value={assisterId}
                  onChange={(e) => setAssisterId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  disabled={!scorerId}
                >
                  <option value="">{t('goalLogModal.noAssisterPlaceholder', '-- No Assist --')}</option>
                  {availablePlayers.filter(p => p.id !== scorerId).map(player => (
                    <option key={player.id} value={player.id}>{player.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700/20 backdrop-blur-sm bg-slate-900/20 flex-shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={handleLogOwnGoalClick}
              disabled={!scorerId}
              className="w-full px-4 py-2 rounded-md font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('goalLogModal.logGoalButton', 'Log Goal')}
            </button>
            <button
              type="button"
              onClick={handleLogOpponentGoalClick}
              className="w-full px-4 py-2 rounded-md font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
              title={t('goalLogModal.logOpponentGoalTooltip', 'Record a goal for the opponent at the current game time') ?? undefined}
            >
              {t('goalLogModal.logOpponentGoalButtonShort', 'Opponent +1')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full px-4 py-2 rounded-md font-semibold text-slate-200 bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              {t('common.cancel', 'Cancel')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Wrapped component with error boundary
const GoalLogModalWithErrorBoundary: React.FC<GoalLogModalProps> = (props) => (
  <MigrationErrorBoundary componentName="GoalLogModal">
    <GoalLogModal {...props} />
  </MigrationErrorBoundary>
);

export default React.memo(GoalLogModalWithErrorBoundary);