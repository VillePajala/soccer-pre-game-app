# Backup Import Fix Summary

## Problem
When importing backup files from localStorage to Supabase, all player statistics were showing as zero. The root cause was that during import:

1. All entity IDs (players, seasons, tournaments, games) were cleared to let Supabase generate new UUIDs
2. This broke all relationships between games and players:
   - `selectedPlayerIds` in games referenced old player IDs that no longer existed
   - `scorerId` and `assisterId` in game events referenced old player IDs
   - `playersOnField` referenced old player IDs
   - Season/tournament `defaultRosterId` arrays referenced old player IDs

## Solution
Updated the import process to create ID mappings and update all references:

### Changes in `/src/app/import-backup/page.tsx`:

1. **Created ID mapping tables** during import:
   ```typescript
   const playerIdMap = new Map<string, string>();
   const seasonIdMap = new Map<string, string>();
   const tournamentIdMap = new Map<string, string>();
   ```

2. **Captured new IDs** after saving each entity:
   ```typescript
   const savedPlayer = await storageManager.savePlayer(playerToSave);
   if (oldId && savedPlayer.id) {
     playerIdMap.set(oldId, savedPlayer.id);
   }
   ```

3. **Updated all player references** in games:
   - `selectedPlayerIds` - mapped to new player IDs
   - `availablePlayers` - updated player IDs
   - `playersOnField` - updated player IDs
   - `gameEvents` - updated `scorerId` and `assisterId`

4. **Updated season/tournament references**:
   - Season `defaultRosterId` arrays - mapped to new player IDs
   - Tournament `defaultRosterId` arrays - mapped to new player IDs
   - Tournament `seasonId` - mapped to new season ID
   - Game `seasonId` and `tournamentId` - mapped to new IDs

## Verification Tools

1. **`/verify-id-mapping`** - New page to verify all IDs are properly mapped after import
2. **`/debug-player-stats`** - Shows calculated stats with the fixes applied
3. **`/debug-stats-detailed`** - Identifies specific ID mismatches

## Result
After importing with the fixed code:
- All player IDs in game data will reference valid players in the roster
- Player statistics will calculate correctly
- Tournament and season stats will display properly
- The app will work identically to how it did with localStorage

## Usage
1. Go to `/import-backup` when signed in
2. Select your backup JSON file
3. Confirm to replace all data
4. The import will now properly map all IDs
5. Visit `/verify-id-mapping` to confirm all relationships are valid
6. Player statistics should now work correctly!