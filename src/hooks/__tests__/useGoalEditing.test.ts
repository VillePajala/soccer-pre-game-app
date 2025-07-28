import { renderHook, act } from '@testing-library/react';
import { useGoalEditing } from '../useGoalEditing';
import { useErrorHandler } from '../useErrorHandler';
import { GameEvent } from '@/types';

// Mock dependencies
jest.mock('../useErrorHandler');

const mockHandleValidationError = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  (useErrorHandler as jest.Mock).mockReturnValue({
    handleValidationError: mockHandleValidationError,
  });
});

const mockGameEvents: GameEvent[] = [
  {
    id: '1',
    type: 'goal',
    time: 300, // 5:00
    playerId: 'player1',
    assistId: 'player2',
    gameId: 'game1',
  },
  {
    id: '2',
    type: 'goal',
    time: 600, // 10:00
    playerId: 'player2',
    gameId: 'game1',
  },
];

const mockProps = {
  gameEvents: mockGameEvents,
  onUpdateGameEvent: jest.fn(),
  onDeleteGameEvent: jest.fn(),
  setLocalGameEvents: jest.fn(),
  formatTime: (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  },
  t: (key: string, fallback?: string) => fallback || key,
};

describe('useGoalEditing', () => {
  describe('initialization', () => {
    it('should initialize with default state', () => {
      const { result } = renderHook(() => useGoalEditing(mockProps));
      
      expect(result.current.editingGoalId).toBeNull();
      expect(result.current.editGoalTime).toBe('');
      expect(result.current.editGoalScorerId).toBe('');
      expect(result.current.editGoalAssisterId).toBeUndefined();
    });
  });

  describe('startEditingGoal', () => {
    it('should set editing state for existing goal', () => {
      const { result } = renderHook(() => useGoalEditing(mockProps));
      
      act(() => {
        result.current.startEditingGoal('1');
      });
      
      expect(result.current.editingGoalId).toBe('1');
      expect(result.current.editGoalTime).toBe('5:00');
      expect(result.current.editGoalScorerId).toBe('player1');
      expect(result.current.editGoalAssisterId).toBe('player2');
    });

    it('should handle goal without assist', () => {
      const { result } = renderHook(() => useGoalEditing(mockProps));
      
      act(() => {
        result.current.startEditingGoal('2');
      });
      
      expect(result.current.editingGoalId).toBe('2');
      expect(result.current.editGoalTime).toBe('10:00');
      expect(result.current.editGoalScorerId).toBe('player2');
      expect(result.current.editGoalAssisterId).toBe('');
    });

    it('should handle non-existent goal', () => {
      const { result } = renderHook(() => useGoalEditing(mockProps));
      
      act(() => {
        result.current.startEditingGoal('non-existent');
      });
      
      expect(result.current.editingGoalId).toBe('non-existent');
      expect(result.current.editGoalTime).toBe('');
      expect(result.current.editGoalScorerId).toBe('');
      expect(result.current.editGoalAssisterId).toBe('');
    });
  });

  describe('cancelEditingGoal', () => {
    it('should reset editing state', () => {
      const { result } = renderHook(() => useGoalEditing(mockProps));
      
      act(() => {
        result.current.startEditingGoal('1');
      });
      
      expect(result.current.editingGoalId).toBe('1');
      
      act(() => {
        result.current.cancelEditingGoal();
      });
      
      expect(result.current.editingGoalId).toBeNull();
      expect(result.current.editGoalTime).toBe('');
      expect(result.current.editGoalScorerId).toBe('');
      expect(result.current.editGoalAssisterId).toBeUndefined();
    });
  });

  describe('saveEditedGoal', () => {
    it('should validate time format - valid MM:SS', () => {
      const { result } = renderHook(() => useGoalEditing(mockProps));
      
      act(() => {
        result.current.startEditingGoal('1');
        result.current.setEditGoalTime('12:30');
        result.current.setEditGoalScorerId('player1');
      });
      
      act(() => {
        result.current.saveEditedGoal();
      });
      
      expect(mockProps.onUpdateGameEvent).toHaveBeenCalledWith({
        ...mockGameEvents[0],
        time: 750, // 12:30 in seconds
        playerId: 'player1',
        assistId: undefined,
      });
    });

    it('should validate time format - invalid format shows error', () => {
      const { result } = renderHook(() => useGoalEditing(mockProps));
      
      act(() => {
        result.current.startEditingGoal('1');
        result.current.setEditGoalTime('invalid');
        result.current.setEditGoalScorerId('player1');
      });
      
      act(() => {
        result.current.saveEditedGoal();
      });
      
      expect(mockHandleValidationError).toHaveBeenCalledWith(
        'Invalid time format. MM:SS',
        'Goal Time'
      );
      expect(mockProps.onUpdateGameEvent).not.toHaveBeenCalled();
    });

    it('should validate time format - invalid seconds shows error', () => {
      const { result } = renderHook(() => useGoalEditing(mockProps));
      
      act(() => {
        result.current.startEditingGoal('1');
        result.current.setEditGoalTime('5:60'); // Invalid seconds
        result.current.setEditGoalScorerId('player1');
      });
      
      act(() => {
        result.current.saveEditedGoal();
      });
      
      expect(mockHandleValidationError).toHaveBeenCalledWith(
        'Invalid time format. MM:SS',
        'Goal Time'
      );
      expect(mockProps.onUpdateGameEvent).not.toHaveBeenCalled();
    });

    it('should validate scorer is selected', () => {
      const { result } = renderHook(() => useGoalEditing(mockProps));
      
      act(() => {
        result.current.startEditingGoal('1');
        result.current.setEditGoalTime('5:00');
        result.current.setEditGoalScorerId(''); // No scorer
      });
      
      act(() => {
        result.current.saveEditedGoal();
      });
      
      expect(mockHandleValidationError).toHaveBeenCalledWith(
        'Scorer must be selected.',
        'Scorer'
      );
      expect(mockProps.onUpdateGameEvent).not.toHaveBeenCalled();
    });

    it('should save valid goal with assist', () => {
      const { result } = renderHook(() => useGoalEditing(mockProps));
      
      act(() => {
        result.current.startEditingGoal('1');
        result.current.setEditGoalTime('8:45');
        result.current.setEditGoalScorerId('player3');
        result.current.setEditGoalAssisterId('player4');
      });
      
      act(() => {
        result.current.saveEditedGoal();
      });
      
      expect(mockProps.onUpdateGameEvent).toHaveBeenCalledWith({
        ...mockGameEvents[0],
        time: 525, // 8:45 in seconds
        playerId: 'player3',
        assistId: 'player4',
      });
      expect(result.current.editingGoalId).toBeNull();
    });

    it('should save valid goal without assist', () => {
      const { result } = renderHook(() => useGoalEditing(mockProps));
      
      act(() => {
        result.current.startEditingGoal('1');
        result.current.setEditGoalTime('3:15');
        result.current.setEditGoalScorerId('player5');
        result.current.setEditGoalAssisterId('');
      });
      
      act(() => {
        result.current.saveEditedGoal();
      });
      
      expect(mockProps.onUpdateGameEvent).toHaveBeenCalledWith({
        ...mockGameEvents[0],
        time: 195, // 3:15 in seconds
        playerId: 'player5',
        assistId: undefined,
      });
    });

    it('should update local events when no onUpdateGameEvent provided', () => {
      const propsWithoutUpdate = { ...mockProps, onUpdateGameEvent: undefined };
      const { result } = renderHook(() => useGoalEditing(propsWithoutUpdate));
      
      act(() => {
        result.current.startEditingGoal('1');
        result.current.setEditGoalTime('2:30');
        result.current.setEditGoalScorerId('player6');
      });
      
      act(() => {
        result.current.saveEditedGoal();
      });
      
      expect(mockProps.setLocalGameEvents).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('deleteGoal', () => {
    it('should call onDeleteGameEvent when provided', () => {
      const { result } = renderHook(() => useGoalEditing(mockProps));
      
      act(() => {
        result.current.deleteGoal('1');
      });
      
      expect(mockProps.onDeleteGameEvent).toHaveBeenCalledWith('1');
    });

    it('should update local events when no onDeleteGameEvent provided', () => {
      const propsWithoutDelete = { ...mockProps, onDeleteGameEvent: undefined };
      const { result } = renderHook(() => useGoalEditing(propsWithoutDelete));
      
      act(() => {
        result.current.deleteGoal('1');
      });
      
      expect(mockProps.setLocalGameEvents).toHaveBeenCalledWith(
        expect.any(Function)
      );
    });
  });

  describe('state setters', () => {
    it('should update edit goal time', () => {
      const { result } = renderHook(() => useGoalEditing(mockProps));
      
      act(() => {
        result.current.setEditGoalTime('15:30');
      });
      
      expect(result.current.editGoalTime).toBe('15:30');
    });

    it('should update edit goal scorer id', () => {
      const { result } = renderHook(() => useGoalEditing(mockProps));
      
      act(() => {
        result.current.setEditGoalScorerId('newPlayer');
      });
      
      expect(result.current.editGoalScorerId).toBe('newPlayer');
    });

    it('should update edit goal assister id', () => {
      const { result } = renderHook(() => useGoalEditing(mockProps));
      
      act(() => {
        result.current.setEditGoalAssisterId('assister');
      });
      
      expect(result.current.editGoalAssisterId).toBe('assister');
    });
  });
});