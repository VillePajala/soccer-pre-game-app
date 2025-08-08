import { useOfflineFirstGameTimer } from './useOfflineFirstGameTimer';
import { GameSessionState, GameSessionAction } from './useGameSessionReducer';

interface UseGameTimerArgs {
  state: GameSessionState;
  dispatch: React.Dispatch<GameSessionAction>;
  currentGameId: string;
}

export const useGameTimer = ({ state, dispatch, currentGameId }: UseGameTimerArgs) => {
  return useOfflineFirstGameTimer({ state, dispatch, currentGameId });
};
