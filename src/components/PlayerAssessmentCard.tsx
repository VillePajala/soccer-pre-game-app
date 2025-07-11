'use client';

import React, { useState } from 'react';
import { HiCheckCircle, HiXCircle } from 'react-icons/hi';
import { useTranslation } from 'react-i18next';
import type { Player, PlayerAssessment } from '@/types';
import type { TranslationKey } from '@/i18n-types';
import OverallRatingSelector from './OverallRatingSelector';
import AssessmentSlider from './AssessmentSlider';
import { validateAssessment } from '@/hooks/usePlayerAssessments';

interface PlayerAssessmentCardProps {
  player: Player;
  onSave: (assessment: Partial<PlayerAssessment>) => void;
  isSaved?: boolean;
}

const initialSliders = {
  intensity: 3,
  courage: 3,
  duels: 3,
  technique: 3,
  creativity: 3,
  decisions: 3,
  awareness: 3,
  teamwork: 3,
  fair_play: 3,
  impact: 3,
};

const PlayerAssessmentCard: React.FC<PlayerAssessmentCardProps> = ({ player, onSave, isSaved }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [overall, setOverall] = useState<number>(5);
  const [sliders, setSliders] = useState<Record<string, number>>(initialSliders);
  const [notes, setNotes] = useState('');
  const isValid = validateAssessment({ overall, sliders: sliders as PlayerAssessment['sliders'], notes });

  const handleSliderChange = (key: string, value: number) => {
    setSliders((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    if (!isValid) return;
    onSave({
      overall,
      sliders: sliders as PlayerAssessment['sliders'],
      notes,
    });
    setExpanded(false);
  };

  return (
    <div className="p-2 rounded-md border bg-slate-800/40 border-slate-700/50 hover:bg-slate-800/60 transition-colors text-slate-100">
      <div className="flex items-center justify-between" onClick={() => setExpanded((v) => !v)}>
        <span className="font-semibold">
          {player.name}
          {player.jerseyNumber ? ` #${player.jerseyNumber}` : ''}
        </span>
        {isSaved ? (
          <HiCheckCircle className="text-indigo-400" />
        ) : (
          <HiXCircle className="text-slate-500" />
        )}
      </div>
      {expanded && (
        <div className="mt-2 space-y-3">
          <OverallRatingSelector value={overall} onChange={setOverall} />
          <div className="space-y-2">
            {Object.entries(sliders).map(([key, value]) => (
              <AssessmentSlider
                key={key}
                label={t(`assessmentMetrics.${key}` as TranslationKey, key)}
                value={value}
                onChange={(v) => handleSliderChange(key, v)}
              />
            ))}
          </div>
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={280}
              className="w-full bg-slate-700 border border-slate-600 rounded-md text-white p-2"
              rows={3}
            />
            <div className="text-xs text-slate-400 text-right">{notes.length}/280</div>
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={!isValid}
          >
            {t('playerAssessmentModal.saveButton', 'Save')}
          </button>
        </div>
      )}
    </div>
  );
};

export default PlayerAssessmentCard;
