'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTimes, FaEdit, FaSave, FaTrashAlt, FaCalendarAlt, FaClock, FaMapMarkerAlt } from 'react-icons/fa';
import { Player, GameEvent, Season, Tournament } from '@/app/page'; // Adjust path as needed
import { SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY } from '@/config/constants';

interface GameSettingsModalProps {
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
}) => {
  console.log('[GameSettingsModal Render] Props received:', { seasonId, tournamentId });
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

  // RE-ADD local state for Time inputs for better responsiveness
  const [localHour, setLocalHour] = useState<string>('');
  const [localMinute, setLocalMinute] = useState<string>('');

  // --- Effects ---

  // Load seasons/tournaments
  useEffect(() => {
    if (isOpen) {
      try {
        const storedSeasons = localStorage.getItem(SEASONS_LIST_KEY);
        setSeasons(storedSeasons ? JSON.parse(storedSeasons) : []);
      } catch (error) { console.error("Failed to load seasons:", error); setSeasons([]); }
      try {
        const storedTournaments = localStorage.getItem(TOURNAMENTS_LIST_KEY);
        setTournaments(storedTournaments ? JSON.parse(storedTournaments) : []);
      } catch (error) { console.error("Failed to load tournaments:", error); setTournaments([]); }
    }
  }, [isOpen]);

  // Effect to update localGameEvents if the prop changes from parent (e.g., undo/redo)
  useEffect(() => {
        setLocalGameEvents(gameEvents); 
  }, [gameEvents]);

  // ADD Effect to sync local time state with incoming prop (Conditionally)
  useEffect(() => {
    if (gameTime) {
      const parts = gameTime.split(':');
      if (parts.length === 2) {
        setLocalHour(parts[0]);
        setLocalMinute(parts[1]);
      }
    } else {
      // Reset local state when gameTime is empty
      setLocalHour('');
      setLocalMinute('');
    }
  // Include all dependencies that this effect uses
  }, [gameTime]);

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
    onSeasonIdChange(newId === 'none' || !newId ? null : newId);
  };

  const handleTournamentChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = event.target.value;
    onTournamentIdChange(newId === 'none' || !newId ? null : newId);
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
  const handleSaveGoal = (goalId: string) => {
    if (!goalId) return;

    // Convert MM:SS back to seconds
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
    } else if (editGoalTime) { // Allow just seconds input maybe? For now, require MM:SS
        alert(t('gameSettingsModal.invalidTimeFormat', "Invalid time format. Use MM:SS"));
      return;
    }

    const updatedEvent: GameEvent = {
      id: goalId,
      // Determine type based on original event? Assume it doesn't change. Find original event.
      type: localGameEvents.find(e => e.id === goalId)?.type || 'goal', // Default to 'goal' if somehow not found
      time: timeInSeconds,
      scorerId: editGoalScorerId,
      assisterId: editGoalAssisterId || undefined, // Ensure it's undefined if empty
    };

    // Update the local state first for immediate UI feedback in the list
    setLocalGameEvents(prevEvents =>
      prevEvents.map(event => (event.id === goalId ? updatedEvent : event))
    );

    // Call the prop handler to update the main state
    onUpdateGameEvent(updatedEvent);

    handleCancelEditGoal(); // Exit editing mode
  };

  // Handle deleting a goal
  const handleDeleteGoal = (goalId: string) => {
    if (onDeleteGameEvent) {
      if (window.confirm(t('gameSettingsModal.confirmDeleteEvent', 'Are you sure you want to delete this event? This cannot be undone.'))) {
         // Update local state immediately
      setLocalGameEvents(prevEvents => prevEvents.filter(event => event.id !== goalId));
      // Call parent handler
      onDeleteGameEvent(goalId);
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

  const handleConfirmInlineEdit = () => {
    if (inlineEditingField === null) return;

    const trimmedValue = inlineEditValue.trim();

    try {
        switch (inlineEditingField) {
        case 'opponent':
                console.log('[GameSettingsModal] Attempting to save opponent name:', trimmedValue);
                if (trimmedValue) onOpponentNameChange(trimmedValue);
                else alert(t('gameSettingsModal.opponentNameRequired', "Opponent name cannot be empty."));
          break;
        case 'date':
                // Basic validation for YYYY-MM-DD
                if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedValue)) {
            onGameDateChange(trimmedValue);
                } else {
                    alert(t('gameSettingsModal.invalidDateFormat', "Invalid date format. Use YYYY-MM-DD."));
          }
          break;
        case 'location':
                onGameLocationChange(trimmedValue); // Allow empty location
          break;
        case 'time':
                 // Basic validation for HH:MM
                 if (/^([01]\d|2[0-3]):([0-5]\d)$/.test(trimmedValue) || trimmedValue === '') {
                     onGameTimeChange(trimmedValue); // Allow empty time
          } else {
                     alert(t('gameSettingsModal.invalidTimeFormatInline', "Invalid time format. Use HH:MM (24-hour)."));
                 }
          break;
        case 'duration':
                const duration = parseInt(trimmedValue, 10);
                if (!isNaN(duration) && duration > 0) {
            onPeriodDurationChange(duration);
                } else {
                    alert(t('gameSettingsModal.invalidDurationFormat', "Period duration must be a positive number."));
          }
          break;
        case 'notes':
                onGameNotesChange(inlineEditValue); // Keep original spacing/newlines
          break;
      }
    } catch (error) {
        console.error("Error saving inline edit:", error);
        alert(t('common.saveError', "An error occurred while saving."));
    }


    setInlineEditingField(null); // Exit inline edit mode
    setInlineEditValue('');
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

  // Handlers for separate HH/MM time inputs (Refactored)
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newHour = e.target.value; // Don't pad here
      // Basic validation for input characters
      if (/^\d{0,2}$/.test(newHour)) { 
        setLocalHour(newHour); // Update local state immediately
        // Also call parent handler (consider debouncing later if needed)
        const finalHour = newHour.padStart(2, '0');
        if (/^([01]\d|2[0-3])$/.test(finalHour) || finalHour === '00') {
            onGameTimeChange(`${finalHour}:${localMinute.padStart(2,'0')}`);
        } else if (newHour === '' && localMinute === '') {
            onGameTimeChange(''); // Clear if both empty
        } // Otherwise, might be incomplete input, don't call parent yet
      }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const newMinute = e.target.value; // Don't pad here
      // Basic validation for input characters
      if (/^\d{0,2}$/.test(newMinute)) { 
        setLocalMinute(newMinute); // Update local state immediately
         // Also call parent handler (consider debouncing later if needed)
        const finalMinute = newMinute.padStart(2, '0');
        if (/^[0-5]\d$/.test(finalMinute)) {
            onGameTimeChange(`${localHour.padStart(2,'0')}:${finalMinute}`);
        } else if (localHour === '' && newMinute === '') {
            onGameTimeChange(''); // Clear if both empty
        } // Otherwise, might be incomplete input, don't call parent yet
      }
  };

  // --- ADDED Memoized Values (Moved Here) ---
  // Calculate these AFTER handlers are defined, potentially altering hook order slightly

  // Find player who received the fair play card
  const fairPlayPlayerId = useMemo(() => {
    return availablePlayers.find(p => p.receivedFairPlayCard)?.id ?? null;
  }, [availablePlayers]);

  // Determine association type based on props
   const associationType = useMemo(() => {
        if (seasonId) return 'season';
        if (tournamentId) return 'tournament';
        return 'none';
    }, [seasonId, tournamentId]);

  // --- Render Logic ---

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
                      onBlur={handleConfirmInlineEdit} // CONFIRM on blur
                      className={editInputStyle} /* Use defined style */
                  />
                ) : (
                  <span className={`${valueStyle} p-1.5 rounded hover:bg-slate-700/50 cursor-pointer block truncate`} title={opponentName} onClick={() => handleStartInlineEdit('opponent')}>
                    {opponentName}
                    {/* Edit icon can be implicitly shown via hover bg */}
                  </span>
                )}
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
                        type="date" // Use date input type
                        value={inlineEditValue} // Value is YYYY-MM-DD
                        onChange={(e) => setInlineEditValue(e.target.value)}
                        onKeyDown={handleInlineEditKeyDown}
                        onBlur={handleConfirmInlineEdit} // CONFIRM on blur
                        className={`${editInputStyle} appearance-none`} /* Use defined style */
                        style={{ colorScheme: 'dark' }} // Hint for dark mode date picker
                  />
                ) : (
                      <span className={`${valueStyle} p-1.5 rounded hover:bg-slate-700/50 cursor-pointer block truncate`} onClick={() => handleStartInlineEdit('date')}>
                          {formatDateFi(gameDate)} {/* Display formatted date */}
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
                        onBlur={handleConfirmInlineEdit} // CONFIRM on blur
                        className={editInputStyle} /* Use defined style */
                        placeholder={t('common.optional', 'Optional')}
                      />
                  ) : (
                      <span className={`${valueStyle} p-1.5 rounded hover:bg-slate-700/50 cursor-pointer block truncate`} title={gameLocation || t('common.notSet', 'Not Set')} onClick={() => handleStartInlineEdit('location')}>
                        {gameLocation || <span className="text-slate-500 italic">{t('common.notSet', 'Not Set')}</span>}
                  </span>
                )}
              </div>

              {/* Game Time - Separate Inputs (Apply consistent input styles) */}
              <div className={gridItemStyle}>
                <span className={labelStyle}>
                  <FaClock className="mr-1.5 text-slate-500" size={12} />
                  {t('gameSettingsModal.time', 'Time')}:
                </span>
                   <span className="flex items-center space-x-1 mt-1"> {/* Added spacing & margin */} 
                  <input 
                          type="number"
                          min="0"
                          max="23"
                          step="1"
                          value={localHour} // Bind to local state
                          onChange={handleHourChange} // Use specific handler
                          className={`${editInputStyle} w-16 text-center px-1`} /* Use defined style, adjust size/padding */
                          placeholder={t('common.hourShort', 'HH')}
                      />
                      <span className="text-slate-400">:</span>
                      <input
                          type="number"
                          min="0"
                          max="59"
                          step="1"
                          value={localMinute} // Bind to local state
                          onChange={handleMinuteChange} // Use specific handler
                          className={`${editInputStyle} w-16 text-center px-1`} /* Use defined style, adjust size/padding */
                          placeholder={t('common.minuteShort', 'MM')}
                      />
                  </span>
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
                          value={inlineEditValue} // Use temporary edit value
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onKeyDown={handleInlineEditKeyDown}
                          onBlur={handleConfirmInlineEdit} // CONFIRM on blur
                          className={`${editInputStyle} w-20`} /* Use defined style, adjust size */ 
                        />
                           <span className="ml-2 text-slate-400 text-sm">{t('common.minutesShort', 'min')}</span>
                       </div>
                   ) : (
                       <span className={`${valueStyle} p-1.5 rounded hover:bg-slate-700/50 cursor-pointer block truncate`} onClick={() => handleStartInlineEdit('duration')}>
                           {periodDurationMinutes} {t('common.minutesShort', 'min')}
                  </span>
                )}
              </div>
              
              {/* Fair Play Card */}
              <div className={`${gridItemStyle} md:col-span-2`}> {/* Span across columns */} 
                   <span className={labelStyle}>{t('gameSettingsModal.fairPlayCard', 'Fair Play')}:</span>
                  <select
                    value={fairPlayPlayerId || ''}
                    onChange={(e) => onAwardFairPlayCard(e.target.value || null)}
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
                  {/* REPLACE radio buttons with custom button selectors like the period buttons */}
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-2 mt-1">
                    {/* None button */}
                    <button
                      onClick={() => {
                        console.log('[GameSettingsModal] Association button clicked: none');
                        onSeasonIdChange(null);
                        onTournamentIdChange(null);
                      }}
                      className={`px-3 py-1 rounded text-sm transition-colors ${associationType === 'none' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      {t('gameSettingsModal.associationNone', 'None')}
                    </button>
                    
                    {/* Season button */}
                    <button
                      onClick={() => {
                        console.log('[GameSettingsModal] Association button clicked: season');
                        onTournamentIdChange(null);
                        // If season is already selected, keep it selected (don't toggle off)
                        if (associationType !== 'season' && seasons.length > 0) {
                          // If we have seasons and this is a new selection, select the first one
                          onSeasonIdChange(seasons[0].id);
                        } else if (associationType !== 'season') {
                          // Just set empty seasonId to show the dropdown
                          onSeasonIdChange('');
                        }
                      }}
                      className={`px-3 py-1 rounded text-sm transition-colors ${associationType === 'season' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      {t('gameSettingsModal.associationSeason', 'Season/League')}
                    </button>
                    
                    {/* Tournament button */}
                    <button
                      onClick={() => {
                        console.log('[GameSettingsModal] Association button clicked: tournament');
                        onSeasonIdChange(null);
                        // If tournament is already selected, keep it selected (don't toggle off)
                        if (associationType !== 'tournament' && tournaments.length > 0) {
                          // If we have tournaments and this is a new selection, select the first one
                          onTournamentIdChange(tournaments[0].id);
                        } else if (associationType !== 'tournament') {
                          // Just set empty tournamentId to show the dropdown
                          onTournamentIdChange('');
                        }
                      }}
                      className={`px-3 py-1 rounded text-sm transition-colors ${associationType === 'tournament' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                    >
                      {t('gameSettingsModal.associationTournament', 'Tournament')}
                    </button>
                  </div>
              {associationType === 'season' && (
                  <select 
                      value={seasonId || ''} /* Default to empty string */ 
                      onChange={handleSeasonChange}
                      className={`${editSelectStyle} mt-1 w-full md:w-auto`} /* Use defined style */ 
                    >
                           <option value="">{t('gameSettingsModal.selectSeason', '-- Select Season --')}</option>
                           {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
              )}
              {associationType === 'tournament' && (
                  <select 
                      value={tournamentId || ''} /* Default to empty string */ 
                      onChange={handleTournamentChange}
                      className={`${editSelectStyle} mt-1 w-full md:w-auto`} /* Use defined style */ 
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
                  onClick={() => handleStartInlineEdit('notes')}
                  className="text-xs text-slate-400 hover:text-indigo-400 flex items-center" /* Smaller edit button */ 
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
                  onKeyDown={handleInlineEditKeyDown} // Use common keydown
                  onBlur={handleConfirmInlineEdit} // CONFIRM on blur for notes too?
                  rows={4}
                  className={`${editInputStyle} text-sm`} /* Use defined style */ 
                  placeholder={t('gameSettingsModal.notesPlaceholder', 'Enter notes about the game...')}
                />
                {/* Add Save/Cancel explicitly for notes textarea */}
                <div className="text-right mt-2 space-x-2">
                   <button onClick={handleCancelInlineEdit} className="px-3 py-1 bg-slate-600 hover:bg-slate-500 rounded text-xs font-medium">
                      {t('common.cancel', 'Cancel')}
                   </button>
                   <button onClick={handleConfirmInlineEdit} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 rounded text-xs font-medium">
                      <FaSave className="inline mr-1"/> {t('common.save', 'Save Notes')}
                   </button>
                </div>
              </div>
            ) : (
              <p
                className="text-sm text-slate-300 whitespace-pre-wrap min-h-[4em] p-1.5 rounded hover:bg-slate-700/50 cursor-pointer"
                onClick={() => handleStartInlineEdit('notes')}
              >
                  {gameNotes || <span className="text-slate-500 italic">{t('gameSettingsModal.noNotes', 'No notes added yet.')}</span>}
              </p>
             )}
          </div>

          {/* Event Log Section - Apply Card Styles */}
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">{t('gameSettingsModal.eventLog', 'Event Log')}</h3>
            {/* Make the table container scrollable horizontally if needed */}
            <div className="max-h-60 overflow-y-auto overflow-x-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-900/50">
              {sortedEvents.length > 0 ? (
                <table className="w-full text-sm text-left table-fixed"> {/* Added table-layout: fixed */}
                  {/* Use styles from StatsModal table */}
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700/50 sticky top-0 z-10">
                        <tr>
                      <th scope="col" className="px-3 py-2">{t('gameSettingsModal.logTime', 'Time')}</th>
                      <th scope="col" className="px-3 py-2">{t('gameSettingsModal.logType', 'Type')}</th>
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
                                  className="text-green-400 hover:text-green-300"
                                  title={t('common.save', 'Save')}
                                >
                                  <FaSave size={14}/>
                                </button>
                                <button
                                  onClick={handleCancelEditGoal}
                                  className="text-slate-400 hover:text-slate-300"
                                  title={t('common.cancel', 'Cancel')}
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
                                      disabled={!!editingGoalId} // Disable if another edit is active
                                  >
                                      <FaEdit size={14}/>
                                  </button>
                                )}
                                {onDeleteGameEvent && ( // Conditionally render delete button
                                              <button 
                                    onClick={() => handleDeleteGoal(event.id)}
                                    className="text-slate-400 hover:text-red-500"
                                    title={t('common.delete', 'Delete')}
                                    disabled={!!editingGoalId} // Disable if another edit is active
                                  >
                                    <FaTrashAlt size={13}/>
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