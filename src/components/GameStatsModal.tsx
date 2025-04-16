'use client';

import React, { useMemo, useState, useEffect, useRef } from 'react'; // Added useEffect, useRef
import { useTranslation } from 'react-i18next';
import { Player, GameEvent, SavedGamesCollection } from '@/app/page';
import { FaSort, FaSortUp, FaSortDown, FaEdit, FaSave, FaTimes } from 'react-icons/fa'; // Import sort icons and new icons
import {
  HiOutlineArrowTopRightOnSquare, HiOutlineDocumentArrowDown // Remove HiOutlineShieldCheck if not used elsewhere
} from 'react-icons/hi2'; // Import external link icon and new icon

// Import GameType
import { GameType } from '@/components/SaveGameModal';

// Define the default game ID constant
const DEFAULT_GAME_ID = '__default_unsaved__'; 

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
  availablePlayers: Player[];
  gameEvents: GameEvent[];
  gameNotes?: string; // Add optional game notes field
  // Handlers for editing game info
  onOpponentNameChange: (name: string) => void;
  onGameDateChange: (date: string) => void;
  onHomeScoreChange: (score: number) => void;
  onAwayScoreChange: (score: number) => void;
  onGameNotesChange?: (notes: string) => void; // Add handler for game notes
  onUpdateGameEvent?: (updatedEvent: GameEvent) => void; // Add handler for updating events
  onResetGameStats?: () => void; // Add handler for resetting stats
  onAwardFairPlayCard?: (playerId: string) => void; // Add Fair Play handler prop
  selectedPlayerIds: string[]; // Add prop for selected player IDs
  savedGames: SavedGamesCollection; // Add savedGames prop
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
  availablePlayers,
  gameEvents,
  gameNotes = '', // Default to empty string
  onOpponentNameChange,
  onGameDateChange,
  onHomeScoreChange,
  onAwayScoreChange,
  onGameNotesChange = () => {}, // Default to no-op function
  onUpdateGameEvent = () => { console.warn('onUpdateGameEvent handler not provided'); }, // Default handler
  onResetGameStats = () => { console.warn('onResetGameStats handler not provided'); }, // Default handler
  onAwardFairPlayCard, // Destructure the new prop
  selectedPlayerIds, // Destructure selected IDs
  savedGames, // Destructure savedGames prop
}) => {
  const { t } = useTranslation();

  // --- State ---
  const [activeTab, setActiveTab] = useState<'current' | 'season' | 'tournament' | 'all'>('current');
  // Local state for editing game info (bulk edit mode)
  const [editOpponentName, setEditOpponentName] = useState(opponentName);
  const [editGameDate, setEditGameDate] = useState(gameDate);
  const [editHomeScore, setEditHomeScore] = useState(String(homeScore));
  const [editAwayScore, setEditAwayScore] = useState(String(awayScore));
  const [editGameNotes, setEditGameNotes] = useState(gameNotes);
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // State for inline editing (double-click)
  const [inlineEditingField, setInlineEditingField] = useState<'opponent' | 'date' | 'home' | 'away' | null>(null);
  const [inlineEditValue, setInlineEditValue] = useState<string>('');
  const opponentInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  const homeScoreInputRef = useRef<HTMLInputElement>(null);
  const awayScoreInputRef = useRef<HTMLInputElement>(null);
  const notesTextareaRef = useRef<HTMLTextAreaElement>(null);

  // State for Player Stats Table
  const [sortColumn, setSortColumn] = useState<SortableColumn>('totalScore');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [filterText, setFilterText] = useState<string>('');

  // State for Goal Log Editing
  const [editingGoalId, setEditingGoalId] = useState<string | null>(null);
  const [editGoalTime, setEditGoalTime] = useState<string>('');
  const [editGoalScorerId, setEditGoalScorerId] = useState<string>('');
  const [editGoalAssisterId, setEditGoalAssisterId] = useState<string | undefined>(undefined);
  const goalTimeInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---
  // Reset edit state when props change or modal opens/closes
  useEffect(() => {
      if (isOpen) {
          setEditOpponentName(opponentName);
          setEditGameDate(gameDate);
          setEditHomeScore(String(homeScore));
          setEditAwayScore(String(awayScore));
          setEditGameNotes(gameNotes);
          setIsEditingInfo(false); // Start in view mode
          setIsEditingNotes(false); // Start notes in view mode
          setInlineEditingField(null); // Cancel any inline edits
      } else {
          // Reset all edit states when modal closes
          setIsEditingInfo(false);
          setIsEditingNotes(false);
          setInlineEditingField(null);
      }
  }, [isOpen, opponentName, gameDate, homeScore, awayScore, gameNotes]); // Depend on props and isOpen

  // Focus elements when editing modes are activated
  useEffect(() => {
    console.log('[GameStatsModal Effect] Running effect for focus. isEditingNotes:', isEditingNotes, 'inlineEditingField:', inlineEditingField);
    if (inlineEditingField === 'opponent') {
      opponentInputRef.current?.focus();
      opponentInputRef.current?.select(); // Select text for easy replacement
    } else if (inlineEditingField === 'date') {
      dateInputRef.current?.focus();
    } else if (inlineEditingField === 'home') {
      homeScoreInputRef.current?.focus();
      homeScoreInputRef.current?.select();
    } else if (inlineEditingField === 'away') {
      awayScoreInputRef.current?.focus();
      awayScoreInputRef.current?.select();
    }
    
    if (isEditingNotes) {
      console.log('[GameStatsModal Effect] Focusing notes textarea');
      notesTextareaRef.current?.focus();
    }
  }, [inlineEditingField, isEditingNotes]);

  // Add effect to focus goal time input when editing starts
  useEffect(() => {
      if (editingGoalId) {
          goalTimeInputRef.current?.focus();
          goalTimeInputRef.current?.select();
      }
  }, [editingGoalId]);

  // --- Calculations ---
  // Calculate and filter/sort player stats
  const filteredAndSortedPlayerStats = useMemo(() => {
    // 0. Filter availablePlayers to only include those selected for the match
    const selectedPlayers = availablePlayers.filter(p => selectedPlayerIds.includes(p.id));

    // 1. Calculate initial stats for selected players
    const allPlayerStats: PlayerStatRow[] = selectedPlayers.map(player => {
      const goals = gameEvents.filter(e => e.type === 'goal' && e.scorerId === player.id).length;
      const assists = gameEvents.filter(e => e.type === 'goal' && e.assisterId === player.id).length;
      const totalScore = goals + assists;
      return { ...player, goals, assists, totalScore };
    });

    // 2. Filter based on filterText (case-insensitive)
    const filteredStats = filterText
      ? allPlayerStats.filter(player =>
          player.name.toLowerCase().includes(filterText.toLowerCase())
        )
      : allPlayerStats;

    // 3. Sort the filtered stats
    const sortedStats = [...filteredStats].sort((a, b) => {
      const valA = a[sortColumn];
      const valB = b[sortColumn];

      let comparison = 0;
      if (typeof valA === 'string' && typeof valB === 'string') {
        comparison = valA.localeCompare(valB);
      } else if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else {
        // Handle potential mixed types or unexpected values gracefully
        comparison = String(valA).localeCompare(String(valB));
      }

      // Adjust based on sort direction
      // If descending, reverse the comparison result
      return sortDirection === 'desc' ? comparison * -1 : comparison;
    });

    return sortedStats;
  }, [availablePlayers, selectedPlayerIds, gameEvents, filterText, sortColumn, sortDirection]);

  // Filter and sort goal events by time
  const sortedGoals = useMemo(() => {
    return gameEvents
      .filter(e => e.type === 'goal' || e.type === 'opponentGoal')
      .sort((a, b) => a.time - b.time);
  }, [gameEvents]);

  // --- AGGREGATION HELPER FUNCTION ---
  const aggregateStats = (gameTypeFilter?: GameType) => {
    // Filter based on the game ID (key) and the gameType property
    const filteredGames = Object.entries(savedGames)
      .filter(([gameId, game]) => 
          gameId !== DEFAULT_GAME_ID && 
          (!gameTypeFilter || game.gameType === gameTypeFilter)
      )
      .map(([_, game]) => game); // Extract only the game data after filtering

    if (filteredGames.length === 0) {
      return { team: null, players: [] };
    }

    // --- Team Stats ---
    let wins = 0;
    let losses = 0;
    let draws = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;

    filteredGames.forEach(game => {
      goalsFor += game.homeScore;
      goalsAgainst += game.awayScore;
      if (game.homeScore > game.awayScore) wins++;
      else if (game.homeScore < game.awayScore) losses++;
      else draws++;
    });

    const teamStats = {
      gamesPlayed: filteredGames.length,
      wins,
      losses,
      draws,
      goalsFor,
      goalsAgainst,
    };

    // --- Player Stats ---
    const playerTotals: { [playerId: string]: { name: string; goals: number; assists: number; points: number; goalieGames: number; fairPlayCards: number } } = {};
    const allPlayerNames: { [playerId: string]: string } = {}; // Keep track of latest player name

    // First pass: get all unique players and their latest names from the roster of all relevant games
    filteredGames.forEach(game => {
        game.availablePlayers?.forEach(player => {
            if (!allPlayerNames[player.id]) { // Store the first encountered name (could be refined) 
                allPlayerNames[player.id] = player.name;
            }
        });
    });

    // Initialize totals for all unique players found
    Object.keys(allPlayerNames).forEach(id => {
        playerTotals[id] = { name: allPlayerNames[id], goals: 0, assists: 0, points: 0, goalieGames: 0, fairPlayCards: 0 };
    });

    // Second pass: aggregate stats
    filteredGames.forEach(game => {
      // Aggregate stats only for players who were available in that specific game
      game.availablePlayers?.forEach(playerInGame => {
        const playerTotalStats = playerTotals[playerInGame.id];
        if (playerTotalStats) { // Check if player exists in our aggregate list
          const gameGoals = game.gameEvents?.filter(e => e.type === 'goal' && e.scorerId === playerInGame.id).length || 0;
          const gameAssists = game.gameEvents?.filter(e => e.type === 'goal' && e.assisterId === playerInGame.id).length || 0;
          
          playerTotalStats.goals += gameGoals;
          playerTotalStats.assists += gameAssists;
          playerTotalStats.points += (gameGoals + gameAssists);
          if (playerInGame.isGoalie) playerTotalStats.goalieGames++;
          if (playerInGame.receivedFairPlayCard) playerTotalStats.fairPlayCards++;
        } 
      });
    });

    const playerStatsArray = Object.entries(playerTotals).map(([id, stats]) => ({ id, ...stats }))
      .sort((a, b) => b.points - a.points || b.goals - a.goals || a.name.localeCompare(b.name)); // Sort by points, then goals, then name

    return { team: teamStats, players: playerStatsArray };
  };

  // --- Calculated Aggregated Stats ---
  const seasonStats = useMemo(() => aggregateStats('season'), [savedGames]);
  const tournamentStats = useMemo(() => aggregateStats('tournament'), [savedGames]);
  const allStats = useMemo(() => aggregateStats(), [savedGames]); // No filter for all games

  // --- Handlers ---
  // Bulk Edit Mode Handlers
  const handleSaveInfo = () => {
      const newHomeScore = parseInt(editHomeScore, 10);
      const newAwayScore = parseInt(editAwayScore, 10);
      const trimmedOpponentName = editOpponentName.trim() || t('gameStatsModal.opponentPlaceholder', 'Opponent');

      if (opponentName !== trimmedOpponentName) {
          onOpponentNameChange(trimmedOpponentName);
      }
      if (gameDate !== editGameDate) {
          onGameDateChange(editGameDate);
      }
      if (!isNaN(newHomeScore) && homeScore !== newHomeScore) {
          onHomeScoreChange(newHomeScore);
      } else if (isNaN(newHomeScore)){
          setEditHomeScore(String(homeScore));
      }
      if (!isNaN(newAwayScore) && awayScore !== newAwayScore) {
          onAwayScoreChange(newAwayScore);
      } else if (isNaN(newAwayScore)) {
          setEditAwayScore(String(awayScore));
      }
      setIsEditingInfo(false);
  };

  const handleCancelEditInfo = () => {
      setEditOpponentName(opponentName);
      setEditGameDate(gameDate);
      setEditHomeScore(String(homeScore));
      setEditAwayScore(String(awayScore));
      setIsEditingInfo(false);
  };

  // Notes Edit Handlers
  const handleSaveNotes = () => {
    if (gameNotes !== editGameNotes) {
      onGameNotesChange(editGameNotes);
    }
    setIsEditingNotes(false);
  };

  const handleCancelEditNotes = () => {
    setEditGameNotes(gameNotes);
    setIsEditingNotes(false);
  };

  // Inline Edit Handlers
  const handleStartInlineEdit = (field: 'opponent' | 'date' | 'home' | 'away') => {
    if (isEditingInfo || isEditingNotes) return; // Don't allow inline edit if other edits are active
    setInlineEditingField(field);
    let initialValue = '';
    switch(field) {
      case 'opponent': initialValue = opponentName; break;
      case 'date': initialValue = gameDate; break;
      case 'home': initialValue = String(homeScore); break;
      case 'away': initialValue = String(awayScore); break;
    }
    setInlineEditValue(initialValue);
  };

  const handleCancelInlineEdit = () => {
    setInlineEditingField(null);
    setInlineEditValue('');
  };

  const handleSaveInlineEdit = () => {
    if (!inlineEditingField) return;

    const trimmedValue = inlineEditValue.trim();

    switch(inlineEditingField) {
      case 'opponent':
        const finalOpponentName = trimmedValue || t('gameStatsModal.opponentPlaceholder', 'Opponent');
        if (opponentName !== finalOpponentName) {
          onOpponentNameChange(finalOpponentName);
        }
        break;
      case 'date':
        if (gameDate !== trimmedValue && trimmedValue) { 
           onGameDateChange(trimmedValue);
        } else if (!trimmedValue) {
           console.warn("Game date cannot be empty.");
        }
        break;
      case 'home':
      case 'away':
        const newScore = parseInt(trimmedValue, 10);
        if (!isNaN(newScore) && newScore >= 0) {
          if (inlineEditingField === 'home' && homeScore !== newScore) {
            onHomeScoreChange(newScore);
          } else if (inlineEditingField === 'away' && awayScore !== newScore) {
            onAwayScoreChange(newScore);
          }
        } else {
          console.warn("Invalid score entered."); // Keep original score if invalid
        }
        break;
    }
    handleCancelInlineEdit(); // Exit inline edit mode
  };

  // Need to handle different input types (text/date/number)
  const handleInlineEditKeyDown = (event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === 'Enter') {
      // For textareas, Enter might be intended for newlines, but we'll treat it as save here
      handleSaveInlineEdit();
    } else if (event.key === 'Escape') {
      handleCancelInlineEdit();
    }
  };

  // Player Stats Table Handlers
  const handleSort = (column: SortableColumn) => {
    // If clicking the same column, toggle direction
    if (sortColumn === column) {
      setSortDirection(prevDirection => (prevDirection === 'asc' ? 'desc' : 'asc'));
    } else {
      // If clicking a new column, set it and default direction
      setSortColumn(column);
      // Default numeric cols to desc, name to asc
      setSortDirection(column === 'name' ? 'asc' : 'desc');
    }
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilterText(event.target.value);
  };

  // Goal Log Edit Handlers
  const handleStartEditGoal = (goal: GameEvent) => {
    setEditingGoalId(goal.id);
    setEditGoalTime(String(goal.time)); // Store time as string for input
    setEditGoalScorerId(goal.scorerId);
    setEditGoalAssisterId(goal.assisterId);
    // Cancel other editing modes
    setIsEditingInfo(false);
    setIsEditingNotes(false);
    setInlineEditingField(null);
  };

  const handleCancelEditGoal = () => {
    setEditingGoalId(null);
  };

  const handleSaveEditGoal = () => {
    if (!editingGoalId) return;

    const originalGoal = gameEvents.find(e => e.id === editingGoalId);
    if (!originalGoal) {
        console.error("Original goal not found for editing!");
        handleCancelEditGoal();
        return;
    }

    const updatedTime = parseInt(editGoalTime, 10);
    const updatedScorer = availablePlayers.find(p => p.id === editGoalScorerId);
    const updatedAssister = editGoalAssisterId ? availablePlayers.find(p => p.id === editGoalAssisterId) : undefined;

    // Basic validation
    if (isNaN(updatedTime) || updatedTime < 0) {
        console.warn("Invalid time entered for goal edit.");
        // Optionally show user feedback
        return; // Don't save invalid time
    }
    if (!updatedScorer) {
        console.warn("Scorer must be selected for goal edit.");
        // Optionally show user feedback
        return; // Don't save without scorer
    }

    const updatedEvent: GameEvent = {
      ...originalGoal,
      time: updatedTime,
      scorerId: updatedScorer.id,
      scorerName: updatedScorer.name,
      assisterId: updatedAssister?.id,
      assisterName: updatedAssister?.name,
    };

    onUpdateGameEvent(updatedEvent); // Call parent handler to update state
    handleCancelEditGoal(); // Exit editing mode
  };

  const handleGoalEditKeyDown = (event: React.KeyboardEvent) => {
      if (event.key === 'Enter') {
          handleSaveEditGoal();
      } else if (event.key === 'Escape') {
          handleCancelEditGoal();
      }
  }

  // Handler for the Reset Stats button
  const handleResetClick = () => {
      // Confirmation is now handled in page.tsx
      onResetGameStats(); 
      // Optionally close the modal after reset, or keep it open?
      // onClose(); 
  };

  // --- NEW Export Handlers ---
  const triggerDownload = (content: string, filename: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const exportData = {
      gameInfo: {
        gameDate: gameDate,
        teamName: teamName,
        opponentName: opponentName,
      },
      finalScore: {
        home: homeScore,
        away: awayScore,
      },
      roster: availablePlayers, // Include the full roster
      events: gameEvents, 
      notes: gameNotes,
    };

    const jsonString = JSON.stringify(exportData, null, 2); // Pretty print JSON
    const filename = `${teamName.replace(/\s+/g, '')}_vs_${opponentName.replace(/\s+/g, '')}_${gameDate}.json`;
    triggerDownload(jsonString, filename, 'application/json');
  };

  // Helper function to safely format CSV fields (handles quotes and commas)
  const escapeCsvField = (field: string | number | undefined | null): string => {
    const stringField = String(field ?? ''); // Convert null/undefined to empty string
    // If field contains comma, newline, or double quote, enclose in double quotes
    if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
      // Escape existing double quotes by doubling them
      const escapedField = stringField.replace(/"/g, '""');
      return `"${escapedField}"`;
    }
    return stringField;
  };

  const handleExportExcel = () => {
    const rows: string[] = [];
    const EOL = '\r\n'; // Explicitly use CRLF for Excel compatibility
    const DELIMITER = ';'; // Use semicolon for better Excel compatibility

    // --- Section: Game Info ---
    rows.push('Game Info'); // Cleaned: No trailing delimiters
    rows.push(`${escapeCsvField(t('gameStatsModal.gameDateLabel', 'Game Date:'))}${DELIMITER}${escapeCsvField(gameDate)}`); // Cleaned
    rows.push(`${escapeCsvField(t('gameStatsModal.homeTeamLabel', 'Home Team:'))}${DELIMITER}${escapeCsvField(teamName)}`); // Cleaned
    rows.push(`${escapeCsvField(t('gameStatsModal.awayTeamLabel', 'Away Team:'))}${DELIMITER}${escapeCsvField(opponentName)}`); // Cleaned
    // Split score rows
    rows.push(`${escapeCsvField(t('gameStatsModal.homeScoreLabel', 'Home Score:'))}${DELIMITER}${escapeCsvField(homeScore)}`); 
    rows.push(`${escapeCsvField(t('gameStatsModal.awayScoreLabel', 'Away Score:'))}${DELIMITER}${escapeCsvField(awayScore)}`);
    rows.push(''); // Blank separator row (cleaner)

    // --- Section: Combined Roster & Player Stats ---
    // 1. Calculate stats for ALL players and combine with roster info
    const rosterWithStats = availablePlayers.map(player => {
      const goals = gameEvents.filter(e => e.type === 'goal' && e.scorerId === player.id).length;
      const assists = gameEvents.filter(e => e.type === 'goal' && e.assisterId === player.id).length;
      const totalScore = goals + assists;
      return { ...player, goals, assists, totalScore };
    })
    // 2. Sort the combined list (e.g., by points desc, then name asc)
    .sort((a, b) => {
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore; // Primary: Points descending
      }
      return a.name.localeCompare(b.name); // Secondary: Name ascending
    });

    // 3. Create the header row
    rows.push(escapeCsvField(t('rosterSettingsModal.title', 'Roster & Stats'))); // Combined title
    rows.push([
        escapeCsvField(t('gameStatsModal.playerHeader', 'Player')),
        escapeCsvField(t('gameStatsModal.jerseyHeader', '#')),
        escapeCsvField(t('gameStatsModal.goalieHeader', 'Goalie')),
        escapeCsvField(t('gameStatsModal.notesHeader', 'Player Notes')),
        escapeCsvField(t('gameStatsModal.goalsHeaderFull', 'Goals')),
        escapeCsvField(t('gameStatsModal.assistsHeaderFull', 'Assists')),
        escapeCsvField(t('gameStatsModal.pointsHeaderFull', 'Points'))
    ].join(DELIMITER));

    // 4. Create data rows for each player
    rosterWithStats.forEach(player => {
        rows.push([
            escapeCsvField(player.name),
            escapeCsvField(player.jerseyNumber),
            escapeCsvField(player.isGoalie ? t('common.yes', 'Yes') : t('common.no', 'No')),
            escapeCsvField(player.notes),
            escapeCsvField(player.goals),
            escapeCsvField(player.assists),
            escapeCsvField(player.totalScore)
        ].join(DELIMITER));
    });
    rows.push(''); // Blank separator row

    // --- Section: Event Log ---
    rows.push('Event Log'); // Cleaned
    rows.push(`${escapeCsvField(t('gameStatsModal.timeHeader', 'Time'))}${DELIMITER}${escapeCsvField(t('gameStatsModal.typeHeader', 'Type'))}${DELIMITER}${escapeCsvField(t('gameStatsModal.scorerHeader', 'Scorer'))}${DELIMITER}${escapeCsvField(t('gameStatsModal.assisterHeader', 'Assister'))}`); // Cleaned
    // Use the pre-sorted goals from useMemo
    sortedGoals.forEach(event => {
        const timeFormatted = formatTime(event.time);
        const type = event.type === 'goal' ? t('gameStatsModal.eventTypeGoal', 'Goal') : t('gameStatsModal.eventTypeOpponentGoal', 'Opponent Goal');
        const scorer = escapeCsvField(event.scorerName);
        const assister = event.type === 'goal' ? escapeCsvField(event.assisterName) : ''; // Only show assister for own goals
        rows.push(`${escapeCsvField(timeFormatted)}${DELIMITER}${escapeCsvField(type)}${DELIMITER}${scorer}${DELIMITER}${assister}`); // Cleaned
    });
    rows.push(''); // Blank separator row

    // --- Section: Notes ---
    rows.push(`${escapeCsvField(t('gameStatsModal.notesTitle', 'Notes:'))}${DELIMITER}${escapeCsvField(gameNotes)}`); // Combined label and notes

    // --- Combine and Download ---
    const csvString = rows.join(EOL);
    const filename = `${teamName.replace(/\s+/g, '_')}_vs_${opponentName.replace(/\s+/g, '_')}_${gameDate}.csv`;
    triggerDownload(csvString, filename, 'text/csv;charset=utf-8;'); // Specify charset
  };

  // --- END NEW Export Handlers ---

  if (!isOpen) return null;

  console.log('[GameStatsModal Render] Rendering modal. isEditingNotes:', isEditingNotes);

  // --- REUSABLE DISPLAY COMPONENT ---
  const AggregateStatsDisplay: React.FC<{
    stats: { team: any; players: any[] };
    teamTitleKey: string;
    playerTitleKey: string;
    noGamesMessageKey: string;
    defaultTeamTitle: string;
    defaultPlayerTitle: string;
    defaultNoGamesMessage: string;
  }> = ({ 
    stats, 
    teamTitleKey, 
    playerTitleKey, 
    noGamesMessageKey, 
    defaultTeamTitle, 
    defaultPlayerTitle, 
    defaultNoGamesMessage 
  }) => {
    return (
      <div className="space-y-6">
        {/* Team Stats */}
        <section className="bg-slate-700/50 p-4 rounded-md">
          <h3 className="text-xl font-semibold text-yellow-300 mb-3 text-center">
            {t(teamTitleKey, defaultTeamTitle)} {/* Use default title */}
          </h3>
          {stats.team ? (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-slate-300">{t('gameStatsModal.gamesPlayed', 'Games Played:')}</span>
              <span className="text-slate-100 font-medium">{stats.team.gamesPlayed}</span>
              <span className="text-slate-300">{t('gameStatsModal.record', 'Record (W-L-D):')}</span>
              <span className="text-slate-100 font-medium">{`${stats.team.wins}-${stats.team.losses}-${stats.team.draws}`}</span>
              <span className="text-slate-300">{t('gameStatsModal.goalsFor', 'Goals For:')}</span>
              <span className="text-slate-100 font-medium">{stats.team.goalsFor}</span>
              <span className="text-slate-300">{t('gameStatsModal.goalsAgainst', 'Goals Against:')}</span>
              <span className="text-slate-100 font-medium">{stats.team.goalsAgainst}</span>
            </div>
          ) : (
            <p className="text-slate-400 italic text-center text-sm">
              {t(noGamesMessageKey, defaultNoGamesMessage)} {/* Use default message */}
            </p>
          )}
        </section>

        {/* Player Stats */}
        <section className="bg-slate-700/50 p-4 rounded-md">
          <h3 className="text-xl font-semibold text-yellow-300 mb-3 text-center">
            {t(playerTitleKey, defaultPlayerTitle)} {/* Use default title */}
          </h3>
          {stats.players.length > 0 ? (
            <div className="overflow-x-auto max-h-80">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-700/50 sticky top-0 z-10">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">{t('gameStatsModal.playerHeader', 'Player')}</th>
                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-slate-300 uppercase tracking-wider w-12">{t('gameStatsModal.goalsHeader', 'G')}</th>
                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-slate-300 uppercase tracking-wider w-12">{t('gameStatsModal.assistsHeader', 'A')}</th>
                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-slate-300 uppercase tracking-wider w-12">{t('gameStatsModal.totalHeader', 'Pts')}</th>
                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-slate-300 uppercase tracking-wider w-12" title={t('gameStatsModal.goalieGamesTooltip', 'Games as Goalie')}>{t('gameStatsModal.goalieGamesHeader', 'GK')}</th>
                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-slate-300 uppercase tracking-wider w-12" title={t('gameStatsModal.fairPlayCardsTooltip', 'Fair Play Cards')}>{t('gameStatsModal.fairPlayCardsHeader', 'FP')}</th>
                  </tr>
                </thead>
                <tbody className="bg-slate-800 divide-y divide-slate-700">
                  {stats.players.map((player) => (
                    <tr key={player.id} className="hover:bg-slate-700/50">
                      <td className="py-1 px-3 text-xs text-slate-200 whitespace-nowrap">{player.name}</td>
                      <td className="py-1 px-3 text-xs text-slate-300 text-center">{player.goals}</td>
                      <td className="py-1 px-3 text-xs text-slate-300 text-center">{player.assists}</td>
                      <td className="py-1 px-3 text-xs text-slate-300 text-center font-semibold">{player.totalScore}</td>
                      <td className="py-1 px-3 text-xs text-slate-300 text-center">{player.goalieGames}</td>
                      <td className="py-1 px-3 text-xs text-slate-300 text-center">{player.fairPlayCards}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
             <p className="text-slate-400 italic text-center text-sm">
               {t(noGamesMessageKey, defaultNoGamesMessage)} {/* Use default message */}
            </p>
          )}
        </section>
      </div>
    );
  };

  const renderTabContent = () => {
    switch(activeTab) {
      case 'season':
        return (
          <AggregateStatsDisplay 
            stats={seasonStats}
            teamTitleKey="gameStatsModal.seasonTeamStatsTitle"
            playerTitleKey="gameStatsModal.seasonPlayerStatsTitle"
            noGamesMessageKey="gameStatsModal.noSeasonGames"
            defaultTeamTitle="Season Team Stats"
            defaultPlayerTitle="Season Player Stats"
            defaultNoGamesMessage="No season games saved yet."
          />
        );
      case 'tournament':
        return (
          <AggregateStatsDisplay 
            stats={tournamentStats}
            teamTitleKey="gameStatsModal.tournamentTeamStatsTitle"
            playerTitleKey="gameStatsModal.tournamentPlayerStatsTitle"
            noGamesMessageKey="gameStatsModal.noTournamentGames"
            defaultTeamTitle="Tournament Team Stats"
            defaultPlayerTitle="Tournament Player Stats"
            defaultNoGamesMessage="No tournament games saved yet."
          />
        );
      case 'all':
        return (
          <AggregateStatsDisplay 
            stats={allStats}
            teamTitleKey="gameStatsModal.allTeamStatsTitle"
            playerTitleKey="gameStatsModal.allPlayerStatsTitle"
            noGamesMessageKey="gameStatsModal.noSavedGames"
            defaultTeamTitle="Overall Team Stats"
            defaultPlayerTitle="Overall Player Stats"
            defaultNoGamesMessage="No games saved yet."
          />
        );
      case 'current':
      default:
        return (
          // Existing Current Game Stats Layout
          <div className="overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700 pr-2 space-y-6">
            {/* Game Information Section */}
            <section className="bg-slate-700/50 p-4 rounded-md relative group">
              <div className="flex justify-center items-start mb-3"> 
                <h3 className="text-xl font-semibold text-yellow-300">
                  {t('gameStatsModal.gameInfoTitle', 'Game Information')}
                </h3>
              </div>

              {isEditingInfo ? (
                // --- Bulk Edit Mode ---
                <div className="space-y-3">
                  {/* Team vs Opponent */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 items-center">
                    <input type="text" value={teamName} disabled className="col-span-1 block w-full bg-slate-600 border border-slate-500 rounded-md shadow-sm py-1.5 px-3 text-sm opacity-70" />
                     <input
                      type="text"
                      value={editOpponentName}
                      onChange={(e) => setEditOpponentName(e.target.value)}
                      placeholder={t('gameStatsModal.opponentPlaceholder', 'Opponent Name')}
                      className="col-span-1 block w-full bg-slate-600 border border-slate-500 rounded-md shadow-sm py-1.5 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                   {/* Scores */}
                   <div className="grid grid-cols-[1fr_auto_1fr] gap-x-3 gap-y-2 items-center">
                      <input type="number" min="0" value={editHomeScore} onChange={(e) => setEditHomeScore(e.target.value)} className="col-span-1 block w-full bg-slate-600 border border-slate-500 rounded-md shadow-sm py-1.5 px-3 text-sm text-center focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                      <span className="text-lg font-semibold text-center"> - </span>
                       <input type="number" min="0" value={editAwayScore} onChange={(e) => setEditAwayScore(e.target.value)} className="col-span-1 block w-full bg-slate-600 border border-slate-500 rounded-md shadow-sm py-1.5 px-3 text-sm text-center focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                  </div>
                  {/* Date */}
                  <div className="flex justify-center">
                    <input type="date" value={editGameDate} onChange={(e) => setEditGameDate(e.target.value)} className="block bg-slate-600 border border-slate-500 rounded-md shadow-sm py-1.5 px-3 text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                  </div>
                  {/* Save/Cancel Buttons */}
                  <div className="flex justify-end space-x-2 pt-2">
                      <button onClick={handleCancelEditInfo} className="px-3 py-1 bg-slate-500 hover:bg-slate-400 text-white rounded-md text-xs font-medium">{t('gameStatsModal.cancelButton', 'Cancel')}</button>
                      <button onClick={handleSaveInfo} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium">{t('gameStatsModal.saveButton', 'Save')}</button>
                  </div>
                </div>
              ) : (
                // --- View Mode (with Inline Editing) ---
                <div className="space-y-1">
                   {/* Edit All Button (only visible when not inline editing) */}
                   {!inlineEditingField && (
                       <button
                          onClick={() => setIsEditingInfo(true)}
                          className="absolute top-3 right-3 px-2 py-0.5 bg-slate-600 hover:bg-slate-500 text-white rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                          title={t('gameStatsModal.editButton', 'Edit Info') ?? "Edit"}
                          disabled={!!inlineEditingField} // Disable if inline editing is active
                       >
                           {t('gameStatsModal.editButton', 'Edit')}
                       </button>
                   )}
                   {/* Score Line (Inline Editable) */}
                  <div className="text-center text-lg font-semibold flex justify-center items-center gap-x-2">
                    {/* Team Name (Readonly) */}
                    <span>{teamName}</span>
                    
                    {/* Home Score (View or Inline Edit) */}
                     {inlineEditingField === 'home' ? (
                       <input
                          ref={homeScoreInputRef}
                          type="number"
                          min="0"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onBlur={handleSaveInlineEdit} 
                          onKeyDown={handleInlineEditKeyDown}
                          className="bg-slate-700 border border-indigo-500 rounded px-1 py-0 text-xl font-semibold text-center outline-none w-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                       />
                     ) : (
                       <span
                         onClick={() => handleStartInlineEdit('home')}
                         className="cursor-pointer hover:bg-slate-600/50 px-1 rounded border border-dashed border-slate-600 hover:border-indigo-400 text-xl"
                         title={t('gameStatsModal.tapToEditScore', 'Tap to edit score') ?? "Tap to edit score"}
                       >
                         {homeScore}
                       </span>
                     )}

                    <span className="mx-1"> - </span>

                    {/* Away Score (View or Inline Edit) */}
                     {inlineEditingField === 'away' ? (
                       <input
                          ref={awayScoreInputRef}
                          type="number"
                          min="0"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onBlur={handleSaveInlineEdit}
                          onKeyDown={handleInlineEditKeyDown}
                          className="bg-slate-700 border border-indigo-500 rounded px-1 py-0 text-xl font-semibold text-center outline-none w-12 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                       />
                     ) : (
                       <span
                         onClick={() => handleStartInlineEdit('away')}
                         className="cursor-pointer hover:bg-slate-600/50 px-1 rounded border border-dashed border-slate-600 hover:border-indigo-400 text-xl"
                         title={t('gameStatsModal.tapToEditScore', 'Tap to edit score') ?? "Tap to edit score"}
                       >
                         {awayScore}
                       </span>
                     )}
                    
                    {/* Opponent Name (View or Inline Edit) */}
                     {inlineEditingField === 'opponent' ? (
                       <input
                          ref={opponentInputRef}
                          type="text"
                          value={inlineEditValue}
                          onChange={(e) => setInlineEditValue(e.target.value)}
                          onBlur={handleSaveInlineEdit} // Save on blur
                          onKeyDown={handleInlineEditKeyDown}
                          className="bg-slate-700 border border-indigo-500 rounded px-1 py-0 text-lg font-semibold text-center outline-none"
                          size={Math.max(10, inlineEditValue.length)} // Basic dynamic width
                       />
                     ) : (
                       <span
                         onClick={() => handleStartInlineEdit('opponent')}
                         className="cursor-pointer hover:bg-slate-600/50 px-1 rounded border border-dashed border-slate-600 hover:border-indigo-400"
                         title={t('gameStatsModal.tapToEdit', 'Tap to edit') ?? "Tap to edit"}
                       >
                         {opponentName}
                       </span>
                     )}
                  </div>

                  {/* Game Date (View or Inline Edit) - Centered RE-ADDED */}
                  <div className="flex justify-center mt-2"> 
                    {inlineEditingField === 'date' ? (
                        <input
                           ref={dateInputRef}
                           type="date"
                           value={inlineEditValue}
                           onChange={(e) => setInlineEditValue(e.target.value)}
                           onBlur={handleSaveInlineEdit} // Save on blur
                           onKeyDown={handleInlineEditKeyDown}
                           className="bg-slate-700 border border-indigo-500 rounded px-1 py-0 text-sm text-slate-400 outline-none"
                        />
                    ) : (
                      <p
                        onClick={() => handleStartInlineEdit('date')}
                        className="text-center text-sm text-slate-400 cursor-pointer hover:bg-slate-600/50 px-1 rounded inline-block border border-dashed border-slate-600 hover:border-indigo-400" 
                        title={t('gameStatsModal.tapToEdit', 'Tap to edit') ?? "Tap to edit"}
                      >
                        {gameDate}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* Game Notes Section */}
            <section className="bg-slate-700/50 p-4 rounded-md relative group">
              <h3 className="text-xl font-semibold mb-3 text-yellow-300 text-center">
                {t('gameStatsModal.notesTitle', 'Game Notes')}
              </h3>
              
              {isEditingNotes ? (
                <div className="space-y-3">
                  <textarea
                    ref={notesTextareaRef}
                    value={editGameNotes}
                    onChange={(e) => setEditGameNotes(e.target.value)}
                    placeholder={t('gameStatsModal.notesPlaceholder', 'Add game notes here...') ?? "Add game notes here..."}
                    className="w-full h-32 bg-slate-600 border border-slate-500 rounded-md shadow-sm py-2 px-3 text-sm text-slate-200 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <div className="flex justify-end space-x-2">
                    <button onClick={handleCancelEditNotes} className="px-3 py-1 bg-slate-500 hover:bg-slate-400 text-white rounded-md text-xs font-medium">{t('gameStatsModal.cancelButton', 'Cancel')}</button>
                    <button onClick={handleSaveNotes} className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-xs font-medium">{t('gameStatsModal.saveButton', 'Save')}</button>
                  </div>
                </div>
              ) : (
                <div 
                  className="min-h-[50px] text-sm text-slate-300 px-1 whitespace-pre-wrap cursor-pointer hover:bg-slate-700/50 rounded border border-dashed border-slate-600 hover:border-indigo-400"
                  onClick={() => {
                    console.log('Notes area clicked!');
                    setIsEditingNotes(true); 
                  }}
                  title={t('gameStatsModal.clickToEditNotes', 'Click to edit notes') ?? undefined}
                >
                  {gameNotes ? 
                    gameNotes : 
                    <span className="italic text-slate-400">{t('gameStatsModal.clickToEditNotes', 'Click to edit notes')}</span>
                  }
                </div>
              )}
            </section>

            {/* Player Stats Section */}
            <section>
              <h3 className="text-xl font-semibold mb-4 text-yellow-300 text-center">
                {t('gameStatsModal.playerStatsTitle', 'Player Stats')}
              </h3>

              {/* Fair Play Award Dropdown - ADDED */}
              {onAwardFairPlayCard && (
                <div className="mb-3 flex items-center gap-2">
                  <label htmlFor="fairPlaySelect" className="text-sm font-medium text-slate-300 whitespace-nowrap">
                    {t('statsModal.awardFairPlayLabel', 'Fair Play Award:')}
                  </label>
                  <select
                    id="fairPlaySelect"
                    value={availablePlayers.find(p => selectedPlayerIds.includes(p.id) && p.receivedFairPlayCard)?.id || ''}
                    onChange={(e) => onAwardFairPlayCard(e.target.value)}
                    className="block w-full px-3 py-1.5 bg-slate-600 border border-slate-500 rounded-md shadow-sm text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">{t('statsModal.awardFairPlayNone', '- None -')}</option>
                    {availablePlayers
                      .filter(player => selectedPlayerIds.includes(player.id))
                      .map(player => (
                        <option key={player.id} value={player.id}>
                          {player.name}
                        </option>
                    ))}
                  </select>
                </div>
              )}
              {/* --------------------------------- */}

              {/* Filter Input */}
              <div className="mb-3">
                <input
                  type="text"
                  placeholder={t('gameStatsModal.filterPlaceholder', 'Filter players...') ?? "Filter players..."}
                  value={filterText}
                  onChange={handleFilterChange}
                  className="w-full px-3 py-1.5 bg-slate-600 border border-slate-500 rounded-md shadow-sm text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="overflow-x-auto max-h-60">
                <table className="min-w-full divide-y divide-slate-700">
                  <thead className="bg-slate-700/50 sticky top-0 z-10"><tr>
                    {/* Player Header (Sortable) */}
                    <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-600/50" onClick={() => handleSort('name')}>
                       <div className="flex items-center">
                         {t('gameStatsModal.playerHeader', 'Player')}
                         {sortColumn === 'name' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1"/> : <FaSortDown className="ml-1"/>) : <FaSort className="ml-1 opacity-30"/>}
                       </div>
                    </th>
                    {/* Goals Header (Sortable) */}
                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-600/50 w-12" onClick={() => handleSort('goals')}>
                       <div className="flex items-center justify-center">
                         {t('gameStatsModal.goalsHeader', 'G')}
                         {sortColumn === 'goals' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1"/> : <FaSortDown className="ml-1"/>) : <FaSort className="ml-1 opacity-30"/>}
                       </div>
                    </th>
                    {/* Assists Header (Sortable) */}
                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-600/50 w-12" onClick={() => handleSort('assists')}>
                       <div className="flex items-center justify-center">
                         {t('gameStatsModal.assistsHeader', 'A')}
                         {sortColumn === 'assists' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1"/> : <FaSortDown className="ml-1"/>) : <FaSort className="ml-1 opacity-30"/>}
                       </div>
                    </th>
                    {/* Total Header (Sortable) */}
                    <th scope="col" className="px-2 py-2 text-center text-xs font-medium text-slate-300 uppercase tracking-wider cursor-pointer hover:bg-slate-600/50 w-12" onClick={() => handleSort('totalScore')}>
                       <div className="flex items-center justify-center">
                         {t('gameStatsModal.totalHeader', 'Pts')}
                         {sortColumn === 'totalScore' ? (sortDirection === 'asc' ? <FaSortUp className="ml-1"/> : <FaSortDown className="ml-1"/>) : <FaSort className="ml-1 opacity-30"/>}
                       </div>
                    </th>
                  </tr></thead>
                  <tbody className="bg-slate-800 divide-y divide-slate-700">
                    {filteredAndSortedPlayerStats.length > 0 ? (
                       filteredAndSortedPlayerStats.map((player) => (
                        <tr key={player.id} className="border-b border-slate-700 hover:bg-slate-700/50">
                          {/* Player Name Cell - Same settings */}
                          <td className="py-1 px-3 text-xs text-slate-200 whitespace-nowrap">
                            {player.name}
                            {/* Goalie indicator */}
                            {player.isGoalie && (
                              <span
                                className="inline-block ml-1.5 px-1 py-0.5 text-[9px] font-bold leading-none bg-amber-500 text-white rounded-sm align-middle"
                                title={t('statsModal.goalieIndicator', 'Goalie')}
                              >
                                G
                              </span>
                            )}
                            {/* Fair Play indicator */}
                            {player.receivedFairPlayCard && (
                              <span
                                className="inline-block ml-1.5 px-1 py-0.5 text-[9px] font-bold leading-none bg-emerald-500 text-white rounded-sm align-middle"
                                title={t('statsModal.fairPlayAwarded', 'Fair Play Award')}
                              >
                                FP
                              </span>
                            )}
                          </td>
                          {/* Stats Cells - Same smaller font/padding */}
                          <td className="py-1 px-3 text-xs text-slate-300 text-center">{player.goals}</td>
                          <td className="py-1 px-3 text-xs text-slate-300 text-center">{player.assists}</td>
                          <td className="py-1 px-3 text-xs text-slate-300 text-center font-semibold">{player.totalScore}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        {/* No results row - Smaller font/padding */}
                        <td colSpan={4} className="px-3 py-2 text-center text-xs text-slate-400 italic">
                          {filterText ? t('gameStatsModal.noPlayersMatchFilter', 'No players match filter') : t('gameStatsModal.noPlayersYet', 'No players available')}
                        </td>
                      </tr>
                    )}
                     {/* Add a row for totals if desired */}
                     {/* <tr className="bg-slate-700/50 font-bold">
                         <td className="px-4 py-2 text-left text-sm uppercase">Total</td>
                         <td className="px-4 py-2 text-center text-sm">{playerStats.reduce((sum, p) => sum + p.goals, 0)}</td>
                         <td className="px-4 py-2 text-center text-sm">{playerStats.reduce((sum, p) => sum + p.assists, 0)}</td>
                         <td className="px-4 py-2 text-center text-sm">{playerStats.reduce((sum, p) => sum + p.totalScore, 0)}</td>
                     </tr> */}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Goal Log Section */}
            <section>
              <h3 className="text-xl font-semibold mb-2 text-yellow-300 text-center">
                {t('gameStatsModal.goalLogTitle', 'Goal Log')}
              </h3>
              {sortedGoals.length > 0 ? (
                <ul className="space-y-1.5 text-sm max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700 pr-1">
                  {sortedGoals.map(goal => (
                    <li key={goal.id} className={`p-2 rounded-md flex justify-between items-center min-h-[40px] ${goal.type === 'opponentGoal' ? 'bg-red-900/40' : 'bg-slate-700/50'}`}>
                      {editingGoalId === goal.id && goal.type === 'goal' ? (
                        // --- Edit Own Goal Mode ---
                        <div className="flex-grow space-y-2" onKeyDown={handleGoalEditKeyDown}>
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Time Input */}
                            <input 
                              ref={goalTimeInputRef}
                              type="number"
                              min="0"
                              value={editGoalTime}
                              onChange={(e) => setEditGoalTime(e.target.value)}
                              className="bg-slate-600 border border-indigo-500 rounded px-1 py-0.5 text-sm w-16 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              placeholder={t('gameStatsModal.timePlaceholder', 'Secs') ?? "Secs"}
                            />
                            {/* Scorer Select */}
                            <select 
                              value={editGoalScorerId}
                              onChange={(e) => setEditGoalScorerId(e.target.value)}
                              className="bg-slate-600 border border-indigo-500 rounded px-1 py-0.5 text-sm min-w-[100px] max-w-[150px]"
                            >
                              <option value="" disabled>{t('gameStatsModal.selectScorer', 'Scorer...')}</option>
                              {availablePlayers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                            {/* Assister Select */}
                            <select 
                              value={editGoalAssisterId || ''} // Use empty string for "None"
                              onChange={(e) => setEditGoalAssisterId(e.target.value || undefined)} // Set undefined if empty string
                              className="bg-slate-600 border border-indigo-500 rounded px-1 py-0.5 text-sm min-w-[100px] max-w-[150px]"
                            >
                               <option value="">{t('gameStatsModal.selectAssister', 'Assister (None)')}</option>
                               {availablePlayers.filter(p => p.id !== editGoalScorerId).map(p => <option key={p.id} value={p.id}>{p.name}</option>)} {/* Exclude scorer */}
                            </select>
                          </div>
                          <div className="flex justify-end gap-2">
                             <button onClick={handleCancelEditGoal} className="p-1 text-slate-400 hover:text-red-400" title={t('gameStatsModal.cancelButton', 'Cancel') ?? "Cancel"}><FaTimes /></button>
                             <button onClick={handleSaveEditGoal} className="p-1 text-slate-400 hover:text-green-400" title={t('gameStatsModal.saveButton', 'Save') ?? "Save"}><FaSave /></button>
                          </div>
                        </div>
                      ) : (
                        // --- View Goal Mode (Own or Opponent) ---
                        <>
                          <span className="font-mono text-slate-400 mr-2">[{formatTime(goal.time)}]</span>
                          <span className={`text-right flex-grow mr-2 ${goal.type === 'opponentGoal' ? 'text-red-400' : 'text-yellow-300'}`}>
                            <span className="font-semibold">{goal.scorerName}</span>
                            {goal.type === 'goal' && goal.assisterName && (
                              <span className="text-slate-400 text-xs ml-1">({t('gameStatsModal.assistPrefix', 'A:')} {goal.assisterName})</span>
                            )}
                          </span>
                          {goal.type === 'goal' && (
                              <button 
                                onClick={() => handleStartEditGoal(goal)}
                                className="p-1 text-slate-400 hover:text-yellow-300" 
                                title={t('gameStatsModal.editGoalButton', 'Edit Goal') ?? "Edit Goal"}
                              >
                                 <FaEdit />
                              </button>
                          )}
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-slate-400 italic text-sm">{t('gameStatsModal.noGoalsLogged', 'No goals logged yet.')}</p>
              )}
            </section>

          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      {/* Modal Content Wrapper - Adjusted max-height and added flex-col */}
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl border border-slate-600 max-h-[calc(100vh-theme(space.8))] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-xl font-semibold text-yellow-300">
            {t('gameStatsModal.title', 'Game Statistics')}
          </h2>
          {/* Close Button */}
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition-colors p-1 rounded-full hover:bg-slate-700"
            aria-label={t('common.close', 'Close')}
          >
            <FaTimes size={18} />
          </button>
        </div>

        {/* Tab Buttons */} 
        <div className="flex border-b border-slate-700 bg-slate-800/50 px-2 pt-2">
          {['current', 'season', 'tournament', 'all'].map((tab) => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-4 py-2 text-sm font-medium rounded-t-md focus:outline-none transition-colors duration-150 ${ 
                activeTab === tab 
                ? 'bg-slate-700/50 text-yellow-300 border-b-2 border-yellow-400' 
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-700/30'
              }`}
            >
              {t(`gameStatsModal.tab_${tab}`, tab.charAt(0).toUpperCase() + tab.slice(1))}
            </button>
          ))}
        </div>

        {/* Modal Body - Renders active tab content */}
        <div className="p-4 overflow-y-auto flex-grow scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700">
          {renderTabContent()}
        </div>

        {/* Modal Footer (Optional) */}
        {/* If you need footer buttons specific to the modal (not tabs), add them here */}
        {/* Example: 
        <div className="p-3 bg-slate-900 border-t border-slate-700 flex justify-end space-x-2">
          <button onClick={onClose} className="px-3 py-1.5 bg-slate-600 text-white rounded hover:bg-slate-500 transition duration-150 text-xs">
            {t('gameStatsModal.closeButton', 'Close')}
          </button>
        </div>
        */}
      </div>
    </div>
  );
};

export default GameStatsModal;