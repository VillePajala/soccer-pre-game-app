import { useState, useRef } from 'react';
import { GameEvent } from '@/types';
import logger from '@/utils/logger';

interface UseEventManagementProps {
  gameEvents: GameEvent[];
  currentGameId: string | null;
  onUpdateGameEvent: (event: GameEvent) => void;
  onDeleteGameEvent?: (eventId: string) => void;
  t: (key: string, fallback?: string) => string;
}

interface UseEventManagementReturn {
  // State
  localGameEvents: GameEvent[];
  setLocalGameEvents: React.Dispatch<React.SetStateAction<GameEvent[]>>;
  editingGoalId: string | null;
  editGoalTime: string;
  setEditGoalTime: React.Dispatch<React.SetStateAction<string>>;
  editGoalScorerId: string;
  setEditGoalScorerId: React.Dispatch<React.SetStateAction<string>>;
  editGoalAssisterId: string | undefined;
  setEditGoalAssisterId: React.Dispatch<React.SetStateAction<string | undefined>>;
  goalTimeInputRef: React.RefObject<HTMLInputElement>;
  
  // Processing state
  isProcessing: boolean;
  error: string | null;
  
  // Handlers
  handleEditGoal: (goal: GameEvent) => void;
  handleCancelEditGoal: () => void;
  handleSaveGoal: (goalId: string) => Promise<void>;
  handleDeleteGoal: (goalId: string) => Promise<void>;
}

const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

export function useEventManagement({
  gameEvents,
  currentGameId,
  onUpdateGameEvent,
  onDeleteGameEvent,
  t,
}: UseEventManagementProps): UseEventManagementReturn {
  // State for event editing within the modal
  const [localGameEvents, setLocalGameEvents] = useState<GameEvent[]>(gameEvents);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalTime, setEditGoalTime] = useState<string>('');
  const [editGoalScorerId, setEditGoalScorerId] = useState<string>('');
  const [editGoalAssisterId, setEditGoalAssisterId] = useState<string | undefined>(undefined);
  const goalTimeInputRef = useRef<HTMLInputElement>(null);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle Goal Event Editing
  const handleEditGoal = (goal: GameEvent) => {
    setEditingGoalId(goal.id);
    setEditGoalTime(formatTime(goal.time)); // Use MM:SS format for editing time
    setEditGoalScorerId(goal.scorerId || '');
    setEditGoalAssisterId(goal.assisterId || undefined);
  };

  const handleCancelEditGoal = () => {
    setEditingGoalId(null);
    setEditGoalTime('');
    setEditGoalScorerId('');
    setEditGoalAssisterId(undefined);
  };

  // Handle saving edited goal
  const handleSaveGoal = async (goalId: string) => {
    if (!goalId || !currentGameId) {
      logger.error("[GameSettingsModal] Missing goalId or currentGameId for save.");
      setError(t('gameSettingsModal.errors.missingGoalId', 'Goal ID or Game ID is missing. Cannot save.'));
      return;
    }

    setError(null);
    setIsProcessing(true);

    let timeInSeconds = 0;

    // Parse time input (MM:SS format)
    const timeParts = editGoalTime.match(/^(\d{1,2}):(\d{1,2})$/);
    if (timeParts) {
      const minutes = parseInt(timeParts[1], 10);
      const seconds = parseInt(timeParts[2], 10);
      if (!isNaN(minutes) && !isNaN(seconds) && minutes >= 0 && seconds >= 0 && seconds < 60) {
        timeInSeconds = minutes * 60 + seconds;
      } else {
        setError(t('gameSettingsModal.errors.invalidTimeFormat', 'Invalid time format. Use MM:SS (e.g., 05:30).'));
        setIsProcessing(false);
        goalTimeInputRef.current?.focus();
        return;
      }
    } else {
      setError(t('gameSettingsModal.errors.invalidTimeFormat', 'Invalid time format. Use MM:SS (e.g., 05:30).'));
      setIsProcessing(false);
      goalTimeInputRef.current?.focus();
      return;
    }

    const updatedScorerId = editGoalScorerId;
    const updatedAssisterId = editGoalAssisterId || undefined;

    if (!updatedScorerId) {
      setError(t('gameSettingsModal.errors.scorerRequired', 'Scorer must be selected.'));
      setIsProcessing(false);
      return;
    }

    try {
      const originalGoal = gameEvents.find(e => e.id === goalId);
      if (!originalGoal) {
        throw new Error('Original goal not found');
      }

      const updatedEvent: GameEvent = {
        ...originalGoal,
        time: timeInSeconds,
        scorerId: updatedScorerId,
        assisterId: updatedAssisterId,
      };

      // Update local state immediately for UI responsiveness
      setLocalGameEvents(prevEvents => 
        prevEvents.map(event => 
          event.id === goalId ? updatedEvent : event
        )
      );

      // Call parent handler
      onUpdateGameEvent(updatedEvent);
      
      handleCancelEditGoal();
      logger.log(`[GameSettingsModal] Goal ${goalId} updated successfully.`);
    } catch (error) {
      logger.error('[GameSettingsModal] Error updating goal:', error);
      setError(t('gameSettingsModal.errors.updateFailed', 'Failed to update goal. Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle deleting a goal
  const handleDeleteGoal = async (goalId: string) => {
    if (!goalId || !currentGameId) {
      logger.error("[GameSettingsModal] Missing goalId or currentGameId for delete.");
      setError(t('gameSettingsModal.errors.missingGoalId', 'Goal ID or Game ID is missing. Cannot delete.'));
      return;
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      t('gameSettingsModal.confirmDeleteEvent', 'Are you sure you want to delete this event? This action cannot be undone.')
    );
    
    if (!confirmed) return;

    setError(null);
    setIsProcessing(true);

    try {
      // Update local state immediately for UI responsiveness
      setLocalGameEvents(prevEvents => prevEvents.filter(event => event.id !== goalId));
      
      // Call parent handler if available
      if (onDeleteGameEvent && typeof onDeleteGameEvent === 'function') {
        onDeleteGameEvent(goalId);
      }
      
      logger.log(`[GameSettingsModal] Goal ${goalId} deleted successfully.`);
    } catch (error) {
      logger.error('[GameSettingsModal] Error deleting goal:', error);
      setError(t('gameSettingsModal.errors.deleteFailed', 'Failed to delete goal. Please try again.'));
      
      // Revert local state on error
      setLocalGameEvents(gameEvents);
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    // State
    localGameEvents,
    setLocalGameEvents,
    editingGoalId,
    editGoalTime,
    setEditGoalTime,
    editGoalScorerId,
    setEditGoalScorerId,
    editGoalAssisterId,
    setEditGoalAssisterId,
    goalTimeInputRef,
    
    // Processing state
    isProcessing,
    error,
    
    // Handlers
    handleEditGoal,
    handleCancelEditGoal,
    handleSaveGoal,
    handleDeleteGoal,
  };
}