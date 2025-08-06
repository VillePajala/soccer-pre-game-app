import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useGameSettingsForm, GameSettingsFormOptions, convertPropsToFormValues, extractFairPlayCardPlayer } from '../useGameSettingsForm';

// Mock dependencies
  });

  describe('Basic Form Operations', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      expect(result.current.values.teamName).toBe('');
      expect(result.current.values.opponentName).toBe('');
      expect(result.current.values.linkType).toBe('none');
      expect(result.current.values.homeOrAway).toBe('home');
      expect(result.current.values.numPeriods).toBe(2);
      expect(result.current.values.periodDurationMinutes).toBe(45);
      expect(result.current.values.demandFactor).toBe(1.0);
      expect(result.current.values.isPlayed).toBe(false);
      expect(result.current.values.selectedPlayerIds).toEqual([]);
      expect(result.current.migrationStatus).toBe('zustand');
    });

    it('should initialize gameDate with current date', () => {
      const { result } = renderHook(() => useGameSettingsForm());
      const currentDate = new Date().toISOString().split('T')[0];
      
      expect(result.current.values.gameDate).toBe(currentDate);
    });

    it('should initialize gameTime with default time', () => {
      const { result } = renderHook(() => useGameSettingsForm());
      
      expect(result.current.values.gameTime).toBe('18:00');
    });
  });

  describe('Basic Field Handlers', () => {
    it('should handle team name changes', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleTeamNameChange('Manchester United');
      });

      expect(result.current.values.teamName).toBe('Manchester United');
    });

    it('should handle opponent name changes', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleOpponentNameChange('Liverpool FC');
      });

      expect(result.current.values.opponentName).toBe('Liverpool FC');
    });

    it('should handle game date changes', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleGameDateChange('2025-12-25');
      });

      expect(result.current.values.gameDate).toBe('2025-12-25');
    });

    it('should handle game time changes', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleGameTimeChange('15:30');
      });

      expect(result.current.values.gameTime).toBe('15:30');
    });

    it('should handle game location changes', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleGameLocationChange('Wembley Stadium');
      });

      expect(result.current.values.gameLocation).toBe('Wembley Stadium');
    });
  });

  describe('Configuration Field Handlers', () => {
    it('should handle age group changes', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleAgeGroupChange('U18');
      });

      expect(result.current.values.ageGroup).toBe('U18');
    });

    it('should handle tournament level changes', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleTournamentLevelChange('Elite');
      });

      expect(result.current.values.tournamentLevel).toBe('Elite');
    });

    it('should handle home/away changes', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleHomeOrAwayChange('away');
      });

      expect(result.current.values.homeOrAway).toBe('away');
    });

    it('should handle number of periods changes', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleNumPeriodsChange(1);
      });

      expect(result.current.values.numPeriods).toBe(1);
    });

    it('should handle period duration changes', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handlePeriodDurationChange(90);
      });

      expect(result.current.values.periodDurationMinutes).toBe(90);
    });

    it('should handle demand factor changes', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleDemandFactorChange(1.2);
      });

      expect(result.current.values.demandFactor).toBe(1.2);
    });

    it('should handle is played changes', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleIsPlayedChange(true);
      });

      expect(result.current.values.isPlayed).toBe(true);
    });
  });

  describe('Season/Tournament Management', () => {
    it('should handle link type changes and clear related fields', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      // First set some values
      act(() => {
        result.current.setFieldValues({
          seasonId: 'season-1',
          tournamentId: 'tournament-1',
          newSeasonName: 'Test Season',
          newTournamentName: 'Test Tournament',
        });
      });

      expect(result.current.values.seasonId).toBe('season-1');
      expect(result.current.values.tournamentId).toBe('tournament-1');

      // Change link type - should clear all related fields
      act(() => {
        result.current.handleLinkTypeChange('season');
      });

      expect(result.current.values.linkType).toBe('season');
      expect(result.current.values.seasonId).toBe(null);
      expect(result.current.values.tournamentId).toBe(null);
      expect(result.current.values.newSeasonName).toBe('');
      expect(result.current.values.newTournamentName).toBe('');
    });

    it('should handle season changes and clear tournament', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      // Set initial tournament
      act(() => {
        result.current.setFieldValue('tournamentId', 'tournament-1');
      });

      // Change season - should clear tournament
      act(() => {
        result.current.handleSeasonChange('season-1');
      });

      expect(result.current.values.seasonId).toBe('season-1');
      expect(result.current.values.tournamentId).toBe(null);
    });

    it('should handle tournament changes and clear season', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      // Set initial season
      act(() => {
        result.current.setFieldValue('seasonId', 'season-1');
      });

      // Change tournament - should clear season
      act(() => {
        result.current.handleTournamentChange('tournament-1');
      });

      expect(result.current.values.tournamentId).toBe('tournament-1');
      expect(result.current.values.seasonId).toBe(null);
    });
  });

  describe('Player Management', () => {
    it('should handle selected players changes', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleSelectedPlayersChange(['player1', 'player2', 'player3']);
      });

      expect(result.current.values.selectedPlayerIds).toEqual(['player1', 'player2', 'player3']);
    });

    it('should handle fair play card changes', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleFairPlayCardChange('player1');
      });

      expect(result.current.values.fairPlayCardPlayerId).toBe('player1');

      act(() => {
        result.current.handleFairPlayCardChange(null);
      });

      expect(result.current.values.fairPlayCardPlayerId).toBe(null);
    });

    it('should handle game notes changes', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleGameNotesChange('Important game notes here');
      });

      expect(result.current.values.gameNotes).toBe('Important game notes here');
    });
  });

  describe('Dynamic Creation', () => {
    it('should handle season creation successfully', async () => {
      const onSeasonCreate = jest.fn().mockResolvedValue('new-season-id');
      const { result } = renderHook(() => 
        useGameSettingsForm({ onSeasonCreate })
      );

      // Set new season name
      act(() => {
        result.current.setFieldValue('newSeasonName', 'New Season 2025');
      });

      // Create season
      await act(async () => {
        await result.current.handleCreateSeason();
      });

      expect(onSeasonCreate).toHaveBeenCalledWith('New Season 2025');
      expect(result.current.values.seasonId).toBe('new-season-id');
      expect(result.current.values.newSeasonName).toBe('');
      expect(result.current.values.linkType).toBe('season');
    });

    it('should handle tournament creation successfully', async () => {
      const onTournamentCreate = jest.fn().mockResolvedValue('new-tournament-id');
      const { result } = renderHook(() => 
        useGameSettingsForm({ onTournamentCreate })
      );

      // Set new tournament name
      act(() => {
        result.current.setFieldValue('newTournamentName', 'New Tournament 2025');
      });

      // Create tournament
      await act(async () => {
        await result.current.handleCreateTournament();
      });

      expect(onTournamentCreate).toHaveBeenCalledWith('New Tournament 2025');
      expect(result.current.values.tournamentId).toBe('new-tournament-id');
      expect(result.current.values.newTournamentName).toBe('');
      expect(result.current.values.linkType).toBe('tournament');
    });

    it('should handle season creation error', async () => {
      const onSeasonCreate = jest.fn().mockRejectedValue(new Error('Creation failed'));
      const { result } = renderHook(() => 
        useGameSettingsForm({ onSeasonCreate })
      );

      // Set new season name
      act(() => {
        result.current.setFieldValue('newSeasonName', 'New Season 2025');
      });

      // Attempt to create season
      await act(async () => {
        await result.current.handleCreateSeason();
      });

      expect(onSeasonCreate).toHaveBeenCalledWith('New Season 2025');
      expect(result.current.errors.newSeasonName).toBe('Failed to create season');
      expect(result.current.values.seasonId).toBe(null);
    });

    it('should validate season name before creation', async () => {
      const onSeasonCreate = jest.fn();
      const { result } = renderHook(() => 
        useGameSettingsForm({ onSeasonCreate })
      );

      // Try to create without name
      await act(async () => {
        await result.current.handleCreateSeason();
      });

      expect(onSeasonCreate).not.toHaveBeenCalled();
      expect(result.current.errors.newSeasonName).toBe('Season name is required');
    });
  });

  describe('Form State Management', () => {
    it('should detect form changes', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      expect(result.current.hasFormChanged()).toBe(false);

      act(() => {
        result.current.handleTeamNameChange('Test Team');
      });

      expect(result.current.hasFormChanged()).toBe(true);
    });

    it('should get form data', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.setFieldValues({
          teamName: 'Test Team',
          opponentName: 'Opponent Team',
          gameDate: '2025-12-25',
        });
      });

      const formData = result.current.getFormData();
      expect(formData.teamName).toBe('Test Team');
      expect(formData.opponentName).toBe('Opponent Team');
      expect(formData.gameDate).toBe('2025-12-25');
    });

    it('should reset form to initial values', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      // Change some values
      act(() => {
        result.current.setFieldValues({
          teamName: 'Test Team',
          opponentName: 'Test Opponent',
          periodDurationMinutes: 90,
        });
      });

      expect(result.current.values.teamName).toBe('Test Team');
      expect(result.current.values.periodDurationMinutes).toBe(90);

      // Reset form
      act(() => {
        result.current.resetForm();
      });

      expect(result.current.values.teamName).toBe('');
      expect(result.current.values.periodDurationMinutes).toBe(45);
    });

    it('should clear form values', () => {
      const { result } = renderHook(() => useGameSettingsForm());

      // Set some values
      act(() => {
        result.current.setFieldValues({
          teamName: 'Test Team',
          gameLocation: 'Test Stadium',
        });
      });

      expect(result.current.values.teamName).toBe('Test Team');
      expect(result.current.values.gameLocation).toBe('Test Stadium');

      // Clear form
      act(() => {
        result.current.clearForm();
      });

      expect(result.current.values.teamName).toBe('');
      expect(result.current.values.gameLocation).toBe('');
    });
  });

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      const { result } = renderHook(() => useGameSettingsForm());

      await act(async () => {
        await result.current.validateForm();
      });

      // Team name and opponent name are required
      expect(result.current.errors.teamName).toBeTruthy();
      expect(result.current.errors.opponentName).toBeTruthy();
    });

    it('should validate game time format', async () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleGameTimeChange('invalid-time');
      });

      await act(async () => {
        await result.current.validateForm();
      });

      expect(result.current.errors.gameTime).toBe('Please enter a valid time in HH:MM format');
    });

    it('should accept valid game time format', async () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleGameTimeChange('14:30');
      });

      await act(async () => {
        await result.current.validateForm();
      });

      expect(result.current.errors.gameTime).toBeFalsy();
    });

    it('should validate period duration range', async () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handlePeriodDurationChange(150); // Too high
      });

      await act(async () => {
        await result.current.validateForm();
      });

      expect(result.current.errors.periodDurationMinutes).toBe('Duration must be between 1 and 120 minutes');
    });

    it('should validate demand factor range', async () => {
      const { result } = renderHook(() => useGameSettingsForm());

      act(() => {
        result.current.handleDemandFactorChange(2.0); // Too high
      });

      await act(async () => {
        await result.current.validateForm();
      });

      expect(result.current.errors.demandFactor).toBe('Demand factor must be between 0.5 and 1.5');
    });
  });

  describe('Options and Configuration', () => {
    it('should handle field change callbacks', () => {
      const onFieldChange = jest.fn();
      const { result } = renderHook(() => 
        useGameSettingsForm({ onFieldChange })
      );

      act(() => {
        result.current.handleTeamNameChange('Test Team');
      });

      expect(onFieldChange).toHaveBeenCalledWith('teamName', 'Test Team');
    });

    it('should handle form submission', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => 
        useGameSettingsForm({ onSubmit })
      );

      // Set required fields
      act(() => {
        result.current.setFieldValues({
          teamName: 'Test Team',
          opponentName: 'Test Opponent',
        });
      });

      await act(async () => {
        await result.current.submitForm();
      });

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        teamName: 'Test Team',
        opponentName: 'Test Opponent',
      }));
    });
  });

  describe('Legacy Mode', () => {
    it('should use legacy implementation when migration safety is enabled', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
      });

      const { result } = renderHook(() => useGameSettingsForm());

      expect(result.current.migrationStatus).toBe('legacy');
      expect(result.current.values).toEqual({});
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Field Helpers', () => {
    it('should provide field helpers with correct state', () => {
      const { result } = renderHook(() => useGameSettingsForm());

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
        opponentName: 'Test Opponent',
        gameDate: '2025-12-25',
        gameTime: '15:30',
        homeOrAway: 'away',
        numPeriods: 1,
        periodDurationMinutes: 90,
        demandFactor: 1.2,
        isPlayed: true,
        selectedPlayerIds: ['player1', 'player2'],
        gameNotes: 'Test notes',
      };

      const formValues = convertPropsToFormValues(props);

      expect(formValues.teamName).toBe('Test Team');
      expect(formValues.opponentName).toBe('Test Opponent');
      expect(formValues.gameDate).toBe('2025-12-25');
      expect(formValues.gameTime).toBe('15:30');
      expect(formValues.homeOrAway).toBe('away');
      expect(formValues.numPeriods).toBe(1);
      expect(formValues.periodDurationMinutes).toBe(90);
      expect(formValues.demandFactor).toBe(1.2);
      expect(formValues.isPlayed).toBe(true);
      expect(formValues.selectedPlayerIds).toEqual(['player1', 'player2']);
      expect(formValues.gameNotes).toBe('Test notes');
    });

    it('should handle missing props with defaults', () => {
      const props = {};
      const formValues = convertPropsToFormValues(props);

      expect(formValues.teamName).toBe('');
      expect(formValues.homeOrAway).toBe('home');
      expect(formValues.numPeriods).toBe(2);
      expect(formValues.periodDurationMinutes).toBe(45);
      expect(formValues.demandFactor).toBe(1.0);
      expect(formValues.isPlayed).toBe(false);
      expect(formValues.selectedPlayerIds).toEqual([]);
    });
  });

  describe('extractFairPlayCardPlayer', () => {
    it('should extract fair play card player', () => {
      const players = [
        { id: 'player1', receivedFairPlayCard: false },
        { id: 'player2', receivedFairPlayCard: true },
        { id: 'player3' },
      ];

      const result = extractFairPlayCardPlayer(players);
      expect(result).toBe('player2');
    });

    it('should return null when no fair play card player', () => {
      const players = [
        { id: 'player1', receivedFairPlayCard: false },
        { id: 'player2' },
      ];

      const result = extractFairPlayCardPlayer(players);
      expect(result).toBe(null);
    });

    it('should handle empty player array', () => {
      const result = extractFairPlayCardPlayer([]);
      expect(result).toBe(null);
    });
  });
});