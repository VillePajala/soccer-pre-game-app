'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  selectedPlayerIds: string[];
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
}

// Helper to format time from seconds to MM:SS (moved from GameStatsModal)
const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const GameSettingsModal: React.FC<GameSettingsModalProps> = ({
  isOpen,
  onClose,
  // Destructure props
  teamName,
  opponentName,
  gameDate,
  gameLocation,
  gameTime,
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
  selectedPlayerIds,
  currentGameId,
  seasonId,
  tournamentId,
  numPeriods,
  periodDurationMinutes,
  onNumPeriodsChange,
  onPeriodDurationChange,
}) => {
  const { t } = useTranslation();

  // ADD Helper function definition INSIDE the component body
  const formatDateFi = (isoDate: string): string => {
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
      return isoDate || t('common.notSet', 'Not Set');
    }
    const parts = isoDate.split('-');
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  };

  // --- Local State for Edits ---
  const [localOpponentName, setLocalOpponentName] = useState(opponentName);
  const [localGameDate, setLocalGameDate] = useState(gameDate); // Stays YYYY-MM-DD
  const [localGameLocation, setLocalGameLocation] = useState(gameLocation || '');
  const [localGameTime, setLocalGameTime] = useState(gameTime || '');
  const [localGameNotes, setLocalGameNotes] = useState(gameNotes);
  const [localFairPlayPlayerId, setLocalFairPlayPlayerId] = useState<string | null>(null);
  const [localGameEvents, setLocalGameEvents] = useState<GameEvent[]>(gameEvents);
  // ADD Local state for periods/duration
  const [localNumPeriods, setLocalNumPeriods] = useState(numPeriods);
  const [localPeriodDurationMinutes, setLocalPeriodDurationMinutes] = useState(periodDurationMinutes);

  // State for event editor within the modal
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalTime, setEditGoalTime] = useState<string>('');
  const [editGoalScorerId, setEditGoalScorerId] = useState<string>('');
  const [editGoalAssisterId, setEditGoalAssisterId] = useState<string | undefined>(undefined);
  const goalTimeInputRef = useRef<HTMLInputElement>(null);

  // ADD State for inline editing of game info/notes
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

  // --- MOVED Effects ---
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

  // Initialize local state when modal opens or relevant props change
  useEffect(() => {
    if (isOpen) {
      // Reset main local states
      setLocalOpponentName(opponentName);
      setLocalGameDate(gameDate);
      setLocalGameLocation(gameLocation || '');
      setLocalGameTime(gameTime || '');
      setLocalGameNotes(gameNotes);
      setLocalGameEvents(gameEvents);
      // ADD Reset for periods/duration
      setLocalNumPeriods(numPeriods);
      setLocalPeriodDurationMinutes(periodDurationMinutes);
      // Find initial fair play winner
      const initialFairPlayWinner = availablePlayers.find(p => p.receivedFairPlayCard)?.id || null;
      setLocalFairPlayPlayerId(initialFairPlayWinner);
      
      // Reset editing states
      setEditingGoalId(null); 
    } 
  }, [isOpen, opponentName, gameDate, gameLocation, gameTime, gameNotes, gameEvents, availablePlayers, numPeriods, periodDurationMinutes]); // Add new props to dependencies

  // Focus goal time input (if event editor becomes active)
  useEffect(() => {
    if (editingGoalId) { goalTimeInputRef.current?.focus(); goalTimeInputRef.current?.select(); }
  }, [editingGoalId]);

  // ADD Effect to focus inline edit inputs
  useEffect(() => {
    if (inlineEditingField === 'opponent') { opponentInputRef.current?.focus(); opponentInputRef.current?.select(); }
    else if (inlineEditingField === 'date') { dateInputRef.current?.focus(); }
    else if (inlineEditingField === 'location') { locationInputRef.current?.focus(); locationInputRef.current?.select(); }
    else if (inlineEditingField === 'time') { timeInputRef.current?.focus(); }
    else if (inlineEditingField === 'duration') { durationInputRef.current?.focus(); durationInputRef.current?.select(); }
    else if (inlineEditingField === 'notes') { notesTextareaRef.current?.focus(); notesTextareaRef.current?.select(); }
  }, [inlineEditingField]);

  // --- Calculations ---
  const currentContextName = useMemo(() => {
    if (seasonId) return seasons.find(s => s.id === seasonId)?.name;
    if (tournamentId) return tournaments.find(t => t.id === tournamentId)?.name;
    return null;
  }, [seasonId, tournamentId, seasons, tournaments]);

  const sortedLocalGoals = useMemo(() => {
    return localGameEvents.filter(e => e.type === 'goal' || e.type === 'opponentGoal').sort((a, b) => a.time - b.time);
  }, [localGameEvents]);

  // --- Handlers for Event Editing (Modify local state) ---
  const handleStartEditGoal = useCallback((goal: GameEvent) => {
    setEditingGoalId(goal.id);
    setEditGoalTime(formatTime(goal.time));
    setEditGoalScorerId(goal.scorerId ?? '');
    setEditGoalAssisterId(goal.assisterId ?? '');
  }, []);

  const handleCancelEditGoal = useCallback(() => {
    setEditingGoalId(null);
  }, []);

  const handleSaveEditGoal = useCallback(() => {
    if (!editingGoalId) return;
    const originalGoalIndex = localGameEvents.findIndex(e => e.id === editingGoalId);
    if (originalGoalIndex === -1) { console.error("Goal to edit not found in local state!"); handleCancelEditGoal(); return; }
    const originalGoal = localGameEvents[originalGoalIndex];

    const timeParts = editGoalTime.match(/^(\d{1,2}):(\d{1,2})$/);
    let timeInSeconds = 0;
    if (timeParts) {
      const m = parseInt(timeParts[1], 10), s = parseInt(timeParts[2], 10);
      if (!isNaN(m) && !isNaN(s) && m >= 0 && s >= 0 && s < 60) {
        timeInSeconds = m * 60 + s;
      } else {
        alert(t('gameSettingsModal.invalidTimeFormat', 'Invalid time format. MM:SS'));
        goalTimeInputRef.current?.focus();
        return;
      }
    } else {
      alert(t('gameSettingsModal.invalidTimeFormat', 'Invalid time format. MM:SS'));
      goalTimeInputRef.current?.focus();
      return;
    }

    const updatedScorerId = editGoalScorerId;
    const updatedAssisterId = editGoalAssisterId || undefined;

    if (!updatedScorerId && originalGoal.type === 'goal') {
      alert(t('gameSettingsModal.scorerRequired', 'Scorer must be selected.'));
      return;
    }

    const updatedEvent: GameEvent = { ...originalGoal, time: timeInSeconds, scorerId: updatedScorerId, assisterId: updatedAssisterId };

    // Update the local state array
    setLocalGameEvents(prevEvents => [
      ...prevEvents.slice(0, originalGoalIndex),
      updatedEvent,
      ...prevEvents.slice(originalGoalIndex + 1)
    ]);
    
    // ADD: Call the parent update handler
    onUpdateGameEvent(updatedEvent);

    handleCancelEditGoal(); // Close editor row
  }, [editingGoalId, localGameEvents, editGoalTime, editGoalScorerId, editGoalAssisterId, handleCancelEditGoal, t, onUpdateGameEvent]); // Add onUpdateGameEvent dependency

  const handleGoalEditKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter') handleSaveEditGoal();
    else if (event.key === 'Escape') handleCancelEditGoal();
  }, [handleSaveEditGoal, handleCancelEditGoal]);
  
  // --- Handler for Auto-Saving Fair Play ---
  const handleFairPlayChange = useCallback((event: React.ChangeEvent<HTMLSelectElement>) => {
      const selectedPlayerId = event.target.value || null; // Convert empty string value to null
      setLocalFairPlayPlayerId(selectedPlayerId); // Update local state for UI
      onAwardFairPlayCard(selectedPlayerId); // Call prop handler immediately
      console.log("Fair Play award updated to:", selectedPlayerId); // Optional: Log change
  }, [onAwardFairPlayCard, setLocalFairPlayPlayerId]);

  // ENSURE resetLocalState function is commented out (unused variable)
  // const resetLocalState = () => {
  //   setLocalOpponentName(opponentName);
  //   setLocalGameDate(gameDate);
  //   setLocalGameLocation(gameLocation || '');
  //   setLocalGameTime(gameTime || '');
  //   setLocalGameNotes(gameNotes);
  //   setLocalGameEvents(gameEvents);
  //   setLocalNumPeriods(numPeriods);
  //   setLocalPeriodDurationMinutes(periodDurationMinutes);
  //   const initialFairPlayWinner = availablePlayers.find(p => p.receivedFairPlayCard)?.id || null;
  //   setLocalFairPlayPlayerId(initialFairPlayWinner);
  //   setEditingGoalId(null);
  // };

  // Keep these unused for now if original error was correct, but needed for subsequent code
  // const cardStyle = "bg-slate-800/60 rounded-lg shadow-md p-4 mb-4"; // Increased padding
  // const sectionTitleStyle = "text-lg font-semibold text-slate-100 mb-3 border-b border-slate-700 pb-1"; // Bolder and bottom border
  // RE-ADD necessary style constants
  const labelStyle = "text-xs font-medium text-slate-400 uppercase flex items-center mb-0.5"; // Adjusted for icon alignment
  const valueStyle = "text-base text-slate-100 font-medium";
  const editInputStyle = "block w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm";
  const editSelectStyle = `${editInputStyle} appearance-none`; // Use same base style for selects
  const gridItemStyle = "mb-2"; // Added consistent margin-bottom for grid items

  // ADD Delete event handler
  const handleDeleteEvent = useCallback((goalId: string) => {
    if (!onDeleteGameEvent) {
      console.warn("onDeleteGameEvent handler not provided");
      return;
    }
    // Confirm deletion
    if (window.confirm(t('gameSettingsModal.confirmDeleteEvent', 'Are you sure you want to delete this event?'))) {
      // Update local state
      setLocalGameEvents(prevEvents => prevEvents.filter(event => event.id !== goalId));
      // Call parent handler
      onDeleteGameEvent(goalId);
    }
  }, [onDeleteGameEvent, t]);

  // ADD Handlers for Inline Editing
  const handleStartInlineEdit = (field: 'opponent' | 'date' | 'location' | 'time' | 'duration' | 'notes') => {
    setInlineEditingField(field);
    let initialValue = '';
    switch(field) {
      case 'opponent': initialValue = localOpponentName; break;
      case 'date': initialValue = localGameDate; break;
      case 'location': initialValue = localGameLocation; break;
      case 'time': initialValue = localGameTime; break;
      case 'duration': initialValue = String(localPeriodDurationMinutes); break;
      case 'notes': initialValue = localGameNotes; break;
    }
    setInlineEditValue(initialValue);
    setEditingGoalId(null); // Ensure goal editor is closed
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingField(null);
    setInlineEditValue('');
  };

  const handleSaveInlineEdit = () => {
    if (!inlineEditingField) return;

    const trimmedValue = inlineEditValue.trim();

    try {
      switch(inlineEditingField) {
        case 'opponent':
          if (trimmedValue !== localOpponentName) {
            onOpponentNameChange(trimmedValue || t('common.opponent', 'Opponent'));
            setLocalOpponentName(trimmedValue || t('common.opponent', 'Opponent'));
          }
          break;
        case 'date':
          if (trimmedValue && trimmedValue !== localGameDate) {
            onGameDateChange(trimmedValue);
            setLocalGameDate(trimmedValue);
          }
          break;
        case 'location':
          if (trimmedValue !== localGameLocation) {
            onGameLocationChange(trimmedValue);
            setLocalGameLocation(trimmedValue);
          }
          break;
        case 'time':
          if (trimmedValue !== localGameTime) {
            onGameTimeChange(trimmedValue);
            setLocalGameTime(trimmedValue);
          }
          break;
        case 'duration':
          const duration = parseInt(trimmedValue);
          if (!isNaN(duration) && duration >= 1 && duration !== localPeriodDurationMinutes) {
            onPeriodDurationChange(duration);
            setLocalPeriodDurationMinutes(duration);
          } else if (isNaN(duration) || duration < 1) {
            alert(t('gameSettingsModal.invalidDuration', 'Duration must be a positive number.'));
            return; // Prevent closing the editor
          }
          break;
        case 'notes':
          // Allow saving empty notes, compare with original local state
          if (inlineEditValue !== localGameNotes) { 
            onGameNotesChange(inlineEditValue); // Save the potentially multi-line value
            setLocalGameNotes(inlineEditValue);
          }
          break;
      }
    } catch (error) {
        console.error("Error saving inline edit:", error);
        alert(t('common.saveError', 'Error saving changes.'));
    }

    handleCancelInlineEdit(); // Close editor after save attempt
  };

  const handleInlineEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
        // For notes (textarea), Enter might be needed for newlines. Require Shift+Enter or handle differently?
        // For simplicity now, Enter saves for all inputs.
        if (inlineEditingField === 'notes' && event.shiftKey) {
            // Allow shift+enter for newlines in notes, do nothing here
            return;
        } 
        event.preventDefault(); // Prevent default form submission or newline in single-line inputs
        handleSaveInlineEdit();
    } else if (event.key === 'Escape') {
        handleCancelInlineEdit();
    }
  };

  if (!isOpen) return null;

  return (
    // MODIFIED: Outer modal styling (backdrop, centering) - MATCH GameStatsModal backdrop
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 p-4" onClick={onClose}> 
      {/* MODIFIED: Use solid background like GameStatsModal */}
      <div 
        className={`bg-slate-800 rounded-lg shadow-xl w-full h-[95vh] overflow-hidden flex flex-col p-4`} /* Changed from gradient */
        onClick={(e) => e.stopPropagation()} 
      >
        {/* MODIFIED: Header Styling - Remove Edit button */}
        <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-bold text-amber-400 flex items-center">
            {t('gameSettingsModal.title', 'Game Settings')}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">
            <FaTimes />
          </button>
        </div>

        {/* MODIFIED: Scrollable Content Area Styling - Use simple div for card layout */}
        <div className="flex-grow overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 space-y-4"> {/* Add space-y-4 */} 
          
          {/* --- Game Info Section - Apply Card Styles --- */}
          {/* Use styles similar to GameStatsModal cards: bg-slate-900/50 p-4 rounded-lg border border-slate-700 */} 
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">{t('gameSettingsModal.gameInfoTitle', 'Game Info')}</h3> {/* Match GameStatsModal title style */} 
            {/* Display context name if available */}
            {currentContextName && ( <p className="text-xs text-indigo-300 font-medium mb-3 -mt-2">{currentContextName}</p> )}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1"> {/* Use grid for layout, reduced y-gap */} 
              
              {/* Team Info */}
              <div className={gridItemStyle}>
                <span className={labelStyle}>{t('common.home', 'Home')}</span>
                <span className={valueStyle}>{teamName}</span>
              </div>
              <div className={gridItemStyle}>
                <span className={labelStyle}>{t('common.away', 'Away')}</span>
                {/* Restore conditional rendering */} 
                {inlineEditingField === 'opponent' ? (
                  <input 
                    ref={opponentInputRef}
                    type="text"
                    value={inlineEditValue} // Use inlineEditValue
                    onChange={(e) => setInlineEditValue(e.target.value)} // Update inlineEditValue
                    onBlur={handleSaveInlineEdit} // Use common save handler
                    onKeyDown={handleInlineEditKeyDown} // Use common keydown handler
                    className={editInputStyle} 
                    placeholder={t('common.opponent', 'Opponent') ?? undefined}
                  />
                ) : (
                  <span className={`${valueStyle} p-1.5 rounded hover:bg-slate-700/50 cursor-pointer`} onClick={() => handleStartInlineEdit('opponent')}>
                    {localOpponentName || t('common.notSet', 'Not Set')}
                  </span>
                )}
              </div>

              {/* Score Display - Integrated */}
              <div className={`${gridItemStyle} col-span-2 mt-1 mb-3`}> {/* Adjusted spacing */} 
                <span className={`${valueStyle} text-xl text-center block`}> 
                  <span className={`${homeScore > awayScore ? 'text-green-400' : 'text-slate-100'}`}>{homeScore}</span>
                  <span className="mx-2 text-slate-500">-</span>
                  <span className={`${awayScore > homeScore ? 'text-red-400' : 'text-slate-100'}`}>{awayScore}</span>
                </span>
              </div>

              {/* Game Details with Icons */}
              <div className={gridItemStyle}>
                <span className={labelStyle}>
                  <FaCalendarAlt className="mr-1.5 text-slate-500" size={12} />
                  {t('common.date', 'Date')}
                </span>
                {/* Restore conditional rendering */} 
                {inlineEditingField === 'date' ? (
                  <input 
                    ref={dateInputRef}
                    type="date"
                    value={inlineEditValue} // Use inlineEditValue
                    onChange={(e) => setInlineEditValue(e.target.value)} // Update inlineEditValue
                    onBlur={handleSaveInlineEdit} // Use common save handler
                    onKeyDown={handleInlineEditKeyDown} // Use common keydown handler
                    className={editInputStyle}
                  />
                ) : (
                  <span className={`${valueStyle} p-1.5 rounded hover:bg-slate-700/50 cursor-pointer`} onClick={() => handleStartInlineEdit('date')}>
                    {formatDateFi(localGameDate)}
                  </span>
                )}
              </div>
              <div className={gridItemStyle}>
                <span className={labelStyle}>
                  <FaClock className="mr-1.5 text-slate-500" size={12} />
                  {t('common.time', 'Time')}
                </span>
                {/* Restore conditional rendering */} 
                {inlineEditingField === 'time' ? (
                  <input 
                    ref={timeInputRef}
                    type="time"
                    value={inlineEditValue} // Use inlineEditValue
                    onChange={(e) => setInlineEditValue(e.target.value)} // Update inlineEditValue
                    onBlur={handleSaveInlineEdit} // Use common save handler
                    onKeyDown={handleInlineEditKeyDown} // Use common keydown handler
                    className={editInputStyle}
                  />
                ) : (
                  <span className={`${valueStyle} p-1.5 rounded hover:bg-slate-700/50 cursor-pointer`} onClick={() => handleStartInlineEdit('time')}>
                    {localGameTime || t('common.notSet', 'Not Set')}
                  </span>
                )}
              </div>
              <div className={`${gridItemStyle} col-span-2`}> 
                <span className={labelStyle}>
                  <FaMapMarkerAlt className="mr-1.5 text-slate-500" size={12} />
                  {t('common.location', 'Location')}
                </span>
                {/* Restore conditional rendering */} 
                {inlineEditingField === 'location' ? (
                  <input 
                    ref={locationInputRef}
                    type="text"
                    value={inlineEditValue} // Use inlineEditValue
                    onChange={(e) => setInlineEditValue(e.target.value)} // Update inlineEditValue
                    onBlur={handleSaveInlineEdit} // Use common save handler
                    onKeyDown={handleInlineEditKeyDown} // Use common keydown handler
                    className={editInputStyle}
                    placeholder={t('gameSettingsModal.locationPlaceholder', 'E.g., City, Field Name') ?? undefined}
                  />
                ) : (
                  <span className={`${valueStyle} p-1.5 rounded hover:bg-slate-700/50 cursor-pointer`} onClick={() => handleStartInlineEdit('location')}>
                    {localGameLocation || t('common.notSet', 'Not Set')}
                  </span>
                )}
              </div>
              
              {/* Game Structure - Periods (Keep direct edit) */}
              <div className={gridItemStyle}>
                <span className={labelStyle}>{t('gameSettingsModal.periodsLabel', 'Periods')}</span>
                <div className="flex items-center space-x-2 mt-1">
                  {[1, 2].map(num => (
                    <button 
                      key={num}
                      onClick={() => { 
                          const newPeriods = num as 1 | 2;
                          setLocalNumPeriods(newPeriods); 
                          onNumPeriodsChange(newPeriods); // Call prop handler immediately
                      }}
                      className={`px-3 py-1 rounded text-sm ${localNumPeriods === num ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                      {num}
                    </button>
                  ))}
                </div>
              </div>
              {/* Game Structure - Duration (Use inline edit) */}
              <div className={gridItemStyle}>
                <span className={labelStyle}>{t('gameSettingsModal.durationLabel', 'Duration (min)')}</span>
                {/* Restore conditional rendering */} 
                {inlineEditingField === 'duration' ? (
                  <input 
                    ref={durationInputRef}
                    type="number"
                    value={inlineEditValue} // Use inlineEditValue
                    onChange={(e) => setInlineEditValue(e.target.value)} // Update inlineEditValue
                    onBlur={handleSaveInlineEdit} // Use common save handler
                    onKeyDown={handleInlineEditKeyDown} // Use common keydown handler
                    className={editInputStyle}
                    min="1"
                  />
                ) : (
                  <span className={`${valueStyle} p-1.5 rounded hover:bg-slate-700/50 cursor-pointer`} onClick={() => handleStartInlineEdit('duration')}>
                    {localPeriodDurationMinutes}
                  </span>
                )}
              </div>
            </div>
          </div>
          {/* --- End Game Info Section --- */}

          {/* --- Fair Play Section - Apply Card Styles --- */}
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">{t('gameSettingsModal.fairPlayTitle', 'Fair Play Award')}</h3> {/* Match title style */} 
            <div>
              <label htmlFor="fairPlaySelect" className={`${labelStyle} mb-1`}>{t('gameSettingsModal.awardFairPlayLabel', 'Awarded Player:')}</label>
              <select
                id="fairPlaySelect"
                value={localFairPlayPlayerId || ''} 
                onChange={handleFairPlayChange}
                className={editSelectStyle}
                disabled={!currentGameId} 
              >
                <option value="">{t('gameSettingsModal.noPlayerSelected', '- Select Player -')}</option>
                {availablePlayers
                  .filter(p => selectedPlayerIds.includes(p.id)) 
                  .map(player => (
                    <option key={player.id} value={player.id}>
                      {player.jerseyNumber ? `#${player.jerseyNumber} ` : ''}{player.name}
                    </option>
                  ))}
              </select>
            </div>
          </div>
          {/* --- End Fair Play Section --- */}

          {/* --- Notes Section - Apply Card Styles --- */}
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">{t('gameSettingsModal.notesTitle', 'Notes')}</h3> {/* Match title style */} 
            {inlineEditingField === 'notes' ? (
              <textarea 
                  ref={notesTextareaRef}
                  value={inlineEditValue} 
                  onChange={(e) => setInlineEditValue(e.target.value)} 
                  onBlur={handleSaveInlineEdit}
                  onKeyDown={handleInlineEditKeyDown}
                  className={`${editInputStyle} h-28`} 
                  placeholder={t('gameSettingsModal.notesPlaceholder', 'Notes...') ?? undefined}
              />
             ) : (
                <div className="min-h-[7rem] p-2 text-sm text-slate-300 whitespace-pre-wrap rounded border border-transparent hover:bg-slate-700/30 cursor-pointer" onClick={() => handleStartInlineEdit('notes')}>
                     {localGameNotes ? localGameNotes : <span className="italic text-slate-400">{t('gameSettingsModal.noNotes', 'No notes.')}</span>}
                </div>
             )}
          </div>
          {/* --- End Notes Section --- */}

          {/* --- Event Editing Section - Apply Card Styles --- */}
          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <h3 className="text-lg font-semibold text-slate-200 mb-3">{t('gameSettingsModal.eventLogTitle', 'Edit Game Events')}</h3> {/* Match title style */} 
            <div className="overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50 max-h-72 -mr-2 pr-2 -mb-1">
                <table className="w-full text-xs text-left text-slate-300"> 
                    <thead className="text-xs text-slate-400 uppercase bg-slate-700/50 sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="px-2 py-1.5">{t('common.time', 'Time')}</th>
                            <th scope="col" className="px-2 py-1.5">{t('common.type', 'Type')}</th>
                            <th scope="col" className="px-2 py-1.5">{t('common.scorer', 'Scorer')}</th>
                            <th scope="col" className="px-2 py-1.5">{t('common.assist', 'Assist')}</th>
                            <th scope="col" className="px-1 py-1.5 text-center"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedLocalGoals.length > 0 ? ( 
                            sortedLocalGoals.map((goal) => { 
                                const scorer = goal.type === 'goal' ? availablePlayers.find(p => p.id === goal.scorerId) : null; 
                                const assister = goal.type === 'goal' && goal.assisterId ? availablePlayers.find(p => p.id === goal.assisterId) : null; 
                                const isEditingThisGoal = editingGoalId === goal.id; 
                                return (
                                    <tr key={goal.id} className={`border-b border-slate-700 ${isEditingThisGoal ? 'bg-slate-700/60' : 'hover:bg-slate-700/40'}`}>
                                        <td className="px-2 py-1">{isEditingThisGoal ? ( <input ref={goalTimeInputRef} type="text" value={editGoalTime} onChange={(e) => setEditGoalTime(e.target.value)} onKeyDown={handleGoalEditKeyDown} className="w-16 max-w-full bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="MM:SS" /> ) : ( formatTime(goal.time) )}</td>
                                        <td className="px-2 py-1"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${goal.type === 'goal' ? 'bg-green-700/70 text-green-100' : 'bg-red-700/70 text-red-100'}`}>{goal.type === 'goal' ? t('common.goal', 'Goal') : t('common.opponentGoal', 'Opp Goal')}</span></td>
                                        <td className="px-2 py-1">{isEditingThisGoal && goal.type === 'goal' ? ( <select value={editGoalScorerId} onChange={(e) => setEditGoalScorerId(e.target.value)} className="w-full max-w-[120px] bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"> <option value="" disabled>{t('common.selectPlayer', 'Scorer...')}</option> {availablePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)} </select> ) : ( goal.type === 'goal' ? scorer?.name ?? goal.scorerId : opponentName )}</td>
                                        <td className="px-2 py-1">{isEditingThisGoal && goal.type === 'goal' ? ( <select value={editGoalAssisterId ?? ''} onChange={(e) => setEditGoalAssisterId(e.target.value || undefined)} className="w-full max-w-[120px] bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"> <option value="">{t('common.noAssist', 'None')}</option> {availablePlayers.filter(p => p.id !== editGoalScorerId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)} </select> ) : ( goal.type === 'goal' ? assister?.name ?? '' : '' )}</td>
                                        <td className="px-1 py-1 text-center whitespace-nowrap">
                                            {goal.type === 'goal' && (
                                                isEditingThisGoal ? (
                                                    <div className="flex gap-1 justify-center">
                                                        <button onClick={handleSaveEditGoal} className="p-1 text-green-400 hover:text-green-300" title={t('common.save') ?? 'Save'}><FaSave size={12}/></button>
                                                        <button onClick={handleCancelEditGoal} className="p-1 text-red-400 hover:text-red-300" title={t('common.cancel') ?? 'Cancel'}><FaTimes size={12}/></button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleStartEditGoal(goal)} disabled={!!editingGoalId} className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" title={t('common.edit') ?? 'Edit'}><FaEdit size={12}/></button>
                                                )
                                            )}
                                            {onDeleteGameEvent && (
                                              <button 
                                                onClick={() => handleDeleteEvent(goal.id)} 
                                                className="p-1 text-red-500 hover:text-red-400 ml-1 disabled:opacity-50 disabled:cursor-not-allowed" 
                                                title={t('common.delete', 'Delete') ?? undefined}
                                                disabled={!!editingGoalId} // Only disable if another row is being edited
                                              >
                                                <FaTrashAlt size={11}/>
                                              </button>
                                            )}
                                        </td>
                                    </tr>
                                ); 
                            }) 
                        ) : (
                            <tr><td colSpan={5} className="text-center py-4 text-slate-400 italic">{t('gameSettingsModal.noGoalsLogged', 'No goals logged.')}</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
          </div>
          {/* --- End Event Editing Section --- */}

        </div> { /* End Scrollable Content Area */ }

        {/* --- Footer --- RESTORE this section */}
        <div className="flex justify-end pt-4 mt-auto border-t border-slate-700 flex-shrink-0">
             <button
               onClick={onClose} 
               className="px-4 py-2 rounded bg-slate-600 text-slate-200 hover:bg-slate-500 transition-colors text-sm font-medium"
             >
               {t('common.close', 'Close')} 
             </button>
        </div>

      </div> { /* End Modal Content */ }
    </div> // End Outer Modal Container
  );
};

export default GameSettingsModal;