'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTimes, FaEdit, FaSave, FaTrashAlt, FaCalendarAlt, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import { Season, Tournament, Player } from '@/types'; // Import Player from types
import { GameEvent } from '@/app/page'; // Import GameEvent from page for type compatibility
import { getSeasons } from '@/utils/seasons';
import { getTournaments } from '@/utils/tournaments';
import { updateGameDetails, updateGameEvent, removeGameEvent } from '@/utils/savedGames'; // Import savedGames utility functions

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
  homeScore: number;
  awayScore: number;
  gameEvents: GameEvent[];
  availablePlayers: Player[];
  // ADD: Period and Duration props
  numPeriods: number;
  periodDurationMinutes: number;
  // --- Handlers for updating game data ---
  onOpponentNameChange: (name: string) => void;
  onGameDateChange: (date: string) => void;
  onGameLocationChange: (location: string) => void;
  onGameTimeChange: (time: string) => void;
  onGameNotesChange: (notes: string) => void;
  onUpdateGameEvent: (updatedEvent: GameEvent) => void;
  onAwardFairPlayCard: (playerId: string | null) => void;
  // ADD: Event deletion callback
  onDeleteGameEvent?: (goalId: string) => void;
  // ADD: Period and Duration callbacks
  onNumPeriodsChange: (num: number) => void;
  onPeriodDurationChange: (minutes: number) => void;
  // ADD new handlers for Season/Tournament
  onSeasonIdChange: (seasonId: string | null) => void;
  onTournamentIdChange: (tournamentId: string | null) => void;
  // <<< ADD: Home/Away props >>>
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
  // Destructure props
  currentGameId,
  teamName,
  opponentName,
  gameDate,
  gameLocation = '',
  gameTime = '',
  gameNotes = '',
  homeScore,
  awayScore,
  onOpponentNameChange,
  onGameDateChange,
  onGameLocationChange,
  onGameTimeChange,
  onGameNotesChange,
  onUpdateGameEvent,
  onAwardFairPlayCard,
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
  // <<< Destructure new props >>>
  homeOrAway,
  onSetHomeOrAway,
}) => {
  // console.log('[GameSettingsModal Render] Props received:', { seasonId, tournamentId, currentGameId });
  const { t } = useTranslation();

  // Helper function definition INSIDE the component body
  const formatDateFi = (isoDate: string): string => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      return isoDate || t('common.notSet', 'Not Set');
    }
    const parts = isoDate.split('-');
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  };

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
    'opponent' | 'date' | 'location' | 'time' | 'duration' | 'notes' | null
  >(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');
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
    if (inlineEditingField === 'opponent') opponentInputRef.current?.focus();
    else if (inlineEditingField === 'date') dateInputRef.current?.focus();
    else if (inlineEditingField === 'location') locationInputRef.current?.focus();
    else if (inlineEditingField === 'time') timeInputRef.current?.focus();
    else if (inlineEditingField === 'duration') durationInputRef.current?.focus();
    else if (inlineEditingField === 'notes') notesTextareaRef.current?.focus();

    if(inlineEditingField) {
        // Select text content on focus for easier editing
        const inputElement = opponentInputRef.current || dateInputRef.current || locationInputRef.current || timeInputRef.current || durationInputRef.current;
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
  const handleStartInlineEdit = (field: 'opponent' | 'date' | 'location' | 'time' | 'duration' | 'notes') => {
    setInlineEditingField(field);
    // Initialize edit value based on current prop value
    switch (field) {
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
        // alert(t('common.saveError', "Cannot save changes: Game ID is missing."));
        setError(t('gameSettingsModal.errors.missingGameIdInline', "Cannot save: Game ID missing."));
        return;
      }

      switch (inlineEditingField) {
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
      // alert(t('common.saveError', "An error occurred while saving."));
      setError(t('gameSettingsModal.errors.genericInlineSaveError', "Error saving changes. Please try again."));
    } finally {
      setIsProcessing(false);
      // Only clear editing field if successful, otherwise user might want to retry/cancel
      // This is now handled inside the try block upon success.
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

  // Define styles based on GameStatsModal for consistency
  const labelStyle = "text-xs font-medium text-slate-400 uppercase flex items-center mb-0.5";
  const valueStyle = "text-base text-slate-100 font-medium";
  const editInputStyle = "block w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm";
  const editSelectStyle = `${editInputStyle} appearance-none`;
  const gridItemStyle = "mb-2";

  return (
    // Backdrop (matches GameStatsModal)
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4" onClick={onClose}>
      {/* Main Container - Apply GameStatsModal styles */}
      <div
        className="bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl h-[95vh] overflow-hidden flex flex-col text-white relative p-0" /* Changed bg, size, padding */
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        {/* Header - Add standard header */}
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700 flex-shrink-0 px-6 pt-4"> {/* Added padding */} 
          <h2 className="text-xl font-bold text-amber-400 flex items-center">
            {t('gameSettingsModal.title', 'Game Settings & Log')}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl" /* Match StatsModal close button */
            aria-label={t('common.close', 'Close')}
          >
            <FaTimes />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-grow overflow-y-auto overflow-x-hidden px-6 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 space-y-4 pb-4"> {/* Adjusted padding to px-6 */} 
          
          {/* General Error Display Area */}
          {error && (
            <div className="bg-red-700/30 border border-red-600 text-red-300 px-4 py-3 rounded-md text-sm mb-4" role="alert">
              <p>{error}</p>
            </div>
          )}
          
          {/* Game Info Section - Apply Card Styles */}
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">{t('gameSettingsModal.gameInfo', 'Game Info')}</h3>
            {/* Force single column layout to debug overflow */}
            <div className="grid grid-cols-1 gap-x-6 gap-y-1"> 
              {/* Opponent Name */}
              <div className={gridItemStyle}>
                <span className={labelStyle}>{t('gameSettingsModal.opponent', 'Opponent')}:</span>
                {inlineEditingField === 'opponent' ? (
                  <input 
                    ref={opponentInputRef}
                    type="text"
                      value={inlineEditValue}
                      onChange={(e) => setInlineEditValue(e.target.value)}
                      onKeyDown={handleInlineEditKeyDown}
                      onBlur={isProcessing ? undefined : handleConfirmInlineEdit} // Prevent confirm on blur if processing
                      className={editInputStyle} 
                      readOnly={isProcessing} // Make readonly during processing
                  />
                ) : (
                  <span className={`${valueStyle} p-1.5 rounded hover:bg-slate-700/50 cursor-pointer block truncate`} title={opponentName} onClick={() => !isProcessing && handleStartInlineEdit('opponent')}> {/* Prevent starting edit if processing */}
                    {opponentName}
                    {/* Edit icon can be implicitly shown via hover bg */}
                  </span>
                )}
              </div>

              {/* Home/Away Status - Step 5a */}
              <div className={gridItemStyle}>
                <span className={labelStyle}>{t('gameSettingsModal.venue', 'Venue')}:</span>
                <div className="flex items-center space-x-4 bg-slate-800/60 border border-slate-700 rounded-md p-1 mt-0.5"> {/* Adjust bg/padding */} 
                  <label className={`flex-1 text-center px-2 py-0.5 rounded cursor-pointer transition-colors duration-150 text-sm ${homeOrAway === 'home' ? 'bg-blue-600 text-white shadow-inner' : 'bg-slate-700 hover:bg-slate-600'}`}>
                    <input 
                      type="radio"
                      name="modalHomeOrAway"
                      value="home"
                      checked={homeOrAway === 'home'}
                      onChange={() => onSetHomeOrAway('home')}
                      className="sr-only"
                    />
                    {t('general.home', 'Home')}
                  </label>
                  <label className={`flex-1 text-center px-2 py-0.5 rounded cursor-pointer transition-colors duration-150 text-sm ${homeOrAway === 'away' ? 'bg-teal-600 text-white shadow-inner' : 'bg-slate-700 hover:bg-slate-600'}`}>
                    <input 
                      type="radio"
                      name="modalHomeOrAway"
                      value="away"
                      checked={homeOrAway === 'away'}
                      onChange={() => onSetHomeOrAway('away')}
                      className="sr-only"
                    />
                    {t('general.away', 'Away')}
                  </label>
                </div>
              </div>

              {/* Game Date */}
              <div className={gridItemStyle}>
                <span className={labelStyle}>
                  <FaCalendarAlt className="mr-1.5 text-slate-500" size={12} />
                      {t('gameSettingsModal.date', 'Date')}:
                </span>
                {inlineEditingField === 'date' ? (
                  <input 
                    ref={dateInputRef}
                        type="date" 
                        value={inlineEditValue} 
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        onKeyDown={handleInlineEditKeyDown}
                        onBlur={isProcessing ? undefined : handleConfirmInlineEdit} 
                        className={`${editInputStyle} appearance-none`} 
                        style={{ colorScheme: 'dark' }}
                        readOnly={isProcessing}
                  />
                ) : (
                      <span className={`${valueStyle} p-1.5 rounded hover:bg-slate-700/50 cursor-pointer block truncate`} onClick={() => !isProcessing && handleStartInlineEdit('date')}>
                          {formatDateFi(gameDate)} 
                  </span>
                )}
              </div>

              {/* Game Location */}
              <div className={gridItemStyle}>
                <span className={labelStyle}>
                  <FaMapMarkerAlt className="mr-1.5 text-slate-500" size={12} />
                  {t('gameSettingsModal.location', 'Location')}:
                </span>
                {inlineEditingField === 'location' ? (
                  <input 
                    ref={locationInputRef}
                    type="text"
                        value={inlineEditValue}
                        onChange={(e) => setInlineEditValue(e.target.value)}
                      onKeyDown={handleInlineEditKeyDown}
                        onBlur={isProcessing ? undefined : handleConfirmInlineEdit} 
                        className={editInputStyle} 
                        placeholder={t('common.optional', 'Optional')}
                        readOnly={isProcessing}
                  />
                ) : (
                      <span className={`${valueStyle} p-1.5 rounded hover:bg-slate-700/50 cursor-pointer block truncate`} title={gameLocation || t('common.notSet', 'Not Set')} onClick={() => !isProcessing && handleStartInlineEdit('location')}>
                        {gameLocation || <span className="text-slate-500 italic">{t('common.notSet', 'Not Set')}</span>}
                  </span>
                )}
              </div>
              
              {/* Game Time - Reverted to single input type="time" */}
              <div className={gridItemStyle}>
                <span className={labelStyle}>
                  <FaClock className="mr-1.5 text-slate-500" size={12} />
                  {t('gameSettingsModal.time', 'Time')}:
                </span>
                    <input 
                    type="time"
                    value={gameTime} // Directly use gameTime prop (should be HH:MM or "")
                    onChange={async (e) => {
                        const newTimeValue = e.target.value; // Format is HH:MM
                        onGameTimeChange(newTimeValue); // Update parent state

                        if (currentGameId) {
                            setIsProcessing(true);
                            setError(null);
                            try {
                                await updateGameDetails(currentGameId, { gameTime: newTimeValue });
                                console.log(`[GameSettingsModal] Updated gameTime to ${newTimeValue}`);
                            } catch (err) {
                                console.error("[GameSettingsModal] Failed to update gameTime:", err);
                                setError(t('gameSettingsModal.errors.timeUpdateFailed', 'Error updating game time.'));
                            } finally {
                                setIsProcessing(false);
                            }
                        }
                    }}
                    className={`${editInputStyle} w-auto px-2 py-1 mt-1`} 
                    disabled={isProcessing}
                      />
              </div>

              {/* Scores (Readonly) */}
              <div className={gridItemStyle}>
                <span className={labelStyle}>{t('common.score', 'Score')}:</span>
                <span className={valueStyle}>{teamName} {homeScore} - {awayScore} {opponentName}</span>
                </div>

              {/* Periods (Use buttons like StatsModal?) - Let's use buttons for consistency */}
              <div className={gridItemStyle}>
                  <span className={labelStyle}>{t('gameSettingsModal.periods', 'Periods')}:</span>
                <div className="flex items-center space-x-2 mt-1">
                  {[1, 2].map(num => (
                    <button 
                      key={num}
                              onClick={() => onNumPeriodsChange(num as 1 | 2)}
                              className={`px-3 py-1 rounded text-sm transition-colors ${numPeriods === num ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                          >
                      {num}
                    </button>
                  ))}
                </div>
              </div>

               {/* Period Duration */}
              <div className={gridItemStyle}>
                  <span className={labelStyle}>{t('gameSettingsModal.duration', 'Duration')}:</span>
                {inlineEditingField === 'duration' ? (
                      <div className="flex items-center">
                  <input 
                    ref={durationInputRef}
                    type="number"
                          min="1"
                          step="1"
                          value={inlineEditValue} 
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onKeyDown={handleInlineEditKeyDown}
                          onBlur={isProcessing ? undefined : handleConfirmInlineEdit} 
                          className={`${editInputStyle} w-20`}  
                          readOnly={isProcessing}
                        />
                           <span className="ml-2 text-slate-400 text-sm">{t('common.minutesShort', 'min')}</span>
                       </div>
                   ) : (
                       <span className={`${valueStyle} p-1.5 rounded hover:bg-slate-700/50 cursor-pointer block truncate`} onClick={() => !isProcessing && handleStartInlineEdit('duration')}>
                           {periodDurationMinutes} {t('common.minutesShort', 'min')}
                  </span>
                )}
              </div>
              
              {/* Fair Play Card */}
              <div className={`${gridItemStyle} md:col-span-2`}> {/* Span across columns */} 
                   <span className={labelStyle}>{t('gameSettingsModal.fairPlayCard', 'Fair Play')}:</span>
              <select
                    value={selectedFairPlayPlayerId || ''}
                    onChange={(e) => {
                      setSelectedFairPlayPlayerId(e.target.value || null);
                      onAwardFairPlayCard(e.target.value || null);
                    }}
                    className={`${editSelectStyle} mt-1`} /* Use defined style */
                  >
                    <option value="">{t('gameSettingsModal.noneAwarded', '-- None Awarded --')}</option>
                    {availablePlayers.sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.jerseyNumber ? `(#${p.jerseyNumber})` : ''}
                    </option>
                  ))}
              </select>
            </div>

              {/* Season/Tournament Association */}
              <div className={`${gridItemStyle} md:col-span-2 pt-3 mt-2 border-t border-slate-700`}> {/* Span, add padding/border */}
                   <span className={labelStyle}>{t('gameSettingsModal.association', 'Association')}:</span>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mt-1">
                    {/* None button */}
                    <button
                      onClick={() => {
                        if (isProcessing) return;
                        setActiveDisplayType('none');
                        onSeasonIdChange(null);
                        onTournamentIdChange(null);
                      }}
                      className={`px-3 py-1 rounded text-sm transition-colors ${activeDisplayType === 'none' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={isProcessing}
                    >
                      {t('gameSettingsModal.associationNone', 'None')}
                    </button>
                    
                    {/* Season button */}
                    <button
                      onClick={() => {
                        if (isProcessing) return;
                        setActiveDisplayType('season');
                        // If not already effectively in season mode (i.e. seasonId is not set or is empty after clearing tournament)
                        // or if no seasons are available, set seasonId to '' to ensure the dropdown appears and reducer clears tournamentId.
                        if (!seasonId && seasons && seasons.length > 0) {
                            onSeasonIdChange(seasons[0].id); 
                        } else {
                            onSeasonIdChange(''); // Ensures tournamentId is cleared by reducer
                        }
                      }}
                      className={`px-3 py-1 rounded text-sm transition-colors ${activeDisplayType === 'season' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={isProcessing}
                    >
                      {t('gameSettingsModal.associationSeason', 'Season/League')}
                    </button>
                    
                    {/* Tournament button */}
                    <button
                      onClick={() => {
                        if (isProcessing) return;
                        setActiveDisplayType('tournament');
                        if (!tournamentId && tournaments && tournaments.length > 0) {
                            onTournamentIdChange(tournaments[0].id);
                        } else {
                            onTournamentIdChange(''); // Ensures seasonId is cleared by reducer
                        }
                      }}
                      className={`px-3 py-1 rounded text-sm transition-colors ${activeDisplayType === 'tournament' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'} ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={isProcessing}
                    >
                      {t('gameSettingsModal.associationTournament', 'Tournament')}
                    </button>
                  </div>
              {activeDisplayType === 'season' && (
                  <select 
                      value={seasonId || ''} // Use prop directly for controlled component value
                      onChange={handleSeasonChange}
                      className={`${editSelectStyle} mt-1 w-full md:w-auto ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={isProcessing} 
                    >
                           <option value="">{t('gameSettingsModal.selectSeason', '-- Select Season --')}</option>
                           {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
              )}
              {activeDisplayType === 'tournament' && (
                  <select 
                      value={tournamentId || ''} // Use prop directly
                      onChange={handleTournamentChange}
                      className={`${editSelectStyle} mt-1 w-full md:w-auto ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={isProcessing}
                    >
                           <option value="">{t('gameSettingsModal.selectTournament', '-- Select Tournament --')}</option>
                           {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                   )}
                </div>
              </div>
              </div>


          {/* Game Notes Section - Apply Card Styles */}
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200 mb-3 flex justify-between items-center"> {/* Match Stats title style */} 
              {t('gameSettingsModal.notes', 'Game Notes')}
              {inlineEditingField !== 'notes' && (
                <button
                  onClick={() => !isProcessing && handleStartInlineEdit('notes')}
                  className="text-xs text-slate-400 hover:text-indigo-400 flex items-center"
                  aria-label={t('gameSettingsModal.editNotes', 'Edit Notes')}
                  disabled={isProcessing}
                >
                   <FaEdit className="inline mr-1" size={12}/>
                </button>
              )}
            </h3>
            {inlineEditingField === 'notes' ? (
              <div>
              <textarea 
                  ref={notesTextareaRef}
                  value={inlineEditValue} 
                  onChange={(e) => setInlineEditValue(e.target.value)} 
                  onKeyDown={handleInlineEditKeyDown} 
                  onBlur={isProcessing ? undefined : handleConfirmInlineEdit} // Allow blur to confirm if not processing
                  rows={4}
                  className={`${editInputStyle} text-sm`}  
                  placeholder={t('gameSettingsModal.notesPlaceholder', 'Enter notes about the game...')}
                  readOnly={isProcessing}
                />
                {/* Add Save/Cancel explicitly for notes textarea */}
                <div className="text-right mt-2 space-x-2">
                   <button 
                    onClick={handleCancelInlineEdit} 
                    className={`px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-xs font-medium ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isProcessing}
                    >
                      {t('common.cancel', 'Cancel')}
                   </button>
                   <button 
                    onClick={handleConfirmInlineEdit} 
                    className={`px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-medium flex items-center justify-center ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={isProcessing || !inlineEditValue.trim()} // Also disable if value is empty for notes save button
                    >
                      {isProcessing && inlineEditingField === 'notes' ? (
                        <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <FaSave className="inline mr-1"/> 
                      )}
                      {!(isProcessing && inlineEditingField === 'notes') && t('common.save', 'Save Notes')}
                   </button>
                </div>
              </div>
            ) : (
              <p
                className="text-sm text-slate-300 whitespace-pre-wrap min-h-[4em] p-1.5 rounded hover:bg-slate-700/50 cursor-pointer"
                onClick={() => !isProcessing && handleStartInlineEdit('notes')}
              >
                  {gameNotes || <span className="text-slate-500 italic">{t('gameSettingsModal.noNotes', 'No notes added yet.')}</span>}
              </p>
             )}
          </div>

          {/* Event Log Section - Apply Card Styles */}
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">{t('gameSettingsModal.eventLog', 'Tapahtumaloki')}</h3>
            {/* Make the table container scrollable horizontally if needed */}
            <div className="max-h-60 overflow-y-auto overflow-x-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-900/50">
              {sortedEvents.length > 0 ? (
                  <table className="w-full text-sm text-left table-fixed">
                     <thead className="text-xs text-slate-400 uppercase bg-slate-700/50 sticky top-0 z-10">
                      <tr>
                    <th scope="col" className="px-3 py-2">{t('gameSettingsModal.logTime', 'Aika')}</th>
                    <th scope="col" className="px-3 py-2">{t('gameSettingsModal.logType', 'Tyyppi')}</th>
                    <th scope="col" className="px-3 py-2">{t('gameSettingsModal.logScorer', 'Scorer')}</th>
                    <th scope="col" className="px-3 py-2">{t('gameSettingsModal.logAssister', 'Assister')}</th>
                    <th scope="col" className="px-3 py-2 text-right">{t('common.actions', 'Actions')}</th>
                        </tr>
                    </thead>
                <tbody className="text-slate-200">
                  {sortedEvents.map((event) => {
                    const isEditing = editingGoalId === event.id;
                    const scorer = event.type === 'goal' ? availablePlayers.find(p => p.id === event.scorerId) : null;
                    const assister = event.type === 'goal' ? availablePlayers.find(p => p.id === event.assisterId) : null;
                    const eventTypeDisplay = event.type === 'goal'
                        ? t('gameSettingsModal.logTypeGoal', 'Goal')
                        : t('gameSettingsModal.logTypeOpponentGoal', 'Opponent Goal');

                                return (
                      <tr key={event.id} className={`border-b border-slate-700 ${isEditing ? 'bg-slate-700/60' : 'hover:bg-slate-700/40'}`}>
                        {/* Time Column */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          {isEditing ? (
                            <input
                              ref={goalTimeInputRef}
                              type="text" // Use text to allow MM:SS format
                              value={editGoalTime}
                              onChange={(e) => setEditGoalTime(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' ? handleSaveGoal(event.id) : e.key === 'Escape' ? handleCancelEditGoal() : null}
                              className={`${editInputStyle} w-16 px-1 py-0.5 text-xs`} /* Smaller input for table */ 
                              placeholder="MM:SS"
                            />
                          ) : (
                            formatTime(event.time)
                          )}
                        </td>
                        {/* Type Column */}
                        <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${event.type === 'goal' ? 'bg-green-700/70 text-green-100' : 'bg-red-700/70 text-red-100'}`}>{eventTypeDisplay}</span></td>
                        {/* Scorer Column */}
                        <td className="px-3 py-2">
                          {isEditing && event.type === 'goal' ? (
                            <select
                              value={editGoalScorerId}
                              onChange={(e) => setEditGoalScorerId(e.target.value)}
                              className={`${editSelectStyle} py-0.5 text-xs max-w-[150px]`} /* Smaller select */ 
                            >
                              <option value="">{t('gameSettingsModal.selectScorer', 'Select Scorer...')}</option>
                              {availablePlayers.sort((a,b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)} 
                            </select>
                          ) : event.type === 'goal' ? (
                            scorer?.name || t('gameSettingsModal.unknownPlayer', 'Unknown Player')
                          ) : (
                            opponentName // Show opponent name for their goals
                          )}
                        </td>
                        {/* Assister Column */}
                        <td className="px-3 py-2">
                          {isEditing && event.type === 'goal' ? (
                            <select
                              value={editGoalAssisterId || ''}
                              onChange={(e) => setEditGoalAssisterId(e.target.value || undefined)}
                              className={`${editSelectStyle} py-0.5 text-xs max-w-[150px]`} /* Smaller select */ 
                            >
                              <option value="">{t('gameSettingsModal.selectAssister', 'Select Assister (Optional)...')}</option>
                              {availablePlayers.filter(p => p.id !== editGoalScorerId).sort((a,b) => a.name.localeCompare(b.name)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)} 
                            </select>
                          ) : (
                            assister?.name || ''
                          )}
                        </td>
                        {/* Actions Column */}
                        <td className="px-3 py-2 text-right">
                          {isEditing ? (
                            <div className="flex items-center justify-end space-x-2"> 
                              <button
                                onClick={() => handleSaveGoal(event.id)}
                                className={`text-green-400 hover:text-green-300 ${isProcessing && editingGoalId === event.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={t('common.save', 'Save')}
                                disabled={isProcessing && editingGoalId === event.id}
                              >
                                {isProcessing && editingGoalId === event.id ? (
                                  <svg className="animate-spin h-4 w-4 text-slate-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                <FaSave size={14}/>
                                )}
                              </button>
                              <button
                                onClick={handleCancelEditGoal}
                                className={`text-slate-400 hover:text-slate-300 ${isProcessing && editingGoalId === event.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                                title={t('common.cancel', 'Cancel')}
                                disabled={isProcessing && editingGoalId === event.id}
                              >
                                <FaTimes size={14}/>
                              </button>
                                                    </div>
                                                ) : (
                            <div className="flex items-center justify-end space-x-2"> 
                              {event.type === 'goal' && ( // Only allow editing player goals for now
                                  <button
                                    onClick={() => handleEditGoal(event)}
                                    className="text-slate-400 hover:text-indigo-400"
                                    title={t('common.edit', 'Edit')}
                                    disabled={!!editingGoalId || isProcessing} // Disable if another edit is active OR global processing
                                >
                                    <FaEdit size={14}/>
                                </button>
                              )}
                              {onDeleteGameEvent && ( // Conditionally render delete button
                                              <button 
                                  onClick={() => handleDeleteGoal(event.id)}
                                  className="text-slate-400 hover:text-red-500"
                                  title={t('common.delete', 'Delete')}
                                  disabled={!!editingGoalId || isProcessing} // Disable if another edit is active OR global processing
                                >
                                  {isProcessing && !editingGoalId ? (
                                    // Show spinner if this specific action is not causing it, but general processing is on
                                    // This is a simplification; ideally, we'd track the ID being processed for delete.
                                    <svg className="animate-spin h-3.5 w-3.5 text-slate-100" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                  ) : (
                                  <FaTrashAlt size={13}/>
                                  )}
                                              </button>
                              )}
                            </div>
                                            )}
                                        </td>
                                    </tr>
                                ); 
                  })}
                    </tbody>
                </table>
            ) : (
              <p className="text-center text-slate-500 italic py-4">{t('gameSettingsModal.noEvents', 'No goals logged yet.')}</p>
            )}
            </div>
          </div>
        </div> {/* End Scrollable Content Area */} 

        {/* Footer - Match StatsModal Footer */}
        <div className="flex justify-end pt-4 mt-auto border-t border-slate-700 flex-shrink-0 px-6 pb-4"> {/* Added padding */} 
             <button
              onClick={onClose}
               className="px-4 py-2 rounded bg-slate-600 text-slate-200 hover:bg-slate-500 transition-colors text-sm font-medium"
             >
               {t('common.close', 'Close')} 
             </button>
        </div>
        </div> {/* End Main Content Container */} 
      </div> // End Backdrop
  );
};

export default GameSettingsModal;