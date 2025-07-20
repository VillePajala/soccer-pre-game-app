'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Player, Season, Tournament } from '@/types';
import { HiPlusCircle } from 'react-icons/hi';
import logger from '@/utils/logger';
import { getSeasons as utilGetSeasons } from '@/utils/seasons';
import { getTournaments as utilGetTournaments } from '@/utils/tournaments';
import { getMasterRoster } from '@/utils/masterRosterManager';
import { getLastHomeTeamName as utilGetLastHomeTeamName, saveLastHomeTeamName as utilSaveLastHomeTeamName } from '@/utils/appSettings';
import { UseMutationResult } from '@tanstack/react-query';
import AssessmentSlider from './AssessmentSlider';
import { AGE_GROUPS, LEVELS } from '@/config/gameOptions';
import type { TranslationKey } from '@/i18n-types';

interface NewGameSetupModalProps {
  isOpen: boolean;
  initialPlayerSelection: string[] | null;
  demandFactor: number;
  onDemandFactorChange: (factor: number) => void;
  onStart: (
    initialSelectedPlayerIds: string[],
    homeTeamName: string,
    opponentName: string, 
    gameDate: string, 
    gameLocation: string, 
    gameTime: string,
    seasonId: string | null,
    tournamentId: string | null,
    numPeriods: 1 | 2,
    periodDuration: number,
    homeOrAway: 'home' | 'away',
    demandFactor: number,
    ageGroup: string,
    tournamentLevel: string,
    isPlayed: boolean
  ) => void;
  onCancel: () => void;
  addSeasonMutation: UseMutationResult<Season | null, Error, Partial<Season> & { name: string }, unknown>;
  addTournamentMutation: UseMutationResult<Tournament | null, Error, Partial<Tournament> & { name: string }, unknown>;
  isAddingSeason: boolean;
  isAddingTournament: boolean;
}

const NewGameSetupModal: React.FC<NewGameSetupModalProps> = ({
  isOpen,
  initialPlayerSelection,
  demandFactor,
  onDemandFactorChange,
  onStart,
  onCancel,
  addSeasonMutation,
  addTournamentMutation,
  isAddingSeason,
  isAddingTournament,
}) => {
  const { t } = useTranslation();
  const [homeTeamName, setHomeTeamName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);
  const [gameLocation, setGameLocation] = useState('');
  const [gameHour, setGameHour] = useState<string>('');
  const [gameMinute, setGameMinute] = useState<string>('');
  const [ageGroup, setAgeGroup] = useState('');
  const [tournamentLevel, setTournamentLevel] = useState('');
  const homeTeamInputRef = useRef<HTMLInputElement>(null);
  const opponentInputRef = useRef<HTMLInputElement>(null);

  // State for seasons and tournaments
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string | null>(null);

  // State for creating new season/tournament
  const [showNewSeasonInput, setShowNewSeasonInput] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const newSeasonInputRef = useRef<HTMLInputElement>(null);
  const [showNewTournamentInput, setShowNewTournamentInput] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');
  const newTournamentInputRef = useRef<HTMLInputElement>(null);

  // state for periods and duration
  const [localNumPeriods, setLocalNumPeriods] = useState<1 | 2>(2);
  const [localPeriodDurationString, setLocalPeriodDurationString] = useState<string>('10');

  // <<< Step 4a: State for Home/Away >>>
  const [localHomeOrAway, setLocalHomeOrAway] = useState<'home' | 'away'>('home');
  const [isPlayed, setIsPlayed] = useState<boolean>(true);

  // MOVED state declarations for availablePlayersForSetup and selectedPlayerIds here
  const [availablePlayersForSetup, setAvailablePlayersForSetup] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(initialPlayerSelection || []);

  // NEW: Loading and error states for initial data fetch
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Reinstate form reset logic
      setOpponentName('');
      setGameDate(new Date().toISOString().split('T')[0]);
      setGameLocation('');
      setGameHour('');
      setGameMinute('');
      setSelectedSeasonId(null);
      setSelectedTournamentId(null);
      setShowNewSeasonInput(false);
      setNewSeasonName('');
      setShowNewTournamentInput(false);
      setNewTournamentName('');
      setLocalNumPeriods(2);
      setLocalPeriodDurationString('10');
      setLocalHomeOrAway('home');
      // End of reinstated form reset logic

      setError(null); 
      setIsLoading(true);

      // Focus on the first input field (home team name)
      // This should ideally happen after initial data load or if not loading
      // For now, keeping original simple focus logic, can be refined if race conditions occur.
      setTimeout(() => homeTeamInputRef.current?.focus(), 100); 

      const fetchData = async () => {
      try {
          const roster: Player[] = await getMasterRoster();
          setAvailablePlayersForSetup(roster || []);
          if (initialPlayerSelection && initialPlayerSelection.length > 0) {
            setSelectedPlayerIds(initialPlayerSelection);
          } else if (roster && roster.length > 0) {
            setSelectedPlayerIds(roster.map(p => p.id));
          }

          const lastHomeTeam = await utilGetLastHomeTeamName();
          setHomeTeamName(lastHomeTeam || t('newGameSetupModal.defaultTeamName', 'My Team'));

          const seasonsData = await utilGetSeasons();
          setSeasons(Array.isArray(seasonsData) ? seasonsData : []);

          const tournamentsData = await utilGetTournaments();
          setTournaments(Array.isArray(tournamentsData) ? tournamentsData : []);

          // MOVED Focus to run earlier, but can be adjusted if data loading causes issues with it.
          // setTimeout(() => nameInputRef.current?.focus(), 100); 
        } catch (err) {
          logger.error("[NewGameSetupModal] Error fetching initial data:", err);
          setError(t('newGameSetupModal.errors.dataLoadFailed', 'Failed to load initial setup data. Please try again.'));
          setHomeTeamName(t('newGameSetupModal.defaultTeamName', 'My Team'));
          setSeasons([]);
          setTournaments([]);
          setAvailablePlayersForSetup([]); // Reset on error too
          setSelectedPlayerIds(initialPlayerSelection || []); // Reset selection on error
        } finally {
          setIsLoading(false);
        }
      };
      fetchData();
    }
  }, [isOpen, initialPlayerSelection, t]);

  // ADD Handler for toggling player selection
  const handlePlayerSelectionToggle = (playerId: string) => {
    setSelectedPlayerIds(prevSelectedIds => {
      if (prevSelectedIds.includes(playerId)) {
        return prevSelectedIds.filter(id => id !== playerId);
    }
      return [...prevSelectedIds, playerId];
    });
  };

  const handleSeasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      setSelectedSeasonId(value);
      setSelectedTournamentId(null);
      setShowNewSeasonInput(false); // Hide create input if selecting existing
      setNewSeasonName('');
    } else {
      setSelectedSeasonId(null);
    }
  };

  useEffect(() => {
    if (selectedSeasonId) {
      const s = seasons.find(se => se.id === selectedSeasonId);
      if (s) {
        setGameLocation(s.location || '');
        setAgeGroup(s.ageGroup || '');
        setLocalNumPeriods((s.periodCount as 1 | 2) || 2);
        setLocalPeriodDurationString(s.periodDuration ? String(s.periodDuration) : '10');
        if (s.defaultRoster && s.defaultRoster.length > 0) {
          setSelectedPlayerIds(s.defaultRoster);
        }
      }
    }
  }, [selectedSeasonId, seasons, availablePlayersForSetup]);

  const handleTournamentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      setSelectedTournamentId(value);
      setSelectedSeasonId(null);
      setShowNewTournamentInput(false); // Hide create input if selecting existing
      setNewTournamentName('');
    } else {
      setSelectedTournamentId(null);
    }
  };

  useEffect(() => {
    if (selectedTournamentId) {
      const t = tournaments.find(tt => tt.id === selectedTournamentId);
      if (t) {
        setGameLocation(t.location || '');
        setAgeGroup(t.ageGroup || '');
        setTournamentLevel(t.level || '');
        setLocalNumPeriods((t.periodCount as 1 | 2) || 2);
        setLocalPeriodDurationString(t.periodDuration ? String(t.periodDuration) : '10');
        if (t.defaultRoster && t.defaultRoster.length > 0) {
          setSelectedPlayerIds(t.defaultRoster);
        }
      }
    }
  }, [selectedTournamentId, tournaments, availablePlayersForSetup]);

  // --- Handlers for Create New Buttons ---
  const handleShowCreateSeason = () => {
    setShowNewSeasonInput(true);
    setSelectedSeasonId(null); // Deselect any existing season
    setSelectedTournamentId(null); // Ensure tournament is also deselected
  };

  const handleShowCreateTournament = () => {
    setShowNewTournamentInput(true);
    setSelectedTournamentId(null); // Deselect any existing tournament
    setSelectedSeasonId(null); // Ensure season is also deselected
  };

  // Implement Add New Season logic
  const handleAddNewSeason = async () => {
    const trimmedName = newSeasonName.trim();
    if (!trimmedName) {
      alert(t('newGameSetupModal.newSeasonNameRequired', 'Please enter a name for the new season.'));
      newSeasonInputRef.current?.focus();
      return;
    }

    try {
      // Use the mutation
      const newSeason = await addSeasonMutation.mutateAsync({ name: trimmedName });
      
      if (newSeason) {
        // onSuccess in page.tsx will invalidate and refetch seasons.
        // The local 'seasons' state in this modal will be updated by the useEffect 
        // that fetches seasons when the modal opens, or if we explicitly refetch here.
        // For now, we'll update the selection and UI, relying on eventual consistency.
        setSeasons(prevSeasons => [...prevSeasons, newSeason].sort((a, b) => a.name.localeCompare(b.name)));
        setSelectedSeasonId(newSeason.id);
        setSelectedTournamentId(null);
        setNewSeasonName(''); 
        setShowNewSeasonInput(false); 
        logger.log("Add season mutation initiated for:", newSeason.name);
        // No need to manually update 'seasons' state here if page.tsx invalidates
      } else {
        // This block might be reached if mutateAsync resolves but utilAddSeason returned null (e.g., duplicate)
        // The mutation's onSuccess/onError in page.tsx would have more context.
        logger.warn("addSeasonMutation.mutateAsync completed, but newSeason is null. Check mutation's onSuccess/onError for details.");
        // alert for duplicate is better handled by the mutation's error/success reporting if it returns a specific error or null for it
      }
    } catch (error) {
      // This catch is for errors from mutateAsync itself, if not handled by mutation's onError
      logger.error("Error calling addSeasonMutation.mutateAsync:", error);
      // alert(t('newGameSetupModal.errorAddingSeasonGeneric', 'Error initiating add season. See console.'));
      // The actual user-facing error for mutation failure should come from the mutation's onError handler in page.tsx
      newSeasonInputRef.current?.focus();
    }
  };

  // Implement Add New Tournament logic
  const handleAddNewTournament = async () => {
    const trimmedName = newTournamentName.trim();
    if (!trimmedName) {
      alert(t('newGameSetupModal.newTournamentNameRequired', 'Please enter a name for the new tournament.'));
      newTournamentInputRef.current?.focus();
      return;
    }

    try {
      // Use the mutation
      const newTournament = await addTournamentMutation.mutateAsync({ name: trimmedName });

      if (newTournament) {
        setTournaments(prevTournaments => [...prevTournaments, newTournament].sort((a,b) => a.name.localeCompare(b.name)));
        setSelectedTournamentId(newTournament.id); 
        setSelectedSeasonId(null); 
        setNewTournamentName(''); 
        setShowNewTournamentInput(false); 
        logger.log("Add tournament mutation initiated for:", newTournament.name);
        // No need to manually update 'tournaments' state here
      } else {
        logger.warn("addTournamentMutation.mutateAsync completed, but newTournament is null.");
      }
    } catch (error) {
      logger.error("Error calling addTournamentMutation.mutateAsync:", error);
      // alert(t('newGameSetupModal.errorAddingTournamentGeneric', 'Error initiating add tournament. See console.'));
      newTournamentInputRef.current?.focus();
    }
  };
  // --- End Handlers for Create New ---


  const handleStartClick = async () => {
    const trimmedHomeTeamName = homeTeamName.trim();
    const trimmedOpponentName = opponentName.trim();

    if (!trimmedHomeTeamName) {
      alert(t('newGameSetupModal.homeTeamNameRequired', 'Home Team Name is required.') || 'Home Team Name is required.');
      homeTeamInputRef.current?.focus();
      return;
    }

    if (!trimmedOpponentName) {
      alert(t('newGameSetupModal.opponentNameRequired', 'Opponent Name is required.') || 'Opponent Name is required.');
      opponentInputRef.current?.focus();
      return;
    }
    
    // Handle case where user is trying to submit while create input is open but empty
    if (showNewSeasonInput && !newSeasonName.trim()) {
        alert(t('newGameSetupModal.newSeasonNameRequired', 'Please enter a name for the new season or select an existing one.'));
        newSeasonInputRef.current?.focus();
        return;
    }
    if (showNewTournamentInput && !newTournamentName.trim()) {
        alert(t('newGameSetupModal.newTournamentNameRequired', 'Please enter a name for the new tournament or select an existing one.'));
        newTournamentInputRef.current?.focus();
        return;
    }

    if (selectedPlayerIds.length === 0) {
        alert(t('newGameSetupModal.noPlayersSelected', 'Please select at least one player.') || 'Please select at least one player.');
        return;
    }

    // Format game time properly
    const formattedHour = gameHour.padStart(2, '0');
    const formattedMinute = gameMinute.padStart(2, '0');
    const gameTime = (gameHour && gameMinute) ? `${formattedHour}:${formattedMinute}` : '';

    // Validate period duration
    const duration = parseInt(localPeriodDurationString, 10);
    if (isNaN(duration) || duration <= 0) {
        alert(t('newGameSetupModal.invalidPeriodDuration', 'Period duration must be a positive number.') || 'Period duration must be a positive number.');
        return;
    }
    
    // --- Save last used home team name using utility function ---
    try {
      await utilSaveLastHomeTeamName(trimmedHomeTeamName);
    } catch (error) {
      logger.error("Failed to save last home team name:", error);
      // Continue without blocking, as this is not critical for starting the game
    }
    // --- End Save ---

    // Call the onStart callback from props using the modal's internal selectedPlayerIds state
    onStart(
      selectedPlayerIds, // MODIFIED: Use the modal's current selection state
      trimmedHomeTeamName,
      trimmedOpponentName,
      gameDate,
      gameLocation.trim(),
      gameTime,
      selectedSeasonId,
      selectedTournamentId,
      localNumPeriods,
      duration, // use validated duration
      localHomeOrAway, // <<< Step 4a: Pass Home/Away >>>
      demandFactor,
      ageGroup,
      tournamentLevel,
      isPlayed
    );

    // Modal will be closed by parent component after onStart
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Allow Enter to submit only from main text inputs, not the create new inputs yet
    if (event.key === 'Enter' && !showNewSeasonInput && !showNewTournamentInput) {
        const target = event.target as HTMLElement;
        // Avoid submitting if focus is on dropdowns or buttons that might have their own Enter behavior
        if (target.tagName !== 'SELECT' && target.tagName !== 'BUTTON') {
            handleStartClick(); 
        }
    } else if (event.key === 'Escape') {
      onCancel();
    }
  };

  // Separate KeyDown handlers for the create new inputs
  const handleNewSeasonKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleAddNewSeason();
    } else if (event.key === 'Escape') {
      setShowNewSeasonInput(false);
      setNewSeasonName('');
    }
  };

  const handleNewTournamentKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      handleAddNewTournament();
    } else if (event.key === 'Escape') {
      setShowNewTournamentInput(false);
      setNewTournamentName('');
    }
  };

  // ... handleHourChange and handleMinuteChange functions ...
  const handleHourChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 2) {
      setGameHour(value);
    }
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length <= 2) {
      setGameMinute(value);
    }
  };

  if (!isOpen) return null;

  // Main content: Loading, Error, or Form
  let modalContent;
  if (isLoading) {
    modalContent = (
      <div className="flex flex-col items-center justify-center h-64 text-slate-400">
        <svg className="animate-spin h-8 w-8 text-indigo-400 mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p>{t('newGameSetupModal.loadingData', 'Loading setup data...')}</p>
      </div>
    );
  } else if (error) {
    modalContent = (
      <div className="bg-red-700/20 border border-red-600 text-red-300 px-4 py-3 rounded-md text-sm my-4 mx-2" role="alert">
        <p className="font-semibold mb-1">{t('common.error', 'Error')}:</p>
        <p>{error}</p>
        <button 
          onClick={() => { onCancel(); }}
          className="mt-3 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
        >
          {t('common.close', 'Close')}
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] font-display">
      <div className="bg-slate-800 rounded-none shadow-xl flex flex-col border-0 overflow-hidden h-full w-full bg-noise-texture relative">
        {/* Background effects */}
        <div className="absolute inset-0 bg-indigo-600/10 mix-blend-soft-light" />
        <div className="absolute inset-0 bg-gradient-to-b from-sky-400/10 via-transparent to-transparent" />
        <div className="absolute -inset-[50px] bg-sky-400/5 blur-2xl top-0 opacity-50" />
        <div className="absolute -inset-[50px] bg-indigo-600/5 blur-2xl bottom-0 opacity-50" />

        {/* Content wrapper */}
        <div className="relative z-10 flex flex-col min-h-0">
          {/* Fixed Header */}
          <div className="flex justify-center items-center pt-10 pb-4 backdrop-blur-sm bg-slate-900/20">
            <h2 className="text-3xl font-bold text-yellow-400 tracking-wide drop-shadow-lg">
              {t('newGameSetupModal.title', 'New Game Setup')}
            </h2>
          </div>

          {/* Fixed Controls Section */}
          <div className="px-6 pt-3 pb-4 backdrop-blur-sm bg-slate-900/20">
            {/* Home Team Name - Critical input that should always be visible */}
            <div className="mb-4">
              <label htmlFor="homeTeamName" className="block text-sm font-medium text-slate-300 mb-1">
                {t('newGameSetupModal.homeTeamName', 'Your Team Name')} *
              </label>
              <input
                type="text"
                id="homeTeamName"
                ref={homeTeamInputRef}
                value={homeTeamName}
                onChange={(e) => setHomeTeamName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                placeholder={t('newGameSetupModal.homeTeamPlaceholder', 'e.g., Galaxy U10')}
                onKeyDown={handleKeyDown}
                    disabled={isLoading}
                  />
                </div>


            {/* Opponent Name - Also critical */}
            <div className="mb-4">
              <label htmlFor="opponentNameInput" className="block text-sm font-medium text-slate-300 mb-1">
                {t('newGameSetupModal.opponentNameLabel', 'Opponent Name')} *
              </label>
              <input
                ref={opponentInputRef}
                type="text"
                id="opponentNameInput"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('newGameSetupModal.opponentPlaceholder', 'Enter opponent name')}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Scrollable Content Area */}
          <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4 space-y-4">
            {isLoading ? modalContent : (
              <>
                  {error ? (
                    modalContent
                  ) : (
                    <>

                    {/* Season & Tournament Section */}
                    <div className="space-y-4 bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
                      <h3 className="text-lg font-semibold text-slate-200 mb-3">
                        {t('newGameSetupModal.gameTypeLabel', 'Game Type')}
                      </h3>

                      {/* Season Selection */}
                      <div className="mb-4">
                        <label htmlFor="seasonSelect" className="block text-sm font-medium text-slate-300 mb-1">
                          {t('newGameSetupModal.seasonLabel', 'Season')}
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            id="seasonSelect"
                            value={selectedSeasonId || ''}
                            onChange={handleSeasonChange}
                            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                          >
                            <option value="">{t('newGameSetupModal.selectSeason', '-- Select Season --')}</option>
                            {seasons.map((season) => (
                              <option key={season.id} value={season.id}>
                                {season.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleShowCreateSeason}
                            className="p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                            title={showNewSeasonInput ? t('newGameSetupModal.cancelCreate', 'Cancel creation') : t('newGameSetupModal.createSeason', 'Create new season')}
                            disabled={isAddingSeason || isAddingTournament}
                          >
                            <HiPlusCircle className={`w-6 h-6 transition-transform ${showNewSeasonInput ? 'rotate-45' : ''}`} />
                          </button>
                        </div>
                        {showNewSeasonInput && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <input
                              ref={newSeasonInputRef}
                              type="text"
                              value={newSeasonName}
                              onChange={(e) => setNewSeasonName(e.target.value)}
                              onKeyDown={handleNewSeasonKeyDown}
                              placeholder={t('newGameSetupModal.newSeasonPlaceholder', 'Enter new season name...')}
                              className="flex-1 min-w-[200px] px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                              disabled={isAddingSeason}
                            />
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={handleAddNewSeason}
                                disabled={isAddingSeason || !newSeasonName.trim()}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm disabled:opacity-50 whitespace-nowrap"
                              >
                                {isAddingSeason ? t('newGameSetupModal.creating', 'Creating...') : t('newGameSetupModal.addButton', 'Add')}
                              </button>
                              <button
                                onClick={() => {
                                  setShowNewSeasonInput(false);
                                  setNewSeasonName('');
                                }}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md shadow-sm whitespace-nowrap"
                              >
                                {t('common.cancelButton', 'Cancel')}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Tournament Selection */}
                      <div className="mb-4">
                        <label htmlFor="tournamentSelect" className="block text-sm font-medium text-slate-300 mb-1">
                          {t('newGameSetupModal.tournamentLabel', 'Tournament')}
                        </label>
                        <div className="flex items-center gap-2">
                          <select
                            id="tournamentSelect"
                            value={selectedTournamentId || ''}
                            onChange={handleTournamentChange}
                            className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                          >
                            <option value="">{t('newGameSetupModal.selectTournament', '-- Select Tournament --')}</option>
                            {tournaments.map((tournament) => (
                              <option key={tournament.id} value={tournament.id}>
                                {tournament.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={handleShowCreateTournament}
                            className="p-2 text-indigo-400 hover:text-indigo-300 disabled:opacity-50"
                            title={showNewTournamentInput ? t('newGameSetupModal.cancelCreate', 'Cancel creation') : t('newGameSetupModal.createTournament', 'Create new tournament')}
                            disabled={isAddingSeason || isAddingTournament}
                          >
                          <HiPlusCircle className={`w-6 h-6 transition-transform ${showNewTournamentInput ? 'rotate-45' : ''}`} />
                          </button>
                        </div>
                        {selectedTournamentId && (
                          <div className="mt-2">
                            <label htmlFor="tournamentLevelInput" className="block text-sm font-medium text-slate-300 mb-1">
                              {t('newGameSetupModal.levelLabel', 'Level')}
                            </label>
                            <select
                              id="tournamentLevelInput"
                              value={tournamentLevel}
                              onChange={(e) => setTournamentLevel(e.target.value)}
                              onKeyDown={handleKeyDown}
                              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                              disabled={isLoading}
                            >
                              <option value="">{t('common.none', 'None')}</option>
                              {LEVELS.map((lvl) => (
                                <option key={lvl} value={lvl}>
                                  {t(`common.level${lvl}` as TranslationKey, lvl)}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {showNewTournamentInput && (
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <input
                              ref={newTournamentInputRef}
                              type="text"
                              value={newTournamentName}
                              onChange={(e) => setNewTournamentName(e.target.value)}
                              onKeyDown={handleNewTournamentKeyDown}
                              placeholder={t('newGameSetupModal.newTournamentPlaceholder', 'Enter new tournament name...')}
                              className="flex-1 min-w-[200px] px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                              disabled={isAddingTournament}
                            />
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={handleAddNewTournament}
                                disabled={isAddingTournament || !newTournamentName.trim()}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm disabled:opacity-50 whitespace-nowrap"
                              >
                                {isAddingTournament ? t('newGameSetupModal.creating', 'Creating...') : t('newGameSetupModal.addButton', 'Add')}
                              </button>
                              <button
                                onClick={() => {
                                  setShowNewTournamentInput(false);
                                  setNewTournamentName('');
                                }}
                                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md shadow-sm whitespace-nowrap"
                              >
                                {t('common.cancelButton', 'Cancel')}
                              </button>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>

                    {/* Age Group */}
                    <div className="mb-4">
                      <label htmlFor="ageGroupSelect" className="block text-sm font-medium text-slate-300 mb-1">
                        {t('newGameSetupModal.ageGroupLabel', 'Age Group (Optional)')}
                      </label>
                      <select
                        id="ageGroupSelect"
                        value={ageGroup}
                        onChange={(e) => setAgeGroup(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        disabled={isLoading}
                      >
                        <option value="">{t('common.none', 'None')}</option>
                        {AGE_GROUPS.map((group) => (
                          <option key={group} value={group}>
                            {group}
                          </option>
                        ))}
                      </select>
                    </div>


                    {/* Game Date */}
                    <div className="mb-4">
                      <label htmlFor="gameDateInput" className="block text-sm font-medium text-slate-300 mb-1">
                        {t('newGameSetupModal.gameDateLabel', 'Game Date')}
                      </label>
                      <input
                        type="date"
                        id="gameDateInput"
                        value={gameDate}
                        onChange={(e) => setGameDate(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Game Location */}
                    <div className="mb-4">
                      <label htmlFor="gameLocationInput" className="block text-sm font-medium text-slate-300 mb-1">
                        {t('newGameSetupModal.gameLocationLabel', 'Location (Optional)')}
                      </label>
                      <input
                        type="text"
                        id="gameLocationInput"
                        value={gameLocation}
                        onChange={(e) => setGameLocation(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('newGameSetupModal.locationPlaceholder', 'e.g., Central Park Field 2')}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        disabled={isLoading}
                      />
                    </div>

                    {/* Game Time */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-slate-300 mb-1">
                        {t('newGameSetupModal.gameTimeLabel', 'Time (Optional)')}
                      </label>
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          value={gameHour}
                          onChange={handleHourChange}
                          onKeyDown={handleKeyDown}
                          placeholder={t('newGameSetupModal.hourPlaceholder', 'HH')}
                          className="w-1/2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                          min="0"
                          max="23"
                          disabled={isLoading}
                        />
                        <span className="text-slate-400">:</span>
                        <input
                          type="number"
                          value={gameMinute}
                          onChange={handleMinuteChange}
                          onKeyDown={handleKeyDown}
                          placeholder={t('newGameSetupModal.minutePlaceholder', 'MM')}
                          className="w-1/2 px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                          min="0"
                          max="59"
                          disabled={isLoading}
                        />
                      </div>
                    </div>


                    {/* Player Selection Section */}
                    <div className="space-y-4 bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-200">
                          {t('newGameSetupModal.selectPlayers', 'Select Players')}
                        </h3>
                        <div className="text-sm text-slate-400">
                          <span className="text-yellow-400 font-semibold">{selectedPlayerIds.length}</span>
                          {" / "}
                          <span className="text-yellow-400 font-semibold">{availablePlayersForSetup.length}</span>
                          {" "}{t('newGameSetupModal.playersSelected', 'selected')}
                        </div>
                      </div>

                      {availablePlayersForSetup.length > 0 ? (
                        <>
                          {/* Select All Header */}
                          <div className="flex items-center py-2 px-1 border-b border-slate-700/50">
                            <label className="flex items-center text-sm text-slate-300 hover:text-slate-200 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={availablePlayersForSetup.length === selectedPlayerIds.length}
                                onChange={() => {
                                  if (selectedPlayerIds.length === availablePlayersForSetup.length) {
                                    setSelectedPlayerIds([]);
                                  } else {
                                    setSelectedPlayerIds(availablePlayersForSetup.map(p => p.id));
                                  }
                                }}
                                className="form-checkbox h-4 w-4 text-indigo-600 bg-slate-700 border-slate-500 rounded focus:ring-indigo-500 focus:ring-offset-slate-800"
                              />
                              <span className="ml-2">{t('newGameSetupModal.selectAll', 'Select All')}</span>
                            </label>
                          </div>

                          {/* Player List */}
                          <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                            {availablePlayersForSetup.map((player) => (
                              <div
                                key={player.id}
                                className="flex items-center py-1.5 px-1 rounded hover:bg-slate-800/40 transition-colors"
                              >
                                <label className="flex items-center flex-1 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedPlayerIds.includes(player.id)}
                                    onChange={() => handlePlayerSelectionToggle(player.id)}
                                    className="form-checkbox h-4 w-4 text-indigo-600 bg-slate-700 border-slate-500 rounded focus:ring-indigo-500 focus:ring-offset-slate-800"
                                  />
                                  <span className="ml-2 text-slate-200">
                                    {player.name}
                                    {player.nickname && (
                                      <span className="text-slate-400 ml-1">({player.nickname})</span>
                                    )}
                                  </span>
                                </label>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <div className="text-center py-4 text-slate-400">
                          {t('newGameSetupModal.noPlayersInRoster', 'No players in roster. Add players in Roster Settings.')}
                        </div>
                      )}
                    </div>

                    {/* Game Settings Section */}
                    <div className="space-y-4 bg-slate-900/70 p-4 rounded-lg border border-slate-700 shadow-inner">
                      <h3 className="text-lg font-semibold text-slate-200 mb-3">
                        {t('newGameSetupModal.periodsLabel', 'Game Settings')}
                      </h3>

                      {/* Number of Periods */}
                      <div className="mb-4">
                        <label htmlFor="numPeriodsSelect" className="block text-sm font-medium text-slate-300 mb-1">
                          {t('newGameSetupModal.numPeriodsLabel', 'Number of Periods')}
                        </label>
                        <select
                          id="numPeriodsSelect"
                          value={localNumPeriods}
                          onChange={(e) => setLocalNumPeriods(parseInt(e.target.value) as 1 | 2)}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                        >
                          <option value={1}>1</option>
                          <option value={2}>2</option>
                        </select>
                      </div>

                      {/* Period Duration */}
                      <div className="mb-4">
                        <label htmlFor="periodDurationInput" className="block text-sm font-medium text-slate-300 mb-1">
                          {t('newGameSetupModal.periodDurationLabel', 'Period Duration (minutes)')}
                        </label>
                      <input
                          type="number"
                          id="periodDurationInput"
                          value={localPeriodDurationString}
                          onChange={(e) => setLocalPeriodDurationString(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
                          min="1"
                        />
                      </div>

                      {/* Demand Factor Slider */}
                      <div className="mb-4">
                        <AssessmentSlider
                          label={t('newGameSetupModal.demandFactorLabel', 'Game Demand Level')}
                          value={demandFactor}
                          onChange={onDemandFactorChange}
                          min={0.5}
                          max={1.5}
                          step={0.05}
                          reverseColor
                        />
                      </div>

                      {/* Home/Away Selection */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-slate-300 mb-1">
                          {t('newGameSetupModal.homeOrAwayLabel', 'Your Team is')}
                        </label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setLocalHomeOrAway('home')}
                            className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                              localHomeOrAway === 'home'
                                ? 'bg-indigo-600 text-white'
                                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                          >
                            {t('common.home', 'Home')}
                          </button>
                      <button
                        onClick={() => setLocalHomeOrAway('away')}
                        className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                          localHomeOrAway === 'away'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {t('common.away', 'Away')}
                      </button>
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="inline-flex items-center text-sm text-slate-300">
                      <input
                        type="checkbox"
                        checked={!isPlayed}
                        onChange={(e) => setIsPlayed(!e.target.checked)}
                        className="form-checkbox h-4 w-4 text-indigo-600 bg-slate-700 border-slate-500 rounded focus:ring-indigo-500 focus:ring-offset-slate-800"
                      />
                      <span className="ml-2">{t('newGameSetupModal.unplayedToggle', 'Not played yet')}</span>
                    </label>
                  </div>
                </div>
              </>
            )}
          </>
        )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-700/20 backdrop-blur-sm bg-slate-900/20">
            <div className="flex justify-end gap-3 px-6">
              <button
                onClick={onCancel}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md shadow-sm"
              >
                {t('common.cancelButton', 'Cancel')}
              </button>
              <button
                onClick={handleStartClick}
                disabled={isLoading || isAddingSeason || isAddingTournament}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm disabled:opacity-50"
              >
                {t('newGameSetupModal.confirmAndStart', 'Confirm & Start Game')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NewGameSetupModal;
