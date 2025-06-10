'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Player, Season, Tournament } from '@/types';
import { HiPlusCircle } from 'react-icons/hi';
import { getSeasons as utilGetSeasons } from '@/utils/seasons';
import { getTournaments as utilGetTournaments } from '@/utils/tournaments';
import { getMasterRoster } from '@/utils/masterRosterManager';
import { getLastHomeTeamName as utilGetLastHomeTeamName, saveLastHomeTeamName as utilSaveLastHomeTeamName } from '@/utils/appSettings';
import { UseMutationResult } from '@tanstack/react-query';
import { useAuth } from '@clerk/nextjs';

interface NewGameSetupModalProps {
  isOpen: boolean;
  initialPlayerSelection: string[] | null;
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
    homeOrAway: 'home' | 'away'
  ) => void;
  onCancel: () => void;
  addSeasonMutation: UseMutationResult<Season | null, Error, { name: string; clerkToken: string; }, unknown>;
  addTournamentMutation: UseMutationResult<Tournament | null, Error, { name: string; clerkToken: string; }, unknown>;
  isAddingSeason: boolean;
  isAddingTournament: boolean;
  internalSupabaseUserId: string | null;
}

const NewGameSetupModal: React.FC<NewGameSetupModalProps> = ({
  isOpen,
  initialPlayerSelection,
  onStart,
  onCancel,
  addSeasonMutation,
  addTournamentMutation,
  isAddingSeason,
  isAddingTournament,
  internalSupabaseUserId,
}) => {
  const { t } = useTranslation();
  const { getToken } = useAuth();
  const [homeTeamName, setHomeTeamName] = useState('');
  const [opponentName, setOpponentName] = useState('');
  const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);
  const [gameLocation, setGameLocation] = useState('');
  const [gameHour, setGameHour] = useState<string>('');
  const [gameMinute, setGameMinute] = useState<string>('');
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

  // MOVED state declarations for availablePlayersForSetup and selectedPlayerIds here
  const [availablePlayersForSetup, setAvailablePlayersForSetup] = useState<Player[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>(initialPlayerSelection || []);

  // NEW: Loading and error states for initial data fetch
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const fetchInitialData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const token = await getToken();
        if (!token || !internalSupabaseUserId) {
          throw new Error("Authentication details not available.");
        }

        // Fetch all data in parallel
        const [roster, lastHomeTeam, seasonsData, tournamentsData] = await Promise.all([
          getMasterRoster(token),
          utilGetLastHomeTeamName(),
          utilGetSeasons(token),
          utilGetTournaments(token)
        ]);

        // Set state after all data is fetched
        setAvailablePlayersForSetup(roster || []);
        if (initialPlayerSelection && initialPlayerSelection.length > 0) {
          setSelectedPlayerIds(initialPlayerSelection);
        } else if (roster && roster.length > 0) {
          setSelectedPlayerIds(roster.map(p => p.id));
        }
        
        setHomeTeamName(lastHomeTeam || t('newGameSetupModal.defaultTeamName', 'My Team'));
        setSeasons(Array.isArray(seasonsData) ? seasonsData : []);
        setTournaments(Array.isArray(tournamentsData) ? tournamentsData : []);

      } catch (err) {
        console.error("[NewGameSetupModal] Error fetching initial data:", err);
        setError(t('newGameSetupModal.errors.dataLoadFailed', 'Failed to load initial setup data. Please try again.'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();

  }, [isOpen, initialPlayerSelection, t, internalSupabaseUserId, getToken]);

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
    const token = await getToken();
    if (!token || !internalSupabaseUserId) {
      alert(t('newGameSetupModal.errors.authRequiredForSeason', 'Authentication details are missing. Cannot add season.'));
      console.error("Clerk token or Supabase User ID missing in handleAddNewSeason");
      return;
    }
    try {
      await addSeasonMutation.mutateAsync({
        name: trimmedName,
        clerkToken: token, 
      });
      setSelectedSeasonId(newSeasonName); 
      setShowNewSeasonInput(false); 
      setNewSeasonName(''); 
    } catch (error) {
      console.error("[handleAddNewSeason] Error creating season:", error);
      // Display the actual error message to the user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(t('newGameSetupModal.errors.createSeasonFailed', 'Failed to create season: {{error}}', { error: errorMessage }));
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
    const token = await getToken();
    if (!token || !internalSupabaseUserId) {
      alert(t('newGameSetupModal.errors.authRequiredForTournament', 'Authentication details are missing. Cannot add tournament.'));
      console.error("Clerk token or Supabase User ID missing in handleAddNewTournament");
      return;
    }
    try {
      await addTournamentMutation.mutateAsync({
        name: trimmedName,
        clerkToken: token,
      });
      setSelectedTournamentId(newTournamentName); 
      setShowNewTournamentInput(false); 
      setNewTournamentName(''); 
    } catch (error) {
      console.error("[handleAddNewTournament] Error creating tournament:", error);
      // Display the actual error message to the user
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(t('newGameSetupModal.errors.createTournamentFailed', 'Failed to create tournament: {{error}}', { error: errorMessage }));
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
      console.error("Failed to save last home team name:", error);
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
      localHomeOrAway // <<< Step 4a: Pass Home/Away >>>
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
          onClick={() => { /* Add a retry mechanism if desired, for now just closes */ onCancel(); }}
          className="mt-3 px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded"
        >
          {t('common.close', 'Close')}
        </button>
      </div>
    );
  } else {
    // Form content goes here when not loading and no error
    modalContent = (
      <>
        {/* Home Team Name */}
        <div className="mb-3">
          <label htmlFor="homeTeamName" className="block text-sm font-medium text-slate-300 mb-1">
            {t('newGameSetupModal.homeTeamName', 'Your Team Name')}
            </label>
            <input
            type="text"
            id="homeTeamName"
              ref={homeTeamInputRef}
              value={homeTeamName}
              onChange={(e) => setHomeTeamName(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm"
            placeholder={t('newGameSetupModal.homeTeamPlaceholder', 'e.g., Galaxy U10')}
              onKeyDown={handleKeyDown}
            disabled={isLoading} // Disable if somehow still loading (belt and braces)
            />
          </div>

        {/* Opponent Name */}
        <div className="mb-3">
            <label htmlFor="opponentNameInput" className="block text-sm font-medium text-slate-300 mb-1">
            {t('newGameSetupModal.opponentNameLabel', 'Opponent Name: *')}
            </label>
            <input
              ref={opponentInputRef}
              type="text"
              id="opponentNameInput"
              data-testid="opponent-name-input"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              onKeyDown={handleKeyDown}
            placeholder={t('newGameSetupModal.opponentPlaceholder', 'Enter opponent name') ?? ''}
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isLoading}
            />
          </div>

        {/* Game Date */}
        <div className="mb-3">
            <label htmlFor="gameDateInput" className="block text-sm font-medium text-slate-300 mb-1">
            {t('newGameSetupModal.gameDateLabel', 'Game Date:')}
            </label>
            <input
              type="date"
              id="gameDateInput"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isLoading}
            />
        </div>

        {/* Game Location */}
        <div className="mb-3">
          <label htmlFor="gameLocationInput" className="block text-sm font-medium text-slate-300 mb-1">
            {t('newGameSetupModal.gameLocationLabel', 'Location (Optional):')}
          </label>
          <input
            type="text"
            id="gameLocationInput"
            value={gameLocation}
            onChange={(e) => setGameLocation(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('newGameSetupModal.locationPlaceholder', 'e.g., Central Park Field 2') ?? ''}
            className="w-full px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            disabled={isLoading}
          />
        </div>

        {/* Game Time */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-1">
            {t('newGameSetupModal.gameTimeLabel', 'Time (Optional):')}
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              value={gameHour}
              onChange={handleHourChange}
              onKeyDown={handleKeyDown}
              placeholder={t('newGameSetupModal.hourPlaceholder', 'HH') ?? ''}
              className="w-1/2 px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              min="0" max="23"
              disabled={isLoading}
            />
            <span className="text-slate-400">:</span>
            <input
              type="number"
              value={gameMinute}
              onChange={handleMinuteChange}
              onKeyDown={handleKeyDown}
              placeholder={t('newGameSetupModal.minutePlaceholder', 'MM') ?? ''}
              className="w-1/2 px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              min="0" max="59"
              disabled={isLoading}
            />
          </div>
          </div>

        {/* Player Selection (already structured for isLoading/error in previous step) */}
        <div className="mb-3">
          <h3 className="text-sm font-medium text-slate-300 mb-1.5">
            {t('newGameSetupModal.selectPlayers', 'Select Players for this Game')}
          </h3>
          {availablePlayersForSetup.length > 0 ? (
            <div className="max-h-40 overflow-y-auto bg-slate-700/50 p-2 rounded-md border border-slate-600 scrollbar-thin scrollbar-thumb-slate-500 scrollbar-track-slate-700">
              {availablePlayersForSetup.map((player) => (
                <div key={player.id} className="flex items-center mb-1.5 last:mb-0">
                  <input
                    type="checkbox"
                    id={`player-select-${player.id}`}
                    checked={selectedPlayerIds.includes(player.id)}
                    onChange={() => handlePlayerSelectionToggle(player.id)} // Call defined handler
                    className="h-4 w-4 rounded border-slate-500 bg-slate-600 text-indigo-500 focus:ring-indigo-400 focus:ring-offset-slate-800 mr-2.5 shrink-0"
                    disabled={isLoading}
                  />
                  <label htmlFor={`player-select-${player.id}`} className="text-xs text-slate-200 cursor-pointer flex-grow">
                    {player.name} {player.jerseyNumber ? `(#${player.jerseyNumber})` : ''}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500 italic">
              {isLoading ? t('newGameSetupModal.loadingPlayers', 'Loading players...') : t('newGameSetupModal.noPlayersInRoster', 'No players in master roster. Add players in Roster Settings.')}
            </p>
          )}
          </div>

        {/* Season Selection */}
        <div className="mb-3 p-3 border border-slate-700/80 rounded-md bg-slate-700/30">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="seasonSelect" className="block text-sm font-medium text-slate-300">
                {t('newGameSetupModal.seasonLabel', 'Season:')} 
              </label>
              {!showNewSeasonInput && (
                  <button 
                      onClick={handleShowCreateSeason}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!!selectedTournamentId || isLoading}
                      title={isAddingSeason ? t('newGameSetupModal.creating', 'Creating...') : t('newGameSetupModal.createSeason')}
                      data-testid="create-new-season-button"
                  >
                    <HiPlusCircle className="w-4 h-4 mr-1" />
                    {isAddingSeason ? t('newGameSetupModal.creating', 'Creating...') : t('newGameSetupModal.createSeason')}
                  </button>
              )}
            </div>
            {!showNewSeasonInput ? (
              <select
                id="seasonSelect"
                value={selectedSeasonId ?? ''}
                onChange={handleSeasonChange}
                onKeyDown={handleKeyDown} 
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              disabled={!!selectedTournamentId || isLoading}
              >
                <option value="">{t('newGameSetupModal.selectSeasonOption', '-- Select Season --')}</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="flex flex-col space-y-2 items-stretch"> 
                <input 
                  ref={newSeasonInputRef}
                  type="text"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  onKeyDown={handleNewSeasonKeyDown}
                  placeholder={t('newGameSetupModal.newSeasonPlaceholder', 'Enter new season name...') ?? undefined}
                  className="px-3 py-1.5 bg-slate-600 border border-slate-400 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                disabled={isLoading}
                />
                <div className="flex justify-end space-x-2"> 
                    <button 
                        onClick={handleAddNewSeason} 
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm disabled:opacity-50"
                  disabled={!newSeasonName.trim() || isLoading}
                    >
                        {t('newGameSetupModal.addButton', 'Add')}
                    </button>
                    <button 
                        onClick={() => setShowNewSeasonInput(false)} 
                  className="px-4 py-1.5 bg-slate-600 text-white rounded hover:bg-slate-500 text-sm disabled:opacity-50"
                        title={t('newGameSetupModal.cancelAddTitle', 'Cancel Add') ?? undefined}
                  disabled={isLoading}
                    >
                        {t('newGameSetupModal.cancelButton', 'Cancel')}
                    </button>
                </div>
              </div>
            )}
          </div>

        {/* Tournament Selection */}
        <div className="mb-4 p-3 border border-slate-700/80 rounded-md bg-slate-700/30">
              <div className="flex justify-between items-center mb-2">
                  <label htmlFor="tournamentSelect" className="block text-sm font-medium text-slate-300">
                      {t('newGameSetupModal.tournamentLabel', 'Tournament:')}
                  </label>
                  {!showNewTournamentInput && (
                      <button 
                          onClick={handleShowCreateTournament}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!!selectedSeasonId || isLoading}
                          title={isAddingTournament ? t('newGameSetupModal.creating', 'Creating...') : t('newGameSetupModal.createTournament')}
                          data-testid="create-new-tournament-button"
                      >
                      <HiPlusCircle className="w-4 h-4 mr-1" />
                      {isAddingTournament ? t('newGameSetupModal.creating', 'Creating...') : t('newGameSetupModal.createTournament')}
                      </button>
                  )}
              </div>
              {!showNewTournamentInput ? (
                  <select
                  id="tournamentSelect"
                  value={selectedTournamentId ?? ''} 
                  onChange={handleTournamentChange}
                  onKeyDown={handleKeyDown}
                  className="w-full px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              disabled={!!selectedSeasonId || isLoading}
                  >
                  <option value="">{t('newGameSetupModal.selectTournamentOption', '-- Select Tournament --')}</option>
                  {tournaments.map((tournament) => (
                      <option key={tournament.id} value={tournament.id}>
                      {tournament.name}
                      </option>
                  ))}
                  </select>
              ) : (
                  <div className="flex flex-col space-y-2 items-stretch"> 
                      <input 
                          ref={newTournamentInputRef}
                          type="text"
                          value={newTournamentName}
                          onChange={(e) => setNewTournamentName(e.target.value)}
                          onKeyDown={handleNewTournamentKeyDown}
                          placeholder={t('newGameSetupModal.newTournamentPlaceholder', 'Enter new tournament name...') ?? undefined}
                          className="px-3 py-1.5 bg-slate-600 border border-slate-400 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                disabled={isLoading}
                      />
                      <div className="flex justify-end space-x-2"> 
                          <button 
                              onClick={handleAddNewTournament} 
                  className="px-4 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm disabled:opacity-50"
                  disabled={!newTournamentName.trim() || isLoading}
                          >
                              {t('newGameSetupModal.addButton', 'Add')}
                          </button>
                          <button 
                              onClick={() => setShowNewTournamentInput(false)} 
                  className="px-4 py-1.5 bg-slate-600 text-white rounded hover:bg-slate-500 text-sm disabled:opacity-50"
                              title={t('newGameSetupModal.cancelAddTitle', 'Cancel Add') ?? undefined}
                  disabled={isLoading}
                          >
                              {t('newGameSetupModal.cancelButton', 'Cancel')}
                          </button>
                      </div>
                  </div>
              )}
          </div>
          
        {/* Game Structure Settings */}
        <div className="grid grid-cols-2 gap-x-4 mb-3">
          <div>
            <label htmlFor="numPeriods" className="block text-sm font-medium text-slate-300 mb-1">
              {t('newGameSetupModal.numPeriodsLabel', 'Number of Periods:')}
            </label>
            <select
              id="numPeriods"
              value={localNumPeriods}
              onChange={(e) => setLocalNumPeriods(parseInt(e.target.value, 10) as 1 | 2)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              disabled={isLoading}
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
            </select>
          </div>
          <div>
            <label htmlFor="periodDuration" className="block text-sm font-medium text-slate-300 mb-1">
              {t('newGameSetupModal.periodDurationLabel', 'Period Duration (min):')}
            </label>
              <input
                type="number"
              id="periodDuration"
              value={localPeriodDurationString}
              onChange={(e) => setLocalPeriodDurationString(e.target.value)} // Validate in handler
                onKeyDown={handleKeyDown}
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              min="1"
              disabled={isLoading}
              />
            </div>
          </div>

        {/* Home/Away Selection */}
        <div className="mb-3">
              <label className="block text-sm font-medium text-slate-300 mb-1">
            {t('newGameSetupModal.homeOrAwayLabel', 'Your Team is:')}
              </label>
          <div className="flex space-x-3">
            {(['home', 'away'] as const).map((option) => (
                  <button 
                key={option}
                type="button"
                onClick={() => setLocalHomeOrAway(option)}
                className={`flex-1 px-3 py-1.5 rounded-md text-sm font-medium border transition-colors disabled:opacity-50
                  ${localHomeOrAway === option 
                    ? 'bg-indigo-600 border-indigo-500 text-white' 
                    : 'bg-slate-700 border-slate-500 text-slate-200 hover:bg-slate-600 hover:border-slate-400'}
                `}
                disabled={isLoading}
              >
                {option === 'home' ? t('common.home', 'Home') : t('common.away', 'Away')}
                  </button>
                ))}
              </div>
            </div>
      </>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-start justify-center z-50 p-4 pt-8 sm:pt-12">
      <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-lg border border-slate-600 flex flex-col max-h-[calc(100vh-theme(space.16))] sm:max-h-[calc(100vh-theme(space.24))]">
        <div className="flex justify-between items-center p-4 border-b border-slate-700 flex-shrink-0">
          <h2 className="text-lg font-semibold text-yellow-400">
            {t('newGameSetupModal.title', 'New Game Setup')}
          </h2>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          </div>

        <div className="p-5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800 flex-grow">
          {modalContent} {/* Render the appropriate content here */}
        </div>

        {/* Footer with action buttons - only show if not loading and no error, or handle disabled state */}
        {!isLoading && !error && (
          <div className="px-5 py-3 border-t border-slate-700 flex justify-end space-x-3 flex-shrink-0 bg-slate-800/80 backdrop-blur-sm">
          <button 
              type="button"
            onClick={onCancel}
              className="px-4 py-2 rounded bg-slate-600 text-slate-200 hover:bg-slate-500 transition-colors text-sm font-medium"
          >
              {t('common.cancel', 'Cancel')}
          </button>
          <button
              type="button"
              onClick={handleStartClick} // This is the existing confirm handler
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
              {t('newGameSetupModal.confirmAndStart', 'Confirm & Start Game')}
          </button>
        </div>
        )}
      </div>
    </div>
  );
};

export default NewGameSetupModal;
