'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FaTimes, FaEdit, FaSave, FaTrashAlt } from 'react-icons/fa';
import { Player, GameEvent, Season, Tournament, SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY } from '@/app/page'; // Adjust path as needed

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

  // --- Edit Mode State ---
  const [isEditing, setIsEditing] = useState(false);

  // State for event editor within the modal
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalTime, setEditGoalTime] = useState<string>('');
  const [editGoalScorerId, setEditGoalScorerId] = useState<string>('');
  const [editGoalAssisterId, setEditGoalAssisterId] = useState<string | undefined>(undefined);
  const goalTimeInputRef = useRef<HTMLInputElement>(null);

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
      setIsEditing(false); 
    } 
  }, [isOpen, opponentName, gameDate, gameLocation, gameTime, gameNotes, gameEvents, availablePlayers, numPeriods, periodDurationMinutes]); // Add new props to dependencies

  // Focus goal time input (if event editor becomes active)
  useEffect(() => {
    if (editingGoalId) { goalTimeInputRef.current?.focus(); goalTimeInputRef.current?.select(); }
  }, [editingGoalId]);

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

    handleCancelEditGoal(); // Close editor row
  }, [editingGoalId, localGameEvents, editGoalTime, editGoalScorerId, editGoalAssisterId, handleCancelEditGoal, t]);

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

  // --- Handlers for Edit Mode and Saving ---
  const handleEditClick = () => {
    setIsEditing(true);
    setEditingGoalId(null); // Close any open event editor when starting main edit
  };

  const handleCancelCurrentEdit = () => {
    resetLocalState(); // Reset local state to original props values
    setIsEditing(false); // Exit edit mode
  };

  const handleSaveChanges = () => {
    // Compare local state to original props and call handlers if changed
    if (localOpponentName !== opponentName) {
      onOpponentNameChange(localOpponentName);
    }
    if (localGameDate !== gameDate) {
      onGameDateChange(localGameDate);
    }
    if (localGameLocation !== (gameLocation || '')) {
        onGameLocationChange(localGameLocation);
    }
    if (localGameTime !== (gameTime || '')) {
        onGameTimeChange(localGameTime);
    }
    if (localGameNotes !== (gameNotes || '')) {
      onGameNotesChange(localGameNotes);
    }
    // ADD Check for periods/duration change
    if (localNumPeriods !== numPeriods) {
      onNumPeriodsChange(localNumPeriods);
    }
    if (localPeriodDurationMinutes !== periodDurationMinutes) {
      onPeriodDurationChange(localPeriodDurationMinutes);
    }
    
    // Compare Game Events (simple length check first, then shallow content check)
    // A more robust diffing could be implemented if needed
    if (localGameEvents.length !== gameEvents.length || 
        JSON.stringify(localGameEvents) !== JSON.stringify(gameEvents)) {
        // Identify changed events (basic implementation: call update for all local events)
        // This assumes onUpdateGameEvent can handle existing events correctly
        // A better approach might involve passing the whole array or diffing properly
        console.warn("Updating all local game events - consider implementing proper diffing if needed.");
        localGameEvents.forEach(event => {
            // We only call the update handler from page.tsx here
            // This assumes page.tsx handles the logic of finding/updating/adding
            // For simplicity now, we only call for events that existed initially
            const original = gameEvents.find(e => e.id === event.id);
            if(original && JSON.stringify(original) !== JSON.stringify(event)) {
                 onUpdateGameEvent(event);
            }
            // How to handle events deleted locally? Needs onDeleteGameEvent prop.
            // How to handle events added locally? Needs onAddGameEvent prop.
        });
        // How to handle deleted events? Need comparison logic and onDelete handler
    }

    setIsEditing(false); // RE-ADD: Exit edit mode after saving changes
    // Do not call onClose() here, let user close manually if needed
     console.log("Save changes triggered, exiting edit mode."); // Update log message
  };

  const resetLocalState = () => {
    setLocalOpponentName(opponentName);
    setLocalGameDate(gameDate);
    setLocalGameLocation(gameLocation || '');
    setLocalGameTime(gameTime || '');
    setLocalGameNotes(gameNotes);
    setLocalGameEvents(gameEvents);
    // ADD Reset periods/duration
    setLocalNumPeriods(numPeriods);
    setLocalPeriodDurationMinutes(periodDurationMinutes);
    setEditingGoalId(null);
    setIsEditing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      {/* Modal container - Adjust size */}
      <div className="bg-slate-800 rounded-lg shadow-xl w-full h-[95vh] flex flex-col border border-slate-600">
        {/* Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-yellow-300">{t('gameSettingsModal.title', 'Game Settings')}</h2>
          {/* Show Edit button only when NOT editing */}
          {!isEditing && (
              <button 
                onClick={handleEditClick} 
                className="p-1.5 text-slate-400 hover:text-slate-200 rounded bg-slate-700 hover:bg-slate-600"
                title={t('common.edit', 'Edit') ?? 'Edit'}
              >
                  <FaEdit />
              </button>
          )}
          {/* Always show Close button */}
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 ml-auto pl-4" aria-label={t('common.close', 'Close')}><FaTimes size={20} /></button>
        </div>

        {/* Body: Two Column Layout */}
        <div className="p-6 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50 grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column */}
          <div className="space-y-6">
            {/* Game Info Section (Inputs always visible) */}
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-slate-200">{t('gameSettingsModal.gameInfoTitle', 'Game Information')}</h3>
                    {/* Edit button moved to header */} 
                </div>
                {currentContextName && ( <p className="text-sm text-indigo-300 font-medium mb-2">{currentContextName}</p> )}
                <div className="space-y-3 text-sm">
                    {/* Opponent */}
                    <div>
                        <label htmlFor="settingsOpponentName" className="block text-xs text-slate-400 font-medium mb-0.5">{t('common.opponent', 'Opponent')}</label>
                        {isEditing ? (
                            <input id="settingsOpponentName" type="text" value={localOpponentName} onChange={(e) => setLocalOpponentName(e.target.value)} className="w-full bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        ) : (
                            <p className="text-slate-100 pt-1 min-h-[28px]">{localOpponentName}</p> // Display text
                        )}
                    </div>
                    {/* Date */}
                    <div>
                        <label htmlFor="settingsGameDate" className="block text-xs text-slate-400 font-medium mb-0.5">{t('common.date', 'Date')}</label>
                        {isEditing ? (
                            <input 
                                id="settingsGameDate" 
                                type="date" 
                                value={localGameDate}
                                onChange={(e) => setLocalGameDate(e.target.value)}
                                className="w-full bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" 
                            />
                         ) : (
                            <p className="text-slate-100 pt-1 min-h-[28px]">{formatDateFi(localGameDate)}</p> 
                        )}
                    </div>
                    {/* Scores (Display Only) */}
                    <div className="grid grid-cols-2 gap-4">
                      <div> 
                          <span className="block text-xs text-slate-400 font-medium mb-0.5">{teamName || t('common.home', 'Home')}</span> 
                          <span className="text-slate-100 font-medium text-lg">{homeScore}</span> 
                      </div>
                      <div> 
                          <span className="block text-xs text-slate-400 font-medium mb-0.5">{opponentName || t('common.away', 'Away')}</span> 
                          <span className="text-slate-100 font-medium text-lg">{awayScore}</span> 
                      </div>
                    </div>
                    {/* Location */}
                    <div>
                        <label htmlFor="settingsGameLocation" className="block text-xs text-slate-400 font-medium mb-0.5">{t('common.location', 'Location')}</label>
                        {isEditing ? (
                            <input id="settingsGameLocation" type="text" value={localGameLocation} onChange={(e) => setLocalGameLocation(e.target.value)} placeholder={t('common.notSet', 'Not Set') ?? undefined} className="w-full bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        ) : (
                            <p className="text-slate-100 pt-1 min-h-[28px]">{localGameLocation || t('common.notSet', 'Not Set')}</p> // Display text
                        )}
                    </div>
                    {/* Time */}
                    <div>
                        <label htmlFor="settingsGameTime" className="block text-xs text-slate-400 font-medium mb-0.5">{t('common.time', 'Time')}</label>
                        {isEditing ? (
                            <input id="settingsGameTime" type="time" value={localGameTime} onChange={(e) => setLocalGameTime(e.target.value)} className="w-full bg-slate-700 border border-slate-500 rounded px-2 py-1 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
                        ) : (
                             <p className="text-slate-100 pt-1 min-h-[28px]">{localGameTime || t('common.notSet', 'Not Set')}</p> // Display text
                        )}
                    </div>
                    {/* ADD Period/Duration Controls */}
                    <div className="grid grid-cols-2 gap-4 mt-3">
                        {/* Number of Periods */}
                        <div>
                            <label className="block text-xs text-slate-400 font-medium mb-0.5">{t('timerOverlay.periodsLabel', 'Periods')}</label>
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setLocalNumPeriods(prev => Math.max(1, prev - 1))} 
                                        className="px-2 py-0.5 bg-slate-600 rounded hover:bg-slate-500 text-lg" 
                                        aria-label="Decrease periods">
                                        -
                                    </button>
                                    <span className="text-slate-100 font-medium w-6 text-center">{localNumPeriods}</span>
                                    <button 
                                        onClick={() => setLocalNumPeriods(prev => prev + 1)} 
                                        className="px-2 py-0.5 bg-slate-600 rounded hover:bg-slate-500 text-lg" 
                                        aria-label="Increase periods">
                                        +
                                    </button>
                                </div>
                            ) : (
                                <p className="text-slate-100 pt-1 min-h-[28px]">{localNumPeriods}</p>
                            )}
                        </div>
                        {/* Period Duration */}
                        <div>
                            <label className="block text-xs text-slate-400 font-medium mb-0.5">{t('timerOverlay.durationLabel', 'Duration')} (min)</label>
                            {isEditing ? (
                                <div className="flex items-center gap-2">
                                     <button 
                                        onClick={() => setLocalPeriodDurationMinutes(prev => Math.max(1, prev - 1))} 
                                        className="px-2 py-0.5 bg-slate-600 rounded hover:bg-slate-500 text-lg" 
                                        aria-label="Decrease duration">
                                        -
                                    </button>
                                    <span className="text-slate-100 font-medium w-6 text-center">{localPeriodDurationMinutes}</span>
                                    <button 
                                        onClick={() => setLocalPeriodDurationMinutes(prev => prev + 1)} 
                                        className="px-2 py-0.5 bg-slate-600 rounded hover:bg-slate-500 text-lg" 
                                        aria-label="Increase duration">
                                        +
                                    </button>
                                </div>
                            ) : (
                                <p className="text-slate-100 pt-1 min-h-[28px]">{localPeriodDurationMinutes}</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Fair Play Award Section */}
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200 mb-3">{t('gameSettingsModal.fairPlayTitle', 'Fair Play Award')}</h3>
              <div className="flex items-center gap-2">
                <select
                  id="settingsFairPlaySelect"
                  value={localFairPlayPlayerId || ''}
                  onChange={handleFairPlayChange}
                  className="block w-full px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">{t('gameSettingsModal.awardFairPlayNone', '- None -')}</option>
                  {availablePlayers.map(player => ( <option key={player.id} value={player.id}>{player.name}</option> ))}
                </select>
              </div>
            </div>

            {/* Game Notes Section */}
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <h3 className="text-lg font-semibold text-slate-200 mb-2">{t('gameSettingsModal.notesTitle', 'Game Notes')}</h3>
                 {isEditing ? (
                    <textarea 
                        value={localGameNotes} 
                        onChange={(e) => setLocalGameNotes(e.target.value)} 
                        className="w-full h-28 p-2 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder={t('gameSettingsModal.notesPlaceholder', 'Notes...') ?? undefined}
                    />
                 ) : (
                    <div className="min-h-[7rem] p-2 text-sm text-slate-300 whitespace-pre-wrap rounded border border-transparent">
                         {localGameNotes ? localGameNotes : <span className="italic text-slate-400">{t('gameSettingsModal.noNotes', 'No notes.')}</span>}
                    </div>
                 )}
            </div>
          </div> {/* End Left Column */} 

          {/* Right Column */}
          <div>
            {/* Event Editing Section */} 
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 h-full flex flex-col">
                <h3 className="text-lg font-semibold text-slate-200 mb-3 flex-shrink-0">{t('gameSettingsModal.eventLogTitle', 'Edit Game Events')}</h3>
                <div className="overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50 -mr-2 pr-2">
                    <table className="w-full text-sm text-left text-slate-300">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-700/50 sticky top-0 z-10">
                            <tr>
                                <th scope="col" className="px-4 py-2">{t('common.time', 'Time')}</th>
                                <th scope="col" className="px-4 py-2">{t('common.type', 'Type')}</th>
                                <th scope="col" className="px-4 py-2">{t('common.scorer', 'Scorer')}</th>
                                <th scope="col" className="px-4 py-2">{t('common.assist', 'Assist')}</th>
                                <th scope="col" className="px-1 py-2 text-center"></th>
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
                                            {/* Time */}
                                            <td className="px-4 py-1.5">{isEditingThisGoal ? ( <input ref={goalTimeInputRef} type="text" value={editGoalTime} onChange={(e) => setEditGoalTime(e.target.value)} onKeyDown={handleGoalEditKeyDown} className="w-16 bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="MM:SS" /> ) : ( formatTime(goal.time) )}</td>
                                            {/* Type */}
                                            <td className="px-4 py-1.5"><span className={`px-2 py-0.5 rounded text-xs font-medium ${goal.type === 'goal' ? 'bg-green-700/70 text-green-100' : 'bg-red-700/70 text-red-100'}`}>{goal.type === 'goal' ? t('common.goal', 'Goal') : t('common.opponentGoal', 'Opp Goal')}</span></td>
                                            {/* Scorer */}
                                            <td className="px-4 py-1.5">{isEditingThisGoal && goal.type === 'goal' ? ( <select value={editGoalScorerId} onChange={(e) => setEditGoalScorerId(e.target.value)} className="w-full bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"> <option value="" disabled>{t('common.selectPlayer', 'Scorer...')}</option> {availablePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)} </select> ) : ( goal.type === 'goal' ? scorer?.name ?? goal.scorerId : opponentName )}</td>
                                            {/* Assist */}
                                            <td className="px-4 py-1.5">{isEditingThisGoal && goal.type === 'goal' ? ( <select value={editGoalAssisterId ?? ''} onChange={(e) => setEditGoalAssisterId(e.target.value || undefined)} className="w-full bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"> <option value="">{t('common.noAssist', 'None')}</option> {availablePlayers.filter(p => p.id !== editGoalScorerId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)} </select> ) : ( goal.type === 'goal' ? assister?.name ?? '' : '' )}</td>
                                            {/* Edit Controls */}
                                            <td className="px-1 py-1.5 text-center">
                                                {goal.type === 'goal' && ( // Only allow editing 'goal' type
                                                    isEditingThisGoal ? (
                                                        <div className="flex gap-1 justify-center">
                                                            <button onClick={handleSaveEditGoal} className="p-1 text-green-400 hover:text-green-300" title={t('common.save') ?? 'Save'}><FaSave /></button>
                                                            <button onClick={handleCancelEditGoal} className="p-1 text-red-400 hover:text-red-300" title={t('common.cancel') ?? 'Cancel'}><FaTimes /></button>
                                                        </div>
                                                    ) : (
                                                        <button onClick={() => handleStartEditGoal(goal)} disabled={!!editingGoalId || isEditing} className="p-1 text-slate-400 hover:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" title={t('common.edit') ?? 'Edit'}><FaEdit /></button> // Also disable if main edit mode active
                                                    )
                                                )}
                                                {/* Add Delete button? 
                                                <button onClick={() => handleDeleteEvent(goal.id)} className="p-1 text-red-500 hover:text-red-400" title={t('common.delete') ?? 'Delete'}><FaTrashAlt /></button> 
                                                */} 
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
          </div> {/* End Right Column */} 

        </div> {/* End Modal Body Grid */}

        {/* Footer with Conditional Buttons */}
        <div className={`p-4 border-t border-slate-700 flex-shrink-0 ${
          isEditing 
            ? 'flex flex-col gap-2' 
            : 'flex justify-end items-center gap-3' 
        }`}>
          {/* Edit Mode Layout */}
          {isEditing && (
            <>
              {/* Row 1: Cancel and Save */}
              <div className="flex gap-2 w-full">
                <button
                  onClick={handleCancelCurrentEdit} 
                  className="flex-1 px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 transition duration-150 text-sm"
                >
                  {t('common.cancelEdit', 'Cancel Edit')} 
                </button>
                <button
                  onClick={handleSaveChanges} 
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-150 text-sm"
                >
                  {t('common.saveChanges', 'Save Changes')} 
                </button>
              </div>
              {/* Row 2: Close */}
              <button
                onClick={onClose} 
                className="w-full px-4 py-2 bg-slate-700 text-white rounded hover:bg-slate-600 transition duration-150 text-sm" // Different style for close in edit mode? Maybe darker.
              >
                {t('common.close', 'Close')} 
              </button>
            </>
          )}
          
          {/* Non-Edit Mode Layout */}
          {!isEditing && (
            <button
              onClick={onClose} 
              className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 transition duration-150 text-sm"
            >
              {t('common.close', 'Close')} 
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameSettingsModal; 