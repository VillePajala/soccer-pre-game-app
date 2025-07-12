# Code Review Findings

This document summarizes several observations after reviewing the repository.

## 1. Tight Coupling of Hooks to Page Components
- `useGameState` imports types directly from `src/app/page.tsx` which couples the hook to the page implementation. Example:
```ts
import {
    Opponent,
    Point,
    AppState,
} from '@/app/page';
```
This is shown in lines 4-8 of `useGameState.ts`.

**Improvement**: Move shared types like `Opponent`, `Point`, and `AppState` to the `src/types` directory so hooks and components can import them without referencing the page file. This keeps modules decoupled and improves reuse.

## 2. Large Global State Definition Inside `page.tsx`
The `AppState` interface is defined within `src/app/page.tsx` (lines 109-147). This makes the page file very large and spreads type definitions throughout the app.

**Improvement**: Relocate `AppState` and related types to `src/types`. This keeps the page component focused on UI logic and simplifies importing these definitions elsewhere.

## 3. Asynchronous Wrappers for `localStorage`
Utility functions in `src/utils/localStorage.ts` wrap synchronous `localStorage` calls in promises:
```ts
export const getLocalStorageItemAsync = async (key: string): Promise<string | null> => {
  try {
    const item = localStorage.getItem(key);
    return Promise.resolve(item);
  } catch (error) {
    console.error(`[getLocalStorageItemAsync] Error getting item for key "${key}":`, error);
    return Promise.resolve(null);
  }
};
```

While the intent is to provide a consistent async API, these wrappers still run synchronously. Consider using the synchronous API directly or implementing validation to ensure `localStorage` is available (checking `typeof window !== 'undefined'`).

## 4. Missing Validation on Game Imports
`importGamesFromJson` originally contained a TODO reminder to validate imported
data before saving:
```ts
// TODO: Add validation here to ensure gamesToImport[gameId] conforms to AppState
```
This has since been implemented using `appStateSchema.safeParse` to verify each
game object before persisting. Malformed data now throws an error and is not
saved, preventing corruption of existing games.

## 5. Monolithic Home Page Component
`src/app/page.tsx` contains hundreds of lines of logic, state, and utility functions. Large components are difficult to maintain.

**Improvement**: Break out timer logic, history management, and game session reducer interactions into separate hooks or components. This will make the page file easier to read and test.

