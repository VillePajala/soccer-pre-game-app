'use client';

import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useTranslation } from 'react-i18next';
import type { Player, PlayerStatRow, Season, Tournament, GameEvent, SavedGamesCollection } from '@/types';
import { getSeasons as utilGetSeasons } from '@/utils/seasons';
import { getTournaments as utilGetTournaments } from '@/utils/tournaments';
import { usePlayerStats } from '@/hooks/usePlayerStats';
import type { StatsTab, SortableColumn, SortDirection } from './types';

// Lazy load tab components for code splitting optimization
const CurrentGameStats = lazy(() => import('./CurrentGameStats'));
const SeasonStats = lazy(() => import('./SeasonStats'));
const TournamentStats = lazy(() => import('./TournamentStats'));
const OverallStats = lazy(() => import('./OverallStats'));
const PlayerStats = lazy(() => import('./PlayerStats'));

// Loading skeleton component
const TabSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-4 bg-slate-200 rounded w-3/4"></div>
    <div className="space-y-2">
      <div className="h-3 bg-slate-200 rounded"></div>
      <div className="h-3 bg-slate-200 rounded w-5/6"></div>
      <div className="h-3 bg-slate-200 rounded w-4/6"></div>
    </div>
  </div>
);

interface GameStatsModalProps {
  onClose: () => void;
  players: Player[];
  gameEvents: GameEvent[];
  gameNotes?: string;
  onGameNotesChange?: (notes: string) => void;
  onUpdateGameEvent?: (updatedEvent: GameEvent) => void;
  selectedPlayerIds: string[];
  savedGames: SavedGamesCollection;
  currentGameId: string | null;
  onExportOneJson?: (gameId: string) => void;
  onExportOneCsv?: (gameId: string) => void;
  onExportAggregateJson?: (gameIds: string[], playerStats: PlayerStatRow[]) => void;
  onExportAggregateCsv?: (gameIds: string[], playerStats: PlayerStatRow[]) => void;
}

/**
 * Optimized GameStatsModal with micro-component splitting and lazy loading
 * Implements Phase 3 Component Architecture Optimization
 */
const GameStatsModalNew: React.FC<GameStatsModalProps> = ({
  onClose,
  players,
  gameEvents,
  gameNotes,
  onGameNotesChange,
  onUpdateGameEvent,
  selectedPlayerIds,
  savedGames,
  currentGameId,
  onExportOneJson,
  onExportOneCsv,
  onExportAggregateJson,
  onExportAggregateCsv,
}) => {
  const { t } = useTranslation();

  // State management
  const [activeTab, setActiveTab] = useState<StatsTab>('currentGame');
  const [sortColumn, setSortColumn] = useState<SortableColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedSeasonIdFilter, setSelectedSeasonIdFilter] = useState<string | null>(null);
  const [selectedTournamentIdFilter, setSelectedTournamentIdFilter] = useState<string | null>(null);

  // Hooks for statistics data
  const { stats: playerStats } = usePlayerStats({
    activeTab,
    availablePlayers: players,
    selectedPlayerIds,
    localGameEvents: gameEvents,
    savedGames,
    currentGameId,
    selectedSeasonIdFilter: selectedSeasonIdFilter || 'all',
    selectedTournamentIdFilter: selectedTournamentIdFilter || 'all',
    sortColumn,
    sortDirection,
    filterText: '',
  });

  // Load seasons and tournaments
  useEffect(() => {
    const loadData = async () => {
      try {
        const [seasonsData, tournamentsData] = await Promise.all([
          utilGetSeasons(),
          utilGetTournaments(),
        ]);
        setSeasons(seasonsData || []);
        setTournaments(tournamentsData || []);
      } catch (error) {
        console.error('[GameStatsModal] Failed to load seasons/tournaments:', error);
        setSeasons([]);
        setTournaments([]);
      }
    };

    if (activeTab === 'season' || activeTab === 'tournament') {
      loadData();
    }
  }, [activeTab]);

  // Sort handler
  const handleSort = (column: SortableColumn) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  // Base props for all tab components
  const baseTabProps = {
    players,
    gameEvents,
    selectedPlayerIds,
    savedGames,
    currentGameId,
    playerStats,
    sortColumn,
    sortDirection,
    onSort: handleSort,
  };

  // Tab navigation items
  const tabs = [
    { id: 'currentGame', label: t('gameStatsModal.currentGame', 'Current Game') },
    { id: 'season', label: t('gameStatsModal.seasonStats', 'Season Stats') },
    { id: 'tournament', label: t('gameStatsModal.tournamentStats', 'Tournament Stats') },
    { id: 'overall', label: t('gameStatsModal.overallStats', 'Overall Stats') },
    { id: 'player', label: t('gameStatsModal.playerStats', 'Player Stats') },
  ] as const;

  // Render active tab content with lazy loading
  const renderTabContent = () => {
    switch (activeTab) {
      case 'currentGame':
        return (
          <CurrentGameStats
            {...baseTabProps}
            gameNotes={gameNotes}
            onGameNotesChange={onGameNotesChange}
            onUpdateGameEvent={onUpdateGameEvent}
            onExportOneJson={onExportOneJson}
            onExportOneCsv={onExportOneCsv}
          />
        );
      case 'season':
        return (
          <SeasonStats
            {...baseTabProps}
            seasons={seasons}
            selectedSeasonIdFilter={selectedSeasonIdFilter}
            onSeasonFilterChange={setSelectedSeasonIdFilter}
            onExportAggregateCsv={onExportAggregateCsv}
            onExportAggregateJson={onExportAggregateJson}
          />
        );
      case 'tournament':
        return (
          <TournamentStats
            {...baseTabProps}
            tournaments={tournaments}
            selectedTournamentIdFilter={selectedTournamentIdFilter}
            onTournamentFilterChange={setSelectedTournamentIdFilter}
            onExportAggregateCsv={onExportAggregateCsv}
            onExportAggregateJson={onExportAggregateJson}
          />
        );
      case 'overall':
        return (
          <OverallStats
            {...baseTabProps}
            onExportAggregateCsv={onExportAggregateCsv}
            onExportAggregateJson={onExportAggregateJson}
          />
        );
      case 'player':
        return <PlayerStats {...baseTabProps} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">
              {t('gameStatsModal.title', 'Game Statistics')}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 transition-colors"
              aria-label={t('common.close', 'Close')}
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="mt-4">
            <nav className="flex space-x-1" aria-label="Tabs">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as StatsTab)}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Suspense fallback={<TabSkeleton />}>
            {renderTabContent()}
          </Suspense>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex justify-end flex-shrink-0">
          <button 
            onClick={onClose} 
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition-colors"
          >
            {t('common.doneButton', 'Done')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameStatsModalNew;