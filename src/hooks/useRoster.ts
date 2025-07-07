import { useState, useMemo } from 'react';
import type { Player } from '@/types';
import { addPlayer, updatePlayer, removePlayer, setGoalieStatus } from '@/utils/masterRosterManager';

interface UseRosterArgs {
  initialPlayers: Player[];
  selectedPlayerIds: string[];
}

export const useRoster = ({ initialPlayers, selectedPlayerIds }: UseRosterArgs) => {
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>(initialPlayers);
  const [highlightRosterButton, setHighlightRosterButton] = useState(false);
  const [showRosterPrompt, setShowRosterPrompt] = useState(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  const playersForCurrentGame = useMemo(
    () => availablePlayers.filter((p) => selectedPlayerIds.includes(p.id)),
    [availablePlayers, selectedPlayerIds]
  );

  const handleAddPlayer = async (data: Omit<Player, 'id' | 'isGoalie' | 'receivedFairPlayCard'>) => {
    const prev = [...availablePlayers];
    const temp: Player = { id: `temp-${Date.now()}`, isGoalie: false, receivedFairPlayCard: false, ...data };
    setAvailablePlayers([...availablePlayers, temp]);
    try {
      const saved = await addPlayer(data);
      if (saved) {
        setAvailablePlayers((players) => players.map((p) => (p.id === temp.id ? saved : p)));
        setRosterError(null);
      } else {
        setAvailablePlayers(prev);
        setRosterError('Failed to add player');
      }
    } catch (e) {
      setAvailablePlayers(prev);
      setRosterError('Failed to add player');
    }
  };

  const handleUpdatePlayer = async (playerId: string, updates: Partial<Omit<Player, 'id'>>) => {
    const prev = [...availablePlayers];
    setAvailablePlayers((ps) => ps.map((p) => (p.id === playerId ? { ...p, ...updates } : p)));
    try {
      const updated = await updatePlayer(playerId, updates);
      if (updated) {
        setAvailablePlayers((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
        setRosterError(null);
      } else {
        setAvailablePlayers(prev);
        setRosterError('Failed to update player');
      }
    } catch (e) {
      setAvailablePlayers(prev);
      setRosterError('Failed to update player');
    }
  };

  const handleRemovePlayer = async (playerId: string) => {
    const prev = [...availablePlayers];
    setAvailablePlayers((ps) => ps.filter((p) => p.id !== playerId));
    try {
      const success = await removePlayer(playerId);
      if (!success) {
        setAvailablePlayers(prev);
        setRosterError('Failed to remove player');
      } else {
        setRosterError(null);
      }
    } catch (e) {
      setAvailablePlayers(prev);
      setRosterError('Failed to remove player');
    }
  };

  const handleSetGoalieStatus = async (playerId: string, isGoalie: boolean) => {
    const prev = [...availablePlayers];
    setAvailablePlayers((ps) =>
      ps.map((p) => {
        if (p.id === playerId) return { ...p, isGoalie };
        if (isGoalie && p.isGoalie) return { ...p, isGoalie: false };
        return p;
      })
    );
    try {
      const updated = await setGoalieStatus(playerId, isGoalie);
      if (!updated) {
        setAvailablePlayers(prev);
        setRosterError('Failed to set goalie status');
      } else {
        setRosterError(null);
      }
    } catch (e) {
      setAvailablePlayers(prev);
      setRosterError('Failed to set goalie status');
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
    playersForCurrentGame,
    handleAddPlayer,
    handleUpdatePlayer,
    handleRemovePlayer,
    handleSetGoalieStatus,
  };
};

export type UseRosterReturn = ReturnType<typeof useRoster>;

