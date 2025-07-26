# Statistics Modal Fix Summary

## Problem
After migrating from localStorage to Supabase, the statistics modal was showing no data. This was because:
1. During import, players were assigned new UUID IDs by Supabase
2. Game events (goals, assists) still referenced the old player IDs
3. The statistics calculation couldn't match players with their events

## Solution Implemented

### 1. Enhanced Import Process
Modified both `supabaseBackupImport.ts` and `supabaseCleanImport.ts` to:
- Track old player ID → new player ID mappings during import
- Update all game events to use the new player IDs
- Update selectedPlayerIds, availablePlayers, and playersOnField in games

### 2. Created Fix Utility
Added `fixGameEventPlayerIds.ts` that can:
- Fix existing games that have mismatched player IDs
- Map players by name to update their IDs in game events
- Can be run on demand to repair existing data

### 3. Debug Tools
Created `/debug-player-ids` page that:
- Shows current players and their IDs
- Identifies game events with invalid player IDs
- Provides a button to fix the issues

## How to Use

### For New Imports
The fix is automatic - player IDs will be properly mapped during import.

### For Existing Data with Issues
1. Navigate to `/debug-player-ids`
2. Check if there are any player ID issues
3. Click "Fix Player IDs" to repair the data

## Technical Details
- Player IDs are mapped by matching player names
- Game data is stored in the `game_data` JSONB field in Supabase
- The fix updates scorerId and assisterId in all game events
- Also updates player references in selectedPlayerIds, availablePlayers, and playersOnField