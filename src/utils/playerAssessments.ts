import type { PlayerAssessment, AppState } from '@/types';
import { getGame, saveGame } from './savedGames';
import logger from './logger';

export const getPlayerAssessments = async (
  gameId: string,
): Promise<{ [playerId: string]: PlayerAssessment } | null> => {
  try {
    const game = await getGame(gameId);
    return game?.assessments || null;
  } catch (error) {
    logger.error('Error getting player assessments:', error);
    throw error;
  }
};

export const savePlayerAssessment = async (
  gameId: string,
  playerId: string,
  assessment: PlayerAssessment,
): Promise<AppState | null> => {
  try {
    const game = await getGame(gameId);
    if (!game) {
      logger.warn(`Game with ID ${gameId} not found for saving assessment.`);
      return null;
    }
    const updatedGame: AppState = {
      ...game,
      assessments: {
        ...(game.assessments || {}),
        [playerId]: assessment,
      },
    };
    return saveGame(gameId, updatedGame);
  } catch (error) {
    logger.error('Error saving player assessment:', error);
    throw error;
  }
};
