# Refactoring Plan for Supabase & Clerk Migration

## Introduction

This document outlines the refactoring steps needed to prepare our soccer coaching application for migration from localStorage to Supabase, and to integrate Clerk for authentication. The goal is to modify our code structure to make the eventual migration process smoother and less disruptive.

Based on the [migration plan](./MIGRATION_TO_SUPABASE_AND_CLERK.md), we've identified several architectural improvements that should be implemented before the actual migration begins.

## Current Status

We've already made progress in centralizing data access for certain entities:

- ✅ Refactored seasons and tournaments to use utility functions instead of direct localStorage access
- ✅ Centralized type definitions for Season and Tournament in the types directory

## Refactoring Steps

### 1. Complete Data Access Layer Abstraction

**Objective**: Create a complete abstraction layer for all localStorage operations to provide a single point of change when switching to Supabase.

**Tasks**:
- [ ] 1.1. Create `src/utils/masterRoster.ts` with CRUD operations for player management
- [ ] 1.2. Create `src/utils/savedGames.ts` with CRUD operations for game state management
- [ ] 1.3. Create `src/utils/appSettings.ts` for user preferences and application settings
- [ ] 1.4. Refactor components to use these utility functions instead of direct localStorage access
- [ ] 1.5. Create consistent error handling patterns across all data utilities

**Success Criteria**:
- No direct localStorage access in component files
- All data operations funnel through utility functions
- Consistent error handling strategy across all data operations

### 2. Prepare for Asynchronous Operations

**Objective**: Adapt the application to handle asynchronous data operations, which will be required when using Supabase.

**Tasks**:
- [ ] 2.1. Refactor utility functions to return Promises, even while still using localStorage
- [ ] 2.2. Update components to handle async/await or .then() patterns
- [ ] 2.3. Add appropriate loading states to components that depend on data
- [ ] 2.4. Implement error states for failed data operations
- [ ] 2.5. Consider incorporating React Query or SWR for data fetching management

**Success Criteria**:
- Utility functions return Promises
- Components properly handle asynchronous data loading
- User experience includes appropriate loading and error states

### 3. Create User Authentication Context

**Objective**: Prepare the architecture for user-specific data access, which will be required with Clerk authentication.

**Tasks**:
- [ ] 3.1. Create `src/context/AuthContext.tsx` with placeholder authentication state
- [ ] 3.2. Implement `useAuth` hook for accessing authentication state
- [ ] 3.3. Update utility functions to accept a `userId` parameter (which can be null pre-migration)
- [ ] 3.4. Wrap the application with the AuthContext provider
- [ ] 3.5. Prepare components to handle authenticated/unauthenticated states

**Success Criteria**:
- Authentication context is in place and usable
- Components can adapt to authenticated/unauthenticated states
- Data utility functions are prepared for user-scoped data

### 4. Implement Schema Transformation Layer

**Objective**: Create transformation functions to bridge current data structures and planned Supabase schema.

**Tasks**:
- [ ] 4.1. Create `src/utils/transforms/` directory for transformation functions
- [ ] 4.2. Implement transforms between current data structures and planned Supabase schema
- [ ] 4.3. Add validation functions to ensure data integrity
- [ ] 4.4. Create unit tests for transformation functions

**Success Criteria**:
- Clean separation between application data models and storage models
- Robust validation to ensure data integrity
- Test coverage for transformation functions

### 5. Prepare Migration Utilities

**Objective**: Create the foundation for one-time migration from localStorage to Supabase.

**Tasks**:
- [ ] 5.1. Create `src/utils/migration/` directory for migration utilities
- [ ] 5.2. Implement skeleton functions for migrating each data entity
- [ ] 5.3. Add mechanisms to track migration progress and status
- [ ] 5.4. Create UI components for migration feedback

**Success Criteria**:
- Clear migration path for each data entity
- Progress tracking for multi-step migrations
- User feedback mechanisms for migration process

### 6. Centralize and Complete Type Definitions

**Objective**: Ensure all types are centralized and compatible with planned Supabase schema.

**Tasks**:
- [ ] 6.1. Audit and move any remaining inline type definitions to `src/types/`
- [ ] 6.2. Ensure types align with planned Supabase schema
- [ ] 6.3. Add comprehensive JSDoc comments to type definitions
- [ ] 6.4. Implement type guards where appropriate

**Success Criteria**:
- All type definitions centralized in types directory
- Type structures compatible with planned Supabase schema
- Clear documentation for type usage

### 7. Implement Persistent Cache Strategy

**Objective**: Prepare the application for potential offline capabilities if required post-migration.

**Tasks**:
- [ ] 7.1. Evaluate requirements for offline functionality
- [ ] 7.2. Research and choose appropriate caching strategy
- [ ] 7.3. Implement basic caching mechanisms that could work with both localStorage and Supabase

**Success Criteria**:
- Clear understanding of offline requirements
- Strategy document for implementing offline capabilities
- Basic caching mechanisms in place if required

## Progress Tracking

| Step | Description | Status | Completion Date | Notes |
|------|-------------|--------|----------------|-------|
| 1.1  | Create masterRoster utility | ✅ Completed | 2024-07-31 | Created utility functions with consistent error handling pattern and unit tests |
| 1.2  | Create savedGames utility | ✅ Completed | 2024-07-31 | Created comprehensive game management APIs with proper error handling and tests |
| 1.2.1 | Fix type issues in savedGames | ✅ Completed | 2024-08-01 | Resolved type compatibility issues between GameData and AppState, improved error handling |
| 1.3  | Create appSettings utility | ✅ Completed | 2024-07-31 | Created utility with support for both modern settings and legacy settings |
| 1.4  | Refactor components to use utilities | 🔄 In Progress | | Breaking this down into sub-tasks |
| 1.4.1 | Refactor app/page.tsx | ✅ Completed | 2024-08-03 | Extensive refactoring to use TanStack Query for data fetching (masterRoster, seasons, tournaments, savedGames, appSettings). Implemented TanStack Query mutations for saveGame, updatePlayer, setGoalieStatus, removePlayer, addPlayer. Updated other handlers (deleteGame, quickSave, autoSave, import/export, fairPlayCard) to use async utilities. Addressed complex undo/redo scenarios involving roster state. |
| 1.4.2 | Refactor GameSettingsModal | ✅ Completed | 2024-08-01 | Implemented direct calls to savedGames utility functions for data persistence |
| 1.4.2.1 | Add tests for GameSettingsModal | ✅ Completed | 2024-08-01 | Created comprehensive tests for utility function integration and component behavior |
| 1.4.3 | Refactor NewGameSetupModal | ✅ Completed | 2024-08-02 | Replaced direct localStorage access with utility functions for team name persistence |
| 1.4.3.1 | Add tests for NewGameSetupModal | ✅ Completed | 2024-08-02 | Created comprehensive tests for utility function integration with proper test isolation |
| 1.4.4 | Refactor LoadGameModal | ✅ Completed | 2024-08-02 | Verified component uses utility functions/props; updated tests to mock utilities. |
| 1.4.5 | Refactor GameStatsModal | ✅ Completed | 2024-08-02 | Component refactored to use getSeasons/getTournaments utilities; tests already correctly mock these. |
| 1.5  | Implement error handling patterns | ✅ Completed | 2024-08-03 | Implemented for seasons.ts and tournaments.ts. Reviewed masterRoster.ts, which already aligns. |
| 1.5.1 | Refactor src/utils/seasons.ts error handling | ✅ Completed | 2024-08-02 | Aligned with defined error handling strategy (return null/false, console.error). Tests updated. |
| 1.5.2 | Refactor src/utils/tournaments.ts error handling | ✅ Completed | 2024-08-03 | Aligned with defined error handling strategy. Tests updated to match new logging and error details, successfully refactored to test by controlling localStorage mock directly. |
| 1.5.3 | Review src/utils/masterRoster.ts error handling | ✅ Completed | 2024-08-03 | Error handling patterns (return values, console.error with prefixes) already align with strategy. Tests cover error paths. Fixed goalie logic to ensure only one active. |
| 2.1  | Make utility functions return Promises | ✅ Completed | 2024-08-03 | Refactored src/utils/appSettings.ts. Components using it (NewGameSetupModal.tsx) and its tests updated. Refactored src/utils/seasons.ts. Components using it (NewGameSetupModal.tsx, GameStatsModal.tsx) and their tests updated. Refactored src/utils/tournaments.ts. Components using it (NewGameSetupModal.tsx, GameStatsModal.tsx) and their tests updated. Refactored src/utils/masterRoster.ts and its tests. Refactored/verified src/utils/savedGames.ts and its tests. All verified. |
| 2.2  | Update components for async operations | ✅ Completed | 2024-08-03 | Components like `page.tsx`, `LoadGameModal.tsx`, `GameSettingsModal.tsx` now handle async operations, primarily through TanStack Query hooks or updated `useEffect` hooks calling async utility functions. `NewGameSetupModal` and `RosterSettingsModal` rely on async handlers/mutations from `page.tsx`. |
| 2.3  | Add loading states | ✅ Completed | 2024-08-03 | Loading states are managed by TanStack Query (`isLoading`, `isPending` flags) for major data fetching and mutations in `page.tsx`. Individual modals also manage their specific loading states (e.g., `isGameLoading` in `LoadGameModal`). |
| 2.4  | Implement error states | ✅ Completed | 2024-08-03 | Error states are managed by TanStack Query (`isError`, `error` objects) in `page.tsx`. Components like `LoadGameModal` and `RosterSettingsModal` use local state for displaying specific operational errors (e.g., `gameLoadError`, `rosterError`). |
| 2.5  | Evaluate React Query/SWR | ✅ Completed | 2024-08-03 | React Query (TanStack Query) has been successfully implemented and is now the core data fetching and server state management library in `page.tsx`. |
| 3.1  | Create AuthContext | 📝 Planned | | |
| 3.2  | Implement useAuth hook | 📝 Planned | | |
| 3.3  | Update utilities for userId parameter | 📝 Planned | | |
| 3.4  | Wrap app with AuthContext provider | 📝 Planned | | |
| 3.5  | Prepare components for auth states | 📝 Planned | | |
| 4.1  | Create transforms directory | 📝 Planned | | |
| 4.2  | Implement transformation functions | 📝 Planned | | |
| 4.3  | Add validation functions | 📝 Planned | | |
| 4.4  | Create transform unit tests | 📝 Planned | | |
| 5.1  | Create migration utilities directory | 📝 Planned | | |
| 5.2  | Implement migration skeleton functions | 📝 Planned | | |
| 5.3  | Add migration progress tracking | 📝 Planned | | |
| 5.4  | Create migration UI components | 📝 Planned | | |
| 6.1  | Audit and move type definitions | 📝 Planned | | |
| 6.2  | Align types with Supabase schema | 📝 Planned | | |
| 6.3  | Add JSDoc comments | 📝 Planned | | |
| 6.4  | Implement type guards | 📝 Planned | | |
| 7.1  | Evaluate offline requirements | 📝 Planned | | |
| 7.2  | Choose caching strategy | 📝 Planned | | |
| 7.3  | Implement basic caching | 📝 Planned | | |

## Legend
- ✅ Completed
- 🔄 In Progress
- 📝 Planned
- ❓ Under Review
- ❌ Blocked

## Next Steps

### Immediate Focus
1. **Thorough Undo/Redo Testing**: Conduct comprehensive testing of Undo/Redo functionality, especially for roster-related changes (name, jersey, goalie status) and player selection, to ensure consistency between `PlayerBar`, on-field display, and historical states.
2. **Review `gameUtils.ts`**: Identify if any functions within `src/utils/gameUtils.ts` are actively used and require refactoring to async, or if the file can be deprecated or significantly cleaned up.
3. **Type System Review**: While `AppState` is the primary type for game state and its usage in `savedGames.ts` is confirmed, a broader review of types, especially the legacy `GameData` interface, could be beneficial for long-term clarity.
4. **General Regression Testing**: After significant refactoring, perform a general sweep of application functionality to catch any unforeseen issues.

### Mid-term Goals
1. **Component Refactoring Completion**: Finish refactoring any remaining components (if any, outside of `page.tsx` and already reviewed modals) to use the utility layer and ensure they all have proper test coverage.
2. **Begin Async Transition (Supabase Specifics)**: While utility functions are async, the next phase of this would be planning the Supabase client integration and how these utilities will call Supabase methods.
3. **Testing Strategy**: Continue implementing comprehensive tests to ensure stability during migration. Use mocks for utility functions to test components in isolation. 