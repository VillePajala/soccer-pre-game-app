# HomePage Component Refactor Plan

The `HomePage.tsx` component now spans over 2700 lines making it difficult to maintain. This document outlines a strategy to break it into manageable pieces.

## 1. Current Issues
- Multiple concerns handled in one file: state management, timers, field rendering, and modal logic.
- Hard to locate specific functionality or add new features.
- Testing the whole component in isolation is challenging.

## 2. Proposed Breakdown
1. **Layout Wrapper**
   - Create a small `HomePage.tsx` that composes smaller pieces.
2. **State Hooks**
   - Move reducer logic and effects into custom hooks like `useGameSession` and `useHomePageLayout`.
3. **View Components**
   - Extract field display and control bar into a `GameLayout` component.
   - Split each modal into its own component with dedicated props.
4. **Utility Modules**
   - Group helper functions (e.g., saving games, auto backup) into `src/utils/home/`.

## 3. Implementation Steps
1. Identify logical sections inside `HomePage.tsx`.
2. Create new components under `src/components/home/` for each section.
3. Migrate state logic to hooks in `src/hooks/`.
4. Update imports so the main file simply orchestrates subcomponents.
5. Ensure all existing tests continue to pass.

## 4. Checklist
- [ ] Extract layout component
- [ ] Move reducer logic to a hook
- [ ] Separate modal components
- [ ] Clean up remaining helper functions

## 5. Reference
The file begins with a large list of imports for various modals and utilities【F:src/components/HomePage.tsx†L1-L24】. The closing JSX block illustrates the many concerns handled here【F:src/components/HomePage.tsx†L2709-L2725】.
