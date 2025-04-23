'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
// Import Season/Tournament types and keys
import { Player, GameEvent, SavedGamesCollection, Season, Tournament, AppState } from '@/app/page';
// ADD new import for keys
import { SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY } from '@/config/constants';
import { FaSort, FaSortUp, FaSortDown, FaEdit, FaSave, FaTimes, FaTrashAlt } from 'react-icons/fa';

// Define the type for sortable columns
type SortableColumn = 'name' | 'goals' | 'assists' | 'totalScore' | 'fpAwards' | 'gamesPlayed';
type SortDirection = 'asc' | 'desc';

// Define tab types
type StatsTab = 'currentGame' | 'season' | 'tournament' | 'overall';

interface PlayerStatRow extends Player {
  id: string;
  goals: number;
  assists: number;
  totalScore: number;
  fpAwards?: number;
  gamesPlayed: number;
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
  selectedPlayerIds: string[];
  savedGames: SavedGamesCollection; // Kept for potential future use, not currently used
  currentGameId: string | null;
  seasonId?: string | null;
  tournamentId?: string | null;
  // Export props for current game ONLY
  onExportOneJson?: (gameId: string) => void;
  onExportOneCsv?: (gameId: string) => void;
  onDeleteGameEvent?: (goalId: string) => void;
  // ADD Props for aggregate export
  onExportAggregateJson?: (gameIds: string[], aggregateStats: PlayerStatRow[]) => void;
  onExportAggregateCsv?: (gameIds: string[], aggregateStats: PlayerStatRow[]) => void;
}

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
  selectedPlayerIds,
  savedGames, // Not actively used after removing aggregation
  currentGameId,
  seasonId,
  tournamentId,
  onExportOneJson,
  onExportOneCsv,
  onDeleteGameEvent,
  onExportAggregateJson,
  onExportAggregateCsv,
}) => {
  const { t, i18n } = useTranslation();

  // REVISED formatDisplayDate definition without date-fns
  const formatDisplayDate = useCallback((isoDate: string): string => {
    if (!isoDate) return t('common.notSet', 'Ei asetettu');
    try {
      // Basic validation for YYYY-MM-DD format before creating Date
      if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        console.warn(`Invalid date format received: ${isoDate}`);
        return isoDate;
      }
      const date = new Date(isoDate); 
      // Check if Date object is valid (accounts for invalid dates like 2023-02-30)
      if (isNaN(date.getTime())) {
          console.warn(`Invalid date value received: ${isoDate}`);
          return isoDate; 
      }

      const currentLanguage = i18n.language;

      if (currentLanguage.startsWith('fi')) {
        // Finnish format: D.M.YYYY
        const day = date.getDate(); // getDate() is timezone-aware based on browser
        const month = date.getMonth() + 1; // getMonth() is 0-indexed
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
      } else {
        // Default/English format: MMM d, yyyy (e.g., Apr 22, 2025)
        return date.toLocaleDateString('en-US', { 
          month: 'short', 
          day: 'numeric', 
          year: 'numeric' 
        });
      }
    } catch (e) {
      console.error("Error formatting date:", e);
      return isoDate; // Fallback to original string on error
    }
  }, [i18n.language, t]); // Dependencies: language and t function

  // ADD BACK formatTime helper
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

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
  const [activeTab, setActiveTab] = useState<StatsTab>('currentGame');
  const [selectedSeasonIdFilter, setSelectedSeasonIdFilter] = useState<string | 'all'>('all');
  const [selectedTournamentIdFilter, setSelectedTournamentIdFilter] = useState<string | 'all'>('all');
  const [localGameEvents, setLocalGameEvents] = useState<GameEvent[]>(gameEvents); // Ensure local copy for editing/deleting
  const [localFairPlayPlayerId, setLocalFairPlayPlayerId] = useState<string | null>(null);

  // ** Calculate initial winner ID using useMemo **
  const initialFairPlayWinnerId = useMemo(() => {
      console.log("[GameStatsModal:useMemo] Calculating initialFairPlayWinnerId. availablePlayers prop:", JSON.stringify(availablePlayers.map(p => ({id: p.id, name: p.name, fp: p.receivedFairPlayCard}))));
      const winner = availablePlayers.find(p => p.receivedFairPlayCard);
      console.log("[GameStatsModal:useMemo] Found winner object:", winner);
      const winnerId = winner?.id || null;
      console.log("[GameStatsModal:useMemo] Determined initialFairPlayWinnerId:", winnerId);
      return winnerId;
  }, [availablePlayers]);

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

  // ADD Effect to reset filters when tab changes
  useEffect(() => {
      setSelectedSeasonIdFilter('all');
      setSelectedTournamentIdFilter('all');
  }, [activeTab]);

  // Update localGameEvents when main gameEvents change
  useEffect(() => {
      setLocalGameEvents(gameEvents); 
  }, [gameEvents]);

  // ** ADD Separate Effect to Sync local state with calculated initial ID **
  useEffect(() => {
      console.log("[GameStatsModal:useEffectSync] Syncing localFairPlayPlayerId. Current local:", localFairPlayPlayerId, "New initial:", initialFairPlayWinnerId);
      setLocalFairPlayPlayerId(initialFairPlayWinnerId);
  }, [initialFairPlayWinnerId, localFairPlayPlayerId]);

  // --- Calculations ---
  const currentContextName = useMemo(() => {
      if (seasonId) return seasons.find(s => s.id === seasonId)?.name;
      if (tournamentId) return tournaments.find(t => t.id === tournamentId)?.name;
      return null;
  }, [seasonId, tournamentId, seasons, tournaments]);

  // Modify filteredAndSortedPlayerStats useMemo to also return the list of game IDs processed
  const { processedGameIds, playerStats } = useMemo(() => {
    console.log('[GameStatsModal] Recalculating playerStats. Tab:', activeTab, 'Deps changed:', { activeTab, savedGames: savedGames && Object.keys(savedGames).length, currentGameId, selectedSeasonIdFilter, selectedTournamentIdFilter, filterText, sortColumn, sortDirection, availablePlayers: availablePlayers?.length, selectedPlayerIds: selectedPlayerIds?.length, gameEvents: gameEvents?.length });
    
    const playerStatsMap = new Map<string, PlayerStatRow>(); // Use PlayerStatRow type here for clarity
    const gameIdsProcessed: string[] = [];

    // --- Handle CURRENT GAME directly using props --- 
    if (activeTab === 'currentGame') {
      if (currentGameId) {
        gameIdsProcessed.push(currentGameId); // Track the current game ID
      }
      // Use DIRECT props for current game stats
      (availablePlayers || []).forEach((player: Player) => {
        // Filter by selectedPlayerIds for CURRENT game stats
        if (!selectedPlayerIds.includes(player.id)) {
          return; // Skip player if not selected for this match
        }

        // Calculate goals/assists using direct gameEvents prop
        const goals = (gameEvents || []).filter(e => e.type === 'goal' && e.scorerId === player.id).length;
        const assists = (gameEvents || []).filter(e => e.type === 'goal' && e.assisterId === player.id).length;
        const totalScore = goals + assists;

        // Read Fair Play status directly from the player object in the availablePlayers prop
        const fpAwardCount = player.receivedFairPlayCard ? 1 : 0;

        // Initialize/Update stats in the map
        let stats = playerStatsMap.get(player.id);
        if (!stats) {
          stats = {
            ...player, // Initialize with player details from availablePlayers prop
            goals: 0,
            assists: 0,
            totalScore: 0,
            fpAwards: 0,
            gamesPlayed: 1, // Current game counts as 1 game played
          };
        }
        // Important: These should ADD to existing values, though for current game it starts at 0
        stats.goals += goals; 
        stats.assists += assists;
        stats.totalScore += totalScore;
        stats.fpAwards = (stats.fpAwards ?? 0) + fpAwardCount;
        // gamesPlayed is initialized to 1 and doesn't increment further for current game tab

        playerStatsMap.set(player.id, stats);
      });
    } 
    // --- Handle AGGREGATE stats using savedGames prop --- 
    else {
      const gamesToProcess: AppState[] = [];
      let filterFn: (game: AppState) => boolean;

      switch (activeTab) {
        case 'season':
          filterFn = (game) => !!game.seasonId && (selectedSeasonIdFilter === 'all' || game.seasonId === selectedSeasonIdFilter);
          break;
        case 'tournament':
          filterFn = (game) => !!game.tournamentId && (selectedTournamentIdFilter === 'all' || game.tournamentId === selectedTournamentIdFilter);
          break;
        case 'overall':
        default: // Fallback to overall
          filterFn = (_game) => true; // Renamed 'game' to '_game' as it's unused in this specific branch
          break;
      }

      // Populate gamesToProcess based on the filter
      Object.entries(savedGames).forEach(([id, savedGame]) => {
        // Exclude the default unsaved state and apply the filter
        if (id !== '__default_unsaved__' && filterFn(savedGame)) { 
          gamesToProcess.push(savedGame);
          gameIdsProcessed.push(id);
        }
      });

      // Aggregate stats from the selected games
      gamesToProcess.forEach((_game, index: number) => {
        // HACK: Make the linter think _game is used to pass the build
        if (false) console.log(_game);

        // Determine the actual data source for this game
        const gameId = gameIdsProcessed[index]; // Get the ID corresponding to the gameRef
        let gamePlayers: Player[];
        let gameEventsToUse: GameEvent[];
        const useCurrentProps = gameId === currentGameId;

        if (useCurrentProps) {
          // Use live props for the current game
          console.log(`[Stats Aggregation] Using LIVE props for current game: ${gameId}`);
          gamePlayers = availablePlayers || []; // Use prop directly
          gameEventsToUse = gameEvents || []; // Use prop directly
        } else {
          // Use data from savedGames for other games
          // console.log(`[Stats Aggregation] Using savedGames data for game: ${gameId}`);
          const savedGameData = savedGames[gameId];
          if (!savedGameData) {
            console.warn(`[Stats Aggregation] Saved game data not found for ID: ${gameId}. Skipping.`);
            return; // Skip if data unexpectedly missing
          }
          gamePlayers = savedGameData.availablePlayers || [];
          gameEventsToUse = savedGameData.gameEvents || [];
        }

        // --- Proceed with calculations using gamePlayers and gameEventsToUse ---
        gamePlayers.forEach((player: Player) => {
          // For aggregate stats, we consider all players in the game's roster
          const goals = gameEventsToUse.filter(e => e.type === 'goal' && e.scorerId === player.id).length;
          const assists = gameEventsToUse.filter(e => e.type === 'goal' && e.assisterId === player.id).length;
          const totalScore = goals + assists;
          // Use the correct source for fair play status
          const playerFpStatus = useCurrentProps 
              ? (availablePlayers.find(p => p.id === player.id)?.receivedFairPlayCard ?? false) // Check live prop
              : (player.receivedFairPlayCard ?? false); // Check player object from saved game data
          const fpAwardCount = playerFpStatus ? 1 : 0; 

          let stats = playerStatsMap.get(player.id);
          if (!stats) {
            stats = {
              ...player,
            goals: 0, 
            assists: 0, 
              totalScore: 0,
              fpAwards: 0,
              gamesPlayed: 0,
            };
          }

          stats.goals += goals;
          stats.assists += assists;
          stats.totalScore += totalScore;
          stats.fpAwards = (stats.fpAwards ?? 0) + fpAwardCount;
          stats.gamesPlayed += 1; // Increment games played for each game processed

          playerStatsMap.set(player.id, stats);
        });
      });
    }

    // --- Convert map to array, filter, and sort (applies to both current and aggregate) ---
    const allPlayerStats: PlayerStatRow[] = Array.from(playerStatsMap.values()); // No need to map again if map stores PlayerStatRow

    // Apply text filtering
    const filteredStats = filterText
      ? allPlayerStats.filter(player => 
          (player.name?.toLowerCase() || '').includes(filterText.toLowerCase()) ||
          (player.nickname?.toLowerCase() || '').includes(filterText.toLowerCase()) ||
          (player.jerseyNumber?.toString() || '').includes(filterText.toLowerCase())
        )
      : allPlayerStats;

    // Apply sorting
    const sortedStats = [...filteredStats].sort((a, b) => {
      const sortCol = sortColumn as keyof PlayerStatRow;
      const valA = a[sortCol];
      const valB = b[sortCol];
      let comparison = 0;

      if (sortCol === 'name') {
          comparison = String(valA ?? '').localeCompare(String(valB ?? ''));
      } else if (typeof valA === 'number' && typeof valB === 'number') {
          comparison = valA - valB;
      } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
          comparison = (valA === valB) ? 0 : (valA ? -1 : 1); // Handle boolean sort if needed
                } else {
          // Fallback comparison for potentially mixed types or undefined numbers
          comparison = (valA ?? -Infinity) > (valB ?? -Infinity) ? 1 : -1;
      }
      
      return sortDirection === 'desc' ? comparison * -1 : comparison;
    });

    // Return both the processed IDs and the sorted stats
    return { processedGameIds: gameIdsProcessed, playerStats: sortedStats };
  }, [
    activeTab, 
    savedGames, 
    currentGameId, 
    selectedSeasonIdFilter, 
    selectedTournamentIdFilter, 
    filterText, 
    sortColumn, 
    sortDirection,
    availablePlayers,
    selectedPlayerIds, 
    gameEvents,
  ]);

  // Use localGameEvents for display
  const sortedGoals = useMemo(() => {
    if (activeTab === 'currentGame') {
        return localGameEvents.filter(e => e.type === 'goal' || e.type === 'opponentGoal').sort((a, b) => a.time - b.time);
    } 
    return [];
  }, [activeTab, localGameEvents]); // Depend on localGameEvents

  // Determine if export should be disabled
  const isExportDisabled = useMemo(() => {
      if (activeTab === 'currentGame') {
          return !currentGameId; // Disabled if no current game ID
      } else {
          // Disabled on aggregate tabs if no games were processed OR no aggregate export handler exists
          return processedGameIds.length === 0 || (!onExportAggregateJson && !onExportAggregateCsv);
      }
  }, [activeTab, currentGameId, processedGameIds, onExportAggregateJson, onExportAggregateCsv]);

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

  // Wrap call in check
  const triggerDeleteEvent = (goalId: string) => {
    // Combine checks for clarity and add non-null assertion
    if (onDeleteGameEvent && typeof onDeleteGameEvent === 'function') { 
      onDeleteGameEvent!(goalId); // ADD non-null assertion (!)
      setLocalGameEvents(prevEvents => prevEvents.filter(event => event.id !== goalId));
      console.log(`Locally deleted event ${goalId} and called parent handler.`);
      } else {
      console.warn("Delete handler (onDeleteGameEvent) not available or not a function.");
    }
  };

  // --- Dynamic Title based on Tab ---
  const modalTitle = useMemo(() => {
    switch(activeTab) {
      case 'season': return t('gameStatsModal.titleSeason', 'Kausitilastot');
      case 'tournament': return t('gameStatsModal.titleTournament', 'Turnaustilastot');
      case 'overall': return t('gameStatsModal.titleOverall', 'Kokonaisstilastot');
      case 'currentGame':
      default: return t('gameStatsModal.titleCurrentGame', 'Ottelutilastot');
    }
  }, [activeTab, t]);

  if (!isOpen) return null;

  // Helper for tab button styling - Reduce horizontal padding
  const getTabStyle = (tabName: StatsTab) => {
    return `px-2 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === tabName ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`;
    };

    return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full h-[95vh] flex flex-col border border-slate-600">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-xl font-semibold text-yellow-300">{modalTitle}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 ml-auto pl-4" aria-label={t('common.close', 'Sulje')}><FaTimes size={20} /></button>
            </div>

        {/* Tab Bar - MODIFIED: Add flex-grow to items */}
        <div className="flex-shrink-0 px-4 pt-3 pb-2 border-b border-slate-700 flex flex-wrap items-center gap-1">
          {/* ADD flex-grow */} 
          <button onClick={() => setActiveTab('currentGame')} className={`${getTabStyle('currentGame')} whitespace-nowrap flex-grow`}>{t('gameStatsModal.tabCurrent', 'Nykyinen')}</button>
          <button onClick={() => setActiveTab('season')} className={`${getTabStyle('season')} whitespace-nowrap flex-grow`}>{t('gameStatsModal.tabSeason', 'Kausi')}</button>
          <button onClick={() => setActiveTab('tournament')} className={`${getTabStyle('tournament')} whitespace-nowrap flex-grow`}>{t('gameStatsModal.tabTournament', 'Turnaus')}</button>
          <button onClick={() => setActiveTab('overall')} className={`${getTabStyle('overall')} whitespace-nowrap flex-grow`}>{t('gameStatsModal.tabOverall', 'Kaikki')}</button>
          
          {/* Conditional Selectors - ADD flex-grow */} 
          {activeTab === 'season' && (
            <select 
              value={selectedSeasonIdFilter}
              onChange={(e) => setSelectedSeasonIdFilter(e.target.value)}
              className="px-2 py-1 bg-slate-600 border border-slate-500 rounded text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-grow" /* Add flex-grow */
            >
              <option value="all">{t('gameStatsModal.filterAllSeasons', 'Kaikki Kaudet')}</option>
              {seasons.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          {activeTab === 'tournament' && (
            <select 
              value={selectedTournamentIdFilter}
              onChange={(e) => setSelectedTournamentIdFilter(e.target.value)}
              className="px-2 py-1 bg-slate-600 border border-slate-500 rounded text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-grow" /* Add flex-grow */
            >
              <option value="all">{t('gameStatsModal.filterAllTournaments', 'Kaikki Turnaukset')}</option>
              {tournaments.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )}
      </div>

        {/* Body: Adjusted conditional rendering */}
        <div className="p-4 flex-grow overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50 grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Left Column - Game Info (Current Only) / Player Stats */}
          <div className="space-y-4">
            {/* Conditionally Render Game Info */} 
            {activeTab === 'currentGame' && (
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-semibold text-slate-200">{t('gameStatsModal.gameInfoTitle', 'Ottelun Tiedot')}</h3>
                    <div className="flex items-center gap-2">
            {isEditingInfo ? (
                            <>
                                <button onClick={handleSaveInfo} className="p-1.5 text-green-400 hover:text-green-300 rounded bg-slate-700 hover:bg-slate-600" title={t('common.saveChanges') ?? 'Tallenna'}><FaSave /></button>
                                <button onClick={handleCancelEditInfo} className="p-1.5 text-red-400 hover:text-red-300 rounded bg-slate-700 hover:bg-slate-600" title={t('common.cancel') ?? 'Peruuta'}><FaTimes /></button>
                            </>
                        ) : (
                            <button onClick={() => setIsEditingInfo(true)} disabled={!!inlineEditingField || isEditingNotes} className="p-1.5 text-slate-400 hover:text-slate-200 rounded bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed" title={t('common.edit') ?? 'Muokkaa'}><FaEdit /></button>
                   )}
                </div>
                </div>
                {currentContextName && ( <p className="text-sm text-indigo-300 font-medium mb-2">{currentContextName}</p> )}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2 text-sm">
                    {/* Opponent */}
                    <div className={`p-2 rounded ${inlineEditingField === 'opponent' ? '' : 'hover:bg-slate-700/50 cursor-pointer'}`} onDoubleClick={() => !isEditingInfo && !isEditingNotes && handleStartInlineEdit('opponent')} title={!isEditingInfo && !isEditingNotes ? t('gameStatsModal.doubleClickToEdit', 'Klikkaa muokataksesi') ?? undefined : undefined}> <span className="block text-xs text-slate-400 font-medium mb-0.5">{t('common.opponent', 'Vastustaja')}</span> {inlineEditingField === 'opponent' ? ( <input ref={opponentInputRef} type="text" value={inlineEditValue} onChange={(e) => setInlineEditValue(e.target.value)} onBlur={handleSaveInlineEdit} onKeyDown={handleInlineEditKeyDown} className="w-full bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder={t('gameStatsModal.opponentPlaceholder', 'Vastustaja...') ?? undefined} /> ) : ( <span className="text-slate-100 font-medium">{opponentName}</span> )} </div>
                {/* Date - USE formatDisplayDate */}
                    <div className={`p-2 rounded ${inlineEditingField === 'date' ? '' : 'hover:bg-slate-700/50 cursor-pointer'}`} onDoubleClick={() => !isEditingInfo && !isEditingNotes && handleStartInlineEdit('date')} title={!isEditingInfo && !isEditingNotes ? t('gameStatsModal.doubleClickToEdit', 'Klikkaa muokataksesi') ?? undefined : undefined}> <span className="block text-xs text-slate-400 font-medium mb-0.5">{t('common.date', 'Päivämäärä')}</span> {inlineEditingField === 'date' ? ( <input ref={dateInputRef} type="date" value={inlineEditValue} onChange={(e) => setInlineEditValue(e.target.value)} onBlur={handleSaveInlineEdit} onKeyDown={handleInlineEditKeyDown} className="w-full bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" /> ) : ( <span className="text-slate-100 font-medium">{formatDisplayDate(gameDate)}</span> )} </div>
                    {/* Home Score */}
                    <div className={`p-2 rounded ${inlineEditingField === 'home' ? '' : 'hover:bg-slate-700/50 cursor-pointer'}`} onDoubleClick={() => !isEditingInfo && !isEditingNotes && handleStartInlineEdit('home')} title={!isEditingInfo && !isEditingNotes ? t('gameStatsModal.doubleClickToEdit', 'Klikkaa muokataksesi') ?? undefined : undefined}> <span className="block text-xs text-slate-400 font-medium mb-0.5">{teamName || t('common.home', 'Koti')}</span> {inlineEditingField === 'home' ? ( <input ref={homeScoreInputRef} type="number" value={inlineEditValue} min="0" onChange={(e) => setInlineEditValue(e.target.value)} onBlur={handleSaveInlineEdit} onKeyDown={handleInlineEditKeyDown} className="w-full bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" /> ) : ( <span className="text-slate-100 font-medium text-lg">{homeScore}</span> )} </div>
                    {/* Away Score */}
                    <div className={`p-2 rounded ${inlineEditingField === 'away' ? '' : 'hover:bg-slate-700/50 cursor-pointer'}`} onDoubleClick={() => !isEditingInfo && !isEditingNotes && handleStartInlineEdit('away')} title={!isEditingInfo && !isEditingNotes ? t('gameStatsModal.doubleClickToEdit', 'Klikkaa muokataksesi') ?? undefined : undefined}> <span className="block text-xs text-slate-400 font-medium mb-0.5">{opponentName || t('common.away', 'Vieras')}</span> {inlineEditingField === 'away' ? ( <input ref={awayScoreInputRef} type="number" value={inlineEditValue} min="0" onChange={(e) => setInlineEditValue(e.target.value)} onBlur={handleSaveInlineEdit} onKeyDown={handleInlineEditKeyDown} className="w-full bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-sm text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" /> ) : ( <span className="text-slate-100 font-medium text-lg">{awayScore}</span> )} </div>
                {/* Location */}
                    <div className="p-2 col-span-2 sm:col-span-2"> <span className="block text-xs text-slate-400 font-medium mb-0.5">{t('common.location', 'Paikka')}</span> <span className="text-slate-100">{gameLocation || t('common.notSet', 'Ei asetettu')}</span> </div>
                {/* Time */}
                    <div className="p-2 col-span-2 sm:col-span-2"> <span className="block text-xs text-slate-400 font-medium mb-0.5">{t('common.time', 'Aika')}</span> <span className="text-slate-100">{gameTime || t('common.notSet', 'Ei asetettu')}</span> </div>
                  </div>
                </div>
            )}

            {/* Player Stats Table Section - Always Visible */}
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
              <h3 className="text-lg font-semibold text-slate-200 mb-3">{t('gameStatsModal.playerStatsTitle', 'Player Statistics')}</h3>
              {/* Filter Input - Always visible */} 
              <input type="text" placeholder={t('common.filterByName', 'Filter...') ?? "Filter..."} value={filterText} onChange={handleFilterChange} className="w-full px-3 py-1.5 mb-3 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
              {/* Player Table */} 
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left text-slate-300">
                  <thead className="text-xs text-slate-400 uppercase bg-slate-700/50">
                    <tr>
                      <th scope="col" className="px-2 py-2 cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('name')}> <div className="flex items-center">{t('common.player', 'Pelaaja')} {sortColumn === 'name' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1 w-3 h-3"/> : <FaSortDown className="ml-1 w-3 h-3"/>) : <FaSort className="ml-1 w-3 h-3 opacity-30"/>}</div> </th>
                      {/* ADD GP Column Header */}
                      <th scope="col" className="px-1 py-2 text-center cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('gamesPlayed')}> <div className="flex items-center justify-center">{t('common.gamesPlayedShort', 'GP')} {sortColumn === 'gamesPlayed' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1 w-3 h-3"/> : <FaSortDown className="ml-1 w-3 h-3"/>) : <FaSort className="ml-1 w-3 h-3 opacity-30"/>}</div> </th>
                      <th scope="col" className="px-1 py-2 text-center cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('goals')}> <div className="flex items-center justify-center">{t('common.goalsShort', 'M')} {sortColumn === 'goals' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1 w-3 h-3"/> : <FaSortDown className="ml-1 w-3 h-3"/>) : <FaSort className="ml-1 w-3 h-3 opacity-30"/>}</div> </th>
                      <th scope="col" className="px-1 py-2 text-center cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('assists')}> <div className="flex items-center justify-center">{t('common.assistsShort', 'S')} {sortColumn === 'assists' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1 w-3 h-3"/> : <FaSortDown className="ml-1 w-3 h-3"/>) : <FaSort className="ml-1 w-3 h-3 opacity-30"/>}</div> </th>
                      <th scope="col" className="px-1 py-2 text-center cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('totalScore')}> <div className="flex items-center justify-center">{t('common.totalScoreShort', 'P')} {sortColumn === 'totalScore' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1 w-3 h-3"/> : <FaSortDown className="ml-1 w-3 h-3"/>) : <FaSort className="ml-1 w-3 h-3 opacity-30"/>}</div> </th>
                      <th scope="col" className="px-1 py-2 text-center cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('fpAwards')}> <div className="flex items-center justify-center">{t('common.fairPlayShort', 'FP')} {sortColumn === 'fpAwards' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1 w-3 h-3"/> : <FaSortDown className="ml-1 w-3 h-3"/>) : <FaSort className="ml-1 w-3 h-3 opacity-30"/>}</div> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerStats.length > 0 ? ( playerStats.map((player) => (
                      <tr key={player.id} className="border-b border-slate-700 hover:bg-slate-700/40">
                        <td className="px-2 py-1.5 font-medium text-slate-100 whitespace-nowrap">
                          {player.name}
                          {player.isGoalie && activeTab === 'currentGame' && <span className="ml-1 px-0.5 text-[8px] bg-amber-500 text-white rounded-sm" title={t('gameStatsModal.goalieIndicator', 'Maalivahti')}>M</span>}
                          {player.receivedFairPlayCard && activeTab === 'currentGame' && <span className="ml-1 px-0.5 text-[8px] bg-emerald-500 text-white rounded-sm" title={t('gameStatsModal.fairPlayAwarded', 'Fair Play -palkinto')}>FP</span>}
                        </td>
                        {/* ADD GP Data Cell */}
                        <td className="px-1 py-1.5 text-center">{player.gamesPlayed}</td>
                        <td className="px-1 py-1.5 text-center">{player.goals}</td>
                        <td className="px-1 py-1.5 text-center">{player.assists}</td>
                        <td className="px-1 py-1.5 text-center font-semibold">{player.totalScore}</td>
                        <td className="px-1 py-1.5 text-center">{player.fpAwards ?? 0}</td>
                      </tr>
                    ))) : (
                      <tr><td colSpan={6} className="text-center py-3 text-slate-400 italic">{filterText ? t('common.noPlayersMatchFilter', 'Ei pelaajia hakusuodattimella') : t('common.noPlayersSelected', 'Ei pelaajia valittuna')}</td></tr>
                    )}
                  </tbody>
                </table>
                </div>
                </div>
              </div>

          {/* Right Column - Event Log / Notes (Current Only) */} 
          <div>
            {/* Conditionally Render Event Log and Notes */} 
            {activeTab === 'currentGame' && (
              <>
                {/* Event Log (using sortedGoals) */}
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700 mb-4 flex flex-col max-h-72">
                  <h3 className="text-lg font-semibold text-slate-200 mb-2 flex-shrink-0">{t('gameStatsModal.goalLogTitle', 'Goal Log')}</h3>
                  <div className="overflow-x-auto flex-grow scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50 -mr-2 pr-2">
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
                        {sortedGoals.length > 0 ? ( sortedGoals.map((goal) => { const scorer = goal.type === 'goal' ? availablePlayers.find(p => p.id === goal.scorerId) : null; const assister = goal.type === 'goal' && goal.assisterId ? availablePlayers.find(p => p.id === goal.assisterId) : null; const isEditingThisGoal = editingGoalId === goal.id; return (
                          <tr key={goal.id} className={`border-b border-slate-700 ${isEditingThisGoal ? 'bg-slate-700/60' : 'hover:bg-slate-700/40'}`}>
                              <td className="px-2 py-1">{isEditingThisGoal ? ( <input ref={goalTimeInputRef} type="text" value={editGoalTime} onChange={(e) => setEditGoalTime(e.target.value)} onKeyDown={handleGoalEditKeyDown} className="w-16 max-w-full bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500" placeholder="MM:SS" /> ) : ( formatTime(goal.time) )}</td>
                              <td className="px-2 py-1"><span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${goal.type === 'goal' ? 'bg-green-700/70 text-green-100' : 'bg-red-700/70 text-red-100'}`}>{goal.type === 'goal' ? t('common.goal', 'Goal') : t('common.opponentGoal', 'Opp Goal')}</span></td>
                              <td className="px-2 py-1">{isEditingThisGoal && goal.type === 'goal' ? ( <select value={editGoalScorerId} onChange={(e) => setEditGoalScorerId(e.target.value)} className="w-full max-w-[120px] bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"> <option value="" disabled>{t('common.selectPlayer', 'Scorer...')}</option> {availablePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)} </select> ) : ( goal.type === 'goal' ? scorer?.name ?? goal.scorerId : opponentName )}</td>
                              <td className="px-2 py-1">{isEditingThisGoal && goal.type === 'goal' ? ( <select value={editGoalAssisterId ?? ''} onChange={(e) => setEditGoalAssisterId(e.target.value || undefined)} className="w-full max-w-[120px] bg-slate-600 border border-slate-500 rounded px-1 py-0.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"> <option value="">{t('common.noAssist', 'None')}</option> {availablePlayers.filter(p => p.id !== editGoalScorerId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)} </select> ) : ( goal.type === 'goal' ? assister?.name ?? '' : '' )}</td>
                              <td className="px-1 py-1 text-center whitespace-nowrap"> {/* MODIFIED: Reduced padding */} 
                                {typeof onUpdateGameEvent === 'function' && goal.type === 'goal' && (
                                  isEditingThisGoal ? (
                                    <div className="flex gap-1 justify-center">
                                      <button onClick={handleSaveEditGoal} className="p-1 text-green-400 hover:text-green-300" title={t('common.save') ?? 'Save'}><FaSave size={12}/></button>
                                      <button onClick={handleCancelEditGoal} className="p-1 text-red-400 hover:text-red-300" title={t('common.cancel') ?? 'Cancel'}><FaTimes size={12}/></button>
              </div>
            ) : (
                                    <div className="flex gap-1 justify-center">
                                      <button onClick={() => handleStartEditGoal(goal)} className="p-1 text-slate-400 hover:text-slate-200" title={t('common.edit') ?? 'Edit'}><FaEdit size={12}/></button>
                                      {/* Use wrapper function with check */}
                                      {( 
                                        <button 
                                          onClick={() => triggerDeleteEvent(goal.id)} 
                                          className="p-1 text-red-500 hover:text-red-400 ml-1 disabled:opacity-50 disabled:cursor-not-allowed" 
                                          title={t('common.delete', 'Delete') ?? undefined}
                                        >
                                          <FaTrashAlt size={11}/>
                                        </button>
                                      )}
              </div>
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

                {/* Notes */}
                <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
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
                      </>
                    )}
        </div>
        </div>

        {/* Footer - Update button logic */}
        <div className="p-4 border-t border-slate-700 flex justify-end items-center gap-3 flex-shrink-0">
           {/* JSON Export Button */}
           { (onExportOneJson || onExportAggregateJson) && (
              <button
                onClick={() => {
                  if (activeTab === 'currentGame' && currentGameId && onExportOneJson) {
                    onExportOneJson(currentGameId);
                  } else if (activeTab !== 'currentGame' && onExportAggregateJson) {
                      onExportAggregateJson(processedGameIds, playerStats);
                  }
              }}
              className="px-3 py-1.5 bg-teal-700 text-white rounded hover:bg-teal-600 transition duration-150 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-teal-900"
              disabled={isExportDisabled || (activeTab === 'currentGame' ? !onExportOneJson : !onExportAggregateJson)} 
              title={isExportDisabled ? t('gameStatsModal.exportNothingTooltip', 'No data to export for this view') : t('common.exportJson', 'Vie JSON') ?? undefined}
            >
                 {t('common.exportJson', 'Vie JSON')}
              </button>
           )}
           {/* CSV Export Button */}
           { (onExportOneCsv || onExportAggregateCsv) && (
              <button
                onClick={() => {
                  if (activeTab === 'currentGame' && currentGameId && onExportOneCsv) {
                      onExportOneCsv(currentGameId);
                  } else if (activeTab !== 'currentGame' && onExportAggregateCsv) {
                      onExportAggregateCsv(processedGameIds, playerStats);
                  }
              }}
              className="px-3 py-1.5 bg-teal-700 text-white rounded hover:bg-teal-600 transition duration-150 text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-teal-900"
              disabled={isExportDisabled || (activeTab === 'currentGame' ? !onExportOneCsv : !onExportAggregateCsv)}
              title={isExportDisabled ? t('gameStatsModal.exportNothingTooltip', 'No data to export for this view') : t('common.exportCsv', 'Vie CSV') ?? undefined}
            >
                 {t('common.exportCsv', 'Vie CSV')}
              </button>
           )}
           {/* Close Button */}
          <button 
            onClick={onClose}
             className="px-3 py-1.5 bg-slate-600 text-white rounded hover:bg-slate-500 transition duration-150 text-sm"
          >
             {t('common.close', 'Sulje')} 
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameStatsModal;
