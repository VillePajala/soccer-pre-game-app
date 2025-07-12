import { useState, useEffect, useCallback } from 'react';
import type { PlayerAssessment, IntervalLog } from '@/types';
import { getPlayerAssessments, savePlayerAssessment } from '@/utils/playerAssessments';
import logger from '@/utils/logger';

export const validateAssessment = (a: Partial<PlayerAssessment>): boolean => {
  if (typeof a.overall !== 'number' || a.overall < 1 || a.overall > 10) return false;
  if (!a.sliders) return false;
  const inRange = Object.values(a.sliders).every(v => v >= 1 && v <= 10);
  if (!inRange) return false;
  if (a.notes && a.notes.length > 280) return false;
  return true;
};

const minutesFromIntervals = (intervals?: IntervalLog[]): number => {
  if (!intervals || intervals.length === 0) return 0;
  const seconds = intervals.reduce((s, i) => s + i.duration, 0);
  return Math.round(seconds / 60);
};

export function usePlayerAssessments(gameId: string, intervals?: IntervalLog[]) {
  const [assessments, setAssessments] = useState<{[id: string]: PlayerAssessment}>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!gameId) return;
    setLoading(true);
    getPlayerAssessments(gameId)
      .then(data => setAssessments(data || {}))
      .catch(err => {
        logger.error('Failed to load assessments', err);
        setError('load');
      })
      .finally(() => setLoading(false));
  }, [gameId]);

  const saveAssessment = useCallback(async (playerId: string, data: PlayerAssessment) => {
    if (!validateAssessment(data)) throw new Error('invalid');
    const minutesPlayed = minutesFromIntervals(intervals);
    const full: PlayerAssessment = { ...data, minutesPlayed };
    const updated = await savePlayerAssessment(gameId, playerId, full);
    if (updated) setAssessments(updated.assessments || {});
    return updated;
  }, [gameId, intervals]);

  return { assessments, loading, error, saveAssessment };
}

export default usePlayerAssessments;
