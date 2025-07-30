'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { SavedGamesCollection } from '@/types'; // Keep this if SavedGamesCollection is from here
import { Season, Tournament } from '@/types'; // Corrected import path
import logger from '@/utils/logger';
import {
  HiOutlineDocumentArrowDown,
  HiOutlineEllipsisVertical,
  HiOutlineTrash,
  HiOutlineDocumentText,
  HiOutlineTableCells,
  HiOutlineClock,
  HiOutlineMapPin,
  HiOutlineMagnifyingGlass,
  HiOutlineChevronDown,
  HiOutlineChevronUp,
  HiCheckCircle,
  HiXCircle
} from 'react-icons/hi2';
// REMOVE unused Fa icons and useGameState hook
// import { FaTimes, FaUpload, FaDownload, FaTrash, FaExclamationTriangle, FaSearch } from 'react-icons/fa';
// import { useGameState } from '@/hooks/useGameState';
// Backup functionality moved to SettingsModal
// Import new utility functions
import { getSeasons as utilGetSeasons } from '@/utils/seasons';
import { getTournaments as utilGetTournaments } from '@/utils/tournaments';

export interface LoadGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedGames: SavedGamesCollection;
  onLoad: (gameId: string) => void;
  onDelete: (gameId: string) => void;
  onExportOneJson: (gameId: string) => void;
  onExportOneCsv: (gameId: string) => void;
  currentGameId?: string;

  isLoadingGamesList?: boolean;
  loadGamesListError?: string | null;
  isGameLoading?: boolean;
  gameLoadError?: string | null;
  isGameDeleting?: boolean;
  gameDeleteError?: string | null;
  isGamesImporting?: boolean;
  processingGameId?: string | null;
}

// Define the default game ID constant if not imported (consider sharing from page.tsx)
const DEFAULT_GAME_ID = '__default_unsaved__'; 

const LoadGameModal: React.FC<LoadGameModalProps> = ({
  isOpen,
  onClose,
  savedGames,
  onLoad,
  onDelete,
  onExportOneJson,
  onExportOneCsv,
  currentGameId,
  isLoadingGamesList = false,
  loadGamesListError = null,
  isGameLoading = false,
  gameLoadError = null,
  isGameDeleting = false,
  gameDeleteError = null,
  isGamesImporting = false,
  processingGameId = null,
}) => {
  const { t, i18n } = useTranslation();
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>('');
  const [filterType, setFilterType] = useState<'season' | 'tournament' | null>(null);
  const [filterId, setFilterId] = useState<string | null>(null);
  const [showUnplayedOnly, setShowUnplayedOnly] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // State for seasons and tournaments
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);

  // Load seasons and tournaments on mount or when modal opens
  useEffect(() => {
    if (isOpen) {
      const fetchModalData = async () => {
      try {
          const loadedSeasonsData = await utilGetSeasons();
          setSeasons(Array.isArray(loadedSeasonsData) ? loadedSeasonsData : []);
        } catch (error) {
        logger.error("Error loading seasons via utility:", error);
        setSeasons([]); 
      }
      try {
          const loadedTournamentsData = await utilGetTournaments();
          setTournaments(Array.isArray(loadedTournamentsData) ? loadedTournamentsData : []);
        } catch (error) {
        logger.error("Error loading tournaments via utility:", error);
        setTournaments([]);
      }
      };
      fetchModalData();
    }
  }, [isOpen]);

  // Filter logic updated to only use searchText
  const filteredGameIds = useMemo(() => {
    const initialIds = Object.keys(savedGames).filter(id => id !== DEFAULT_GAME_ID);
    
    const filteredBySearch = initialIds.filter(id => { 
      const gameData = savedGames[id];
      if (!gameData) return false;
      if (!searchText) return true;
      const lowerSearchText = searchText.toLowerCase();
      const teamName = (gameData.teamName || '').toLowerCase();
      const opponentName = (gameData.opponentName || '').toLowerCase();
      const gameDate = (gameData.gameDate || '').toLowerCase();
      const seasonName = seasons.find(s => s.id === gameData.seasonId)?.name.toLowerCase() || '';
      const tournamentName = tournaments.find(tourn => tourn.id === gameData.tournamentId)?.name.toLowerCase() || '';
      return (
        teamName.includes(lowerSearchText) ||
        opponentName.includes(lowerSearchText) ||
        gameDate.includes(lowerSearchText) ||
        seasonName.includes(lowerSearchText) ||
        tournamentName.includes(lowerSearchText)
      );
    });

    const filteredByBadge = filteredBySearch.filter(id => {
      if (!filterType || !filterId) return true;
      const gameData = savedGames[id];
      if (!gameData) return false;

      let match = false;
      if (filterType === 'season') {
        match = gameData.seasonId === filterId;
      }
      if (filterType === 'tournament') {
        match = gameData.tournamentId === filterId;
      }

      return match;
    });

    const filteredByPlayed = filteredByBadge.filter(id => {
      if (!showUnplayedOnly) return true;
      const gameData = savedGames[id];
      if (!gameData) return false;
      return gameData.isPlayed === false;
    });

    const sortedIds = filteredByPlayed.sort((a, b) => {
      const gameA = savedGames[a];
      const gameB = savedGames[b];
      
      // Primary sort: by date in descending order (newest first)
      const dateA = gameA.gameDate ? new Date(gameA.gameDate).getTime() : 0;
      const dateB = gameB.gameDate ? new Date(gameB.gameDate).getTime() : 0;

      if (dateB !== dateA) {
        // Handle cases where one date is missing (put games without date last)
        if (!dateA) return 1;
        if (!dateB) return -1;
        return dateB - dateA;
      }

      // Secondary sort: by timestamp in game ID (descending, newest first)
      // Extract timestamp assuming format "game_TIMESTAMP_RANDOM"
      try {
        const timestampA = parseInt(a.split('_')[1], 10);
        const timestampB = parseInt(b.split('_')[1], 10);
        
        if (!isNaN(timestampA) && !isNaN(timestampB)) {
          return timestampB - timestampA;
        }
      } catch (error) {
        logger.warn("Could not parse timestamps from game IDs for secondary sort:", a, b, error);
      }
      
      // Fallback if dates are equal and timestamps can't be parsed
      return 0; 
    });
    return sortedIds;
  }, [savedGames, searchText, seasons, tournaments, filterType, filterId, showUnplayedOnly]);

  const handleDeleteClick = (gameId: string, gameName: string) => {
    // Use a confirmation dialog
    if (window.confirm(t('loadGameModal.deleteConfirm', `Are you sure you want to delete the saved game "{gameName}"? This action cannot be undone.`)?.replace('{gameName}', gameName))) {
      onDelete(gameId);
      setOpenMenuId(null); // Close menu after delete
    }
  };
  
  // Effect to close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  // --- Event Handlers ---
  const handleBadgeClick = (type: 'season' | 'tournament', id: string) => {
    if (filterType === type && filterId === id) {
      // Clicked the currently active filter badge, so clear it
      setFilterType(null);
      setFilterId(null);
    } else {
      // Set new filter
      setFilterType(type);
      setFilterId(id);
    }
  };
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newSearchText = e.target.value;
    setSearchText(newSearchText);
    // If search text is cleared, also clear badge filter
    if (!newSearchText) {
      setFilterType(null);
      setFilterId(null);
    }
  };

  // Backup/restore functionality moved to SettingsModal

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  if (!isOpen) return null;

  // Scrollable Content Area
  // Main content: List of saved games or loading/error message
  let mainContent;
  if (isLoadingGamesList) {
    console.log('[LoadGameModal] Games list is loading...');
    mainContent = (
      <div className="flex flex-col items-center justify-center h-full text-slate-400 py-10">
        <svg className="animate-spin h-8 w-8 text-indigo-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p>{t('loadGameModal.loadingGames', 'Loading saved games...')}</p>
      </div>
    );
  } else if (loadGamesListError) {
    mainContent = (
      <div className="bg-red-700/20 border border-red-600 text-red-300 px-4 py-3 rounded-md text-sm my-4 mx-2" role="alert">
        <p className="font-semibold mb-1">{t('common.error', 'Error')}:</p>
        <p>{loadGamesListError}</p>
      </div>
    );
  } else if (filteredGameIds.length === 0) {
    const hasFilters = searchText || (filterType && filterId);
    mainContent = (
      <div className="text-center text-slate-500 py-10 italic">
        {hasFilters ? 
          t('loadGameModal.noGamesMatchFilter', 'No saved games match your filter.') :
          t('loadGameModal.noGamesSaved', 'No games have been saved yet.')
        }
      </div>
    );
  } else {
    mainContent = (
      <ul className="scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 pr-1 px-1">
        {/* Display general game load/delete errors here, above the list but inside scroll area if many games */}
        {gameLoadError && processingGameId === null && ( // Show if error is general, not for a specific item in loop
          <li className="px-3 py-2 bg-red-700/20 border-b border-red-600 text-red-300 text-xs" role="alert">
            {gameLoadError}
          </li>
        )}
        {gameDeleteError && processingGameId === null && (
          <li className="px-3 py-2 bg-red-700/20 border-b border-red-600 text-red-300 text-xs" role="alert">
            {gameDeleteError}
          </li>
        )}
        {filteredGameIds.map((gameId) => {
          const game = savedGames[gameId];
          if (!game) return null;
          const isCurrent = gameId === currentGameId;

          // Find Season/Tournament Name
          const season = seasons.find(s => s.id === game.seasonId);
          const tournament = tournaments.find(tourn => tourn.id === game.tournamentId);
          const contextName = season?.name || tournament?.name;
          const contextType = season ? 'Season' : (tournament ? 'Tournament' : null);
          const contextId = season?.id || tournament?.id;
          
          // Determine display names based on the specific game's homeOrAway setting
          const displayHomeTeamName = game.homeOrAway === 'home' ? (game.teamName || 'Team') : (game.opponentName || 'Opponent');
          const displayAwayTeamName = game.homeOrAway === 'home' ? (game.opponentName || 'Opponent') : (game.teamName || 'Team');

          const isProcessingThisGame = processingGameId === gameId;
          const isLoadActionActive = isGameLoading && isProcessingThisGame;
          const disableActions = isGameLoading || isGameDeleting || isGamesImporting;

          // Get game status
          const gameStatus = game.gameStatus || 'notStarted';
          const totalPlayers = game.selectedPlayerIds?.length || 0;
          const assessmentsDone = Object.keys(game.assessments || {}).length;
          const assessmentsComplete = totalPlayers > 0 && assessmentsDone >= totalPlayers;
          const isExpanded = expandedIds.has(gameId);
          const getResultColor = () => {
            if (game.homeScore > game.awayScore) {
              return game.homeOrAway === 'home' ? 'bg-green-500' : 'bg-red-500';
            }
            if (game.awayScore > game.homeScore) {
              return game.homeOrAway === 'home' ? 'bg-red-500' : 'bg-green-500';
            }
            return 'bg-gray-500';
          };

          return (
            <li
              key={gameId}
              className="relative mb-4 last:mb-0"
              data-testid={`game-item-${gameId}`}
            >
              {/* Premium Game Card */}
              <div className={`relative overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 via-slate-750 to-slate-800 border border-slate-600/50 shadow-2xl transition-all duration-300 hover:shadow-3xl hover:scale-[1.02] hover:border-slate-500/70 ${
                isCurrent ? 'ring-2 ring-yellow-400/60 shadow-yellow-400/20 border-yellow-400/30' : ''
              }`}>
                
                {/* Card Header with Result Stripe */}
                <div className={`absolute top-0 inset-x-0 h-1.5 ${getResultColor()}`} />
                
                {/* Background Texture and Gradients */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/15 via-transparent to-purple-600/15 opacity-60" />
                <div className="absolute inset-0 bg-noise-texture opacity-30" />
                
                {/* Enhanced contrast overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/20 via-transparent to-slate-700/10" />
                
                {/* Current Game Glow Effect */}
                {isCurrent && (
                  <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/10 via-transparent to-yellow-400/10 animate-pulse" />
                )}
                
                {/* Main Card Content */}
                <button
                  type="button"
                  onClick={() => toggleExpanded(gameId)}
                  aria-expanded={isExpanded}
                  aria-label={isExpanded ? t('loadGameModal.collapseCard', 'Collapse details') : t('loadGameModal.expandCard', 'Expand details')}
                  className="relative w-full p-6 text-left group"
                >
                  {/* Match Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      {/* Team Names */}
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className={`text-xl font-bold tracking-wide ${isCurrent ? 'text-yellow-400' : 'text-white'} drop-shadow-lg`}>
                          {displayHomeTeamName}
                        </h3>
                        <span className="text-slate-400 font-medium text-lg">vs</span>
                        <h3 className={`text-xl font-bold tracking-wide ${isCurrent ? 'text-yellow-400' : 'text-white'} drop-shadow-lg`}>
                          {displayAwayTeamName}
                        </h3>
                      </div>
                      
                      {/* Date and Time Info */}
                      <div className="flex items-center gap-4 text-sm text-slate-300 mb-3">
                        {game.gameDate && (
                          <span className="flex items-center gap-1.5 bg-slate-700/50 px-3 py-1 rounded-full">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(game.gameDate).toLocaleDateString(i18n.language)}
                          </span>
                        )}
                        {game.gameTime && (
                          <span className="flex items-center gap-1.5 bg-slate-700/50 px-3 py-1 rounded-full">
                            <HiOutlineClock className="w-4 h-4" />
                            {game.gameTime}
                          </span>
                        )}
                        {game.gameLocation && (
                          <span className="flex items-center gap-1.5 bg-slate-700/50 px-3 py-1 rounded-full">
                            <HiOutlineMapPin className="w-4 h-4" />
                            {game.gameLocation}
                          </span>
                        )}
                      </div>
                      
                      {/* Status Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {contextName && contextType && contextId && (
                          <span
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                e.stopPropagation();
                                handleBadgeClick(contextType.toLowerCase() as ('season' | 'tournament'), contextId);
                              }
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBadgeClick(contextType.toLowerCase() as ('season' | 'tournament'), contextId);
                            }}
                            className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                              contextType.toLowerCase() === 'tournament' 
                                ? 'bg-gradient-to-r from-purple-600 to-purple-700 text-white shadow-lg shadow-purple-500/25' 
                                : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-500/25'
                            } hover:scale-105 hover:shadow-xl ${
                              filterType === contextType.toLowerCase() && filterId === contextId ? 'ring-2 ring-white/50' : ''
                            }`}
                            title={t('loadGameModal.filterByTooltip', 'Filter by {{name}}', { replace: { name: contextName } }) ?? `Filter by ${contextName}`}
                          >
                            {contextName}
                          </span>
                        )}
                        {gameStatus === 'inProgress' && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/25 animate-pulse">
                            Live
                          </span>
                        )}
                        {game.isPlayed === false && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/25">
                            {t('loadGameModal.unplayedBadge', 'Not Played')}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-lg shadow-green-500/30 animate-pulse">
                            <div className="w-2 h-2 bg-white rounded-full mr-2 animate-ping"></div>
                            {t('loadGameModal.currentlyLoaded', 'Active')}
                          </span>
                        )}
                        {totalPlayers > 0 && (
                          <span className="inline-flex items-center gap-1.5">
                            {assessmentsComplete ? (
                              <HiCheckCircle className="w-5 h-5 text-green-400" title={t('loadGameModal.assessmentsComplete', 'All assessments complete')} />
                            ) : (
                              <HiXCircle className="w-5 h-5 text-red-400" title={t('loadGameModal.assessmentsIncomplete', 'Assessments incomplete')} />
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Score Display */}
                    <div className="ml-6 flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-4xl font-black bg-gradient-to-r from-yellow-400 to-yellow-200 bg-clip-text text-transparent drop-shadow-2xl">
                          {game.homeScore ?? 0} - {game.awayScore ?? 0}
                        </div>
                        <div className="text-xs text-slate-400 uppercase tracking-wide font-medium mt-1">
                          Final Score
                        </div>
                      </div>
                      <div className="text-slate-400 group-hover:text-white transition-colors">
                        {isExpanded ? (
                          <HiOutlineChevronUp className="w-6 h-6" />
                        ) : (
                          <HiOutlineChevronDown className="w-6 h-6" />
                        )}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="relative border-t border-slate-600/60 bg-slate-800/60 backdrop-blur-sm">
                    <div className="p-6 space-y-6">
                      
                      {/* Game Notes */}
                      {game.gameNotes && (
                        <div className="bg-slate-600/40 rounded-lg p-4 border border-slate-500/40 shadow-lg">
                          <h4 className="text-sm font-semibold text-slate-200 mb-2 uppercase tracking-wide">Game Notes</h4>
                          <p className="text-slate-100 whitespace-pre-line leading-relaxed">{game.gameNotes}</p>
                        </div>
                      )}
                      
                      {/* Assessment Progress */}
                      {totalPlayers > 0 && (
                        <div className="bg-slate-600/40 rounded-lg p-4 border border-slate-500/40 shadow-lg">
                          <h4 className="text-sm font-semibold text-slate-200 mb-3 uppercase tracking-wide">Player Assessments</h4>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-slate-200 font-medium">
                              {t('loadGameModal.assessmentsProgress', `${assessmentsDone}/${totalPlayers} Complete`, { 
                                replace: { done: assessmentsDone.toString(), total: totalPlayers.toString() } 
                              })}
                            </span>
                            <span className="text-slate-400 text-sm">
                              {Math.round((assessmentsDone / totalPlayers) * 100)}%
                            </span>
                          </div>
                          <div className="w-full bg-slate-700/60 rounded-full h-3 overflow-hidden border border-slate-600/30">
                            <div 
                              className="h-3 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500 ease-out shadow-lg"
                              style={{ width: `${(assessmentsDone / totalPlayers) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex justify-between items-center">
                        <button
                          onClick={(e) => { e.stopPropagation(); onLoad(gameId); onClose(); }}
                          className={`inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/25 transition-all duration-200 hover:scale-105 hover:shadow-xl ${
                            isLoadActionActive ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                          disabled={disableActions || isLoadActionActive}
                        >
                          {isLoadActionActive ? (
                            <>
                              <svg className="animate-spin h-5 w-5 text-white mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Loading...
                            </>
                          ) : (
                            <>
                              <HiOutlineDocumentArrowDown className="h-5 w-5 mr-2" />
                              {t('loadGameModal.loadButton', 'Load Game')}
                            </>
                          )}
                        </button>
                        
                        {/* Options Menu */}
                        <div className="relative">
                          <button
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === gameId ? null : gameId); }}
                            className={`p-3 text-slate-400 hover:text-white hover:bg-slate-600/50 rounded-lg transition-all duration-200 hover:scale-105 ${
                              isLoadActionActive ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                            disabled={disableActions || isLoadActionActive}
                            title="More Options"
                          >
                            <HiOutlineEllipsisVertical className="h-6 w-6" />
                          </button>
                          
                          {openMenuId === gameId && (
                            <div
                              ref={menuRef}
                              data-testid={`game-item-menu-${gameId}`}
                              className="absolute right-0 z-30 mt-2 w-56 origin-top-right rounded-xl bg-slate-800/98 backdrop-blur-lg shadow-2xl ring-1 ring-white/20 border border-slate-600/60"
                            >
                              <div className="p-2">
                                <button 
                                  onClick={(e) => { e.stopPropagation(); onExportOneJson(gameId); setOpenMenuId(null); }} 
                                  className="group flex w-full items-center px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white rounded-lg transition-all duration-200"
                                >
                                  <HiOutlineDocumentText className="mr-3 h-5 w-5 text-slate-400 group-hover:text-white" />
                                  {t('loadGameModal.exportJsonMenuItem', 'Export as JSON')}
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); onExportOneCsv(gameId); setOpenMenuId(null); }} 
                                  className="group flex w-full items-center px-4 py-3 text-sm text-slate-300 hover:bg-slate-700/50 hover:text-white rounded-lg transition-all duration-200"
                                >
                                  <HiOutlineTableCells className="mr-3 h-5 w-5 text-slate-400 group-hover:text-white" />
                                  {t('loadGameModal.exportExcelMenuItem', 'Export as CSV')}
                                </button>
                                <div className="border-t border-slate-700/50 my-2"></div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteClick(gameId, `${game.teamName || 'Team'} vs ${game.opponentName || 'Opponent'}`); }} 
                                  className="group flex w-full items-center px-4 py-3 text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 rounded-lg transition-all duration-200"
                                >
                                  <HiOutlineTrash className="mr-3 h-5 w-5" />
                                  {t('loadGameModal.deleteMenuItem', 'Delete Game')}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Error Messages */}
                      {isProcessingThisGame && gameLoadError && (
                        <div className="bg-red-900/20 border border-red-600/30 text-red-300 px-4 py-3 rounded-lg text-sm animate-pulse">
                          <p className="font-medium">{gameLoadError}</p>
                        </div>
                      )}
                      {isProcessingThisGame && gameDeleteError && (
                        <div className="bg-red-900/20 border border-red-600/30 text-red-300 px-4 py-3 rounded-lg text-sm animate-pulse">
                          <p className="font-medium">{gameDeleteError}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] font-display">
      <div className="bg-slate-800 flex flex-col h-full w-full bg-noise-texture relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light pointer-events-none" />
        <div className="flex justify-center items-center pt-10 pb-4 px-6 backdrop-blur-sm bg-slate-900/20 border-b border-slate-700/20 flex-shrink-0">
          <h2 className="text-3xl font-bold text-yellow-400 tracking-wide drop-shadow-lg">{t('loadGameModal.title', 'Load Game')}</h2>
        </div>
        <div className="px-6 py-4 backdrop-blur-sm bg-slate-900/20 border-b border-slate-700/20 flex-shrink-0">
          <div className="relative">
            <input type="text" placeholder={t('loadGameModal.filterPlaceholder', 'Filter by name, date, etc...')} value={searchText} onChange={handleSearchChange} className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
            <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          </div>
          <label className="mt-2 flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={showUnplayedOnly}
              onChange={(e) => setShowUnplayedOnly(e.target.checked)}
              className="form-checkbox h-4 w-4 text-indigo-600 bg-slate-700 border-slate-500 rounded focus:ring-indigo-500 focus:ring-offset-slate-800"
            />
            {t('loadGameModal.showUnplayedOnly', 'Show only unplayed games')}
          </label>
        </div>
        <div className="flex-1 overflow-y-auto min-h-0 p-4 sm:p-6">
          {mainContent}
        </div>
        <div className="p-4 border-t border-slate-700/20 backdrop-blur-sm bg-slate-900/20 flex-shrink-0">
          <button onClick={onClose} className="w-full px-4 py-2 rounded-md font-semibold text-slate-200 bg-slate-700 hover:bg-slate-600 transition-colors">
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoadGameModal;
