'use client';

import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
// Import types from the types directory
import { Player, PlayerStatRow, Season, Tournament } from '@/types';
import { GameEvent, SavedGamesCollection } from '@/app/page';
// ADD new import for keys
// import { SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY } from '@/config/constants';
// <<< REMOVE unused key imports
// import { SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY } from '@/config/constants';
// <<< ADD imports for utility functions >>>
import { getSeasons as utilGetSeasons } from '@/utils/seasons';
import { getTournaments as utilGetTournaments } from '@/utils/tournaments';
import { FaSort, FaSortUp, FaSortDown, FaEdit, FaSave, FaTimes, FaTrashAlt } from 'react-icons/fa';
import PlayerStatsView from './PlayerStatsView';

// Define the type for sortable columns
type SortableColumn = 'name' | 'goals' | 'assists' | 'totalScore' | 'fpAwards' | 'gamesPlayed' | 'avgPoints';
type SortDirection = 'asc' | 'desc';

// Define tab types
type StatsTab = 'currentGame' | 'season' | 'tournament' | 'overall' | 'player';

// ADD Minimal interface for saved game structure used in this component
interface SavedGame {
  availablePlayers?: Player[];
  selectedPlayerIds?: string[];
  seasonId?: string | null;
  tournamentId?: string | null;
  gameEvents?: GameEvent[];
  // Note: Add other properties from AppState if they are accessed via 'game' variable below
}

interface GameStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  opponentName: string;
  gameDate: string;
  homeScore: number;
  awayScore: number;
  homeOrAway: 'home' | 'away';
  gameLocation?: string;
  gameTime?: string;
  numPeriods?: number;
  periodDurationMinutes?: number;
  availablePlayers: Player[];
  gameEvents: GameEvent[];
  gameNotes?: string;
  onGameNotesChange?: (notes: string) => void;
  onUpdateGameEvent?: (updatedEvent: GameEvent) => void;
  selectedPlayerIds: string[];
  savedGames: SavedGamesCollection; // Kept for potential future use, not currently used
  currentGameId: string | null;
  onExportOneJson?: (gameId: string) => void;
  onExportOneCsv?: (gameId: string) => void;
  onDeleteGameEvent?: (goalId: string) => void;
  onExportAggregateJson?: (gameIds: string[], aggregateStats: PlayerStatRow[]) => void;
  onExportAggregateCsv?: (gameIds: string[], aggregateStats: PlayerStatRow[]) => void;
  initialSelectedPlayerId?: string | null;
  onGameClick?: (gameId: string) => void;
}

const GameStatsModal: React.FC<GameStatsModalProps> = ({
  isOpen,
  onClose,
  teamName,
  opponentName,
  gameDate,
  homeScore,
  awayScore,
  homeOrAway,
  gameLocation,
  gameTime,
  numPeriods,
  periodDurationMinutes,
  availablePlayers,
  gameEvents,
  gameNotes = '',
  onGameNotesChange = () => {},
  onUpdateGameEvent = () => { /* console.warn('onUpdateGameEvent handler not provided'); */ },
  selectedPlayerIds,
  savedGames, // Not actively used after removing aggregation
  currentGameId,
  onExportOneJson,
  onExportOneCsv,
  onDeleteGameEvent,
  onExportAggregateJson,
  onExportAggregateCsv,
  initialSelectedPlayerId = null,
  onGameClick = () => {},
}) => {
  const { t, i18n } = useTranslation();

  // <<< ADD DIAGNOSTIC LOG >>>
  // console.log('[GameStatsModal Render] gameEvents prop:', JSON.stringify(gameEvents));
  // console.log('[GameStatsModal Render] availablePlayers prop ref check:', availablePlayers); // Log reference too

  // REVISED formatDisplayDate definition without date-fns
  const formatDisplayDate = useCallback((isoDate: string): string => {
    if (!isoDate) return t('common.notSet', 'Ei asetettu');
    try {
      if (isoDate.length !== 10) { // Basic check for YYYY-MM-DD format
        // console.warn(`Invalid date format received: ${isoDate}`);
        return isoDate;
      }
      const date = new Date(isoDate); 
      if (isNaN(date.getTime())) {
        // console.warn(`Invalid date value received: ${isoDate}`);
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
    } catch {
      // console.error("Error formatting date:", e);
      return 'Date Error';
    }
  }, [i18n.language, t]); // Dependencies: language and t function

  // ADD BACK formatTime helper
  const formatTime = (timeInSeconds: number): string => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = timeInSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // --- State ---
  const [editGameNotes, setEditGameNotes] = useState(gameNotes);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [inlineEditingField, setInlineEditingField] = useState<'opponent' | 'date' | 'home' | 'away' | null>(null);
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
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // ** Calculate initial winner ID using useMemo **
  const initialFairPlayWinnerId = useMemo(() => {
      // console.log("[GameStatsModal:useMemo] Calculating initialFairPlayWinnerId. availablePlayers prop:", JSON.stringify(availablePlayers.map(p => ({id: p.id, name: p.name, fp: p.receivedFairPlayCard}))));
      const winner = availablePlayers.find(p => p.receivedFairPlayCard);
      // console.log("[GameStatsModal:useMemo] Found winner object:", winner);
      const winnerId = winner?.id || null;
      // console.log("[GameStatsModal:useMemo] Determined initialFairPlayWinnerId:", winnerId);
      return winnerId;
  }, [availablePlayers]);

  // --- Effects ---
  // Load seasons/tournaments
  useEffect(() => {
    const loadData = async () => { 
    if (isOpen) {
      try {
          const loadedSeasons = await utilGetSeasons(); 
        setSeasons(loadedSeasons);
        } catch (error) { 
          console.error("Failed to load seasons:", error); setSeasons([]); 
        }
      try {
          const loadedTournaments = await utilGetTournaments(); // Await the async call
        setTournaments(loadedTournaments);
        } catch (error) { 
          console.error("Failed to load tournaments:", error); setTournaments([]); 
    }
      }
    };
    loadData(); 
  }, [isOpen]);

  // Reset edit state
  useEffect(() => {
      if (isOpen) {
          setEditGameNotes(gameNotes);
          setIsEditingNotes(false);
          setInlineEditingField(null);
      } else {
          setIsEditingNotes(false);
          setInlineEditingField(null);
      }
  }, [isOpen, gameNotes]);

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
      // console.log("[GameStatsModal:useEffectSync] Syncing localFairPlayPlayerId. Current local:", localFairPlayPlayerId, "New initial:", initialFairPlayWinnerId);
      setLocalFairPlayPlayerId(initialFairPlayWinnerId);
  }, [initialFairPlayWinnerId, localFairPlayPlayerId]);

  // Effect to handle initial player selection
  useEffect(() => {
    if (isOpen && initialSelectedPlayerId) {
      const playerToSelect = availablePlayers.find(p => p.id === initialSelectedPlayerId);
      if (playerToSelect) {
        // First, set the player
        setSelectedPlayer(playerToSelect);
        // Then, switch to the player tab
        setActiveTab('player');
      }
    } else if (isOpen) {
      // If modal opens without a specific player, ensure we are on the default tab
      // and no player is selected from a previous session.
      setActiveTab('currentGame');
      setSelectedPlayer(null);
    }
  }, [isOpen, initialSelectedPlayerId, availablePlayers]);

  // --- Calculations ---
  // This is no longer used in the new UI, can be removed.
  // const currentContextName = useMemo(() => {
  //     if (seasonId) return seasons.find(s => s.id === seasonId)?.name;
  //     if (tournamentId) return tournaments.find(t => t.id === tournamentId)?.name;
  //     return null;
  // }, [seasonId, tournamentId, seasons, tournaments]);

  // Modify filteredAndSortedPlayerStats useMemo to also return the list of game IDs processed
  const { stats: playerStats, gameIds: processedGameIds } = useMemo(() => {
    // console.log("Recalculating player stats...", { activeTab, filterText, selectedSeasonIdFilter, selectedTournamentIdFilter, gameEvents: activeTab === 'currentGame' ? gameEvents : null, savedGames: activeTab !== 'currentGame' ? savedGames : null });

    // Initialize stats map - MODIFIED: Initialize differently based on tab
    const statsMap: { [key: string]: PlayerStatRow } = {};
    let relevantGameEvents: GameEvent[] = [];
    let processedGameIds: string[] = []; // Keep track of games considered for GP calc

    if (activeTab === 'currentGame') {
      // Current game: Initialize from availablePlayers prop
      availablePlayers.forEach(player => {
          statsMap[player.id] = {
              ...player,
              goals: 0,
              assists: 0,
              totalScore: 0,
              gamesPlayed: 0,
              avgPoints: 0,
          };
      });

      relevantGameEvents = localGameEvents || []; // MODIFIED: Use localGameEvents
      if (currentGameId) {
        processedGameIds = [currentGameId]; // Current game is the only one processed
         // Update GP for players in the current game
        selectedPlayerIds?.forEach(playerId => {
          if (statsMap[playerId]) {
            statsMap[playerId].gamesPlayed = 1;
          }
        });
      }
    } else {
      // Handle 'season', 'tournament', 'overall' tabs
      const allGameIds = Object.keys(savedGames || {});
      
      // Filter game IDs based on tab and selected filter
      processedGameIds = allGameIds.filter(gameId => {
        const game: SavedGame | undefined = savedGames?.[gameId];
        if (!game) return false;

        if (activeTab === 'season') {
          // Stricter Check: If 'all', include only if it has a seasonId AND NOT a tournamentId.
          return selectedSeasonIdFilter === 'all'
            ? game.seasonId != null && (game.tournamentId == null || game.tournamentId === '')
            : game.seasonId === selectedSeasonIdFilter;
        } else if (activeTab === 'tournament') {
          // Stricter Check: If 'all', include only if it has a tournamentId AND NOT a seasonId.
          return selectedTournamentIdFilter === 'all'
            ? game.tournamentId != null && (game.seasonId == null || game.seasonId === '')
            : game.tournamentId === selectedTournamentIdFilter;
        } else if (activeTab === 'overall') {
          // Overall still includes everything
          return true;
        }
        return false; // Default case, should not happen
      });

      // Aggregate views: Build statsMap from players across ALL relevant games first
      processedGameIds.forEach(gameId => {
          const game: SavedGame | undefined = savedGames?.[gameId];
          game?.availablePlayers?.forEach((playerInGame: Player) => {
              if (!statsMap[playerInGame.id]) {
                  // Add player to map if not already present
                  statsMap[playerInGame.id] = {
                      ...playerInGame, // Use data from the saved game player object
                      goals: 0,
                      assists: 0,
                      totalScore: 0,
                      gamesPlayed: 0,
                      avgPoints: 0,
                  };
              }
          });
      });

      // Collect events from the filtered games
      relevantGameEvents = processedGameIds.flatMap(id => (savedGames?.[id] as SavedGame)?.gameEvents || []); // USE TYPE ASSERTION

      // Calculate Games Played and FP Awards for aggregate views
      processedGameIds.forEach(gameId => {
        const game: SavedGame | undefined = savedGames?.[gameId];
        if (game) {
            // Existing GP calculation
            game.selectedPlayerIds?.forEach(playerId => {
              if (statsMap[playerId]) {
                // Increment gamesPlayed only if the player exists in the main availablePlayers list
                statsMap[playerId].gamesPlayed = (statsMap[playerId].gamesPlayed || 0) + 1;
              }
            });
        }
      });
    }

    // Process relevant events
    relevantGameEvents.forEach(event => {
      if (event.type === 'goal') {
        if (event.scorerId && statsMap[event.scorerId]) {
          statsMap[event.scorerId].goals = (statsMap[event.scorerId].goals || 0) + 1;
          statsMap[event.scorerId].totalScore = (statsMap[event.scorerId].totalScore || 0) + 1;
        } else if (event.scorerId) {
        }
        if (event.assisterId && statsMap[event.assisterId]) {
          statsMap[event.assisterId].assists = (statsMap[event.assisterId].assists || 0) + 1;
          statsMap[event.assisterId].totalScore = (statsMap[event.assisterId].totalScore || 0) + 1;
        } else if (event.assisterId) {
        }
      }
      // Add calculations for other stats if needed
    });

    // Calculate average points for all players before filtering and sorting
    Object.values(statsMap).forEach(player => {
      player.avgPoints = player.gamesPlayed > 0 ? player.totalScore / player.gamesPlayed : 0;
    });

    // Filter and sort
    const filteredAndSortedStats = Object.values(statsMap)
      .filter(player => player.name.toLowerCase().includes(filterText.toLowerCase()));

    // Apply sorting
    if (sortColumn) {
      filteredAndSortedStats.sort((a, b) => {
        // Primary sort: by gamesPlayed (players with GP > 0 come before players with GP === 0)
        if (a.gamesPlayed > 0 && b.gamesPlayed === 0) {
          return -1; // a comes first
        }
        if (a.gamesPlayed === 0 && b.gamesPlayed > 0) {
          return 1;  // b comes first
        }

        // Secondary sort: by the selected sortColumn if GP is the same (e.g., both > 0 or both === 0)
        let aValue: string | number = '';
        let bValue: string | number = '';

        switch (sortColumn) {
            case 'name':
                aValue = a.name.toLowerCase();
                bValue = b.name.toLowerCase();
                break;
            case 'goals':
                aValue = a.goals;
                bValue = b.goals;
                break;
            case 'assists':
                aValue = a.assists;
                bValue = b.assists;
                break;
            case 'totalScore':
                aValue = a.totalScore;
                bValue = b.totalScore;
                break;
            case 'fpAwards':
                aValue = a.fpAwards ?? 0;
                bValue = b.fpAwards ?? 0;
                break;
             case 'gamesPlayed': // If primary sort is by GP itself (e.g., user clicks GP header)
                 // The primary GP sort above already handled the main separation.
                 // This will sort within the GP > 0 group and GP === 0 group respectively.
                 aValue = a.gamesPlayed;
                 bValue = b.gamesPlayed;
                 break;
            case 'avgPoints':
                aValue = a.avgPoints;
                bValue = b.avgPoints;
                break;
        }

        // Apply direction for secondary sort key
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }
        return 0;
      });
    }

    // Return both stats and the processed game IDs
    return { stats: filteredAndSortedStats, gameIds: processedGameIds };

  }, [
    activeTab,
    localGameEvents,
    savedGames,
    availablePlayers,
    sortColumn,
    sortDirection,
    filterText,
    selectedSeasonIdFilter,
    selectedTournamentIdFilter,
    currentGameId,
    selectedPlayerIds
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

  // Determine display names based on home/away
  const displayHomeTeamName = homeOrAway === 'home' ? teamName : opponentName;
  const displayAwayTeamName = homeOrAway === 'home' ? opponentName : teamName;

  // --- Handlers ---
  const handleSaveNotes = () => { if (gameNotes !== editGameNotes) onGameNotesChange(editGameNotes); setIsEditingNotes(false); };
  const handleCancelEditNotes = () => { setEditGameNotes(gameNotes); setIsEditingNotes(false); };
  
  const handleSort = (column: SortableColumn) => { if (sortColumn === column) setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc')); else { setSortColumn(column); setSortDirection(column === 'name' ? 'asc' : 'desc'); } };
  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => { setFilterText(event.target.value); };
  const handlePlayerRowClick = (player: Player) => {
    setSelectedPlayer(player);
    setActiveTab('player');
  };
  const handleStartEditGoal = (goal: GameEvent) => {
    setEditingGoalId(goal.id);
    setEditGoalTime(formatTime(goal.time));
    setEditGoalScorerId(goal.scorerId ?? '');
    setEditGoalAssisterId(goal.assisterId ?? '');
    setIsEditingNotes(false);
    setInlineEditingField(null);
  };
  const handleCancelEditGoal = () => { setEditingGoalId(null); };
  const handleSaveEditGoal = () => {
    if (!editingGoalId) return;
    const originalGoal = gameEvents.find(e => e.id === editingGoalId); if (!originalGoal) { handleCancelEditGoal(); return; }
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
    // Add confirmation dialog before deleting
    if (window.confirm(t('gameStatsModal.confirmDeleteEvent', 'Are you sure you want to delete this event? This cannot be undone.'))) {
      // Combine checks for clarity and add non-null assertion
      if (onDeleteGameEvent && typeof onDeleteGameEvent === 'function') { 
        onDeleteGameEvent!(goalId); // ADD non-null assertion (!)
        setLocalGameEvents(prevEvents => prevEvents.filter(event => event.id !== goalId));
        // console.log(`Locally deleted event ${goalId} and called parent handler.`);
        } else {
        // console.warn("Delete handler (onDeleteGameEvent) not available or not a function.");
      }
    }
  };

  // --- Dynamic Title based on Tab ---
  const modalTitle = useMemo(() => {
    switch(activeTab) {
      case 'season': return t('gameStatsModal.titleSeason', 'Kausitilastot');
      case 'tournament': return t('gameStatsModal.titleTournament', 'Turnaustilastot');
      case 'overall': return t('gameStatsModal.titleOverall', 'Kokonaisstilastot');
      case 'player': return selectedPlayer?.name ? `${selectedPlayer.name} - ${t('playerStats.title', 'Player Stats')}` : t('playerStats.title', 'Player Stats');
      case 'currentGame':
      default: return t('gameStatsModal.titleCurrentGame', 'Ottelutilastot');
    }
  }, [activeTab, t, selectedPlayer]);

  if (!isOpen) return null;

  // Helper for tab button styling - Reduce horizontal padding
  const getTabStyle = (tabName: StatsTab) => {
    return `px-2 py-1.5 text-sm font-medium rounded-md transition-colors ${activeTab === tabName ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`;
    };

    const getPlayerTabStyle = () => {
        const baseStyle = 'px-2 py-1.5 text-sm font-medium rounded-md transition-colors flex-1';
        // Player tab is always enabled now
        return `${baseStyle} ${activeTab === 'player' ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`;
    };

    return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] font-display">
      <div className="bg-slate-800 flex flex-col h-full w-full bg-noise-texture relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light pointer-events-none" />
        <div className="absolute top-0 -left-1/4 w-1/2 h-1/2 bg-sky-400/10 blur-3xl opacity-50 rounded-full pointer-events-none" />
        <div className="absolute bottom-0 -right-1/4 w-1/2 h-1/2 bg-indigo-600/10 blur-3xl opacity-50 rounded-full pointer-events-none" />

        {/* Header Section */}
        <div className="flex justify-center items-center pt-10 pb-4 px-6 backdrop-blur-sm bg-slate-900/20 border-b border-slate-700/20 flex-shrink-0">
          <h2 className="text-3xl font-bold text-yellow-400 tracking-wide drop-shadow-lg">
            {modalTitle}
          </h2>
        </div>

        {/* Controls Section */}
        <div className="px-6 py-4 backdrop-blur-sm bg-slate-900/20 border-b border-slate-700/20 flex-shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Tabs & Filters */}
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="flex w-full gap-2">
                <button onClick={() => setActiveTab('currentGame')} className={`${getTabStyle('currentGame')} flex-1`} aria-pressed={activeTab === 'currentGame'}>{t('gameStatsModal.tabs.currentGame')}</button>
                <button onClick={() => setActiveTab('season')} className={`${getTabStyle('season')} flex-1`} aria-pressed={activeTab === 'season'}>{t('gameStatsModal.tabs.season')}</button>
                <button onClick={() => setActiveTab('tournament')} className={`${getTabStyle('tournament')} flex-1`} aria-pressed={activeTab === 'tournament'}>{t('gameStatsModal.tabs.tournament')}</button>
                <button onClick={() => setActiveTab('overall')} className={`${getTabStyle('overall')} flex-1`} aria-pressed={activeTab === 'overall'}>{t('gameStatsModal.tabs.overall')}</button>
                <button onClick={() => setActiveTab('player')} className={getPlayerTabStyle()} aria-pressed={activeTab === 'player'}>
                  {t('gameStatsModal.tabs.player', 'Player')}
                </button>
              </div>

              {activeTab === 'season' && (
                <select value={selectedSeasonIdFilter} onChange={(e) => setSelectedSeasonIdFilter(e.target.value)} className="w-full mt-2 bg-slate-700 border border-slate-600 rounded-md text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="all">{t('gameStatsModal.filterAllSeasons')}</option>
                  {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
              {activeTab === 'tournament' && (
                <select value={selectedTournamentIdFilter} onChange={(e) => setSelectedTournamentIdFilter(e.target.value)} className="w-full mt-2 bg-slate-700 border border-slate-600 rounded-md text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500">
                  <option value="all">{t('gameStatsModal.filterAllTournaments')}</option>
                  {tournaments.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {activeTab === 'player' ? (
             <div className="p-4 sm:p-6">
                {/* Player Selection Dropdown */}
                <div className="mb-4">
                  <label htmlFor="player-select" className="block text-sm font-medium text-slate-300 mb-1">{t('playerStats.selectPlayerLabel', 'Select Player')}</label>
                  <select
                    id="player-select"
                    value={selectedPlayer?.id || ''}
                    onChange={(e) => {
                      const newSelectedPlayer = availablePlayers.find(p => p.id === e.target.value) || null;
                      setSelectedPlayer(newSelectedPlayer);
                    }}
                    className="w-full bg-slate-700 border border-slate-600 rounded-md text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="" disabled>{t('playerStats.selectPlayer', 'Select a player to view their stats.')}</option>
                    {availablePlayers.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <PlayerStatsView player={selectedPlayer} savedGames={savedGames} onGameClick={onGameClick} />
            </div>
          ) : (
            <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column */}
              <div className="space-y-6">
                {activeTab === 'currentGame' && (
                  <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
                    <h3 className="text-xl font-semibold text-slate-200 mb-4">{t('gameStatsModal.gameInfoTitle', 'Game Information')}</h3>
                    <div className="space-y-3">
                      <div className="bg-slate-800/40 p-3 rounded-md border border-slate-700/50">
                        <div className="flex justify-center items-center text-center">
                          <span className="font-semibold text-slate-100 flex-1 text-right">{displayHomeTeamName}</span>
                          <span className="text-2xl text-yellow-400 font-bold mx-4">{homeScore} - {awayScore}</span>
                          <span className="font-semibold text-slate-100 flex-1 text-left">{displayAwayTeamName}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-2 gap-3 text-sm">
                        <div className="bg-slate-800/40 p-2 rounded-md">
                          <label className="block text-xs text-slate-400">{t('common.date')}</label>
                          <span className="font-medium text-slate-200">{formatDisplayDate(gameDate)}</span>
                        </div>
                        <div className="bg-slate-800/40 p-2 rounded-md">
                          <label className="block text-xs text-slate-400">{t('common.time')}</label>
                          <span className="font-medium text-slate-200">{gameTime || t('common.notSet')}</span>
                        </div>
                        <div className="bg-slate-800/40 p-2 rounded-md">
                          <label className="block text-xs text-slate-400">{t('common.location')}</label>
                          <span className="font-medium text-slate-200">{gameLocation || t('common.notSet')}</span>
                        </div>
                        <div className="bg-slate-800/40 p-2 rounded-md">
                          <label className="block text-xs text-slate-400">{t('newGameSetupModal.periodsLabel')}</label>
                          <span className="font-medium text-slate-200">{numPeriods} x {periodDurationMinutes} min</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
                  <h3 className="text-xl font-semibold text-slate-200 mb-4">{t('gameStatsModal.playerStatsTitle', 'Player Statistics')}</h3>
                  {/* Search Input */}
                  <div className="relative mb-4">
                    <input
                      type="text"
                      value={filterText}
                      onChange={handleFilterChange}
                      placeholder={t('common.filterByName', 'Filter by name...')}
                      className="bg-slate-800 border border-slate-700 rounded-md text-white pl-8 pr-3 py-1.5 text-sm w-full focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-slate-300">
                        <tr className="border-b border-slate-700">
                          <th className="px-2 py-2 text-left cursor-pointer hover:bg-slate-800/60" onClick={() => handleSort('name')}>
                            <div className="flex items-center">{t('common.player', 'Pelaaja')} {sortColumn === 'name' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1 w-4 h-4"/> : <FaSortDown className="ml-1 w-4 h-4"/>) : <FaSort className="ml-1 w-4 h-4 opacity-30"/>}</div>
                          </th>
                          <th className="px-1 py-2 text-center cursor-pointer hover:bg-slate-800/60" onClick={() => handleSort('gamesPlayed')}>
                             <div className="flex items-center justify-center">{t('common.gamesPlayedShort', 'GP')} {sortColumn === 'gamesPlayed' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1 w-4 h-4"/> : <FaSortDown className="ml-1 w-4 h-4"/>) : <FaSort className="ml-1 w-4 h-4 opacity-30"/>}</div>
                          </th>
                          <th className="px-1 py-2 text-center cursor-pointer hover:bg-slate-800/60" onClick={() => handleSort('goals')}>
                             <div className="flex items-center justify-center">{t('common.goalsShort', 'M')} {sortColumn === 'goals' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1 w-4 h-4"/> : <FaSortDown className="ml-1 w-4 h-4"/>) : <FaSort className="ml-1 w-4 h-4 opacity-30"/>}</div>
                          </th>
                          <th className="px-1 py-2 text-center cursor-pointer hover:bg-slate-800/60" onClick={() => handleSort('assists')}>
                             <div className="flex items-center justify-center">{t('common.assistsShort', 'S')} {sortColumn === 'assists' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1 w-4 h-4"/> : <FaSortDown className="ml-1 w-4 h-4"/>) : <FaSort className="ml-1 w-4 h-4 opacity-30"/>}</div>
                          </th>
                          <th className="px-1 py-2 text-center cursor-pointer hover:bg-slate-800/60" onClick={() => handleSort('totalScore')}>
                             <div className="flex items-center justify-center">{t('common.totalScoreShort', 'Pts')} {sortColumn === 'totalScore' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1 w-4 h-4"/> : <FaSortDown className="ml-1 w-4 h-4"/>) : <FaSort className="ml-1 w-4 h-4 opacity-30"/>}</div>
                          </th>
                          <th className="px-1 py-2 text-center cursor-pointer hover:bg-slate-800/60" onClick={() => handleSort('avgPoints')}>
                             <div className="flex items-center justify-center">{t('common.avgPointsShort', 'KA')} {sortColumn === 'avgPoints' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1 w-4 h-4"/> : <FaSortDown className="ml-1 w-4 h-4"/>) : <FaSort className="ml-1 w-4 h-4 opacity-30"/>}</div>
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-slate-100">
                         {playerStats.length > 0 ? (playerStats.map(player => (
                          <tr key={player.id} className="border-b border-slate-800 hover:bg-slate-800/40 cursor-pointer" onClick={() => handlePlayerRowClick(player)}>
                            <td className="px-2 py-2 font-medium whitespace-nowrap">{player.name}</td>
                            <td className="px-1 py-2 text-center text-yellow-400 font-semibold">{player.gamesPlayed}</td>
                            <td className="px-1 py-2 text-center text-yellow-400 font-semibold">{player.goals}</td>
                            <td className="px-1 py-2 text-center text-yellow-400 font-semibold">{player.assists}</td>
                            <td className="px-1 py-2 text-center text-yellow-400 font-bold">{player.totalScore}</td>
                            <td className="px-1 py-2 text-center text-yellow-400 font-semibold">{player.avgPoints.toFixed(1)}</td>
                          </tr>
                        ))) : (
                          <tr><td colSpan={6} className="py-4 text-center text-slate-400">{t('common.noPlayersMatchFilter', 'Ei pelaajia hakusuodattimella')}</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {activeTab === 'currentGame' && (
                  <>
                    <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
                      <h3 className="text-xl font-semibold text-slate-200 mb-4">{t('gameStatsModal.goalLogTitle', 'Goal Log')}</h3>
                      <div className="space-y-2">
                        {sortedGoals.filter(g => g.type === 'goal' || g.type === 'opponentGoal').map(goal => (
                          <div key={goal.id} className={`p-3 rounded-md border transition-all ${editingGoalId === goal.id ? 'bg-slate-700/75 border-indigo-500' : 'bg-slate-800/40 border-slate-700/50'}`}>
                            {editingGoalId === goal.id ? (
                              <div className="space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">{t('common.time', 'Time')}</label>
                                    <input 
                                      type="text" 
                                      value={editGoalTime} 
                                      onChange={e => setEditGoalTime(e.target.value)} 
                                      onKeyDown={handleGoalEditKeyDown}
                                      placeholder="MM:SS"
                                      className="w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-sm"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">{t('common.scorer', 'Scorer')}</label>
                                    <select 
                                      value={editGoalScorerId} 
                                      onChange={e => setEditGoalScorerId(e.target.value)}
                                      className="w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-sm"
                                    >
                                      <option value="">{t('common.select', 'Select...')}</option>
                                      {availablePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1">{t('common.assist', 'Assist')}</label>
                                    <select 
                                      value={editGoalAssisterId} 
                                      onChange={e => setEditGoalAssisterId(e.target.value || '')}
                                      className="w-full bg-slate-700 border border-slate-600 rounded-md px-2 py-1.5 text-sm"
                                    >
                                      <option value="">{t('common.none', 'None')}</option>
                                      {availablePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2">
                                  <button onClick={handleCancelEditGoal} className="px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-md text-sm font-medium transition-colors">{t('common.cancel', 'Cancel')}</button>
                                  <button onClick={handleSaveEditGoal} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors">{t('common.save', 'Save Changes')}</button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                  <span className="font-mono text-slate-300 text-lg w-16">{formatTime(goal.time)}</span>
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-slate-100">{goal.type === 'goal' ? (availablePlayers.find(p => p.id === goal.scorerId)?.name || 'N/A') : opponentName}</span>
                                    {goal.type === 'goal' && goal.assisterId && (
                                      <span className="text-sm text-slate-400">{t('common.assist', 'Assist')}: {availablePlayers.find(p => p.id === goal.assisterId)?.name || ''}</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => handleStartEditGoal(goal)} className="p-1.5 text-slate-400 hover:text-indigo-400 rounded-md transition-colors" aria-label={t('common.edit', 'Edit')}><FaEdit /></button>
                                  <button onClick={() => triggerDeleteEvent(goal.id)} className="p-1.5 text-slate-400 hover:text-red-500 rounded-md transition-colors" aria-label={t('common.delete', 'Delete')}><FaTrashAlt /></button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
                      <div className="flex justify-between items-center mb-4">
                         <h3 className="text-xl font-semibold text-slate-200">{t('gameStatsModal.notesTitle', 'Game Notes')}</h3>
                         <div className="flex items-center gap-2">
                          {isEditingNotes ? (
                            <>
                              <button onClick={handleSaveNotes} className="p-1.5 text-green-400 hover:text-green-300 rounded bg-slate-700 hover:bg-slate-600" title={t('common.saveChanges') ?? 'Tallenna'}><FaSave /></button>
                              <button onClick={handleCancelEditNotes} className="p-1.5 text-red-400 hover:text-red-300 rounded bg-slate-700 hover:bg-slate-600" title={t('common.cancel') ?? 'Peruuta'}><FaTimes /></button>
                            </>
                          ) : (
                            <button onClick={() => setIsEditingNotes(true)} className="p-1.5 text-slate-400 hover:text-indigo-400 rounded bg-slate-700 hover:bg-slate-600" title={t('common.edit') ?? 'Muokkaa'}><FaEdit /></button>
                          )}
                        </div>
                      </div>
                       {isEditingNotes ? (
                          <textarea ref={notesTextareaRef} value={editGameNotes} onChange={(e) => setEditGameNotes(e.target.value)} className="w-full h-24 p-2 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder={t('gameStatsModal.notesPlaceholder', 'Notes...') ?? undefined} />
                      ) : (
                          <div className="min-h-[6rem] p-2 text-sm text-slate-300 whitespace-pre-wrap">
                              {gameNotes || <span className="italic text-slate-400">{t('gameStatsModal.noNotes', 'No notes.')}</span>}
                          </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer Section */}
        <div className="px-6 py-3 bg-slate-800/50 border-t border-slate-700/20 backdrop-blur-sm flex justify-end items-center gap-4 flex-shrink-0">
           {(onExportOneJson || onExportAggregateJson) && (
              <button
                onClick={() => {
                  if (activeTab === 'currentGame' && currentGameId && onExportOneJson) onExportOneJson(currentGameId);
                  else if (activeTab !== 'currentGame' && onExportAggregateJson) onExportAggregateJson(processedGameIds, playerStats);
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-sm font-medium transition-colors"
                disabled={isExportDisabled}
              >
                 {t('common.exportJson', 'Vie JSON')}
              </button>
           )}
           {(onExportOneCsv || onExportAggregateCsv) && (
              <button
                 onClick={() => {
                  if (activeTab === 'currentGame' && currentGameId && onExportOneCsv) onExportOneCsv(currentGameId);
                  else if (activeTab !== 'currentGame' && onExportAggregateCsv) onExportAggregateCsv(processedGameIds, playerStats);
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md text-sm font-medium transition-colors"
                disabled={isExportDisabled}
              >
                 {t('common.exportCsv', 'Vie CSV')}
              </button>
           )}
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors">
            {t('common.doneButton', 'Done')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameStatsModal;
