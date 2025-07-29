# Manual Testing Plan for Soccer Pre-Game App with Supabase Integration

## Prerequisites
1. Ensure you have a Supabase account and valid credentials in `.env.local`
2. Clear your browser's localStorage to start fresh
3. Open browser Developer Tools to monitor console logs and network requests

---

## Phase 1: Authentication Testing

### 1.1 Initial App Load
- [x] Navigate to the app
- [x] Verify the app loads without errors
- [x] Check console for any authentication errors
- [x] Verify you see the authentication button in the UI

### 1.2 Sign Up Flow
- [ ] Click on the Auth/Sign In button
- [ ] Switch to "Sign Up" mode
- [ ] Enter a new email and password
- [ ] Submit the form
- [ ] Check email for verification link (if email verification is enabled)
- [ ] Verify no errors in console
- [ ] Check Supabase dashboard to confirm user was created

### 1.3 Sign In Flow
- [ ] Sign out if already logged in
- [ ] Click Auth/Sign In button
- [ ] Enter your credentials
- [ ] Submit the form
- [ ] Verify successful login (UI should update)
- [ ] Check console for "Auth state changed" log
- [ ] Verify user session persists on page refresh

### 1.4 Password Reset Flow
- [ ] Click "Forgot Password" link
- [ ] Enter your email
- [ ] Submit the form
- [ ] Check email for reset link
- [ ] Click the reset link
- [ ] Enter new password
- [ ] Verify you can log in with new password

---

## Phase 2: Player Management Testing

### 2.1 Create Players
- [x] Navigate to Roster Settings
- [x] Click "Add Player"
- [x] Fill in player details:
  - Name: "Test Player 1"
  - Jersey Number: "10"
  - Position: Not Goalie
  - Notes: "Test notes"
- [x] Save the player
- [x] Verify player appears in roster
- [x] Check Supabase dashboard → `players` table for the new entry
- [x] Repeat for 2-3 more players with different attributes:
  - One goalie
  - One with special characters in name
  - One with no jersey number

### 2.2 Edit Players
- [x] Select a player from roster
- [x] Click Edit
- [x] Change jersey number and notes
- [x] Save changes
- [x] Verify changes persist
- [x] Refresh page and verify changes are still there
- [x] Check Supabase dashboard for updated data

### 2.3 Delete Players
- [x] Select a player
- [x] Delete the player
- [x] Confirm deletion
- [x] Verify player is removed from roster
- [x] Check Supabase dashboard to confirm deletion

---

## Phase 3: Season Management Testing

### 3.1 Create Season
- [ ] Navigate to Season Management
- [ ] Create new season with:
  - Name: "Spring 2024"
  - Location: "City Sports Complex"
  - Start Date: Today
  - End Date: 3 months from now
  - Period Count: 2
  - Period Duration: 45
  - Age Group: "U12"
  - Color: Blue
  - Notes: "Test season"
- [ ] Save the season
- [ ] Verify it appears in season list
- [ ] Check Supabase dashboard → `seasons` table

### 3.2 Edit Season
- [ ] Edit the season
- [ ] Change location and add game dates
- [ ] Save changes
- [ ] Verify changes persist after refresh
- [ ] Check Supabase for updates

### 3.3 Set Default Roster
- [ ] Select the season
- [ ] Set default roster (select 2-3 players)
- [ ] Save
- [ ] Verify roster is saved with season

---

## Phase 4: Tournament Management Testing

### 4.1 Create Tournament
- [ ] Navigate to Tournament Management
- [ ] Create new tournament:
  - Name: "Summer Cup 2024"
  - Link to created season
  - Location: "Tournament Center"
  - Level: "Regional"
  - Dates: Next week
  - Other details as needed
- [ ] Save tournament
- [ ] Verify in tournament list
- [ ] Check Supabase dashboard → `tournaments` table

### 4.2 Edit Tournament
- [ ] Edit tournament details
- [ ] Change level and dates
- [ ] Save changes
- [ ] Verify persistence

---

## Phase 5: Game Management Testing

### 5.1 Create New Game
- [ ] Start a new game
- [ ] Fill in game setup:
  - Home Team: "Our Team"
  - Away Team: "Opponents"
  - Home/Away: Home
  - Date: Today
  - Location: "Home Field"
  - Time: "14:00"
  - Link to season/tournament
- [ ] Select roster (3-4 players)
- [ ] Start the game
- [ ] Verify game is created
- [ ] Check console for game ID (should be UUID from Supabase)

### 5.2 Play Game Session
- [ ] Drag players onto field
- [ ] Start timer
- [ ] Add some scores (goals/assists)
- [ ] Pause timer
- [ ] Make substitutions
- [ ] Add game notes
- [ ] Let timer run for 30 seconds
- [ ] End period

### 5.3 Save Game
- [ ] Save the current game
- [ ] Verify save confirmation
- [ ] Check Supabase dashboard → `games` table
- [ ] Verify game_data JSONB column contains full game state

### 5.4 Load Saved Game
- [ ] Start a new game (different one)
- [ ] Go to saved games
- [ ] Load the previously saved game
- [ ] Verify all data is restored:
  - Player positions
  - Scores
  - Timer state
  - Game notes

---

## Phase 6: App Settings Testing

### 6.1 Update Settings
- [ ] Go to app settings
- [ ] Change:
  - Language (if applicable)
  - Default team name
  - Any other available settings
- [ ] Save settings
- [ ] Refresh page
- [ ] Verify settings persist
- [ ] Check Supabase → `app_settings` table

### 6.2 Current Game Persistence
- [ ] Note the current game ID in console
- [ ] Refresh the page
- [ ] Verify the same game is loaded
- [ ] Check that currentGameId is stored correctly in Supabase

---

## Phase 7: Data Migration Testing (if applicable)

### 7.1 Check Migration Status
- [ ] If you had local data before, check if migration prompt appears
- [ ] View migration status
- [ ] If migration is available, proceed with it
- [ ] Monitor console for migration progress

---

## Phase 8: Offline/Online Behavior Testing

### 8.1 Online to Offline
- [ ] While online, create a new player
- [ ] Verify it saves to Supabase
- [ ] Disconnect internet/Go offline
- [ ] Try to create another player
- [ ] Verify app falls back to localStorage
- [ ] Check for appropriate error handling

### 8.2 Offline to Online
- [ ] While offline, make some changes
- [ ] Reconnect internet
- [ ] Refresh page
- [ ] Verify Supabase data is loaded (not local changes)

---

## Phase 9: Error Handling Testing

### 9.1 Invalid Data
- [ ] Try to create player with empty name
- [ ] Try to create duplicate entities
- [ ] Verify appropriate error messages

### 9.2 Network Errors
- [ ] Open Network tab in DevTools
- [ ] Throttle network to offline
- [ ] Try various operations
- [ ] Verify graceful fallback to localStorage

---

## Phase 10: Performance Testing

### 10.1 Large Dataset
- [ ] Create 20+ players
- [ ] Create multiple seasons/tournaments
- [ ] Save several games
- [ ] Verify app remains responsive
- [ ] Check Supabase query performance

### 10.2 Concurrent Updates
- [ ] Open app in two browser tabs
- [ ] Make changes in one tab
- [ ] Refresh other tab
- [ ] Verify data consistency

---

## Expected Console Logs to Verify

During testing, you should see logs like:
```
[SupabaseProvider] savePlayer called with: {player object}
[SupabaseProvider] Player inserted successfully: {response}
[SupabaseProvider] saveSeason called with: {season object}
[SupabaseProvider] saveGame called with: {game object}
```

## Common Issues to Check

1. **Column name mismatches**: All fixed (snake_case in DB)
2. **UUID handling**: Non-UUID game IDs stored in JSONB
3. **Missing columns**: Migration 002 added all required columns
4. **Auth state**: Should persist across refreshes
5. **Data transforms**: Should handle all data types correctly

## Final Verification

- [ ] All CRUD operations work for all entities
- [ ] Data persists in Supabase (check dashboard)
- [ ] No console errors during normal operation
- [ ] App functions when switching between online/offline
- [ ] Authentication flow is smooth
- [ ] Game state saves and loads correctly

## Troubleshooting

If you encounter any issues during testing, note:
1. The exact step where it failed
2. Any error messages in the console
3. The network request details (if applicable)
4. The state of data in Supabase dashboard

### Known Issues and Fixes Applied

1. **Player jersey_number column**: Fixed from camelCase to snake_case
2. **Game ID handling**: Non-UUID IDs now stored in JSONB game_data
3. **App settings currentGameId**: Non-UUID values stored in JSONB settings field
4. **Missing database columns**: Added via migration 002
5. **Tournament seasonId**: Added to interface and transforms
6. **Empty ID handling**: Transforms now exclude empty IDs for new records
