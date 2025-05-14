'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Season, Tournament } from '@/types';
import { getLastHomeTeamName, saveLastHomeTeamName } from '@/utils/appSettings';
import { HiPlusCircle } from 'react-icons/hi';
import { getSeasons as utilGetSeasons, addSeason as utilAddSeason } from '@/utils/seasons';
import { getTournaments as utilGetTournaments, addTournament as utilAddTournament } from '@/utils/tournaments';

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
}

const NewGameSetupModal: React.FC<NewGameSetupModalProps> = ({
  isOpen,
  initialPlayerSelection,
  onStart,
  onCancel,
}) => {
  const { t } = useTranslation();
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
  const [localNumPeriods, setLocalNumPeriods] = useState<1 | 2>(2); // Default 2 periods
  const [localPeriodDurationString, setLocalPeriodDurationString] = useState<string>('10'); // Default 10 minutes as string

  // <<< Step 4a: State for Home/Away >>>
  const [localHomeOrAway, setLocalHomeOrAway] = useState<'home' | 'away'>('home');

  useEffect(() => {
    const loadInitialData = async () => {
      if (isOpen) {
        // --- Load last used home team name using utility function ---
        try {
          const lastUsedHomeTeam = await getLastHomeTeamName();
          setHomeTeamName(lastUsedHomeTeam || '');
        } catch (error) {
          console.error("Failed to load last home team name:", error);
          setHomeTeamName('');
        }
        // --- End Load ---

        // Reset form fields
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
        setLocalPeriodDurationString(String(10));

        // Load seasons and tournaments using utility functions
        try {
          const loadedSeasons = await utilGetSeasons(); 
          setSeasons(loadedSeasons);
        } catch (error) { 
          console.error("Error loading seasons via utility:", error);
          setSeasons([]);
        }
        try {
          const loadedTournaments = await utilGetTournaments(); // Now async
          setTournaments(loadedTournaments);
        } catch (error) { 
          console.error("Error loading tournaments via utility:", error);
          setTournaments([]);
        }

        setTimeout(() => {
          homeTeamInputRef.current?.focus();
        }, 100);
      }
    };
    loadInitialData();
  }, [isOpen]);

  // Focus input when create new section appears
  useEffect(() => {
    if (showNewSeasonInput) {
        newSeasonInputRef.current?.focus();
    }
  }, [showNewSeasonInput]);

  useEffect(() => {
    if (showNewTournamentInput) {
        newTournamentInputRef.current?.focus();
    }
  }, [showNewTournamentInput]);

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

    try {
      const newSeason = await utilAddSeason(trimmedName);
      
      if (newSeason) {
        setSeasons(prevSeasons => [...prevSeasons, newSeason]);
        setSelectedSeasonId(newSeason.id);
        setSelectedTournamentId(null);
        setNewSeasonName(''); 
        setShowNewSeasonInput(false); 
        console.log("Added new season:", newSeason);
      } else {
        console.warn("utilAddSeason returned null, season might not have been added or error handled by utility.");
      }

    } catch (error) { 
      console.error("Failed to save new season (unexpected error):", error);
      if (error instanceof Error) {
        alert(t('newGameSetupModal.errorAddingSeasonGeneric', 'Error adding new season. See console for details.'));
      } else {
        alert(t('newGameSetupModal.errorAddingSeasonGeneric', 'An unexpected error occurred.'));
      }
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
      const newTournament = await utilAddTournament(trimmedName); // Now async

      if (newTournament) {
        setTournaments(prevTournaments => [...prevTournaments, newTournament]);
        setSelectedTournamentId(newTournament.id); 
        setSelectedSeasonId(null); 
        setNewTournamentName(''); 
        setShowNewTournamentInput(false); 
        console.log("Added new tournament:", newTournament);
      } else {
        console.warn("utilAddTournament returned null, tournament might not have been added or error handled by utility.");
      }

    } catch (error) { 
      console.error("Failed to save new tournament (unexpected error):", error);
      if (error instanceof Error) {
        alert(t('newGameSetupModal.errorAddingTournamentGeneric', 'Error adding new tournament. See console for details.'));
      } else {
        alert(t('newGameSetupModal.errorAddingTournamentGeneric', 'An unexpected error occurred.'));
      }
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
      await saveLastHomeTeamName(trimmedHomeTeamName);
    } catch (error) {
      console.error("Failed to save last home team name:", error);
      // Continue without blocking, as this is not critical for starting the game
    }
    // --- End Save ---

    const selectedPlayers = initialPlayerSelection || [];
    // Call the onStart callback from props
    onStart(
      selectedPlayers,
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[60] p-4">
      <div className="bg-slate-800 rounded-lg shadow-xl p-6 w-full border border-slate-600 h-full overflow-hidden flex flex-col">
        <h2 className="text-xl font-semibold mb-5 text-yellow-300 flex-shrink-0">
          {t('newGameSetupModal.title')}
        </h2>
        
        <div className="flex-grow overflow-y-auto pr-3 -mr-3 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-700/50">
          <div className="mb-4">
            <label htmlFor="home-team-name" className="block text-sm font-medium text-slate-300 mb-1">
              {t('newGameSetupModal.homeTeamLabel', 'Home Team Name: *')}
            </label>
            <input
              ref={homeTeamInputRef}
              type="text"
              id="home-team-name"
              value={homeTeamName}
              onChange={(e) => setHomeTeamName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('newGameSetupModal.homeTeamPlaceholder', 'Enter home team name') ?? ''}
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="opponentNameInput" className="block text-sm font-medium text-slate-300 mb-1">
              {t('newGameSetupModal.opponentLabel')} *
            </label>
            <input
              ref={opponentInputRef}
              type="text"
              id="opponentNameInput"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('newGameSetupModal.opponentPlaceholder') ?? undefined}
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              required 
            />
          </div>

          <div className="mb-4">
            <label htmlFor="gameDateInput" className="block text-sm font-medium text-slate-300 mb-1">
              {t('newGameSetupModal.dateLabel')}
            </label>
            <input
              type="date"
              id="gameDateInput"
              value={gameDate}
              onChange={(e) => setGameDate(e.target.value)}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="mb-4 p-3 border border-slate-700 rounded-md bg-slate-900/30">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="seasonSelect" className="block text-sm font-medium text-slate-300">
                {t('newGameSetupModal.seasonLabel', 'Season:')} 
              </label>
              {!showNewSeasonInput && (
                  <button 
                      onClick={handleShowCreateSeason}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!!selectedTournamentId}
                      title={t('newGameSetupModal.createNewSeasonTitle', 'Create New Season') ?? undefined}
                  >
                    <HiPlusCircle className="w-4 h-4 mr-1" />
                    {t('newGameSetupModal.createButton', 'Create New')}
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
                disabled={!!selectedTournamentId}
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
                />
                <div className="flex justify-end space-x-2"> 
                    <button 
                        onClick={handleAddNewSeason} 
                        className="px-4 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                        disabled={!newSeasonName.trim()}
                    >
                        {t('newGameSetupModal.addButton', 'Add')}
                    </button>
                    <button 
                        onClick={() => setShowNewSeasonInput(false)} 
                        className="px-4 py-1.5 bg-slate-600 text-white rounded hover:bg-slate-500 text-sm"
                        title={t('newGameSetupModal.cancelAddTitle', 'Cancel Add') ?? undefined}
                    >
                        {t('newGameSetupModal.cancelButton', 'Cancel')}
                    </button>
                </div>
              </div>
            )}
          </div>

          <div className="mb-4 p-3 border border-slate-700 rounded-md bg-slate-900/30">
              <div className="flex justify-between items-center mb-2">
                  <label htmlFor="tournamentSelect" className="block text-sm font-medium text-slate-300">
                      {t('newGameSetupModal.tournamentLabel', 'Tournament:')}
                  </label>
                  {!showNewTournamentInput && (
                      <button 
                          onClick={handleShowCreateTournament}
                          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={!!selectedSeasonId}
                          title={t('newGameSetupModal.createNewTournamentTitle', 'Create New Tournament') ?? undefined}
                      >
                      <HiPlusCircle className="w-4 h-4 mr-1" />
                      {t('newGameSetupModal.createButton', 'Create New')}
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
                  disabled={!!selectedSeasonId}
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
                      />
                      <div className="flex justify-end space-x-2"> 
                          <button 
                              onClick={handleAddNewTournament} 
                              className="px-4 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm"
                              disabled={!newTournamentName.trim()}
                          >
                              {t('newGameSetupModal.addButton', 'Add')}
                          </button>
                          <button 
                              onClick={() => setShowNewTournamentInput(false)} 
                              className="px-4 py-1.5 bg-slate-600 text-white rounded hover:bg-slate-500 text-sm"
                              title={t('newGameSetupModal.cancelAddTitle', 'Cancel Add') ?? undefined}
                          >
                              {t('newGameSetupModal.cancelButton', 'Cancel')}
                          </button>
                      </div>
                  </div>
              )}
          </div>
          
          <div className="mb-4">
            <label htmlFor="gameLocationInput" className="block text-sm font-medium text-slate-300 mb-1">
              {t('newGameSetupModal.locationLabel', 'Location (Optional)')}
            </label>
            <input
              type="text"
              id="gameLocationInput"
              value={gameLocation}
              onChange={(e) => setGameLocation(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('newGameSetupModal.locationPlaceholder', 'e.g., Home Field, Stadium X') ?? undefined}
              className="w-full px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {t('newGameSetupModal.timeLabel', 'Time (HH:MM) (Optional)')}
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                id="gameHourInput"
                value={gameHour}
                onChange={handleHourChange}
                onKeyDown={handleKeyDown}
                placeholder={t('newGameSetupModal.hourPlaceholder', 'HH') ?? 'HH'}
                min="0"
                max="23"
                className="w-1/2 px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center"
              />
              <span className="text-slate-400 font-bold">:</span>
              <input
                type="number"
                id="gameMinuteInput"
                value={gameMinute}
                onChange={handleMinuteChange}
                onKeyDown={handleKeyDown}
                placeholder={t('newGameSetupModal.minutePlaceholder', 'MM') ?? 'MM'}
                min="0"
                max="59"
                className="w-1/2 px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-center"
              />
            </div>
          </div>

          {/* ADD Game Structure Settings */}
          <div className="grid grid-cols-2 gap-x-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                {t('newGameSetupModal.periodsLabel', 'Periods')}
              </label>
              <div className="flex items-center space-x-2 mt-1">
                {[1, 2].map(num => (
                  <button 
                    key={num}
                    onClick={() => setLocalNumPeriods(num as 1 | 2)}
                    className={`w-full px-3 py-1.5 rounded text-sm ${localNumPeriods === num ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}>
                    {num}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="periodDurationInput" className="block text-sm font-medium text-slate-300 mb-1">
                {t('newGameSetupModal.durationLabel', 'Duration (min)')}
              </label>
              <input
                type="number"
                id="periodDurationInput"
                value={localPeriodDurationString}
                onChange={(e) => setLocalPeriodDurationString(e.target.value)}
                onKeyDown={handleKeyDown}
                min="1"
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-500 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </div>
          {/* END Game Structure Settings */}

          {/* --- Home/Away Selection --- */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              {t('newGameSetupModal.venueLabel', 'Venue')} *
            </label>
            <div className="flex items-center space-x-4 bg-slate-700 border border-slate-500 rounded-md p-1.5">
              <label className={`flex-1 text-center px-3 py-1 rounded cursor-pointer transition-colors duration-150 ${localHomeOrAway === 'home' ? 'bg-indigo-600 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}>
                <input 
                  type="radio"
                  name="homeOrAway"
                  value="home"
                  checked={localHomeOrAway === 'home'}
                  onChange={() => setLocalHomeOrAway('home')}
                  className="sr-only" // Hide the actual radio button
                />
                {t('general.home', 'Home')}
              </label>
              <label className={`flex-1 text-center px-3 py-1 rounded cursor-pointer transition-colors duration-150 ${localHomeOrAway === 'away' ? 'bg-indigo-600 text-white' : 'bg-slate-600 hover:bg-slate-500'}`}>
                <input 
                  type="radio"
                  name="homeOrAway"
                  value="away"
                  checked={localHomeOrAway === 'away'}
                  onChange={() => setLocalHomeOrAway('away')}
                  className="sr-only"
                />
                {t('general.away', 'Away')}
              </label>
            </div>
          </div>
          {/* --- End Home/Away Selection --- */}
        </div>

        <div className="flex justify-center space-x-3 mt-auto pt-4 border-t border-slate-700 flex-shrink-0"> 
          <button 
            onClick={onCancel}
            className="px-4 py-2 bg-slate-600 text-white rounded hover:bg-slate-500 transition-colors text-sm"
          >
            {t('newGameSetupModal.skipButton', 'Skip (No Auto-Save)')}
          </button>
          <button
            onClick={handleStartClick}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition duration-150 text-sm"
          >
            {t('newGameSetupModal.startButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NewGameSetupModal;