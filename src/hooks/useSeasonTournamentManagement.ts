import { useState, useEffect, useRef } from 'react';
import { UseMutationResult } from '@tanstack/react-query';
import { Season, Tournament } from '@/types';
import { getSeasons } from '@/utils/seasons';
import { getTournaments } from '@/utils/tournaments';
import { useErrorHandler } from './useErrorHandler';
import logger from '@/utils/logger';

interface UseSeasonTournamentManagementProps {
  isOpen: boolean;
  seasonId?: string;
  tournamentId?: string;
  onSeasonIdChange: (seasonId: string | undefined) => void;
  onTournamentIdChange: (tournamentId: string | undefined) => void;
  addSeasonMutation: UseMutationResult<Season, Error, { name: string }, unknown>;
  addTournamentMutation: UseMutationResult<Tournament, Error, { name: string }, unknown>;
  t: (key: string, fallback?: string) => string;
}

interface UseSeasonTournamentManagementReturn {
  // State
  seasons: Season[];
  setSeasons: React.Dispatch<React.SetStateAction<Season[]>>;
  tournaments: Tournament[];
  setTournaments: React.Dispatch<React.SetStateAction<Tournament[]>>;
  showNewSeasonInput: boolean;
  setShowNewSeasonInput: React.Dispatch<React.SetStateAction<boolean>>;
  newSeasonName: string;
  setNewSeasonName: React.Dispatch<React.SetStateAction<string>>;
  showNewTournamentInput: boolean;
  setShowNewTournamentInput: React.Dispatch<React.SetStateAction<boolean>>;
  newTournamentName: string;
  setNewTournamentName: React.Dispatch<React.SetStateAction<string>>;
  
  // Refs
  newSeasonInputRef: React.RefObject<HTMLInputElement>;
  newTournamentInputRef: React.RefObject<HTMLInputElement>;
  
  // Handlers
  handleShowCreateSeason: () => void;
  handleShowCreateTournament: () => void;
  handleAddNewSeason: () => Promise<void>;
  handleAddNewTournament: () => Promise<void>;
  handleCancelNewSeason: () => void;
  handleCancelNewTournament: () => void;
}

export function useSeasonTournamentManagement({
  isOpen,
  seasonId,
  tournamentId,
  onSeasonIdChange,
  onTournamentIdChange,
  addSeasonMutation,
  addTournamentMutation,
  t,
}: UseSeasonTournamentManagementProps): UseSeasonTournamentManagementReturn {
  const { handleValidationError, handleStorageError } = useErrorHandler();
  
  // State for seasons and tournaments
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showNewSeasonInput, setShowNewSeasonInput] = useState(false);
  const [newSeasonName, setNewSeasonName] = useState('');
  const [showNewTournamentInput, setShowNewTournamentInput] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState('');
  
  // Refs for focusing inputs
  const newSeasonInputRef = useRef<HTMLInputElement>(null);
  const newTournamentInputRef = useRef<HTMLInputElement>(null);

  // Load seasons and tournaments when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const loadData = async () => {
      try {
        const [loadedSeasons, loadedTournaments] = await Promise.all([
          getSeasons(),
          getTournaments(),
        ]);
        
        setSeasons(loadedSeasons);
        setTournaments(loadedTournaments);
        
        logger.log('[GameSettingsModal] Loaded seasons and tournaments:', {
          seasonsCount: loadedSeasons.length,
          tournamentsCount: loadedTournaments.length,
        });
      } catch (error) {
        handleStorageError(error, 'load seasons and tournaments');
      }
    };

    loadData();
  }, [isOpen]);

  // Auto-focus new input fields when they become visible
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

  // Auto-prefill fields based on season/tournament selection
  useEffect(() => {
    if (!isOpen) return;

    const autoPrefillFromSeason = () => {
      if (seasonId) {
        const selectedSeason = seasons.find(s => s.id === seasonId);
        if (selectedSeason) {
          // Auto-prefill logic could go here if needed
          logger.log('[GameSettingsModal] Selected season:', selectedSeason.name);
        }
      }
    };

    const autoPrefillFromTournament = () => {
      if (tournamentId) {
        const selectedTournament = tournaments.find(t => t.id === tournamentId);
        if (selectedTournament) {
          // Auto-prefill logic could go here if needed
          logger.log('[GameSettingsModal] Selected tournament:', selectedTournament.name);
        }
      }
    };

    autoPrefillFromSeason();
    autoPrefillFromTournament();
  }, [isOpen, seasonId, tournamentId, seasons, tournaments]);

  // Handlers for creating new seasons/tournaments
  const handleShowCreateSeason = () => {
    setShowNewSeasonInput(true);
    onSeasonIdChange(undefined);
    onTournamentIdChange(undefined);
  };

  const handleShowCreateTournament = () => {
    setShowNewTournamentInput(true);
    onTournamentIdChange(undefined);
    onSeasonIdChange(undefined);
  };

  const handleAddNewSeason = async () => {
    const trimmedName = newSeasonName.trim();
    if (!trimmedName) {
      handleValidationError(t('gameSettingsModal.newSeasonNameRequired', 'Please enter a name for the new season.'), 'Season Name');
      newSeasonInputRef.current?.focus();
      return;
    }

    try {
      const newSeason = await addSeasonMutation.mutateAsync({ name: trimmedName });
      
      if (newSeason) {
        setSeasons(prevSeasons => [...prevSeasons, newSeason].sort((a, b) => a.name.localeCompare(b.name)));
        onSeasonIdChange(newSeason.id);
        
        // Reset form
        setShowNewSeasonInput(false);
        setNewSeasonName('');
        
        logger.log('[GameSettingsModal] New season added:', newSeason.name);
      }
    } catch (error) {
      handleStorageError(error, 'add new season');
    }
  };

  const handleAddNewTournament = async () => {
    const trimmedName = newTournamentName.trim();
    if (!trimmedName) {
      handleValidationError(t('gameSettingsModal.newTournamentNameRequired', 'Please enter a name for the new tournament.'), 'Tournament Name');
      newTournamentInputRef.current?.focus();
      return;
    }

    try {
      const newTournament = await addTournamentMutation.mutateAsync({ name: trimmedName });
      
      if (newTournament) {
        setTournaments(prevTournaments => [...prevTournaments, newTournament].sort((a, b) => a.name.localeCompare(b.name)));
        onTournamentIdChange(newTournament.id);
        
        // Reset form
        setShowNewTournamentInput(false);
        setNewTournamentName('');
        
        logger.log('[GameSettingsModal] New tournament added:', newTournament.name);
      }
    } catch (error) {
      handleStorageError(error, 'add new tournament');
    }
  };

  const handleCancelNewSeason = () => {
    setShowNewSeasonInput(false);
    setNewSeasonName('');
  };

  const handleCancelNewTournament = () => {
    setShowNewTournamentInput(false);
    setNewTournamentName('');
  };

  return {
    // State
    seasons,
    setSeasons,
    tournaments,
    setTournaments,
    showNewSeasonInput,
    setShowNewSeasonInput,
    newSeasonName,
    setNewSeasonName,
    showNewTournamentInput,
    setShowNewTournamentInput,
    newTournamentName,
    setNewTournamentName,
    
    // Refs
    newSeasonInputRef,
    newTournamentInputRef,
    
    // Handlers
    handleShowCreateSeason,
    handleShowCreateTournament,
    handleAddNewSeason,
    handleAddNewTournament,
    handleCancelNewSeason,
    handleCancelNewTournament,
  };
}