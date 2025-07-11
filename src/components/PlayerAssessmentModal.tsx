'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Player, PlayerAssessment } from '@/types';

interface PlayerAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedPlayerIds: string[];
  availablePlayers: Player[];
  onSave: (playerId: string, assessment: Partial<PlayerAssessment>) => void;
}

const PlayerAssessmentModal: React.FC<PlayerAssessmentModalProps> = ({
  isOpen,
  onClose,
  selectedPlayerIds,
  availablePlayers,
  onSave,
}) => {
  const { t } = useTranslation();
  const [ratings, setRatings] = useState<Record<string, number>>({});

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

  const handleSave = (playerId: string) => {
    const overall = ratings[playerId] ?? 3;
    onSave(playerId, { overall });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] font-display">
      <div className={`${modalContainerStyle} bg-noise-texture relative overflow-hidden h-full w-full`}>
        <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light" />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent" />
        <div className="absolute -inset-[50px] bg-sky-400/5 blur-2xl top-0 opacity-50" />
        <div className="absolute -inset-[50px] bg-indigo-600/5 blur-2xl bottom-0 opacity-50" />
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex justify-center items-center pt-10 pb-4 backdrop-blur-sm bg-slate-900/20">
            <h2 className={titleStyle}>{t('playerAssessmentModal.title', 'Assess Players')}</h2>
          </div>
          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 p-4">
            {selectedPlayerIds.map(pid => {
              const player = getPlayer(pid);
              if (!player) return null;
              return (
                <div key={pid} className="p-2 rounded-md border bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 transition-colors">
                  <div className="flex items-center justify-between mb-2 text-slate-100">
                    <span>{player.name}{player.jerseyNumber ? ` #${player.jerseyNumber}` : ''}</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={ratings[pid] ?? 3}
                    onChange={e => setRatings(prev => ({ ...prev, [pid]: Number(e.target.value) }))}
                    className="w-full"
                  />
                  <button onClick={() => handleSave(pid)} className={`${primaryButtonStyle} mt-2`}>
                    {t('playerAssessmentModal.saveButton', 'Save')}
                  </button>
                </div>
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
