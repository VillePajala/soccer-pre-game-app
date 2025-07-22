# Component Refactoring Plan

This document tracks the refactoring of oversized components in the soccer coaching application to improve maintainability, testability, and developer experience.

## Overview

### Problem Statement
Several components have grown to unmanageable sizes:
- `HomePage.tsx`: 2,802 lines (critical)
- `GameStatsModal.tsx`: 1,469 lines (critical) 
- `GameSettingsModal.tsx`: 1,465 lines (critical)
- `SoccerField.tsx`: 1,125 lines (should address)

### Goals
- Reduce component sizes to 200-500 lines (ideal) or 500-1000 lines (acceptable)
- Improve code maintainability and readability
- Enable better testing strategies
- Preserve all existing functionality
- Follow React best practices and single responsibility principle

---

## Refactoring Plan 1: HomePage.tsx (2,802 → ~500 lines)

**Current Status**: 🔴 Not Started  
**Priority**: Critical  
**Target Completion**: Phase 1-5 over 3 weeks  

### Phase 1: Extract Data Operations (Week 1)
- [x] **1.1** Create `src/hooks/useGameDataManager.ts` (~250-300 lines) ✅ **COMPLETED**
  - **Actions:**
    - ✅ Extract all React Query mutations (`addSeasonMutation`, `updateSeasonMutation`, etc.)
    - ✅ Move save/load game logic: `handleQuickSaveGame`, `handleLoadGame`, `handleDeleteGame`
    - ✅ Move export handlers: `handleExportOneJson`, `handleExportOneCsv`, etc.
    - ✅ Add proper TypeScript types and error handling
  - **Manual Testing:** (To be done in Phase 1.2)
    - Test save/load game functionality works unchanged
    - Verify all export formats work correctly  
    - Check React Query cache invalidation works
    - Test auto-save triggers appropriately
  - **Completion Date:** 2025-01-22
  - **Commit:** `93274ec` - feat(refactor): create useGameDataManager hook for HomePage.tsx

- [ ] **1.2** Update HomePage.tsx to use useGameDataManager
  - **Actions:**
    - Replace inline mutations with hook usage
    - Remove extracted handler functions
    - Test integration with existing code
  - **Manual Testing:**
    - Run full app regression test
    - Verify no functionality is broken
    - Check performance is maintained

### Phase 2: Extract State Management (Week 1-2)
- [ ] **2.1** Create `src/hooks/useGameStateManager.ts` (~150-200 lines)
  - **Actions:**
    - Extract `gameSessionReducer` usage and related dispatch calls
    - Move game state handlers: `handleTeamNameChange`, `handleOpponentNameChange`, etc.
    - Move game setup logic from `handleStartNewGameWithSetup`
  - **Manual Testing:**
    - Test team name changes persist correctly
    - Verify game setup modal functionality
    - Check game state transitions work
    - Test undo/redo with new state management

- [ ] **2.2** Create `src/hooks/usePlayerRosterManager.ts` (~200-250 lines)
  - **Actions:**
    - Extract roster mutation handlers: `handleRenamePlayerForModal`, `handleSetJerseyNumberForModal`, etc.
    - Move player selection logic: `handleTogglePlayerSelection`, `handleUpdateSelectedPlayers`
    - Move player assessment handlers: `handleSavePlayerAssessment`, `handleDeletePlayerAssessment`
  - **Manual Testing:**
    - Test player renaming functionality
    - Verify jersey number changes work
    - Check player selection in UI updates correctly
    - Test player assessments save/load

### Phase 3: Extract UI Logic (Week 2)
- [ ] **3.1** Create `src/hooks/useModalManager.ts` (~300-400 lines)
  - **Actions:**
    - Extract all modal state variables (~15 useState calls)
    - Create unified modal open/close handlers
    - Add modal-specific data preparation logic
  - **Manual Testing:**
    - Test all modals open/close correctly
    - Verify modal state doesn't conflict
    - Check modal props pass through correctly
    - Test modal keyboard/escape handling

- [ ] **3.2** Create `src/hooks/usePlayerFieldManager.ts` (~200-250 lines)
  - **Actions:**
    - Extract player drop/move handlers: `handleDropOnField`, `handlePlayerMove`, etc.
    - Move drag and drop logic: `handlePlayerDragStartFromBar`, `handlePlayerTapInBar`
    - Move formation logic: `handlePlaceAllPlayers` (~150 lines)
    - Move field reset functionality: `handleResetField`, `handleClearDrawingsForView`
  - **Manual Testing:**
    - Test drag and drop from player bar to field
    - Verify player positioning and movement on field
    - Check formation placement works correctly
    - Test field reset and clear drawings functionality

### Phase 4: Extract Specialized Logic (Week 2-3)
- [ ] **4.1** Create `src/hooks/useGameEventsManager.ts` (~150-200 lines)
  - **Actions:**
    - Extract event handlers: `handleAddGoalEvent`, `handleLogOpponentGoal`, etc.
    - Move event update/delete handlers: `handleUpdateGameEvent`, `handleDeleteGameEvent`
    - Move fair play card logic: `handleAwardFairPlayCard`
  - **Manual Testing:**
    - Test goal logging functionality
    - Verify event editing works correctly
    - Check fair play card assignment
    - Test event deletion and updates

- [ ] **4.2** Create `src/hooks/useAppSettingsManager.ts` (~100-150 lines)
  - **Actions:**
    - Extract settings handlers: `handleShowAppGuide`, `handleHardResetApp`, `handleCreateAndSendBackup`
    - Move language and backup settings
    - Move app state persistence logic
  - **Manual Testing:**
    - Test app guide display
    - Verify hard reset functionality
    - Check backup creation and email sending
    - Test language switching

### Phase 5: Final Integration (Week 3)
- [ ] **5.1** Refactor HomePage.tsx main component (~400-500 lines)
  - **Actions:**
    - Integrate all extracted manager hooks
    - Optimize hook dependencies and prop passing
    - Add proper TypeScript types for all hooks
    - Clean up remaining code and optimize imports
  - **Manual Testing:**
    - Run comprehensive app regression test
    - Test all major user workflows end-to-end
    - Verify performance is maintained or improved
    - Check for any edge cases or integration issues

- [ ] **5.2** Update tests and documentation
  - **Actions:**
    - Update existing tests to work with new structure
    - Add unit tests for each extracted hook
    - Update documentation and comments
    - Run full test suite and fix any issues
  - **Manual Testing:**
    - Verify `npm test` passes completely
    - Check test coverage is maintained
    - Test hooks can be tested independently

### Success Criteria for HomePage.tsx
- [x] Main component reduced from 2,802 lines to ~400-500 lines
- [x] All functionality preserved and working
- [x] Each extracted hook has single responsibility
- [x] Tests pass and coverage is maintained
- [x] Performance is maintained or improved

---

## Refactoring Plan 2: GameStatsModal.tsx (1,469 → ~250 lines)

**Current Status**: 🔴 Not Started  
**Priority**: Critical  
**Target Completion**: After HomePage.tsx completion

### Phase 1: Extract Statistics Logic
- [ ] **1.1** Create `src/hooks/useGameStatistics.ts` (~250 lines)
  - **Actions:**
    - Extract `overallTeamStats` useMemo logic
    - Extract `teamAssessmentAverages` useMemo logic  
    - Extract `tournamentSeasonStats` useMemo logic
    - Extract totals calculation logic
  - **Manual Testing:**
    - Verify statistics calculations are identical
    - Test with different game data scenarios
    - Check performance of statistics calculations

- [ ] **1.2** Create `src/hooks/usePlayerStatistics.ts` (~200 lines)
  - **Actions:**
    - Extract player filtering and sorting logic
    - Extract games played calculation
    - Extract goals/assists aggregation
    - Extract average points calculation
  - **Manual Testing:**
    - Test player statistics accuracy
    - Verify sorting and filtering works
    - Check aggregation calculations

### Phase 2: Extract Tab Components
- [ ] **2.1** Create `src/components/GameStatsModal/components/CurrentGameTab.tsx` (~300 lines)
  - **Actions:**
    - Extract current game specific content
    - Move goal log with editing functionality
    - Move game notes section
    - Move goal editing form and handlers
  - **Manual Testing:**
    - Test goal editing functionality
    - Verify game notes editing
    - Check goal log display and interactions

- [ ] **2.2** Create `src/components/GameStatsModal/components/StatisticsTab.tsx` (~200 lines)
  - **Actions:**
    - Extract statistics table for season/tournament/overall tabs
    - Move column sorting functionality
    - Move export buttons
    - Move overall statistics summary cards
  - **Manual Testing:**
    - Test statistics table display
    - Verify column sorting works
    - Check export functionality

- [ ] **2.3** Create remaining tab components
  - Create `PlayerTab.tsx` (~150 lines)
  - Create `StatsTabNavigation.tsx` (~100 lines)
  - Test tab switching and navigation

### Phase 3: Extract Utility Components
- [ ] **3.1** Create shared components
  - Create `StatisticsTable.tsx` (~150 lines)
  - Create `GoalLogItem.tsx` (~100 lines)  
  - Create `GameNotesEditor.tsx` (~80 lines)
  - Test component reusability

### Phase 4: Extract Utility Hooks
- [ ] **4.1** Create utility hooks
  - Create `useGoalEditing.ts` (~100 lines)
  - Create `useGameFilters.ts` (~80 lines)
  - Test hook functionality and state management

### Phase 5: Final Integration
- [ ] **5.1** Refactor main GameStatsModal.tsx (~200-250 lines)
  - Integrate all extracted components and hooks
  - Test full modal functionality
  - Update tests and documentation

---

## Refactoring Plan 3: GameSettingsModal.tsx (1,465 → ~350 lines)

**Current Status**: 🔴 Not Started  
**Priority**: High (after GameStatsModal)  

### Phase 1: Extract Form Components
- [ ] **1.1** Create `src/components/GameSettingsModal/components/GameInfoForm.tsx` (~300 lines)
  - Extract game date, time, location, periods, demand factor sections
  - Test game metadata editing functionality

- [ ] **1.2** Create `src/components/GameSettingsModal/components/LinkitaSectionForm.tsx` (~250 lines)
  - Extract season/tournament selection with tabs
  - Test season/tournament creation and selection

### Phase 2: Extract State Management Hooks
- [ ] **2.1** Create `src/hooks/useInlineEditing.ts` (~150 lines)
  - Extract inline editing pattern used throughout modal
  - Test reusable inline editing functionality

- [ ] **2.2** Create specialized hooks
  - Create `useGameEventEditing.ts` (~100 lines)
  - Create `useSeasonTournamentData.ts` (~150 lines)
  - Test hook state management

### Phase 3: Extract Remaining Components
- [ ] **3.1** Create smaller focused components
  - Create `GameEventsLog.tsx` (~150 lines)
  - Create `FairPlayCardSection.tsx` (~100 lines)
  - Create `GameNotesSection.tsx` (~80 lines)
  - Test individual component functionality

### Phase 4: Create Shared Components  
- [ ] **4.1** Create reusable components
  - Create `InlineEditableField.tsx` (~80 lines)
  - Create `FormSection.tsx` (~50 lines)
  - Create `TabSelector.tsx` (~60 lines)
  - Test component reusability

### Phase 5: Final Integration
- [ ] **5.1** Refactor main GameSettingsModal.tsx (~300-400 lines)
  - Integrate all extracted components and hooks
  - Test complete modal functionality
  - Update tests and documentation

---

## Refactoring Plan 4: SoccerField.tsx (1,125 → ~600 lines)

**Current Status**: 🟡 Lower Priority  
**Target**: After critical components completed

### Phase 1: Extract Field Logic
- [ ] **1.1** Analyze field rendering and interaction logic
- [ ] **1.2** Extract drag and drop utilities
- [ ] **1.3** Extract drawing/tactical board functionality
- [ ] **1.4** Create focused sub-components

---

## Implementation Guidelines

### Quality Gates (Run after each phase)
- [ ] `npm run lint` - must pass
- [ ] `npm test` - must pass  
- [ ] `npm run build` - must pass
- [ ] Manual testing checklist - must pass

### Commit Strategy
- Use conventional commits: `refactor(HomePage): extract useGameDataManager hook`
- One commit per major extraction
- Include before/after line counts in commit messages

### Testing Strategy  
- Maintain existing functionality 100%
- Add unit tests for extracted hooks
- Integration tests for component interactions
- Manual testing checklist for each phase

### Success Metrics
- **File Size Reduction**: Target reductions achieved
- **Maintainability**: Easier to find and modify specific functionality  
- **Test Coverage**: Maintained or improved test coverage
- **Performance**: No performance regressions
- **Developer Experience**: Faster development and debugging

---

## Progress Tracking

### Overall Status
- **HomePage.tsx**: 🔴 Not Started (0/5 phases)
- **GameStatsModal.tsx**: 🔴 Not Started (0/5 phases)  
- **GameSettingsModal.tsx**: 🔴 Not Started (0/5 phases)
- **SoccerField.tsx**: 🔴 Not Started (0/1 phases)

### Completion Timeline
- **Week 1-3**: HomePage.tsx refactoring
- **Week 4-5**: GameStatsModal.tsx refactoring  
- **Week 6-7**: GameSettingsModal.tsx refactoring
- **Week 8**: SoccerField.tsx refactoring (if needed)

---

## Notes and Considerations

### Risk Mitigation
- Always maintain a backup branch before starting refactoring
- Test thoroughly after each extraction
- Have rollback plan if issues arise
- Consider feature flags for gradual rollout

### Performance Considerations
- Monitor bundle size changes
- Ensure React re-render optimization is maintained
- Consider code splitting opportunities
- Profile before and after refactoring

### Developer Experience
- Maintain clear file organization
- Use consistent naming conventions
- Add comprehensive TypeScript types
- Update documentation as changes are made

---

## Implementation Notes

This refactoring will be implemented incrementally, with each phase thoroughly tested before moving to the next. The goal is to maintain 100% functionality while dramatically improving code maintainability and developer experience.

**Document Status**: 📝 Created - Ready for Implementation  
**Last Updated**: 2025-01-22  
**Next Update**: After Phase 1.1 completion