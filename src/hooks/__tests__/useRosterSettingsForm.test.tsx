import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useRosterSettingsForm, RosterSettingsFormOptions, convertPropsToFormValues, validateJerseyNumberUniqueness, filterPlayersBySearch } from '../useRosterSettingsForm';

// Mock dependencies
  });

  describe('Basic Form Operations', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useRosterSettingsForm());

      expect(result.current.values.teamName).toBe('');
      expect(result.current.values.editedTeamName).toBe('');
      expect(result.current.values.searchText).toBe('');
      expect(result.current.values.editingPlayerId).toBe(null);
      expect(result.current.values.isAddingPlayer).toBe(false);
      expect(result.current.values.isEditingTeamName).toBe(false);
      expect(result.current.values.actionsMenuPlayerId).toBe(null);
      expect(result.current.values.selectedPlayerIds).toEqual([]);
      expect(result.current.migrationStatus).toBe('zustand');
    });

    it('should initialize with custom values from options', () => {
      const options: RosterSettingsFormOptions = {
        teamName: 'Arsenal FC',
        selectedPlayerIds: ['player1', 'player2'],
        availablePlayers: mockPlayers,
      };

      const { result } = renderHook(() => useRosterSettingsForm(options));

      expect(result.current.values.teamName).toBe('Arsenal FC');
      expect(result.current.values.editedTeamName).toBe('Arsenal FC');
      expect(result.current.values.selectedPlayerIds).toEqual(['player1', 'player2']);
    });
  });

  describe('Team Management', () => {
    it('should handle team name changes', () => {
      const { result } = renderHook(() => useRosterSettingsForm());

      act(() => {
        result.current.handleTeamNameChange('Manchester United');
      });

      expect(result.current.values.editedTeamName).toBe('Manchester United');
    });

    it('should start team name editing', () => {
      const options = { teamName: 'Chelsea FC' };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleStartTeamNameEdit();
      });

      expect(result.current.values.isEditingTeamName).toBe(true);
      expect(result.current.values.editedTeamName).toBe('Chelsea FC');
    });

    it('should save team name changes', () => {
      const onTeamNameChange = jest.fn();
      const options = { teamName: 'Old Name', onTeamNameChange };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleTeamNameChange('New Team Name');
        result.current.handleSaveTeamName();
      });

      expect(result.current.values.teamName).toBe('New Team Name');
      expect(result.current.values.isEditingTeamName).toBe(false);
      expect(onTeamNameChange).toHaveBeenCalledWith('New Team Name');
    });

    it('should cancel team name editing', () => {
      const options = { teamName: 'Original Name' };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleTeamNameChange('Changed Name');
        result.current.handleCancelTeamNameEdit();
      });

      expect(result.current.values.editedTeamName).toBe('Original Name');
      expect(result.current.values.isEditingTeamName).toBe(false);
    });

    it('should reset to original name if empty on save', () => {
      const options = { teamName: 'Original Name' };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleTeamNameChange('');
        result.current.handleSaveTeamName();
      });

      expect(result.current.values.editedTeamName).toBe('Original Name');
      expect(result.current.values.isEditingTeamName).toBe(false);
    });
  });

  describe('Search Functionality', () => {
    it('should handle search text changes', () => {
      const { result } = renderHook(() => useRosterSettingsForm());

      act(() => {
        result.current.handleSearchChange('john');
      });

      expect(result.current.values.searchText).toBe('john');
    });

    it('should filter players by search text', () => {
      const options = { availablePlayers: mockPlayers };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleSearchChange('john');
      });

      const filtered = result.current.getFilteredPlayers();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('John Doe');
    });

    it('should filter players by nickname', () => {
      const options = { availablePlayers: mockPlayers };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleSearchChange('bobby');
      });

      const filtered = result.current.getFilteredPlayers();
      expect(filtered).toHaveLength(1);
      expect(filtered[0].name).toBe('Bob Wilson');
    });

    it('should return all players when search is empty', () => {
      const options = { availablePlayers: mockPlayers };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      const filtered = result.current.getFilteredPlayers();
      expect(filtered).toHaveLength(3);
    });
  });

  describe('Player Editing', () => {
    it('should start editing a player', () => {
      const options = { availablePlayers: mockPlayers };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleStartEdit('player1');
      });

      expect(result.current.values.editingPlayerId).toBe('player1');
      expect(result.current.values.editPlayerData.name).toBe('John Doe');
      expect(result.current.values.editPlayerData.nickname).toBe('Johnny');
      expect(result.current.values.editPlayerData.jerseyNumber).toBe('10');
      expect(result.current.values.editPlayerData.notes).toBe('Captain');
      expect(result.current.values.isAddingPlayer).toBe(false);
    });

    it('should cancel player editing', () => {
      const options = { availablePlayers: mockPlayers };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleStartEdit('player1');
        result.current.handleCancelEdit();
      });

      expect(result.current.values.editingPlayerId).toBe(null);
      expect(result.current.values.editPlayerData.name).toBe('');
    });

    it('should handle edit input changes', () => {
      const options = { availablePlayers: mockPlayers };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleStartEdit('player1');
        result.current.handleEditInputChange('name', 'Updated Name');
      });

      expect(result.current.values.editPlayerData.name).toBe('Updated Name');
    });

    it('should save player edits with callbacks', () => {
      const onRenamePlayer = jest.fn();
      const onSetJerseyNumber = jest.fn();
      const onSetPlayerNotes = jest.fn();
      
      const options = { 
        availablePlayers: mockPlayers,
        onRenamePlayer,
        onSetJerseyNumber,
        onSetPlayerNotes,
      };
      
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleStartEdit('player1');
        result.current.handleEditInputChange('name', 'New Name');
        result.current.handleEditInputChange('nickname', 'New Nick');
        result.current.handleEditInputChange('jerseyNumber', '99');
        result.current.handleEditInputChange('notes', 'New notes');
        result.current.handleSaveEdit('player1');
      });

      expect(onRenamePlayer).toHaveBeenCalledWith('player1', {
        name: 'New Name',
        nickname: 'New Nick',
      });
      expect(onSetJerseyNumber).toHaveBeenCalledWith('player1', '99');
      expect(onSetPlayerNotes).toHaveBeenCalledWith('player1', 'New notes');
      expect(result.current.values.editingPlayerId).toBe(null);
    });

    it('should validate player name before saving', () => {
      const options = { availablePlayers: mockPlayers };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleStartEdit('player1');
        result.current.handleEditInputChange('name', '   ');
        result.current.handleSaveEdit('player1');
      });

      expect(result.current.errors.editPlayerData).toBe('Player name cannot be empty');
      expect(result.current.values.editingPlayerId).toBe('player1'); // Still editing
    });

    it('should check if player is being edited', () => {
      const options = { availablePlayers: mockPlayers };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleStartEdit('player1');
      });

      expect(result.current.isPlayerBeingEdited('player1')).toBe(true);
      expect(result.current.isPlayerBeingEdited('player2')).toBe(false);
    });

    it('should get player edit data', () => {
      const options = { availablePlayers: mockPlayers };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleStartEdit('player1');
      });

      const editData = result.current.getPlayerEditData('player1');
      expect(editData).toEqual({
        name: 'John Doe',
        nickname: 'Johnny',
        jerseyNumber: '10',
        notes: 'Captain',
      });

      expect(result.current.getPlayerEditData('player2')).toBe(null);
    });
  });

  describe('New Player Management', () => {
    it('should start adding a new player', () => {
      const { result } = renderHook(() => useRosterSettingsForm());

      act(() => {
        result.current.handleStartAddPlayer();
      });

      expect(result.current.values.isAddingPlayer).toBe(true);
      expect(result.current.values.editingPlayerId).toBe(null);
      expect(result.current.values.newPlayerData).toEqual({
        name: '',
        nickname: '',
        jerseyNumber: '',
        notes: '',
      });
    });

    it('should cancel adding a new player', () => {
      const { result } = renderHook(() => useRosterSettingsForm());

      act(() => {
        result.current.handleStartAddPlayer();
        result.current.handleNewPlayerInputChange('name', 'Test Player');
        result.current.handleCancelAddPlayer();
      });

      expect(result.current.values.isAddingPlayer).toBe(false);
      expect(result.current.values.newPlayerData.name).toBe('');
    });

    it('should handle new player input changes', () => {
      const { result } = renderHook(() => useRosterSettingsForm());

      act(() => {
        result.current.handleStartAddPlayer();
        result.current.handleNewPlayerInputChange('name', 'New Player');
        result.current.handleNewPlayerInputChange('nickname', 'Newbie');
      });

      expect(result.current.values.newPlayerData.name).toBe('New Player');
      expect(result.current.values.newPlayerData.nickname).toBe('Newbie');
    });

    it('should add a new player with callback', () => {
      const onAddPlayer = jest.fn();
      const options = { onAddPlayer };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleStartAddPlayer();
        result.current.handleNewPlayerInputChange('name', 'New Player');
        result.current.handleNewPlayerInputChange('nickname', 'Newbie');
        result.current.handleNewPlayerInputChange('jerseyNumber', '42');
        result.current.handleNewPlayerInputChange('notes', 'Great player');
        result.current.handleAddNewPlayer();
      });

      expect(onAddPlayer).toHaveBeenCalledWith({
        name: 'New Player',
        nickname: 'Newbie',
        jerseyNumber: '42',
        notes: 'Great player',
      });
      expect(result.current.values.isAddingPlayer).toBe(false);
      expect(result.current.values.newPlayerData.name).toBe('');
    });

    it('should validate new player name', () => {
      const options = { onAddPlayer: jest.fn() };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleStartAddPlayer();
        result.current.handleNewPlayerInputChange('name', '   ');
        result.current.handleAddNewPlayer();
      });

      expect(result.current.errors.newPlayerData).toBe('Player name cannot be empty');
      expect(result.current.values.isAddingPlayer).toBe(true); // Still adding
      expect(options.onAddPlayer).not.toHaveBeenCalled();
    });
  });

  describe('Player Selection', () => {
    it('should toggle player selection', () => {
      const onTogglePlayerSelection = jest.fn();
      const options = { onTogglePlayerSelection };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleTogglePlayerSelection('player1');
      });

      expect(result.current.values.selectedPlayerIds).toEqual(['player1']);
      expect(onTogglePlayerSelection).toHaveBeenCalledWith('player1');

      act(() => {
        result.current.handleTogglePlayerSelection('player1');
      });

      expect(result.current.values.selectedPlayerIds).toEqual([]);
    });

    it('should select all players', () => {
      const options = { availablePlayers: mockPlayers };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleSelectAllPlayers();
      });

      expect(result.current.values.selectedPlayerIds).toEqual(['player1', 'player2', 'player3']);
    });

    it('should deselect all players', () => {
      const options = { 
        availablePlayers: mockPlayers,
        selectedPlayerIds: ['player1', 'player2'],
      };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleDeselectAllPlayers();
      });

      expect(result.current.values.selectedPlayerIds).toEqual([]);
    });
  });

  describe('Actions Menu', () => {
    it('should open and close actions menu', () => {
      const { result } = renderHook(() => useRosterSettingsForm());

      act(() => {
        result.current.handleOpenActionsMenu('player1');
      });

      expect(result.current.values.actionsMenuPlayerId).toBe('player1');

      act(() => {
        result.current.handleCloseActionsMenu();
      });

      expect(result.current.values.actionsMenuPlayerId).toBe(null);
    });
  });

  describe('Player Operations', () => {
    it('should remove a player', () => {
      const onRemovePlayer = jest.fn();
      const options = { 
        onRemovePlayer,
        selectedPlayerIds: ['player1', 'player2'],
      };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleRemovePlayer('player1');
      });

      expect(onRemovePlayer).toHaveBeenCalledWith('player1');
      expect(result.current.values.selectedPlayerIds).toEqual(['player2']);
    });

    it('should open player stats', () => {
      const onOpenPlayerStats = jest.fn();
      const options = { onOpenPlayerStats };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleOpenPlayerStats('player1');
      });

      expect(onOpenPlayerStats).toHaveBeenCalledWith('player1');
    });
  });

  describe('Form State Management', () => {
    it('should detect form changes', () => {
      const { result } = renderHook(() => useRosterSettingsForm());

      expect(result.current.hasFormChanged()).toBe(false);

      act(() => {
        result.current.handleTeamNameChange('Changed Team');
      });

      expect(result.current.hasFormChanged()).toBe(true);
    });

    it('should get form data', () => {
      const options = { teamName: 'Test Team' };
      const { result } = renderHook(() => useRosterSettingsForm(options));

      act(() => {
        result.current.handleSearchChange('search query');
      });

      const formData = result.current.getFormData();
      expect(formData.teamName).toBe('Test Team');
      expect(formData.searchText).toBe('search query');
    });

    it('should reset form to initial values', () => {
      const { result } = renderHook(() => useRosterSettingsForm());

      act(() => {
        result.current.setFieldValues({
          teamName: 'Changed Team',
          searchText: 'search',
          selectedPlayerIds: ['player1'],
        });
      });

      expect(result.current.values.teamName).toBe('Changed Team');

      act(() => {
        result.current.resetForm();
      });

      expect(result.current.values.teamName).toBe('');
      expect(result.current.values.searchText).toBe('');
      expect(result.current.values.selectedPlayerIds).toEqual([]);
    });

    it('should clear form values', () => {
      const { result } = renderHook(() => useRosterSettingsForm());

      act(() => {
        result.current.setFieldValues({
          teamName: 'Test Team',
          searchText: 'search',
        });
      });

      expect(result.current.values.teamName).toBe('Test Team');

      act(() => {
        result.current.clearForm();
      });

      expect(result.current.values.teamName).toBe('');
      expect(result.current.values.searchText).toBe('');
    });
  });

  describe('Props Updates', () => {
    it('should update team name when props change', () => {
      const { result, rerender } = renderHook(
        ({ teamName }) => useRosterSettingsForm({ teamName }),
        { initialProps: { teamName: 'Initial Team' } }
      );

      expect(result.current.values.teamName).toBe('Initial Team');

      rerender({ teamName: 'Updated Team' });

      expect(result.current.values.teamName).toBe('Updated Team');
      expect(result.current.values.editedTeamName).toBe('Updated Team');
    });

    it('should update selected players when props change', () => {
      const { result, rerender } = renderHook(
        ({ selectedPlayerIds }) => useRosterSettingsForm({ selectedPlayerIds }),
        { initialProps: { selectedPlayerIds: ['player1'] } }
      );

      expect(result.current.values.selectedPlayerIds).toEqual(['player1']);

      rerender({ selectedPlayerIds: ['player1', 'player2'] });

      expect(result.current.values.selectedPlayerIds).toEqual(['player1', 'player2']);
    });
  });

  describe('Legacy Mode', () => {
    it('should use legacy implementation when migration safety is enabled', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
      });

      const { result } = renderHook(() => useRosterSettingsForm());

      expect(result.current.migrationStatus).toBe('legacy');
      expect(result.current.values).toEqual({});
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Field Helpers', () => {
    it('should provide field helpers with correct state', () => {
      const { result } = renderHook(() => useRosterSettingsForm());

      act(() => {
        result.current.setFieldValue('teamName', 'Test Team');
        result.current.setFieldError('teamName', 'Some error');
      });

      const teamNameField = result.current.getField('teamName');

      expect(teamNameField.value).toBe('Test Team');
      expect(teamNameField.error).toBe('Some error');
      expect(typeof teamNameField.onChange).toBe('function');
      expect(typeof teamNameField.onBlur).toBe('function');
    });
  });
});

describe('Utility Functions', () => {
  describe('convertPropsToFormValues', () => {
    it('should convert props to form values', () => {
      const props = {
        teamName: 'Test Team',
        selectedPlayerIds: ['player1', 'player2'],
      };

      const formValues = convertPropsToFormValues(props);

      expect(formValues.teamName).toBe('Test Team');
      expect(formValues.editedTeamName).toBe('Test Team');
      expect(formValues.selectedPlayerIds).toEqual(['player1', 'player2']);
      expect(formValues.searchText).toBe('');
      expect(formValues.editingPlayerId).toBe(null);
      expect(formValues.isAddingPlayer).toBe(false);
    });

    it('should handle missing props with defaults', () => {
      const props = {};
      const formValues = convertPropsToFormValues(props);

      expect(formValues.teamName).toBe('');
      expect(formValues.selectedPlayerIds).toEqual([]);
      expect(formValues.isEditingTeamName).toBe(false);
    });
  });

  describe('validateJerseyNumberUniqueness', () => {
    it('should return true for empty jersey number', () => {
      const result = validateJerseyNumberUniqueness('', mockPlayers);
      expect(result).toBe(true);
    });

    it('should return false for duplicate jersey number', () => {
      const result = validateJerseyNumberUniqueness('10', mockPlayers);
      expect(result).toBe(false);
    });

    it('should return true for unique jersey number', () => {
      const result = validateJerseyNumberUniqueness('99', mockPlayers);
      expect(result).toBe(true);
    });

    it('should allow same jersey number for editing player', () => {
      const result = validateJerseyNumberUniqueness('10', mockPlayers, 'player1');
      expect(result).toBe(true);
    });
  });

  describe('filterPlayersBySearch', () => {
    it('should return all players when search is empty', () => {
      const result = filterPlayersBySearch(mockPlayers, '');
      expect(result).toHaveLength(3);
    });

    it('should filter players by name', () => {
      const result = filterPlayersBySearch(mockPlayers, 'john');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
    });

    it('should filter players by nickname', () => {
      const result = filterPlayersBySearch(mockPlayers, 'bobby');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Bob Wilson');
    });

    it('should be case insensitive', () => {
      const result = filterPlayersBySearch(mockPlayers, 'JOHN');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('John Doe');
    });

    it('should return empty array when no matches', () => {
      const result = filterPlayersBySearch(mockPlayers, 'nonexistent');
      expect(result).toHaveLength(0);
    });
  });
});