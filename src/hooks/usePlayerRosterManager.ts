import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Player, PlayerAssessment, IntervalLog, SavedGamesCollection } from '@/types';
import type { UseRosterReturn } from './useRoster';
import usePlayerAssessments from './usePlayerAssessments';
import { GameSessionAction } from './useGameSessionReducer';
import logger from '@/utils/logger';

interface UsePlayerRosterManagerProps {
  roster: UseRosterReturn;
  masterRosterPlayers?: Player[];
  selectedPlayerIds: string[];
  dispatchGameSession: React.Dispatch<GameSessionAction>;
  currentGameId: string | null;
  completedIntervals: IntervalLog[];
  setSavedGames: React.Dispatch<React.SetStateAction<SavedGamesCollection>>;
}

export const usePlayerRosterManager = ({
  roster,
  masterRosterPlayers,
  selectedPlayerIds,
  dispatchGameSession,
  currentGameId,
  completedIntervals,
  setSavedGames,
}: UsePlayerRosterManagerProps) => {
  const { t } = useTranslation();
  const {
    availablePlayers,
    handleAddPlayer,
    handleUpdatePlayer,
    handleRemovePlayer,
    handleSetGoalieStatus,
    setRosterError,
  } = roster;

  const {
    assessments: playerAssessments,
    saveAssessment,
    deleteAssessment,
  } = usePlayerAssessments(currentGameId || '', completedIntervals);

  const handleRenamePlayerForModal = useCallback(
    async (playerId: string, playerData: { name: string; nickname?: string }) => {
      logger.log('[usePlayerRosterManager] Renaming player', playerId, playerData.name);
      setRosterError(null);
      try {
        await handleUpdatePlayer(playerId, { name: playerData.name, nickname: playerData.nickname });
      } catch (error) {
        logger.error('[usePlayerRosterManager] rename failed', error);
      }
    },
    [handleUpdatePlayer, setRosterError]
  );

  const handleSetJerseyNumberForModal = useCallback(
    async (playerId: string, jerseyNumber: string) => {
      logger.log('[usePlayerRosterManager] Updating jersey number', playerId, jerseyNumber);
      setRosterError(null);
      try {
        await handleUpdatePlayer(playerId, { jerseyNumber });
      } catch (error) {
        logger.error('[usePlayerRosterManager] jersey number update failed', error);
      }
    },
    [handleUpdatePlayer, setRosterError]
  );

  const handleSetPlayerNotesForModal = useCallback(
    async (playerId: string, notes: string) => {
      logger.log('[usePlayerRosterManager] Updating notes for', playerId);
      setRosterError(null);
      try {
        await handleUpdatePlayer(playerId, { notes });
      } catch (error) {
        logger.error('[usePlayerRosterManager] notes update failed', error);
      }
    },
    [handleUpdatePlayer, setRosterError]
  );

  const handleRemovePlayerForModal = useCallback(
    async (playerId: string) => {
      logger.log('[usePlayerRosterManager] Removing player', playerId);
      setRosterError(null);
      try {
        await handleRemovePlayer(playerId);
      } catch (error) {
        logger.error('[usePlayerRosterManager] remove failed', error);
      }
    },
    [handleRemovePlayer, setRosterError]
  );

  const handleAddPlayerForModal = useCallback(
    async (playerData: { name: string; jerseyNumber: string; notes: string; nickname: string }) => {
      logger.log('[usePlayerRosterManager] Adding player', playerData);
      setRosterError(null);

      const currentRoster = masterRosterPlayers || [];
      const collator = new Intl.Collator(undefined, { sensitivity: 'base', usage: 'search', ignorePunctuation: true });
      const normalize = (s: string) => s.normalize('NFKD');
      const newNameNormalized = normalize(playerData.name.trim());
      const newNumberTrimmed = playerData.jerseyNumber.trim();

      if (!playerData.name || playerData.name.trim().length === 0) {
        setRosterError(t('rosterSettingsModal.errors.nameRequired', 'Player name cannot be empty.'));
        return;
      }

      const nameExists = currentRoster.some(p => collator.compare(normalize(p.name.trim()), newNameNormalized) === 0);
      if (nameExists) {
        setRosterError(
          t('rosterSettingsModal.errors.duplicateName', 'A player with this name already exists. Please use a different name.')
        );
        return;
      }

      if (newNumberTrimmed) {
        const numberExists = currentRoster.some(p => p.jerseyNumber && p.jerseyNumber.trim() === newNumberTrimmed);
        if (numberExists) {
          setRosterError(
            t(
              'rosterSettingsModal.errors.duplicateNumber',
              'A player with this jersey number already exists. Please use a different number or leave it blank.'
            )
          );
          return;
        }
      }

      try {
        await handleAddPlayer(playerData);
      } catch (error) {
        logger.error('[usePlayerRosterManager] add player failed', error);
        setRosterError(
          t('rosterSettingsModal.errors.addFailed', 'Error adding player {playerName}. Please try again.', {
            playerName: playerData.name,
          })
        );
      }
    },
    [masterRosterPlayers, handleAddPlayer, t, setRosterError]
  );

  const handleToggleGoalieForModal = useCallback(
    async (playerId: string) => {
      const player = availablePlayers.find(p => p.id === playerId);
      if (!player) {
        logger.error('[usePlayerRosterManager] Player not found for goalie toggle', playerId);
        setRosterError(t('rosterSettingsModal.errors.playerNotFound', 'Player not found. Cannot toggle goalie status.'));
        return;
      }
      const targetGoalieStatus = !player.isGoalie;
      setRosterError(null);
      try {
        await handleSetGoalieStatus(playerId, targetGoalieStatus);
      } catch (error) {
        logger.error('[usePlayerRosterManager] goalie toggle failed', error);
      }
    },
    [availablePlayers, handleSetGoalieStatus, setRosterError, t]
  );

  const handleTogglePlayerSelection = useCallback(
    (playerId: string) => {
      const isSelected = selectedPlayerIds.includes(playerId);
      const newIds = isSelected ? selectedPlayerIds.filter(id => id !== playerId) : [...selectedPlayerIds, playerId];
      logger.log('[usePlayerRosterManager] Toggling player selection', { playerId, selected: !isSelected });
      dispatchGameSession({ type: 'SET_SELECTED_PLAYER_IDS', payload: newIds });
    },
    [selectedPlayerIds, dispatchGameSession]
  );

  const handleUpdateSelectedPlayers = useCallback(
    (ids: string[]) => {
      logger.log('[usePlayerRosterManager] Updating selected players', ids);
      dispatchGameSession({ type: 'SET_SELECTED_PLAYER_IDS', payload: ids });
    },
    [dispatchGameSession]
  );

  const handleSavePlayerAssessment = useCallback(
    async (playerId: string, assessment: Partial<PlayerAssessment>) => {
      if (!currentGameId) return;
      const data: PlayerAssessment = {
        ...(assessment as PlayerAssessment),
        minutesPlayed: 0,
        createdAt: Date.now(),
        createdBy: 'local',
      };
      const updated = await saveAssessment(playerId, data);
      if (updated) {
        setSavedGames(prev => ({ ...prev, [currentGameId]: updated }));
      }
    },
    [currentGameId, saveAssessment, setSavedGames]
  );

  const handleDeletePlayerAssessment = useCallback(
    async (playerId: string) => {
      if (!currentGameId) return;
      const updated = await deleteAssessment(playerId);
      if (updated) {
        setSavedGames(prev => ({ ...prev, [currentGameId]: updated }));
      }
    },
    [currentGameId, deleteAssessment, setSavedGames]
  );

  return {
    playerAssessments,
    handleRenamePlayerForModal,
    handleSetJerseyNumberForModal,
    handleSetPlayerNotesForModal,
    handleRemovePlayerForModal,
    handleAddPlayerForModal,
    handleToggleGoalieForModal,
    handleTogglePlayerSelection,
    handleUpdateSelectedPlayers,
    handleSavePlayerAssessment,
    handleDeletePlayerAssessment,
  };
};

export type UsePlayerRosterManagerReturn = ReturnType<typeof usePlayerRosterManager>;
export default usePlayerRosterManager;
