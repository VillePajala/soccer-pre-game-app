'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  onDelete?: () => void;
  isSaved?: boolean;
  assessment?: PlayerAssessment;
}

const initialSliders = {
  intensity: 5,
  courage: 5,
  duels: 5,
  technique: 5,
  creativity: 5,
  decisions: 5,
  awareness: 5,
  teamwork: 5,
  fair_play: 5,
  impact: 5,
};

const PlayerAssessmentCard: React.FC<PlayerAssessmentCardProps> = ({ player, onSave, onDelete, isSaved, assessment }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [overall, setOverall] = useState<number>(assessment?.overall ?? 5);
  const [sliders, setSliders] = useState<Record<string, number>>(assessment?.sliders ?? initialSliders);
  const [notes, setNotes] = useState(assessment?.notes ?? '');
  const prev = useRef({ overall, sliders, notes });

  useEffect(() => {
    setOverall(assessment?.overall ?? 5);
    setSliders(assessment?.sliders ?? initialSliders);
    setNotes(assessment?.notes ?? '');
  }, [assessment]);
  const isValid = validateAssessment({ overall, sliders: sliders as PlayerAssessment['sliders'], notes });

  useEffect(() => {
    if (!isValid) return;
    const timeout = setTimeout(() => {
      const current = { overall, sliders, notes };
      if (JSON.stringify(prev.current) !== JSON.stringify(current)) {
        onSave({ overall, sliders: sliders as PlayerAssessment['sliders'], notes });
        prev.current = current;
      }
    }, 800);
    return () => clearTimeout(timeout);
  }, [overall, sliders, notes, isValid, onSave]);

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
      <button
        type="button"
        className="flex items-center justify-between w-full"
        onClick={() => setExpanded(v => !v)}
        aria-expanded={expanded}
        title={expanded ? t('playerAssessmentModal.collapse', { name: player.name }) : t('playerAssessmentModal.expand', { name: player.name })}
      >
        <span className="font-semibold">{player.name}</span>
        {isSaved ? (
          <HiCheckCircle className="text-indigo-400" />
        ) : (
          <HiXCircle className="text-slate-500" />
        )}
      </button>
      {expanded && (
        <div className="mt-2 space-y-3">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-slate-300 w-24 shrink-0">
              {t('playerAssessmentModal.overallLabel', 'Overall')}
            </label>
            <OverallRatingSelector value={overall} onChange={setOverall} />
          </div>
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
              placeholder={t('playerAssessmentModal.notesPlaceholder', 'Add notes...')}
              aria-label={t('playerAssessmentModal.notesPlaceholder', 'Add notes...')}
              rows={3}
            />
            <div className="text-xs text-slate-400 text-right">{notes.length}/280</div>
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
            onClick={handleSave}
            disabled={!isValid}
            aria-label={t('playerAssessmentModal.saveButton', 'Save')}
          >
            {t('playerAssessmentModal.saveButton', 'Save')}
          </button>
          {assessment && onDelete && (
            <button
              type="button"
              className="ml-2 px-3 py-2 rounded-md text-sm font-medium transition-colors bg-red-600 hover:bg-red-700"
              onClick={() => onDelete()}
            >
              {t('playerAssessmentModal.resetButton', 'Reset')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerAssessmentCard;
