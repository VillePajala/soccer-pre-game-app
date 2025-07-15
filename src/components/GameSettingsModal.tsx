'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import logger from '@/utils/logger';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import { HiPlusCircle } from 'react-icons/hi2';
import { Season, Tournament, Player } from '@/types';
import { AppState } from '@/types';
import { getSeasons } from '@/utils/seasons';
import { getTournaments } from '@/utils/tournaments';
import { updateGameDetails, updateGameEvent, removeGameEvent } from '@/utils/savedGames';
import { UseMutationResult } from '@tanstack/react-query';
import { TFunction } from 'i18next';
import AssessmentSlider from './AssessmentSlider';
import { AGE_GROUPS, LEVELS } from '@/config/gameOptions';
import type { TranslationKey } from '@/i18n-types';
import { inputBaseStyle } from '@/styles/styleConstants';

export type GameEventType = 'goal' | 'opponentGoal' | 'substitution' | 'periodEnd' | 'gameEnd' | 'fairPlayCard';

export interface GameEvent {
  id: string;
  type: GameEventType;
  time: number; // Gametime in seconds
  period?: number;
  scorerId?: string;
  assisterId?: string;
  entityId?: string;
}

export interface GameSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // --- Data for the current game ---
  currentGameId: string | null;
  teamName: string;
  opponentName: string;
  gameDate: string;
  gameLocation?: string;
  gameTime?: string;
  gameNotes?: string;
  ageGroup?: string;
  tournamentLevel?: string;
  seasonId?: string | null;
  tournamentId?: string | null;
  gameEvents: GameEvent[];
  availablePlayers: Player[];
  numPeriods: number;
  periodDurationMinutes: number;
  demandFactor?: number;
  selectedPlayerIds: string[];
  onSelectedPlayersChange: (playerIds: string[]) => void;
  // --- Handlers for updating game data ---
  onTeamNameChange: (name: string) => void;
  onOpponentNameChange: (name: string) => void;
  onGameDateChange: (date: string) => void;
  onGameLocationChange: (location: string) => void;
  onGameTimeChange: (time: string) => void;
  onGameNotesChange: (notes: string) => void;
  onAgeGroupChange: (age: string) => void;
  onTournamentLevelChange: (level: string) => void;
  onUpdateGameEvent: (updatedEvent: GameEvent) => void;
  onDeleteGameEvent?: (goalId: string) => void;
  onAwardFairPlayCard: (playerId: string | null, time: number) => void;
  onNumPeriodsChange: (num: number) => void;
  onPeriodDurationChange: (minutes: number) => void;
  onDemandFactorChange: (factor: number) => void;
  onSeasonIdChange: (seasonId: string | undefined) => void;
  onTournamentIdChange: (tournamentId: string | undefined) => void;
  homeOrAway: 'home' | 'away';
  onSetHomeOrAway: (status: 'home' | 'away') => void;
  // Add mutation props for creating seasons and tournaments
  addSeasonMutation: UseMutationResult<Season | null, Error, Partial<Season> & { name: string }, unknown>;
  addTournamentMutation: UseMutationResult<Tournament | null, Error, Partial<Tournament> & { name: string }, unknown>;
  isAddingSeason: boolean;
  isAddingTournament: boolean;
  // Add current time for fair play card
  timeElapsedInSeconds?: number;
  updateGameDetailsMutation: UseMutationResult<AppState | null, Error, { gameId: string; updates: Partial<AppState> }, unknown>;
}

// Helper to format time from seconds to MM:SS
const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

// Helper to get event description
const getEventDescription = (event: GameEvent, players: Player[], t: TFunction): string => {
  switch (event.type) {
    case 'goal': {
      const scorer = players.find(p => p.id === event.scorerId)?.name || t('gameSettingsModal.unknownPlayer', 'Unknown Player');
      let description = scorer;
      if (event.assisterId) {
        const assister = players.find(p => p.id === event.assisterId)?.name;
        if (assister) {
          description += ` (${t('common.assist', 'Assist')}: ${assister})`;
        }
      }
      return description;
    }
    case 'opponentGoal':
      return t('gameSettingsModal.logTypeOpponentGoal', 'Opponent Goal');
    case 'periodEnd':
      return t('gameSettingsModal.logTypePeriodEnd', 'End of Period');
    case 'gameEnd':
      return t('gameSettingsModal.logTypeGameEnd', 'End of Game');
    default:
      return t('gameSettingsModal.logTypeUnknown', 'Unknown Event');
  }
};

const GameSettingsModal: React.FC<GameSettingsModalProps> = ({
  isOpen,
  onClose,
  currentGameId,
  teamName,
  opponentName,
  gameDate,
  gameLocation = '',
  gameTime = '',
  gameNotes = '',
  ageGroup = '',
  tournamentLevel = '',
  onTeamNameChange,
  onOpponentNameChange,
  onGameDateChange,
  onGameLocationChange,
  onGameTimeChange,
  onGameNotesChange,
  onAgeGroupChange,
  onTournamentLevelChange,
  onUpdateGameEvent,
  onDeleteGameEvent,
  onAwardFairPlayCard,
  gameEvents,
  availablePlayers,
  selectedPlayerIds,
  onSelectedPlayersChange,
  seasonId,
  tournamentId,
  numPeriods,
  periodDurationMinutes,
  demandFactor = 1,
  onNumPeriodsChange,
  onPeriodDurationChange,
  onDemandFactorChange,
  onSeasonIdChange,
  onTournamentIdChange,
  homeOrAway,
  onSetHomeOrAway,
  addSeasonMutation,
  addTournamentMutation,
  isAddingSeason,
  isAddingTournament,
  timeElapsedInSeconds,
  updateGameDetailsMutation,
}) => {
  // logger.log('[GameSettingsModal Render] Props received:', { seasonId, tournamentId, currentGameId });
  const { t } = useTranslation();
  const inputStyle = inputBaseStyle;

  // State for event editing within the modal
  const [localGameEvents, setLocalGameEvents] = useState<GameEvent[]>(gameEvents);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalTime, setEditGoalTime] = useState<string>('');
  const [editGoalScorerId, setEditGoalScorerId] = useState<string>('');
  const [editGoalAssisterId, setEditGoalAssisterId] = useState<string | undefined>(undefined);
  const goalTimeInputRef = useRef<HTMLInputElement>(null);

  // State for inline editing UI control
  const [inlineEditingField, setInlineEditingField] = useState<
    'team' | 'opponent' | 'date' | 'location' | 'time' | 'duration' | 'notes' | null
  >(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');
  const teamInputRef = useRef<HTMLInputElement>(null);
  const opponentInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const timeInputRef = useRef<HTMLInputElement>(null);
  const durationInputRef = useRef<HTMLInputElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  // State for seasons and tournaments
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showNewSeasonInput, setShowNewSeasonInput] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [showNewTournamentInput, setShowNewTournamentInput] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');
  const newSeasonInputRef = useRef<HTMLInputElement>(null);
  const newTournamentInputRef = useRef<HTMLInputElement>(null);

  // State for active tab
  const [activeTab, setActiveTab] = useState<'none' | 'season' | 'tournament'>('none');

  // NEW: Loading and Error states for modal operations
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State for game time
  const [gameHour, setGameHour] = useState<string>('');
  const [gameMinute, setGameMinute] = useState<string>('');

  // Initialize game time state from prop
  useEffect(() => {
    if (gameTime) {
      const [hour, minute] = gameTime.split(':');
      setGameHour(hour || '');
      setGameMinute(minute || '');
    } else {
      setGameHour('');
      setGameMinute('');
    }
  }, [gameTime]);

  // Handle time changes
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Ensure we're storing a string, not a number that could become NaN
    setGameHour(value === '' ? '' : value);
    
    if (value === '') {
      // If hour is empty, update the time string accordingly
      onGameTimeChange(gameMinute ? `:${gameMinute.padStart(2, '0')}` : '');
    } else {
      const formattedHour = value.padStart(2, '0');
      const formattedMinute = gameMinute.padStart(2, '0');
      onGameTimeChange(`${formattedHour}:${formattedMinute}`);
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Ensure we're storing a string, not a number that could become NaN
    setGameMinute(value === '' ? '' : value);
    
    if (value === '') {
      // If minute is empty, update the time string accordingly
      onGameTimeChange(gameHour ? `${gameHour.padStart(2, '0')}:` : '');
    } else {
      const formattedHour = gameHour.padStart(2, '0');
      const formattedMinute = value.padStart(2, '0');
      onGameTimeChange(`${formattedHour}:${formattedMinute}`);
    }
  };

  // --- Effects ---

  // Sync activeTab with incoming props
  useEffect(() => {
    if (isOpen) { // Only adjust when modal is open
      if (seasonId && seasonId !== '') {
        setActiveTab('season');
      } else if (tournamentId && tournamentId !== '') {
        setActiveTab('tournament');
      } else {
        setActiveTab('none');
      }
    }
  }, [isOpen, seasonId, tournamentId]);

  // Load seasons/tournaments using utility functions
  useEffect(() => {
    if (isOpen) {
      const fetchModalData = async () => {
      try {
          const loadedSeasonsData = await getSeasons();
          setSeasons(Array.isArray(loadedSeasonsData) ? loadedSeasonsData : []);
      } catch (error) {
        logger.error('Error loading seasons:', error);
        setSeasons([]);
      }
      try {
          const loadedTournamentsData = await getTournaments();
          setTournaments(Array.isArray(loadedTournamentsData) ? loadedTournamentsData : []);
      } catch (error) {
        logger.error('Error loading tournaments:', error);
        setTournaments([]);
      }
      };
      fetchModalData();
    }
  }, [isOpen]);

  // Effect to update localGameEvents if the prop changes from parent (e.g., undo/redo)
  useEffect(() => {
    setLocalGameEvents(gameEvents); 
  }, [gameEvents]);

  // Focus goal time input (Keep this)
  useEffect(() => {
    if (editingGoalId) { goalTimeInputRef.current?.focus(); goalTimeInputRef.current?.select(); }
  }, [editingGoalId]);

  // Focus inline edit input (Keep this)
  useEffect(() => {
    if (inlineEditingField === 'team') teamInputRef.current?.focus();
    else if (inlineEditingField === 'opponent') opponentInputRef.current?.focus();
    else if (inlineEditingField === 'date') dateInputRef.current?.focus();
    else if (inlineEditingField === 'location') locationInputRef.current?.focus();
    else if (inlineEditingField === 'time') timeInputRef.current?.focus();
    else if (inlineEditingField === 'duration') durationInputRef.current?.focus();
    else if (inlineEditingField === 'notes') notesTextareaRef.current?.focus();

    if(inlineEditingField) {
        // Select text content on focus for easier editing
        const inputElement = teamInputRef.current || opponentInputRef.current || dateInputRef.current || locationInputRef.current || timeInputRef.current || durationInputRef.current;
        inputElement?.select();
        notesTextareaRef.current?.select();
    }
  }, [inlineEditingField]);

  // Prefill game settings when selecting a season
  useEffect(() => {
    if (!isOpen || !seasonId) return;
    const s = seasons.find(se => se.id === seasonId);
    if (!s) return;
    if (s.location !== undefined) {
      onGameLocationChange(s.location || '');
      if (currentGameId) {
        updateGameDetailsMutation.mutate({
          gameId: currentGameId,
          updates: { gameLocation: s.location || '' },
        });
      }
    }
    if (s.ageGroup) {
      onAgeGroupChange(s.ageGroup);
      if (currentGameId) {
        updateGameDetailsMutation.mutate({ gameId: currentGameId, updates: { ageGroup: s.ageGroup } });
      }
    }
    const parsedCount = Number(s.periodCount);
    if (parsedCount === 1 || parsedCount === 2) {
      const count = parsedCount as 1 | 2;
      onNumPeriodsChange(count);
      if (currentGameId) {
        updateGameDetailsMutation.mutate({
          gameId: currentGameId,
          updates: { numberOfPeriods: count },
        });
      }
    }
    const parsedDuration = Number(s.periodDuration);
    if (Number.isFinite(parsedDuration) && parsedDuration > 0) {
      onPeriodDurationChange(parsedDuration);
      if (currentGameId) {
        updateGameDetailsMutation.mutate({
          gameId: currentGameId,
          updates: { periodDurationMinutes: parsedDuration },
        });
      }
    }
    if (s.defaultRoster && s.defaultRoster.length > 0) {
      if (selectedPlayerIds.length !== s.defaultRoster.length || !s.defaultRoster.every(id => selectedPlayerIds.includes(id))) {
        onSelectedPlayersChange(s.defaultRoster);
      }
    }
  }, [seasonId, seasons, isOpen, currentGameId, availablePlayers, selectedPlayerIds, onGameLocationChange, onNumPeriodsChange, onPeriodDurationChange, onSelectedPlayersChange, updateGameDetailsMutation, onAgeGroupChange]);

  // Prefill game settings when selecting a tournament
  useEffect(() => {
    if (!isOpen || !tournamentId) return;
    const t = tournaments.find(tt => tt.id === tournamentId);
    if (!t) return;
    if (t.location !== undefined) {
      onGameLocationChange(t.location || '');
      if (currentGameId) {
        updateGameDetailsMutation.mutate({
          gameId: currentGameId,
          updates: { gameLocation: t.location || '' },
        });
      }
    }
    if (t.ageGroup) {
      onAgeGroupChange(t.ageGroup);
      if (currentGameId) {
        updateGameDetailsMutation.mutate({ gameId: currentGameId, updates: { ageGroup: t.ageGroup } });
      }
    }
    if (t.level) {
      onTournamentLevelChange(t.level);
      if (currentGameId) {
        updateGameDetailsMutation.mutate({ gameId: currentGameId, updates: { tournamentLevel: t.level } });
      }
    }
    const parsedCount = Number(t.periodCount);
    if (parsedCount === 1 || parsedCount === 2) {
      const count = parsedCount as 1 | 2;
      onNumPeriodsChange(count);
      if (currentGameId) {
        updateGameDetailsMutation.mutate({
          gameId: currentGameId,
          updates: { numberOfPeriods: count },
        });
      }
    }
    const parsedDuration = Number(t.periodDuration);
    if (Number.isFinite(parsedDuration) && parsedDuration > 0) {
      onPeriodDurationChange(parsedDuration);
      if (currentGameId) {
        updateGameDetailsMutation.mutate({
          gameId: currentGameId,
          updates: { periodDurationMinutes: parsedDuration },
        });
      }
    }
    if (t.defaultRoster && t.defaultRoster.length > 0) {
      if (selectedPlayerIds.length !== t.defaultRoster.length || !t.defaultRoster.every(id => selectedPlayerIds.includes(id))) {
        onSelectedPlayersChange(t.defaultRoster);
      }
    }
  }, [tournamentId, tournaments, isOpen, currentGameId, availablePlayers, selectedPlayerIds, onGameLocationChange, onNumPeriodsChange, onPeriodDurationChange, onSelectedPlayersChange, updateGameDetailsMutation, onAgeGroupChange, onTournamentLevelChange]);

  // --- Event Handlers ---

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const newSeasonId = value || undefined;
    onSeasonIdChange(newSeasonId);
    onTournamentIdChange(undefined); // Setting a season clears the tournament
    if (currentGameId) {
      updateGameDetailsMutation.mutate({ gameId: currentGameId, updates: { seasonId: newSeasonId, tournamentId: undefined } });
    }
    setShowNewSeasonInput(false);
    setNewSeasonName('');
  };

  const handleTournamentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const newTournamentId = value || undefined;
    onTournamentIdChange(newTournamentId);
    onSeasonIdChange(undefined); // Setting a tournament clears the season
    if (currentGameId) {
      updateGameDetailsMutation.mutate({ gameId: currentGameId, updates: { tournamentId: newTournamentId, seasonId: undefined } });
    }
    setShowNewTournamentInput(false);
    setNewTournamentName('');
  };

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
    const timeParts = editGoalTime.split(':');
    if (timeParts.length === 2) {
      const minutes = parseInt(timeParts[0], 10);
      const seconds = parseInt(timeParts[1], 10);
      if (!isNaN(minutes) && !isNaN(seconds)) {
        timeInSeconds = minutes * 60 + seconds;
      } else {
        alert(t('gameSettingsModal.invalidTimeFormat', "Invalid time format. Use MM:SS"));
        return;
      }
    } else if (editGoalTime) {
        alert(t('gameSettingsModal.invalidTimeFormat', "Invalid time format. Use MM:SS"));
      return;
    }

    const originalEvent = localGameEvents.find(e => e.id === goalId);
    if (!originalEvent) {
        logger.error(`[GameSettingsModal] Original event not found for ID: ${goalId}`);
      return;
    }

    const updatedEvent: GameEvent = {
      ...originalEvent, // Preserve other properties like type
      id: goalId,
      time: timeInSeconds,
      scorerId: editGoalScorerId,
      assisterId: editGoalAssisterId || undefined,
    };

    setLocalGameEvents(prevEvents =>
      prevEvents.map(event => (event.id === goalId ? updatedEvent : event))
    );
    onUpdateGameEvent(updatedEvent); // Propagate to parent for its state update

    try {
      const eventIndex = gameEvents.findIndex(e => e.id === goalId); // Use gameEvents from props for original index
      if (eventIndex !== -1) {
        const success = await updateGameEvent(currentGameId, eventIndex, updatedEvent);
        if (success) {
          logger.log(`[GameSettingsModal] Event ${goalId} updated in game ${currentGameId}.`);
          handleCancelEditGoal(); // Close edit mode on success
        } else {
          logger.error(`[GameSettingsModal] Failed to update event ${goalId} in game ${currentGameId} via utility.`);
          setError(t('gameSettingsModal.errors.updateFailed', 'Failed to update event. Please try again.'));
          // Optionally revert UI:
          // setLocalGameEvents(gameEvents); // Revert local state if save failed
        }
      } else {
        logger.error(`[GameSettingsModal] Event ${goalId} not found in original gameEvents prop for saving.`);
        setError(t('gameSettingsModal.errors.eventNotFound', 'Original event not found for saving.'));
      }
    } catch (err) {
      logger.error(`[GameSettingsModal] Error updating event ${goalId} in game ${currentGameId}:`, err);
      setError(t('gameSettingsModal.errors.genericSaveError', 'An unexpected error occurred while saving the event.'));
      // Optionally revert UI:
      // setLocalGameEvents(gameEvents); // Revert local state if save failed
    } finally {
      setIsProcessing(false);
      // Do not call handleCancelEditGoal() here if there was an error,
      // so the user can see their input and try again or cancel.
    }
  };

  // Handle deleting a goal
  const handleDeleteGoal = async (goalId: string) => {
    if (!onDeleteGameEvent || !currentGameId) {
      logger.error("[GameSettingsModal] Missing onDeleteGameEvent handler or currentGameId for delete.");
      setError(t('gameSettingsModal.errors.missingDeleteHandler', 'Cannot delete event: Critical configuration missing.'));
      return;
    }

      if (window.confirm(t('gameSettingsModal.confirmDeleteEvent', 'Are you sure you want to delete this event? This cannot be undone.'))) {
      setError(null);
      setIsProcessing(true);
      try {
        const eventIndex = gameEvents.findIndex(e => e.id === goalId); 
        if (eventIndex === -1) {
          logger.error(`[GameSettingsModal] Event ${goalId} not found in original gameEvents for deletion.`);
          setError(t('gameSettingsModal.errors.eventNotFoundDelete', 'Event to delete not found.'));
          setIsProcessing(false); // Stop processing early
          return;
        }
        
        // Update local state immediately for UI responsiveness - Parent state updated via prop
        const originalLocalEvents = localGameEvents;
        setLocalGameEvents(prevEvents => prevEvents.filter(event => event.id !== goalId));
        onDeleteGameEvent(goalId);
        
        const success = await removeGameEvent(currentGameId, eventIndex);
        if (success) {
          logger.log(`[GameSettingsModal] Event ${goalId} removed from game ${currentGameId}.`);
        } else {
          logger.error(`[GameSettingsModal] Failed to remove event ${goalId} from game ${currentGameId} via utility.`);
          setError(t('gameSettingsModal.errors.deleteFailed', 'Failed to delete event. Please try again.'));
          setLocalGameEvents(originalLocalEvents); // Revert local UI on failure
        }
      } catch (err) {
        logger.error(`[GameSettingsModal] Error removing event ${goalId} from game ${currentGameId}:`, err);
        setError(t('gameSettingsModal.errors.genericDeleteError', 'An unexpected error occurred while deleting the event.'));
        // Consider reverting localGameEvents here as well if an error occurs
      } finally {
        setIsProcessing(false);
      }
    }
  };

  // Inline Editing Handlers (Refactored)
  const handleStartInlineEdit = (field: 'team' | 'opponent' | 'date' | 'location' | 'time' | 'duration' | 'notes') => {
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
        setError(t('gameSettingsModal.errors.missingGameIdInline', "Cannot save: Game ID missing."));
        return;
      }

      switch (inlineEditingField) {
        case 'team':
          if (trimmedValue) {
            onTeamNameChange(trimmedValue);
            await updateGameDetails(currentGameId, { teamName: trimmedValue });
            success = true;
          } else {
            alert(t('gameSettingsModal.teamNameRequired', "Team name cannot be empty."));
          }
          break;
        case 'opponent':
          if (trimmedValue) {
            onOpponentNameChange(trimmedValue);
            await updateGameDetails(currentGameId, { opponentName: trimmedValue });
            success = true;
          } else {
            alert(t('gameSettingsModal.opponentNameRequired', "Opponent name cannot be empty."));
          }
          break;
        case 'date':
          if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
            onGameDateChange(trimmedValue);
            await updateGameDetails(currentGameId, { gameDate: trimmedValue });
            success = true;
          } else {
            alert(t('gameSettingsModal.invalidDateFormat', "Invalid date format. Use YYYY-MM-DD."));
          }
          break;
        case 'location':
          onGameLocationChange(trimmedValue);
          await updateGameDetails(currentGameId, { gameLocation: trimmedValue });
          success = true;
          break;
        case 'time':
          if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmedValue) || trimmedValue === '') {
            onGameTimeChange(trimmedValue);
            await updateGameDetails(currentGameId, { gameTime: trimmedValue });
            success = true;
          } else {
            alert(t('gameSettingsModal.invalidTimeFormatInline', "Invalid time format. Use HH:MM (24-hour)."));
          }
          break;
        case 'duration':
          const duration = parseInt(trimmedValue, 10);
          if (!isNaN(duration) && duration > 0) {
            onPeriodDurationChange(duration);
            await updateGameDetails(currentGameId, { periodDurationMinutes: duration });
            success = true;
          } else {
            alert(t('gameSettingsModal.invalidDurationFormat', "Period duration must be a positive number."));
          }
          break;
        case 'notes':
          onGameNotesChange(inlineEditValue); // Keep original spacing/newlines
          await updateGameDetails(currentGameId, { gameNotes: inlineEditValue });
          success = true;
          break;
      }
      if (success) {
        logger.log(`[GameSettingsModal] Inline edit for ${fieldProcessed} saved for game ${currentGameId}.`);
        setInlineEditingField(null); // Exit inline edit mode on success
        setInlineEditValue('');
      }
    } catch (err) {
      logger.error(`[GameSettingsModal] Error saving inline edit for ${fieldProcessed} (Game ID: ${currentGameId}):`, err);
      setError(t('gameSettingsModal.errors.genericInlineSaveError', "Error saving changes. Please try again."));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingField(null);
    setInlineEditValue('');
  };

  // Handle KeyDown for inline edits (Enter/Escape)
  const handleInlineEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      // Allow Shift+Enter for newlines in textarea
      if (inlineEditingField === 'notes' && event.shiftKey) {
        return;
      } 
      event.preventDefault(); // Prevent default form submission/newline
      handleConfirmInlineEdit();
    } else if (event.key === 'Escape') {
      handleCancelInlineEdit();
    }
  };

  // --- ADDED Memoized Values (Moved Here) ---
  // Calculate these AFTER handlers are defined, potentially altering hook order slightly

  // Moved the sortedEvents calculation up to ensure hooks are called unconditionally
  const sortedEvents = useMemo(() => {
    // Use localGameEvents for display within the modal
    return [...localGameEvents].sort((a, b) => a.time - b.time);
  }, [localGameEvents]);

  // Handlers for creating new seasons/tournaments
  const handleShowCreateSeason = () => {
    setShowNewSeasonInput(true);
    onSeasonIdChange(undefined);
    onTournamentIdChange(undefined);
  };

  const handleShowCreateTournament = () => {
    setShowNewTournamentInput(true);
    onTournamentIdChange(undefined);
    onSeasonIdChange(undefined);
  };

  const handleAddNewSeason = async () => {
    const trimmedName = newSeasonName.trim();
    if (!trimmedName) {
      alert(t('gameSettingsModal.newSeasonNameRequired', 'Please enter a name for the new season.'));
      newSeasonInputRef.current?.focus();
      return;
    }

    try {
      const newSeason = await addSeasonMutation.mutateAsync({ name: trimmedName });
      
      if (newSeason) {
        setSeasons(prevSeasons => [...prevSeasons, newSeason].sort((a, b) => a.name.localeCompare(b.name)));
        onSeasonIdChange(newSeason.id);
        onTournamentIdChange(undefined);
        setNewSeasonName('');
        setShowNewSeasonInput(false);
      }
    } catch (error) {
      logger.error("Error calling addSeasonMutation.mutateAsync:", error);
      newSeasonInputRef.current?.focus();
    }
  };

  const handleAddNewTournament = async () => {
    const trimmedName = newTournamentName.trim();
    if (!trimmedName) {
      alert(t('gameSettingsModal.newTournamentNameRequired', 'Please enter a name for the new tournament.'));
      newTournamentInputRef.current?.focus();
      return;
    }

    try {
      const newTournament = await addTournamentMutation.mutateAsync({ name: trimmedName });

      if (newTournament) {
        setTournaments(prevTournaments => [...prevTournaments, newTournament].sort((a,b) => a.name.localeCompare(b.name)));
        onTournamentIdChange(newTournament.id);
        onSeasonIdChange(undefined);
        setNewTournamentName('');
        setShowNewTournamentInput(false);
      }
    } catch (error) {
      logger.error("Error calling addTournamentMutation.mutateAsync:", error);
      newTournamentInputRef.current?.focus();
    }
  };

  // Handle tab changes
  const handleTabChange = (tab: 'none' | 'season' | 'tournament') => {
    setActiveTab(tab);
    if (tab === 'none') {
      onSeasonIdChange(undefined);
      onTournamentIdChange(undefined);
    }
    setShowNewSeasonInput(false);
    setShowNewTournamentInput(false);
  };

  // Key handlers for new season/tournament inputs
  const handleNewSeasonKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleAddNewSeason();
    } else if (event.key === 'Escape') {
      setShowNewSeasonInput(false);
      setNewSeasonName('');
    }
  };

  const handleNewTournamentKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleAddNewTournament();
    } else if (event.key === 'Escape') {
      setShowNewTournamentInput(false);
      setNewTournamentName('');
    }
  };

  // Add this section to handle fair play cards
  const handleFairPlayCardClick = (playerId: string | null) => {
    // If the player already has a fair play card, this will toggle it off
    // If not, it will award the card to this player (removing it from any other player)
    if (playerId) {
      const playerHasCard = availablePlayers.find(p => p.id === playerId)?.receivedFairPlayCard;
      onAwardFairPlayCard(playerHasCard ? null : playerId, timeElapsedInSeconds || 0);
    } else {
      // If playerId is null, clear the fair play card
      onAwardFairPlayCard(null, timeElapsedInSeconds || 0);
    }
  };

  // Conditional return MUST come AFTER all hook calls
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] font-display">
      <div className="bg-slate-800 rounded-none shadow-xl flex flex-col border-0 overflow-hidden h-full w-full bg-noise-texture relative">
        {/* Background effects */}
        <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light" />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent" />
        <div className="absolute -inset-[50px] bg-sky-400/5 blur-2xl top-0 opacity-50" />
        <div className="absolute -inset-[50px] bg-indigo-600/5 blur-2xl bottom-0 opacity-50" />

        {/* Content wrapper */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Fixed Header */}
          <div className="flex justify-center items-center pt-10 pb-4 backdrop-blur-sm bg-slate-900/20">
            <h2 className="text-3xl font-bold text-yellow-400 tracking-wide drop-shadow-lg">
              {t('gameSettingsModal.title', 'Game Settings')}
            </h2>
          </div>

          {/* Fixed Controls Section */}
          <div className="px-6 pt-3 pb-4 backdrop-blur-sm bg-slate-900/20">
            {/* Team Name */}
            <div className="mb-4">
              <label htmlFor="teamNameInput" className="block text-sm font-medium text-slate-300 mb-1">
                {t('gameSettingsModal.teamName', 'Your Team Name')} *
              </label>
              <input
                type="text"
                id="teamNameInput"
                value={teamName}
                onChange={(e) => onTeamNameChange(e.target.value)}
                className={
                  `${inputStyle} placeholder-slate-400`
                }
                placeholder={t('gameSettingsModal.teamNamePlaceholder', 'Enter team name')}
              />
            </div>

            {/* Opponent Name */}
            <div className="mb-4">
              <label htmlFor="opponentNameInput" className="block text-sm font-medium text-slate-300 mb-1">
                {t('gameSettingsModal.opponentName', 'Opponent Name')} *
              </label>
              <input
                type="text"
                id="opponentNameInput"
                value={opponentName}
                onChange={(e) => onOpponentNameChange(e.target.value)}
                className={`${inputStyle} placeholder-slate-400`}
                placeholder={t('gameSettingsModal.opponentNamePlaceholder', 'Enter opponent name')}
              />
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4">
            {/* Linkitä Section */}
            <div className="space-y-4 bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
              <h3 className="text-lg font-semibold text-slate-200 mb-3">
                {t('gameSettingsModal.linkita', 'Link')}
              </h3>

              {/* Tabs */}
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => handleTabChange('none')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'none'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {t('gameSettingsModal.eiMitaan', 'None')}
                </button>
                <button
                  onClick={() => handleTabChange('season')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'season'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {t('gameSettingsModal.kausi', 'Season')}
                </button>
                <button
                  onClick={() => handleTabChange('tournament')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'tournament'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {t('gameSettingsModal.turnaus', 'Tournament')}
                </button>
              </div>

              {/* Season Selection */}
              {activeTab === 'season' && (
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <select
                      id="seasonSelect"
                      value={seasonId || ''}
                      onChange={handleSeasonChange}
                      className={`${inputStyle} flex-1`}
                    >
                      <option value="">{t('gameSettingsModal.selectSeason', '-- Select Season --')}</option>
                      {seasons.map((season) => (
                        <option key={season.id} value={season.id}>
                          {season.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleShowCreateSeason}
                      className="p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                      title={showNewSeasonInput ? t('gameSettingsModal.cancelCreate', 'Cancel creation') : t('gameSettingsModal.createSeason', 'Create new season')}
                      disabled={isAddingSeason || isAddingTournament}
                    >
                      <HiPlusCircle className={`w-6 h-6 transition-transform ${showNewSeasonInput ? 'rotate-45' : ''}`} />
                    </button>
                  </div>
                  {showNewSeasonInput && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        ref={newSeasonInputRef}
                        type="text"
                        value={newSeasonName}
                        onChange={(e) => setNewSeasonName(e.target.value)}
                        onKeyDown={handleNewSeasonKeyDown}
                        placeholder={t('gameSettingsModal.newSeasonPlaceholder', 'Enter new season name...')}
                        className={`${inputStyle} flex-1 min-w-[200px] placeholder-slate-400`}
                        disabled={isAddingSeason}
                      />
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={handleAddNewSeason}
                          disabled={isAddingSeason || !newSeasonName.trim()}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm disabled:opacity-50 whitespace-nowrap"
                        >
                          {isAddingSeason ? t('gameSettingsModal.creating', 'Creating...') : t('gameSettingsModal.addButton', 'Add')}
                        </button>
                        <button
                          onClick={() => {
                            setShowNewSeasonInput(false);
                            setNewSeasonName('');
                          }}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md shadow-sm whitespace-nowrap"
                        >
                          {t('common.cancelButton', 'Cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tournament Selection */}
              {activeTab === 'tournament' && (
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <select
                      id="tournamentSelect"
                      value={tournamentId || ''}
                      onChange={handleTournamentChange}
                      className={`${inputStyle} flex-1`}
                    >
                      <option value="">{t('gameSettingsModal.selectTournament', '-- Select Tournament --')}</option>
                      {tournaments.map((tournament) => (
                        <option key={tournament.id} value={tournament.id}>
                          {tournament.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={handleShowCreateTournament}
                      className="p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                      title={showNewTournamentInput ? t('gameSettingsModal.cancelCreate', 'Cancel creation') : t('gameSettingsModal.createTournament', 'Create new tournament')}
                      disabled={isAddingSeason || isAddingTournament}
                    >
                      <HiPlusCircle className={`w-6 h-6 transition-transform ${showNewTournamentInput ? 'rotate-45' : ''}`} />
                    </button>
                  </div>
                  {showNewTournamentInput && (
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        ref={newTournamentInputRef}
                        type="text"
                        value={newTournamentName}
                        onChange={(e) => setNewTournamentName(e.target.value)}
                        onKeyDown={handleNewTournamentKeyDown}
                        placeholder={t('gameSettingsModal.newTournamentPlaceholder', 'Enter new tournament name...')}
                        className={`${inputStyle} flex-1 min-w-[200px] placeholder-slate-400`}
                        disabled={isAddingTournament}
                      />
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={handleAddNewTournament}
                          disabled={isAddingTournament || !newTournamentName.trim()}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm disabled:opacity-50 whitespace-nowrap"
                        >
                          {isAddingTournament ? t('gameSettingsModal.creating', 'Creating...') : t('gameSettingsModal.addButton', 'Add')}
                        </button>
                        <button
                          onClick={() => {
                            setShowNewTournamentInput(false);
                            setNewTournamentName('');
                          }}
                          className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md shadow-sm whitespace-nowrap"
                        >
                          {t('common.cancelButton', 'Cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Age Group */}
            <div className="mb-4">
              <label htmlFor="ageGroupSelect" className="block text-sm font-medium text-slate-300 mb-1">
                {t('gameSettingsModal.ageGroupLabel', 'Age Group (Optional)')}
              </label>
              <select
                id="ageGroupSelect"
                value={ageGroup}
                onChange={(e) => {
                  onAgeGroupChange(e.target.value);
                  if (currentGameId) {
                    updateGameDetailsMutation.mutate({ gameId: currentGameId, updates: { ageGroup: e.target.value } });
                  }
                }}
                className={inputStyle}
              >
                <option value="">{t('common.none', 'None')}</option>
                {AGE_GROUPS.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            {/* Game Info Section */}
            <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">
                {t('gameSettingsModal.gameInfo', 'Game Info')}
              </h3>
              <div className="space-y-4">
                {/* Game Date */}
                <div className="mb-4">
                  <label htmlFor="gameDateInput" className="block text-sm font-medium text-slate-300 mb-1">
                    {t('gameSettingsModal.gameDateLabel', 'Game Date')}
                  </label>
                  <input
                    type="date"
                    id="gameDateInput"
                    value={gameDate}
                    onChange={(e) => onGameDateChange(e.target.value)}
                    className={inputStyle}
                  />
                </div>

                {/* Game Time */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('gameSettingsModal.gameTimeLabel', 'Time (Optional)')}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={gameHour}
                      onChange={handleHourChange}
                      placeholder={t('gameSettingsModal.hourPlaceholder', 'HH')}
                      className={`${inputStyle} w-1/2 placeholder-slate-400`}
                      maxLength={2}
                    />
                    <span className="text-slate-400">:</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={gameMinute}
                      onChange={handleMinuteChange}
                      placeholder={t('gameSettingsModal.minutePlaceholder', 'MM')}
                      className={`${inputStyle} w-1/2 placeholder-slate-400`}
                      maxLength={2}
                    />
                  </div>
                </div>

                {/* Game Location */}
                <div className="mb-4">
                  <label htmlFor="gameLocationInput" className="block text-sm font-medium text-slate-300 mb-1">
                    {t('gameSettingsModal.locationLabel', 'Location (Optional)')}
                  </label>
                  <input
                    type="text"
                    id="gameLocationInput"
                    value={gameLocation}
                    onChange={(e) => onGameLocationChange(e.target.value)}
                    placeholder={t('gameSettingsModal.locationPlaceholder', 'e.g., Central Park Field 2')}
                    className={`${inputStyle} placeholder-slate-400`}
                  />
                </div>

                {tournamentId && (
                <div className="mb-4">
                  <label htmlFor="levelInput" className="block text-sm font-medium text-slate-300 mb-1">
                    {t('gameSettingsModal.levelLabel', 'Level')}
                  </label>
                  <select
                    id="levelInput"
                    value={tournamentLevel}
                    onChange={(e) => {
                      onTournamentLevelChange(e.target.value);
                      if (currentGameId) {
                        updateGameDetailsMutation.mutate({ gameId: currentGameId, updates: { tournamentLevel: e.target.value } });
                      }
                    }}
                    className={inputStyle}
                  >
                    <option value="">{t('common.none', 'None')}</option>
                    {LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {t(`common.level${lvl}` as TranslationKey, lvl)}
                      </option>
                    ))}
                  </select>
                </div>
                )}

                {/* Home/Away Selection */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('gameSettingsModal.homeOrAwayLabel', 'Home / Away')}
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onSetHomeOrAway('home')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors w-full ${
                        homeOrAway === 'home'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {t('gameSettingsModal.home', 'Home')}
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetHomeOrAway('away')}
                      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors w-full ${
                        homeOrAway === 'away'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      {t('gameSettingsModal.away', 'Away')}
                    </button>
                  </div>
                </div>

                {/* Game Structure */}
                <div className="space-y-4 bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
                  <h3 className="text-lg font-semibold text-slate-200 mb-3">
                    {t('gameSettingsModal.periodsLabel', 'Periods')}
                  </h3>

                  {/* Number of Periods */}
                  <div className="mb-4">
                    <label htmlFor="numPeriodsSelect" className="block text-sm font-medium text-slate-300 mb-1">
                      {t('gameSettingsModal.numPeriodsLabel', 'Number of Periods')}
                    </label>
                    <select
                      id="numPeriodsSelect"
                      value={numPeriods}
                      onChange={(e) => onNumPeriodsChange(parseInt(e.target.value) as 1 | 2)}
                      className={inputStyle}
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                    </select>
                  </div>

                  {/* Period Duration */}
                  <div className="mb-4">
                    <label htmlFor="periodDurationInput" className="block text-sm font-medium text-slate-300 mb-1">
                      {t('gameSettingsModal.periodDurationLabel', 'Period Duration (minutes)')}
                    </label>
                    <input
                      type="number"
                      id="periodDurationInput"
                      value={periodDurationMinutes}
                      onChange={(e) => onPeriodDurationChange(parseInt(e.target.value, 10))}
                      className={inputStyle}
                      min="1"
                    />
                  </div>

                  {/* Demand Factor Slider */}
                  <div className="mb-4">
                    <AssessmentSlider
                      label={t('gameSettingsModal.demandFactorLabel', 'Game Demand Level')}
                      value={demandFactor}
                      onChange={(v) => {
                        onDemandFactorChange(v);
                        if (currentGameId) {
                          updateGameDetailsMutation.mutate({
                            gameId: currentGameId,
                            updates: { demandFactor: v },
                          });
                        }
                      }}
                      min={0.5}
                      max={1.5}
                      step={0.05}
                      reverseColor
                    />
                  </div>
                </div>


                {/* Fair Play Card Section */}
                <div className="space-y-4 bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
                  <h3 className="text-lg font-semibold text-slate-200 mb-4">
                    {t('gameSettingsModal.fairPlayCardTitle', 'Fair Play Card')}
                  </h3>
                  <div className="space-y-3">
                    <p className="text-slate-300 text-sm">
                      {t('gameSettingsModal.fairPlayCardDescription', 'Select a player to award the Fair Play Card, or clear the current selection.')}
                    </p>
                    
                    <div className="flex items-center gap-3">
                      <select
                        value={availablePlayers.find(p => p.receivedFairPlayCard)?.id || ''}
                        onChange={(e) => handleFairPlayCardClick(e.target.value || null)}
                        className={`${inputStyle} flex-1`}
                      >
                        <option value="">{t('gameSettingsModal.selectPlayerForFairPlay', '-- Select Player --')}</option>
                        {availablePlayers.map((player) => (
                          <option key={player.id} value={player.id}>
                            {player.name}
                            {player.receivedFairPlayCard ? ` (${t('gameSettingsModal.currentFairPlayHolder', 'Current')})` : ''}
                          </option>
                        ))}
                      </select>
                      
                      {availablePlayers.some(p => p.receivedFairPlayCard) && (
                        <button
                          onClick={() => handleFairPlayCardClick(null)}
                          className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-md text-sm font-medium transition-colors shadow-sm"
                          title={t('gameSettingsModal.clearFairPlayCard', 'Clear Fair Play Card')}
                        >
                          {t('common.clear', 'Clear')}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Player Selection Section */}
                <div className="space-y-4 bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-200">
                      {t('gameSettingsModal.selectPlayers', 'Select Players')}
                    </h3>
                    <div className="text-sm text-slate-400">
                      <span className="text-yellow-400 font-semibold">{selectedPlayerIds.length}</span>
                      {" / "}
                      <span className="text-yellow-400 font-semibold">{availablePlayers.length}</span>
                      {" "}{t('gameSettingsModal.playersSelected', 'selected')}
                    </div>
                  </div>

                  {availablePlayers.length > 0 ? (
                    <>
                      {/* Select All Header */}
                      <div className="flex items-center py-2 px-1 border-b border-slate-700/50">
                        <label className="flex items-center text-sm text-slate-300 hover:text-slate-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={availablePlayers.length === selectedPlayerIds.length}
                            onChange={() => {
                              if (selectedPlayerIds.length === availablePlayers.length) {
                                onSelectedPlayersChange([]);
                              } else {
                                onSelectedPlayersChange(availablePlayers.map(p => p.id));
                              }
                            }}
                            className="form-checkbox h-4 w-4 text-indigo-600 bg-slate-700 border-slate-500 rounded focus:ring-indigo-500 focus:ring-offset-slate-800"
                          />
                          <span className="ml-2">{t('gameSettingsModal.selectAll', 'Select All')}</span>
                        </label>
                      </div>

                      {/* Player List */}
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                        {availablePlayers.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center py-1.5 px-1 rounded hover:bg-slate-800/40 transition-colors"
                          >
                            <label className="flex items-center flex-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedPlayerIds.includes(player.id)}
                                onChange={() => {
                                  if (selectedPlayerIds.includes(player.id)) {
                                    onSelectedPlayersChange(selectedPlayerIds.filter(id => id !== player.id));
                                  } else {
                                    onSelectedPlayersChange([...selectedPlayerIds, player.id]);
                                  }
                                }}
                                className="form-checkbox h-4 w-4 text-indigo-600 bg-slate-700 border-slate-500 rounded focus:ring-indigo-500 focus:ring-offset-slate-800"
                              />
                              <span className="ml-2 text-slate-200">
                                {player.name}
                                {player.nickname && (
                                  <span className="text-slate-400 ml-1">({player.nickname})</span>
                                )}
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4 text-slate-400">
                      {t('gameSettingsModal.noPlayersInRoster', 'No players in roster. Add players in Roster Settings.')}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Game Events Section */}
            <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">
                {t('gameSettingsModal.eventLogTitle', 'Event Log')}
              </h3>
              <div className="space-y-2">
                {sortedEvents.map(event => (
                  <div 
                    key={event.id}
                    className={`p-3 rounded-md border ${
                      editingGoalId === event.id
                        ? 'bg-slate-700/75 border-indigo-500'
                        : 'bg-slate-800/40 border-slate-700/50'
                    }`}
                  >
                    {editingGoalId === event.id ? (
                      <div className="space-y-3">
                        <input
                          ref={goalTimeInputRef}
                          type="text"
                          value={editGoalTime}
                          onChange={(e) => setEditGoalTime(e.target.value)}
                          placeholder={t('gameSettingsModal.timeFormatPlaceholder', 'MM:SS')}
                          className={`${inputStyle} placeholder-slate-400`}
                        />
                        {event.type === 'goal' && (
                          <>
                            <select
                              value={editGoalScorerId}
                              onChange={(e) => setEditGoalScorerId(e.target.value)}
                              className={`${inputStyle} appearance-none`}
                            >
                              <option value="">{t('gameSettingsModal.selectScorer', 'Select Scorer...')}</option>
                              {availablePlayers.map(player => (
                                <option key={player.id} value={player.id}>{player.name}</option>
                              ))}
                            </select>
                            <select
                              value={editGoalAssisterId}
                              onChange={(e) => setEditGoalAssisterId(e.target.value || undefined)}
                              className={`${inputStyle} appearance-none`}
                            >
                              <option value="">{t('gameSettingsModal.selectAssister', 'Select Assister (Optional)...')}</option>
                              {availablePlayers.map(player => (
                                <option key={player.id} value={player.id}>{player.name}</option>
                              ))}
                            </select>
                          </>
                        )}
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={handleCancelEditGoal}
                            className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800"
                            disabled={isProcessing}
                          >
                            {t('common.cancel', 'Cancel')}
                          </button>
                          <button
                            onClick={() => handleSaveGoal(event.id)}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800"
                            disabled={isProcessing}
                          >
                            {t('common.save', 'Save')}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <span className="text-slate-300">{formatTime(event.time)}</span>
                          <span className="text-slate-100">
                            {getEventDescription(event, availablePlayers, t)}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditGoal(event)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-indigo-400 transition-colors"
                            title={t('common.edit', 'Edit')}
                            disabled={isProcessing}
                          >
                            <FaEdit className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(event.id)}
                            className="p-1.5 rounded-md text-slate-400 hover:text-red-500 transition-colors"
                            title={t('common.delete', 'Delete')}
                            disabled={isProcessing}
                          >
                            <FaTrashAlt className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {sortedEvents.length === 0 && (
                  <div className="text-slate-400 text-center py-4">
                    {t('gameSettingsModal.noGoalsLogged', 'No goals logged yet.')}
                  </div>
                )}
              </div>
            </div>

            {/* Game Notes Section */}
            <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">
                {t('gameSettingsModal.notesTitle', 'Game Notes')}
              </h3>
              {inlineEditingField === 'notes' ? (
                <div className="space-y-3">
                  <textarea
                    ref={notesTextareaRef}
                    value={inlineEditValue}
                    onChange={(e) => setInlineEditValue(e.target.value)}
                    onKeyDown={handleInlineEditKeyDown}
                    className={`${inputStyle} h-32 resize-none placeholder-slate-400`}
                    placeholder={t('gameSettingsModal.notesPlaceholder', 'Write notes...')}
                    disabled={isProcessing}
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={handleCancelInlineEdit}
                      className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800"
                      disabled={isProcessing}
                    >
                      {t('common.cancel', 'Cancel')}
                    </button>
                    <button
                      onClick={handleConfirmInlineEdit}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800"
                      disabled={isProcessing}
                    >
                      {t('common.save', 'Save')}
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  className="cursor-pointer hover:text-yellow-400 transition-colors min-h-[8rem] p-3 rounded-md border border-slate-700/50 bg-slate-700/50"
                  onClick={() => handleStartInlineEdit('notes')}
                >
                  {gameNotes || t('gameSettingsModal.noNotes', 'No notes yet. Click to add.')}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700/20 backdrop-blur-sm bg-slate-900/20">
            <div className="flex justify-end px-4">
              {error && (
                <div className="text-red-400 text-sm mr-auto">{error}</div>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800"
              >
                {t('common.close', 'Close')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameSettingsModal;
