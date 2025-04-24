'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Season, Tournament } from '../app/page';
import { SEASONS_LIST_KEY, TOURNAMENTS_LIST_KEY } from '@/config/constants';
import { HiPlusCircle } from 'react-icons/hi';

interface NewGameSetupModalProps {
  isOpen: boolean;
  onStart: (
    opponentName: string, 
    gameDate: string, 
    gameLocation: string, 
    gameTime: string,
    seasonId: string | null,
    tournamentId: string | null,
    numPeriods: 1 | 2, 
    periodDuration: number
  ) => void;
  onCancel: () => void;
}

const NewGameSetupModal: React.FC<NewGameSetupModalProps> = ({
  isOpen,
  onStart,
  onCancel,
}) => {
  const { t } = useTranslation();
  const [opponentName, setOpponentName] = useState('');
  const [gameDate, setGameDate] = useState(new Date().toISOString().split('T')[0]);
  const [gameLocation, setGameLocation] = useState('');
  const [gameHour, setGameHour] = useState<string>('');
  const [gameMinute, setGameMinute] = useState<string>('');
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

  useEffect(() => {
    if (isOpen) {
      // Reset form fields
      setOpponentName('');
      setGameDate(new Date().toISOString().split('T')[0]);
      setGameLocation('');
      setGameHour('');
      setGameMinute('');
      setSelectedSeasonId(null);
      setSelectedTournamentId(null);
      // Reset create new inputs
      setShowNewSeasonInput(false);
      setNewSeasonName('');
      setShowNewTournamentInput(false);
      setNewTournamentName('');
      // Reset for period/duration
      setLocalNumPeriods(2);
      setLocalPeriodDurationString(String(10));

      // Load seasons and tournaments from localStorage
      try {
        const storedSeasons = localStorage.getItem(SEASONS_LIST_KEY);
        setSeasons(storedSeasons ? JSON.parse(storedSeasons) : []);
      } catch (error) {
        console.error("Failed to load or parse seasons:", error);
        setSeasons([]);
      }
      try {
        const storedTournaments = localStorage.getItem(TOURNAMENTS_LIST_KEY);
        setTournaments(storedTournaments ? JSON.parse(storedTournaments) : []);
      } catch (error) {
        console.error("Failed to load or parse tournaments:", error);
        setTournaments([]);
      }

      // Focus opponent name input
      setTimeout(() => {
        opponentInputRef.current?.focus();
      }, 100);
    }
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
  const handleAddNewSeason = () => {
    const trimmedName = newSeasonName.trim();
    if (!trimmedName) {
      alert(t('newGameSetupModal.newSeasonNameRequired', 'Please enter a name for the new season.'));
      newSeasonInputRef.current?.focus();
      return;
    }

    const newId = `season_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newSeason: Season = { id: newId, name: trimmedName };

    try {
      // 1. Load current seasons
      const storedSeasons = localStorage.getItem(SEASONS_LIST_KEY);
      const currentSeasons: Season[] = storedSeasons ? JSON.parse(storedSeasons) : [];
      
      // Check for duplicate names (optional but recommended)
      if (currentSeasons.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
          alert(t('newGameSetupModal.duplicateSeasonName', 'A season with this name already exists.'));
          newSeasonInputRef.current?.focus();
          return;
      }

      // 2. Add new season
      const updatedSeasons = [...currentSeasons, newSeason];

      // 3. Save updated list
      localStorage.setItem(SEASONS_LIST_KEY, JSON.stringify(updatedSeasons));

      // 4. Update component state
      setSeasons(updatedSeasons);
      setSelectedSeasonId(newId); // Automatically select the new season
      setSelectedTournamentId(null); // Ensure tournament is deselected
      setNewSeasonName(''); // Clear input
      setShowNewSeasonInput(false); // Hide input field

      console.log("Added new season:", newSeason);

    } catch (error) {
      console.error("Failed to save new season:", error);
      alert(t('newGameSetupModal.errorAddingSeason', 'Error adding new season. See console for details.'));
    }
  };

  // Implement Add New Tournament logic
  const handleAddNewTournament = () => {
    const trimmedName = newTournamentName.trim();
    if (!trimmedName) {
      alert(t('newGameSetupModal.newTournamentNameRequired', 'Please enter a name for the new tournament.'));
      newTournamentInputRef.current?.focus();
      return;
    }

    const newId = `tournament_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newTournament: Tournament = { id: newId, name: trimmedName };

    try {
      // 1. Load current tournaments
      const storedTournaments = localStorage.getItem(TOURNAMENTS_LIST_KEY);
      const currentTournaments: Tournament[] = storedTournaments ? JSON.parse(storedTournaments) : [];

      // Check for duplicate names (optional but recommended)
      if (currentTournaments.some(t => t.name.toLowerCase() === trimmedName.toLowerCase())) {
          alert(t('newGameSetupModal.duplicateTournamentName', 'A tournament with this name already exists.'));
          newTournamentInputRef.current?.focus();
          return;
      }

      // 2. Add new tournament
      const updatedTournaments = [...currentTournaments, newTournament];

      // 3. Save updated list
      localStorage.setItem(TOURNAMENTS_LIST_KEY, JSON.stringify(updatedTournaments));

      // 4. Update component state
      setTournaments(updatedTournaments);
      setSelectedTournamentId(newId); // Automatically select the new tournament
      setSelectedSeasonId(null); // Ensure season is deselected
      setNewTournamentName(''); // Clear input
      setShowNewTournamentInput(false); // Hide input field

      console.log("Added new tournament:", newTournament);

    } catch (error) {
      console.error("Failed to save new tournament:", error);
      alert(t('newGameSetupModal.errorAddingTournament', 'Error adding new tournament. See console for details.'));
    }
  };
  // --- End Handlers for Create New ---


  const handleStartClick = () => {
    const trimmedOpponentName = opponentName.trim();
    if (!trimmedOpponentName) {
      alert(t('newGameSetupModal.opponentRequiredAlert', 'Please enter an opponent name.'));
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

    const finalGameTime = (gameHour && gameMinute) ? `${gameHour.padStart(2, '0')}:${gameMinute.padStart(2, '0')}` : '';

    // Parse duration string into number before calling onStart
    const finalDuration = Math.max(1, parseInt(localPeriodDurationString, 10) || 1);

    // Call the onStart prop with ALL collected data
    onStart(
      trimmedOpponentName,
      gameDate,
      gameLocation.trim(),
      finalGameTime,
      selectedSeasonId,
      selectedTournamentId,
      localNumPeriods, // Pass the selected number of periods
      finalDuration    // Pass the parsed and validated number duration
    );
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
              <div className="flex space-x-2 items-center">
                <input 
                  ref={newSeasonInputRef}
                  type="text"
                  value={newSeasonName}
                  onChange={(e) => setNewSeasonName(e.target.value)}
                  onKeyDown={handleNewSeasonKeyDown}
                  placeholder={t('newGameSetupModal.newSeasonPlaceholder', 'Enter new season name...') ?? undefined}
                  className="flex-grow px-3 py-1.5 bg-slate-600 border border-slate-400 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
                <button 
                  onClick={handleAddNewSeason} 
                  className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm whitespace-nowrap"
                  disabled={!newSeasonName.trim()}
                >
                    {t('newGameSetupModal.addButton', 'Add')}
                </button>
                <button 
                    onClick={() => setShowNewSeasonInput(false)} 
                    className="px-3 py-1.5 bg-slate-600 text-white rounded hover:bg-slate-500 text-sm whitespace-nowrap"
                    title={t('newGameSetupModal.cancelAddTitle', 'Cancel Add') ?? undefined}
                 >
                     {t('newGameSetupModal.cancelButton', 'Cancel')}
                 </button>
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
                  <div className="flex space-x-2 items-center">
                      <input 
                          ref={newTournamentInputRef}
                          type="text"
                          value={newTournamentName}
                          onChange={(e) => setNewTournamentName(e.target.value)}
                          onKeyDown={handleNewTournamentKeyDown}
                          placeholder={t('newGameSetupModal.newTournamentPlaceholder', 'Enter new tournament name...') ?? undefined}
                          className="flex-grow px-3 py-1.5 bg-slate-600 border border-slate-400 rounded-md shadow-sm text-slate-100 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      />
                      <button 
                          onClick={handleAddNewTournament} 
                          className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 text-sm whitespace-nowrap"
                          disabled={!newTournamentName.trim()}
                      >
                          {t('newGameSetupModal.addButton', 'Add')}
                      </button>
                      <button 
                          onClick={() => setShowNewTournamentInput(false)} 
                          className="px-3 py-1.5 bg-slate-600 text-white rounded hover:bg-slate-500 text-sm whitespace-nowrap"
                          title={t('newGameSetupModal.cancelAddTitle', 'Cancel Add') ?? undefined}
                      >
                          {t('newGameSetupModal.cancelButton', 'Cancel')}
                      </button>
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