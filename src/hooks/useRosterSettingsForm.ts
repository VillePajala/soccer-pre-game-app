/**
 * Roster Settings Form Hook - Zustand Integration
 * 
 * This hook provides centralized form state management for RosterSettingsModal,
 * replacing distributed useState calls with a unified FormStore approach.
 * Handles player management, team name editing, search functionality, and
 * complex editing workflows for roster operations.
 * 
 * Migration Strategy:
 * - Replace distributed useState with centralized FormStore
 * - Maintain existing validation patterns
 * - Add form persistence across modal sessions
 * - Provide backward compatibility during transition
 */

import { useMemo, useCallback, useEffect } from 'react';
import { useForm } from '@/hooks/useForm';
import { FormSchema } from '@/stores/formStore';
import { validationRules as _validationRules } from '@/utils/formValidation';
import { useMigrationSafety } from '@/hooks/useMigrationSafety';
import logger from '@/utils/logger';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface PlayerEditData {
  name: string;
  nickname: string;
  jerseyNumber: string;
  notes: string;
}

export interface NewPlayerData {
  name: string;
  nickname: string;
  jerseyNumber: string;
  notes: string;
}

export interface RosterSettingsFormValues {
  // Team Management
  teamName: string;
  editedTeamName: string;
  
  // Player Search
  searchText: string;
  
  // Player Editing
  editingPlayerId: string | null;
  editPlayerData: PlayerEditData;
  
  // New Player Addition
  isAddingPlayer: boolean;
  newPlayerData: NewPlayerData;
  
  // UI State
  isEditingTeamName: boolean;
  actionsMenuPlayerId: string | null;
  
  // Selected Players
  selectedPlayerIds: string[];
}

export interface RosterSettingsFormOptions {
  // External data
  availablePlayers?: Array<{ id: string; name: string; nickname?: string; jerseyNumber?: string; notes?: string }>;
  selectedPlayerIds?: string[];
  teamName?: string;
  
  // Callbacks
  onSubmit?: (values: RosterSettingsFormValues) => Promise<void> | void;
  onFieldChange?: (fieldName: keyof RosterSettingsFormValues, value: any) => void;
  onRenamePlayer?: (playerId: string, playerData: { name: string; nickname: string }) => void;
  onSetJerseyNumber?: (playerId: string, number: string) => void;
  onSetPlayerNotes?: (playerId: string, notes: string) => void;
  onRemovePlayer?: (playerId: string) => void;
  onAddPlayer?: (playerData: NewPlayerData) => void;
  onTogglePlayerSelection?: (playerId: string) => void;
  onTeamNameChange?: (newName: string) => void;
  onOpenPlayerStats?: (playerId: string) => void;
  
  // Form behavior
  persistForm?: boolean;
  validateOnChange?: boolean;
}

export interface UseRosterSettingsFormResult {
  // Form state
  values: RosterSettingsFormValues;
  errors: Record<string, string | null>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isValidating: boolean;
  isValid: boolean;
  isDirty: boolean;
  hasErrors: boolean;
  
  // Form actions
  setFieldValue: (name: keyof RosterSettingsFormValues, value: any) => void;
  setFieldValues: (values: Partial<RosterSettingsFormValues>) => void;
  validateForm: () => Promise<void>;
  submitForm: () => Promise<void>;
  resetForm: () => void;
  clearForm: () => void;
  
  // Field helpers
  getField: (name: keyof RosterSettingsFormValues) => {
    value: any;
    error: string | null;
    touched: boolean;
    onChange: (value: any) => void;
    onBlur: () => void;
  };
  
  // Team Management
  handleTeamNameChange: (name: string) => void;
  handleStartTeamNameEdit: () => void;
  handleSaveTeamName: () => void;
  handleCancelTeamNameEdit: () => void;
  
  // Search functionality
  handleSearchChange: (text: string) => void;
  getFilteredPlayers: () => any[];
  
  // Player editing
  handleStartEdit: (playerId: string) => void;
  handleCancelEdit: () => void;
  handleEditInputChange: (field: keyof PlayerEditData, value: string) => void;
  handleSaveEdit: (playerId: string) => void;
  
  // New player management
  handleStartAddPlayer: () => void;
  handleCancelAddPlayer: () => void;
  handleNewPlayerInputChange: (field: keyof NewPlayerData, value: string) => void;
  handleAddNewPlayer: () => void;
  
  // Player selection
  handleTogglePlayerSelection: (playerId: string) => void;
  handleSelectAllPlayers: () => void;
  handleDeselectAllPlayers: () => void;
  
  // Actions menu
  handleOpenActionsMenu: (playerId: string) => void;
  handleCloseActionsMenu: () => void;
  
  // Player operations
  handleRemovePlayer: (playerId: string) => void;
  handleOpenPlayerStats: (playerId: string) => void;
  
  // Form state queries
  hasFormChanged: () => boolean;
  getFormData: () => RosterSettingsFormValues;
  isPlayerBeingEdited: (playerId: string) => boolean;
  getPlayerEditData: (playerId: string) => PlayerEditData | null;
  
  // Migration status
  migrationStatus: 'zustand' | 'legacy';
}

// ============================================================================
// Custom Validation Rules
// ============================================================================

const rosterSettingsValidationRules = {
  playerName: {
    type: 'custom' as const,
    message: 'Player name cannot be empty',
    validator: (value: any) => {
      return typeof value === 'string' && value.trim().length > 0;
    },
  },
  
  teamName: {
    type: 'custom' as const,
    message: 'Team name cannot be empty',
    validator: (value: any) => {
      return typeof value === 'string' && value.trim().length > 0;
    },
  },
  
  jerseyNumber: {
    type: 'custom' as const,
    message: 'Jersey number must be 1-3 digits',
    validator: (value: any) => {
      // Jersey number is optional
      if (!value || value === '') return true;
      
      // Must be 1-3 digits
      return /^\d{1,3}$/.test(value as string);
    },
  },
  
  uniqueJerseyNumber: {
    type: 'custom' as const,
    message: 'Jersey number must be unique',
    validator: (value: any, formValues: Record<string, any>, options?: { availablePlayers?: any[]; editingPlayerId?: string }) => {
      // Jersey number is optional
      if (!value || value === '') return true;
      
      // Check uniqueness against other players
      if (options?.availablePlayers) {
        const duplicatePlayer = options.availablePlayers.find(player => 
          player.jerseyNumber === value && 
          player.id !== options.editingPlayerId
        );
        return !duplicatePlayer;
      }
      
      return true;
    },
  },
  
  playerSelection: {
    type: 'custom' as const,
    message: 'At least one player must be selected',
    validator: (value: any) => {
      return Array.isArray(value) && value.length > 0;
    },
  },
};

// ============================================================================
// Form Schema Factory
// ============================================================================

function createRosterSettingsSchema(options: RosterSettingsFormOptions = {}): FormSchema {
  return {
    formId: 'rosterSettings',
    fields: {
      // Team Management
      teamName: {
        initialValue: options.teamName || '',
        validation: [rosterSettingsValidationRules.teamName],
        persist: true,
      },
      editedTeamName: {
        initialValue: options.teamName || '',
        validation: [rosterSettingsValidationRules.teamName],
        persist: false, // Don't persist temporary edit state
      },
      
      // Player Search
      searchText: {
        initialValue: '',
        validation: [],
        persist: false, // Don't persist search queries
      },
      
      // Player Editing
      editingPlayerId: {
        initialValue: null,
        validation: [],
        persist: false, // Don't persist editing state
      },
      editPlayerData: {
        initialValue: {
          name: '',
          nickname: '',
          jerseyNumber: '',
          notes: '',
        },
        validation: [],
        persist: false, // Don't persist temporary edit data
      },
      
      // New Player Addition
      isAddingPlayer: {
        initialValue: false,
        validation: [],
        persist: false, // Don't persist UI state
      },
      newPlayerData: {
        initialValue: {
          name: '',
          nickname: '',
          jerseyNumber: '',
          notes: '',
        },
        validation: [],
        persist: false, // Don't persist temporary new player data
      },
      
      // UI State
      isEditingTeamName: {
        initialValue: false,
        validation: [],
        persist: false, // Don't persist UI state
      },
      actionsMenuPlayerId: {
        initialValue: null,
        validation: [],
        persist: false, // Don't persist UI state
      },
      
      // Selected Players
      selectedPlayerIds: {
        initialValue: options.selectedPlayerIds || [],
        validation: [rosterSettingsValidationRules.playerSelection],
        persist: true,
      },
    },
    persistence: {
      enabled: options.persistForm !== false,
      key: 'rosterSettings',
      restoreOnMount: true,
      excludeFields: [
        'editedTeamName',
        'searchText',
        'editingPlayerId',
        'editPlayerData',
        'isAddingPlayer',
        'newPlayerData',
        'isEditingTeamName',
        'actionsMenuPlayerId',
      ],
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

export function useRosterSettingsForm(
  options: RosterSettingsFormOptions = {}
): UseRosterSettingsFormResult {
  const { shouldUseLegacy } = useMigrationSafety('RosterSettingsForm');
  
  // Create form schema
  const schema = useMemo(() => createRosterSettingsSchema(options), [options]);
  
  // Legacy fallback
  if (shouldUseLegacy) {
    return useLegacyRosterSettingsForm(options);
  }
  
  // Use FormStore with schema
  const form = useForm<RosterSettingsFormValues>(schema, {
    onSubmit: options.onSubmit,
    onFieldChange: options.onFieldChange,
    persistForm: options.persistForm,
    validateOnMount: false,
  });
  
  // ============================================================================
  // Team Management Handlers
  // ============================================================================
  
  const handleTeamNameChange = useCallback((name: string) => {
    form.setFieldValue('editedTeamName', name);
    logger.debug('[RosterSettingsForm] Team name changed:', name);
  }, [form]);
  
  const handleStartTeamNameEdit = useCallback(() => {
    form.setFieldValues({
      isEditingTeamName: true,
      editedTeamName: form.values.teamName,
    });
    logger.debug('[RosterSettingsForm] Started team name edit');
  }, [form]);
  
  const handleSaveTeamName = useCallback(() => {
    const trimmedName = form.values.editedTeamName.trim();
    if (trimmedName) {
      form.setFieldValues({
        teamName: trimmedName,
        isEditingTeamName: false,
      });
      
      // Call external callback
      if (options.onTeamNameChange) {
        options.onTeamNameChange(trimmedName);
      }
    } else {
      // Reset to original if empty
      form.setFieldValues({
        editedTeamName: form.values.teamName,
        isEditingTeamName: false,
      });
    }
    logger.debug('[RosterSettingsForm] Saved team name:', trimmedName);
  }, [form, options]);
  
  const handleCancelTeamNameEdit = useCallback(() => {
    form.setFieldValues({
      editedTeamName: form.values.teamName,
      isEditingTeamName: false,
    });
    logger.debug('[RosterSettingsForm] Cancelled team name edit');
  }, [form]);
  
  // ============================================================================
  // Search Functionality
  // ============================================================================
  
  const handleSearchChange = useCallback((text: string) => {
    form.setFieldValue('searchText', text);
  }, [form]);
  
  const getFilteredPlayers = useCallback(() => {
    if (!options.availablePlayers) return [];
    
    const searchText = form.values.searchText;
    if (!searchText) return [...options.availablePlayers];
    
    const search = searchText.toLowerCase();
    return options.availablePlayers.filter(player => {
      return (
        player.name.toLowerCase().includes(search) ||
        (player.nickname && player.nickname.toLowerCase().includes(search))
      );
    });
  }, [form.values.searchText, options.availablePlayers]);
  
  // ============================================================================
  // Player Editing Handlers
  // ============================================================================
  
  const handleStartEdit = useCallback((playerId: string) => {
    if (!options.availablePlayers) return;
    
    const playerToEdit = options.availablePlayers.find(p => p.id === playerId);
    if (!playerToEdit) {
      logger.error('[RosterSettingsForm] Player not found for editing:', playerId);
      return;
    }
    
    form.setFieldValues({
      editingPlayerId: playerId,
      editPlayerData: {
        name: playerToEdit.name,
        nickname: playerToEdit.nickname || '',
        jerseyNumber: playerToEdit.jerseyNumber || '',
        notes: playerToEdit.notes || '',
      },
      isAddingPlayer: false, // Close add player form if open
    });
    
    logger.debug('[RosterSettingsForm] Started editing player:', playerId);
  }, [form, options.availablePlayers]);
  
  const handleCancelEdit = useCallback(() => {
    form.setFieldValues({
      editingPlayerId: null,
      editPlayerData: {
        name: '',
        nickname: '',
        jerseyNumber: '',
        notes: '',
      },
    });
    logger.debug('[RosterSettingsForm] Cancelled player edit');
  }, [form]);
  
  const handleEditInputChange = useCallback((field: keyof PlayerEditData, value: string) => {
    form.setFieldValue('editPlayerData', {
      ...form.values.editPlayerData,
      [field]: value,
    });
  }, [form]);
  
  const handleSaveEdit = useCallback((playerId: string) => {
    if (!options.availablePlayers) return;
    
    const originalPlayer = options.availablePlayers.find(p => p.id === playerId);
    if (!originalPlayer) return;
    
    const editData = form.values.editPlayerData;
    const trimmedName = editData.name.trim();
    const trimmedNickname = editData.nickname.trim();
    
    // Validate name
    if (!trimmedName) {
      form.setFieldError('editPlayerData', 'Player name cannot be empty');
      return;
    }
    
    // Check for changes and call appropriate callbacks
    const nameChanged = trimmedName !== originalPlayer.name;
    const nicknameChanged = trimmedNickname !== (originalPlayer.nickname || '');
    const jerseyChanged = editData.jerseyNumber !== (originalPlayer.jerseyNumber || '');
    const notesChanged = editData.notes !== (originalPlayer.notes || '');
    
    // Call unified rename handler if name or nickname changed
    if ((nameChanged || nicknameChanged) && options.onRenamePlayer) {
      options.onRenamePlayer(playerId, { 
        name: trimmedName, 
        nickname: trimmedNickname 
      });
    }
    
    // Call other handlers if their data changed
    if (jerseyChanged && options.onSetJerseyNumber) {
      options.onSetJerseyNumber(playerId, editData.jerseyNumber);
    }
    
    if (notesChanged && options.onSetPlayerNotes) {
      options.onSetPlayerNotes(playerId, editData.notes);
    }
    
    // Clear editing state
    form.setFieldValues({
      editingPlayerId: null,
      editPlayerData: {
        name: '',
        nickname: '',
        jerseyNumber: '',
        notes: '',
      },
    });
    
    logger.debug('[RosterSettingsForm] Saved player edit:', playerId);
  }, [form, options]);
  
  // ============================================================================
  // New Player Management
  // ============================================================================
  
  const handleStartAddPlayer = useCallback(() => {
    form.setFieldValues({
      isAddingPlayer: true,
      editingPlayerId: null, // Close edit form if open
      newPlayerData: {
        name: '',
        nickname: '',
        jerseyNumber: '',
        notes: '',
      },
    });
    logger.debug('[RosterSettingsForm] Started adding new player');
  }, [form]);
  
  const handleCancelAddPlayer = useCallback(() => {
    form.setFieldValues({
      isAddingPlayer: false,
      newPlayerData: {
        name: '',
        nickname: '',
        jerseyNumber: '',
        notes: '',
      },
    });
    logger.debug('[RosterSettingsForm] Cancelled add player');
  }, [form]);
  
  const handleNewPlayerInputChange = useCallback((field: keyof NewPlayerData, value: string) => {
    form.setFieldValue('newPlayerData', {
      ...form.values.newPlayerData,
      [field]: value,
    });
  }, [form]);
  
  const handleAddNewPlayer = useCallback(() => {
    const newPlayerData = form.values.newPlayerData;
    const trimmedName = newPlayerData.name.trim();
    const trimmedNickname = newPlayerData.nickname.trim();
    
    // Validate name
    if (!trimmedName) {
      form.setFieldError('newPlayerData', 'Player name cannot be empty');
      return;
    }
    
    // Call external callback
    if (options.onAddPlayer) {
      options.onAddPlayer({
        name: trimmedName,
        nickname: trimmedNickname,
        jerseyNumber: newPlayerData.jerseyNumber.trim(),
        notes: newPlayerData.notes.trim(),
      });
    }
    
    // Reset form
    form.setFieldValues({
      isAddingPlayer: false,
      newPlayerData: {
        name: '',
        nickname: '',
        jerseyNumber: '',
        notes: '',
      },
    });
    
    logger.debug('[RosterSettingsForm] Added new player:', trimmedName);
  }, [form, options]);
  
  // ============================================================================
  // Player Selection Handlers
  // ============================================================================
  
  const handleTogglePlayerSelection = useCallback((playerId: string) => {
    const currentSelection = form.values.selectedPlayerIds;
    const isSelected = currentSelection.includes(playerId);
    
    const newSelection = isSelected
      ? currentSelection.filter(id => id !== playerId)
      : [...currentSelection, playerId];
    
    form.setFieldValue('selectedPlayerIds', newSelection);
    
    // Call external callback
    if (options.onTogglePlayerSelection) {
      options.onTogglePlayerSelection(playerId);
    }
    
    logger.debug('[RosterSettingsForm] Toggled player selection:', playerId, !isSelected);
  }, [form, options]);
  
  const handleSelectAllPlayers = useCallback(() => {
    if (!options.availablePlayers) return;
    
    const allPlayerIds = options.availablePlayers.map(player => player.id);
    form.setFieldValue('selectedPlayerIds', allPlayerIds);
    
    logger.debug('[RosterSettingsForm] Selected all players');
  }, [form, options.availablePlayers]);
  
  const handleDeselectAllPlayers = useCallback(() => {
    form.setFieldValue('selectedPlayerIds', []);
    logger.debug('[RosterSettingsForm] Deselected all players');
  }, [form]);
  
  // ============================================================================
  // Actions Menu Handlers
  // ============================================================================
  
  const handleOpenActionsMenu = useCallback((playerId: string) => {
    form.setFieldValue('actionsMenuPlayerId', playerId);
  }, [form]);
  
  const handleCloseActionsMenu = useCallback(() => {
    form.setFieldValue('actionsMenuPlayerId', null);
  }, [form]);
  
  // ============================================================================
  // Player Operations
  // ============================================================================
  
  const handleRemovePlayer = useCallback((playerId: string) => {
    if (options.onRemovePlayer) {
      options.onRemovePlayer(playerId);
    }
    
    // Remove from selection if selected
    const currentSelection = form.values.selectedPlayerIds;
    if (currentSelection.includes(playerId)) {
      form.setFieldValue('selectedPlayerIds', 
        currentSelection.filter(id => id !== playerId)
      );
    }
    
    logger.debug('[RosterSettingsForm] Removed player:', playerId);
  }, [form, options]);
  
  const handleOpenPlayerStats = useCallback((playerId: string) => {
    if (options.onOpenPlayerStats) {
      options.onOpenPlayerStats(playerId);
    }
    logger.debug('[RosterSettingsForm] Opened player stats:', playerId);
  }, [options]);
  
  // ============================================================================
  // Form State Queries
  // ============================================================================
  
  const hasFormChanged = useCallback(() => {
    return form.hasChanged();
  }, [form]);
  
  const getFormData = useCallback((): RosterSettingsFormValues => {
    return form.values;
  }, [form]);
  
  const isPlayerBeingEdited = useCallback((playerId: string) => {
    return form.values.editingPlayerId === playerId;
  }, [form]);
  
  const getPlayerEditData = useCallback((playerId: string): PlayerEditData | null => {
    if (form.values.editingPlayerId === playerId) {
      return form.values.editPlayerData;
    }
    return null;
  }, [form]);
  
  // ============================================================================
  // Effect: Update team name when props change
  // ============================================================================
  
  useEffect(() => {
    if (options.teamName && options.teamName !== form.values.teamName) {
      form.setFieldValues({
        teamName: options.teamName,
        editedTeamName: options.teamName,
      });
    }
  }, [options.teamName, form]);
  
  // ============================================================================
  // Effect: Update selected players when props change
  // ============================================================================
  
  useEffect(() => {
    if (options.selectedPlayerIds && 
        JSON.stringify(options.selectedPlayerIds) !== JSON.stringify(form.values.selectedPlayerIds)) {
      form.setFieldValue('selectedPlayerIds', options.selectedPlayerIds);
    }
  }, [options.selectedPlayerIds, form]);
  
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
    
    // Team Management
    handleTeamNameChange,
    handleStartTeamNameEdit,
    handleSaveTeamName,
    handleCancelTeamNameEdit,
    
    // Search functionality
    handleSearchChange,
    getFilteredPlayers,
    
    // Player editing
    handleStartEdit,
    handleCancelEdit,
    handleEditInputChange,
    handleSaveEdit,
    
    // New player management
    handleStartAddPlayer,
    handleCancelAddPlayer,
    handleNewPlayerInputChange,
    handleAddNewPlayer,
    
    // Player selection
    handleTogglePlayerSelection,
    handleSelectAllPlayers,
    handleDeselectAllPlayers,
    
    // Actions menu
    handleOpenActionsMenu,
    handleCloseActionsMenu,
    
    // Player operations
    handleRemovePlayer,
    handleOpenPlayerStats,
    
    // Form state queries
    hasFormChanged,
    getFormData,
    isPlayerBeingEdited,
    getPlayerEditData,
    
    // Migration status
    migrationStatus: 'zustand',
  };
}

// ============================================================================
// Legacy Fallback Implementation
// ============================================================================

function _useLegacyRosterSettingsForm(
  _options: RosterSettingsFormOptions
): UseRosterSettingsFormResult {
  logger.debug('[RosterSettingsForm] Using legacy implementation');
  
  // Create a minimal interface for legacy mode
  // This would integrate with existing useState patterns
  return {
    // Form state (empty in legacy mode)
    values: {} as RosterSettingsFormValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValidating: false,
    isValid: true,
    isDirty: false,
    hasErrors: false,
    
    // Form actions (no-ops in legacy mode)
    setFieldValue: () => {},
    setFieldValues: () => {},
    validateForm: async () => {},
    submitForm: async () => {},
    resetForm: () => {},
    clearForm: () => {},
    
    // Field helpers (empty in legacy mode)
    getField: () => ({
      value: '',
      error: null,
      touched: false,
      onChange: () => {},
      onBlur: () => {},
    }),
    
    // Team Management (no-ops in legacy mode)
    handleTeamNameChange: () => {},
    handleStartTeamNameEdit: () => {},
    handleSaveTeamName: () => {},
    handleCancelTeamNameEdit: () => {},
    
    // Search functionality (no-ops in legacy mode)
    handleSearchChange: () => {},
    getFilteredPlayers: () => [],
    
    // Player editing (no-ops in legacy mode)
    handleStartEdit: () => {},
    handleCancelEdit: () => {},
    handleEditInputChange: () => {},
    handleSaveEdit: () => {},
    
    // New player management (no-ops in legacy mode)
    handleStartAddPlayer: () => {},
    handleCancelAddPlayer: () => {},
    handleNewPlayerInputChange: () => {},
    handleAddNewPlayer: () => {},
    
    // Player selection (no-ops in legacy mode)
    handleTogglePlayerSelection: () => {},
    handleSelectAllPlayers: () => {},
    handleDeselectAllPlayers: () => {},
    
    // Actions menu (no-ops in legacy mode)
    handleOpenActionsMenu: () => {},
    handleCloseActionsMenu: () => {},
    
    // Player operations (no-ops in legacy mode)
    handleRemovePlayer: () => {},
    handleOpenPlayerStats: () => {},
    
    // Form state queries (defaults in legacy mode)
    hasFormChanged: () => false,
    getFormData: () => ({} as RosterSettingsFormValues),
    isPlayerBeingEdited: () => false,
    getPlayerEditData: () => null,
    
    // Migration status
    migrationStatus: 'legacy',
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert current RosterSettingsModal props to form values
 */
export function convertPropsToFormValues(props: any): Partial<RosterSettingsFormValues> {
  return {
    teamName: props.teamName || '',
    editedTeamName: props.teamName || '',
    searchText: '',
    editingPlayerId: null,
    editPlayerData: {
      name: '',
      nickname: '',
      jerseyNumber: '',
      notes: '',
    },
    isAddingPlayer: false,
    newPlayerData: {
      name: '',
      nickname: '',
      jerseyNumber: '',
      notes: '',
    },
    isEditingTeamName: false,
    actionsMenuPlayerId: null,
    selectedPlayerIds: props.selectedPlayerIds || [],
  };
}

/**
 * Validate jersey number uniqueness
 */
export function validateJerseyNumberUniqueness(
  jerseyNumber: string,
  availablePlayers: any[],
  editingPlayerId?: string
): boolean {
  if (!jerseyNumber || jerseyNumber === '') return true;
  
  const duplicatePlayer = availablePlayers.find(player => 
    player.jerseyNumber === jerseyNumber && 
    player.id !== editingPlayerId
  );
  
  return !duplicatePlayer;
}

/**
 * Filter players based on search text
 */
export function filterPlayersBySearch(
  players: any[],
  searchText: string
): any[] {
  if (!searchText) return [...players];
  
  const search = searchText.toLowerCase();
  return players.filter(player => {
    return (
      player.name.toLowerCase().includes(search) ||
      (player.nickname && player.nickname.toLowerCase().includes(search))
    );
  });
}