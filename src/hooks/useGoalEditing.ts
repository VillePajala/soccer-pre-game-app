import { useState, useRef } from 'react';
import { GameEvent } from '@/types';

interface UseGoalEditingProps {
  gameEvents: GameEvent[];
  onUpdateGameEvent?: (event: GameEvent) => void;
  onDeleteGameEvent?: (eventId: string) => void;
  setLocalGameEvents: React.Dispatch<React.SetStateAction<GameEvent[]>>;
  formatTime: (timeInSeconds: number) => string;
  t: (key: string, fallback?: string) => string;
}

export function useGoalEditing({
  gameEvents,
  onUpdateGameEvent,
  onDeleteGameEvent,
  setLocalGameEvents,
  formatTime,
  t,
}: UseGoalEditingProps) {
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalTime, setEditGoalTime] = useState<string>('');
  const [editGoalScorerId, setEditGoalScorerId] = useState<string>('');
  const [editGoalAssisterId, setEditGoalAssisterId] = useState<string | undefined>(undefined);
  const goalTimeInputRef = useRef<HTMLInputElement>(null);

  const handleStartEditGoal = (goal: GameEvent) => {
    setEditingGoalId(goal.id);
    setEditGoalTime(formatTime(goal.time));
    setEditGoalScorerId(goal.scorerId ?? '');
    setEditGoalAssisterId(goal.assisterId ?? '');
  };

  const handleCancelEditGoal = () => { 
    setEditingGoalId(null); 
  };

  const handleSaveEditGoal = () => {
    if (!editingGoalId) return;
    const originalGoal = gameEvents.find(e => e.id === editingGoalId); 
    if (!originalGoal) { 
      handleCancelEditGoal(); 
      return; 
    }

    const timeParts = editGoalTime.match(/^(\d{1,2}):(\d{1,2})$/); 
    let timeInSeconds = 0;
    
    if (timeParts) { 
      const m = parseInt(timeParts[1], 10);
      const s = parseInt(timeParts[2], 10); 
      if (!isNaN(m) && !isNaN(s) && m >= 0 && s >= 0 && s < 60) {
        timeInSeconds = m * 60 + s; 
      } else { 
        alert(t('gameStatsModal.invalidTimeFormat', 'Invalid time format. MM:SS')); 
        goalTimeInputRef.current?.focus(); 
        return; 
      } 
    } else { 
      alert(t('gameStatsModal.invalidTimeFormat', 'Invalid time format. MM:SS')); 
      goalTimeInputRef.current?.focus(); 
      return; 
    }

    const updatedScorerId = editGoalScorerId; 
    const updatedAssisterId = editGoalAssisterId || undefined;
    
    if (!updatedScorerId) { 
      alert(t('gameStatsModal.scorerRequired', 'Scorer must be selected.')); 
      return; 
    }

    const updatedEvent: GameEvent = { 
      ...originalGoal, 
      time: timeInSeconds, 
      scorerId: updatedScorerId, 
      assisterId: updatedAssisterId 
    };

    if (typeof onUpdateGameEvent === 'function') {
      onUpdateGameEvent(updatedEvent);
    }
    handleCancelEditGoal();
  };

  const handleGoalEditKeyDown = (event: React.KeyboardEvent) => { 
    if (event.key === 'Enter') handleSaveEditGoal(); 
    else if (event.key === 'Escape') handleCancelEditGoal(); 
  };

  const triggerDeleteEvent = (goalId: string) => {
    // Add confirmation dialog before deleting
    if (window.confirm(t('gameStatsModal.confirmDeleteEvent', 'Are you sure you want to delete this event? This cannot be undone.'))) {
      // Combine checks for clarity and add non-null assertion
      if (onDeleteGameEvent && typeof onDeleteGameEvent === 'function') { 
        onDeleteGameEvent(goalId);
        setLocalGameEvents(prevEvents => prevEvents.filter(event => event.id !== goalId));
      }
    }
  };

  return {
    // State
    editingGoalId,
    editGoalTime,
    setEditGoalTime,
    editGoalScorerId,
    setEditGoalScorerId,
    editGoalAssisterId,
    setEditGoalAssisterId,
    goalTimeInputRef,
    
    // Handlers
    handleStartEditGoal,
    handleCancelEditGoal,
    handleSaveEditGoal,
    handleGoalEditKeyDown,
    triggerDeleteEvent,
  };
}