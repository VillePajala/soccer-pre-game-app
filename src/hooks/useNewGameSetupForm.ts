/**
 * New Game Setup Form Hook - Zustand Integration
 * 
 * This hook provides centralized form state management for NewGameSetupModal,
 * replacing distributed useState calls with a unified FormStore approach.
 * Handles 25+ form fields including team info, game configuration, player 
 * selection, and complex season/tournament management.
 * 
 * Migration Strategy:
 * - Replace distributed useState with centralized FormStore
 * - Maintain existing validation patterns  
 * - Add form persistence across modal sessions
 * - Provide backward compatibility during transition
 */

import { useMemo, useCallback } from 'react';
import { useForm } from '@/hooks/useForm';
import { FormSchema } from '@/stores/formStore';
import { validationRules } from '@/utils/formValidation';
// Removed useMigrationSafety - now using pure Zustand implementation
import { AGE_GROUPS, LEVELS } from '@/config/gameOptions';
import logger from '@/utils/logger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface NewGameSetupFormValues {
  // Basic Game Information
  teamName: string;
  opponentName: string;
  gameDate: string;
  gameTime: string;
  gameLocation: string;
  
  // Season/Tournament Management
  seasonId: string | null;
  tournamentId: string | null;
  newSeasonName: string;
  newTournamentName: string;
  
  // Game Configuration
  ageGroup: string;
  tournamentLevel: string;
  homeOrAway: 'home' | 'away';
  numPeriods: 1 | 2;
  periodDurationMinutes: number;
  demandFactor: number;
  isPlayed: boolean;
  
  // Player Management
  selectedPlayerIds: string[];
  
  // Time Components (for UI convenience)
  gameHour: string;
  gameMinute: string;
}

export interface NewGameSetupFormOptions {
  // External data
  availableSeasons?: Array<{ id: string; name: string; location?: string; ageGroup?: string; periodCount?: number; periodDuration?: number; defaultRoster?: string[] }>;
  availableTournaments?: Array<{ id: string; name: string; location?: string; ageGroup?: string; level?: string; periodCount?: number; periodDuration?: number; defaultRoster?: string[] }>;
  availablePlayers?: Array<{ id: string; name: string }>;
  
  // Initial values
  initialPlayerSelection?: string[] | null;
  initialTeamName?: string;
  demandFactor?: number;
  
  // Callbacks
  onSubmit?: (values: NewGameSetupFormValues) => Promise<void> | void;
  onFieldChange?: (fieldName: keyof NewGameSetupFormValues, value: any) => void;
  onSeasonCreate?: (name: string) => Promise<string>;
  onTournamentCreate?: (name: string) => Promise<string>;
  onDemandFactorChange?: (factor: number) => void;
  
  // Form behavior
  persistForm?: boolean;
  validateOnChange?: boolean;
}

export interface UseNewGameSetupFormResult {
  // Form state
  values: NewGameSetupFormValues;
  errors: Record<string, string | null>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValidating: boolean;
  isValid: boolean;
  isDirty: boolean;
  hasErrors: boolean;
  
  // Form actions
  setFieldValue: (name: keyof NewGameSetupFormValues, value: any) => void;
  setFieldValues: (values: Partial<NewGameSetupFormValues>) => void;
  validateForm: () => Promise<void>;
  submitForm: () => Promise<void>;
  resetForm: () => void;
  clearForm: () => void;
  
  // Field helpers
  getField: (name: keyof NewGameSetupFormValues) => {
    value: any;
    error: string | null;
    touched: boolean;
    onChange: (value: any) => void;
    onBlur: () => void;
  };
  
  // Specialized handlers
  handleTeamNameChange: (name: string) => void;
  handleOpponentNameChange: (name: string) => void;
  handleGameDateChange: (date: string) => void;
  handleGameTimeChange: (time: string) => void;
  handleGameLocationChange: (location: string) => void;
  handleSeasonChange: (seasonId: string | null) => void;
  handleTournamentChange: (tournamentId: string | null) => void;
  handleAgeGroupChange: (ageGroup: string) => void;
  handleTournamentLevelChange: (level: string) => void;
  handleHomeOrAwayChange: (homeOrAway: 'home' | 'away') => void;
  handleNumPeriodsChange: (periods: 1 | 2) => void;
  handlePeriodDurationChange: (minutes: number) => void;
  handleDemandFactorChange: (factor: number) => void;
  handleIsPlayedChange: (isPlayed: boolean) => void;
  handleSelectedPlayersChange: (playerIds: string[]) => void;
  handleGameHourChange: (hour: string) => void;
  handleGameMinuteChange: (minute: string) => void;
  
  // Season/Tournament creation
  handleCreateSeason: () => Promise<void>;
  handleCreateTournament: () => Promise<void>;
  
  // Form state queries
  hasFormChanged: () => boolean;
  getFormData: () => NewGameSetupFormValues;
  getGameTime: () => string;
  
  // Migration status
  migrationStatus: 'zustand' | 'legacy';
}

// ============================================================================
// Custom Validation Rules
// ============================================================================

const newGameSetupValidationRules = {
  gameTime: {
    type: 'custom' as const,
    message: 'Please enter a valid time',
    validator: (value: any, formValues: Record<string, any>) => {
      const hour = formValues.gameHour;
      const minute = formValues.gameMinute;
      
      // Time is optional - if both are empty, it's valid
      if (!hour && !minute) return true;
      
      // If one is provided, both must be provided and valid
      const hourNum = parseInt(hour as string, 10);
      const minuteNum = parseInt(minute as string, 10);
      
      if (isNaN(hourNum) || isNaN(minuteNum)) return false;
      if (hourNum < 0 || hourNum > 23) return false;
      if (minuteNum < 0 || minuteNum > 59) return false;
      
      return true;
    },
  },
  
  gameDate: {
    type: 'custom' as const,
    message: 'Please enter a valid date',
    validator: (value: any) => {
      if (!value || typeof value !== 'string') return false;
      
      // Check date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
      
      // Check if it's a valid date
      const date = new Date(value);
      return !isNaN(date.getTime()) && date.toISOString().split('T')[0] === value;
    },
  },
  
  periodDurationMinutes: {
    type: 'custom' as const,
    message: 'Duration must be between 1 and 120 minutes',
    validator: (value: any) => {
      const num = Number(value);
      return !isNaN(num) && num >= 1 && num <= 120;
    },
  },
  
  demandFactor: {
    type: 'custom' as const,
    message: 'Demand factor must be between 0.5 and 1.5',
    validator: (value: any) => {
      const num = Number(value);
      return !isNaN(num) && num >= 0.5 && num <= 1.5;
    },
  },
  
  gameHour: {
    type: 'custom' as const,
    message: 'Hour must be between 0 and 23',
    validator: (value: any) => {
      // Hour is optional
      if (!value || value === '') return true;
      
      const num = parseInt(value as string, 10);
      return !isNaN(num) && num >= 0 && num <= 23;
    },
  },
  
  gameMinute: {
    type: 'custom' as const,
    message: 'Minute must be between 0 and 59',
    validator: (value: any) => {
      // Minute is optional
      if (!value || value === '') return true;
      
      const num = parseInt(value as string, 10);
      return !isNaN(num) && num >= 0 && num <= 59;
    },
  },
  
  conditionalSeasonName: {
    type: 'custom' as const,
    message: 'Season name is required when creating a new season',
    validator: (value: any, formValues: Record<string, any>) => {
      // Only required if seasonId is null but we're trying to create one
      if (formValues.seasonId === null && formValues.newSeasonName) {
        return value && typeof value === 'string' && value.trim().length > 0;
      }
      return true;
    },
  },
  
  conditionalTournamentName: {
    type: 'custom' as const,
    message: 'Tournament name is required when creating a new tournament',
    validator: (value: any, formValues: Record<string, any>) => {
      // Only required if tournamentId is null but we're trying to create one
      if (formValues.tournamentId === null && formValues.newTournamentName) {
        return value && typeof value === 'string' && value.trim().length > 0;
      }
      return true;
    },
  },
  
  playerSelection: {
    type: 'custom' as const,
    message: 'Please select at least one player',
    validator: (value: any) => {
      return Array.isArray(value) && value.length > 0;
    },
  },
};

// ============================================================================
// Form Schema Factory
// ============================================================================

function createNewGameSetupSchema(options: NewGameSetupFormOptions = {}): FormSchema {
  const currentDate = new Date().toISOString().split('T')[0];
  
  return {
    formId: 'newGameSetup',
    fields: {
      // Basic Game Information
      teamName: {
        initialValue: options.initialTeamName || '',
        validation: validationRules.teamName(),
        persist: true,
      },
      opponentName: {
        initialValue: '',
        validation: validationRules.teamName('Opponent name is required'),
        persist: false, // Don't persist opponent for privacy
      },
      gameDate: {
        initialValue: currentDate,
        validation: [
          validationRules.required('Game date is required'),
          newGameSetupValidationRules.gameDate,
        ],
        persist: true,
      },
      gameTime: {
        initialValue: '',
        validation: [newGameSetupValidationRules.gameTime],
        persist: true,
      },
      gameLocation: {
        initialValue: '',
        validation: validationRules.gameLocation(),
        persist: true,
      },
      
      // Season/Tournament Management
      seasonId: {
        initialValue: null,
        validation: [],
        persist: true,
      },
      tournamentId: {
        initialValue: null,
        validation: [],
        persist: true,
      },
      newSeasonName: {
        initialValue: '',
        validation: [newGameSetupValidationRules.conditionalSeasonName],
        persist: false, // Don't persist creation fields
      },
      newTournamentName: {
        initialValue: '',
        validation: [newGameSetupValidationRules.conditionalTournamentName],
        persist: false, // Don't persist creation fields
      },
      
      // Game Configuration
      ageGroup: {
        initialValue: '',
        validation: [
          validationRules.custom(
            (value) => !value || AGE_GROUPS.includes(value as string),
            'Invalid age group'
          ),
        ],
        persist: true,
      },
      tournamentLevel: {
        initialValue: '',
        validation: [
          validationRules.custom(
            (value) => !value || LEVELS.includes(value as string),
            'Invalid tournament level'
          ),
        ],
        persist: true,
      },
      homeOrAway: {
        initialValue: 'home',
        validation: [
          validationRules.custom(
            (value) => ['home', 'away'].includes(value as string),
            'Must be either home or away'
          ),
        ],
        persist: true,
      },
      numPeriods: {
        initialValue: 2,
        validation: [
          validationRules.custom(
            (value) => [1, 2].includes(Number(value)),
            'Must be 1 or 2 periods'
          ),
        ],
        persist: true,
      },
      periodDurationMinutes: {
        initialValue: 10,
        validation: [
          validationRules.required('Period duration is required'),
          newGameSetupValidationRules.periodDurationMinutes,
        ],
        persist: true,
      },
      demandFactor: {
        initialValue: options.demandFactor || 1.0,
        validation: [newGameSetupValidationRules.demandFactor],
        persist: true,
      },
      isPlayed: {
        initialValue: true,
        validation: [],
        persist: true,
      },
      
      // Player Management
      selectedPlayerIds: {
        initialValue: options.initialPlayerSelection || [],
        validation: [newGameSetupValidationRules.playerSelection],
        persist: true,
      },
      
      // Time Components
      gameHour: {
        initialValue: '',
        validation: [newGameSetupValidationRules.gameHour],
        persist: true,
      },
      gameMinute: {
        initialValue: '',
        validation: [newGameSetupValidationRules.gameMinute],
        persist: true,
      },
    },
    persistence: {
      enabled: options.persistForm !== false,
      key: 'newGameSetup',
      restoreOnMount: true,
      excludeFields: ['newSeasonName', 'newTournamentName', 'opponentName'],
    },
    validation: {
      validateOnChange: options.validateOnChange !== false,
      validateOnBlur: true,
      validateOnMount: false,
      debounceMs: 300,
    },
  };
}

// ============================================================================
// Main Hook Implementation
// ============================================================================

export function useNewGameSetupForm(
  options: NewGameSetupFormOptions = {}
): UseNewGameSetupFormResult {
  // Create form schema
  const schema = useMemo(() => createNewGameSetupSchema(options), [options]);
  
  // Use modern FormStore implementation with Zustand
  const form = useForm<NewGameSetupFormValues>(schema, {
    onSubmit: options.onSubmit,
    onFieldChange: options.onFieldChange,
    persistForm: options.persistForm,
    validateOnMount: false,
  });
  
  // ============================================================================
  // Specialized Field Handlers
  // ============================================================================
  
  const handleTeamNameChange = useCallback((name: string) => {
    form.setFieldValue('teamName', name);
    logger.debug('[NewGameSetupForm] Team name changed:', name);
  }, [form]);
  
  const handleOpponentNameChange = useCallback((name: string) => {
    form.setFieldValue('opponentName', name);
    logger.debug('[NewGameSetupForm] Opponent name changed:', name);
  }, [form]);
  
  const handleGameDateChange = useCallback((date: string) => {
    form.setFieldValue('gameDate', date);
    logger.debug('[NewGameSetupForm] Game date changed:', date);
  }, [form]);
  
  const handleGameTimeChange = useCallback((time: string) => {
    form.setFieldValue('gameTime', time);
    
    // Also update hour and minute components if time is in HH:MM format
    if (time && /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time)) {
      const [hour, minute] = time.split(':');
      form.setFieldValues({
        gameHour: hour,
        gameMinute: minute,
      });
    }
    
    logger.debug('[NewGameSetupForm] Game time changed:', time);
  }, [form]);
  
  const handleGameLocationChange = useCallback((location: string) => {
    form.setFieldValue('gameLocation', location);
    logger.debug('[NewGameSetupForm] Game location changed:', location);
  }, [form]);
  
  const handleSeasonChange = useCallback((seasonId: string | null) => {
    form.setFieldValues({
      seasonId,
      tournamentId: null, // Clear tournament when selecting season
      newSeasonName: '',
      newTournamentName: '',
    });
    
    // Auto-populate fields from season data if available
    if (seasonId && options.availableSeasons) {
      const season = options.availableSeasons.find(s => s.id === seasonId);
      if (season) {
        const updates: Partial<NewGameSetupFormValues> = {};
        if (season.location) updates.gameLocation = season.location;
        if (season.ageGroup) updates.ageGroup = season.ageGroup;
        if (season.periodCount) updates.numPeriods = season.periodCount as 1 | 2;
        if (season.periodDuration) updates.periodDurationMinutes = season.periodDuration;
        if (season.defaultRoster && season.defaultRoster.length > 0) {
          updates.selectedPlayerIds = season.defaultRoster;
        }
        
        form.setFieldValues(updates);
      }
    }
    
    logger.debug('[NewGameSetupForm] Season changed:', seasonId);
  }, [form, options.availableSeasons]);
  
  const handleTournamentChange = useCallback((tournamentId: string | null) => {
    form.setFieldValues({
      tournamentId,
      seasonId: null, // Clear season when selecting tournament
      newSeasonName: '',
      newTournamentName: '',
    });
    
    // Auto-populate fields from tournament data if available
    if (tournamentId && options.availableTournaments) {
      const tournament = options.availableTournaments.find(t => t.id === tournamentId);
      if (tournament) {
        const updates: Partial<NewGameSetupFormValues> = {};
        if (tournament.location) updates.gameLocation = tournament.location;
        if (tournament.ageGroup) updates.ageGroup = tournament.ageGroup;
        if (tournament.level) updates.tournamentLevel = tournament.level;
        if (tournament.periodCount) updates.numPeriods = tournament.periodCount as 1 | 2;
        if (tournament.periodDuration) updates.periodDurationMinutes = tournament.periodDuration;
        if (tournament.defaultRoster && tournament.defaultRoster.length > 0) {
          updates.selectedPlayerIds = tournament.defaultRoster;
        }
        
        form.setFieldValues(updates);
      }
    }
    
    logger.debug('[NewGameSetupForm] Tournament changed:', tournamentId);
  }, [form, options.availableTournaments]);
  
  const handleAgeGroupChange = useCallback((ageGroup: string) => {
    form.setFieldValue('ageGroup', ageGroup);
  }, [form]);
  
  const handleTournamentLevelChange = useCallback((level: string) => {
    form.setFieldValue('tournamentLevel', level);
  }, [form]);
  
  const handleHomeOrAwayChange = useCallback((homeOrAway: 'home' | 'away') => {
    form.setFieldValue('homeOrAway', homeOrAway);
  }, [form]);
  
  const handleNumPeriodsChange = useCallback((periods: 1 | 2) => {
    form.setFieldValue('numPeriods', periods);
  }, [form]);
  
  const handlePeriodDurationChange = useCallback((minutes: number) => {
    form.setFieldValue('periodDurationMinutes', minutes);
  }, [form]);
  
  const handleDemandFactorChange = useCallback((factor: number) => {
    form.setFieldValue('demandFactor', factor);
    
    // Also trigger external callback if provided
    if (options.onDemandFactorChange) {
      options.onDemandFactorChange(factor);
    }
  }, [form, options.onDemandFactorChange]);
  
  const handleIsPlayedChange = useCallback((isPlayed: boolean) => {
    form.setFieldValue('isPlayed', isPlayed);
  }, [form]);
  
  const handleSelectedPlayersChange = useCallback((playerIds: string[]) => {
    form.setFieldValue('selectedPlayerIds', playerIds);
  }, [form]);
  
  const handleGameHourChange = useCallback((hour: string) => {
    // Limit to 2 digits
    const limitedHour = hour.length > 2 ? hour.slice(0, 2) : hour;
    form.setFieldValue('gameHour', limitedHour);
    
    // Update gameTime if both hour and minute are present
    const minute = form.values.gameMinute;
    if (limitedHour && minute) {
      const formattedTime = `${limitedHour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
      form.setFieldValue('gameTime', formattedTime);
    }
  }, [form]);
  
  const handleGameMinuteChange = useCallback((minute: string) => {
    // Limit to 2 digits
    const limitedMinute = minute.length > 2 ? minute.slice(0, 2) : minute;
    form.setFieldValue('gameMinute', limitedMinute);
    
    // Update gameTime if both hour and minute are present
    const hour = form.values.gameHour;
    if (hour && limitedMinute) {
      const formattedTime = `${hour.padStart(2, '0')}:${limitedMinute.padStart(2, '0')}`;
      form.setFieldValue('gameTime', formattedTime);
    }
  }, [form]);
  
  // ============================================================================
  // Dynamic Creation Handlers
  // ============================================================================
  
  const handleCreateSeason = useCallback(async () => {
    if (!options.onSeasonCreate) {
      logger.warn('[NewGameSetupForm] No onSeasonCreate handler provided');
      return;
    }
    
    const seasonName = form.values.newSeasonName;
    if (!seasonName || !seasonName.trim()) {
      form.setFieldError('newSeasonName', 'Season name is required');
      return;
    }
    
    try {
      logger.info('[NewGameSetupForm] Creating new season:', seasonName);
      const seasonId = await options.onSeasonCreate(seasonName.trim());
      
      // Update form with new season
      form.setFieldValues({
        seasonId,
        newSeasonName: '',
      });
      
      logger.info('[NewGameSetupForm] Season created successfully:', seasonId);
    } catch (error) {
      logger.error('[NewGameSetupForm] Failed to create season:', error);
      form.setFieldError('newSeasonName', 'Failed to create season');
    }
  }, [form, options.onSeasonCreate]);
  
  const handleCreateTournament = useCallback(async () => {
    if (!options.onTournamentCreate) {
      logger.warn('[NewGameSetupForm] No onTournamentCreate handler provided');
      return;
    }
    
    const tournamentName = form.values.newTournamentName;
    if (!tournamentName || !tournamentName.trim()) {
      form.setFieldError('newTournamentName', 'Tournament name is required');
      return;
    }
    
    try {
      logger.info('[NewGameSetupForm] Creating new tournament:', tournamentName);
      const tournamentId = await options.onTournamentCreate(tournamentName.trim());
      
      // Update form with new tournament
      form.setFieldValues({
        tournamentId,
        newTournamentName: '',
      });
      
      logger.info('[NewGameSetupForm] Tournament created successfully:', tournamentId);
    } catch (error) {
      logger.error('[NewGameSetupForm] Failed to create tournament:', error);
      form.setFieldError('newTournamentName', 'Failed to create tournament');
    }
  }, [form, options.onTournamentCreate]);
  
  // ============================================================================
  // Form State Queries
  // ============================================================================
  
  const hasFormChanged = useCallback(() => {
    return form.hasChanged();
  }, [form]);
  
  const getFormData = useCallback((): NewGameSetupFormValues => {
    return form.values;
  }, [form]);
  
  const getGameTime = useCallback((): string => {
    const { gameHour, gameMinute, gameTime } = form.values;
    
    // If gameTime is already formatted, return it
    if (gameTime && /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(gameTime)) {
      return gameTime;
    }
    
    // Otherwise, format from hour and minute components
    if (gameHour && gameMinute) {
      return `${gameHour.padStart(2, '0')}:${gameMinute.padStart(2, '0')}`;
    }
    
    return '';
  }, [form]);
  
  // ============================================================================
  // Return Interface
  // ============================================================================
  
  return {
    // Form state
    values: form.values,
    errors: form.errors,
    touched: form.touched,
    isSubmitting: form.isSubmitting,
    isValidating: form.isValidating,
    isValid: form.isValid,
    isDirty: form.isDirty,
    hasErrors: form.hasErrors,
    
    // Form actions
    setFieldValue: form.setFieldValue,
    setFieldValues: form.setFieldValues,
    validateForm: form.validate,
    submitForm: form.submit,
    resetForm: form.reset,
    clearForm: form.clear,
    
    // Field helpers
    getField: form.getField,
    
    // Specialized handlers
    handleTeamNameChange,
    handleOpponentNameChange,
    handleGameDateChange,
    handleGameTimeChange,
    handleGameLocationChange,
    handleSeasonChange,
    handleTournamentChange,
    handleAgeGroupChange,
    handleTournamentLevelChange,
    handleHomeOrAwayChange,
    handleNumPeriodsChange,
    handlePeriodDurationChange,
    handleDemandFactorChange,
    handleIsPlayedChange,
    handleSelectedPlayersChange,
    handleGameHourChange,
    handleGameMinuteChange,
    
    // Dynamic creation
    handleCreateSeason,
    handleCreateTournament,
    
    // Form state queries
    hasFormChanged,
    getFormData,
    getGameTime,
    
    // Migration status
    migrationStatus: 'zustand',
  };
}

// Legacy implementation removed - now using pure Zustand implementation
