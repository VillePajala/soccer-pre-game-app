import { useState, useMemo, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Player } from '@/types';
import { addPlayer, updatePlayer, removePlayer, setGoalieStatus } from '@/utils/masterRosterManager';
import { useCacheManager } from '@/utils/cacheUtils';

interface UseRosterArgs {
  initialPlayers: Player[];
  selectedPlayerIds: string[];
  onPlayerIdUpdated?: (tempId: string, newId: string) => void;
  onFieldPlayersUpdate?: (updateFn: (players: Player[]) => Player[]) => void;
}

export const useRoster = ({ initialPlayers, selectedPlayerIds, onPlayerIdUpdated, onFieldPlayersUpdate }: UseRosterArgs) => {
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
    console.log('[useRoster] handleSetGoalieStatus called:', { playerId, isGoalie });
    const prev = [...availablePlayers];
    setIsRosterUpdating(true);
    
    // Optimistic updates
    const goalieUpdate = (players: Player[]) =>
      players.map((p) => {
        if (p.id === playerId) return { ...p, isGoalie };
        if (isGoalie && p.isGoalie) return { ...p, isGoalie: false };
        return p;
      });
    
    console.log('[useRoster] Applying optimistic update');
    
    // Calculate the updated players once
    const updatedPlayers = goalieUpdate(availablePlayers);
    
    setAvailablePlayers(updatedPlayers);
    cacheManager.updateMasterRosterCache(() => updatedPlayers);
    
    // CRITICAL FIX: Also update players on field to keep them synchronized
    // Pass the updater function that applies the same logic to field players
    if (onFieldPlayersUpdate) {
      console.log('[useRoster] Updating field players with goalie status');
      onFieldPlayersUpdate(goalieUpdate);
    }
    
    try {
      console.log('[useRoster] Calling setGoalieStatus storage operation');
      const updated = await setGoalieStatus(playerId, isGoalie);
      console.log('[useRoster] setGoalieStatus result:', updated);
      if (!updated) {
        console.log('[useRoster] Storage operation failed, rolling back');
        // Rollback optimistic updates
        setAvailablePlayers(prev);
        cacheManager.updateMasterRosterCache(() => prev);
        
        // CRITICAL FIX: Also rollback field players to previous state
        if (onFieldPlayersUpdate) {
          console.log('[useRoster] Rolling back field players');
          onFieldPlayersUpdate((currentFieldPlayers) => {
            // Rollback: restore previous goalie states for field players
            return currentFieldPlayers.map(fieldPlayer => {
              const prevPlayer = prev.find(p => p.id === fieldPlayer.id);
              if (prevPlayer) {
                return { ...fieldPlayer, isGoalie: prevPlayer.isGoalie };
              }
              return fieldPlayer;
            });
          });
        }
        setRosterError('Failed to set goalie status');
      } else {
        console.log('[useRoster] Storage operation succeeded');
        setRosterError(null);
        // Optimistic update was correct, no additional action needed
      }
    } catch (error) {
      console.log('[useRoster] Storage operation threw error:', error);
      // Rollback optimistic updates
      setAvailablePlayers(prev);
      cacheManager.updateMasterRosterCache(() => prev);
      setRosterError('Failed to set goalie status');
    } finally {
      setIsRosterUpdating(false);
      console.log('[useRoster] handleSetGoalieStatus completed');
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

