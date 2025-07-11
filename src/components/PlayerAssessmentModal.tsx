'use client';

import React from 'react';
import { useTranslation } from 'react-i18next';
import type { Player } from '@/types';
import PlayerAssessmentCard from './PlayerAssessmentCard';

interface PlayerAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onSaveAssessment: (playerId: string, data: { overall: number; sliders: { [key: string]: number }; notes: string }) => void;
}

const PlayerAssessmentModal: React.FC<PlayerAssessmentModalProps> = ({
  isOpen,
  onClose,
  players,
  onSaveAssessment,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] font-display">
      <div className="bg-slate-800 bg-noise-texture relative overflow-hidden flex flex-col h-full w-full">
        <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light" />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent" />
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex justify-between items-center py-4 px-4 border-b border-slate-700/40 backdrop-blur-sm bg-slate-900/20">
            <h2 className="text-2xl font-bold text-yellow-400">
              {t('playerAssessmentModal.title', 'Player Assessments')}
            </h2>
            <button onClick={onClose} aria-label={t('common.close', 'Close')} className="text-slate-100 hover:text-yellow-400">
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {players.map((player) => (
              <PlayerAssessmentCard
                key={player.id}
                player={player}
                onSave={(data) => onSaveAssessment(player.id, data)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerAssessmentModal;

