'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
// Import Season/Tournament types and keys
import { Player, GameEvent, SavedGamesCollection, Season, Tournament, SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY } from '@/app/page';
import { FaSort, FaSortUp, FaSortDown, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

// Define the type for sortable columns
type SortableColumn = 'name' | 'goals' | 'assists' | 'totalScore';
type SortDirection = 'asc' | 'desc';

interface PlayerStatRow extends Player {
  goals: number;
  assists: number;
  totalScore: number;
}

interface GameStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  opponentName: string;
  gameDate: string;
  homeScore: number;
  awayScore: number;
  gameLocation?: string;
  gameTime?: string;
  availablePlayers: Player[];
  gameEvents: GameEvent[];
  gameNotes?: string;
  onOpponentNameChange: (name: string) => void;
  onGameDateChange: (date: string) => void;
  onHomeScoreChange: (score: number) => void;
  onAwayScoreChange: (score: number) => void;
  onGameNotesChange?: (notes: string) => void;
  onUpdateGameEvent?: (updatedEvent: GameEvent) => void;
  onAwardFairPlayCard?: (playerId: string | null) => void; // Allow null for unsetting
  selectedPlayerIds: string[];
  currentGameId: string | null;
  seasonId?: string | null;
  tournamentId?: string | null;
  // Export props for current game ONLY
  onExportOneJson?: (gameId: string) => void;
  onExportOneCsv?: (gameId: string) => void;
}

// Helper to format time from seconds to MM:SS
const formatTime = (timeInSeconds: number): string => {
  const minutes = Math.floor(timeInSeconds / 60);
  const seconds = timeInSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};

const GameStatsModal: React.FC<GameStatsModalProps> = ({
  isOpen,
  onClose,
  teamName,
  opponentName,
  gameDate,
  homeScore,
  awayScore,
  gameLocation,
  gameTime,
  availablePlayers,
  gameEvents,
  gameNotes = '',
  onOpponentNameChange,
  onGameDateChange,
  onHomeScoreChange,
  onAwayScoreChange,
  onGameNotesChange = () => {},
  onUpdateGameEvent = () => { console.warn('onUpdateGameEvent handler not provided'); },
  onAwardFairPlayCard,
  selectedPlayerIds,
  currentGameId,
  seasonId,
  tournamentId,
  onExportOneJson,
  onExportOneCsv,
}) => {
  const { t } = useTranslation();

  // --- State ---
  const [editOpponentName, setEditOpponentName] = useState(opponentName);
  const [editGameDate, setEditGameDate] = useState(gameDate);
  const [editHomeScore, setEditHomeScore] = useState(String(homeScore));
  const [editAwayScore, setEditAwayScore] = useState(String(awayScore));
  const [editGameNotes, setEditGameNotes] = useState(gameNotes);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [inlineEditingField, setInlineEditingField] = useState<'opponent' | 'date' | 'home' | 'away' | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');
  const opponentInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const homeScoreInputRef = useRef<HTMLInputElement>(null);
  const awayScoreInputRef = useRef<HTMLInputElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [sortColumn, setSortColumn] = useState<SortableColumn>('totalScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterText, setFilterText] = useState<string>('');
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalTime, setEditGoalTime] = useState<string>(''); // Use string MM:SS for input
  const [editGoalScorerId, setEditGoalScorerId] = useState<string>('');
  const [editGoalAssisterId, setEditGoalAssisterId] = useState<string | undefined>(undefined);
  const goalTimeInputRef = useRef<HTMLInputElement>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

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

  // Reset edit state
  useEffect(() => {
      if (isOpen) {
          setEditOpponentName(opponentName);
          setEditGameDate(gameDate);
          setEditHomeScore(String(homeScore));
          setEditAwayScore(String(awayScore));
          setEditGameNotes(gameNotes);
          setIsEditingInfo(false);
          setIsEditingNotes(false);
          setInlineEditingField(null);
      } else {
          setIsEditingInfo(false);
          setIsEditingNotes(false);
          setInlineEditingField(null);
      }
  }, [isOpen, opponentName, gameDate, homeScore, awayScore, gameNotes]);

  // Focus elements
  useEffect(() => {
    if (inlineEditingField === 'opponent') { opponentInputRef.current?.focus(); opponentInputRef.current?.select(); }
    else if (inlineEditingField === 'date') { dateInputRef.current?.focus(); }
    else if (inlineEditingField === 'home') { homeScoreInputRef.current?.focus(); homeScoreInputRef.current?.select(); }
    else if (inlineEditingField === 'away') { awayScoreInputRef.current?.focus(); awayScoreInputRef.current?.select(); }
    if (isEditingNotes) { notesTextareaRef.current?.focus(); }
  }, [inlineEditingField, isEditingNotes]);

  // Focus goal time input
  useEffect(() => {
      if (editingGoalId) { goalTimeInputRef.current?.focus(); goalTimeInputRef.current?.select(); }
  }, [editingGoalId]);

  // --- Calculations ---\
  const currentContextName = useMemo(() => {
      if (seasonId) return seasons.find(s => s.id === seasonId)?.name;
      if (tournamentId) return tournaments.find(t => t.id === tournamentId)?.name;
      return null;
  }, [seasonId, tournamentId, seasons, tournaments]);

  const filteredAndSortedPlayerStats = useMemo(() => {
    const selectedPlayers = availablePlayers.filter(p => selectedPlayerIds.includes(p.id));
    const allPlayerStats: PlayerStatRow[] = selectedPlayers.map(player => {
      const goals = gameEvents.filter(e => e.type === 'goal' && e.scorerId === player.id).length;
      const assists = gameEvents.filter(e => e.type === 'goal' && e.assisterId === player.id).length;
      const totalScore = goals + assists;
      return { ...player, goals, assists, totalScore };
    });
    const filteredStats = filterText
      ? allPlayerStats.filter(player => player.name.toLowerCase().includes(filterText.toLowerCase()))
      : allPlayerStats;
    const sortedStats = [...filteredStats].sort((a, b) => {
      const valA = a[sortColumn], valB = b[sortColumn]; let comparison = 0;
      if (typeof valA === 'string' && typeof valB === 'string') comparison = valA.localeCompare(valB);
      else if (typeof valA === 'number' && typeof valB === 'number') comparison = valA - valB;
      else comparison = String(valA).localeCompare(String(valB));
      return sortDirection === 'desc' ? comparison * -1 : comparison;
    });
    return sortedStats;
  }, [availablePlayers, selectedPlayerIds, gameEvents, filterText, sortColumn, sortDirection]);

  const sortedGoals = useMemo(() => {
    return gameEvents.filter(e => e.type === 'goal' || e.type === 'opponentGoal').sort((a, b) => a.time - b.time);
  }, [gameEvents]);

  // --- Handlers ---
  const handleSaveInfo = () => {
      const home = parseInt(editHomeScore), away = parseInt(editAwayScore);
      if (isNaN(home) || isNaN(away) || home < 0 || away < 0) { alert(t('gameStatsModal.invalidScoreAlert', 'Scores must be non-negative numbers.')); return; }
      onOpponentNameChange(editOpponentName); onGameDateChange(editGameDate);
      onHomeScoreChange(home); onAwayScoreChange(away);
      setIsEditingInfo(false); setInlineEditingField(null);
  };
  const handleCancelEditInfo = () => {
      setEditOpponentName(opponentName); setEditGameDate(gameDate);
      setEditHomeScore(String(homeScore)); setEditAwayScore(String(awayScore));
      setIsEditingInfo(false); setInlineEditingField(null);
  };
  const handleSaveNotes = () => { if (gameNotes !== editGameNotes) onGameNotesChange(editGameNotes); setIsEditingNotes(false); };
  const handleCancelEditNotes = () => { setEditGameNotes(gameNotes); setIsEditingNotes(false); };
  const handleStartInlineEdit = (field: 'opponent' | 'date' | 'home' | 'away') => {
    if (isEditingInfo || isEditingNotes) return;
    setInlineEditingField(field);
    let initialValue = '';
    switch(field) {
      case 'opponent': initialValue = opponentName; break;
      case 'date': initialValue = gameDate; break;
      case 'home': initialValue = String(homeScore); break;
      case 'away': initialValue = String(awayScore); break;
    }
    setInlineEditValue(initialValue); setIsEditingInfo(false);
  };
  const handleCancelInlineEdit = () => { setInlineEditingField(null); setInlineEditValue(''); };
  const handleSaveInlineEdit = () => {
    if (!inlineEditingField) return;
    const trimmedValue = inlineEditValue.trim();
    switch(inlineEditingField) {
      case 'opponent': onOpponentNameChange(trimmedValue || t('gameStatsModal.opponentPlaceholder', 'Opponent')); break;
      case 'date': if (trimmedValue) onGameDateChange(trimmedValue); break;
      case 'home': case 'away':
        const score = parseInt(trimmedValue);
        if (!isNaN(score) && score >= 0) {
            if (inlineEditingField === 'home') onHomeScoreChange(score); else onAwayScoreChange(score);
        } else { alert(t('gameStatsModal.invalidScoreAlert', 'Score must be non-negative.')); return; }
        break;
    }
      handleCancelInlineEdit();
  };
  const handleInlineEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => { if (event.key === 'Enter') handleSaveInlineEdit(); else if (event.key === 'Escape') handleCancelInlineEdit(); };
  const handleSort = (column: SortableColumn) => { if (sortColumn === column) setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc')); else { setSortColumn(column); setSortDirection(column === 'name' ? 'asc' : 'desc'); } };
  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => { setFilterText(event.target.value); };
  const handleStartEditGoal = (goal: GameEvent) => {
    setEditingGoalId(goal.id);
    setEditGoalTime(formatTime(goal.time));
    setEditGoalScorerId(goal.scorerId ?? '');
    setEditGoalAssisterId(goal.assisterId ?? '');
    setIsEditingInfo(false);
    setIsEditingNotes(false);
    setInlineEditingField(null);
  };
  const handleCancelEditGoal = () => { setEditingGoalId(null); };
  const handleSaveEditGoal = () => {
    if (!editingGoalId) return;
    const originalGoal = gameEvents.find(e => e.id === editingGoalId); if (!originalGoal) { console.error("Original goal missing!"); handleCancelEditGoal(); return; }
    const timeParts = editGoalTime.match(/^(\d{1,2}):(\d{1,2})$/); let timeInSeconds = 0;
    if (timeParts) { const m = parseInt(timeParts[1], 10), s = parseInt(timeParts[2], 10); if (!isNaN(m) && !isNaN(s) && m >= 0 && s >= 0 && s < 60) timeInSeconds = m * 60 + s; else { alert(t('gameStatsModal.invalidTimeFormat', 'Invalid time format. MM:SS')); goalTimeInputRef.current?.focus(); return; } } else { alert(t('gameStatsModal.invalidTimeFormat', 'Invalid time format. MM:SS')); goalTimeInputRef.current?.focus(); return; }
    const updatedScorerId = editGoalScorerId; const updatedAssisterId = editGoalAssisterId || undefined;
    if (!updatedScorerId) { alert(t('gameStatsModal.scorerRequired', 'Scorer must be selected.')); return; }
    const updatedEvent: GameEvent = { ...originalGoal, time: timeInSeconds, scorerId: updatedScorerId, assisterId: updatedAssisterId };
    if (typeof onUpdateGameEvent === 'function') {
        onUpdateGameEvent(updatedEvent);
    }
    handleCancelEditGoal();
  };
  const handleGoalEditKeyDown = (event: React.KeyboardEvent) => { if (event.key === 'Enter') handleSaveEditGoal(); else if (event.key === 'Escape') handleCancelEditGoal(); }

  if (!isOpen) return null;

    return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col border border-slate-600">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-5 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-yellow-300">{t('gameStatsModal.title', 'Game Statistics')}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200" aria-label={t('common.close', 'Close')}><FaTimes size={20} /></button>
            </div>

        {/* Modal Body - Directly render stats */}
        <div className="p-6 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
            {/* Game Info Section */}
            <div className="mb-8 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-slate-200">{t('gameStatsModal.gameInfoTitle', 'Game Information')}</h3>
                    <div className="flex items-center gap-2">
                        {isEditingInfo ? (
                            <>
                                <button onClick={handleSaveInfo} className="p-1.5 text-green-400 hover:text-green-300 rounded bg-slate-700 hover:bg-slate-600" title={t('common.saveChanges') ?? 'Save'}><FaSave /></button>
                                <button onClick={handleCancelEditInfo} className="p-1.5 text-red-400 hover:text-red-300 rounded bg-slate-700 hover:bg-slate-600" title={t('common.cancel') ?? 'Cancel'}><FaTimes /></button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditingInfo(true)} disabled={!!inlineEditingField || isEditingNotes} className="p-1.5 text-slate-400 hover:text-slate-200 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed" title={t('common.edit') ?? 'Edit'}><FaEdit /></button>
                        )}
      </div>
            </div>
                {currentContextName && ( <p className="text-sm text-indigo-300 font-medium mb-2">{currentContextName}</p> )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                    {/* Opponent */}
                    <div className={`p-2 rounded ${inlineEditingField === 'opponent' ? '' : 'hover:bg-slate-700/50 cursor-pointer'}`} onDoubleClick={() => !isEditingInfo && !isEditingNotes && handleStartInlineEdit('opponent')} title={!isEditingInfo && !isEditingNotes ? t('gameStatsModal.doubleClickToEdit', 'Click to edit') ?? undefined : undefined}> <span className="block text-xs text-slate-400 font-medium mb-0.5">{t('common.opponent', 'Opponent')}</span> {inlineEditingField === 'opponent' ? ( <input ref={opponentInputRef} type="text" value={inlineEditValue} onChange={(e) => setInlineEditValue(e.target.value)} onBlur={handleSaveInlineEdit} onKeyDown={handleInlineEditKeyDown} className="w-full bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" /> ) : ( <span className="text-slate-100 font-medium">{opponentName}</span> )} </div>
                {/* Date */}
                    <div className={`p-2 rounded ${inlineEditingField === 'date' ? '' : 'hover:bg-slate-700/50 cursor-pointer'}`} onDoubleClick={() => !isEditingInfo && !isEditingNotes && handleStartInlineEdit('date')} title={!isEditingInfo && !isEditingNotes ? t('gameStatsModal.doubleClickToEdit', 'Click to edit') ?? undefined : undefined}> <span className="block text-xs text-slate-400 font-medium mb-0.5">{t('common.date', 'Date')}</span> {inlineEditingField === 'date' ? ( <input ref={dateInputRef} type="date" value={inlineEditValue} onChange={(e) => setInlineEditValue(e.target.value)} onBlur={handleSaveInlineEdit} onKeyDown={handleInlineEditKeyDown} className="w-full bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" /> ) : ( <span className="text-slate-100 font-medium">{gameDate}</span> )} </div>
                    {/* Home Score */}
                    <div className={`p-2 rounded ${inlineEditingField === 'home' ? '' : 'hover:bg-slate-700/50 cursor-pointer'}`} onDoubleClick={() => !isEditingInfo && !isEditingNotes && handleStartInlineEdit('home')} title={!isEditingInfo && !isEditingNotes ? t('gameStatsModal.doubleClickToEdit', 'Click to edit') ?? undefined : undefined}> <span className="block text-xs text-slate-400 font-medium mb-0.5">{teamName || t('common.home', 'Home')}</span> {inlineEditingField === 'home' ? ( <input ref={homeScoreInputRef} type="number" value={inlineEditValue} min="0" onChange={(e) => setInlineEditValue(e.target.value)} onBlur={handleSaveInlineEdit} onKeyDown={handleInlineEditKeyDown} className="w-full bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" /> ) : ( <span className="text-slate-100 font-medium text-lg">{homeScore}</span> )} </div>
                    {/* Away Score */}
                    <div className={`p-2 rounded ${inlineEditingField === 'away' ? '' : 'hover:bg-slate-700/50 cursor-pointer'}`} onDoubleClick={() => !isEditingInfo && !isEditingNotes && handleStartInlineEdit('away')} title={!isEditingInfo && !isEditingNotes ? t('gameStatsModal.doubleClickToEdit', 'Click to edit') ?? undefined : undefined}> <span className="block text-xs text-slate-400 font-medium mb-0.5">{opponentName || t('common.away', 'Away')}</span> {inlineEditingField === 'away' ? ( <input ref={awayScoreInputRef} type="number" value={inlineEditValue} min="0" onChange={(e) => setInlineEditValue(e.target.value)} onBlur={handleSaveInlineEdit} onKeyDown={handleInlineEditKeyDown} className="w-full bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" /> ) : ( <span className="text-slate-100 font-medium text-lg">{awayScore}</span> )} </div>
                {/* Location */}
                    <div className="p-2 col-span-2 sm:col-span-2"> <span className="block text-xs text-slate-400 font-medium mb-0.5">{t('common.location', 'Location')}</span> <span className="text-slate-100">{gameLocation || t('common.notSet', 'Not Set')}</span> </div>
                {/* Time */}
                    <div className="p-2 col-span-2 sm:col-span-2"> <span className="block text-xs text-slate-400 font-medium mb-0.5">{t('common.time', 'Time')}</span> <span className="text-slate-100">{gameTime || t('common.notSet', 'Not Set')}</span> </div>
                  </div>
                </div>

            {/* Main Stats Layout Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Player Stats Table Section */}
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-200 mb-3">{t('gameStatsModal.playerStatsTitle', 'Player Statistics')}</h3>
                    {/* Fair Play Select */}
            {onAwardFairPlayCard && (
              <div className="mb-3 flex items-center gap-2">
                            <label htmlFor="fairPlaySelect" className="text-sm font-medium text-slate-300 whitespace-nowrap">{t('gameStatsModal.awardFairPlayLabel', 'Fair Play Award:')}</label>
                <select
                  id="fairPlaySelect"
                  value={availablePlayers.find(p => selectedPlayerIds.includes(p.id) && p.receivedFairPlayCard)?.id || ''}
                                onChange={(e) => onAwardFairPlayCard(e.target.value || null)} // Pass null if unselected
                  className="block w-full px-3 py-1.5 bg-slate-600 border border-slate-500 rounded-md shadow-sm text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                                <option value="">{t('gameStatsModal.awardFairPlayNone', '- None -')}</option>
                                {availablePlayers.filter(player => selectedPlayerIds.includes(player.id)).map(player => ( <option key={player.id} value={player.id}>{player.name}</option> ))}
                </select>
              </div>
            )}
            {/* Filter Input */}
                    <input type="text" placeholder={t('common.filterByName', 'Filter...') ?? "Filter..."} value={filterText} onChange={handleFilterChange} className="w-full px-3 py-1.5 mb-3 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    {/* Player Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-300">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                                <tr>
                                    <th scope="col" className="px-4 py-3 cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('name')}> <div className="flex items-center">{t('common.player', 'Player')} {sortColumn === 'name' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1 w-3 h-3"/> : <FaSortDown className="ml-1 w-3 h-3"/>) : <FaSort className="ml-1 w-3 h-3 opacity-30"/>}</div> </th>
                                    <th scope="col" className="px-2 py-3 text-center cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('goals')}> <div className="flex items-center justify-center">{t('common.goalsShort', 'G')} {sortColumn === 'goals' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1 w-3 h-3"/> : <FaSortDown className="ml-1 w-3 h-3"/>) : <FaSort className="ml-1 w-3 h-3 opacity-30"/>}</div> </th>
                                    <th scope="col" className="px-2 py-3 text-center cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('assists')}> <div className="flex items-center justify-center">{t('common.assistsShort', 'A')} {sortColumn === 'assists' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1 w-3 h-3"/> : <FaSortDown className="ml-1 w-3 h-3"/>) : <FaSort className="ml-1 w-3 h-3 opacity-30"/>}</div> </th>
                                    <th scope="col" className="px-2 py-3 text-center cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('totalScore')}> <div className="flex items-center justify-center">{t('common.totalScoreShort', 'Pts')} {sortColumn === 'totalScore' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1 w-3 h-3"/> : <FaSortDown className="ml-1 w-3 h-3"/>) : <FaSort className="ml-1 w-3 h-3 opacity-30"/>}</div> </th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredAndSortedPlayerStats.length > 0 ? ( filteredAndSortedPlayerStats.map((player) => (
                                    <tr key={player.id} className="border-b border-slate-700 hover:bg-slate-700/40">
                                        <td className="px-4 py-2 font-medium text-slate-100 whitespace-nowrap">
                          {player.name}
                                            {player.isGoalie && <span className="ml-1.5 px-1 text-[9px] bg-amber-500 text-white rounded-sm" title={t('gameStatsModal.goalieIndicator', 'Goalie')}>G</span>}
                                            {player.receivedFairPlayCard && <span className="ml-1.5 px-1 text-[9px] bg-emerald-500 text-white rounded-sm" title={t('gameStatsModal.fairPlayAwarded', 'Fair Play Award')}>FP</span>}
                        </td>
                                        <td className="px-2 py-2 text-center">{player.goals}</td>
                                        <td className="px-2 py-2 text-center">{player.assists}</td>
                                        <td className="px-2 py-2 text-center font-semibold">{player.totalScore}</td>
                      </tr>
                                ))) : (
                                    <tr><td colSpan={4} className="text-center py-4 text-slate-400 italic">{filterText ? t('common.noPlayersMatchFilter', 'No players match filter') : t('common.noPlayersSelected', 'No players selected')}</td></tr>
                                )}
                </tbody>
              </table>
            </div>
                </div>

          {/* Goal Log Section */}
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-200 mb-3">{t('gameStatsModal.goalLogTitle', 'Goal Log')}</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-300">
                            <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                                <tr>
                                    <th scope="col" className="px-4 py-3">{t('common.time', 'Time')}</th>
                                    <th scope="col" className="px-4 py-3">{t('common.type', 'Type')}</th>
                                    <th scope="col" className="px-4 py-3">{t('common.scorer', 'Scorer')}</th>
                                    <th scope="col" className="px-4 py-3">{t('common.assist', 'Assist')}</th>
                                    <th scope="col" className="px-1 py-3 text-center"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {sortedGoals.length > 0 ? ( sortedGoals.map((goal) => { const scorer = goal.type === 'goal' ? availablePlayers.find(p => p.id === goal.scorerId) : null; const assister = goal.type === 'goal' && goal.assisterId ? availablePlayers.find(p => p.id === goal.assisterId) : null; const isEditingThisGoal = editingGoalId === goal.id; return (
                                    <tr key={goal.id} className={`border-b border-slate-700 ${isEditingThisGoal ? 'bg-slate-700/60' : 'hover:bg-slate-700/40'}`}>
                                        <td className="px-4 py-2">{isEditingThisGoal ? ( <input ref={goalTimeInputRef} type="text" value={editGoalTime} onChange={(e) => setEditGoalTime(e.target.value)} onKeyDown={handleGoalEditKeyDown} className="w-16 bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="MM:SS" /> ) : ( formatTime(goal.time) )}</td>
                                        <td className="px-4 py-2"><span className={`px-2 py-0.5 rounded text-xs font-medium ${goal.type === 'goal' ? 'bg-green-700/70 text-green-100' : 'bg-red-700/70 text-red-100'}`}>{goal.type === 'goal' ? t('common.goal', 'Goal') : t('common.opponentGoal', 'Opp Goal')}</span></td>
                                        <td className="px-4 py-2">{isEditingThisGoal && goal.type === 'goal' ? ( <select value={editGoalScorerId} onChange={(e) => setEditGoalScorerId(e.target.value)} className="bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"> <option value="" disabled>{t('common.selectPlayer', 'Scorer...')}</option> {availablePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)} </select> ) : ( goal.type === 'goal' ? scorer?.name ?? goal.scorerId : opponentName )}</td>
                                        <td className="px-4 py-2">{isEditingThisGoal && goal.type === 'goal' ? ( <select value={editGoalAssisterId ?? ''} onChange={(e) => setEditGoalAssisterId(e.target.value || undefined)} className="bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"> <option value="">{t('common.noAssist', 'None')}</option> {availablePlayers.filter(p => p.id !== editGoalScorerId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)} </select> ) : ( goal.type === 'goal' ? assister?.name ?? '' : '' )}</td>
                                        <td className="px-1 py-2 text-center">
                                            {typeof onUpdateGameEvent === 'function' && goal.type === 'goal' && (
                                                isEditingThisGoal ? (
                                                    <div className="flex gap-1 justify-center">
                                                        <button onClick={handleSaveEditGoal} className="p-1 text-green-400 hover:text-green-300" title={t('common.save') ?? 'Save'}><FaSave /></button>
                                                        <button onClick={handleCancelEditGoal} className="p-1 text-red-400 hover:text-red-300" title={t('common.cancel') ?? 'Cancel'}><FaTimes /></button>
                                                    </div>
                                                ) : (
                                                    <button onClick={() => handleStartEditGoal(goal)} className="p-1 text-slate-400 hover:text-slate-200" title={t('common.edit') ?? 'Edit'}><FaEdit /></button>
                                                )
                                            )}
                                        </td>
                                    </tr>
                                ); }) ) : (
                                    <tr><td colSpan={5} className="text-center py-4 text-slate-400 italic">{t('gameStatsModal.noGoalsLogged', 'No goals logged.')}</td></tr>
                                )}
                            </tbody>
                        </table>
                        </div>
                        </div>

                {/* Game Notes Section */}
                <div className="lg:col-span-2 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-semibold text-slate-200">{t('gameStatsModal.notesTitle', 'Game Notes')}</h3>
                        <div className="flex items-center gap-2">
                            {isEditingNotes ? (
                                <>
                                    <button onClick={handleSaveNotes} className="p-1.5 text-green-400 hover:text-green-300 rounded bg-slate-700 hover:bg-slate-600" title={t('common.saveChanges') ?? 'Save'}><FaSave /></button>
                                    <button onClick={handleCancelEditNotes} className="p-1.5 text-red-400 hover:text-red-300 rounded bg-slate-700 hover:bg-slate-600" title={t('common.cancel') ?? 'Cancel'}><FaTimes /></button>
                                </>
                            ) : (
                                <button onClick={() => setIsEditingNotes(true)} disabled={!!inlineEditingField || isEditingInfo} className="p-1.5 text-slate-400 hover:text-slate-200 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed" title={t('common.edit') ?? 'Edit'}><FaEdit /></button>
                            )}
                        </div>
                    </div>
                    {isEditingNotes ? (
                        <textarea ref={notesTextareaRef} value={editGameNotes} onChange={(e) => setEditGameNotes(e.target.value)} className="w-full h-24 p-2 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder={t('gameStatsModal.notesPlaceholder', 'Notes...') ?? undefined} />
                    ) : (
                        <div className="min-h-[6rem] p-2 text-sm text-slate-300 whitespace-pre-wrap cursor-pointer hover:bg-slate-700/30 rounded border border-dashed border-transparent hover:border-slate-500" onClick={() => !isEditingInfo && !inlineEditingField && setIsEditingNotes(true)} title={!isEditingInfo && !inlineEditingField ? t('gameStatsModal.clickToEditNotes', 'Click to edit notes') ?? undefined : undefined}>
                            {gameNotes ? gameNotes : <span className="italic text-slate-400">{t('gameStatsModal.noNotes', 'No notes.')}</span>}
                        </div>
                    )}
        </div>
        </div>
        </div>

        {/* Modal Footer - Simplified */}
        <div className="p-4 border-t border-slate-700 flex-shrink-0 flex flex-wrap justify-center sm:justify-end items-center gap-3">
          {/* Export Current Game Buttons */}
            {onExportOneJson && currentGameId && (
              <button
                    onClick={() => onExportOneJson(currentGameId)}
                    className="px-3 py-1.5 bg-teal-700 text-white rounded-md shadow hover:bg-teal-600 transition duration-150 text-xs"
                    title={t('loadGameModal.exportJsonMenuItem', 'Export Current Game as JSON') ?? undefined}
                >
                    {t('gameStatsModal.exportCurrentJson', 'Export JSON')}
              </button>
            )}
            {onExportOneCsv && currentGameId && (
              <button
                    onClick={() => onExportOneCsv(currentGameId)}
                    className="px-3 py-1.5 bg-emerald-700 text-white rounded-md shadow hover:bg-emerald-600 transition duration-150 text-xs"
                    title={t('loadGameModal.exportExcelMenuItem', 'Export Current Game as CSV') ?? undefined}
                >
                    {t('gameStatsModal.exportCurrentCsv', 'Export CSV')}
              </button>
            )}
          {/* Close Button */}
          <button onClick={onClose} className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 transition duration-150 text-sm">
            {t('gameStatsModal.closeButton', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameStatsModal;
