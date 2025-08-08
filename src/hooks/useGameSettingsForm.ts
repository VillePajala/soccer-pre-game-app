/**
 * Game Settings Form Hook - Zustand Integration
 * 
 * This hook provides centralized form state management for GameSettingsModal,
 * replacing scattered useState calls with a unified FormStore approach.
 * Handles 30+ form fields including team info, game configuration, player
 * selection, and complex season/tournament management.
 * 
 * Migration Strategy:
 * - Replace distributed useState with centralized FormStore
 * - Maintain existing validation patterns
 * - Add form persistence across modal sessions
 * - Provide backward compatibility during transition
 */

import { useMemo, useCallback } from 'react';
import { useForm, UseFormResult } from '@/hooks/useForm';
import { FormSchema } from '@/stores/formStore';
import { validationRules } from '@/utils/formValidation';
// Removed useMigrationSafety - now using pure Zustand implementation
import logger from '@/utils/logger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface GameSettingsFormValues {
  // Basic Game Information
  teamName: string;
  opponentName: string;
  gameDate: string;
  gameTime: string;
  gameLocation: string;
  
  // Season/Tournament Management
  linkType: 'none' | 'season' | 'tournament';
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
  fairPlayCardPlayerId: string | null;
  
  // Game Notes
  gameNotes: string;
}

export interface GameSettingsFormOptions {
  // External data
  availableSeasons?: Array<{ id: string; name: string }>;
  availableTournaments?: Array<{ id: string; name: string }>;
  availablePlayers?: Array<{ id: string; name: string; receivedFairPlayCard?: boolean }>;
  
  // Callbacks
  onSubmit?: (values: GameSettingsFormValues) => Promise<void> | void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onFieldChange?: (fieldName: keyof GameSettingsFormValues, value: any) => void;
  onSeasonCreate?: (name: string) => Promise<string>;
  onTournamentCreate?: (name: string) => Promise<string>;
  
  // Form behavior
  persistForm?: boolean;
  validateOnChange?: boolean;
}

export interface UseGameSettingsFormResult {
  // Form state
  values: GameSettingsFormValues;
  errors: Record<string, string | null>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValidating: boolean;
  isValid: boolean;
  isDirty: boolean;
  hasErrors: boolean;
  
  // Form actions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setFieldValue: (name: keyof GameSettingsFormValues, value: any) => void;
  setFieldValues: (values: Partial<GameSettingsFormValues>) => void;
  validateForm: () => Promise<void>;
  submitForm: () => Promise<void>;
  resetForm: () => void;
  clearForm: () => void;
  
  // Field helpers
  getField: (name: keyof GameSettingsFormValues) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: any;
    error: string | null;
    touched: boolean;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange: (value: any) => void;
    onBlur: () => void;
  };
  
  // Specialized handlers
  handleTeamNameChange: (name: string) => void;
  handleOpponentNameChange: (name: string) => void;
  handleGameDateChange: (date: string) => void;
  handleGameTimeChange: (time: string) => void;
  handleGameLocationChange: (location: string) => void;
  handleLinkTypeChange: (type: 'none' | 'season' | 'tournament') => void;
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
  handleFairPlayCardChange: (playerId: string | null) => void;
  handleGameNotesChange: (notes: string) => void;
  
  // Dynamic creation
  handleCreateSeason: () => Promise<void>;
  handleCreateTournament: () => Promise<void>;
  
  // Form state queries
  hasFormChanged: () => boolean;
  getFormData: () => GameSettingsFormValues;
  
  // Migration status
  migrationStatus: 'zustand' | 'legacy';
}

// ============================================================================
// Custom Validation Rules
// ============================================================================

const gameSettingsValidationRules = {
  gameTime: {
    type: 'pattern' as const,
    value: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,
    message: 'Please enter a valid time in HH:MM format',
  },
  
  gameDate: {
    type: 'custom' as const,
    message: 'Please enter a valid date',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validator: (value: any) => {
      if (!value || typeof value !== 'string') return true; // Optional field
      
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validator: (value: any) => {
      const num = Number(value);
      return !isNaN(num) && num >= 1 && num <= 120;
    },
  },
  
  demandFactor: {
    type: 'custom' as const,
    message: 'Demand factor must be between 0.5 and 1.5',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validator: (value: any) => {
      const num = Number(value);
      return !isNaN(num) && num >= 0.5 && num <= 1.5;
    },
  },
  
  conditionalSeasonName: {
    type: 'custom' as const,
    message: 'Season name is required when creating a new season',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validator: (value: any, formValues: Record<string, any>) => {
      // Only required if linkType is season and seasonId is null (creating new)
      if (formValues.linkType === 'season' && formValues.seasonId === null) {
        return value && typeof value === 'string' && value.trim().length > 0;
      }
      return true;
    },
  },
  
  conditionalTournamentName: {
    type: 'custom' as const,
    message: 'Tournament name is required when creating a new tournament',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    validator: (value: any, formValues: Record<string, any>) => {
      // Only required if linkType is tournament and tournamentId is null (creating new)
      if (formValues.linkType === 'tournament' && formValues.tournamentId === null) {
        return value && typeof value === 'string' && value.trim().length > 0;
      }
      return true;
    },
  },
};

// ============================================================================
// Form Schema Factory
// ============================================================================

function createGameSettingsSchema(options: GameSettingsFormOptions = {}): FormSchema {
  const currentDate = new Date().toISOString().split('T')[0];
  
  return {
    formId: 'gameSettings',
    fields: {
      // Basic Game Information
      teamName: {
        initialValue: '',
        validation: validationRules.teamName(),
        persist: true,
      },
      opponentName: {
        initialValue: '',
        validation: validationRules.teamName('Opponent name is required'),
        persist: true,
      },
      gameDate: {
        initialValue: currentDate,
        validation: [gameSettingsValidationRules.gameDate],
        persist: true,
      },
      gameTime: {
        initialValue: '18:00',
        validation: [gameSettingsValidationRules.gameTime],
        persist: true,
      },
      gameLocation: {
        initialValue: '',
        validation: validationRules.gameLocation(),
        persist: true,
      },
      
      // Season/Tournament Management
      linkType: {
        initialValue: 'none',
        validation: [
          validationRules.custom(
            (value) => ['none', 'season', 'tournament'].includes(value as string),
            'Invalid link type'
          ),
        ],
        persist: true,
      },
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
        validation: [gameSettingsValidationRules.conditionalSeasonName],
        persist: false, // Don't persist creation fields
      },
      newTournamentName: {
        initialValue: '',
        validation: [gameSettingsValidationRules.conditionalTournamentName],
        persist: false, // Don't persist creation fields
      },
      
      // Game Configuration
      ageGroup: {
        initialValue: '',
        validation: [],
        persist: true,
      },
      tournamentLevel: {
        initialValue: '',
        validation: [],
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
        initialValue: 45,
        validation: [gameSettingsValidationRules.periodDurationMinutes],
        persist: true,
      },
      demandFactor: {
        initialValue: 1.0,
        validation: [gameSettingsValidationRules.demandFactor],
        persist: true,
      },
      isPlayed: {
        initialValue: false,
        validation: [],
        persist: true,
      },
      
      // Player Management
      selectedPlayerIds: {
        initialValue: [],
        validation: [],
        persist: true,
      },
      fairPlayCardPlayerId: {
        initialValue: null,
        validation: [],
        persist: true,
      },
      
      // Game Notes
      gameNotes: {
        initialValue: '',
        validation: [validationRules.maxLength(500, 'Notes must be no more than 500 characters')],
        persist: false, // Don't persist notes for privacy
      },
    },
    persistence: {
      enabled: options.persistForm !== false,
      key: 'gameSettings',
      restoreOnMount: true,
      excludeFields: ['newSeasonName', 'newTournamentName', 'gameNotes'],
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

export function useGameSettingsForm(
  options: GameSettingsFormOptions = {}
): UseGameSettingsFormResult {
  // Create form schema
  const schema = useMemo(() => createGameSettingsSchema(options), [options]);
  
  // Use modern FormStore implementation with Zustand
  const form = useForm(schema, {
    onSubmit: options.onSubmit as ((values: Record<string, unknown>) => void | Promise<void>) | undefined,
    onFieldChange: options.onFieldChange as ((fieldName: string, value: unknown) => void) | undefined,
    persistForm: options.persistForm,
    validateOnMount: false,
  }) as unknown as UseFormResult<GameSettingsFormValues>;
  
  // ============================================================================
  // Specialized Field Handlers
  // ============================================================================
  
  const handleTeamNameChange = useCallback((name: string) => {
    form.setFieldValue('teamName', name);
    logger.debug('[GameSettingsForm] Team name changed:', name);
  }, [form]);
  
  const handleOpponentNameChange = useCallback((name: string) => {
    form.setFieldValue('opponentName', name);
    logger.debug('[GameSettingsForm] Opponent name changed:', name);
  }, [form]);
  
  const handleGameDateChange = useCallback((date: string) => {
    form.setFieldValue('gameDate', date);
    logger.debug('[GameSettingsForm] Game date changed:', date);
  }, [form]);
  
  const handleGameTimeChange = useCallback((time: string) => {
    form.setFieldValue('gameTime', time);
    logger.debug('[GameSettingsForm] Game time changed:', time);
  }, [form]);
  
  const handleGameLocationChange = useCallback((location: string) => {
    form.setFieldValue('gameLocation', location);
    logger.debug('[GameSettingsForm] Game location changed:', location);
  }, [form]);
  
  const handleLinkTypeChange = useCallback((type: 'none' | 'season' | 'tournament') => {
    // Clear season/tournament selection when changing link type
    form.setFieldValues({
      linkType: type,
      seasonId: null,
      tournamentId: null,
      newSeasonName: '',
      newTournamentName: '',
    });
    logger.debug('[GameSettingsForm] Link type changed:', type);
  }, [form]);
  
  const handleSeasonChange = useCallback((seasonId: string | null) => {
    form.setFieldValues({
      seasonId,
      tournamentId: null, // Clear tournament when selecting season
      newSeasonName: '',
      newTournamentName: '',
    });
    logger.debug('[GameSettingsForm] Season changed:', seasonId);
  }, [form]);
  
  const handleTournamentChange = useCallback((tournamentId: string | null) => {
    form.setFieldValues({
      tournamentId,
      seasonId: null, // Clear season when selecting tournament
      newSeasonName: '',
      newTournamentName: '',
    });
    logger.debug('[GameSettingsForm] Tournament changed:', tournamentId);
  }, [form]);
  
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
  }, [form]);
  
  const handleIsPlayedChange = useCallback((isPlayed: boolean) => {
    form.setFieldValue('isPlayed', isPlayed);
  }, [form]);
  
  const handleSelectedPlayersChange = useCallback((playerIds: string[]) => {
    form.setFieldValue('selectedPlayerIds', playerIds);
  }, [form]);
  
  const handleFairPlayCardChange = useCallback((playerId: string | null) => {
    form.setFieldValue('fairPlayCardPlayerId', playerId);
  }, [form]);
  
  const handleGameNotesChange = useCallback((notes: string) => {
    form.setFieldValue('gameNotes', notes);
  }, [form]);
  
  // ============================================================================
  // Dynamic Creation Handlers
  // ============================================================================
  
  const handleCreateSeason = useCallback(async () => {
    if (!options.onSeasonCreate) {
      logger.warn('[GameSettingsForm] No onSeasonCreate handler provided');
      return;
    }
    
    const seasonName = form.values.newSeasonName;
    if (!seasonName || !seasonName.trim()) {
      form.setFieldError('newSeasonName', 'Season name is required');
      return;
    }
    
    try {
      logger.info('[GameSettingsForm] Creating new season:', seasonName);
      const seasonId = await options.onSeasonCreate(seasonName.trim());
      
      // Update form with new season
      form.setFieldValues({
        seasonId,
        newSeasonName: '',
        linkType: 'season',
      });
      
      logger.info('[GameSettingsForm] Season created successfully:', seasonId);
    } catch (error) {
      logger.error('[GameSettingsForm] Failed to create season:', error);
      form.setFieldError('newSeasonName', 'Failed to create season');
    }
  }, [form, options]);
  
  const handleCreateTournament = useCallback(async () => {
    if (!options.onTournamentCreate) {
      logger.warn('[GameSettingsForm] No onTournamentCreate handler provided');
      return;
    }
    
    const tournamentName = form.values.newTournamentName;
    if (!tournamentName || !tournamentName.trim()) {
      form.setFieldError('newTournamentName', 'Tournament name is required');
      return;
    }
    
    try {
      logger.info('[GameSettingsForm] Creating new tournament:', tournamentName);
      const tournamentId = await options.onTournamentCreate(tournamentName.trim());
      
      // Update form with new tournament
      form.setFieldValues({
        tournamentId,
        newTournamentName: '',
        linkType: 'tournament',
      });
      
      logger.info('[GameSettingsForm] Tournament created successfully:', tournamentId);
    } catch (error) {
      logger.error('[GameSettingsForm] Failed to create tournament:', error);
      form.setFieldError('newTournamentName', 'Failed to create tournament');
    }
  }, [form, options]);
  
  // ============================================================================
  // Form State Queries
  // ============================================================================
  
  const hasFormChanged = useCallback(() => {
    return form.hasChanged();
  }, [form]);
  
  const getFormData = useCallback((): GameSettingsFormValues => {
    return form.values;
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
    validateForm: async () => { await form.validate(); },
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
    handleLinkTypeChange,
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
    handleFairPlayCardChange,
    handleGameNotesChange,
    
    // Dynamic creation
    handleCreateSeason,
    handleCreateTournament,
    
    // Form state queries
    hasFormChanged,
    getFormData,
    
    // Migration status
    migrationStatus: 'zustand',
  };
}

// Legacy implementation removed - now using pure Zustand implementation

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert current GameSettingsModal props to form values
 */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
export function convertPropsToFormValues(props: any): Partial<GameSettingsFormValues> {
  return {
    teamName: props.teamName || '',
    opponentName: props.opponentName || '',
    gameDate: props.gameDate || '',
    gameTime: props.gameTime || '',
    gameLocation: props.gameLocation || '',
    ageGroup: props.ageGroup || '',
    tournamentLevel: props.tournamentLevel || '',
    homeOrAway: props.homeOrAway || 'home',
    numPeriods: props.numPeriods || 2,
    periodDurationMinutes: props.periodDurationMinutes || 45,
    demandFactor: props.demandFactor || 1.0,
    isPlayed: props.isPlayed || false,
    selectedPlayerIds: props.selectedPlayerIds || [],
    fairPlayCardPlayerId: props.fairPlayCardPlayerId || null,
    gameNotes: props.gameNotes || '',
  };
}

/**
 * Extract fair play card player from available players
 */
export function extractFairPlayCardPlayer(
  availablePlayers: Array<{ id: string; receivedFairPlayCard?: boolean }>
): string | null {
  const player = availablePlayers.find(p => p.receivedFairPlayCard);
  return player ? player.id : null;
}