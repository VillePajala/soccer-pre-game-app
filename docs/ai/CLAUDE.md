# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Commands
- `npm run dev` - Start development server (Next.js)
- `npm run build` - Build for production (includes manifest generation)
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run all Jest tests (executes `jest`)
- `npm run test:unit` - Alias for `npm test`
- `npm run generate:i18n-types` - Generate TypeScript types for translations

### Build Process
The build process includes a custom manifest generation step that runs before Next.js build:
- `node scripts/generate-manifest.mjs` - Generates PWA manifest based on branch
- Manifest configuration varies by branch (master vs development) for different app names and themes

## Architecture Overview

### Tech Stack
- **Next.js 15** with App Router
- **React 19** with TypeScript
- **Tailwind CSS 4** for styling
- **PWA** with custom service worker
- **Browser localStorage** for data persistence
- **Zustand** for centralized state management
- **React Query** for server state and data fetching
- **i18next** for internationalization (English/Finnish)

### Core Architecture

**Data Flow**: The app's data layer relies on **React Query** to fetch, cache, and manage server-side state (persisted in localStorage). Asynchronous wrappers in `src/utils/localStorage.ts` are used for direct localStorage access. This approach centralizes data fetching and reduces manual state management.

**PWA Structure**: The app is a full PWA with:
- Custom service worker (`public/sw.js`)
- Dynamic manifest generation based on git branch
- Install prompts and update notifications

**State Management**: 
- **Zustand Stores**: Centralized state management with four main stores:
  - **`gameStore`**: Game session, timer, scoring, field state, and player positions
  - **`uiStore`**: Modal states, view modes, selections, and UI interactions  
  - **`persistenceStore`**: Data persistence, settings, and localStorage abstraction
  - **`formStore`**: Form state management with validation and auto-save
- **React Query**: Handles all asynchronous data operations, such as fetching and updating the master roster, seasons, tournaments, and saved games.
- **`useState`**: Used only for local component state (ephemeral UI state).

**Key Components**:
- `SoccerField` - Interactive drag-and-drop field
- `PlayerBar` - Player roster management
- `ControlBar` - Main app controls
- Various modals for game settings, stats, and management

**Data Persistence**: All data is stored in browser localStorage with async wrappers in `src/utils/localStorage.ts`. Key data includes:
- Player roster (`src/utils/masterRosterManager.ts`)
- Game saves (`src/utils/savedGames.ts`)
- Seasons and tournaments (`src/utils/seasons.ts`, `src/utils/tournaments.ts`)
- App settings (`src/utils/appSettings.ts`)

**Testing**: Jest with React Testing Library, configured for Next.js with custom setup in `jest.config.js`

## Key Files to Understand

### **Core Architecture**
- `src/app/page.tsx` - The main component orchestrating the entire application with Zustand state management.
- `src/stores/index.ts` - Centralized exports for all Zustand stores and utilities.
- `src/types/index.ts` - Core TypeScript interfaces (Player, Season, Tournament, AppState).

### **State Management (Zustand)**
- `src/stores/gameStore.ts` - Game session, timer, scoring, field state (763 lines)
- `src/stores/uiStore.ts` - Modal states, view modes, selections (922 lines)  
- `src/stores/persistenceStore.ts` - Data persistence, settings (1,091 lines)
- `src/stores/formStore.ts` - Form state management with validation (912 lines)

### **Data Layer**
- `src/utils/masterRosterManager.ts` - CRUD operations for the master player list.
- `src/config/queryKeys.ts` - Defines keys for React Query caching and invalidation.
- `src/utils/localStorage.ts` - Async localStorage wrapper utilities.

### **Component Integration**
- `src/components/HomePage.tsx` - Main game interface using Zustand modal hooks.
- `src/hooks/use*ModalState.ts` - Modal state hooks (10 hooks for different modals).
- `src/hooks/use*Form.ts` - Form management hooks with Zustand integration.

## Development Notes

### TypeScript and ESLint Best Practices for Vercel Builds

**IMPORTANT: Always check for TypeScript and ESLint errors before committing:**
1. Run `npm run lint` before every commit to catch ESLint errors
2. Run `npm run build` locally to catch TypeScript compilation errors
3. Common Vercel build failures to avoid:
   - **Unescaped entities**: Use `&apos;` for apostrophes, `&quot;` for quotes in JSX
   - **`any` types**: Always use proper TypeScript types, avoid `any`. Use `Record<string, unknown>` or specific interfaces
   - **Next.js Link**: Use `import Link from 'next/link'` instead of `<a>` tags for internal navigation
   - **Type casting in JSX**: When rendering unknown types, always cast: `{String(value || '')}`
   - **React keys**: Use `String(item.id)` for keys when the ID type is unknown
   - **useEffect dependencies**: Include all dependencies or use the callback pattern to avoid warnings
   - **Conditional rendering**: Ensure conditions return boolean: `{Boolean(condition) && <Component />}`

### TypeScript Best Practices

When working with storage manager methods that return `Promise<unknown>`:
- `getSavedGames()` returns `Promise<unknown>` but the actual data is `Record<string, AppState>`
- Always cast the result when using it: `const games = await storageManager.getSavedGames() as Record<string, unknown>;`
- When using with Object.keys/entries/values, cast inline: `Object.keys(games as Record<string, unknown>)`
- For type safety, consider creating typed wrapper functions in utilities

Common patterns to avoid TypeScript errors:
```typescript
// ❌ Will cause TypeScript error
const games = await storageManager.getSavedGames();
const gameCount = Object.keys(games).length;

// ✅ Correct approach
const games = await storageManager.getSavedGames() as Record<string, unknown>;
const gameCount = Object.keys(games).length;

// ✅ Or inline cast
const gameCount = Object.keys(await storageManager.getSavedGames() as Record<string, unknown>).length;
```

### Data Storage
All data is stored in browser localStorage. The app includes backup/restore functionality through `src/utils/fullBackup.ts`.

### Internationalization
The app supports English and Finnish with i18next. All translation files now live in `public/locales/`.

### PWA Features
The app includes install prompts, update notifications, and works offline. The service worker is updated during build to trigger cache updates.

### Testing Strategy
- Unit tests cover utilities and components and are co-located with source files using the `.test.tsx` suffix
- The Jest configuration excludes Playwright specs located in the `/tests/` directory

## Pull Request Guidelines

When creating pull requests, use the [pull request template](../../.github/pull_request_template.md) located in `.github/pull_request_template.md`. This ensures consistent PR structure and includes important testing checklist items.

## Production Readiness Plan

This project follows a comprehensive production readiness plan for app store deployment. For complete details on security, testing, performance, and deployment requirements, see:

- **Production Readiness Plan**: `docs/production/PRODUCTION_READINESS_PLAN.md`

All major task tracking and progress monitoring is documented in the production plan rather than in this CLAUDE.md file to maintain a centralized source of truth for the app store deployment process.
