'use client';

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { Player, PlayerAssessment } from '@/types';
import PlayerAssessmentCard from './PlayerAssessmentCard';
import ProgressBar from './ProgressBar';

interface PlayerAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlayerIds: string[];
  availablePlayers: Player[];
  assessments: { [id: string]: PlayerAssessment };
  onSave: (playerId: string, assessment: Partial<PlayerAssessment>) => void;
  onDelete?: (playerId: string) => void;
}

const PlayerAssessmentModal: React.FC<PlayerAssessmentModalProps> = ({
  isOpen,
  onClose,
  selectedPlayerIds,
  availablePlayers,
  assessments,
  onSave,
  onDelete,
}) => {
  const { t } = useTranslation();
  const [savedIds, setSavedIds] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setSavedIds(Object.keys(assessments || {}));
    }
  }, [isOpen, assessments]);

  if (!isOpen) return null;

  const modalContainerStyle =
    'bg-slate-800 rounded-none shadow-xl flex flex-col border-0 overflow-hidden';
  const titleStyle =
    'text-3xl font-bold text-yellow-400 tracking-wide drop-shadow-lg';
  const buttonBaseStyle =
    'px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 disabled:opacity-50 disabled:cursor-not-allowed';
  const primaryButtonStyle =
    `${buttonBaseStyle} bg-gradient-to-b from-indigo-500 to-indigo-600 text-white hover:from-indigo-600 hover:to-indigo-700 shadow-lg`;

  const getPlayer = (id: string) => availablePlayers.find(p => p.id === id);

  const handleSave = async (playerId: string, assessment: Partial<PlayerAssessment>) => {
    await onSave(playerId, assessment);
    setSavedIds(prev => (prev.includes(playerId) ? prev : [...prev, playerId]));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] font-display">
      <div className={`${modalContainerStyle} bg-noise-texture relative overflow-hidden h-full w-full`}>
        <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light" />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent" />
        <div className="absolute -inset-[50px] bg-sky-400/5 blur-2xl top-0 opacity-50" />
        <div className="absolute -inset-[50px] bg-indigo-600/5 blur-2xl bottom-0 opacity-50" />
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex flex-col items-center pt-10 pb-4 backdrop-blur-sm bg-slate-900/20 space-y-2">
            <h2 className={titleStyle}>
              {t('playerAssessmentModal.title', 'Assess Players')} {savedIds.length}/{selectedPlayerIds.length}
            </h2>
            <div className="w-1/2">
              <ProgressBar current={savedIds.length} total={selectedPlayerIds.length} />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 p-4">
            {selectedPlayerIds.map(pid => {
              const player = getPlayer(pid);
              if (!player) return null;
              return (
                <PlayerAssessmentCard
                  key={pid}
                  player={player}
                  isSaved={savedIds.includes(pid)}
                  assessment={assessments[pid]}
                  onSave={(assessment) => handleSave(pid, assessment)}
                  onDelete={onDelete ? () => onDelete(pid) : undefined}
                />
              );
            })}
            {selectedPlayerIds.length === 0 && (
              <p className="text-slate-300">{t('playerAssessmentModal.noPlayers', 'No players selected')}</p>
            )}
          </div>
          <div className="p-4 border-t border-slate-700/20 backdrop-blur-sm bg-slate-900/20 flex justify-end">
            <button onClick={onClose} className={primaryButtonStyle}>
              {t('common.close', 'Close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerAssessmentModal;
