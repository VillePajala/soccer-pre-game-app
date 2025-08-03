import type { 
  GameEvent, 
  GoalEvent, 
  OpponentGoalEvent, 
  SubstitutionEvent, 
  PeriodEndEvent, 
  GameEndEvent, 
  FairPlayCardEvent 
} from '@/types';

/**
 * Type guard to check if an event is a goal event
 */
export function isGoalEvent(event: GameEvent): event is GoalEvent {
  return event.type === 'goal';
}

/**
 * Type guard to check if an event is an opponent goal event
 */
export function isOpponentGoalEvent(event: GameEvent): event is OpponentGoalEvent {
  return event.type === 'opponentGoal';
}

/**
 * Type guard to check if an event is a substitution event
 */
export function isSubstitutionEvent(event: GameEvent): event is SubstitutionEvent {
  return event.type === 'substitution';
}

/**
 * Type guard to check if an event is a period end event
 */
export function isPeriodEndEvent(event: GameEvent): event is PeriodEndEvent {
  return event.type === 'periodEnd';
}

/**
 * Type guard to check if an event is a game end event
 */
export function isGameEndEvent(event: GameEvent): event is GameEndEvent {
  return event.type === 'gameEnd';
}

/**
 * Type guard to check if an event is a fair play card event
 */
export function isFairPlayCardEvent(event: GameEvent): event is FairPlayCardEvent {
  return event.type === 'fairPlayCard';
}

/**
 * Type guard to check if an event has a scorer (goal or opponent goal)
 */
export function hasScorerId(event: GameEvent): event is GoalEvent | OpponentGoalEvent {
  return event.type === 'goal' || event.type === 'opponentGoal';
}

/**
 * Type guard to check if an event can have an assister (only goals)
 */
export function canHaveAssisterId(event: GameEvent): event is GoalEvent {
  return event.type === 'goal';
}

/**
 * Type guard to check if an event has an entity ID
 */
export function hasEntityId(event: GameEvent): event is SubstitutionEvent | FairPlayCardEvent {
  return event.type === 'substitution' || event.type === 'fairPlayCard';
}