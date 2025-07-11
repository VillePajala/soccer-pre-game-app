'use client';

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Player } from '@/types';
import OverallRatingSelector from './OverallRatingSelector';
import AssessmentSlider from './AssessmentSlider';

interface PlayerAssessmentCardProps {
  player: Player;
  onSave: (data: { overall: number; sliders: { [key: string]: number }; notes: string }) => void;
}

const metrics = ['intensity', 'courage', 'duels', 'technique', 'creativity', 'decisions', 'awareness', 'teamwork', 'fair_play', 'impact'];

const PlayerAssessmentCard: React.FC<PlayerAssessmentCardProps> = ({ player, onSave }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [overall, setOverall] = useState<number | null>(null);
  const [sliders, setSliders] = useState<Record<string, number>>(
    Object.fromEntries(metrics.map((m) => [m, 3]))
  );
  const [notes, setNotes] = useState('');
  const isValid = overall !== null && notes.length <= 280;

  const handleSave = () => {
    if (!isValid || overall === null) return;
    onSave({ overall, sliders, notes });
    setOpen(false);
  };

  return (
    <div className={`p-2 rounded-md border cursor-pointer ${open ? 'bg-slate-700/75 border-indigo-500' : 'bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 transition-colors'}`}
      onClick={() => setOpen(!open)}
    >
      <div className="flex justify-between items-center">
        <span className="text-slate-100 font-medium">
          {player.jerseyNumber ? `#${player.jerseyNumber}` : ''} {player.name}
        </span>
        {open ? (
          <span className="text-yellow-400">{t('common.close', 'Close')}</span>
        ) : (
          <span className="text-slate-400">{t('common.edit', 'Edit')}</span>
        )}
      </div>
      {open && (
        <div className="mt-3 space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-slate-200 mr-2">{t('playerAssessmentModal.overall', 'Overall')}</span>
            <OverallRatingSelector value={overall} onChange={setOverall} />
          </div>
          <div className="flex gap-2 overflow-x-auto py-2">
            {metrics.map((metric) => (
              <AssessmentSlider
                key={metric}
                label={t(`playerAssessmentModal.${metric}`, metric)}
                value={sliders[metric]}
                onChange={(v) => setSliders((s) => ({ ...s, [metric]: v }))}
              />
            ))}
          </div>
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={280}
              className="w-full bg-slate-700 border border-slate-600 rounded-md text-sm text-slate-100 p-2"
              placeholder={t('playerAssessmentModal.notesPlaceholder', 'Notes...')}
            />
            <div className="text-right text-xs text-slate-400">
              {notes.length}/280
            </div>
          </div>
          <button
            type="button"
            disabled={!isValid}
            onClick={handleSave}
            className="px-3 py-1 rounded-md bg-indigo-600 text-white disabled:opacity-50"
          >
            {t('common.saveButton', 'Save')}
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerAssessmentCard;
