# Player Stats Fix Summary

## Problem Summary
After importing localStorage data to Supabase, player statistics were missing or showing zeros in multiple views:
1. Tournament and season overall stats were missing
2. Current game player statistics didn't map to goal logs correctly
3. Individual player stats showed zeros despite players having goals/assists

## Root Cause
The issue was caused by players who scored goals/assists not being included in the `selectedPlayerIds` array. This typically happens when:
- Substitute players come on and score/assist
- Data migration doesn't properly maintain the selectedPlayerIds array
- Players are added to events after the initial roster selection

## Fixes Applied

### 1. GameStatsModal.tsx (lines 123-157)
**Issue**: Only counted stats for players in selectedPlayerIds
**Fix**: Added logic to include any player who has events (goals/assists) in the statsMap

```typescript
// If scorer is not in statsMap, try to add them from availablePlayers
if (!statsMap[event.scorerId]) {
  const player = availablePlayers.find(p => p.id === event.scorerId);
  if (player) {
    statsMap[event.scorerId] = { ...player, goals: 0, assists: 0, ... };
  }
}
```

### 2. playerStats.ts (lines 44-51)
**Issue**: calculatePlayerStats only processed games where player was in selectedPlayerIds
**Fix**: Changed logic to include players if they have any events OR are in selectedPlayerIds

```typescript
// Check if player has any events in this game (goals or assists)
const goals = game.gameEvents?.filter(e => e.type === 'goal' && e.scorerId === player.id).length || 0;
const assists = game.gameEvents?.filter(e => e.type === 'goal' && e.assisterId === player.id).length || 0;

// Include player if they were selected OR if they have any events
const playerParticipated = game.selectedPlayerIds?.includes(player.id) || goals > 0 || assists > 0;

if (playerParticipated) {
  // Process stats...
}
```

### 3. supabaseProvider.ts (lines 462-484)
**Issue**: Game events were being overwritten during data sync
**Fix**: Only fetch events from game_events table if game_data doesn't already contain events

## Debug Tools Created
1. `/debug-stats-detailed` - Identifies games where players have events but aren't in selectedPlayerIds
2. `/debug-player-stats` - Shows calculated stats for all players with the fixes applied

## Expected Results
With these fixes:
- Tournament and season stats will now show correctly for all players who participated
- Current game stats will display all players who scored/assisted, even substitutes
- Individual player stats will show accurate goal/assist totals
- The app will handle both legacy localStorage data and new Supabase data correctly

## Next Steps
1. Test the fixes by viewing player stats in the app
2. Check that tournament and season aggregations are correct
3. Verify current game stats show all scorers/assisters
4. Consider updating data migration to ensure selectedPlayerIds includes all participating players