import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { useNewGameSetupForm, NewGameSetupFormOptions, convertPropsToFormValues, normalizeRosterIds } from '../useNewGameSetupForm';

// Mock dependencies
  });

  describe('Basic Form Operations', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      expect(result.current.values.teamName).toBe('');
      expect(result.current.values.opponentName).toBe('');
      expect(result.current.values.gameLocation).toBe('');
      expect(result.current.values.gameTime).toBe('');
      expect(result.current.values.gameHour).toBe('');
      expect(result.current.values.gameMinute).toBe('');
      expect(result.current.values.seasonId).toBe(null);
      expect(result.current.values.tournamentId).toBe(null);
      expect(result.current.values.homeOrAway).toBe('home');
      expect(result.current.values.numPeriods).toBe(2);
      expect(result.current.values.periodDurationMinutes).toBe(10);
      expect(result.current.values.demandFactor).toBe(1.0);
      expect(result.current.values.isPlayed).toBe(true);
      expect(result.current.values.selectedPlayerIds).toEqual([]);
      expect(result.current.migrationStatus).toBe('zustand');
    });

    it('should initialize gameDate with current date', () => {
      const { result } = renderHook(() => useNewGameSetupForm());
      const currentDate = new Date().toISOString().split('T')[0];
      
      expect(result.current.values.gameDate).toBe(currentDate);
    });

    it('should initialize with custom initial values', () => {
      const options: NewGameSetupFormOptions = {
        initialTeamName: 'My Soccer Team',
        demandFactor: 1.2,
        initialPlayerSelection: ['player1', 'player2'],
      };

      const { result } = renderHook(() => useNewGameSetupForm(options));

      expect(result.current.values.teamName).toBe('My Soccer Team');
      expect(result.current.values.demandFactor).toBe(1.2);
      expect(result.current.values.selectedPlayerIds).toEqual(['player1', 'player2']);
    });
  });

  describe('Basic Field Handlers', () => {
    it('should handle team name changes', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleTeamNameChange('Arsenal FC');
      });

      expect(result.current.values.teamName).toBe('Arsenal FC');
    });

    it('should handle opponent name changes', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleOpponentNameChange('Chelsea FC');
      });

      expect(result.current.values.opponentName).toBe('Chelsea FC');
    });

    it('should handle game date changes', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleGameDateChange('2025-12-25');
      });

      expect(result.current.values.gameDate).toBe('2025-12-25');
    });

    it('should handle game location changes', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleGameLocationChange('Emirates Stadium');
      });

      expect(result.current.values.gameLocation).toBe('Emirates Stadium');
    });

    it('should handle game time changes', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleGameTimeChange('15:30');
      });

      expect(result.current.values.gameTime).toBe('15:30');
      expect(result.current.values.gameHour).toBe('15');
      expect(result.current.values.gameMinute).toBe('30');
    });
  });

  describe('Time Component Handlers', () => {
    it('should handle hour changes and update game time', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      // Set minute first
      act(() => {
        result.current.handleGameMinuteChange('45');
      });

      // Then set hour
      act(() => {
        result.current.handleGameHourChange('14');
      });

      expect(result.current.values.gameHour).toBe('14');
      expect(result.current.values.gameMinute).toBe('45');
      expect(result.current.values.gameTime).toBe('14:45');
    });

    it('should handle minute changes and update game time', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      // Set hour first
      act(() => {
        result.current.handleGameHourChange('09');
      });

      // Then set minute
      act(() => {
        result.current.handleGameMinuteChange('15');
      });

      expect(result.current.values.gameHour).toBe('09');
      expect(result.current.values.gameMinute).toBe('15');
      expect(result.current.values.gameTime).toBe('09:15');
    });

    it('should limit hour input to 2 digits', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleGameHourChange('123');
      });

      expect(result.current.values.gameHour).toBe('12');
    });

    it('should limit minute input to 2 digits', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleGameMinuteChange('789');
      });

      expect(result.current.values.gameMinute).toBe('78');
    });
  });

  describe('Game Configuration Handlers', () => {
    it('should handle age group changes', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleAgeGroupChange('U12');
      });

      expect(result.current.values.ageGroup).toBe('U12');
    });

    it('should handle tournament level changes', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleTournamentLevelChange('Elite');
      });

      expect(result.current.values.tournamentLevel).toBe('Elite');
    });

    it('should handle home/away changes', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleHomeOrAwayChange('away');
      });

      expect(result.current.values.homeOrAway).toBe('away');
    });

    it('should handle number of periods changes', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleNumPeriodsChange(1);
      });

      expect(result.current.values.numPeriods).toBe(1);
    });

    it('should handle period duration changes', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handlePeriodDurationChange(15);
      });

      expect(result.current.values.periodDurationMinutes).toBe(15);
    });

    it('should handle demand factor changes', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleDemandFactorChange(1.3);
      });

      expect(result.current.values.demandFactor).toBe(1.3);
    });

    it('should handle is played changes', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleIsPlayedChange(false);
      });

      expect(result.current.values.isPlayed).toBe(false);
    });
  });

  describe('Player Management', () => {
    it('should handle selected players changes', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleSelectedPlayersChange(['player1', 'player2', 'player3']);
      });

      expect(result.current.values.selectedPlayerIds).toEqual(['player1', 'player2', 'player3']);
    });
  });

  describe('Season/Tournament Management', () => {
    it('should handle season changes and clear tournament', () => {
      const availableSeasons = [
        { id: 'season1', name: 'Spring 2025', location: 'Field A', ageGroup: 'U10' }
      ];

      const { result } = renderHook(() => useNewGameSetupForm({ availableSeasons }));

      // Set initial tournament
      act(() => {
        result.current.setFieldValue('tournamentId', 'tournament1');
      });

      // Change season - should clear tournament and auto-populate fields
      act(() => {
        result.current.handleSeasonChange('season1');
      });

      expect(result.current.values.seasonId).toBe('season1');
      expect(result.current.values.tournamentId).toBe(null);
      expect(result.current.values.gameLocation).toBe('Field A');
      expect(result.current.values.ageGroup).toBe('U10');
    });

    it('should handle tournament changes and clear season', () => {
      const availableTournaments = [
        { id: 'tournament1', name: 'Cup 2025', location: 'Stadium B', level: 'Elite' }
      ];

      const { result } = renderHook(() => useNewGameSetupForm({ availableTournaments }));

      // Set initial season
      act(() => {
        result.current.setFieldValue('seasonId', 'season1');
      });

      // Change tournament - should clear season and auto-populate fields
      act(() => {
        result.current.handleTournamentChange('tournament1');
      });

      expect(result.current.values.tournamentId).toBe('tournament1');
      expect(result.current.values.seasonId).toBe(null);
      expect(result.current.values.gameLocation).toBe('Stadium B');
      expect(result.current.values.tournamentLevel).toBe('Elite');
    });

    it('should auto-populate period settings from season', () => {
      const availableSeasons = [
        { 
          id: 'season1', 
          name: 'Spring 2025', 
          periodCount: 1, 
          periodDuration: 20,
          defaultRoster: ['player1', 'player2']
        }
      ];

      const { result } = renderHook(() => useNewGameSetupForm({ availableSeasons }));

      act(() => {
        result.current.handleSeasonChange('season1');
      });

      expect(result.current.values.numPeriods).toBe(1);
      expect(result.current.values.periodDurationMinutes).toBe(20);
      expect(result.current.values.selectedPlayerIds).toEqual(['player1', 'player2']);
    });

    it('should auto-populate fields from tournament', () => {
      const availableTournaments = [
        { 
          id: 'tournament1', 
          name: 'Cup 2025',
          ageGroup: 'U14',
          periodCount: 2,
          periodDuration: 25,
          defaultRoster: ['player3', 'player4']
        }
      ];

      const { result } = renderHook(() => useNewGameSetupForm({ availableTournaments }));

      act(() => {
        result.current.handleTournamentChange('tournament1');
      });

      expect(result.current.values.ageGroup).toBe('U14');
      expect(result.current.values.numPeriods).toBe(2);
      expect(result.current.values.periodDurationMinutes).toBe(25);
      expect(result.current.values.selectedPlayerIds).toEqual(['player3', 'player4']);
    });
  });

  describe('Dynamic Creation', () => {
    it('should handle season creation successfully', async () => {
      const onSeasonCreate = jest.fn().mockResolvedValue('new-season-id');
      const { result } = renderHook(() => 
        useNewGameSetupForm({ onSeasonCreate })
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
    });

    it('should handle tournament creation successfully', async () => {
      const onTournamentCreate = jest.fn().mockResolvedValue('new-tournament-id');
      const { result } = renderHook(() => 
        useNewGameSetupForm({ onTournamentCreate })
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
    });

    it('should handle season creation error', async () => {
      const onSeasonCreate = jest.fn().mockRejectedValue(new Error('Creation failed'));
      const { result } = renderHook(() => 
        useNewGameSetupForm({ onSeasonCreate })
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
        useNewGameSetupForm({ onSeasonCreate })
      );

      // Try to create without name
      await act(async () => {
        await result.current.handleCreateSeason();
      });

      expect(onSeasonCreate).not.toHaveBeenCalled();
      expect(result.current.errors.newSeasonName).toBe('Season name is required');
    });

    it('should validate tournament name before creation', async () => {
      const onTournamentCreate = jest.fn();
      const { result } = renderHook(() => 
        useNewGameSetupForm({ onTournamentCreate })
      );

      // Try to create without name
      await act(async () => {
        await result.current.handleCreateTournament();
      });

      expect(onTournamentCreate).not.toHaveBeenCalled();
      expect(result.current.errors.newTournamentName).toBe('Tournament name is required');
    });
  });

  describe('Form State Management', () => {
    it('should detect form changes', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      expect(result.current.hasFormChanged()).toBe(false);

      act(() => {
        result.current.handleTeamNameChange('Test Team');
      });

      expect(result.current.hasFormChanged()).toBe(true);
    });

    it('should get form data', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

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

    it('should get formatted game time', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      // Test with hour and minute components
      act(() => {
        result.current.setFieldValues({
          gameHour: '14',
          gameMinute: '30',
        });
      });

      expect(result.current.getGameTime()).toBe('14:30');

      // Test with formatted game time
      act(() => {
        result.current.setFieldValue('gameTime', '09:15');
      });

      expect(result.current.getGameTime()).toBe('09:15');
    });

    it('should reset form to initial values', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      // Change some values
      act(() => {
        result.current.setFieldValues({
          teamName: 'Test Team',
          opponentName: 'Test Opponent',
          numPeriods: 1,
        });
      });

      expect(result.current.values.teamName).toBe('Test Team');
      expect(result.current.values.numPeriods).toBe(1);

      // Reset form
      act(() => {
        result.current.resetForm();
      });

      expect(result.current.values.teamName).toBe('');
      expect(result.current.values.numPeriods).toBe(2);
    });

    it('should clear form values', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

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
      const { result } = renderHook(() => useNewGameSetupForm());

      await act(async () => {
        await result.current.validateForm();
      });

      // Team name, opponent name, game date, period duration, and player selection are required
      expect(result.current.errors.teamName).toBeTruthy();
      expect(result.current.errors.opponentName).toBeTruthy();
      expect(result.current.errors.gameDate).toBeTruthy();
      expect(result.current.errors.periodDurationMinutes).toBeTruthy();
      expect(result.current.errors.selectedPlayerIds).toBeTruthy();
    });

    it('should validate game date format', async () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleGameDateChange('invalid-date');
      });

      await act(async () => {
        await result.current.validateForm();
      });

      expect(result.current.errors.gameDate).toBe('Please enter a valid date');
    });

    it('should accept valid game date format', async () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleGameDateChange('2025-12-25');
      });

      await act(async () => {
        await result.current.validateForm();
      });

      expect(result.current.errors.gameDate).toBeFalsy();
    });

    it('should validate period duration range', async () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handlePeriodDurationChange(150); // Too high
      });

      await act(async () => {
        await result.current.validateForm();
      });

      expect(result.current.errors.periodDurationMinutes).toBe('Duration must be between 1 and 120 minutes');
    });

    it('should validate demand factor range', async () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleDemandFactorChange(2.0); // Too high
      });

      await act(async () => {
        await result.current.validateForm();
      });

      expect(result.current.errors.demandFactor).toBe('Demand factor must be between 0.5 and 1.5');
    });

    it('should validate time components', async () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleGameHourChange('25'); // Invalid hour
      });

      await act(async () => {
        await result.current.validateForm();
      });

      expect(result.current.errors.gameHour).toBe('Hour must be between 0 and 23');
    });

    it('should validate player selection', async () => {
      const { result } = renderHook(() => useNewGameSetupForm());

      act(() => {
        result.current.handleSelectedPlayersChange([]); // No players selected
      });

      await act(async () => {
        await result.current.validateForm();
      });

      expect(result.current.errors.selectedPlayerIds).toBe('Please select at least one player');
    });
  });

  describe('Options and Configuration', () => {
    it('should handle field change callbacks', () => {
      const onFieldChange = jest.fn();
      const { result } = renderHook(() => 
        useNewGameSetupForm({ onFieldChange })
      );

      act(() => {
        result.current.handleTeamNameChange('Test Team');
      });

      expect(onFieldChange).toHaveBeenCalledWith('teamName', 'Test Team');
    });

    it('should handle demand factor callback', () => {
      const onDemandFactorChange = jest.fn();
      const { result } = renderHook(() => 
        useNewGameSetupForm({ onDemandFactorChange })
      );

      act(() => {
        result.current.handleDemandFactorChange(1.2);
      });

      expect(onDemandFactorChange).toHaveBeenCalledWith(1.2);
    });

    it('should handle form submission', async () => {
      const onSubmit = jest.fn().mockResolvedValue(undefined);
      const { result } = renderHook(() => 
        useNewGameSetupForm({ onSubmit })
      );

      // Set required fields
      act(() => {
        result.current.setFieldValues({
          teamName: 'Test Team',
          opponentName: 'Test Opponent',
          gameDate: '2025-12-25',
          periodDurationMinutes: 10,
          selectedPlayerIds: ['player1'],
        });
      });

      await act(async () => {
        await result.current.submitForm();
      });

      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({
        teamName: 'Test Team',
        opponentName: 'Test Opponent',
        gameDate: '2025-12-25',
      }));
    });
  });

  describe('Legacy Mode', () => {
    it('should use legacy implementation when migration safety is enabled', () => {
      mockUseMigrationSafety.mockReturnValue({
        shouldUseLegacy: true,
      });

      const { result } = renderHook(() => useNewGameSetupForm());

      expect(result.current.migrationStatus).toBe('legacy');
      expect(result.current.values).toEqual({});
      expect(result.current.isValid).toBe(true);
    });
  });

  describe('Field Helpers', () => {
    it('should provide field helpers with correct state', () => {
      const { result } = renderHook(() => useNewGameSetupForm());

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
        gameLocation: 'Stadium A',
        seasonId: 'season1',
        homeOrAway: 'away',
        numPeriods: 1,
        periodDurationMinutes: 20,
        demandFactor: 1.2,
        isPlayed: false,
        selectedPlayerIds: ['player1', 'player2'],
        gameHour: '15',
        gameMinute: '30',
      };

      const formValues = convertPropsToFormValues(props);

      expect(formValues.teamName).toBe('Test Team');
      expect(formValues.opponentName).toBe('Test Opponent');
      expect(formValues.gameDate).toBe('2025-12-25');
      expect(formValues.gameTime).toBe('15:30');
      expect(formValues.gameLocation).toBe('Stadium A');
      expect(formValues.seasonId).toBe('season1');
      expect(formValues.homeOrAway).toBe('away');
      expect(formValues.numPeriods).toBe(1);
      expect(formValues.periodDurationMinutes).toBe(20);
      expect(formValues.demandFactor).toBe(1.2);
      expect(formValues.isPlayed).toBe(false);
      expect(formValues.selectedPlayerIds).toEqual(['player1', 'player2']);
      expect(formValues.gameHour).toBe('15');
      expect(formValues.gameMinute).toBe('30');
    });

    it('should handle missing props with defaults', () => {
      const props = {};
      const formValues = convertPropsToFormValues(props);

      expect(formValues.teamName).toBe('');
      expect(formValues.homeOrAway).toBe('home');
      expect(formValues.numPeriods).toBe(2);
      expect(formValues.periodDurationMinutes).toBe(10);
      expect(formValues.demandFactor).toBe(1.0);
      expect(formValues.isPlayed).toBe(true);
      expect(formValues.selectedPlayerIds).toEqual([]);
    });
  });

  describe('normalizeRosterIds', () => {
    it('should normalize valid roster IDs', () => {
      const roster = ['player1', 'player2', 'player3'];
      const result = normalizeRosterIds(roster);
      expect(result).toEqual(['player1', 'player2', 'player3']);
    });

    it('should filter out invalid roster IDs', () => {
      const roster = ['player1', '', 'player2', null, 'player3'] as any;
      const result = normalizeRosterIds(roster);
      expect(result).toEqual(['player1', 'player2', 'player3']);
    });

    it('should handle undefined roster', () => {
      const result = normalizeRosterIds(undefined);
      expect(result).toEqual([]);
    });

    it('should handle non-array roster', () => {
      const result = normalizeRosterIds('not-an-array' as any);
      expect(result).toEqual([]);
    });

    it('should handle empty array', () => {
      const result = normalizeRosterIds([]);
      expect(result).toEqual([]);
    });
  });
});