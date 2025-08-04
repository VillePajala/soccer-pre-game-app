import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Player } from '@/types';
import { addPlayer, updatePlayer, removePlayer, setGoalieStatus } from '@/utils/masterRosterManager';
import { useCacheManager } from '@/utils/cacheUtils';

interface UseRosterArgs {
  initialPlayers: Player[];
  selectedPlayerIds: string[];
  onPlayerIdUpdated?: (tempId: string, newId: string) => void;
}

export const useRoster = ({ initialPlayers, selectedPlayerIds, onPlayerIdUpdated }: UseRosterArgs) => {
  const queryClient = useQueryClient();
  const cacheManager = useCacheManager(queryClient);
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(initialPlayers);
  const [highlightRosterButton, setHighlightRosterButton] = useState(false);
  const [showRosterPrompt, setShowRosterPrompt] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [isRosterUpdating, setIsRosterUpdating] = useState(false);

  const playersForCurrentGame = useMemo(
    () => availablePlayers.filter((p) => selectedPlayerIds.includes(p.id)),
    [availablePlayers, selectedPlayerIds]
  );

  // Sync availablePlayers when initialPlayers prop changes
  useEffect(() => {
    setAvailablePlayers(initialPlayers);
  }, [initialPlayers]);

  const handleAddPlayer = async (
    data: Omit<Player, 'id' | 'isGoalie' | 'receivedFairPlayCard'>,
  ) => {
    const prev = [...availablePlayers];
    const temp: Player = {
      id: `temp-${Date.now()}`,
      isGoalie: false,
      receivedFairPlayCard: false,
      ...data,
    };
    setIsRosterUpdating(true);
    
    // Optimistic update to local state
    setAvailablePlayers([...availablePlayers, temp]);
    
    // Optimistic update to cache
    cacheManager.updateMasterRosterCache((players) => [...players, temp]);
    
    try {
      const saved = await addPlayer(data);
      if (saved) {
        // Update local state with real data
        setAvailablePlayers((players) =>
          players.map((p) => (p.id === temp.id ? saved : p)),
        );

        // Update cache with real data
        cacheManager.updateMasterRosterCache((players) =>
          players.map((p) => (p.id === temp.id ? saved : p))
        );

        if (onPlayerIdUpdated) {
          onPlayerIdUpdated(temp.id, saved.id);
        }

        setRosterError(null);
      } else {
        // Rollback optimistic updates
        setAvailablePlayers(prev);
        cacheManager.updateMasterRosterCache(() => prev);
        setRosterError('Failed to add player');
      }
    } catch {
      // Rollback optimistic updates
      setAvailablePlayers(prev);
      cacheManager.updateMasterRosterCache(() => prev);
      setRosterError('Failed to add player');
    } finally {
      setIsRosterUpdating(false);
    }
  };

  const handleUpdatePlayer = async (
    playerId: string,
    updates: Partial<Omit<Player, 'id'>>,
  ) => {
    const prev = [...availablePlayers];
    setIsRosterUpdating(true);
    
    // Optimistic updates
    const optimisticUpdate = (players: Player[]) =>
      players.map((p) => (p.id === playerId ? { ...p, ...updates } : p));
    
    setAvailablePlayers(optimisticUpdate);
    cacheManager.updateMasterRosterCache(optimisticUpdate);
    
    try {
      const updated = await updatePlayer(playerId, updates);
      if (updated) {
        // Update with real data
        const realUpdate = (players: Player[]) =>
          players.map((p) => (p.id === updated.id ? updated : p));
        
        setAvailablePlayers(realUpdate);
        cacheManager.updateMasterRosterCache(realUpdate);
        setRosterError(null);
      } else {
        // Rollback optimistic updates
        setAvailablePlayers(prev);
        cacheManager.updateMasterRosterCache(() => prev);
        setRosterError('Failed to update player');
      }
    } catch {
      // Rollback optimistic updates
      setAvailablePlayers(prev);
      cacheManager.updateMasterRosterCache(() => prev);
      setRosterError('Failed to update player');
    } finally {
      setIsRosterUpdating(false);
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    const prev = [...availablePlayers];
    setIsRosterUpdating(true);
    
    // Optimistic updates
    const removeUpdate = (players: Player[]) => players.filter((p) => p.id !== playerId);
    
    setAvailablePlayers(removeUpdate);
    cacheManager.updateMasterRosterCache(removeUpdate);
    
    try {
      const success = await removePlayer(playerId);
      if (!success) {
        // Rollback optimistic updates
        setAvailablePlayers(prev);
        cacheManager.updateMasterRosterCache(() => prev);
        setRosterError('Failed to remove player');
      } else {
        setRosterError(null);
        // No need to invalidate - optimistic update already applied
      }
    } catch {
      // Rollback optimistic updates
      setAvailablePlayers(prev);
      cacheManager.updateMasterRosterCache(() => prev);
      setRosterError('Failed to remove player');
    } finally {
      setIsRosterUpdating(false);
    }
  };

  const handleSetGoalieStatus = async (playerId: string, isGoalie: boolean) => {
    const prev = [...availablePlayers];
    setIsRosterUpdating(true);
    
    // Optimistic updates
    const goalieUpdate = (players: Player[]) =>
      players.map((p) => {
        if (p.id === playerId) return { ...p, isGoalie };
        if (isGoalie && p.isGoalie) return { ...p, isGoalie: false };
        return p;
      });
    
    setAvailablePlayers(goalieUpdate);
    cacheManager.updateMasterRosterCache(goalieUpdate);
    
    try {
      const updated = await setGoalieStatus(playerId, isGoalie);
      if (!updated) {
        // Rollback optimistic updates
        setAvailablePlayers(prev);
        cacheManager.updateMasterRosterCache(() => prev);
        setRosterError('Failed to set goalie status');
      } else {
        setRosterError(null);
        // Optimistic update was correct, no additional action needed
      }
    } catch {
      // Rollback optimistic updates
      setAvailablePlayers(prev);
      cacheManager.updateMasterRosterCache(() => prev);
      setRosterError('Failed to set goalie status');
    } finally {
      setIsRosterUpdating(false);
    }
  };

  return {
    availablePlayers,
    setAvailablePlayers,
    highlightRosterButton,
    setHighlightRosterButton,
    showRosterPrompt,
    setShowRosterPrompt,
    rosterError,
    setRosterError,
    isRosterUpdating,
    playersForCurrentGame,
    handleAddPlayer,
    handleUpdatePlayer,
    handleRemovePlayer,
    handleSetGoalieStatus,
  };
};

export type UseRosterReturn = ReturnType<typeof useRoster>;

