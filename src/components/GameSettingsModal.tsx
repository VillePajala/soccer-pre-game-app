'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaEdit, FaTrashAlt } from 'react-icons/fa';
import { Season, Tournament, Player } from '@/types';
import { GameEvent } from '@/app/page';
import { getSeasons } from '@/utils/seasons';
import { getTournaments } from '@/utils/tournaments';
import { updateGameDetails, updateGameEvent, removeGameEvent } from '@/utils/savedGames';

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
  seasonId?: string | null;
  tournamentId?: string | null;
  gameEvents: GameEvent[];
  availablePlayers: Player[];
  numPeriods: number;
  periodDurationMinutes: number;
  // --- Handlers for updating game data ---
  onTeamNameChange: (name: string) => void;
  onOpponentNameChange: (name: string) => void;
  onGameDateChange: (date: string) => void;
  onGameLocationChange: (location: string) => void;
  onGameTimeChange: (time: string) => void;
  onGameNotesChange: (notes: string) => void;
  onUpdateGameEvent: (updatedEvent: GameEvent) => void;
  onDeleteGameEvent?: (goalId: string) => void;
  onNumPeriodsChange: (num: number) => void;
  onPeriodDurationChange: (minutes: number) => void;
  onSeasonIdChange: (seasonId: string | null) => void;
  onTournamentIdChange: (tournamentId: string | null) => void;
  onAwardFairPlayCard: (playerId: string | null) => void;
  homeOrAway: 'home' | 'away';
  onSetHomeOrAway: (status: 'home' | 'away') => void;
}

// Helper to format time from seconds to MM:SS
const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
  onTeamNameChange,
  onOpponentNameChange,
  onGameDateChange,
  onGameLocationChange,
  onGameTimeChange,
  onGameNotesChange,
  onUpdateGameEvent,
  onDeleteGameEvent,
  gameEvents,
  availablePlayers,
  seasonId,
  tournamentId,
  numPeriods,
  periodDurationMinutes,
  onNumPeriodsChange,
  onPeriodDurationChange,
  onSeasonIdChange,
  onTournamentIdChange,
  onAwardFairPlayCard,
  homeOrAway,
  onSetHomeOrAway,
}) => {
  // console.log('[GameSettingsModal Render] Props received:', { seasonId, tournamentId, currentGameId });
  const { t } = useTranslation();

  // State for event editing within the modal
  const [localGameEvents, setLocalGameEvents] = useState<GameEvent[]>(gameEvents);
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalTime, setEditGoalTime] = useState<string>('');
  const [editGoalScorerId, setEditGoalScorerId] = useState<string>('');
  const [editGoalAssisterId, setEditGoalAssisterId] = useState<string | undefined>(undefined);
  const [selectedFairPlayPlayerId, setSelectedFairPlayPlayerId] = useState<string | null>(
    gameEvents.find(e => e.type === 'fairPlayCard')?.entityId || null
  );
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

  // State for Season/Tournament Name Lookup
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  // NEW: Loading and Error states for modal operations
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NEW: Local state to control which association UI is active
  const [activeDisplayType, setActiveDisplayType] = useState<'season' | 'tournament' | 'none'>('none');

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
    if (value.length <= 2) {
      setGameHour(value);
      const formattedHour = value.padStart(2, '0');
      const formattedMinute = gameMinute.padStart(2, '0');
      onGameTimeChange((value && gameMinute) ? `${formattedHour}:${formattedMinute}` : '');
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 2) {
      setGameMinute(value);
      const formattedHour = gameHour.padStart(2, '0');
      const formattedMinute = value.padStart(2, '0');
      onGameTimeChange((gameHour && value) ? `${formattedHour}:${formattedMinute}` : '');
    }
  };

  // --- Effects ---

  // Sync activeDisplayType with incoming props
  useEffect(() => {
    if (isOpen) { // Only adjust when modal is open
      if (seasonId && seasonId !== '') {
        setActiveDisplayType('season');
      } else if (tournamentId && tournamentId !== '') {
        setActiveDisplayType('tournament');
      } else {
        setActiveDisplayType('none');
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
        console.error('Error loading seasons:', error);
        setSeasons([]);
      }
      try {
          const loadedTournamentsData = await getTournaments();
          setTournaments(Array.isArray(loadedTournamentsData) ? loadedTournamentsData : []);
      } catch (error) {
        console.error('Error loading tournaments:', error);
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

  // --- Event Handlers ---

  const handleSeasonChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = event.target.value;
    const seasonToSet = newId === '' ? null : newId; // Convert empty string from select to null for handler
    onSeasonIdChange(seasonToSet); // Reducer will clear tournamentId
    // setActiveDisplayType('season'); // Already in season display type
  };

  const handleTournamentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = event.target.value;
    const tournamentToSet = newId === '' ? null : newId; // Convert empty string from select to null for handler
    onTournamentIdChange(tournamentToSet); // Reducer will clear seasonId
    // setActiveDisplayType('tournament'); // Already in tournament display type
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
      console.error("[GameSettingsModal] Missing goalId or currentGameId for save.");
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
        console.error(`[GameSettingsModal] Original event not found for ID: ${goalId}`);
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
          console.log(`[GameSettingsModal] Event ${goalId} updated in game ${currentGameId}.`);
          handleCancelEditGoal(); // Close edit mode on success
        } else {
          console.error(`[GameSettingsModal] Failed to update event ${goalId} in game ${currentGameId} via utility.`);
          setError(t('gameSettingsModal.errors.updateFailed', 'Failed to update event. Please try again.'));
          // Optionally revert UI:
          // setLocalGameEvents(gameEvents); // Revert local state if save failed
        }
      } else {
        console.error(`[GameSettingsModal] Event ${goalId} not found in original gameEvents prop for saving.`);
        setError(t('gameSettingsModal.errors.eventNotFound', 'Original event not found for saving.'));
      }
    } catch (err) {
      console.error(`[GameSettingsModal] Error updating event ${goalId} in game ${currentGameId}:`, err);
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
      console.error("[GameSettingsModal] Missing onDeleteGameEvent handler or currentGameId for delete.");
      setError(t('gameSettingsModal.errors.missingDeleteHandler', 'Cannot delete event: Critical configuration missing.'));
      return;
    }

      if (window.confirm(t('gameSettingsModal.confirmDeleteEvent', 'Are you sure you want to delete this event? This cannot be undone.'))) {
      setError(null);
      setIsProcessing(true);
      try {
        const eventIndex = gameEvents.findIndex(e => e.id === goalId); 
        if (eventIndex === -1) {
          console.error(`[GameSettingsModal] Event ${goalId} not found in original gameEvents for deletion.`);
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
          console.log(`[GameSettingsModal] Event ${goalId} removed from game ${currentGameId}.`);
        } else {
          console.error(`[GameSettingsModal] Failed to remove event ${goalId} from game ${currentGameId} via utility.`);
          setError(t('gameSettingsModal.errors.deleteFailed', 'Failed to delete event. Please try again.'));
          setLocalGameEvents(originalLocalEvents); // Revert local UI on failure
        }
      } catch (err) {
        console.error(`[GameSettingsModal] Error removing event ${goalId} from game ${currentGameId}:`, err);
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
        console.error("[GameSettingsModal] currentGameId is null, cannot save inline edit.");
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
        console.log(`[GameSettingsModal] Inline edit for ${fieldProcessed} saved for game ${currentGameId}.`);
        setInlineEditingField(null); // Exit inline edit mode on success
        setInlineEditValue('');
      }
    } catch (err) {
      console.error(`[GameSettingsModal] Error saving inline edit for ${fieldProcessed} (Game ID: ${currentGameId}):`, err);
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
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
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
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                placeholder={t('gameSettingsModal.opponentNamePlaceholder', 'Enter opponent name')}
              />
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4">
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
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  />
                </div>

                {/* Game Time */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {t('gameSettingsModal.gameTimeLabel', 'Time (Optional)')}
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="number"
                      value={gameHour}
                      onChange={handleHourChange}
                      placeholder={t('gameSettingsModal.hourPlaceholder', 'HH')}
                      className="w-1/2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      min="0"
                      max="23"
                    />
                    <span className="text-slate-400">:</span>
                    <input
                      type="number"
                      value={gameMinute}
                      onChange={handleMinuteChange}
                      placeholder={t('gameSettingsModal.minutePlaceholder', 'MM')}
                      className="w-1/2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      min="0"
                      max="59"
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
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                  />
                </div>

                {/* Game Structure */}
                <div className="space-y-4 bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
                  <h3 className="text-lg font-semibold text-slate-200 mb-3">
                    {t('gameSettingsModal.periodsLabel', 'Game Settings')}
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
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
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
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                      min="1"
                    />
                  </div>

                  {/* Home/Away Selection */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-300 mb-1">
                      {t('gameSettingsModal.homeOrAwayLabel', 'Your Team is')}
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => onSetHomeOrAway('home')}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                          homeOrAway === 'home'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {t('common.home', 'Home')}
                      </button>
                      <button
                        onClick={() => onSetHomeOrAway('away')}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                          homeOrAway === 'away'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {t('common.away', 'Away')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Fair Play Card Selection */}
            <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">
                {t('gameSettingsModal.fairPlayCard', 'Fair Play Card')}
              </h3>
              <select
                value={selectedFairPlayPlayerId || ''}
                onChange={(e) => {
                  const newValue = e.target.value || null;
                  setSelectedFairPlayPlayerId(newValue);
                  onAwardFairPlayCard(newValue);
                }}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm appearance-none"
                disabled={isProcessing}
              >
                <option value="">{t('gameSettingsModal.noneAwarded', '-- None Awarded --')}</option>
                {availablePlayers
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map(player => (
                    <option key={player.id} value={player.id}>
                      {player.name} {player.jerseyNumber ? `(#${player.jerseyNumber})` : ''}
                    </option>
                  ))
                }
              </select>
            </div>

            {/* Association Controls */}
            <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
              <h3 className="text-lg font-semibold text-slate-200 mb-4">
                {t('gameSettingsModal.association', 'Association')}
              </h3>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <button
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                      activeDisplayType === 'none'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    onClick={() => {
                      setActiveDisplayType('none');
                      onSeasonIdChange(null);
                      onTournamentIdChange(null);
                    }}
                  >
                    {t('gameSettingsModal.associationNone', 'None')}
                  </button>
                  <button
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                      activeDisplayType === 'season'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    onClick={() => {
                      setActiveDisplayType('season');
                      onTournamentIdChange(null);
                    }}
                  >
                    {t('gameSettingsModal.associationSeason', 'Season')}
                  </button>
                  <button
                    className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                      activeDisplayType === 'tournament'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                    onClick={() => {
                      setActiveDisplayType('tournament');
                      onSeasonIdChange(null);
                    }}
                  >
                    {t('gameSettingsModal.associationTournament', 'Tournament')}
                  </button>
                </div>

                {activeDisplayType === 'season' && (
                  <select
                    value={seasonId || ''}
                    onChange={handleSeasonChange}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm appearance-none"
                  >
                    <option value="">{t('gameSettingsModal.selectSeason', '- Select Season -')}</option>
                    {seasons.map(season => (
                      <option key={season.id} value={season.id}>{season.name}</option>
                    ))}
                  </select>
                )}

                {activeDisplayType === 'tournament' && (
                  <select
                    value={tournamentId || ''}
                    onChange={handleTournamentChange}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm appearance-none"
                  >
                    <option value="">{t('gameSettingsModal.selectTournament', '- Select Tournament -')}</option>
                    {tournaments.map(tournament => (
                      <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
                    ))}
                  </select>
                )}
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
                          placeholder="MM:SS"
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        />
                        {event.type === 'goal' && (
                          <>
                            <select
                              value={editGoalScorerId}
                              onChange={(e) => setEditGoalScorerId(e.target.value)}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm appearance-none"
                            >
                              <option value="">{t('gameSettingsModal.selectScorer', 'Select Scorer...')}</option>
                              {availablePlayers.map(player => (
                                <option key={player.id} value={player.id}>{player.name}</option>
                              ))}
                            </select>
                            <select
                              value={editGoalAssisterId}
                              onChange={(e) => setEditGoalAssisterId(e.target.value || undefined)}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm appearance-none"
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
                            {event.type === 'goal' ? (
                              <>
                                {availablePlayers.find(p => p.id === event.scorerId)?.name || t('gameSettingsModal.unknownPlayer', 'Unknown Player')}
                                {event.assisterId && (
                                  <span className="text-slate-400">
                                    {" "}({t('common.assist', 'Assist')}: {availablePlayers.find(p => p.id === event.assisterId)?.name})
                                  </span>
                                )}
                              </>
                            ) : (
                              t('gameSettingsModal.logTypeOpponentGoal', 'Opponent Goal')
                            )}
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
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm h-32 resize-none"
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
            <div className="flex justify-between px-4">
              {error && (
                <div className="text-red-400 text-sm">{error}</div>
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