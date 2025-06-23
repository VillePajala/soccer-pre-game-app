# Critical Testing Checklist Before Migration

## 🚨 MUST COMPLETE BEFORE MIGRATION

### 1. Data Import/Export Testing
- [ ] **Export Single Game**
  - [ ] Export as JSON - verify file downloads
  - [ ] Export as CSV - verify formatting is correct
  - [ ] Open exported files and check data integrity
  
- [ ] **Export All Games**
  - [ ] Create at least 3 test games with different settings
  - [ ] Export all as JSON
  - [ ] Export all as CSV
  - [ ] Verify all games are included
  
- [ ] **Import Games**
  - [ ] Clear all data (Hard Reset)
  - [ ] Import previously exported JSON
  - [ ] Verify all games load correctly
  - [ ] Test importing duplicate game IDs (should skip)
  - [ ] Test importing malformed JSON (should show error)

### 2. Data Persistence & Recovery
- [ ] **Hard Reset Function**
  - [ ] Perform hard reset
  - [ ] Verify ALL data is cleared (games, roster, seasons, tournaments)
  - [ ] Verify app returns to initial setup state
  
- [ ] **Initial Setup Flow**
  - [ ] After hard reset, verify setup modal appears
  - [ ] Complete setup with all fields
  - [ ] Verify game starts with correct settings
  
- [ ] **Auto-Save Reliability**
  - [ ] Make changes to a game
  - [ ] Close browser without saving
  - [ ] Reopen and verify changes persisted

### 3. Core State Management
- [ ] **Undo/Redo System**
  - [ ] Add player to field → Undo → Redo
  - [ ] Log a goal → Undo → Redo
  - [ ] Change team name → Undo → Redo
  - [ ] Test undo after saving game
  
- [ ] **Game State Integrity**
  - [ ] Save game with complex state (players on field, goals, drawings)
  - [ ] Load different game
  - [ ] Load original game back
  - [ ] Verify ALL state restored correctly

### 4. Error Handling
- [ ] **LocalStorage Errors**
  - [ ] Fill localStorage to near capacity
  - [ ] Try to save a game (should show error)
  - [ ] Clear some space and retry
  
- [ ] **Corrupted Data Recovery**
  - [ ] Manually corrupt localStorage data
  - [ ] Load app and verify graceful handling
  - [ ] App should still be usable

### 5. Critical User Flows
- [ ] **Complete Game Flow**
  - [ ] Start new game with setup
  - [ ] Add players to field
  - [ ] Start timer
  - [ ] Log 2-3 goals
  - [ ] Complete first period
  - [ ] Save game
  - [ ] Export game
  - [ ] Clear data
  - [ ] Import game
  - [ ] Verify everything restored

## 🔍 Quick Smoke Tests (5 minutes)

Run these after any code changes:

1. [ ] App loads without errors
2. [ ] Can drag player to field
3. [ ] Can start/stop timer
4. [ ] Can log a goal
5. [ ] Can save game
6. [ ] Can load saved game
7. [ ] Undo/Redo works
8. [ ] All modals open/close properly

## 📝 Testing Notes Template

```
Date: ___________
Tester: ___________
Build/Version: ___________

Issues Found:
1. [SEVERITY: Critical/High/Medium/Low]
   Description: 
   Steps to Reproduce:
   Expected vs Actual:

2. [SEVERITY: ]
   Description:
   Steps to Reproduce:
   Expected vs Actual:

Overall Status: [ ] Ready for Migration / [ ] Issues Need Fixing
```

## ⚡ Quick Test Data Setup

```javascript
// Paste this in browser console to quickly create test data
// (Only after verifying it's safe for your current state)

const testPlayers = [
  { name: "Test Player 1", jerseyNumber: "1" },
  { name: "Test Player 2", jerseyNumber: "2" },
  { name: "Test Goalie", jerseyNumber: "99", isGoalie: true }
];

const testGames = [
  { 
    teamName: "Test Team A", 
    opponentName: "Test Opponent A",
    homeScore: 2,
    awayScore: 1
  },
  { 
    teamName: "Test Team B", 
    opponentName: "Test Opponent B",
    homeScore: 0,
    awayScore: 3
  }
];

console.log("Test data templates ready. Manually create games with these values.");
``` 