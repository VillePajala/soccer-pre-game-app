import { useState, useRef } from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import logger from '@/utils/logger';

type InlineEditField = 'team' | 'opponent' | 'date' | 'location' | 'time' | 'duration' | 'notes' | null;

interface UseInlineEditingProps {
  currentGameId: string | null;
  teamName: string;
  opponentName: string;
  gameDate: string;
  gameLocation: string;
  gameTime: string;
  periodDurationMinutes: number;
  gameNotes: string;
  updateGameDetailsMutation: UseMutationResult<unknown, Error, Record<string, unknown>, unknown>;
  t: (key: string, fallback?: string) => string;
}

interface UseInlineEditingReturn {
  // State
  inlineEditingField: InlineEditField;
  inlineEditValue: string;
  setInlineEditValue: React.Dispatch<React.SetStateAction<string>>;
  
  // Refs
  teamInputRef: React.RefObject<HTMLInputElement | null>;
  opponentInputRef: React.RefObject<HTMLInputElement | null>;
  dateInputRef: React.RefObject<HTMLInputElement | null>;
  locationInputRef: React.RefObject<HTMLInputElement | null>;
  timeInputRef: React.RefObject<HTMLInputElement | null>;
  durationInputRef: React.RefObject<HTMLInputElement | null>;
  notesTextareaRef: React.RefObject<HTMLTextAreaElement | null>;
  
  // Processing state
  isProcessing: boolean;
  error: string | null;
  
  // Handlers
  handleStartInlineEdit: (field: Exclude<InlineEditField, null>) => void;
  handleConfirmInlineEdit: () => Promise<void>;
  handleCancelInlineEdit: () => void;
}

export function useInlineEditing({
  currentGameId,
  teamName,
  opponentName,
  gameDate,
  gameLocation,
  gameTime,
  periodDurationMinutes,
  gameNotes,
  updateGameDetailsMutation,
  t,
}: UseInlineEditingProps): UseInlineEditingReturn {
  // State for inline editing UI control
  const [inlineEditingField, setInlineEditingField] = useState<InlineEditField>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Refs for focusing inputs
  const teamInputRef = useRef<HTMLInputElement>(null);
  const opponentInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const durationInputRef = useRef<HTMLInputElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Inline Editing Handlers
  const handleStartInlineEdit = (field: Exclude<InlineEditField, null>) => {
    setInlineEditingField(field);
    // Initialize edit value based on current prop value
    switch (field) {
      case 'team': setInlineEditValue(teamName); break;
      case 'opponent': setInlineEditValue(opponentName); break;
      case 'date': setInlineEditValue(gameDate); break; // Use YYYY-MM-DD
      case 'location': setInlineEditValue(gameLocation); break;
      case 'time': setInlineEditValue(gameTime); break; // Use HH:MM
      case 'duration': setInlineEditValue(String(periodDurationMinutes)); break;
      case 'notes': setInlineEditValue(gameNotes); break;
      default: setInlineEditValue('');
    }
  };

  const handleConfirmInlineEdit = async () => {
    if (inlineEditingField === null) return;

    setError(null); // Clear previous errors
    setIsProcessing(true);

    const trimmedValue = inlineEditValue.trim();
    let success = false;
    const fieldProcessed: typeof inlineEditingField = inlineEditingField; // To use in finally

    try {
      if (!currentGameId) {
        logger.error("[GameSettingsModal] currentGameId is null, cannot save inline edit.");
        setError(t('gameSettingsModal.errors.missingGameId', 'Game ID is missing. Cannot save changes.'));
        return;
      }

      // Validation based on field type
      if (inlineEditingField === 'duration') {
        const durationNum = parseInt(trimmedValue, 10);
        if (isNaN(durationNum) || durationNum < 1 || durationNum > 120) {
          setError(t('gameSettingsModal.errors.invalidDuration', 'Duration must be between 1 and 120 minutes.'));
          return;
        }
      }

      if (inlineEditingField === 'time') {
        // Validate HH:MM format
        const timePattern = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timePattern.test(trimmedValue)) {
          setError(t('gameSettingsModal.errors.invalidTimeFormat', 'Time must be in HH:MM format (e.g., 14:30).'));
          return;
        }
      }

      if (inlineEditingField === 'date') {
        // Validate YYYY-MM-DD format
        const datePattern = /^\d{4}-\d{2}-\d{2}$/;
        if (!datePattern.test(trimmedValue)) {
          setError(t('gameSettingsModal.errors.invalidDateFormat', 'Date must be in YYYY-MM-DD format.'));
          return;
        }
        
        // Check if date is valid
        const dateObj = new Date(trimmedValue);
        if (isNaN(dateObj.getTime()) || trimmedValue !== dateObj.toISOString().split('T')[0]) {
          setError(t('gameSettingsModal.errors.invalidDate', 'Please enter a valid date.'));
          return;
        }
      }

      // Prepare update data based on field
      const updateData: Record<string, unknown> = {};
      switch (inlineEditingField) {
        case 'team':
          updateData.teamName = trimmedValue;
          break;
        case 'opponent':
          updateData.opponentName = trimmedValue;
          break;
        case 'date':
          updateData.gameDate = trimmedValue;
          break;
        case 'location':
          updateData.gameLocation = trimmedValue;
          break;
        case 'time':
          updateData.gameTime = trimmedValue;
          break;
        case 'duration':
          updateData.periodDurationMinutes = parseInt(trimmedValue, 10);
          break;
        case 'notes':
          updateData.gameNotes = trimmedValue;
          break;
      }

      logger.log(`[GameSettingsModal] Updating ${inlineEditingField} to:`, trimmedValue);
      
      await updateGameDetailsMutation.mutateAsync(updateData);
      success = true;
      
      logger.log(`[GameSettingsModal] Successfully updated ${inlineEditingField}.`);
    } catch (error) {
      logger.error(`[GameSettingsModal] Error updating ${inlineEditingField}:`, error);
      setError(
        error instanceof Error 
          ? error.message 
          : t('gameSettingsModal.errors.updateFailed', 'Failed to update. Please try again.')
      );
    } finally {
      setIsProcessing(false);
      if (success) {
        setInlineEditingField(null);
        setInlineEditValue('');
      } else {
        // Keep editing mode active on error for user to retry
        logger.log(`[GameSettingsModal] Keeping ${fieldProcessed} in edit mode due to error.`);
      }
    }
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingField(null);
    setInlineEditValue('');
    setError(null);
  };

  return {
    // State
    inlineEditingField,
    inlineEditValue,
    setInlineEditValue,
    
    // Refs
    teamInputRef,
    opponentInputRef,
    dateInputRef,
    locationInputRef,
    timeInputRef,
    durationInputRef,
    notesTextareaRef,
    
    // Processing state
    isProcessing,
    error,
    
    // Handlers
    handleStartInlineEdit,
    handleConfirmInlineEdit,
    handleCancelInlineEdit,
  };
}