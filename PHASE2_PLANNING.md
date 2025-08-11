# Phase 2: UI State Consolidation Planning

## Overview
Phase 2 focuses on consolidating all UI state management from distributed React Context and useState calls into the centralized Zustand uiStore. This phase will unify 18 modals, view modes, and UI interactions.

## Current State Analysis

### Modal State Mapping
The uiStore needs to be updated to match the actual modals in the application:

| Current Modal | uiStore Name | Context/Hook Location | Status |
|---------------|--------------|----------------------|---------|
| GameStatsModal | gameStatsModal ✅ | ModalProvider | Ready |
| GameSettingsModal | ❌ Missing | ModalProvider | Add to store |
| LoadGameModal | loadGameModal ✅ | ModalProvider | Ready |
| NewGameSetupModal | ❌ Missing | ModalProvider | Add to store |
| RosterSettingsModal | ❌ Missing | ModalProvider | Add to store |
| SettingsModal | settingsModal ✅ | ModalProvider | Ready |
| GoalLogModal | goalLogModal ✅ | ModalProvider | Ready |
| PlayerAssessmentModal | ❌ Missing | ModalProvider | Add to store |
| SeasonTournamentManagementModal | ❌ Missing | ModalProvider | Add to store |
| TrainingResourcesModal | ❌ Missing | ModalProvider | Add to store |
| InstructionsModal | helpModal? | useModalManager | Map to helpModal |
| AuthModal | authModal ✅ | Multiple components | Ready |
| MigrationModal | ❌ Missing | Unknown | Add to store |
| SyncProgressModal | ❌ Missing | TopBar (local state) | Add to store |

### Additional uiStore Modals Not Currently Used
- saveGameModal (might be used for quick save?)
- addPlayerModal (subset of roster?)
- playerDetailsModal (subset of roster?)
- substitutePlayerModal (subset of game controls?)
- languageModal (part of settings?)
- aboutModal (part of settings?)
- profileModal (auth related?)
- accountModal (auth related?)

## Migration Strategy

### Phase 2a: Update UI Store (Week 1)
1. **Update ModalState interface** to match actual app modals
2. **Add missing modals**:
   - gameSettingsModal
   - newGameSetupModal
   - rosterSettingsModal
   - playerAssessmentModal
   - seasonTournamentModal
   - trainingResourcesModal
   - instructionsModal
   - migrationModal
   - syncProgressModal
3. **Remove or repurpose unused modals**
4. **Create migration mapping** for renamed modals

### Phase 2b: Create Modal Migration Wrappers (Week 1)
1. **Create ModalProvider migration wrapper**
   - Map Context state to Zustand store
   - Provide compatibility layer
   - Enable gradual migration
2. **Create individual modal migration wrappers**
   - Similar to GameStateProvider pattern
   - Safety fallbacks
   - Performance monitoring

### Phase 2c: Migrate Modal Components (Week 2)
1. **Priority Order**:
   - High-frequency modals first (GameStats, Settings, Roster)
   - Auth-related modals (critical path)
   - Low-frequency modals last
2. **Migration Pattern**:
   - Create MigratedModal version
   - Add migration wrapper
   - Test thoroughly
   - Update imports gradually

### Phase 2d: Consolidate View States (Week 2)
1. **Migrate view modes** from scattered useState to uiStore
2. **Unify drawing/tactical states**
3. **Consolidate selection states**

## Technical Implementation

### 1. Updated Modal State Interface
```typescript
export interface ModalState {
  // Game management modals
  gameSettingsModal: boolean;
  newGameSetupModal: boolean;
  loadGameModal: boolean;
  saveGameModal: boolean;
  gameStatsModal: boolean;
  goalLogModal: boolean;
  
  // Player management modals
  rosterSettingsModal: boolean;
  playerAssessmentModal: boolean;
  
  // Competition modals
  seasonTournamentModal: boolean;
  
  // Settings and help modals
  settingsModal: boolean;
  instructionsModal: boolean;
  trainingResourcesModal: boolean;
  
  // Authentication modals
  authModal: boolean;
  migrationModal: boolean;
  
  // System modals
  syncProgressModal: boolean;
}
```

### 2. Migration Wrapper Pattern
```typescript
// ModalProviderMigrationWrapper.tsx
export function ModalProviderMigrationWrapper({ children }) {
  const { shouldUseLegacy } = useMigrationSafety('ModalProvider');
  
  if (shouldUseLegacy) {
    return <LegacyModalProvider>{children}</LegacyModalProvider>;
  }
  
  return <MigratedModalProvider>{children}</MigratedModalProvider>;
}
```

### 3. Hook Migration Pattern
```typescript
// Compatibility hook that works with both systems
export function useModalState(modalName: keyof ModalState) {
  const zustandModal = useModal(modalName);
  const contextModal = useContextModalState(modalName);
  
  // Use Zustand if available, fallback to Context
  return useMigrationEnabled() ? zustandModal : contextModal;
}
```

## Success Criteria

### Technical Goals
- [ ] All 18 modals managed by uiStore
- [ ] Zero breaking changes
- [ ] Performance improvement (reduced re-renders)
- [ ] Type safety maintained
- [ ] Migration reversible via feature flags

### Quality Metrics
- [ ] All modal tests passing
- [ ] No increase in bundle size >10KB
- [ ] Modal open/close <50ms
- [ ] Memory usage stable
- [ ] Zero runtime errors in production

## Risk Mitigation

### Potential Issues
1. **Modal Props Complexity**: ModalManager has 100+ props
   - Solution: Create prop adapter layer
   - Use TypeScript mapped types

2. **State Synchronization**: Multiple state sources during migration
   - Solution: Single source of truth pattern
   - State reconciliation layer

3. **Performance Regression**: Context consumers re-rendering
   - Solution: Granular subscriptions with Zustand
   - Memoization strategies

### Rollback Strategy
1. Feature flags for each modal migration
2. Automatic rollback on errors
3. A/B testing capability
4. Gradual rollout by user percentage

## Timeline

### Week 1
- Days 1-2: Update uiStore with correct modals
- Days 3-4: Create migration infrastructure
- Day 5: Test migration wrappers

### Week 2  
- Days 1-3: Migrate high-priority modals
- Days 4-5: Migrate remaining modals
- Day 5: Performance testing and optimization

## Next Steps

1. **Immediate Actions**:
   - Update uiStore ModalState interface
   - Create modal mapping documentation
   - Set up migration testing environment

2. **Prerequisites**:
   - Ensure Phase 1 is stable in production
   - Get stakeholder approval for Phase 2
   - Set up monitoring for migration metrics

---

*Document created: August 2025*
*Phase 2 Status: Planning*
*Estimated Duration: 2 weeks*