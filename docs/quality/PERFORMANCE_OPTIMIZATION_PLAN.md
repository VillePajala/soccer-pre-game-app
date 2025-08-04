# Performance Optimization Plan (Priority #1)

## Overview

Focus on immediate performance improvements with low risk and high user impact. This plan addresses bundle size, component re-renders, and runtime performance without major architectural changes.

**Timeline**: 2 weeks  
**Priority**: 🔥 HIGH  
**Estimated Effort**: 16-24 hours

## Step 1: Bundle Size Analysis (2 hours)

### 1.1 Install Bundle Analyzer
```bash
npm install --save-dev @next/bundle-analyzer
npm install --save-dev webpack-bundle-analyzer
```

### 1.2 Analyze Current Bundle
```bash
npm run build
npx @next/bundle-analyzer
```

### 1.3 Identify Optimization Targets
- Heavy dependencies (>50KB)
- Duplicate dependencies
- Unused code that can be tree-shaken
- Components that can be lazy-loaded

## Step 2: Component Memoization (4 hours)

### 2.1 Audit Current Memoization
```bash
# Check for missing memoization in game components
grep -r "React.memo\|useMemo\|useCallback" src/components/game/ --include="*.tsx"
```

### 2.2 Add React.memo to Heavy Components
Priority targets based on HomePage refactoring:
1. **GameView component** - renders field and players
2. **GameControls component** - control buttons and timer
3. **ModalManager component** - manages all modals
4. **SoccerField component** - complex SVG rendering
5. **PlayerBar component** - player lists

Example implementation:
```typescript
// src/components/game/GameView.tsx
import React from 'react';

interface GameViewProps {
  // props interface
}

export const GameView = React.memo<GameViewProps>(({ 
  // destructured props
}) => {
  // component logic
});

GameView.displayName = 'GameView';
```

### 2.3 Add useMemo for Expensive Calculations
```typescript
// Example: Expensive game statistics
const gameStats = useMemo(() => {
  return gameEvents.reduce((stats, event) => {
    // expensive calculation
    return stats;
  }, initialStats);
}, [gameEvents]);
```

### 2.4 Add useCallback for Event Handlers
```typescript
// Example: Modal handlers
const handleOpenModal = useCallback((modalType: string) => {
  // modal logic
}, []);
```

## Step 3: Code Splitting Implementation (3 hours)

### 3.1 Lazy Load Modal Components
Already partially implemented in ModalManager, but optimize further:

```typescript
// src/components/game/ModalManager.tsx
const GameStatsModal = React.lazy(() => 
  import('@/components/GameStatsModal').then(module => ({
    default: module.default
  }))
);

// Add better loading fallbacks
<React.Suspense fallback={<GameStatsModalSkeleton />}>
  {modalStates.isGameStatsModalOpen && <GameStatsModal />}
</React.Suspense>
```

### 3.2 Route-based Code Splitting
```typescript
// Split heavy pages
const HomePage = React.lazy(() => import('@/components/HomePage'));
const SettingsPage = React.lazy(() => import('@/components/SettingsPage'));
```

### 3.3 Dynamic Imports for Heavy Libraries
```typescript
// Dynamic import for heavy libraries like chart libraries
const loadChartLibrary = async () => {
  const { Chart } = await import('heavy-chart-library');
  return Chart;
};
```

## Step 4: Re-render Optimization (3 hours)

### 4.1 Context Optimization
Review GameStateProvider for unnecessary re-renders:

```typescript
// Split contexts to reduce re-render scope
const GameDataContext = createContext(/* game data */);
const GameActionsContext = createContext(/* game actions */);
```

### 4.2 State Colocation
Move state closer to where it's used:

```typescript
// Instead of global modal state, use local state where possible
const [isLocalModalOpen, setIsLocalModalOpen] = useState(false);
```

### 4.3 Debounce Expensive Operations
```typescript
import { debounce } from 'lodash';

const debouncedSave = useCallback(
  debounce((data) => {
    // expensive save operation
  }, 500),
  []
);
```

## Step 5: Runtime Performance (4 hours)

### 5.1 Virtual Scrolling for Large Lists
If player lists are large:
```typescript
import { FixedSizeList as List } from 'react-window';

const PlayerList = ({ players }) => (
  <List
    height={400}
    itemCount={players.length}
    itemSize={50}
  >
    {({ index, style }) => (
      <div style={style}>
        <PlayerItem player={players[index]} />
      </div>
    )}
  </List>
);
```

### 5.2 Image Optimization
```typescript
// Use Next.js Image component for player photos
import Image from 'next/image';

<Image
  src={player.photo}
  alt={player.name}
  width={50}
  height={50}
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."
/>
```

### 5.3 Cleanup Intervals and Listeners
Ensure all useEffect cleanup is proper (already done in memory leak fixes).

## Success Criteria

### Performance Metrics
- [ ] Bundle size reduced by 20%+ 
- [ ] First Contentful Paint < 2s
- [ ] Largest Contentful Paint < 3s
- [ ] Cumulative Layout Shift < 0.1
- [ ] Time to Interactive < 3s

### Development Metrics  
- [ ] React DevTools shows minimal unnecessary re-renders
- [ ] No console warnings about missing memo/callback
- [ ] Bundle analyzer shows no obvious inefficiencies

### User Experience
- [ ] Modal transitions feel snappy
- [ ] Field interactions have no lag
- [ ] Game timer updates smoothly
- [ ] No freezing during intensive operations

## Risk Assessment

**Risk Level**: 🟢 LOW
- All changes are additive (memoization, code splitting)
- No architectural changes
- Easy to revert if issues arise
- Can be done incrementally

## Next Steps After Completion

After performance optimization is complete, the next safest improvements would be:

1. **Error Handling Enhancement** (low risk)
2. **Modal Management Cleanup** (isolated scope)
3. **Component Library Standardization** (design focused)
4. **State Management Migration** (much later, high risk)