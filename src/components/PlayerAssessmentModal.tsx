'use client';
import React, { useState } from 'react';
import { Player, PlayerAssessment } from '@/types';
import { useTranslation } from 'react-i18next';

interface PlayerAssessmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  players: Player[];
  onSave: (playerId: string, data: PlayerAssessment) => void;
}

const sliderDefs = [
  'intensity',
  'courage',
  'duels',
  'technique',
  'creativity',
  'decisions',
  'awareness',
  'teamwork',
  'fair_play',
  'impact'
] as const;

type SliderKey = typeof sliderDefs[number];

const defaultAssessment = (): PlayerAssessment => ({
  overall: 6,
  sliders: {
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
  },
  notes: '',
  minutesPlayed: 0,
  createdAt: new Date().toISOString(),
  createdBy: 'local',
});

const PlayerAssessmentModal: React.FC<PlayerAssessmentModalProps> = ({
  isOpen,
  onClose,
  players,
  onSave,
}) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [data, setData] = useState<Record<string, PlayerAssessment>>(() => {
    const obj: Record<string, PlayerAssessment> = {};
    players.forEach(p => {
      obj[p.id] = defaultAssessment();
    });
    return obj;
  });

  if (!isOpen) return null;

  const handleSliderChange = (
    pid: string,
    key: SliderKey,
    value: number
  ) => {
    setData(prev => ({
      ...prev,
      [pid]: {
        ...prev[pid],
        sliders: { ...prev[pid].sliders, [key]: value },
      },
    }));
  };

  const handleOverallChange = (pid: string, value: number) => {
    setData(prev => ({
      ...prev,
      [pid]: { ...prev[pid], overall: value },
    }));
  };

  const handleNotesChange = (pid: string, text: string) => {
    setData(prev => ({
      ...prev,
      [pid]: { ...prev[pid], notes: text.slice(0, 280) },
    }));
  };

  const handleSave = (pid: string) => {
    onSave(pid, data[pid]);
    setCompleted(prev => new Set(prev).add(pid));
    setExpanded(null);
  };

  const total = players.length;
  const done = completed.size;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[60] font-display">
      <div className="bg-slate-800 flex flex-col h-full w-full overflow-y-auto">
        <div className="pt-10 pb-4 px-6 backdrop-blur-sm bg-slate-900/20 border-b border-slate-700/20 flex-shrink-0 flex items-center justify-between">
          <h2 className="text-3xl font-bold text-yellow-400 tracking-wide drop-shadow-lg">
            {t('playerAssessment.title', 'Player Assessment')}
          </h2>
          <div className="text-slate-200">
            {t('playerAssessment.assessedCount', {
              done,
              total,
            })}
            {done === total && <span className="ml-2 text-green-400">✔</span>}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-4">
          {players.map(p => {
            const assess = data[p.id];
            const isOpenCard = expanded === p.id;
            const isDone = completed.has(p.id);
            return (
              <div key={p.id} className="bg-slate-700 rounded-md">
                <button
                  className={`w-full flex items-center justify-between p-2 text-left ${isDone ? 'bg-green-700/50' : ''}`}
                  onClick={() => setExpanded(isOpenCard ? null : p.id)}
                >
                  <span className="text-slate-200 font-semibold">
                    {p.name} {p.jerseyNumber ? `#${p.jerseyNumber}` : ''}
                  </span>
                  <span>{isDone ? '✔' : '✖'}</span>
                </button>
                {isOpenCard && (
                  <div className="p-3 space-y-3">
                    <div className="space-y-2">
                      <label className="block text-sm text-slate-300">
                        {t('playerAssessment.overall', 'Overall')}: {assess.overall}
                      </label>
                      <input
                        type="range"
                        min={1}
                        max={10}
                        step={1}
                        value={assess.overall}
                        onChange={e => handleOverallChange(p.id, Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    {sliderDefs.map(key => (
                      <div key={key} className="space-y-1">
                        <label className="block text-sm text-slate-300">
                          {t(`playerAssessment.${key}`, key)}: {assess.sliders[key]}
                        </label>
                        <input
                          type="range"
                          min={1}
                          max={5}
                          step={0.5}
                          value={assess.sliders[key]}
                          onChange={e => handleSliderChange(p.id, key, Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    ))}
                    <div>
                      <label className="block text-sm text-slate-300 mb-1">
                        {t('playerAssessment.notes', 'Notes')}
                      </label>
                      <textarea
                        value={assess.notes}
                        onChange={e => handleNotesChange(p.id, e.target.value)}
                        className="w-full p-2 bg-slate-600 rounded-md text-white"
                        rows={3}
                      />
                      <div className="text-right text-xs text-slate-400">
                        {assess.notes.length}/280
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleSave(p.id)}
                        className="px-4 py-2 bg-indigo-600 rounded-md text-white"
                      >
                        {t('playerAssessment.saveAndMarkDone', 'Save & Mark Done')}
                      </button>
                      <button
                        onClick={() => setExpanded(null)}
                        className="px-4 py-2 bg-slate-600 rounded-md text-white"
                      >
                        {t('common.cancel', 'Cancel')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="p-4 border-t border-slate-700/20 backdrop-blur-sm bg-slate-900/20 flex-shrink-0 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-slate-600 rounded-md text-white">
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerAssessmentModal;
