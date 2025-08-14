## Goalie Toggle Flicker and Formation Revert

### Overview
There are two symptoms observed when interacting with goalie selection and formation placement:

- Flicker when toggling a goalie: the goalie disc flashes or there is a visible “pop”.
- Formation reverts after a specific sequence: delete all players → place all players → toggle a goalie causes discs to jump back to a previous formation.

This document explains the root causes in the current code, shows exact locations, and proposes clean fixes with trade‑offs.

### Current status (verified)
As of this investigation, the behaviors below are still in code and explain the symptoms:

1) Two‑phase goalie toggle that causes two rapid writes
- Path used by UI: `usePlayerRosterManager.handleToggleGoalieForModal → useRoster.handleSetGoalieStatus`.
- `useRoster.handleSetGoalieStatus` performs two writes:
  - First, it updates `playersOnField` via the `onFieldPlayersUpdate` callback (optimistic UI update).
  - Then, after a 10ms delay, it updates `availablePlayers` (roster) and persists to storage.
- The second write triggers the roster→field synchronization effect, causing a second `playersOnField` update and therefore a second repaint → flicker/pop.

2) Roster→field sync effect has a “last non‑empty snapshot” fallback and syncs goalie flag
- In `HomePage.tsx`, an effect runs on `availablePlayers` changes, debounced with `setTimeout(0)`.
- Inside the updater, if it sees `prevPlayersOnField` empty, it restores a “last non‑empty” copy kept in a ref.
- It also writes back non‑positional fields from roster to field, including `isGoalie`.
- After delete-all → place-all → toggle goalie, this effect can restore an older formation if the last‑non‑empty snapshot ref has not yet been updated with the new formation. Even when it doesn’t restore, it still writes `playersOnField` again (second repaint) → flicker.

### Code references

1) Two‑phase goalie toggle (field first, then roster after 10ms), which triggers the sync effect:

```156:199:src/hooks/useRoster.ts
  const handleSetGoalieStatus = async (playerId: string, isGoalie: boolean) => {
    ...
    // FIRST: update field players immediately via onFieldPlayersUpdate
    if (onFieldPlayersUpdate) {
      onFieldPlayersUpdate((currentFieldPlayers) =>
        currentFieldPlayers.map((fieldPlayer) => {
          if (fieldPlayer.id === playerId) return { ...fieldPlayer, isGoalie };
          if (isGoalie && fieldPlayer.isGoalie) return { ...fieldPlayer, isGoalie: false };
          return fieldPlayer;
        })
      );
    }
    // Delay before SECOND: update roster and persist
    await new Promise(resolve => setTimeout(resolve, 10));
    const updatedPlayers = goalieUpdate(availablePlayers);
    setAvailablePlayers(updatedPlayers);
    ...
  };
```

2) Roster→field sync effect with “last non‑empty” fallback and `isGoalie` writeback:

```818:877:src/components/HomePage.tsx
  useEffect(() => {
    if (!availablePlayers || availablePlayers.length === 0) return;
    if (rosterFieldSyncTimerRef.current) {
      window.clearTimeout(rosterFieldSyncTimerRef.current);
      rosterFieldSyncTimerRef.current = null;
    }
    rosterFieldSyncTimerRef.current = window.setTimeout(() => {
      setPlayersOnField(prevPlayersOnField => {
        // Fallback: if field becomes empty, restore last non‑empty snapshot
        if (!prevPlayersOnField || prevPlayersOnField.length === 0) {
          const fallback = lastNonEmptyPlayersOnFieldRef.current;
          return (fallback && fallback.length > 0) ? fallback : prevPlayersOnField;
        }
        const allPresent = prevPlayersOnField.every(fp => availablePlayers.some(ap => ap.id === fp.id));
        if (!allPresent) return prevPlayersOnField;
        let didChange = false;
        const nextPlayersOnField = prevPlayersOnField.map(fieldPlayer => {
          const rosterPlayer = availablePlayers.find(ap => ap.id === fieldPlayer.id);
          if (!rosterPlayer) return fieldPlayer;
          const needsUpdate = (
            fieldPlayer.name !== rosterPlayer.name ||
            fieldPlayer.jerseyNumber !== rosterPlayer.jerseyNumber ||
            fieldPlayer.isGoalie !== rosterPlayer.isGoalie ||
            fieldPlayer.nickname !== rosterPlayer.nickname ||
            fieldPlayer.notes !== rosterPlayer.notes ||
            (rosterPlayer.receivedFairPlayCard !== undefined && fieldPlayer.receivedFairPlayCard !== rosterPlayer.receivedFairPlayCard)
          );
          if (!needsUpdate) return fieldPlayer;
          didChange = true;
          return {
            ...fieldPlayer,
            name: rosterPlayer.name,
            jerseyNumber: rosterPlayer.jerseyNumber,
            isGoalie: rosterPlayer.isGoalie,
            nickname: rosterPlayer.nickname,
            notes: rosterPlayer.notes,
            receivedFairPlayCard: rosterPlayer.receivedFairPlayCard !== undefined ? rosterPlayer.receivedFairPlayCard : fieldPlayer.receivedFairPlayCard,
          };
        });
        return didChange ? nextPlayersOnField : prevPlayersOnField;
      });
    }, 0);
    return () => { /* clear timer */ };
  }, [availablePlayers]);
```

3) Place‑all logic (for context on structural changes):

```126:186:src/hooks/usePlayerFieldManager.ts
  const handlePlaceAllPlayers = useCallback(() => {
    const selectedButNotOnField = selectedPlayerIds.filter(
      id => !playersOnField.some(p => p.id === id),
    );
    if (selectedButNotOnField.length === 0) return;
    const playersToPlace = selectedButNotOnField
      .map(id => availablePlayers.find(p => p.id === id))
      .filter((p): p is Player => p !== undefined);
    const newFieldPlayers: Player[] = [...playersOnField];
    const goalieIndex = playersToPlace.findIndex(p => p.isGoalie);
    let goalie: Player | null = null;
    if (goalieIndex !== -1) {
      goalie = playersToPlace.splice(goalieIndex, 1)[0];
    }
    if (goalie) {
      newFieldPlayers.push({ ...goalie, relX: 0.5, relY: 0.95 });
    }
    const remainingCount = playersToPlace.length;
    const positions = generatePositions(remainingCount);
    playersToPlace.forEach((player, index) => {
      const pos = positions[index];
      const safeRelX = pos ? pos.relX : 0.5;
      const safeRelY = pos ? pos.relY : 0.5;
      newFieldPlayers.push({ ...player, relX: safeRelX, relY: safeRelY });
    });
    setPlayersOnField(newFieldPlayers);
    saveStateToHistory({ playersOnField: newFieldPlayers });
  }, [...]);
```

### Reproduction

1) Flicker
- Start a game with players on the field.
- Toggle a goalie from the player bar.
- Observe a brief flash/pop (two repaints) when the canvas re-renders.

2) Formation revert
- Delete all players from the field.
- Click “place all players on field”.
- Immediately toggle a goalie.
- Observe discs jump back to an older formation (restored from `lastNonEmptyPlayersOnFieldRef`).

### Root causes

- Dual writes on goalie toggle (field, then roster after delay) → triggers roster→field sync → second write to `playersOnField` → second repaint → flicker.
- Roster→field sync effect with fallback to last non‑empty formation and `isGoalie` propagation → can restore stale formation and also causes an extra repaint.

### Fix options

Option A: Single‑source‑of‑truth goalie toggle (preferred)
- Remove the 10ms delayed second write or make the roster update non‑observable by the field sync.
- Let the goalie toggle be authoritative for `playersOnField`. The roster→field sync should not modify `isGoalie`.
- Keep roster persistence, but do not emit additional UI writes that change field state.

Option B: Narrow the roster→field sync responsibilities
- Remove the “last non‑empty” fallback entirely. This fallback is the mechanism that restores an older formation in the delete‑all → place‑all → toggle sequence.
- Do not sync `isGoalie` from roster to field. Only sync stable, non‑visual metadata such as `name` and `jerseyNumber`.
- Additionally, gate the effect: if a structural change just happened (e.g., place‑all), skip any sync for one tick or until the formation snapshot ref is confirmed updated.

Option C: Structural change guards
- Add a formation version or a small guard flag that, when a structural operation (place‑all/reset) happens, prevents the roster→field sync from writing until a new, explicitly captured snapshot is available.

Option D: Minimal tactical change
- Keep current optimistic UI update for the toggle.
- Drop the 10ms delay and the second write to `availablePlayers`, or at least debounce it so the roster→field sync does not fire within the same frame window.

### Recommendation

- Implement A + B:
  - Eliminate the second, delayed write in `useRoster.handleSetGoalieStatus` that changes `availablePlayers` immediately after the field update; persist without emitting another observable write, or coalesce it with the first update so there is a single UI mutation.
  - In `HomePage` roster→field sync, remove the “last non‑empty” fallback and stop syncing `isGoalie`. Restrict the sync to non‑positional, non‑stateful metadata.

This restores “one logical action → one visual repaint”, prevents stale formation restoration, and keeps UI consistent.

### Acceptance criteria

- Toggling a goalie yields exactly one visual update; no flicker on desktop or mobile.
- After delete-all → place-all → toggle-goalie, discs keep the current formation and do not revert.
- No transient orange→purple flash on the field; the goalie stays orange consistently.

### Regression tests to run manually

- Toggle goalie for a player on the field; ensure only one render pop.
- Toggle goalie for a player off the field; then place all; ensure formation persists.
- Delete all; place all; toggle goalie; ensure formation persists.
- Start a new game; ensure previous game’s goalie state is not visually leaking.

### Notes

- A prior change moved more sync logic into `HomePage` to “stabilize” roster→field updates. The fallback to a last non‑empty snapshot is helpful to guard against accidental clears, but it’s unsafe when combined with structural operations and separate delayed writes. Removing that fallback (or guarding it with more context) is key to preventing formation restoration.


